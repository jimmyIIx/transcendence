import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-stat-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="ui-stat-tile" [ngClass]="className">
      <p class="ui-stat-label" [ngClass]="labelClass">{{ label }}</p>
      <p class="ui-stat-value" [ngClass]="valueClass">{{ value }}</p>
      <p class="ui-stat-meta" *ngIf="meta" [ngClass]="metaClass">{{ meta }}</p>
    </article>
  `,
  styles: [
    `
      .ui-stat-tile {
        border: 1px solid var(--box-border);
        border-radius: 12px;
        background: var(--surface-card);
        padding: 0.75rem 0.85rem;
      }

      .ui-stat-label {
        margin: 0;
        color: var(--text-muted-ui);
        font-size: 0.75rem;
      }

      .ui-stat-value {
        display: block;
        margin-top: 0.2rem;
        color: var(--text-primary-ui);
        font-size: 1.15rem;
      }

      .ui-stat-meta {
        margin: 0.28rem 0 0;
        color: var(--text-secondary-ui);
        font-size: 0.76rem;
      }
    `,
  ],
})
export class UiStatTileComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() meta = '';
  @Input() className = '';
  @Input() labelClass = '';
  @Input() valueClass = '';
  @Input() metaClass = '';
}
