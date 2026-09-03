import { NextResponse } from 'next/server';
import { readStatus, AgentStatus } from '@/lib/status';
import { fetchCommittedFile, dispatchWorkflow } from '@/lib/github-data';

// Vercel Hobby cron: once a day. It only *pokes* GitHub Actions (free minutes).
// Never run the agent inline here — that exceeds Hobby's 60s cap and emails
// a timeout. The 4-hour fetch lives in .github/workflows/agent.yml.
export const maxDuration = 15;
export const dynamic = 'force-dynamic';

const MIN_RUN_INTERVAL_MS = 3 * 60 * 60 * 1000;

async function committedStatus(): Promise<AgentStatus | null> {
  const raw = await fetchCommittedFile('data/status.json', 15000);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgentStatus;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = process.env.VERCEL === '1' ? ((await committedStatus()) ?? readStatus()) : readStatus();
  const lastRun = status.lastRun || status.lastSuccess || null;
  const ageMinutes = lastRun ? Math.round((Date.now() - new Date(lastRun).getTime()) / 60000) : null;
  if (lastRun && ageMinutes !== null && ageMinutes < MIN_RUN_INTERVAL_MS / 60000) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: `Last successful run was ${ageMinutes} minutes ago (< ${MIN_RUN_INTERVAL_MS / 3600000}h)`,
      lastRun,
      ageMinutes,
      totalItems: status.totalItems || 0,
    });
  }

  const dispatched = await dispatchWorkflow('agent.yml');
  // Always 200 so a missing PAT / Actions-write scope does not page you.
  // The scheduled GitHub Actions workflow is the real daily/4h updater.
  return NextResponse.json({
    success: dispatched.ok,
    skipped: false,
    triggered: dispatched.ok ? 'github-actions' : 'none',
    dispatchError: dispatched.ok ? undefined : dispatched.error,
    lastRun,
    ageMinutes,
    timestamp: new Date().toISOString(),
  });
}
