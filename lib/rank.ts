import { NewsItem } from './types';

/**
 * Compute an editorial ranking key for a news item.
 *
 * The store is ordered by published_at, but raw recency surfaces noise:
 * GitHub branch commits, Twitter boilerplate and image-credit captions jump
 * to the top purely because they are the newest. This assigns a per-item
 * penalty so those items sink while real journalism (RSS / Google News /
 * Web articles with real summaries) keeps its place near the top.
 */
const CHANNEL_BONUS_MS: Partial<Record<NewsItem['source_type'], number>> = {
  rss: 26 * 60 * 60 * 1000, // +26h — company blogs + tech media
  google: 22 * 60 * 60 * 1000,
  web: 8 * 60 * 60 * 1000,
  reddit: 4 * 60 * 60 * 1000,
  hn: 5 * 60 * 60 * 1000,
  youtube: 2 * 60 * 60 * 1000,
  arxiv: 0,
  twitter: -6 * 60 * 60 * 1000, // -6h — terse, noisy
  github: -18 * 60 * 60 * 1000, // -18h — commits, dependabot bumps, branch pushes
};

export function rankKey(item: NewsItem): number {
  const t = new Date(item.published_at).getTime();
  if (isNaN(t)) return 0;

  const channel = CHANNEL_BONUS_MS[item.source_type] ?? 0;
  let quality = 0;

  const summary = item.summary || '';
  if (summary.length >= 100) quality += 4 * 60 * 60 * 1000;
  else if (summary.length >= 40) quality += 2 * 60 * 60 * 1000;

  if (item.source_type === 'github') {
    if (/refs\/heads|dependabot|bump|update\//i.test(item.title)) quality -= 12 * 60 * 60 * 1000;
  }
  if (item.source_type === 'twitter' && (item.title || '').length < 60) {
    quality -= 4 * 60 * 60 * 1000;
  }
  if (/^(credit:|image:|via |url source)/i.test(item.title || '')) {
    quality -= 20 * 60 * 60 * 1000;
  }

  return t + channel + quality;
}

export function sortByRank(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => rankKey(b) - rankKey(a));
}