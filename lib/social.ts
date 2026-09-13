/**
 * Source discussion threads, fetched on demand (never stored).
 * - reddit: public .json API (free, no key).
 * - hackernews: Firebase API (free, no key).
 * - x/twitter: bot-walled (xcancel.com included — serves JS challenges to
 *   server fetches) → counts + link-out only, never fabricated threads.
 */

export interface SocialComment {
  author: string;
  text: string;
  score: number;
  created_at?: string;
  url?: string;
  replies: SocialComment[];
  replyCount?: number;
}

export interface SocialThread {
  source: 'reddit' | 'hn' | 'x';
  total: number | null;
  postUrl: string;
  comments: SocialComment[];
  unsupported?: boolean;
  note?: string;
}

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function getJson(url: string, timeoutMs = 12000): Promise<any> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function stripHtml(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

export function redditIdFrom(input: string): string | null {
  const m = input.match(/comments\/([a-z0-9]+)/i);
  return m ? m[1] : /^[a-z0-9]{5,8}$/i.test(input.trim()) ? input.trim() : null;
}

export function mapRedditComment(node: any, depth: number): SocialComment | null {
  const d = node?.data;
  if (!d || typeof d.body !== 'string') return null;
  const text = stripHtml(d.body).slice(0, 2000);
  if (text.length < 2 || d.author === '[deleted]') return null;
  const kids = depth > 0 && d.replies && typeof d.replies === 'object'
    ? (d.replies.data?.children || []).slice(0, 6).map((k: any) => mapRedditComment(k, depth - 1)).filter(Boolean)
    : [];
  return {
    author: `u/${d.author || 'unknown'}`,
    text,
    score: typeof d.score === 'number' ? d.score : 0,
    created_at: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
    replies: kids as SocialComment[],
  };
}

export async function fetchRedditThread(id: string): Promise<SocialThread> {
  const data = await getJson(`https://www.reddit.com/comments/${id}.json?limit=25&depth=3&sort=top`);
  const post = data?.[0]?.data?.children?.[0]?.data;
  const listing = data?.[1]?.data?.children || [];
  const comments = listing.map((c: any) => mapRedditComment(c, 2)).filter(Boolean).slice(0, 25) as SocialComment[];
  return {
    source: 'reddit',
    total: typeof post?.num_comments === 'number' ? post.num_comments : comments.length,
    postUrl: `https://www.reddit.com/comments/${id}/`,
    comments,
  };
}

async function hnItem(id: number): Promise<any> {
  return getJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
}

export async function fetchHNThread(id: number): Promise<SocialThread> {
  const post = await hnItem(id);
  if (!post) throw new Error('HN item not found');
  const kidIds: number[] = (post.kids || []).slice(0, 15);
  const kids = await Promise.all(kidIds.map(k => hnItem(k).catch(() => null)));
  const comments: SocialComment[] = [];
  for (const k of kids) {
    if (!k || k.deleted || k.dead || typeof k.text !== 'string') continue;
    const text = stripHtml(k.text).slice(0, 2000);
    if (text.length < 2) continue;
    comments.push({
      author: k.by || 'hn',
      text,
      score: typeof k.score === 'number' ? k.score : 0,
      created_at: k.time ? new Date(k.time * 1000).toISOString() : undefined,
      url: `https://news.ycombinator.com/item?id=${k.id}`,
      replies: [],
      replyCount: Array.isArray(k.kids) ? k.kids.length : 0,
    });
  }
  comments.sort((a, b) => b.score - a.score);
  return {
    source: 'hn',
    total: typeof post.descendants === 'number' ? post.descendants : comments.length,
    postUrl: `https://news.ycombinator.com/item?id=${id}`,
    comments,
  };
}

export function xStatusId(input: string): string | null {
  const m = input.match(/status\/(\d+)/);
  return m ? m[1] : /^\d{10,25}$/.test(input.trim()) ? input.trim() : null;
}

/** X threads can't be fetched — always link out with the known counts. */
export function xThreadFallback(input: string): SocialThread {
  const id = xStatusId(input);
  return {
    source: 'x',
    total: null,
    postUrl: id ? `https://x.com/i/status/${id}` : input.startsWith('http') ? input : 'https://x.com',
    comments: [],
    unsupported: true,
    note: 'X blocks automated reply fetching — open the post to join the discussion.',
  };
}
