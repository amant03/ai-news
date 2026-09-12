import * as fs from 'fs';
import * as path from 'path';
import { fetchAAHtml } from './aa-parse';
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
  indexScore?: unknown;
  isUnavailable?: unknown;
  mean?: Record<string, unknown> | null;
  evals?: Array<{
    evaluationDatasetSlug?: unknown;
    mean?: Record<string, unknown> | null;
  }> | null;
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const round = (v: number | null, digits: number): number | null =>
  v === null ? null : Math.round(v * 10 ** digits) / 10 ** digits;

function unescapeFlight(html: string): string {
  const out: string[] = [];
  const re = /self\.__next_f\.push\(\[1,"(.*?)"\]\)<\/script>/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(`"${m[1]}"`));
    } catch {
      /* skip malformed chunk */
    }
  }
  return out.join('');
}

/** Brace-matching extraction of the first `"rows":[...]` array. */
function extractRowsArray(text: string): AARow[] {
  const anchor = '"rows":[';
  const i = text.indexOf(anchor);
  if (i < 0) return [];
  const start = i + anchor.length - 1;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === '[') {
      depth += 1;
    } else if (c === ']') {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(start, j + 1));
          return Array.isArray(parsed) ? (parsed as AARow[]) : [];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

function toAgent(row: AARow): CodingAgent | null {
  if (typeof row.displayLabel !== 'string' || !row.displayLabel) return null;
  const indexScore = num(row.indexScore);
  if (indexScore === null) return null;
  const mean = row.mean && typeof row.mean === 'object' ? row.mean : {};
  const evals = Array.isArray(row.evals) ? row.evals : [];

  return {
    label: row.displayLabel,
    agent: typeof row.agentName === 'string' && row.agentName ? row.agentName : row.displayLabel.split(' - ')[0],
    provider: typeof row.provider === 'string' && row.provider ? row.provider : 'unknown',
    index: round(indexScore * 100, 1) ?? 0,
    cost: round(num(mean.costUsd), 2) ?? 0,
    wallTime: round(num(mean.agentWallTimeSec), 0) ?? 0,
    steps: round(num(mean.steps), 0) ?? 0,
    totalTokens: round(num(mean.totalTokens), 0) ?? 0,
    inputTokens: round(num(mean.inputTokens), 0) ?? 0,
    outputTokens: round(num(mean.outputTokens), 0) ?? 0,
    cacheTokens: round(num(mean.cacheTokens), 0) ?? 0,
    cacheHitRate: round(num(mean.cacheHitRate), 3) ?? 0,
    evals: evals
      .filter(e => e && typeof e.evaluationDatasetSlug === 'string')
      .map(e => {
        const m = e.mean && typeof e.mean === 'object' ? e.mean : {};
        return {
          benchmark: e.evaluationDatasetSlug as string,
          reward: round(num(m.reward), 4) ?? 0,
          inputTokens: round(num(m.inputTokens), 0) ?? 0,
          outputTokens: round(num(m.outputTokens), 0) ?? 0,
        };
      }),
  };
}

/** Pure parse: flight HTML → agent records (unit-tested). */
export function parseCodingRows(html: string): CodingAgent[] {
  const rows = extractRowsArray(unescapeFlight(html));
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
