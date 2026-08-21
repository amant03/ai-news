import { NextResponse } from 'next/server';
import { readStatus } from '@/lib/status';
import { hasPg, getAgentRunsPg } from '@/lib/pg';
import { fetchCommittedFile } from '@/lib/github-data';

export async function GET() {
  let status: Record<string, unknown>;

  // On Vercel, prefer the committed status.json from GitHub raw for live health data.
  if (process.env.VERCEL === '1' && process.env.DATA_REPO) {
    const raw = await fetchCommittedFile('data/status.json', 10000);
    try {
      status = raw ? JSON.parse(raw) : (readStatus() as unknown as Record<string, unknown>);
    } catch {
      status = readStatus() as unknown as Record<string, unknown>;
    }
  } else {
    status = readStatus() as unknown as Record<string, unknown>;
  }

  // Attach the latest agent run history when Postgres is available.
  if (hasPg()) {
    try {
      const runs = await getAgentRunsPg(5);
      status.lastRuns = runs;
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json(status);
}