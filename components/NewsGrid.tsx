'use client';

import { useMemo } from 'react';
import type { NewsItem } from '@/lib/types';
import { engagementLabel, engagementScore } from '@/lib/engagement';
import { scoreText } from '@/lib/sentiment';
import StoryThread from './StoryThread';

export interface EngEntry {
  key: string;
  likes: number;
  dislikes: number;
  comments: number;
}

function timeAgo(iso: string): string {
  const s = Math.max(60, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function sentimentDot(item: NewsItem): { color: string; label: string } {
  const s = scoreText(`${item.title} ${item.summary || ''}`.slice(0, 400));
  if (s > 0.15) return { color: 'var(--ok)', label: 'Positive' };
  if (s < -0.15) return { color: 'var(--bad)', label: 'Negative' };
  return { color: 'var(--dim)', label: 'Neutral' };
}

function RowMeta({ item, eng }: { item: NewsItem; eng?: EngEntry }) {
  const basis = engagementLabel(item);
  const dot = sentimentDot(item);
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--dim)]">
      <span className="tabular-nums">{timeAgo(item.published_at)}</span>
      <span className="inline-flex items-center gap-1" title={`Sentiment: ${dot.label}`}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot.color }} />
        {dot.label}
      </span>
      {basis && <span className="tabular-nums">{basis}</span>}
      {(eng && (eng.likes > 0 || eng.comments > 0)) && (
        <span className="tabular-nums">
          ♥ {eng.likes}{eng.comments > 0 ? ` · 💭 ${eng.comments}` : ''}
        </span>
      )}
    </span>
  );
}

function StoryRow({ item, eng, expanded, onToggle, onEngagement }: {
  item: NewsItem;
  eng?: EngEntry;
  expanded: boolean;
  onToggle: () => void;
  onEngagement: (likes: number, dislikes: number, comments: number) => void;
}) {
  return (
    <div className="border-b border-[var(--color-line)] last:border-0">
      <div className="flex items-start gap-2 py-2">
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13.5px] font-medium leading-snug text-[var(--fore)] hover:text-[var(--accent)] hover:underline underline-offset-2 transition-colors"
          >
            {item.title}
          </a>
          <RowMeta item={item} eng={eng} />
        </div>
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse discussion' : 'Expand discussion'}
          title={expanded ? 'Collapse discussion' : 'Discuss, vote & sentiment'}
          className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] tabular-nums transition-colors ${
            expanded
              ? 'border-[var(--accent)]/50 text-[var(--accent)]'
              : 'border-[var(--color-line)] text-[var(--dim)] hover:text-[var(--fore)]'
          }`}
        >
          💭 {eng?.comments ?? 0}
          <span aria-hidden>{expanded ? '▾' : '▸'}</span>
        </button>
      </div>
      {expanded && eng && (
        <StoryThread
          item={item}
          storyKey={eng.key}
          onEngagement={onEngagement}
        />
      )}
    </div>
  );
}

/**
 * Upstract-style dense newswire: breaking strip, most-discussed ranking
 * with the real interaction basis, then per-source columns. No images.
 */
export default function NewsGrid({ items, engMap, expandedKey, onToggle, onEngagement }: {
  items: NewsItem[];
  engMap: Record<string, EngEntry>;
  expandedKey: string | null;
  onToggle: (key: string) => void;
  onEngagement: (url: string, key: string, likes: number, dislikes: number, comments: number) => void;
}) {
  const engFor = (url: string) => engMap[url];

  const mostDiscussed = useMemo(() => {
    return [...items]
      .filter(i => (i.num_comments ?? 0) > 0 || (engMap[i.url]?.comments ?? 0) > 0)
      .sort((a, b) => {
        const score = (i: NewsItem) => (i.num_comments ?? 0) * 2 + (engMap[i.url]?.comments ?? 0) * 3 + engagementScore(i);
        return score(b) - score(a);
      })
      .slice(0, 5);
  }, [items, engMap]);

  const columns = useMemo(() => {
    const bySource = new Map<string, NewsItem[]>();
    for (const item of items) {
      const src = item.source_label || item.source;
      const list = bySource.get(src) || [];
      if (list.length < 6) list.push(item);
      bySource.set(src, list);
    }
    return [...bySource.entries()]
      .sort((a, b) => b[1].length - a[1].length || engagementScore(b[1][0]) - engagementScore(a[1][0]))
      .slice(0, 6);
  }, [items]);

  const top = items[0];

  return (
    <div>
      {/* Breaking strip */}
      {top && (
        <a
          href={top.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-center gap-2 overflow-hidden rounded-lg border border-[var(--bad)]/30 bg-[var(--bad)]/5 px-3 py-2 text-[13px] hover:border-[var(--bad)]/60 transition-colors"
        >
          <span className="shrink-0 rounded bg-[var(--bad)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Live</span>
          <span className="truncate font-medium">{top.title}</span>
          {engagementLabel(top) && (
            <span className="shrink-0 text-[11px] tabular-nums text-[var(--dim)]">{engagementLabel(top)}</span>
          )}
        </a>
      )}

      {/* Most discussed */}
      {mostDiscussed.length > 0 && (
        <section className="mb-6" aria-label="Most discussed">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--dim)]">
            Most discussed — ranked by real interactions
          </h3>
          <ol className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] px-4">
            {mostDiscussed.map((item, i) => {
              const eng = engFor(item.url);
              return (
                <li key={item.url} className="flex items-start gap-2.5 border-b border-[var(--color-line)] py-2.5 last:border-0">
                  <span className="mt-0.5 w-5 shrink-0 font-display text-sm font-bold tabular-nums text-[var(--dim)]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[13.5px] font-semibold leading-snug hover:text-[var(--accent)] hover:underline underline-offset-2">
                      {item.title}
                    </a>
                    <RowMeta item={item} eng={eng} />
                  </div>
                  <button
                    onClick={() => eng && onToggle(eng.key)}
                    className="mt-0.5 shrink-0 rounded-md border border-[var(--color-line)] px-1.5 py-1 text-[11px] text-[var(--dim)] hover:text-[var(--fore)]"
                    aria-label="Discuss"
                  >
                    💭 {eng?.comments ?? item.num_comments ?? 0} ▸
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Source columns */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
        {columns.map(([source, list]) => (
          <section key={source} aria-label={source}>
            <h3 className="mb-1 flex items-center gap-2 border-b-2 border-[var(--fore)] pb-1.5 text-[13px] font-bold uppercase tracking-wide">
              {source}
              <span className="text-[10px] font-medium tabular-nums text-[var(--dim)]">{list.length}</span>
            </h3>
            <div>
              {list.map(item => {
                const eng = engFor(item.url);
                const key = eng?.key ?? item.url;
                return (
                  <StoryRow
                    key={item.url}
                    item={item}
                    eng={eng}
                    expanded={expandedKey === key}
                    onToggle={() => eng && onToggle(eng.key)}
                    onEngagement={(l, d, c) => eng && onEngagement(item.url, eng.key, l, d, c)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
