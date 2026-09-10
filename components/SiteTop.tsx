'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Ticker from '@/components/Ticker';
import { NewsItem } from '@/lib/types';

/**
 * Sticky two-row chrome: nav tabs on top, live ticker directly underneath
 * so the marquee is never covered by the header.
 */
export default function SiteTop() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/news?limit=24');
        const data = await res.json();
        if (mounted && Array.isArray(data.items)) setItems(data.items);
      } catch {
        /* keep existing */
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="sticky top-0 z-50" style={{ background: 'var(--background)' }}>
      <div className="pt-4 pb-3">
        <Header />
      </div>
      <Ticker items={items} />
    </div>
  );
}
