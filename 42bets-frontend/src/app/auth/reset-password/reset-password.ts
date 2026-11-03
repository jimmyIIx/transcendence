import {
  Component,
  ChangeDetectorRef,
  OnInit,
  PLATFORM_ID,
  Inject,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ErrorModalComponent } from '../../error-model';
import { LoggerService } from '../../services/logger.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, CommonModule, ErrorModalComponent, TranslatePipe],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPasswordComponent implements OnInit {
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  errorModalOpen: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showSuccess: boolean = false;
  passwordsMatch: boolean = true;
  private passwordRegex = /^(?=\S)(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}(?<=\S)$/;
  private logger = inject(LoggerService);

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    afterNextRender(() => {
      this.initializeToken();
    });
  }

  ngOnInit(): void {
    // No-op - initialization happens in afterNextRender
  }

  private initializeToken(): void {
    this.route.params.subscribe((params) => {
      this.token = params['token'];
      if (!this.token) {
        this.showError(this.translate.instant('RESET_PASSWORD.ERROR_INVALID_LINK'));
        setTimeout(() => this.router.navigate(['/forgot-password']), 3000);
      }
    });
  }

  onResetPassword(): void {
    if (!this.newPassword || !this.confirmPassword) {
      this.showError(this.translate.instant('RESET_PASSWORD.ERROR_FIELDS_REQUIRED'));
      return;
    }

    if (!this.passwordRegex.test(this.newPassword)) {
      this.showError(this.translate.instant('RESET_PASSWORD.ERROR_PASSWORD_WEAK'));
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordsMatch = false;
      this.showError(this.translate.instant('RESET_PASSWORD.ERROR_PASSWORDS_MISMATCH'));
      return;
    }

    this.passwordsMatch = true;
    this.loading = true;

    this.authService.resetPassword(this.token, this.newPassword, this.confirmPassword).subscribe({
      next: (response) => {
        this.logger.log('Password reset successful');
        this.successMessage = this.translate.instant('RESET_PASSWORD.SUCCESS_MSG');
        this.showSuccess = true;
        this.loading = false;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.logger.error('Reset password error:', err);
        let errorMsg = this.translate.instant('RESET_PASSWORD.ERROR_GENERIC');

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

  onPasswordChange(): void {
    if (this.newPassword && this.confirmPassword && this.newPassword === this.confirmPassword) {
      this.passwordsMatch = true;
    } else if (this.newPassword && this.confirmPassword) {
      this.passwordsMatch = false;
    }
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
