import { Component, OnInit, PLATFORM_ID, Inject, afterNextRender, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { EmailConfirmationService } from '../services/email-confirmation.service';
import { LoggerService } from '../services/logger.service';

@Component({
  selector: 'app-email-confirmation',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="confirmation-modal-overlay">
      <section class="confirmation-modal-shell card-surface">
        <div class="confirmation-modal-header">
          <div
            class="confirmation-modal-badge"
            [class.confirmation-modal-badge-loading]="!confirmationComplete"
            [class.confirmation-modal-badge-error]="confirmationComplete && !isSuccess"
            aria-hidden="true"
          >
            <span *ngIf="confirmationComplete">{{ isSuccess ? '+' : '!' }}</span>
            <span class="confirmation-modal-spinner" *ngIf="!confirmationComplete"></span>
          </div>
          <h1>{{ !confirmationComplete ? ('EMAIL_CONFIRMATION.TITLE_PENDING' | translate) : successMessage }}</h1>
        </div>

        <div class="confirmation-modal-body" *ngIf="!confirmationComplete">
          <p>{{ 'EMAIL_CONFIRMATION.MESSAGE_PENDING' | translate }}</p>
        </div>

        <div class="confirmation-modal-body" *ngIf="confirmationComplete">
          <p>{{ successDescription }}</p>
        </div>

        <div class="confirmation-modal-footer" *ngIf="confirmationComplete">
          <button (click)="navigateToDashboard()" class="btn-primary confirmation-modal-confirm">
            {{ isSuccess ? ('EMAIL_CONFIRMATION.BTN_TO_DASHBOARD' | translate) : ('EMAIL_CONFIRMATION.BTN_BACK_LOGIN' | translate) }}
          </button>
        </div>

        <div class="confirmation-resend-box" *ngIf="confirmationComplete && !isSuccess">
          <h2>{{ 'EMAIL_CONFIRMATION.RESEND_TITLE' | translate }}</h2>
          <p>{{ 'EMAIL_CONFIRMATION.RESEND_LEAD' | translate }}</p>

          <label for="resendEmail" class="form-label">{{ 'EMAIL_CONFIRMATION.RESEND_LABEL' | translate }}</label>
          <input
            id="resendEmail"
            class="form-input-dark form-input-slate confirmation-resend-input"
            type="email"
            [(ngModel)]="resendEmail"
            [placeholder]="'EMAIL_CONFIRMATION.RESEND_LABEL' | translate"
          />

          <button
            class="btn-primary confirmation-modal-confirm confirmation-resend-button"
            (click)="resendConfirmationEmail()"
            [disabled]="resendLoading"
          >
            {{ resendLoading ? ('EMAIL_CONFIRMATION.RESEND_SENDING' | translate) : ('EMAIL_CONFIRMATION.RESEND_BTN' | translate) }}
          </button>

          <p class="confirmation-resend-status" *ngIf="resendMessage">{{ resendMessage }}</p>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .confirmation-modal-overlay {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: transparent;
        font-family: var(--font-family-base);
      }

      .confirmation-modal-shell {
        width: min(100%, 420px);
        border-radius: 14px;
        border: 1px solid var(--box-border);
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.26);
        overflow: hidden;
        animation: confirmationModalIn 180ms cubic-bezier(0.22, 1, 0.36, 1);
        font-family: inherit;
      }

      @keyframes confirmationModalIn {
        from {
          transform: translateY(12px) scale(0.985);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      .confirmation-modal-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--box-border);
        background: rgba(255, 255, 255, 0.03);
        text-align: center;
      }

      .confirmation-modal-badge {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        color: #e7fff0;
        background: #2f8f5b;
        flex: 0 0 auto;
      }

      .confirmation-modal-badge-loading {
        background: #3b4f66;
      }

      .confirmation-modal-badge-error {
        color: #fff0f0;
        background: #8f2d2d;
      }

      .confirmation-modal-spinner {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        border: 2px solid rgba(255, 255, 255, 0.32);
        border-top-color: #e8f1ff;
        animation: spin 0.85s linear infinite;
      }

      .confirmation-modal-header h1 {
        margin: 0;
        color: var(--text-primary-ui);
        font-size: 1rem;
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: 0.01em;
        text-align: center;
      }

      .confirmation-modal-body {
        padding: 12px 14px 10px;
        text-align: center;
      }

      .confirmation-modal-body p {
        margin: 0;
        color: var(--text-secondary-ui);
        font-size: 0.9375rem;
        line-height: 1.5;
        font-weight: 500;
      }

      .confirmation-modal-footer {
        padding: 0 14px 14px;
        display: flex;
        justify-content: center;
      }

      .confirmation-modal-confirm {
        min-width: 220px;
        height: 2.2rem;
        font-weight: 700;
        border-radius: 8px;
        font-family: inherit;
      }

      .confirmation-resend-box {
        margin: 0 14px 14px;
        padding-top: 12px;
        border-top: 1px solid var(--box-border);
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        text-align: center;
      }

      .confirmation-resend-box h2 {
        margin: 0;
        color: var(--text-primary-ui);
        font-size: 0.95rem;
        font-weight: 700;
      }

      .confirmation-resend-box p {
        margin: 0;
        color: var(--text-secondary-ui);
        font-size: 0.875rem;
        line-height: 1.4;
      }

      .confirmation-resend-box label {
        margin-top: 4px;
        color: var(--text-primary-ui);
        font-size: 0.875rem;
        font-weight: 600;
        align-self: center;
      }

      .confirmation-resend-input {
        max-width: 320px;
        align-self: center;
      }

      .confirmation-resend-button {
        margin-top: 4px;
        width: min(100%, 320px);
        height: 2.2rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 700;
        font-family: inherit;
      }

      .confirmation-resend-status {
        margin: 2px 0 0;
        color: #8ff1de;
        font-weight: 600;
        font-size: 0.875rem;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 640px) {
        .confirmation-modal-overlay {
          align-items: center;
          padding: 14px;
        }

        .confirmation-modal-shell {
          width: 100%;
          max-width: 420px;
          border-radius: 14px;
        }

        .confirmation-modal-footer {
          justify-content: center;
        }

        .confirmation-modal-confirm {
          width: min(100%, 320px);
        }
      }
    `,
  ],
})
export class EmailConfirmationComponent implements OnInit {
  private logger = inject(LoggerService);
  private translate = inject(TranslateService);
  private readonly confirmationTokenRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  token: string = '';
  confirmationComplete = false;
  isSuccess = false;
  successMessage = '';
  successDescription = '';
  resendEmail = '';
  resendLoading = false;
  resendMessage = '';
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private emailConfirmationService: EmailConfirmationService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    // init after hydration completes
    afterNextRender(() => {
      this.initializeConfirmation();
    });
  }

  ngOnInit(): void {
    // No-op - init happens in afterNextRender
  }

  private initializeConfirmation(): void {
    this.route.params.subscribe((params: any) => {
      const tokenFromRoute = (params['token'] ?? '').toString().trim();

      if (!this.isValidConfirmationToken(tokenFromRoute)) {
        this.router.navigate(['/register']);
        return;
      }

      this.token = tokenFromRoute;
      this.confirmEmail();
    });
  }

  private isValidConfirmationToken(token: string): boolean {
    return this.confirmationTokenRegex.test(token);
  }

  confirmEmail(): void {
    setTimeout(() => {
      this.emailConfirmationService.confirmEmail(this.token).subscribe({
        next: (response: any) => {
          this.logger.debug('✅ Email confirmed:', response);
          this.isSuccess = true;
          this.successMessage = this.translate.instant('EMAIL_CONFIRMATION.SUCCESS_MSG');
          this.successDescription = this.translate.instant('EMAIL_CONFIRMATION.SUCCESS_DESC');
          this.confirmationComplete = true;

          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        },
        error: (err: any) => {
          this.logger.error('❌ Confirmation error:', err);
          this.isSuccess = false;
          this.successMessage = this.translate.instant('EMAIL_CONFIRMATION.ERROR_MSG');
          this.successDescription =
            err.error?.error ||
            this.translate.instant('EMAIL_CONFIRMATION.ERROR_DESC_DEFAULT');
          this.confirmationComplete = true;
        },
      });
    }, 2000);
  }

  resendConfirmationEmail(): void {
    this.resendMessage = '';

    if (!this.resendEmail.trim()) {
      this.resendMessage = this.translate.instant('EMAIL_CONFIRMATION.RESEND_REQUIRED');
      return;
    }

    if (!this.emailRegex.test(this.resendEmail.trim())) {
      this.resendMessage = this.translate.instant('EMAIL_CONFIRMATION.RESEND_INVALID_EMAIL');
      return;
    }

    this.resendLoading = true;
    this.emailConfirmationService.resendConfirmationEmail(this.resendEmail.trim()).subscribe({
      next: () => {
        this.resendMessage = this.translate.instant('EMAIL_CONFIRMATION.RESEND_SUCCESS');
        this.resendLoading = false;
      },
      error: (err: any) => {
        this.logger.error('❌ Resend confirmation error:', err);
        this.resendMessage =
          err.error?.error || this.translate.instant('EMAIL_CONFIRMATION.RESEND_ERROR');
        this.resendLoading = false;
      },
    });
  }

  navigateToDashboard(): void {
    if (this.isSuccess) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
