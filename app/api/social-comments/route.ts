import { NextRequest, NextResponse } from 'next/server';
import { fetchHNThread, fetchRedditThread, redditIdFrom, xThreadFallback } from '@/lib/social';

export const dynamic = 'force-dynamic';

/**
 * Source discussion threads, fetched on demand (never stored).
 * GET ?source=reddit|hn|x&thread=<url|id>
 */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams;
  const source = (q.get('source') || '').toLowerCase();
  const thread = q.get('thread') || q.get('url') || '';

  try {
    if (source === 'reddit') {
      const id = redditIdFrom(thread);
      if (!id) return NextResponse.json({ ok: false, error: 'No Reddit thread found for this story.' }, { status: 404 });
      return NextResponse.json({ ok: true, ...(await fetchRedditThread(id)) });
    }
    if (source === 'hn' || source === 'hackernews' || source === 'hacker-news') {
      const id = /^\d+$/.test(thread.trim()) ? parseInt(thread.trim(), 10) : null;
      if (!id) return NextResponse.json({ ok: false, error: 'No Hacker News thread found for this story.' }, { status: 404 });
      return NextResponse.json({ ok: true, ...(await fetchHNThread(id)) });
    }
    if (source === 'x' || source === 'twitter') {
      return NextResponse.json({ ok: true, ...xThreadFallback(thread) });
    }
    return NextResponse.json({ ok: false, error: 'Unknown source.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Could not load discussion (${err instanceof Error ? err.message : 'fetch failed'}).` },
      { status: 502 }
    );
  }
}
