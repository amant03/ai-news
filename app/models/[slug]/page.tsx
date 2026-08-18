import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { readModelDatabase } from '@/lib/model-registry';
import { SITE_NAME } from '@/lib/site';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function unitsFor(score: number | undefined): number {
  if (score === undefined) return 0;
  if (score >= 45) return 4;
  if (score >= 30) return 3;
  if (score >= 15) return 2;
  return 1;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtPrice(v: number | undefined): string {
  if (v === undefined) return '—';
  if (v === 0) return '$0.00';
  return `$${v.toFixed(2)}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = readModelDatabase();
  const model = db?.models.find(m => slugOf(m.name) === slug);
  if (!model) return { title: `Model not found · ${SITE_NAME}` };
  return {
    title: `${model.name} — Intelligence, Performance & Price Analysis`,
    description: `${model.name} by ${model.provider}. Artificial Analysis Intelligence Index: ${model.intelligenceIndex ?? 'n/a'}. Pricing, context window, and benchmark analysis.`,
  };
}

export default async function ModelDetailPage({ params }: Props) {
  const { slug } = await params;
  const db = readModelDatabase();
  const model = db?.models.find(m => slugOf(m.name) === slug);
  if (!model || !db) notFound();

  const withIntel = db.models
    .filter(m => m.intelligenceIndex != null)
    .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
  const intelRank = model.intelligenceIndex != null ? withIntel.findIndex(m => m.id === model.id) + 1 : null;
  const classTotal = withIntel.length;

  const isOpen = model.family === 'open-weights' || model.family === 'open';
  const avgCost =
    model.promptPrice !== undefined || model.completionPrice !== undefined
      ? ((model.promptPrice ?? 0) + (model.completionPrice ?? 0)) / 2
      : undefined;

  const summary =
    model.intelligenceIndex != null
      ? `${model.name} scores ${model.intelligenceIndex} on the Artificial Analysis Intelligence Index, ` +
        (intelRank ? `placing it #${intelRank} of ${classTotal} benchmarked models. ` : '') +
        (isOpen
          ? `It is an open weights model, so it can be self-hosted for free.`
          : `It is a proprietary model.`) +
        (model.promptPrice !== undefined
          ? ` Pricing is $${model.promptPrice.toFixed(2)} per 1M input tokens and $${(model.completionPrice ?? 0).toFixed(2)} per 1M output tokens.`
          : '')
      : `${model.name} is a ${isOpen ? 'open weights' : 'proprietary'} model by ${model.provider}${model.released ? `, released ${fmtDate(model.released)}` : ''}.`;

  return (
    <main className="max-w-[1200px] mx-auto px-5 pt-8 pb-16">
      <div className="mb-6">
        <Link href="/models" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">
          ← Models
        </Link>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {model.name} <span className="text-neutral-400">Intelligence, Performance &amp; Price Analysis</span>
        </h1>
        <div className="flex items-center gap-2 mt-3 flex-wrap text-[12px]">
          <span className="text-neutral-500">{model.provider}</span>
          <span className="text-neutral-300">•</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
            isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {isOpen ? 'Open weights model' : 'Proprietary model'}
          </span>
          {model.released && (
            <>
              <span className="text-neutral-300">•</span>
              <span className="text-neutral-500">Released {fmtDate(model.released)}</span>
            </>
          )}
        </div>
      </div>

      {/* Model summary cards */}
      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Intelligence</div>
            {model.intelligenceIndex != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{model.intelligenceIndex}</div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  {intelRank ? `#${intelRank} / ${classTotal}` : ''}
                </div>
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className={`w-4 h-1 rounded-full ${i <= unitsFor(model.intelligenceIndex) ? 'bg-violet-500' : 'bg-neutral-200'}`} />
                  ))}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">{unitsFor(model.intelligenceIndex)} of 4 units for Intelligence</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Coding</div>
            {model.codingIndex != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{model.codingIndex}</div>
                <div className="text-[11px] text-neutral-500 mt-1">Coding index</div>
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className={`w-4 h-1 rounded-full ${i <= unitsFor(model.codingIndex) ? 'bg-amber-500' : 'bg-neutral-200'}`} />
                  ))}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">{unitsFor(model.codingIndex)} of 4 units for Coding</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Cost per Task</div>
            {avgCost !== undefined ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">${avgCost.toFixed(2)}</div>
                <div className="text-[11px] text-neutral-500 mt-1">blended $/1M tokens</div>
                <div className="mt-2 text-[11px] text-neutral-500 tabular-nums">
                  In {fmtPrice(model.promptPrice)} · Out {fmtPrice(model.completionPrice)}
                </div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Context / ELO</div>
            <div className="text-3xl font-semibold tabular-nums">{model.context || '—'}</div>
            <div className="text-[11px] text-neutral-500 mt-1">context window</div>
            {model.elo != null && (
              <div className="mt-2 text-[11px] text-neutral-500 tabular-nums">LMArena Elo {model.elo}</div>
            )}
          </div>
        </div>
      </section>

      {/* Comparison summary */}
      <section className="mb-10">
        <div className="border border-[var(--color-line)] rounded-lg p-5">
          <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">Comparison Summary</div>
          <p className="text-[13px] text-neutral-600 leading-relaxed max-w-3xl">{summary}</p>
          {model.description && (
            <p className="text-[13px] text-neutral-500 leading-relaxed max-w-3xl mt-3">{model.description}</p>
          )}
        </div>
      </section>

      {/* Technical specifications */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Technical Specifications</h2>
        <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <tbody>
              {[
                { label: 'Provider', value: model.provider },
                { label: 'Type', value: isOpen ? 'Open weights' : 'Proprietary' },
                { label: 'Released', value: fmtDate(model.released) },
                { label: 'Context window', value: model.context || '—' },
                { label: 'Parameters', value: model.params || '—' },
                { label: 'License', value: model.license || '—' },
                { label: 'Source', value: model.source },
              ].map(row => (
                <tr key={row.label} className="border-b border-[var(--color-line)] last:border-b-0">
                  <td className="py-3 px-4 w-48 text-neutral-400 text-[12px]">{row.label}</td>
                  <td className="py-3 px-4 font-medium">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Benchmarks */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Benchmarks</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Intelligence Index', value: model.intelligenceIndex, color: 'text-violet-600' },
            { label: 'Coding Index', value: model.codingIndex, color: 'text-amber-600' },
            { label: 'Agentic Index', value: model.agenticIndex, color: 'text-blue-600' },
            { label: 'LMArena Elo', value: model.elo, color: 'text-neutral-700' },
          ].map(b => (
            <div key={b.label} className="border border-[var(--color-line)] rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1.5">{b.label}</div>
              <div className={`text-xl font-semibold tabular-nums ${b.value == null ? 'text-neutral-300' : b.color}`}>
                {b.value ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* External links */}
      <section>
        <div className="flex gap-2 flex-wrap">
          {model.source === 'openrouter' && (
            <a
              href={`https://openrouter.ai/${model.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-[var(--color-line)] text-[13px] text-neutral-600 hover:border-neutral-300 hover:text-black transition-colors"
            >
              View on OpenRouter ↗
            </a>
          )}
          {model.license && (
            <a
              href={`https://huggingface.co/search/full-text?q=${encodeURIComponent(model.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-[var(--color-line)] text-[13px] text-neutral-600 hover:border-neutral-300 hover:text-black transition-colors"
            >
              Find weights on Hugging Face ↗
            </a>
          )}
        </div>
      </section>
    </main>
  );
}