import { describe, expect, it } from 'vitest';
import { rankKey, sortByRank } from '@/lib/rank';
import { item } from './fixture';

describe('rankKey', () => {
  it('returns 0 for malformed dates', () => {
    expect(rankKey(item({ published_at: 'not-a-date' }))).toBe(0);
  });

  it('boosts long summaries over bare headlines', () => {
    const base = Date.now();
    const iso = new Date(base).toISOString();
    const bare = item({ published_at: iso, source_type: 'rss', summary: '' });
    const rich = item({ published_at: iso, source_type: 'rss', summary: 'x'.repeat(150) });
    expect(rankKey(rich)).toBeGreaterThan(rankKey(bare));
  });

  it('penalizes github branch noise vs journalism at the same timestamp', () => {
    const iso = new Date().toISOString();
    const noise = item({
      published_at: iso,
      source_type: 'github',
      title: 'Bump deps on refs/heads/main',
      summary: '',
    });
    const news = item({ published_at: iso, source_type: 'rss', title: 'Startup raises Series A', summary: '' });
    expect(rankKey(news)).toBeGreaterThan(rankKey(noise));
  });
});

describe('sortByRank', () => {
  it('sorts descending and handles empty input', () => {
    expect(sortByRank([])).toEqual([]);
    const now = Date.now();
    const old = item({ published_at: new Date(now - 999_000_000).toISOString(), source_type: 'rss' });
    const fresh = item({ published_at: new Date(now).toISOString(), source_type: 'rss' });
    expect(sortByRank([old, fresh])[0]).toBe(fresh);
  });
});
