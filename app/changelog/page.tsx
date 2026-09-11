import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { SITE_NAME } from '@/lib/site';
import { readStatus } from '@/lib/status';
import { hasPg, getAgentRunsPg } from '@/lib/pg';
import { readStore } from '@/lib/db';
import type { ChangelogRun } from '@/app/api/changelog/route';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Changelog · ${SITE_NAME}`,
  description: 'Every autonomous refresh of AI Pulse: when it ran, source health, and how many stories were added.',
};

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function getRuns(): Promise<ChangelogRun[]> {
  if (!hasPg()) return [];
  try {
    const rows = await getAgentRunsPg(30);
    return rows.map(r => {
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
    return [];
  }
}

export default async function ChangelogPage() {
  const runs = await getRuns();
  const status = readStatus();
  let storyTotal: number | null = null;
  try {
    storyTotal = readStore().items?.length ?? null;
  } catch { /* ignore */ }
  const sourceEntries = Object.entries(status.sources || {});
  const okCount = sourceEntries.filter(([, s]) => s.ok).length;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-[900px] px-5 pb-16 pt-8">
        <p className="section-label">Transparency</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">Changelog</h1>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[var(--mut)]">
          AI Pulse refreshes itself every 4 hours with no editors. This is the receipts page:
          every pipeline run, source health, and how many stories it added.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs tabular-nums">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gray-100)] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Last run {fmtDateTime(status.lastRun || status.lastSuccess)}
          </span>
          <span className="inline-flex items-center rounded-full bg-[var(--gray-100)] px-3 py-1">
            {okCount}/{sourceEntries.length} sources healthy
          </span>
          {storyTotal !== null && (
            <span className="inline-flex items-center rounded-full bg-[var(--gray-100)] px-3 py-1">
              {storyTotal.toLocaleString('en-US')} stories tracked
            </span>
          )}
        </div>

        {runs.length === 0 ? (
          <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] p-6 text-sm leading-relaxed text-[var(--mut)]">
            <p className="font-medium text-[var(--foreground)]">Full run history lives in Postgres.</p>
            <p className="mt-1">
              This deployment has no <code className="font-mono text-[13px]">DATABASE_URL</code> configured,
              so per-run history isn&apos;t retained here. Current pipeline status above is live.
              Set <code className="font-mono text-[13px]">DATABASE_URL</code> to keep the last 30 runs on this page.
            </p>
            {sourceEntries.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {sourceEntries.map(([name, s]) => (
                  <li key={name} className="flex items-center gap-2 text-[13px]">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.ok ? 'bg-green-500' : 'bg-[var(--bad)]'}`} />
                    <span className="font-medium">{name}</span>
                    <span className="tabular-nums text-[var(--dim)]">
                      {s.count} items{s.ok ? '' : ` · ${s.error || 'error'}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <ol className="mt-8 space-y-3">
            {runs.map((r, i) => (
              <li key={`${r.ranAt}-${i}`} className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--card)] p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${r.status === 'ok' ? 'bg-green-500' : 'bg-[var(--bad)]'}`} />
                  <span className="font-semibold tabular-nums">{fmtDateTime(r.ranAt)}</span>
                  {r.environment && (
                    <span className="rounded-full bg-[var(--gray-100)] px-2 py-0.5 text-[11px] text-[var(--mut)]">
                      {r.environment}
                    </span>
                  )}
                  <span className="ml-auto text-[12px] tabular-nums text-[var(--mut)]">
                    {r.inserted !== null && r.inserted !== undefined ? `+${r.inserted} stories` : ''}
                    {r.totalAfter != null ? ` · ${r.totalAfter.toLocaleString('en-US')} total` : ''}
                  </span>
                </div>
                {r.sources && (
                  <p className="mt-1 text-[12px] tabular-nums text-[var(--mut)]">
                    {r.sources.total} sources reported
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}

        <p className="mt-8 text-sm">
          <Link href="/" className="font-medium text-[var(--accent-hover)] hover:underline">
            ← Back to the newswire
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
