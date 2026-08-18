'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';
import { Domain, NewsItem } from '@/lib/types';
import { providerColor } from '@/lib/models';
import ScatterChart, { ScatterPoint } from './ScatterChart';
import ModelDetail from './ModelDetail';
import VerticalBarChart, { modelsToBarData } from './VerticalBarChart';

interface ModelWatchData {
  models: ModelRecord[];
  leaderboard: ModelRecord[];
  modelNews: NewsItem[];
  catalog?: { total: number; withPricing: number; withBenchmarks: number; updatedAt: string } | null;
}

type SortKey = 'intelligence' | 'value' | 'popularity' | 'newest';
type Audience = Domain | 'all';
type Openness = 'all' | 'open' | 'closed';

const OPENNESS: { key: Openness; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open Source' },
  { key: 'closed', label: 'Closed Source' },
];

function isOpenModel(m: ModelRecord): boolean {
  return m.family === 'open-weights' || m.family === 'open';
}

const AUDIENCE: Record<Audience, { tab: SortKey; title: string; blurb: string; pick: string }> = {
  all: {
    tab: 'intelligence',
    title: 'Which AI should you try?',
    blurb: 'Leaderboard of AI models ranked by intelligence, price, speed and capabilities.',
    pick: 'Top model',
  },
  business: {
    tab: 'value',
    title: 'Which AI is worth the money?',
    blurb: 'Models ranked by capability per dollar. Best for vendor evaluation.',
    pick: 'Best value',
  },
  tech: {
    tab: 'intelligence',
    title: 'Which model is actually better?',
    blurb: 'Compare intelligence, coding ability and cost across providers.',
    pick: 'Smartest',
  },
  research: {
    tab: 'newest',
    title: 'What just dropped?',
    blurb: 'Latest model releases sorted by quality. Watch the frontier move.',
    pick: 'Newest',
  },
  general: {
    tab: 'intelligence',
    title: 'Which AI should you try?',
    blurb: 'Compare AI models by intelligence, cost and coding ability.',
    pick: 'Top model',
  },
};

const LIST_PAGE = 12;

const fmtNum = (n?: number, digits = 1) =>
  n === undefined ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: digits });
const fmtCompact = (n?: number) => {
  if (n === undefined) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

function avgCost(m: ModelRecord): number | undefined {
  if (m.promptPrice === undefined && m.completionPrice === undefined) return undefined;
  const p = m.promptPrice ?? m.completionPrice ?? 0;
  const c = m.completionPrice ?? m.promptPrice ?? 0;
  return (p + c) / 2;
}

function fmtCost(v: number) {
  if (v <= 0.02) return 'Free';
  if (v < 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(1)}`;
}

export default function ModelWatch({ audience = 'all' }: { audience?: Audience }) {
  const profile = AUDIENCE[audience] || AUDIENCE.all;
  const [data, setData] = useState<ModelWatchData | null>(null);
  const [tab, setTab] = useState<SortKey>(profile.tab);
  const [q, setQ] = useState('');
  const [openness, setOpenness] = useState<Openness>('all');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setTab(profile.tab);
    setPage(0);
    setSelectedId(null);
  }, [audience, profile.tab]);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch(`/api/models?sort=${tab}&limit=120`)
        .then(r => r.json())
        .then(d => {
          if (!mounted) return;
          setData(d);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 180000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [tab]);

  const filtered = useMemo(() => {
    let list = data?.models || [];
    if (openness !== 'all') {
      list = list.filter(m => (openness === 'open' ? isOpenModel(m) : !isOpenModel(m)));
    }
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      m =>
        m.name.toLowerCase().includes(s) ||
        m.provider.toLowerCase().includes(s) ||
        (m.description || '').toLowerCase().includes(s)
    );
  }, [data, q, openness]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / LIST_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const listModels = filtered.slice(safePage * LIST_PAGE, safePage * LIST_PAGE + LIST_PAGE);

  const selected = useMemo(() => {
    return filtered.find(m => m.id === selectedId) || filtered[0] || null;
  }, [selectedId, filtered]);

  // Vertical bar chart data for highlights
  const intelData = useMemo(() => modelsToBarData(filtered, m => m.intelligenceIndex, { maxBars: 12, highlightId: selected?.id }), [filtered, selected]);
  const codingData = useMemo(() => modelsToBarData(filtered, m => m.codingIndex, { maxBars: 12, highlightId: selected?.id }), [filtered, selected]);
  const costData = useMemo(() => modelsToBarData(filtered, m => avgCost(m), { maxBars: 12, highlightId: selected?.id }), [filtered, selected]);

  // Scatter data
  const scatterPoints = useMemo((): ScatterPoint[] => {
    return filtered.slice(0, 30).map(m => {
      const cost = avgCost(m);
      const intel = m.intelligenceIndex ?? (m.elo !== undefined ? (m.elo - 1000) / 10 : undefined);
      if (cost === undefined || intel === undefined) return null;
      return {
        id: m.id,
        label: m.name,
        sublabel: m.provider,
        color: providerColor(m.provider),
        x: Math.max(cost, 0.01),
        y: intel,
        size: m.codingIndex ?? 1,
      };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
  }, [filtered]);

  useEffect(() => {
    setPage(0);
  }, [tab, q]);

  if (!data) {
    return (
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-sm uppercase tracking-widest">Model Leaderboard</h2>
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]/60 animate-pulse" />
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--card)]">
      <div className="p-5 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-semibold text-lg sm:text-xl tracking-tight text-[var(--fore)]">{profile.title}</h2>
            <p className="text-[12px] text-[var(--mut)] mt-1 max-w-2xl leading-relaxed">{profile.blurb}</p>
          </div>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Find a model…"
            className="ring-focus w-40 sm:w-56 rounded-lg border border-[var(--color-line)] bg-[var(--input)] px-3 py-2 text-[13px] text-[var(--fore)] placeholder:text-[var(--mut)] outline-none focus:border-[var(--accent)]/40"
            aria-label="Search models"
          />
        </div>

        {/* Sort tabs + openness filter */}
        <div className="flex gap-1.5 mb-5 flex-wrap items-center" role="tablist">
          {[
            { key: 'intelligence' as SortKey, label: 'Intelligence' },
            { key: 'value' as SortKey, label: 'Value' },
            { key: 'popularity' as SortKey, label: 'Most Used' },
            { key: 'newest' as SortKey, label: 'Newest' },
          ].map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`ring-focus rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                tab === t.key
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
                  : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
              }`}
            >
              {t.label}
            </button>
          ))}
          <span className="w-px h-5 bg-[var(--color-line)] mx-1 hidden sm:block" aria-hidden />
          {OPENNESS.map(o => (
            <button
              key={o.key}
              onClick={() => { setOpenness(o.key); setPage(0); }}
              aria-pressed={openness === o.key}
              className={`ring-focus rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                openness === o.key
                  ? 'bg-[var(--fore)] text-[var(--background)]'
                  : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Highlights — vertical bar chart cards (AA-style img5) */}
        <div className="mb-5">
          <div className="text-xs uppercase tracking-widest text-[var(--mut)] mb-2.5 font-medium">Highlights</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <VerticalBarChart
              data={intelData}
              title="Intelligence"
              subtitle="Artificial Analysis Intelligence Index · higher is better"
              valueFormat={v => v.toFixed(0)}
              selectedId={selected?.id}
              onSelect={id => setSelectedId(id)}
            />
            <VerticalBarChart
              data={codingData}
              title="Coding"
              subtitle="Coding capability index · higher is better"
              valueFormat={v => v.toFixed(0)}
              selectedId={selected?.id}
              onSelect={id => setSelectedId(id)}
            />
            <VerticalBarChart
              data={costData}
              title="Cost per Task"
              subtitle="USD per 1M tokens (blended) · lower is better"
              valueFormat={v => fmtCost(v)}
              selectedId={selected?.id}
              onSelect={id => setSelectedId(id)}
            />
          </div>
        </div>

        {/* Leaderboard table — AA-style with colored row borders */}
        <div className="text-xs uppercase tracking-widest text-[var(--mut)] mb-2.5 font-medium">LLM Leaderboard — Comparison</div>
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--dim)] py-6 text-center">No models match &quot;{q}&quot;.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-[var(--color-line)]">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] bg-[var(--input)]/50">
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium w-10">#</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium">Model</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium">Context Window</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium">Creator</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium text-right">Intelligence Index</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium text-right">Coding Index</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--dim)] font-medium text-right">Cost per Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listModels.map((m, i) => {
                      const rank = safePage * LIST_PAGE + i + 1;
                      const color = providerColor(m.provider);
                      const cost = avgCost(m);
                      const isActive = selected?.id === m.id;

                      return (
                        <tr
                          key={m.id}
                          onClick={() => setSelectedId(m.id)}
                          className={`group cursor-pointer transition-colors border-l-[3px] ${
                            isActive ? 'bg-[var(--accent)]/8 border-l-[var(--accent)]' : 'hover:bg-[var(--input)]/40'
                          }`}
                          style={!isActive ? { borderLeftColor: color } : undefined}
                        >
                          <td className="px-4 py-3 font-mono text-[11px] text-[var(--dim)] tabular-nums">{rank}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <a
                                href={`/models/${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                                onClick={e => e.stopPropagation()}
                                className={`text-[14px] font-semibold truncate ${isActive ? 'text-[var(--accent)]' : 'text-[var(--fore)] group-hover:text-[var(--cyan)]'} transition-colors hover:underline`}
                              >
                                {m.name}
                              </a>
                              {isOpenModel(m) ? (
                                <span className="flex-shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full border border-[var(--ok)]/30 text-[var(--ok)]">
                                  open
                                </span>
                              ) : (
                                <span className="flex-shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full border border-[var(--bad)]/30 text-[var(--bad)]">
                                  closed
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-[var(--mut)] tabular-nums">{m.context || '—'}</td>
                          <td className="px-4 py-3 text-[12px] text-[var(--mut)]">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              {m.provider}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold text-[var(--cyan)] tabular-nums">
                            {fmtNum(m.intelligenceIndex)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[12px] text-[var(--fore)] tabular-nums">
                            {fmtNum(m.codingIndex)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[12px] text-[var(--fore)] tabular-nums">
                            {cost !== undefined ? fmtCost(cost) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {pageCount > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="ring-focus px-3 py-1.5 rounded-lg text-xs border border-[var(--color-line)] text-[var(--mut)] disabled:opacity-30 hover:text-[var(--cyan)]"
                >
                  Prev
                </button>
                <span className="font-mono text-[11px] text-[var(--dim)]">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="ring-focus px-3 py-1.5 rounded-lg text-xs border border-[var(--color-line)] text-[var(--mut)] disabled:opacity-30 hover:text-[var(--cyan)]"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Scatter chart — Intelligence vs Cost */}
        {scatterPoints.length >= 3 && (
          <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-[var(--input)]/30 overflow-hidden">
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[var(--mut)] font-medium">Intelligence vs Cost</span>
              <span className="text-[11px] text-[var(--dim)] font-mono">best trade-off = up-left</span>
            </div>
            <ScatterChart
              points={scatterPoints}
              labeledIds={new Set(scatterPoints.slice(0, 8).map(p => p.id))}
              selectedId={selected?.id}
              onSelect={id => setSelectedId(id)}
              xLabel="How expensive"
              yLabel="How smart"
              sizeLabel="coding skill"
              xFormat={v => fmtCost(v)}
              yFormat={v => fmtNum(v, 0)}
              xLog
              betterCorner="tl"
              height={240}
            />
          </div>
        )}

        {/* Selected model detail — AA-style model analysis */}
        {selected && (
          <div className="mt-5 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 sm:p-5">
            <ModelDetail
              model={selected}
              pool={filtered}
              onSelect={id => setSelectedId(id)}
            />
          </div>
        )}
      </div>
    </section>
  );
}