import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './legal-pages.component.scss',
})
export class PrivacyPolicyComponent {
  protected readonly currentPage = signal(1);
  protected readonly totalPages = 3;

  protected onDocumentScroll(container: HTMLElement): void {
    const pagePitch = 1066;
    const nextPage = Math.min(this.totalPages, Math.max(1, Math.round(container.scrollTop / pagePitch) + 1));
    this.currentPage.set(nextPage);
  }
}