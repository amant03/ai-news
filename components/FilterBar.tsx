'use client';

import { CATEGORY_COLOR, CATEGORY_LABEL, Category } from '@/lib/types';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  type?: string;
}

interface FilterBarProps {
  sources: FacetOption[];
  categories: FacetOption[];
  types: FacetOption[];
  selectedSource: string;
  selectedCategory: Category | 'all';
  selectedType: string;
  search: string;
  onSourceChange: (source: string) => void;
  onCategoryChange: (category: Category | 'all') => void;
  onTypeChange: (type: string) => void;
  onSearchChange: (query: string) => void;
}

const CAT_ORDER: (Category | 'all')[] = ['all', 'model', 'research', 'product', 'safety', 'policy', 'other'];

export default function FilterBar({
  sources,
  categories,
  types,
  selectedSource,
  selectedCategory,
  selectedType,
  search,
  onSourceChange,
  onCategoryChange,
  onTypeChange,
  onSearchChange,
}: FilterBarProps) {
  const topSources = sources.slice(0, 14);
  const hasActiveFilters = selectedSource !== 'all' || selectedCategory !== 'all' || selectedType !== 'all' || !!search;

  return (
    <div className="surface rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Search + clear */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dim)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
          </svg>
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search headlines, sources, keywords…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#0a0f1c] border border-[var(--color-line)] text-sm text-[var(--fore)] placeholder:text-[var(--dim)] focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="ring-focus absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-[var(--dim)] hover:text-[var(--fore)] hover:bg-[var(--color-line)] transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => {
              onSourceChange('all');
              onCategoryChange('all');
              onTypeChange('all');
              onSearchChange('');
            }}
            className="ring-focus px-3 py-2 rounded-xl text-xs text-[var(--mut)] border border-[var(--color-line)] hover:text-rose-300 hover:border-rose-400/40 transition-colors whitespace-nowrap"
          >
            Reset
          </button>
        )}
      </div>

      {/* Categories */}
      <div>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] uppercase tracking-widest text-[var(--dim)] mr-1 flex-shrink-0 w-16">Category</span>
          {CAT_ORDER.map(cat => {
            const count = categories.find(c => c.value === cat)?.count ?? 0;
            const color = cat === 'all' ? '#94a3b8' : CATEGORY_COLOR[cat as Category];
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat as Category | 'all')}
                className={`ring-focus text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-all ${
                  active
                    ? 'text-[#05070e] font-semibold border-transparent'
                    : 'text-[var(--mut)] border-[var(--color-line)] hover:text-[var(--fore)] hover:border-[var(--mut)]'
                }`}
                style={active ? { backgroundColor: color } : undefined}
              >
                {CATEGORY_LABEL[cat as Category] || 'All'}
                {count > 0 && <span className={`ml-1.5 text-[10px] ${active ? 'opacity-70' : 'opacity-50'}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Types */}
      {types.length > 0 && (
        <div>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] uppercase tracking-widest text-[var(--dim)] mr-1 flex-shrink-0 w-16">Channel</span>
            {types.map(t => {
              const active = selectedType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => onTypeChange(active ? 'all' : t.value)}
                  className={`ring-focus text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-all ${
                    active
                      ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-200'
                      : 'text-[var(--mut)] border-[var(--color-line)] hover:text-[var(--fore)]'
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-[10px] opacity-50">{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sources */}
      {topSources.length > 0 && (
        <div>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] uppercase tracking-widest text-[var(--dim)] mr-1 flex-shrink-0 w-16">Source</span>
            <button
              onClick={() => onSourceChange('all')}
              className={`ring-focus text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-all ${
                selectedSource === 'all'
                  ? 'bg-[var(--fore)] text-[#05070e] font-semibold border-transparent'
                  : 'text-[var(--mut)] border-[var(--color-line)] hover:text-[var(--fore)]'
              }`}
            >
              All
            </button>
            {topSources.map(s => {
              const active = selectedSource === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => onSourceChange(active ? 'all' : s.value)}
                  className={`ring-focus text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-200'
                      : 'text-[var(--mut)] border-[var(--color-line)] hover:text-[var(--fore)]'
                  }`}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[s.type as Category] || '#64748b' }} />
                  {s.label}
                  <span className="text-[10px] opacity-50">{s.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}