'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';
import { Domain, NewsItem } from '@/lib/types';
import { timeAgo } from '@/lib/format';
import { modelSourceLinks, providerColor } from '@/lib/models';
import ScatterChart, { ScatterPoint } from './ScatterChart';
import CoverImage from './CoverImage';
import SourceLink, { SourcePills } from './SourceLink';

interface ModelWatchData {
  models: ModelRecord[];
  leaderboard: ModelRecord[];
  modelNews: NewsItem[];
  catalog?: { total: number; withPricing: number; withBenchmarks: number; updatedAt: string } | null;
}

type SortKey = 'intelligence' | 'value' | 'popularity' | 'newest';
type Audience = Domain | 'all';

const TABS: Array<{ key: SortKey; label: string; hint: string }> = [
  { key: 'intelligence', label: 'Smartest', hint: 'How good vs how expensive' },
  { key: 'value', label: 'Best value', hint: 'Most capability per dollar' },
  { key: 'popularity', label: 'Most used', hint: 'What people actually pick' },
  { key: 'newest', label: 'Newest', hint: 'Latest releases vs quality' },
];

const AUDIENCE: Record<Audience, { tab: SortKey; title: string; blurb: string; pick: string }> = {
  all: {
    tab: 'intelligence',
    title: 'Which AI should you try?',
    blurb: 'Each dot is a model. Higher = smarter. Further left = cheaper. The glowing line is the best trade-off.',
    pick: 'A strong all-rounder to start with',
  },
  business: {
    tab: 'value',
    title: 'Which AI is worth the money?',
    blurb: 'Higher = more capability per dollar. Further left = cheaper to run. Useful when you are choosing a vendor.',
    pick: 'Best bang for buck right now',
  },
  tech: {
    tab: 'intelligence',
    title: 'Which model is actually better?',
    blurb: 'Accuracy on the vertical axis, API cost on the horizontal. Bigger dots tend to be stronger at coding.',
    pick: 'Strongest model on this chart',
  },
  research: {
    tab: 'newest',
    title: 'What just dropped?',
    blurb: 'Newer models sit to the right. Higher = stronger quality scores. Use this to spot the frontier moving.',
    pick: 'Newest high-quality release',
  },
  general: {
    tab: 'intelligence',
    title: 'Which AI should you try?',
    blurb: 'Each dot is a model. Higher = smarter. Further left = cheaper.',
    pick: 'A strong all-rounder to start with',
  },
};

const TOP_N = 10;
const LIST_PAGE = 6;

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

function quality(m: ModelRecord): number | undefined {
  if (m.intelligenceIndex !== undefined) return m.intelligenceIndex;
  if (m.elo !== undefined) return (m.elo - 1000) / 10;
  return undefined;
}

function fmtCost(v: number) {
  if (v <= 0.02) return 'Free';
  if (v < 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(1)}`;
}

function fmtDateTick(v: number) {
  const d = new Date(v);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export default function ModelWatch({ audience = 'all' }: { audience?: Audience }) {
  const profile = AUDIENCE[audience] || AUDIENCE.all;
  const [data, setData] = useState<ModelWatchData | null>(null);
  const [tab, setTab] = useState<SortKey>(profile.tab);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    setTab(profile.tab);
    setPage(0);
    setSelectedId(null);
    setDetailOpen(false);
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
    const list = data?.models || [];
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter(
      m =>
        m.name.toLowerCase().includes(s) ||
        m.provider.toLowerCase().includes(s) ||
        (m.description || '').toLowerCase().includes(s)
    );
  }, [data, q]);

  const chartModels = filtered.slice(0, TOP_N);
  const pageCount = Math.max(1, Math.ceil(filtered.length / LIST_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const listModels = filtered.slice(safePage * LIST_PAGE, safePage * LIST_PAGE + LIST_PAGE);
  const chartPack = useMemo(() => buildChart(tab, filtered.slice(0, TOP_N)), [tab, filtered]);

  const selected = useMemo(() => {
    const id = selectedId || chartModels[0]?.id;
    return filtered.find(m => m.id === id) || chartModels[0] || null;
  }, [selectedId, filtered, chartModels]);

  const picks = chartModels.slice(0, 3);
  const heroNews = useMemo(() => (data?.modelNews || []).slice(0, 3), [data]);
  const labeledIds = new Set(chartModels.map(m => m.id));

  useEffect(() => {
    setPage(0);
  }, [tab, q]);

  if (!data) {
    return (
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-sm uppercase tracking-widest">Which AI to use</h2>
          <span className="h-2 w-2 rounded-full bg-cyan-400/60 animate-pulse" />
        </div>
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[#0a1120] via-[#0d1322] to-[#120a20]">
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl tracking-tight gradient-text">{profile.title}</h2>
            <p className="text-[12px] text-[var(--mut)] mt-1 max-w-2xl leading-relaxed">{profile.blurb}</p>
          </div>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Find a model…"
            className="ring-focus w-36 sm:w-48 rounded-lg border border-[var(--color-line)] bg-[#0a0f1c]/80 px-3 py-1.5 text-xs text-[var(--fore)] placeholder:text-[var(--mut)] outline-none focus:border-cyan-400/40"
            aria-label="Search models"
          />
        </div>

        <div className="flex gap-1.5 mb-4 flex-wrap" role="tablist">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`ring-focus rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/40'
                    : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {picks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {picks.map((m, i) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedId(m.id);
                  setDetailOpen(i === 0 ? detailOpen : true);
                }}
                className={`ring-focus text-left rounded-xl border p-3 transition-colors ${
                  selected?.id === m.id ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-[var(--color-line)] bg-[#0a0f1c]/60 hover:border-cyan-400/25'
                }`}
              >
                <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-1">
                  {i === 0 ? profile.pick : i === 1 ? 'Runner up' : 'Also consider'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: providerColor(m.provider) }} />
                  <span className="font-display text-sm font-semibold truncate">{m.name}</span>
                </div>
                <div className="mt-2 flex gap-3 text-[11px] font-mono text-[var(--mut)]">
                  {avgCost(m) !== undefined && <span>{fmtCost(avgCost(m)!)}</span>}
                  {m.intelligenceIndex !== undefined && <span className="text-cyan-200">{fmtNum(m.intelligenceIndex)} smart</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-[var(--color-line)] bg-[#070b14]/70 overflow-hidden">
          <ScatterChart
            points={chartPack.points}
            labeledIds={labeledIds}
            selectedId={selected?.id}
            onSelect={id => {
              setSelectedId(id);
              setDetailOpen(false);
            }}
            xLabel={chartPack.xLabel}
            yLabel={chartPack.yLabel}
            sizeLabel={chartPack.sizeLabel}
            xFormat={chartPack.xFormat}
            yFormat={chartPack.yFormat}
            xLog={chartPack.xLog}
            betterCorner={chartPack.betterCorner}
            height={260}
          />
          <div className="border-t border-[var(--color-line)] px-3 py-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
            {chartModels.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`ring-focus inline-flex items-center gap-1.5 text-[11px] ${
                  selected?.id === m.id ? 'text-cyan-200' : 'text-[var(--mut)] hover:text-[var(--fore)]'
                }`}
              >
                <span className="font-mono text-[10px] w-4 text-center rounded bg-white/10">{i + 1}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: providerColor(m.provider) }} />
                <span className="truncate max-w-[9rem]">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="mt-3">
            <SelectedModel
              m={selected}
              expanded={detailOpen}
              pickLabel="Selected"
              onToggle={() => setDetailOpen(v => !v)}
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--dim)] py-6 text-center">No models match “{q}”.</p>
        ) : (
          <div className="mt-4">
            <ol className="grid gap-1.5">
              {listModels.map((m, i) => (
                <ModelChip
                  key={m.id}
                  m={m}
                  idx={safePage * LIST_PAGE + i + 1}
                  active={selected?.id === m.id}
                  sort={tab}
                  onClick={() => {
                    setSelectedId(m.id);
                    setDetailOpen(false);
                  }}
                />
              ))}
            </ol>
            {pageCount > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="ring-focus px-3 py-1.5 rounded-lg text-xs border border-[var(--color-line)] text-[var(--mut)] disabled:opacity-30 hover:text-cyan-200"
                >
                  Prev
                </button>
                <span className="font-mono text-[11px] text-[var(--dim)]">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="ring-focus px-3 py-1.5 rounded-lg text-xs border border-[var(--color-line)] text-[var(--mut)] disabled:opacity-30 hover:text-cyan-200"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {heroNews.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[var(--color-line)]">
            <h3 className="font-display font-medium text-xs uppercase tracking-widest text-[var(--mut)] mb-3">
              Fresh model news
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {heroNews.map((n, i) => (
                <article
                  key={`${n.url}-${i}`}
                  className="group overflow-hidden rounded-xl border border-[var(--color-line)] bg-[#0b1220]"
                >
                  <div className="relative h-24">
                    <CoverImage item={n} variant="thumb" showCaption={false} className="absolute inset-0" />
                    <SourceLink href={n.url} compact className="absolute top-1.5 right-1.5 z-10" />
                  </div>
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="block p-2.5">
                    <p className="text-[11px] font-medium text-[var(--fore)] leading-snug line-clamp-2 group-hover:text-cyan-200 transition-colors">
                      {n.title}
                    </p>
                    <span className="text-[9px] font-mono text-[var(--dim)]">
                      {n.source_label || n.source} · {timeAgo(n.published_at)}
                    </span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SelectedModel({
  m,
  expanded,
  pickLabel,
  onToggle,
}: {
  m: ModelRecord;
  expanded: boolean;
  pickLabel: string;
  onToggle: () => void;
}) {
  const color = providerColor(m.provider);
  const links = modelSourceLinks(m);
  const cost = avgCost(m);

  return (
    <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-3.5">
      <div className="text-[10px] uppercase tracking-widest text-cyan-300/80 mb-1.5">{pickLabel}</div>
      <div className="flex items-start gap-3">
        <span className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-semibold text-[var(--fore)]">{m.name}</span>
            <span className="text-[11px] text-[var(--dim)]">{m.provider}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {m.intelligenceIndex !== undefined && <Metric label="How smart" value={fmtNum(m.intelligenceIndex)} accent />}
            {cost !== undefined && <Metric label="Price / 1M" value={fmtCost(cost)} />}
            {m.valueScore !== undefined && <Metric label="Value" value={fmtNum(m.valueScore)} />}
            {m.codingIndex !== undefined && <Metric label="Coding" value={fmtNum(m.codingIndex)} />}
          </div>
          {expanded && m.description && (
            <p className="text-[12px] text-[var(--mut)] leading-relaxed mt-2">{m.description}</p>
          )}
          <div className="mt-2.5">
            <SourcePills links={expanded ? links : links.slice(0, 2)} />
          </div>
        </div>
        <button onClick={onToggle} className="ring-focus text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200 flex-shrink-0">
          {expanded ? 'Less' : 'More'}
        </button>
      </div>
    </div>
  );
}

function ModelChip({
  m,
  idx,
  active,
  sort,
  onClick,
}: {
  m: ModelRecord;
  idx: number;
  active: boolean;
  sort: SortKey;
  onClick: () => void;
}) {
  const color = providerColor(m.provider);
  const cost = avgCost(m);
  const score =
    sort === 'value' ? m.valueScore :
    sort === 'popularity' ? m.hfDownloads :
    sort === 'newest' ? undefined :
    m.intelligenceIndex ?? m.elo;

  return (
    <li>
      <button
        onClick={onClick}
        className={`ring-focus w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
          active ? 'border-cyan-400/40 bg-cyan-400/10' : 'border-[var(--color-line)] bg-[#0a0f1c]/50 hover:border-cyan-400/25'
        }`}
      >
        <span className="font-mono text-[10px] text-[var(--dim)] w-5 tabular-nums">{idx}</span>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium text-[var(--fore)] truncate flex-1">{m.name}</span>
        {cost !== undefined && <span className="font-mono text-[10px] text-[var(--mut)]">{fmtCost(cost)}</span>}
        {sort === 'newest' && m.released && (
          <span className="font-mono text-[10px] text-[var(--dim)]">{m.released.slice(0, 10)}</span>
        )}
        {score !== undefined && (
          <span className="font-mono text-[11px] font-semibold text-cyan-200 tabular-nums">
            {sort === 'popularity' ? fmtCompact(score) : fmtNum(score)}
          </span>
        )}
      </button>
    </li>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={`font-mono text-[12px] font-semibold ${accent ? 'text-cyan-300' : 'text-[var(--fore)]'}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-[var(--mut)]">{label}</span>
    </span>
  );
}

function buildChart(tab: SortKey, pool: ModelRecord[]) {
  const mk = (
    rows: ModelRecord[],
    xy: (m: ModelRecord) => { x: number; y: number; size: number } | null
  ): ScatterPoint[] => {
    const pts: ScatterPoint[] = [];
    for (const m of rows) {
      const v = xy(m);
      if (!v) continue;
      pts.push({
        id: m.id,
        label: m.name,
        sublabel: m.provider,
        color: providerColor(m.provider),
        x: v.x,
        y: v.y,
        size: v.size,
      });
    }
    return pts;
  };

  if (tab === 'value') {
    return {
      points: mk(pool, m => {
        const x = avgCost(m);
        if (x === undefined || m.valueScore === undefined) return null;
        return { x: Math.max(x, 0.01), y: m.valueScore, size: quality(m) ?? 1 };
      }),
      xLabel: 'How expensive',
      yLabel: 'Bang for buck',
      sizeLabel: 'how smart',
      xFormat: fmtCost,
      yFormat: (v: number) => fmtNum(v, 0),
      xLog: true,
      betterCorner: 'tl' as const,
    };
  }

  if (tab === 'popularity') {
    return {
      points: mk(pool, m => {
        const x = m.hfDownloads ?? m.mentions;
        const y = quality(m) ?? m.elo;
        if (!x || y === undefined) return null;
        return { x, y, size: m.mentions ?? 1 };
      }),
      xLabel: 'How widely used',
      yLabel: 'How good',
      sizeLabel: 'buzz',
      xFormat: (v: number) => fmtCompact(v),
      yFormat: (v: number) => fmtNum(v, 0),
      xLog: true,
      betterCorner: 'tr' as const,
    };
  }

  if (tab === 'newest') {
    return {
      points: mk(pool, m => {
        if (!m.released) return null;
        const t = new Date(m.released).getTime();
        const y = quality(m);
        if (!t || y === undefined) return null;
        return { x: t, y, size: avgCost(m) ? 1 / Math.max(avgCost(m)!, 0.05) : 1 };
      }),
      xLabel: 'When it launched',
      yLabel: 'How good',
      sizeLabel: 'cheapness',
      xFormat: fmtDateTick,
      yFormat: (v: number) => fmtNum(v, 0),
      xLog: false,
      betterCorner: 'tr' as const,
    };
  }

  return {
    points: mk(pool, m => {
      const x = avgCost(m);
      const y = m.intelligenceIndex ?? (m.elo !== undefined ? (m.elo - 1000) / 10 : undefined);
      if (x === undefined || y === undefined) return null;
      return { x: Math.max(x, 0.01), y, size: m.codingIndex ?? m.hfDownloads ?? 1 };
    }),
    xLabel: 'How expensive',
    yLabel: 'How smart',
    sizeLabel: 'coding skill',
    xFormat: fmtCost,
    yFormat: (v: number) => fmtNum(v, 0),
    xLog: true,
    betterCorner: 'tl' as const,
  };
}
