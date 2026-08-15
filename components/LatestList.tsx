import { NewsItem, CATEGORY_COLOR } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';
import CoverImage from './CoverImage';

interface LatestListProps {
  items: NewsItem[];
  dense?: boolean;
}

/**
 * The main "Latest" feed — dense, skimmable rows like a traditional news
 * front page. Thumbnail left, source + time + title right. One line each,
 * so a reader can scan ~10 stories at a glance.
 */
export default function LatestList({ items, dense = false }: LatestListProps) {
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-[var(--color-line)]">
      {items.map((item, i) => (
        <article key={item.url} className="group flex gap-3 sm:gap-4 py-3 first:pt-0 last:pb-0 animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.title}
            className="relative block w-24 sm:w-32 h-16 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 ring-focus"
          >
            <CoverImage item={item} variant="thumb" className="absolute inset-0" />
          </a>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--dim)] mb-0.5">
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLOR[item.category] || '#94a3b8' }}
                />
                <span className="truncate text-[var(--mut)]">{item.source_label || item.source}</span>
              </span>
              <span aria-hidden>·</span>
              <span className="flex-shrink-0">{timeAgo(item.published_at)}</span>
              <StoryMetrics item={item} />
            </div>

            <h3 className={dense ? 'text-sm' : 'text-[15px]'}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--fore)] font-medium leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
              >
                {item.title}
              </a>
            </h3>
          </div>
        </article>
      ))}
    </div>
  );
}

function StoryMetrics({ item }: { item: NewsItem }) {
  return (
    <span className="hidden sm:flex items-center gap-2 flex-shrink-0">
      {item.score ? <span>▲ {formatNumber(item.score)}</span> : null}
      {item.tweet_metrics?.likeCount ? <span>♥ {formatNumber(item.tweet_metrics.likeCount)}</span> : null}
      {item.num_comments && item.source_type !== 'arxiv' ? <span>💬 {formatNumber(item.num_comments)}</span> : null}
    </span>
  );
}