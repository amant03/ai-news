'use client';

import { useEffect, useState } from 'react';
import ImageLeaderboard from '@/components/ImageLeaderboard';
import Footer from '@/components/Footer';

export default function ImageLeaderboardPage() {
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
      <div className="bg-atmosphere" />
      <div className="bg-grid" />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <ImageLeaderboard />
      </main>
      <Footer />
    </div>
  );
}
