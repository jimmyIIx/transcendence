import { Component, HostListener, Input, OnChanges, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-error-model',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="error-modal-overlay"
      *ngIf="isOpen"
      [style.--error-backdrop-width.px]="backdropWidth"
      [style.--error-backdrop-height.px]="backdropHeight"
      (click)="close()"
    >
      <div class="error-modal-shell card-surface" (click)="$event.stopPropagation()">
        <div class="error-modal-header">
          <div class="error-modal-badge" aria-hidden="true">!</div>
          <h2>{{ 'MODAL.ERROR_TITLE' | translate }}</h2>
          <button class="error-modal-close" type="button" [attr.aria-label]="'MODAL.CLOSE_ARIA' | translate" (click)="close()">×</button>
        </div>
        <div class="error-modal-body">
          <p>{{ message }}</p>
        </div>
        <div class="error-modal-footer">
          <button class="btn-primary error-modal-confirm" type="button" (click)="close()">{{ 'MODAL.OK' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .error-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 2200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: transparent;
      }

      .error-modal-overlay::before {
        content: '';
        position: absolute;
        width: min(calc(100% - 32px), var(--error-backdrop-width, 400px));
        height: min(calc(100dvh - 32px), var(--error-backdrop-height, 520px));
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.16);
        pointer-events: none;
      }

      .error-modal-shell {
        position: relative;
        z-index: 1;
        width: min(100%, 300px);
        border-radius: 14px;
        border: 1px solid var(--box-border);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
        overflow: hidden;
        animation: errorModalIn 180ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      @keyframes errorModalIn {
        from {
          transform: translateY(12px) scale(0.985);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      .error-modal-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border-bottom: 1px solid var(--box-border);
        background: rgba(255, 255, 255, 0.03);
      }

      .error-modal-badge {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        color: #fff0f0;
        background: #8f2d2d;
        box-shadow: none;
        flex: 0 0 auto;
      }

      .error-modal-header h2 {
        margin: 0;
        font-size: 1rem;
        line-height: 1.2;
        font-weight: 700;
        color: var(--text-primary-ui);
        letter-spacing: 0.01em;
        flex: 1 1 auto;
      }

      .error-modal-close {
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

      .error-modal-close:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
      }

      .error-modal-body {
        padding: 12px 14px 10px;
      }

      .error-modal-body p {
        margin: 0;
        color: var(--text-primary-ui);
        font-size: 0.9375rem;
        line-height: 1.5;
        font-weight: 500;
      }

      .error-modal-footer {
        padding: 0 14px 14px;
        display: flex;
        justify-content: flex-end;
      }

      .error-modal-confirm {
        min-width: 94px;
        height: 2.2rem;
        font-weight: 700;
        border-radius: 8px;
      }

      @media (max-width: 640px) {
        .error-modal-overlay {
          align-items: flex-end;
          padding: 0;
        }

        .error-modal-overlay::before {
          width: 100%;
          height: calc(100dvh - 8px);
          border-radius: 16px 16px 0 0;
        }

        .error-modal-shell {
          width: 100%;
          border-radius: 16px 16px 0 0;
          border-left: none;
          border-right: none;
          border-bottom: none;
        }

        .error-modal-footer {
          justify-content: stretch;
        }

        .error-modal-confirm {
          width: 100%;
        }
      }
    `,
  ],
})
export class ErrorModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() message = '';
  @Input() source: 'auto' | 'login' | 'register' = 'auto';
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
        ? '.login-container-modal .login-card, .login-card'
        : this.source === 'register'
          ? '.register-container-modal .register-card, .register-card'
          : '.login-container-modal .login-card, .register-container-modal .register-card, .login-card, .register-card';

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
