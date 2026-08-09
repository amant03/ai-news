'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import NewsCard from '@/components/NewsCard';
import FilterBar from '@/components/FilterBar';
import { NewsItem, Category, SourceFilter } from '@/lib/types';

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchNews = useCallback(async (reset = false) => {
    const newOffset = reset ? 0 : offset;
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        limit: '30',
        offset: newOffset.toString(),
      });
      
      if (selectedSource !== 'all') {
        params.set('source', selectedSource);
      }
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }

      const response = await fetch(`/api/news?${params}`);
      const data = await response.json();
      
      if (reset) {
        setNews(data.items);
        setOffset(30);
      } else {
        setNews(prev => [...prev, ...data.items]);
        setOffset(prev => prev + 30);
      }
      
      setHasMore(data.hasMore);
      setTotal(data.total);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  }, [offset, selectedSource, selectedCategory]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/refresh', { method: 'POST' });
      await fetchNews(true);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSourceChange = (source: SourceFilter) => {
    setSelectedSource(source);
    setOffset(0);
    setNews([]);
  };

  const handleCategoryChange = (category: Category | 'all') => {
    setSelectedCategory(category);
    setOffset(0);
    setNews([]);
  };

  // Fetch news when filters change
  useEffect(() => {
    fetchNews(true);
  }, [selectedSource, selectedCategory]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header 
        onRefresh={handleRefresh} 
        isLoading={isRefreshing}
        lastUpdated={lastUpdated}
      />
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="mb-6 flex items-center gap-4 text-sm text-gray-500">
          <span>{total} articles</span>
          <span className="text-gray-700">|</span>
          <span>Updates every 12h</span>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
          <FilterBar
            selectedSource={selectedSource}
            selectedCategory={selectedCategory}
            onSourceChange={handleSourceChange}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* News list */}
        <div className="bg-gray-900/30 rounded-xl border border-gray-800 overflow-hidden">
          {news.length === 0 && !isLoading ? (
            <div className="py-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <p className="text-lg font-medium">No news found</p>
              <p className="text-sm mt-1">Try adjusting your filters or refresh</p>
            </div>
          ) : (
            <>
              {news.map((item, index) => (
                <NewsCard key={`${item.url}-${index}`} item={item} />
              ))}
              
              {/* Load more */}
              {hasMore && (
                <div className="p-4 border-t border-gray-800">
                  <button
                    onClick={() => fetchNews(false)}
                    disabled={isLoading}
                    className="w-full py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Loading state */}
        {isLoading && news.length === 0 && (
          <div className="flex justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading news...</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          AI Pulse - Aggregated from OpenAI, Anthropic, Google DeepMind, Meta, Mistral, and Twitter
        </div>
      </footer>
    </div>
  );
}
