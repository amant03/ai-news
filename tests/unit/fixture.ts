import type { NewsItem } from '@/lib/types';

let n = 0;

/** Minimal valid NewsItem for pure-logic tests. */
export function item(overrides: Partial<NewsItem> = {}): NewsItem {
  n += 1;
  return {
    source: 'test',
    source_type: 'rss',
    title: `Test story ${n}`,
    summary: '',
    content: '',
    url: `https://example.com/${n}`,
    author: '',
    category: 'other',
    published_at: new Date(Date.now() - n * 3600_000).toISOString(),
    ...overrides,
  };
}
