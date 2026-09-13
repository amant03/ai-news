'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceArea, ReferenceLine, ComposedChart, Line,
} from 'recharts';
import {
  CODING_AGENTS as STATIC_AGENTS,
  AGENT_PROVIDER_COLORS,
  benchmarkFamilies,
  evalReward,
  normalizeBenchmark,
  bestPerHarness,
  runsByModel,
  modelOfRun,
  type CodingAgent,
} from '@/lib/coding-agents-data';

type Tab = 'performance' | 'harness' | 'tokens' | 'cost' | 'time';

const TABS: { id: Tab; label: string }[] = [
  { id: 'performance', label: 'Performance' },
  { id: 'harness', label: 'Harness Comparison' },
  { id: 'tokens', label: 'Token Usage' },
  { id: 'cost', label: 'Cost' },
  { id: 'time', label: 'Execution Time' },
];

const FAMILY_COLORS = ['#7c3aed', '#34d399', '#f472b6', '#f59e0b', '#38bdf8'];
const AA_METHODOLOGY_URL = 'https://artificialanalysis.ai/methodology/coding-agents-benchmarking';

function providerColor(p: string): string {
  return AGENT_PROVIDER_COLORS[p] || '#6b7280';
}

function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function formatTime(s: number): string {
  if (!Number.isFinite(s)) return '—';
  if (s >= 60) return `${(s / 60).toFixed(1)}m`;
  return `${Math.round(s)}s`;
}

/* ─── Small building blocks ─── */

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

function SubTabs<T extends string>({ options, value, onChange }: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-5">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
            value === o.id
              ? 'bg-[var(--fore)] text-[var(--background)]'
              : 'text-[var(--dim)] hover:text-[var(--fore)] border border-[var(--color-line)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 px-6 text-center text-[13px] text-[var(--dim)] leading-relaxed border border-dashed border-[var(--color-line)] rounded-lg">
      {children}
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
      {d.model && <div className="text-[var(--dim)]">{d.model}</div>}
      <div className="mt-1">Index: <span className="font-medium">{typeof d.index === 'number' ? d.index.toFixed(1) : '—'}</span></div>
      {d.cost != null && <div>Cost: <span className="font-medium">${Number(d.cost).toFixed(2)}</span></div>}
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
      <div className="mt-1">Index: <span className="font-medium">{typeof d.index === 'number' ? d.index.toFixed(1) : '—'}</span></div>
      {d.cost != null && <div>Cost: <span className="font-medium">${Number(d.cost).toFixed(2)}</span></div>}
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

/* ─── FAQ (methodology, adapted from Artificial Analysis) ─── */

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'What is the Coding Agent Index?',
    a: <>Our composite score for coding-agent performance across the public benchmark suite on this page. It combines the published benchmarks (currently DeepSWE, Terminal-Bench and SWE-Atlas-QnA families) into a single headline metric, giving equal weight to each component.</>,
  },
  {
    q: 'Which benchmarks are included right now?',
    a: <>The current public index combines implementation and bug-fix tasks (DeepSWE), terminal workflow tasks (Terminal-Bench) and repository Q&A tasks (SWE-Atlas-QnA) — chosen because they stress different parts of the coding-agent workflow rather than repeating the same task format. Benchmark versions evolve; the exact versions in this sync are listed above.</>,
  },
  {
    q: 'How are agents scored on each benchmark?',
    a: <>Each benchmark score is task-normalized average pass@1: for every task the passing attempts are averaged first, then those task-level scores are averaged so every task carries equal weight. All current component outcomes are binary — an attempt can complete cleanly and still score zero when it does not satisfy its verifier.</>,
  },
  {
    q: 'What does execution time mean?',
    a: <>Average wall-clock task runtime per task — the user-facing time cost of the whole agent workflow, including reasoning, tool calls, file reads and writes, shell steps and waiting on model responses. A fast underlying model can still be slower overall inside a longer, tool-heavy workflow.</>,
  },
  {
    q: 'What does token usage mean, and why does it matter?',
    a: <>Average observed token consumption per task, split into input, cache and output tokens. Input covers prompts, instructions and tool context; cache covers prompt tokens reused through prompt caching where the provider exposes that telemetry; output covers generated tokens. Token usage often drives cost and shows how much context an agent consumes to get work done.</>,
  },
  {
    q: 'Why can a higher-index agent still be worse for my use case?',
    a: <>The index balances the benchmark mix — it is not a measure of your latency, cost, tooling or task-type priorities. Real-world choice depends on whether your workflow looks more like repository Q&A, patching or terminal execution, plus IDE integration, model availability and reliability.</>,
  },
  {
    q: 'How realistic are these tasks, and what setup was used?',
    a: <>Results reflect specific evaluated agent variants, not generic product names: model choice, settings and execution configuration can materially change outcomes, which is why one agent family may appear in several variants. Full run-level methodology is published by Artificial Analysis — see the methodology link above.</>,
  },
];

/* ─── Main Component ─── */

export default function CodingAgents() {
  const [tab, setTab] = useState<Tab>('performance');
  // Live board refreshed every 4h; static snapshot keeps first paint working.
  const [agents, setAgents] = useState<CodingAgent[]>(STATIC_AGENTS);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Sub-tabs (AA parity)
  const [perfBench, setPerfBench] = useState<string>('all');
  const [tokenSub, setTokenSub] = useState<'total' | 'distribution' | 'cache' | 'inout' | 'bybench'>('distribution');
  const [tokenBench, setTokenBench] = useState<string>('');
  const [costSub, setCostSub] = useState<'run' | 'distribution' | 'total'>('run');
  const [timeSub, setTimeSub] = useState<'time' | 'turns'>('time');
  const [harnessModel, setHarnessModel] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/coding-agents')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (mounted && Array.isArray(d?.models) && d.models.length > 0) {
          setAgents(d.models as CodingAgent[]);
          setUpdatedAt(typeof d.updatedAt === 'string' ? d.updatedAt : null);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const sortedByIndex = useMemo(() => [...agents].sort((a, b) => b.index - a.index), [agents]);
  const top15 = sortedByIndex.slice(0, 15);
  const sortedByTokens = useMemo(() => [...top15].sort((a, b) => b.totalTokens - a.totalTokens), [top15]);
  const sortedByCost = useMemo(() => [...top15].sort((a, b) => b.cost - a.cost), [top15]);
  const sortedByTime = useMemo(() => [...top15].sort((a, b) => b.wallTime - a.wallTime), [top15]);
  const sortedBySteps = useMemo(() => [...top15].sort((a, b) => b.steps - a.steps), [top15]);

  const scatterByTokens = useMemo(() => agents.map(a => ({ ...a })), [agents]);
  const scatterByCost = useMemo(() => agents.filter(a => a.cost > 0).map(a => ({ ...a })), [agents]);
  const scatterByTime = useMemo(() => agents.map(a => ({ ...a })), [agents]);

  // Benchmark families present in the data (version-tolerant: survives AA renames).
  const families = useMemo(() => benchmarkFamilies(agents), [agents]);
  const familyNames = families.map(f => f.label).join(', ');
  useEffect(() => {
    if (perfBench !== 'all' && !families.some(f => f.key === perfBench)) setPerfBench('all');
  }, [families, perfBench]);
  useEffect(() => {
    if (!tokenBench || !families.some(f => f.key === tokenBench)) setTokenBench(families[0]?.key ?? '');
  }, [families, tokenBench]);

  /* Harness comparison: best run per harness + same-model view */
  const harnessBoard = useMemo(() => bestPerHarness(agents), [agents]);
  const modelGroups = useMemo(() => runsByModel(agents), [agents]);
  const selectedGroup = useMemo(() => {
    if (modelGroups.length === 0) return null;
    return modelGroups.find(g => g.model === harnessModel)
      ?? modelGroups.find(g => g.runs.length > 1)
      ?? modelGroups[0];
  }, [modelGroups, harnessModel]);

  const versionLine = useMemo(() => {
    const withVersions = agents.find(a => a.harnessVersions && Object.keys(a.harnessVersions).length > 0);
    if (!withVersions?.harnessVersions) return null;
    return Object.entries(withVersions.harnessVersions)
      .map(([k, v]) => `${k} ${v.version}${v.dateReleased ? ` (${v.dateReleased.slice(0, 10)})` : ''}`)
      .join(' · ');
  }, [agents]);

  return (
    <div>
      {/* Intro */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold tracking-tight mb-2">Coding Agent Benchmarks</h2>
        <p className="text-[13px] text-[var(--mut)] max-w-[90ch] leading-relaxed">
          Real-world performance of coding agents on software engineering tasks — including cost, token usage, and
          execution time. Independent coding-agent benchmarks — a composite of
          {familyNames || 'DeepSWE, Terminal-Bench and SWE-Atlas-QnA'}.
          {updatedAt && (
            <span className="tabular-nums"> Updated {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.</span>
          )}
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
            title="Coding Agent Index"
            subtitle={`Composite score of ${familyNames || 'DeepSWE, Terminal-Bench and SWE-Atlas-QnA'}. Equal weight to each benchmark. Higher is better.`}
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
            <p className="mt-4 text-[11px] text-[var(--dim)] leading-relaxed">
              Each benchmark score averages pass@1 across three attempts per task. The Index gives equal weight to its
              benchmark components.{' '}
              <a href={AA_METHODOLOGY_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--fore)]">
                See methodology for scoring details and version history.
              </a>
              {versionLine && <span className="block mt-1 tabular-nums">Harness versions in this sync: {versionLine}.</span>}
            </p>
          </SectionCard>

          <div className="mt-6">
            <SectionCard
              title="Score by Benchmark"
              subtitle={`Per-benchmark pass@1 for the top 15 agents — ${familyNames || 'DeepSWE, Terminal-Bench, SWE-Atlas-QnA'}.`}
            >
              <SubTabs
                options={[{ id: 'all', label: 'All benchmarks' }, ...families.map(f => ({ id: f.key, label: f.label }))]}
                value={perfBench}
                onChange={setPerfBench}
              />
              <div className={`grid grid-cols-1 ${perfBench === 'all' ? 'md:grid-cols-3' : ''} gap-4`}>
                {families.filter(f => perfBench === 'all' || f.key === perfBench).map((family) => {
                  const color = FAMILY_COLORS[families.findIndex(f => f.key === family.key) % FAMILY_COLORS.length];
                  const data = top15
                    .map(a => {
                      const reward = evalReward(a, family.key);
                      return { label: a.label, value: reward !== null ? reward * 100 : 0, provider: a.provider };
                    })
                    .sort((a, b) => b.value - a.value);
                  return (
                    <div key={family.key} className="border border-[var(--color-line)] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <div className="text-[13px] font-medium">{family.label}</div>
                      </div>
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
                                  <div>{family.label}: <span className="font-medium">{d.value?.toFixed(1)}%</span></div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} fill={color} />
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
        <>
          <SectionCard
            title="Harness Leaderboard"
            subtitle="Best Coding Agent Index per harness — each harness's strongest evaluated run. Holds nothing constant: this is head-to-head harness performance."
          >
            {harnessBoard.length === 0 ? (
              <EmptyNote>No harness runs in this sync yet.</EmptyNote>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, harnessBoard.length * 56)}>
                <BarChart
                  data={harnessBoard.map(h => ({
                    label: h.harness,
                    agent: h.harness,
                    provider: h.best.provider,
                    model: `${h.best.model ?? modelOfRun(h.best.label, h.best.agent)} · ${h.runs} run${h.runs === 1 ? '' : 's'}`,
                    index: h.best.index,
                    cost: h.best.cost,
                    wallTime: h.best.wallTime,
                    totalTokens: h.best.totalTokens,
                  }))}
                  layout="vertical"
                  margin={{ left: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={180} />
                  <Tooltip content={<AgentBarTooltip />} />
                  <Bar dataKey="index" radius={[0, 4, 4, 0]} barSize={26}>
                    {harnessBoard.map((h, i) => (
                      <Cell key={i} fill={providerColor(h.best.provider)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <div className="mt-6">
            <SectionCard
              title="Same Model, Different Harness"
              subtitle="Holds the underlying model constant and compares how it performs across harnesses. Pick a model below."
            >
              {modelGroups.length === 0 ? (
                <EmptyNote>No runs in this sync yet.</EmptyNote>
              ) : (
                <>
                  <div className="flex gap-1.5 flex-wrap mb-5">
                    {modelGroups.slice(0, 12).map(g => (
                      <button
                        key={g.model}
                        onClick={() => setHarnessModel(g.model)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                          selectedGroup?.model === g.model
                            ? 'bg-[var(--fore)] text-[var(--background)]'
                            : 'text-[var(--dim)] hover:text-[var(--fore)] border border-[var(--color-line)]'
                        }`}
                      >
                        {g.model} <span className="opacity-60 tabular-nums">×{g.runs.length}</span>
                      </button>
                    ))}
                  </div>
                  {selectedGroup && selectedGroup.runs.length > 1 ? (
                    <ResponsiveContainer width="100%" height={Math.max(220, selectedGroup.runs.length * 64)}>
                      <BarChart
                        data={selectedGroup.runs.map(a => ({
                          label: `${a.agent}`,
                          agent: a.agent,
                          provider: a.provider,
                          model: a.label,
                          index: a.index,
                          cost: a.cost,
                          wallTime: a.wallTime,
                          totalTokens: a.totalTokens,
                        }))}
                        layout="vertical"
                        margin={{ left: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={180} />
                        <Tooltip content={<AgentBarTooltip />} />
                        <Bar dataKey="index" radius={[0, 4, 4, 0]} barSize={26}>
                          {selectedGroup.runs.map((a, i) => (
                            <Cell key={i} fill={providerColor(a.provider)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyNote>
                      Only one harness has run {selectedGroup ? <strong>{selectedGroup.model}</strong> : 'this model'} so
                      far — a comparison needs overlapping runs. Check back as new runs are scraped.
                    </EmptyNote>
                  )}
                </>
              )}
            </SectionCard>
          </div>

          <div className="mt-6">
            <SectionCard
              title="All Runs"
              subtitle="Every evaluated harness run in this sync — harness, model, index, cost, time, tokens and turns."
            >
              <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--color-line)]">
                      {['Run', 'Harness', 'Model', 'Index', 'Cost', 'Time', 'Tokens', 'Turns'].map(col => (
                        <th key={col} className="py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--dim)] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByIndex.map(a => (
                      <tr key={a.label} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--input)]/40 transition-colors">
                        <td className="py-2.5 px-3 font-medium max-w-[260px] truncate">{a.label}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: providerColor(a.provider) }} />
                            {a.agent}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--mut)] max-w-[220px] truncate">{a.model ?? modelOfRun(a.label, a.agent)}</td>
                        <td className="py-2.5 px-3 tabular-nums font-semibold">{a.index.toFixed(1)}</td>
                        <td className="py-2.5 px-3 tabular-nums">${a.cost.toFixed(2)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatTime(a.wallTime)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{formatTokens(a.totalTokens)}</td>
                        <td className="py-2.5 px-3 tabular-nums">{a.steps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {/* ═══ Token Usage ═══ */}
      {tab === 'tokens' && (
        <>
          <SectionCard
            title="Token Usage per Task"
            subtitle="Average token consumption per task across the Coding Agent Index — totals, mix, cache efficiency and per-benchmark breakdowns."
          >
            <SubTabs
              options={[
                { id: 'total', label: 'Total Tokens' },
                { id: 'distribution', label: 'Token Distribution' },
                { id: 'cache', label: 'Cache Hit Rate' },
                { id: 'inout', label: 'Input vs. Output' },
                { id: 'bybench', label: 'Tokens by Benchmark' },
              ]}
              value={tokenSub}
              onChange={setTokenSub}
            />

            {tokenSub === 'total' && (
              <ResponsiveContainer width="100%" height={Math.max(400, top15.length * 42)}>
                <BarChart data={sortedByTokens} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatTokens(v)} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                  <Tooltip content={<AgentBarTooltip />} />
                  <Bar dataKey="totalTokens" radius={[0, 4, 4, 0]} barSize={22}>
                    {sortedByTokens.map((a, i) => (
                      <Cell key={i} fill={providerColor(a.provider)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {tokenSub === 'distribution' && (
              <>
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
                    <Bar dataKey="inputTokens" stackId="tok" fill="#7c3aed" barSize={22} name="Input" />
                    <Bar dataKey="cacheTokens" stackId="tok" fill="#34d399" barSize={22} name="Cache" />
                    <Bar dataKey="outputTokens" stackId="tok" fill="#f472b6" barSize={22} name="Output" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}

            {tokenSub === 'cache' && (
              <ResponsiveContainer width="100%" height={Math.max(400, top15.length * 42)}>
                <BarChart data={[...top15].sort((a, b) => b.cacheHitRate - a.cacheHitRate)} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                          <div className="font-medium">{d.label}</div>
                          <div>Cache hit rate: <span className="font-medium">{(d.cacheHitRate * 100).toFixed(1)}%</span></div>
                          <div>Cache tokens: <span className="font-medium">{formatTokens(d.cacheTokens)}</span></div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="cacheHitRate" radius={[0, 4, 4, 0]} barSize={22} fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {tokenSub === 'inout' && (
              <ResponsiveContainer width="100%" height={420}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis type="number" dataKey="inputTokens" tick={{ fontSize: 11 }} tickFormatter={(v) => formatTokens(v)} name="Input tokens" />
                  <YAxis type="number" dataKey="outputTokens" tick={{ fontSize: 11 }} tickFormatter={(v) => formatTokens(v)} name="Output tokens" />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                          <div className="font-medium">{d.label}</div>
                          <div>Input: <span className="font-medium">{formatTokens(d.inputTokens)}</span></div>
                          <div>Output: <span className="font-medium">{formatTokens(d.outputTokens)}</span></div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterByTokens}>
                    {scatterByTokens.map((a, i) => (
                      <Cell key={i} fill={providerColor(a.provider)} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}

            {tokenSub === 'bybench' && (
              <>
                <SubTabs
                  options={families.map(f => ({ id: f.key, label: f.label }))}
                  value={tokenBench}
                  onChange={setTokenBench}
                />
                {(() => {
                  const fam = families.find(f => f.key === tokenBench);
                  if (!fam) return <EmptyNote>No benchmark data in this sync yet.</EmptyNote>;
                  const rows = top15.map(a => {
                    const ev = (a.evals || []).find(e => e.benchmark && normalizeBenchmark(e.benchmark) === fam.key);
                    return {
                      label: a.label,
                      input: ev?.inputTokens ?? 0,
                      cacheWrite: ev?.cacheWriteTokens ?? 0,
                      output: ev?.outputTokens ?? 0,
                    };
                  }).sort((a, b) => (b.input + b.cacheWrite + b.output) - (a.input + a.cacheWrite + a.output));
                  return (
                    <>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> Input
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Cache write
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#f472b6]" /> Output
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={Math.max(400, rows.length * 42)}>
                        <BarChart data={rows} layout="vertical" margin={{ left: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatTokens(v)} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              return (
                                <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                                  <div className="font-medium">{d.label}</div>
                                  <div className="text-[var(--dim)] mb-1">{fam.label}</div>
                                  <div>Input: <span className="font-medium">{formatTokens(d.input)}</span></div>
                                  <div>Cache write: <span className="font-medium">{formatTokens(d.cacheWrite)}</span></div>
                                  <div>Output: <span className="font-medium">{formatTokens(d.output)}</span></div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="input" stackId="btok" fill="#7c3aed" barSize={22} name="Input" />
                          <Bar dataKey="cacheWrite" stackId="btok" fill="#38bdf8" barSize={22} name="Cache write" />
                          <Bar dataKey="output" stackId="btok" fill="#f472b6" barSize={22} name="Output" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  );
                })()}
              </>
            )}
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
            subtitle="Average pay-per-token API cost per task (USD), distribution across tasks, and total evaluation spend. Lower is better. Many users access harnesses through subscription plans rather than pay-per-token."
          >
            <SubTabs
              options={[
                { id: 'run', label: 'Cost to Run' },
                { id: 'distribution', label: 'Cost Distribution' },
                { id: 'total', label: 'Total Cost' },
              ]}
              value={costSub}
              onChange={setCostSub}
            />

            {costSub === 'run' && (
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
            )}

            {costSub === 'distribution' && (
              (() => {
                const rows = top15
                  .filter(a => a.costPercentiles)
                  .map(a => ({
                    label: a.label,
                    p05: a.costPercentiles!.p05,
                    p50: a.costPercentiles!.p50,
                    p95: a.costPercentiles!.p95,
                    track: a.costPercentiles!.p95,
                    p50w: a.costPercentiles!.p50,
                  }))
                  .sort((a, b) => a.p50 - b.p50);
                if (rows.length === 0) {
                  return <EmptyNote>Per-task cost percentiles are not in this sync yet — they arrive with the next scrape.</EmptyNote>;
                }
                const max = Math.max(...rows.map(r => r.p95), 1);
                return (
                  <>
                    <p className="text-[11px] text-[var(--dim)] mb-4">Solid bar: median (p50) task cost · faint track: p05–p95 range across tasks.</p>
                    <ResponsiveContainer width="100%" height={Math.max(360, rows.length * 44)}>
                      <BarChart data={rows} layout="vertical" margin={{ left: 12 }} barGap={-20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} domain={[0, max * 1.05]} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs tabular-nums">
                                <div className="font-medium">{d.label}</div>
                                <div className="mt-1">p05: <span className="font-medium">${d.p05.toFixed(2)}</span></div>
                                <div>p50: <span className="font-medium">${d.p50.toFixed(2)}</span></div>
                                <div>p95: <span className="font-medium">${d.p95.toFixed(2)}</span></div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="track" barSize={20} fill="var(--color-line)" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="p50w" barSize={10} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                );
              })()
            )}

            {costSub === 'total' && (
              (() => {
                const rows = [...agents]
                  .filter(a => a.totalCostUsd !== undefined)
                  .sort((a, b) => (b.totalCostUsd ?? 0) - (a.totalCostUsd ?? 0))
                  .slice(0, 15);
                if (rows.length === 0) {
                  return <EmptyNote>Total evaluation spend is not in this sync yet — it arrives with the next scrape.</EmptyNote>;
                }
                return (
                  <>
                    <p className="text-[11px] text-[var(--dim)] mb-4">Total spend across all evaluated tasks per run (USD).</p>
                    <ResponsiveContainer width="100%" height={Math.max(360, rows.length * 42)}>
                      <BarChart data={rows} layout="vertical" margin={{ left: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                                <div className="font-medium">{d.label}</div>
                                <div>Total cost: <span className="font-medium">${(d.totalCostUsd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span></div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="totalCostUsd" radius={[0, 4, 4, 0]} barSize={22}>
                          {rows.map((a, i) => (
                            <Cell key={i} fill={providerColor(a.provider)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    </>
                  );
                })()
            )}
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
            subtitle="Average agent wall time per task and agent turns per task. Lower is better."
          >
            <SubTabs
              options={[
                { id: 'time', label: 'Execution Time' },
                { id: 'turns', label: 'Turns' },
              ]}
              value={timeSub}
              onChange={setTimeSub}
            />

            {timeSub === 'time' && (
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
            )}

            {timeSub === 'turns' && (
              <>
                <p className="text-[11px] text-[var(--dim)] mb-4">Average agent turns (tool-call steps) per task. Fewer turns usually means a more decisive workflow.</p>
                <ResponsiveContainer width="100%" height={Math.max(400, top15.length * 42)}>
                  <BarChart data={sortedBySteps} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={190} />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                            <div className="font-medium">{d.label}</div>
                            <div>Turns: <span className="font-medium">{d.steps}</span></div>
                            <div>Index: <span className="font-medium">{d.index?.toFixed(1)}</span></div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="steps" radius={[0, 4, 4, 0]} barSize={22} fill="#38bdf8" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </SectionCard>

          <div className="mt-6">
            <SectionCard
              title={timeSub === 'turns' ? 'Coding Agent Index vs. Turns' : 'Coding Agent Index vs. Execution Time'}
              subtitle={timeSub === 'turns'
                ? 'Each point is a coding-agent variant. Farther left means fewer turns per task; higher means stronger benchmark performance.'
                : 'Each point is a coding-agent variant. Farther left means shorter average agent runtime per task; higher means stronger benchmark performance. Agents toward the upper-left deliver stronger results in less active agent time.'}
            >
              <AttractiveScatter
                data={scatterByTime}
                xKey={timeSub === 'turns' ? 'steps' : 'wallTime'}
                xLabel={timeSub === 'turns' ? 'Turns' : 'Time (s)'}
                xFormatter={(v) => timeSub === 'turns' ? String(Math.round(v)) : formatTime(v)}
              />
            </SectionCard>
          </div>
        </>
      )}

      {/* ═══ FAQ ═══ */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight mb-1">Frequently Asked Questions</h2>
        <p className="text-[12px] text-[var(--dim)] mb-5">
          How the Coding Agent Index works.{' '}
          <a href={AA_METHODOLOGY_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--fore)]">
            Full benchmarking methodology on Artificial Analysis.
          </a>
        </p>
        <div className="border border-[var(--color-line)] rounded-lg overflow-hidden divide-y divide-[var(--color-line)]">
          {FAQ.map(f => (
            <div key={f.q} className="px-5 py-4">
              <div className="text-[13px] font-medium mb-1">{f.q}</div>
              <p className="text-[12px] text-[var(--mut)] leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


