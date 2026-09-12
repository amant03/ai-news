'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/SectionHeader';
import InsightCallout from '@/components/InsightCallout';
import Footer from '@/components/Footer';
import { leaderboardInsight } from '@/lib/insights';
import { preferredSlug } from '@/lib/model-slug';
import type { ModelRecord } from '@/lib/model-registry';

type Metric = 'intelligence' | 'speed' | 'costPerTask' | 'price' | 'context' | 'latency';

const METRICS: { key: Metric; label: string; dir: 'asc' | 'desc'; hint: string }[] = [
  { key: 'intelligence', label: 'Intelligence', dir: 'desc', hint: 'Intelligence score · higher is better' },
  { key: 'speed', label: 'Output Speed', dir: 'desc', hint: 'Median output tokens/sec · higher is better' },
  { key: 'latency', label: 'Latency', dir: 'asc', hint: 'Time to first token · lower is better' },
  { key: 'costPerTask', label: 'Cost per Task', dir: 'asc', hint: 'USD per benchmark task · lower is better' },
  { key: 'price', label: 'Price', dir: 'asc', hint: 'Blended USD per 1M tokens · lower is better' },
  { key: 'context', label: 'Context Window', dir: 'desc', hint: 'Max input tokens · higher is better' },
];

const isOpen = (m: ModelRecord) => m.family === 'open-weights' || m.family === 'open';

function contextTokens(c: string | undefined): number | undefined {
  if (!c) return undefined;
  const m = c.trim().match(/^([\d.]+)\s*([MK])?/i);
  if (!m) return undefined;
  const v = parseFloat(m[1]);
  if (isNaN(v)) return undefined;
  const u = (m[2] || '').toUpperCase();
  if (u === 'M') return v * 1_000_000;
  if (u === 'K') return v * 1_000;
  return v;
}

function blended(m: ModelRecord): number | undefined {
  if (m.promptPrice == null && m.completionPrice == null) return undefined;
  return ((m.promptPrice ?? m.completionPrice ?? 0) + (m.completionPrice ?? m.promptPrice ?? 0)) / 2;
}

function valueOf(m: ModelRecord, key: Metric): number | undefined {
  switch (key) {
    case 'intelligence': return m.intelligenceIndex ?? undefined;
    case 'speed': return m.aaSpeed ?? undefined;
    case 'latency': return m.aaLatency ?? undefined;
    case 'costPerTask': return m.aaCostPerTask ?? undefined;
    case 'price': return blended(m);
    case 'context': return contextTokens(m.context);
  }
}

function fmtPrice(v: number | undefined): string {
  if (v === undefined) return '—';
  return v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

export default function LeaderboardsPage() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('intelligence');
  const [q, setQ] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch('/api/models/catalog')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (mounted && Array.isArray(d?.models)) {
          setModels(d.models);
          setUpdatedAt(typeof d.updatedAt === 'string' ? d.updatedAt : null);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const active = METRICS.find(m => m.key === metric)!;

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = models.filter(m => valueOf(m, metric) !== undefined);
    if (query) {
      list = list.filter(
        m =>
          m.name.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query)
      );
    }
    const byMetric = [...list].sort((a, b) => {
      const av = valueOf(a, metric);
      const bv = valueOf(b, metric);
      if (av === undefined && bv === undefined) return a.name.localeCompare(b.name);
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      return active.dir === 'desc' ? bv - av : av - bv;
    });
    return byMetric.slice(0, 100);
  }, [models, metric, q, active.dir]);

  const insight = useMemo(() => (models.length ? leaderboardInsight(models) : null), [models]);

  return (
    <div className="min-h-screen">
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-6">
          <div className="kicker mb-2">Leaderboards</div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-[var(--fore)]">
              LLM Leaderboard
            </h1>
            {updatedAt ? (
              <span className="badge-updated" title={`Last synced ${updatedAt}`}>Updated</span>
            ) : (
              <span role="status" className="skeleton h-5 w-16 rounded-full" aria-label="Checking update status" />
            )}
          </div>
          <p className="text-sm text-[var(--mut)] mt-2 max-w-[70ch]">
            Compare frontier AI models by intelligence, speed, latency, cost and context window.
            Rankings refresh with every data sync.
          </p>
          <InsightCallout text={insight} />
          <p className="mt-3">
            <Link href="/models" className="text-sm font-medium text-[var(--accent-hover)] hover:underline">
              View all models →
            </Link>
          </p>
        </div>

        {/* Metric tabs */}
        <div className="flex gap-2 flex-wrap mb-4 items-center">
          <div className="aa-tabbar" role="tablist" aria-label="Rank models by">
            {METRICS.map(m => (
              <button
                key={m.key}
                role="tab"
                aria-selected={metric === m.key}
                onClick={() => {
                  setMetric(m.key);
                }}
                className={`ring-focus aa-tab ${metric === m.key ? 'aa-tab-active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search models…"
            aria-label="Search leaderboard"
            className="rounded-full border border-[var(--color-line)] bg-[var(--input)] px-3.5 py-1.5 text-[12px] text-[var(--fore)] placeholder:text-[var(--mut)] outline-none focus:border-[var(--accent)]/40"
          />
        </div>
        <p className="text-[11px] text-[var(--mut)] mb-4">{active.hint} · showing top {rows.length}</p>

        {/* Ranked table */}
        <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
          <div className="overflow-auto no-scrollbar table-scroll max-h-[75vh]">
            <table className="leaderboard-table w-full min-w-[880px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap" style={{ width: 56 }}>Rank</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Model</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Creator</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap text-right">Intelligence</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap text-right">Speed t/s</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap text-right">Cost / task</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap text-right">Price /1M</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap text-right">Context</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={m.id} className="border-b border-[var(--color-line)] last:border-b-0 hover:bg-[var(--surface)] transition-colors">
                    <td className="py-2.5 px-4 tabular-nums text-[var(--mut)]">{i + 1}</td>
                    <td className="py-2.5 px-4 font-medium">
                      <Link href={`/models/${preferredSlug(m)}`} className="hover:underline">{m.name}</Link>
                    </td>
                    <td className="py-2.5 px-4 text-[var(--mut)]">{m.provider}</td>
                    <td className="py-2.5 px-4 tabular-nums text-right font-semibold">{m.intelligenceIndex ?? '—'}</td>
                    <td className="py-2.5 px-4 tabular-nums text-right">{m.aaSpeed ?? '—'}</td>
                    <td className="py-2.5 px-4 tabular-nums text-right">{m.aaCostPerTask != null ? `$${m.aaCostPerTask.toFixed(2)}` : '—'}</td>
                    <td className="py-2.5 px-4 tabular-nums text-right text-[var(--mut)]">{fmtPrice(blended(m))}</td>
                    <td className="py-2.5 px-4 tabular-nums text-right text-[var(--mut)]">{m.context ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${isOpen(m) ? 'bg-[var(--ok-ink)]/10 text-[var(--ok-ink)]' : 'bg-[var(--bad)]/10 text-[var(--bad)]'}`}>
                        {isOpen(m) ? 'Open' : 'Closed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {q.trim() && rows.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--mut)]">
            No models match &quot;{q.trim()}&quot;.{' '}
            <button onClick={() => setQ('')} className="font-medium text-[var(--accent-hover)] hover:underline">
              Clear search
            </button>
          </p>
        )}

        {/* Key definitions */}
        <section className="mt-12">
          <SectionHeader kicker="Definitions" title="Key definitions" rule={false} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
            {[
              ['Intelligence', 'Composite benchmark score across reasoning, coding, math and knowledge evaluations. Higher is better.'],
              ['Output speed', 'Median output tokens per second across benchmarked API providers. Higher is better.'],
              ['Latency', 'Median seconds to the first answer token. Lower is better.'],
              ['Cost per task', 'Measured USD per benchmark task. Lower is better.'],
              ['Price /1M', 'Blended list price per 1M tokens (input + output average). Lower is better.'],
              ['Context window', 'Maximum input tokens the model accepts in one request. Higher is better.'],
            ].map(([term, def]) => (
              <div key={term} className="border border-[var(--color-line)] rounded-lg p-4">
                <p className="text-sm font-semibold">{term}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--mut)]">{def}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <SectionHeader kicker="Answers" title="Frequently Asked Questions" rule={false} />
          <div className="space-y-3 max-w-3xl">
            {[
              {
                q: 'How are models ranked on this leaderboard?',
                a: 'Pick a metric tab above — Intelligence, Speed, Latency, Cost or Price — and the top 100 models re-rank instantly. Rankings refresh with every data sync.',
              },
              {
                q: 'What is the Intelligence score?',
                a: 'A 0–100 composite of challenging evaluations spanning reasoning, coding, mathematics and knowledge. Higher means more capable.',
              },
              {
                q: 'Which models are open weights?',
                a: 'Rows badged Open publish their weights for self-hosting; Closed models are API-only. Use the Type column to tell them apart.',
              },
            ].map((faq, i) => (
              <div key={i} className="border border-[var(--color-line)] rounded-lg p-5">
                <h3 className="font-semibold text-[14px] mb-2">{faq.q}</h3>
                <p className="text-[13px] text-[var(--mut)] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
