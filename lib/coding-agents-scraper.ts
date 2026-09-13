import * as fs from 'fs';
import * as path from 'path';
import { fetchAAHtml } from './aa-parse';
import { unescapeFlightPayloads, extractKeyedValue } from './flight';
import type { CodingAgent } from './coding-agents-data';

/**
 * Coding-agents board scraper (free, no keys).
 *
 * Parses the structured `rows` array embedded in Artificial Analysis'
 * Next.js flight payload on /agents/coding-agents — the same index,
 * cost, wall-time, token and per-eval reward figures shown on the
 * /coding-agents page. Writes data/coding-agents.json, refreshed by the
 * 4-hour news agent workflow.
 */

const PAGE_URL = 'https://artificialanalysis.ai/agents/coding-agents';
const DATA_FILE = path.join(process.cwd(), 'data', 'coding-agents.json');

interface AARow {
  displayLabel?: unknown;
  agentName?: unknown;
  provider?: unknown;
  display?: {
    agent?: unknown;
    model?: unknown;
    creator?: { agent?: unknown; model?: unknown } | null;
  } | null;
  hostModelSlug?: unknown;
  isHighlighted?: unknown;
  isUnavailable?: unknown;
  indexScore?: unknown;
  mean?: Record<string, unknown> | null;
  sums?: Record<string, unknown> | null;
  percentiles?: Record<string, Record<string, unknown>> | null;
  versions?: Record<string, { min?: { version?: unknown; dateReleased?: unknown } }> | null;
  safety?: Record<string, unknown> | null;
  evals?: Array<{
    evaluationDatasetSlug?: unknown;
    datasetIndexName?: unknown;
    weight?: unknown;
    mean?: Record<string, unknown> | null;
  }> | null;
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const round = (v: number | null, digits: number): number | null =>
  v === null ? null : Math.round(v * 10 ** digits) / 10 ** digits;

/** Pure parse: flight HTML → agent records (unit-tested). */
export function parseCodingRows(html: string): CodingAgent[] {
  const rows = extractKeyedValue<AARow[]>(unescapeFlightPayloads(html), 'rows') ?? [];
  const out: CodingAgent[] = [];
  for (const row of rows) {
    try {
      const agent = toAgent(row);
      if (agent) out.push(agent);
    } catch {
      /* skip malformed row */
    }
  }
  return out;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

function toPercentiles(v: unknown): CodingAgent['costPercentiles'] {
  if (!v || typeof v !== 'object') return undefined;
  const m = v as Record<string, unknown>;
  const p = {
    p05: num(m.p05),
    p25: num(m.p25),
    p50: num(m.p50),
    p75: num(m.p75),
    p95: num(m.p95),
  };
  if (Object.values(p).some(x => x === null)) return undefined;
  return p as CodingAgent['costPercentiles'];
}

function toAgent(row: AARow): CodingAgent | null {
  if (typeof row.displayLabel !== 'string' || !row.displayLabel) return null;
  const indexScore = num(row.indexScore);
  if (indexScore === null) return null;
  const mean = row.mean && typeof row.mean === 'object' ? row.mean : {};
  const sums = row.sums && typeof row.sums === 'object' ? row.sums : {};
  const _evals = Array.isArray(row.evals) ? row.evals : [];
  const versions = row.versions && typeof row.versions === 'object' ? row.versions : {};
  const safety = row.safety && typeof row.safety === 'object' ? row.safety : {};

  const harnessVersions: Record<string, { version: string; dateReleased: string }> = {};
  for (const [k, v] of Object.entries(versions)) {
    const ver = str(v?.min?.version);
    const date = str(v?.min?.dateReleased);
    if (ver || date) harnessVersions[k] = { version: ver ?? '', dateReleased: date ?? '' };
  }

  const agent: CodingAgent = {
    label: row.displayLabel,
    agent: str(row.agentName) ?? row.displayLabel.split(' - ')[0],
    provider: str(row.provider) ?? 'unknown',
    model: str(row.display?.model),
    creator: str(row.display?.creator?.agent),
    hostModelSlug: str(row.hostModelSlug),
    isHighlighted: row.isHighlighted === true ? true : undefined,
    index: round(indexScore * 100, 1) ?? 0,
    cost: round(num(mean.costUsd), 2) ?? 0,
    wallTime: round(num(mean.agentWallTimeSec), 0) ?? 0,
    steps: round(num(mean.steps), 0) ?? 0,
    totalTokens: round(num(mean.totalTokens), 0) ?? 0,
    inputTokens: round(num(mean.inputTokens), 0) ?? 0,
    outputTokens: round(num(mean.outputTokens), 0) ?? 0,
    cacheTokens: round(num(mean.cacheTokens), 0) ?? 0,
    cacheHitRate: round(num(mean.cacheHitRate), 3) ?? 0,
    evals: _evals
      .filter(e => e && typeof e.evaluationDatasetSlug === 'string')
      .map(e => {
        const m = e.mean && typeof e.mean === 'object' ? e.mean : {};
        return {
          benchmark: e.evaluationDatasetSlug as string,
          datasetIndexName: str(e.datasetIndexName),
          weight: num(e.weight) ?? undefined,
          reward: round(num(m.reward), 4) ?? 0,
          inputTokens: round(num(m.inputTokens), 0) ?? 0,
          cacheWriteTokens: round(num(m.cacheWriteTokens), 0) ?? undefined,
          outputTokens: round(num(m.outputTokens), 0) ?? 0,
        };
      }),
  };

  const cacheWrite = round(num(mean.cacheWriteTokens), 0);
  if (cacheWrite !== null) agent.cacheWriteTokens = cacheWrite;
  const totalCost = round(num(sums.costUsd), 2);
  if (totalCost !== null) agent.totalCostUsd = totalCost;
  const cp = toPercentiles(row.percentiles?.costUsd);
  if (cp) agent.costPercentiles = cp;
  const tp = toPercentiles(row.percentiles?.totalTokens);
  if (tp) agent.tokenPercentiles = tp;
  if (Object.keys(harnessVersions).length > 0) agent.harnessVersions = harnessVersions;
  if (num(safety.attemptCount) !== null) {
    agent.safety = {
      attempts: num(safety.attemptCount) ?? 0,
      refused: num(safety.refusedAttemptCount) ?? 0,
      hardStop: num(safety.hardStopAttemptCount) ?? 0,
      recovered: num(safety.recoveredAttemptCount) ?? 0,
      fallback: num(safety.fallbackAttemptCount) ?? 0,
      continued: num(safety.continuedAttemptCount) ?? 0,
      rate: num(safety.rate) ?? 0,
    };
  }
  return agent;
}

export async function scrapeCodingAgents(): Promise<number> {
  const html = await fetchAAHtml(PAGE_URL);
  const agents = parseCodingRows(html);
  if (agents.length === 0) {
    console.log('   [coding-agents] No rows parsed — keeping existing data file');
    return 0;
  }
  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'artificialanalysis.ai/agents/coding-agents',
    total: agents.length,
    models: agents,
  };
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_FILE);
  console.log(`   [coding-agents] Wrote ${agents.length} agents`);
  return agents.length;
}
