import { NextRequest, NextResponse } from 'next/server';
import { NewsItem } from '@/lib/types';
import { readModelDatabase, ModelRecord, SlimModelDb } from '@/lib/model-registry';
import { getNewsItems, readStore } from '@/lib/db';
import { rankKey } from '@/lib/rank';
import { hasPg, getPool } from '@/lib/pg';
import { fetchCommittedFile } from '@/lib/github-data';

export const dynamic = 'force-dynamic';

// Caveat: models.json is ~96MB → never pull it from GitHub at request time.
// Instead serve the compact models-slim.json (rebuilt + committed every run
// by the news agent) which carries id/name/provider/release date — enough to
// list the newest models fast without a 100MB download or a serverless OOM.
async function loadCommittedSlim(): Promise<SlimModelDb | null> {
  const raw = await fetchCommittedFile('data/models-slim.json', 15000);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SlimModelDb;
    return Array.isArray(parsed?.models) ? parsed : null;
  } catch {
    return null;
  }
}

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
    let db = readModelDatabase();

    // If Postgres is available, read the model catalog from there — it stays
    // in sync with the agent and never gets overwritten by a stale JSON file.
    if (hasPg()) {
      try {
        const p = getPool();
        const res = await p!.query(
          `SELECT id, name, provider, source, released, family, params, context, description,
                  prompt_price, completion_price, value_score, intelligence_index, coding_index, agentic_index,
                  hf_downloads, hf_likes, elo, arena_rank, num_votes, license, mentions, reddit_mentions,
                  x_mentions, buzz, free_tier, local_only
           FROM models ORDER BY intelligence_index DESC NULLS LAST`
        );
        const rows = res.rows as Array<Record<string, unknown>>;
        const models = rows.map(r => ({
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
          arenaRank: (r.arena_rank as number) ?? undefined,
          numVotes: (r.num_votes as number) ?? undefined,
          license: (r.license as string) || undefined,
          mentions: (r.mentions as number) ?? undefined,
          redditMentions: (r.reddit_mentions as number) ?? undefined,
          xMentions: (r.x_mentions as number) ?? undefined,
          buzz: (r.buzz as number) ?? undefined,
          freeTier: (r.free_tier as boolean) || undefined,
          localOnly: (r.local_only as boolean) || undefined,
        })) as ModelRecord[];
        db = {
          updatedAt: new Date().toISOString(),
          sources: ['openrouter', 'huggingface', 'ollama', 'lmarena', 'freellm', 'pg'],
          counts: {
            total: models.length,
            withPricing: models.filter(m => m.promptPrice !== undefined).length,
            withBenchmarks: models.filter(m => m.intelligenceIndex !== undefined).length,
            withElo: models.filter(m => m.elo !== undefined).length,
            openWeights: models.filter(m => m.family === 'open-weights').length,
          },
          models,
        };
      } catch (error) {
        console.error('[models] pg read failed, using JSON:', error);
      }
    }

    // No Postgres + otherwise-stale deploy snapshot: fall back to the compact
    // committed catalog (models-slim.json, rebuilt & committed every run) so we
    // avoid loading the ~96MB models.json. Release dates stay current this way.
    if (!hasPg()) {
      const slim = await loadCommittedSlim();
      if (slim?.models?.length) {
        const all = db?.models || [];
        const seen = new Set([...all.map(m => m.id)]);
        const modelsArr: ModelRecord[] = [...all];
        for (const s of slim.models) {
          if (seen.has(s.id)) continue;
          modelsArr.push({
            id: s.id,
            name: s.name,
            provider: s.provider,
            source: s.source,
            released: s.released,
            family: s.family || 'closed',
            elo: s.elo,
            hfDownloads: s.hfDownloads,
            intelligenceIndex: s.intelligenceIndex,
          });
          seen.add(s.id);
        }
        db = {
          updatedAt: slim.updatedAt,
          sources: ['openrouter', 'github-slim'],
          counts: {
            total: modelsArr.length,
            withPricing: 0,
            withBenchmarks: 0,
            withElo: modelsArr.filter(m => m.elo !== undefined).length,
            openWeights: modelsArr.filter(m => m.family === 'open-weights').length,
          },
          models: modelsArr,
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
