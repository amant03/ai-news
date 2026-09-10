'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import NewsletterSignup from '@/components/NewsletterSignup';
import AADropdown from '@/components/AADropdown';
import IntelligenceScatter from '@/components/IntelligenceScatter';
import IntelligenceTimeline from '@/components/IntelligenceTimeline';
import AAModelCharts from '@/components/AAModelCharts';
import SectionHeader from '@/components/SectionHeader';
import Footer from '@/components/Footer';
import SortableTh from '@/components/SortableTh';
import { sortByCol, toggleSort, type ColSort, type SortDir } from '@/lib/sortable';
import type { ModelRecord } from '@/lib/model-registry';

type Model = ModelRecord;

const CHART_COLORS = {
  intelligence: '#7f4bf3',
  speed: '#eab308',
  cost: '#ff7018',
};

type Openness = 'all' | 'open' | 'closed';

const OPENNESS: { key: Openness; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open Source' },
  { key: 'closed', label: 'Closed Source' },
];

const isOpen = (m: Model) => m.family === 'open-weights' || m.family === 'open';
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function contextVal(c: string | undefined): number | undefined {
  if (!c) return undefined;
  const n = parseFloat(c);
  if (isNaN(n)) return undefined;
  const mult = /[gGbB]/.test(c) ? 1e9 : /[mM]/.test(c) ? 1e6 : /[kK]/.test(c) ? 1e3 : 1;
  return n * mult;
}

type AllKey = 'model' | 'provider' | 'intelligence' | 'speed' | 'cost' | 'verbosity' | 'context' | 'type';
type CoKey = 'model' | 'released' | 'intelligence' | 'speed' | 'cost' | 'verbosity' | 'context' | 'type';

function allValue(m: Model, key: AllKey): number | string | undefined {
  switch (key) {
    case 'model': return m.name;
    case 'provider': return m.provider;
    case 'intelligence': return m.intelligenceIndex;
    case 'speed': return m.aaSpeed;
    case 'cost': return blendedCost(m) ?? undefined;
    case 'verbosity': return m.aaVerbosity;
    case 'context': return contextVal(m.context);
    case 'type': return isOpen(m) ? 'Open' : 'Closed';
  }
}

function coValue(m: Model, key: CoKey): number | string | undefined {
  switch (key) {
    case 'model': return m.name;
    case 'released': return m.released ? new Date(m.released).getTime() : undefined;
    case 'intelligence': return m.intelligenceIndex;
    case 'speed': return m.aaSpeed;
    case 'cost': return m.aaCostPerTask ?? blendedCost(m) ?? undefined;
    case 'verbosity': return m.aaVerbosity;
    case 'context': return contextVal(m.context);
    case 'type': return isOpen(m) ? 'Open' : 'Closed';
  }
}

function blendedCost(m: Model): number | null {
  if (m.promptPrice == null && m.completionPrice == null) return null;
  const cache = (m.promptPrice ?? 0) * 0.1;
  return (cache * 7 + (m.promptPrice ?? 0) * 2 + (m.completionPrice ?? 0) * 1) / 10;
}

function fmtTokens(n: number | null | undefined): string {
  if (n == null) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1_000).toFixed(0)}K`;
}

function fmtTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' });
}

function BarChart({
  title,
  color,
  items,
  valueLabel,
  sortDir,
  onToggleDir,
}: {
  title: string;
  color: string;
  items: { label: string; provider: string; value: number; display: string }[];
  valueLabel: string;
  sortDir?: SortDir;
  onToggleDir?: () => void;
}) {
  const max = Math.max(...items.map(i => i.value));

  return (
    <div className="border border-[var(--color-line)] rounded-lg p-5 flex-1 w-full min-w-0">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[15px] font-semibold tracking-tight flex-1">{title}</span>
        {sortDir !== undefined && onToggleDir && (
          <button
            onClick={onToggleDir}
            title={`Toggle sort direction — currently ${sortDir === 'asc' ? 'low to high' : 'high to low'}`}
            className="ring-focus inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-500 hover:text-black transition-colors flex-shrink-0"
          >
            {sortDir === 'asc' ? '▲ low→high' : '▼ high→low'}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, idx) => {
          const pct = (Math.pow(item.value, 1.5) / Math.pow(max, 1.5)) * 100;
          return (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-[22px] bg-neutral-100 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      backgroundColor: color,
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums min-w-[48px] text-right">
                  {item.display}
                </span>
              </div>
              <div className="text-[11px] text-neutral-500 pl-0.5 truncate">
                {item.provider} / {item.label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-neutral-400 mt-4 uppercase tracking-wider">
        {valueLabel} (log scale)
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const [allSort, setAllSort] = useState<ColSort<AllKey>>({ key: 'intelligence', dir: 'desc' });
  const [coSort, setCoSort] = useState<ColSort<CoKey>>({ key: 'released', dir: 'desc' });
  const [openness, setOpenness] = useState<Openness>('all');
  const [company, setCompany] = useState<string>('all');
  const [highlightDir, setHighlightDir] = useState<Record<'intel' | 'coding' | 'cost', SortDir>>({
    intel: 'desc',
    coding: 'desc',
    cost: 'asc',
  });
  const [latestDir, setLatestDir] = useState<SortDir>('desc');
  const [total, setTotal] = useState(0);
  const [onlineSources, setOnlineSources] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [catalog, setCatalog] = useState<{ updatedAt: string; sources: string[]; total: number; models: Model[] } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/models/catalog')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (mounted && d?.models) setCatalog(d);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const models = useMemo(() => catalog?.models ?? ([] as Model[]), [catalog]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [statusRes, newsRes] = await Promise.all([fetch('/api/status'), fetch('/api/news?limit=1')]);
        const status = await statusRes.json();
        const news = await newsRes.json();
        if (!mounted) return;
        if (status?.sources) {
          const entries = Object.values(status.sources) as Array<{ ok?: boolean }>;
          setOnlineSources(entries.filter(s => s.ok).length);
        }
        if (status?.nextRun) setNextRefreshAt(new Date(status.nextRun));
        setTotal(news.total ?? 0);
        setLastUpdated(new Date());
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetch('/api/refresh', { method: 'POST' }); }
    catch { /* ignore */ } finally { setRefreshing(false); }
  };

  const opennessFiltered = useMemo(() => {
    if (openness === 'all') return models;
    return models.filter(m => (openness === 'open' ? isOpen(m) : !isOpen(m)));
  }, [openness, models]);

  const { intelligenceTop, speedTop, costTop } = useMemo(() => {
    const models = opennessFiltered;

    const build = (
      src: Model[],
      getValue: (m: Model) => number | undefined,
      fmt: (v: number) => string,
      dir: SortDir
    ): { label: string; provider: string; value: number; display: string }[] => {
      const list = src
        .map(m => {
          const v = getValue(m);
          return v === undefined || v === null ? null : { label: m.name, provider: m.provider, value: v, display: fmt(v) };
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .sort((a, b) => b.value - a.value);
      if (dir === 'asc') list.reverse();
      return list.slice(0, 12);
    };

    const intelligenceTop = build(
      models.filter(m => m.intelligenceIndex != null),
      m => m.intelligenceIndex,
      v => String(v),
      highlightDir.intel
    );

    const speedTop = build(
      models.filter(m => m.codingIndex != null),
      m => m.codingIndex,
      v => `${v}`,
      highlightDir.coding
    );

    const inv = highlightDir.cost === 'asc' ? 1 : -1;
    const costTop = models
      .filter(m => m.promptPrice != null && m.completionPrice != null)
      .map(m => ({ ...m, avgCost: ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2 }))
      .sort((a, b) => (a.avgCost - b.avgCost) * inv)
      .slice(0, 12)
      .map(m => ({
        label: m.name,
        provider: m.provider,
        value: m.avgCost,
        display: `$${m.avgCost.toFixed(2)}`,
      }));

    return { intelligenceTop, speedTop, costTop };
  }, [opennessFiltered, highlightDir]);

  const sortedAll = useMemo(() => {
    const models = opennessFiltered.filter(m => m.intelligenceIndex != null);
    return sortByCol(models, allSort, (m, key) => allValue(m, key), (a, b) => a.name.localeCompare(b.name));
  }, [allSort, opennessFiltered]);

  // Company-wise leaderboard: best intelligence model per provider
  const companyBoard = useMemo(() => {
    const byProvider = new Map<string, Model[]>();
    for (const m of models) {
      if (m.intelligenceIndex == null) continue;
      const list = byProvider.get(m.provider) || [];
      list.push(m);
      byProvider.set(m.provider, list);
    }
    return [...byProvider.entries()]
      .map(([provider, models]) => {
        const best = [...models].sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))[0];
        const openCount = models.filter(isOpen).length;
        return {
          provider,
          best,
          count: models.length,
          openCount,
          closedCount: models.length - openCount,
        };
      })
      .filter(e => e.best)
      .sort((a, b) => (b.best.intelligenceIndex ?? 0) - (a.best.intelligenceIndex ?? 0));
  }, [models]);

  // Latest models by release date
  const latestModels = useMemo(() => {
    const list = models
      .filter(m => m.released)
      .sort((a, b) => new Date(b.released!).getTime() - new Date(a.released!).getTime());
    if (latestDir === 'asc') list.reverse();
    return list.slice(0, 12);
  }, [models, latestDir]);

  const companyList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of models) {
      counts.set(m.provider, (counts.get(m.provider) || 0) + 1);
    }
    const providers = [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => ({ value: p, label: `${p} (${counts.get(p)})` }));
    return [{ value: 'all', label: `All Companies (${models.length})` }, ...providers];
  }, [models]);

  const companyModels = useMemo(() => {
    const all = models.filter(m => company === 'all' || m.provider === company);
    const sorted = sortByCol(all, coSort, (m, key) => coValue(m, key), (a, b) => a.name.localeCompare(b.name));
    return sorted.slice(0, 50);
  }, [company, coSort, models]);

  return (
    <div className="min-h-screen">
      <Header
        total={total}
        onlineSources={onlineSources}
        lastUpdated={lastUpdated}
        nextRefreshAt={nextRefreshAt}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      />
      <main className="max-w-[1400px] mx-auto px-5 pt-10 pb-16">
        <div className="mb-10">
          <div className="kicker mb-2">Leaderboards</div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-[var(--fore)]">
              Model intelligence, performance &amp; price
            </h1>
            <span className="badge-updated">Updated</span>
          </div>
          <p className="md:text-lg text-[var(--mut)] mt-3 max-w-[60ch] leading-relaxed">
            Benchmark rankings, pricing, and provider info for {models.length} AI models.
          </p>
          <p className="text-[11px] text-neutral-400 mt-1.5">
            {catalog ? (
              <>Last synced: {fmtTime(catalog.updatedAt)} · Sources: {(catalog.sources || []).join(', ')}</>
            ) : (
              <>Loading model catalog…</>
            )}
          </p>
        </div>

        {/* Latest Models */}
        <section className="mb-12">
          <SectionHeader
            kicker="Releases"
            title="Latest Models"
            isNew
            right={
              <button
                onClick={() => setLatestDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                title="Toggle sort direction"
                className="ring-focus inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[11px] font-medium text-[var(--mut)] hover:text-[var(--fore)] transition-colors"
              >
                {latestDir === 'asc' ? '▲ oldest first' : '▼ newest first'}
              </button>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {latestModels.map(m => (
              <a
                key={m.id}
                href={`/models/${slugOf(m.name)}`}
                className="border border-[var(--color-line)] rounded-lg p-4 hover:border-neutral-300 transition-colors block"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="font-medium text-[14px] truncate">{m.name}</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">{m.provider}</div>
                  </div>
                  <span className={`flex-shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full border ${
                    isOpen(m) ? 'border-green-600/30 text-green-600' : 'border-red-500/30 text-red-500'
                  }`}>
                    {isOpen(m) ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-neutral-400">Intelligence</span>
                    <span className="tabular-nums font-semibold text-[13px]">{m.intelligenceIndex ?? '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-400">Speed</span>
                    <span className="tabular-nums font-semibold text-[13px]">{m.aaSpeed != null ? `${m.aaSpeed} t/s` : '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-400">Cost</span>
                    <span className="tabular-nums font-semibold text-[13px]">
                      {m.aaCostPerTask != null ? `$${m.aaCostPerTask.toFixed(2)}` : blendedCost(m) != null ? `$${blendedCost(m)!.toFixed(2)}/M` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-400">Verbosity</span>
                    <span className="tabular-nums font-semibold text-[13px]">{fmtTokens(m.aaVerbosity)}</span>
                  </div>
                </div>
                <div className="mt-2.5 text-[10px] text-neutral-400">
                  {m.released ? new Date(m.released).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  {m.context ? ` · ${m.context}` : ''}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Company-wise leaderboard */}
        <section className="mb-12">
          <SectionHeader kicker="By provider" title="Company-wise Leaderboard" updated />
          <div className="border border-[var(--color-line)] rounded-lg overflow-hidden mb-4">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-neutral-50">
                    {[
                      { label: 'Rank', w: 56 },
                      { label: 'Company' },
                      { label: 'Best Model' },
                      { label: 'Intelligence', w: 110 },
                      { label: 'Models', w: 80 },
                      { label: 'Open / Closed', w: 120 },
                    ].map(col => (
                      <th key={col.label} className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: col.w }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companyBoard.map((entry, idx) => (
                    <tr key={entry.provider} className="border-b border-[var(--color-line)] hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-4 tabular-nums text-neutral-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-medium">{entry.provider}</td>
                      <td className="py-2.5 px-4">
                        <a href={`/models/${slugOf(entry.best.name)}`} className="hover:underline">
                          {entry.best.name}
                        </a>
                      </td>
                      <td className="py-2.5 px-4 tabular-nums font-medium">{entry.best.intelligenceIndex}</td>
                      <td className="py-2.5 px-4 tabular-nums text-neutral-500">{entry.count}</td>
                      <td className="py-2.5 px-4 text-[11px]">
                        <span className="text-green-600">{entry.openCount} open</span>
                        <span className="text-neutral-300 mx-1">/</span>
                        <span className="text-red-500">{entry.closedCount} closed</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-semibold tracking-tight">Models by Company</span>
                <span className="text-[11px] text-neutral-400">{companyModels.length} of {company === 'all' ? models.length : models.filter(m => m.provider === company).length} models</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1">
                  {([
                    ['released', 'Latest', 'desc' as SortDir],
                    ['cost', 'Cost', 'asc' as SortDir],
                    ['intelligence', 'Intelligence', 'desc' as SortDir],
                    ['speed', 'Latency', 'desc' as SortDir],
                  ] as const).map(([key, label, dir]) => {
                    const active = coSort?.key === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setCoSort(prev => toggleSort(prev, key, dir))}
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          active
                            ? 'bg-black text-white'
                            : 'text-neutral-500 hover:text-black hover:bg-neutral-100 border border-[var(--color-line)]'
                        }`}
                      >
                        {label}
                        {active ? (coSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    );
                  })}
                </div>
                <span className="w-px h-5 bg-neutral-200 mx-1 self-center hidden sm:block" aria-hidden />
                <AADropdown
                  label="Company"
                  value={company}
                  options={companyList}
                  onChange={v => setCompany(v)}
                />
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 mb-4">
              Latest = newest release date first · Cost = blended price per 1M tokens (7:2:1 cache-input-output) · Latency estimated from output speed (t/s).
            </p>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-neutral-50">
                    <SortableTh label="Model" active={coSort?.key === 'model'} dir={coSort?.dir} onToggle={() => setCoSort(prev => toggleSort(prev, 'model', 'asc'))} />
                    <SortableTh label="Released" width={130} active={coSort?.key === 'released'} dir={coSort?.dir} onToggle={() => setCoSort(prev => toggleSort(prev, 'released', 'desc'))} />
                    <SortableTh label="Intelligence" width={100} active={coSort?.key === 'intelligence'} dir={coSort?.dir} onToggle={() => setCoSort(prev => toggleSort(prev, 'intelligence', 'desc'))} />
                    <SortableTh label="Speed t/s" width={90} active={coSort?.key === 'speed'} dir={coSort?.dir} onToggle={() => setCoSort(prev => toggleSort(prev, 'speed', 'desc'))} />
                    <SortableTh label="Cost" width={100} active={coSort?.key === 'cost'} dir={coSort?.dir} onToggle={() => setCoSort(prev => toggleSort(prev, 'cost', 'asc'))} />
                    <SortableTh label="Verbosity" width={100} active={coSort?.key === 'verbosity'} dir={coSort?.dir} onToggle={() => setCoSort(prev => toggleSort(prev, 'verbosity', 'desc'))} />
                    <SortableTh label="Context" width={90} active={coSort?.key === 'context'} dir={coSort?.dir} onToggle={() => setCoSort(prev => toggleSort(prev, 'context', 'desc'))} />
                    <SortableTh label="Type" width={90} active={coSort?.key === 'type'} dir={coSort?.dir} onToggle={() => setCoSort(prev => toggleSort(prev, 'type', 'asc'))} />
                  </tr>
                </thead>
                <tbody>
                  {companyModels.map(m => (
                    <tr key={m.id} className="border-b border-[var(--color-line)] hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-4 font-medium">
                        <a href={`/models/${slugOf(m.name)}`} className="hover:underline">
                          {m.name}
                        </a>
                      </td>
                      <td className="py-2.5 px-4 tabular-nums text-neutral-500">
                        {m.released ? new Date(m.released).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-2.5 px-4 tabular-nums">{m.intelligenceIndex ?? '—'}</td>
                      <td className="py-2.5 px-4 tabular-nums">{m.aaSpeed != null ? m.aaSpeed : '—'}</td>
                      <td className="py-2.5 px-4 tabular-nums">
                        {m.aaCostPerTask != null ? `$${m.aaCostPerTask.toFixed(2)}` : blendedCost(m) != null ? `$${blendedCost(m)!.toFixed(2)}/M` : '—'}
                      </td>
                      <td className="py-2.5 px-4 tabular-nums text-neutral-500">{fmtTokens(m.aaVerbosity)}</td>
                      <td className="py-2.5 px-4 text-neutral-500">{m.context ?? '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          isOpen(m) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {isOpen(m) ? 'Open' : 'Closed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Intelligence Index explainer */}
        <section className="mb-12">
          <SectionHeader kicker="Methodology" title="Artificial Analysis Intelligence Index" />
          <div className="border border-[var(--color-line)] rounded-lg p-5 text-[13px] text-neutral-600 leading-relaxed max-w-3xl">
            <p>
              The <strong>Intelligence Index</strong> is a composite benchmark aggregating nine challenging evaluations to provide
              a holistic measure of AI capabilities across mathematics, science, coding, and reasoning: GDPval-AA v2, τ³-Banking,
              Terminal-Bench v2.1, SciCode, Humanity&apos;s Last Exam, GPQA Diamond, CritPt, AA-Omniscience, and AA-LCR.
            </p>
            <p className="mt-2">
              Scores range from 0–100. Higher is better. Use the <strong>Open Source / Closed Source</strong> filter below to compare
              models by availability of their weights.
            </p>
          </div>
        </section>

        {/* Highlights */}
        <section className="mb-12">
          <SectionHeader kicker="Top of the class" title="Highlights" />
          <div className="flex gap-4 flex-wrap mb-4">
            <BarChart
              title="Intelligence"
              color={CHART_COLORS.intelligence}
              items={intelligenceTop}
              valueLabel="Intelligence Index"
              sortDir={highlightDir.intel}
              onToggleDir={() => setHighlightDir(prev => ({ ...prev, intel: prev.intel === 'asc' ? 'desc' : 'asc' }))}
            />
            <BarChart
              title="Coding Performance"
              color={CHART_COLORS.speed}
              items={speedTop}
              valueLabel="Coding Index"
              sortDir={highlightDir.coding}
              onToggleDir={() => setHighlightDir(prev => ({ ...prev, coding: prev.coding === 'asc' ? 'desc' : 'asc' }))}
            />
            <BarChart
              title="Cost per Task"
              color={CHART_COLORS.cost}
              items={costTop}
              valueLabel="Avg $/M tokens"
              sortDir={highlightDir.cost}
              onToggleDir={() => setHighlightDir(prev => ({ ...prev, cost: prev.cost === 'asc' ? 'desc' : 'asc' }))}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-3 h-3 rounded-sm bg-[#7c3aed] flex-shrink-0" />
                <span className="text-[15px] font-semibold tracking-tight">Intelligence Index vs. Cost per Task</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-4">
                Artificial Analysis Intelligence Index · weighted average cost (USD) per task · higher intelligence &amp; lower cost = upper-left
              </p>
              <IntelligenceScatter limit={60} />
            </div>
            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-3 h-3 rounded-sm bg-[#eab308] flex-shrink-0" />
                <span className="text-[15px] font-semibold tracking-tight">Frontier Intelligence, Over Time</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-4">
                Intelligence Index of frontier models at release, per provider
              </p>
              <IntelligenceTimeline />
            </div>
          </div>
        </section>

        {/* AA-style charts */}
        <section className="mb-12">
          <SectionHeader
            kicker="Synced from Artificial Analysis"
            title="Token Use, Cost, Context &amp; Speed"
          />
          <AAModelCharts models={models} />
        </section>

        {/* Table */}
        <section>
          <SectionHeader
            kicker="Comparison"
            title="All Models"
            right={<span className="text-[12px] text-[var(--dim)] tabular-nums">{opennessFiltered.length} models</span>}
          />
            <div className="flex gap-1 flex-wrap">
              {([
                ['intelligence', 'Intelligence', 'desc' as SortDir],
                ['cost', 'Cost', 'asc' as SortDir],
                ['speed', 'Speed', 'desc' as SortDir],
                ['verbosity', 'Verbosity', 'desc' as SortDir],
              ] as const).map(([key, label, dir]) => {
                const active = allSort?.key === key;
                return (
                  <button
                    key={key}
                    onClick={() => setAllSort(prev => toggleSort(prev, key, dir))}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      active ? 'bg-black text-white' : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                    }`}
                  >
                    {label}
                    {active ? (allSort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                );
              })}
              <span className="w-px h-5 bg-neutral-200 mx-1 self-center hidden sm:block" aria-hidden />
              <AADropdown
                label="Category"
                value={openness}
                options={OPENNESS.map(o => ({ value: o.key, label: o.label }))}
                onChange={v => setOpenness(v as Openness)}
              />
            </div>

          <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[940px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-neutral-50">
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: 56 }}>Rank</th>
                    <SortableTh label="Model" active={allSort?.key === 'model'} dir={allSort?.dir} onToggle={() => setAllSort(prev => toggleSort(prev, 'model', 'asc'))} />
                    <SortableTh label="Provider" width={120} active={allSort?.key === 'provider'} dir={allSort?.dir} onToggle={() => setAllSort(prev => toggleSort(prev, 'provider', 'asc'))} />
                    <SortableTh label="Intelligence" width={100} active={allSort?.key === 'intelligence'} dir={allSort?.dir} onToggle={() => setAllSort(prev => toggleSort(prev, 'intelligence', 'desc'))} />
                    <SortableTh label="Speed t/s" width={90} active={allSort?.key === 'speed'} dir={allSort?.dir} onToggle={() => setAllSort(prev => toggleSort(prev, 'speed', 'desc'))} />
                    <SortableTh label="Cost" width={110} active={allSort?.key === 'cost'} dir={allSort?.dir} onToggle={() => setAllSort(prev => toggleSort(prev, 'cost', 'asc'))} />
                    <SortableTh label="Verbosity" width={100} active={allSort?.key === 'verbosity'} dir={allSort?.dir} onToggle={() => setAllSort(prev => toggleSort(prev, 'verbosity', 'desc'))} />
                    <SortableTh label="Context" width={80} active={allSort?.key === 'context'} dir={allSort?.dir} onToggle={() => setAllSort(prev => toggleSort(prev, 'context', 'desc'))} />
                    <SortableTh label="Type" width={100} active={allSort?.key === 'type'} dir={allSort?.dir} onToggle={() => setAllSort(prev => toggleSort(prev, 'type', 'asc'))} />
                  </tr>
                </thead>
                <tbody>
                  {sortedAll.map((m, idx) => (
                    <tr key={m.id} className="border-b border-[var(--color-line)] hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-4 tabular-nums text-neutral-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-medium">
                        <a href={`/models/${slugOf(m.name)}`} className="hover:underline">
                          {m.name}
                        </a>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-500">{m.provider}</td>
                      <td className="py-2.5 px-4 tabular-nums">{m.intelligenceIndex ?? '—'}</td>
                      <td className="py-2.5 px-4 tabular-nums">{m.aaSpeed != null ? m.aaSpeed : '—'}</td>
                      <td className="py-2.5 px-4 tabular-nums">
                        {m.aaCostPerTask != null ? `$${m.aaCostPerTask.toFixed(2)}` : blendedCost(m) != null ? `$${blendedCost(m)!.toFixed(2)}/M` : '—'}
                      </td>
                      <td className="py-2.5 px-4 tabular-nums text-neutral-500">{fmtTokens(m.aaVerbosity)}</td>
                      <td className="py-2.5 px-4 text-neutral-500">{m.context ?? '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          isOpen(m)
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {isOpen(m) ? 'Open' : 'Closed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <NewsletterSignup />
        </div>
      </main>
      <Footer />
    </div>
  );
}