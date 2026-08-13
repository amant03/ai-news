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
      className={`group/card relative overflow-hidden rounded-2xl border border-[var(--color-line)] panel-hover animate-fade-up h-full ${
        isHero ? 'min-h-[280px] sm:min-h-[340px]' : 'min-h-[220px]'
      } ${className}`}
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-0" aria-hidden tabIndex={-1}>
        <CoverImage
          item={item}
          variant={isHero ? 'hero' : 'thumb'}
          showCaption={false}
          className="absolute inset-0 h-full"
        />
      </a>

      <div className="absolute inset-0 bg-gradient-to-t from-[#05070e] via-[#05070e]/55 to-black/10 pointer-events-none" />
      <div className="h-0.5 w-full absolute top-0 z-10" style={{ backgroundColor: color, opacity: 0.7 }} />

      <div className="absolute top-3 left-3 right-12 z-10 flex items-center gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-md"
          style={{ backgroundColor: `${color}33`, color }}
        >
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
        <span className="text-[10px] font-medium text-white/70 truncate">{item.source_label || item.source}</span>
      </div>

      <div className="absolute top-2.5 right-2.5 z-20">
        <SourceLink href={item.url} label={item.source_label || 'Source'} compact />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
        <h3 className={isHero ? 'text-xl sm:text-2xl' : 'text-[15px] sm:text-base'}>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block font-display font-medium text-white leading-snug hover:text-cyan-200 transition-colors ${
              isHero ? 'line-clamp-3' : 'line-clamp-2'
            }`}
          >
            {item.title}
          </a>
        </h3>
        <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-white/55">
          <span>{timeAgo(item.published_at)}</span>
          {(item.score || item.num_comments) && (
            <>
              <span>·</span>
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
