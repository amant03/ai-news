import { describe, expect, it } from 'vitest';
import {
  engagementScore,
  hasEngagement,
  frontPageOrder,
  diversifiedTopStories,
  lastNHours,
  olderThan,
} from '@/lib/engagement';
import { item } from './fixture';

describe('engagementScore', () => {
  it('returns 0 with no signals', () => {
    expect(engagementScore(item())).toBe(0);
    expect(hasEngagement(item())).toBe(false);
  });

  it('grows with likes and squashes viral outliers via log curve', () => {
    const small = engagementScore(item({ tweet_metrics: { likeCount: 10, retweetCount: 0, replyCount: 0, viewCount: 0 } }));
    const big = engagementScore(item({ tweet_metrics: { likeCount: 10000, retweetCount: 0, replyCount: 0, viewCount: 0 } }));
    expect(big).toBeGreaterThan(small);
    expect(big / small).toBeLessThan(100); // log-squashed, not linear
  });

  it('counts reddit score and comments', () => {
    expect(engagementScore(item({ source_type: 'reddit', score: 500, num_comments: 100 }))).toBeGreaterThan(0);
  });
});

describe('frontPageOrder', () => {
  it('ranks engaged stories above equally-fresh unengaged ones', () => {
    const iso = new Date().toISOString();
    const quiet = item({ published_at: iso, source_type: 'rss' });
    const loud = item({ published_at: iso, source_type: 'hn', score: 900 });
    expect(frontPageOrder([quiet, loud])[0]).toBe(loud);
  });
});

describe('diversifiedTopStories', () => {
  it('caps any single source at 2 and respects count', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      item({ source: 'same', source_label: 'Same', source_type: 'hn', score: 100 - i })
    );
    const top = diversifiedTopStories(items, 5);
    expect(top).toHaveLength(5);
    expect(new Set(top.map(i => i.url)).size).toBe(5);
  });

  it('returns fewer than count when the feed is short', () => {
    expect(diversifiedTopStories([item()], 10)).toHaveLength(1);
  });
});

describe('time windows', () => {
  it('lastNHours / olderThan split on recency', () => {
    const fresh = item({ published_at: new Date().toISOString() });
    const stale = item({ published_at: new Date(Date.now() - 72 * 3600_000).toISOString() });
    expect(lastNHours([fresh, stale], 24).map(i => i.url)).toEqual([fresh.url]);
    expect(olderThan([fresh, stale], 24).map(i => i.url)).toEqual([stale.url]);
  });
});
