import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="ui-empty-state">
      <p class="ui-empty-kicker" *ngIf="kicker">{{ kicker }}</p>
      <h2>{{ title }}</h2>
      <p>{{ text }}</p>
      <ng-content />
    </section>
  `,
  styles: [
    `
      .ui-empty-state {
        border: 1px solid var(--box-border);
        border-radius: 14px;
        background: var(--surface-card);
        padding: 1rem;
        text-align: center;
      }

      .ui-empty-kicker {
        margin: 0 0 0.25rem;
        color: var(--color-blue-42);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.72rem;
        font-weight: 800;
      }

      .ui-empty-state h2 {
        margin: 0;
        color: var(--text-primary-ui);
      }

      .ui-empty-state p {
        color: var(--text-secondary-ui);
      }
    `,
  ],
})
export class UiEmptyStateComponent {
  @Input() kicker = '';
  @Input() title = '';
  @Input() text = '';
}
