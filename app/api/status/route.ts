import { NextResponse } from 'next/server';
import { readStatus } from '@/lib/status';
import { hasPg, getAgentRunsPg } from '@/lib/pg';

const DATA_REPO = process.env.DATA_REPO;
const DATA_BRANCH = process.env.DATA_BRANCH || 'main';

export async function GET() {
  let status: Record<string, unknown>;

  // On Vercel, prefer the committed status.json from GitHub raw for live health data.
  if (process.env.VERCEL === '1' && DATA_REPO) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${DATA_REPO}/${DATA_BRANCH}/data/status.json`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        status = await res.json();
      } else {
        status = readStatus() as unknown as Record<string, unknown>;
      }
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