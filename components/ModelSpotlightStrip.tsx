'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ModelRecord } from '@/lib/model-registry';
import { preferredSlug } from '@/lib/model-slug';
import { finiteNum } from '@/lib/format';
import { Skeleton } from './ui/skeleton';

interface Props {
  take?: number;
}

export default function ModelSpotlightStrip({ take = 4 }: Props) {
  const [models, setModels] = useState<ModelRecord[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/models?sort=intelligence&limit=12')
      .then(r => r.json())
      .then(d => {
        if (!mounted) return;
        const list: ModelRecord[] = d?.models || d?.leaderboard || [];
        setModels(list.slice(0, take));
      })
      .catch(() => {
        if (mounted) setModels([]);
      });
    return () => {
      mounted = false;
    };
  }, [take]);

  return (
    <section aria-label="Model spotlight" className="mt-2">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="section-label">Model spotlight</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Trending models</h2>
        </div>
        <Link href="/models" className="text-sm font-medium text-[var(--accent-hover)] hover:underline">
          View all models →
        </Link>
      </div>
      {models === null ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: take }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : models.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--mut)]">
          Model data is still loading — check back shortly.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {models.map(m => {
            const intel = finiteNum(m.intelligenceIndex);
            return (
              <Link
                key={m.id}
                href={`/models/${preferredSlug(m)}`}
                className="card-lift rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--card)] p-4"
              >
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="mt-0.5 truncate text-xs text-[var(--mut)]">{m.provider}</p>
                <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-[var(--mut)]">
                  {intel !== undefined
                    ? `Intelligence ${intel.toFixed(0)} — ${m.description || 'frontier model'}`.slice(0, 120)
                    : (m.description || 'Frontier model').slice(0, 120)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
