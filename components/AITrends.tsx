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

/** Creator display aliases: variant spellings that denote the same lab. */
const CREATOR_ALIASES: Record<string, string> = {
  zai: 'Z.ai',
  spacexai: 'xAI',
  xai: 'xAI',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  deepmind: 'Google DeepMind',
  meta: 'Meta',
  deepseek: 'DeepSeek',
  alibaba: 'Alibaba',
  qwen: 'Qwen',
  mistral: 'Mistral',
  moonshot: 'Moonshot',
  minimax: 'MiniMax',
  cohere: 'Cohere',
  bytedance: 'ByteDance',
  microsoft: 'Microsoft',
  nvidia: 'NVIDIA',
};

function creatorKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function creatorDisplay(name: string): string {
  return CREATOR_ALIASES[creatorKey(name)] || name;
}

function frontierByMonth(points: TrendPoint[], pick: (p: TrendPoint) => number | null) {
  const best = new Map<string, { x: string; y: number; name: string }>();
  for (const p of points) {
    const v = pick(p);
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const k = monthKey(p.date);
    const cur = best.get(k);
    if (!cur || v > cur.y) best.set(k, { x: k, y: Math.round(v * 10) / 10, name: p.name });
  }
  // Cumulative frontier: the line never steps down (matches the reference
  // semantics — best score achieved up to that month).
  const sorted = [...best.entries()].sort(([a], [b]) => a.localeCompare(b));
  let peak = -Infinity;
  let peakName = '';
  return sorted.map(([, v]) => {
    if (v.y > peak) {
      peak = v.y;
      peakName = v.name;
    }
    return { x: v.x, y: peak, name: peakName };
  });
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

function Card({ title, note, method, insight, children }: { title: string; note: string; method?: string; insight: string | null; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--color-line)] rounded-lg bg-[var(--card)] p-5">
      <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      <p className="text-[11px] text-[var(--mut)] mt-0.5 mb-1">{note}</p>
      {insight && (
        <p className="text-[12px] leading-relaxed mb-1 max-w-[80ch]">
          <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-hover)]">TL;DR</span>
          {insight}
        </p>
      )}
      {method && <p className="text-[11px] text-[var(--dim)] leading-relaxed mb-4 max-w-[80ch]">How it&apos;s measured: {method}</p>}
      {!method && insight && <div className="mb-3" />}
      {children}
    </div>
  );
}

/** Numbers stay readable: max 1 decimal, adaptive USD, no 12-digit floats. */
function fmtVal(v: unknown): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 100) return n.toFixed(0);
  return n.toFixed(1);
}

function fmtUSD(v: unknown): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  if (!Number.isFinite(n)) return '—';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(n < 10 ? 2 : 0)}`;
}

/** Theme-aware tooltip: readable in dark mode, formatted values, stays in view. */
function ChartTip({ active, payload, label, labelPrefix = '', format = fmtVal }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => p.value !== null && p.value !== undefined);
  if (rows.length === 0) return null;
  return (
    <div
      className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-xl text-xs"
      style={{ maxWidth: 'min(240px, 70vw)', color: 'var(--fore)' }}
    >
      {label !== undefined && label !== '' && <div className="font-semibold mb-1">{labelPrefix}{label}</div>}
      {rows.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 tabular-nums">
          {p.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />}
          <span className="text-[var(--mut)] truncate">{p.name}:</span>
          <span className="font-semibold ml-auto pl-2">{format(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const TIP_BOX = { x: false, y: false } as const;

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
      // Key by DISPLAY name: raw variants ("xAI" vs "SpaceXAI") alias to one
      // lab, otherwise the chart shows the same lab twice.
      const key = creatorKey(creatorDisplay(p.creator));
      const cur = byCreator.get(key);
      if (!cur || (p.intelligence ?? 0) > (cur.intelligence ?? 0)) byCreator.set(key, p);
    }
    const labs = [...byCreator.entries()]
      .map(([key, p]) => ({ creator: creatorDisplay(p.creator), name: p.name, intel: p.intelligence ?? 0, color: p.color }))
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
    // One shared, sorted month axis: per-series month lists start at different
    // months, and recharts lays out multi-series categories in first-seen
    // order — separate lists scramble the x-axis (e.g. 2025-05 after 2026-07).
    const monthVals = new Map<string, Map<string, number>>();
    const register = (series: string, month: string, v: number) => {
      let m = monthVals.get(series);
      if (!m) {
        m = new Map<string, number>();
        monthVals.set(series, m);
      }
      const cur = m.get(month);
      if (cur === undefined || v > cur) m.set(month, v);
    };
    for (const p of withIntel) {
      const v = p.intelligence ?? 0;
      register(`country:${p.country}`, monthKey(p.date), v);
      register(p.open ? 'open' : 'closed', monthKey(p.date), v);
    }
    const allMonths = [...new Set([...monthVals.values()].flatMap(m => [...m.keys()]))].sort();
    const seriesOnAxis = (series: string) => {
      const m = monthVals.get(series);
      const raw = allMonths.map(x => ({ x, y: m?.get(x) ?? null as number | null }));
      // Cumulative frontier per series so lines never step down mid-history.
      let peak = -Infinity;
      return raw.map(d => {
        if (d.y !== null && d.y > peak) peak = d.y;
        return { x: d.x, y: peak === -Infinity ? null : peak };
      });
    };
    const countryLines = topCountries.map(c => ({
      country: c,
      color: countries.get(c)![0]?.color || '#71717a',
      data: seriesOnAxis(`country:${c}`),
    }));
    const openLine = seriesOnAxis('open');
    const closedLine = seriesOnAxis('closed');
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
        <Card
          title="Frontier intelligence over time"
          note="Best intelligence score released each month · higher is better"
          method="Intelligence = Artificial Analysis Intelligence Index (0–100 composite of reasoning, coding, math and knowledge benchmarks). Each month plots the best score released that month, carried forward."
          insight={frontierInsight}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.frontier} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={50} />
              <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTip labelPrefix="Month " />} allowEscapeViewBox={TIP_BOX} />
              <Line type="stepAfter" dataKey="y" name="Frontier intelligence" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Intelligence vs release date"
          note="Every benchmarked release, colored by creator"
          method="Each dot plots one release's intelligence score against its release date — the upward drift is the frontier moving."
          insight={topLab ? `${topLab.creator}'s ${topLab.name} leads at ${fmtVal(topLab.intel)}.` : null}
        >
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={50} />
              <YAxis dataKey="y" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                allowEscapeViewBox={TIP_BOX}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  if (!d) return null;
                  return (
                    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-xl text-xs" style={{ maxWidth: 'min(240px, 70vw)', color: 'var(--fore)' }}>
                      <div className="font-semibold mb-1 break-words">{d.name}</div>
                      <div className="tabular-nums">Intelligence: <span className="font-semibold">{fmtVal(d.y)}</span></div>
                    </div>
                  );
                }}
              />
              <Scatter data={data.scatter.slice(0, 300)} fill="var(--accent)">
                {data.scatter.slice(0, 300).map((p, i) => (
                  <Cell key={i} fill={p.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="Leading models by lab"
          note="Best intelligence score per creator right now"
          method="One bar per lab: its highest-scoring benchmarked release. Intelligence is the 0–100 index described above."
          insight={topLab ? `${topLab.creator}'s ${topLab.name} leads at ${fmtVal(topLab.intel)}.` : null}
        >
          <ResponsiveContainer width="100%" height={Math.max(220, data.labs.length * 32)}>
            <BarChart data={data.labs} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="creator" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} width={72} />
              <Tooltip content={<ChartTip />} allowEscapeViewBox={TIP_BOX} />
              <Bar dataKey="intel" name="Intelligence" radius={[0, 4, 4, 0]}>
                {data.labs.map((l, i) => (
                  <Cell key={i} fill={l.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {!compact && (
          <>
            <Card
              title="Inference price over time"
              note="Cheapest blended USD per 1M tokens each month · lower is better"
              method="Floor = cheapest blended input/output price among benchmarked releases that month. Log scale — equal gaps mean equal multiples."
              insight={cheapFirst && cheapLast ? `Floor price moved from ${fmtUSD(cheapFirst.y)} to ${fmtUSD(cheapLast.y)} per 1M tokens.` : null}
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.price} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={50} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} width={46} scale="log" domain={['auto', 'auto']} tickFormatter={(v: number) => fmtUSD(v)} />
                  <Tooltip content={<ChartTip labelPrefix="Month " format={fmtUSD} />} allowEscapeViewBox={TIP_BOX} />
                  <Line type="stepAfter" dataKey="y" name="Floor price" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card
              title="Speed vs intelligence"
              note="Output tokens/sec against intelligence · up-right is best"
              method="Each dot is one benchmarked release: median output speed vs its intelligence score."
              insight={fastest ? `${fastest.name} pushes ${Math.round(fastest.y)} tok/s at intelligence ${Math.round(fastest.x)}.` : null}
            >
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Intelligence" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} domain={['auto', 'auto']} />
                  <YAxis type="number" dataKey="y" name="tok/s" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} allowEscapeViewBox={TIP_BOX} content={<ChartTip />} />
                  <Scatter data={data.speed} name="Releases" fill="var(--accent)">
                    {data.speed.map((p, i) => (
                      <Cell key={i} fill={p.color} />
                    ))}
                  </Scatter>
                  <ZAxis type="number" range={[30, 30]} />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            <Card
              title="Frontier by country"
              note="Best intelligence released per country each month"
              method="Same intelligence index, grouped by creator headquarters country. Gaps mean no release that month."
              insight={(() => {
                const latest = data.countryLines
                  .map(c => ({ country: c.country, y: [...c.data].reverse().find(d => d.y !== null)?.y ?? null }))
                  .filter(c => c.y !== null)
                  .sort((a, b) => (b.y ?? 0) - (a.y ?? 0));
                if (latest.length < 2) return null;
                return `${latest[0].country} leads at ${fmtVal(latest[0].y)}, ${fmtVal((latest[0].y ?? 0) - (latest[1].y ?? 0))} points ahead of ${latest[1].country}.`;
              })()}
            >
              <ResponsiveContainer width="100%" height={260}>
                <LineChart margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={50} allowDuplicatedCategory={false} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTip />} allowEscapeViewBox={TIP_BOX} />
                  <Legend wrapperStyle={{ fontSize: 11, lineHeight: '22px', paddingTop: 4 }} iconSize={10} />
                  {data.countryLines.map(c => (
                    <Line key={c.country} data={c.data} type="stepAfter" dataKey="y" name={c.country} stroke={c.color} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card
              title="Open vs closed frontier"
              note="Best open-weights vs proprietary intelligence each month"
              method="Same index, split by weights availability. Both lines are cumulative frontiers, so they never step down."
              insight={(() => {
                const last = (line: Array<{ y: number | null }>) => [...line].reverse().find(d => d.y !== null)?.y;
                const o = last(data.openLine);
                const c = last(data.closedLine);
                return o !== undefined && o !== null && c !== undefined && c !== null
                  ? `Best open model trails the closed frontier by ${(c - o).toFixed(1)} points.`
                  : null;
              })()}
            >
              <ResponsiveContainer width="100%" height={260}>
                <LineChart margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={50} allowDuplicatedCategory={false} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTip />} allowEscapeViewBox={TIP_BOX} />
                  <Legend wrapperStyle={{ fontSize: 11, lineHeight: '22px', paddingTop: 4 }} iconSize={10} />
                  <Line data={data.openLine} type="stepAfter" dataKey="y" name="Open weights" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                  <Line data={data.closedLine} type="stepAfter" dataKey="y" name="Proprietary" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card
              title="Model sizes over time"
              note="Benchmarked releases per year by parameter bucket"
              method="Counts come straight from our model catalog's disclosed parameter figures; undisclosed sizes are skipped, not guessed."
              insight={(() => {
                const totals = data.paramBars.map(r => ({
                  x: r.x,
                  n: ['<15B', '15–70B', '70–400B', '400B+'].reduce((s, b) => s + (Number(r[b]) || 0), 0),
                }));
                const top = [...totals].sort((a, b) => b.n - a.n)[0];
                return top && top.n > 0 ? `Most benchmarked releases landed in ${top.x} (${top.n} models).` : null;
              })()}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.paramBars} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} allowEscapeViewBox={TIP_BOX} cursor={{ fill: 'var(--color-line)', opacity: 0.25 }} />
                  <Legend wrapperStyle={{ fontSize: 11, lineHeight: '22px', paddingTop: 4 }} iconSize={10} />
                  <Bar dataKey="<15B" stackId="a" fill="#10b981" />
                  <Bar dataKey="15–70B" stackId="a" fill="#0ea5e9" />
                  <Bar dataKey="70–400B" stackId="a" fill="var(--accent)" />
                  <Bar dataKey="400B+" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card
              title="Context window growth"
              note="Largest context window released each year"
              method="Largest disclosed context window among that year's benchmarked releases (combined input + output tokens)."
              insight={(() => {
                const b = data.contextBars;
                if (b.length < 2) return null;
                return `Max context grew from ${fmtInt(b[0].y)} (${b[0].x}) to ${fmtInt(b[b.length - 1].y)} (${b[b.length - 1].x}).`;
              })()}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.contextBars} margin={{ top: 5, right: 10, bottom: 0, left: -5 }}>
                  <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: LINE }} />
                  <YAxis tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtInt(v)} />
                  <Tooltip
                    allowEscapeViewBox={TIP_BOX}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-xl text-xs tabular-nums" style={{ maxWidth: 'min(240px, 70vw)', color: 'var(--fore)' }}>
                          <div className="font-semibold">{d?.x}: {d?.label ?? fmtInt(d?.y)}</div>
                        </div>
                      );
                    }}
                  />
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
