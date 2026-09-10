'use client';

import { useMemo, useState } from 'react';
import { IMAGE_MODELS, IMAGE_CREATORS, creatorColor } from '@/lib/image-leaderboard';
import SortableTh from '@/components/SortableTh';
import { sortByCol, toggleSort, type ColSort, type SortDir } from '@/lib/sortable';

type SortKey = 'elo' | 'price' | 'samples' | 'released' | 'rank' | 'model' | 'creator';

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  elo: 'desc',
  price: 'asc',
  samples: 'desc',
  released: 'desc',
  rank: 'asc',
  model: 'asc',
  creator: 'asc',
};

function valueOf(m: (typeof IMAGE_MODELS)[number], key: SortKey): number | string | undefined {
  switch (key) {
    case 'elo': return m.elo;
    case 'price': return parsePrice(m.pricePer1k);
    case 'samples': return m.samples;
    case 'released': { const d = dateVal(m.released); return d === 0 ? undefined : d; }
    case 'rank': return m.rank;
    case 'model': return m.name;
    case 'creator': return m.creator;
  }
}

/**
 * Full-page AA-style text-to-image leaderboard. Coloured creator bars,
 * sortable table, price chart, and Elo comparison — all from the scraped
 * Artificial Analysis dataset.
 */
export default function ImageLeaderboard() {
  const [sort, setSort] = useState<ColSort<SortKey>>({ key: 'elo', dir: 'desc' });
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [eloDir, setEloDir] = useState<SortDir>('desc');
  const [priceDir, setPriceDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    let list = IMAGE_MODELS;
    if (creatorFilter !== 'all') list = list.filter(m => m.creator === creatorFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(s) || m.creator.toLowerCase().includes(s));
    }
    return list;
  }, [creatorFilter, q]);

  const sorted = useMemo(() => sortByCol(filtered, sort, (m, key) => valueOf(m, key), (a, b) => a.rank - b.rank), [filtered, sort]);

  const maxElo = Math.max(...IMAGE_MODELS.map(m => m.elo));
  const minElo = Math.min(...IMAGE_MODELS.map(m => m.elo));
  const eloSpan = maxElo - minElo || 1;

  const maxSamples = Math.max(...IMAGE_MODELS.map(m => m.samples));

  // Elo bar chart — top 15 by Elo (sort-aware)
  const barData = useMemo(() => {
    const list = [...IMAGE_MODELS].sort((a, b) => b.elo - a.elo);
    if (eloDir === 'asc') list.reverse();
    return list.slice(0, 15);
  }, [eloDir]);

  // Price bar chart — top 15 cheapest (sort-aware)
  const priceBarData = useMemo(() => {
    const list = IMAGE_MODELS.filter(m => parsePrice(m.pricePer1k) > 0).sort(
      (a, b) => parsePrice(b.pricePer1k) - parsePrice(a.pricePer1k)
    );
    if (priceDir === 'asc') list.reverse();
    return list.slice(0, 15);
  }, [priceDir]);

  const maxPrice = Math.max(parsePrice(IMAGE_MODELS[0].pricePer1k) || 250, ...priceBarData.map(m => parsePrice(m.pricePer1k))) || 250;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display font-medium text-4xl md:text-5xl tracking-tight text-[var(--fore)]">Text to Image Leaderboard</h1>
          <p className="text-[13px] text-[var(--mut)] mt-1">
            Image generation models ranked by human-preference Elo from {IMAGE_MODELS.length} models.
            Data sourced from Artificial Analysis.
          </p>
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search models…"
          className="ring-focus w-44 sm:w-56 rounded-lg border border-[var(--color-line)] bg-[var(--input)] px-3 py-2 text-[13px] text-[var(--fore)] placeholder:text-[var(--mut)] outline-none focus:border-[var(--accent)]/40"
          aria-label="Search image models"
        />
      </div>

      {/* Creator filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCreatorFilter('all')}
          className={`ring-focus rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
            creatorFilter === 'all'
              ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
              : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
          }`}
        >
          All ({IMAGE_MODELS.length})
        </button>
        {IMAGE_CREATORS.slice(0, 20).map(c => (
          <button
            key={c}
            onClick={() => setCreatorFilter(c)}
            className={`ring-focus rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
              creatorFilter === c
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
                : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1.5 flex-wrap" role="tablist">
        {([
          ['elo', 'Elo Rating'],
          ['price', 'Price'],
          ['samples', 'Samples'],
          ['released', 'Newest'],
          ['rank', 'AA Rank'],
        ] as const).map(([key, label]) => {
          const active = sort?.key === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setSort(prev => toggleSort(prev, key, DEFAULT_DIR[key]))}
              className={`ring-focus rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                active
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
                  : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
              }`}
            >
              {label}
              {active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
            </button>
          );
        })}
      </div>

      {/* Elo bar chart — top 15 */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs uppercase tracking-widest text-[var(--mut)] font-medium">Elo Rating — Top 15</span>
          <button
            onClick={() => setEloDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            title={`Toggle sort direction — currently ${eloDir === 'asc' ? 'low to high' : 'high to low'}`}
            className="ring-focus inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-1 text-[10px] font-medium text-[var(--mut)] hover:text-[var(--fore)] transition-colors"
          >
            {eloDir === 'asc' ? '▲ low→high' : '▼ high→low'}
          </button>
        </div>
        <div className="space-y-2">
          {barData.map(m => {
            const pct = ((m.elo - minElo) / eloSpan) * 100;
            const color = creatorColor(m.creator);
            return (
              <div key={m.rank} className="flex items-center gap-3">
                <span className="w-8 text-right font-mono text-[11px] text-[var(--dim)] tabular-nums flex-shrink-0">{m.rank}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[12px] mb-0.5">
                    <span className="truncate text-[var(--fore)] font-medium">{m.name}</span>
                    <span className="font-mono text-[11px] text-[var(--cyan)] tabular-nums flex-shrink-0 ml-2">{m.elo}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--panel-2)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Price comparison — top 15 cheapest */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs uppercase tracking-widest text-[var(--mut)] font-medium">Price per 1k Images — Best Value</span>
          <button
            onClick={() => setPriceDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            title={`Toggle sort direction — currently ${priceDir === 'asc' ? 'low to high' : 'high to low'}`}
            className="ring-focus inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-1 text-[10px] font-medium text-[var(--mut)] hover:text-[var(--fore)] transition-colors"
          >
            {priceDir === 'asc' ? '▲ low→high' : '▼ high→low'}
          </button>
        </div>
        <div className="space-y-2">
          {priceBarData.map((m, i) => {
              const price = parsePrice(m.pricePer1k);
              const pct = Math.min(100, (price / maxPrice) * 100);
              const color = creatorColor(m.creator);
              return (
                <div key={m.rank} className="flex items-center gap-3">
                  <span className="w-8 text-right font-mono text-[11px] text-[var(--dim)] tabular-nums flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[12px] mb-0.5">
                      <span className="truncate text-[var(--fore)] font-medium">{m.name}</span>
                      <span className="font-mono text-[11px] text-[var(--ok)] tabular-nums flex-shrink-0 ml-2">{m.pricePer1k}/1k</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--panel-2)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Full leaderboard table */}
      <div className="rounded-xl border border-[var(--color-line)] overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--input)]/50">
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium w-10">#</th>
                <SortableTh label="Creator" active={sort?.key === 'creator'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'creator', 'asc'))} activeClass="text-[var(--cyan)]" inactiveClass="text-[var(--dim)] hover:text-[var(--fore)]" />
                <SortableTh label="Model" active={sort?.key === 'model'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'model', 'asc'))} activeClass="text-[var(--cyan)]" inactiveClass="text-[var(--dim)] hover:text-[var(--fore)]" />
                <SortableTh label="Elo" right active={sort?.key === 'elo'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'elo', 'desc'))} activeClass="text-[var(--cyan)]" inactiveClass="text-[var(--dim)] hover:text-[var(--fore)]" />
                <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium text-right">95% CI</th>
                <SortableTh label="Samples" right active={sort?.key === 'samples'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'samples', 'desc'))} activeClass="text-[var(--cyan)]" inactiveClass="text-[var(--dim)] hover:text-[var(--fore)]" />
                <SortableTh label="Released" active={sort?.key === 'released'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'released', 'desc'))} activeClass="text-[var(--cyan)]" inactiveClass="text-[var(--dim)] hover:text-[var(--fore)]" />
                <SortableTh label="Price / 1k imgs" right active={sort?.key === 'price'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'price', 'asc'))} activeClass="text-[var(--cyan)]" inactiveClass="text-[var(--dim)] hover:text-[var(--fore)]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {sorted.map(m => {
                const color = creatorColor(m.creator);
                const eloPct = ((m.elo - minElo) / eloSpan) * 100;
                return (
                  <tr key={m.rank} className="hover:bg-[var(--input)]/30 transition-colors border-l-[3px]" style={{ borderLeftColor: color }}>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--dim)] tabular-nums">{m.rank}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        {m.creator}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[13px] font-semibold text-[var(--fore)]">{m.name}</span>
                      {m.openWeights && (
                        <span className="ml-1.5 text-[8px] uppercase tracking-wider px-1.5 py-px rounded-full border border-[var(--ok)]/30 text-[var(--ok)]">open</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--panel-2)] overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full" style={{ width: `${eloPct}%`, backgroundColor: color }} />
                        </div>
                        <span className="font-mono text-[13px] font-semibold text-[var(--cyan)] tabular-nums">{m.elo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-[var(--dim)] tabular-nums">{m.ci95}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-[var(--mut)] tabular-nums">{m.samples.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-[11px] text-[var(--dim)]">{m.released}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[12px] text-[var(--fore)] tabular-nums">
                      {m.pricePer1k === 'No API' || m.pricePer1k === 'Coming soon' ? (
                        <span className="text-[var(--dim)]">{m.pricePer1k}</span>
                      ) : (
                        <span>{m.pricePer1k}<span className="text-[var(--dim)]">/1k</span></span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-[var(--dim)]">
          <p className="text-sm">No models match your filters.</p>
          <button onClick={() => { setCreatorFilter('all'); setQ(''); }} className="ring-focus mt-3 text-sm text-[var(--accent)]">Clear filters</button>
        </div>
      )}
    </div>
  );
}

function parsePrice(s: string): number {
  if (!s || s === 'No API' || s === 'Coming soon') return Infinity;
  const m = s.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : Infinity;
}

function dateVal(s: string): number {
  const d = new Date(s);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}