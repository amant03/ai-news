import { DOMAIN_OPTIONS } from './DomainBar';
import type { Domain } from '@/lib/types';
import { CATEGORY_COLOR, CATEGORY_LABEL, Category } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  type?: string;
}

interface HeroProps {
  persona: Domain | 'all';
  onPersonaChange: (d: Domain | 'all') => void;
  sources: FacetOption[];
  categories: FacetOption[];
  selectedSource: string;
  selectedCategory: Category | 'all';
  search: string;
  onSourceChange: (source: string) => void;
  onCategoryChange: (category: Category | 'all') => void;
  onSearchChange: (query: string) => void;
}

/** Basic topic lenses only — enough to tell stories apart, nothing more. */
const BASIC_CATS: (Category | 'all')[] = ['all', 'model', 'research', 'product'];

export default function Hero({
  persona,
  onPersonaChange,
  sources,
  categories,
  selectedSource,
  selectedCategory,
  search,
  onSourceChange,
  onCategoryChange,
  onSearchChange,
}: HeroProps) {
  const hasActiveFilters = selectedSource !== 'all' || selectedCategory !== 'all' || !!search || persona !== 'all';

  return (
    <section aria-label="Filters" className="hero-enter pt-2 pb-6">
      {/* Search on top */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--dim)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search stories…"
          aria-label="Search stories"
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[var(--color-line)] text-sm text-[var(--fore)] placeholder:text-[var(--dim)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
          style={{ background: 'var(--input)' }}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="ring-focus absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-[var(--dim)] hover:text-[var(--fore)] transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* One combined row: persona lens + basic topics + source */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-[var(--mut)]">Show me:</span>
        <Tabs value={persona} onValueChange={v => onPersonaChange(v as Domain | 'all')}>
          <TabsList aria-label="Persona lens">
            {DOMAIN_OPTIONS.map(o => (
              <TabsTrigger key={o.value} value={o.value}>
                {o.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <span className="hidden sm:block w-px h-5 bg-[var(--color-line)]" aria-hidden />

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="Topic">
          {BASIC_CATS.map(cat => {
            const count = categories.find(c => c.value === cat)?.count ?? 0;
            const color = cat === 'all' ? '#9aa0a9' : CATEGORY_COLOR[cat as Category];
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat as Category | 'all')}
                className={`ring-focus inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border flex-shrink-0 transition-all ${
                  active
                    ? 'bg-[var(--fore)] text-[var(--background)] font-semibold border-transparent'
                    : 'text-[var(--mut)] border-[var(--color-line)] hover:text-[var(--fore)] hover:border-[var(--mut)]'
                }`}
              >
                <span className="dot !w-1.5 !h-1.5" style={{ backgroundColor: active ? 'currentColor' : color }} />
                {CATEGORY_LABEL[cat as Category] || 'All'}
                {count > 0 && <span className="text-[10px] tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="relative flex-shrink-0 ml-auto">
          <select
            value={selectedSource}
            onChange={e => onSourceChange(e.target.value)}
            aria-label="Filter by source"
            className="appearance-none pl-3 pr-8 py-1.5 rounded-full border border-[var(--color-line)] text-xs text-[var(--mut)] cursor-pointer focus:outline-none focus:border-[var(--accent)]/50 transition-all"
            style={{ background: 'var(--input)' }}
          >
            <option value="all">All sources</option>
            {sources.map(s => (
              <option key={s.value} value={s.value}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--dim)] pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => {
              onSourceChange('all');
              onCategoryChange('all');
              onSearchChange('');
              onPersonaChange('all');
            }}
            className="ring-focus px-3 py-1.5 rounded-full text-xs text-[var(--mut)] border border-[var(--color-line)] hover:text-[var(--bad)] hover:border-[var(--bad)]/40 transition-colors flex-shrink-0"
          >
            Reset
          </button>
        )}
      </div>
    </section>
  );
}
