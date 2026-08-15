import { NewsItem, CATEGORY_COLOR } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';

interface LatestListProps {
  items: NewsItem[];
  dense?: boolean;
}

export default function LatestList({ items, dense = false }: LatestListProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <article
          key={item.url}
          className="group flex flex-col rounded-lg border border-[var(--color-line)] p-4 hover:border-neutral-300 transition-colors animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLOR[item.category] || '#6b7280' }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: CATEGORY_COLOR[item.category] || '#6b7280' }}
            >
              {item.source_label || item.source}
            </span>
            <span className="text-[10px] text-neutral-400 ml-auto">{timeAgo(item.published_at)}</span>
          </div>

          <h3 className="text-[14px] font-medium leading-snug tracking-tight mb-3">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-black hover:text-violet-600 transition-colors line-clamp-3"
            >
              {item.title}
            </a>
          </h3>

          <div className="mt-auto flex items-center gap-2 text-[10px] text-neutral-400">
            <span className="font-medium text-neutral-500">{item.source_label || item.source}</span>
            {item.tweet_metrics?.likeCount ? <span>{formatNumber(item.tweet_metrics.likeCount)}</span> : null}
            {item.score ? <span>{formatNumber(item.score)}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
