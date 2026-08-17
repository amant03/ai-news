'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceArea, ReferenceLine, ComposedChart, Line,
} from 'recharts';
import { CODING_AGENTS, AGENT_PROVIDER_COLORS, type CodingAgent } from '@/lib/coding-agents-data';

type Tab = 'performance' | 'harness' | 'tokens' | 'cost' | 'time';

const TABS: { id: Tab; label: string }[] = [
  { id: 'performance', label: 'Performance' },
  { id: 'harness', label: 'Harness Comparison' },
  { id: 'tokens', label: 'Token Usage' },
  { id: 'cost', label: 'Cost' },
  { id: 'time', label: 'Execution Time' },
];

function providerColor(p: string): string {
  return AGENT_PROVIDER_COLORS[p] || '#6b7280';
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function formatTime(s: number): string {
  if (s >= 60) return `${(s / 60).toFixed(1)}m`;
  return `${Math.round(s)}s`;
}

/* ─── Section Card ─── */

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--color-line)] rounded-lg bg-[var(--card)]">
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-[17px] font-semibold tracking-tight mb-1">{title}</h3>
        <p className="text-[12px] text-[var(--dim)] max-w-[70ch] leading-relaxed">{subtitle}</p>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  );
}

/* ─── Custom Tooltips ─── */

function AgentBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
      <div className="font-medium">{d.label}</div>
      <div className="text-[var(--dim)]">{d.agent} · {d.provider}</div>
      <div className="mt-1">Index: <span className="font-medium">{d.index?.toFixed(1)}</span></div>
      {d.cost != null && <div>Cost: <span className="font-medium">${d.cost.toFixed(2)}</span></div>}
      {d.wallTime != null && <div>Time: <span className="font-medium">{formatTime(d.wallTime)}</span></div>}
      {d.totalTokens != null && <div>Tokens: <span className="font-medium">{formatTokens(d.totalTokens)}</span></div>}
    </div>
  );
}

function AgentScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
      <div className="font-medium">{d.label}</div>
      <div className="text-[var(--dim)]">{d.agent} · {d.provider}</div>
      <div className="mt-1">Index: <span className="font-medium">{d.index?.toFixed(1)}</span></div>
      {d.cost != null && <div>Cost: <span className="font-medium">${d.cost.toFixed(2)}</span></div>}
      {d.wallTime != null && <div>Time: <span className="font-medium">{formatTime(d.wallTime)}</span></div>}
      {d.totalTokens != null && <div>Tokens: <span className="font-medium">{formatTokens(d.totalTokens)}</span></div>}
    </div>
  );
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface AttractiveScatterProps {
  data: Array<{ label: string; index: number; [k: string]: any }>;
  xKey: string;
  xLabel: string;
  xFormatter: (v: number) => string;
  showPareto?: boolean;
}

/**
 * Scatter of Index (y) vs an "efficiency" axis (x, lower is better).
 * Shades the most attractive quadrant (upper-left: high index, low x)
 * in green and optionally draws the Pareto frontier as a stepped line.
 */
function AttractiveScatter({ data, xKey, xLabel, xFormatter, showPareto }: AttractiveScatterProps) {
  const values = useMemo(() => data.map(d => d[xKey]).filter((v): v is number => typeof v === 'number'), [data, xKey]);
  const indices = useMemo(() => data.map(d => d.index).filter((v): v is number => typeof v === 'number'), [data]);

  const { xMin, xMax, xMed, yMin, yMax, yMed } = useMemo(() => {
    const xs = values;
    const ys = indices;
    return {
      xMin: Math.min(...xs, 0),
      xMax: Math.max(...xs),
      xMed: median(xs),
      yMin: Math.floor((Math.min(...ys) - 5) / 10) * 10,
      yMax: Math.ceil((Math.max(...ys) + 5) / 10) * 10,
      yMed: median(ys),
    };
  }, [values, indices]);

  const pareto = useMemo(() => {
    if (!showPareto) return [];
    const pts = data
      .filter(d => typeof d[xKey] === 'number')
      .map(d => ({ x: d[xKey] as number, y: d.index as number }))
      .sort((a, b) => a.x - b.x);
    const frontier: { x: number; y: number }[] = [];
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.y > maxY) {
        frontier.push(p);
        maxY = p.y;
      }
    }
    return frontier;
  }, [data, xKey, showPareto]);

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4">
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <span className="w-3 h-3 rounded-sm bg-[#22c55e]/20 border border-[#22c55e]/60" /> Most attractive quadrant
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> Index
        </span>
        {showPareto && (
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="w-4 h-0.5 bg-[#ef4444]" /> Pareto line
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
          <XAxis
            dataKey={xKey} type="number" tick={{ fontSize: 11 }} name={xLabel}
            domain={[xMin, xMax]} tickFormatter={(v) => xFormatter(v)}
          />
          <YAxis dataKey="index" type="number" tick={{ fontSize: 11 }} domain={[yMin, yMax]} name="Index" unit="%" />
          <Tooltip content={<AgentScatterTooltip />} />
          {/* Most attractive quadrant: upper-left */}
          <ReferenceArea
            x1={xMin} x2={xMed}
            y1={yMed} y2={yMax}
            fill="#22c55e"
            fillOpacity={0.08}
            stroke="none"
            ifOverflow="extendDomain"
          />
          {/* Pareto frontier */}
          {showPareto && pareto.length > 1 && (
            <Line
              data={pareto}
              dataKey="y"
              stroke="#ef4444"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="0 0"
            />
          )}
          <Scatter data={data}>
            {data.map((a, i) => (
              <Cell key={i} fill={providerColor(a.provider)} />
            ))}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Main Component ─── */

export default function CodingAgents() {
  const [tab, setTab] = useState<Tab>('performance');

  const sortedByIndex = useMemo(() => [...CODING_AGENTS].sort((a, b) => b.index - a.index), []);
  const top15 = sortedByIndex.slice(0, 15);
  const sortedByTokens = useMemo(() => [...top15].sort((a, b) => b.totalTokens - a.totalTokens), [top15]);
  const sortedByCost = useMemo(() => [...top15].sort((a, b) => b.cost - a.cost), [top15]);
  const sortedByTime = useMemo(() => [...top15].sort((a, b) => b.wallTime - a.wallTime), [top15]);

  const scatterByTokens = useMemo(() => {
    return CODING_AGENTS.map(a => ({ ...a }));
  }, []);
  const scatterByCost = useMemo(() => {
    return CODING_AGENTS.filter(a => a.cost > 0).map(a => ({ ...a }));
  }, []);
  const scatterByTime = useMemo(() => {
    return CODING_AGENTS.map(a => ({ ...a }));
  }, []);

  /* Harness comparison: Claude Code on Opus 5 across harnesses */
  const harnessData = useMemo(() => {
    const claude = CODING_AGENTS.filter(a => a.agent === 'Claude Code' && /Opus 5/i.test(a.label)).slice(0, 4);
    const codex = CODING_AGENTS.filter(a => a.agent === 'Codex' && /GPT-5\.6 Sol/i.test(a.label)).slice(0, 3);
    return [...claude, ...codex].map(a => ({
      label: a.label,
      index: a.index,
      color: providerColor(a.provider),
    })).sort((a, b) => b.index - a.index);
  }, []);

  return (
    <div>
      {/* Intro */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight mb-2">Coding Agent Benchmarks</h2>
        <p className="text-[13px] text-[var(--dim)] max-w-[90ch] leading-relaxed">
          Real-world performance of coding agents on software engineering tasks — including cost, token usage, and
          execution time. Data scraped from the Artificial Analysis Coding Agent Index (v1.3), a composite of
          DeepSWE, Terminal-Bench v2, and SWE-Atlas-QnA.
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1.5 flex-wrap mb-8 pb-4 border-b border-[var(--color-line)]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              tab === t.id
                ? 'bg-black text-white'
                : 'text-[var(--dim)] hover:text-[var(--fore)] border border-[var(--color-line)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Performance ═══ */}
      {tab === 'performance' && (
        <>
          <SectionCard
            title="Artificial Analysis Coding Agent Index"
            subtitle="Composite score of DeepSWE, Terminal-Bench v2, and SWE-Atlas-QnA. Equal weight to each benchmark. Higher is better."
          >
            <ResponsiveContainer width="100%" height={Math.max(400, top15.length * 42)}>
              <BarChart data={top15} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                <Tooltip content={<AgentBarTooltip />} />
                <Bar dataKey="index" radius={[0, 4, 4, 0]} barSize={22}>
                  {top15.map((a, i) => (
                    <Cell key={i} fill={providerColor(a.provider)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="mt-6">
            <SectionCard
              title="Score by Benchmark"
              subtitle="Per-benchmark pass@1 for the top 15 agents — DeepSWE, Terminal-Bench v2, SWE-Atlas-QnA."
            >
              <div className="flex flex-wrap gap-3 mb-4">
                {['DeepSWE', 'Terminal-Bench v2', 'SWE-Atlas-QnA'].map((b, i) => (
                  <span key={b} className="inline-flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: ['#7c3aed', '#34d399', '#f472b6'][i] }} />
                    {b}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['DeepSWE', 'Terminal-Bench v2', 'SWE-Atlas-QnA'].map((benchmark, bi) => {
                  const data = top15
                    .map(a => {
                      const ev = a.evals.find(e => e.benchmark === benchmark);
                      return { label: a.label, value: ev ? ev.reward * 100 : 0, provider: a.provider };
                    })
                    .sort((a, b) => b.value - a.value);
                  const colors = ['#7c3aed', '#34d399', '#f472b6'];
                  return (
                    <div key={benchmark} className="border border-[var(--color-line)] rounded-lg p-4">
                      <div className="text-[13px] font-medium mb-3">{benchmark}</div>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={170} />
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              return (
                                <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                                  <div className="font-medium">{d.label}</div>
                                  <div>{benchmark}: <span className="font-medium">{d.value?.toFixed(1)}%</span></div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} fill={colors[bi]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {/* ═══ Harness Comparison ═══ */}
      {tab === 'harness' && (
        <SectionCard
          title="Harness Comparison: Coding Agent Index"
          subtitle="Composite average pass@1 across harnesses for Claude Opus 5 and Codex GPT-5.6 Sol. Holds the underlying model constant and compares how it performs across different harnesses."
        >
          <ResponsiveContainer width="100%" height={Math.max(280, harnessData.length * 56)}>
            <BarChart data={harnessData} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={200} />
              <Tooltip content={<AgentBarTooltip />} />
              <Bar dataKey="index" radius={[0, 4, 4, 0]} barSize={26}>
                {harnessData.map((h, i) => (
                  <Cell key={i} fill={h.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* ═══ Token Usage ═══ */}
      {tab === 'tokens' && (
        <>
          <SectionCard
            title="Token Usage per Task"
            subtitle="Average input, cache, and output tokens per task across the Coding Agent Index."
          >
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> Input
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-[#34d399]" /> Cache
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-[#f472b6]" /> Output
              </span>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(400, top15.length * 42)}>
              <BarChart data={sortedByTokens} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatTokens(v)} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    if (!d) return null;
                    return (
                      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                        <div className="font-medium">{d.label}</div>
                        <div className="mt-1">Input: <span className="font-medium">{formatTokens(d.inputTokens)}</span></div>
                        <div>Cache: <span className="font-medium">{formatTokens(d.cacheTokens)}</span></div>
                        <div>Output: <span className="font-medium">{formatTokens(d.outputTokens)}</span></div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="inputTokens" stackId="tok" fill="#7c3aed" radius={[0, 0, 0, 0]} barSize={22} name="Input" />
                <Bar dataKey="cacheTokens" stackId="tok" fill="#34d399" barSize={22} name="Cache" />
                <Bar dataKey="outputTokens" stackId="tok" fill="#f472b6" barSize={22} name="Output" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="mt-6">
            <SectionCard
              title="Coding Agent Index vs. Total Tokens"
              subtitle="Each point is a coding-agent variant. Farther left means lower average total token usage per task; higher on the chart means higher benchmark performance. Agents toward the upper-left achieve stronger results with fewer tokens."
            >
              <AttractiveScatter
                data={scatterByTokens}
                xKey="totalTokens"
                xLabel="Total Tokens"
                xFormatter={(v) => formatTokens(v)}
              />
            </SectionCard>
          </div>
        </>
      )}

      {/* ═══ Cost ═══ */}
      {tab === 'cost' && (
        <>
          <SectionCard
            title="Cost per Task"
            subtitle="Average pay-per-token API cost per task (USD). Lower is better."
          >
            <ResponsiveContainer width="100%" height={Math.max(400, top15.length * 42)}>
              <BarChart data={sortedByCost} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                <Tooltip content={<AgentBarTooltip />} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={22}>
                  {top15.map((a, i) => (
                    <Cell key={i} fill={providerColor(a.provider)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="mt-6">
            <SectionCard
              title="Coding Agent Index vs. Cost per Task"
              subtitle="Each point is a coding-agent variant. Farther left means lower average cost per task; higher means stronger benchmark performance. The most efficient agents sit toward the upper-left: stronger results at lower cost."
            >
              <AttractiveScatter
                data={scatterByCost}
                xKey="cost"
                xLabel="Cost (USD)"
                xFormatter={(v) => `$${v}`}
                showPareto
              />
            </SectionCard>
          </div>
        </>
      )}

      {/* ═══ Execution Time ═══ */}
      {tab === 'time' && (
        <>
          <SectionCard
            title="Time per Task"
            subtitle="Average agent wall time per task. Lower is better."
          >
            <ResponsiveContainer width="100%" height={Math.max(400, top15.length * 42)}>
              <BarChart data={sortedByTime} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatTime(v)} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                <Tooltip content={<AgentBarTooltip />} />
                <Bar dataKey="wallTime" radius={[0, 4, 4, 0]} barSize={22}>
                  {top15.map((a, i) => (
                    <Cell key={i} fill={providerColor(a.provider)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="mt-6">
            <SectionCard
              title="Coding Agent Index vs. Execution Time"
              subtitle="Each point is a coding-agent variant. Farther left means shorter average agent runtime per task; higher means stronger benchmark performance. Agents toward the upper-left deliver stronger results in less active agent time."
            >
              <AttractiveScatter
                data={scatterByTime}
                xKey="wallTime"
                xLabel="Time (s)"
                xFormatter={(v) => formatTime(v)}
              />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}