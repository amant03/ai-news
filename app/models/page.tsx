'use client';

import { useEffect, useMemo, useState } from 'react';
import NewsletterSignup from '@/components/NewsletterSignup';
import AADropdown from '@/components/AADropdown';
import IntelligenceScatter from '@/components/IntelligenceScatter';
import IntelligenceTimeline from '@/components/IntelligenceTimeline';
import AAModelCharts from '@/components/AAModelCharts';
import SectionHeader from '@/components/SectionHeader';
import InsightCallout from '@/components/InsightCallout';
import JsonLd from '@/components/JsonLd';
import Footer from '@/components/Footer';
import SortableTh from '@/components/SortableTh';
import VerticalBarChart, { modelsToBarData } from '@/components/VerticalBarChart';
import { preferredSlug } from '@/lib/model-slug';
import { leaderboardInsight } from '@/lib/insights';
import { sortByCol, toggleSort, type ColSort, type SortDir } from '@/lib/sortable';
import type { ModelRecord } from '@/lib/model-registry';

type Model = ModelRecord;

type Openness = 'all' | 'open' | 'closed';

const OPENNESS: { key: Openness; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open Source' },
  { key: 'closed', label: 'Closed Source' },
];

const isOpen = (m: Model) => m.family === 'open-weights' || m.family === 'open';
const slugOf = (m: Model) => preferredSlug(m);

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

export default function ModelsPage() {
  const [allSort, setAllSort] = useState<ColSort<AllKey>>({ key: 'intelligence', dir: 'desc' });
  const [coSort, setCoSort] = useState<ColSort<CoKey>>({ key: 'released', dir: 'desc' });
  const [openness, setOpenness] = useState<Openness>('all');
  const [company, setCompany] = useState<string>('all');
  const [highlightDir, setHighlightDir] = useState<Record<'intel' | 'speed' | 'cost', SortDir>>({
    intel: 'desc',
    speed: 'desc',
    cost: 'asc',
  });
  const [latestDir, setLatestDir] = useState<SortDir>('desc');
  const [tableQuery, setTableQuery] = useState('');
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

  const opennessFiltered = useMemo(() => {
    if (openness === 'all') return models;
    return models.filter(m => (openness === 'open' ? isOpen(m) : !isOpen(m)));
  }, [openness, models]);

  const frontier = useMemo(
    () =>
      [...opennessFiltered]
        .filter(m => m.intelligenceIndex != null)
        .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))
        .slice(0, 12),
    [opennessFiltered]
  );

  const withDir = (data: ReturnType<typeof modelsToBarData>, dir: SortDir) =>
    dir === 'asc' ? [...data].reverse() : data;

  const sortedAll = useMemo(() => {
    const models = opennessFiltered.filter(m => m.intelligenceIndex != null);
    const q = tableQuery.trim().toLowerCase();
    const searched = q
      ? models.filter(
          m =>
            m.name.toLowerCase().includes(q) ||
            m.provider.toLowerCase().includes(q) ||
            (m.description || '').toLowerCase().includes(q)
        )
      : models;
    return sortByCol(searched, allSort, (m, key) => allValue(m, key), (a, b) => a.name.localeCompare(b.name));
  }, [allSort, opennessFiltered, tableQuery]);

  const insight = useMemo(() => (models.length ? leaderboardInsight(models) : null), [models]);

  const itemListJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'AI model leaderboard by intelligence',
      numberOfItems: Math.min(sortedAll.length, 50),
      itemListElement: sortedAll.slice(0, 50).map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `/models/${preferredSlug(m)}`,
        name: m.name,
      })),
    }),
    [sortedAll]
  );

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
      <JsonLd data={itemListJsonLd} />
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
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
          <InsightCallout text={insight} />
          <p className="text-[11px] text-neutral-500 mt-1.5">
            {catalog ? (
              <>Last synced: {fmtTime(catalog.updatedAt)} · Sources: {(catalog.sources || []).filter(s => s !== 'aa').join(', ')}</>
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
                href={`/models/${slugOf(m)}`}
                className="border border-[var(--color-line)] rounded-lg p-4 hover:border-neutral-300 transition-colors block"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="font-medium text-[14px] truncate">{m.name}</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">{m.provider}</div>
                  </div>
                  <span className={`flex-shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full border ${
                    isOpen(m) ? 'border-[var(--ok-ink)]/30 text-[var(--ok-ink)]' : 'border-[var(--bad)]/30 text-[var(--bad)]'
                  }`}>
                    {isOpen(m) ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-neutral-500">Intelligence</span>
                    <span className="tabular-nums font-semibold text-[13px]">{m.intelligenceIndex ?? '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500">Speed</span>
                    <span className="tabular-nums font-semibold text-[13px]">{m.aaSpeed != null ? `${m.aaSpeed} t/s` : '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500">Cost</span>
                    <span className="tabular-nums font-semibold text-[13px]">
                      {m.aaCostPerTask != null ? `$${m.aaCostPerTask.toFixed(2)}` : blendedCost(m) != null ? `$${blendedCost(m)!.toFixed(2)}/M` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-neutral-500">Verbosity</span>
                    <span className="tabular-nums font-semibold text-[13px]">{fmtTokens(m.aaVerbosity)}</span>
                  </div>
                </div>
                <div className="mt-2.5 text-[10px] text-neutral-500">
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
                      <th key={col.label} className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap" style={{ width: col.w }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companyBoard.map((entry, idx) => (
                    <tr key={entry.provider} className="border-b border-[var(--color-line)] hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-4 tabular-nums text-neutral-500">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-medium">{entry.provider}</td>
                      <td className="py-2.5 px-4">
                        <a href={`/models/${slugOf(entry.best)}`} className="hover:underline">
                          {entry.best.name}
                        </a>
                      </td>
                      <td className="py-2.5 px-4 tabular-nums font-medium">{entry.best.intelligenceIndex}</td>
                      <td className="py-2.5 px-4 tabular-nums text-neutral-500">{entry.count}</td>
                      <td className="py-2.5 px-4 text-[11px]">
                        <span className="text-[var(--ok-ink)]">{entry.openCount} open</span>
                        <span className="text-neutral-300 mx-1">/</span>
                        <span className="text-[var(--bad)]">{entry.closedCount} closed</span>
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
                <span className="text-[11px] text-neutral-500">{companyModels.length} of {company === 'all' ? models.length : models.filter(m => m.provider === company).length} models</span>
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
            <p className="text-[11px] text-neutral-500 mb-4">
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
                        <a href={`/models/${slugOf(m)}`} className="hover:underline">
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
                          isOpen(m) ? 'bg-green-50 text-[var(--ok-ink)]' : 'bg-red-50 text-[var(--bad)]'
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
          <SectionHeader kicker="Methodology" title="Intelligence Index" />
          <div className="border border-[var(--color-line)] rounded-lg p-5 text-[13px] text-neutral-600 leading-relaxed max-w-3xl">
            <p>
              The <strong>Intelligence Index</strong> is a composite benchmark aggregating nine challenging evaluations to provide
              a holistic measure of AI capabilities across mathematics, science, coding, and reasoning: GDPval v2, τ³-Banking,
              Terminal-Bench v2.1, SciCode, Humanity&apos;s Last Exam, GPQA Diamond, CritPt, Omniscience, and LCR.
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            <VerticalBarChart
              data={withDir(modelsToBarData(frontier, m => m.intelligenceIndex, { maxBars: 12 }), highlightDir.intel)}
              title="Intelligence"
              subtitle="Intelligence Index · higher is better"
              format="n1"
              sortDir={highlightDir.intel}
              onToggleDir={() => setHighlightDir(prev => ({ ...prev, intel: prev.intel === 'asc' ? 'desc' : 'asc' }))}
            />
            <VerticalBarChart
              data={withDir(modelsToBarData(frontier, m => m.aaSpeed, { maxBars: 12 }), highlightDir.speed)}
              title="Speed"
              subtitle="Output tokens per second · higher is better"
              format="n0"
              sortDir={highlightDir.speed}
              onToggleDir={() => setHighlightDir(prev => ({ ...prev, speed: prev.speed === 'asc' ? 'desc' : 'asc' }))}
            />
            <VerticalBarChart
              data={withDir(modelsToBarData(frontier, m => m.aaCostPerTask, { maxBars: 12 }), highlightDir.cost)}
              title="Cost per Task"
              subtitle="USD per Intelligence Index task · lower is better"
              format="usd"
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
              <p className="text-[11px] text-neutral-500 mb-4">
                Intelligence Index · weighted average cost (USD) per task · higher intelligence &amp; lower cost = upper-left
              </p>
              <IntelligenceScatter limit={60} />
            </div>
            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-3 h-3 rounded-sm bg-[#eab308] flex-shrink-0" />
                <span className="text-[15px] font-semibold tracking-tight">Frontier Intelligence, Over Time</span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-4">
                Intelligence Index of frontier models at release, per provider
              </p>
              <IntelligenceTimeline />
            </div>
          </div>
        </section>

        {/* AA-style charts */}
        <section className="mb-12">
          <SectionHeader
            kicker="Token use & cost"
            title="Token Use, Cost, Context &amp; Speed"
          />
          <AAModelCharts models={models} />
        </section>

        {/* Table */}
        <section>
          <SectionHeader
            kicker="Comparison"
            title="All Models"
            right={
              <span className="flex items-center gap-2">
                <input
                  value={tableQuery}
                  onChange={e => setTableQuery(e.target.value)}
                  placeholder="Search models…"
                  aria-label="Search all models"
                  className="w-40 sm:w-52 rounded-lg border border-[var(--color-line)] bg-[var(--input)] px-3 py-1.5 text-[13px] text-[var(--fore)] placeholder:text-[var(--mut)] outline-none focus:border-[var(--accent)]/40"
                />
                <span className="text-[12px] text-[var(--mut)] tabular-nums">{sortedAll.length} models</span>
              </span>
            }
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
            <div className="overflow-auto no-scrollbar table-scroll max-h-[70vh]">
              <table className="leaderboard-table w-full min-w-[940px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-neutral-50">
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap" style={{ width: 56 }}>Rank</th>
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
                      <td className="py-2.5 px-4 tabular-nums text-neutral-500">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-medium">
                        <a href={`/models/${slugOf(m)}`} className="hover:underline">
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
                            ? 'bg-green-50 text-[var(--ok-ink)]'
                            : 'bg-red-50 text-[var(--bad)]'
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
          {tableQuery.trim() && sortedAll.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--mut)]">
              No models match &quot;{tableQuery.trim()}&quot;.{' '}
              <button onClick={() => setTableQuery('')} className="font-medium text-[var(--accent-hover)] hover:underline">
                Clear search
              </button>
            </p>
          )}
        </section>

        <div className="mt-8">
          <NewsletterSignup />
        </div>
      </main>
      <Footer />
    </div>
  );
}