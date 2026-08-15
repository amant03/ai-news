'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';
import { providerColor } from '@/lib/models';

interface TrendData {
  models: ModelRecord[];
}

type Tab = 'progress' | 'efficiency' | 'landscape';

/**
 * Comprehensive AI Trends page modeled after Artificial Analysis trends.
 * Sections: AI Progress, Efficiency & Cost, Model Landscape.
 */
export default function AITrends() {
  const [data, setData] = useState<TrendData | null>(null);
  const [tab, setTab] = useState<Tab>('progress');

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch('/api/models?sort=intelligence&limit=200')
        .then(r => r.json())
        .then(d => { if (mounted) setData(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 300000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const models = useMemo(() => (data?.models || []).filter(m => m.intelligenceIndex !== undefined && m.intelligenceIndex > 0), [data]);

  if (!data) {
    return (
      <section className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-[var(--panel-2)]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-72 rounded-xl bg-[var(--panel-2)]" />
          <div className="h-72 rounded-xl bg-[var(--panel-2)]" />
        </div>
        <div className="h-72 rounded-xl bg-[var(--panel-2)]" />
      </section>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'progress', label: 'AI Progress' },
    { key: 'efficiency', label: 'Efficiency & Cost' },
    { key: 'landscape', label: 'Model Landscape' },
  ];

  return (
    <section className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap" role="tablist">
        {tabs.map(t => (
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
      </div>

      {tab === 'progress' && <ProgressSection models={models} />}
      {tab === 'efficiency' && <EfficiencySection models={models} />}
      {tab === 'landscape' && <LandscapeSection models={models} />}
    </section>
  );
}

/* ============================================================ */
/*  SECTION 1 — AI Progress                                     */
/* ============================================================ */

function ProgressSection({ models }: { models: ModelRecord[] }) {
  // Frontier intelligence over time: best model per lab, sorted by release
  const frontierSeries = useMemo(() => {
    const dated = models.filter(m => m.released).sort((a, b) => +new Date(a.released!) - +new Date(b.released!));
    const byLab = new Map<string, ModelRecord>();
    const points: Array<{ t: number; v: number; name: string; provider: string }> = [];
    let maxSeen = -1;
    for (const m of dated) {
      const v = m.intelligenceIndex ?? 0;
      if (v > maxSeen) {
        maxSeen = v;
        points.push({ t: +new Date(m.released!), v, name: m.name, provider: m.provider });
      }
      const cur = byLab.get(m.provider);
      if (!cur || v > (cur.intelligenceIndex ?? 0)) byLab.set(m.provider, m);
    }
    return { points, leadingByLab: [...byLab.values()].sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0)) };
  }, [models]);

  // Intelligence by country (approximate from provider)
  const byCountry = useMemo(() => {
    const countryMap: Record<string, string[]> = {
      'United States': ['OpenAI', 'Anthropic', 'Google', 'Google DeepMind', 'Meta', 'xAI', 'SpaceXAI', 'Cohere', 'Mistral', 'Inflection', 'Stability AI', 'AI21', 'Replit', 'Groq', 'Together AI', 'Perplexity', 'Scale AI', 'Databricks', 'Snowflake', 'NVIDIA', 'AMD', 'Intel', 'Apple', 'Salesforce', 'Adobe', 'IBM'],
      'China': ['Alibaba', 'Baidu', 'ByteDance', 'DeepSeek', 'Tencent', 'Kimi', 'Z AI', 'MiniMax', '01.AI', 'SenseTime', 'Moonshot'],
      'France': ['Mistral', 'Hugging Face'],
      'Canada': ['Cohere', 'Mistral'],
      'South Korea': ['Upstage', 'SK Telecom', 'Naver', 'LG AI Research', 'Samsung'],
      'UK': ['DeepMind'],
      'Israel': ['AI21 Labs'],
    };
    const groups = new Map<string, ModelRecord[]>();
    for (const m of models) {
      let country = 'Other';
      for (const [c, labs] of Object.entries(countryMap)) {
        if (labs.some(l => m.provider.toLowerCase().includes(l.toLowerCase()))) { country = c; break; }
      }
      const arr = groups.get(country) || [];
      arr.push(m);
      groups.set(country, arr);
    }
    return [...groups.entries()]
      .map(([country, ms]) => ({ country, best: Math.max(...ms.map(m => m.intelligenceIndex ?? 0)), count: ms.length }))
      .sort((a, b) => b.best - a.best);
  }, [models]);

  return (
    <div className="space-y-4">
      {/* Frontier intelligence over time */}
      <ChartCard
        title="Frontier Language Model Intelligence, Over Time"
        subtitle="Peak intelligence index at each release · higher is better"
      >
        <div className="h-64">
          <FrontierChart series={frontierSeries.points} />
        </div>
        {/* Lab legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1 text-[10px] text-[var(--dim)]">
          {frontierSeries.points.slice(-8).map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: providerColor(p.provider) }} />
              <span className="font-mono">{p.name}</span>
              <span className="text-[var(--cyan)]">{p.v}</span>
            </span>
          ))}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leading models by lab */}
        <ChartCard title="Leading Models by AI Lab" subtitle="Best model from each lab · sorted by intelligence">
          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {frontierSeries.leadingByLab.slice(0, 15).map(m => {
              const pct = Math.min(100, ((m.intelligenceIndex ?? 0) / (frontierSeries.leadingByLab[0]?.intelligenceIndex ?? 1)) * 100);
              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: providerColor(m.provider) }} />
                      <span className="truncate text-[var(--fore)] font-medium">{m.provider}</span>
                      <span className="text-[var(--dim)] truncate">— {m.name}</span>
                    </span>
                    <span className="font-mono text-[10px] text-[var(--cyan)] flex-shrink-0 ml-2">{m.intelligenceIndex}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--panel-2)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: providerColor(m.provider) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Intelligence by country */}
        <ChartCard title="Frontier Intelligence by Country" subtitle="Best model intelligence index per country">
          <div className="space-y-3">
            {byCountry.filter(c => c.country !== 'Other').slice(0, 8).map(c => {
              const maxBest = byCountry[0]?.best || 1;
              const pct = (c.best / maxBest) * 100;
              const colors: Record<string, string> = {
                'United States': '#60a5fa', 'China': '#fb7185', 'France': '#a78bfa',
                'Canada': '#fbbf24', 'South Korea': '#34d399', 'UK': '#f472b6', 'Israel': '#22d3ee',
              };
              const color = colors[c.country] || '#94a3b8';
              return (
                <div key={c.country}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-[var(--fore)] font-medium">{c.country}</span>
                    <span className="font-mono text-[10px] text-[var(--dim)]">{c.count} models · best {c.best}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--panel-2)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Intelligence vs Release Date scatter */}
      <ChartCard title="Intelligence vs Release Date" subtitle="All models with intelligence scores">
        <div className="h-72">
          <ScatterRelease models={models} />
        </div>
      </ChartCard>
    </div>
  );
}

/* ============================================================ */
/*  SECTION 2 — Efficiency & Cost                               */
/* ============================================================ */

function EfficiencySection({ models }: { models: ModelRecord[] }) {
  const priced = useMemo(() => models.filter(m => m.promptPrice !== undefined && m.promptPrice > 0), [models]);

  // Price vs Intelligence scatter
  const priceVsIntel = useMemo(() =>
    priced.map(m => ({
      name: m.name,
      provider: m.provider,
      intel: m.intelligenceIndex ?? 0,
      price: ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2,
      family: m.family,
    })).sort((a, b) => b.intel - a.intel),
  [priced]);

  // Cost per intelligence point
  const costEfficiency = useMemo(() =>
    priceVsIntel
      .filter(m => m.intel > 0 && m.price > 0)
      .map(m => ({ ...m, costPerPoint: m.price / m.intel }))
      .sort((a, b) => a.costPerPoint - b.costPerPoint)
      .slice(0, 15),
  [priceVsIntel]);

  // Open vs Proprietary pricing
  const openVsClosed = useMemo(() => {
    const open = priced.filter(m => m.family === 'open' || m.family === 'open-weights');
    const closed = priced.filter(m => m.family === 'closed');
    const avgOpen = open.length ? open.reduce((s, m) => s + ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2, 0) / open.length : 0;
    const avgClosed = closed.length ? closed.reduce((s, m) => s + ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2, 0) / closed.length : 0;
    return { open: open.length, closed: closed.length, avgOpen, avgClosed };
  }, [priced]);

  return (
    <div className="space-y-4">
      {/* Price vs Intelligence scatter */}
      <ChartCard title="Price vs Intelligence" subtitle="Average token price · log scale · click to explore">
        <div className="h-72">
          <PriceIntelScatter data={priceVsIntel} />
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Best value models */}
        <ChartCard title="Best Value Models" subtitle="Lowest cost per intelligence point">
          <div className="space-y-2">
            {costEfficiency.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-right font-mono text-[10px] text-[var(--dim)] tabular-nums flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="truncate text-[var(--fore)] font-medium">{m.name}</span>
                    <span className="font-mono text-[10px] text-[var(--ok)] flex-shrink-0 ml-2">${m.costPerPoint.toFixed(4)}/pt</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-[var(--dim)] mt-0.5">
                    <span style={{ color: providerColor(m.provider) }}>{m.provider}</span>
                    <span>Intel: {m.intel}</span>
                    <span>· ${m.price.toFixed(2)}/1M</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Open vs Closed comparison */}
        <ChartCard title="Open Weights vs Proprietary" subtitle="Average pricing comparison">
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-1">Open Weights</div>
                <div className="font-display font-semibold text-2xl text-[var(--fore)]">${openVsClosed.avgOpen.toFixed(2)}</div>
                <div className="text-[11px] text-[var(--dim)]">avg per 1M tokens · {openVsClosed.open} models</div>
              </div>
              <div className="text-[var(--dim)] text-2xl">vs</div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-1">Proprietary</div>
                <div className="font-display font-semibold text-2xl text-[var(--fore)]">${openVsClosed.avgClosed.toFixed(2)}</div>
                <div className="text-[11px] text-[var(--dim)]">avg per 1M tokens · {openVsClosed.closed} models</div>
              </div>
            </div>
            {openVsClosed.avgOpen > 0 && openVsClosed.avgClosed > 0 && (
              <div className="h-4 rounded-full bg-[var(--panel-2)] overflow-hidden flex">
                <div
                  className="h-full bg-[var(--ok)]"
                  style={{ width: `${(openVsClosed.avgOpen / (openVsClosed.avgOpen + openVsClosed.avgClosed)) * 100}%` }}
                />
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{ width: `${(openVsClosed.avgClosed / (openVsClosed.avgOpen + openVsClosed.avgClosed)) * 100}%` }}
                />
              </div>
            )}
            <div className="flex gap-4 text-[10px] text-[var(--dim)]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--ok)]" /> Open Weights</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent)]" /> Proprietary</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Pricing distribution */}
      <ChartCard title="Pricing by Intelligence Band" subtitle="Average price per 1M tokens by intelligence tier">
        <PricingByBand models={priced} />
      </ChartCard>
    </div>
  );
}

/* ============================================================ */
/*  SECTION 3 — Model Landscape                                 */
/* ============================================================ */

function LandscapeSection({ models }: { models: ModelRecord[] }) {
  // Provider distribution
  const byProvider = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of models) counts.set(m.provider, (counts.get(m.provider) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [models]);

  // Family distribution
  const byFamily = useMemo(() => {
    const counts = { closed: 0, open: 0, 'open-weights': 0 };
    for (const m of models) {
      if (m.family === 'closed') counts.closed++;
      else if (m.family === 'open-weights') counts['open-weights']++;
      else counts.open++;
    }
    return counts;
  }, [models]);

  // Context window distribution
  const contextBands = useMemo(() => {
    const bands = [
      { label: '<8K', min: 0, max: 8192, count: 0 },
      { label: '8K–32K', min: 8192, max: 32768, count: 0 },
      { label: '32K–128K', min: 32768, max: 131072, count: 0 },
      { label: '128K–1M', min: 131072, max: 1048576, count: 0 },
      { label: '>1M', min: 1048576, max: Infinity, count: 0 },
    ];
    for (const m of models) {
      const ctx = parseContext(m.context);
      for (const b of bands) {
        if (ctx >= b.min && ctx < b.max) { b.count++; break; }
      }
    }
    return bands;
  }, [models]);

  // Top models overall
  const top20 = useMemo(() =>
    [...models].sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0)).slice(0, 20),
  [models]);

  return (
    <div className="space-y-4">
      {/* Top 20 models leaderboard */}
      <ChartCard title="Top 20 AI Models" subtitle="Ranked by Artificial Analysis Intelligence Index">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-[var(--color-line)]">
                <th className="px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--dim)] font-medium w-8">#</th>
                <th className="px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--dim)] font-medium">Model</th>
                <th className="px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--dim)] font-medium">Provider</th>
                <th className="px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--dim)] font-medium">Family</th>
                <th className="px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--dim)] font-medium text-right">Intel Index</th>
                <th className="px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--dim)] font-medium text-right">Coding</th>
                <th className="px-3 py-2 text-[9px] uppercase tracking-widest text-[var(--dim)] font-medium text-right">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]/50">
              {top20.map((m, i) => (
                <tr key={m.id} className="hover:bg-[var(--input)]/30 transition-colors">
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--dim)] tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2 text-[12px] font-semibold text-[var(--fore)]">{m.name}</td>
                  <td className="px-3 py-2 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: providerColor(m.provider) }} />
                      {m.provider}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full ${
                      m.family === 'closed' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' :
                      'bg-[var(--ok)]/10 text-[var(--ok)]'
                    }`}>
                      {m.family === 'closed' ? 'Proprietary' : 'Open'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[12px] font-semibold text-[var(--cyan)] tabular-nums">{m.intelligenceIndex}</td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-[var(--dim)] tabular-nums">{m.codingIndex ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-[var(--dim)] tabular-nums">{m.context ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Provider distribution */}
        <ChartCard title="Models by Provider" subtitle="Distribution of tracked models">
          <div className="space-y-2">
            {byProvider.map(([provider, count]) => {
              const maxCount = byProvider[0]?.[1] || 1;
              return (
                <div key={provider}>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="flex items-center gap-1.5 text-[var(--fore)]">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: providerColor(provider) }} />
                      {provider}
                    </span>
                    <span className="font-mono text-[var(--dim)]">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--panel-2)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: providerColor(provider) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Open vs Closed */}
        <ChartCard title="Open vs Proprietary" subtitle="Model family distribution">
          <div className="space-y-4 py-2">
            {[
              { label: 'Proprietary', count: byFamily.closed, color: 'var(--accent)' },
              { label: 'Open Weights', count: byFamily['open-weights'], color: 'var(--ok)' },
              { label: 'Open Source', count: byFamily.open, color: 'var(--cyan)' },
            ].filter(f => f.count > 0).map(f => {
              const total = byFamily.closed + byFamily['open-weights'] + byFamily.open;
              const pct = total > 0 ? (f.count / total) * 100 : 0;
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[var(--fore)] font-medium">{f.label}</span>
                    <span className="font-mono text-[var(--dim)]">{f.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--panel-2)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: f.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Context window distribution */}
        <ChartCard title="Context Window Distribution" subtitle="Max context length bands">
          <div className="space-y-2.5">
            {contextBands.map(b => {
              const maxCount = Math.max(...contextBands.map(x => x.count), 1);
              return (
                <div key={b.label}>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="text-[var(--fore)]">{b.label}</span>
                    <span className="font-mono text-[var(--dim)]">{b.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--panel-2)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--violet)]" style={{ width: `${(b.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Shared chart components                                      */
/* ============================================================ */

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-4 overflow-hidden">
      <div className="mb-3">
        <h3 className="font-display font-semibold text-[var(--fore)] text-[15px]">{title}</h3>
        {subtitle && <p className="text-[10px] text-[var(--mut)] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function FrontierChart({ series }: { series: Array<{ t: number; v: number; name: string; provider: string }> }) {
  const W = 640, H = 230;
  const PAD = { top: 14, right: 10, bottom: 28, left: 40 };

  const { x, y, vMax } = useMemo(() => {
    if (series.length < 2) return { x: (n: number) => n, y: (n: number) => n, vMax: 1 };
    const t0 = series[0].t, t1 = series[series.length - 1].t;
    const span = Math.max(t1 - t0, 1);
    const vMax = Math.max(...series.map(p => p.v), 1);
    const vMin = Math.min(...series.map(p => p.v), 0);
    const vSpan = Math.max(vMax - vMin, 1);
    return {
      x: (t: number) => PAD.left + ((t - t0) / span) * (W - PAD.left - PAD.right),
      y: (v: number) => PAD.top + (1 - (v - vMin) / vSpan) * (H - PAD.top - PAD.bottom),
      vMax,
    };
  }, [series]);

  if (series.length < 2) return <div className="h-full flex items-center justify-center text-[11px] text-[var(--dim)]">Not enough dated models yet.</div>;

  const line = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(series[series.length - 1].t).toFixed(1)},${H - PAD.bottom} L${x(series[0].t).toFixed(1)},${H - PAD.bottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Frontier intelligence over time">
      <defs>
        <linearGradient id="frontierFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {Array.from({ length: 5 }, (_, i) => {
        const yy = PAD.top + (i / 4) * (H - PAD.top - PAD.bottom);
        const v = vMax * (1 - i / 4);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="var(--color-line)" strokeWidth="0.5" strokeDasharray="2 3" />
            <text x={PAD.left - 6} y={yy + 3} textAnchor="end" fontSize="8" fill="var(--dim)">{v.toFixed(0)}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#frontierFill)" />
      <path d={line} fill="none" stroke="var(--cyan)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.t)} cy={y(p.v)} r="3" fill={providerColor(p.provider)} stroke="var(--card)" strokeWidth="1.2" />
          {i === series.length - 1 && (
            <text x={x(p.t) + 7} y={y(p.v) + 3} fontSize="9" fill="var(--fore)" fontWeight="600">
              {p.name} {p.v}
            </text>
          )}
        </g>
      ))}
      <text x={PAD.left} y={H - 8} fontSize="8" fill="var(--dim)">
        {new Date(series[0].t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="8" fill="var(--dim)">
        {new Date(series[series.length - 1].t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
      </text>
    </svg>
  );
}

function ScatterRelease({ models }: { models: ModelRecord[] }) {
  const W = 640, H = 280;
  const PAD = { top: 14, right: 10, bottom: 28, left: 40 };

  const { x, y, pts, vMax } = useMemo(() => {
    const dated = models.filter(m => m.released && m.intelligenceIndex);
    if (dated.length < 2) return { x: () => 0, y: () => 0, pts: [], vMax: 1 };
    const ts = dated.map(m => +new Date(m.released!));
    const t0 = Math.min(...ts), t1 = Math.max(...ts);
    const span = Math.max(t1 - t0, 1);
    const vMax = Math.max(...dated.map(m => m.intelligenceIndex ?? 0), 1);
    return {
      x: (t: number) => PAD.left + ((t - t0) / span) * (W - PAD.left - PAD.right),
      y: (v: number) => PAD.top + (1 - v / vMax) * (H - PAD.top - PAD.bottom),
      pts: dated.map(m => ({ t: +new Date(m.released!), v: m.intelligenceIndex ?? 0, name: m.name, provider: m.provider, family: m.family })),
      vMax,
    };
  }, [models]);

  if (pts.length < 2) return <div className="h-full flex items-center justify-center text-[11px] text-[var(--dim)]">Not enough data.</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Intelligence vs release date">
      {Array.from({ length: 5 }, (_, i) => {
        const yy = PAD.top + (i / 4) * (H - PAD.top - PAD.bottom);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="var(--color-line)" strokeWidth="0.5" strokeDasharray="2 3" />
            <text x={PAD.left - 6} y={yy + 3} textAnchor="end" fontSize="8" fill="var(--dim)">{(vMax * (1 - i / 4)).toFixed(0)}</text>
          </g>
        );
      })}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={x(p.t)}
          cy={y(p.v)}
          r={p.family === 'closed' ? 3.5 : 2.5}
          fill={providerColor(p.provider)}
          fillOpacity={p.family === 'closed' ? 0.9 : 0.6}
          stroke={p.family === 'closed' ? providerColor(p.provider) : 'none'}
          strokeWidth="1"
        />
      ))}
      <text x={PAD.left} y={H - 8} fontSize="8" fill="var(--dim)">
        {new Date(pts[0].t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="8" fill="var(--dim)">
        {new Date(pts[pts.length - 1].t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
      </text>
    </svg>
  );
}

function PriceIntelScatter({ data }: { data: Array<{ name: string; provider: string; intel: number; price: number; family: string }> }) {
  const W = 640, H = 280;
  const PAD = { top: 14, right: 10, bottom: 28, left: 50 };

  const { x, y, vMax, pMax } = useMemo(() => {
    if (data.length < 2) return { x: () => 0, y: () => 0, vMax: 1, pMax: 1 };
    const vMax = Math.max(...data.map(d => d.intel), 1);
    const pMax = Math.max(...data.map(d => d.price), 1);
    return {
      x: (v: number) => PAD.left + (v / vMax) * (W - PAD.left - PAD.right),
      y: (p: number) => PAD.top + (1 - p / pMax) * (H - PAD.top - PAD.bottom),
      vMax, pMax,
    };
  }, [data]);

  if (data.length < 2) return <div className="h-full flex items-center justify-center text-[11px] text-[var(--dim)]">Not enough pricing data.</div>;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Price vs Intelligence">
      {Array.from({ length: 5 }, (_, i) => {
        const yy = PAD.top + (i / 4) * (H - PAD.top - PAD.bottom);
        const v = vMax * (1 - i / 4);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="var(--color-line)" strokeWidth="0.5" strokeDasharray="2 3" />
            <text x={PAD.left - 6} y={yy + 3} textAnchor="end" fontSize="8" fill="var(--dim)">${v.toFixed(1)}</text>
          </g>
        );
      })}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(d.intel)} cy={y(d.price)} r={d.family === 'closed' ? 3.5 : 2.5} fill={providerColor(d.provider)} fillOpacity="0.8" />
        </g>
      ))}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="8" fill="var(--dim)">Intelligence Index →</text>
      <text x={8} y={H / 2} textAnchor="middle" fontSize="8" fill="var(--dim)" transform={`rotate(-90, 8, ${H / 2})`}>Price / 1M tokens →</text>
    </svg>
  );
}

function PricingByBand({ models }: { models: ModelRecord[] }) {
  const bands = useMemo(() => {
    const b = [
      { label: 'Intel <20', min: 0, max: 20, prices: [] as number[] },
      { label: '20–30', min: 20, max: 30, prices: [] },
      { label: '30–40', min: 30, max: 40, prices: [] },
      { label: '40–50', min: 40, max: 50, prices: [] },
      { label: '50+', min: 50, max: Infinity, prices: [] },
    ];
    for (const m of models) {
      const intel = m.intelligenceIndex ?? 0;
      const price = ((m.promptPrice ?? 0) + (m.completionPrice ?? 0)) / 2;
      if (price <= 0) continue;
      for (const band of b) {
        if (intel >= band.min && intel < band.max) { band.prices.push(price); break; }
      }
    }
    return b.map(band => ({
      label: band.label,
      avg: band.prices.length ? band.prices.reduce((s, p) => s + p, 0) / band.prices.length : 0,
      count: band.prices.length,
    }));
  }, [models]);

  const maxAvg = Math.max(...bands.map(b => b.avg), 1);
  const colors = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#fb7185'];

  return (
    <div className="space-y-3">
      {bands.map((b, i) => (
        <div key={b.label}>
          <div className="flex items-center justify-between text-[11px] mb-0.5">
            <span className="text-[var(--fore)] font-medium">{b.label}</span>
            <span className="font-mono text-[10px] text-[var(--dim)]">${b.avg.toFixed(2)}/1M · {b.count} models</span>
          </div>
          <div className="h-3 rounded-full bg-[var(--panel-2)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(b.avg / maxAvg) * 100}%`, backgroundColor: colors[i] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function parseContext(s?: string): number {
  if (!s) return 0;
  const m = s.replace(/,/g, '').match(/(\d+)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  if (/m/i.test(s)) return n * 1048576;
  if (/k/i.test(s)) return n * 1024;
  return n;
}
