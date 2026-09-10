'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';

const isOpen = (m: ModelRecord) => m.family === 'open-weights' || m.family === 'open';
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

type Openness = 'all' | 'open' | 'closed';

/**
 * "Latest Models" — newest releases sorted by release date with an
 * open-source / closed-source filter. Mirrors the AA "latest releases" view.
 */
export default function LatestModels() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [openness, setOpenness] = useState<Openness>('all');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch('/api/models?sort=newest&limit=120')
        .then(r => r.json())
        .then(d => {
          if (!mounted) return;
          setModels(d.models || []);
          setUpdatedAt(d.catalog?.updatedAt || d.updatedAt || null);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 180000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const visible = useMemo(() => {
    if (openness === 'all') return models.slice(0, 12);
    const filtered = models.filter(m => (openness === 'open' ? isOpen(m) : !isOpen(m)));
    return filtered.slice(0, 12);
  }, [models, openness]);

  if (models.length === 0) return null;

  return (
    <section className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] p-5 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display font-semibold text-lg sm:text-xl tracking-tight text-[var(--fore)]">Latest Models</h2>
          <p className="text-[12px] text-[var(--mut)] mt-1">Newest model releases, sorted by release date.</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([['all', 'All'], ['open', 'Open Source'], ['closed', 'Closed Source']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setOpenness(key)}
              className={`ring-focus rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                openness === key
                  ? 'bg-[var(--fore)] text-[var(--background)]'
                  : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map(m => (
          <a
            key={m.id}
            href={`/models/${slugOf(m.name)}`}
            className="border border-[var(--color-line)] rounded-lg p-4 hover:border-[var(--accent)]/40 transition-colors block"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-[14px] truncate text-[var(--fore)]">{m.name}</div>
                <div className="text-[11px] text-[var(--mut)] mt-0.5">{m.provider}</div>
              </div>
              <span className={`flex-shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full border ${
                isOpen(m) ? 'border-[var(--ok)]/30 text-[var(--ok)]' : 'border-[var(--bad)]/30 text-[var(--bad)]'
              }`}>
                {isOpen(m) ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--dim)]">
              <span>{m.released ? new Date(m.released).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
              <span className="tabular-nums font-medium text-[var(--mut)]">
                {m.intelligenceIndex != null ? `Intelligence ${m.intelligenceIndex}` : m.context ? `Context ${m.context}` : ''}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}