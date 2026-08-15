'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import Ticker from '@/components/Ticker';
import FilterBar, { FacetOption } from '@/components/FilterBar';
import HeroLead from '@/components/HeroLead';
import LatestList from '@/components/LatestList';
import TrendingSidebar from '@/components/TrendingSidebar';
import DailyTrends from '@/components/DailyTrends';
import DomainBar from '@/components/DomainBar';
import ModelWatch from '@/components/ModelWatch';
import ModelNewsStrip from '@/components/ModelNewsStrip';
import AITrends from '@/components/AITrends';
import AIRadar from '@/components/AIRadar';
import MoodIndicator from '@/components/MoodIndicator';
import AgentOutput from '@/components/AgentOutput';
import SkeletonGrid from '@/components/Skeleton';
import { NewsItem, Category, Domain } from '@/lib/types';
import { frontPageOrder } from '@/lib/engagement';
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
      } catch {
        /* network error — keep existing data */
      } finally {
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
          if (!seenUrls.current.has(item.url)) {
            leadingNew.push(item);
          } else if (leadingNew.length > 0) {
            break;
          }
        }
        if (leadingNew.length > 0) {
          setNewItems(leadingNew);
        }
        setTotal(data.total ?? total);
        setLastUpdated(new Date());
        if (data.facets?.sources) {
          setFacets(f => ({
            sources: data.facets.sources,
            categories: data.facets.categories,
            types: f.types,
            domains: data.facets.domains || f.domains,
          }));
        }
      }
    } catch {
      /* ignore */
    } finally {
      pollBusy.current = false;
    }
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
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load('reset');
  }, [load]);

  // Remember the user's preferred view between sessions.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('ai-pulse-domain');
      if (saved === 'business' || saved === 'tech' || saved === 'research') {
        setSelectedDomain(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem('ai-pulse-domain', selectedDomain);
    } catch {
      /* ignore */
    }
  }, [selectedDomain]);

  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    const statusId = setInterval(pollStatus, POLL_MS);
    const initialStatus = setTimeout(pollStatus, 0);
    return () => {
      clearInterval(id);
      clearInterval(statusId);
      clearTimeout(initialStatus);
    };
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
    try {
      await fetch('/api/refresh', { method: 'POST' });
      await load('reset');
      await pollStatus();
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  };

  const resetFilters = (source: string, category: Category | 'all', type: string) => {
    setSelectedSource(source);
    setSelectedCategory(category);
    setSelectedType(type);
    setNewItems([]);
    setLatestPage(0);
  };

  // Client-side search filter
  const visible = useMemo(() => {
    let list = news;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          (i.summary || '').toLowerCase().includes(q) ||
          (i.source_label || '').toLowerCase().includes(q) ||
          (i.source_detail || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [news, search]);

  // MAIN FEED: engagement-first (most interactions / upvotes / views).
  // Filtered & searched views fall back to recency so browsing stays natural.
  const mainFeed = useMemo(() => {
    const q = search.trim();
    if (q) return visible;
    return frontPageOrder(visible);
  }, [visible, search]);

  const top10 = mainFeed.slice(0, 10);
  const rest = mainFeed.slice(10);

  // Paginate the latest feed — 10 stories per page so readers don't scroll forever.
  const LATEST_PAGE_SIZE = 10;
  const latestPageCount = Math.max(1, Math.ceil(rest.length / LATEST_PAGE_SIZE));
  const safeLatestPage = Math.min(latestPage, latestPageCount - 1);
  const latestPageItems = rest.slice(safeLatestPage * LATEST_PAGE_SIZE, safeLatestPage * LATEST_PAGE_SIZE + LATEST_PAGE_SIZE);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of facets.categories) counts[f.value] = f.count;
    return counts;
  }, [facets.categories]);

  const domainCounts = useMemo(() => {
    const counts: Partial<Record<Domain | 'all', number>> = { all: total };
    for (const f of facets.domains) {
      counts[f.value as Domain] = f.count;
    }
    return counts;
  }, [facets.domains, total]);

  return (
    <div className="min-h-screen" id="top">
      <div className="bg-atmosphere" />
      <div className="bg-grid" />

      <Header
        total={total}
        onlineSources={onlineSources}
        lastUpdated={lastUpdated}
        nextRefreshAt={nextRefreshAt}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <Ticker items={news.slice(0, 24)} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {newItems.length > 0 && (
          <button
            onClick={applyNew}
            className="ring-focus w-full mb-4 px-4 py-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/40 text-[var(--accent)] text-sm font-medium flex items-center justify-center gap-2 animate-slide-in hover:bg-[var(--accent)]/20 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
            </span>
            {newItems.length} new {newItems.length === 1 ? 'story' : 'stories'} — click to view
          </button>
        )}

        <div className="mb-5">
          <FilterBar
            sources={facets.sources}
            categories={facets.categories}
            types={facets.types}
            selectedSource={selectedSource}
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            search={search}
            onSourceChange={s => resetFilters(s, selectedCategory, selectedType)}
            onCategoryChange={c => resetFilters(selectedSource, c, selectedType)}
            onTypeChange={t => resetFilters(selectedSource, selectedCategory, t)}
            onSearchChange={setSearch}
          />
        </div>

        {!search.trim() && selectedSource === 'all' && (
          <div className="flex items-center gap-x-5 gap-y-2 overflow-x-auto no-scrollbar mb-5 text-[11px] text-[var(--dim)]">
            <span className="text-[10px] uppercase tracking-widest flex-shrink-0 kicker">In this feed</span>
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <span key={cat} className="flex items-center gap-2 flex-shrink-0">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--mut)]/50" />
                  <span className="capitalize text-[var(--mut)]">{cat}</span>
                  <span className="font-mono text-[10px]">{pct}%</span>
                </span>
              );
            })}
          </div>
        )}

        {/* ---- Main column (engagement-first) + right rail (trending/calendar) ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <div className="min-w-0">
            {top10.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-px w-6 bg-[var(--accent)]/60" />
                  <h2 className="font-display font-semibold text-sm uppercase tracking-[0.2em] text-[var(--fore)]">
                    Top stories
                  </h2>
                  <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-[var(--dim)]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ok)]/70" /> most engaged
                  </span>
                </div>
                <HeroLead items={top10} />
              </div>
            )}

            <ModelNewsStrip />

            <div className="flex items-center gap-2 mb-3">
              <span className="h-px w-6 bg-[var(--accent)]/60" />
              <h2 className="font-display font-semibold text-sm uppercase tracking-[0.2em] text-[var(--fore)]">
                {search.trim() ? 'Search results' : selectedSource === 'all' ? 'Latest' : `From ${facets.sources.find(s => s.value === selectedSource)?.label || selectedSource}`}
              </h2>
              <span className="ml-auto font-mono text-[11px] text-[var(--dim)]">
                {search.trim() ? `${visible.length} results` : `${total} stories`}
              </span>
            </div>

            {loading && news.length === 0 ? (
              <SkeletonGrid count={9} />
            ) : rest.length === 0 && visible.length === 0 ? (
              <div className="glass rounded-2xl py-20 text-center">
                <div className="text-4xl mb-3 opacity-60">◌</div>
                <p className="text-[var(--mut)]">No stories match the current filters.</p>
                <button
                  onClick={() => resetFilters('all', 'all', 'all')}
                  className="ring-focus mt-4 text-sm text-[var(--accent)] hover:opacity-80"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {rest.length > 0 && (
                  <div className="surface rounded-2xl px-4 py-2">
                    <LatestList items={latestPageItems} />
                  </div>
                )}
                {latestPageCount > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setLatestPage(p => Math.max(0, p - 1))}
                      disabled={safeLatestPage === 0}
                      className="ring-focus px-3 py-1.5 rounded-lg text-xs border border-[var(--color-line)] text-[var(--mut)] disabled:opacity-30 hover:text-[var(--cyan)]"
                    >
                      ‹ Prev
                    </button>
                    {pageNumbers(latestPageCount, safeLatestPage).map((n, i) =>
                      n === '…' ? (
                        <span key={`e-${i}`} className="px-1 text-[11px] text-[var(--dim)]">…</span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => setLatestPage(Number(n))}
                          className={`ring-focus w-8 h-8 rounded-lg text-xs font-mono tabular-nums border transition-colors ${
                            safeLatestPage === n
                              ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40'
                              : 'border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)] hover:border-[var(--mut)]'
                          }`}
                        >
                          {Number(n) + 1}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setLatestPage(p => Math.min(latestPageCount - 1, p + 1))}
                      disabled={safeLatestPage >= latestPageCount - 1}
                      className="ring-focus px-3 py-1.5 rounded-lg text-xs border border-[var(--color-line)] text-[var(--mut)] disabled:opacity-30 hover:text-[var(--cyan)]"
                    >
                      Next ›
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right rail: mood + trending + calendar + panels */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar pr-1">
            <MoodIndicator />
            <TrendingSidebar items={news} />
            <DailyTrends items={news} />
            <DomainBar
              selected={selectedDomain}
              counts={domainCounts}
              onChange={d => {
                setSelectedDomain(d);
                setNewItems([]);
              }}
            />
            <AgentOutput />
          </aside>
        </div>

        <div className="mt-8" id="model-watch">
          <ModelWatch audience={selectedDomain} />
        </div>

        <div className="mt-8" id="trends">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-6 bg-[var(--accent)]/60" />
            <h2 className="font-display font-semibold text-sm uppercase tracking-[0.2em] text-[var(--fore)]">
              AI Trends
            </h2>
            <span className="ml-auto font-mono text-[10px] text-[var(--dim)]">frontier intelligence by lab</span>
          </div>
          <AITrends />
        </div>

        <div className="mt-8">
          <AIRadar />
        </div>
      </main>

      <footer className="border-t border-[var(--color-line)] mt-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--dim)]">
          <span className="font-display text-[var(--mut)]">AI Pulse — the daily signal on artificial intelligence</span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ok)]/70" />
            {onlineSources} of {facets.sources.length || 40}+ channels online
          </span>
          <span className="hidden md:block">
            {lastUpdated ? `synced ${lastUpdated.toLocaleString()}` : 'syncing…'}
          </span>
          <span className="font-mono text-[10px] text-[var(--dim)]" title="Deployment build tag">
            build {BUILD_TAG}
          </span>
        </div>
      </footer>
    </div>
  );
}

function pageNumbers(count: number, current: number): Array<number | '…'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const out: Array<number | '…'> = [0];
  const start = Math.max(1, current - 1);
  const end = Math.min(count - 2, current + 1);
  if (start > 1) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 2) out.push('…');
  out.push(count - 1);
  return out;
}