import * as fs from 'fs';
import * as path from 'path';
import { fetchAAHtml } from './aa-parse';
import { unescapeFlightPayloads, extractKeyedValue } from './flight';
import { readSlimModelDatabase, type SlimModel } from './model-registry';

/**
 * AI trends dataset (free, no keys).
 *
 * Base: our own model catalog (refreshed every 4h) — release date,
 * intelligence, price, speed, openness per model. Enriched with the
 * frontier-model series scraped from the public trends page (creator
 * colors/countries, models missing from our catalog).
 * Writes data/ai-trends.json, served by /api/ai-trends.
 */

const PAGE_URL = 'https://artificialanalysis.ai/trends';
const DATA_FILE = path.join(process.cwd(), 'data', 'ai-trends.json');

export interface TrendPoint {
  slug: string;
  name: string;
  creator: string;
  color: string;
  country: string;
  /** Release date ISO (YYYY-MM-DD). */
  date: string;
  intelligence: number | null;
  /** Blended USD per 1M tokens. */
  price: number | null;
  /** Median output tokens/sec. */
  speed: number | null;
  open: boolean;
  /** Active params in billions, when known. */
  paramsB: number | null;
  /** Context window in tokens, when known. */
  context: number | null;
}

interface AATrendModel {
  slug?: unknown;
  name?: unknown;
  shortName?: unknown;
  releaseDate?: unknown;
  intelligenceIndex?: unknown;
  price1mBlended7To2To1?: unknown;
  medianOutputSpeed?: unknown;
  isOpenWeights?: unknown;
  inferenceParametersActiveBillions?: unknown;
  parameters?: unknown;
  contextWindowTokens?: unknown;
  creator?: { name?: unknown; slug?: unknown; color?: unknown; country?: unknown } | null;
}

const CREATOR_META: Record<string, { color: string; country: string }> = {
  openai: { color: '#10a37f', country: 'United States' },
  anthropic: { color: '#d97706', country: 'United States' },
  google: { color: '#4285f4', country: 'United States' },
  deepmind: { color: '#4285f4', country: 'United States' },
  meta: { color: '#3b82f6', country: 'United States' },
  xai: { color: '#6b7280', country: 'United States' },
  deepseek: { color: '#059669', country: 'China' },
  alibaba: { color: '#f97316', country: 'China' },
  qwen: { color: '#f97316', country: 'China' },
  mistral: { color: '#f59e0b', country: 'France' },
  nvidia: { color: '#76b900', country: 'United States' },
  zhipu: { color: '#ec4899', country: 'China' },
  moonshot: { color: '#8b5cf6', country: 'China' },
  minimax: { color: '#ef4444', country: 'China' },
  cohere: { color: '#a855f7', country: 'Canada' },
  bytedance: { color: '#fe2c55', country: 'China' },
  microsoft: { color: '#00a4ef', country: 'United States' },
  amazon: { color: '#ff9900', country: 'United States' },
  perplexity: { color: '#20b8cd', country: 'United States' },
  groq: { color: '#f97316', country: 'United States' },
  together: { color: '#0ea5e9', country: 'United States' },
  fireworks: { color: '#fb7185', country: 'United States' },
};

const COUNTRY_NAMES: Record<string, string> = {
  us: 'United States', cn: 'China', fr: 'France', ca: 'Canada', uk: 'United Kingdom',
  de: 'Germany', kr: 'South Korea', jp: 'Japan', in: 'India', ae: 'UAE', sg: 'Singapore',
};

const FALLBACK_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6'];

function colorFor(creator: string, index: number): string {
  const key = creator.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(CREATOR_META)) {
    if (key.includes(k)) return v.color;
  }
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

function countryFor(creator: string): string {
  const key = creator.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(CREATOR_META)) {
    if (key.includes(k)) return v.country;
  }
  return 'Other';
}

const finiteOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

function parseParamsB(params: unknown): number | null {
  if (typeof params !== 'string') return null;
  const m = params.trim().match(/^([\d.]+)\s*([TBMK])?/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (isNaN(v)) return null;
  const u = (m[2] || 'B').toUpperCase();
  if (u === 'T') return v * 1000;
  if (u === 'B') return v;
  if (u === 'M') return v / 1000;
  return v / 1_000_000;
}

function parseContextTokens(context: unknown): number | null {
  if (typeof context !== 'string') return null;
  const m = context.trim().match(/^([\d.]+)\s*([MK])?/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (isNaN(v)) return null;
  const u = (m[2] || '').toUpperCase();
  if (u === 'M') return v * 1_000_000;
  if (u === 'K') return v * 1_000;
  return v;
}

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Pure parse: trends flight HTML → raw frontier models (unit-tested). */
export function parseTrendModels(html: string): AATrendModel[] {
  const found = extractKeyedValue<AATrendModel[]>(unescapeFlightPayloads(html), 'initialModels');
  return Array.isArray(found) ? found : [];
}

function blendedPerM(prompt?: number, completion?: number): number | null {
  if (prompt === undefined && completion === undefined) return null;
  const v = ((prompt ?? completion ?? 0) + (completion ?? prompt ?? 0)) / 2;
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
}

function fromSlim(m: SlimModel, index: number): TrendPoint | null {
  if (!m.released || !m.name) return null;
  const d = new Date(m.released);
  if (isNaN(d.getTime())) return null;
  const creator = m.provider || 'Unknown';
  return {
    slug: slugOf(m.name),
    name: m.name,
    creator,
    color: colorFor(creator, index),
    country: countryFor(creator),
    date: d.toISOString().slice(0, 10),
    intelligence: finiteOrNull(m.intelligenceIndex),
    price: blendedPerM(m.promptPrice, m.completionPrice),
    speed: finiteOrNull(m.aaSpeed),
    open: m.family === 'open-weights' || m.family === 'open',
    paramsB: parseParamsB(m.params),
    context: parseContextTokens(m.context),
  };
}

function fromAA(m: AATrendModel, index: number): TrendPoint | null {
  const name = typeof m.shortName === 'string' && m.shortName ? m.shortName : typeof m.name === 'string' ? m.name : '';
  if (!name || typeof m.releaseDate !== 'string') return null;
  const d = new Date(m.releaseDate);
  if (isNaN(d.getTime())) return null;
  const creator =
    m.creator && typeof m.creator.name === 'string' && m.creator.name ? m.creator.name : 'Unknown';
  const cc = m.creator && typeof m.creator.country === 'string' ? m.creator.country.toLowerCase() : '';
  return {
    slug: typeof m.slug === 'string' && m.slug ? m.slug : slugOf(name),
    name,
    creator,
    color:
      m.creator && typeof m.creator.color === 'string' && m.creator.color
        ? m.creator.color
        : colorFor(creator, index),
    country: COUNTRY_NAMES[cc] || countryFor(creator),
    date: d.toISOString().slice(0, 10),
    intelligence: finiteOrNull(m.intelligenceIndex),
    price: finiteOrNull(m.price1mBlended7To2To1),
    speed: finiteOrNull(m.medianOutputSpeed),
    open: m.isOpenWeights === true,
    paramsB: finiteOrNull(m.inferenceParametersActiveBillions) ?? parseParamsB(m.parameters),
    context: finiteOrNull(m.contextWindowTokens),
  };
}

/**
 * Merge slim catalog (fresh, 4-hourly) with the scraped frontier series.
 * Slim wins on conflicting metrics; AA fills creator meta + missing models.
 */
export function buildTrendDataset(slim: SlimModel[], aa: AATrendModel[]): TrendPoint[] {
  const bySlug = new Map<string, TrendPoint>();
  slim.forEach((m, i) => {
    const p = fromSlim(m, i);
    if (p) bySlug.set(p.slug, p);
  });
  let added = 0;
  aa.forEach((m, i) => {
    const p = fromAA(m, i);
    if (!p) return;
    const cur = bySlug.get(p.slug);
    if (!cur) {
      bySlug.set(p.slug, p);
      added++;
      return;
    }
    // Fill gaps only — never overwrite fresher slim metrics.
    if (cur.intelligence == null) cur.intelligence = p.intelligence;
    if (cur.price == null) cur.price = p.price;
    if (cur.speed == null) cur.speed = p.speed;
    if (cur.paramsB == null) cur.paramsB = p.paramsB;
    if (cur.context == null) cur.context = p.context;
    if (cur.creator === 'Unknown') {
      cur.creator = p.creator;
      cur.color = p.color;
      cur.country = p.country;
    }
  });
  const out = [...bySlug.values()].sort((a, b) => a.date.localeCompare(b.date));
  console.log(`   [ai-trends] ${out.length} points (${added} frontier-only from scrape)`);
  return out;
}

export async function scrapeAiTrends(): Promise<number> {
  const slim = readSlimModelDatabase();
  const base = slim?.models || [];
  let aa: AATrendModel[] = [];
  try {
    const html = await fetchAAHtml(PAGE_URL);
    aa = parseTrendModels(html);
    console.log(`   [ai-trends] Scraped ${aa.length} frontier models`);
  } catch (err) {
    console.log(`   [ai-trends] Scrape failed, slim catalog only: ${err instanceof Error ? err.message : err}`);
  }
  const models = buildTrendDataset(base, aa);
  if (models.length === 0) {
    console.log('   [ai-trends] No points — keeping existing data file');
    return 0;
  }
  const payload = { updatedAt: new Date().toISOString(), source: 'model catalog + frontier series', total: models.length, models };
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
  console.log(`   [ai-trends] Wrote ${models.length} points`);
  return models.length;
}
