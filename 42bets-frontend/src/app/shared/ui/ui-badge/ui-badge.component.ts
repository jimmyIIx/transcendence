import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="ui-badge" [ngClass]="[tone, className]"><ng-content /></span>`,
  styles: [
    `
      .ui-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.72rem;
        font-weight: 700;
        border: 1px solid var(--box-border);
        color: var(--text-primary-ui);
        background: var(--surface-card);
      }

      .success {
        color: var(--success-text);
        background: var(--success-bg);
        border-color: var(--success-border);
      }

      .danger {
        color: var(--danger-text);
        background: var(--danger-bg);
        border-color: var(--danger-border);
      }

      .warning {
        color: var(--warning-text);
        background: var(--warning-bg);
      }
    `,
  ],
})
export class UiBadgeComponent {
  @Input() tone: 'success' | 'danger' | 'warning' | '' = '';
  @Input() className = '';
}
