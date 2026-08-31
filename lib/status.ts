import fs from 'fs';
import path from 'path';
import { dataDir } from './storage';

const DATA_DIR = dataDir();
const STATUS_FILE = path.join(DATA_DIR, 'status.json');

export interface SourceStatus {
  ok: boolean;
  lastSuccess?: string;
  lastAttempt?: string;
  count: number;
  error?: string;
}

export interface AgentStatus {
  lastRun?: string;
  lastSuccess?: string;
  nextRun?: string;
  totalItems?: number;
  insertedLastRun?: number;
  environment?: string;
  sources: Record<string, SourceStatus>;
}

const DEFAULT_STATUS: AgentStatus = { sources: {} };

export function readStatus(): AgentStatus {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const raw = fs.readFileSync(STATUS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATUS, ...parsed, sources: parsed.sources || {} };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_STATUS };
}

export function writeStatus(status: AgentStatus) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2), 'utf-8');
  } catch {
    /* ignore */
  }
}

export function recordSourceResult(status: AgentStatus, key: string, ok: boolean, count: number, error?: string) {
  const existing = status.sources[key] || { ok: true, count: 0 };
  status.sources[key] = {
    ok,
    count,
    lastAttempt: new Date().toISOString(),
    lastSuccess: ok ? new Date().toISOString() : existing.lastSuccess,
    error: ok ? undefined : error,
  };
}
