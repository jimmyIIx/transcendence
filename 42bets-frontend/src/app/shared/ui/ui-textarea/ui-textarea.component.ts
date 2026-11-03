import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-textarea',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="ui-field-label" [for]="id">{{ label }}</label>
    <textarea
      class="ui-field-textarea"
      [id]="id"
      [name]="name"
      [rows]="rows"
      [placeholder]="placeholder"
      [required]="required"
      [disabled]="disabled"
    ></textarea>
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

      .ui-field-textarea {
        width: 100%;
        border: 1px solid var(--box-border);
        border-radius: 10px;
        background: var(--surface-card);
        color: var(--text-primary-ui);
        padding: 0.72rem 0.8rem;
        font-size: 0.92rem;
        resize: vertical;
        min-height: 140px;
      }

      .ui-field-textarea:focus {
        outline: none;
        border-color: color-mix(in srgb, var(--color-blue-42) 70%, var(--box-border));
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-blue-42) 24%, transparent);
      }
    `,
  ],
})
export class UiTextareaComponent {
  @Input() id = '';
  @Input() name = '';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() rows = 6;
  @Input() required = false;
  @Input() disabled = false;
}
