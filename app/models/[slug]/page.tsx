import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadModelCatalog } from '@/lib/models-catalog';
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

function fmtVerbosity(v: number | undefined): string {
  if (v === undefined) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = await loadModelCatalog();
  const model = db?.models.find(m => slugOf(m.name) === slug);
  if (!model) return { title: `Model not found · ${SITE_NAME}` };
  return {
    title: `${model.name} — Intelligence, Performance & Price Analysis`,
    description: `${model.name} by ${model.provider}. Artificial Analysis Intelligence Index: ${model.intelligenceIndex ?? 'n/a'}. Pricing, context window, and benchmark analysis.`,
  };
}

export default async function ModelDetailPage({ params }: Props) {
  const { slug } = await params;
  const db = await loadModelCatalog();
  const model = db?.models.find(m => slugOf(m.name) === slug);
  if (!model || !db) notFound();

  const withIntel = db.models
    .filter(m => m.intelligenceIndex != null)
    .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
  const intelRank = model.intelligenceIndex != null ? withIntel.findIndex(m => m.id === model.id) + 1 : null;
  const classTotal = withIntel.length;

  const intelScore = model.intelligenceIndex;
  const speed = model.aaSpeed;
  const verbosity = model.aaVerbosity;

  const isOpen = model.family === 'open-weights' || model.family === 'open';
  const avgCost =
    model.promptPrice !== undefined || model.completionPrice !== undefined
      ? ((model.promptPrice ?? 0) + (model.completionPrice ?? 0)) / 2
      : undefined;

  const intelUnits = intelScore != null ? unitsFor(intelScore) : 0;
  const speedUnits = speed != null ? unitsFor(speed / 60) : 0;
  const verbUnits = verbosity != null ? unitsFor(verbosity / 40_000_000) : 0;
  const costUnits = avgCost !== undefined ? unitsFor(avgCost / 0.4) : 0;

  const opennessScore = !isOpen ? 0 : model.license ? (model.license.toLowerCase().includes('apache') ? 100 : model.license.toLowerCase().includes('mit') ? 95 : 80) : 70;

  const topSpeed = Math.max(300, speed ?? 0);
  const topIntel = Math.max(70, intelScore ?? 0);
  const topCoding = Math.max(80, model.codingIndex ?? 0);
  const topElo = Math.max(1450, model.elo ?? 0);

  const INTEL_EVALS: { name: string; what: string }[] = [
    { name: 'GDPval-AA v2', what: 'Agentic real-world work tasks' },
    { name: 'τ³-Banking', what: 'Agentic tool use' },
    { name: 'Terminal-Bench v2.1', what: 'Agentic coding & terminal use' },
    { name: 'SciCode', what: 'Coding' },
    { name: "Humanity's Last Exam", what: 'Reasoning & knowledge' },
    { name: 'GPQA Diamond', what: 'Scientific reasoning' },
    { name: 'CritPt', what: 'Physics reasoning' },
    { name: 'AA-Omniscience', what: 'Knowledge accuracy & non-hallucination' },
    { name: 'AA-LCR', what: 'Long context reasoning' },
  ];

  const summary =
    model.intelligenceIndex != null
      ? `${model.name} scores ${model.intelligenceIndex} on the Artificial Analysis Intelligence Index, ` +
        (intelRank ? `placing it #${intelRank} of ${classTotal} benchmarked models. ` : '') +
        (isOpen
          ? `It is an open weights model, so it can be self-hosted for free.`
          : `It is a proprietary model.`) +
        (model.promptPrice !== undefined
          ? ` Pricing is $${model.promptPrice.toFixed(2)} per 1M input tokens and $${(model.completionPrice ?? 0).toFixed(2)} per 1M output tokens.`
          : '') +
        (speed != null ? ` At ${speed} tokens per second, it is ${speed >= 150 ? 'notably fast' : speed >= 60 ? 'moderately fast' : 'slower than average'}.` : '') +
        (verbosity != null ? ` When evaluated on the Intelligence Index, it generated ${fmtVerbosity(verbosity)} output tokens, which is ${verbosity >= 100_000_000 ? 'very verbose' : verbosity >= 50_000_000 ? 'about average' : 'fairly concise'} compared to peers.` : '')
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
          <span className="text-neutral-300">•</span>
          <Link
            href={`/models/${slug}/providers`}
            className="text-neutral-500 hover:text-black transition-colors underline underline-offset-2"
          >
            Compare API providers
          </Link>
        </div>
      </div>

      {/* Model summary cards */}
      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Intelligence</div>
            {intelScore != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{intelScore}</div>
                <div className="text-[11px] text-neutral-500 mt-1">
                  {intelRank ? `#${intelRank} / ${classTotal}` : ''}
                </div>
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className={`w-4 h-1 rounded-full ${i <= unitsFor(intelScore) ? 'bg-violet-500' : 'bg-neutral-200'}`} />
                  ))}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">{unitsFor(intelScore)} of 4 units for Intelligence</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Speed</div>
            {speed != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{speed}</div>
                <div className="text-[11px] text-neutral-500 mt-1">output tokens / second</div>
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className={`w-4 h-1 rounded-full ${i <= unitsFor(speed / 60) ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-semibold text-neutral-300">N/A</div>
                <div className="text-[11px] text-neutral-500 mt-1">no API provider benchmarked yet</div>
              </>
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
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Verbosity</div>
            {verbosity != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{fmtVerbosity(verbosity)}</div>
                <div className="text-[11px] text-neutral-500 mt-1">output tokens from Intelligence Index</div>
                <div className="mt-2 flex gap-0.5">
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className={`w-4 h-1 rounded-full ${i <= unitsFor(verbosity / 40_000_000) ? 'bg-orange-500' : 'bg-neutral-200'}`} />
                  ))}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">{unitsFor(verbosity / 40_000_000)} of 4 units for Verbosity</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>
        </div>
      </section>

      {/* Benchmarks — AA puts these right below the summary cards */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Benchmarks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-400">Artificial Analysis Intelligence Index</div>
              {intelRank != null && <div className="text-[11px] text-neutral-500">#{intelRank} / {classTotal}</div>}
            </div>
            {intelScore != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{intelScore} <span className="text-[13px] font-normal text-neutral-500">/ 100</span></div>
                <div className="mt-3 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(intelScore / topIntel) * 100}%` }} />
                </div>
                <div className="text-[10px] text-neutral-400 mt-1.5">{intelUnits} of 4 units for Intelligence</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-400">Coding Index</div>
              {model.codingIndex != null && <div className="text-[11px] text-neutral-500">agentic coding</div>}
            </div>
            {model.codingIndex != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{model.codingIndex} <span className="text-[13px] font-normal text-neutral-500">/ 100</span></div>
                <div className="mt-3 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(model.codingIndex / topCoding) * 100}%` }} />
                </div>
                <div className="text-[10px] text-neutral-400 mt-1.5">{unitsFor(model.codingIndex)} of 4 units for Coding</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-400">Agentic Index</div>
              {model.agenticIndex != null && <div className="text-[11px] text-neutral-500">agentic tasks</div>}
            </div>
            {model.agenticIndex != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{model.agenticIndex} <span className="text-[13px] font-normal text-neutral-500">/ 100</span></div>
                <div className="mt-3 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(model.agenticIndex / topCoding) * 100}%` }} />
                </div>
                <div className="text-[10px] text-neutral-400 mt-1.5">{unitsFor(model.agenticIndex)} of 4 units for Agentic</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-400">LMArena Elo</div>
              {model.elo != null && <div className="text-[11px] text-neutral-500">human preference</div>}
            </div>
            {model.elo != null ? (
              <>
                <div className="text-3xl font-semibold tabular-nums">{model.elo} <span className="text-[13px] font-normal text-neutral-500">Elo</span></div>
                <div className="mt-3 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full bg-neutral-700 rounded-full" style={{ width: `${(model.elo / topElo) * 100}%` }} />
                </div>
                <div className="text-[10px] text-neutral-400 mt-1.5">{model.numVotes ? `${model.numVotes.toLocaleString()} votes` : 'voted by humans'}</div>
              </>
            ) : (
              <div className="text-neutral-400">—</div>
            )}
          </div>
        </div>

        {/* Openness + index composition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Artificial Analysis Openness Index</div>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-semibold tabular-nums">{opennessScore}</div>
              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${opennessScore}%` }} />
              </div>
            </div>
            <div className="text-[11px] text-neutral-500 mt-2">
              {isOpen
                ? `Open weights — ${model.license || 'weights publicly available'}. The model can be self-hosted; the weights can be downloaded and redistributed.`
                : 'Proprietary — weights are not publicly available. The model is only accessible via its provider API.'}
            </div>
          </div>

          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">Intelligence Index Composition</div>
            <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed">
              The Artificial Analysis Intelligence Index v4.1.1 is a composite of 9 evaluations, each weighted into a 0–100 score.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {INTEL_EVALS.map(e => (
                <div key={e.name} className="flex items-center gap-2 text-[12px]">
                  <span className="w-1 h-1 rounded-full bg-violet-500 shrink-0" />
                  <span className="font-medium truncate">{e.name}</span>
                  <span className="text-neutral-400 truncate hidden sm:inline">— {e.what}</span>
                </div>
              ))}
            </div>
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

      {/* FAQ — AA style, generated from data */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Frequently Asked Questions</h2>
        <div className="border border-[var(--color-line)] rounded-lg overflow-hidden divide-y divide-[var(--color-line)]">
          {[
            { q: `When was ${model.name} released?`, a: model.released ? `${model.name} was released on ${fmtDate(model.released)}.` : `The release date of ${model.name} is not publicly tracked.` },
            { q: `Who created ${model.name}?`, a: `${model.name} was created by ${model.provider}.` },
            { q: `How intelligent is ${model.name}?`, a: model.intelligenceIndex != null ? `${model.name} scores ${model.intelligenceIndex} on the Artificial Analysis Intelligence Index.` : `The Artificial Analysis Intelligence Index for ${model.name} has not been published yet.` },
            { q: `How much does ${model.name} cost?`, a: model.promptPrice != null ? `${model.name} costs $${model.promptPrice.toFixed(2)} per 1M input tokens and $${(model.completionPrice ?? 0).toFixed(2)} per 1M output tokens.` : `${model.name} has no public API pricing listed.` },
            { q: `What is the context window of ${model.name}?`, a: `${model.name} has a context window of ${model.context || 'not disclosed'} tokens.` },
            { q: `Is ${model.name} open source?`, a: isOpen ? `Yes, ${model.name} is open weights. The model weights are publicly available${model.license ? ` under the ${model.license} license` : ''} and can be downloaded for self-hosting.` : `No, ${model.name} is proprietary. The model weights are not publicly available.` },
            { q: `How does ${model.name} perform on benchmarks?`, a: model.intelligenceIndex != null ? `${model.name} achieves a score of ${model.intelligenceIndex} on the Artificial Analysis Intelligence Index, which evaluates models across reasoning, knowledge, mathematics, and coding.` : `${model.name} does not yet have published Artificial Analysis benchmarks.` },
            { q: `Is ${model.name} available via API?`, a: model.source === 'openrouter' ? `Yes, ${model.name} is available via API. Compare provider pricing and performance.` : isOpen ? `${model.name} is an open weights model that can be self-hosted.` : `${model.name} is accessible via its provider API.` },
          ].map(faq => (
            <div key={faq.q} className="px-5 py-4">
              <div className="text-[13px] font-medium mb-1">{faq.q}</div>
              <p className="text-[12px] text-neutral-500 leading-relaxed">{faq.a}</p>
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