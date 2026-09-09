'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import data from '@/data/image-to-video-models.json';
import SortableTh from '@/components/SortableTh';
import { sortByCol, toggleSort, type ColSort, type SortDir } from '@/lib/sortable';

type Model = (typeof data.models)[number];
type Category = 'all' | 'current' | 'open';
type Ranked = 'ranked' | 'all';
type SortKey = 'creator' | 'model' | 'elo' | 'samples' | 'released' | 'price' | 'rank';

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  creator: 'asc',
  model: 'asc',
  elo: 'desc',
  samples: 'desc',
  released: 'desc',
  price: 'asc',
  rank: 'asc',
};

function parsePrice(s: string | undefined): number | undefined {
  if (!s || s.includes('No API') || s.includes('Coming soon')) return undefined;
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? undefined : n;
}

function dateVal(s: string): number | undefined {
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.getTime();
}

function valueOf(m: Model, key: SortKey): number | string | undefined {
  switch (key) {
    case 'creator': return m.creator;
    case 'model': return m.name;
    case 'elo': return m.elo;
    case 'samples': return m.samples;
    case 'released': return dateVal(m.released);
    case 'price': return parsePrice(m.price);
    case 'rank': return m.rank;
  }
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'current', label: 'Current Models' },
  { key: 'open', label: 'Open Weights' },
];

const RANKED: { key: Ranked; label: string }[] = [
  { key: 'ranked', label: 'Ranked Models' },
  { key: 'all', label: 'Include Unranked' },
];

function fmtElo(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtSamples(n: number): string {
  return n.toLocaleString('en-US');
}

function parseReleased(released: string): Date | null {
  const d = new Date(released);
  return isNaN(d.getTime()) ? null : d;
}

export default function ImageToVideoLeaderboard() {
  const [category, setCategory] = useState<Category>('all');
  const [ranked, setRanked] = useState<Ranked>('ranked');
  const [sort, setSort] = useState<ColSort<SortKey>>({ key: 'elo', dir: 'desc' });

  const sorted = useMemo(() => {
    let models = [...data.models] as Model[];

    if (category === 'current') {
      const cutoff = new Date('2025-06-01');
      models = models.filter(m => {
        const d = parseReleased(m.released);
        return d && d >= cutoff;
      });
    } else if (category === 'open') {
      models = models.filter(m => m.openWeights);
    }

    if (ranked === 'ranked') {
      models = models.filter(m => !m.price?.includes('No API'));
    }

    return sortByCol(models, sort, (m, key) => valueOf(m, key), (a, b) => a.rank - b.rank);
  }, [category, ranked, sort]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-8">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">Image to Video Leaderboard</h1>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--color-line)]">
              Artificial Analysis
            </span>
            <span className="text-[11px] text-green-600">Updated</span>
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            Ranking of AI image-to-video generation models by Elo score from blind user comparisons in the Artificial Analysis Image to Video Arena.
          </p>
          <p className="text-[11px] text-neutral-400 mt-1.5">
            Last synced: {new Date(data.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {data.total} models
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          <div className="flex gap-1">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  category === c.key
                    ? 'bg-black text-white'
                    : 'text-neutral-500 hover:text-black border border-[var(--color-line)]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <span className="w-px h-5 bg-neutral-200 mx-1 self-center" aria-hidden />
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
            {([['elo', 'Elo'], ['samples', 'Samples'], ['price', 'Price']] as const).map(([key, label]) => {
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
            <table className="w-full min-w-[960px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: 60 }}>Rank</th>
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: 80 }}>Range</th>
                  <SortableTh label="Creator" active={sort?.key === 'creator'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'creator', 'asc'))} />
                  <SortableTh label="Model" active={sort?.key === 'model'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'model', 'asc'))} />
                  <SortableTh label="Elo" width={80} active={sort?.key === 'elo'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'elo', 'desc'))} />
                  <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: 80 }}>95% CI</th>
                  <SortableTh label="Samples" width={90} active={sort?.key === 'samples'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'samples', 'desc'))} />
                  <SortableTh label="Released" width={100} active={sort?.key === 'released'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'released', 'desc'))} />
                  <SortableTh label="API Pricing" width={140} active={sort?.key === 'price'} dir={sort?.dir} onToggle={() => setSort(prev => toggleSort(prev, 'price', 'asc'))} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr key={m.rank} className="border-b border-[var(--color-line)] hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-4 tabular-nums text-neutral-400">{m.rank}</td>
                    <td className="py-2.5 px-4 tabular-nums text-neutral-500 text-[12px]">{m.range}</td>
                    <td className="py-2.5 px-4 font-medium">{m.creator}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium">{m.name}</span>
                    </td>
                    <td className="py-2.5 px-4 tabular-nums font-semibold">{fmtElo(m.elo)}</td>
                    <td className="py-2.5 px-4 tabular-nums text-neutral-500 text-[12px]">{m.ci}</td>
                    <td className="py-2.5 px-4 tabular-nums text-neutral-500">{fmtSamples(m.samples)}</td>
                    <td className="py-2.5 px-4 tabular-nums text-neutral-500">{m.released}</td>
                    <td className="py-2.5 px-4 tabular-nums text-[12px]">
                      {m.price?.includes('No API') ? (
                        <span className="text-neutral-400">No API</span>
                      ) : m.price?.includes('Coming soon') ? (
                        <span className="text-neutral-400">Coming soon</span>
                      ) : (
                        <span>{m.price}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 mt-4">
          1 API Pricing reflects the cost to generate 1,000 images on the model creator&apos;s API at the model&apos;s default settings
        </p>

        {/* FAQ */}
        <section className="mt-12">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4 max-w-3xl">
            {[
              {
                q: 'Which is the best Image to Video AI model?',
                a: `${sorted[0]?.name || 'Dreamina Seedance 2.0 720p'} currently leads the Artificial Analysis Image to Video Arena with an Elo score of ${fmtElo(sorted[0]?.elo || 1197)}.`,
              },
              {
                q: 'What are the top Image to Video models?',
                a: `The top Image to Video models by Elo rating are: ${sorted.slice(0, 5).map((m, i) => `${i + 1}. ${m.name} (Elo ${fmtElo(m.elo)})`).join(', ')}. Rankings are based on blind user votes in the Artificial Analysis Image to Video Arena.`,
              },
              {
                q: 'How are Image to Video models ranked on this leaderboard?',
                a: 'Models are ranked using an Elo rating system derived from user votes in blind comparisons in the Artificial Analysis Image to Video Arena. Users compare two videos generated from the same input image without knowing which model created each video. Higher Elo scores indicate a model is preferred more often by users.',
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
