'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';
import { NewsItem } from '@/lib/types';
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

const TABS: Array<{ key: SortKey; label: string; hint: string }> = [
  { key: 'intelligence', label: 'Leaderboard', hint: 'Cost vs accuracy' },
  { key: 'value', label: 'Value', hint: 'Intelligence per $' },
  { key: 'popularity', label: 'Popularity', hint: 'Downloads vs quality' },
  { key: 'newest', label: 'Newest', hint: 'Recency vs quality' },
];

const TOP_N = 10;

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

export default function ModelWatch() {
  const [data, setData] = useState<ModelWatchData | null>(null);
  const [tab, setTab] = useState<SortKey>('intelligence');
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  useEffect(() => {
    setShowAll(false);
    setSelectedId(null);
    setDetailOpen(false);
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

  const visible = showAll ? filtered : filtered.slice(0, TOP_N);
  const chartPack = useMemo(
    () => buildChart(tab, showAll ? filtered : visible),
    [tab, filtered, visible, showAll]
  );

  const selected = useMemo(() => {
    const id = selectedId || visible[0]?.id;
    return filtered.find(m => m.id === id) || visible[0] || null;
  }, [selectedId, filtered, visible]);

  const heroNews = useMemo(() => (data?.modelNews || []).slice(0, 6), [data]);
  const activeTab = TABS.find(t => t.key === tab) || TABS[0];

  if (!data) {
    return (
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-sm uppercase tracking-widest">Model Watch</h2>
          <span className="h-2 w-2 rounded-full bg-cyan-400/60 animate-pulse" />
        </div>
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
      </div>
    );
  }

  const labeledIds = new Set(visible.slice(0, TOP_N).map(m => m.id));

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[#0a1120] via-[#0d1322] to-[#120a20]">
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-400" />
            </span>
            <div>
              <h2 className="font-display font-bold text-lg tracking-tight gradient-text">MODEL WATCH</h2>
              <p className="text-[11px] text-[var(--mut)]">
                Top {Math.min(TOP_N, visible.length)} of {data.catalog?.total || filtered.length} · {activeTab.hint}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search models…"
              className="ring-focus w-36 sm:w-48 rounded-lg border border-[var(--color-line)] bg-[#0a0f1c]/80 px-3 py-1.5 text-xs text-[var(--fore)] placeholder:text-[var(--mut)] outline-none focus:border-cyan-400/40"
              aria-label="Search models"
            />
          </div>
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

        <div className="rounded-xl border border-[var(--color-line)] bg-[#070b14]/70 mb-4 overflow-hidden">
          <ScatterChart
            points={chartPack.points}
            labeledIds={labeledIds}
            selectedId={selected?.id}
            onSelect={id => {
              setSelectedId(id);
              setDetailOpen(true);
            }}
            xLabel={chartPack.xLabel}
            yLabel={chartPack.yLabel}
            sizeLabel={chartPack.sizeLabel}
            xFormat={chartPack.xFormat}
            yFormat={chartPack.yFormat}
            xLog={chartPack.xLog}
            betterCorner={chartPack.betterCorner}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-[var(--color-line)]">
            <p className="text-[10px] text-[var(--dim)]">
              Dot size = {chartPack.sizeLabel}. Line = efficient frontier (not dominated on both axes).
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueProviders(visible).map(p => (
                <span key={p} className="inline-flex items-center gap-1 text-[10px] text-[var(--mut)]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: providerColor(p) }} />
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {selected && (
          <SelectedModel
            m={selected}
            expanded={detailOpen}
            onToggle={() => setDetailOpen(v => !v)}
          />
        )}

        {visible.length === 0 ? (
          <p className="text-sm text-[var(--dim)] py-8 text-center">No models match “{q}”.</p>
        ) : (
          <ol className="mt-4 grid gap-1.5">
            {visible.map((m, i) => (
              <ModelChip
                key={m.id}
                m={m}
                idx={i + 1}
                active={selected?.id === m.id}
                sort={tab}
                onClick={() => {
                  setSelectedId(m.id);
                  setDetailOpen(true);
                }}
              />
            ))}
          </ol>
        )}

        {filtered.length > TOP_N && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setShowAll(v => !v)}
              className="ring-focus px-4 py-2 rounded-xl text-xs font-medium text-[var(--mut)] border border-[var(--color-line)] hover:text-cyan-200 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all"
            >
              {showAll ? 'Show top 10' : `See all ${filtered.length} models`}
            </button>
          </div>
        )}

        {heroNews.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[var(--color-line)]">
            <h3 className="font-display font-medium text-xs uppercase tracking-widest text-[var(--mut)] mb-3">
              Release Radar
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {heroNews.map((n, i) => (
                <article
                  key={`${n.url}-${i}`}
                  className="group relative overflow-hidden rounded-xl border border-[var(--color-line)] h-28"
                >
                  <CoverImage item={n} variant="thumb" showCaption={false} className="absolute inset-0" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05070e] via-[#05070e]/55 to-transparent pointer-events-none" />
                  <SourceLink href={n.url} compact className="absolute top-1.5 right-1.5 z-10" />
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="absolute inset-x-0 bottom-0 p-2 pr-10">
                    <p className="text-[11px] font-medium text-white leading-snug line-clamp-2 group-hover:text-cyan-200 transition-colors">
                      {n.title}
                    </p>
                    <span className="text-[9px] font-mono text-white/55">{n.source_label || n.source} · {timeAgo(n.published_at)}</span>
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

function SelectedModel({ m, expanded, onToggle }: { m: ModelRecord; expanded: boolean; onToggle: () => void }) {
  const color = providerColor(m.provider);
  const links = modelSourceLinks(m);
  const cost = avgCost(m);

  return (
    <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-3.5">
      <div className="flex items-start gap-3">
        <span className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-semibold text-[var(--fore)]">{m.name}</span>
            <span className="text-[11px] text-[var(--dim)]">{m.provider}</span>
            <span className={`text-[9px] px-1.5 rounded-full border ${m.family === 'open-weights' ? 'border-emerald-400/30 text-emerald-300' : 'border-[var(--color-line)] text-[var(--dim)]'}`}>
              {m.family === 'open-weights' ? 'open-weights' : 'closed'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {m.intelligenceIndex !== undefined && <Metric label="Accuracy" value={fmtNum(m.intelligenceIndex)} accent />}
            {cost !== undefined && <Metric label="$/1M" value={fmtCost(cost)} />}
            {m.valueScore !== undefined && <Metric label="Value" value={fmtNum(m.valueScore)} />}
            {m.codingIndex !== undefined && <Metric label="Code" value={fmtNum(m.codingIndex)} />}
            {m.elo !== undefined && <Metric label="Elo" value={fmtNum(m.elo, 0)} />}
            {m.context && <Metric label="Ctx" value={m.context} />}
          </div>
          {expanded && m.description && (
            <p className="text-[12px] text-[var(--mut)] leading-relaxed mt-2">{m.description}</p>
          )}
          {expanded && (
            <div className="mt-2.5">
              <SourcePills links={links} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <SourcePills links={links.slice(0, expanded ? 0 : 2)} />
          <button
            onClick={onToggle}
            className="ring-focus text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200"
          >
            {expanded ? 'Hide detail' : 'Details'}
          </button>
        </div>
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
  const scoreLabel =
    sort === 'value' ? 'val' :
    sort === 'popularity' ? 'dl' :
    sort === 'newest' ? '' :
    m.intelligenceIndex !== undefined ? 'int' : 'elo';

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
        <span className="hidden sm:inline text-[10px] text-[var(--dim)] truncate max-w-[7rem]">{m.provider}</span>
        {cost !== undefined && <span className="font-mono text-[10px] text-[var(--mut)]">{fmtCost(cost)}</span>}
        {sort === 'newest' && m.released && (
          <span className="font-mono text-[10px] text-[var(--dim)]">{m.released.slice(0, 10)}</span>
        )}
        {score !== undefined && scoreLabel && (
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

function uniqueProviders(models: ModelRecord[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of models) {
    if (seen.has(m.provider)) continue;
    seen.add(m.provider);
    out.push(m.provider);
    if (out.length >= 8) break;
  }
  return out;
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
      xLabel: 'Cost · $/1M tokens',
      yLabel: 'Value · intelligence per $',
      sizeLabel: 'accuracy',
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
      xLabel: 'Popularity · downloads',
      yLabel: 'Quality · accuracy / Elo',
      sizeLabel: 'mentions',
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
      xLabel: 'Release date',
      yLabel: 'Quality · accuracy',
      sizeLabel: 'cheapness',
      xFormat: fmtDateTick,
      yFormat: (v: number) => fmtNum(v, 0),
      xLog: false,
      betterCorner: 'tr' as const,
    };
  }

  // Leaderboard: cost vs accuracy (intelligence), bubble = coding / downloads
  return {
    points: mk(pool, m => {
      const x = avgCost(m);
      const y = m.intelligenceIndex ?? (m.elo !== undefined ? (m.elo - 1000) / 10 : undefined);
      if (x === undefined || y === undefined) return null;
      return { x: Math.max(x, 0.01), y, size: m.codingIndex ?? m.hfDownloads ?? 1 };
    }),
    xLabel: 'Cost · $/1M tokens',
    yLabel: 'Accuracy · intelligence index',
    sizeLabel: 'coding / reach',
    xFormat: fmtCost,
    yFormat: (v: number) => fmtNum(v, 0),
    xLog: true,
    betterCorner: 'tl' as const,
  };
}
