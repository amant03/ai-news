'use client';

import { useMemo } from 'react';
import type { ModelRecord } from '@/lib/model-registry';
import { providerColor } from '@/lib/models';
import { finiteNum } from '@/lib/format';
import VerticalBarChart, { modelsToBarData } from './VerticalBarChart';
import ScatterChart, { ScatterPoint } from './ScatterChart';
import { SourcePills } from './SourceLink';

interface ModelDetailProps {
  model: ModelRecord;
  pool: ModelRecord[];
  onSelect?: (id: string) => void;
}

const fmtNum = (n?: number | null, digits = 1) => {
  const v = finiteNum(n);
  return v === undefined ? '—' : v.toLocaleString('en-US', { maximumFractionDigits: digits });
};

function avgCost(m: ModelRecord): number | undefined {
  const p = finiteNum(m.promptPrice);
  const c = finiteNum(m.completionPrice);
  if (p === undefined && c === undefined) return undefined;
  return ((p ?? c ?? 0) + (c ?? p ?? 0)) / 2;
}

function fmtCost(v: number) {
  if (!Number.isFinite(v)) return '—';
  if (v <= 0.02) return 'Free';
  if (v < 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(1)}`;
}

function costPerTask(m: ModelRecord): number | undefined {
  return finiteNum(m.aaCostPerTask) ?? avgCost(m);
}

function speedOf(m: ModelRecord): number | undefined {
  return finiteNum(m.aaSpeed);
}

function fmtVerb(v: number | undefined | null): string {
  const n = finiteNum(v);
  if (n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function quality(m: ModelRecord): number | undefined {
  if (m.intelligenceIndex !== undefined) return m.intelligenceIndex;
  if (m.elo !== undefined) return (m.elo - 1000) / 10;
  return undefined;
}

/**
 * Artificial-Analysis-style model analysis panel. Breadcrumb header,
 * 4 summary metric cards with rank + bar, comparison bar charts,
 * benchmark bars, and scatter.
 */
export default function ModelDetail({ model, pool, onSelect }: ModelDetailProps) {
  const color = providerColor(model.provider);

  // Rank computation
  const intelRank = useMemo(() => {
    const scored = pool.filter(m => finiteNum(m.intelligenceIndex) !== undefined).sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0));
    const idx = scored.findIndex(m => m.id === model.id);
    return idx >= 0 ? idx + 1 : undefined;
  }, [pool, model.id]);

  const codingRank = useMemo(() => {
    const scored = pool.filter(m => finiteNum(m.codingIndex) !== undefined).sort((a, b) => (b.codingIndex ?? 0) - (a.codingIndex ?? 0));
    const idx = scored.findIndex(m => m.id === model.id);
    return idx >= 0 ? idx + 1 : undefined;
  }, [pool, model.id]);

  const totalWithIntel = useMemo(() => pool.filter(m => finiteNum(m.intelligenceIndex) !== undefined).length, [pool]);
  const totalWithCoding = useMemo(() => pool.filter(m => finiteNum(m.codingIndex) !== undefined).length, [pool]);

  const maxIntel = useMemo(() => Math.max(1, ...pool.map(m => m.intelligenceIndex ?? 0)), [pool]);
  const maxCoding = useMemo(() => Math.max(1, ...pool.map(m => m.codingIndex ?? 0)), [pool]);

  const cost = costPerTask(model);
  const speed = speedOf(model);

  const speedRank = useMemo(() => {
    const scored = pool.filter(m => finiteNum(m.aaSpeed) !== undefined).sort((a, b) => (b.aaSpeed ?? 0) - (a.aaSpeed ?? 0));
    const idx = scored.findIndex(m => m.id === model.id);
    return idx >= 0 ? idx + 1 : undefined;
  }, [pool, model.id]);
  const totalWithSpeed = useMemo(() => pool.filter(m => finiteNum(m.aaSpeed) !== undefined).length, [pool]);
  const maxSpeed = useMemo(() => Math.max(1, ...pool.map(m => m.aaSpeed ?? 0)), [pool]);

  // Bar chart data for comparisons — prefer AA-native speed/cost when present
  const intelBars = useMemo(() => modelsToBarData(pool, m => m.intelligenceIndex, { maxBars: 12, highlightId: model.id }), [pool, model.id]);
  const costBars = useMemo(() => modelsToBarData(pool, m => costPerTask(m), { maxBars: 12, highlightId: model.id }), [pool, model.id]);
  const speedOrCodingBars = useMemo(
    () => (totalWithSpeed >= 3
      ? modelsToBarData(pool, m => m.aaSpeed, { maxBars: 12, highlightId: model.id })
      : modelsToBarData(pool, m => m.codingIndex, { maxBars: 12, highlightId: model.id })),
    [pool, model.id, totalWithSpeed]
  );

  // Benchmark data — using our indices as proxies
  const benchmarks = useMemo(() => {
    const maxAgentic = Math.max(1, ...pool.map(m => m.agenticIndex ?? 0));
    const maxElo = Math.max(1, ...pool.map(m => (m.elo ?? 0) - 1200));
    const maxValue = Math.max(1, ...pool.map(m => m.valueScore ?? 0));

    return [
      { label: 'Intelligence Index', value: model.intelligenceIndex, max: maxIntel, color },
      { label: 'Coding Index', value: model.codingIndex, max: maxCoding, color },
      { label: 'Agentic Index', value: model.agenticIndex, max: maxAgentic, color },
      { label: 'LMArena Elo', value: model.elo !== undefined ? model.elo - 1200 : undefined, max: maxElo, color },
      { label: 'Value Score', value: model.valueScore, max: maxValue, color },
    ].filter(b => b.value !== undefined);
  }, [model, pool, maxIntel, maxCoding, color]);

  // Scatter data
  const scatterPoints = useMemo((): ScatterPoint[] => {
    const peerPool = pool
      .filter(m => m.id !== model.id && m.intelligenceIndex !== undefined && costPerTask(m) !== undefined)
      .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))
      .slice(0, 20);

    return [model, ...peerPool].map(m => {
      const x = costPerTask(m);
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
    }).filter((p): p is NonNullable<typeof p> => p !== null);
  }, [model, pool]);

  const links = modelSourceLinksFor(model);

  return (
    <div className="space-y-5">
      {/* Breadcrumb header — AA-style */}
      <div className="flex flex-wrap items-center gap-2 text-[14px]">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[var(--mut)]">{model.provider}</span>
        <span className="text-[var(--mut)]">›</span>
        <span className="font-semibold text-[var(--fore)]">{model.name}</span>
        {model.family === 'open-weights' && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--ok)]/30 text-[var(--ok)]">Open Weights</span>
        )}
        {model.family !== 'open-weights' && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--violet)]/30 text-[var(--violet)]">Proprietary</span>
        )}
        {model.released && (
          <span className="text-[12px] text-[var(--mut)]">Released {model.released.slice(0, 10)}</span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display font-semibold text-base text-[var(--fore)]">
        {model.name} Intelligence, Performance & Price Analysis
      </h3>

      {/* 4 Summary metric cards — AA-style: Intelligence / Speed / Cost / Verbosity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Intelligence"
          rank={intelRank ? `#${intelRank}` : '—'}
          total={totalWithIntel}
          value={fmtNum(model.intelligenceIndex)}
          unit="Intelligence Index"
          accent
          pct={finiteNum(model.intelligenceIndex) !== undefined ? (model.intelligenceIndex! / maxIntel) * 100 : 0}
        />
        <SummaryCard
          label={totalWithSpeed >= 3 ? 'Speed' : 'Coding'}
          rank={totalWithSpeed >= 3 ? (speedRank ? `#${speedRank}` : '—') : (codingRank ? `#${codingRank}` : '—')}
          total={totalWithSpeed >= 3 ? totalWithSpeed : totalWithCoding}
          value={totalWithSpeed >= 3 ? (speed !== undefined ? `${speed.toFixed(0)}` : 'N/A') : fmtNum(model.codingIndex)}
          unit={totalWithSpeed >= 3 ? 'tokens / second' : 'Coding Index'}
          pct={totalWithSpeed >= 3
            ? (speed !== undefined ? (speed / maxSpeed) * 100 : 0)
            : (finiteNum(model.codingIndex) !== undefined ? (model.codingIndex! / maxCoding) * 100 : 0)}
        />
        <SummaryCard
          label="Cost"
          rank={cost !== undefined ? fmtCost(cost) : '—'}
          total={undefined}
          value={cost !== undefined ? fmtCost(cost) : '—'}
          unit={finiteNum(model.aaCostPerTask) !== undefined ? 'per Index task' : cost !== undefined ? 'per task (blended)' : 'no pricing'}
          pct={cost !== undefined ? Math.max(6, Math.min(100, 100 / (1 + cost))) : 0}
        />
        <SummaryCard
          label="Verbosity"
          rank={finiteNum(model.aaVerbosity) !== undefined ? fmtVerb(model.aaVerbosity) : (model.context || '—')}
          total={undefined}
          value={finiteNum(model.aaVerbosity) !== undefined ? fmtVerb(model.aaVerbosity) : (model.context || '—')}
          unit={finiteNum(model.aaVerbosity) !== undefined ? 'output tokens / task' : model.params ? `${model.params} params` : 'token window'}
          pct={finiteNum(model.aaVerbosity) !== undefined ? 45 : 50}
        />
      </div>

      {/* Comparison Summary */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--input)]/30 p-5">
        <div className="text-xs uppercase tracking-widest text-[var(--mut)] mb-2 font-medium">Comparison Summary</div>
        <p className="text-[13px] text-[var(--mut)] leading-relaxed">
          {model.name} from {model.provider}
          {finiteNum(model.intelligenceIndex) !== undefined && ` scores ${model.intelligenceIndex} on the Intelligence Index`}
          {cost !== undefined && ` at ${fmtCost(cost)}${finiteNum(model.aaCostPerTask) !== undefined ? ' per Intelligence Index task' : ' blended per 1M tokens'}`}
          {finiteNum(model.codingIndex) !== undefined && ` with a coding index of ${model.codingIndex}`}
          {speed !== undefined && `, running at ${speed.toFixed(0)} tokens/second`}
          {finiteNum(model.aaVerbosity) !== undefined && ` and generating ${fmtVerb(model.aaVerbosity)} tokens per task`}
          {model.context ? `. Supports ${model.context} context window` : ''}.
          {finiteNum(model.promptPrice) !== undefined && ` (In $${model.promptPrice!.toFixed(2)}/1M · Out $${(finiteNum(model.completionPrice) ?? 0).toFixed(2)}/1M)`}
        </p>
      </div>

      {/* Technical specifications — AA parity */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--input)]/30 p-5">
        <div className="text-xs uppercase tracking-widest text-[var(--mut)] mb-2 font-medium">Technical specifications</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[12px]">
          {model.context && (
            <div>
              <span className="text-[var(--mut)]">Context Window</span>
              <div className="font-mono text-[var(--fore)]">{model.context}</div>
            </div>
          )}
          {model.family && (
            <div>
              <span className="text-[var(--mut)]">Weights</span>
              <div className="text-[var(--fore)]">{model.family === 'open-weights' ? 'Open' : 'Proprietary'}</div>
            </div>
          )}
          {model.released && (
            <div>
              <span className="text-[var(--mut)]">Released</span>
              <div className="font-mono text-[var(--fore)]">{model.released.slice(0, 10)}</div>
            </div>
          )}
          {finiteNum(model.promptPrice) !== undefined && (
            <div>
              <span className="text-[var(--mut)]">Input Price</span>
              <div className="font-mono text-[var(--fore)]">${model.promptPrice!.toFixed(2)}/1M</div>
            </div>
          )}
          {finiteNum(model.completionPrice) !== undefined && (
            <div>
              <span className="text-[var(--mut)]">Output Price</span>
              <div className="font-mono text-[var(--fore)]">${model.completionPrice!.toFixed(2)}/1M</div>
            </div>
          )}
          {model.params && (
            <div>
              <span className="text-[var(--mut)]">Parameters</span>
              <div className="text-[var(--fore)]">{model.params}</div>
            </div>
          )}
          {finiteNum(model.aaSpeed) !== undefined && (
            <div>
              <span className="text-[var(--mut)]">Speed</span>
              <div className="font-mono text-[var(--fore)]">{model.aaSpeed!.toFixed(0)} t/s</div>
            </div>
          )}
          {finiteNum(model.aaCostPerTask) !== undefined && (
            <div>
              <span className="text-[var(--mut)]">Cost / Index task</span>
              <div className="font-mono text-[var(--fore)]">${model.aaCostPerTask!.toFixed(2)}</div>
            </div>
          )}
          {finiteNum(model.aaVerbosity) !== undefined && (
            <div>
              <span className="text-[var(--mut)]">Verbosity</span>
              <div className="font-mono text-[var(--fore)]">{fmtVerb(model.aaVerbosity)} tokens</div>
            </div>
          )}
          {model.license && (
            <div>
              <span className="text-[var(--mut)]">License</span>
              <div className="text-[var(--fore)]">{model.license}</div>
            </div>
          )}
          <div>
            <span className="text-[var(--mut)]">Input / Output</span>
            <div className="text-[var(--fore)]">text / text</div>
          </div>
        </div>
      </div>

      {/* Bar chart comparisons — 2-col grid (AA-style img5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <VerticalBarChart
          data={intelBars}
          title="Intelligence"
          subtitle="Artificial Analysis Intelligence Index · higher is better"
          valueFormat={v => v.toFixed(1)}
          selectedId={model.id}
          onSelect={id => onSelect?.(id)}
        />
        <VerticalBarChart
          data={costBars}
          title="Cost per Task"
          subtitle={pool.some(m => finiteNum(m.aaCostPerTask) !== undefined) ? 'USD per Intelligence Index task · lower is better' : 'USD per 1M tokens (blended) · lower is better'}
          valueFormat={v => fmtCost(v)}
          selectedId={model.id}
          onSelect={id => onSelect?.(id)}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <VerticalBarChart
          data={speedOrCodingBars}
          title={totalWithSpeed >= 3 ? 'Speed' : 'Coding Index'}
          subtitle={totalWithSpeed >= 3 ? 'Output tokens per second · higher is better' : 'Coding capability index · higher is better'}
          valueFormat={v => v.toFixed(totalWithSpeed >= 3 ? 0 : 1)}
          selectedId={model.id}
          onSelect={id => onSelect?.(id)}
        />
      </div>

      {/* Benchmark bars — AA-style horizontal bars */}
      {benchmarks.length > 0 && (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--input)]/30 p-5">
          <div className="text-xs uppercase tracking-widest text-[var(--mut)] mb-3 font-medium">Benchmarks</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {benchmarks.map(b => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-[var(--mut)]">{b.label}</span>
                  <span className="font-mono text-[var(--cyan)] font-medium">{fmtNum(b.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--panel-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, ((b.value ?? 0) / b.max) * 100)}%`, background: `linear-gradient(90deg, ${color}55, ${color})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intelligence vs Cost scatter */}
      {scatterPoints.length >= 3 && (
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--input)]/30 overflow-hidden">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-[var(--mut)] font-medium">Intelligence vs Cost</span>
            <span className="text-[11px] text-[var(--mut)] font-mono">best trade-off = up-left</span>
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
            height={200}
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

function SummaryCard({
  label,
  rank,
  total,
  value,
  unit,
  accent = false,
  pct,
}: {
  label: string;
  rank: string;
  total?: number;
  value: string;
  unit: string;
  accent?: boolean;
  pct: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest text-[var(--mut)] font-medium">{label}</span>
        <span className="text-[11px] font-mono text-[var(--mut)]">
          {total !== undefined ? `${rank} / ${total}` : rank}
        </span>
      </div>
      <div className={`font-display font-bold text-4xl ${accent ? 'text-[var(--cyan)]' : 'text-[var(--fore)]'}`}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--mut)] mt-1 mb-2">{unit}</div>
      <div className="h-2 rounded-full bg-[var(--panel-2)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: accent ? 'linear-gradient(90deg, var(--cyan), var(--violet))' : 'var(--mut)',
          }}
        />
      </div>
    </div>
  );
}

function modelSourceLinksFor(m: ModelRecord) {
  const links: Array<{ label: string; href: string }> = [];
  if (/^[a-z0-9.-]+\/[a-z0-9._-]+$/i.test(m.id)) links.push({ label: 'OpenRouter', href: `https://openrouter.ai/${m.id}` });
  if (m.elo !== undefined) links.push({ label: 'LM Arena', href: 'https://lmarena.ai/leaderboard/text' });
  if (m.intelligenceIndex !== undefined) links.push({ label: 'Artificial Analysis', href: 'https://artificialanalysis.ai/models' });
  return links;
}