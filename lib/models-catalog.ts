import { finiteNum } from './format';
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
  if (s.released !== undefined && s.released !== null) r.released = s.released;
  if (s.params !== undefined && s.params !== null) r.params = s.params;
  if (s.context !== undefined && s.context !== null) r.context = s.context;
  const intelligenceIndex = finiteNum(s.intelligenceIndex);
  if (intelligenceIndex !== undefined) r.intelligenceIndex = intelligenceIndex;
  const codingIndex = finiteNum(s.codingIndex);
  if (codingIndex !== undefined) r.codingIndex = codingIndex;
  const agenticIndex = finiteNum(s.agenticIndex);
  if (agenticIndex !== undefined) r.agenticIndex = agenticIndex;
  const elo = finiteNum(s.elo);
  if (elo !== undefined) r.elo = elo;
  const numVotes = finiteNum(s.numVotes);
  if (numVotes !== undefined) r.numVotes = numVotes;
  const hfDownloads = finiteNum(s.hfDownloads);
  if (hfDownloads !== undefined) r.hfDownloads = hfDownloads;
  const hfLikes = finiteNum(s.hfLikes);
  if (hfLikes !== undefined) r.hfLikes = hfLikes;
  const promptPrice = finiteNum(s.promptPrice);
  if (promptPrice !== undefined) r.promptPrice = promptPrice;
  const completionPrice = finiteNum(s.completionPrice);
  if (completionPrice !== undefined) r.completionPrice = completionPrice;
  const valueScore = finiteNum(s.valueScore);
  if (valueScore !== undefined) r.valueScore = valueScore;
  const aaSpeed = finiteNum(s.aaSpeed);
  if (aaSpeed !== undefined) r.aaSpeed = aaSpeed;
  const aaCostPerTask = finiteNum(s.aaCostPerTask);
  if (aaCostPerTask !== undefined) r.aaCostPerTask = aaCostPerTask;
  const aaVerbosity = finiteNum(s.aaVerbosity);
  if (aaVerbosity !== undefined) r.aaVerbosity = aaVerbosity;
  const aaLatency = finiteNum(s.aaLatency);
  if (aaLatency !== undefined) r.aaLatency = aaLatency;
  if (s.aaSlug) r.aaSlug = s.aaSlug;
  if (s.isReasoning !== undefined) r.isReasoning = s.isReasoning;
  if (s.inputModalities) r.inputModalities = s.inputModalities;
  if (s.outputModalities) r.outputModalities = s.outputModalities;
  const mentions = finiteNum(s.mentions);
  if (mentions !== undefined) r.mentions = mentions;
  const xMentions = finiteNum(s.xMentions);
  if (xMentions !== undefined) r.xMentions = xMentions;
  const redditMentions = finiteNum(s.redditMentions);
  if (redditMentions !== undefined) r.redditMentions = redditMentions;
  const buzz = finiteNum(s.buzz);
  if (buzz !== undefined) r.buzz = buzz;
  if (s.license !== undefined && s.license !== null) r.license = s.license;
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