import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface UiSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-ui-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="ui-field-label" [for]="id">{{ label }}</label>
    <select class="ui-field-select" [id]="id" [name]="name" [required]="required" [disabled]="disabled">
      <option *ngFor="let opt of options" [value]="opt.value">{{ opt.label }}</option>
    </select>
  `,
  styles: [
    `
      .ui-field-label {
        display: block;
        margin-bottom: 0.35rem;
        color: var(--text-primary-ui);
        font-size: 0.84rem;
        font-weight: 700;
      }

      .ui-field-select {
        width: 100%;
        border: 1px solid var(--box-border);
        border-radius: 10px;
        background: var(--surface-card);
        color: var(--text-primary-ui);
        padding: 0.72rem 0.8rem;
        font-size: 0.92rem;
      }
    `,
  ],
})
export class UiSelectComponent {
  @Input() id = '';
  @Input() name = '';
  @Input() label = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() options: UiSelectOption[] = [];
}
