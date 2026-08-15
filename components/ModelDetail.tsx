'use client';

import { useMemo } from 'react';
import type { ModelRecord } from '@/lib/model-registry';
import { providerColor } from '@/lib/models';
import ScatterChart, { ScatterPoint } from './ScatterChart';
import { SourcePills } from './SourceLink';

interface ModelDetailProps {
  model: ModelRecord;
  pool: ModelRecord[];
  onSelect?: (id: string) => void;
}

const fmtNum = (n?: number, digits = 1) =>
  n === undefined ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: digits });

function avgCost(m: ModelRecord): number | undefined {
  if (m.promptPrice === undefined && m.completionPrice === undefined) return undefined;
  const p = m.promptPrice ?? m.completionPrice ?? 0;
  const c = m.completionPrice ?? m.promptPrice ?? 0;
  return (p + c) / 2;
}

function fmtCost(v: number) {
  if (v <= 0.02) return 'Free';
  if (v < 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(1)}`;
}

function quality(m: ModelRecord): number | undefined {
  if (m.intelligenceIndex !== undefined) return m.intelligenceIndex;
  if (m.elo !== undefined) return (m.elo - 1000) / 10;
  return undefined;
}

interface BenchBar {
  label: string;
  value?: number;
  max: number;
  hint: string;
}

/**
 * Artificial-Analysis-style model analysis panel: summary stat cards,
 * horizontal comparison bars (where the model sits vs its peers), and
 * per-metric benchmark bars. Scatter with Pareto line at the bottom.
 */
export default function ModelDetail({ model, pool, onSelect }: ModelDetailProps) {
  const color = providerColor(model.provider);

  const peerPool = useMemo(
    () =>
      pool
        .filter(m => m.id !== model.id && quality(m) !== undefined && m.intelligenceIndex !== undefined)
        .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))
        .slice(0, 12),
    [pool, model.id]
  );

  const rank = useMemo(() => {
    const scored = pool.filter(m => m.intelligenceIndex !== undefined).sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
    const idx = scored.findIndex(m => m.id === model.id);
    return idx >= 0 ? idx + 1 : undefined;
  }, [pool, model.id]);

  const maxIntelligence = useMemo(() => Math.max(1, ...pool.map(m => m.intelligenceIndex ?? 0)), [pool]);
  const maxCoding = useMemo(() => Math.max(1, ...pool.map(m => m.codingIndex ?? 0)), [pool]);
  const maxAgentic = useMemo(() => Math.max(1, ...pool.map(m => m.agenticIndex ?? 0)), [pool]);

  const cost = avgCost(model);
  const peersByIntelligence = [model, ...peerPool].sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0)).slice(0, 10);
  const peersByCost = [model, ...peerPool]
    .map(m => ({ m, c: avgCost(m) }))
    .filter(x => x.c !== undefined)
    .sort((a, b) => a.c! - b.c!)
    .slice(0, 10)
    .map(x => x.m);

  const benchmarks: BenchBar[] = [
    { label: 'Intelligence Index', value: model.intelligenceIndex, max: maxIntelligence, hint: 'Composite capability score (v4.1-style)' },
    { label: 'Coding Index', value: model.codingIndex, max: maxCoding, hint: 'Coding capability' },
    { label: 'Agentic Index', value: model.agenticIndex, max: maxAgentic, hint: 'Agentic / tool-use capability' },
    { label: 'LMArena Elo', value: model.elo !== undefined ? model.elo - 1200 : undefined, max: Math.max(300, ...pool.map(m => (m.elo ?? 0) - 1200)), hint: 'Human-preference Elo (offset)' },
    { label: 'Value Score', value: model.valueScore, max: Math.max(1, ...pool.map(m => m.valueScore ?? 0)), hint: 'Capability per dollar' },
  ].filter(b => b.value !== undefined);

  const scatterPoints: ScatterPoint[] = [model, ...peerPool]
    .map(m => {
      const x = avgCost(m);
      const y = m.intelligenceIndex;
      if (x === undefined || y === undefined) return null;
      return {
        id: m.id,
        label: m.name,
        sublabel: m.provider,
        color: providerColor(m.provider),
        x: Math.max(x, 0.01),
        y,
        size: m.codingIndex ?? 1,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const links = modelSourceLinksFor(model);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <h3 className="font-display font-semibold text-lg text-[var(--fore)]">{model.name}</h3>
        <span className="text-[12px] text-[var(--mut)]">{model.provider}</span>
        {model.released && <span className="text-[11px] font-mono text-[var(--dim)]">Released {model.released.slice(0, 10)}</span>}
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${model.family === 'open-weights' ? 'border-[var(--ok)]/40 text-[var(--ok)]' : 'border-[var(--violet)]/40 text-[var(--violet)]'}`}>
          {model.family === 'open-weights' ? 'Open Weights' : 'Proprietary'}
        </span>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard
          label={rank ? `Intelligence · #${rank}` : 'Intelligence'}
          value={model.intelligenceIndex !== undefined ? fmtNum(model.intelligenceIndex) : model.elo !== undefined ? `Elo ${fmtNum(model.elo, 0)}` : '—'}
          sub={quality(model) !== undefined ? `of ${maxIntelligence} max` : 'model quality'}
          pct={quality(model) !== undefined ? Math.min(100, ((quality(model)! / maxIntelligence) * 100)) : 0}
          accent
        />
        <StatCard
          label="Cost / Task"
          value={cost !== undefined ? fmtCost(cost) : '—'}
          sub={cost !== undefined ? 'per 1M tokens (blended)' : 'no pricing'}
          pct={cost !== undefined ? Math.max(6, Math.min(100, 100 / (1 + cost))) : 0}
        />
        <StatCard
          label="Context Window"
          value={model.context || '—'}
          sub={model.params ? `${model.params} params` : 'token window'}
          pct={50}
        />
        <StatCard
          label="Value Score"
          value={model.valueScore !== undefined ? fmtNum(model.valueScore, 0) : '—'}
          sub="capability per dollar"
          pct={model.valueScore !== undefined ? Math.min(100, model.valueScore) : 0}
        />
      </div>

      {/* Comparison bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CompareBars
          title="Intelligence"
          caption="Artificial Analysis Intelligence Index · higher is better"
          models={peersByIntelligence}
          getValue={m => m.intelligenceIndex}
          getLabel={v => fmtNum(v)}
          highlightId={model.id}
          onSelect={onSelect}
        />
        <CompareBars
          title="Cost per Task"
          caption="USD per 1M tokens (blended) · lower is better"
          models={peersByCost}
          getValue={m => avgCost(m)}
          getLabel={v => (v !== undefined ? fmtCost(v) : '—')}
          highlightId={model.id}
          onSelect={onSelect}
          invert
        />
      </div>

      {/* Benchmark bars */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--input)]/50 p-3.5">
        <div className="text-[10px] uppercase tracking-widest text-[var(--mut)] mb-2.5">Benchmarks</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {benchmarks.map(b => (
            <div key={b.label} title={b.hint}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-[var(--mut)]">{b.label}</span>
                <span className="font-mono text-[var(--cyan)]">{fmtNum(b.value)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--panel-2)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, ((b.value ?? 0) / b.max) * 100)}%`, background: `linear-gradient(90deg, ${color}55, ${color})` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scatter with Pareto */}
      {scatterPoints.length >= 2 && (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--input)]/50 overflow-hidden">
          <div className="px-3.5 pt-3 pb-1 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[var(--mut)]">Intelligence vs Cost</span>
            <span className="text-[9px] text-[var(--dim)] font-mono">best trade-off = up-left</span>
          </div>
          <ScatterChart
            points={scatterPoints}
            labeledIds={new Set([model.id, ...scatterPoints.slice(0, 5).map(p => p.id)])}
            selectedId={model.id}
            onSelect={id => onSelect?.(id)}
            xLabel="How expensive"
            yLabel="How smart"
            sizeLabel="coding skill"
            xFormat={v => fmtCost(v)}
            yFormat={v => fmtNum(v, 0)}
            xLog
            betterCorner="tl"
            height={220}
          />
        </div>
      )}

      {model.description && (
        <p className="text-[12px] text-[var(--mut)] leading-relaxed">{model.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SourcePills links={links} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, pct, accent = false }: { label: string; value: string; sub: string; pct: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-3">
      <div className="text-[9px] uppercase tracking-widest text-[var(--dim)] mb-1.5">{label}</div>
      <div className={`font-display font-semibold text-lg ${accent ? 'text-[var(--cyan)]' : 'text-[var(--fore)]'}`}>{value}</div>
      <div className="text-[10px] text-[var(--mut)] mb-2">{sub}</div>
      <div className="h-1 rounded-full bg-[var(--panel-2)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--accent)]/80" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

function CompareBars({
  title,
  caption,
  models,
  getValue,
  getLabel,
  highlightId,
  onSelect,
  invert = false,
}: {
  title: string;
  caption: string;
  models: ModelRecord[];
  getValue: (m: ModelRecord) => number | undefined;
  getLabel: (v: number | undefined) => string;
  highlightId: string;
  onSelect?: (id: string) => void;
  invert?: boolean;
}) {
  const max = Math.max(1, ...models.map(m => getValue(m) ?? 0));
  const vals = models.map(m => getValue(m) ?? 0);
  const min = Math.min(...vals);
  const span = max - min || 1;

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-3.5">
      <div className="text-[11px] font-medium text-[var(--fore)]">{title}</div>
      <div className="text-[9px] text-[var(--dim)] mb-3">{caption}</div>
      <div className="space-y-2">
        {models.map(m => {
          const v = getValue(m);
          const pct = invert
            ? Math.max(4, Math.min(100, ((max - (v ?? 0)) / span) * 100 + 2))
            : Math.max(4, Math.min(100, ((v ?? 0) / max) * 100));
          const active = m.id === highlightId;
          return (
            <button
              key={m.id}
              onClick={() => onSelect?.(m.id)}
              className={`ring-focus w-full text-left group ${active ? '' : 'opacity-80 hover:opacity-100'} transition-opacity`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="flex items-center gap-1.5 text-[11px] min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: providerColor(m.provider) }} />
                  <span className={`truncate ${active ? 'text-[var(--fore)] font-semibold' : 'text-[var(--mut)] group-hover:text-[var(--fore)]'}`}>
                    {m.name}
                  </span>
                </span>
                <span className={`font-mono text-[10px] flex-shrink-0 ${active ? 'text-[var(--cyan)]' : 'text-[var(--dim)]'}`}>{getLabel(v)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--panel-2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: active ? 'linear-gradient(90deg, var(--cyan), var(--violet))' : 'var(--mut)',
                    opacity: active ? 1 : 0.45,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function modelSourceLinksFor(m: ModelRecord) {
  const links: Array<{ label: string; href: string }> = [];
  const id = m.id.replace(/^(ollama|lmarena|freellm)\//, '');
  if (/^[a-z0-9.-]+\/[a-z0-9._-]+$/i.test(m.id)) links.push({ label: 'OpenRouter', href: `https://openrouter.ai/${m.id}` });
  if (m.elo !== undefined) links.push({ label: 'LM Arena', href: 'https://lmarena.ai/leaderboard/text' });
  if (m.intelligenceIndex !== undefined) links.push({ label: 'Artificial Analysis', href: 'https://artificialanalysis.ai/models' });
  return links;
}