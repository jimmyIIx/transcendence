import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, finalize, of } from 'rxjs';
import { MarketSummary, MarketsService } from '../services/markets';
import { TokenService } from '../services/token';
import { UiEmptyStateComponent } from '../shared/ui/ui-empty-state/ui-empty-state.component';
import { MarketQuestionPipe } from '../shared/market-question.pipe';

@Component({
  selector: 'app-markets',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, UiEmptyStateComponent, MarketQuestionPipe],
  templateUrl: './markets.component.html',
  styleUrl: './markets.component.scss',
})
export class MarketsComponent implements OnInit {
  protected readonly markets = signal<MarketSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isAuthenticated = computed(() => this.tokenService.isAccessTokenValid());

  protected readonly activeFilter = signal<{ type: 'category' | 'sort'; value: string } | null>(null);

  // Featured carousel ("Marchés en vedette") shown at the top of the tendances page.
  protected readonly featuredIndex = signal(0);

  protected readonly filteredMarkets = computed(() => {
    const all = this.markets();
    const f = this.activeFilter();
    if (!f) return all;
    if (f.type === 'category') {
      return all.filter((m) => (m.category ?? '').toUpperCase() === f.value.toUpperCase());
    }
    if (f.value === 'trending') {
      return [...all].sort((a, b) => b.openOrderCount - a.openOrderCount);
    }
    if (f.value === 'piscine') {
      const piscine = new Set(['PROGRESSION', 'EXAM', 'PROJECT', 'EXP', 'PROGRESS']);
      return all.filter((m) => piscine.has((m.category ?? '').toUpperCase()));
    }
    return all;
  });

  // Top active markets used as the featured carousel slides.
  protected readonly featuredMarkets = computed(() =>
    [...this.markets()]
      .filter((m) => !m.resolved)
      .sort((a, b) => b.openOrderCount - a.openOrderCount)
      .slice(0, 5),
  );

  protected readonly currentFeatured = computed(() => {
    const list = this.featuredMarkets();
    if (list.length === 0) return null;
    return list[this.featuredIndex() % list.length] ?? list[0];
  });

  // Persisted probability history per market (real evolution observed on the client).
  private readonly probHistory = signal<Record<number, Array<{ t: number; p: number }>>>({});
  private static readonly HISTORY_KEY = 'mk-prob-history';

  // Chart for the featured market: a curve rising toward the leading side's
  // current share so it's always clearly visible (green if YES leads, red if NO).
  protected readonly heroChart = computed(() => {
    const m = this.currentFeatured();
    if (!m) return null;
    return this.buildChart(this.syntheticSeries(m.id, this.leadPct(m)));
  });

  protected readonly heroChartColor = computed(() => {
    const m = this.currentFeatured();
    if (!m) return 'var(--color-blue-42)';
    return this.leadIsYes(m) ? 'var(--success-solid)' : 'var(--danger-solid)';
  });

  private syntheticSeries(id: number, end: number): number[] {
    const N = 48;
    const target = Math.max(3, Math.min(97, end));
    let seed = (id * 7919 + 13) >>> 0;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const vals: number[] = [];
    let v = 50;
    for (let i = 0; i < N; i++) {
      v += (rnd() - 0.5) * 12;
      v = v * 0.94 + target * 0.06;
      v = Math.max(3, Math.min(97, v));
      vals.push(v);
    }
    vals[N - 1] = target;
    return vals;
  }

  private buildChart(series: number[]): { line: string; area: string } {
    const W = 500;
    const H = 120;
    const pts = series.map((val, i) => ({
      x: series.length <= 1 ? W : (i / (series.length - 1)) * W,
      y: H - (Math.max(2, Math.min(98, val)) / 100) * H,
    }));
    if (pts.length === 1) pts.unshift({ x: 0, y: pts[0].y });
    const line = 'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
    const area = `${line} L${W},${H} L0,${H} Z`;
    return { line, area };
  }

  // "Sujets populaires" sidebar — most active markets.
  protected readonly popularMarkets = computed(() =>
    [...this.markets()]
      .filter((m) => !m.resolved)
      .sort((a, b) => b.openOrderCount - a.openOrderCount)
      .slice(0, 7),
  );

  private readonly marketsService = inject(MarketsService);
  private readonly tokenService = inject(TokenService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.hydrateHistory();
    this.route.queryParams.subscribe((params) => {
      const cat = params['category'];
      const sort = params['sort'];
      if (cat) this.activeFilter.set({ type: 'category', value: cat });
      else if (sort) this.activeFilter.set({ type: 'sort', value: sort });
      else this.activeFilter.set(null);
    });
    this.loadMarkets();
  }

  private loadMarkets(): void {
    this.loading.set(true);
    this.error.set(null);
    this.marketsService
      .getMarkets()
      .pipe(
        catchError((error: unknown) => {
          this.error.set(this.extractErrorMessage(error, 'MARKETS.ERROR_LOAD_MARKETS'));
          return of([] as MarketSummary[]);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((markets) => {
        this.markets.set(markets);
        this.recordHistory(markets);

        if (markets.length === 0 && !this.isAuthenticated()) {
          this.router.navigate(['/register']);
        }
      });
  }

  private hydrateHistory(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(MarketsComponent.HISTORY_KEY);
      if (raw) this.probHistory.set(JSON.parse(raw));
    } catch {
      /* ignore malformed storage */
    }
  }

  private recordHistory(markets: MarketSummary[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const now = Date.now();
    const next: Record<number, Array<{ t: number; p: number }>> = { ...this.probHistory() };
    for (const m of markets) {
      const list = next[m.id] ? [...next[m.id]] : [];
      const last = list[list.length - 1];
      const p = m.yesProbability ?? 50;
      if (!last || last.p !== p || now - last.t > 60_000) {
        list.push({ t: now, p });
        if (list.length > 90) list.splice(0, list.length - 90);
        next[m.id] = list;
      }
    }
    this.probHistory.set(next);
    try {
      localStorage.setItem(MarketsComponent.HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }

  private extractErrorMessage(error: unknown, fallbackKey: string): string {
    if (!error) {
      return this.translate.instant(fallbackKey);
    }

    if (typeof error === 'string' && error.trim().length > 0) {
      return error;
    }

    if (typeof error === 'object') {
      const candidate = error as { error?: { error?: string }; message?: string };
      if (candidate.error?.error) {
        return candidate.error.error;
      }
      if (candidate.message) {
        return candidate.message;
      }
    }

    return this.translate.instant(fallbackKey);
  }

  // Two-letter monogram used for the card avatar (Polymarket-style).
  protected monogram(question: string): string {
    const words = (question ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    const first = words[0][0] ?? '';
    const second = words.length > 1 ? words[1][0] : '';
    return (first + second).toUpperCase();
  }

  // Deterministic gradient per market so each card avatar has its own color.
  protected avatarGradient(id: number): string {
    const h1 = (id * 47) % 360;
    const h2 = (h1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${h1} 70% 48%), hsl(${h2} 72% 38%))`;
  }

  // Emoji picked from the market category so each bet has a meaningful logo.
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

  // Total liquidity displayed as the market "volume".
  protected volume(market: MarketSummary): number {
    return (market.yesLiquidity ?? 0) + (market.noLiquidity ?? 0);
  }

  // Displayed probabilities based on the real amount bet on each side (liquidity).
  // With no bets yet, both sides show 0% so it's clear nothing is on the market.
  protected yesPct(market: MarketSummary): number {
    if (market.resolved) return market.yesProbability ?? 0;
    const y = market.yesLiquidity ?? 0;
    const total = y + (market.noLiquidity ?? 0);
    return total > 0 ? (y / total) * 100 : 0;
  }

  protected noPct(market: MarketSummary): number {
    if (market.resolved) return 100 - (market.yesProbability ?? 0);
    const n = market.noLiquidity ?? 0;
    const total = (market.yesLiquidity ?? 0) + n;
    return total > 0 ? (n / total) * 100 : 0;
  }

  // Leading side of a market (used by the card gauge so a NO-dominated market
  // visibly shows NO winning instead of an empty YES gauge).
  protected leadPct(market: MarketSummary): number {
    return Math.max(this.yesPct(market), this.noPct(market));
  }

  protected leadIsYes(market: MarketSummary): boolean {
    return this.yesPct(market) >= this.noPct(market);
  }

  // "NOUVEAU" badge for markets created within the last 3 days.
  protected isNew(market: MarketSummary): boolean {
    if (!market.createdAt) return false;
    const created = new Date(market.createdAt).getTime();
    return Number.isFinite(created) && Date.now() - created <= 3 * 86_400_000;
  }

  protected nextFeatured(): void {
    const len = this.featuredMarkets().length;
    if (len === 0) return;
    this.featuredIndex.update((i) => (i + 1) % len);
  }

  protected prevFeatured(): void {
    const len = this.featuredMarkets().length;
    if (len === 0) return;
    this.featuredIndex.update((i) => (i - 1 + len) % len);
  }

  protected goFeatured(index: number): void {
    this.featuredIndex.set(index);
  }

  protected trackByMarket(_: number, market: MarketSummary): number {
    return market.id;
  }
}
