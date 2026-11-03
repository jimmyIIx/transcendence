import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { TokenService } from '../services/token';
import { appConfig } from '../config/app-config';
import { buildAvatarGradient } from './avatar-gradient';
import { SuccessModalComponent } from '../success-modal';
import { UiAvatarComponent } from '../shared/ui/ui-avatar/ui-avatar.component';
import { UiBadgeComponent } from '../shared/ui/ui-badge/ui-badge.component';

interface CurrentUser {
  username: string;
  email: string | null;
  balance: number;
  role: string;
  walletAddress: string | null;
  avatarUrl: string | null;
}

type TabId = 'profil' | 'compte';

interface WalletUpdateResponse {
  walletAddress: string;
}

@Component({
  selector: 'app-profile',
  imports: [CommonModule, RouterLink, FormsModule, SuccessModalComponent, TranslatePipe, UiAvatarComponent, UiBadgeComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnDestroy {
  protected readonly username = signal<string>('');
  protected readonly email = signal<string>('');
  protected readonly role = signal<string>('USER');
  protected readonly balance = signal<number | null>(null);
  protected readonly walletAddress = signal<string | null>(null);
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly avatarError = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTab = signal<TabId>('profil');
  protected readonly walletEditMode = signal(false);
  protected readonly walletSaving = signal(false);
  protected readonly walletError = signal<string | null>(null);
  protected readonly walletSuccessModalOpen = signal(false);
  protected readonly walletSuccessMessage = signal('');
  protected walletInput = '';
  private walletSuccessTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly translate = inject(TranslateService);

  constructor() {
    this.username.set(this.translate.instant('PROFILE.DEFAULT_USERNAME'));
    this.email.set(this.translate.instant('PROFILE.DEFAULT_EMAIL'));
    this.readFromToken();
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    if (this.walletSuccessTimeout) {
      clearTimeout(this.walletSuccessTimeout);
      this.walletSuccessTimeout = null;
    }
  }

  protected selectTab(tab: TabId): void {
    this.activeTab.set(tab);
  }

  protected onAvatarError(): void {
    this.avatarError.set(true);
  }

  protected readonly avatarBackground = computed(() => buildAvatarGradient(this.username()));

  protected readonly initials = computed(() => {
    const name = this.username().trim();
    if (!name) {
      return '?';
    }
    const parts = name.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  protected shortWallet(): string {
    const wallet = this.walletAddress();
    if (!wallet) {
      return this.translate.instant('PROFILE.WALLET_EMPTY');
    }
    if (wallet.length <= 12) {
      return wallet;
    }
    return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  }

  protected startWalletEdit(): void {
    this.walletInput = this.walletAddress() ?? '';
    this.walletError.set(null);
    this.walletEditMode.set(true);
  }

  protected cancelWalletEdit(): void {
    this.walletEditMode.set(false);
    this.walletError.set(null);
    this.walletInput = this.walletAddress() ?? '';
  }

  protected saveWalletAddress(): void {
    const normalized = this.walletInput.trim();
    this.walletError.set(null);

    if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
      this.walletError.set(this.translate.instant('PROFILE.WALLET_INVALID'));
      return;
    }

    this.walletSaving.set(true);
    this.http
      .put<WalletUpdateResponse>(`${appConfig.apiUrl}/api/users/me/wallet`, { walletAddress: normalized }, { withCredentials: true })
      .subscribe({
        next: (response) => {
          this.walletAddress.set(response.walletAddress ?? normalized);
          this.walletInput = this.walletAddress() ?? normalized;
          this.showWalletSuccess(this.translate.instant('PROFILE.WALLET_SAVED'));
          this.walletSaving.set(false);
          this.walletEditMode.set(false);
        },
        error: (err) => {
          this.walletError.set(err.error?.message ?? this.translate.instant('PROFILE.WALLET_SAVE_ERROR'));
          this.walletSaving.set(false);
        },
      });
  }

  protected closeWalletSuccessModal(): void {
    this.walletSuccessModalOpen.set(false);
    if (this.walletSuccessTimeout) {
      clearTimeout(this.walletSuccessTimeout);
      this.walletSuccessTimeout = null;
    }
  }

  private showWalletSuccess(message: string): void {
    this.walletSuccessMessage.set(message);
    this.walletSuccessModalOpen.set(true);
    if (this.walletSuccessTimeout) {
      clearTimeout(this.walletSuccessTimeout);
    }
    this.walletSuccessTimeout = setTimeout(() => {
      this.walletSuccessModalOpen.set(false);
      this.walletSuccessTimeout = null;
    }, 2200);
  }

  private readFromToken(): void {
    const token = this.tokenService.getAccessToken();
    if (!token) {
      return;
    }
    try {
      const payloadPart = token.split('.')[1];
      const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalizedPayload));
      this.username.set(payload.sub ?? payload.username ?? this.translate.instant('PROFILE.DEFAULT_USERNAME'));
      this.email.set(payload.email ?? this.translate.instant('PROFILE.DEFAULT_EMAIL'));
      this.role.set(payload.role ?? 'USER');
    } catch {
      // ignore malformed token; values stay at defaults
    }
  }

  private loadCurrentUser(): void {
    this.http
      .get<CurrentUser>(`${appConfig.apiUrl}/api/users/me`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          if (data.username) {
            this.username.set(data.username);
          }
          if (data.email) {
            this.email.set(data.email);
          }
          if (data.role) {
            this.role.set(data.role);
          }
          this.balance.set(data.balance);
          this.walletAddress.set(data.walletAddress);
          this.avatarUrl.set(data.avatarUrl ?? null);
          this.avatarError.set(false);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(this.translate.instant('PROFILE.ERROR_LOAD'));
          this.loading.set(false);
        },
      });
  }
}
