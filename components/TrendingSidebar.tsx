'use client';

import { useMemo, useState } from 'react';
import { NewsItem } from '@/lib/types';
import { lastNHours, olderThan, engagementLabel } from '@/lib/engagement';
import { timeAgo } from '@/lib/format';

interface TrendingSidebarProps {
  items: NewsItem[];
  onSelect?: (item: NewsItem) => void;
}

const HOURS = 24;

/**
 * The X/Twitter-style trending rail. Headlines ranked by recency — the newest
 * stories from the last 24 hours up top, "earlier" behind a toggle. Each row
 * opens the story; engagement badges sit right under the headline.
 */
export default function TrendingSidebar({ items, onSelect }: TrendingSidebarProps) {
  const [tab, setTab] = useState<'today' | 'earlier'>('today');

  const { today, earlier } = useMemo(() => {
    return { today: lastNHours(items, HOURS), earlier: olderThan(items, HOURS) };
  }, [items]);

  const list = tab === 'today' ? today : earlier;
  const max = today.length + earlier.length;

  return (
    <section className="glass rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-display font-medium text-sm uppercase tracking-widest text-[var(--fore)]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 mr-2 align-middle animate-pulse" />
          Trending
        </h3>
        <span className="text-[10px] font-mono text-[var(--dim)]">{max} stories</span>
      </header>

      {/* 24h / earlier toggle */}
      <div className="px-4 pb-2">
        <div className="inline-flex p-0.5 rounded-full border border-[var(--color-line)] bg-[var(--input)]/60">
          <button
            onClick={() => setTab('today')}
            className={`ring-focus px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              tab === 'today' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--dim)] hover:text-[var(--mut)]'
            }`}
          >
            Last 24h · {today.length}
          </button>
          <button
            onClick={() => setTab('earlier')}
            className={`ring-focus px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              tab === 'earlier' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--dim)] hover:text-[var(--mut)]'
            }`}
          >
            Earlier · {earlier.length}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-[var(--dim)]">No stories here yet — check back after the next refresh.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)] max-h-[520px] overflow-y-auto">
          {list.slice(0, 60).map((item, i) => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onSelect?.(item)}
                className="group flex gap-3 px-4 py-2.5 hover:bg-[var(--input)]/60 transition-colors"
              >
                <span className="w-6 flex-shrink-0 font-mono text-[11px] pt-0.5 text-[var(--dim)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-[var(--fore)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                    {item.title}
                  </p>
                  <p className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-[var(--dim)]">
                    <span className="truncate">{item.source_label || item.source}</span>
                    <span aria-hidden>·</span>
                    <span className="flex-shrink-0">{timeAgo(item.published_at)}</span>
                  </p>
                  {engagementLabel(item) && (
                    <p className="text-[10px] text-cyan-400/80 mt-0.5">{engagementLabel(item)}</p>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}