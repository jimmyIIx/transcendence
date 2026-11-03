import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  imports: [CommonModule],
  template: `<article class="ui-card" [ngClass]="variant"><ng-content /></article>`,
  styles: [
    `
      .ui-card {
        border: 1px solid var(--box-border);
        border-radius: 14px;
        background: var(--bg-secondary);
      }

      :host(.contact-card) .ui-card {
        border: 0;
        border-radius: 0;
        background: transparent;
        padding: 0;
      }
    `,
  ],
})
export class UiCardComponent {
  @Input() variant = '';
}
