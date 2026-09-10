import { NewsItem, CATEGORY_COLOR } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';

interface LatestListProps {
  items: NewsItem[];
  dense?: boolean;
}

export default function LatestList({ items, dense = false }: LatestListProps) {
  if (items.length === 0) return null;
  const now = Date.now();

  return (
    <div className="divide-y divide-[var(--color-line)]">
      {items.map((item, i) => {
        const color = CATEGORY_COLOR[item.category] || '#6b7280';
        const fresh =
          item.published_at != null &&
          !Number.isNaN(new Date(item.published_at).getTime()) &&
          now - new Date(item.published_at).getTime() < 24 * 3600 * 1000;
        return (
          <article
            key={item.url}
            className="group flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface)] transition-colors"
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
            {fresh && <span className="tag-new hidden sm:inline-flex shrink-0">New</span>}
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
            <span className="feed-arrow hidden sm:flex" aria-hidden>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
              </svg>
            </span>
          </article>
        );
      })}
    </div>
  );
}
