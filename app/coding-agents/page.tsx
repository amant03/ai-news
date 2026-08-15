'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import CodingAgents from '@/components/CodingAgents';
import { BUILD_TAG } from '@/lib/build';

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

  return (
    <div className="min-h-screen">
      <Header
        total={total}
        onlineSources={onlineSources}
        lastUpdated={lastUpdated}
        nextRefreshAt={nextRefreshAt}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      />
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Coding Agents</h1>
          <p className="text-sm text-[var(--dim)] mt-1">
            Coding agent benchmarks — index, cost, token usage, and execution time.
          </p>
        </div>
        <CodingAgents />
      </main>
      <footer className="border-t border-[var(--color-line)] mt-10">
        <div className="max-w-[1400px] mx-auto px-5 py-6 flex items-center justify-between text-xs text-[var(--dim)]">
          <span className="font-medium text-[var(--mut)]">AI Pulse — the daily signal on artificial intelligence</span>
          <span className="font-mono text-[10px]" title="Deployment build tag">build {BUILD_TAG}</span>
        </div>
      </footer>
    </div>
  );
}