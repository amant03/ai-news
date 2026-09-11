'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ModelRecord } from '@/lib/model-registry';
import { providerColor } from '@/lib/models';

interface Point {
  t: number;
  intel: number;
  name: string;
}

/**
 * "Frontier Language Model Intelligence, Over Time" — the AA homepage chart.
 * One line per major provider, each point = a released model of that provider
 * at (release date, Artificial Analysis Intelligence Index at its release).
 * Built from data/models.json (released + intelligenceIndex).
 */
export default function IntelligenceTimeline() {
  const [models, setModels] = useState<ModelRecord[]>([]);

  useEffect(() => {
    fetch('/api/models?sort=intelligence&limit=300')
      .then(r => r.json())
      .then(d => setModels(d.models || []))
      .catch(() => {});
  }, []);

  const series = useMemo(() => {
    const pts = models
      .filter(m => m.intelligenceIndex != null && m.released)
      .map(m => ({
        t: new Date(m.released as string).getTime(),
        intel: m.intelligenceIndex as number,
        name: m.name,
        provider: m.provider,
      }))
      .filter(p => isFinite(p.t));
    const byProvider = new Map<string, Point[]>();
    for (const p of pts) {
      if (!byProvider.has(p.provider)) byProvider.set(p.provider, []);
      byProvider.get(p.provider)!.push(p);
    }
    const providers = [...byProvider.entries()]
      .filter(([, arr]) => arr.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8)
      .map(([provider, arr]) => ({ provider, arr: arr.sort((a, b) => a.t - b.t) }));
    return providers;
  }, [models]);

  if (series.length === 0) return null;

  const minT = Math.min(...series.flatMap(s => s.arr.map(p => p.t)));
  const maxT = Math.max(...series.flatMap(s => s.arr.map(p => p.t)));

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4">
        {series.map(s => (
          <span key={s.provider} className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full" style={{ background: providerColor(s.provider) }} />
            {s.provider}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
          <XAxis
            type="number"
            dataKey="t"
            domain={[minT - 7 * 86_400_000, maxT + 7 * 86_400_000]}
            tickFormatter={(v: number) => new Date(v).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            tick={{ fontSize: 11 }}
            scale="time"
          />
          <YAxis type="number" dataKey="intel" domain={[0, 80]} tick={{ fontSize: 11 }} name="Intelligence Index" />
          <Tooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              return (
                <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-[var(--dim)]">{d.provider}</div>
                  <div className="mt-1">Released: <span className="font-medium">{new Date(d.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                  <div>Intelligence Index: <span className="font-medium">{d.intel}</span></div>
                </div>
              );
            }}
          />
          {series.map(s => (
            <Line
              key={s.provider}
              data={s.arr}
              type="monotone"
              dataKey="intel"
              stroke={providerColor(s.provider)}
              strokeWidth={2}
              dot={{ r: 3, fill: providerColor(s.provider), strokeWidth: 0 }}
              name={s.provider}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-[var(--mut)] mt-2">
        Each point is a released model of that provider at (release date, intelligence index). Multi-point
        series only — the frontier moves up as new models release. Based on data/models.json.
      </p>
    </div>
  );
}