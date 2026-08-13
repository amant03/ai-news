'use client';

import { useEffect, useState } from 'react';
import { sourceHomepage, sourceLabel } from '@/lib/types';

interface SourceHealth {
  ok: boolean;
  lastSuccess?: string;
  lastAttempt?: string;
  count: number;
  error?: string;
}

interface StatusData {
  lastRun?: string;
  lastSuccess?: string;
  totalItems?: number;
  insertedLastRun?: number;
  environment?: string;
  sources?: Record<string, SourceHealth>;
}

export default function SourcePanel() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (mounted) setStatus(data);
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

  const sources = status?.sources || {};
  const entries = Object.entries(sources).sort((a, b) => Number(b[1].ok) - Number(a[1].ok));
  const okCount = entries.filter(([, s]) => s.ok).length;
  const maxCount = Math.max(1, ...entries.map(([, s]) => s.count));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-medium text-sm uppercase tracking-widest text-[var(--fore)]">
          Sources
        </h3>
        <span
          className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${
            loading ? 'text-[var(--dim)]' : status?.environment === 'ci' ? 'text-cyan-300' : 'text-emerald-300'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status?.environment === 'ci' ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
          {status?.environment === 'ci' ? 'cloud' : 'local'}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-7 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--mut)]">No agent runs recorded yet. The agent fetches every 4 hours.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {entries.map(([key, s]) => {
              const pct = Math.round((s.count / maxCount) * 100);
              const href = sourceHomepage(key);
              return (
                <li key={key} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.ok ? 'bg-emerald-400' : 'bg-rose-500/80'}`}
                      title={s.error || ''}
                    />
                    <span className="text-[var(--mut)] capitalize flex-1 truncate">{sourceLabel(key)}</span>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${sourceLabel(key)}`}
                        className="ring-focus text-[var(--dim)] hover:text-cyan-300"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    <span className="font-mono text-[10px] text-[var(--dim)] tabular-nums">{s.count}</span>
                  </div>
                  <div className="mt-1 ml-3.5 h-1 rounded-full bg-[var(--color-line)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${s.ok ? 'bg-emerald-400/50' : 'bg-rose-500/40'}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 pt-3 border-t border-[var(--color-line)]">
            <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider">
              {okCount}/{entries.length} channels online
            </div>
          </div>
        </>
      )}

      {status?.lastRun && (
        <div className="mt-3 pt-3 border-t border-[var(--color-line)]">
          <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider">last agent run</div>
          <div className="font-mono text-xs text-cyan-300">{new Date(status.lastRun).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}