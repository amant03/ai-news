import * as fs from 'fs';
import * as path from 'path';
import {
  fetchAAHtml,
  mergeParsed,
  parseCurrentModel,
  parseFlightModels,
  parseJsonLdCharts,
  slugsFromHtml,
  type AAParsedModel,
} from './aa-parse';
import { canonicalSlug, modelMatchesSlug } from './model-slug';

/**
 * Artificial Analysis model data scraper.
 *
 * Parses JSON-LD + Next.js flight payloads from AA pages (no Puppeteer).
 * Falls back to data/aa-models.json when the live scrape fails.
 */

export interface AAModelEntry {
  slug: string;
  name: string;
  shortName?: string;
  provider: string;
  intelligenceIndex: number | null;
  speed: number | null;
  costPerTask: number | null;
  verbosity: number | null;
  latency?: number | null;
  promptPrice?: number | null;
  completionPrice?: number | null;
  context?: string;
  params?: string;
  license?: string;
  released?: string;
  family?: 'closed' | 'open-weights';
  isReasoning?: boolean;
  inputModalities?: string;
  outputModalities?: string;
  description?: string;
  evals?: Record<string, number>;
  hostModelCount?: number;
}

const HOME_URL = 'https://artificialanalysis.ai/';
const MODELS_URL = 'https://artificialanalysis.ai/models';
const MODEL_URL = (slug: string) => `https://artificialanalysis.ai/models/${slug}`;
const SEED_FILE = path.join(process.cwd(), 'data', 'aa-models.json');

function parsedToEntry(m: AAParsedModel): AAModelEntry {
  return {
    slug: m.slug,
    name: m.name,
    shortName: m.shortName,
    provider: m.provider,
    intelligenceIndex: m.intelligenceIndex ?? null,
    speed: m.aaSpeed ?? null,
    costPerTask: m.aaCostPerTask ?? null,
    verbosity: m.aaVerbosity ?? null,
    latency: m.aaLatency ?? null,
    promptPrice: m.promptPrice ?? null,
    completionPrice: m.completionPrice ?? null,
    context: m.context,
    params: m.params,
    license: m.license,
    released: m.released,
    family: m.family,
    isReasoning: m.isReasoning,
    inputModalities: m.inputModalities,
    outputModalities: m.outputModalities,
    description: m.description,
    evals: m.evals,
    hostModelCount: m.hostModelCount,
  };
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) ? n : null;
}

function loadSeedData(): AAModelEntry[] {
  try {
    if (!fs.existsSync(SEED_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    const list = Array.isArray(raw.models) ? raw.models : Array.isArray(raw) ? raw : [];
    return list.map((m: Record<string, unknown>) => ({
      slug: String(m.slug || canonicalSlug(String(m.name || ''))),
      name: String(m.name || ''),
      shortName: m.shortName ? String(m.shortName) : undefined,
      provider: String(m.provider || ''),
      intelligenceIndex: toNum(m.intelligenceIndex),
      speed: toNum(m.speed ?? m.aaSpeed),
      costPerTask: toNum(m.costPerTask ?? m.aaCostPerTask),
      verbosity: toNum(m.verbosity ?? m.aaVerbosity),
      latency: toNum(m.latency ?? m.aaLatency),
      promptPrice: toNum(m.promptPrice),
      completionPrice: toNum(m.completionPrice),
      context: m.context ? String(m.context) : undefined,
      params: m.params ? String(m.params) : undefined,
      license: m.license ? String(m.license) : undefined,
      released: m.released ? String(m.released) : undefined,
      family: m.family === 'open-weights' ? 'open-weights' : 'closed',
      isReasoning: m.isReasoning === true,
      inputModalities: m.inputModalities ? String(m.inputModalities) : undefined,
      outputModalities: m.outputModalities ? String(m.outputModalities) : undefined,
      evals: m.evals && typeof m.evals === 'object' ? (m.evals as Record<string, number>) : undefined,
      hostModelCount: toNum(m.hostModelCount) ?? undefined,
    }));
  } catch {
    return [];
  }
}

function saveSeed(models: AAModelEntry[]): void {
  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'artificialanalysis.ai',
    total: models.length,
    models,
  };
  fs.mkdirSync(path.dirname(SEED_FILE), { recursive: true });
  fs.writeFileSync(SEED_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

async function scrapeIndexPages(): Promise<AAParsedModel[]> {
  const [home, models] = await Promise.all([
    fetchAAHtml(HOME_URL),
    fetchAAHtml(MODELS_URL),
  ]);
  return mergeParsed([
    parseJsonLdCharts(home),
    parseFlightModels(home),
    parseJsonLdCharts(models),
    parseFlightModels(models),
  ]);
}

/**
 * Fetch Artificial Analysis model data. Tries live scrape first,
 * falls back to seed file on failure.
 */
export async function fetchAAData(): Promise<AAModelEntry[]> {
  try {
    const parsed = await scrapeIndexPages();
    if (parsed.length > 0) {
      const entries = parsed.map(parsedToEntry);
      const seed = loadSeedData();
      const merged = mergeEntries(seed, entries);
      saveSeed(merged);
      console.log(`   [aa-scraper] Scraped ${entries.length} models from AA index; catalog now ${merged.length}`);
      return merged;
    }
    console.log('   [aa-scraper] Live scrape returned no models, using seed data');
  } catch (err) {
    console.log(`   [aa-scraper] Live scrape failed: ${err instanceof Error ? err.message : err}`);
  }
  const seed = loadSeedData();
  console.log(`   [aa-scraper] Loaded ${seed.length} models from seed data`);
  return seed;
}

function mergeEntries(base: AAModelEntry[], incoming: AAModelEntry[]): AAModelEntry[] {
  const bySlug = new Map<string, AAModelEntry>();
  for (const m of [...base, ...incoming]) {
    if (!m.slug) continue;
    const prev = bySlug.get(m.slug);
    if (!prev) {
      bySlug.set(m.slug, m);
      continue;
    }
    bySlug.set(m.slug, {
      ...prev,
      ...Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined && v !== null && v !== '')),
      evals: { ...(prev.evals || {}), ...(m.evals || {}) },
    } as AAModelEntry);
  }
  return [...bySlug.values()];
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Scrape individual AA model pages for the full currentModel payload
 * (speed, cost, verbosity, evals, modalities). Writes data/aa-models.json.
 */
export async function scrapeAAModelPages(opts?: { limit?: number; slugs?: string[] }): Promise<number> {
  const existing = loadSeedData();
  const bySlug = new Map(existing.map(m => [m.slug, m]));

  let slugs = opts?.slugs ? [...opts.slugs] : [];
  if (slugs.length === 0) {
    try {
      const html = await fetchAAHtml(HOME_URL);
      slugs = slugsFromHtml(html);
      const modelsHtml = await fetchAAHtml(MODELS_URL);
      slugs = [...new Set([...slugs, ...slugsFromHtml(modelsHtml)])];
    } catch (err) {
      console.log(`   [aa-pages] index fetch failed: ${err instanceof Error ? err.message : err}`);
    }
    // Prefer slugs we already know, plus any missing detail
    slugs = [...new Set([...existing.map(m => m.slug), ...slugs])];
  }

  const limit = opts?.limit ?? Math.max(1, parseInt(process.env.AA_SCRAPE_LIMIT || '40', 10) || 40);
  // Skip index noise: provider pages (meta, google, aws), STT-only slugs and
  // Next.js page hashes 404 — real AA model slugs contain a dash or a digit.
  const PLAUSIBLE = (s: string) =>
    /[-0-9]/.test(s) && !/^page-[0-9a-f]{8,}$/i.test(s);
  const need = slugs.filter(s => {
    if (!PLAUSIBLE(s)) return false;
    const cur = bySlug.get(s);
    return !cur || cur.speed == null || cur.costPerTask == null || cur.verbosity == null;
  });
  const queue = (need.length ? need : slugs).slice(0, limit);
  console.log(`[aa-pages] Scraping ${queue.length} model pages (${need.length} missing detail)`);

  let updated = 0;
  let dropped = 0;
  for (let i = 0; i < queue.length; i++) {
    const slug = queue[i];
    try {
      const html = await fetchAAHtml(MODEL_URL(slug));
      const parsed = parseCurrentModel(html);
      if (parsed) {
        bySlug.set(slug, mergeEntries(bySlug.get(slug) ? [bySlug.get(slug)!] : [], [parsedToEntry(parsed)])[0]);
        updated++;
        console.log(`  [${i + 1}/${queue.length}] ${slug} intel=${parsed.intelligenceIndex} speed=${parsed.aaSpeed} cost=${parsed.aaCostPerTask}`);
      } else {
        console.log(`  [${i + 1}/${queue.length}] ${slug} — no currentModel`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Dead upstream slug (HTTP 404): drop it so stale records stop
      // poisoning alias matches (e.g. the removed deepseek-v4-pro-0903).
      if (/HTTP 404/.test(msg) && bySlug.delete(slug)) {
        dropped++;
        console.log(`  [${i + 1}/${queue.length}] ${slug} — 404, dropped from seed`);
      } else {
        console.log(`  [${i + 1}/${queue.length}] ${slug} — ${msg}`);
      }
    }
    await sleep(700);
  }

  const all = [...bySlug.values()];
  saveSeed(all);
  console.log(`[aa-pages] Wrote ${all.length} models (${updated} pages parsed, ${dropped} dead dropped)`);
  return updated;
}

const OPEN_SERIES = [
  'qwen', 'deepseek', 'llama', 'mistral', 'phi', 'gemma', 'kimi',
  'yi-', 'glm', 'olmo', 'dbrx', 'granite', 'nemotron', 'ernie',
  'aya', 'bloom', 'falcon', 'mpt', 'command-r', 'zephyr', 'solar',
  'internlm', 'starling', 'tulu', 'smol', 'codeqwen', 'qwq',
  'mathstral', 'devstral', 'codestral', 'minicpm', 'marco',
  'llava', 'vila', 'openbmb',
];

function detectFamily(name: string, provider: string): 'open-weights' | 'closed' {
  const n = name.toLowerCase();
  const p = provider.toLowerCase();
  if (OPEN_SERIES.some(s => n.includes(s))) return 'open-weights';
  if (['alibaba', 'deepseek', 'meta', 'mistral', 'zhipu', 'moonshot', 'nvidia'].some(s => p.includes(s))) {
    return 'open-weights';
  }
  return 'closed';
}

// Module-level alias-matching helpers (shared by the merge second pass and
// the slim refresh's stale-link eviction).
const ALIAS_PROVIDER_WORDS = new Set([
  'openai', 'anthropic', 'google', 'deepmind', 'xai', 'meta', 'mistral',
  'deepseek', 'qwen', 'alibaba', 'moonshot', 'zai', 'openrouter', 'ai',
]);
const ALIAS_STOP_WORDS = new Set(['latest', 'free', 'batch', 'preview', 'models', 'model']);

function aliasCoreTokens(name: string): string[] {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(t => t && !ALIAS_PROVIDER_WORDS.has(t) && !ALIAS_STOP_WORDS.has(t));
}

function aliasFoldDigits(t: string): string {
  return t.replace(/[0-9]/g, '');
}

function aliasNormProvider(p: unknown): string {
  return String(p || '').toLowerCase().replace(/^[^a-z0-9]+/, '').replace(/[-_]/g, '');
}

function aliasScore(slimName: string, aaName: string): number {
  const s = aliasCoreTokens(slimName);
  const a = aliasCoreTokens(aaName);
  if (s.length === 0 || a.length === 0) return -1;
  let score = 0;
  for (const t of s) {
    if (a.includes(t)) {
      score += 2;
      continue;
    }
    const f = aliasFoldDigits(t);
    if (f && a.some(x => aliasFoldDigits(x) === f)) {
      score += 1;
      continue;
    }
    return -1;
  }
  return score;
}

/**
 * Re-validate a persisted aaSlug link (used by the slim refresh to evict
 * stale linkages: the linked AA entry is gone, or the names no longer
 * match under the current strict rules).
 */
export function isValidAaLink(
  m: { id?: string; name?: string; provider?: string; aaSlug?: string },
  aa: AAModelEntry
): boolean {
  if (modelMatchesSlug({ id: m.id || '', name: m.name || '', aaSlug: m.aaSlug }, aa.slug)) {
    return true;
  }
  if (aliasNormProvider(m.provider) !== aliasNormProvider(aa.provider)) return false;
  return aliasScore(String(m.name || ''), aa.name) >= 2;
}

/**
 * Merge AA data into existing models. Match by canonical slug so
 * "Claude Fable 5.1 (batch)" maps onto AA's claude-fable-5-1.
 */
export function mergeAAIntoModels(
  models: Array<Record<string, unknown>>,
  aaData: AAModelEntry[]
): { updated: number; added: number } {
  let updated = 0;
  let added = 0;

  // Alias matching uses the module-level helpers (also used by
  // isValidAaLink for stale-link eviction).
  const normProvider = aliasNormProvider;

  const findAlias = (m: Record<string, unknown>): AAModelEntry | null => {
    const provider = normProvider(m.provider);
    if (!provider) return null;
    let best: AAModelEntry | null = null;
    let bestScore = -1;
    for (const aa of aaData) {
      if (!aa.name || normProvider(aa.provider) !== provider) continue;
      const score = aliasScore(String(m.name || ''), aa.name);
      // Require a real signal (>= 2: one exact token or two fuzzy ones).
      // A lone fuzzy hit (e.g. version "v3" matching "v4") is how DeepSeek
      // V3 once inherited V4 Pro's record — never again.
      if (score > bestScore && score >= 2) {
        bestScore = score;
        best = aa;
      }
    }
    return best;
  };

  for (const aa of aaData) {
    if (!aa.slug && !aa.name) continue;

    const existing = models.find(m =>
      modelMatchesSlug(
        { id: String(m.id || ''), name: String(m.name || ''), aaSlug: m.aaSlug ? String(m.aaSlug) : undefined },
        aa.slug || canonicalSlug(aa.name)
      )
    );

    const applyEntry = (target: Record<string, unknown>, entry: AAModelEntry, rename: boolean) => {
      target.aaSlug = entry.slug;
      if (entry.intelligenceIndex != null) {
        target.intelligenceIndex = Math.round(entry.intelligenceIndex * 10) / 10;
        updated++;
      }
      if (entry.speed != null) {
        target.aaSpeed = Math.round(entry.speed * 10) / 10;
        updated++;
      }
      if (entry.costPerTask != null) {
        target.aaCostPerTask = Math.round(entry.costPerTask * 100) / 100;
        updated++;
      }
      if (entry.verbosity != null) {
        target.aaVerbosity = entry.verbosity;
        updated++;
      }
      if (entry.latency != null) {
        target.aaLatency = Math.round(entry.latency * 100) / 100;
        updated++;
      }
      if (entry.promptPrice != null && target.promptPrice == null) target.promptPrice = entry.promptPrice;
      if (entry.completionPrice != null && target.completionPrice == null) target.completionPrice = entry.completionPrice;
      if (entry.context && !target.context) target.context = entry.context;
      if (entry.params && !target.params) target.params = entry.params;
      if (entry.license && !target.license) target.license = entry.license;
      if (entry.released && !target.released) target.released = entry.released;
      if (entry.isReasoning != null) target.isReasoning = entry.isReasoning;
      if (entry.inputModalities) target.inputModalities = entry.inputModalities;
      if (entry.outputModalities) target.outputModalities = entry.outputModalities;
      if (entry.family) target.family = entry.family;
      // Alias matches keep the catalog's own display name (e.g. OpenRouter's
      // "latest" pointer names) — only exact slug matches adopt AA's name.
      if (rename && entry.shortName) target.name = entry.name;
    };

    if (existing) {
      applyEntry(existing, aa, true);
    } else {
      const rec: Record<string, unknown> = {
        id: `aa/${aa.slug}`,
        name: aa.name,
        provider: aa.provider,
        source: 'aa',
        family: aa.family || detectFamily(aa.name, aa.provider),
        aaSlug: aa.slug,
      };
      applyEntry(rec, aa, true);
      models.push(rec);
      added++;
    }
  }

  // Second pass: records that still lack an aaSlug get one conservative alias
  // match (normalized provider + core-token subset). Never renames the record.
  for (const m of models) {
    if (m.aaSlug) continue;
    const aa = findAlias(m);
    if (!aa) continue;
    const target = m;
    target.aaSlug = aa.slug;
    if (aa.intelligenceIndex != null) {
      target.intelligenceIndex = Math.round(aa.intelligenceIndex * 10) / 10;
      updated++;
    }
    if (aa.speed != null) {
      target.aaSpeed = Math.round(aa.speed * 10) / 10;
      updated++;
    }
    if (aa.costPerTask != null) {
      target.aaCostPerTask = Math.round(aa.costPerTask * 100) / 100;
      updated++;
    }
    if (aa.verbosity != null) {
      target.aaVerbosity = aa.verbosity;
      updated++;
    }
    if (aa.latency != null) {
      target.aaLatency = Math.round(aa.latency * 100) / 100;
      updated++;
    }
    if (aa.promptPrice != null && target.promptPrice == null) target.promptPrice = aa.promptPrice;
    if (aa.completionPrice != null && target.completionPrice == null) target.completionPrice = aa.completionPrice;
    if (aa.context && !target.context) target.context = aa.context;
    if (aa.params && !target.params) target.params = aa.params;
    if (aa.released && !target.released) target.released = aa.released;
  }

  return { updated, added };
}

export function readAACatalog(): AAModelEntry[] {
  return loadSeedData();
}

export function findAAModel(slug: string): AAModelEntry | undefined {
  const list = loadSeedData();
  return list.find(m => m.slug === slug || modelMatchesSlug({ name: m.name, aaSlug: m.slug }, slug));
}
