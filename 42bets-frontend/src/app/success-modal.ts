import { Component, HostListener, Input, OnChanges, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="success-modal-overlay"
      [class.success-modal-overlay-flat]="flatBackdrop"
      *ngIf="isOpen"
      [style.--success-backdrop-width.px]="backdropWidth"
      [style.--success-backdrop-height.px]="backdropHeight"
      (click)="close()"
    >
      <div class="success-modal-shell card-surface" (click)="$event.stopPropagation()">
        <div class="success-modal-header">
          <div class="success-modal-badge" aria-hidden="true">+</div>
          <h2>{{ 'MODAL.SUCCESS_TITLE' | translate }}</h2>
          <button class="success-modal-close" type="button" [attr.aria-label]="'MODAL.CLOSE_ARIA' | translate" (click)="close()">×</button>
        </div>
        <div class="success-modal-body">
          <p>{{ message }}</p>
        </div>
        <div class="success-modal-footer">
          <button class="btn-primary success-modal-confirm" type="button" (click)="close()">{{ 'MODAL.OK' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .success-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 2200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: transparent;
      }

      .success-modal-overlay::before {
        content: '';
        position: absolute;
        width: min(calc(100% - 32px), var(--success-backdrop-width, 400px));
        height: min(calc(100dvh - 32px), var(--success-backdrop-height, 520px));
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.16);
        pointer-events: none;
      }

      .success-modal-overlay-flat::before {
        display: none;
      }

      .success-modal-overlay-flat {
        background: rgba(0, 0, 0, 0.14);
      }

      .success-modal-overlay-flat .success-modal-shell {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
      }

      .success-modal-shell {
        position: relative;
        z-index: 1;
        width: min(100%, 360px);
        border-radius: 14px;
        border: 1px solid var(--box-border);
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.22);
        overflow: hidden;
        animation: successModalIn 180ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      @keyframes successModalIn {
        from {
          transform: translateY(12px) scale(0.985);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      .success-modal-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--box-border);
        background: rgba(255, 255, 255, 0.03);
      }

      .success-modal-badge {
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
        box-shadow: none;
        flex: 0 0 auto;
      }

      .success-modal-header h2 {
        margin: 0;
        font-size: 1rem;
        line-height: 1.2;
        font-weight: 700;
        color: var(--text-primary-ui);
        letter-spacing: 0.01em;
        flex: 1 1 auto;
      }

      .success-modal-close {
        background: none;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        color: #d3d9e0;
        transition: background-color 120ms ease, color 120ms ease;
        flex: 0 0 auto;
      }

      .success-modal-close:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
      }

      .success-modal-body {
        padding: 12px 14px 10px;
      }

      .success-modal-body p {
        margin: 0;
        color: var(--text-primary-ui);
        font-size: 0.9375rem;
        line-height: 1.5;
        font-weight: 500;
      }

      .success-modal-footer {
        padding: 0 14px 14px;
        display: flex;
        justify-content: flex-end;
      }

      .success-modal-confirm {
        min-width: 94px;
        height: 2.2rem;
        font-weight: 700;
        border-radius: 8px;
      }

      @media (max-width: 640px) {
        .success-modal-overlay {
          align-items: flex-end;
          padding: 0;
        }

        .success-modal-overlay::before {
          width: 100%;
          height: calc(100dvh - 8px);
          border-radius: 16px 16px 0 0;
        }

        .success-modal-shell {
          width: 100%;
          border-radius: 16px 16px 0 0;
          border-left: none;
          border-right: none;
          border-bottom: none;
        }

        .success-modal-footer {
          justify-content: stretch;
        }

        .success-modal-confirm {
          width: 100%;
        }
      }
    `,
  ],
})
export class SuccessModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() message = '';
  @Input() source: 'auto' | 'login' | 'register' = 'auto';
  @Input() flatBackdrop = false;
  @Output() closed = new EventEmitter<void>();

  backdropWidth = 400;
  backdropHeight = 520;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      setTimeout(() => this.syncBackdropSize(), 0);
    }

    if (changes['source'] && this.isOpen) {
      setTimeout(() => this.syncBackdropSize(), 0);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isOpen) {
      this.syncBackdropSize();
    }
  }

  private syncBackdropSize(): void {
    const selector =
      this.source === 'login'
        ? '.app-login-modal-shell[aria-label="Connexion"], .login-container-modal .login-card, .login-card'
        : this.source === 'register'
          ? '.app-login-modal-shell[aria-label="Inscription"], .register-container-modal .register-card, .register-card'
          : '.app-login-modal-shell[aria-label="Inscription"], .app-login-modal-shell[aria-label="Connexion"], .login-container-modal .login-card, .register-container-modal .register-card, .login-card, .register-card';

    const target = this.findFirstVisible(selector);
    if (!target) {
      this.backdropWidth = 400;
      this.backdropHeight = 520;
      return;
    }

    const rect = target.getBoundingClientRect();
    this.backdropWidth = Math.max(280, Math.round(rect.width));
    this.backdropHeight = Math.max(320, Math.round(rect.height));
  }

  private findFirstVisible(selector: string): HTMLElement | null {
    const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    return elements.find((element) => element.getClientRects().length > 0) ?? null;
  }

  close(): void {
    this.closed.emit();
  }
}
