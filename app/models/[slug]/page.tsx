import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import IntelligenceScatter from '@/components/IntelligenceScatter';
import { loadModelCatalog } from '@/lib/models-catalog';
import type { ModelRecord } from '@/lib/model-registry';
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

function fmtTaskCost(v: number | undefined): string {
  if (v === undefined || v === null) return '—';
  if (v === 0) return '$0.00';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

function fmtVerbosity(v: number | undefined): string {
  if (v === undefined) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

const isOpenM = (m: ModelRecord) => m.family === 'open-weights' || m.family === 'open';

/** Blended 3:1 input/output price per 1M tokens (AA proprietary price bands). */
function blendedPrice(m: ModelRecord): number | null {
  if (m.promptPrice == null && m.completionPrice == null) return null;
  return ((m.promptPrice ?? 0) * 3 + (m.completionPrice ?? 0)) / 4;
}

/** Cost per Intelligence Index task: measured value, else blended proxy. */
function taskCost(m: ModelRecord): number | null {
  if (m.aaCostPerTask != null) return m.aaCostPerTask;
  if (m.promptPrice == null && m.completionPrice == null) return null;
  const cache = (m.promptPrice ?? 0) * 0.1;
  return (cache * 7 + (m.promptPrice ?? 0) * 2 + (m.completionPrice ?? 0)) / 10;
}

function parseParamsB(params: string | undefined): number | null {
  if (!params) return null;
  const m = params.trim().match(/^([\d.]+)\s*([TBMK])?/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (isNaN(v)) return null;
  const u = (m[2] || 'B').toUpperCase();
  if (u === 'T') return v * 1000;
  if (u === 'B') return v;
  if (u === 'M') return v / 1000;
  return v / 1_000_000;
}

function sizeClass(billions: number): 'Tiny' | 'Small' | 'Medium' | 'Large' {
  if (billions <= 4) return 'Tiny';
  if (billions <= 40) return 'Small';
  if (billions <= 150) return 'Medium';
  return 'Large';
}

function parseContextTokens(context: string | undefined): number | null {
  if (!context) return null;
  const m = context.trim().match(/^([\d.]+)\s*([MK])?/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (isNaN(v)) return null;
  const u = (m[2] || '').toUpperCase();
  if (u === 'M') return v * 1_000_000;
  if (u === 'K') return v * 1_000;
  return v;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function vsMedian(v: number, med: number | null): string {
  if (med == null || med === 0) return 'around average';
  const r = v / med;
  if (r >= 1.25) return 'well above average';
  if (r > 1.05) return 'above average';
  if (r >= 0.95) return 'around average';
  if (r >= 0.75) return 'below average';
  return 'well below average';
}

function vsMedianLower(v: number, med: number | null): string {
  // For lower-is-better metrics.
  if (med == null || med === 0) return 'around average';
  const r = v / med;
  if (r <= 0.5) return 'far below average';
  if (r <= 0.8) return 'well below average';
  if (r < 0.95) return 'below average';
  if (r <= 1.05) return 'around average';
  if (r <= 1.25) return 'above average';
  return 'well above average';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = await loadModelCatalog();
  const model = db?.models.find(m => slugOf(m.name) === slug);
  if (!model) return { title: `Model not found · ${SITE_NAME}` };
  return {
    title: `${model.name} — Intelligence, Performance & Price Analysis`,
    description: `${model.name} by ${model.provider}. Artificial Analysis Intelligence Index: ${model.intelligenceIndex != null ? Math.round(model.intelligenceIndex) : 'n/a'}. Pricing, context window, and benchmark analysis.`,
  };
}

const INTEL_EVALS: { name: string; what: string }[] = [
  { name: 'AA-Briefcase', what: 'Agentic knowledge work' },
  { name: 'GDPval-AA v2', what: 'Agentic real-world work tasks' },
  { name: 'AutomationBench-AA', what: 'Agentic SaaS workflows' },
  { name: 'Terminal-Bench v4.0', what: 'Agentic coding & terminal use' },
  { name: 'SciCode', what: 'Coding' },
  { name: "Humanity's Last Exam", what: 'Reasoning & knowledge' },
  { name: 'GDP.pdf', what: 'Professional document reasoning' },
  { name: 'CritPt', what: 'Physics reasoning' },
  { name: 'AA-Omniscience', what: 'Knowledge accuracy & non-hallucination' },
  { name: 'AA-LCR v1.1', what: 'Long context reasoning' },
];

function UnitBars({ filled, color }: { filled: number; color: string }) {
  return (
    <div className="mt-2 flex gap-0.5" aria-hidden>
      {[1, 2, 3, 4].map(i => (
        <span key={i} className="w-4 h-1 rounded-full" style={{ background: i <= filled ? color : 'var(--color-line)' }} />
      ))}
    </div>
  );
}

export default async function ModelDetailPage({ params }: Props) {
  const { slug } = await params;
  const db = await loadModelCatalog();
  const model = db?.models.find(m => slugOf(m.name) === slug);
  if (!model || !db) notFound();

  const isOpen = isOpenM(model);
  const intelScore = model.intelligenceIndex;
  const speed = model.aaSpeed;
  const verbosity = model.aaVerbosity;
  const cost = taskCost(model);

  /* ── Class peers (AA methodology): open weights compare within open
     weights (sized when params known); proprietary compare within their
     blended-price band. ── */
  const withIntel = db.models.filter(m => m.intelligenceIndex != null);
  let peers: ModelRecord[];
  let classLabel: string;
  let classBasis: string;
  if (isOpen) {
    peers = withIntel.filter(isOpenM);
    const b = parseParamsB(model.params);
    if (b != null) {
      const cls = sizeClass(b);
      peers = peers.filter(m => {
        const mb = parseParamsB(m.params);
        return mb == null || sizeClass(mb) === cls;
      });
      classLabel = `Open weights · ${cls}`;
      classBasis = `${cls.toLowerCase()}-sized open weights models`;
    } else {
      classLabel = 'Open weights';
      classBasis = 'open weights models';
    }
  } else {
    const bp = blendedPrice(model);
    const band =
      bp == null ? null : bp < 0.15 ? 'under $0.15' : bp <= 1 ? '$0.15–$1' : 'over $1';
    peers = withIntel.filter(m => !isOpenM(m));
    if (band != null) {
      const inBand = peers.filter(m => {
        const p = blendedPrice(m);
        if (p == null) return false;
        const mb = p < 0.15 ? 'under $0.15' : p <= 1 ? '$0.15–$1' : 'over $1';
        return mb === band;
      });
      if (inBand.length >= 3) peers = inBand;
    }
    classLabel = band ? `Proprietary · ${band}/1M` : 'Proprietary';
    classBasis = 'proprietary models in the same price band';
  }
  const classTotal = peers.length;

  const rankIn = (list: ModelRecord[]) => {
    const i = list.findIndex(m => m.id === model.id);
    return i >= 0 ? i + 1 : null;
  };
  const byIntel = [...peers].sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
  const speedPool = peers.filter(m => m.aaSpeed != null).sort((a, b) => (b.aaSpeed ?? 0) - (a.aaSpeed ?? 0));
  const costPool = peers
    .map(m => ({ m, c: taskCost(m) }))
    .filter((x): x is { m: ModelRecord; c: number } => x.c != null)
    .sort((a, b) => a.c - b.c);
  const verbPool = peers.filter(m => m.aaVerbosity != null).sort((a, b) => (a.aaVerbosity ?? 0) - (b.aaVerbosity ?? 0));

  const intelRank = intelScore != null ? rankIn(byIntel) : null;
  const speedRank = speed != null ? rankIn(speedPool) : null;
  const costRank = cost != null ? rankIn(costPool.map(x => x.m)) : null;
  const verbRank = verbosity != null ? rankIn(verbPool) : null;

  const intelMed = median(byIntel.map(m => m.intelligenceIndex ?? 0));
  const speedMed = median(speedPool.map(m => m.aaSpeed ?? 0));
  const costMed = median(costPool.map(x => x.c));
  const verbMed = median(verbPool.map(m => m.aaVerbosity ?? 0));
  const inMed = median(peers.map(m => m.promptPrice ?? -1).filter(v => v >= 0));
  const outMed = median(peers.map(m => m.completionPrice ?? -1).filter(v => v >= 0));

  const intelUnits = unitsFor(intelScore);
  const speedUnits = speed != null ? unitsFor(speed / 60) : 0;
  const costUnits = cost != null ? unitsFor(cost / 0.4) : 0;
  const verbUnits = verbosity != null ? unitsFor(verbosity / 40_000_000) : 0;

  const opennessScore = !isOpen
    ? 0
    : model.license
      ? model.license.toLowerCase().includes('apache')
        ? 100
        : model.license.toLowerCase().includes('mit')
          ? 95
          : 80
      : 70;

  const ctxTokens = parseContextTokens(model.context);
  const ctxPages = ctxTokens != null ? Math.round(ctxTokens / 667) : null;

  const priceLine =
    model.promptPrice !== undefined
      ? `$${model.promptPrice.toFixed(2)} per 1M input tokens (median: ${inMed != null ? `$${inMed.toFixed(2)}` : 'n/a'}) and $${(model.completionPrice ?? 0).toFixed(2)} per 1M output tokens (median: ${outMed != null ? `$${outMed.toFixed(2)}` : 'n/a'})`
      : null;

  const summaryBits: string[] = [];
  if (intelScore != null) {
    summaryBits.push(
      `${model.name} scores ${Math.round(intelScore)} on the Artificial Analysis Intelligence Index${intelRank ? `, placing it #${intelRank} of ${classTotal} ${classBasis} (median: ${intelMed})` : ''} — ${vsMedian(intelScore, intelMed)} for its class.`
    );
  }
  if (priceLine) summaryBits.push(`Pricing is ${priceLine}.`);
  if (cost != null) {
    summaryBits.push(
      `It costs ${fmtTaskCost(cost)} per Intelligence Index task${costRank ? ` (rank #${costRank} of ${costPool.length})` : ''}, which is ${vsMedianLower(cost, costMed)} for its class.`
    );
  }
  if (speed != null) {
    summaryBits.push(
      `At ${Math.round(speed * 10) / 10} tokens per second${speedRank ? ` (rank #${speedRank} of ${speedPool.length})` : ''}, it is ${speedMed != null && speed >= speedMed * 1.25 ? 'notably fast' : speedMed != null && speed >= speedMed * 0.9 ? 'about average speed' : 'slower than average'} (class median: ${speedMed}/s).`
    );
  }
  if (verbosity != null) {
    summaryBits.push(
      `When evaluated on the Intelligence Index it generated ${fmtVerbosity(verbosity)} output tokens, which is ${vsMedianLower(verbosity, verbMed)} compared to the class median of ${fmtVerbosity(verbMed ?? undefined)}.`
    );
  }
  if (model.context) {
    summaryBits.push(
      `The model supports ${model.context} context window${ctxPages ? ` (~${ctxPages.toLocaleString()} A4 pages)` : ''}.`
    );
  }
  if (summaryBits.length === 0) {
    summaryBits.push(
      `${model.name} is a ${isOpen ? 'open weights' : 'proprietary'} model by ${model.provider}${model.released ? `, released ${fmtDate(model.released)}` : ''}. Benchmark data for this model is still being collected.`
    );
  }

  const faqs: { q: string; a: string }[] = [
    { q: `When was ${model.name} released?`, a: model.released ? `${model.name} was released on ${fmtDate(model.released)}.` : `The release date of ${model.name} is not publicly tracked yet.` },
    { q: `Who created ${model.name}?`, a: `${model.name} was created by ${model.provider || 'an independent lab'}.` },
    {
      q: `How intelligent is ${model.name}?`,
      a: intelScore != null
        ? `${model.name} scores ${Math.round(intelScore)} on the Artificial Analysis Intelligence Index${intelRank ? `, ranking #${intelRank} of ${classTotal} ${classBasis}` : ''} (class median: ${intelMed}).`
        : `The Artificial Analysis Intelligence Index for ${model.name} has not been published yet.`,
    },
    {
      q: `How fast is ${model.name}?`,
      a: speed != null
        ? `${model.name} generates output at ${Math.round(speed * 10) / 10} tokens per second${speedRank ? ` (rank #${speedRank} of ${speedPool.length} in its class)` : ''}, versus a class median of ${speedMed} t/s.`
        : `No API provider has been benchmarked for ${model.name} speed yet.`,
    },
    {
      q: `How much does ${model.name} cost?`,
      a:
        cost != null
          ? `${model.name} costs ${fmtTaskCost(cost)} per Intelligence Index task${costRank ? ` (rank #${costRank} of ${costPool.length})` : ''}${model.promptPrice !== undefined ? `, with list pricing at $${model.promptPrice.toFixed(2)} per 1M input and $${(model.completionPrice ?? 0).toFixed(2)} per 1M output tokens` : ''}.`
          : model.promptPrice !== undefined
            ? `${model.name} lists at $${model.promptPrice.toFixed(2)} per 1M input and $${(model.completionPrice ?? 0).toFixed(2)} per 1M output tokens.`
            : `${model.name} has no public API pricing listed.`,
    },
    {
      q: `How verbose is ${model.name}?`,
      a: verbosity != null
        ? `When evaluated on the Intelligence Index, ${model.name} generated ${fmtVerbosity(verbosity)} output tokens${verbRank ? ` (rank #${verbRank} of ${verbPool.length})` : ''}, versus a class median of ${fmtVerbosity(verbMed ?? undefined)}.`
        : `Verbosity data for ${model.name} has not been published yet.`,
    },
    {
      q: `What is the context window of ${model.name}?`,
      a: model.context
        ? `${model.name} has a ${model.context} token context window${ctxPages ? ` — roughly ${ctxPages.toLocaleString()} A4 pages of text` : ''}.`
        : `The context window of ${model.name} has not been disclosed.`,
    },
    ...(model.params
      ? [{ q: `How many parameters does ${model.name} have?`, a: `${model.name} has ${model.params} parameters.` }]
      : []),
    {
      q: `Is ${model.name} open source?`,
      a: isOpen
        ? `Yes, ${model.name} is open weights${model.license ? ` under the ${model.license} license` : ''}. The weights are publicly available and can be downloaded for self-hosting.`
        : `No, ${model.name} is proprietary. The weights are not publicly available.`,
    },
    ...(model.codingIndex != null
      ? [{ q: `How does ${model.name} perform at coding?`, a: `${model.name} scores ${model.codingIndex} on the Coding Index for agentic coding tasks.` }]
      : []),
    {
      q: `How does ${model.name} perform on benchmarks?`,
      a: intelScore != null
        ? `${model.name} achieves ${Math.round(intelScore)} on the Artificial Analysis Intelligence Index v4.3, a composite of 10 evaluations spanning agentic work, coding, reasoning, knowledge and long context.`
        : `${model.name} does not yet have published Artificial Analysis benchmarks.`,
    },
    {
      q: `Is ${model.name} available via API?`,
      a: model.source === 'openrouter'
        ? `Yes, ${model.name} is available via API. Compare provider pricing and performance below.`
        : isOpen
          ? `${model.name} is an open weights model that can be self-hosted.`
          : `${model.name} is accessible via its provider API.`,
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1200px] mx-auto px-5 pt-10 pb-16">
        <div className="mb-6">
          <Link href="/models" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">
            ← Models
          </Link>
        </div>

        {/* Title */}
        <div className="mb-8">
          <div className="kicker mb-2">Model analysis</div>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-[var(--fore)]">
            {model.name}{' '}
            <span className="text-[var(--dim)]">Intelligence, Performance &amp; Price Analysis</span>
          </h1>
          <div className="flex items-center gap-2 mt-3 flex-wrap text-[12px]">
            <span className="font-medium text-[var(--mut)]">{model.provider || 'Independent lab'}</span>
            <span className="text-[var(--dim)]">•</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isOpen ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
            }`}>
              {isOpen ? 'Open weights model' : 'Proprietary model'}
            </span>
            {model.released && (
              <>
                <span className="text-[var(--dim)]">•</span>
                <span className="text-[var(--mut)]">Released {fmtDate(model.released)}</span>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-wrap mt-4">
            <Link
              href="/models"
              className="px-4 py-2 rounded-full border border-[var(--color-line)] text-[13px] font-medium text-[var(--mut)] hover:text-[var(--fore)] hover:border-[var(--mut)] transition-colors"
            >
              Compare models
            </Link>
            <Link
              href={`/models/${slug}/providers`}
              className="px-4 py-2 rounded-full bg-[var(--fore)] text-[var(--background)] text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              API provider benchmarks
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 rounded-full border border-[var(--color-line)] text-[13px] font-medium text-[var(--mut)] hover:text-[var(--fore)] hover:border-[var(--mut)] transition-colors"
            >
              Ask about this model
            </Link>
          </div>
        </div>

        {/* Model summary cards */}
        <section className="mb-10" aria-label="Model summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-2">Intelligence</div>
              {intelScore != null ? (
                <>
                  {intelRank != null && (
                    <div className="text-[12px] font-medium text-[var(--mut)] tabular-nums">#{intelRank} / {classTotal}</div>
                  )}
                  <div className="text-3xl font-semibold tabular-nums text-[var(--fore)] mt-0.5">{Math.round(intelScore)}</div>
                  <div className="text-[11px] text-[var(--mut)] mt-1">Artificial Analysis Intelligence Index</div>
                  <UnitBars filled={intelUnits} color="var(--aa-purple)" />
                  <div className="text-[10px] text-[var(--dim)] mt-1">{intelUnits} of 4 units for Intelligence</div>
                </>
              ) : (
                <div className="text-[var(--dim)]">—</div>
              )}
            </div>

            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-2">Speed</div>
              {speed != null ? (
                <>
                  {speedRank != null && (
                    <div className="text-[12px] font-medium text-[var(--mut)] tabular-nums">#{speedRank} / {speedPool.length}</div>
                  )}
                  <div className="text-3xl font-semibold tabular-nums text-[var(--fore)] mt-0.5">{Math.round(speed * 10) / 10}</div>
                  <div className="text-[11px] text-[var(--mut)] mt-1">Output tokens per second</div>
                  <UnitBars filled={speedUnits} color="#34a853" />
                  <div className="text-[10px] text-[var(--dim)] mt-1">{speedUnits} of 4 units for Speed</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-semibold text-[var(--dim)]">N/A</div>
                  <div className="text-[11px] text-[var(--mut)] mt-1">no API provider benchmarked yet</div>
                </>
              )}
            </div>

            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-2">Cost</div>
              {cost != null ? (
                <>
                  {costRank != null && (
                    <div className="text-[12px] font-medium text-[var(--mut)] tabular-nums">#{costRank} / {costPool.length}</div>
                  )}
                  <div className="text-3xl font-semibold tabular-nums text-[var(--fore)] mt-0.5">{fmtTaskCost(cost)}</div>
                  <div className="text-[11px] text-[var(--mut)] mt-1">Cost per Intelligence Index task</div>
                  {model.promptPrice !== undefined && (
                    <div className="mt-2 text-[11px] text-[var(--mut)] tabular-nums">
                      In {fmtPrice(model.promptPrice)} · Out {fmtPrice(model.completionPrice)}
                    </div>
                  )}
                  <UnitBars filled={costUnits} color="var(--aa-orange)" />
                  <div className="text-[10px] text-[var(--dim)] mt-1">{costUnits} of 4 units for Cost</div>
                </>
              ) : (
                <div className="text-[var(--dim)]">—</div>
              )}
            </div>

            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-2">Verbosity</div>
              {verbosity != null ? (
                <>
                  {verbRank != null && (
                    <div className="text-[12px] font-medium text-[var(--mut)] tabular-nums">#{verbRank} / {verbPool.length}</div>
                  )}
                  <div className="text-3xl font-semibold tabular-nums text-[var(--fore)] mt-0.5">{fmtVerbosity(verbosity)}</div>
                  <div className="text-[11px] text-[var(--mut)] mt-1">Output tokens from Intelligence Index</div>
                  <UnitBars filled={verbUnits} color="#eab308" />
                  <div className="text-[10px] text-[var(--dim)] mt-1">{verbUnits} of 4 units for Verbosity</div>
                </>
              ) : (
                <div className="text-[var(--dim)]">—</div>
              )}
            </div>
          </div>
        </section>

        {/* Class explainer */}
        <section className="mb-10">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-2">
              {classTotal} models in this class · {classLabel}
            </div>
            <p className="text-[12px] text-[var(--mut)] leading-relaxed max-w-3xl">
              Ranks above are computed against models of the same class
              {isOpen
                ? ' — open weights models are compared only with other open weights models, grouped by size (Tiny ≤4B, Small 4–40B, Medium 40–150B, Large >150B parameters).'
                : ' — proprietary models are compared within their blended-price band (<$0.15, $0.15–$1, >$1 per 1M tokens at a 3:1 input/output ratio).'}
            </p>
          </div>
        </section>

        {/* Comparison summary */}
        <section className="mb-10">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-3">Comparison Summary</div>
            <div className="text-[13px] text-[var(--mut)] leading-relaxed max-w-3xl space-y-2">
              {summaryBits.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
            </div>
            {model.description && (
              <p className="text-[13px] text-[var(--dim)] leading-relaxed max-w-3xl mt-3">{model.description}</p>
            )}
          </div>
        </section>

        {/* Intelligence vs cost with this model highlighted */}
        <section className="mb-10">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-1">
              Intelligence Index vs. Cost per Task
            </div>
            <p className="text-[11px] text-[var(--dim)] mb-4">
              {model.name} highlighted in purple against the frontier.
            </p>
            <IntelligenceScatter limit={150} highlightId={model.id} />
          </div>
        </section>

        {/* Benchmarks */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-medium tracking-tight text-[var(--fore)] mb-4">Benchmarks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">Artificial Analysis Intelligence Index</div>
                {intelRank != null && <div className="text-[11px] text-[var(--mut)]">#{intelRank} / {classTotal}</div>}
              </div>
              {intelScore != null ? (
                <>
                  <div className="text-3xl font-semibold tabular-nums text-[var(--fore)]">{Math.round(intelScore)} <span className="text-[13px] font-normal text-[var(--mut)]">/ 100</span></div>
                  <div className="mt-3 h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(intelScore))}%`, background: 'var(--aa-purple)' }} />
                  </div>
                  <div className="text-[10px] text-[var(--dim)] mt-1.5">{intelUnits} of 4 units for Intelligence</div>
                </>
              ) : (
                <div className="text-[var(--dim)]">—</div>
              )}
            </div>

            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">Coding Index</div>
                {model.codingIndex != null && <div className="text-[11px] text-[var(--mut)]">agentic coding</div>}
              </div>
              {model.codingIndex != null ? (
                <>
                  <div className="text-3xl font-semibold tabular-nums text-[var(--fore)]">{model.codingIndex} <span className="text-[13px] font-normal text-[var(--mut)]">/ 100</span></div>
                  <div className="mt-3 h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, model.codingIndex)}%` }} />
                  </div>
                  <div className="text-[10px] text-[var(--dim)] mt-1.5">{unitsFor(model.codingIndex)} of 4 units for Coding</div>
                </>
              ) : (
                <div className="text-[var(--dim)]">—</div>
              )}
            </div>

            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">Agentic Index</div>
                {model.agenticIndex != null && <div className="text-[11px] text-[var(--mut)]">agentic tasks</div>}
              </div>
              {model.agenticIndex != null ? (
                <>
                  <div className="text-3xl font-semibold tabular-nums text-[var(--fore)]">{model.agenticIndex} <span className="text-[13px] font-normal text-[var(--mut)]">/ 100</span></div>
                  <div className="mt-3 h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, model.agenticIndex)}%` }} />
                  </div>
                  <div className="text-[10px] text-[var(--dim)] mt-1.5">{unitsFor(model.agenticIndex)} of 4 units for Agentic</div>
                </>
              ) : (
                <div className="text-[var(--dim)]">—</div>
              )}
            </div>

            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">LMArena Elo</div>
                {model.elo != null && <div className="text-[11px] text-[var(--mut)]">human preference</div>}
              </div>
              {model.elo != null ? (
                <>
                  <div className="text-3xl font-semibold tabular-nums text-[var(--fore)]">{model.elo} <span className="text-[13px] font-normal text-[var(--mut)]">Elo</span></div>
                  <div className="mt-3 h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--mut)] rounded-full" style={{ width: `${Math.min(100, (model.elo / 1450) * 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-[var(--dim)] mt-1.5">{model.numVotes ? `${model.numVotes.toLocaleString()} votes` : 'voted by humans'}</div>
                </>
              ) : (
                <div className="text-[var(--dim)]">—</div>
              )}
            </div>
          </div>

          {/* Openness + index composition */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-2">Artificial Analysis Openness Index</div>
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-semibold tabular-nums text-[var(--fore)]">{opennessScore}</div>
                <div className="flex-1 h-1.5 bg-[var(--input)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${opennessScore}%` }} />
                </div>
              </div>
              <div className="text-[11px] text-[var(--mut)] mt-2">
                {isOpen
                  ? `Open weights — ${model.license || 'weights publicly available'}. The model can be self-hosted; the weights can be downloaded and redistributed.`
                  : 'Proprietary — weights are not publicly available. The model is only accessible via its provider API.'}
              </div>
            </div>

            <div className="border border-[var(--color-line)] rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--dim)] mb-3">Intelligence Index Composition</div>
              <p className="text-[11px] text-[var(--mut)] mb-3 leading-relaxed">
                The Artificial Analysis Intelligence Index v4.3 is a composite of 10 evaluations, each weighted into a 0–100 score.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                {INTEL_EVALS.map(e => (
                  <div key={e.name} className="flex items-center gap-2 text-[12px]">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--aa-purple)' }} />
                    <span className="font-medium truncate text-[var(--fore)]">{e.name}</span>
                    <span className="text-[var(--dim)] truncate hidden sm:inline">— {e.what}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Technical specifications */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-medium tracking-tight text-[var(--fore)] mb-4">Technical Specifications</h2>
          <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <tbody>
                {[
                  { label: 'Provider', value: model.provider || '—' },
                  { label: 'Type', value: isOpen ? 'Open weights' : 'Proprietary' },
                  { label: 'Released', value: model.released ? fmtDate(model.released) : '—' },
                  {
                    label: 'Context window',
                    value: model.context
                      ? `${model.context} tokens${ctxPages ? ` (~${ctxPages.toLocaleString()} A4 pages)` : ''}`
                      : '—',
                  },
                  { label: 'Total parameters', value: model.params ? `${model.params} parameters` : '—' },
                  { label: 'License', value: model.license || '—' },
                  {
                    label: 'Input price',
                    value: model.promptPrice !== undefined ? `$${model.promptPrice.toFixed(2)} per 1M tokens` : '—',
                  },
                  {
                    label: 'Output price',
                    value: model.completionPrice !== undefined ? `$${model.completionPrice.toFixed(2)} per 1M tokens` : '—',
                  },
                  { label: 'Source', value: model.source },
                ].map(row => (
                  <tr key={row.label} className="border-b border-[var(--color-line)] last:border-b-0">
                    <td className="py-3 px-4 w-48 text-[var(--dim)] text-[12px]">{row.label}</td>
                    <td className="py-3 px-4 font-medium text-[var(--fore)]">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="font-display text-2xl font-medium tracking-tight text-[var(--fore)] mb-4">Frequently Asked Questions</h2>
          <div className="border border-[var(--color-line)] rounded-lg overflow-hidden divide-y divide-[var(--color-line)]">
            {faqs.map(faq => (
              <div key={faq.q} className="px-5 py-4">
                <div className="text-[13px] font-medium text-[var(--fore)] mb-1">{faq.q}</div>
                <p className="text-[12px] text-[var(--mut)] leading-relaxed">{faq.a}</p>
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
                className="px-4 py-2 rounded-full border border-[var(--color-line)] text-[13px] text-[var(--mut)] hover:border-[var(--mut)] hover:text-[var(--fore)] transition-colors"
              >
                View on OpenRouter ↗
              </a>
            )}
            {model.license && (
              <a
                href={`https://huggingface.co/search/full-text?q=${encodeURIComponent(model.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full border border-[var(--color-line)] text-[13px] text-[var(--mut)] hover:border-[var(--mut)] hover:text-[var(--fore)] transition-colors"
              >
                Find weights on Hugging Face ↗
              </a>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
