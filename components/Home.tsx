'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import Ticker from '@/components/Ticker';
import FilterBar, { FacetOption } from '@/components/FilterBar';
import HeroLead from '@/components/HeroLead';
import LatestList from '@/components/LatestList';
import DomainBar from '@/components/DomainBar';
import ModelWatch from '@/components/ModelWatch';
import AITrends from '@/components/AITrends';
import SkeletonGrid from '@/components/Skeleton';
import { NewsItem, Category, Domain } from '@/lib/types';
import { frontPageOrder, diversifiedTopStories } from '@/lib/engagement';
import { BUILD_TAG } from '@/lib/build';

const POLL_MS = 60_000;
const PAGE_SIZE = 300;

interface FacetsData {
  sources: FacetOption[];
  categories: FacetOption[];
  types: FacetOption[];
  domains: FacetOption[];
}

const EMPTY_FACETS: FacetsData = { sources: [], categories: [], types: [], domains: [] };

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [facets, setFacets] = useState<FacetsData>(EMPTY_FACETS);
  const [total, setTotal] = useState(0);
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
  const [latestPage, setLatestPage] = useState(0);

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
        } else {
          setLoading(true);
          const res = await fetch(`/api/news?${buildParams()}`);
          const data = await res.json();
          setNews(data.items);
          seenUrls.current = new Set((data.items as NewsItem[]).map(i => i.url));
          offsetRef.current = data.items.length;
          setHasMore(data.hasMore);
          setTotal(data.total);
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
        setTotal(data.total ?? total);
        setLastUpdated(new Date());
      }
    } catch { /* ignore */ } finally { pollBusy.current = false; }
  }, [total]);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data?.sources) {
        const entries = Object.values(data.sources) as Array<{ ok?: boolean }>;
        setOnlineSources(entries.filter(s => s.ok).length);
      }
      if (data?.nextRun) setNextRefreshAt(new Date(data.nextRun));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load('reset'); }, [load]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('ai-pulse-domain');
      if (saved === 'business' || saved === 'tech' || saved === 'research') setSelectedDomain(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem('ai-pulse-domain', selectedDomain); } catch { /* ignore */ }
  }, [selectedDomain]);
  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    const statusId = setInterval(pollStatus, POLL_MS);
    const initialStatus = setTimeout(pollStatus, 0);
    return () => { clearInterval(id); clearInterval(statusId); clearTimeout(initialStatus); };
  }, [poll, pollStatus]);

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

  const resetFilters = (source: string, category: Category | 'all', type: string) => {
    setSelectedSource(source); setSelectedCategory(category); setSelectedType(type);
    setNewItems([]); setLatestPage(0);
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

  const top10 = useMemo(() => {
    const q = search.trim();
    if (q) return mainFeed.slice(0, 10);
    return diversifiedTopStories(visible, 10);
  }, [visible, search, mainFeed]);

  const rest = useMemo(() => {
    const q = search.trim();
    if (q) return mainFeed.slice(10);
    const topUrls = new Set(top10.map(i => i.url));
    return mainFeed.filter(i => !topUrls.has(i.url));
  }, [mainFeed, search, top10]);

  const LATEST_PAGE_SIZE = 15;
  const latestPageCount = Math.max(1, Math.ceil(rest.length / LATEST_PAGE_SIZE));
  const safeLatestPage = Math.min(latestPage, latestPageCount - 1);
  const latestPageItems = rest.slice(safeLatestPage * LATEST_PAGE_SIZE, safeLatestPage * LATEST_PAGE_SIZE + LATEST_PAGE_SIZE);

  const domainCounts = useMemo(() => {
    const counts: Partial<Record<Domain | 'all', number>> = { all: total };
    for (const f of facets.domains) counts[f.value as Domain] = f.count;
    return counts;
  }, [facets.domains, total]);

  return (
    <div className="min-h-screen" id="top">
      <Header
        total={total}
        onlineSources={onlineSources}
        lastUpdated={lastUpdated}
        nextRefreshAt={nextRefreshAt}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <Ticker items={news.slice(0, 24)} />

      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        {/* Top Stories - full width */}
        <section className="mb-10">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h1 className="text-2xl font-semibold tracking-tight">Top Stories</h1>
          </div>
          {top10.length > 0 && <HeroLead items={top10} />}
        </section>

        {/* Who's Reading */}
        <section className="mb-8">
          <DomainBar
            selected={selectedDomain}
            counts={domainCounts}
            onChange={d => { setSelectedDomain(d); setNewItems([]); }}
          />
        </section>

        {/* Filters */}
        <section className="mb-6">
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
            className="w-full mb-4 px-4 py-2.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-violet-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            {newItems.length} new {newItems.length === 1 ? 'story' : 'stories'} — click to view
          </button>
        )}

        {/* Latest stories */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">
              {search.trim() ? 'Search results' : 'Latest'}
            </h2>
            <span className="ml-auto text-xs text-neutral-400 tabular-nums">
              {search.trim() ? `${visible.length} results` : `${total} stories`}
            </span>
          </div>

          {loading && news.length === 0 ? (
            <SkeletonGrid count={15} />
          ) : rest.length === 0 && visible.length === 0 ? (
            <div className="py-20 text-center text-neutral-400">
              <p>No stories match the current filters.</p>
              <button onClick={() => resetFilters('all', 'all', 'all')} className="mt-3 text-sm text-violet-600 hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="border border-[var(--color-line)] rounded-lg">
                <LatestList items={latestPageItems} />
              </div>
              {latestPageCount > 1 && (
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setLatestPage(p => Math.max(0, p - 1))}
                    disabled={safeLatestPage === 0}
                    className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-line)] text-neutral-500 disabled:opacity-30 hover:text-black"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(latestPageCount, 7) }, (_, i) => i).map(n => (
                    <button
                      key={n}
                      onClick={() => setLatestPage(n)}
                      className={`w-8 h-8 rounded-lg text-xs tabular-nums border transition-colors ${
                        safeLatestPage === n
                          ? 'bg-black text-white border-black'
                          : 'border-[var(--color-line)] text-neutral-500 hover:text-black hover:border-neutral-300'
                      }`}
                    >
                      {n + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setLatestPage(p => Math.min(latestPageCount - 1, p + 1))}
                    disabled={safeLatestPage >= latestPageCount - 1}
                    className="px-3 py-1.5 rounded-lg text-xs border border-[var(--color-line)] text-neutral-500 disabled:opacity-30 hover:text-black"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Models section */}
        <section className="mt-12" id="model-watch">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">Models</h2>
          </div>
          <ModelWatch audience={selectedDomain} />
        </section>

        {/* AI Trends section */}
        <section className="mt-12" id="trends">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
            <h2 className="text-lg font-semibold tracking-tight">AI Landscape</h2>
          </div>
          <AITrends />
        </section>
      </main>

      <footer className="border-t border-[var(--color-line)]">
        <div className="max-w-[1400px] mx-auto px-5 py-6 flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium text-neutral-600">AI Pulse</span>
          <span>build {BUILD_TAG}</span>
        </div>
      </footer>
    </div>
  );
}
