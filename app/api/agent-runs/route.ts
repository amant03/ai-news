import { NextResponse } from 'next/server';
import { getAgentRunsPg, hasPg } from '@/lib/pg';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '8', 10), 1), 50);

    // Postgres holds the full agent run history.
    if (hasPg()) {
      const runs = await getAgentRunsPg(limit);
      return NextResponse.json({ runs, backend: 'pg' });
    }

    // Fallback: no runs recorded in Postgres yet.
    return NextResponse.json({ runs: [], backend: 'json' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load agent runs', runs: [] }, { status: 500 });
  }
}