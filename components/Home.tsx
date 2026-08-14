'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import Ticker from '@/components/Ticker';
import FilterBar, { FacetOption } from '@/components/FilterBar';
import NewsCard from '@/components/NewsCard';
import SourcePanel from '@/components/SourcePanel';
import Trending from '@/components/Trending';
import ModelWatch from '@/components/ModelWatch';
import AIRadar from '@/components/AIRadar';
import DomainBar from '@/components/DomainBar';
import SkeletonGrid from '@/components/Skeleton';
import AgentOutput from '@/components/AgentOutput';
import { NewsItem, Category, CATEGORY_COLOR, Domain } from '@/lib/types';

const POLL_MS = 60_000;

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
  const [storyPage, setStoryPage] = useState(0);

  const seenUrls = useRef<Set<string>>(new Set());
  const offsetRef = useRef(0);
  const pollBusy = useRef(false);

  const buildParams = useCallback(
    (extra?: Record<string, string>) => {
      const p = new URLSearchParams({ limit: '30', offset: '0', ...extra });
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
    setStoryPage(0);
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

  const top3 = visible.slice(0, 3);
  const rest = search.trim() ? visible : visible.slice(3);
  const STORY_PAGE = 9;
  const storyPages = Math.max(1, Math.ceil(rest.length / STORY_PAGE));
  const safeStoryPage = Math.min(storyPage, storyPages - 1);
  const pagedRest = rest.slice(safeStoryPage * STORY_PAGE, (safeStoryPage + 1) * STORY_PAGE);

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
    <div className="min-h-screen">
      <div className="bg-atmosphere" />
      <div className="bg-grid" />
      <div className="noise" />

      <Header
        total={total}
        onlineSources={onlineSources}
        lastUpdated={lastUpdated}
        nextRefreshAt={nextRefreshAt}
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <Ticker items={news.slice(0, 24)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Role first — drives stories + charts */}
        {!search.trim() && (
          <div className="mb-5">
            <DomainBar
              selected={selectedDomain}
              counts={domainCounts}
              onChange={d => {
                setSelectedDomain(d);
                setNewItems([]);
                setStoryPage(0);
              }}
            />
          </div>
        )}

        {newItems.length > 0 && (
          <button
            onClick={applyNew}
            className="ring-focus w-full mb-5 px-4 py-3 rounded-2xl bg-cyan-400/10 border border-cyan-400/40 text-cyan-200 text-sm font-medium flex items-center justify-center gap-2 animate-slide-in hover:bg-cyan-400/20 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            {newItems.length} new {newItems.length === 1 ? 'story' : 'stories'} — click to view
          </button>
        )}

        {!search.trim() && (
          <div className="surface rounded-2xl px-4 py-3 mb-6 flex items-center gap-x-5 gap-y-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] uppercase tracking-widest text-[var(--dim)] flex-shrink-0">In this feed</span>
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <span key={cat} className="flex items-center gap-2 text-[11px] text-[var(--mut)] flex-shrink-0">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[cat as Category] || '#94a3b8' }} />
                  <span className="capitalize">{cat}</span>
                  <span className="font-mono text-[10px] text-[var(--dim)]">{pct}%</span>
                </span>
              );
            })}
          </div>
        )}

        <div className="min-w-0">
            {top3.length > 0 && !search.trim() && (
              <section className="mb-8" id="top-stories">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-px w-6 bg-cyan-400/50" />
                  <h2 className="font-display font-medium text-xs uppercase tracking-[0.25em] text-[var(--mut)]">
                    Top stories
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {top3.map((item, i) => (
                    <NewsCard key={item.url} item={item} index={i} />
                  ))}
                </div>
              </section>
            )}

            {!search.trim() && (
              <div className="mb-8" id="model-watch">
                <ModelWatch audience={selectedDomain} />
              </div>
            )}

            <div className="mb-6">
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
                onSearchChange={q => {
                  setSearch(q);
                  setStoryPage(0);
                }}
              />
            </div>

            <div className="flex items-center justify-between mb-4" id="latest">
              <div className="flex items-center gap-2">
                <span className="h-px w-6 bg-violet-400/50" />
                <h2 className="font-display font-medium text-xs uppercase tracking-[0.25em] text-[var(--mut)]">
                  More stories
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[var(--dim)]">
                {search.trim() ? visible.length : total} results
              </span>
            </div>

            {loading && news.length === 0 ? (
              <SkeletonGrid count={9} />
            ) : visible.length === 0 ? (
              <div className="glass rounded-2xl py-20 text-center">
                <div className="text-4xl mb-3 opacity-60">◌</div>
                <p className="text-[var(--mut)]">No stories match the current filters.</p>
                <button
                  onClick={() => resetFilters('all', 'all', 'all')}
                  className="ring-focus mt-4 text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {pagedRest.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {pagedRest.map((item, i) => (
                      <NewsCard key={item.url} item={item} index={i} />
                    ))}
                  </div>
                )}
                {top3.length > 0 && !search.trim() && rest.length === 0 && (
                  <p className="text-xs text-[var(--dim)]">No more stories — the feed will grow on the next agent run.</p>
                )}

                {storyPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setStoryPage(p => Math.max(0, p - 1))}
                      disabled={safeStoryPage === 0}
                      className="px-4 py-2 rounded-xl text-sm text-[var(--mut)] border border-[var(--color-line)] disabled:opacity-30 hover:text-cyan-200 hover:border-cyan-400/40"
                    >
                      Prev
                    </button>
                    <span className="font-mono text-xs text-[var(--dim)]">
                      {safeStoryPage + 1} / {storyPages}
                    </span>
                    <button
                      onClick={async () => {
                        const next = safeStoryPage + 1;
                        if ((next + 1) * STORY_PAGE > rest.length && hasMore) {
                          await load('more');
                        }
                        setStoryPage(next);
                      }}
                      disabled={safeStoryPage >= storyPages - 1 && !hasMore}
                      className="px-4 py-2 rounded-xl text-sm text-[var(--mut)] border border-[var(--color-line)] disabled:opacity-30 hover:text-cyan-200 hover:border-cyan-400/40"
                    >
                      {loading ? 'Loading…' : 'Next'}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-10">
              <Trending items={news} onTagClick={setSearch} />
              <SourcePanel />
              <AgentOutput />
            </div>
            <div className="mt-6">
              <AIRadar />
            </div>
          </div>
      </main>

      <footer className="border-t border-[var(--color-line)] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--dim)]">
          <span className="font-mono">AI Pulse — news anyone can follow</span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
            {onlineSources} of {facets.sources.length || 40}+ channels online
          </span>
          <span className="hidden md:block">
            {lastUpdated ? `synced ${lastUpdated.toLocaleString()}` : 'syncing…'}
          </span>
        </div>
      </footer>
    </div>
  );
}
