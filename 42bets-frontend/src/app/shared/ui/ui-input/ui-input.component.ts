import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="ui-field-label" [for]="id">{{ label }}</label>
    <input
      class="ui-field-input"
      [id]="id"
      [name]="name"
      [type]="type"
      [placeholder]="placeholder"
      [required]="required"
      [autocomplete]="autocomplete"
      [disabled]="disabled"
    />
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

      .ui-field-input {
        width: 100%;
        border: 1px solid var(--box-border);
        border-radius: 10px;
        background: var(--surface-card);
        color: var(--text-primary-ui);
        padding: 0.72rem 0.8rem;
        font-size: 0.92rem;
      }

      .ui-field-input:focus {
        outline: none;
        border-color: color-mix(in srgb, var(--color-blue-42) 70%, var(--box-border));
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-blue-42) 24%, transparent);
      }
    `,
  ],
})
export class UiInputComponent {
  @Input() id = '';
  @Input() name = '';
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() autocomplete = 'off';
  @Input() required = false;
  @Input() disabled = false;
}
