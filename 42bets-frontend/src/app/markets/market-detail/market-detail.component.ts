import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, finalize, of } from 'rxjs';
import {
  CurrentUserContext,
  MarketConsentResponse,
  MarketOrderBook,
  MarketOrderRequest,
  MarketSide,
  MarketsService,
} from '../../services/markets';
import { TokenService } from '../../services/token';
import { MarketQuestionPipe } from '../../shared/market-question.pipe';

@Component({
  selector: 'app-market-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, MarketQuestionPipe],
  templateUrl: './market-detail.component.html',
  styleUrl: './market-detail.component.scss',
})
export class MarketDetailComponent implements OnInit {
  protected readonly orderBook = signal<MarketOrderBook | null>(null);
  protected readonly loading = signal(false);
  protected readonly placingOrder = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly side = signal<MarketSide>('YES');
  protected readonly price = signal<number>(50);
  protected readonly amount = signal<number>(1);
  protected readonly consentGranted = signal(false);
  protected readonly canManageConsent = signal(false);
  protected readonly consentMessage = signal<string | null>(null);
  protected readonly consentInProgress = signal(false);

  private marketId = 0;

  protected readonly isAuthenticated = computed(() => this.tokenService.isAccessTokenValid());

  private readonly marketsService = inject(MarketsService);
  private readonly tokenService = inject(TokenService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.marketId = id;
        this.loadOrderBook(id);
      }
    });
    this.route.queryParamMap.subscribe((params) => {
      const side = params.get('side');
      if (side === 'YES' || side === 'NO') this.side.set(side);
    });

    if (this.isAuthenticated()) {
      this.loadConsentContext();
    }
  }

  private loadConsentContext(): void {
    this.marketsService
      .getCurrentUserContext()
      .pipe(catchError(() => of(null as CurrentUserContext | null)))
      .subscribe((ctx) => {
        if (!ctx) return;
        this.consentGranted.set(!!ctx.marketGenerationConsent);
        this.canManageConsent.set(!!ctx.canManageMarketConsent);
      });
  }

  private loadOrderBook(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.marketsService
      .getOrderBook(id)
      .pipe(
        catchError((err) => {
          this.error.set(err?.error?.error ?? this.translate.instant('MARKETS.ERROR_LOAD_ORDERBOOK'));
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((ob) => {
        if (ob) this.orderBook.set(ob);
      });
  }

  protected setSide(side: MarketSide): void {
    this.side.set(side);
  }

  protected placeOrder(): void {
    if (!this.marketId) return;
    this.placingOrder.set(true);
    this.error.set(null);
    const request: MarketOrderRequest = {
      side: this.side(),
      price: this.price(),
      amount: this.amount(),
    };
    this.marketsService
      .placeOrder(this.marketId, request)
      .pipe(
        catchError((err) => {
          this.error.set(this.extractErrorMessage(err));
          return of(null);
        }),
        finalize(() => this.placingOrder.set(false)),
      )
      .subscribe((res) => {
        if (res) this.loadOrderBook(this.marketId);
      });
  }

  protected isMarketExpired(market: { resolved: boolean; endDate: string | null }): boolean {
    return !market.resolved && !!market.endDate && new Date(market.endDate).getTime() <= Date.now();
  }

  private extractErrorMessage(error: any): string {
    if (!error) return this.translate.instant('MARKETS.ERROR_PLACE_ORDER');
    if (typeof error === 'string' && error.trim().length > 0) return error;
    if (error?.error?.error) return error.error.error;
    if (error.message) return error.message;
    return this.translate.instant('MARKETS.ERROR_PLACE_ORDER');
  }

  protected enableMarketConsent(): void {
    if (!this.isAuthenticated()) return;
    if (!this.canManageConsent()) {
      this.consentMessage.set(this.translate.instant('MARKETS.CONSENT_UNAVAILABLE'));
      return;
    }
    this.consentInProgress.set(true);
    this.consentMessage.set(null);
    this.marketsService
      .enableMarketGenerationConsent()
      .pipe(
        catchError((err) => {
          this.consentMessage.set(err?.error?.error ?? this.translate.instant('MARKETS.ERROR_SAVE_CONSENT'));
          return of(null as MarketConsentResponse | null);
        }),
        finalize(() => this.consentInProgress.set(false)),
      )
      .subscribe((res) => {
        if (!res) return;
        this.consentGranted.set(true);
        this.consentMessage.set(this.translate.instant('MARKETS.CONSENT_ENABLED_MSG'));
      });
  }

  protected revokeMarketConsent(): void {
    if (!this.isAuthenticated()) return;
    if (!this.canManageConsent()) {
      this.consentMessage.set(this.translate.instant('MARKETS.CONSENT_UNAVAILABLE'));
      return;
    }
    this.consentInProgress.set(true);
    this.consentMessage.set(null);
    this.marketsService
      .revokeMarketGenerationConsent()
      .pipe(
        catchError((err) => {
          this.consentMessage.set(err?.error?.error ?? this.translate.instant('MARKETS.ERROR_REVOKE_CONSENT'));
          return of(null as MarketConsentResponse | null);
        }),
        finalize(() => this.consentInProgress.set(false)),
      )
      .subscribe((res) => {
        if (!res) return;
        this.consentGranted.set(false);
        this.consentMessage.set(this.translate.instant('MARKETS.CONSENT_REVOKED_MSG'));
      });
  }

  protected levelTotal(levels: Array<{ amount: number }>): number {
    return levels.reduce((sum, level) => sum + level.amount, 0);
  }

  protected monogram(question: string): string {
    const words = (question ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    const first = words[0][0] ?? '';
    const second = words.length > 1 ? words[1][0] : '';
    return (first + second).toUpperCase();
  }

  protected avatarGradient(id: number): string {
    const h1 = (id * 47) % 360;
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1} 70% 48%), hsl(${h2} 72% 38%))`;
  }

  protected categoryEmoji(category: string | null | undefined): string {
    const key = (category ?? '').trim().toUpperCase();
    const map: Record<string, string> = {
      SPORT: '🏅', SPORTS: '🏅',
      ESPORT: '🎮', ESPORTS: '🎮', GAMING: '🎮',
      PROGRESS: '📈', PROGRESSION: '📈',
      EXAM: '🎓', EDUCATION: '📚', ACADEMIC: '📚',
      PROJECT: '🛠️', EXP: '⭐', EXPERIENCE: '⭐',
      CRYPTO: '🪙', BLOCKCHAIN: '⛓️',
      FINANCE: '💰', BUSINESS: '💼', CAREER: '💼',
      TECHNOLOGY: '💻', TECH: '💻', SCIENCE: '🔬',
      POLITICS: '🗳️',
      COMMUNITY: '👥', SOCIAL: '👥',
      CULTURE: '🎭', ENTERTAINMENT: '🎬',
    };
    return map[key] ?? '🎲';
  }
}
