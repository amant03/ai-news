'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar, Cell,
} from 'recharts';
import {
  MODELS_TIMELINE, LAB_COLORS, COUNTRY_COLORS,
  getLabsByLatestIntelligence, getLabModels, getBestModelPerLab,
  type ModelTimeline,
} from '@/lib/trends-data';

type Section = 'progress' | 'efficiency' | 'countries' | 'opensource' | 'architecture';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'progress', label: 'AI Progress' },
  { id: 'efficiency', label: 'Efficiency' },
  { id: 'countries', label: 'Country Analysis' },
  { id: 'opensource', label: 'Open Source Models' },
  { id: 'architecture', label: 'Model Architecture' },
];

/* ─── Helpers ─── */

function formatDate(iso: string) {
  const d = new Date(iso);
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${m[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

function formatQuarter(iso: string) {
  const d = new Date(iso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

/* ─── Section Card (AA style) ─── */

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

function IntelTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--dim)]">{p.name}:</span>
          <span className="font-medium">{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--dim)]">{p.name}:</span>
          <span className="font-medium">${p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
      <div className="font-medium">{d.name}</div>
      <div className="text-[var(--dim)]">{d.lab} · {formatDate(d.date)}</div>
      <div className="mt-1">Intelligence: <span className="font-medium">{d.intelligence}</span></div>
      {d.price != null && <div>Price: <span className="font-medium">${d.price}/1M</span></div>}
    </div>
  );
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
      <div className="font-medium">{d.name}</div>
      <div className="text-[var(--dim)]">{d.lab}</div>
      <div className="mt-1">Intelligence: <span className="font-medium">{d.intelligence}</span></div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function AITrends() {
  const [activeSection, setActiveSection] = useState<Section>('progress');

  /* ─── Data Prep ─── */
  const topLabs = useMemo(() => getLabsByLatestIntelligence().slice(0, 10), []);

  const intelOverTime = useMemo(() => {
    const byLab: Record<string, ModelTimeline[]> = {};
    for (const m of MODELS_TIMELINE) {
      if (!byLab[m.lab]) byLab[m.lab] = [];
      byLab[m.lab].push(m);
    }
    const dates = [...new Set(MODELS_TIMELINE.map(m => m.date))].sort();
    return dates.map(date => {
      const row: Record<string, any> = { date, label: formatDate(date) };
      for (const lab of topLabs) {
        const models = (byLab[lab] || []).filter(m => m.date <= date);
        if (models.length) row[lab] = models[models.length - 1].intelligence;
      }
      return row;
    });
  }, [topLabs]);

  const bestPerLab = useMemo(() => getBestModelPerLab().slice(0, 15), []);

  const priceOverTime = useMemo(() => {
    const bands = [
      { label: 'Intelligence < 20', min: 0, max: 20, color: '#60a5fa' },
      { label: '20 ≤ Intelligence < 40', min: 20, max: 40, color: '#34d399' },
      { label: '40 ≤ Intelligence < 50', min: 40, max: 50, color: '#f472b6' },
      { label: 'Intelligence ≥ 50', min: 50, max: 999, color: '#7c3aed' },
    ];
    const dates = [...new Set(MODELS_TIMELINE.filter(m => m.price != null).map(m => m.date))].sort();
    return dates.map(date => {
      const row: Record<string, any> = { date, label: formatDate(date) };
      const avail = MODELS_TIMELINE.filter(m => m.date <= date && m.price != null);
      for (const band of bands) {
        const inBand = avail.filter(m => m.intelligence >= band.min && m.intelligence < band.max);
        if (inBand.length) {
          row[band.label] = inBand.reduce((s, m) => s + m.price!, 0) / inBand.length;
        }
      }
      return row;
    });
  }, []);

  const speedOverTime = useMemo(() => {
    const bands = [
      { label: 'Intelligence < 20', min: 0, max: 20, color: '#60a5fa' },
      { label: '20 ≤ Intelligence < 40', min: 20, max: 40, color: '#34d399' },
      { label: '40 ≤ Intelligence < 50', min: 40, max: 50, color: '#f472b6' },
      { label: 'Intelligence ≥ 50', min: 50, max: 999, color: '#7c3aed' },
    ];
    const dates = [...new Set(MODELS_TIMELINE.filter(m => m.speed != null).map(m => m.date))].sort();
    return dates.map(date => {
      const row: Record<string, any> = { date, label: formatDate(date) };
      const avail = MODELS_TIMELINE.filter(m => m.date <= date && m.speed != null);
      for (const band of bands) {
        const inBand = avail.filter(m => m.intelligence >= band.min && m.intelligence < band.max);
        if (inBand.length) {
          row[band.label] = inBand.reduce((s, m) => s + m.speed!, 0) / inBand.length;
        }
      }
      return row;
    });
  }, []);

  const countryOverTime = useMemo(() => {
    const countries = Object.keys(COUNTRY_COLORS);
    const byCountry: Record<string, ModelTimeline[]> = {};
    for (const m of MODELS_TIMELINE) {
      if (!byCountry[m.country]) byCountry[m.country] = [];
      byCountry[m.country].push(m);
    }
    const dates = [...new Set(MODELS_TIMELINE.map(m => m.date))].sort();
    return dates.map(date => {
      const row: Record<string, any> = { date, label: formatDate(date) };
      for (const c of countries) {
        const models = (byCountry[c] || []).filter(m => m.date <= date);
        if (models.length) row[c] = models[models.length - 1].intelligence;
      }
      return row;
    });
  }, []);

  const scatterData = useMemo(() =>
    MODELS_TIMELINE.filter(m => m.intelligence > 15).map(m => ({
      ...m,
      releaseDate: new Date(m.date).getTime(),
    })),
  []);

  const openVsProp = useMemo(() => {
    const dates = [...new Set(MODELS_TIMELINE.map(m => m.date))].sort();
    return dates.map(date => {
      const avail = MODELS_TIMELINE.filter(m => m.date <= date);
      const open = avail.filter(m => m.isOpen);
      const prop = avail.filter(m => !m.isOpen);
      const row: Record<string, any> = { date, label: formatDate(date) };
      if (open.length) row['Open Weights'] = open.reduce((s, m) => s + m.intelligence, 0) / open.length;
      if (prop.length) row['Proprietary'] = prop.reduce((s, m) => s + m.intelligence, 0) / prop.length;
      return row;
    });
  }, []);

  const BAND_COLORS: Record<string, string> = {
    'Intelligence < 20': '#60a5fa',
    '20 ≤ Intelligence < 40': '#34d399',
    '40 ≤ Intelligence < 50': '#f472b6',
    'Intelligence ≥ 50': '#7c3aed',
  };

  return (
    <div className="flex gap-8">
      {/* Sidebar nav */}
      <nav className="hidden lg:block w-48 shrink-0 sticky top-20 self-start">
        <div className="space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === s.id
                  ? 'bg-black text-white font-medium'
                  : 'text-[var(--dim)] hover:text-[var(--fore)] hover:bg-[var(--surface)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile section tabs */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--background)] border-t border-[var(--color-line)] px-2 py-2 flex gap-1 overflow-x-auto">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeSection === s.id
                ? 'bg-black text-white'
                : 'text-[var(--dim)] border border-[var(--color-line)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-8 pb-20 lg:pb-0">

        {/* ═══ AI Progress ═══ */}
        {activeSection === 'progress' && (
          <>
            <SectionCard
              title="Frontier Language Model Intelligence, Over Time"
              subtitle="Artificial Analysis Intelligence Index — tracking the continued advancement of AI and the position of each leading AI company."
            >
              <div className="flex flex-wrap gap-2 mb-4">
                {topLabs.map(lab => (
                  <span key={lab} className="inline-flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: LAB_COLORS[lab] || '#6b7280' }} />
                    {lab}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={intelOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 70]} />
                  <Tooltip content={<IntelTooltip />} />
                  {topLabs.map(lab => (
                    <Line
                      key={lab}
                      type="monotone"
                      dataKey={lab}
                      stroke={LAB_COLORS[lab] || '#6b7280'}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard
              title="Leading Models by AI Lab"
              subtitle="Highest Artificial Analysis Intelligence Index achieved by each AI lab."
            >
              <ResponsiveContainer width="100%" height={Math.max(300, bestPerLab.length * 40)}>
                <BarChart data={bestPerLab} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 70]} />
                  <YAxis type="category" dataKey="lab" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="intelligence" radius={[0, 4, 4, 0]} barSize={24}>
                    {bestPerLab.map((m, i) => (
                      <Cell key={i} fill={LAB_COLORS[m.lab] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard
              title="Intelligence Index vs. Release Date"
              subtitle="Scatter plot of all models — intelligence index plotted against release date."
            >
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis
                    dataKey="releaseDate"
                    type="number"
                    tick={{ fontSize: 11 }}
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v) => formatDate(new Date(v).toISOString())}
                  />
                  <YAxis dataKey="intelligence" type="number" tick={{ fontSize: 11 }} domain={[0, 70]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter data={scatterData} fill="#7c3aed">
                    {scatterData.map((m, i) => (
                      <Cell key={i} fill={LAB_COLORS[m.lab] || '#6b7280'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </SectionCard>
          </>
        )}

        {/* ═══ Efficiency ═══ */}
        {activeSection === 'efficiency' && (
          <>
            <SectionCard
              title="Language Model Inference Price, by Intelligence Index Band, Over Time"
              subtitle="Price in USD per 1M tokens (7:2:1 blend of cache, input, and output token prices). Bands use Artificial Analysis Intelligence Index."
            >
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(BAND_COLORS).map(([label, color]) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={priceOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<PriceTooltip />} />
                  {Object.entries(BAND_COLORS).map(([label, color]) => (
                    <Line key={label} type="monotone" dataKey={label} stroke={color} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard
              title="Language Model Output Speed, by Intelligence Index Band, Over Time"
              subtitle="Output tokens per second. Bands use Artificial Analysis Intelligence Index."
            >
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(BAND_COLORS).map(([label, color]) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {label}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={speedOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] px-3 py-2 shadow-lg text-xs">
                        <div className="font-medium mb-1">{label}</div>
                        {payload.map((p: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                            <span className="text-[var(--dim)]">{p.name}:</span>
                            <span className="font-medium">{p.value?.toFixed(0)} tok/s</span>
                          </div>
                        ))}
                      </div>
                    );
                  }} />
                  {Object.entries(BAND_COLORS).map(([label, color]) => (
                    <Line key={label} type="monotone" dataKey={label} stroke={color} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>
          </>
        )}

        {/* ═══ Country Analysis ═══ */}
        {activeSection === 'countries' && (
          <SectionCard
            title="Frontier Language Model Intelligence By Country, Over Time"
            subtitle="Tracking AI progress by country — the best intelligence score achieved by models from each country."
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(COUNTRY_COLORS).map(([country, color]) => (
                <span key={country} className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {country}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={countryOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 70]} />
                <Tooltip content={<IntelTooltip />} />
                {Object.entries(COUNTRY_COLORS).map(([country, color]) => (
                  <Line key={country} type="monotone" dataKey={country} stroke={color} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* ═══ Open Source ═══ */}
        {activeSection === 'opensource' && (
          <>
            <SectionCard
              title="Progress in Open Weights vs. Proprietary Intelligence"
              subtitle="Comparing the intelligence trajectory of open weights models versus proprietary models over time."
            >
              <div className="flex gap-4 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#34d399]" /> Open Weights
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> Proprietary
                </span>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={openVsProp}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 70]} />
                  <Tooltip content={<IntelTooltip />} />
                  <Line type="monotone" dataKey="Open Weights" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="Proprietary" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard
              title="Intelligence Index by Open Weights / Proprietary"
              subtitle="All models plotted — intelligence index colored by license type."
            >
              <div className="flex gap-4 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> Proprietary
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#34d399]" /> Open Weights
                </span>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="releaseDate" type="number" tick={{ fontSize: 11 }} domain={['dataMin', 'dataMax']}
                    tickFormatter={(v) => formatDate(new Date(v).toISOString())} />
                  <YAxis dataKey="intelligence" type="number" tick={{ fontSize: 11 }} domain={[0, 70]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter data={scatterData}>
                    {scatterData.map((m, i) => (
                      <Cell key={i} fill={m.isOpen ? '#34d399' : '#7c3aed'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </SectionCard>
          </>
        )}

        {/* ═══ Model Architecture ═══ */}
        {activeSection === 'architecture' && (
          <>
            <SectionCard
              title="Intelligence Index vs. Release Date by Model Architecture"
              subtitle="Comparing Dense vs Mixture of Experts (MoE) architectures over time."
            >
              <div className="flex gap-4 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Dense
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#f97316]" /> MoE
                </span>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="releaseDate" type="number" tick={{ fontSize: 11 }} domain={['dataMin', 'dataMax']}
                    tickFormatter={(v) => formatDate(new Date(v).toISOString())} />
                  <YAxis dataKey="intelligence" type="number" tick={{ fontSize: 11 }} domain={[0, 70]} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter data={scatterData.filter(m => !m.isOpen || m.intelligence > 25)}>
                    {scatterData.filter(m => !m.isOpen || m.intelligence > 25).map((m, i) => (
                      <Cell key={i} fill={m.lab === 'DeepSeek' || m.lab === 'xAI' ? '#f97316' : '#3b82f6'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard
              title="Model Size: Total and Active Parameters"
              subtitle="Comparison between total model parameters and parameters active during inference."
            >
              <ResponsiveContainer width="100%" height={Math.max(300, bestPerLab.length * 40)}>
                <BarChart data={bestPerLab} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="intelligence" radius={[0, 4, 4, 0]} barSize={20}>
                    {bestPerLab.map((m, i) => (
                      <Cell key={i} fill={LAB_COLORS[m.lab] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </>
        )}

      </div>
    </div>
  );
}
