'use client';

import { useEffect, useMemo, useState } from 'react';
import CodingAgents from '@/components/CodingAgents';
import InsightCallout from '@/components/InsightCallout';
import Footer from '@/components/Footer';
import { CODING_AGENTS } from '@/lib/coding-agents-data';

export default function CodingAgentsPage() {
  const [total, setTotal] = useState(0);
  const [onlineSources, setOnlineSources] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/news?limit=1');
        const data = await res.json();
        setTotal(data.total || 0);
        setLastUpdated(new Date());
      } catch {}
    };
    const loadStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data?.sources) {
          const entries = Object.values(data.sources) as Array<{ ok?: boolean }>;
          setOnlineSources(entries.filter(s => s.ok).length);
        }
        if (data?.nextRun) setNextRefreshAt(new Date(data.nextRun));
      } catch {}
    };
    load();
    loadStatus();
    const id = setInterval(load, 60000);
    const sid = setInterval(loadStatus, 60000);
    return () => { clearInterval(id); clearInterval(sid); };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetch('/api/refresh', { method: 'POST' }); } catch {}
    setRefreshing(false);
  };

  const insight = useMemo(() => {
    if (!CODING_AGENTS.length) return null;
    const top = [...CODING_AGENTS].sort((a, b) => b.index - a.index)[0];
    const cheapest = [...CODING_AGENTS].sort((a, b) => a.cost - b.cost)[0];
    return `${top.label} leads on agent index (${top.index.toFixed(1)}), while ${cheapest.label} is the cheapest run at $${cheapest.cost.toFixed(2)}.`;
  }, []);

  return (
    <div className="min-h-screen">
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-6">
          <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-[var(--fore)]">Coding Agents</h1>
          <p className="text-sm text-[var(--dim)] mt-1">
            Coding agent benchmarks — index, cost, token usage, and execution time.
          </p>
          <InsightCallout text={insight} />
        </div>
        <CodingAgents />
      </main>
      <Footer />
    </div>
  );
}