'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import FilterBar, { FacetOption } from '@/components/FilterBar';
import Hero from '@/components/Hero';
import NewsGrid, { EngEntry } from '@/components/NewsGrid';
import ModelsWidget from '@/components/ModelsWidget';
import WhatsChanged from '@/components/WhatsChanged';
import LatestModels from '@/components/LatestModels';
import SkeletonGrid from '@/components/Skeleton';
import SectionHeader from '@/components/SectionHeader';
import Footer from '@/components/Footer';
import { NewsItem, Category, Domain } from '@/lib/types';
import { frontPageOrder } from '@/lib/engagement';
import { Skeleton } from '@/components/ui/skeleton';

const AITrends = dynamic(() => import('@/components/AITrends'), {
  ssr: false,
  loading: () => <div className="h-40 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--surface)]" />,
});

const POLL_MS = 60_000;
const PAGE_SIZE = 300;

interface FacetsData {
  sources: FacetOption[];
  categories: FacetOption[];
  types: FacetOption[];
  domains: FacetOption[];
}

const EMPTY_FACETS: FacetsData = { sources: [], categories: [], types: [], domains: [] };

function relAgo(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function Home({ children }: { children?: React.ReactNode }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [facets, setFacets] = useState<FacetsData>(EMPTY_FACETS);
  const [total, setTotal] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState<Domain | 'all'>('all');
  const [search, setSearch] = useState('');
  const [newItems, setNewItems] = useState<NewsItem[]>([]);
  const [onlineSources, setOnlineSources] = useState(0);
  const [nextRefreshAt, setNextRefreshAt] = useState<Date | null>(null);
  const [syncedAgo, setSyncedAgo] = useState<string | null>(null);
  const [modelCount, setModelCount] = useState<number | null>(null);

  const seenUrls = useRef<Set<string>>(new Set());
  const offsetRef = useRef(0);
  const pollBusy = useRef(false);

  const buildParams = useCallback(
    (extra?: Record<string, string>) => {
      const p = new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0', ...extra });
      if (selectedSource !== 'all') p.set('source', selectedSource);
      if (selectedCategory !== 'all') p.set('category', selectedCategory);
      if (selectedType !== 'all') p.set('sourceType', selectedType);
      if (selectedDomain !== 'all') p.set('domain', selectedDomain);
      return p;
    },
    [selectedSource, selectedCategory, selectedType, selectedDomain]
  );

  const load = useCallback(
    async (mode: 'reset' | 'more') => {
      try {
        if (mode === 'more') {
          const p = buildParams({ offset: String(offsetRef.current) });
          const res = await fetch(`/api/news?${p}`);
          const data = await res.json();
          setNews(prev => {
            const known = new Set(prev.map(i => i.url));
            const fresh = (data.items as NewsItem[]).filter(i => !known.has(i.url));
            for (const i of fresh) seenUrls.current.add(i.url);
            return [...prev, ...fresh];
          });
          offsetRef.current += data.items.length;
          setHasMore(data.hasMore);
          setTotal(data.total);
          setTotalLoaded(true);
        } else {
          setLoading(true);
          const res = await fetch(`/api/news?${buildParams()}`);
          const data = await res.json();
          setNews(data.items);
          seenUrls.current = new Set((data.items as NewsItem[]).map(i => i.url));
          offsetRef.current = data.items.length;
          setHasMore(data.hasMore);
          setTotal(data.total);
          setTotalLoaded(true);
          setLastUpdated(new Date());
          if (data.facets?.sources) {
            setFacets(f => ({ sources: data.facets.sources, categories: data.facets.categories, types: f.types, domains: data.facets.domains || f.domains }));
          }
        }
      } catch { /* keep existing */ } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  const poll = useCallback(async () => {
    if (pollBusy.current) return;
    pollBusy.current = true;
    try {
      const res = await fetch('/api/news?limit=40');
      const data = await res.json();
      if (Array.isArray(data.items)) {
        const leadingNew: NewsItem[] = [];
        for (const item of data.items) {
          if (!seenUrls.current.has(item.url)) leadingNew.push(item);
          else if (leadingNew.length > 0) break;
        }
        if (leadingNew.length > 0) setNewItems(leadingNew);
        if (typeof data.total === 'number') {
          setTotal(data.total);
          setTotalLoaded(true);
        }
        setLastUpdated(new Date());
      }
    } catch { /* ignore */ } finally { pollBusy.current = false; }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data?.sources) {
        const entries = Object.values(data.sources) as Array<{ ok?: boolean }>;
        setOnlineSources(entries.filter(s => s.ok).length);
      }
      if (data?.nextRun) setNextRefreshAt(new Date(data.nextRun));
      const syncIso: string | null = data?.lastRun || data?.lastSuccess || null;
      setSyncedAgo(relAgo(syncIso));
    } catch { /* ignore */ }
  }, []);

  const pollModelCount = useCallback(async () => {
    try {
      const res = await fetch('/api/models?sort=intelligence&limit=1');
      const data = await res.json();
      if (typeof data?.catalog?.total === 'number') setModelCount(data.catalog.total);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load('reset'); }, [load]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('ai-pulse-domain');
      if (saved === 'business' || saved === 'tech' || saved === 'research' || saved === 'general') setSelectedDomain(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem('ai-pulse-domain', selectedDomain); } catch { /* ignore */ }
  }, [selectedDomain]);
  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    const statusId = setInterval(pollStatus, POLL_MS);
    const initialStatus = setTimeout(() => { pollStatus(); pollModelCount(); }, 0);
    return () => { clearInterval(id); clearInterval(statusId); clearTimeout(initialStatus); };
  }, [poll, pollStatus, pollModelCount]);

  const applyNew = () => {
    setNews(prev => {
      const existing = new Set(prev.map(i => i.url));
      const fresh = newItems.filter(i => !existing.has(i.url));
      for (const i of fresh) seenUrls.current.add(i.url);
      return [...fresh, ...prev];
    });
    setNewItems([]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await fetch('/api/refresh', { method: 'POST' }); await load('reset'); await pollStatus(); }
    catch { /* ignore */ } finally { setRefreshing(false); }
  };

  const resetFilters = () => {
    setSelectedSource('all'); setSelectedCategory('all'); setSelectedType('all');
    setSelectedDomain('all'); setSearch('');
    setNewItems([]);
  };

  const visible = useMemo(() => {
    let list = news;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(i => i.title.toLowerCase().includes(q) || (i.summary || '').toLowerCase().includes(q) || (i.source_label || '').toLowerCase().includes(q));
    return list;
  }, [news, search]);

  const mainFeed = useMemo(() => {
    const q = search.trim();
    if (q) return visible;
    return frontPageOrder(visible);
  }, [visible, search]);

  // Continuous scroll: the whole feed renders, each section expands in place.
  const rest = useMemo(() => mainFeed, [mainFeed]);

  // On-site engagement (likes/comments), keyed by URL. POST bulk avoids URL limits.
  const [engMap, setEngMap] = useState<Record<string, EngEntry>>({});
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    setExpandedKey(null);
  }, [search, selectedSource, selectedCategory, selectedType, selectedDomain]);

  useEffect(() => {
    if (rest.length === 0) return;
    let cancelled = false;
    fetch('/api/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: rest.map(i => i.url) }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d?.ok || !Array.isArray(d.engagement)) return;
        setEngMap(prev => {
          const next = { ...prev };
          for (const e of d.engagement) next[e.url] = e;
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest]);

  const handleEngagement = useCallback((url: string, key: string, likes: number, dislikes: number, comments: number) => {
    setEngMap(prev => ({ ...prev, [url]: { key, likes, dislikes, comments } }));
  }, []);

  void onlineSources;
  void nextRefreshAt;
  void refreshing;
  void handleRefresh;
  void lastUpdated;
  void syncedAgo;
  void setSyncedAgo;

  return (
    <div className="min-h-screen" id="top">
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        {/* 1. Hero band */}
        <Hero
          storyCount={totalLoaded ? total : null}
          modelCount={modelCount}
          persona={selectedDomain}
          onPersonaChange={d => { setSelectedDomain(d); setNewItems([]); }}
          loading={!totalLoaded}
        />

        {/* 2. Filters */}
        <section className="mb-6" aria-label="Filters">
          <FilterBar
            sources={facets.sources}
            categories={facets.categories}
            types={facets.types}
            selectedSource={selectedSource}
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            search={search}
            onSourceChange={s => { setSelectedSource(s); setNewItems([]); }}
            onCategoryChange={c => { setSelectedCategory(c); setNewItems([]); }}
            onTypeChange={t => { setSelectedType(t); setNewItems([]); }}
            onSearchChange={setSearch}
          />
        </section>

        {/* New items banner */}
        {newItems.length > 0 && (
          <button
            onClick={applyNew}
            className="w-full mb-4 px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--color-line)] text-[var(--fore)] text-sm font-medium flex items-center justify-center gap-2 hover:border-[var(--mut)]/50 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--ok)] animate-pulse" />
            {newItems.length} new {newItems.length === 1 ? 'story' : 'stories'} — click to view
          </button>
        )}

        {/* Newswire — dense Upstract-style grid, no images */}
        <section id="latest" className="scroll-mt-28">
          <SectionHeader
            kicker="Newswire"
            title={search.trim() ? 'Search results' : 'Top News'}
            rule={false}
            right={
              totalLoaded ? (
                <span className="text-[12px] tabular-nums text-[var(--mut)]">
                  {search.trim() ? `${visible.length} results` : `${total.toLocaleString('en-US')} stories`}
                </span>
              ) : (
                <Skeleton className="h-4 w-20" />
              )
            }
          />

          {loading && news.length === 0 ? (
            <SkeletonGrid count={15} />
          ) : rest.length === 0 && visible.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm font-medium">No stories match this filter yet</p>
              <p className="mt-1 text-sm text-[var(--mut)]">Try a broader lens or clear your search.</p>
              <button onClick={resetFilters} className="mt-4 inline-flex h-9 items-center rounded-[var(--radius-md)] bg-[var(--fore)] px-4 text-sm font-medium text-[var(--background)]">
                Clear filters
              </button>
            </div>
          ) : (
            <NewsGrid
              items={rest}
              engMap={engMap}
              expandedKey={expandedKey}
              onToggle={key => setExpandedKey(prev => (prev === key ? null : key))}
              onEngagement={handleEngagement}
            />
          )}
        </section>

        {/* Frontier charts — below the news, news stays the focus */}
        {children && <div className="mt-12">{children}</div>}

        {/* Models widget — compact, full boards one click away */}
        <section className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-28" id="model-watch">
          <ModelsWidget />
          <div id="latest-models">
            <LatestModels />
          </div>
        </section>
        <section className="mt-4">
          <WhatsChanged />
        </section>

        {/* AI Trends teaser */}
        <section className="mt-12" id="trends">
          <SectionHeader
            kicker="Trends"
            title="AI Landscape"
            note="What the frontier is talking about right now."
            right={
              <a href="/trends" className="text-sm font-medium text-[var(--accent-hover)] hover:underline">
                Explore trends →
              </a>
            }
          />
          <AITrends compact />
        </section>
      </main>

      <Footer />
    </div>
  );
}
