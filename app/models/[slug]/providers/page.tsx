import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import path from 'path';
import fs from 'fs';
import { readModelDatabase } from '@/lib/model-registry';
import { SITE_NAME } from '@/lib/site';

export const dynamic = 'force-dynamic';

const DATA_FILE = path.join(process.cwd(), 'data', 'aa-providers.json');

interface ProviderRow {
  name: string;
  context: string;
  license: string;
  functionCalling: boolean;
  jsonMode: boolean;
  costPerTask: number;
  speed: number | null;
  firstChunk: number | null;
  totalResponse: number | null;
  reasoningTime: number | null;
  blendedPrice: number;
  inputPrice: number;
  outputPrice: number;
}

interface ProvidersFile {
  models: Record<string, { name: string; provider: string; released?: string; family?: string; blendRatio?: string; providers: ProviderRow[] }>;
}

interface Props {
  params: Promise<{ slug: string }>;
}

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function loadProviders(): ProvidersFile | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as ProvidersFile;
  } catch {
    return null;
  }
}

function best<T>(rows: ProviderRow[], key: (r: ProviderRow) => T, cmp: (a: T, b: T) => number): ProviderRow | null {
  const valid = rows.filter(r => key(r) !== null && key(r) !== undefined) as unknown as ProviderRow[];
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (cmp(key(a), key(b)) <= 0 ? a : b));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pf = loadProviders();
  const entry = pf?.models[slug];
  if (!entry) return { title: `Providers not found · ${SITE_NAME}` };
  return {
    title: `${entry.name} — API Provider Performance Benchmarking & Price Analysis`,
    description: `Compare ${entry.providers.length} API providers for ${entry.name} across output speed, latency and price.`,
  };
}

export default async function ProvidersPage({ params }: Props) {
  const { slug } = await params;
  const pf = loadProviders();
  const entry = pf?.models[slug];
  if (!entry || !entry.providers.length) notFound();

  const db = readModelDatabase();
  const model = db?.models.find(m => slugOf(m.name) === slug);

  const rows = entry.providers;
  const fastest = best(rows, r => r.speed, (a, b) => (b as number) - (a as number));
  const lowestLatency = best(rows, r => r.firstChunk, (a, b) => (a as number) - (b as number));
  const cheapest = best(rows, r => r.blendedPrice, (a, b) => (a as number) - (b as number));
  const top5Speed = [...rows].filter(r => r.speed != null).sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0)).slice(0, 5);
  const top5Latency = [...rows].filter(r => r.firstChunk != null).sort((a, b) => (a.firstChunk ?? 0) - (b.firstChunk ?? 0)).slice(0, 5);
  const top5Price = [...rows].filter(r => r.blendedPrice != null).sort((a, b) => (a.blendedPrice ?? 0) - (b.blendedPrice ?? 0)).slice(0, 5);

  const speeds = rows.filter(r => r.speed != null).map(r => r.speed as number);
  const speedSpread = speeds.length > 1 ? (Math.max(...speeds) / Math.min(...speeds)) * 100 : 0;
  const prices = rows.filter(r => r.blendedPrice != null).map(r => r.blendedPrice as number);
  const priceSpread = prices.length > 1 ? Math.max(...prices) / Math.min(...prices) : 0;

  return (
    <main className="max-w-[1200px] mx-auto px-5 pt-8 pb-16">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/models" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">
          ← Models
        </Link>
        <Link href={`/models/${slug}`} className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">
          Model Comparison
        </Link>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {entry.name} <span className="text-neutral-400">API Provider Benchmarking &amp; Analysis</span>
        </h1>
        <div className="flex items-center gap-2 mt-3 flex-wrap text-[12px]">
          <span className="text-neutral-500">{entry.provider}</span>
          {entry.family && (
            <>
              <span className="text-neutral-300">•</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                entry.family === 'open-weights' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {entry.family === 'open-weights' ? 'Open weights model' : 'Proprietary model'}
              </span>
            </>
          )}
          {entry.released && (
            <>
              <span className="text-neutral-300">•</span>
              <span className="text-neutral-500">Released {entry.released}</span>
            </>
          )}
        </div>
        <p className="text-[12px] text-neutral-400 mt-3">
          {rows.length} API providers benchmarked · output speed, latency (time to first answer token), and blended price per 1M tokens
        </p>
      </div>

      {/* Top-5 cards */}
      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Fastest</div>
            {fastest ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{fastest.name}</span>
                </div>
                <div className="text-3xl font-semibold tabular-nums mt-1">{fastest.speed} <span className="text-[13px] font-normal text-neutral-500">t/s</span></div>
                <div className="text-[11px] text-neutral-500 mt-2">Output speed · median</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Lowest Latency</div>
            {lowestLatency ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{lowestLatency.name}</span>
                </div>
                <div className="text-3xl font-semibold tabular-nums mt-1">{lowestLatency.firstChunk?.toFixed(2)} <span className="text-[13px] font-normal text-neutral-500">s</span></div>
                <div className="text-[11px] text-neutral-500 mt-2">Time to first answer token</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Lowest Price</div>
            {cheapest ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{cheapest.name}</span>
                </div>
                <div className="text-3xl font-semibold tabular-nums mt-1">${cheapest.blendedPrice.toFixed(2)}</div>
                <div className="text-[11px] text-neutral-500 mt-2">Blended price · per 1M tokens</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>
        </div>
      </section>

      {/* Comparison summary */}
      <section className="mb-10">
        <div className="border border-[var(--color-line)] rounded-lg p-5">
          <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">Comparison Summary</div>
          <p className="text-[13px] text-neutral-600 leading-relaxed max-w-3xl">
            {entry.name} is available through {rows.length} API providers, each offering different performance
            characteristics and pricing.
            {top5Speed.length >= 2 && (
              <> For output speed, the top providers are {top5Speed.map((r, i) => `${r.name} (${r.speed} t/s)${i < 2 ? ', ' : ''}`).join('')}. Speed varies significantly across providers, with a {speedSpread.toFixed(0)}% difference between the fastest and slowest.</>
            )}
            {top5Latency.length >= 2 && (
              <> For latency, {top5Latency[0].name} ({top5Latency[0].firstChunk?.toFixed(2)}s), {top5Latency[1].name} ({top5Latency[1].firstChunk?.toFixed(2)}s) offer the lowest time to first answer token.</>
            )}
            {top5Price.length >= 2 && (
              <> For pricing, {top5Price[0].name} (${top5Price[0].blendedPrice.toFixed(2)}), {top5Price[1].name} (${top5Price[1].blendedPrice.toFixed(2)}) offer the lowest blended prices per 1M tokens. Prices vary up to {priceSpread.toFixed(1)}x across providers.</>
            )}
            {fastest && cheapest && (
              <> {fastest.name} offers the best performance with the highest speed{lowestLatency?.name === fastest.name ? ' and lowest latency' : ''}. For cost optimization, {cheapest.name} provides the most competitive pricing.</>
            )}
          </p>
        </div>
      </section>

      {/* Provider table */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Key Comparison Metrics &amp; API Features</h2>
        <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-[12px] min-w-[900px]">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">API Provider</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">Context</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">License</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">Cost per Task</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">Speed (t/s)</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">First Chunk (s)</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">Total Response (s)</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">Reasoning (s)</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">Fn Call</th>
                  <th className="py-3 px-4 font-medium text-neutral-400 whitespace-nowrap">JSON</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.name} className="border-b border-[var(--color-line)] last:border-b-0">
                    <td className="py-3 px-4 font-medium whitespace-nowrap">{r.name}</td>
                    <td className="py-3 px-4 tabular-nums text-neutral-500 whitespace-nowrap">{r.context}</td>
                    <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">{r.license}</td>
                    <td className="py-3 px-4 tabular-nums whitespace-nowrap">${r.costPerTask.toFixed(2)}</td>
                    <td className="py-3 px-4 tabular-nums font-medium whitespace-nowrap">{r.speed ?? '—'}</td>
                    <td className="py-3 px-4 tabular-nums text-neutral-500 whitespace-nowrap">{r.firstChunk != null ? r.firstChunk.toFixed(2) : '—'}</td>
                    <td className="py-3 px-4 tabular-nums text-neutral-500 whitespace-nowrap">{r.totalResponse != null ? r.totalResponse.toFixed(2) : '—'}</td>
                    <td className="py-3 px-4 tabular-nums text-neutral-500 whitespace-nowrap">{r.reasoningTime != null ? r.reasoningTime.toFixed(2) : '—'}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{r.functionCalling ? <span className="text-green-600">✓</span> : <span className="text-neutral-300">—</span>}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{r.jsonMode ? <span className="text-green-600">✓</span> : <span className="text-neutral-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-neutral-400 mt-3">
          Median (P50) measurements over the past 72 hours · blended at {entry.blendRatio ?? '7:2:1 (cache-input-output)'} ·
          workload: 10,000 input tokens · mirrored from artificialanalysis.ai
        </p>
        {model && (
          <div className="mt-6">
            <Link
              href={`/models/${slug}`}
              className="px-4 py-2 rounded-full border border-[var(--color-line)] text-[13px] text-neutral-600 hover:border-neutral-300 hover:text-black transition-colors"
            >
              View model comparison ↗
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}