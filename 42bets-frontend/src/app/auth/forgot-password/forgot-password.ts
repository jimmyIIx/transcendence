import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ErrorModalComponent } from '../../error-model';
import { LoggerService } from '../../services/logger.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, CommonModule, ErrorModalComponent, TranslatePipe],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPasswordComponent {
  email: string = '';
  loading: boolean = false;
  errorModalOpen: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showSuccess: boolean = false;
  private logger = inject(LoggerService);

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  onForgotPassword(): void {
    if (!this.email) {
      this.showError(this.translate.instant('FORGOT_PASSWORD.ERROR_EMAIL_REQUIRED'));
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.showError(this.translate.instant('FORGOT_PASSWORD.ERROR_EMAIL_INVALID'));
      return;
    }

    this.loading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.logger.log('Reset email sent');
        this.successMessage = this.translate.instant('FORGOT_PASSWORD.SUCCESS_EMAIL_SENT');
        this.showSuccess = true;
        this.loading = false;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.logger.error('Forgot password error:', err);
        let errorMsg = this.translate.instant('FORGOT_PASSWORD.ERROR_GENERIC');

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

        this.showError(errorMsg);
        this.loading = false;
      },
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
