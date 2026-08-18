import fs from 'fs';
import path from 'path';

/**
 * Artificial Analysis model data scraper.
 *
 * Tries to scrape https://artificialanalysis.ai/models for model rankings
 * (intelligence index, speed, cost-per-task). Falls back to data/aa-models.json
 * seed data when the live scrape fails.
 */

export interface AAModelEntry {
  name: string;
  provider: string;
  intelligenceIndex: number | null;
  speed: number | null;
  costPerTask: number | null;
  verbosity: number | null;
}

const AA_MODELS_URL = 'https://artificialanalysis.ai/models';
const SEED_FILE = path.join(process.cwd(), 'data', 'aa-models.json');

const AA_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

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
 * Fetch Artificial Analysis model data. Tries live scrape first,
 * falls back to seed file on failure.
 */
export async function fetchAAData(): Promise<AAModelEntry[]> {
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
  'llava', 'vila', 'openbmb', 'kimi-k2',
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
      // AA is the authoritative benchmark source: always overwrite, never leave stale.
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
    } else {
      // Add as a new lightweight record.
      models.push({
        id: `aa/${key.replace(/\s+/g, '-')}`,
        name: aa.name,
        provider: aa.provider,
        source: 'aa',
        family: detectFamily(aa.name, aa.provider),
        intelligenceIndex: aa.intelligenceIndex,
        aaSpeed: aa.speed,
        aaCostPerTask: aa.costPerTask,
        aaVerbosity: aa.verbosity,
      });
      added++;
    }
  }

  return { updated, added };
}
