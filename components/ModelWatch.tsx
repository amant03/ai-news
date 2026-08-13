'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModelRecord } from '@/lib/model-registry';
import { NewsItem } from '@/lib/types';
import { timeAgo } from '@/lib/format';
import { providerColor } from '@/lib/models';

interface ModelWatchData {
  models: ModelRecord[];
  leaderboard: ModelRecord[];
  modelNews: NewsItem[];
  catalog?: { total: number; withPricing: number; withBenchmarks: number; updatedAt: string } | null;
}

type SortKey = 'intelligence' | 'value' | 'popularity' | 'newest';

const TABS: Array<{ key: SortKey; label: string; hint: string }> = [
  { key: 'intelligence', label: 'Leaderboard', hint: 'Intelligence index' },
  { key: 'value', label: 'Value', hint: 'Intelligence per $' },
  { key: 'popularity', label: 'Popularity', hint: 'Downloads + buzz' },
  { key: 'newest', label: 'Newest', hint: 'Latest releases' },
];

const fmtNum = (n?: number, digits = 1) => (n === undefined ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: digits }));
const fmtCompact = (n?: number) => {
  if (n === undefined) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

export default function ModelWatch() {
  const [data, setData] = useState<ModelWatchData | null>(null);
  const [tab, setTab] = useState<SortKey>('intelligence');
  const [q, setQ] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch(`/api/models?sort=${tab}&limit=50`)
        .then(r => r.json())
        .then(d => mounted && setData(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 180000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [tab]);

  const models = useMemo(() => {
    if (!q.trim()) return data?.models || [];
    const s = q.toLowerCase();
    return (data?.models || []).filter(m =>
      m.name.toLowerCase().includes(s) ||
      m.provider.toLowerCase().includes(s) ||
      (m.description || '').toLowerCase().includes(s)
    );
  }, [data, q]);

  const heroNews = useMemo(() => (data?.modelNews || []).slice(0, 5), [data]);
  const activeTab = TABS.find(t => t.key === tab) || TABS[0];

  if (!data) {
    return (
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-medium text-sm uppercase tracking-widest">Model Watch</h2>
          <span className="h-2 w-2 rounded-full bg-cyan-400/60 animate-pulse" />
        </div>
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[#0a1120] via-[#0d1322] to-[#120a20]">
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-400" />
            </span>
            <div>
              <h2 className="font-display font-bold text-lg tracking-tight gradient-text">MODEL WATCH</h2>
              <p className="text-[11px] text-[var(--mut)]">
                {data.catalog?.total || 0} models · OpenRouter + Artificial Analysis + Hugging Face + X
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search models…"
              className="ring-focus w-40 sm:w-52 rounded-lg border border-[var(--color-line)] bg-[#0a0f1c]/80 px-3 py-1.5 text-xs text-[var(--fore)] placeholder:text-[var(--mut)] outline-none focus:border-cyan-400/40"
              aria-label="Search models"
            />
            <span className="hidden sm:block font-mono text-[10px] text-[var(--dim)]">{activeTab.hint}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 flex-wrap" role="tablist">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`ring-focus rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/40'
                    : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* List */}
        {models.length === 0 ? (
          <p className="text-sm text-[var(--dim)] py-8 text-center">No models match “{q}”.</p>
        ) : (
          <div className="grid gap-2.5">
            {models.slice(0, 20).map((m, i) => (
              <ModelRow key={m.id} m={m} idx={i + 1} sort={tab} />
            ))}
          </div>
        )}

        {/* Release headlines */}
        {heroNews.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--color-line)]">
            <h3 className="font-display font-medium text-xs uppercase tracking-widest text-[var(--mut)] mb-3">Release Radar</h3>
            <div className="space-y-2.5">
              {heroNews.map((n, i) => (
                <a key={`${n.url}-${i}`} href={n.url} target="_blank" rel="noopener noreferrer" className="block group">
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
        )}
      </div>
    </section>
  );
}

function ModelRow({ m, idx, sort }: { m: ModelRecord; idx: number; sort: SortKey }) {
  const color = providerColor(m.provider);
  const isTop3 = idx <= 3;
  const rankChip =
    idx === 1 ? 'bg-amber-400/15 text-amber-300 border-amber-400/40' :
    idx === 2 ? 'bg-slate-400/15 text-slate-300 border-slate-400/40' :
    idx === 3 ? 'bg-orange-400/15 text-orange-300 border-orange-400/40' :
    'bg-[var(--color-line)] text-[var(--dim)] border-[var(--color-line)]';

  return (
    <div className="group rounded-xl border border-[var(--color-line)] bg-[#0a0f1c]/70 p-3 hover:border-cyan-400/30 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`font-mono text-[10px] font-bold w-6 h-6 text-center rounded-md border flex items-center justify-center flex-shrink-0 ${rankChip}`}>
          {idx}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className={`font-display text-sm font-semibold ${isTop3 ? 'text-cyan-100' : 'text-[var(--fore)]'}`}>
              {m.name}
            </span>
            <span className="text-[10px] text-[var(--dim)]">{m.provider}</span>
            <span className={`text-[9px] px-1.5 rounded-full border ${m.family === 'open-weights' ? 'border-emerald-400/30 text-emerald-300 bg-emerald-400/5' : 'border-[var(--color-line)] text-[var(--dim)]'}`}>
              {m.family === 'open-weights' ? 'open-weights' : 'closed'}
            </span>
            {m.released && (
              <span className="text-[10px] font-mono text-[var(--dim)]">{m.released.slice(0, 10)}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {m.intelligenceIndex !== undefined && <Metric label="Int" value={fmtNum(m.intelligenceIndex)} accent />}
            {m.codingIndex !== undefined && <Metric label="Code" value={fmtNum(m.codingIndex)} />}
            {m.agenticIndex !== undefined && <Metric label="Agent" value={fmtNum(m.agenticIndex)} />}
            {m.promptPrice !== undefined && <Metric label="$/1M" value={`$${fmtNum(m.promptPrice, 2)}`} />}
            {m.context && <Metric label="Ctx" value={m.context} />}
            {m.params && <Metric label="Params" value={m.params} />}
            {m.hfDownloads !== undefined && <Metric label="HF" value={fmtCompact(m.hfDownloads)} title="Hugging Face downloads" />}
            {m.mentions ? <Metric label="Mentions" value={String(m.mentions)} /> : null}
          </div>
          {m.description && (
            <p className="text-[11px] text-[var(--mut)] leading-relaxed line-clamp-1 mt-1.5">{m.description}</p>
          )}
        </div>
        {sort === 'value' && m.valueScore !== undefined && (
          <div className="hidden sm:block text-right flex-shrink-0">
            <div className="font-mono text-lg font-bold text-emerald-300/90 leading-none">{fmtNum(m.valueScore)}</div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--dim)] mt-1">Value</div>
          </div>
        )}
        {sort === 'intelligence' && m.intelligenceIndex !== undefined && (
          <div className="hidden sm:block text-right flex-shrink-0">
            <div className="font-mono text-lg font-bold text-cyan-300/90 leading-none">{fmtNum(m.intelligenceIndex)}</div>
            <div className="text-[9px] uppercase tracking-wider text-[var(--dim)] mt-1">Int index</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, accent, title }: { label: string; value: string; accent?: boolean; title?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1" title={title}>
      <span className={`font-mono text-[11px] font-semibold ${accent ? 'text-cyan-300' : 'text-[var(--fore)]'}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-[var(--mut)]">{label}</span>
    </span>
  );
}
