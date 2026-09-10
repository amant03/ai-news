import { NextRequest, NextResponse } from 'next/server';
import { NewsItem } from '@/lib/types';
import { ModelRecord } from '@/lib/model-registry';
import { getNewsItems, readStore } from '@/lib/db';
import { rankKey } from '@/lib/rank';
import { hasPg, getPool } from '@/lib/pg';
import { loadModelCatalog } from '@/lib/models-catalog';

export const dynamic = 'force-dynamic';

const VALID_SORTS = ['elo', 'intelligence', 'value', 'popularity', 'newest', 'name'];

function sortModels(models: ModelRecord[], sort: string): ModelRecord[] {
  const arr = [...models];
  switch (sort) {
    case 'elo':
      return arr.sort((a, b) => (b.elo ?? -1) - (a.elo ?? -1));
    case 'intelligence':
      return arr.filter(m => m.intelligenceIndex !== undefined).sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
    case 'value':
      return arr.sort((a, b) => (b.valueScore ?? -1) - (a.valueScore ?? -1));
    case 'popularity':
      return arr.sort((a, b) =>
        (((b.hfDownloads ?? 0) / 1_000_000 + (b.mentions ?? 0) * 10) - ((a.hfDownloads ?? 0) / 1_000_000 + (a.mentions ?? 0) * 10)));
    case 'newest':
      return arr.filter(m => m.released).sort((a, b) => (b.released || '').localeCompare(a.released || ''));
    case 'name':
    default:
      return arr.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function toLean(m: ModelRecord): ModelRecord {
  return {
    id: m.id,
    name: m.name,
    provider: m.provider,
    source: m.source,
    released: m.released,
    family: m.family,
    params: m.params,
    context: m.context,
    description: m.description,
    intelligenceIndex: m.intelligenceIndex,
    codingIndex: m.codingIndex,
    agenticIndex: m.agenticIndex,
    elo: m.elo,
    numVotes: m.numVotes,
    hfDownloads: m.hfDownloads,
    hfLikes: m.hfLikes,
    promptPrice: m.promptPrice,
    completionPrice: m.completionPrice,
    valueScore: m.valueScore,
    aaSpeed: m.aaSpeed,
    aaCostPerTask: m.aaCostPerTask,
    aaVerbosity: m.aaVerbosity,
    aaLatency: m.aaLatency,
    aaSlug: m.aaSlug,
    isReasoning: m.isReasoning,
    inputModalities: m.inputModalities,
    outputModalities: m.outputModalities,
    mentions: m.mentions,
    xMentions: m.xMentions,
    redditMentions: m.redditMentions,
    buzz: m.buzz,
    freeTier: m.freeTier,
    localOnly: m.localOnly,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sort = VALID_SORTS.includes(searchParams.get('sort') || '') ? searchParams.get('sort')! : 'intelligence';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);

  try {
    readStore();
    const items = getNewsItems(80, 0) as NewsItem[];

    let all: ModelRecord[] = [];
    let catalog = { total: 0, withPricing: 0, withBenchmarks: 0, updatedAt: '' };

    // Postgres is the richest path when configured (full history + benchmarks).
    if (hasPg()) {
      try {
        const p = getPool();
        const res = await p!.query(
          `SELECT id, name, provider, source, released, family, params, context, description,
                  prompt_price, completion_price, value_score, intelligence_index, coding_index, agentic_index,
                  hf_downloads, hf_likes, elo, arena_rank, num_votes, mentions, reddit_mentions,
                  x_mentions, buzz, free_tier, local_only
           FROM models ORDER BY intelligence_index DESC NULLS LAST`
        );
        all = (res.rows as Array<Record<string, unknown>>).map(r => ({
          id: r.id as string,
          name: (r.name as string) || String(r.id),
          provider: (r.provider as string) || 'Unknown',
          source: (r.source as string) || 'pg',
          released: (r.released as string) || undefined,
          family: (r.family as ModelRecord['family']) || 'closed',
          params: (r.params as string) || undefined,
          context: (r.context as string) || undefined,
          description: (r.description as string) || undefined,
          promptPrice: (r.prompt_price as number) ?? undefined,
          completionPrice: (r.completion_price as number) ?? undefined,
          valueScore: (r.value_score as number) ?? undefined,
          intelligenceIndex: (r.intelligence_index as number) ?? undefined,
          codingIndex: (r.coding_index as number) ?? undefined,
          agenticIndex: (r.agentic_index as number) ?? undefined,
          hfDownloads: (r.hf_downloads as number) ?? undefined,
          hfLikes: (r.hf_likes as number) ?? undefined,
          elo: (r.elo as number) ?? undefined,
          numVotes: (r.num_votes as number) ?? undefined,
          mentions: (r.mentions as number) ?? undefined,
          redditMentions: (r.reddit_mentions as number) ?? undefined,
          xMentions: (r.x_mentions as number) ?? undefined,
          buzz: (r.buzz as number) ?? undefined,
          freeTier: (r.free_tier as boolean) || undefined,
          localOnly: (r.local_only as boolean) || undefined,
        })) as ModelRecord[];
        catalog = {
          total: all.length,
          withPricing: all.filter(m => m.promptPrice !== undefined).length,
          withBenchmarks: all.filter(m => m.intelligenceIndex !== undefined).length,
          updatedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('[models] pg read failed, using catalog:', error);
      }
    }

    // No Postgres: serve the committed slim catalog (fresh every 4h). This is
    // what keeps the leaderboard fast and current without a 100MB download.
    if (all.length === 0) {
      const cat = await loadModelCatalog();
      if (cat) {
        all = cat.models;
        catalog = {
          total: cat.total,
          withPricing: all.filter(m => m.promptPrice !== undefined).length,
          withBenchmarks: all.filter(m => m.intelligenceIndex !== undefined).length,
          updatedAt: cat.updatedAt,
        };
      }
    }

    const modelNews = items
      .filter(i => {
        const t = i.title.toLowerCase();
        return /\b(gpt|claude|gemini|grok|llama|mistral|deepseek|qwen|sonnet|opus|haiku|benchmark|leaderboard|releases|introduces|unveils|launches?)\b/.test(t);
      })
      .sort((a, b) => rankKey(b) - rankKey(a))
      .slice(0, 20) as NewsItem[];

    const sorted = sortModels(all, sort);
    const models = sorted.slice(0, limit).map(toLean);
    const leaderboard = sortModels(all, 'intelligence').slice(0, 15).map(toLean);

    return NextResponse.json({
      models,
      leaderboard,
      modelNews,
      catalog,
      sort,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Model watch failed:', error);
    return NextResponse.json({ models: [], leaderboard: [], modelNews: [], catalog: null }, { status: 500 });
  }
}