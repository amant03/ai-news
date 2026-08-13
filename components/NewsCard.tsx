import { NewsItem, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { timeAgo, formatNumber, typeIcon, typeLabel } from '@/lib/format';
import CoverImage from './CoverImage';

interface NewsCardProps {
  item: NewsItem;
  index?: number;
  variant?: 'grid' | 'hero';
}

export default function NewsCard({ item, index = 0, variant = 'grid' }: NewsCardProps) {
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  const isHero = variant === 'hero';

  return (
    <article
      className={`glass rounded-2xl overflow-hidden panel-hover animate-fade-up flex flex-col`}
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      {/* Category accent strip */}
      <div className="h-0.5 w-full flex-shrink-0" style={{ backgroundColor: color, opacity: 0.55 }} />

      {/* Cover: real image or generated gradient — always vivid */}
      {isHero ? (
        <CoverImage item={item} variant="hero" className="h-40 sm:h-52 flex-shrink-0" />
      ) : (
        <CoverImage item={item} variant="thumb" className="h-32 flex-shrink-0" />
      )}

      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap mb-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-[var(--mut)]">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold"
              style={{ backgroundColor: `${color}1c`, color }}
            >
              {typeIcon(item.source_type)}
            </span>
            <span className="font-medium text-[var(--fore)]">{item.source_label || item.source}</span>
          </span>
          {item.source_detail && (
            <span className="text-[var(--dim)] hidden sm:inline">{item.source_detail}</span>
          )}
          {!isHero && (
            <>
              <span className="text-[var(--dim)]">·</span>
              <span className="font-mono text-[var(--dim)]">{timeAgo(item.published_at)}</span>
            </>
          )}
        </div>

        {/* Title */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group/title text-[var(--fore)] font-medium leading-snug hover:text-cyan-300 transition-colors line-clamp-2 ${
            isHero ? 'text-xl sm:text-2xl font-display font-medium' : 'text-[15px]'
          }`}
        >
          {item.title}
          <span className="inline-block ml-1 opacity-0 group-hover/title:opacity-100 -translate-x-1 group-hover/title:translate-x-0 transition-all text-cyan-300 align-baseline text-[0.85em]">
            ↗
          </span>
        </a>

        {/* Summary */}
        {item.summary && !isHero && (
          <p className="text-[13px] text-[var(--mut)] mt-2 line-clamp-2 flex-1 leading-relaxed">{item.summary}</p>
        )}
        {item.summary && isHero && (
          <p className="text-sm text-[var(--mut)] mt-2 line-clamp-3 flex-1 leading-relaxed">{item.summary}</p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--color-line)]">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}18`, color }}
          >
            {CATEGORY_LABEL[item.category] || item.category}
          </span>

          {(item.score || item.num_comments) && (
            <span className="flex items-center gap-2 text-[11px] font-mono text-[var(--mut)]">
              {item.score ? <span title="score">▲ {formatNumber(item.score)}</span> : null}
              {item.num_comments && item.source_type !== 'arxiv' ? (
                <span title="comments">💬 {formatNumber(item.num_comments)}</span>
              ) : null}
            </span>
          )}

          {item.tweet_metrics && (
            <span className="flex items-center gap-2 text-[11px] font-mono text-[var(--mut)]">
              {item.tweet_metrics.likeCount ? <span>♥ {formatNumber(item.tweet_metrics.likeCount)}</span> : null}
              {item.tweet_metrics.retweetCount ? <span>↻ {formatNumber(item.tweet_metrics.retweetCount)}</span> : null}
            </span>
          )}

          <span className="ml-auto text-[10px] text-[var(--dim)] uppercase tracking-wider">
            {typeLabel(item.source_type)}
          </span>
        </div>
      </div>
    </article>
  );
}