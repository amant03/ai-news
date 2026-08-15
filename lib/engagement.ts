import { NewsItem } from './types';

/**
 * A single normalized "how much does the internet care?" score.
 *
 * Engagement is the strongest editorial signal the user asked for: a story
 * climbs the front page because people actually interacted with it — X views,
 * likes/retweets/replies, Reddit upvotes, HN points, comments, GitHub stars.
 * We combine every available signal with a log-squash so a single viral tweet
 * doesn't drown out everything else.
 */
export function engagementScore(item: NewsItem): number {
  let s = 0;

  const tm = item.tweet_metrics;
  if (tm) {
    s += (tm.viewCount || 0) / 100; // views are big; squash
    s += (tm.likeCount || 0) * 1.5;
    s += (tm.retweetCount || 0) * 2;
    s += (tm.replyCount || 0) * 1.2;
  }

  if (item.score) s += item.score; // reddit upvotes / HN points / github stars
  if (item.num_comments) s += item.num_comments * 0.8;

  // Log-squash: 1..10k maps to a smooth curve; 100 → ~5, 10k → ~10.
  return s > 0 ? Math.log10(1 + s) * 2.2 : 0;
}

/** Story has at least one real interaction signal (not zeroed-out). */
export function hasEngagement(item: NewsItem): boolean {
  return engagementScore(item) > 0;
}

export function engagementLabel(item: NewsItem): string | null {
  const tm = item.tweet_metrics;
  const parts: string[] = [];
  if (tm?.viewCount) parts.push(`${formatCompact(tm.viewCount)} views`);
  if (tm?.likeCount) parts.push(`${formatCompact(tm.likeCount)} likes`);
  if (item.score && item.source_type !== 'arxiv') parts.push(`${formatCompact(item.score)} upvotes`);
  if (item.num_comments && item.source_type !== 'arxiv') parts.push(`${formatCompact(item.num_comments)} comments`);
  return parts.length ? parts.join(' · ') : null;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function sortByEngagement(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => engagementScore(b) - engagementScore(a));
}

/**
 * Editorial order for the front page: engagement first, then freshness for
 * stories that have no interaction signal yet (breaking news). A story with
 * any engagement always outranks an equally-fresh story with none.
 */
export function frontPageOrder(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const ea = engagementScore(a);
    const eb = engagementScore(b);
    if (ea !== eb) return eb - ea;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
}

/**
 * Diversified top stories: picks the top story from each source first,
 * then fills remaining slots with the next highest-engagement stories.
 * This ensures no single source dominates the top stories.
 */
export function diversifiedTopStories(items: NewsItem[], count: number): NewsItem[] {
  const sorted = frontPageOrder(items);
  const picked: NewsItem[] = [];
  const usedSources = new Map<string, number>(); // source -> count picked

  // Pass 1: pick top 1-2 stories per source (max 2 from any source)
  for (const item of sorted) {
    if (picked.length >= count) break;
    const src = item.source_label || item.source;
    const srcCount = usedSources.get(src) || 0;
    if (srcCount >= 2) continue;
    picked.push(item);
    usedSources.set(src, srcCount + 1);
  }

  // Pass 2: fill remaining slots from sorted list, skip already picked
  if (picked.length < count) {
    const pickedUrls = new Set(picked.map(i => i.url));
    for (const item of sorted) {
      if (picked.length >= count) break;
      if (!pickedUrls.has(item.url)) {
        picked.push(item);
      }
    }
  }

  return picked;
}

/** Stories published within the last `hours`, newest first. */
export function lastNHours(items: NewsItem[], hours: number): NewsItem[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return items
    .filter(i => new Date(i.published_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

/** Stories published earlier than `hours`, newest first. */
export function olderThan(items: NewsItem[], hours: number): NewsItem[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return items
    .filter(i => new Date(i.published_at).getTime() < cutoff)
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}