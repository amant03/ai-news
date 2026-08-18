'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import t2iData from '@/data/t2i-models.json';

type T2IModel = (typeof t2iData.models)[number];
type Category = 'all' | 'current' | 'open';
type Ranked = 'ranked' | 'all';

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

export default function TextToImageLeaderboard() {
  const [category, setCategory] = useState<Category>('all');
  const [ranked, setRanked] = useState<Ranked>('ranked');
  const [sortBy, setSortBy] = useState<'elo' | 'samples' | 'price'>('elo');

  const sorted = useMemo(() => {
    let models = [...t2iData.models] as T2IModel[];

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

    if (sortBy === 'samples') {
      models.sort((a, b) => b.samples - a.samples);
    } else if (sortBy === 'price') {
      models.sort((a, b) => {
        const pa = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '9999');
        const pb = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '9999');
        return pa - pb;
      });
    } else {
      models.sort((a, b) => b.elo - a.elo);
    }

    return models;
  }, [category, ranked, sortBy]);

  const creators = useMemo(() => {
    const set = new Set((t2iData.models as T2IModel[]).map(m => m.creator));
    return [...set].sort();
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-8">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">Text to Image Leaderboard</h1>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--color-line)]">
              Artificial Analysis
            </span>
            <span className="text-[11px] text-green-600">Updated</span>
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            Ranking of AI image generation models by Elo score from blind user comparisons in the Artificial Analysis Image Arena.
          </p>
          <p className="text-[11px] text-neutral-400 mt-1.5">
            Last synced: {new Date(t2iData.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {t2iData.total} models
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
            {([['elo', 'Elo'], ['samples', 'Samples'], ['price', 'Price']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  sortBy === key
                    ? 'bg-black text-white'
                    : 'text-neutral-500 hover:text-black border border-[var(--color-line)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[960px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  {[
                    { label: 'Rank', w: 60 },
                    { label: 'Range', w: 80 },
                    { label: 'Creator' },
                    { label: 'Model' },
                    { label: 'Elo', w: 80 },
                    { label: '95% CI', w: 80 },
                    { label: 'Samples', w: 90 },
                    { label: 'Released', w: 100 },
                    { label: 'API Pricing', w: 140 },
                  ].map(col => (
                    <th key={col.label} className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: col.w }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, idx) => (
                  <tr key={m.rank} className="border-b border-[var(--color-line)] hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-4 tabular-nums text-neutral-400">{m.rank}</td>
                    <td className="py-2.5 px-4 tabular-nums text-neutral-500 text-[12px]">{m.range}</td>
                    <td className="py-2.5 px-4 font-medium">{m.creator}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium">{m.name}</span>
                      {m.openWeights && (
                        <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full border border-green-600/30 text-green-600">
                          Open
                        </span>
                      )}
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
          1 API Pricing reflects the cost to generate 1,000 images on the model creator&apos;s API at 1024x1024 with the model&apos;s default settings
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
                q: 'Which is the best Text to Image AI model?',
                a: `${sorted[0]?.name || 'GPT Image 2 (high)'} currently leads the Artificial Analysis Text to Image Arena with an Elo score of ${fmtElo(sorted[0]?.elo || 1368)}.`,
              },
              {
                q: 'What are the top Text to Image models?',
                a: `The top Text to Image models by Elo rating are: ${sorted.slice(0, 5).map((m, i) => `${i + 1}. ${m.name} (Elo ${fmtElo(m.elo)})`).join(', ')}. Rankings are based on blind user votes in the Artificial Analysis Image Arena.`,
              },
              {
                q: 'How are Text to Image models ranked on this leaderboard?',
                a: 'Models are ranked using an Elo rating system derived from user votes in blind comparisons in the Artificial Analysis Image Arena. Users compare two images generated from the same prompt without knowing which model created each image. Higher Elo scores indicate a model is preferred more often by users.',
              },
              {
                q: 'Which is the best open weights Text to Image model?',
                a: `Ideogram 4.0 currently leads among open weights models with an Elo score of 1216. There are ${sorted.filter(m => m.openWeights).length} open weights models in the leaderboard.`,
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