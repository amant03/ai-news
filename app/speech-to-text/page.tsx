'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import data from '@/data/speech-to-text-models.json';

type Model = (typeof data.models)[number];
type Ranked = 'ranked' | 'all';

const RANKED: { key: Ranked; label: string }[] = [
  { key: 'ranked', label: 'Ranked Models' },
  { key: 'all', label: 'Include Unranked' },
];

function fmtWer(n: number): string {
  return n.toFixed(1);
}

function fmtSpeed(n: number): string {
  return n.toFixed(1) + 'x';
}

function fmtPrice(n: number): string {
  return n === 0 ? 'Free' : '$' + n.toFixed(2);
}

export default function SpeechToTextLeaderboard() {
  const [ranked, setRanked] = useState<Ranked>('ranked');
  const [sortBy, setSortBy] = useState<'wer' | 'speed' | 'price'>('wer');

  const sorted = useMemo(() => {
    let models = [...data.models] as Model[];

    if (ranked === 'ranked') {
      models = models.filter(m => m.wer > 0);
    }

    if (sortBy === 'speed') {
      models.sort((a, b) => b.speedFactor - a.speedFactor);
    } else if (sortBy === 'price') {
      models.sort((a, b) => a.price - b.price);
    } else {
      models.sort((a, b) => a.wer - b.wer);
    }

    return models;
  }, [ranked, sortBy]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-8">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">Speech to Text Leaderboard</h1>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--color-line)]">
              Artificial Analysis
            </span>
            <span className="text-[11px] text-green-600">Updated</span>
          </div>
          <p className="text-sm text-neutral-500 mt-2">
            Ranking of AI speech-to-text models by Word Error Rate (WER) and speed.
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
            {([['wer', 'WER'], ['speed', 'Speed'], ['price', 'Price']] as const).map(([key, label]) => (
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
            <table className="w-full min-w-[800px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  {[
                    { label: 'Rank', w: 60 },
                    { label: 'Model' },
                    { label: 'Provider' },
                    { label: 'WER (%)', w: 100 },
                    { label: 'Speed Factor', w: 120 },
                    { label: 'Price', w: 100 },
                  ].map(col => (
                    <th key={col.label} className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 whitespace-nowrap" style={{ width: col.w }}>
                      {col.label}
                    </th>
                  ))}
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
                    <td className="py-2.5 px-4 tabular-nums font-semibold">{fmtWer(m.wer)}</td>
                    <td className="py-2.5 px-4 tabular-nums text-neutral-500">{fmtSpeed(m.speedFactor)}</td>
                    <td className="py-2.5 px-4 tabular-nums text-[12px]">
                      {m.price === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        <span>{fmtPrice(m.price)}</span>
                      )}
                    </td>
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
          <div className="flex items-baseline gap-3 mb-5">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4 max-w-3xl">
            {[
              {
                q: 'Which is the best Speech to Text AI model?',
                a: `${sorted[0]?.name || 'AssemblyAI'} currently leads with the lowest Word Error Rate (WER) of ${fmtWer(sorted[0]?.wer || 3.1)}.`,
              },
              {
                q: 'What are the top Speech to Text models?',
                a: `The top Speech to Text models by WER are: ${sorted.slice(0, 5).map((m, i) => `${i + 1}. ${m.name} (WER ${fmtWer(m.wer)}%)`).join(', ')}.`,
              },
              {
                q: 'How are Speech to Text models ranked?',
                a: 'Models are ranked by Word Error Rate (WER), which measures the percentage of words incorrectly transcribed. Lower WER indicates better accuracy. Speed Factor shows how many times faster than real-time the model processes audio.',
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
