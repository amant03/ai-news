'use client';

import { useEffect, useState } from 'react';
import ModelWatch from '@/components/ModelWatch';
import InsightCallout from '@/components/InsightCallout';
import Footer from '@/components/Footer';
import { leaderboardInsight } from '@/lib/insights';
import type { ModelRecord } from '@/lib/model-registry';

export default function LeaderboardsPage() {
  const [total, setTotal] = useState(0);
  const [onlineSources, setOnlineSources] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

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
    fetch('/api/models?sort=intelligence&limit=60')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const list = (d?.models || []) as ModelRecord[];
        if (list.length) {
          try {
            setInsight(leaderboardInsight(list));
          } catch { /* ignore */ }
        }
      })
      .catch(() => {});
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
      <div className="bg-atmosphere" />
      <div className="bg-grid" />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="mb-6">
          <h1 className="font-display font-medium text-4xl md:text-5xl tracking-tight text-[var(--fore)]">LLM Leaderboard</h1>
          <p className="text-[13px] text-[var(--mut)] mt-1">Compare AI models by intelligence, cost, coding ability and context window.</p>
          <InsightCallout text={insight} />
        </div>
        <ModelWatch audience="all" />
      </main>
      <Footer />
    </div>
  );
}