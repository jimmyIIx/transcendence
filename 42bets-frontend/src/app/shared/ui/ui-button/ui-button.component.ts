import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [ngClass]="variant"
      class="ui-button"
      (click)="pressed.emit($event)"
    >
      <ng-container *ngIf="!loading; else loadingTpl"><ng-content /></ng-container>
    </button>

    <ng-template #loadingTpl>{{ loadingText }}</ng-template>
  `,
  styles: [
    `
      .ui-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        min-height: 2.4rem;
        border-radius: 10px;
        border: 1px solid transparent;
        font-weight: 700;
        cursor: pointer;
        transition: filter 0.16s ease;
      }

      .ui-button.primary {
        background: var(--button-primary-bg);
        color: var(--button-primary-text);
      }

      .ui-button.primary:hover:not(:disabled) {
        background: var(--button-primary-bg-hover);
      }

      .ui-button.ghost {
        background: var(--button-ghost-bg);
        color: var(--text-primary-ui);
        border-color: var(--box-border);
      }

      .ui-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'ghost' = 'primary';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() loadingText = 'Loading...';
  @Output() pressed = new EventEmitter<MouseEvent>();
}
