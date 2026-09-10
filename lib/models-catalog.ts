import { fetchCommittedFile } from './github-data';
import { ModelRecord, SlimModel, readModelDatabase, readSlimModelDatabase } from './model-registry';

// Shared loader for the deployed model catalog. Priority:
//   1. Committed models-slim.json from GitHub (rebuilt every 4h by CI, carries
//      OpenRouter + Artificial Analysis benchmark data, ~60KB).
//   2. Local slim file (CI/local runs).
//   3. Local full models.json (build-time fallback), leaned of the huge
//      description/license blobs that used to make /api/models ~54MB.
export interface ModelCatalog {
  updatedAt: string;
  sources: string[];
  total: number;
  models: ModelRecord[];
}

export function slimToModelRecord(s: SlimModel): ModelRecord {
  const r: ModelRecord = {
    id: s.id,
    name: s.name,
    provider: s.provider,
    source: s.source,
    family: s.family || 'closed',
  };
  if (s.released !== undefined) r.released = s.released;
  if (s.params !== undefined) r.params = s.params;
  if (s.context !== undefined) r.context = s.context;
  if (s.intelligenceIndex !== undefined) r.intelligenceIndex = s.intelligenceIndex;
  if (s.codingIndex !== undefined) r.codingIndex = s.codingIndex;
  if (s.agenticIndex !== undefined) r.agenticIndex = s.agenticIndex;
  if (s.elo !== undefined) r.elo = s.elo;
  if (s.numVotes !== undefined) r.numVotes = s.numVotes;
  if (s.hfDownloads !== undefined) r.hfDownloads = s.hfDownloads;
  if (s.hfLikes !== undefined) r.hfLikes = s.hfLikes;
  if (s.promptPrice !== undefined) r.promptPrice = s.promptPrice;
  if (s.completionPrice !== undefined) r.completionPrice = s.completionPrice;
  if (s.valueScore !== undefined) r.valueScore = s.valueScore;
  if (s.aaSpeed !== undefined) r.aaSpeed = s.aaSpeed;
  if (s.aaCostPerTask !== undefined) r.aaCostPerTask = s.aaCostPerTask;
  if (s.aaVerbosity !== undefined) r.aaVerbosity = s.aaVerbosity;
  if (s.aaLatency !== undefined) r.aaLatency = s.aaLatency;
  if (s.aaSlug) r.aaSlug = s.aaSlug;
  if (s.isReasoning !== undefined) r.isReasoning = s.isReasoning;
  if (s.inputModalities) r.inputModalities = s.inputModalities;
  if (s.outputModalities) r.outputModalities = s.outputModalities;
  if (s.mentions !== undefined) r.mentions = s.mentions;
  if (s.xMentions !== undefined) r.xMentions = s.xMentions;
  if (s.redditMentions !== undefined) r.redditMentions = s.redditMentions;
  if (s.buzz !== undefined) r.buzz = s.buzz;
  if (s.license !== undefined) r.license = s.license;
  return r;
}

function fromSlim(slim: { updatedAt: string; sources?: string[]; total: number; models: SlimModel[] }): ModelCatalog {
  return {
    updatedAt: slim.updatedAt,
    sources: slim.sources?.length ? slim.sources : ['openrouter', 'aa'],
    total: slim.total,
    models: slim.models.map(slimToModelRecord),
  };
}

export async function loadModelCatalog(): Promise<ModelCatalog | null> {
  // 1. Committed slim manifest from GitHub.
  try {
    const raw = await fetchCommittedFile('data/models-slim.json', 15000);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.models) && parsed.models.length > 0) {
        return fromSlim(parsed);
      }
    }
  } catch {
    /* fall through */
  }

  // 2. Local slim (CI/local runs).
  const local = readSlimModelDatabase();
  if (local?.models?.length) {
    return fromSlim({ updatedAt: local.updatedAt, total: local.total, models: local.models });
  }

  // 3. Fall back to the full local DB, leaning each record (the deploy-time
  //    snapshot can carry huge description/license blobs).
  const db = readModelDatabase();
  if (db?.models?.length) {
    return {
      updatedAt: db.updatedAt,
      sources: db.sources,
      total: db.models.length,
      models: db.models.map(m => ({
        ...m,
        license: typeof m.license === 'string' && m.license.length <= 160 ? m.license : undefined,
      })),
    };
  }
  return null;
}