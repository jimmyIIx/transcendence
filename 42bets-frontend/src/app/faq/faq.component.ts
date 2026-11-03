import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TokenService } from '../services/token';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  badge: string;
  items: FaqItem[];
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
})
export class FaqComponent {
  private readonly tokenService = inject(TokenService);
  protected readonly openItem = signal<string | null>(null);

  protected readonly categories: FaqCategory[] = [
    {
      title: 'FAQ.CAT1_TITLE',
      badge: 'FAQ.CAT1_BADGE',
      items: [
        { question: 'FAQ.CAT1_Q1', answer: 'FAQ.CAT1_A1' },
        { question: 'FAQ.CAT1_Q2', answer: 'FAQ.CAT1_A2' },
        { question: 'FAQ.CAT1_Q3', answer: 'FAQ.CAT1_A3' },
      ],
    },
    {
      title: 'FAQ.CAT2_TITLE',
      badge: 'FAQ.CAT2_BADGE',
      items: [
        { question: 'FAQ.CAT2_Q1', answer: 'FAQ.CAT2_A1' },
        { question: 'FAQ.CAT2_Q2', answer: 'FAQ.CAT2_A2' },
        { question: 'FAQ.CAT2_Q3', answer: 'FAQ.CAT2_A3' },
        { question: 'FAQ.CAT2_Q4', answer: 'FAQ.CAT2_A4' },
      ],
    },
    {
      title: 'FAQ.CAT3_TITLE',
      badge: 'FAQ.CAT3_BADGE',
      items: [
        { question: 'FAQ.CAT3_Q1', answer: 'FAQ.CAT3_A1' },
        { question: 'FAQ.CAT3_Q2', answer: 'FAQ.CAT3_A2' },
        { question: 'FAQ.CAT3_Q3', answer: 'FAQ.CAT3_A3' },
        { question: 'FAQ.CAT3_Q4', answer: 'FAQ.CAT3_A4' },
      ],
    },
    {
      title: 'FAQ.CAT4_TITLE',
      badge: 'FAQ.CAT4_BADGE',
      items: [
        { question: 'FAQ.CAT4_Q1', answer: 'FAQ.CAT4_A1' },
        { question: 'FAQ.CAT4_Q2', answer: 'FAQ.CAT4_A2' },
      ],
    },
  ];

  protected isLoggedIn(): boolean {
    return this.tokenService.isAccessTokenValid();
  }

  protected toggle(id: string): void {
    this.openItem.update((current) => (current === id ? null : id));
  }

  protected isOpen(id: string): boolean {
    return this.openItem() === id;
  }
}
