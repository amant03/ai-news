'use client';

import { useEffect, useState } from 'react';
import { NewsItem } from '@/lib/types';
import { timeAgo } from '@/lib/format';
import CoverImage from './CoverImage';
import SourceLink from './SourceLink';

interface ModelNewsData {
  modelNews?: NewsItem[];
}

/**
 * "Fresh model news" strip — the model-releases / benchmark headlines pulled
 * from the model feed. Lives directly under Top stories on the front page so
 * frontier news never gets buried at the bottom of the page.
 */
export default function ModelNewsStrip() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch('/api/models?sort=intelligence&limit=20')
        .then(r => r.json())
        .then((d: ModelNewsData) => {
          if (mounted) setItems((d.modelNews || []).slice(0, 3));
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 180000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mb-6" aria-label="Fresh model news">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-px w-6 bg-[var(--accent)]/60" />
        <h2 className="font-display font-semibold text-sm uppercase tracking-[0.2em] text-[var(--fore)]">
          Fresh model news
        </h2>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-[var(--dim)]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--violet)]/70" /> releases & benchmarks
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {items.map((n, i) => (
          <article
            key={`${n.url}-${i}`}
            className="group overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--card)] panel-hover"
          >
            <div className="relative h-28">
              <CoverImage item={n} variant="thumb" showCaption={false} className="absolute inset-0" />
              <SourceLink href={n.url} compact className="absolute top-1.5 right-1.5 z-10" />
            </div>
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="block p-2.5">
              <p className="text-[12px] font-medium text-[var(--fore)] leading-snug line-clamp-2 group-hover:text-[var(--violet)] transition-colors">
                {n.title}
              </p>
              <span className="text-[9px] font-mono text-[var(--dim)]">
                {n.source_label || n.source} · {timeAgo(n.published_at)}
              </span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}