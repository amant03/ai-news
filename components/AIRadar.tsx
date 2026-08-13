'use client';

import { useEffect, useMemo, useState } from 'react';
import { SentimentReport } from '@/lib/sentiment';
import { DOMAIN_LABEL, Domain } from '@/lib/types';
import ScatterChart from './ScatterChart';
import SourceLink from './SourceLink';

const MOOD_META: Record<string, { label: string; color: string; icon: string }> = {
  euphoric: { label: 'Euphoric', color: '#34d399', icon: '▲' },
  bullish: { label: 'Bullish', color: '#22d3ee', icon: '▲' },
  neutral: { label: 'Neutral', color: '#94a3b8', icon: '◆' },
  cautious: { label: 'Cautious', color: '#fbbf24', icon: '▼' },
  bearish: { label: 'Bearish', color: '#fb7185', icon: '▼' },
};

export default function AIRadar() {
  const [data, setData] = useState<SentimentReport | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch('/api/sentiment')
        .then(r => r.json())
        .then(d => mounted && setData(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 120000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const ranked = data?.models || [];
  const visible = showAll ? ranked : ranked.slice(0, 10);
  const selected = ranked.find(m => m.id === selectedId) || visible[0];

  const points = useMemo(
    () =>
      ranked.slice(0, showAll ? 40 : 10).map(m => ({
        id: m.id,
        label: m.name,
        sublabel: m.provider,
        color: m.color,
        x: Math.max(m.mentions, 1),
        y: m.sentiment.score,
        size: Math.max(m.hot, 1),
      })),
    [ranked, showAll]
  );

  if (!data) {
    return (
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-sm uppercase tracking-widest">AI Mood Radar</h2>
          <span className="h-2 w-2 rounded-full bg-cyan-400/60 animate-pulse" />
        </div>
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
      </div>
    );
  }

  const mood = data.landscape.mood;
  const meta = MOOD_META[mood] || MOOD_META.neutral;
  const scorePct = Math.min(100, Math.max(0, (data.landscape.score + 1) * 50));
  const domainOrder: Domain[] = ['business', 'tech', 'research', 'general'];
  const labeledIds = new Set(visible.slice(0, 6).map(m => m.id));
  const topPos = data.landscape.topPositive[0];
  const topNeg = data.landscape.topNegative[0];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[#07101a] via-[#0a1322] to-[#10100f]">
      <div className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <div>
              <h2 className="font-display font-bold text-lg tracking-tight gradient-text">AI MOOD RADAR</h2>
              <p className="text-[11px] text-[var(--mut)]">Mentions vs sentiment · top models</p>
            </div>
          </div>
        </div>

        <div className="surface rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-[var(--dim)]">AI Landscape Mood</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: meta.color }}>
              {meta.icon} {meta.label}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#0a0f1c] overflow-hidden relative">
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${scorePct}%`,
                background: `linear-gradient(90deg, #fb7185, #fbbf24 50%, #34d399)`,
                boxShadow: '0 0 12px rgba(52,211,153,0.35)',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[var(--dim)] mt-1.5">
            <span>bearish −</span>
            <span>{data.landscape.total} signals</span>
            <span>+ euphoric</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 py-2">
              <div className="font-mono text-sm font-bold text-emerald-300">{data.landscape.positive}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">Positive</div>
            </div>
            <div className="rounded-lg bg-slate-400/10 border border-slate-400/20 py-2">
              <div className="font-mono text-sm font-bold text-slate-300">{data.landscape.neutral}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">Neutral</div>
            </div>
            <div className="rounded-lg bg-rose-400/10 border border-rose-400/20 py-2">
              <div className="font-mono text-sm font-bold text-rose-300">{data.landscape.negative}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">Negative</div>
            </div>
          </div>
        </div>

        {(topPos || topNeg) && (
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {topPos && (
              <div className="relative rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 pr-10">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-emerald-300 text-xs">▲</span>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-300/80">Hottest positive</span>
                </div>
                <p className="text-[11px] leading-snug text-[var(--mut)] line-clamp-2">{topPos.title}</p>
                {topPos.url && <SourceLink href={topPos.url} compact className="absolute top-2.5 right-2.5" />}
              </div>
            )}
            {topNeg && (
              <div className="relative rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 pr-10">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-rose-300 text-xs">▼</span>
                  <span className="text-[10px] uppercase tracking-widest text-rose-300/80">Hottest negative</span>
                </div>
                <p className="text-[11px] leading-snug text-[var(--mut)] line-clamp-2">{topNeg.title}</p>
                {topNeg.url && <SourceLink href={topNeg.url} compact className="absolute top-2.5 right-2.5" />}
              </div>
            )}
          </div>
        )}

        <h3 className="font-display font-medium text-xs uppercase tracking-widest text-[var(--fore)] mb-2">
          Model Sentiment
        </h3>
        {points.length === 0 ? (
          <p className="text-xs text-[var(--dim)] mb-4">Building signal as fresh data lands…</p>
        ) : (
          <>
            <div className="rounded-xl border border-[var(--color-line)] bg-[#070b14]/70 overflow-hidden mb-3">
              <ScatterChart
                points={points}
                labeledIds={labeledIds}
                selectedId={selected?.id}
                onSelect={setSelectedId}
                xLabel="Mentions"
                yLabel="Sentiment"
                sizeLabel="48h heat"
                xFormat={v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))}
                yFormat={v => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`}
                xLog
                betterCorner="tr"
                height={240}
              />
            </div>
            {selected && (
              <div className="rounded-xl border border-[var(--color-line)] bg-[#0a0f1c]/60 p-3 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
                    <span className="text-xs font-medium truncate">{selected.name}</span>
                    <span className="text-[10px] text-[var(--dim)]">{selected.provider}</span>
                  </div>
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: selected.sentiment.score > 0.05 ? '#34d399' : selected.sentiment.score < -0.05 ? '#fb7185' : '#94a3b8' }}
                  >
                    {selected.sentiment.score > 0 ? '+' : ''}{(selected.sentiment.score * 100).toFixed(0)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-[var(--dim)]">
                  <span>{selected.mentions} mentions · 🔥 {selected.hot}</span>
                  <span className={selected.trend > 0.02 ? 'text-emerald-400' : selected.trend < -0.02 ? 'text-rose-400' : ''}>
                    {selected.trend > 0.02 ? '▲' : selected.trend < -0.02 ? '▼' : '·'} {Math.abs(selected.trend * 100).toFixed(0)} pts 7d
                  </span>
                </div>
              </div>
            )}
            {ranked.length > 10 && (
              <button
                onClick={() => setShowAll(v => !v)}
                className="ring-focus mb-4 w-full rounded-lg border border-[var(--color-line)] py-1.5 text-[11px] text-[var(--mut)] hover:text-cyan-200 hover:border-cyan-400/40"
              >
                {showAll ? 'Show top 10' : `See all ${ranked.length} models`}
              </button>
            )}
          </>
        )}

        <h3 className="font-display font-medium text-xs uppercase tracking-widest text-[var(--fore)] mb-3">
          Mood by Vertical
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {domainOrder.map(d => {
            const ds = data.domains?.[d];
            if (!ds || ds.count === 0) return null;
            const dir = ds.score > 0.05 ? 'up' : ds.score < -0.05 ? 'down' : 'flat';
            const color = dir === 'up' ? 'bg-emerald-400' : dir === 'down' ? 'bg-rose-400' : 'bg-slate-500';
            return (
              <div key={d} className="rounded-xl border border-[var(--color-line)] bg-[#0a0f1c]/60 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mut)]">{DOMAIN_LABEL[d]}</span>
                  <span className="font-mono text-[10px] font-bold" style={{ color: dir === 'up' ? '#34d399' : dir === 'down' ? '#fb7185' : '#94a3b8' }}>
                    {ds.score > 0 ? '+' : ''}{(ds.score * 100).toFixed(0)}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[#0d1322] overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.abs(ds.score) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[9px] text-[var(--dim)] mt-4 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-pulse" />
          Sentiment from live headlines across 35+ sources
        </p>
      </div>
    </section>
  );
}
