import { describe, expect, it } from 'vitest';
import {
  engagementKey,
  sanitizeNick,
  sanitizeText,
} from '@/lib/engagement-store';
import { analyzeTexts } from '@/lib/sentiment';
import {
  mapRedditComment,
  redditIdFrom,
  stripHtml,
  xStatusId,
  xThreadFallback,
} from '@/lib/social';

describe('engagementKey', () => {
  it('is stable and strips query params', () => {
    const a = engagementKey({ url: 'https://example.com/story?x=1' });
    const b = engagementKey({ url: 'https://example.com/story' });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{16}$/);
  });

  it('falls back to title', () => {
    expect(engagementKey({ title: 'Hello' })).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe('sanitize', () => {
  it('strips tags and enforces minimum length', () => {
    expect(sanitizeText('<b>hi</b> there')).toBe('hi there');
    expect(sanitizeText('x')).toBeNull();
    expect(sanitizeText(123)).toBeNull();
  });

  it('defaults empty nicks to anon', () => {
    expect(sanitizeNick('')).toBe('anon');
    expect(sanitizeNick('  Ada  ')).toBe('Ada');
  });
});

describe('analyzeTexts', () => {
  it('buckets positive/negative/neutral', () => {
    const r = analyzeTexts([
      'Huge breakthrough record performance beats everything',
      'Major lawsuit alleges dangerous data breach and hack',
      'The meeting is scheduled for Tuesday afternoon',
    ]);
    expect(r.positive).toBe(1);
    expect(r.negative).toBe(1);
    expect(r.neutral).toBe(1);
    expect(r.total).toBe(3);
    expect(r.label).toBe('neutral');
  });

  it('labels clear majorities', () => {
    const r = analyzeTexts(['amazing breakthrough win', 'excellent record launch']);
    expect(r.label).toBe('positive');
    expect(r.score).toBeGreaterThan(0);
  });
});

describe('social parsers', () => {
  it('extracts reddit ids', () => {
    expect(redditIdFrom('https://www.reddit.com/r/ai/comments/abc123/title/')).toBe('abc123');
    expect(redditIdFrom('nope')).toBeNull();
  });

  it('maps reddit comments with nested replies', () => {
    const c = mapRedditComment({
      data: {
        author: 'tester', body: 'Great <b>post</b>!', score: 42, created_utc: 1700000000,
        replies: { data: { children: [{ data: { author: 'replier', body: 'Agreed', score: 5 } }] } },
      },
    }, 2);
    expect(c?.author).toBe('u/tester');
    expect(c?.text).toBe('Great post !');
    expect(c?.replies).toHaveLength(1);
  });

  it('drops deleted/empty reddit comments', () => {
    expect(mapRedditComment({ data: { author: '[deleted]', body: 'x', score: 1 } }, 1)).toBeNull();
    expect(mapRedditComment({ wrong: true }, 1)).toBeNull();
  });

  it('strips html entities', () => {
    expect(stripHtml('a &amp; b &#x2F; c')).toBe('a & b / c');
  });

  it('falls back for X with a link-out', () => {
    const t = xThreadFallback('https://x.com/user/status/1234567890123456789');
    expect(t.unsupported).toBe(true);
    expect(t.postUrl).toContain('1234567890123456789');
    expect(xStatusId('https://x.com/home')).toBeNull();
    expect(xStatusId('1234567890123456789')).toBe('1234567890123456789');
  });
});
