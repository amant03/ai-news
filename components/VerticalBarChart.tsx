'use client';

import { providerColor } from '@/lib/models';
import type { ModelRecord } from '@/lib/model-registry';

interface BarDatum {
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
  maxBars?: number;
  height?: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

const fmt = (v: number) => v.toFixed(0);

/**
 * Artificial-Analysis-style vertical bar chart: coloured bars, rotated labels
 * below, value labels on top, provider dot between bars and labels.
 */
export default function VerticalBarChart({
  data,
  title,
  subtitle,
  valueLabel,
  valueFormat = fmt,
  maxBars = 12,
  height = 280,
  selectedId,
  onSelect,
}: VerticalBarChartProps) {
  const trimmed = data.slice(0, maxBars);
  if (trimmed.length === 0) return null;

  const maxVal = Math.max(...trimmed.map(d => d.value), 1);
  const pad = { top: 32, right: 12, bottom: 80, left: 12 };
  const W = Math.max(400, trimmed.length * 56);
  const innerH = height - pad.top - pad.bottom;
  const barW = Math.min(36, (W - pad.left - pad.right) / trimmed.length * 0.55);
  const gap = (W - pad.left - pad.right - barW * trimmed.length) / (trimmed.length + 1);

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-5 overflow-hidden">
      <div className="mb-3">
        <span className="text-xs uppercase tracking-widest text-[var(--mut)] block font-medium">{title}</span>
        {subtitle && <span className="text-[11px] text-[var(--dim)]">{subtitle}</span>}
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="w-full"
          style={{ minWidth: W > 400 ? 400 : undefined, height }}
          role="img"
          aria-label={`${title} chart`}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(frac => {
            const yy = pad.top + innerH * (1 - frac);
            return (
              <g key={frac}>
                <line
                  x1={pad.left}
                  y1={yy}
                  x2={W - pad.right}
                  y2={yy}
                  stroke="var(--color-line)"
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                />
                <text x={pad.left - 6} y={yy + 3} textAnchor="end" fontSize="10" fill="var(--dim)">
                  {(maxVal * frac).toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {trimmed.map((d, i) => {
            const x = pad.left + gap + i * (barW + gap);
            const barH = (d.value / maxVal) * innerH;
            const y = pad.top + innerH - barH;
            const isActive = d.highlight || d.id === selectedId;

            return (
              <g key={d.id} className={onSelect ? 'cursor-pointer' : ''} onClick={() => onSelect?.(d.id)}>
                {/* Bar */}
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

                {/* Value label */}
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={isActive ? 'var(--fore)' : 'var(--mut)'}
                >
                  {valueFormat(d.value)}
                </text>

                {/* Provider dot */}
                <circle cx={x + barW / 2} cy={pad.top + innerH + 12} r="3" fill={d.color} />

                {/* Model name (rotated) */}
                <text
                  x={x + barW / 2}
                  y={pad.top + innerH + 22}
                  textAnchor="end"
                  fontSize="10"
                  fill={isActive ? 'var(--fore)' : 'var(--mut)'}
                  fontWeight={isActive ? '600' : '400'}
                  transform={`rotate(-40 ${x + barW / 2} ${pad.top + innerH + 22})`}
                >
                  {d.label.length > 22 ? d.label.slice(0, 20) + '…' : d.label}
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
      if (v === undefined || v === null) return null;
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