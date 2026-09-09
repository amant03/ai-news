import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Lightweight TF-IDF-like retrieval over news + model data.
// No external dependencies — pure keyword scoring.
// ---------------------------------------------------------------------------

export interface RetrievedItem {
  type: 'news' | 'model' | 't2i' | 't2v' | 'i2v' | 'aa';
  title: string;
  text: string;
  score: number;
  meta: Record<string, unknown>;
}

// Tokenizer + stop words
const STOP = new Set([
  'a','an','the','is','it','in','on','at','to','for','of','and','or','but',
  'not','with','this','that','are','was','were','be','been','being','have',
  'has','had','do','does','did','will','would','could','should','may','might',
  'can','shall','from','by','as','if','so','no','nor','up','out','about',
  'into','over','after','all','also','its','than','them','then','what','when',
  'where','who','which','how','just','more','most','other','some','such','own',
  'same','too','very','each','few','many','much','any','our','their','your',
  'my','his','her','its','we','they','you','he','she','me','us','him','them',
  'i','am','isn','aren','wasn','weren','doesn','didn','won','wouldn','couldn',
  'shouldn','haven','hasn','hadn','let','like','get','got','make','made',
  'one','two','three','new','first','last','long','great','little','right',
  'big','high','old','different','next','small','large','part','even',
  'back','there','only','still','while','between','through','during','before',
  'both','these','those','every','off','down','here','why','need','used',
  'using','use','used','able','find','see','know','come','go','take','say',
  'said','give','day','time','year','people','way','work','well','way',
  'want','look','think','because','go','come','may','put','keep','let',
  'begin','seem','help','show','hear','play','run','move','live','believe',
  'hold','bring','happen','must','real','under','never','around','world',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP.has(t));
}

function buildTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  // normalize
  const max = Math.max(...tf.values(), 1);
  for (const [k, v] of tf) tf.set(k, v / max);
  return tf;
}

function score(tf: Map<string, number>, queryTokens: string[]): number {
  let s = 0;
  const seen = new Set<string>();
  for (const qt of queryTokens) {
    if (seen.has(qt)) continue;
    seen.add(qt);
    // exact match
    const v = tf.get(qt) || 0;
    s += v;
    // partial / substring match
    for (const [k, v2] of tf) {
      if (k !== qt && (k.includes(qt) || qt.includes(k))) {
        s += v2 * 0.5;
      }
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Data loading (lazy, cached)
// ---------------------------------------------------------------------------

interface NewsEntry {
  title: string;
  summary: string;
  content: string;
  source: string;
  source_label: string;
  domain: string;
  category: string;
  published_at: string;
  url: string;
  id: number | string;
}

interface ModelEntry {
  name: string;
  provider?: string;
  creator?: string;
  intelligenceIndex?: number;
  aaSpeed?: number;
  aaCostPerTask?: number;
  aaVerbosity?: number;
  context?: string;
  params?: string;
  license?: string;
  promptPrice?: number;
  completionPrice?: number;
  codingIndex?: number;
  agenticIndex?: number;
  elo?: number;
  openWeights?: boolean;
  released?: string;
  family?: string;
  description?: string;
  source?: string;
  rank?: number;
  price?: string;
  ci?: string;
  samples?: number;
}

let _news: NewsEntry[] | null = null;
let _models: ModelEntry[] | null = null;
let _t2i: ModelEntry[] | null = null;
let _t2v: ModelEntry[] | null = null;
let _i2v: ModelEntry[] | null = null;
let _aa: ModelEntry[] | null = null;

function loadJSON(file: string): unknown {
  try {
    const raw = readFileSync(join(process.cwd(), 'data', file), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getNews(): NewsEntry[] {
  if (_news) return _news;
  const data = loadJSON('news.json') as any;
  const arr: NewsEntry[] = !data ? [] : Array.isArray(data) ? data : data.items || [];
  _news = arr;
  return arr;
}

function getModels(): ModelEntry[] {
  if (_models) return _models;
  const full = (loadJSON('models.json') as any)?.models || [];
  const slim = (loadJSON('models-slim.json') as any)?.models || [];
  // Merge: full DB first (has benchmark data), then fresh slim models (dedupe by base name)
  const byName = new Map<string, ModelEntry>();
  const baseKey = (name: string) => String(name).toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim() || String(name).toLowerCase();
  for (const m of full) {
    if (m?.name) byName.set(baseKey(m.name), m);
  }
  for (const m of slim) {
    if (!m?.name) continue;
    const key = baseKey(m.name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, m);
    } else {
      // Fill gaps in the full DB with fresh slim data
      for (const [k, v] of Object.entries(m)) {
        if (v !== undefined && v !== null && existing[k as keyof ModelEntry] === undefined) {
          (existing as unknown as Record<string, unknown>)[k] = v;
        }
      }
    }
  }
  const arr = [...byName.values()];
  _models = arr;
  return arr;
}

function getModelsSlim(): ModelEntry[] {
  const data = loadJSON('models-slim.json') as any;
  if (!data) return [];
  return data.models || [];
}

function getJSONModels(file: string): ModelEntry[] {
  const data = loadJSON(file) as any;
  if (!data) return [];
  return data.models || [];
}

function getT2I(): ModelEntry[] { if (_t2i) return _t2i; return (_t2i = getJSONModels('t2i-models.json')); }
function getT2V(): ModelEntry[] { if (_t2v) return _t2v; return (_t2v = getJSONModels('text-to-video-models.json')); }
function getI2V(): ModelEntry[] { if (_i2v) return _i2v; return (_i2v = getJSONModels('image-to-video-models.json')); }
function getAA(): ModelEntry[] { if (_aa) return _aa; return (_aa = getJSONModels('aa-models.json')); }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve the most relevant items across all data sources.
 * Returns up to `limit` items sorted by relevance score.
 * `types` optionally limits scoring to specific categories
 * (e.g. ['t2v','i2v'] for a video query) — avoids top-result
 * truncation crowding out smaller catalogs.
 */
export function retrieve(query: string, limit = 8, types?: string[]): RetrievedItem[] {
  const qtokens = tokenize(query);
  if (qtokens.length === 0) return [];
  const want = (t: string) => !types || types.includes(t);

  const results: RetrievedItem[] = [];

  // 1. News articles
  if (want('news')) {
    const news = getNews();
    for (const n of news) {
      const text = `${n.title} ${n.summary || ''} ${n.content || ''}`;
      const tf = buildTF(tokenize(text));
      const s = score(tf, qtokens);
      // Boost recent articles
      let boost = 0;
      if (n.published_at) {
        const age = Date.now() - new Date(n.published_at).getTime();
        const dayMs = 86400000;
        if (age < 7 * dayMs) boost += 0.3;
        else if (age < 30 * dayMs) boost += 0.15;
      }
      if (s > 0) {
        results.push({
          type: 'news',
          title: n.title,
          text: (n.summary || n.content || '').slice(0, 400),
          score: s + boost,
          meta: { source: n.source_label || n.source, url: n.url, domain: n.domain, date: n.published_at },
        });
      }
    }
  }

  // 2. LLM models
  if (want('model')) {
    const models = getModels();
    for (const m of models) {
      const text = `${m.name} ${m.provider} ${m.description || ''} ${m.family || ''} ${m.license || ''}`;
      const tf = buildTF(tokenize(text));
      let s = score(tf, qtokens);
      // Boost by intelligence
      if (m.intelligenceIndex) s += (m.intelligenceIndex / 100) * 0.1;
      if (s > 0) {
        results.push({
          type: 'model',
          title: `${m.name} (${m.provider})`,
          text: fmtModel(m),
          score: s,
          meta: { ...m },
        });
      }
    }
  }

  // 3. T2I models
  if (want('t2i')) {
    const t2iModels = getT2I();
    for (const m of t2iModels) {
      const text = `${m.name} ${m.provider || ''} ${m.creator || ''} ${m.description || ''} text to image image generation image model`;
      const tf = buildTF(tokenize(text));
      const s = score(tf, qtokens);
      if (s > 0) {
        results.push({
          type: 't2i',
          title: `${m.name} (${m.provider || m.creator || 'Unknown'})`,
          text: fmtModel(m),
          score: s,
          meta: { ...m },
        });
      }
    }
  }

  // 4. T2V models
  if (want('t2v')) {
    const t2vModels = getT2V();
    for (const m of t2vModels) {
      const text = `${m.name} ${m.provider || ''} ${m.creator || ''} ${m.description || ''} text to video video generation video model`;
      const tf = buildTF(tokenize(text));
      const s = score(tf, qtokens);
      if (s > 0) {
        results.push({
          type: 't2v',
          title: `${m.name} (${m.provider || m.creator || 'Unknown'})`,
          text: fmtModel(m),
          score: s,
          meta: { ...m },
        });
      }
    }
  }

  // 5. I2V models
  if (want('i2v')) {
    const i2vModels = getI2V();
    for (const m of i2vModels) {
      const text = `${m.name} ${m.provider || ''} ${m.creator || ''} ${m.description || ''} image to video video generation video model`;
      const tf = buildTF(tokenize(text));
      const s = score(tf, qtokens);
      if (s > 0) {
        results.push({
          type: 'i2v',
          title: `${m.name} (${m.provider || m.creator || 'Unknown'})`,
          text: fmtModel(m),
          score: s,
          meta: { ...m },
        });
      }
    }
  }

  // 6. AA models
  if (want('aa')) {
    for (const m of getAA()) {
      const text = `${m.name} ${m.provider} ${m.description || ''}`;
      const tf = buildTF(tokenize(text));
      const s = score(tf, qtokens);
      if (s > 0) {
        results.push({
          type: 'aa',
          title: `${m.name} (${m.provider})`,
          text: fmtModel(m),
          score: s,
          meta: { ...m },
        });
      }
    }
  }

  // Sort by score descending, return top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Search news specifically (for news-focused queries).
 */
/**
 * Get all merged models (full DB + fresh slim, deduped).
 */
export function getAllModels(): ModelEntry[] {
  return getModels();
}

/**
 * Find a model by fuzzy name / provider across merged data.
 */
export function findModelByName(query: string): ModelEntry | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  const models = getModels();
  let m = models.find(x => String(x.name).toLowerCase() === q);
  if (m) return m;
  m = models.find(x => String(x.name).toLowerCase().includes(q));
  if (m) return m;
  m = models.find(x => String(x.provider || '').toLowerCase() === q);
  if (m) return m;
  m = models.find(x => String(x.provider || '').toLowerCase().includes(q));
  return m || null;
}

export function searchNews(query: string, limit = 10): RetrievedItem[] {
  const qtokens = tokenize(query);
  if (qtokens.length === 0) return [];
  const results: RetrievedItem[] = [];
  for (const n of getNews()) {
    const text = `${n.title} ${n.summary || ''} ${n.content || ''}`;
    const tf = buildTF(tokenize(text));
    const s = score(tf, qtokens);
    if (s > 0) {
      results.push({
        type: 'news',
        title: n.title,
        text: (n.summary || n.content || '').slice(0, 400),
        score: s,
        meta: { source: n.source_label || n.source, url: n.url, domain: n.domain, date: n.published_at },
      });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Get a summary of what data is available.
 */
export function getDataSummary(): string {
  const news = getNews();
  const models = getModels();
  const sources = new Set(news.map(n => n.source));
  const domains = new Set(news.map(n => n.domain));
  const providers = new Set(models.map(m => m.provider));
  return [
    `${news.length} news articles from ${sources.size} sources (${[...domains].join(', ')})`,
    `${models.length} LLM models from ${providers.size} providers`,
    `${getT2I().length} text-to-image models`,
    `${getT2V().length} text-to-video models`,
    `${getI2V().length} image-to-video models`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtModel(m: ModelEntry): string {
  const parts: string[] = [];
  if (m.intelligenceIndex != null) parts.push(`Intelligence: ${m.intelligenceIndex}`);
  if (m.aaSpeed != null) parts.push(`Speed: ${m.aaSpeed} t/s`);
  if (m.aaCostPerTask != null) parts.push(`Cost: $${m.aaCostPerTask}/task`);
  if (m.codingIndex != null) parts.push(`Coding: ${m.codingIndex}`);
  if (m.context) parts.push(`Context: ${m.context}`);
  if (m.params) parts.push(`Params: ${m.params}`);
  if (m.promptPrice != null) parts.push(`Input: $${m.promptPrice}/1M`);
  if (m.completionPrice != null) parts.push(`Output: $${m.completionPrice}/1M`);
  if (m.rank != null) parts.push(`Rank: #${m.rank}`);
  if (m.elo != null) parts.push(`Elo: ${m.elo}`);
  if (m.price) parts.push(m.price);
  if (m.ci) parts.push(`CI: ${m.ci}`);
  if (m.openWeights) parts.push('Open-weight');
  if (m.family) parts.push(m.family);
  return parts.join(' | ') || m.description?.slice(0, 200) || '';
}
