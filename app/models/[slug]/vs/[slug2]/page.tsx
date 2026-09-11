import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { loadModelCatalog } from '@/lib/models-catalog';
import type { ModelRecord } from '@/lib/model-registry';
import { SITE_NAME } from '@/lib/site';
import { modelMatchesSlug, preferredSlug } from '@/lib/model-slug';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; slug2: string }>;
}

function findModel(models: ModelRecord[] | undefined, slug: string): ModelRecord | undefined {
  return models?.find(m => modelMatchesSlug(m, slug));
}

function fmt(v: number | undefined | null, digits = 1): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

function taskCost(m: ModelRecord): number | null {
  if (m.aaCostPerTask != null) return m.aaCostPerTask;
  if (m.promptPrice == null && m.completionPrice == null) return null;
  const cache = (m.promptPrice ?? 0) * 0.1;
  return (cache * 7 + (m.promptPrice ?? 0) * 2 + (m.completionPrice ?? 0)) / 10;
}

function verdict(a: ModelRecord, b: ModelRecord): string {
  const bits: string[] = [];
  const ai = a.intelligenceIndex;
  const bi = b.intelligenceIndex;
  if (ai != null && bi != null && ai !== bi) {
    const smarter = ai > bi ? a : b;
    bits.push(`${smarter.name} is smarter (Intelligence ${Math.round(ai > bi ? ai : bi)} vs ${Math.round(ai > bi ? bi : ai)}).`);
  }
  const ca = taskCost(a);
  const cb = taskCost(b);
  if (ca != null && cb != null && ca !== cb) {
    const cheaper = ca < cb ? a : b;
    bits.push(`${cheaper.name} is cheaper per task ($${Math.min(ca, cb).toFixed(2)} vs $${Math.max(ca, cb).toFixed(2)}).`);
  }
  if (a.aaSpeed != null && b.aaSpeed != null && a.aaSpeed !== b.aaSpeed) {
    const faster = a.aaSpeed > b.aaSpeed ? a : b;
    bits.push(`${faster.name} is faster (${Math.max(a.aaSpeed, b.aaSpeed).toFixed(0)} vs ${Math.min(a.aaSpeed, b.aaSpeed).toFixed(0)} tok/s).`);
  }
  if (bits.length === 0) return 'These two trade blows — check the numbers that matter for your workload below.';
  return bits.join(' ');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, slug2 } = await params;
  return { title: `${slug} vs ${slug2} · ${SITE_NAME}` };
}

function StatCard({ model }: { model: ModelRecord }) {
  const cost = taskCost(model);
  const rows: Array<[string, string]> = [
    ['Provider', model.provider || '—'],
    ['Intelligence', model.intelligenceIndex != null ? String(Math.round(model.intelligenceIndex)) : '—'],
    ['Coding', model.codingIndex != null ? String(model.codingIndex) : '—'],
    ['Speed', model.aaSpeed != null ? `${fmt(model.aaSpeed, 0)} tok/s` : '—'],
    ['Cost / task', cost != null ? `$${cost.toFixed(2)}` : '—'],
    ['Input / 1M', model.promptPrice != null ? `$${model.promptPrice.toFixed(2)}` : '—'],
    ['Output / 1M', model.completionPrice != null ? `$${model.completionPrice.toFixed(2)}` : '—'],
    ['Context', model.context || '—'],
    ['Released', model.released || '—'],
    ['Type', model.family === 'open-weights' || model.family === 'open' ? 'Open weights' : 'Proprietary'],
  ];
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--card)] p-5">
      <Link href={`/models/${preferredSlug(model)}`} className="text-lg font-semibold tracking-tight hover:underline">
        {model.name}
      </Link>
      <p className="mt-0.5 text-xs text-[var(--mut)]">{model.provider}</p>
      <dl className="mt-4 divide-y divide-[var(--color-line)]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2 text-sm">
            <dt className="text-[var(--mut)]">{k}</dt>
            <dd className="font-mono tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function ComparePage({ params }: Props) {
  const { slug, slug2 } = await params;
  const db = await loadModelCatalog();
  const a = findModel(db?.models, slug);
  const b = findModel(db?.models, slug2);
  if (!a || !b) notFound();

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-[1200px] px-5 pb-16 pt-8">
        <Link href={`/models/${preferredSlug(a)}`} className="text-[12px] text-neutral-400 hover:text-neutral-600">
          ← {a.name}
        </Link>
        <p className="section-label mt-4">Side-by-side</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
          {a.name} <span className="text-[var(--mut)]">vs</span> {b.name}
        </h1>
        <p
          role="note"
          className="mt-3 max-w-[70ch] rounded-[var(--radius-md)] border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-4 py-2.5 text-sm leading-relaxed"
        >
          <span className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-hover)]">
            TL;DR
          </span>
          {verdict(a, b)}
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard model={a} />
          <StatCard model={b} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
