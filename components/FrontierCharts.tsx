'use client';

import { useEffect, useMemo, useState } from 'react';
import VerticalBarChart, { modelsToBarData, BarDatum } from '@/components/VerticalBarChart';
import type { ModelRecord } from '@/lib/model-registry';
import { finiteNum } from '@/lib/format';
import type { SortDir } from '@/lib/sortable';

function avgCost(m: ModelRecord): number | undefined {
  const p = finiteNum(m.promptPrice);
  const c = finiteNum(m.completionPrice);
  if (p === undefined && c === undefined) return undefined;
  return ((p ?? c ?? 0) + (c ?? p ?? 0)) / 2;
}

function fmtCost(v: number) {
  if (!Number.isFinite(v)) return '—';
  if (v <= 0.02) return 'Free';
  if (v < 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(1)}`;
}

function barDataFor(
  models: ModelRecord[],
  getValue: (m: ModelRecord) => number | undefined,
  dir: SortDir
): BarDatum[] {
  const all = modelsToBarData(models, getValue, { maxBars: models.length || 1 });
  all.sort((a, b) => b.value - a.value);
  if (dir === 'asc') all.reverse();
  return all.slice(0, 12);
}

export default function FrontierCharts() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [chartDir, setChartDir] = useState<Record<'intel' | 'speed' | 'cost', SortDir>>({
    intel: 'desc',
    speed: 'desc',
    cost: 'asc',
  });

  useEffect(() => {
    let mounted = true;
    fetch('/api/models?sort=intelligence&limit=100')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (mounted && Array.isArray(d?.models)) setModels(d.models);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const intel = useMemo(
    () => barDataFor(models, m => m.intelligenceIndex, chartDir.intel),
    [models, chartDir.intel]
  );
  const speed = useMemo(
    () => barDataFor(models, m => m.aaSpeed, chartDir.speed),
    [models, chartDir.speed]
  );
  const cost = useMemo(
    () => barDataFor(models, m => finiteNum(m.aaCostPerTask) ?? avgCost(m), chartDir.cost),
    [models, chartDir.cost]
  );

  if (intel.length === 0) return null;

  return (
    <section className="mb-10" aria-label="Model highlights">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <VerticalBarChart
          data={intel}
          title="Intelligence"
          subtitle="Artificial Analysis Intelligence Index · higher is better"
          valueFormat={v => v.toFixed(0)}
          sortDir={chartDir.intel}
          onToggleDir={() => setChartDir(prev => ({ ...prev, intel: prev.intel === 'asc' ? 'desc' : 'asc' }))}
        />
        <VerticalBarChart
          data={speed}
          title="Speed"
          subtitle="Output tokens per second · higher is better"
          valueFormat={v => v.toFixed(0)}
          sortDir={chartDir.speed}
          onToggleDir={() => setChartDir(prev => ({ ...prev, speed: prev.speed === 'asc' ? 'desc' : 'asc' }))}
        />
        <VerticalBarChart
          data={cost}
          title="Cost per Task"
          subtitle="USD per Intelligence Index task · lower is better"
          valueFormat={v => fmtCost(v)}
          sortDir={chartDir.cost}
          onToggleDir={() => setChartDir(prev => ({ ...prev, cost: prev.cost === 'asc' ? 'desc' : 'asc' }))}
        />
      </div>
    </section>
  );
}
