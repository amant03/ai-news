'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import SectionHeader from '@/components/SectionHeader';
import data from '@/data/text-to-speech-models.json';
import SortableTh from '@/components/SortableTh';
import { sortByCol, toggleSort, type ColSort, type SortDir } from '@/lib/sortable';

type Model = (typeof data.models)[number];
type Ranked = 'ranked' | 'all';
type SortKey = 'model' | 'provider' | 'elo' | 'price' | 'speed';

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  model: 'asc',
  provider: 'asc',
  elo: 'desc',
  price: 'asc',
  speed: 'desc',
};

function valueOf(m: Model, key: SortKey): number | string | undefined {
  switch (key) {
    case 'model': return m.name;
    case 'provider': return m.provider;
    case 'elo': return m.qualityElo ?? undefined;
    case 'price': return m.price ?? undefined;
    case 'speed': return m.speedFactor ?? undefined;
  }
}

const RANKED: { key: Ranked; label: string }[] = [
  { key: 'ranked', label: 'Ranked Models' },
  { key: 'all', label: 'Include Unranked' },
];

function fmtElo(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-US');
}

function fmtSpeed(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(0) + 'x';
}

function fmtPrice(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return '$' + n.toFixed(2);
}

export default function TextToSpeechLeaderboard() {
  const [ranked, setRanked] = useState<Ranked>('ranked');
  const [sort, setSort] = useState<ColSort<SortKey>>({ key: 'elo', dir: 'desc' });

  const sorted = useMemo(() => {
    let models = [...data.models] as Model[];

    if (ranked === 'ranked') {
      models = models.filter(m => m.qualityElo !== null);
    }

    return sortByCol(models, sort, (m, key) => valueOf(m, key), (a, b) => a.rank - b.rank);
  }, [ranked, sort]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-8">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">Text to Speech Leaderboard</h1>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--color-line)]">
              Artificial Analysis
            </span>
            <span className="text-[11px] text-green-600">Updated</span>
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            Ranking of AI text-to-speech models by quality Elo, price, and speed.
          </p>
          <p className="text-[11px] text-neutral-400 mt-1.5">
            Last synced: {new Date(data.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {data.total} models
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          <div className="flex gap-1">
            {RANKED.map(r => (
              <button
                key={r.key}
                onClick={() => setRanked(r.key)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  ranked === r.key
                    ? 'bg-black text-white'
                    : 'text-neutral-500 hover:text-black border border-[var(--color-line)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="w-px h-5 bg-neutral-200 mx-1 self-center" aria-hidden />
          <div className="flex gap-1">
            {([['elo', 'Quality Elo'], ['price', 'Price'], ['speed', 'Speed']] as const).map(([key, label]) => {
              const active = sort?.key === key;
              return (
                <button
                  key={key}
                  onClick={() => setSort(prev => toggleSort(prev, key, DEFAULT_DIR[key]))}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-black text-white'
                      : 'text-neutral-500 hover:text-black border border-[var(--color-line)]'
                  }`}
                >
                  {label}
                  {active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[800px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: 60 }}>Rank</th>
                  <SortableTh label="Model" active={sort?.key === 'model'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'model', 'asc'))} />
                  <SortableTh label="Provider" active={sort?.key === 'provider'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'provider', 'asc'))} />
                  <SortableTh label="Quality Elo" width={110} active={sort?.key === 'elo'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'elo', 'desc'))} />
                  <SortableTh label="Price" width={100} active={sort?.key === 'price'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'price', 'asc'))} />
                  <SortableTh label="Speed Factor" width={120} active={sort?.key === 'speed'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'speed', 'desc'))} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr key={m.rank} className="border-b border-[var(--color-line)] hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-4 tabular-nums text-neutral-400">{m.rank}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium">{m.name}</span>
                    </td>
                    <td className="py-2.5 px-4 font-medium">{m.provider}</td>
                    <td className="py-2.5 px-4 tabular-nums font-semibold">{fmtElo(m.qualityElo)}</td>
                    <td className="py-2.5 px-4 tabular-nums text-[12px]">
                      {m.price === null ? (
                        <span className="text-neutral-400">—</span>
                      ) : m.price === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        <span>{fmtPrice(m.price)}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 tabular-nums text-neutral-500">{fmtSpeed(m.speedFactor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 mt-4">
          1 Price reflects the cost per million characters for the model&apos;s API
        </p>

        {/* FAQ */}
        <section className="mt-12">
          <SectionHeader kicker="Answers" title="Frequently Asked Questions" rule={false} />
          <div className="space-y-4 max-w-3xl">
            {[
              {
                q: 'Which is the best Text to Speech AI model?',
                a: `${sorted[0]?.name || 'Sonic 3.6'} currently leads the leaderboard with a quality Elo of ${fmtElo(sorted[0]?.qualityElo || 1283)}.`,
              },
              {
                q: 'What are the top Text to Speech models?',
                a: `The top Text to Speech models by quality are: ${sorted.filter(m => m.qualityElo).slice(0, 5).map((m, i) => `${i + 1}. ${m.name} (Elo ${fmtElo(m.qualityElo)})`).join(', ')}.`,
              },
              {
                q: 'How are Text to Speech models ranked?',
                a: 'Models are ranked by quality Elo score, which measures perceived speech quality. Speed Factor indicates how many times faster than real-time the model generates audio. Lower price is better for cost efficiency.',
              },
            ].map((faq, i) => (
              <div key={i} className="border border-[var(--color-line)] rounded-lg p-5">
                <h3 className="font-semibold text-[14px] mb-2">{faq.q}</h3>
                <p className="text-[13px] text-neutral-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
