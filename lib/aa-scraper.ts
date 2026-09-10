import fs from 'fs';
import path from 'path';

/**
 * Artificial Analysis model data scraper.
 *
 * Parses the JSON-LD benchmark datasets embedded in
 * https://artificialanalysis.ai/models (intelligence, speed, cost per task,
 * verbosity, pricing, context, params). Falls back to legacy HTML table
 * parsing, then to data/aa-models.json seed data when the live scrape fails.
 */

export interface AAModelEntry {
  name: string;
  provider: string;
  intelligenceIndex: number | null;
  speed: number | null;
  costPerTask: number | null;
  verbosity: number | null;
  /** Canonical context label, e.g. "256K", "1M". Set when known. */
  context?: string;
  /** Parameter count label, e.g. "125B". Set when known. */
  params?: string;
  /** USD per 1M tokens. Set when known. */
  promptPrice?: number;
  completionPrice?: number;
}

const AA_MODELS_URL = 'https://artificialanalysis.ai/models';
const SEED_FILE = path.join(process.cwd(), 'data', 'aa-models.json');

const AA_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function trimNum(v: number): string {
  return String(Math.round(v * 10) / 10);
}

function ldNum(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v)) return v;
  return null;
}

function ldPricingProp(row: Record<string, unknown>, name: string): number | null {
  const list = row.pricing;
  if (!Array.isArray(list)) return null;
  const hit = list.find((e: unknown) => typeof e === 'object' && e !== null && (e as Record<string, unknown>).name === name);
  return hit ? ldNum((hit as Record<string, unknown>).value) : null;
}

/**
 * Parse the JSON-LD benchmark datasets embedded in the AA /models page.
 * Each dataset looks like {name, data: [{label, detailsUrl, <metric>: value}]}.
 * Returns one entry per label (first value wins per metric).
 */
function parseAADatasets(html: string): AAModelEntry[] {
  const byLabel = new Map<string, AAModelEntry>();
  const get = (label: string): AAModelEntry => {
    let e = byLabel.get(label);
    if (!e) {
      e = { name: label, provider: '', intelligenceIndex: null, speed: null, costPerTask: null, verbosity: null };
      byLabel.set(label, e);
    }
    return e;
  };

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  for (const m of blocks) {
    let d: { name?: unknown; data?: unknown };
    try {
      d = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (!d || !Array.isArray(d.data)) continue;
    const name = String(d.name || '');
    for (const r of d.data as Array<Record<string, unknown>>) {
      const label = String(r.label || '').trim();
      if (!label) continue;
      const e = get(label);
      const keep = (cur: number | null, v: number | null) => cur ?? v ?? null;
      if (name === 'Intelligence' || name.startsWith('Artificial Analysis Intelligence Index')) {
        e.intelligenceIndex = keep(e.intelligenceIndex, ldNum(r.intelligenceIndex ?? r.artificialAnalysisIntelligenceIndex));
      } else if (name === 'Speed' || name === 'Output Speed') {
        e.speed = keep(e.speed, ldNum(r.outputSpeed ?? r.medianOutputSpeed));
      } else if (name === 'Cost per Task') {
        e.costPerTask = keep(e.costPerTask, ldNum(r.costPerIntelligenceIndexTask));
      } else if (name === 'Cost per Intelligence Index Task') {
        const sum = ['answer', 'reasoning', 'cacheWrite', 'cacheHit'].reduce((a, k) => a + (ldNum(r[k]) ?? 0), 0);
        if (sum > 0) e.costPerTask = keep(e.costPerTask, sum);
      } else if (name === 'Output Tokens per Intelligence Index Task') {
        const total = (ldNum(r.answer) ?? 0) + (ldNum(r.reasoning) ?? 0);
        if (total > 0) e.verbosity = keep(e.verbosity, Math.round(total));
      } else if (name.startsWith('Pricing:')) {
        const inp = ldPricingProp(r, 'inputPrice');
        const out = ldPricingProp(r, 'outputPrice');
        if (inp != null && e.promptPrice == null) e.promptPrice = inp;
        if (out != null && e.completionPrice == null) e.completionPrice = out;
      } else if (name === 'Context Window') {
        const t = ldNum(r.contextWindowTokens);
        if (t != null && e.context == null) {
          e.context = t >= 1_000_000 ? `${trimNum(t / 1_000_000)}M` : `${trimNum(t / 1_000)}K`;
        }
      } else if (name.startsWith('Model Size')) {
        const a = ldNum(r.activeParams);
        const p = ldNum(r.passiveParams);
        if (a != null && p != null && e.params == null) {
          const total = a + p;
          e.params = total >= 1000 ? `${trimNum(total / 1000)}T` : `${Math.round(total)}B`;
        }
      }
    }
  }
  return [...byLabel.values()].filter(
    e => e.intelligenceIndex != null || e.speed != null || e.costPerTask != null || e.verbosity != null
  );
}

/**
 * Attempt to scrape AA models page HTML and extract structured model data.
 */
async function scrapeAAHtml(): Promise<AAModelEntry[]> {
  const res = await fetch(AA_MODELS_URL, {
    signal: AbortSignal.timeout(30_000),
    headers: AA_HEADERS,
  });
  if (!res.ok) throw new Error(`AA HTTP ${res.status}`);

  const html = await res.text();
  const models: AAModelEntry[] = [];

  // The AA models page renders a table with rows containing model data.
  // Each model row typically has: name, provider, intelligence score, speed, cost.
  // Strategy: find table rows or card-like blocks and extract text content.

  // Pattern 1: Look for structured table rows with intelligence index values.
  // AA pages often have data in JSON embedded in script tags or in table cells.
  const jsonMatch = html.match(/__NEXT_DATA__[^>]*>(.*?)<\/script>/s);
  if (jsonMatch) {
    try {
      const nextData = JSON.parse(jsonMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      const modelData = pageProps?.models || pageProps?.data || pageProps?.leaderboard;
      if (Array.isArray(modelData)) {
        for (const m of modelData) {
          const name = m.name || m.model || m.model_name || '';
          if (!name) continue;
          models.push({
            name: String(name),
            provider: String(m.provider || m.company || m.org || ''),
            intelligenceIndex: toNum(m.intelligence_index ?? m.intelligenceIndex ?? m.ii ?? null),
            speed: toNum(m.speed ?? m.tokens_per_second ?? m.tps ?? null),
            costPerTask: toNum(m.cost_per_task ?? m.costPerTask ?? m.cost ?? null),
            verbosity: toNum(m.verbosity ?? m.output_tokens ?? m.aa_verbosity ?? null),
          });
        }
        if (models.length > 0) return models;
      }
    } catch {
      // JSON parse failed, fall through to HTML parsing.
    }
  }

  // Pattern 2: Parse HTML table rows.
  // Look for rows containing numbers that look like intelligence scores (typically 30-70 range).
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c =>
      c[1].replace(/<[^>]+>/g, '').trim()
    );
    if (cells.length < 3) continue;

    // Try to find a cell with a number in the 30-70 range (intelligence index).
    let iiIdx = -1;
    for (let i = 0; i < cells.length; i++) {
      const v = parseFloat(cells[i]);
      if (isFinite(v) && v >= 25 && v <= 75) {
        iiIdx = i;
        break;
      }
    }
    if (iiIdx < 0) continue;

    // The model name is typically the first cell or the cell before the score.
    const name = cells[0] || cells[iiIdx - 1] || '';
    if (!name || name.length < 2) continue;

    // Provider is typically the second cell.
    const provider = cells[1] || '';

    // Speed: look for a number that looks like tokens/sec (typically > 5).
    let speed: number | null = null;
    let cost: number | null = null;
    for (let i = iiIdx + 1; i < cells.length; i++) {
      const v = parseFloat(cells[i]);
      if (!isFinite(v)) continue;
      if (speed === null && v > 2 && v < 10000) {
        speed = v;
      } else if (cost === null && v >= 0 && v < 100) {
        cost = v;
      }
    }

    models.push({
      name: name.replace(/\s+/g, ' ').trim(),
      provider,
      intelligenceIndex: parseFloat(cells[iiIdx]) || null,
      speed,
      costPerTask: cost,
      verbosity: null,
    });
  }

  return models;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isFinite(n) ? n : null;
}

/**
 * Load fallback seed data from data/aa-models.json.
 */
function loadSeedData(): AAModelEntry[] {
  try {
    if (!fs.existsSync(SEED_FILE)) return [];
    const raw = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    if (!Array.isArray(raw.models)) return [];
    return raw.models.map((m: Record<string, unknown>) => ({
      name: String(m.name || ''),
      provider: String(m.provider || ''),
      intelligenceIndex: toNum(m.intelligenceIndex),
      speed: toNum(m.speed),
      costPerTask: toNum(m.costPerTask),
      verbosity: toNum(m.verbosity),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Artificial Analysis model data. Tries the embedded JSON-LD datasets
 * first (fresh intelligence/speed/cost/verbosity/pricing per model), falls
 * back to legacy HTML table parsing, then to seed data on failure.
 */
export async function fetchAAData(): Promise<AAModelEntry[]> {
  try {
    const res = await fetch(AA_MODELS_URL, {
      signal: AbortSignal.timeout(30_000),
      headers: AA_HEADERS,
    });
    if (res.ok) {
      const html = await res.text();
      const fromDatasets = parseAADatasets(html);
      if (fromDatasets.length >= 5) {
        console.log(`   [aa-scraper] Parsed ${fromDatasets.length} models from embedded datasets`);
        return fromDatasets;
      }
      console.log('   [aa-scraper] Embedded datasets too thin, trying legacy table parse');
    }
  } catch (err) {
    console.log(`   [aa-scraper] Dataset fetch failed: ${err instanceof Error ? err.message : err}`);
  }

  try {
    const scraped = await scrapeAAHtml();
    if (scraped.length > 0) {
      console.log(`   [aa-scraper] Scraped ${scraped.length} models from artificialanalysis.ai`);
      return scraped;
    }
    console.log('   [aa-scraper] Live scrape returned no models, using seed data');
  } catch (err) {
    console.log(`   [aa-scraper] Live scrape failed: ${err instanceof Error ? err.message : err}`);
  }

  const seed = loadSeedData();
  console.log(`   [aa-scraper] Loaded ${seed.length} models from seed data`);
  return seed;
}

/**
 * Detect whether a model is open weights by name/provider heuristics.
 * AA labels models "Open weights" or "Proprietary"; the scrape does not
 * capture that flag, so we infer it from known open-weight series.
 */
const OPEN_SERIES = [
  'qwen', 'deepseek', 'llama', 'mistral', 'phi', 'gemma', 'kimi',
  'yi-', 'glm', 'olmo', 'dbrx', 'granite', 'nemotron', 'ernie',
  'aya', 'bloom', 'falcon', 'mpt', 'command-r', 'zephyr', 'solar',
  'internlm', 'starling', 'tulu', 'aya', 'smol', 'codeqwen', 'qwq',
  'mathstral', 'devstral', 'codestral', 'minicpm', 'marco', 'bakllava',
  'llava', 'vila', 'openbmb', 'kimi-k2', 'gpt-oss', 'muse ',
  'muse-', 'llama-', 'hunyuan', 'doubao', 'seed-',
];
const OPEN_PROVIDERS = [
  'alibaba', 'deepseek', 'meta', 'hugging face', 'mistral ai',
  'zhipu', 'moonshot', 'snowflake', 'allen ai', 'ibm', 'intel',
  'tencent', 'baidu', 'bytedance', 'x-ai', 'xai', 'nvidia',
  'stability', 'eleuthera', 'together', '01.ai', '01 ai',
];

function detectFamily(name: string, provider: string): 'open-weights' | 'closed' {
  const n = name.toLowerCase();
  const p = provider.toLowerCase();
  if (OPEN_SERIES.some(s => n.includes(s))) return 'open-weights';
  if (OPEN_PROVIDERS.some(s => p.includes(s))) return 'open-weights';
  return 'closed';
}

/**
 * Infer the provider lab from a model name for records scraped without
 * provider attribution (AA chart datasets carry labels only).
 */
const PROVIDER_SERIES: Array<[string, string]> = [
  ['gpt', 'OpenAI'], ['openai', 'OpenAI'], ['codex', 'OpenAI'],
  ['o1', 'OpenAI'], ['o3', 'OpenAI'], ['o4', 'OpenAI'],
  ['claude', 'Anthropic'], ['fable', 'Anthropic'], ['anthropic', 'Anthropic'],
  ['gemini', 'Google'], ['gemma', 'Google'], ['google', 'Google'],
  ['deepseek', 'DeepSeek'],
  ['qwen', 'Qwen'], ['qwq', 'Qwen'],
  ['kimi', 'Moonshot'], ['moonshot', 'Moonshot'],
  ['glm', 'Zhipu'], ['zhipu', 'Zhipu'], ['chatglm', 'Zhipu'],
  ['llama', 'Meta'], ['muse', 'Meta'], ['meta', 'Meta'],
  ['mistral', 'Mistral'], ['devstral', 'Mistral'], ['codestral', 'Mistral'], ['mixtral', 'Mistral'],
  ['grok', 'xAI'], ['xai', 'xAI'],
  ['minimax', 'MiniMax'],
  ['hunyuan', 'Tencent'], ['tencent', 'Tencent'],
  ['doubao', 'ByteDance'], ['seed-', 'ByteDance'], ['bytedance', 'ByteDance'],
  ['ernie', 'Baidu'], ['baidu', 'Baidu'],
  ['yi-', '01.AI'], ['command', 'Cohere'], ['aya', 'Cohere'], ['cohere', 'Cohere'],
  ['phi', 'Microsoft'], ['microsoft', 'Microsoft'], ['mai-', 'Microsoft'],
  ['granite', 'IBM'], ['nova', 'Amazon'], ['amazon', 'Amazon'],
  ['nemotron', 'NVIDIA'], ['nvidia', 'NVIDIA'],
  ['solar', 'Upstage'], ['reka', 'Reka'], ['inflect', 'Inflection'],
  ['sonar', 'Perplexity'], ['perplexity', 'Perplexity'],
  ['dbrx', 'Databricks'], ['snowflake', 'Snowflake'],
  ['stablelm', 'Stability AI'], ['stability', 'Stability AI'],
  ['falcon', 'TII'], ['smol', 'Hugging Face'], ['olmo', 'Allen AI'],
];

export function inferProvider(name: string): string {
  const n = ` ${name.toLowerCase()} `;
  for (const [series, provider] of PROVIDER_SERIES) {
    if (n.includes(series)) return provider;
  }
  return '';
}

/**
 * Merge AA data into existing ModelDatabase models array.
 * Updates intelligenceIndex, speed, and costPerTask on matching models.
 * Adds new models if they aren't already present.
 */
export function mergeAAIntoModels(
  models: Array<Record<string, unknown>>,
  aaData: AAModelEntry[]
): { updated: number; added: number } {
  let updated = 0;
  let added = 0;

  for (const aa of aaData) {
    const key = aa.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (!key) continue;

    // Find existing model by name match.
    const existing = models.find(m => {
      const mName = String(m.name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      return mName === key || mName.includes(key) || key.includes(mName);
    });

    if (existing) {
      // AA is the authoritative benchmark source: always overwrite metrics,
      // never leave stale. Descriptive fields only fill gaps.
      if (aa.intelligenceIndex !== null) {
        existing.intelligenceIndex = aa.intelligenceIndex;
        updated++;
      }
      if (aa.speed !== null) {
        existing.aaSpeed = aa.speed;
        updated++;
      }
      if (aa.costPerTask !== null) {
        existing.aaCostPerTask = aa.costPerTask;
        updated++;
      }
      if (aa.verbosity !== null) {
        existing.aaVerbosity = aa.verbosity;
        updated++;
      }
      if (aa.context != null && existing.context == null) {
        existing.context = aa.context;
        updated++;
      }
      if (aa.params != null && existing.params == null) {
        existing.params = aa.params;
        updated++;
      }
      if (aa.promptPrice != null && existing.promptPrice == null) {
        existing.promptPrice = aa.promptPrice;
        updated++;
      }
      if (aa.completionPrice != null && existing.completionPrice == null) {
        existing.completionPrice = aa.completionPrice;
        updated++;
      }
    } else {
      // Add as a new lightweight record. Provider is inferred from the
      // model name when the scrape carries labels only.
      const provider = aa.provider || inferProvider(aa.name);
      models.push({
        id: `aa/${key.replace(/\s+/g, '-')}`,
        name: aa.name,
        provider,
        source: 'aa',
        family: detectFamily(aa.name, provider),
        intelligenceIndex: aa.intelligenceIndex,
        aaSpeed: aa.speed,
        aaCostPerTask: aa.costPerTask,
        aaVerbosity: aa.verbosity,
        context: aa.context,
        params: aa.params,
        promptPrice: aa.promptPrice,
        completionPrice: aa.completionPrice,
      });
      added++;
    }
  }

  return { updated, added };
}

// CLI entry point: live-refresh data/models-slim.json AA fields from a
// fresh scrape (npx tsx lib/aa-scraper.ts). Used for manual refreshes;
// CI runs the same merge inside refreshSlimOpenRouter every 4h.
if (require.main === module) {
  (async () => {
    const { readSlimModelDatabase } = await import('./model-registry');
    const slim = readSlimModelDatabase();
    if (!slim) {
      console.error('[aa-scraper] No data/models-slim.json found');
      process.exit(1);
    }
    const aaData = await fetchAAData();
    const merged = mergeAAIntoModels(
      slim.models as unknown as Array<Record<string, unknown>>,
      aaData
    );
    slim.updatedAt = new Date().toISOString();
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join, dirname } = await import('path');
    const fp = join(process.cwd(), 'data', 'models-slim.json');
    mkdirSync(dirname(fp), { recursive: true });
    writeFileSync(fp, JSON.stringify(slim, null, 2));
    console.log(`[aa-scraper] slim refreshed: ${merged.updated} fields updated, ${merged.added} models added`);
  })().then(() => process.exit(0)).catch(err => {
    console.error('[aa-scraper] refresh failed:', err);
    process.exit(1);
  });
}
