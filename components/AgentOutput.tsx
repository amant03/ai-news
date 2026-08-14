'use client';

import { useEffect, useState } from 'react';
import { sourceLabel } from '@/lib/types';

interface AgentRun {
  id: number;
  ran_at: string;
  environment: string | null;
  duration_ms: number | null;
  inserted: number | null;
  known: number | null;
  pruned: number | null;
  total_after: number | null;
  source_counts: Record<string, number> | null;
  log_tail: string | null;
  status: string | null;
}

const SOURCE_COLOR: Record<string, string> = {
  twitter: 'text-cyan-300',
  rss: 'text-emerald-300',
  'google-news': 'text-green-300',
  hackernews: 'text-orange-300',
  reddit: 'text-red-300',
  arxiv: 'text-rose-300',
  youtube: 'text-red-400',
  github: 'text-slate-300',
  web: 'text-violet-300',
};

function fmtDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function AgentOutput() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [backend, setBackend] = useState<string>('json');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/agent-runs?limit=8');
        const data = await res.json();
        if (mounted) {
          setRuns(data.runs || []);
          setBackend(data.backend || 'json');
        }
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const totalSources = new Set<string>();
  for (const r of runs) if (r.source_counts) Object.keys(r.source_counts).forEach(k => totalSources.add(k));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-medium text-sm uppercase tracking-widest text-[var(--fore)]">
          Agent output
        </h3>
        <span
          className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${
            backend === 'pg' ? 'text-cyan-300' : 'text-[var(--dim)]'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${backend === 'pg' ? 'bg-cyan-400' : 'bg-[var(--dim)]'}`} />
          {backend === 'pg' ? 'postgres' : 'no runs yet'}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <p className="text-sm text-[var(--mut)]">
          No agent runs recorded yet. Run{' '}
          <code className="text-cyan-300 text-xs">npm run agent</code> to populate the Postgres history.
        </p>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
          {runs.map(run => (
            <div key={run.id} className="rounded-xl border border-[var(--color-line)] bg-[#0a0e1a]/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${run.status === 'ok' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span className="font-mono text-[11px] text-cyan-300 truncate">{fmtTime(run.ran_at)}</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--dim)] tabular-nums flex-shrink-0">
                  {run.environment === 'ci' ? 'cloud' : 'local'} · {fmtDuration(run.duration_ms)}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {[
                  ['new', run.inserted, 'text-emerald-300'],
                  ['known', run.known, 'text-[var(--mut)]'],
                  ['total', run.total_after, 'text-[var(--fore)]'],
                  ['pruned', run.pruned, 'text-rose-300'],
                ].map(([label, val, color]) => (
                  <div key={label as string} className="rounded-lg bg-black/30 py-1.5">
                    <div className={`font-mono text-sm ${color}`}>{val ?? '—'}</div>
                    <div className="text-[9px] uppercase tracking-wider text-[var(--dim)]">{label}</div>
                  </div>
                ))}
              </div>

              {run.source_counts && Object.keys(run.source_counts).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(run.source_counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([src, n]) => (
                      <span key={src} className="inline-flex items-center gap-1 rounded-full bg-black/30 border border-[var(--color-line)] px-2 py-0.5">
                        <span className={`font-mono text-[10px] ${SOURCE_COLOR[src] || 'text-[var(--mut)]'}`}>
                          {sourceLabel(src)}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--dim)]">{n}</span>
                      </span>
                    ))}
                </div>
              )}

              {run.log_tail && (
                <button
                  onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                  className="ring-focus mt-2 text-[10px] text-[var(--dim)] hover:text-cyan-300 transition-colors"
                >
                  {expanded === run.id ? '− hide log' : '+ show log'}
                </button>
              )}
              {expanded === run.id && run.log_tail && (
                <pre className="mt-2 text-[10px] leading-relaxed text-[var(--mut)] whitespace-pre-wrap break-words font-mono bg-black/40 rounded-lg p-2">
                  {run.log_tail}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[var(--color-line)]">
        <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider">
          {totalSources.size} source types across runs · full history in Postgres
        </div>
      </div>
    </div>
  );
}
