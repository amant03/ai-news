'use client';

import { useEffect, useState } from 'react';
import { SentimentReport } from '@/lib/sentiment';

/**
 * Compact AI Mood badge. Shows just "Bullish" or "Bearish" by default.
 * Click to expand and see the breakdown (positive / neutral / negative counts)
 * and the reasoning.
 */
export default function MoodIndicator() {
  const [data, setData] = useState<SentimentReport | null>(null);
  const [expanded, setExpanded] = useState(false);

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
      <section className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-[var(--fore)]">
            AI Mood
          </h3>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]/60 animate-pulse" />
        </div>
        <div className="skeleton h-6 rounded-full" />
      </section>
    );
  }

  const mood = data.landscape.mood;
  const isBullish = mood === 'bullish' || mood === 'euphoric';
  const isBearish = mood === 'bearish' || mood === 'cautious';
  const label = isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Neutral';
  const color = isBullish ? '#22d3ee' : isBearish ? '#fb7185' : '#94a3b8';
  const icon = isBullish ? '▲' : isBearish ? '▼' : '◆';

  return (
    <section className="glass rounded-2xl p-4">
      <button
        onClick={() => setExpanded(v => !v)}
        className="ring-focus w-full text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-[var(--fore)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ok)] mr-2 align-middle animate-pulse" />
            AI Mood
          </h3>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color }}>
            {icon} {label}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="relative h-2 rounded-full bg-[var(--input)] overflow-hidden">
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(0, (data.landscape.score + 1) * 50))}%`,
                background: 'linear-gradient(90deg, #fb7185, #fbbf24 50%, #34d399)',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[var(--dim)]">
            <span>bearish −</span>
            <span>{data.landscape.total} signals</span>
            <span>+ euphoric</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-[var(--ok)]/10 border border-[var(--ok)]/20 py-1.5">
              <div className="font-mono text-[13px] font-bold text-[var(--ok)]">{data.landscape.positive}</div>
              <div className="text-[9px] uppercase tracking-widest text-[var(--dim)]">Positive</div>
            </div>
            <div className="rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/20 py-1.5">
              <div className="font-mono text-[13px] font-bold text-[var(--info)]">{data.landscape.neutral}</div>
              <div className="text-[9px] uppercase tracking-widest text-[var(--dim)]">Neutral</div>
            </div>
            <div className="rounded-lg bg-[var(--bad)]/10 border border-[var(--bad)]/20 py-1.5">
              <div className="font-mono text-[13px] font-bold text-[var(--bad)]">{data.landscape.negative}</div>
              <div className="text-[9px] uppercase tracking-widest text-[var(--dim)]">Negative</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}