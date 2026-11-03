import { Component, computed, effect, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TokenService } from '../services/token';
import { MarketsService, UserOrder } from '../services/markets';
import { NotificationService } from '../services/notification.service';
import { appConfig } from '../config/app-config';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { MarketQuestionPipe } from '../shared/market-question.pipe';
import {
  PnlEvent,
  buildChartPoints,
  chartAreaPath,
  chartLinePath,
  pnlEventsFromOrders,
  pnlSince,
  rangeStart,
} from './pnl.util';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe, MarketQuestionPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnDestroy {
  protected readonly username = signal<string>('');
  protected readonly role = signal<string>('USER');
  protected readonly tokenExpiresAt = signal<string>('');
  protected readonly tokenIsValid = signal(false);
  protected readonly closedOrders = signal<UserOrder[]>([]);
  protected readonly ordersLoading = signal(false);
  protected readonly ordersError = signal<string | null>(null);
  protected readonly balance = signal<number | null>(null);
  protected readonly walletAddress = signal<string | null>(null);
  protected walletInput = '';
  protected readonly walletSaving = signal(false);
  protected readonly walletMessage = signal<string | null>(null);
  protected readonly walletJustSaved = signal(false);
  private walletSavedTimer: ReturnType<typeof setTimeout> | null = null;

  // Portfolio (Polymarket-style) view state
  protected readonly activeTab = signal<'positions' | 'history'>('positions');
  protected readonly balanceHidden = signal(false);
  protected readonly chartRange = signal<'1d' | '1w' | '1m' | '1y' | 'ytd' | 'all'>('1d');
  protected readonly selectedSide = signal<'ALL' | 'YES' | 'NO'>('ALL');
  protected readonly selectedStatus = signal<'ALL' | 'FILLED' | 'CANCELLED' | 'WON' | 'LOST'>('ALL');
  protected readonly categoryFilter = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly chartRanges: ReadonlyArray<{ id: '1d' | '1w' | '1m' | '1y' | 'ytd' | 'all'; labelKey: string }> = [
    { id: '1d', labelKey: 'DASHBOARD.RANGE_1D' },
    { id: '1w', labelKey: 'DASHBOARD.RANGE_1W' },
    { id: '1m', labelKey: 'DASHBOARD.RANGE_1M' },
    { id: '1y', labelKey: 'DASHBOARD.RANGE_1Y' },
    { id: 'ytd', labelKey: 'DASHBOARD.RANGE_YTD' },
    { id: 'all', labelKey: 'DASHBOARD.RANGE_ALL' },
  ];

  private readonly tokenService = inject(TokenService);
  private readonly marketsService = inject(MarketsService);
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);
  private readonly notificationService = inject(NotificationService);
  private liveRefreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.username.set(this.translate.instant('DASHBOARD.DEFAULT_USERNAME'));
    this.tokenExpiresAt.set(this.translate.instant('DASHBOARD.TOKEN_EXPIRES_UNKNOWN'));
    this.refreshAccountState();
    this.loadOrders();
    this.loadBalance();
    this.startLiveRefresh();

    effect(() => {
      const notifCount = this.notificationService.notifications().length;
      if (notifCount > 0) {
        this.loadOrders(false);
        this.loadBalance();
      }
    });
  }

  private startLiveRefresh(): void {
    this.liveRefreshTimer = setInterval(() => {
      this.loadOrders(false);
      this.loadBalance();
    }, 15000);
  }

  private refreshAccountState(): void {
    const token = this.tokenService.getAccessToken();

    if (!token) {
      this.tokenIsValid.set(false);
      return;
    }

    try {
      const payloadPart = token.split('.')[1];
      const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalizedPayload));

      this.username.set(payload.sub ?? this.translate.instant('DASHBOARD.DEFAULT_USERNAME'));
      this.role.set(payload.role ?? 'USER');
      this.tokenIsValid.set(this.tokenService.isAccessTokenValid());
      this.tokenExpiresAt.set(
        payload.exp ? new Date(payload.exp * 1000).toLocaleString() : this.translate.instant('DASHBOARD.TOKEN_EXPIRES_UNKNOWN'),
      );
    } catch {
      this.tokenIsValid.set(false);
      this.username.set(this.translate.instant('DASHBOARD.DEFAULT_USERNAME'));
      this.role.set('USER');
      this.tokenExpiresAt.set(this.translate.instant('DASHBOARD.TOKEN_EXPIRES_UNKNOWN'));
    }
  }

  loadOrders(showLoader = true): void {
    if (showLoader) {
      this.ordersLoading.set(true);
    }
    this.ordersError.set(null);
    this.marketsService.getMyOrders().subscribe({
      next: (orders) => {
        this.closedOrders.set(orders.filter((o) => o.status !== 'OPEN'));
        if (showLoader) {
          this.ordersLoading.set(false);
        }
      },
      error: () => {
        this.ordersError.set(this.translate.instant('DASHBOARD.ERROR_LOAD_ORDERS'));
        if (showLoader) {
          this.ordersLoading.set(false);
        }
      },
    });
  }

  outcomeClass(order: UserOrder): string {
    if (!order.marketResolved) return '';
    return order.marketResolvedOutcome === order.side.toString() ? 'won' : 'lost';
  }

  protected readonly availableCategories = computed(() =>
    [...new Set(this.closedOrders().map((o) => (o.marketCategory ?? '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
  );

  protected readonly filteredOrders = computed(() => {
    let rows = this.closedOrders();

    const side = this.selectedSide();
    if (side !== 'ALL') {
      rows = rows.filter((o) => o.side === side);
    }

    const status = this.selectedStatus();
    if (status === 'FILLED') {
      rows = rows.filter((o) => o.status === 'FILLED');
    } else if (status === 'CANCELLED') {
      rows = rows.filter((o) => o.status === 'CANCELLED');
    } else if (status === 'WON') {
      rows = rows.filter((o) => o.marketResolved && o.status !== 'CANCELLED' && o.marketResolvedOutcome === o.side);
    } else if (status === 'LOST') {
      rows = rows.filter((o) => o.marketResolved && o.status !== 'CANCELLED' && o.marketResolvedOutcome !== o.side);
    }

    const category = this.categoryFilter().trim().toUpperCase();
    if (category) {
      rows = rows.filter((o) => (o.marketCategory ?? '').toUpperCase().includes(category));
    }

    const fromRaw = this.dateFrom();
    if (fromRaw) {
      const from = new Date(`${fromRaw}T00:00:00`).getTime();
      if (Number.isFinite(from)) {
        rows = rows.filter((o) => this.orderTimestamp(o) >= from);
      }
    }

    const toRaw = this.dateTo();
    if (toRaw) {
      const to = new Date(`${toRaw}T23:59:59.999`).getTime();
      if (Number.isFinite(to)) {
        rows = rows.filter((o) => this.orderTimestamp(o) <= to);
      }
    }

    return rows;
  });

  // Active holdings: filled orders on markets that are not yet resolved.
  protected readonly positions = computed(() =>
    this.filteredOrders().filter((o) => o.status === 'FILLED' && !o.marketResolved),
  );

  // Settled or cancelled orders.
  protected readonly historyRows = computed(() =>
    this.filteredOrders().filter((o) => o.marketResolved || o.status === 'CANCELLED'),
  );

  protected readonly displayedRows = computed<UserOrder[]>(() =>
    this.activeTab() === 'positions' ? this.positions() : this.historyRows(),
  );

  protected readonly positionsValue = computed(() =>
    this.positions().reduce((total, o) => total + this.value(o), 0),
  );

  protected readonly portfolioTotal = computed(() => (this.balance() ?? 0) + this.positionsValue());

  // Realized profit/loss events derived from resolved bets (positions once settled).
  private readonly pnlEvents = computed<PnlEvent[]>(() => pnlEventsFromOrders(this.filteredOrders()));

  private pnlSinceRange(range: '1d' | '1w' | '1m' | '1y' | 'ytd' | 'all'): number {
    return pnlSince(this.pnlEvents(), rangeStart(range, Date.now()));
  }

  // P&L over the currently selected range (1J, 1S, …).
  protected readonly rangePnl = computed(() => this.pnlSinceRange(this.chartRange()));
  protected readonly rangePnlPct = computed(() => {
    const base = this.portfolioTotal() - this.rangePnl();
    return base > 0 ? (this.rangePnl() / base) * 100 : 0;
  });

  // Daily change shown on the portfolio card.
  protected readonly dayPnl = computed(() => this.pnlSinceRange('1d'));
  protected readonly dayPnlPct = computed(() => {
    const base = this.portfolioTotal() - this.dayPnl();
    return base > 0 ? (this.dayPnl() / base) * 100 : 0;
  });

  protected readonly rangeLabel = computed(() => {
    const key = this.chartRanges.find((r) => r.id === this.chartRange())?.labelKey;
    return key ? this.translate.instant(key) : '';
  });

  protected readonly chartColor = computed(() => {
    const p = this.rangePnl();
    if (p > 0) return 'var(--success-solid)';
    if (p < 0) return 'var(--danger-solid)';
    return 'var(--color-blue-42)';
  });

  // Cumulative P&L curve points mapped to the chart viewBox (0 0 442 65).
  private readonly chartPoints = computed(() => {
    const now = Date.now();
    return buildChartPoints(this.pnlEvents(), rangeStart(this.chartRange(), now), now);
  });

  protected readonly chartLinePath = computed(() => chartLinePath(this.chartPoints()));
  protected readonly chartAreaPath = computed(() => chartAreaPath(this.chartPoints()));

  protected readonly categoryBars = computed(() => {
    const totals = new Map<string, number>();
    for (const order of this.filteredOrders()) {
      if (order.status === 'CANCELLED') continue;
      const key = (order.marketCategory ?? 'AUTRE').toUpperCase();
      totals.set(key, (totals.get(key) ?? 0) + this.cost(order));
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  });

  protected readonly categoryBarMax = computed(() => {
    const values = this.categoryBars().map((x) => x.value);
    return values.length > 0 ? Math.max(...values) : 1;
  });

  protected readonly sideSplit = computed(() => {
    let yes = 0;
    let no = 0;
    for (const order of this.filteredOrders()) {
      if (order.status === 'CANCELLED') continue;
      const shares = this.shares(order);
      if (order.side === 'YES') yes += shares;
      else no += shares;
    }
    const total = yes + no;
    return {
      yes,
      no,
      total,
      yesPct: total > 0 ? (yes / total) * 100 : 0,
      noPct: total > 0 ? (no / total) * 100 : 0,
    };
  });

  protected readonly sidePieStyle = computed(() => {
    const split = this.sideSplit();
    const yesPct = Math.max(0, Math.min(100, split.yesPct));
    return `conic-gradient(var(--success-solid) 0 ${yesPct.toFixed(2)}%, var(--danger-solid) ${yesPct.toFixed(2)}% 100%)`;
  });

  protected selectTab(tab: 'positions' | 'history'): void {
    this.activeTab.set(tab);
  }

  protected selectRange(range: '1d' | '1w' | '1m' | '1y' | 'ytd' | 'all'): void {
    this.chartRange.set(range);
  }

  protected setSideFilter(value: 'ALL' | 'YES' | 'NO'): void {
    this.selectedSide.set(value);
  }

  protected setStatusFilter(value: 'ALL' | 'FILLED' | 'CANCELLED' | 'WON' | 'LOST'): void {
    this.selectedStatus.set(value);
  }

  protected setCategoryFilter(value: string): void {
    this.categoryFilter.set(value ?? '');
  }

  protected setDateFrom(value: string): void {
    this.dateFrom.set(value ?? '');
  }

  protected setDateTo(value: string): void {
    this.dateTo.set(value ?? '');
  }

  protected clearFilters(): void {
    this.selectedSide.set('ALL');
    this.selectedStatus.set('ALL');
    this.categoryFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  protected exportCsv(): void {
    const rows = this.displayedRows();
    const header = [
      'market',
      'category',
      'side',
      'status',
      'createdAt',
      'marketEndDate',
      'cost',
      'toWin',
      'value',
    ];

    const lines = rows.map((o) => [
      o.marketQuestion,
      o.marketCategory,
      o.side,
      o.status,
      o.createdAt,
      o.marketEndDate ?? '',
      this.cost(o).toFixed(4),
      this.toWin(o).toFixed(4),
      this.value(o).toFixed(4),
    ]);

    const csv = [header, ...lines]
      .map((line) => line.map((cell) => this.escapeCsv(String(cell ?? ''))).join(','))
      .join('\n');

    this.downloadBlob(`dashboard-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8', csv);
  }

  protected exportPdf(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const split = this.sideSplit();
    const rows = this.displayedRows()
      .map((o) => `
        <tr>
          <td>${this.escapeHtml(o.marketQuestion)}</td>
          <td>${this.escapeHtml(o.marketCategory)}</td>
          <td>${o.side}</td>
          <td>${o.status}</td>
          <td style="text-align:right;">${this.cost(o).toFixed(2)}</td>
          <td style="text-align:right;">${this.value(o).toFixed(2)}</td>
        </tr>
      `)
      .join('');

    const report = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Dashboard export</title>
        <style>
          body { font-family: Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; color: #111; }
          h1 { margin: 0 0 12px; font-size: 20px; }
          .meta { font-size: 12px; margin-bottom: 16px; color: #444; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
          .card { border: 1px solid #d9d9d9; border-radius: 8px; padding: 8px 10px; }
          .k { font-size: 12px; color: #666; }
          .v { font-size: 15px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f7f7f7; text-align: left; }
        </style>
      </head>
      <body>
        <h1>42Bets Analytics Export</h1>
        <div class="meta">Generated at ${new Date().toLocaleString()}</div>
        <div class="grid">
          <div class="card"><div class="k">Portfolio total</div><div class="v">${this.portfolioTotal().toFixed(2)} TK42</div></div>
          <div class="card"><div class="k">P&L (${this.rangeLabel()})</div><div class="v">${this.rangePnl().toFixed(2)} TK42</div></div>
          <div class="card"><div class="k">YES split</div><div class="v">${split.yesPct.toFixed(2)}%</div></div>
          <div class="card"><div class="k">NO split</div><div class="v">${split.noPct.toFixed(2)}%</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Category</th>
              <th>Side</th>
              <th>Status</th>
              <th>Cost</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
    if (!popup) return;
    popup.document.write(report);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 300);
  }

  protected toggleBalanceHidden(): void {
    this.balanceHidden.update((hidden) => !hidden);
  }

  // Masked wallet address (e.g. 0xD46A…F1FF4) so the full address stays hidden.
  protected shortWallet(): string {
    const addr = this.walletAddress();
    if (!addr) return '';
    return addr.length <= 12 ? addr : `${addr.slice(0, 6)}…${addr.slice(-5)}`;
  }

  // Money column helpers (values expressed in TK42 tokens).
  protected avgPrice(o: UserOrder): number {
    return o.price;
  }

  // Effective shares represented by an order: the part already matched plus
  // any still-open remainder. A fully filled position has amount = 0, so we
  // must rely on filledAmount to reflect the shares actually held.
  private shares(o: UserOrder): number {
    return (o.filledAmount ?? 0) + o.amount;
  }

  protected cost(o: UserOrder): number {
    return (o.price * this.shares(o)) / 100;
  }

  protected toWin(o: UserOrder): number {
    return this.shares(o);
  }

  protected value(o: UserOrder): number {
    const shares = this.shares(o);
    if (o.marketResolved) {
      return o.marketResolvedOutcome === o.side ? shares : 0;
    }
    return (o.price * shares) / 100;
  }

  loadBalance(): void {
    if (!this.tokenIsValid()) return;
    this.http
      .get<{ balance: number; walletAddress: string | null }>(`${appConfig.apiUrl}/api/users/me`, {
        withCredentials: true,
      })
      .subscribe({
        next: (data) => {
          this.balance.set(data.balance);
          this.walletAddress.set(data.walletAddress ?? null);
          this.walletInput = data.walletAddress ?? '';
        },
        error: () => this.balance.set(null),
      });
  }

  saveWalletAddress(): void {
    const address = (this.walletInput ?? '').trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      this.walletMessage.set(this.translate.instant('DASHBOARD.ERROR_WALLET_INVALID'));
      return;
    }
    this.walletSaving.set(true);
    this.walletMessage.set(null);
    this.http
      .put<{ walletAddress: string }>(
        `${appConfig.apiUrl}/api/users/me/wallet`,
        { walletAddress: address },
        { withCredentials: true },
      )
      .subscribe({
        next: (data) => {
          this.walletAddress.set(data.walletAddress);
          this.walletMessage.set(null);
          this.walletSaving.set(false);
          this.flagWalletSaved();
        },
        error: (err) => {
          this.walletMessage.set(err?.error?.message ?? this.translate.instant('DASHBOARD.ERROR_WALLET_SAVE'));
          this.walletSaving.set(false);
        },
      });
  }

  private flagWalletSaved(): void {
    this.walletJustSaved.set(true);
    if (this.walletSavedTimer) clearTimeout(this.walletSavedTimer);
    this.walletSavedTimer = setTimeout(() => this.walletJustSaved.set(false), 4000);
  }

  private orderTimestamp(o: UserOrder): number {
    const raw = o.marketEndDate ?? o.createdAt;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  private escapeCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private escapeHtml(value: string): string {
    return (value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private downloadBlob(filename: string, mimeType: string, content: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  ngOnDestroy(): void {
    if (this.walletSavedTimer) clearTimeout(this.walletSavedTimer);
    if (this.liveRefreshTimer) clearInterval(this.liveRefreshTimer);
  }
}
