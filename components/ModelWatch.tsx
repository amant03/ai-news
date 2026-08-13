'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModelEntry, BenchKey, BENCH_LABELS, providerColor } from '@/lib/models';
import { NewsItem } from '@/lib/types';
import { timeAgo } from '@/lib/format';

interface ModelWatchData {
  models: ModelEntry[];
  leaderboard: ModelEntry[];
  modelNews: NewsItem[];
  updatedAt?: string;
}

export default function ModelWatch() {
  const [data, setData] = useState<ModelWatchData | null>(null);
  const [tab, setTab] = useState<'releases' | 'leaderboard'>('releases');

  useEffect(() => {
    let mounted = true;
    fetch('/api/models')
      .then(r => r.json())
      .then(d => {
        if (mounted) setData(d);
      })
      .catch(() => {});
    const id = setInterval(() => {
      fetch('/api/models')
        .then(r => r.json())
        .then(d => mounted && setData(d))
        .catch(() => {});
    }, 120000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const heroNews = useMemo(() => (data?.modelNews || []).slice(0, 5), [data]);

  if (!data) {
    return (
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-sm uppercase tracking-widest">Model Watch</h2>
        </div>
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[#0a1120] via-[#0d1322] to-[#120a20]">
      {/* Glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-400" />
            </span>
            <div>
              <h2 className="font-display font-bold text-lg tracking-tight gradient-text">MODEL WATCH</h2>
              <p className="text-[11px] text-[var(--mut)]">Frontier releases · benchmarks · X signals</p>
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0a0f1c] border border-[var(--color-line)]">
            <button
              onClick={() => setTab('releases')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'releases' ? 'bg-cyan-400/15 text-cyan-200' : 'text-[var(--mut)] hover:text-[var(--fore)]'
              }`}
            >
              Releases
            </button>
            <button
              onClick={() => setTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === 'leaderboard' ? 'bg-cyan-400/15 text-cyan-200' : 'text-[var(--mut)] hover:text-[var(--fore)]'
              }`}
            >
              Leaderboard
            </button>
          </div>
        </div>

        {tab === 'releases' ? (
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
            {/* Model cards */}
            <div className="grid sm:grid-cols-2 gap-3">
              {(data.models || []).slice(0, 6).map((m, i) => (
                <ModelCard key={m.id} model={m} index={i} />
              ))}
            </div>

            {/* Model news from X / feeds */}
            <div className="surface rounded-xl p-4">
              <h3 className="font-display font-medium text-xs uppercase tracking-widest text-[var(--fore)] mb-3">
                Model Signals
              </h3>
              <div className="space-y-3">
                {heroNews.length === 0 && (
                  <p className="text-xs text-[var(--dim)]">No live model signals yet — the next agent run will fill this.</p>
                )}
                {heroNews.map((n, i) => (
                  <a
                    key={`${n.url}-${i}`}
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: n.source_type === 'twitter' ? '#94a3b8' : '#38bdf8' }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--fore)] leading-snug line-clamp-2 group-hover:text-cyan-300 transition-colors">
                          {n.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-[var(--dim)]">
                          <span>{n.source_label || n.source}</span>
                          <span>·</span>
                          <span>{timeAgo(n.published_at)}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <LeaderboardTable models={data.leaderboard || []} />
        )}
      </div>
    </section>
  );
}

function ModelCard({ model, index }: { model: ModelEntry; index: number }) {
  const color = providerColor(model.provider);
  return (
    <div
      className="surface rounded-xl p-4 animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}1c`, color }}
        >
          {model.provider}
        </span>
        <span
          className={`text-[10px] font-mono uppercase tracking-wider ${
            model.family === 'open-weights' ? 'text-emerald-300' : model.family === 'open' ? 'text-cyan-300' : 'text-[var(--dim)]'
          }`}
        >
          {model.family === 'open-weights' ? 'open' : model.family}
        </span>
      </div>

      <h3 className="font-display font-semibold text-[15px] text-[var(--fore)] mb-1">{model.name}</h3>
      <p className="text-xs text-[var(--mut)] leading-relaxed line-clamp-2 mb-2">{model.description}</p>

      <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--dim)]">
        {model.params && model.params !== '—' && <span>{model.params}</span>}
        {model.context && model.context !== '—' && <span>ctx {model.context}</span>}
        {model.released && <span>{timeAgo(model.released)}</span>}
      </div>

      {model.benchmarks && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--color-line)] grid grid-cols-3 gap-2">
          {Object.entries(model.benchmarks)
            .slice(0, 3)
            .map(([key, val]) => (
              <div key={key}>
                <div className="text-[9px] uppercase tracking-wider text-[var(--dim)]">{BENCH_LABELS[key as BenchKey]?.replace('LMArena ', '')}</div>
                <div className="font-mono text-sm text-cyan-200 tabular-nums">{val}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const BENCH_ORDER: BenchKey[] = ['elo', 'mmlu', 'gpqa', 'swe', 'code'];

function LeaderboardTable({ models }: { models: ModelEntry[] }) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-[var(--dim)] border-b border-[var(--color-line)]">
            <th className="text-left py-2 pr-4 font-medium">Model</th>
            <th className="text-left py-2 pr-4 font-medium">Provider</th>
            {BENCH_ORDER.map(k => (
              <th key={k} className="text-right py-2 pr-3 font-medium">
                {BENCH_LABELS[k].replace('LMArena ', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((m, i) => {
            const color = providerColor(m.provider);
            return (
              <tr key={m.id} className="border-b border-[var(--color-line)]/60 hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[var(--dim)] w-4">{i + 1}</span>
                    <div>
                      <div className="font-medium text-[var(--fore)]">{m.name}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--dim)]">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        {m.family === 'open-weights' ? 'open' : m.family}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-xs text-[var(--mut)]">{m.provider}</td>
                {BENCH_ORDER.map(k => (
                  <td key={k} className="py-2.5 pr-3 text-right font-mono text-[13px] text-cyan-100/90 tabular-nums">
                    {m.benchmarks?.[k] ?? '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[10px] text-[var(--dim)] leading-relaxed">
        Directional snapshot data points — benchmarks differ across evaluation suites and versions.
      </p>
    </div>
  );
}