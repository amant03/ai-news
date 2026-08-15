'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ModelRecord } from '@/lib/model-registry';
import { providerColor } from '@/lib/models';

interface TrendData {
  models: ModelRecord[];
}

/**
 * AI Trends — Artificial-Analysis-style trends panel. Shows how frontier
 * intelligence has climbed over time (by lab) plus the current leaders.
 */
export default function AITrends() {
  const [data, setData] = useState<TrendData | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch('/api/models?sort=intelligence&limit=120')
        .then(r => r.json())
        .then(d => {
          if (mounted) setData(d);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 300000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const { frontierSeries, frontierModels, leaderboard } = useMemo(() => {
    const list = (data?.models || []).filter(
      m => m.released && m.intelligenceIndex !== undefined
    );
    const byLab = new Map<string, ModelRecord>();
    for (const m of list) {
      const cur = byLab.get(m.provider);
      if (!cur || (m.intelligenceIndex ?? 0) > (cur.intelligenceIndex ?? 0)) {
        byLab.set(m.provider, m);
      }
    }
    const labs = [...byLab.entries()]
      .filter(([, m]) => (m.intelligenceIndex ?? 0) >= 1)
      .sort((a, b) => (b[1].intelligenceIndex ?? 0) - (a[1].intelligenceIndex ?? 0));
    const frontierModels = labs.map(([, m]) => m);

    const all = list.slice().sort((a, b) => +new Date(a.released!) - +new Date(b.released!));
    const frontierSeries: Array<{ t: number; v: number; name: string; provider: string }> = [];
    let maxSeen = -1;
    for (const m of all) {
      const v = m.intelligenceIndex ?? 0;
      if (v > maxSeen) {
        maxSeen = v;
        frontierSeries.push({ t: +new Date(m.released!), v, name: m.name, provider: m.provider });
      }
    }
    return {
      frontierSeries,
      frontierModels: frontierModels.slice(0, 10),
      leaderboard: frontierModels,
    };
  }, [data]);

  if (!data) {
    return (
      <section className="animate-pulse">
        <div className="h-3 w-40 rounded bg-[var(--panel-2)]" />
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3">
          <div className="h-64 rounded-xl bg-[var(--panel-2)]" />
          <div className="h-64 rounded-xl bg-[var(--panel-2)]" />
        </div>
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3">
      {/* Frontier intelligence over time */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="font-display font-semibold text-[var(--fore)]">Frontier intelligence over time</h3>
            <p className="text-[10px] text-[var(--mut)]">Peak Artificial Analysis Intelligence Index at each release · higher is better</p>
          </div>
          {frontierSeries.length > 0 && (
            <span className="text-[9px] font-mono text-[var(--dim)]">
              {new Date(frontierSeries[0].t).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
              {' → '}
              {new Date(frontierSeries[frontierSeries.length - 1].t).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
            </span>
          )}
        </div>
        <div className="h-56">
          <FrontierChart series={frontierSeries} />
        </div>
      </div>

      {/* Which lab is on top */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-4">
        <h3 className="font-display font-semibold text-[var(--fore)]">Who's leading right now</h3>
        <p className="text-[10px] text-[var(--mut)] mb-3">Best model from each lab</p>
        <div className="space-y-2.5">
          {frontierModels.map(m => {
            const pct = Math.min(100, ((m.intelligenceIndex ?? 0) / (frontierModels[0]?.intelligenceIndex ?? 1)) * 100);
            return (
              <div key={m.id}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: providerColor(m.provider) }} />
                    <span className="truncate text-[var(--mut)]">{m.provider}</span>
                  </span>
                  <span className="font-mono text-[10px] text-[var(--fore)] flex-shrink-0">{m.intelligenceIndex}</span>
                </div>
                <div className="h-1 rounded-full bg-[var(--panel-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: providerColor(m.provider) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Frontier model legend strip */}
      {frontierSeries.length > 0 && (
        <div className="lg:col-span-2 -mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[10px] text-[var(--dim)]">
          {frontierSeries.slice(-5).map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: providerColor(p.provider) }} />
              <span className="font-mono">{p.name}</span>
              <span className="text-[var(--cyan)]">{p.v}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function FrontierChart({ series }: { series: Array<{ t: number; v: number; name: string; provider: string }> }) {
  const W = 640;
  const H = 210;
  const PAD = { top: 14, right: 10, bottom: 26, left: 38 };

  const { pts, x, y } = useMemo(() => {
    if (series.length < 2) return { pts: series, x: (n: number) => n, y: (n: number) => n };
    const t0 = series[0].t;
    const t1 = series[series.length - 1].t;
    const span = Math.max(t1 - t0, 1);
    const vMax = Math.max(...series.map(p => p.v), 1);
    const vMin = Math.min(...series.map(p => p.v), 0);
    const vSpan = Math.max(vMax - vMin, 1);
    const sx = (t: number) => PAD.left + ((t - t0) / span) * (W - PAD.left - PAD.right);
    const sy = (v: number) => PAD.top + (1 - (v - vMin) / vSpan) * (H - PAD.top - PAD.bottom);
    return { pts: series, x: sx, y: sy };
  }, [series]);

  if (series.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-[var(--dim)]">
        Not enough dated models yet.
      </div>
    );
  }

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts[pts.length - 1].t).toFixed(1)},${H - PAD.bottom} L${x(pts[0].t).toFixed(1)},${H - PAD.bottom} Z`;
  const yMax = Math.max(...pts.map(p => p.v), 1);
  const gridSteps = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img" aria-label="Frontier intelligence over time">
      <defs>
        <linearGradient id="frontierFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {Array.from({ length: gridSteps + 1 }, (_, i) => i).map(i => {
        const yy = PAD.top + (i / gridSteps) * (H - PAD.top - PAD.bottom);
        const v = yMax * (1 - i / gridSteps);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="var(--color-line)" strokeWidth="0.5" strokeDasharray="2 3" />
            <text x={PAD.left - 6} y={yy + 3} textAnchor="end" fontSize="8" fill="var(--dim)">
              {v.toFixed(0)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#frontierFill)" />
      <path d={line} fill="none" stroke="var(--cyan)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.t)} cy={y(p.v)} r="2.4" fill={providerColor(p.provider)} stroke="var(--card)" strokeWidth="1" />
          {i === pts.length - 1 && (
            <text x={x(p.t) + 6} y={y(p.v) + 2} fontSize="8.5" fill="var(--fore)" fontWeight="600">
              {p.name} {p.v}
            </text>
          )}
        </g>
      ))}
      <text x={PAD.left} y={H - 8} fontSize="8" fill="var(--dim)">
        {new Date(pts[0].t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="8" fill="var(--dim)">
        {new Date(pts[pts.length - 1].t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
      </text>
    </svg>
  );
}