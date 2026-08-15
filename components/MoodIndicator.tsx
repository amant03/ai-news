'use client';

import { useEffect, useState } from 'react';
import { SentimentReport } from '@/lib/sentiment';

const MOOD_META: Record<string, { label: string; color: string; icon: string }> = {
  euphoric: { label: 'Euphoric', color: '#34d399', icon: '▲' },
  bullish: { label: 'Bullish', color: '#22d3ee', icon: '▲' },
  neutral: { label: 'Neutral', color: '#94a3b8', icon: '◆' },
  cautious: { label: 'Cautious', color: '#fbbf24', icon: '▼' },
  bearish: { label: 'Bearish', color: '#fb7185', icon: '▼' },
};

/**
 * Compact, always-visible AI Mood gauge for the sidebar rail. Mirrors the
 * full AIRadar panel but stays small so it never pushes the calendar below
 * the fold.
 */
export default function MoodIndicator() {
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
  const meta = MOOD_META[mood] || MOOD_META.neutral;
  const scorePct = Math.min(100, Math.max(0, (data.landscape.score + 1) * 50));

  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-[var(--fore)]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ok)] mr-2 align-middle animate-pulse" />
          AI Mood
        </h3>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: meta.color }}>
          {meta.icon} {meta.label}
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-[var(--input)] overflow-hidden">
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${scorePct}%`,
            background: 'linear-gradient(90deg, #fb7185, #fbbf24 50%, #34d399)',
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-[var(--dim)] mt-1.5">
        <span>bearish −</span>
        <span>{data.landscape.total} signals</span>
        <span>+ euphoric</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
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
    </section>
  );
}