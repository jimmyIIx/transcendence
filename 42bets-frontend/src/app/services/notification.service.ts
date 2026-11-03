import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { appConfig } from '../config/app-config';

export type NotifType = 'MARKET_RESOLVED' | 'ORDER_FILLED';

export interface AppNotification {
  id: string;
  type: NotifType;
  message: string;
  marketId?: number;
  marketQuestion?: string;
  outcome?: string;
  timestamp: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private es?: EventSource;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private active = false;

  private readonly http = inject(HttpClient);

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount   = computed(() => this.notifications().filter(n => !n.read).length);

  connect(): void {
    if (this.active) return;
    this.active = true;
    this.fetchTicket();
  }

  disconnect(): void {
    this.active = false;
    this.cancelReconnect();
    this.es?.close();
    this.es = undefined;
    this.notifications.set([]);
  }

  markAllRead(): void {
    this.notifications.update(ns => ns.map(n => ({ ...n, read: true })));
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private fetchTicket(): void {
    this.http
      .post<{ ticket: string }>(
        `${appConfig.apiUrl}/api/notifications/ticket`,
        {},
        { withCredentials: true },
      )
      .subscribe({
        next: ({ ticket }) => this.openStream(ticket),
        error: () => this.scheduleReconnect(),
      });
  }

  private openStream(ticket: string): void {
    this.es?.close();
    const url = `${appConfig.apiUrl}/api/notifications/stream?ticket=${encodeURIComponent(ticket)}`;
    const es  = new EventSource(url);
    this.es   = es;

    es.addEventListener('notification', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as Omit<AppNotification, 'read'>;
        this.notifications.update(ns => {
          if (ns.some(n => n.id === data.id)) return ns;
          return [{ ...data, read: false }, ...ns].slice(0, 50);
        });
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      es.close();
      if (this.es === es) this.es = undefined;
      if (this.active) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.active) this.fetchTicket();
    }, 5000);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}
