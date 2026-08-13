import { NextRequest, NextResponse } from 'next/server';
import { NewsItem } from '@/lib/types';
import { readModelDatabase, ModelRecord } from '@/lib/model-registry';
import { getNewsItems, readStore } from '@/lib/db';
import { rankKey } from '@/lib/rank';

export const dynamic = 'force-dynamic';

const VALID_SORTS = ['elo', 'intelligence', 'value', 'popularity', 'newest', 'name'];

function sortModels(models: ModelRecord[], sort: string): ModelRecord[] {
  const arr = [...models];
  switch (sort) {
    case 'elo':
      return arr.filter(m => m.elo !== undefined).sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
    case 'intelligence':
      return arr.filter(m => m.intelligenceIndex !== undefined).sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
    case 'value':
      return arr.filter(m => m.valueScore !== undefined).sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0));
    case 'popularity':
      return arr.filter(m => (m.mentions || 0) + (m.hfDownloads || 0) > 0).sort((a, b) =>
        ((b.hfDownloads ?? 0) / 1_000_000 + (b.mentions ?? 0) * 10) - ((a.hfDownloads ?? 0) / 1_000_000 + (a.mentions ?? 0) * 10));
    case 'newest':
      return arr.filter(m => m.released).sort((a, b) => (b.released || '').localeCompare(a.released || ''));
    case 'name':
    default:
      return arr.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sort = VALID_SORTS.includes(searchParams.get('sort') || '') ? searchParams.get('sort')! : 'intelligence';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);

  try {
    readStore();
    const items = getNewsItems(5000, 0) as NewsItem[];
    const db = readModelDatabase();

    const modelNews = items
      .filter(i => {
        const t = i.title.toLowerCase();
        return /\b(gpt|claude|gemini|grok|llama|mistral|deepseek|qwen|sonnet|opus|haiku|benchmark|leaderboard|releases|introduces|unveils|launches?)\b/.test(t);
      })
      .sort((a, b) => rankKey(b) - rankKey(a))
      .slice(0, 20) as NewsItem[];

    const all = db?.models || [];
    const sorted = sortModels(all, sort);
    const models = sorted.slice(0, limit);
    const leaderboard = sortModels(all, 'intelligence').slice(0, 30);

    return NextResponse.json({
      models,
      leaderboard,
      modelNews,
      catalog: db
        ? { total: db.counts.total, withPricing: db.counts.withPricing, withBenchmarks: db.counts.withBenchmarks, updatedAt: db.updatedAt }
        : null,
      sort,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Model watch failed:', error);
    return NextResponse.json({ models: [], leaderboard: [], modelNews: [], catalog: null }, { status: 500 });
  }
}
