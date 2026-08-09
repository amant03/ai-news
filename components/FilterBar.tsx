'use client';

import { CATEGORIES, SOURCES, Category, SourceFilter } from '@/lib/types';

interface FilterBarProps {
  selectedSource: SourceFilter;
  selectedCategory: Category | 'all';
  onSourceChange: (source: SourceFilter) => void;
  onCategoryChange: (category: Category | 'all') => void;
}

export default function FilterBar({
  selectedSource,
  selectedCategory,
  onSourceChange,
  onCategoryChange,
}: FilterBarProps) {
  return (
    <div className="space-y-3">
      {/* Source filters */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
          Sources
        </label>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((source) => (
            <button
              key={source.value}
              onClick={() => onSourceChange(source.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                selectedSource === source.value
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              <span 
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: source.color }}
              />
              {source.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
          Categories
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange('all')}
            className={`text-xs px-3 py-1.5 rounded-full transition-all ${
              selectedCategory === 'all'
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                selectedCategory === cat.value
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              style={{
                backgroundColor: selectedCategory === cat.value 
                  ? `${cat.color}40` 
                  : 'rgba(31, 41, 55, 0.5)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
