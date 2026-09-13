'use client';

import { useEffect, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';

interface WidgetModel {
  id: string;
  name: string;
  provider: string;
  intelligenceIndex?: number;
  promptPrice?: number;
  completionPrice?: number;
  aaSpeed?: number;
}

/**
 * Compact models widget for the news-first homepage: top 10 by
 * intelligence in one glance, full boards one click away.
 */
export default function ModelsWidget() {
  const [models, setModels] = useState<WidgetModel[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/models?sort=intelligence&limit=10')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!mounted) return;
        const list: ModelRecord[] = d?.models || d?.leaderboard || [];
        setModels(list.slice(0, 10));
        if (typeof d?.updatedAt === 'string') setUpdatedAt(d.updatedAt);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section aria-label="Top models widget" className="rounded-2xl border border-[var(--color-line)] bg-[var(--card)] p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-semibold tracking-tight">Top models</h2>
        <div className="flex gap-3 text-[12px] font-medium">
          <a href="/leaderboards" className="text-[var(--accent)] hover:underline">Leaderboard →</a>
          <a href="/models" className="text-[var(--mut)] hover:text-[var(--fore)]">All models →</a>
        </div>
      </div>
      {models.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-8 rounded-lg" />
          ))}
        </div>
      ) : (
        <ol className="divide-y divide-[var(--color-line)]">
          {models.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2.5 py-2">
              <span className="w-5 shrink-0 text-center font-mono text-[11px] tabular-nums text-[var(--dim)]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{m.name}</div>
                <div className="text-[11px] text-[var(--dim)]">{m.provider}</div>
              </div>
              <div className="shrink-0 text-right font-mono text-[12px] tabular-nums">
                <span className="font-semibold text-[var(--cyan)]">{m.intelligenceIndex ?? '—'}</span>
                {m.aaSpeed != null && <span className="ml-2 text-[var(--dim)]">{Math.round(m.aaSpeed)} t/s</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {updatedAt && (
        <p className="mt-2 text-[10px] tabular-nums text-[var(--dim)]">
          Updated {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      )}
    </section>
  );
}
