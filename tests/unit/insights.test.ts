import { describe, expect, it } from 'vitest';
import { leaderboardInsight, mediaBoardInsight } from '@/lib/insights';
import type { ModelRecord } from '@/lib/model-registry';

function model(overrides: Partial<ModelRecord> & { id: string; name: string }): ModelRecord {
  return {
    provider: 'TestLab',
    source: 'test',
    family: 'closed',
    ...overrides,
  } as ModelRecord;
}

describe('leaderboardInsight', () => {
  it('returns an empty-state line for no models', () => {
    expect(leaderboardInsight([])).toMatch(/no models/i);
  });

  it('names the intelligence leader and the value leader when they differ', () => {
    const text = leaderboardInsight([
      model({ id: 'a', name: 'Titan', intelligenceIndex: 90, promptPrice: 10, completionPrice: 10 }),
      model({ id: 'b', name: 'Sparrow', intelligenceIndex: 60, promptPrice: 0.1, completionPrice: 0.1 }),
    ]);
    expect(text).toContain('Titan');
    expect(text).toContain('Sparrow');
  });

  it('collapses to a single winner when one model leads both', () => {
    const text = leaderboardInsight([
      model({ id: 'a', name: 'Titan', intelligenceIndex: 90, promptPrice: 0.1, completionPrice: 0.1 }),
      model({ id: 'b', name: 'Sparrow', intelligenceIndex: 60, promptPrice: 10, completionPrice: 10 }),
    ]);
    expect(text).toContain('Titan');
    expect(text).toMatch(/both/);
  });
});

describe('mediaBoardInsight', () => {
  it('returns an empty-state line for no items', () => {
    expect(mediaBoardInsight({ items: [], metricLabel: 'Elo' })).toMatch(/no entries/i);
  });

  it('picks the highest score by default', () => {
    expect(
      mediaBoardInsight({ items: [{ name: 'A', score: 1200 }, { name: 'B', score: 1400 }], metricLabel: 'Elo' })
    ).toContain('B');
  });

  it('picks the lowest score when lower is better', () => {
    expect(
      mediaBoardInsight({
        items: [{ name: 'A', score: 12.5 }, { name: 'B', score: 4.1 }],
        metricLabel: 'WER',
        higherIsBetter: false,
      })
    ).toContain('B');
  });
});
