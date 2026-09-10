'use client';

import { providerColor } from '@/lib/models';
import type { ModelRecord } from '@/lib/model-registry';
import type { SortDir } from '@/lib/sortable';

export interface BarDatum {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  color: string;
  highlight?: boolean;
}

interface VerticalBarChartProps {
  data: BarDatum[];
  title: string;
  subtitle?: string;
  valueLabel?: string;
  valueFormat?: (v: number) => string;
  format?: 'n0' | 'n1' | 'usd';
  maxBars?: number;
  height?: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Current sort direction of the chart's bar list (high→low / low→high). */
  sortDir?: SortDir;
  onToggleDir?: () => void;
}

const PRESET = {
  n0: (v: number) => (Number.isFinite(v) ? v.toFixed(0) : '—'),
  n1: (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—'),
  usd: (v: number) => (Number.isFinite(v) ? `$${v.toFixed(2)}` : '—'),
};

const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(0) : '—');

/**
 * Artificial-Analysis-style vertical bar chart: coloured bars, rotated labels
 * below, value labels on top, provider dot between bars and labels.
 */
export default function VerticalBarChart({
  data,
  title,
  subtitle,
  valueLabel,
  valueFormat,
  format,
  maxBars = 12,
  height = 220,
  selectedId,
  onSelect,
  sortDir,
  onToggleDir,
}: VerticalBarChartProps) {
  const formatValue = valueFormat || (format ? PRESET[format] : fmt);
  const trimmed = data.filter(d => Number.isFinite(d.value)).slice(0, maxBars);
  if (trimmed.length === 0) return null;

  const maxVal = Math.max(...trimmed.map(d => d.value).filter(Number.isFinite), 1);
  const scaleLabel = `${formatValue(0)} – ${formatValue(maxVal)}`;
  // No Y-axis: only a little inset so bar-top values aren't clipped.
  const pad = { top: 28, right: 10, bottom: 4, left: 10 };
  const W = Math.max(360, trimmed.length * 48);
  const innerH = height - pad.top - pad.bottom;
  const barW = Math.min(36, ((W - pad.left - pad.right) / trimmed.length) * 0.55);
  const gap = (W - pad.left - pad.right - barW * trimmed.length) / (trimmed.length + 1);
  const dirLabel = sortDir === 'asc' ? '▲ low→high' : '▼ high→low';
  const shortLabel = (s: string) => (s.length > 28 ? s.slice(0, 27) + '…' : s);

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-xs uppercase tracking-widest text-[var(--mut)] block font-medium">{title}</span>
          <div className="mt-0.5 flex items-baseline justify-between gap-3">
            {subtitle ? (
              <span className="text-[11px] text-[var(--dim)] min-w-0">{subtitle}</span>
            ) : (
              <span />
            )}
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-[var(--fore)] font-medium">
              {scaleLabel}
            </span>
          </div>
        </div>
        {sortDir !== undefined && onToggleDir && (
          <button
            onClick={onToggleDir}
            title={`Toggle sort direction — currently ${sortDir === 'asc' ? 'low to high' : 'high to low'}`}
            aria-label={`Toggle sort direction — currently ${sortDir === 'asc' ? 'low to high' : 'high to low'}`}
            className="ring-focus inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--input)] px-2 py-1 text-[10px] font-medium text-[var(--mut)] transition-colors hover:text-[var(--fore)]"
          >
            {dirLabel}
          </button>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        className="block w-full h-auto"
        style={{ aspectRatio: `${W} / ${height}` }}
        role="img"
        aria-label={`${title} chart, scale ${scaleLabel}`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const yy = pad.top + innerH * (1 - frac);
          return (
            <line
              key={frac}
              x1={pad.left}
              y1={yy}
              x2={W - pad.right}
              y2={yy}
              strokeWidth="0.5"
              strokeDasharray="2 4"
              style={{ stroke: 'var(--color-line)' }}
            />
          );
        })}

        {trimmed.map((d, i) => {
          const x = pad.left + gap + i * (barW + gap);
          const barH = Math.max(0, Number.isFinite(d.value) ? (d.value / maxVal) * innerH : 0);
          const y = pad.top + innerH - barH;
          const isActive = d.highlight || d.id === selectedId;

          return (
            <g key={d.id} className={onSelect ? 'cursor-pointer' : ''} onClick={() => onSelect?.(d.id)}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill={d.color}
                opacity={isActive ? 1 : 0.7}
                className="transition-opacity"
              />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                style={{ fill: isActive ? 'var(--fore)' : 'var(--mut)' }}
              >
                {formatValue(d.value)}
              </text>
              <title>{`${d.label}${d.sublabel ? ` (${d.sublabel})` : ''}: ${formatValue(d.value)}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="relative mt-1" style={{ height: 128 }}>
        {trimmed.map((d, i) => {
          const cx = pad.left + gap + i * (barW + gap) + barW / 2;
          const isActive = d.highlight || d.id === selectedId;
          return (
            <div
              key={d.id}
              className={`absolute top-0 ${onSelect ? 'cursor-pointer' : ''}`}
              style={{ left: `${(cx / W) * 100}%` }}
              onClick={() => onSelect?.(d.id)}
              title={`${d.label}${d.sublabel ? ` (${d.sublabel})` : ''}: ${formatValue(d.value)}`}
            >
              <span
                className="absolute left-1/2 top-0 block h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span
                className={`absolute top-3 whitespace-nowrap text-[13px] leading-none sm:text-[14px] ${
                  isActive ? 'font-semibold text-[var(--fore)]' : 'font-medium text-[var(--mut)]'
                }`}
                style={{
                  transform: 'translateX(-100%) rotate(-45deg)',
                  transformOrigin: 'right top',
                }}
              >
                {shortLabel(d.label)}
              </span>
            </div>
          );
        })}
      </div>
      {valueLabel && (
        <div className="mt-1 text-[10px] text-[var(--dim)] text-right">{valueLabel}</div>
      )}
    </div>
  );
}

/** Helper: build BarDatum[] from models + metric extractor. */
export function modelsToBarData(
  models: ModelRecord[],
  getValue: (m: ModelRecord) => number | undefined,
  opts: { maxBars?: number; highlightId?: string } = {}
): BarDatum[] {
  return models
    .map(m => {
      const v = getValue(m);
      if (v === undefined || v === null || !Number.isFinite(v)) return null;
      return {
        id: m.id,
        label: m.name,
        sublabel: m.provider,
        value: v,
        color: providerColor(m.provider),
        highlight: m.id === opts.highlightId,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, opts.maxBars ?? 12);
}
