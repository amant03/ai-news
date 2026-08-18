'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import NewsletterSignup from '@/components/NewsletterSignup';
import AADropdown from '@/components/AADropdown';
import IntelligenceScatter from '@/components/IntelligenceScatter';
import IntelligenceTimeline from '@/components/IntelligenceTimeline';
import modelsData from '@/data/models.json';

type Model = (typeof modelsData.models)[number];

const CHART_COLORS = {
  intelligence: '#7c3aed',
  speed: '#eab308',
  cost: '#f97316',
};

type Openness = 'all' | 'open' | 'closed';

const OPENNESS: { key: Openness; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open Source' },
  { key: 'closed', label: 'Closed Source' },
];

const isOpen = (m: Model) => m.family === 'open-weights' || m.family === 'open';
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

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
}: {
  title: string;
  color: string;
  items: { label: string; provider: string; value: number; display: string }[];
  valueLabel: string;
}) {
  const max = Math.max(...items.map(i => i.value));

  return (
    <div className="border border-[var(--color-line)] rounded-lg p-5 flex-1 w-full min-w-0">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[15px] font-semibold tracking-tight">{title}</span>
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
  const [sortBy, setSortBy] = useState<'intelligenceIndex' | 'elo' | 'cost'>('intelligenceIndex');
  const [openness, setOpenness] = useState<Openness>('all');
  const [total, setTotal] = useState(0);
  const [onlineSources, setOnlineSources] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    const models = modelsData.models as Model[];
    if (openness === 'all') return models;
    return models.filter(m => (openness === 'open' ? isOpen(m) : !isOpen(m)));
  }, [openness]);

  const { intelligenceTop, speedTop, costTop } = useMemo(() => {
    const models = opennessFiltered;

    const intelligenceTop = models
      .filter(m => m.intelligenceIndex != null)
      .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))
      .slice(0, 12)
      .map(m => ({
        label: m.name,
        provider: m.provider,
        value: m.intelligenceIndex ?? 0,
        display: String(m.intelligenceIndex ?? 0),
      }));

    const speedTop = models
      .filter(m => m.codingIndex != null)
      .sort((a, b) => (b.codingIndex ?? 0) - (a.codingIndex ?? 0))
      .slice(0, 12)
      .map(m => ({
        label: m.name,
        provider: m.provider,
        value: m.codingIndex ?? 0,
        display: `${m.codingIndex ?? 0}`,
      }));

    const costTop = models
      .filter(m => m.promptPrice != null && m.completionPrice != null)
      .map(m => ({ ...m, avgCost: ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2 }))
      .sort((a, b) => a.avgCost - b.avgCost)
      .slice(0, 12)
      .map(m => ({
        label: m.name,
        provider: m.provider,
        value: m.avgCost,
        display: `$${m.avgCost.toFixed(2)}`,
      }));

    return { intelligenceTop, speedTop, costTop };
  }, [opennessFiltered]);

  const sortedAll = useMemo(() => {
    const models = opennessFiltered;
    const withIntel = models.filter(m => m.intelligenceIndex != null);

    if (sortBy === 'intelligenceIndex') return [...withIntel].sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
    if (sortBy === 'elo') return [...withIntel].sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
    return withIntel
      .map(m => ({ ...m, avgCost: ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2 }))
      .sort((a, b) => a.avgCost - b.avgCost);
  }, [sortBy, opennessFiltered]);

  // Company-wise leaderboard: best intelligence model per provider
  const companyBoard = useMemo(() => {
    const byProvider = new Map<string, Model[]>();
    for (const m of modelsData.models as Model[]) {
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
  }, []);

  // Latest models by release date
  const latestModels = useMemo(() => {
    return (modelsData.models as Model[])
      .filter(m => m.released)
      .sort((a, b) => new Date(b.released!).getTime() - new Date(a.released!).getTime())
      .slice(0, 12);
  }, []);

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
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
          <p className="text-sm text-neutral-500 mt-2">
            Benchmark rankings, pricing, and provider info for {modelsData.models.length} AI models.
          </p>
          <p className="text-[11px] text-neutral-400 mt-1.5">
            Last synced: {fmtTime(modelsData.updatedAt)} · Sources: {modelsData.sources.join(', ')}
          </p>
        </div>

        {/* Latest Models */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-5 flex-wrap">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Latest Models</h2>
            <span className="text-[11px] text-neutral-400">newest releases first</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {latestModels.map(m => (
              <a
                key={m.id}
                href={`/models/${slugOf(m.name)}`}
                className="border border-[var(--color-line)] rounded-lg p-4 hover:border-neutral-300 transition-colors block"
              >
                <div className="flex items-start justify-between gap-2">
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
                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{m.released ? new Date(m.released).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                  <span className="tabular-nums font-medium text-neutral-600">
                    {m.intelligenceIndex != null ? `Intelligence ${m.intelligenceIndex}` : m.context ? `Context ${m.context}` : ''}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Company-wise leaderboard */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Company-wise Leaderboard</h2>
          </div>
          <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)]">
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
        </section>

        {/* Intelligence Index explainer */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Artificial Analysis Intelligence Index</h2>
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-5 text-[13px] text-neutral-600 leading-relaxed max-w-3xl">
            <p>
              The <strong>Intelligence Index</strong> is a composite benchmark aggregating nine challenging evaluations to provide
              a holistic measure of AI capabilities across mathematics, science, coding, and reasoning: GDPval-AA v2, τ³-Banking,
              Terminal-Bench v2.1, SciCode, Humanity's Last Exam, GPQA Diamond, CritPt, AA-Omniscience, and AA-LCR.
            </p>
            <p className="mt-2">
              Scores range from 0–100. Higher is better. Use the <strong>Open Source / Closed Source</strong> filter below to compare
              models by availability of their weights.
            </p>
          </div>
        </section>

        {/* Highlights */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-5 flex-wrap">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Highlights</h2>
          </div>
          <div className="flex gap-4 flex-wrap mb-4">
            <BarChart title="Intelligence" color={CHART_COLORS.intelligence} items={intelligenceTop} valueLabel="Intelligence Index" />
            <BarChart title="Coding Performance" color={CHART_COLORS.speed} items={speedTop} valueLabel="Coding Index" />
            <BarChart title="Cost per Task" color={CHART_COLORS.cost} items={costTop} valueLabel="Avg $/M tokens" />
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

        {/* Table */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-baseline gap-3">
              <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
              <h2 className="text-lg font-semibold tracking-tight">All Models</h2>
              <span className="text-[11px] text-neutral-400">{opennessFiltered.length} models</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {([['intelligenceIndex', 'Intelligence'], ['elo', 'ELO'], ['cost', 'Cost']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sortBy === key
                      ? 'bg-black text-white'
                      : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="w-px h-5 bg-neutral-200 mx-1 self-center hidden sm:block" aria-hidden />
              <AADropdown
                label="Category"
                value={openness}
                options={OPENNESS.map(o => ({ value: o.key, label: o.label }))}
                onChange={v => setOpenness(v as Openness)}
              />
            </div>
          </div>

          <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-line)]">
                    {[
                      { label: 'Rank', w: 56 },
                      { label: 'Model' },
                      { label: 'Provider', w: 120 },
                      { label: 'Intelligence', w: 100 },
                      { label: 'Coding', w: 80 },
                      { label: 'ELO', w: 72 },
                      { label: 'Prompt $/M', w: 90 },
                      { label: 'Context', w: 80 },
                      { label: 'Type', w: 100 },
                    ].map(col => (
                      <th key={col.label} className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: col.w }}>
                        {col.label}
                      </th>
                    ))}
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
                      <td className="py-2.5 px-4 tabular-nums">{m.codingIndex ?? '—'}</td>
                      <td className="py-2.5 px-4 tabular-nums">{m.elo ?? '—'}</td>
                      <td className="py-2.5 px-4 tabular-nums">{m.promptPrice != null ? `$${m.promptPrice.toFixed(2)}` : '—'}</td>
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
    </div>
  );
}