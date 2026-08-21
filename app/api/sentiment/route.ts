import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/db';
import { analyzeSentiment } from '@/lib/sentiment';
import { fetchCommittedFile } from '@/lib/github-data';

const CACHE_TTL_MS = 60_000;
let memoryCache: { items: Array<{ published_at: string; [k: string]: unknown }>; at: number } | null = null;

async function loadItems(): Promise<Array<{ published_at: string; [k: string]: unknown }>> {
  // On serverless, prefer the freshest committed store over the deploy snapshot.
  if (process.env.VERCEL === '1' && process.env.DATA_REPO) {
    const now = Date.now();
    if (memoryCache && now - memoryCache.at < CACHE_TTL_MS) return memoryCache.items;
    const text = await fetchCommittedFile('data/news.json');
    if (text) {
      try {
        const parsed = JSON.parse(text) as { items?: Array<{ published_at: string }> };
        const items = (parsed.items || []) as Array<{ published_at: string; [k: string]: unknown }>;
        memoryCache = { items, at: now };
        return items;
      } catch { /* fall through to local */ }
    }
  }
  return (readStore().items || []) as unknown as Array<{ published_at: string; [k: string]: unknown }>;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '90', 10) || 90, 1), 365);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const items = await loadItems();
    const recent = items.filter(i => i.published_at >= cutoff);

    const report = analyzeSentiment(recent as never);
    return NextResponse.json(report);
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return NextResponse.json({ error: 'Sentiment analysis failed' }, { status: 500 });
  }
}
