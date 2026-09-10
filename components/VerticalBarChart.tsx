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
  height = 300,
  selectedId,
  onSelect,
  sortDir,
  onToggleDir,
}: VerticalBarChartProps) {
  const formatValue = valueFormat || (format ? PRESET[format] : fmt);
  const trimmed = data.filter(d => Number.isFinite(d.value)).slice(0, maxBars);
  if (trimmed.length === 0) return null;

  const maxVal = Math.max(...trimmed.map(d => d.value).filter(Number.isFinite), 1);
  // Roomy bottom/left padding so the -45° x-labels always fit inside the
  // viewport (they used to overflow and get clipped by overflow-hidden).
  const pad = { top: 32, right: 16, bottom: 118, left: 56 };
  const W = Math.max(400, trimmed.length * 56);
  const innerH = height - pad.top - pad.bottom;
  const barW = Math.min(38, ((W - pad.left - pad.right) / trimmed.length) * 0.55);
  const gap = (W - pad.left - pad.right - barW * trimmed.length) / (trimmed.length + 1);
  const dirLabel = sortDir === 'asc' ? '▲ low→high' : '▼ high→low';
  const dotY = pad.top + innerH + 10;
  const labelY = pad.top + innerH + 16;
  const shortLabel = (s: string) => (s.length > 20 ? s.slice(0, 19) + '…' : s);

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-5 overflow-hidden">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-widest text-[var(--mut)] block font-medium">{title}</span>
          {subtitle && <span className="text-[11px] text-[var(--dim)]">{subtitle}</span>}
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
      <div className="overflow-x-auto overflow-y-visible no-scrollbar">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          width="100%"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          className="block max-w-full"
          style={{ height: `${height}px` }}
          role="img"
          aria-label={`${title} chart`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map(frac => {
            const yy = pad.top + innerH * (1 - frac);
            return (
              <g key={frac}>
                <line
                  x1={pad.left}
                  y1={yy}
                  x2={W - pad.right}
                  y2={yy}
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                  style={{ stroke: 'var(--color-line)' }}
                />
                <text x={pad.left - 6} y={yy + 3} textAnchor="end" fontSize="10" style={{ fill: 'var(--dim)' }}>
                  {formatValue(maxVal * frac)}
                </text>
              </g>
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
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  style={{ fill: isActive ? 'var(--fore)' : 'var(--mut)' }}
                >
                  {formatValue(d.value)}
                </text>
                <circle cx={x + barW / 2} cy={dotY} r="3" fill={d.color} />
                <title>{`${d.label}${d.sublabel ? ` (${d.sublabel})` : ''}: ${formatValue(d.value)}`}</title>
                <text
                  x={x + barW / 2}
                  y={labelY}
                  textAnchor="end"
                  fontSize="10"
                  style={{ fill: isActive ? 'var(--fore)' : 'var(--mut)' }}
                  fontWeight={isActive ? '600' : '400'}
                  transform={`rotate(-45 ${x + barW / 2} ${labelY})`}
                >
                  {shortLabel(d.label)}
                </text>
              </g>
            );
          })}
        </svg>
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
