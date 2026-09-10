import { NewsItem, CATEGORY_COLOR } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';

interface LatestListProps {
  items: NewsItem[];
  dense?: boolean;
}

export default function LatestList({ items, dense = false }: LatestListProps) {
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-[var(--color-line)]">
      {items.map((item, i) => {
        const color = CATEGORY_COLOR[item.category] || '#6b7280';
        return (
          <article
            key={item.url}
            className="group flex items-baseline gap-3 px-4 py-3 hover:bg-[var(--surface)] transition-colors"
            style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
          >
            <span className="dot" style={{ backgroundColor: color }} />
            <h3 className="text-[14px] leading-snug tracking-tight flex-1 min-w-0">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fore)] hover:underline decoration-[var(--mut)]/50 underline-offset-2 line-clamp-2"
              >
                {item.title}
              </a>
            </h3>
            <div className="flex-shrink-0 flex items-center gap-2 text-[11px]">
              <span className="font-medium text-[var(--dim)] uppercase tracking-wider text-[10px]">
                {item.source_label || item.source}
              </span>
              <span className="text-[var(--dim)]">{timeAgo(item.published_at)}</span>
              {(item.tweet_metrics?.likeCount || item.score) && (
                <span className="text-[var(--dim)] font-mono">
                  {item.tweet_metrics?.likeCount ? formatNumber(item.tweet_metrics.likeCount) : formatNumber(item.score!)}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
