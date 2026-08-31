import { NextResponse } from 'next/server';
import fs from 'fs';
import { runAgent } from '@/lib/agent';
import { readStatus, AgentStatus } from '@/lib/status';
import { fetchCommittedFile, commitFilesToRepo, dispatchWorkflow, RepoFile } from '@/lib/github-data';
import { dataFile } from '@/lib/storage';

// Vercel Cron (Hobby: once a day) is the guaranteed free fallback.
// Preferred path: dispatch the GitHub Actions news workflow (free minutes,
// writable git, ~5 min). Inline path: run a slim agent here and commit
// news.json back — must finish inside Hobby's 60s fluid-compute cap.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MIN_RUN_INTERVAL_MS = 3 * 60 * 60 * 1000; // don't re-fetch within 3h

async function committedStatus(): Promise<AgentStatus | null> {
  const raw = await fetchCommittedFile('data/status.json', 10000);
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

  // Freshness guard: skip if GH Actions (or a previous cron) already fetched recently.
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

  // Fast path: kick GitHub Actions (the job that actually commits to main).
  const dispatched = await dispatchWorkflow('agent.yml');
  if (dispatched.ok) {
    return NextResponse.json({
      success: true,
      skipped: false,
      triggered: 'github-actions',
      lastRun,
      ageMinutes,
      timestamp: new Date().toISOString(),
    });
  }
  console.warn(`[cron] workflow dispatch failed (${dispatched.error}); falling back to inline agent`);

  let result;
  try {
    result = await runAgent({
      skipOllama: true,
      excludeSources: ['twitter'],
      skipModelRefresh: true,
      skipImageEnrichment: true,
    });
  } catch (error) {
    console.error('Cron agent run failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        dispatchError: dispatched.error,
      },
      { status: 500 }
    );
  }

  // Commit the refreshed snapshot back to the repo (news + run status only —
  // never models.json, which is ~96MB and over GitHub's comfort limit).
  let commit: { ok: boolean; error?: string; commitSha?: string } | null = null;
  try {
    const files: RepoFile[] = [];
    for (const name of ['news.json', 'status.json']) {
      const file = dataFile(name);
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.trim()) files.push({ path: `data/${name}`, content });
      }
    }
    commit = await commitFilesToRepo(files, `chore: refresh AI news ${new Date().toISOString()} (vercel cron)`);
  } catch (error) {
    commit = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (!commit?.ok) {
    console.error(`[cron] commit-back failed: ${commit?.error} — site reads committed files until the next Actions run`);
  }

  return NextResponse.json({
    success: true,
    skipped: false,
    triggered: 'inline',
    inserted: result.inserted,
    known: result.known,
    totalAfter: result.totalAfter,
    durationMs: result.durationMs,
    sourceCounts: result.sourceCounts,
    committedBackToRepo: commit?.ok === true,
    commitError: commit?.ok ? undefined : commit?.error,
    dispatchError: dispatched.error,
    timestamp: new Date().toISOString(),
  });
}
