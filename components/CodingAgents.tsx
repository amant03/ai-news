'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell,
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

/* ─── Main Component ─── */

export default function CodingAgents() {
  const [tab, setTab] = useState<Tab>('performance');

  const sortedByIndex = useMemo(() => [...CODING_AGENTS].sort((a, b) => b.index - a.index), []);
  const top15 = sortedByIndex.slice(0, 15);

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
    }));
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
                  const data = top15.map(a => {
                    const ev = a.evals.find(e => e.benchmark === benchmark);
                    return { label: a.label, value: ev ? ev.reward * 100 : 0, provider: a.provider };
                  });
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
              <BarChart data={top15} layout="vertical" margin={{ left: 12 }}>
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
              subtitle="Each point is a coding-agent variant. Farther left means lower average total token usage per task; higher on the chart means higher benchmark performance. The most efficient agents sit toward the upper-left."
            >
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis
                    dataKey="totalTokens" type="number" tick={{ fontSize: 11 }} name="Total Tokens"
                    tickFormatter={(v) => formatTokens(v)}
                  />
                  <YAxis dataKey="index" type="number" tick={{ fontSize: 11 }} domain={[20, 70]} name="Index" unit="%" />
                  <Tooltip content={<AgentScatterTooltip />} />
                  <Scatter data={scatterByTokens}>
                    {scatterByTokens.map((a, i) => (
                      <Cell key={i} fill={providerColor(a.provider)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
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
              <BarChart data={top15} layout="vertical" margin={{ left: 12 }}>
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
              subtitle="Each point is a coding-agent variant. Farther left means lower average cost per task; higher means stronger benchmark performance. The most efficient agents sit toward the upper-left."
            >
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="cost" type="number" tick={{ fontSize: 11 }} name="Cost (USD)" tickFormatter={(v) => `$${v}`} />
                  <YAxis dataKey="index" type="number" tick={{ fontSize: 11 }} domain={[20, 70]} name="Index" unit="%" />
                  <Tooltip content={<AgentScatterTooltip />} />
                  <Scatter data={scatterByCost}>
                    {scatterByCost.map((a, i) => (
                      <Cell key={i} fill={providerColor(a.provider)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
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
              <BarChart data={top15} layout="vertical" margin={{ left: 12 }}>
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
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="wallTime" type="number" tick={{ fontSize: 11 }} name="Time (s)" tickFormatter={(v) => formatTime(v)} />
                  <YAxis dataKey="index" type="number" tick={{ fontSize: 11 }} domain={[20, 70]} name="Index" unit="%" />
                  <Tooltip content={<AgentScatterTooltip />} />
                  <Scatter data={scatterByTime}>
                    {scatterByTime.map((a, i) => (
                      <Cell key={i} fill={providerColor(a.provider)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}