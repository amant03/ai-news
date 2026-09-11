import type { ModelRecord } from './model-registry';

function finite(n: unknown): number | undefined {
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function valueScore(m: ModelRecord): number {
  const intel = finite(m.intelligenceIndex) ?? 0;
  const cost =
    finite(m.aaCostPerTask) ??
    (() => {
      const p = finite(m.promptPrice);
      const c = finite(m.completionPrice);
      if (p === undefined && c === undefined) return undefined;
      return ((p ?? c ?? 0) + (c ?? p ?? 0)) / 2;
    })();
  if (!intel) return 0;
  if (cost === undefined || cost <= 0) return intel;
  return intel / Math.max(cost, 0.01);
}

/**
 * Deterministic one-liner summarising a leaderboard.
 * Pure string templating off already-sorted data — no LLM needed.
 */
export function leaderboardInsight(models: ModelRecord[]): string {
  if (!models || models.length === 0) return 'No models to compare yet.';
  const byIntel = [...models].sort(
    (a, b) => (finite(b.intelligenceIndex) ?? -Infinity) - (finite(a.intelligenceIndex) ?? -Infinity)
  );
  const byValue = [...models].sort((a, b) => valueScore(b) - valueScore(a));
  const topIntel = byIntel[0];
  const bestValue = byValue[0];
  if (!topIntel) return 'No models to compare yet.';
  if (bestValue && bestValue.id !== topIntel.id) {
    return `${topIntel.name} leads on raw intelligence, but ${bestValue.name} delivers the best score-per-dollar right now.`;
  }
  return `${topIntel.name} leads on both raw intelligence and score-per-dollar right now.`;
}

export function mediaBoardInsight(opts: {
  items: Array<{ name: string; score?: number | null }>;
  metricLabel: string;
  higherIsBetter?: boolean;
}): string {
  const { items, metricLabel, higherIsBetter = true } = opts;
  if (!items || items.length === 0) return 'No entries to compare yet.';
  const ranked = [...items].sort((a, b) => {
    const av = typeof a.score === 'number' && Number.isFinite(a.score) ? a.score : -Infinity;
    const bv = typeof b.score === 'number' && Number.isFinite(b.score) ? b.score : -Infinity;
    return higherIsBetter ? bv - av : av - bv;
  });
  const top = ranked[0];
  return `${top.name} leads this board on ${metricLabel} right now.`;
}
