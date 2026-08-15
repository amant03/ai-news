import { NewsItem, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';
import CoverImage from './CoverImage';
import SourceLink from './SourceLink';

interface NewsCardProps {
  item: NewsItem;
  index?: number;
  variant?: 'grid' | 'hero';
  className?: string;
}

export default function NewsCard({ item, index = 0, variant = 'grid', className = '' }: NewsCardProps) {
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  const isHero = variant === 'hero';

  return (
    <article
      className={`group/card flex flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] card panel-hover animate-fade-up h-full ${className}`}
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <div className={`relative ${isHero ? 'h-44 sm:h-52' : 'h-32 sm:h-36'} flex-shrink-0`}>
        <CoverImage
          item={item}
          variant={isHero ? 'hero' : 'thumb'}
          showCaption={false}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute top-2.5 left-2.5 z-10">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-md bg-black/45"
            style={{ color }}
          >
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
        </div>
        <div className="absolute top-2 right-2 z-20">
          <SourceLink href={item.url} label={item.source_label || 'Source'} compact />
        </div>
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col flex-1">
        <div className="text-[11px] text-[var(--mut)] mb-1.5 truncate">
          {item.source_label || item.source}
          <span className="text-[var(--dim)]"> · {timeAgo(item.published_at)}</span>
        </div>
        <h3 className={isHero ? 'text-xl sm:text-2xl' : 'text-[15px] sm:text-base'}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block font-display font-medium text-[var(--fore)] leading-snug hover:text-[var(--accent)] transition-colors ${
              isHero ? 'line-clamp-3' : 'line-clamp-2'
            }`}
          >
            {item.title}
          </a>
        </h3>
        <div className="mt-auto pt-3 flex items-center gap-2 text-[10px] font-mono text-[var(--dim)]">
          {(item.score || item.num_comments) && (
            <>
              {item.score ? <span>▲ {formatNumber(item.score)}</span> : null}
              {item.num_comments && item.source_type !== 'arxiv' ? <span>💬 {formatNumber(item.num_comments)}</span> : null}
            </>
          )}
          {item.tweet_metrics?.likeCount ? <span>♥ {formatNumber(item.tweet_metrics.likeCount)}</span> : null}
        </div>
      </div>
    </article>
  );
}
