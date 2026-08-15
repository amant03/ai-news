'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
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

const BAND_COLORS: Record<string, string> = {
  'Intelligence < 20': '#60a5fa',
  '20 ≤ Intelligence < 40': '#34d399',
  '40 ≤ Intelligence < 50': '#f472b6',
  'Intelligence ≥ 50': '#7c3aed',
};

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--color-line)] rounded-lg p-6 bg-[var(--card)]">
      <h3 className="text-lg font-semibold tracking-tight mb-1">{title}</h3>
      <p className="text-[12px] text-neutral-500 mb-5 max-w-[60ch] leading-relaxed">
        {subtitle}
      </p>
      {children}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

/* ─── Custom Tooltip Components ─── */

function ProgressTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm text-xs space-y-0.5">
      <p className="font-semibold text-neutral-800 mb-1">{formatDate(String(label))}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-neutral-500">{entry.dataKey}:</span>
          <span className="font-medium text-neutral-800">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function EfficiencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm text-xs space-y-0.5">
      <p className="font-semibold text-neutral-800 mb-1">{formatDate(String(label))}</p>
      {payload.map((entry: any) => {
        const price = Math.pow(2, entry.value);
        const priceStr =
          price < 0.01
            ? '<$0.01'
            : price < 1
              ? `$${price.toFixed(2)}`
              : `$${price.toFixed(0)}`;
        return (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-neutral-500">{entry.dataKey}:</span>
            <span className="font-medium text-neutral-800">{priceStr}</span>
          </div>
        );
      })}
    </div>
  );
}

function CountryTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm text-xs space-y-0.5">
      <p className="font-semibold text-neutral-800 mb-1">{formatDate(String(label))}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-neutral-500">{entry.dataKey}:</span>
          <span className="font-medium text-neutral-800">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm text-xs space-y-0.5">
      <p className="font-semibold text-neutral-800">{data.lab}</p>
      <p className="text-neutral-600">{data.modelName}</p>
      <p className="text-neutral-500">
        Intelligence: <span className="font-medium text-neutral-800">{data.intelligence}</span>
      </p>
      <p className="text-neutral-500">
        Date: <span className="font-medium text-neutral-800">{formatDate(data.date)}</span>
      </p>
    </div>
  );
}

/* ─── Main Component ─── */

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
              <span
                className={`w-2 h-2 rounded-sm shrink-0 ${
                  activeSection === s.id ? 'bg-black' : 'bg-neutral-300'
                }`}
              />
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
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
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

  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    const labSeries: Record<string, Record<string, number | undefined>> = {};

    for (const lab of labs) {
      labSeries[lab] = {};
      for (const m of getLabModels(lab)) {
        allDates.add(m.date);
        labSeries[lab][m.date] = m.intelligence;
      }
    }

    return Array.from(allDates)
      .sort()
      .map(date => {
        const row: Record<string, string | number> = { date };
        for (const lab of labs) {
          const val = labSeries[lab][date];
          if (val !== undefined) row[lab] = val;
        }
        return row;
      });
  }, [labs]);

  const scatterData = useMemo(
    () =>
      MODELS_TIMELINE.filter(m => m.price != null && m.price > 0).map(m => ({
        name: m.name,
        lab: m.lab,
        price: m.price,
        intelligence: m.intelligence,
        date: m.date,
      })),
    []
  );

  return (
    <div className="space-y-10">
      <SectionCard
        title="Frontier Language Model Intelligence, Over Time"
        subtitle="Tracking the intelligence index of leading AI models as they release. Each line represents a lab's best model over time."
      >
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              domain={[0, 70]}
              label={{
                value: 'Intelligence Index',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#999' },
              }}
            />
            <Tooltip content={<ProgressTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            {labs.map(lab => (
              <Line
                key={lab}
                type="monotone"
                dataKey={lab}
                stroke={LAB_COLORS[lab] || '#6b7280'}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5, strokeWidth: 1, stroke: '#fff' }}
                connectNulls
                name={lab}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard
        title="Intelligence vs Cost"
        subtitle="Intelligence score plotted against average cost per 1M tokens. Lower-right is the sweet spot."
      >
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              type="number"
              dataKey="price"
              name="Price"
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              label={{
                value: 'Price per 1M tokens (USD)',
                position: 'insideBottom',
                offset: -5,
                style: { fontSize: 11, fill: '#999' },
              }}
            />
            <YAxis
              type="number"
              dataKey="intelligence"
              name="Intelligence"
              domain={[0, 70]}
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              label={{
                value: 'Intelligence',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#999' },
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm text-xs">
                    <p className="font-semibold text-neutral-800">{d?.name}</p>
                    <p className="text-neutral-500">{d?.lab}</p>
                    <p className="text-neutral-500">
                      Intelligence: <span className="font-medium text-neutral-800">{d?.intelligence}</span>
                    </p>
                    <p className="text-neutral-500">
                      Price: <span className="font-medium text-neutral-800">
                        ${d?.price?.toFixed(2)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Scatter
              data={scatterData}
              fillOpacity={0.85}
            >
              {scatterData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={LAB_COLORS[entry.lab] || '#6b7280'}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}

/* ─── Efficiency ─── */

function EfficiencySection() {
  const withPrice = useMemo(
    () => MODELS_TIMELINE.filter(m => m.price != null && m.price > 0),
    []
  );

  const bands = useMemo(
    () => [
      { label: 'Intelligence < 20', filter: (m: ModelTimeline) => m.intelligence < 20 },
      { label: '20 ≤ Intelligence < 40', filter: (m: ModelTimeline) => m.intelligence >= 20 && m.intelligence < 40 },
      { label: '40 ≤ Intelligence < 50', filter: (m: ModelTimeline) => m.intelligence >= 40 && m.intelligence < 50 },
      { label: 'Intelligence ≥ 50', filter: (m: ModelTimeline) => m.intelligence >= 50 },
    ],
    []
  );

  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    const bandSeries: Record<string, Record<string, number | undefined>> = {};

    for (const band of bands) {
      bandSeries[band.label] = {};
      for (const m of withPrice.filter(band.filter).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )) {
        allDates.add(m.date);
        bandSeries[band.label][m.date] = Math.log2(m.price! + 0.01);
      }
    }

    return Array.from(allDates)
      .sort()
      .map(date => {
        const row: Record<string, string | number> = { date };
        for (const band of bands) {
          const val = bandSeries[band.label][date];
          if (val !== undefined) row[band.label] = val;
        }
        return row;
      });
  }, [withPrice, bands]);

  return (
    <div className="space-y-10">
      <SectionCard
        title="Language Model Inference Price, Over Time"
        subtitle="Average $/1M tokens for models at different intelligence levels. Prices have dropped dramatically — frontier intelligence is 48x cheaper than in 2023."
      >
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              domain={[-6, 5]}
              tickFormatter={v => {
                const price = Math.pow(2, v);
                if (price < 0.01) return '<$0.01';
                if (price < 1) return `$${price.toFixed(2)}`;
                return `$${price.toFixed(0)}`;
              }}
              label={{
                value: 'Price (log₂ scale)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#999' },
              }}
            />
            <Tooltip content={<EfficiencyTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            {bands.map(band => (
              <Line
                key={band.label}
                type="monotone"
                dataKey={band.label}
                stroke={BAND_COLORS[band.label]}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5, strokeWidth: 1, stroke: '#fff' }}
                connectNulls
                name={band.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard
        title="Price vs Intelligence — Best Value Models"
        subtitle="Which models give you the most intelligence per dollar? Points in the bottom-right are the best value."
      >
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              type="number"
              dataKey="price"
              name="Price"
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              label={{
                value: 'Price per 1M tokens (USD)',
                position: 'insideBottom',
                offset: -5,
                style: { fontSize: 11, fill: '#999' },
              }}
            />
            <YAxis
              type="number"
              dataKey="intelligence"
              name="Intelligence"
              domain={[0, 70]}
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              label={{
                value: 'Intelligence',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#999' },
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm text-xs">
                    <p className="font-semibold text-neutral-800">{d?.name}</p>
                    <p className="text-neutral-500">{d?.lab}</p>
                    <p className="text-neutral-500">
                      Intelligence: <span className="font-medium text-neutral-800">{d?.intelligence}</span>
                    </p>
                    <p className="text-neutral-500">
                      Price: <span className="font-medium text-neutral-800">
                        ${d?.price?.toFixed(2)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Scatter data={withPrice.map(m => ({
              name: m.name,
              lab: m.lab,
              price: m.price,
              intelligence: m.intelligence,
            }))}>
              {withPrice.map((m, i) => (
                <Cell key={i} fill={LAB_COLORS[m.lab] || '#6b7280'} fillOpacity={0.85} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}

/* ─── Country Analysis ─── */

function CountrySection() {
  const countries = useMemo(() => {
    const maxByCountry: Record<string, number> = {};
    for (const m of MODELS_TIMELINE) {
      maxByCountry[m.country] = Math.max(maxByCountry[m.country] || 0, m.intelligence);
    }
    return Object.entries(maxByCountry)
      .filter(([, score]) => score >= 20)
      .sort(([, a], [, b]) => b - a)
      .map(([c]) => c);
  }, []);

  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    const countrySeries: Record<string, Record<string, number | undefined>> = {};

    for (const country of countries) {
      countrySeries[country] = {};
      for (const m of MODELS_TIMELINE.filter(m => m.country === country).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )) {
        allDates.add(m.date);
        countrySeries[country][m.date] = m.intelligence;
      }
    }

    return Array.from(allDates)
      .sort()
      .map(date => {
        const row: Record<string, string | number> = { date };
        for (const country of countries) {
          const val = countrySeries[country][date];
          if (val !== undefined) row[country] = val;
        }
        return row;
      });
  }, [countries]);

  return (
    <div className="space-y-10">
      <SectionCard
        title="Frontier Language Model Intelligence by Country, Over Time"
        subtitle="Each country's highest intelligence score at any point in time. The US and China lead, with France and the UK emerging."
      >
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
              domain={[0, 70]}
              label={{
                value: 'Intelligence Index',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#999' },
              }}
            />
            <Tooltip content={<CountryTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            {countries.map(country => (
              <Line
                key={country}
                type="monotone"
                dataKey={country}
                stroke={COUNTRY_COLORS[country] || '#6b7280'}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5, strokeWidth: 1, stroke: '#fff' }}
                connectNulls
                name={country}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}

/* ─── Leading Models by Lab ─── */

function LabsSection() {
  const barData = useMemo(() => {
    return getBestModelPerLab()
      .slice(0, 15)
      .map(({ lab, model }) => ({
        lab,
        modelName: model.name,
        intelligence: model.intelligence,
        date: model.date,
        color: LAB_COLORS[lab] || '#6b7280',
      }));
  }, []);

  return (
    <div className="space-y-10">
      <SectionCard
        title="Leading Models by AI Lab"
        subtitle="The highest intelligence index achieved by each AI lab."
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ left: 20, right: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 70]}
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
            />
            <YAxis
              type="category"
              dataKey="lab"
              width={90}
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar
              dataKey="intelligence"
              radius={[0, 4, 4, 0]}
              barSize={20}
            >
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}

/* ─── Open Source Models ─── */

function OpenSourceSection() {
  const openData = useMemo(() => {
    return MODELS_TIMELINE.filter(m => m.isOpen)
      .sort((a, b) => b.intelligence - a.intelligence)
      .slice(0, 20)
      .map(m => ({
        name: m.name,
        lab: m.lab,
        intelligence: m.intelligence,
        date: m.date,
        price: m.price,
        color: LAB_COLORS[m.lab] || '#6b7280',
      }));
  }, []);

  return (
    <div className="space-y-10">
      <SectionCard
        title="Open Source Models — Intelligence Rankings"
        subtitle="The most capable open-weight models available. Open-source has closed the gap with proprietary models."
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={openData}
            layout="vertical"
            margin={{ left: 20, right: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 70]}
              tick={{ fontSize: 11, fontFamily: 'ui-monospace' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10, fontFamily: 'ui-monospace' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm text-xs">
                    <p className="font-semibold text-neutral-800">{d?.name}</p>
                    <p className="text-neutral-500">{d?.lab}</p>
                    <p className="text-neutral-500">
                      Intelligence: <span className="font-medium text-neutral-800">{d?.intelligence}</span>
                    </p>
                    <p className="text-neutral-500">
                      Price: <span className="font-medium text-neutral-800">
                        {d?.price != null ? `$${d.price.toFixed(2)}` : 'N/A'}
                      </span>
                    </p>
                    <p className="text-neutral-500">
                      Released: <span className="font-medium text-neutral-800">{formatDate(d?.date)}</span>
                    </p>
                  </div>
                );
              }}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar
              dataKey="intelligence"
              radius={[0, 4, 4, 0]}
              barSize={18}
            >
              {openData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}
