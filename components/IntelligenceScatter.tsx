'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, ComposedChart, Line,
} from 'recharts';
import type { ModelRecord } from '@/lib/model-registry';

function costPerTask(m: ModelRecord): number | null {
  if (m.aaCostPerTask != null) return m.aaCostPerTask;
  if (m.promptPrice == null && m.completionPrice == null) return null;
  const inP = m.promptPrice ?? 0;
  const outP = m.completionPrice ?? 0;
  const cache = inP * 0.1;
  return (cache * 7 + inP * 2 + outP * 1) / 10;
}

/**
 * "Intelligence Index vs. Cost per Intelligence Index Task" — the AA homepage
 * chart. Y: Artificial Analysis Intelligence Index (higher better).
 * X: weighted avg cost per task (lower better). Green = most attractive
 * quadrant (high index, low cost), red stepped line = Pareto frontier.
 * Open-weights models are hollow circles; proprietary are filled.
 */
export default function IntelligenceScatter({ limit = 80, highlightId }: { limit?: number; highlightId?: string }) {
  const [models, setModels] = useState<ModelRecord[]>([]);

  useEffect(() => {
    fetch('/api/models?sort=intelligence&limit=300')
      .then(r => r.json())
      .then(d => setModels(d.models || []))
      .catch(() => {});
  }, []);

  const data = useMemo(() => {
    const pts = models
      .filter(m => m.intelligenceIndex != null && costPerTask(m) != null)
      .map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        intel: m.intelligenceIndex as number,
        cost: costPerTask(m) as number,
        open: m.family === 'open-weights' || m.family === 'open',
      }));
    pts.sort((a, b) => b.intel - a.intel);
    return pts.slice(0, limit);
  }, [models, limit]);

  const { xMax, xMed, yMin, yMax, yMed } = useMemo(() => {
    const xs = data.map(d => d.cost);
    const ys = data.map(d => d.intel);
    const median = (v: number[]) => {
      if (!v.length) return 0;
      const s = [...v].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };
    return {
      xMax: Math.max(...xs, 0.001) * 1.1,
      xMed: median(xs),
      yMin: Math.floor((Math.min(...ys) - 5) / 10) * 10,
      yMax: Math.ceil((Math.max(...ys) + 5) / 10) * 10,
      yMed: median(ys),
    };
  }, [data]);

  const pareto = useMemo(() => {
    const pts = [...data].sort((a, b) => a.cost - b.cost);
    const frontier: { cost: number; intel: number }[] = [];
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.intel > maxY) {
        frontier.push({ cost: p.cost, intel: p.intel });
        maxY = p.intel;
      }
    }
    return frontier;
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4">
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <span className="w-3 h-3 rounded-sm bg-[#22c55e]/20 border border-[#22c55e]/60" /> Most attractive quadrant
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <span className="w-4 h-0.5 bg-[#ef4444]" /> Pareto line
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <span className="w-3 h-3 rounded-full border-2 border-[var(--fore)]" /> Open weights
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <span className="w-3 h-3 rounded-full bg-[var(--fore)]" /> Proprietary
        </span>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
          <XAxis
            type="number"
            dataKey="cost"
            name="Cost per task (USD)"
            tick={{ fontSize: 11 }}
            domain={[0, xMax]}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <YAxis type="number" dataKey="intel" name="Intelligence Index" tick={{ fontSize: 11 }} domain={[yMin, yMax]} />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              return (
                <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-[var(--dim)]">{d.provider}</div>
                  <div className="mt-1">Intelligence: <span className="font-medium">{d.intel}</span></div>
                  <div>Cost per task: <span className="font-medium">${d.cost.toFixed(2)}</span></div>
                </div>
              );
            }}
          />
          <ReferenceArea x1={0} x2={xMed} y1={yMed} y2={yMax} fill="#22c55e" fillOpacity={0.08} stroke="none" />
          {pareto.length > 1 && (
            <Line data={pareto} dataKey="intel" stroke="#ef4444" strokeWidth={1.5} dot={false} />
          )}
          <Scatter data={data}>
            {data.map((d, i) => {
              const hl = highlightId != null && d.id === highlightId;
              return (
                <Cell
                  key={i}
                  fill={hl ? '#7f4bf3' : d.open ? 'transparent' : 'var(--fore)'}
                  stroke={hl ? '#ffffff' : d.open ? 'var(--fore)' : 'none'}
                  strokeWidth={hl ? 2 : 1.5}
                  r={hl ? 7 : d.open ? 5 : 4}
                />
              );
            })}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}