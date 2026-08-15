'use client';

import { useMemo, useState } from 'react';

const LABS = [
  { id: 'openai', name: 'OpenAI', color: '#10a37f', models: ['GPT-4o', 'GPT-4.1', 'o3', 'o4-mini', 'GPT-5'], focus: 'Frontier reasoning, multimodal, agents', hq: 'San Francisco, USA', founded: 2015 },
  { id: 'anthropic', name: 'Anthropic', color: '#d4a574', models: ['Claude 4 Opus', 'Claude 4 Sonnet', 'Claude 3.5 Haiku'], focus: 'Constitutional AI, safety, long-context', hq: 'San Francisco, USA', founded: 2021 },
  { id: 'google', name: 'Google DeepMind', color: '#4285f4', models: ['Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'Gemini 3'], focus: 'Multimodal, search integration, science', hq: 'Mountain View, USA', founded: 2023 },
  { id: 'meta', name: 'Meta AI', color: '#0668e1', models: ['Llama 4 Maverick', 'Llama 4 Scout'], focus: 'Open-source weights, community', hq: 'Menlo Park, USA', founded: 2013 },
  { id: 'xai', name: 'xAI', color: '#1d9bf0', models: ['Grok 3', 'Grok 3.5'], focus: 'Real-time data, X integration', hq: 'Palo Alto, USA', founded: 2023 },
  { id: 'deepseek', name: 'DeepSeek', color: '#4f8cff', models: ['DeepSeek V3', 'DeepSeek R1'], focus: 'Open-source, reasoning, cost-efficient', hq: 'Hangzhou, China', founded: 2023 },
  { id: 'mistral', name: 'Mistral AI', color: '#f7a046', models: ['Mistral Large', 'Codestral', 'Pixtral'], focus: 'European sovereignty, multimodal', hq: 'Paris, France', founded: 2023 },
  { id: 'alibaba', name: 'Alibaba (Qwen)', color: '#ff6a00', models: ['Qwen 3', 'QwQ'], focus: 'Open-source, multilingual, reasoning', hq: 'Hangzhou, China', founded: 2023 },
  { id: 'amazon', name: 'Amazon (Nova)', color: '#ff9900', models: ['Nova Pro', 'Nova Lite'], focus: 'AWS integration, enterprise', hq: 'Seattle, USA', founded: 2023 },
  { id: 'microsoft', name: 'Microsoft AI', color: '#00a4ef', models: ['Phi-4', 'Phi-4-mini'], focus: 'Small efficient models, Copilot', hq: 'Redmond, USA', founded: 2019 },
];

const BENCHMARKS = [
  { name: 'MMLU', desc: 'Massive Multitask Language Understanding — tests knowledge across 57 academic subjects', category: 'Knowledge' },
  { name: 'GPQA', desc: 'Graduate-level science questions — PhD-level biology, physics, chemistry', category: 'Reasoning' },
  { name: 'MATH-500', desc: 'Competition-level mathematics — olympiad and graduate problems', category: 'Reasoning' },
  { name: 'SWE-bench Verified', desc: 'Real GitHub issue resolution — production code repair and feature implementation', category: 'Coding' },
  { name: 'HumanEval+', desc: 'Function-level code generation — correct implementation from docstrings', category: 'Coding' },
  { name: 'Aider Polyglot', desc: 'Multi-language code editing — real-world refactoring across 7 languages', category: 'Coding' },
  { name: 'AIME 2024', desc: 'American Invitational Mathematics Examination — competition math', category: 'Reasoning' },
  { name: 'LiveBench', desc: 'Contamination-free benchmark — questions released after knowledge cutoff', category: 'Reasoning' },
  { name: 'τ-bench', desc: 'Tool-use reasoning — complex multi-step workflows with external tools', category: 'Agentic' },
  { name: 'Terminal-bench', desc: 'Terminal and system operations — shell commands, file manipulation', category: 'Agentic' },
  { name: 'VisionArena', desc: 'Visual question answering — multimodal understanding and reasoning', category: 'Multimodal' },
];

const FRONTIER_MODELS = [
  { name: 'GPT-5', lab: 'OpenAI', intelligence: 73.3, price: 15.0, context: 128000, released: '2026-01', strengths: 'Strong across all benchmarks, leading reasoning' },
  { name: 'Claude 4 Opus', lab: 'Anthropic', intelligence: 70.0, price: 15.0, context: 200000, released: '2026-04', strengths: 'Best safety alignment, excellent code, 200k context' },
  { name: 'Gemini 2.5 Pro', lab: 'Google', intelligence: 70.0, price: 1.25, context: 1000000, released: '2025-03', strengths: 'Best value frontier, 1M context, multimodal' },
  { name: 'Grok 3', lab: 'xAI', intelligence: 69.0, price: 3.0, context: 131072, released: '2025-02', strengths: 'Real-time X data, strong reasoning' },
  { name: 'Llama 4 Maverick', lab: 'Meta', intelligence: 66.0, price: 0.30, context: 1000000, released: '2025-04', strengths: 'Best open-source, 1M context, free weights' },
  { name: 'DeepSeek V3', lab: 'DeepSeek', intelligence: 65.0, price: 0.27, context: 128000, released: '2025-03', strengths: 'Extremely cost-efficient, open weights' },
  { name: 'Qwen 3', lab: 'Alibaba', intelligence: 65.0, price: 0.40, context: 131072, released: '2025-04', strengths: 'Multilingual, open-source, strong reasoning' },
  { name: 'Claude 4 Sonnet', lab: 'Anthropic', intelligence: 64.0, price: 3.0, context: 200000, released: '2026-04', strengths: 'Best mid-tier, excellent coding, fast' },
  { name: 'Gemini 2.5 Flash', lab: 'Google', intelligence: 63.0, price: 0.15, context: 1000000, released: '2025-04', strengths: 'Cheapest capable model, 1M context' },
  { name: 'GPT-4.1', lab: 'OpenAI', intelligence: 62.0, price: 2.0, context: 1000000, released: '2025-04', strengths: '1M context, strong instruction following' },
];

const OPEN_VS_PROPRIETARY = [
  { name: 'Llama 4 Maverick', intelligence: 66.0, price: 0.30 },
  { name: 'DeepSeek V3', intelligence: 65.0, price: 0.27 },
  { name: 'Qwen 3', intelligence: 65.0, price: 0.40 },
  { name: 'GPT-5', intelligence: 73.3, price: 15.0 },
  { name: 'Claude 4 Opus', intelligence: 70.0, price: 15.0 },
  { name: 'Gemini 2.5 Pro', intelligence: 70.0, price: 1.25 },
  { name: 'Grok 3', intelligence: 69.0, price: 3.0 },
];

type Tab = 'overview' | 'labs' | 'benchmarks' | 'frontier';

export default function AITrends() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">AI Landscape</h1>
        <p className="text-sm text-[var(--mut)] mt-1">Model intelligence, cost analysis, and lab tracking — updated continuously.</p>
      </div>

      <nav className="flex gap-1 border-b border-[var(--color-line)]">
        {(['overview', 'labs', 'benchmarks', 'frontier'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--dim)] hover:text-[var(--fore)]'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'labs' && <LabsTab />}
      {tab === 'benchmarks' && <BenchmarksTab />}
      {tab === 'frontier' && <FrontierTab />}
    </div>
  );
}

function OverviewTab() {
  const openModels = OPEN_VS_PROPRIETARY.filter(m => ['Llama 4 Maverick', 'DeepSeek V3', 'Qwen 3'].includes(m.name));
  const propModels = OPEN_VS_PROPRIETARY.filter(m => !['Llama 4 Maverick', 'DeepSeek V3', 'Qwen 3'].includes(m.name));

  return (
    <div className="space-y-6">
      <Section title="Intelligence vs Cost">
        <p className="text-sm text-[var(--mut)] mb-4">
          Frontier models cluster at the top-left (expensive, intelligent). Open-source models achieve comparable intelligence at 20-50x lower cost.
          The gap between proprietary and open-source has narrowed significantly since late 2024.
        </p>
        <ScatterChart
          data={OPEN_VS_PROPRIETARY.map(m => ({
            x: m.price,
            y: m.intelligence,
            label: m.name,
            group: openModels.includes(m) ? 'open' : 'proprietary',
          }))}
          xLabel="Price per 1M tokens ($)"
          yLabel="Intelligence Score"
          width={600}
          height={300}
        />
        <div className="flex gap-4 mt-3 text-[11px] text-[var(--dim)]">
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" />Open-source</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 mr-1" />Proprietary</span>
        </div>
      </Section>

      <Section title="Key Takeaways">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title="Open-source is closing the gap"
            body="Llama 4 Maverick (66.0) now matches GPT-4.1 tier intelligence at 1/7th the cost. DeepSeek V3 and Qwen 3 prove open weights can compete at the frontier."
          />
          <InsightCard
            title="Context windows exploding"
            body="Gemini 2.5 Pro and Llama 4 offer 1M token contexts. GPT-4.1 joined at 1M. This unlocks entire-codebase analysis and long document reasoning."
          />
          <InsightCard
            title="Cost dropping exponentially"
            body="Best frontier intelligence went from $60/1M (GPT-4, 2023) to $1.25/1M (Gemini 2.5 Pro). A 48x reduction in 2 years."
          />
        </div>
      </Section>
    </div>
  );
}

function LabsTab() {
  return (
    <div className="space-y-6">
      <Section title="AI Labs — Who's Building What">
        <p className="text-sm text-[var(--mut)] mb-4">
          The AI landscape is dominated by a handful of labs. Each has a distinct strategy: OpenAI and Anthropic push frontier intelligence,
          Meta and DeepSeek prioritize open-source, Google integrates across products, and xAI bets on real-time data.
        </p>
        <div className="space-y-2">
          {LABS.map(lab => (
            <LabRow key={lab.id} lab={lab} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function LabRow({ lab }: { lab: typeof LABS[number] }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-line)] bg-[var(--card)]">
      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: lab.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">{lab.name}</span>
          <span className="text-[10px] text-[var(--dim)]">{lab.hq} · Est. {lab.founded}</span>
        </div>
        <p className="text-[11px] text-[var(--mut)] mt-0.5">{lab.focus}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {lab.models.map(m => (
            <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--dim)]">{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BenchmarksTab() {
  const byCategory = BENCHMARKS.reduce((acc, b) => {
    (acc[b.category] = acc[b.category] || []).push(b);
    return acc;
  }, {} as Record<string, typeof BENCHMARKS>);

  return (
    <div className="space-y-6">
      <Section title="Benchmarks Explained">
        <p className="text-sm text-[var(--mut)] mb-4">
          Understanding what each benchmark actually tests. Not all scores are directly comparable —
          a model may excel at MMLU (knowledge recall) but struggle with SWE-bench (real-world coding).
        </p>
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, benchmarks]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--dim)] mb-2">{cat}</h3>
              <div className="space-y-1.5">
                {benchmarks.map(b => (
                  <div key={b.name} className="flex gap-3 p-2.5 rounded-lg bg-[var(--card)] border border-[var(--color-line)]">
                    <span className="font-mono text-xs font-semibold text-[var(--accent)] flex-shrink-0 w-36">{b.name}</span>
                    <span className="text-[11px] text-[var(--mut)]">{b.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function FrontierTab() {
  return (
    <div className="space-y-6">
      <Section title="Frontier Models — Detailed Comparison">
        <p className="text-sm text-[var(--mut)] mb-4">
          Top 10 models by intelligence score. Scores are weighted composites from MMLU, GPQA, MATH-500, SWE-bench, Aider, and LiveBench.
          Prices are per 1M tokens (input/output average).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-line)]">
                <th className="py-2 pr-3 font-semibold text-[var(--dim)]">Model</th>
                <th className="py-2 pr-3 font-semibold text-[var(--dim)]">Lab</th>
                <th className="py-2 pr-3 font-semibold text-[var(--dim)] text-right">Intelligence</th>
                <th className="py-2 pr-3 font-semibold text-[var(--dim)] text-right">Price</th>
                <th className="py-2 pr-3 font-semibold text-[var(--dim)] text-right">Context</th>
                <th className="py-2 pr-3 font-semibold text-[var(--dim)]">Released</th>
                <th className="py-2 font-semibold text-[var(--dim)]">Strengths</th>
              </tr>
            </thead>
            <tbody>
              {FRONTIER_MODELS.map((m, i) => (
                <tr key={m.name} className="border-b border-[var(--color-line)] hover:bg-[var(--surface)] transition-colors">
                  <td className="py-2.5 pr-3 font-medium">
                    <span className="text-[var(--dim)] mr-1.5">{i + 1}.</span>
                    {m.name}
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--dim)]">{m.lab}</td>
                  <td className="py-2.5 pr-3 text-right font-mono font-semibold">{m.intelligence}</td>
                  <td className="py-2.5 pr-3 text-right font-mono">${m.price}</td>
                  <td className="py-2.5 pr-3 text-right font-mono">{(m.context / 1000).toFixed(0)}k</td>
                  <td className="py-2.5 pr-3 text-[var(--dim)]">{m.released}</td>
                  <td className="py-2.5 text-[var(--dim)] text-[11px]">{m.strengths}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-display font-semibold tracking-tight mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--color-line)] bg-[var(--card)]">
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-[11px] text-[var(--dim)] leading-relaxed">{body}</p>
    </div>
  );
}

interface ScatterPoint {
  x: number;
  y: number;
  label: string;
  group: 'open' | 'proprietary';
}

function ScatterChart({ data, xLabel, yLabel, width = 500, height = 280 }: {
  data: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  width?: number;
  height?: number;
}) {
  const padding = { top: 20, right: 40, bottom: 50, left: 60 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xMin = 0;
  const xMax = Math.max(...data.map(d => d.x)) * 1.15;
  const yMin = Math.min(...data.map(d => d.y)) - 2;
  const yMax = Math.max(...data.map(d => d.y)) + 2;

  const scaleX = (v: number) => padding.left + ((v - xMin) / (xMax - xMin)) * innerW;
  const scaleY = (v: number) => padding.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const xTicks = [0, 2, 5, 10, 15];
  const yTicks = [55, 60, 65, 70, 75];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {xTicks.map(t => (
        <g key={`x${t}`}>
          <line x1={scaleX(t)} y1={padding.top} x2={scaleX(t)} y2={padding.top + innerH} stroke="var(--color-line)" />
          <text x={scaleX(t)} y={height - 10} textAnchor="middle" fill="var(--dim)" fontSize="10" fontFamily="var(--font-mono)">${t}</text>
        </g>
      ))}
      {yTicks.map(t => (
        <g key={`y${t}`}>
          <line x1={padding.left} y1={scaleY(t)} x2={padding.left + innerW} y2={scaleY(t)} stroke="var(--color-line)" />
          <text x={padding.left - 8} y={scaleY(t) + 3} textAnchor="end" fill="var(--dim)" fontSize="10" fontFamily="var(--font-mono)">{t}</text>
        </g>
      ))}
      <text x={width / 2} y={height - 2} textAnchor="middle" fill="var(--dim)" fontSize="10">{xLabel}</text>
      <text x={12} y={height / 2} textAnchor="middle" fill="var(--dim)" fontSize="10" transform={`rotate(-90, 12, ${height / 2})`}>{yLabel}</text>
      {data.map(d => (
        <g key={d.label}>
          <circle cx={scaleX(d.x)} cy={scaleY(d.y)} r={5} fill={d.group === 'open' ? '#10b981' : '#38bdf8'} fillOpacity="0.85" />
          <text x={scaleX(d.x) + 8} y={scaleY(d.y) + 3} fill="var(--fore)" fontSize="9" fontFamily="var(--font-mono)">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}
