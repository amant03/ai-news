import { useMemo } from 'react';
import { NewsItem } from '@/lib/types';

interface TrendingProps {
  items: NewsItem[];
  onTagClick?: (word: string) => void;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'from', 'that', 'this', 'new', 'ai', 'are',
  'has', 'have', 'will', 'its', 'into', 'about', 'after', 'over', 'their', 'they', 'what',
  'how', 'you', 'your', 'get', 'can', 'but', 'not', 'one', 'two', 'all', 'out', 'via', 'llm',
  'using', 'why', 'after', 'more', 'than', 'been', 'was', 'were', 'them', 'him', 'her',
  'august', 'could', 'would', 'should', 'first', 'last', 'most', 'which', 'when', 'where',
  'openai', 'anthropic', 'google', 'microsoft', 'model', 'models', 'gemini', 'claude',
]);

export default function Trending({ items, onTagClick }: TrendingProps) {
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items.slice(0, 300)) {
      const title = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
      const words = title.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
      for (const word of words) {
        counts.set(word, (counts.get(word) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [items]);

  if (tags.length === 0) return null;
  const max = tags[0][1];

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-display font-medium text-sm uppercase tracking-widest text-[var(--fore)] mb-4">
        Trending
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(([word, count]) => {
          const intensity = 0.5 + (count / max) * 0.5;
          return (
            <button
              key={word}
              onClick={() => onTagClick?.(word)}
              className="ring-focus text-xs px-2.5 py-1 rounded-full border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--cyan)] hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all"
              style={{ opacity: intensity }}
            >
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
}