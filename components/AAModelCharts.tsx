'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ReferenceArea, ReferenceLine, ComposedChart, Line,
} from 'recharts';
import { providerColor } from '@/lib/models';

interface M {
  name: string;
  provider: string;
  intelligenceIndex?: number;
  codingIndex?: number;
  aaSpeed?: number;
  aaCostPerTask?: number;
  aaVerbosity?: number;
  promptPrice?: number;
  completionPrice?: number;
  context?: string;
  family: string;
}

const isOpen = (m: M) => m.family === 'open-weights' || m.family === 'open';

function parseContext(c: string | undefined): number | null {
  if (!c) return null;
  const m = c.match(/([\d.]+)\s*([KM])/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2].toLowerCase() === 'm' ? n * 1_000_000 : n * 1_000;
}

function fmtContext(n: number | null): string {
  if (n == null) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1_000).toFixed(0)}K`;
}

function fmtTokens(n: number | undefined): string {
  if (n == null) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : `${(n / 1_000).toFixed(0)}K`;
}

function fmtPrice(n: number | undefined): string {
  if (n == null) return '—';
  return `$${n.toFixed(2)}`;
}

function cachePrice(m: M): number | null {
  return m.promptPrice != null ? m.promptPrice * 0.1 : null;
}

function blendedPrice(m: M): number | null {
  if (m.promptPrice == null && m.completionPrice == null) return null;
  const cache = cachePrice(m) ?? 0;
  const inP = m.promptPrice ?? 0;
  const outP = m.completionPrice ?? 0;
  return (cache * 7 + inP * 2 + outP * 1) / 10;
}

function cacheDiscount(m: M): number | null {
  if (m.promptPrice == null || m.promptPrice === 0) return null;
  return (1 - (cachePrice(m) ?? 0) / m.promptPrice) * 100;
}

const PIE_COLORS = { input: '#7c3aed', cache: '#34d399', output: '#f472b6' };

function ChartTooltip({ rows, labels }: { rows: string[]; labels: string[] }) {
  return function TooltipInner({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
        <div className="font-medium">{d.name}</div>
        <div className="text-[var(--dim)] mb-1">{d.provider}</div>
        {rows.map((r, i) => (
          <div key={r}>{labels[i]}: <span className="font-medium">{d[r] ?? '—'}</span></div>
        ))}
      </div>
    );
  };
}

type Tab = 'tokens' | 'cost' | 'context' | 'speed';

export default function AAModelCharts({ models }: { models: M[] }) {
  const [tab, setTab] = useState<Tab>('tokens');

  const withVerbosity = useMemo(
    () => models.filter(m => m.aaVerbosity != null).sort((a, b) => (b.aaVerbosity ?? 0) - (a.aaVerbosity ?? 0)).slice(0, 15),
    [models]
  );
  const withSpeed = useMemo(
    () => models.filter(m => m.aaSpeed != null).sort((a, b) => (b.aaSpeed ?? 0) - (a.aaSpeed ?? 0)).slice(0, 15),
    [models]
  );
  const withContext = useMemo(
    () => models.map(m => ({ ...m, ctx: parseContext(m.context) })).filter(m => m.ctx != null).sort((a, b) => (b.ctx ?? 0) - (a.ctx ?? 0)).slice(0, 15),
    [models]
  );
  const withPrice = useMemo(
    () => models.filter(m => m.promptPrice != null || m.completionPrice != null)
      .map(m => ({
        ...m,
        inP: m.promptPrice ?? 0,
        cache: cachePrice(m) ?? 0,
        outP: m.completionPrice ?? 0,
        blended: blendedPrice(m) ?? 0,
        discount: cacheDiscount(m) ?? 0,
      }))
      .sort((a, b) => b.blended - a.blended)
      .slice(0, 15),
    [models]
  );

  const scatterCost = useMemo(
    () => models
      .filter(m => m.intelligenceIndex != null && blendedPrice(m) != null)
      .map(m => ({ name: m.name, provider: m.provider, intel: m.intelligenceIndex as number, price: blendedPrice(m) as number, open: isOpen(m) })),
    [models]
  );
  const scatterTokens = useMemo(
    () => models
      .filter(m => m.intelligenceIndex != null && m.aaVerbosity != null)
      .map(m => ({ name: m.name, provider: m.provider, intel: m.intelligenceIndex as number, tokens: m.aaVerbosity as number, open: isOpen(m) })),
    [models]
  );
  const scatterSpeed = useMemo(
    () => models
      .filter(m => m.intelligenceIndex != null && m.aaSpeed != null)
      .map(m => ({ name: m.name, provider: m.provider, intel: m.intelligenceIndex as number, speed: m.aaSpeed as number, open: isOpen(m) })),
    [models]
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: 'tokens', label: 'Token Use' },
    { id: 'cost', label: 'Cost & Pricing' },
    { id: 'context', label: 'Context Window' },
    { id: 'speed', label: 'Speed' },
  ];

  const tokenTooltip = ChartTooltip({ rows: ['aaVerbosity', 'intelligenceIndex'], labels: ['Output tokens', 'Intelligence'] });
  const priceTooltip = ChartTooltip({ rows: ['inP', 'cache', 'outP', 'blended'], labels: ['Input $/M', 'Cache $/M', 'Output $/M', 'Blended $/M'] });
  const speedTooltip = ChartTooltip({ rows: ['aaSpeed', 'intelligenceIndex'], labels: ['tokens/s', 'Intelligence'] });
  const ctxTooltip = ChartTooltip({ rows: ['context'], labels: ['Context window'] });

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
              tab === t.id ? 'bg-black text-white' : 'text-neutral-500 hover:text-black border border-[var(--color-line)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Token Use ═══ */}
      {tab === 'tokens' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[15px] font-semibold tracking-tight mb-1">Output Tokens per Intelligence Index Task</div>
            <p className="text-[11px] text-neutral-400 mb-4">Models with AA verbosity data — weighted output tokens per task · higher = more verbose</p>
            {withVerbosity.length === 0 ? (
              <div className="text-[12px] text-neutral-400 py-8 text-center">No verbosity data yet — synced from Artificial Analysis.</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(360, withVerbosity.length * 34)}>
                <BarChart data={withVerbosity} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtTokens(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
                  <Tooltip content={tokenTooltip} />
                  <Bar dataKey="aaVerbosity" radius={[0, 4, 4, 0]} barSize={20}>
                    {withVerbosity.map((m, i) => <Cell key={i} fill={providerColor(m.provider)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[15px] font-semibold tracking-tight mb-1">Intelligence Index vs. Output Tokens</div>
            <p className="text-[11px] text-neutral-400 mb-4">Verbosity (x) vs intelligence (y) — the upper-left is best: smart and concise</p>
            {scatterTokens.length < 3 ? (
              <div className="text-[12px] text-neutral-400 py-8 text-center">Not enough synced data points yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis type="number" dataKey="tokens" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtTokens(v)} name="Output tokens" />
                  <YAxis type="number" dataKey="intel" tick={{ fontSize: 11 }} name="Intelligence" />
                  <Tooltip content={tokenTooltip} />
                  <Scatter data={scatterTokens}>
                    {scatterTokens.map((d, i) => (
                      <Cell key={i} fill={d.open ? 'transparent' : 'var(--fore)'} stroke={d.open ? 'var(--fore)' : 'none'} strokeWidth={1.5} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ═══ Cost & Pricing ═══ */}
      {tab === 'cost' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[15px] font-semibold tracking-tight mb-1">Pricing: Cache Hit, Input, Output</div>
            <p className="text-[11px] text-neutral-400 mb-4">USD per 1M tokens · cache assumed at 90% input discount</p>
            <div className="flex flex-wrap gap-3 mb-4">
              {[['Input', '#7c3aed'], ['Cache Hit', '#34d399'], ['Output', '#f472b6']].map(([l, c]) => (
                <span key={l as string} className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: c as string }} /> {l}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={Math.max(360, withPrice.length * 34)}>
              <BarChart data={withPrice} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
                <Tooltip content={priceTooltip} />
                <Bar dataKey="inP" stackId="p" fill={PIE_COLORS.input} barSize={20} name="Input" />
                <Bar dataKey="cache" stackId="p" fill={PIE_COLORS.cache} barSize={20} name="Cache Hit" />
                <Bar dataKey="outP" stackId="p" fill={PIE_COLORS.output} barSize={20} name="Output" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[15px] font-semibold tracking-tight mb-1">Intelligence Index vs. Blended Price</div>
            <p className="text-[11px] text-neutral-400 mb-4">Blended at 7:2:1 (cache-input-output) · log scale — the upper-left is the most attractive quadrant</p>
            {scatterCost.length < 5 ? (
              <div className="text-[12px] text-neutral-400 py-8 text-center">Not enough priced models with intelligence data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis type="number" dataKey="price" scale="log" domain={[0.001, 'auto']} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} name="Blended $/M" />
                  <YAxis type="number" dataKey="intel" tick={{ fontSize: 11 }} name="Intelligence" />
                  <Tooltip content={priceTooltip} />
                  <Scatter data={scatterCost}>
                    {scatterCost.map((d, i) => (
                      <Cell key={i} fill={d.open ? 'transparent' : 'var(--fore)'} stroke={d.open ? 'var(--fore)' : 'none'} strokeWidth={1.5} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ═══ Context Window ═══ */}
      {tab === 'context' && (
        <div className="border border-[var(--color-line)] rounded-lg p-5">
          <div className="text-[15px] font-semibold tracking-tight mb-1">Context Window</div>
          <p className="text-[11px] text-neutral-400 mb-4">Maximum combined input &amp; output tokens · higher is better for RAG workflows</p>
          <ResponsiveContainer width="100%" height={Math.max(400, withContext.length * 36)}>
            <BarChart data={withContext} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtContext(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={170} />
              <Tooltip content={ctxTooltip} />
              <Bar dataKey="ctx" radius={[0, 4, 4, 0]} barSize={20}>
                {withContext.map((m, i) => <Cell key={i} fill={providerColor(m.provider)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ═══ Speed ═══ */}
      {tab === 'speed' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[15px] font-semibold tracking-tight mb-1">Output Speed</div>
            <p className="text-[11px] text-neutral-400 mb-4">Output tokens per second (median across providers) · models with AA speed data</p>
            {withSpeed.length === 0 ? (
              <div className="text-[12px] text-neutral-400 py-8 text-center">No speed data yet — synced from Artificial Analysis.</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(360, withSpeed.length * 34)}>
                <BarChart data={withSpeed} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit=" t/s" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
                  <Tooltip content={speedTooltip} />
                  <Bar dataKey="aaSpeed" radius={[0, 4, 4, 0]} barSize={20}>
                    {withSpeed.map((m, i) => <Cell key={i} fill={providerColor(m.provider)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="border border-[var(--color-line)] rounded-lg p-5">
            <div className="text-[15px] font-semibold tracking-tight mb-1">Intelligence Index vs. Output Speed</div>
            <p className="text-[11px] text-neutral-400 mb-4">Speed (x) vs intelligence (y) — the upper-right is best: smart and fast</p>
            {scatterSpeed.length < 3 ? (
              <div className="text-[12px] text-neutral-400 py-8 text-center">Not enough synced data points yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis type="number" dataKey="speed" tick={{ fontSize: 11 }} name="tokens/s" />
                  <YAxis type="number" dataKey="intel" tick={{ fontSize: 11 }} name="Intelligence" />
                  <Tooltip content={speedTooltip} />
                  <Scatter data={scatterSpeed}>
                    {scatterSpeed.map((d, i) => (
                      <Cell key={i} fill={d.open ? 'transparent' : 'var(--fore)'} stroke={d.open ? 'var(--fore)' : 'none'} strokeWidth={1.5} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}