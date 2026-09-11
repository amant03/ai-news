import { NextResponse } from 'next/server';
import { readStatus } from '@/lib/status';
import { hasPg, getAgentRunsPg } from '@/lib/pg';
import { readStore } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface ChangelogRun {
  ranAt: string | null;
  environment?: string | null;
  status?: string | null;
  inserted?: number | null;
  totalAfter?: number | null;
  sources?: { total: number };
}

/**
 * Ops history behind /changelog and the homepage "since yesterday" delta.
 * Postgres when available, otherwise the local status snapshot + file meta.
 */
export async function GET() {
  const status = readStatus();
  let runs: ChangelogRun[] = [];

  if (hasPg()) {
    try {
      const rows = await getAgentRunsPg(30);
      runs = rows.map(r => {
        const counts = (r.source_counts || {}) as Record<string, number>;
        return {
          ranAt: r.ran_at ?? null,
          environment: r.environment,
          status: r.status,
          inserted: r.inserted ?? null,
          totalAfter: r.total_after ?? null,
          sources: { total: Object.keys(counts).length },
        };
      });
    } catch {
      /* best-effort */
    }
  }

  let storyTotal: number | null = null;
  try {
    storyTotal = readStore().items?.length ?? null;
  } catch {
    /* ignore */
  }

  const sourceEntries = Object.values(status.sources || {});
  const summary = {
    lastRun: status.lastRun || status.lastSuccess || null,
    nextRun: status.nextRun || null,
    sourcesOk: sourceEntries.filter(s => s.ok).length,
    sourcesTotal: sourceEntries.length,
    storyTotal,
    hasHistory: runs.length > 0,
  };

  // "Since yesterday" delta from the two most recent runs, when history exists.
  let delta: { newStories: number | null; since: string | null } = { newStories: null, since: null };
  if (runs.length >= 1 && runs[0].inserted != null) {
    delta = { newStories: runs[0].inserted, since: runs[0].ranAt };
  }

  return NextResponse.json({ runs, summary, delta });
}
