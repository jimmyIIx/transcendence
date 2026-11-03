import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img
      *ngIf="src && !loadError()"
      [src]="src"
      [alt]="alt"
      class="ui-avatar"
      [ngClass]="imageClass || className"
      [style.width.px]="size"
      [style.height.px]="size"
      (error)="loadError.set(true)"
    />
    <span
      *ngIf="!src || loadError()"
      class="ui-avatar"
      [ngClass]="fallbackClass || className"
      [style.width.px]="size"
      [style.height.px]="size"
      [style.background]="background"
    >{{ fallback }}</span>
  `,
  styles: [
    `
      .ui-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        object-fit: cover;
        font-weight: 800;
        font-size: 0.85rem;
        color: var(--button-primary-text);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
      }
    `,
  ],
})
export class UiAvatarComponent {
  @Input() src: string | null = null;
  @Input() alt = 'Avatar';
  @Input() fallback = '?';
  @Input() size = 38;
  @Input() background = 'var(--color-blue-42)';
  @Input() className = '';
  @Input() imageClass = '';
  @Input() fallbackClass = '';
  protected readonly loadError = signal(false);
}
