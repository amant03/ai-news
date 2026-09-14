import Parser from 'rss-parser';
import { NewsItem, ScrapedComment } from './types';
import { categorizeContent } from './categorize';
import { redditGet, stripHtml } from './social';

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
});

const SUBREDDITS = [
  'MachineLearning',
  'LocalLLaMA',
  'OpenAI',
  'artificial',
  'StableDiffusion',
];

const MAX_AGE_MS = 72 * 60 * 60 * 1000;

interface RedditPost {
  id?: string;
  title?: string;
  permalink?: string;
  url?: string;
  author?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  selftext?: string;
  thumbnail?: string;
}

/** Public listing JSON carries score + comment counts; RSS parsing lost them. */
async function fetchSubJson(sub: string): Promise<RedditPost[]> {
  const data = (await redditGet(`/r/${sub}/hot.json?limit=14`)) as {
    data?: { children?: Array<{ data?: RedditPost }> };
  };
  return (data.data?.children || []).map(c => c.data || {}).filter(p => p.title);
}

export async function fetchReddit(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const now = Date.now();

  for (const sub of SUBREDDITS) {
    try {
      let posts: RedditPost[] = [];
      try {
        posts = await fetchSubJson(sub);
      } catch {
        posts = [];
      }

      if (posts.length > 0) {
        for (const p of posts.slice(0, 12)) {
          if (!p.title) continue;
          const age = now - (p.created_utc || now / 1000) * 1000;
          if (age > MAX_AGE_MS) continue;
          const link = p.permalink ? `https://www.reddit.com${p.permalink}` : p.url || '';
          if (!link) continue;
          const content = (p.selftext || '').replace(/\s+/g, ' ').trim();
          allItems.push({
            source: 'reddit',
            source_label: `r/${sub}`,
            source_type: 'reddit',
            title: p.title.length > 200 ? p.title.slice(0, 197) + '...' : p.title,
            summary: content.slice(0, 300) || `Top post on r/${sub}.`,
            content,
            url: link,
            author: p.author ? `u/${p.author}` : `r/${sub}`,
            category: categorizeContent(p.title, content),
            published_at: new Date((p.created_utc || now / 1000) * 1000).toISOString(),
            source_detail: `r/${sub}`,
            image_url: undefined,
            score: typeof p.score === 'number' ? p.score : undefined,
            num_comments: typeof p.num_comments === 'number' ? p.num_comments : undefined,
            thread_id: p.id,
          });
        }
        console.log(`  ✓ Reddit r/${sub}: ${posts.length} items (json)`);
        continue;
      }

      // RSS fallback (no scores — regex extraction proved unreliable).
      const parsed = await parser.parseURL(`https://www.reddit.com/r/${sub}/.rss`);

      for (const item of parsed.items.slice(0, 12)) {
        if (!item.title || !item.link) continue;

        const age = now - new Date(item.pubDate || Date.now()).getTime();
        if (age > MAX_AGE_MS) continue;

        const raw = item as unknown as { content?: string; contentSnippet?: string };
        const content = (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        allItems.push({
          source: 'reddit',
          source_label: `r/${sub}`,
          source_type: 'reddit',
          title: item.title.length > 200 ? item.title.slice(0, 197) + '...' : item.title,
          summary: content.slice(0, 300) || `Top post on r/${sub}.`,
          content: content,
          url: item.link,
          author: `r/${sub}`,
          category: categorizeContent(item.title, content),
          published_at: item.pubDate || new Date().toISOString(),
          source_detail: `r/${sub}`,
          image_url: undefined,
          score: undefined,
          num_comments: undefined,
        });
      }
      console.log(`  ✓ Reddit r/${sub}: ${parsed.items.length} items (rss)`);
    } catch (error) {
      console.log(`  ✗ Reddit r/${sub} failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  await attachTopComments(allItems);
  return allItems;
}

const MAX_COMMENT_THREADS = 12;
const MAX_COMMENTS_PER_THREAD = 5;

/**
 * Fetch top comments (with like counts) for the highest-scored posts.
 * Best-effort: failures leave items without previews; the UI falls back
 * to on-demand thread loading. Bounded so CI stays fast.
 */
async function attachTopComments(items: NewsItem[]): Promise<void> {
  const targets = items
    .filter(i => i.thread_id && (i.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MAX_COMMENT_THREADS);
  if (targets.length === 0) return;

  const results = await Promise.allSettled(
    targets.map(async item => {
      const data = await redditGet(`/comments/${item.thread_id}.json?limit=10&depth=1&sort=top`, 10000);
      const listing = data?.[1]?.data?.children || [];
      const top: ScrapedComment[] = [];
      for (const c of listing) {
        const d = c?.data;
        if (!d || typeof d.body !== 'string' || d.author === '[deleted]') continue;
        const text = stripHtml(d.body).slice(0, 300);
        if (text.length < 2) continue;
        top.push({
          author: `u/${d.author || 'unknown'}`,
          text,
          score: typeof d.score === 'number' ? d.score : 0,
        });
        if (top.length >= MAX_COMMENTS_PER_THREAD) break;
      }
      return { item, top };
    })
  );

  let attached = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.top.length > 0) {
      r.value.item.top_comments = r.value.top;
      attached++;
    }
  }
  console.log(`  ✓ Reddit top comments: ${attached}/${targets.length} threads`);
}
