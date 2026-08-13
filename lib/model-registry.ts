import fs from 'fs';
import path from 'path';
import { NewsItem } from './types';

/**
 * Comprehensive multi-source model database scraper.
 *
 * Sources (never rely on one):
 *  1. OpenRouter API   — every API model (closed + open), pricing, context,
 *                        release date, Artificial Analysis indices.
 *  2. Hugging Face     — trending + most-downloaded open-weight models
 *                        (standalone entries, not just enrichment).
 *  3. Ollama           — most popular local models (library order).
 *  4. LMArena          — human-preference leaderboard order (via reader).
 *  5. freellm.sh       — free-tier provider models (best-effort).
 *  6. X / Reddit / news store — mention volume + recency for buzz, per source.
 *
 * Persists to data/models.json powering the Model Watch leaderboard,
 * value-for-money and popularity views.
 */

export interface ModelRecord {
  id: string;
  name: string;
  provider: string;
  source: string;
  released?: string;
  family: 'closed' | 'open' | 'open-weights';
  params?: string;
  context?: string;
  description?: string;
  promptPrice?: number;
  completionPrice?: number;
  valueScore?: number;
  intelligenceIndex?: number;
  codingIndex?: number;
  agenticIndex?: number;
  hfDownloads?: number;
  hfLikes?: number;
  elo?: number;
  arenaRank?: number;
  numVotes?: number;
  license?: string;
  mentions?: number;
  redditMentions?: number;
  xMentions?: number;
  buzz?: number;
  freeTier?: boolean;
  localOnly?: boolean;
}

export interface ModelDatabase {
  updatedAt: string;
  sources: string[];
  counts: { total: number; withPricing: number; withBenchmarks: number; withElo: number; openWeights: number };
  models: ModelRecord[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'models.json');

const KNOWN_PROVIDER_BY_SLUG: Array<[string, string]> = [
  ['openai', 'OpenAI'], ['anthropic', 'Anthropic'], ['x-ai', 'xAI'], ['google', 'Google'],
  ['meta', 'Meta'], ['meta-llama', 'Meta'], ['mistralai', 'Mistral'], ['deepseek', 'DeepSeek'],
  ['qwen', 'Qwen'], ['amazon', 'Amazon'], ['nvidia', 'NVIDIA'], ['cohere', 'Cohere'],
  ['groq', 'Groq'], ['perplexity', 'Perplexity'], ['together', 'Together AI'],
  ['fireworks', 'Fireworks'], ['replicate', 'Replicate'], ['microsoft', 'Microsoft'],
  ['moonshot', 'Moonshot'], ['zhipu', 'Zhipu'], ['minimax', 'MiniMax'], ['bytedance', 'ByteDance'],
  ['baidu', 'Baidu'], ['01', '01.AI'], ['liquid', 'Liquid AI'], ['stability', 'Stability AI'],
  ['eleutherai', 'EleutherAI'], ['nous', 'Nous Research'], ['unsloth', 'Unsloth'],
  ['ollama', 'Ollama'], ['scaleway', 'Scaleway'], ['lite', 'LiteLLM'], ['aihub', 'AI Hub'],
];

export function providerFromId(id: string): string {
  const slug = id.split('/')[0].toLowerCase();
  for (const [k, v] of KNOWN_PROVIDER_BY_SLUG) {
    if (slug === k || slug.startsWith(k)) return v;
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function detectFamily(slug: string): ModelRecord['family'] {
  const s = slug.toLowerCase();
  if (/(^|\/)(gpt-oss|llama|mistral|mixtral|qwen|deepseek|gemma|olmo|nous|nemotron|granite|command-r|aya|jamba|stable-|flux|internlm|minicpm|glm-4|openchat|zephyr|t5|falcon|phi-|vicuna|alpaca|koala|mpt|bloom|smollm|moonshine|sailor|tern|tulip|ibm|snowflake)/.test(s)) {
    return 'open-weights';
  }
  return 'closed';
}

function paramCountFromArch(arch: Record<string, unknown> | undefined): string | undefined {
  const n = arch?.['parameter_count'];
  if (typeof n === 'number' && n > 0) {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
    return `${Math.round(n / 1_000_000)}M`;
  }
  return undefined;
}

function formatContext(n: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

/** Normalize any model id/name to a stable dedup key. */
export function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(hf|ollama|openrouter|lmarena|freellm)\//, '')
    .split('/').pop() || raw;
}

function humanName(raw: string): string {
  const slug = raw.split('/').pop() || raw;
  return slug
    .replace(/(^|[-_+])([a-z])/g, (_, p, c) => (p ? ' ' : '') + c.toUpperCase())
    .trim();
}

// ---------------------------------------------------------------------------
// Source 1: OpenRouter — full API catalog (closed + open)
// ---------------------------------------------------------------------------

interface ORModel {
  id: string;
  name: string;
  context_length?: number;
  created?: number;
  pricing?: { prompt: number; completion: number };
  architecture?: Record<string, unknown>;
  description?: string;
  benchmarks?: {
    artificial_analysis?: { intelligence_index?: number; coding_index?: number; agentic_index?: number };
    lmarena?: { elo?: number; rank?: number };
  };
}

export async function scrapeOpenRouter(): Promise<ModelRecord[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    signal: AbortSignal.timeout(25000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const data = (await res.json()) as { data: ORModel[] };

  const out: ModelRecord[] = [];
  for (const m of data.data) {
    const slug = m.id.split(':')[0];
    const promptPrice = m.pricing?.prompt != null && Number(m.pricing.prompt) >= 0 ? Math.round(Number(m.pricing.prompt) * 1_000_000 * 100) / 100 : undefined;
    const completionPrice = m.pricing?.completion != null && Number(m.pricing.completion) >= 0 ? Math.round(Number(m.pricing.completion) * 1_000_000 * 100) / 100 : undefined;
    const ii = m.benchmarks?.artificial_analysis?.intelligence_index;
    const ci = m.benchmarks?.artificial_analysis?.coding_index;
    const ai = m.benchmarks?.artificial_analysis?.agentic_index;

    let valueScore: number | undefined;
    if (ii !== undefined && promptPrice !== undefined && completionPrice !== undefined) {
      const perM = (promptPrice + completionPrice) / 2 || 1;
      valueScore = Math.max(0, Math.round((ii / perM) * 5));
    }

    out.push({
      id: slug,
      name: m.name.replace(/^[^:]+:\s*/, ''),
      provider: providerFromId(slug),
      source: 'openrouter',
      released: m.created ? new Date(m.created * 1000).toISOString() : undefined,
      family: detectFamily(slug),
      params: paramCountFromArch(m.architecture),
      context: m.context_length ? formatContext(m.context_length) : undefined,
      description: m.description?.slice(0, 220),
      promptPrice,
      completionPrice,
      valueScore,
      intelligenceIndex: ii,
      codingIndex: ci,
      agenticIndex: ai,
      elo: m.benchmarks?.lmarena?.elo,
      arenaRank: m.benchmarks?.lmarena?.rank,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Source 2: Hugging Face — trending + most-downloaded open-weight models
// ---------------------------------------------------------------------------

interface HfRow {
  id: string;
  downloads: number;
  likes: number;
  tags?: string[];
  lastModified?: string;
}

export async function scrapeHuggingFace(): Promise<ModelRecord[]> {
  const urls = [
    'https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=80',
    'https://huggingface.co/api/models?filter=text-generation&sort=trendingScore&direction=-1&limit=80',
    'https://huggingface.co/api/models?filter=text-generation&sort=downloads&direction=-1&limit=60',
    'https://huggingface.co/api/models?filter=text-generation&sort=likes&direction=-1&limit=60',
  ];
  const seen = new Set<string>();
  const out: ModelRecord[] = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      const rows = (await res.json()) as HfRow[];
      for (const r of rows) {
        const key = normalizeKey(r.id);
        if (seen.has(key)) continue;
        seen.add(key);
        const idl = r.id.toLowerCase();
        const skip = /embed|retriev|reranker|reward|tokenizer|vocab|whisper|voice|tts|asr|stt|image|clip|bge|e5-|nomic-embed|rerank/i.test(idl);
        if (skip) continue;
        out.push({
          id: r.id,
          name: humanName(r.id),
          provider: providerFromId(r.id),
          source: 'huggingface',
          released: r.lastModified ? new Date(r.lastModified).toISOString() : undefined,
          family: 'open-weights',
          hfDownloads: r.downloads || 0,
          hfLikes: r.likes || 0,
          description: r.tags?.includes('text-generation') ? 'Open-weight text-generation model on Hugging Face.' : undefined,
        });
      }
    } catch {
      /* best-effort */
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Source 3: Ollama — most popular local models
// ---------------------------------------------------------------------------

export async function scrapeOllama(): Promise<ModelRecord[]> {
  const out: ModelRecord[] = [];
  const seen = new Set<string>();
  for (const sort of ['popular', 'trending']) {
    try {
      const res = await fetch(`https://ollama.com/library?sort=${sort}`, {
        signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36' },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const names = [...new Set([...html.matchAll(/library\/([a-z0-9][a-z0-9._-]*)/g)].map(m => m[1]))]
        .filter(n => n !== 'library' && !n.endsWith('/') && !n.includes('tags'));
      names.forEach((name, i) => {
        const key = normalizeKey(name);
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          id: `ollama/${name}`,
          name: humanName(name),
          provider: 'Ollama',
          source: 'ollama',
          family: 'open-weights',
          localOnly: true,
          arenaRank: i + 1,
          hfDownloads: 0,
        });
      });
    } catch {
      /* best-effort */
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Source 4: LMArena — human-preference leaderboard order (via reader)
// ---------------------------------------------------------------------------

export async function scrapeLmarenaRanks(): Promise<ModelRecord[]> {
  const out: ModelRecord[] = [];
  let text = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      // lmarena.ai is server-rendered: each leaderboard row is a <tr> with the
      // elo/votes/price/context inline. No jina dependency — just fetch the HTML.
      const res = await fetch('https://lmarena.ai/leaderboard/text', {
        signal: AbortSignal.timeout(60000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.ok) {
        text = await res.text();
        if (text.includes('<tr')) break;
      }
    } catch {
      /* fall through to backoff */
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 10000 * (attempt + 1)));
  }
  if (!text) return out;

  const rows = text.split(/<tr/);
  for (const row of rows) {
    // Only model rows link out to huggingface.co.
    if (!row.includes('huggingface.co')) continue;

    // Model name: <span class="max-w-full truncate" title="glm-5.2-max">glm-5.2-max</span>
    const nameMatch = row.match(/\btitle="([^"]{1,60})"[^>]*>[^<]*<\/span>/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    // Org · license: <span class="text-text-secondary truncate text-xs">Z.ai · MIT</span>
    const orgMatch = row.match(/text-text-secondary truncate text-xs">([^<]+)<\/span>/);
    const meta = (orgMatch?.[1] || '').split('·').map(s => s.trim());
    const org = meta[0] || 'LMArena';
    const license = meta[1] || '';

    // Elo: <span class="body-sm">1471</span><span class="text-text-tertiary body-xs">±5</span>
    const eloMatch = row.match(/body-sm">(\d{3,4})<\/span><span class="text-text-tertiary body-xs">/);
    if (!eloMatch) continue;
    const elo = parseInt(eloMatch[1], 10);
    if (!isFinite(elo)) continue;

    // Votes: the second body-sm span (first is the elo itself, e.g. "26,973")
    const votesMatches = row.match(/body-sm">([\d,]+)<\/span>/g);
    const votesRaw = votesMatches && votesMatches.length > 1
      ? votesMatches[1].match(/([\d,]+)/)?.[1]
      : undefined;
    const votes = votesRaw ? parseInt(votesRaw.replace(/,/g, ''), 10) : 0;

    // Price: $1.40<!-- --> / <!-- -->$4.40 (comment nodes between amounts)
    const priceMatch = row.match(/\$([\d.]+)[\s\S]*?\$([\d.]+)/);
    let promptPrice: number | undefined;
    let completionPrice: number | undefined;
    if (priceMatch) {
      const a = parseFloat(priceMatch[1]);
      const b = parseFloat(priceMatch[2]);
      promptPrice = isFinite(a) ? a : undefined;
      completionPrice = isFinite(b) ? b : undefined;
    }

    const key = name.toLowerCase();
    if (out.some(m => m.name.toLowerCase() === key)) continue;
    out.push({
      id: `lmarena/${name}`,
      name,
      provider: org,
      source: 'lmarena',
      family: /proprietary|closed/i.test(license) ? 'closed' : 'open-weights',
      elo,
      promptPrice,
      completionPrice,
      license: license || undefined,
      numVotes: votes,
    });
    if (out.length >= 250) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Source 5: freellm.sh — free-tier endpoints (best-effort via reader)
// ---------------------------------------------------------------------------

export async function scrapeFreellm(): Promise<ModelRecord[]> {
  const out: ModelRecord[] = [];
  try {
    const res = await fetch('https://r.jina.ai/https://freellm.sh/', {
      signal: AbortSignal.timeout(60000),
      headers: { 'X-Return-Format': 'markdown', 'X-Timeout': '30' },
    });
    if (!res.ok) return out;
    const text = await res.text();
    const lines = text.split('\n');
    const seen = new Set<string>();
    for (const line of lines) {
      const t = line.trim();
      if (!t || !t.startsWith('[')) continue;
      // Provider entry: "[api-airforce Open ...](https://freellm.sh/x/api-airforce) ..."
      const m = t.match(/^\[([a-z0-9][a-z0-9._-]*(?:\s+open)?)\s*[!\]]/i);
      if (!m) continue;
      const name = m[1].toLowerCase().replace(/\s+open$/i, '');
      if (!name || seen.has(name)) continue;
      if (/(^|\b)(home|freellm|by@0x_kaize|sort|filters|kind|collection|website|access|card|required|data|training|free|forever|tier|limited|signup|phone|credits|type|audio|code|embedding|image|text|status|overview|login|log)\b/i.test(name)) continue;
      seen.add(name);
      out.push({
        id: `freellm/${name}`,
        name: humanName(name),
        provider: 'Free LLM',
        source: 'freellm',
        family: 'closed',
        freeTier: true,
      });
    }
  } catch {
    /* best-effort */
  }
  return out;
}

// ---------------------------------------------------------------------------
// Merge + scoring
// ---------------------------------------------------------------------------

const MODEL_ALIASES: Array<[string, string]> = [
  ['gpt-5.6 sol', 'gpt-5.6-sol'], ['gpt-5.6 terra', 'gpt-5.6-terra'], ['gpt-5.6 luna', 'gpt-5.6-luna'],
  ['gemini 3 pro', 'gemini-3-pro'], ['claude opus 5', 'claude-opus-5'], ['claude sonnet 5', 'claude-sonnet-5'],
  ['grok 4.6', 'grok-4.6'], ['llama 4 maverick', 'llama-4-maverick'], ['llama 4 scout', 'llama-4-scout'],
  ['deepseek v4 pro', 'deepseek-v4-pro'], ['qwen3.8 max', 'qwen3.8-max'], ['kimi k3', 'kimi-k3'],
];

export function mergeModelData(sources: Array<{ models: ModelRecord[]; name: string }>, items: NewsItem[]): ModelRecord[] {
  // Build normalized-key index, preferring richer sources.
  const byKey = new Map<string, ModelRecord>();
    const prefer = (a: ModelRecord | undefined, b: ModelRecord | undefined): ModelRecord => {
      if (!a) return b!;
      if (!b) return a;
      const score = (m: ModelRecord) => (m.promptPrice !== undefined ? 4 : 0) + (m.intelligenceIndex !== undefined ? 3 : 0) + (m.hfDownloads ? 2 : 0) + (m.elo !== undefined ? 2 : 0);
      const winner = score(b) > score(a) ? b : a;
      const loser = winner === a ? b : a;
      // Keep richer source as the base, but carry over LMArena Elo / votes /
      // license so a model that exists on both OpenRouter and the arena still
      // surfaces with its ranking data.
      const merged = { ...winner };
      if (merged.elo === undefined && loser.elo !== undefined) merged.elo = loser.elo;
      if ((merged.numVotes ?? 0) === 0 && (loser.numVotes ?? 0) > 0) merged.numVotes = loser.numVotes;
      if (!merged.license && loser.license) merged.license = loser.license;
      return merged;
    };

  for (const src of sources) {
    for (const m of src.models) {
      const k = normalizeKey(m.id);
      const existing = byKey.get(k);
      if (existing) byKey.set(k, prefer(existing, m));
      else byKey.set(k, m);
      // Alias expansion so "Grok 4.20 (High)" merges with "Grok 4.6".
      for (const [alias, target] of MODEL_ALIASES) {
        if (k.includes(alias)) {
          const prev = byKey.get(target);
          if (prev) byKey.set(target, prefer(prev, m));
          else byKey.set(target, m);
        }
      }
    }
  }

  // Mention stats from the news store (all sources incl. X + Reddit).
  const now = Date.now();
  const twoDays = 48 * 60 * 60 * 1000;
  const byMention = new Map<string, { total: number; x: number; reddit: number; buzz: number }>();
  for (const i of items) {
    const text = `${i.title} ${i.summary || ''}`.toLowerCase();
    for (const m of byKey.values()) {
      const name = m.name.toLowerCase();
      const tokens = name.replace(/[^a-z0-9 .-]/g, '').trim();
      if (tokens.length < 3) continue;
      if (text.includes(tokens)) {
        const rec = byMention.get(m.id) || { total: 0, x: 0, reddit: 0, buzz: 0 };
        rec.total++;
        if (i.source_type === 'twitter') rec.x++;
        if (i.source_type === 'reddit') rec.reddit++;
        if (now - new Date(i.published_at).getTime() < twoDays) rec.buzz++;
        byMention.set(m.id, rec);
      }
    }
  }

  const out = [...byKey.values()];
  for (const m of out) {
    const s = byMention.get(m.id);
    if (s) {
      m.mentions = s.total;
      m.xMentions = s.x;
      m.redditMentions = s.reddit;
      m.buzz = s.buzz;
    }
    // HF downloads enrichment: match name tokens against HF entries by key.
    if (m.source === 'openrouter') {
      const tokens = m.name.toLowerCase().replace(/[^a-z0-9 .-]/g, ' ').split(/\s+/).filter(w => w.length > 3);
      let best: ModelRecord | undefined;
      let bestScore = 0;
      for (const other of byKey.values()) {
        if (other.source !== 'huggingface' || !other.hfDownloads) continue;
        const oid = normalizeKey(other.id);
        let score = 0;
        for (const t of tokens) if (oid.includes(t)) score++;
        if (score > bestScore) {
          bestScore = score;
          best = other;
        }
      }
      if (best) {
        m.hfDownloads = best.hfDownloads;
        m.hfLikes = best.hfLikes;
      }
    }
    if (m.source === 'lmarena' && m.arenaRank !== undefined && m.elo === undefined) {
      m.elo = Math.round(Math.max(0, 1425 - (m.arenaRank - 1) * 2.2));
    }
    // Ollama library order → pull estimate so the Popularity tab ranks them.
    if (m.source === 'ollama' && m.arenaRank !== undefined) {
      m.hfDownloads = Math.max(500, Math.round(8_000_000 / Math.pow(m.arenaRank, 0.95)));
    }
    // LMArena votes double as a popularity signal when downloads are unknown.
    if (m.numVotes && m.hfDownloads === undefined) {
      m.hfDownloads = m.numVotes;
    }
  }

  // Drop empty / near-empty duplicates (e.g. ollama names already covered).
  const richerKeys = new Set(
    [...byKey.values()]
      .filter(m => m.source === 'openrouter' || m.source === 'huggingface')
      .map(m => normalizeKey(m.id))
  );
  const final = out.filter(m => {
    if (m.source === 'ollama') {
      const bare = normalizeKey(m.id.replace('ollama/', ''));
      return !richerKeys.has(bare);
    }
    return true;
  });

  return final
    .sort((a, b) => {
      // Keep any Elo'd leaderboard model ahead of the 600-row cap, otherwise
      // the LMArena data (no intelligence index) gets dumped from the slice.
      const key = (m: ModelRecord) => (m.intelligenceIndex ?? 0) + (m.elo !== undefined ? 1000 : 0);
      return key(b) - key(a);
    })
    .slice(0, 600);
}

export function writeModelDatabase(db: ModelDatabase): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function readModelDatabase(): ModelDatabase | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as ModelDatabase;
  } catch {
    return null;
  }
}

export async function refreshModelDatabase(items: NewsItem[]): Promise<ModelDatabase> {
  const [openrouter, hf, ollama, lmarena, freellm] = await Promise.all([
    scrapeOpenRouter(),
    scrapeHuggingFace(),
    scrapeOllama(),
    scrapeLmarenaRanks(),
    scrapeFreellm(),
  ]);

  const merged = mergeModelData(
    [
      { name: 'openrouter', models: openrouter },
      { name: 'huggingface', models: hf },
      { name: 'ollama', models: ollama },
      { name: 'lmarena', models: lmarena },
      { name: 'freellm', models: freellm },
    ],
    items
  );

  const db: ModelDatabase = {
    updatedAt: new Date().toISOString(),
    sources: ['openrouter', 'huggingface', 'ollama', 'lmarena', 'freellm', 'x', 'reddit'],
    counts: {
      total: merged.length,
      withPricing: merged.filter(m => m.promptPrice !== undefined).length,
      withBenchmarks: merged.filter(m => m.intelligenceIndex !== undefined).length,
      withElo: merged.filter(m => m.elo !== undefined).length,
      openWeights: merged.filter(m => m.family === 'open-weights').length,
    },
    models: merged,
  };
  writeModelDatabase(db);
  return db;
}
