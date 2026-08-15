'use client';

import { useMemo, useRef, useState } from 'react';

export interface ScatterPoint {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  x: number;
  y: number;
  size?: number;
  badge?: string;
}

interface ScatterChartProps {
  points: ScatterPoint[];
  labeledIds?: Set<string>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  xLabel: string;
  yLabel: string;
  sizeLabel?: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  xLog?: boolean;
  yLog?: boolean;
  /** Corner that represents "better" on this chart. */
  betterCorner?: 'tl' | 'tr';
  height?: number;
}

const VB_W = 1100;
const VB_H = 300;
const PAD = { top: 22, right: 24, bottom: 44, left: 56 };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function niceNum(range: number, round: boolean) {
  const exp = Math.floor(Math.log10(range || 1));
  const frac = range / Math.pow(10, exp);
  let nice: number;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else {
    if (frac <= 1) nice = 1;
    else if (frac <= 2) nice = 2;
    else if (frac <= 5) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exp);
}

function linearTicks(min: number, max: number, count = 5): number[] {
  if (!isFinite(min) || !isFinite(max) || min === max) {
    const v = isFinite(min) ? min : 0;
    return [v];
  }
  const range = niceNum(max - min, false);
  const step = niceNum(range / (count - 1), true);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toPrecision(8)));
  return ticks;
}

function logTicks(min: number, max: number): number[] {
  const lo = Math.max(min, 1e-4);
  const hi = Math.max(max, lo * 10);
  const start = Math.floor(Math.log10(lo));
  const end = Math.ceil(Math.log10(hi));
  const ticks: number[] = [];
  for (let e = start; e <= end; e++) ticks.push(Math.pow(10, e));
  return ticks.filter(t => t >= lo / 1.05 && t <= hi * 1.05);
}

function scaleOf(min: number, max: number, log: boolean) {
  if (log) {
    const lo = Math.log10(Math.max(min, 1e-4));
    const hi = Math.log10(Math.max(max, min * 10, 1e-3));
    return (v: number) => {
      const lv = Math.log10(Math.max(v, 1e-4));
      return (lv - lo) / (hi - lo || 1);
    };
  }
  const pad = (max - min) * 0.08 || 1;
  const lo = min - pad;
  const hi = max + pad;
  return (v: number) => (v - lo) / (hi - lo || 1);
}

function paretoFrontier(points: ScatterPoint[], preferLowX: boolean): ScatterPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => (preferLowX ? a.x - b.x : b.x - a.x));
  const front: ScatterPoint[] = [];
  let bestY = -Infinity;
  for (const p of sorted) {
    if (p.y >= bestY) {
      front.push(p);
      bestY = p.y;
    }
  }
  return front.sort((a, b) => a.x - b.x);
}

export default function ScatterChart({
  points,
  labeledIds,
  selectedId,
  onSelect,
  xLabel,
  yLabel,
  sizeLabel,
  xFormat = v => String(Math.round(v * 10) / 10),
  yFormat = v => String(Math.round(v * 10) / 10),
  xLog = false,
  yLog = false,
  betterCorner = 'tl',
  height = 260,
}: ScatterChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = VB_H - PAD.top - PAD.bottom;
  const preferLowX = betterCorner === 'tl';

  const layout = useMemo(() => {
    if (points.length === 0) return null;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const sizes = points.map(p => p.size ?? 1);
    let xmin = Math.min(...xs);
    let xmax = Math.max(...xs);
    let ymin = Math.min(...ys);
    let ymax = Math.max(...ys);
    if (xmin === xmax) {
      xmin = xLog ? xmin / 2 : xmin - 1;
      xmax = xLog ? xmax * 2 : xmax + 1;
    }
    if (ymin === ymax) {
      ymin -= 1;
      ymax += 1;
    }

    const sx = scaleOf(xmin, xmax, xLog);
    const sy = scaleOf(ymin, ymax, yLog);
    const smin = Math.min(...sizes);
    const smax = Math.max(...sizes);

    const mapped = points.map(p => {
      const nx = clamp(sx(p.x), 0.02, 0.98);
      const ny = clamp(sy(p.y), 0.02, 0.98);
      const t = smax === smin ? 0.5 : ((p.size ?? 1) - smin) / (smax - smin);
      const r = 6 + t * 10;
      return {
        ...p,
        cx: PAD.left + nx * plotW,
        cy: PAD.top + (1 - ny) * plotH,
        r,
      };
    });

    const xticks = xLog ? logTicks(xmin, xmax) : linearTicks(xmin, xmax);
    const yticks = yLog ? logTicks(ymin, ymax) : linearTicks(ymin, ymax);
    const frontier = paretoFrontier(points, preferLowX);
    const frontierPts = frontier
      .map(f => mapped.find(m => m.id === f.id))
      .filter((v): v is (typeof mapped)[number] => !!v);

    return { mapped, xticks, yticks, sx, sy, frontierPts, xmin, xmax, ymin, ymax };
  }, [points, xLog, yLog, plotW, plotH, preferLowX]);

  const hover = hoverId ? layout?.mapped.find(p => p.id === hoverId) : undefined;
  const selected = selectedId ? layout?.mapped.find(p => p.id === selectedId) : undefined;

  if (!layout || points.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--input)]/80 text-xs text-[var(--dim)]" style={{ height }}>
        Not enough scored models for this view yet.
      </div>
    );
  }

  const toPx = (svgX: number, svgY: number) => {
    const el = wrapRef.current;
    if (!el) return { left: 0, top: 0 };
    const rect = el.getBoundingClientRect();
    return {
      left: (svgX / VB_W) * rect.width,
      top: (svgY / VB_H) * rect.height,
    };
  };

  const tooltip = hover || selected;
  const tipPos = tooltip ? toPx(tooltip.cx, tooltip.cy) : null;

  const labelSet = labeledIds || new Set(layout.mapped.slice(0, 10).map(p => p.id));

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-full"
        role="img"
        aria-label={`${yLabel} versus ${xLabel} for ${points.length} models`}
      >
        <defs>
          <linearGradient id="frontier-stroke" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#62c9c8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#9a7bd4" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="better-glow" cx={betterCorner === 'tl' ? '18%' : '82%'} cy="22%" r="55%">
            <stop offset="0%" stopColor="#62c9c8" stopOpacity="0.13" />
            <stop offset="70%" stopColor="#62c9c8" stopOpacity="0" />
          </radialGradient>
          <filter id="pt-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="url(#better-glow)" />
        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="none" stroke="rgba(148,163,184,0.12)" />

        {layout.xticks.map((t, i) => {
          const x = PAD.left + clamp(layout.sx(t), 0, 1) * plotW;
          return (
            <g key={`x-${i}`}>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + plotH} stroke="rgba(148,163,184,0.08)" />
              <text x={x} y={PAD.top + plotH + 18} textAnchor="middle" fill="var(--dim)" fontSize="10" fontFamily="var(--font-plex), monospace">
                {xFormat(t)}
              </text>
            </g>
          );
        })}
        {layout.yticks.map((t, i) => {
          const y = PAD.top + (1 - clamp(layout.sy(t), 0, 1)) * plotH;
          return (
            <g key={`y-${i}`}>
              <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="rgba(148,163,184,0.08)" />
              <text x={PAD.left - 8} y={y + 3} textAnchor="end" fill="var(--dim)" fontSize="10" fontFamily="var(--font-plex), monospace">
                {yFormat(t)}
              </text>
            </g>
          );
        })}

        <text x={PAD.left + plotW / 2} y={VB_H - 8} textAnchor="middle" fill="var(--mut)" fontSize="11" letterSpacing="0.16em">
          {xLabel.toUpperCase()}
        </text>
        <text
          x={16}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          fill="var(--mut)"
          fontSize="11"
          letterSpacing="0.16em"
          transform={`rotate(-90 16 ${PAD.top + plotH / 2})`}
        >
          {yLabel.toUpperCase()}
        </text>

        {layout.frontierPts.length > 1 && (
          <polyline
            fill="none"
            stroke="url(#frontier-stroke)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={layout.frontierPts.map(p => `${p.cx},${p.cy}`).join(' ')}
          />
        )}

        {layout.mapped.map(p => {
          const labeled = labelSet.has(p.id);
          const active = p.id === selectedId || p.id === hoverId;
          const dim = !labeled && !active;
          const r = labeled ? 10 : dim ? 5 : 8;
          const rank = points.findIndex(x => x.id === p.id) + 1;
          return (
            <g
              key={p.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoverId(p.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onSelect?.(p.id)}
              opacity={dim ? 0.35 : 1}
            >
              <circle cx={p.cx} cy={p.cy} r={r + (active ? 5 : 0)} fill={p.color} opacity={active ? 0.2 : 0} />
              <circle
                cx={p.cx}
                cy={p.cy}
                r={r}
                fill={p.color}
                fillOpacity={0.95}
                stroke={active ? '#e6edf7' : 'rgba(5,7,14,0.7)'}
                strokeWidth={active ? 2 : 1}
                filter={labeled ? 'url(#pt-glow)' : undefined}
              />
              {labeled && rank > 0 && rank <= 10 && (
                <text
                  x={p.cx}
                  y={p.cy + 3.5}
                  textAnchor="middle"
                  fill="var(--bg-body)"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="var(--font-plex), monospace"
                >
                  {rank}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {tooltip && tipPos && (
        <div
          className="pointer-events-none absolute z-10 w-52 rounded-xl border border-[var(--accent)]/25 bg-[var(--input)]/95 p-2.5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)] backdrop-blur-md"
          style={{
            left: clamp(tipPos.left + 14, 8, (wrapRef.current?.clientWidth || 400) - 220),
            top: clamp(tipPos.top - 72, 8, (wrapRef.current?.clientHeight || 300) - 96),
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.color }} />
            <span className="font-display text-xs font-semibold text-[var(--fore)] truncate">{tooltip.label}</span>
          </div>
          {tooltip.sublabel && <div className="text-[10px] text-[var(--dim)] mb-1.5">{tooltip.sublabel}</div>}
          <div className="grid grid-cols-1 gap-0.5 font-mono text-[10px] text-[var(--mut)]">
            <div>
              {xLabel}: <span className="text-[var(--cyan)]">{xFormat(tooltip.x)}</span>
            </div>
            <div>
              {yLabel}: <span className="text-[var(--violet)]">{yFormat(tooltip.y)}</span>
            </div>
            {sizeLabel && tooltip.size !== undefined && (
              <div>
                {sizeLabel}: <span className="text-[var(--fore)]">{tooltip.size.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute left-3 top-2 text-[9px] uppercase tracking-[0.18em] text-[var(--dim)]">
        {betterCorner === 'tl' ? 'Better → up & cheaper' : 'Better → up & right'}
      </div>
    </div>
  );
}
