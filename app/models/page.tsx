'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import NewsletterSignup from '@/components/NewsletterSignup';
import modelsData from '@/data/models.json';

type Model = (typeof modelsData.models)[number];

const CHART_COLORS = {
  intelligence: '#7c3aed',
  speed: '#eab308',
  cost: '#f97316',
};

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
    <div className="border border-[var(--color-line)] rounded-lg p-5 flex-1 min-w-[280px]">
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
              <div className="text-[11px] text-neutral-500 pl-0.5">
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
  const [total, setTotal] = useState(0);
  const [onlineSources, setOnlineSources] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetch('/api/refresh', { method: 'POST' }); }
    catch { /* ignore */ } finally { setRefreshing(false); }
  };

  const { intelligenceTop, speedTop, costTop } = useMemo(() => {
    const models = modelsData.models as Model[];

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
  }, []);

  const sortedAll = useMemo(() => {
    const models = modelsData.models as Model[];
    const withIntel = models.filter(m => m.intelligenceIndex != null);

    if (sortBy === 'intelligenceIndex') return withIntel.sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
    if (sortBy === 'elo') return withIntel.sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
    return withIntel
      .map(m => ({ ...m, avgCost: ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2 }))
      .sort((a, b) => a.avgCost - b.avgCost);
  }, [sortBy]);

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
        </div>

        {/* Highlights */}
        <section className="mb-12">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Highlights</h2>
          </div>
          <div className="flex gap-4 flex-wrap">
            <BarChart title="Intelligence" color={CHART_COLORS.intelligence} items={intelligenceTop} valueLabel="Intelligence Index" />
            <BarChart title="Coding Performance" color={CHART_COLORS.speed} items={speedTop} valueLabel="Coding Index" />
            <BarChart title="Cost per Task" color={CHART_COLORS.cost} items={costTop} valueLabel="Avg $/M tokens" />
          </div>
        </section>

        {/* Table */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-baseline gap-3">
              <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
              <h2 className="text-lg font-semibold tracking-tight">All Models</h2>
            </div>
            <div className="flex gap-1">
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
            </div>
          </div>

          <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
            <table className="w-full text-left text-[13px]">
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
                    <td className="py-2.5 px-4 font-medium">{m.name}</td>
                    <td className="py-2.5 px-4 text-neutral-500">{m.provider}</td>
                    <td className="py-2.5 px-4 tabular-nums">{m.intelligenceIndex ?? '—'}</td>
                    <td className="py-2.5 px-4 tabular-nums">{m.codingIndex ?? '—'}</td>
                    <td className="py-2.5 px-4 tabular-nums">{m.elo ?? '—'}</td>
                    <td className="py-2.5 px-4 tabular-nums">{m.promptPrice != null ? `$${m.promptPrice.toFixed(2)}` : '—'}</td>
                    <td className="py-2.5 px-4 text-neutral-500">{m.context ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        m.family === 'closed'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-600'
                      }`}>
                        {m.family === 'closed' ? 'Closed' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-8">
          <NewsletterSignup />
        </div>
      </main>
    </div>
  );
}
