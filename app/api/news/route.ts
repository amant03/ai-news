import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getNewsItems, getFacets, readStore } from '@/lib/db';
import { sourceLabel, NewsItem } from '@/lib/types';
import { sortByRank } from '@/lib/rank';
import { classifyDomain } from '@/lib/categorize';

// GitHub raw fallback so the deployed (serverless) app always shows the
// freshest committed data even between Vercel deploys.
const DATA_REPO = process.env.DATA_REPO; // e.g. "amant03/ai-news"
const DATA_BRANCH = process.env.DATA_BRANCH || 'main';

const CACHE_TTL_MS = 60_000;
let memoryCache: { data: string; at: number } | null = null;

async function getRawFromGithub(): Promise<string | null> {
  if (!DATA_REPO) return null;
  try {
    const url = `https://raw.githubusercontent.com/${DATA_REPO}/${DATA_BRANCH}/data/news.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function readLocalStore(): string | null {
  try {
    const file = path.join(process.cwd(), 'data', 'news.json');
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf-8');
  } catch {
    /* ignore */
  }
  return null;
}

async function loadStoreText(): Promise<{ text: string; from: 'local' | 'github' }> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.at < CACHE_TTL_MS) {
    return { text: memoryCache.data, from: 'cache' as 'local' };
  }

  // Prefer the freshest source: local file (matches last commit/deploy) then GitHub raw.
  const local = readLocalStore();
  const remote = await getRawFromGithub();

  const text = remote || local;
  if (text) {
    memoryCache = { data: text, at: now };
  }
  return { text: text || '{"meta":{},"items":[]}', from: remote ? 'github' : 'local' };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '40', 10) || 40, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const source = searchParams.get('source') || undefined;
    const category = searchParams.get('category') || undefined;
    const sourceType = searchParams.get('sourceType') || undefined;
    const domain = searchParams.get('domain') || undefined;

    // For the serverless deployment, read from the fetched snapshot.
    if (process.env.VERCEL === '1') {
      const { text } = await loadStoreText();
      let parsed: { items: NewsItem[]; meta?: { lastUpdated?: string } };
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { items: [] };
      }
      const items = Array.isArray(parsed.items) ? parsed.items : [];

      let filtered = items;
      if (source && source !== 'all') {
        filtered = filtered.filter(i => i.source === source || i.source_label?.toLowerCase() === source.toLowerCase());
      }
      if (category && category !== 'all') {
        filtered = filtered.filter(i => i.category === category);
      }
      if (sourceType && sourceType !== 'all') {
        filtered = filtered.filter(i => i.source_type === sourceType);
      }
      if (domain && domain !== 'all') {
        filtered = filtered.filter(i => (i.domain || classifyDomain(i.title, i.summary || i.content)) === domain);
      }
      const ranked = sortByRank(filtered);

      const total = ranked.length;
      const page = ranked.slice(offset, offset + limit);

      const sourceMap = new Map<string, { label: string; type: string; count: number }>();
      const categoryMap = new Map<string, number>();
      const domainMap = new Map<string, number>();
      for (const i of items) {
        const s = i.source || 'other';
        const e = sourceMap.get(s) || { label: i.source_label || s, type: i.source_type, count: 0 };
        e.count++;
        sourceMap.set(s, e);
        categoryMap.set(i.category, (categoryMap.get(i.category) || 0) + 1);
        const d = i.domain || classifyDomain(i.title, i.summary || i.content);
        domainMap.set(d, (domainMap.get(d) || 0) + 1);
      }

      return NextResponse.json({
        items: page,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        facets: {
          sources: [...sourceMap.entries()]
            .map(([value, v]) => ({ value, label: sourceLabel(value), count: v.count, type: v.type }))
            .sort((a, b) => b.count - a.count),
          categories: [...categoryMap.entries()].map(([value, count]) => ({ value, label: value, count })),
          domains: [...domainMap.entries()].map(([value, count]) => ({ value, label: value, count })),
        },
        lastUpdated: parsed.meta?.lastUpdated || null,
      });
    }

    // Local / non-serverless: read the actual DB store.
    readStore();
    const ranked = sortByRank(getNewsItems(5000, 0, source, category, sourceType, domain));
    const items = ranked.slice(offset, offset + limit);
    const total = ranked.length;
    const facets = getFacets();
    const meta = readStore().meta;

    return NextResponse.json({
      items,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      facets: {
        sources: facets.sources,
        categories: facets.categories,
        domains: facets.domains,
      },
      lastUpdated: meta.lastUpdated || null,
    });
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', items: [], total: 0, facets: { sources: [], categories: [] } },
      { status: 500 }
    );
  }
}
