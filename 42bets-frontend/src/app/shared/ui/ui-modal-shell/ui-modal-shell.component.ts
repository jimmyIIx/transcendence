import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-modal-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ui-modal-overlay" *ngIf="open" (click)="closed.emit()">
      <section class="ui-modal-panel" (click)="$event.stopPropagation()">
        <header class="ui-modal-head">
          <h3>{{ title }}</h3>
          <button type="button" class="ui-modal-close" (click)="closed.emit()">×</button>
        </header>
        <div class="ui-modal-body"><ng-content /></div>
      </section>
    </div>
  `,
  styles: [
    `
      .ui-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 2200;
        display: grid;
        place-items: center;
        background: var(--surface-overlay);
        padding: 1rem;
      }

      .ui-modal-panel {
        width: min(100%, 520px);
        border: 1px solid var(--box-border);
        border-radius: 14px;
        background: var(--surface-card);
      }

      .ui-modal-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 0.95rem;
        border-bottom: 1px solid var(--box-border);
      }

      .ui-modal-head h3 {
        margin: 0;
        color: var(--text-primary-ui);
      }

      .ui-modal-close {
        border: none;
        background: transparent;
        color: var(--text-secondary-ui);
        font-size: 1.3rem;
        cursor: pointer;
      }

      .ui-modal-body {
        padding: 0.95rem;
      }
    `,
  ],
})
export class UiModalShellComponent {
  @Input() open = false;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();
}
