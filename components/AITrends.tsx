'use client';

import { useMemo, useState } from 'react';
import {
  MODELS_TIMELINE,
  LAB_COLORS,
  COUNTRY_COLORS,
  getLabsByLatestIntelligence,
  getLabModels,
  getBestModelPerLab,
  type ModelTimeline,
} from '@/lib/trends-data';

type Section = 'progress' | 'efficiency' | 'countries' | 'labs' | 'opensource';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'progress', label: 'AI Progress' },
  { id: 'efficiency', label: 'Efficiency' },
  { id: 'countries', label: 'Country Analysis' },
  { id: 'labs', label: 'Leading Models by Lab' },
  { id: 'opensource', label: 'Open Source Models' },
];

export default function AITrends() {
  const [activeSection, setActiveSection] = useState<Section>('progress');

  return (
    <div className="flex gap-8">
      {/* Sidebar nav */}
      <aside className="hidden lg:block w-48 shrink-0 sticky top-20 self-start">
        <nav className="space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                activeSection === s.id
                  ? 'font-semibold text-black'
                  : 'text-neutral-400 hover:text-black'
              }`}
            >
              <span className={`w-2 h-2 rounded-sm shrink-0 ${activeSection === s.id ? 'bg-black' : 'bg-neutral-300'}`} />
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile section picker */}
      <div className="lg:hidden mb-4 w-full">
        <select
          value={activeSection}
          onChange={e => setActiveSection(e.target.value as Section)}
          className="w-full border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
        >
          {SECTIONS.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeSection === 'progress' && <ProgressSection />}
        {activeSection === 'efficiency' && <EfficiencySection />}
        {activeSection === 'countries' && <CountrySection />}
        {activeSection === 'labs' && <LabsSection />}
        {activeSection === 'opensource' && <OpenSourceSection />}
      </div>
    </div>
  );
}

/* ─── AI Progress ─── */
function ProgressSection() {
  const labs = getLabsByLatestIntelligence().slice(0, 10);
  const xMin = new Date('2023-01-01').getTime();
  const xMax = new Date('2026-09-01').getTime();
  const yMin = 0;
  const yMax = 70;

  return (
    <div className="space-y-10">
      <SectionCard
        title="Frontier Language Model Intelligence, Over Time"
        subtitle="Tracking the intelligence index of leading AI models as they release. Each line represents a lab's best model over time."
      >
        <LineChart
          data={labs.map(lab => ({
            lab,
            color: LAB_COLORS[lab] || '#6b7280',
            points: getLabModels(lab).map(m => ({
              x: new Date(m.date).getTime(),
              y: m.intelligence,
              label: m.name,
            })),
          }))}
          xMin={xMin}
          xMax={xMax}
          yMin={yMin}
          yMax={yMax}
          xLabel="Release Date"
          yLabel="Intelligence Index"
          yFormat={v => String(v)}
          xFormat={ts => {
            const d = new Date(ts);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
          }}
        />
      </SectionCard>

      <SectionCard
        title="Intelligence vs Cost"
        subtitle="Intelligence score plotted against average cost per 1M tokens. Lower-right is the sweet spot."
      >
        <ScatterChart />
      </SectionCard>
    </div>
  );
}

/* ─── Efficiency ─── */
function EfficiencySection() {
  const withPrice = MODELS_TIMELINE.filter(m => m.price != null && m.price > 0);
  const xMin = new Date('2023-06-01').getTime();
  const xMax = new Date('2026-09-01').getTime();

  // Group by intelligence band
  const bands = [
    { label: 'Intelligence < 20', filter: (m: ModelTimeline) => m.intelligence < 20, color: '#60a5fa' },
    { label: '20 ≤ Intelligence < 40', filter: (m: ModelTimeline) => m.intelligence >= 20 && m.intelligence < 40, color: '#34d399' },
    { label: '40 ≤ Intelligence < 50', filter: (m: ModelTimeline) => m.intelligence >= 40 && m.intelligence < 50, color: '#f472b6' },
    { label: 'Intelligence ≥ 50', filter: (m: ModelTimeline) => m.intelligence >= 50, color: '#7c3aed' },
  ];

  return (
    <div className="space-y-10">
      <SectionCard
        title="Language Model Inference Price, Over Time"
        subtitle="Average $/1M tokens for models at different intelligence levels. Prices have dropped dramatically — frontier intelligence is 48x cheaper than in 2023."
      >
        <LineChart
          data={bands.map(b => ({
            lab: b.label,
            color: b.color,
            points: withPrice
              .filter(b.filter)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(m => ({
                x: new Date(m.date).getTime(),
                y: Math.log2(m.price! + 0.01),
                label: m.name,
              })),
          }))}
          xMin={xMin}
          xMax={xMax}
          yMin={-6}
          yMax={5}
          xLabel="Release Date"
          yLabel="Price (USD per 1M tokens, log₂ scale)"
          yFormat={v => {
            const price = Math.pow(2, v);
            if (price < 0.01) return `<$0.01`;
            if (price < 1) return `$${price.toFixed(2)}`;
            return `$${price.toFixed(0)}`;
          }}
          xFormat={ts => {
            const d = new Date(ts);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
          }}
        />
        <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-neutral-500">
          {bands.map(b => (
            <span key={b.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
              {b.label}
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Price vs Intelligence — Best Value Models"
        subtitle="Which models give you the most intelligence per dollar? Points in the bottom-right are the best value."
      >
        <ScatterChart />
      </SectionCard>
    </div>
  );
}

/* ─── Country Analysis ─── */
function CountrySection() {
  const countries = Object.entries(
    MODELS_TIMELINE.reduce((acc, m) => {
      acc[m.country] = Math.max(acc[m.country] || 0, m.intelligence);
      return acc;
    }, {} as Record<string, number>)
  )
    .filter(([, score]) => score >= 20)
    .sort(([, a], [, b]) => b - a)
    .map(([c]) => c);

  const xMin = new Date('2023-01-01').getTime();
  const xMax = new Date('2026-09-01').getTime();

  return (
    <div className="space-y-10">
      <SectionCard
        title="Frontier Language Model Intelligence by Country, Over Time"
        subtitle="Each country's highest intelligence score at any point in time. The US and China lead, with France and the UK emerging."
      >
        <LineChart
          data={countries.map(country => ({
            lab: country,
            color: COUNTRY_COLORS[country] || '#6b7280',
            points: MODELS_TIMELINE
              .filter(m => m.country === country)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(m => ({
                x: new Date(m.date).getTime(),
                y: m.intelligence,
                label: `${m.name} (${m.lab})`,
              })),
          }))}
          xMin={xMin}
          xMax={xMax}
          yMin={0}
          yMax={70}
          xLabel="Release Date"
          yLabel="Intelligence Index"
          yFormat={v => String(v)}
          xFormat={ts => {
            const d = new Date(ts);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
          }}
        />
        <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-neutral-500">
          {countries.map(c => (
            <span key={c} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COUNTRY_COLORS[c] || '#6b7280' }} />
              {c}
            </span>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Leading Models by Lab ─── */
function LabsSection() {
  const best = getBestModelPerLab().slice(0, 15);
  const maxInt = Math.max(...best.map(b => b.model.intelligence));

  return (
    <div className="space-y-10">
      <SectionCard
        title="Leading Models by AI Lab"
        subtitle="The highest intelligence index achieved by each AI lab."
      >
        <div className="flex items-end gap-3 h-64 mt-4">
          {best.map(({ lab, model }) => {
            const h = (model.intelligence / maxInt) * 100;
            const color = LAB_COLORS[lab] || '#6b7280';
            return (
              <div key={lab} className="flex flex-col items-center flex-1 min-w-0 group">
                <span className="text-xs font-semibold tabular-nums mb-1">{model.intelligence}</span>
                <div
                  className="w-full rounded-t-md transition-all duration-500 group-hover:opacity-90"
                  style={{
                    height: `${h}%`,
                    backgroundColor: color,
                    minHeight: 8,
                  }}
                />
                <div className="mt-2 text-center">
                  <div className="text-[10px] font-medium truncate max-w-[80px]">{model.name}</div>
                  <div className="text-[9px] text-neutral-400">{lab}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Open Source Models ─── */
function OpenSourceSection() {
  const openModels = MODELS_TIMELINE
    .filter(m => m.isOpen)
    .sort((a, b) => b.intelligence - a.intelligence)
    .slice(0, 20);

  return (
    <div className="space-y-10">
      <SectionCard
        title="Open Source Models — Intelligence Rankings"
        subtitle="The most capable open-weight models available. Open-source has closed the gap with proprietary models."
      >
        <div className="space-y-2">
          {openModels.map((m, i) => (
            <div key={`${m.lab}-${m.name}`} className="flex items-center gap-3 py-1.5">
              <span className="text-xs text-neutral-400 tabular-nums w-6 text-right">{i + 1}</span>
              <div className="flex-1 h-5 bg-neutral-100 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${(m.intelligence / 65) * 100}%`,
                    backgroundColor: LAB_COLORS[m.lab] || '#6b7280',
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums w-8 text-right">{m.intelligence}</span>
              <span className="text-[11px] text-neutral-600 truncate w-32">{m.name}</span>
              <span className="text-[10px] text-neutral-400 truncate w-24">{m.lab}</span>
              <span className="text-[10px] text-neutral-400">{m.date.slice(0, 7)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ─── Shared Components ─── */

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--color-line)] rounded-lg p-6 bg-[var(--card)]">
      <h3 className="text-lg font-semibold tracking-tight mb-1">{title}</h3>
      <p className="text-[12px] text-neutral-500 mb-5 max-w-[60ch] leading-relaxed">{subtitle}</p>
      {children}
    </div>
  );
}

interface LineSeries {
  lab: string;
  color: string;
  points: Array<{ x: number; y: number; label: string }>;
}

function LineChart({
  data,
  xMin, xMax, yMin, yMax,
  xLabel, yLabel,
  yFormat, xFormat,
}: {
  data: LineSeries[];
  xMin: number; xMax: number; yMin: number; yMax: number;
  xLabel: string; yLabel: string;
  yFormat: (v: number) => string;
  xFormat: (ts: number) => string;
}) {
  const W = 700;
  const H = 300;
  const pad = { top: 16, right: 20, bottom: 40, left: 50 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const sx = (v: number) => pad.left + ((v - xMin) / (xMax - xMin)) * iW;
  const sy = (v: number) => pad.top + iH - ((v - yMin) / (yMax - yMin)) * iH;

  // X ticks: yearly
  const xTicks: number[] = [];
  for (let y = 2023; y <= 2026; y++) {
    for (let q = 0; q < 4; q++) {
      const ts = new Date(y, q * 3, 1).getTime();
      if (ts >= xMin && ts <= xMax) xTicks.push(ts);
    }
  }

  const yStep = Math.ceil((yMax - yMin) / 5 / 10) * 10;
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += yStep || 10) yTicks.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Grid */}
      {xTicks.map(t => (
        <g key={`x${t}`}>
          <line x1={sx(t)} y1={pad.top} x2={sx(t)} y2={pad.top + iH} stroke="#e5e5e5" strokeWidth="0.5" />
          <text x={sx(t)} y={H - 8} textAnchor="middle" fill="#999" fontSize="8" fontFamily="ui-monospace">{xFormat(t)}</text>
        </g>
      ))}
      {yTicks.map(t => (
        <g key={`y${t}`}>
          <line x1={pad.left} y1={sy(t)} x2={pad.left + iW} y2={sy(t)} stroke="#e5e5e5" strokeWidth="0.5" />
          <text x={pad.left - 6} y={sy(t) + 3} textAnchor="end" fill="#999" fontSize="8" fontFamily="ui-monospace">{yFormat(t)}</text>
        </g>
      ))}
      {/* Axis labels */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fill="#999" fontSize="9">{xLabel}</text>
      <text x={10} y={H / 2} textAnchor="middle" fill="#999" fontSize="9" transform={`rotate(-90, 10, ${H / 2})`}>{yLabel}</text>
      {/* Lines + dots */}
      {data.map(series => {
        const sorted = [...series.points].sort((a, b) => a.x - b.x);
        const pathD = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)},${sy(p.y)}`).join(' ');
        return (
          <g key={series.lab}>
            <path d={pathD} fill="none" stroke={series.color} strokeWidth="1.5" strokeOpacity="0.7" />
            {sorted.map((p, i) => (
              <g key={i}>
                <circle cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={series.color} stroke="white" strokeWidth="1" />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function ScatterChart() {
  const data = MODELS_TIMELINE.filter(m => m.price != null && m.price > 0);
  const W = 500;
  const H = 280;
  const pad = { top: 16, right: 24, bottom: 36, left: 44 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const xMin = 0;
  const xMax = Math.max(...data.map(m => m.price!)) * 1.1;
  const yMin = 0;
  const yMax = 70;

  const sx = (v: number) => pad.left + ((v - xMin) / (xMax - xMin)) * iW;
  const sy = (v: number) => pad.top + iH - ((v - yMin) / (yMax - yMin)) * iH;

  const xTicks = [0, 0.5, 2, 5, 10, 15];
  const yTicks = [0, 20, 40, 60];

  // Label placement
  const placed: Array<{ x: number; y: number; ox: number; oy: number }> = [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {xTicks.map(t => (
        <g key={`x${t}`}>
          <line x1={sx(t)} y1={pad.top} x2={sx(t)} y2={pad.top + iH} stroke="#e5e5e5" strokeWidth="0.5" />
          <text x={sx(t)} y={H - 8} textAnchor="middle" fill="#999" fontSize="8" fontFamily="ui-monospace">
            {t === 0 ? 'Free' : t < 1 ? `$${t}` : `$${t}`}
          </text>
        </g>
      ))}
      {yTicks.map(t => (
        <g key={`y${t}`}>
          <line x1={pad.left} y1={sy(t)} x2={pad.left + iW} y2={sy(t)} stroke="#e5e5e5" strokeWidth="0.5" />
          <text x={pad.left - 6} y={sy(t) + 3} textAnchor="end" fill="#999" fontSize="8" fontFamily="ui-monospace">{t}</text>
        </g>
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" fill="#999" fontSize="9">Price per 1M tokens (USD)</text>
      <text x={10} y={H / 2} textAnchor="middle" fill="#999" fontSize="9" transform={`rotate(-90, 10, ${H / 2})`}>Intelligence</text>
      {data.map((m, i) => {
        const cx = sx(m.price!);
        const cy = sy(m.intelligence);
        let ox = 6, oy = -4;
        for (const p of placed) {
          if (Math.abs((cx + ox) - p.x) < 44 && Math.abs((cy + oy) - p.y) < 10) {
            ox = ox < 0 ? 6 : -6;
            oy = oy < 0 ? 8 : -10;
          }
        }
        placed.push({ x: cx + ox, y: cy + oy, ox, oy });
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={3.5} fill={LAB_COLORS[m.lab] || '#6b7280'} fillOpacity="0.85" />
            <text x={cx + ox} y={cy + oy} fill="#555" fontSize="7" fontFamily="ui-monospace">
              {m.name.length > 14 ? m.name.slice(0, 12) + '..' : m.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
