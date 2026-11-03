import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { TokenService } from '../../services/token';
import { AuthService } from '../../services/auth';
import { UserRoleService } from '../../services/user-role.service';
import { LoggerService } from '../../services/logger.service';
import { MarketsService } from '../../services/markets';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-oauth2-callback',
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="callback-container">
      <div class="callback-card card-surface">
        <div class="callback-logo-wrap">
          <img src="/42bet-cropped.png" alt="42Bets" class="callback-logo" />
        </div>

        <h2 class="callback-title">
          {{ consentPending ? ('OAUTH2_CALLBACK.CONSENT_REQUIRED' | translate) : processing ? ('OAUTH2_CALLBACK.PROCESSING' | translate) : ('OAUTH2_CALLBACK.TITLE' | translate) }}
        </h2>
        <p class="callback-message">{{ statusMessage }}</p>

        <div *ngIf="consentPending" class="consent-actions">
          <button type="button" class="btn-primary consent-primary" (click)="acceptConsent()" [disabled]="consentInProgress">
            {{ consentInProgress ? ('OAUTH2_CALLBACK.SAVING' | translate) : ('OAUTH2_CALLBACK.ALLOW_GENERATION' | translate) }}
          </button>
          <button type="button" class="consent-secondary" (click)="declineConsent()" [disabled]="consentInProgress">
            {{ 'OAUTH2_CALLBACK.LATER' | translate }}
          </button>
        </div>

        <div *ngIf="processing" class="spinner"></div>
      </div>
    </div>
  `,
  styles: [
    `
      .callback-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: clamp(420px, calc(100dvh - 132px), 100dvh);
        background: var(--bg-primary);
        padding: 20px;
      }

      .callback-card {
        width: 100%;
        max-width: 420px;
        padding: 40px;
        text-align: center;
        border-radius: 10px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
      }

      .callback-logo-wrap {
        display: flex;
        justify-content: center;
        margin: 20px 0 14px;
      }

      .callback-logo {
        height: 72px;
        width: auto;
        object-fit: contain;
      }

      .callback-title {
        margin: 0 0 16px;
        color: var(--text-primary-ui);
        font-size: 24px;
        font-weight: 700;
      }

      .callback-message {
        margin: 0 0 20px;
        color: var(--text-secondary-ui);
        line-height: 1.5;
        font-size: 14px;
      }

      .consent-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin: 16px 0 6px;
      }

      .consent-primary,
      .consent-secondary {
        min-height: 42px;
        border: 0;
        border-radius: 8px;
        padding: 10px 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .consent-primary:disabled,
      .consent-secondary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .consent-secondary {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-primary-ui);
      }

      .consent-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.14);
      }

      .spinner {
        border: 4px solid rgba(0, 186, 188, 0.22);
        border-top: 4px solid var(--color-blue-42);
        border-radius: 50%;
        width: 42px;
        height: 42px;
        animation: spin 1s linear infinite;
        margin: 14px auto 0;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 480px) {
        .callback-card {
          padding: 24px;
        }
      }
    `,
  ],
})
export class OAuth2CallbackComponent implements OnInit {
  private logger = inject(LoggerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private roleService = inject(UserRoleService);
  private marketsService = inject(MarketsService);
  private translate = inject(TranslateService);

  processing = true;
  consentPending = false;
  consentInProgress = false;
  statusMessage = '';
  private pendingRedirectRole: string | null = null;

  ngOnInit(): void {
    this.statusMessage = this.translate.instant('OAUTH2_CALLBACK.STATUS_AUTH');
    this.handleOAuth2Callback();
  }

  private handleOAuth2Callback(): void {
    this.route.queryParams.subscribe((params) => {
      try {
        const accessToken = params['accessToken'];
        const refreshToken = params['refreshToken'];
        const username = params['username'];
        const provider = params['provider'];
        const marketConsent = params['marketConsent'] === 'true' || params['marketConsent'] === true;
        const error = params['error'];

        if (error) {
          this.handleError(this.translate.instant('OAUTH2_CALLBACK.ERROR_AUTH_FAILED', { detail: params['message'] || error }));
          return;
        }

        if (!accessToken) {
          this.handleError(this.translate.instant('OAUTH2_CALLBACK.ERROR_NO_TOKEN'));
          return;
        }

        // Save tokens
        this.logger.log('✅ OAuth2 callback successful');
        this.tokenService.setAccessToken(accessToken);

        // Extract and set role
        const role = this.getRoleFromToken(accessToken);
        if (role) {
          this.roleService.setUserRole(role);
        }

        this.pendingRedirectRole = role;

        if (provider === '42' && !marketConsent) {
          this.processing = false;
          this.consentPending = true;
          this.statusMessage = this.translate.instant('OAUTH2_CALLBACK.STATUS_CONSENT_WELCOME', { username });
          return;
        }

        this.statusMessage = this.translate.instant('OAUTH2_CALLBACK.STATUS_WELCOME_REDIRECT', { username });

        // Redirect to the tendances page after authentication.
        setTimeout(() => {
          this.router.navigate(['/markets']);
        }, 500);
      } catch (error) {
        this.logger.error('OAuth2 callback error:', error);
        this.handleError(this.translate.instant('OAUTH2_CALLBACK.ERROR_GENERIC'));
      }
    });
  }

  acceptConsent(): void {
    if (!this.tokenService.getAccessToken()) {
      this.handleError(this.translate.instant('OAUTH2_CALLBACK.ERROR_MISSING_TOKEN'));
      return;
    }

    this.consentInProgress = true;
    this.statusMessage = this.translate.instant('OAUTH2_CALLBACK.STATUS_SAVING_CONSENT');

    this.marketsService
      .enableMarketGenerationConsent()
      .pipe(finalize(() => (this.consentInProgress = false)))
      .subscribe({
        next: () => this.finishLoginRedirect(),
        error: (error) => {
          this.logger.error('Unable to save market consent:', error);
          this.statusMessage = this.translate.instant('OAUTH2_CALLBACK.ERROR_SAVE_CONSENT');
        },
      });
  }

  declineConsent(): void {
    this.finishLoginRedirect();
  }

  private finishLoginRedirect(): void {
    const role = this.pendingRedirectRole;
    this.consentPending = false;
    this.processing = false;
    this.statusMessage = this.translate.instant('OAUTH2_CALLBACK.STATUS_REDIRECTING');

    setTimeout(() => {
      this.router.navigate([role === 'ADMIN' ? '/admin' : '/dashboard']);
    }, 300);
  }

  private getRoleFromToken(token: string): string | null {
    try {
      const payloadPart = token.split('.')[1];
      const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalizedPayload));
      return payload.role ?? null;
    } catch {
      return null;
    }
  }

  private handleError(message: string): void {
    this.processing = false;
    this.statusMessage = message;
    this.logger.error(message);

    setTimeout(() => {
      this.router.navigate(['/login'], {
        queryParams: { error: message },
      });
    }, 3000);
  }
}
