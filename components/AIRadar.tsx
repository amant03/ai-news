'use client';

import { useEffect, useState } from 'react';
import { SentimentReport } from '@/lib/sentiment';
import { DOMAIN_LABEL, Domain } from '@/lib/types';

const MOOD_META: Record<string, { label: string; color: string; icon: string }> = {
  euphoric: { label: 'Euphoric', color: '#34d399', icon: '▲' },
  bullish: { label: 'Bullish', color: '#22d3ee', icon: '▲' },
  neutral: { label: 'Neutral', color: '#94a3b8', icon: '◆' },
  cautious: { label: 'Cautious', color: '#fbbf24', icon: '▼' },
  bearish: { label: 'Bearish', color: '#fb7185', icon: '▼' },
};

function scoreBar(score: number): { pct: number; color: string; dir: 'up' | 'down' | 'flat' } {
  const pct = Math.min(100, Math.abs(score) * 100);
  const dir: 'up' | 'down' | 'flat' = score > 0.05 ? 'up' : score < -0.05 ? 'down' : 'flat';
  const color = dir === 'up' ? 'bg-emerald-400' : dir === 'down' ? 'bg-rose-400' : 'bg-slate-500';
  return { pct, color, dir };
}

export default function AIRadar() {
  const [data, setData] = useState<SentimentReport | null>(null);

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

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[#07101a] via-[#0a1322] to-[#10100f]">
      <div className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <div>
              <h2 className="font-display font-bold text-lg tracking-tight gradient-text">AI MOOD RADAR</h2>
              <p className="text-[11px] text-[var(--mut)]">Landscape sentiment · model mood · trends</p>
            </div>
          </div>
        </div>

        {/* Landscape gauge */}
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
            <span>{data.landscape.total} signals scored</span>
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

        {/* Top positive / negative signals */}
        {(data.landscape.topPositive.length > 0 || data.landscape.topNegative.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {data.landscape.topPositive.length > 0 && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-emerald-300 text-xs">▲</span>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-300/80">Hottest positive</span>
                </div>
                <p className="text-[11px] leading-snug text-[var(--mut)] line-clamp-2">{data.landscape.topPositive[0]}</p>
              </div>
            )}
            {data.landscape.topNegative.length > 0 && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-rose-300 text-xs">▼</span>
                  <span className="text-[10px] uppercase tracking-widest text-rose-300/80">Hottest negative</span>
                </div>
                <p className="text-[11px] leading-snug text-[var(--mut)] line-clamp-2">{data.landscape.topNegative[0]}</p>
              </div>
            )}
          </div>
        )}

        {/* Model sentiment */}
        <h3 className="font-display font-medium text-xs uppercase tracking-widest text-[var(--fore)] mb-3">
          Model Sentiment
        </h3>
        {data.models.length === 0 ? (
          <p className="text-xs text-[var(--dim)] mb-4">Building signal as fresh data lands…</p>
        ) : (
          <div className="space-y-3 mb-4">
            {data.models.slice(0, 6).map(m => {
              const bar = scoreBar(m.sentiment.score);
              return (
                <div key={m.id} className="rounded-xl border border-[var(--color-line)] bg-[#0a0f1c]/60 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                      <span className="text-xs font-medium text-[var(--fore)] truncate">{m.name}</span>
                      <span className="text-[10px] text-[var(--dim)] flex-shrink-0">{m.provider}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {m.hot > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-400/15 text-rose-300">🔥 {m.hot}</span>
                      )}
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: bar.dir === 'up' ? '#34d399' : bar.dir === 'down' ? '#fb7185' : '#94a3b8' }}
                      >
                        {m.sentiment.score > 0 ? '+' : ''}{(m.sentiment.score * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#0d1322] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${bar.color}`}
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[9px] font-mono text-[var(--dim)]">
                    <span>{m.mentions} mentions</span>
                    <span className={m.trend > 0.02 ? 'text-emerald-400' : m.trend < -0.02 ? 'text-rose-400' : ''}>
                      {m.trend > 0.02 ? '▲' : m.trend < -0.02 ? '▼' : '·'} {Math.abs(m.trend * 100).toFixed(0)} pts 7d
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Domain mood */}
        <h3 className="font-display font-medium text-xs uppercase tracking-widest text-[var(--fore)] mb-3">
          Mood by Vertical
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {domainOrder.map(d => {
            const ds = data.domains?.[d];
            if (!ds || ds.count === 0) return null;
            const bar = scoreBar(ds.score);
            return (
              <div key={d} className="rounded-xl border border-[var(--color-line)] bg-[#0a0f1c]/60 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-[var(--mut)]">{DOMAIN_LABEL[d]}</span>
                  <span className="font-mono text-[10px] font-bold" style={{ color: bar.dir === 'up' ? '#34d399' : bar.dir === 'down' ? '#fb7185' : '#94a3b8' }}>
                    {ds.score > 0 ? '+' : ''}{(ds.score * 100).toFixed(0)}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[#0d1322] overflow-hidden">
                  <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[9px] text-[var(--dim)] mt-4 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-pulse" />
          Sentiment computed from live headlines &amp; X posts across 35+ sources · refreshed on agent runs
        </p>
      </div>
    </section>
  );
}
