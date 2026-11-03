import { Component, ChangeDetectorRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ErrorModalComponent } from '../../error-model';
import { SuccessModalComponent } from '../../success-modal';
import { LoggerService } from '../../services/logger.service';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  imports: [FormsModule, CommonModule, ErrorModalComponent, SuccessModalComponent, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  @Input() modalMode = false;
  @Output() requestClose = new EventEmitter<void>();
  @Output() requestLogin = new EventEmitter<void>();

  oauth42Url = '/oauth2/authorization/42?prompt=login&max_age=0';
  oauthGithubUrl = '/oauth2/authorization/github';
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  error: string | null = null;
  errorModalOpen: boolean = false;
  errorMessage: string = '';
  successModalOpen: boolean = false;
  successMessage: string = '';

  private logger = inject(LoggerService);
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private passwordRegex = /^(?=\S)(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}(?<=\S)$/;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  onRegister(): void {
    if (!this.username || !this.email || !this.password || !this.confirmPassword) {
      this.showError(this.translate.instant('REGISTER.ERROR_REQUIRED'));
      return;
    }

    if (!this.emailRegex.test(this.email)) {
      this.showError(this.translate.instant('REGISTER.ERROR_INVALID_EMAIL'));
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.showError(this.translate.instant('REGISTER.ERROR_PASSWORDS_MISMATCH'));
      return;
    }

    if (!this.passwordRegex.test(this.password)) {
      this.showError(this.translate.instant('REGISTER.ERROR_PASSWORD_WEAK'));
      return;
    }

    this.loading = true;
    this.error = null;

    this.authService.register(this.username, this.email, this.password).subscribe({
      next: () => {
        this.logger.debug('Registration successful');
        this.showSuccess(this.translate.instant('REGISTER.SUCCESS_REGISTERED'));
        setTimeout(() => {
          if (this.modalMode) {
            this.requestLogin.emit();
          } else {
            this.router.navigate(['/login']);
          }
        }, 3000);
        this.loading = false;
      },
      error: (err) => {
        this.logger.error('Registration error:', err);
        let errorMsg = this.extractBackendErrorMessage(err);
        errorMsg = this.mapKnownRegisterErrors(errorMsg);
        this.showError(errorMsg);
        this.loading = false;
      },
    });
  }

  private extractBackendErrorMessage(err: any): string {
    const fallback = this.translate.instant('REGISTER.ERROR_FALLBACK');

    if (!err) {
      return fallback;
    }

    if (typeof err.error === 'string') {
      try {
        const parsed = JSON.parse(err.error);
        return parsed?.message || parsed?.error || err.error || fallback;
      } catch {
        return err.error || fallback;
      }
    }

    if (err.error && typeof err.error === 'object') {
      return err.error.message || err.error.error || fallback;
    }

    return err.message || fallback;
  }

  private mapKnownRegisterErrors(message: string): string {
    const raw = (message || '').toLowerCase();

    if (raw.includes('nom d\'utilisateur') && (raw.includes('existe déjà') || raw.includes('already'))) {
      return this.translate.instant('REGISTER.ERROR_USERNAME_TAKEN');
    }

    if (raw.includes('username') && (raw.includes('already') || raw.includes('exists') || raw.includes('taken'))) {
      return this.translate.instant('REGISTER.ERROR_USERNAME_TAKEN');
    }

    if (raw.includes('email') && (raw.includes('déjà') || raw.includes('already') || raw.includes('exists') || raw.includes('used') || raw.includes('enregistré'))) {
      return this.translate.instant('REGISTER.ERROR_EMAIL_TAKEN');
    }

    return message || this.translate.instant('REGISTER.ERROR_FALLBACK');
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

  showSuccess(message: string): void {
    this.successMessage = message;
    this.successModalOpen = true;
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  closeSuccessModal(): void {
    this.successModalOpen = false;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  onLoginLinkClicked(event: Event): void {
    event.preventDefault();
    if (this.modalMode) {
      this.requestLogin.emit();
      return;
    }
    this.router.navigate(['/login']);
  }
}
