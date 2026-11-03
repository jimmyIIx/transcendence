// Pure, framework-free helpers for the portfolio profit/loss (P&L) computations.
// Kept separate from the Angular component so the math can be unit-tested in isolation.

export type ChartRange = '1d' | '1w' | '1m' | '1y' | 'ytd' | 'all';

/** Minimal shape of a user order needed to derive realized P&L. */
export interface PnlOrderLike {
  side: 'YES' | 'NO';
  price: number;
  amount: number;
  filledAmount?: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED';
  createdAt: string;
  marketResolved: boolean;
  marketResolvedOutcome: string | null;
  marketEndDate: string | null;
}

export interface PnlEvent {
  time: number;
  delta: number;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export const CHART_WIDTH = 442;
export const CHART_HEIGHT = 65;
const CHART_MID = CHART_HEIGHT / 2;
const CHART_TOP = 6;
const CHART_BOTTOM = 59;

/**
 * Realized P&L events derived from settled bets.
 * A resolved bet gains its full `amount` if it won, and always cost `price * amount / 100`.
 * Cancelled orders are refunded and never produce a gain or a loss.
 */
export function pnlEventsFromOrders(orders: readonly PnlOrderLike[]): PnlEvent[] {
  return orders
    .filter((o) => o.marketResolved && o.status !== 'CANCELLED')
    .map((o) => {
      const shares = (o.filledAmount ?? 0) + o.amount;
      const won = o.marketResolvedOutcome === o.side;
      const gain = won ? shares : 0;
      const spent = (o.price * shares) / 100;
      const when = o.marketEndDate ?? o.createdAt;
      return { time: new Date(when).getTime(), delta: gain - spent };
    })
    .filter((e) => Number.isFinite(e.time))
    .sort((a, b) => a.time - b.time);
}

/** Start timestamp (ms) of the given range, relative to `now`. */
export function rangeStart(range: ChartRange, now: number): number {
  const day = 86_400_000;
  switch (range) {
    case '1d':
      return now - day;
    case '1w':
      return now - 7 * day;
    case '1m':
      return now - 30 * day;
    case '1y':
      return now - 365 * day;
    case 'ytd':
      return new Date(new Date(now).getFullYear(), 0, 1).getTime();
    default:
      return 0;
  }
}

/** Sum of realized P&L deltas that occurred at or after `start`. */
export function pnlSince(events: readonly PnlEvent[], start: number): number {
  return events.filter((e) => e.time >= start).reduce((sum, e) => sum + e.delta, 0);
}

/** Cumulative P&L curve points mapped to the chart viewBox (0 0 442 65). */
export function buildChartPoints(events: readonly PnlEvent[], start: number, now: number): ChartPoint[] {
  const span = Math.max(now - start, 1);
  const windowed = events.filter((e) => e.time >= start);

  const series: { time: number; cum: number }[] = [{ time: start, cum: 0 }];
  let cum = 0;
  for (const e of windowed) {
    cum += e.delta;
    series.push({ time: Math.min(Math.max(e.time, start), now), cum });
  }
  series.push({ time: now, cum });

  const cums = series.map((p) => p.cum);
  const min = Math.min(...cums, 0);
  const max = Math.max(...cums, 0);
  const spread = max - min;

  return series.map((p) => ({
    x: ((p.time - start) / span) * CHART_WIDTH,
    y: spread > 0 ? CHART_BOTTOM - ((p.cum - min) / spread) * (CHART_BOTTOM - CHART_TOP) : CHART_MID,
  }));
}

/** SVG path (`d`) for the P&L line. */
export function chartLinePath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return `M0,${CHART_MID} L${CHART_WIDTH},${CHART_MID}`;
  return 'M' + points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L');
}

/** SVG path (`d`) for the filled area under the P&L line. */
export function chartAreaPath(points: readonly ChartPoint[]): string {
  if (points.length === 0) {
    return `M0,${CHART_MID} L${CHART_WIDTH},${CHART_MID} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;
  }
  const line = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L');
  const firstX = points[0].x.toFixed(2);
  const lastX = points[points.length - 1].x.toFixed(2);
  return `M${line} L${lastX},${CHART_HEIGHT} L${firstX},${CHART_HEIGHT} Z`;
}
