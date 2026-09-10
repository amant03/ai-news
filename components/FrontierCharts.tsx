'use client';

import { useEffect, useMemo, useState } from 'react';
import VerticalBarChart, { modelsToBarData } from '@/components/VerticalBarChart';
import type { ModelRecord } from '@/lib/model-registry';

export default function FrontierCharts() {
  const [models, setModels] = useState<ModelRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/models/catalog')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (mounted && Array.isArray(d?.models)) setModels(d.models);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const frontier = useMemo(
    () =>
      [...models]
        .filter(m => m.intelligenceIndex != null)
        .sort((a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0))
        .slice(0, 12),
    [models]
  );

  const intel = useMemo(() => modelsToBarData(frontier, m => m.intelligenceIndex, { maxBars: 12 }), [frontier]);
  const speed = useMemo(() => modelsToBarData(frontier, m => m.aaSpeed, { maxBars: 12 }), [frontier]);
  const cost = useMemo(() => modelsToBarData(frontier, m => m.aaCostPerTask, { maxBars: 12 }), [frontier]);

  if (intel.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <VerticalBarChart
          data={intel}
          title="Intelligence"
          subtitle="Artificial Analysis Intelligence Index · higher is better"
          format="n1"
        />
        <VerticalBarChart
          data={speed}
          title="Speed"
          subtitle="Output tokens per second · higher is better"
          format="n0"
        />
        <VerticalBarChart
          data={cost}
          title="Cost per Task"
          subtitle="USD per Intelligence Index task · lower is better"
          format="usd"
        />
      </div>
    </section>
  );
}
