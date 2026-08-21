import { NextResponse } from 'next/server';
import { readStatus } from '@/lib/status';
import { fetchCommittedFile } from '@/lib/github-data';

// Vercel Cron safety net. The real 4-hour refresh runs in GitHub Actions
// (runs the agent and commits fresh data/news.json). This endpoint does NOT
// run the agent — the full fetch takes ~3 minutes, far beyond Vercel's
// free-plan serverless timeout. It just reports data freshness.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // On serverless, read the committed status.json so freshness reflects the
  // latest agent run rather than the deploy-time snapshot.
  let status = readStatus();
  if (process.env.VERCEL === '1' && process.env.DATA_REPO) {
    const raw = await fetchCommittedFile('data/status.json', 10000);
    if (raw) {
      try { status = JSON.parse(raw); } catch { /* keep local */ }
    }
  }

  const lastRun = status.lastRun || status.lastSuccess || null;
  const ageMs = lastRun ? Date.now() - new Date(lastRun).getTime() : null;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    lastRun,
    ageMinutes: ageMs !== null ? Math.round(ageMs / 60000) : null,
    totalItems: status.totalItems || 0,
    note: 'Data refresh is handled by the GitHub Actions workflow (every 4h).',
  });
}
