import { Component, ChangeDetectorRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ErrorModalComponent } from '../../error-model';
import { LoggerService } from '../../services/logger.service';
import { UserRoleService } from '../../services/user-role.service';
import { EmailConfirmationService } from '../../services/email-confirmation.service';
import { appConfig } from '../../config/app-config';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule, RouterLink, ErrorModalComponent, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  @Input() modalMode = false;
  @Output() requestClose = new EventEmitter<void>();
  @Output() requestRegister = new EventEmitter<void>();

  private logger = inject(LoggerService);
  private emailConfirmationService = inject(EmailConfirmationService);
  apiUrl = appConfig.apiUrl;
  oauth42Url = '/oauth2/authorization/42?prompt=login&max_age=0';
  oauthGithubUrl = '/oauth2/authorization/github';
  username: string = '';
  password: string = '';
  loading: boolean = false;
  errorModalOpen: boolean = false;
  errorMessage: string = '';
  showResendConfirmation = false;
  resendEmail = '';
  resendLoading = false;
  resendMessage = '';
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private authService: AuthService,
    private roleService: UserRoleService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  onLogin(): void {
    if (!this.username || !this.password) {
      this.showError(this.translate.instant('LOGIN.ERROR_REQUIRED'));
      return;
    }

    this.loading = true;

    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        this.logger.log('✅ Login successful');

        const loginPayload = this.normalizeLoginResponse(response);
        const accessToken = loginPayload?.accessToken;

        if (!accessToken) {
          this.logger.error('Login response missing accessToken:', response);
          this.showError(this.translate.instant('LOGIN.ERROR_LOGIN_FAILED'));
          this.loading = false;
          return;
        }

        this.authService.saveToken(accessToken);
        const role = this.getRoleFromToken(accessToken);
        if (role) {
          this.roleService.setUserRole(role);
        }
        this.loading = false;
        if (this.modalMode) {
          this.requestClose.emit();
        }
        this.router.navigate(['/markets']);
      },
      error: (err) => {
        this.logger.error('❌ Login error:', err);
        let errorMsg = this.translate.instant('LOGIN.ERROR_GENERIC');
        this.showResendConfirmation = false;
        this.resendMessage = '';

        if (err.error?.error) {
          errorMsg = err.error.error;
        } else if (typeof err.error === 'string') {
          try {
            const parsed = JSON.parse(err.error);
            errorMsg = parsed.error || err.error;
          } catch {
            errorMsg = err.error;
          }
        } else if (err.message) {
          errorMsg = err.message;
        }

        if (this.requiresConfirmationResend(errorMsg)) {
          this.showResendConfirmation = true;
          this.resendEmail = '';
        }

        this.logger.debug('Final error message:', errorMsg);
        this.showError(errorMsg);
        this.loading = false;
      },
    });
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.errorModalOpen = true;
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  closeErrorModal(): void {
    this.errorModalOpen = false;
  }

  resendConfirmationEmail(): void {
    this.resendMessage = '';

    const email = this.resendEmail.trim();
    if (!email) {
      this.resendMessage = this.translate.instant('LOGIN.RESEND_EMAIL_REQUIRED');
      return;
    }

    if (!this.emailRegex.test(email)) {
      this.resendMessage = this.translate.instant('LOGIN.RESEND_EMAIL_INVALID');
      return;
    }

    this.resendLoading = true;
    this.emailConfirmationService.resendConfirmationEmail(email).subscribe({
      next: () => {
        this.resendMessage = this.translate.instant('LOGIN.RESEND_SUCCESS');
        this.resendLoading = false;
      },
      error: (err) => {
        this.logger.error('❌ Resend confirmation error:', err);
        this.resendMessage =
          err.error?.error || this.translate.instant('LOGIN.RESEND_ERROR');
        this.resendLoading = false;
      },
    });
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

  private normalizeLoginResponse(response: unknown): { accessToken?: string } | null {
    if (!response) {
      return null;
    }

    if (typeof response === 'string') {
      try {
        return JSON.parse(response) as { accessToken?: string };
      } catch {
        return null;
      }
    }

    if (typeof response === 'object') {
      return response as { accessToken?: string };
    }

    return null;
  }

  navigateToRegister(): void {
    if (this.modalMode) {
      this.requestClose.emit();
    }
    this.router.navigate(['/register']);
  }

  onRouteLinkClicked(): void {
    if (this.modalMode) {
      this.requestClose.emit();
    }
  }

  onRegisterLinkClicked(event: Event): void {
    event.preventDefault();
    if (this.modalMode) {
      this.requestRegister.emit();
      return;
    }
    this.router.navigate(['/register']);
  }

  private requiresConfirmationResend(message: string): boolean {
    return /email not verified|confirm.*email|confirmation link|please check your email|email non v(?:e|é)rifi(?:e|é)|confirmer.*email|lien de confirmation|v(?:e|é)rifiez votre email/i.test(
      message,
    );
  }
}
