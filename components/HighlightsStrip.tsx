'use client';

import { useEffect, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';

function blended(m: ModelRecord): number | null {
  if (m.promptPrice == null && m.completionPrice == null) return null;
  const cache = (m.promptPrice ?? 0) * 0.1;
  return (cache * 7 + (m.promptPrice ?? 0) * 2 + (m.completionPrice ?? 0) * 1) / 10;
}

function HighlightCard({
  title,
  metric,
  better,
  up,
  value,
  model,
}: {
  title: string;
  metric: string;
  better: string;
  up: boolean;
  value: string;
  model: string;
}) {
  return (
    <a href="/models" className="border border-[var(--color-line)] rounded-lg p-5 panel-hover block">
      <h3 className="font-display text-xl font-medium tracking-tight text-[var(--fore)]">{title}</h3>
      <p className="text-[13px] text-[var(--mut)] mt-1">
        {metric} · <span className={up ? 'note-up' : 'note-down'}>{better}</span>
      </p>
      <p className="mt-4 text-[32px] leading-none font-medium tabular-nums text-[var(--fore)]">{value}</p>
      <p className="mt-1.5 text-sm text-[var(--mut)] truncate">{model}</p>
    </a>
  );
}

/**
 * Artificial Analysis-style Highlights: Intelligence / Speed / Cost per Task
 * with "Higher/Lower is better" notes, derived live from the model catalog.
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

  const smart = [...models]
    .filter(m => m.intelligenceIndex != null)
    .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))[0];
  const fast = [...models]
    .filter(m => m.aaSpeed != null)
    .sort((a, b) => (b.aaSpeed ?? 0) - (a.aaSpeed ?? 0))[0];
  const cheap = models
    .map(m => ({ m, c: m.aaCostPerTask ?? blended(m) }))
    .filter((x): x is { m: ModelRecord; c: number } => x.c != null)
    .sort((a, b) => a.c - b.c)[0];

  return (
    <section aria-label="Highlights" className="mb-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {smart && (
          <HighlightCard
            title="Intelligence"
            metric="Intelligence Index"
            better="Higher is better"
            up
            value={String(smart.intelligenceIndex)}
            model={smart.name}
          />
        )}
        {fast && (
          <HighlightCard
            title="Speed"
            metric="Output tokens per second"
            better="Higher is better"
            up
            value={`${Math.round(fast.aaSpeed ?? 0)} t/s`}
            model={fast.name}
          />
        )}
        {cheap && (
          <HighlightCard
            title="Cost per Task"
            metric="Weighted average cost (USD)"
            better="Lower is better"
            up={false}
            value={`$${cheap.c.toFixed(2)}`}
            model={cheap.m.name}
          />
        )}
      </div>
    </section>
  );
}
