'use client';

import { useEffect, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';
import { providerColor } from '@/lib/models';

function blended(m: ModelRecord): number | null {
  if (m.promptPrice == null && m.completionPrice == null) return null;
  const cache = (m.promptPrice ?? 0) * 0.1;
  return (cache * 7 + (m.promptPrice ?? 0) * 2 + (m.completionPrice ?? 0) * 1) / 10;
}

function taskCost(m: ModelRecord): number | null {
  if (m.aaCostPerTask != null) return m.aaCostPerTask;
  return blended(m);
}

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface MiniRow {
  id: string;
  label: string;
  value: number;
  display: string;
  color: string;
}

function MiniBars({ items }: { items: MiniRow[] }) {
  const max = Math.max(...items.map(i => i.value), 1e-9);
  return (
    <div className="mt-4 space-y-2">
      {items.map(it => (
        <a
          key={it.id}
          href={`/models/${slugOf(it.label)}`}
          className="group/row flex items-center gap-2"
          title={it.label}
        >
          <span className="dot" style={{ backgroundColor: it.color }} />
          <span className="flex-1 min-w-0 truncate text-[13px] text-[var(--mut)] group-hover/row:text-[var(--fore)] transition-colors">
            {it.label}
          </span>
          <span className="hidden sm:block h-1.5 w-20 shrink-0 rounded-full bg-[var(--input)] overflow-hidden" aria-hidden>
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(4, (it.value / max) * 100)}%`, background: it.color }}
            />
          </span>
          <span className="w-[72px] shrink-0 text-right text-[13px] font-medium tabular-nums text-[var(--fore)]">
            {it.display}
          </span>
        </a>
      ))}
    </div>
  );
}

function HighlightCard({
  title,
  metric,
  better,
  up,
  rows,
}: {
  title: string;
  metric: string;
  better: string;
  up: boolean;
  rows: MiniRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="border border-[var(--color-line)] rounded-lg p-5 panel-hover">
      <h3 className="font-display text-xl font-medium tracking-tight text-[var(--fore)]">{title}</h3>
      <p className="text-[13px] text-[var(--mut)] mt-1">
        {metric} · <span className={up ? 'note-up' : 'note-down'}>{better}</span>
      </p>
      <MiniBars items={rows} />
    </div>
  );
}

/**
 * Artificial Analysis-style Highlights: top-5 horizontal bar charts for
 * Intelligence / Speed / Cost per Task, derived live from the model catalog.
 */
export default function HighlightsStrip() {
  const [models, setModels] = useState<ModelRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/models?sort=intelligence&limit=100')
      .then(r => r.json())
      .then(d => {
        if (mounted) setModels(d.models || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (models.length === 0) return null;

  const toRow = (m: ModelRecord, value: number, display: string): MiniRow => ({
    id: m.id,
    label: m.name,
    value,
    display,
    color: providerColor(m.provider),
  });

  const intelRows = [...models]
    .filter(m => m.intelligenceIndex != null)
    .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))
    .slice(0, 5)
    .map(m => toRow(m, m.intelligenceIndex ?? 0, String(Math.round(m.intelligenceIndex ?? 0))));

  const speedRows = [...models]
    .filter(m => m.aaSpeed != null)
    .sort((a, b) => (b.aaSpeed ?? 0) - (a.aaSpeed ?? 0))
    .slice(0, 5)
    .map(m => toRow(m, m.aaSpeed ?? 0, `${Math.round(m.aaSpeed ?? 0)} t/s`));

  const costRows = models
    .map(m => ({ m, c: taskCost(m) }))
    .filter((x): x is { m: ModelRecord; c: number } => x.c != null)
    .sort((a, b) => a.c - b.c)
    .slice(0, 5)
    .map(({ m, c }) =>
      toRow(m, c, c === 0 ? '$0.00' : c < 0.01 ? `$${c.toFixed(4)}` : `$${c.toFixed(2)}`)
    );

  return (
    <section aria-label="Highlights" className="mb-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HighlightCard
          title="Intelligence"
          metric="Intelligence Index"
          better="Higher is better"
          up
          rows={intelRows}
        />
        <HighlightCard
          title="Speed"
          metric="Output tokens per second"
          better="Higher is better"
          up
          rows={speedRows}
        />
        <HighlightCard
          title="Cost per Task"
          metric="Weighted average cost (USD)"
          better="Lower is better"
          up={false}
          rows={costRows}
        />
      </div>
    </section>
  );
}
