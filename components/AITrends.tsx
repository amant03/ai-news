'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis, BarChart, Bar, Cell, Legend,
} from 'recharts';
import SectionHeader from './SectionHeader';
import type { TrendPoint } from '@/lib/ai-trends-scraper';

const AXIS = 'var(--dim)';
const LINE = 'var(--color-line)';

function useTrendData() {
  const [points, setPoints] = useState<TrendPoint[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    fetch('/api/ai-trends')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (mounted && Array.isArray(d?.models) && d.models.length > 0) {
          setPoints(d.models as TrendPoint[]);
          setUpdatedAt(typeof d.updatedAt === 'string' ? d.updatedAt : null);
        } else if (mounted) {
          setPoints([]);
        }
      })
      .catch(() => {
        if (mounted) setPoints([]);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return { points, updatedAt };
}

const monthKey = (iso: string) => iso.slice(0, 7);

function frontierByMonth(points: TrendPoint[], pick: (p: TrendPoint) => number | null) {
  const best = new Map<string, { x: string; y: number; name: string }>();
  for (const p of points) {
    const v = pick(p);
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const k = monthKey(p.date);
    const cur = best.get(k);
    if (!cur || v > cur.y) best.set(k, { x: k, y: Math.round(v * 10) / 10, name: p.name });
  }
  return [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

function minByMonth(points: TrendPoint[]) {
  const best = new Map<string, number>();
  for (const p of points) {
    if (p.price === null || p.price <= 0) continue;
    const k = monthKey(p.date);
    const cur = best.get(k);
    if (cur === undefined || p.price < cur) best.set(k, p.price);
  }
  return [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y }));
}

function maxByYear(points: TrendPoint[], pick: (p: TrendPoint) => number | null) {
  const best = new Map<string, number>();
  for (const p of points) {
    const v = pick(p);
    if (v === null || !Number.isFinite(v)) continue;
    const k = p.date.slice(0, 4);
    const cur = best.get(k);
    if (cur === undefined || v > cur) best.set(k, v);
  }
  return [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y }));
}

function Card({ title, note, insight, children }: { title: string; note: string; insight: string | null; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--color-line)] rounded-lg bg-[var(--card)] p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      <p className="text-[11px] text-[var(--mut)] mt-0.5 mb-1">{note}</p>
      {insight && (
        <p className="text-[12px] leading-relaxed mb-4 max-w-[80ch]">
          <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-hover)]">TL;DR</span>
          {insight}
        </p>
      )}
      {children}
    </div>
  );
}

function Updated({ at }: { at: string | null }) {
  if (!at) return null;
  return (
    <span className="text-[11px] tabular-nums text-[var(--mut)]">
      Updated {new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
    </span>
  );
}

const fmtInt = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${Math.round(v)}`);

export default function AITrends({ compact = false }: { compact?: boolean }) {
  const { points, updatedAt } = useTrendData();

  const data = useMemo(() => {
    if (!points || points.length === 0) return null;
    const withIntel = points.filter(p => p.intelligence !== null);
    const frontier = frontierByMonth(withIntel, p => p.intelligence);
    const scatter = withIntel.map(p => ({ x: p.date, y: p.intelligence, name: p.name, color: p.color }));
    const byCreator = new Map<string, TrendPoint>();
    for (const p of withIntel) {
      const cur = byCreator.get(p.creator);
      if (!cur || (p.intelligence ?? 0) > (cur.intelligence ?? 0)) byCreator.set(p.creator, p);
    }
    const labs = [...byCreator.entries()]
      .map(([creator, p]) => ({ creator, name: p.name, intel: p.intelligence ?? 0, color: p.color }))
      .sort((a, b) => b.intel - a.intel)
      .slice(0, 12);
    const price = minByMonth(points);
    const speed = withIntel
      .filter(p => p.speed !== null && p.speed > 0)
      .map(p => ({ x: p.intelligence ?? 0, y: p.speed ?? 0, name: p.name, color: p.color }));
    const countries = new Map<string, TrendPoint[]>();
    for (const p of withIntel) {
      if (!countries.has(p.country)) countries.set(p.country, []);
      countries.get(p.country)!.push(p);
    }
    const topCountries = [...countries.entries()]
      .map(([c, ps]) => ({ country: c, best: Math.max(...ps.map(p => p.intelligence ?? 0)) }))
      .sort((a, b) => b.best - a.best)
      .slice(0, 5)
      .map(c => c.country);
    const countryLines = topCountries.map(c => {
      const ps = countries.get(c)!;
      const byM = new Map<string, number>();
      for (const p of ps) {
        const k = monthKey(p.date);
        const cur = byM.get(k);
        if (cur === undefined || (p.intelligence ?? 0) > cur) byM.set(k, p.intelligence ?? 0);
      }
      return {
        country: c,
        color: ps[0]?.color || '#71717a',
        data: [...byM.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y })),
      };
    });
    const openLine = frontierByMonth(withIntel.filter(p => p.open), p => p.intelligence);
    const closedLine = frontierByMonth(withIntel.filter(p => !p.open), p => p.intelligence);
    const bucket = (b: number | null): string | null => {
      if (b === null) return null;
      if (b < 15) return '<15B';
      if (b < 70) return '15–70B';
      if (b < 400) return '70–400B';
      return '400B+';
    };
    const years = [...new Set(withIntel.map(p => p.date.slice(0, 4)))].sort();
    const buckets = ['<15B', '15–70B', '70–400B', '400B+'];
    const paramBars = years.map(y => {
      const row: Record<string, string | number> = { x: y };
      for (const b of buckets) {
        row[b] = withIntel.filter(p => p.date.startsWith(y) && bucket(p.paramsB) === b).length;
      }
      return row;
    });
    const contextBars = maxByYear(points, p => p.context).map(d => ({ x: d.x, y: d.y, label: fmtInt(d.y) }));
    return { frontier, scatter, labs, price, speed, countryLines, openLine, closedLine, paramBars, contextBars, withIntel };
  }, [points]);

  if (points === null) {
    return <div className="h-40 rounded-lg border border-[var(--color-line)] bg-[var(--surface)]" aria-label="Loading trends" />;
  }
  if (!data || data.withIntel.length === 0) {
    return (
      <div className="py-12 text-center border border-dashed border-[var(--color-line)] rounded-lg">
        <p className="text-sm font-medium">Trend data is still loading</p>
        <p className="mt-1 text-sm text-[var(--mut)]">Check back after the next refresh.</p>
      </div>
    );
  }

  const first = data.frontier[0];
  const last = data.frontier[data.frontier.length - 1];
  const frontierInsight =
    first && last
      ? `Frontier intelligence rose from ${first.y} (${first.x}) to ${last.y} (${last.x}).`
      : null;
  const topLab = data.labs[0];
  const cheapFirst = data.price[0];
  const cheapLast = data.price[data.price.length - 1];
  const fastest = data.speed.length ? [...data.speed].sort((a, b) => b.y - a.y)[0] : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] text-[var(--mut)]">{data.withIntel.length} benchmarked releases tracked</span>
        <Updated at={updatedAt} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Frontier intelligence over time" note="Best intelligence score released each month · higher is better" insight={frontierInsight}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.frontier} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={40} />
              <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip formatter={(v) => [v, 'Intelligence']} labelFormatter={l => `Month ${l}`} />
              <Line type="stepAfter" dataKey="y" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Intelligence vs release date" note="Every benchmarked release, colored by creator" insight={topLab ? `${topLab.creator}'s ${topLab.name} leads at ${topLab.intel}.` : null}>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={40} />
              <YAxis dataKey="y" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(_v: unknown, _n: unknown, p: { payload?: { name?: string } }) => [p.payload?.name || '', 'Model']} />
              <Scatter data={data.scatter.slice(0, 300)} fill="var(--accent)">
                {data.scatter.slice(0, 300).map((p, i) => (
                  <Cell key={i} fill={p.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Leading models by lab" note="Best intelligence score per creator right now" insight={null}>
          <ResponsiveContainer width="100%" height={Math.max(200, data.labs.length * 30)}>
            <BarChart data={data.labs} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 80 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="creator" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={80} />
              <Tooltip formatter={(v) => [v, 'Intelligence']} />
              <Bar dataKey="intel" radius={[0, 4, 4, 0]}>
                {data.labs.map((l, i) => (
                  <Cell key={i} fill={l.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {!compact && (
          <>
            <Card title="Inference price over time" note="Cheapest blended USD per 1M tokens each month · lower is better" insight={cheapFirst && cheapLast ? `Floor price moved from $${cheapFirst.y} to $${cheapLast.y} per 1M tokens.` : null}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.price} margin={{ top: 5, right: 10, bottom: 0, left: -5 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={40} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} scale="log" domain={['auto', 'auto']} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip formatter={(v) => [`$${v}`, 'Floor price']} labelFormatter={l => `Month ${l}`} />
                  <Line type="stepAfter" dataKey="y" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Speed vs intelligence" note="Output tokens/sec against intelligence · up-right is best" insight={fastest ? `${fastest.name} pushes ${Math.round(fastest.y)} tok/s at intelligence ${Math.round(fastest.x)}.` : null}>
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} domain={['auto', 'auto']} />
                  <YAxis type="number" dataKey="y" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={data.speed} fill="var(--accent)">
                    {data.speed.map((p, i) => (
                      <Cell key={i} fill={p.color} />
                    ))}
                  </Scatter>
                  <ZAxis type="number" range={[30, 30]} />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Frontier by country" note="Best intelligence released per country each month" insight={null}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={40} allowDuplicatedCategory={false} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {data.countryLines.map(c => (
                    <Line key={c.country} data={c.data} type="stepAfter" dataKey="y" name={c.country} stroke={c.color} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Open vs closed frontier" note="Best open-weights vs proprietary intelligence each month" insight={(() => {
              const o = data.openLine[data.openLine.length - 1]?.y;
              const c = data.closedLine[data.closedLine.length - 1]?.y;
              return o !== undefined && c !== undefined ? `Best open model trails the closed frontier by ${(c - o).toFixed(1)} points.` : null;
            })()}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={40} allowDuplicatedCategory={false} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line data={data.openLine} type="stepAfter" dataKey="y" name="Open weights" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line data={data.closedLine} type="stepAfter" dataKey="y" name="Proprietary" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Model sizes over time" note="Benchmarked releases per year by parameter bucket" insight={null}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.paramBars} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="<15B" stackId="a" fill="#10b981" />
                  <Bar dataKey="15–70B" stackId="a" fill="#0ea5e9" />
                  <Bar dataKey="70–400B" stackId="a" fill="var(--accent)" />
                  <Bar dataKey="400B+" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Context window growth" note="Largest context window released each year" insight={(() => {
              const b = data.contextBars;
              if (b.length < 2) return null;
              return `Max context grew from ${fmtInt(b[0].y)} (${b[0].x}) to ${fmtInt(b[b.length - 1].y)} (${b[b.length - 1].x}).`;
            })()}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.contextBars} margin={{ top: 5, right: 10, bottom: 0, left: -5 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtInt(v)} />
                  <Tooltip formatter={(v, _n, p) => [(p?.payload as { label?: string } | undefined)?.label ?? v, 'Max context']} />
                  <Bar dataKey="y" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
