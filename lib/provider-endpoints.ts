import * as fs from 'fs';
import * as path from 'path';
import { readSlimModelDatabase } from './model-registry';
import { canonicalSlug } from './model-slug';

/**
 * Provider comparison refresh (free, no keys).
 *
 * For each top model, OpenRouter's public endpoints API lists every hosting
 * provider with live pricing, context, quantization and feature flags.
 * Writes data/aa-providers.json, served by /models/[slug]/providers.
 */

const DATA_FILE = path.join(process.cwd(), 'data', 'aa-providers.json');

interface OREndpoint {
  provider_name?: string;
  context_length?: number;
  pricing?: { prompt?: string | number; completion?: string | number };
  quantization?: string;
  throughput_last_30m?: number | null;
  latency_last_30m?: number | null;
  supported_parameters?: string[];
}

export interface ProviderRow {
  name: string;
  context: string;
  license: string;
  functionCalling: boolean;
  jsonMode: boolean;
  costPerTask: number | null;
  speed: number | null;
  firstChunk: number | null;
  totalResponse: number | null;
  reasoningTime: number | null;
  blendedPrice: number;
  inputPrice: number;
  outputPrice: number;
}

export interface ProviderEntry {
  name: string;
  provider: string;
  released?: string;
  family?: string;
  blendRatio?: string;
  providers: ProviderRow[];
}

function perMTokens(v: string | number | undefined): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n * 1_000_000 : 0;
}

function fmtContext(n: number | undefined): string {
  if (!n || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(n / 1000)}K`;
}

const finiteOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * Reference workload cost ("cost per task"): 10,000 input + 2,000 output
 * tokens at the provider's live price. Fully determined by real prices —
 * the same workload for every provider, so the column compares fairly.
 */
const TASK_INPUT_TOKENS = 10_000;
const TASK_OUTPUT_TOKENS = 2_000;

function taskCost(inputPerM: number, outputPerM: number): number {
  const v = (inputPerM * TASK_INPUT_TOKENS + outputPerM * TASK_OUTPUT_TOKENS) / 1_000_000;
  return Math.round(v * 10000) / 10000;
}

/** Pure mapping: OpenRouter endpoint → comparison row (unit-tested). */
export function toProviderRow(e: OREndpoint): ProviderRow | null {
  const name = String(e.provider_name || '').trim();
  if (!name) return null;
  const params = Array.isArray(e.supported_parameters) ? e.supported_parameters : [];
  const inputPrice = Math.round(perMTokens(e.pricing?.prompt) * 100) / 100;
  const outputPrice = Math.round(perMTokens(e.pricing?.completion) * 100) / 100;
  return {
    name,
    context: fmtContext(e.context_length),
    license: e.quantization && e.quantization !== 'unknown' ? String(e.quantization) : '—',
    functionCalling: params.includes('tools'),
    jsonMode: params.includes('response_format') || params.includes('structured_outputs'),
    costPerTask: taskCost(inputPrice, outputPrice),
    speed: finiteOrNull(e.throughput_last_30m),
    firstChunk: finiteOrNull(e.latency_last_30m),
    totalResponse: null,
    reasoningTime: null,
    blendedPrice: Math.round(((inputPrice * 3 + outputPrice) / 4) * 100) / 100,
    inputPrice,
    outputPrice,
  };
}

async function fetchEndpoints(orId: string): Promise<OREndpoint[]> {
  const res = await fetch(`https://openrouter.ai/api/v1/models/${orId}/endpoints`, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: { endpoints?: OREndpoint[] } };
  return Array.isArray(data?.data?.endpoints) ? data.data.endpoints : [];
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function refreshProviderComparisons(limit = 80): Promise<number> {
  const slim = readSlimModelDatabase();
  const models = [...(slim?.models || [])]
    .filter(m => m.source === 'openrouter' && m.id.includes('/'))
    .sort((a, b) => (b.intelligenceIndex ?? -1) - (a.intelligenceIndex ?? -1))
    .slice(0, Math.max(1, limit));

  let prev: Record<string, ProviderEntry> = {};
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (raw && typeof raw.models === 'object') prev = raw.models;
    }
  } catch {
    /* start fresh */
  }

  let done = 0;
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    try {
      const endpoints = await fetchEndpoints(m.id);
      const rows = endpoints.map(toProviderRow).filter((r): r is ProviderRow => r !== null);
      if (rows.length > 0) {
        const key = canonicalSlug(m.name);
        prev[key] = {
          name: m.name,
          provider: m.provider,
          released: m.released,
          family: m.family,
          blendRatio: '3:1 (input-output)',
          providers: rows.sort((a, b) => a.blendedPrice - b.blendedPrice),
        };
        done++;
        console.log(`  [${i + 1}/${models.length}] ${m.id}: ${rows.length} providers`);
      } else {
        console.log(`  [${i + 1}/${models.length}] ${m.id}: no endpoints`);
      }
    } catch (err) {
      console.log(`  [${i + 1}/${models.length}] ${m.id}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(300);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'openrouter',
    total: Object.keys(prev).length,
    models: prev,
  };
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
  console.log(`[provider-endpoints] Wrote ${payload.total} model entries (${done} refreshed)`);
  return done;
}
