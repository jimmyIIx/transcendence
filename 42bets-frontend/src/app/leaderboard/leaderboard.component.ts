import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LeaderboardEntry, MarketsService } from '../services/markets';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.scss',
})
export class LeaderboardComponent {
  private readonly marketsService = inject(MarketsService);
  private readonly translate = inject(TranslateService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly entries = signal<LeaderboardEntry[]>([]);

  protected readonly participantCount = computed(() => this.entries().length);

  protected readonly topPnl = computed(() => {
    const first = this.entries()[0];
    return first ? first.pnl : 0;
  });

  protected readonly avgPnl = computed(() => {
    const rows = this.entries();
    if (rows.length === 0) return 0;
    const total = rows.reduce((sum, row) => sum + row.pnl, 0);
    return total / rows.length;
  });

  constructor() {
    this.loadLeaderboard();
  }

  protected loadLeaderboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.marketsService.getLeaderboard().subscribe({
      next: (rows) => {
        this.entries.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('LEADERBOARD.ERROR_LOAD'));
        this.loading.set(false);
      },
    });
  }

  protected winRate(entry: LeaderboardEntry): number {
    if (!entry.settledBets) return 0;
    return (entry.wonBets / entry.settledBets) * 100;
  }

  protected initials(name: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
}
