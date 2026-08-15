import { NewsItem, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';
import CoverImage from './CoverImage';
import SourceLink from './SourceLink';

interface HeroLeadProps {
  items: NewsItem[];
}

/**
 * Editorial front-page "top story" cluster — a bold lead card plus a ranked
 * list of the next most-engaged stories, finished with a compact strip of
 * the remainder so the whole Top 10 is on the page. Asymmetric and skimmable.
 */
export default function HeroLead({ items }: HeroLeadProps) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  const secondaries = rest.slice(0, 4);
  const tail = rest.slice(4, 10);

  return (
    <section aria-label="Top stories" className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3">
        {/* Lead story */}
        <LeadStory item={lead} />

        {/* Ranked secondary stories */}
        <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)] card overflow-hidden">
          {secondaries.map((item, i) => (
            <SecondaryStory key={item.url} item={item} rank={i + 2} />
          ))}
        </div>
      </div>

      {/* Ranks 6–10 as a compact strip */}
      {tail.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {tail.map((item, i) => (
            <MiniStory key={item.url} item={item} rank={i + 6} />
          ))}
        </div>
      )}
    </section>
  );
}

function LeadStory({ item }: { item: NewsItem }) {
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--card)] panel-hover animate-fade-up h-full">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative block h-52 sm:h-64 flex-shrink-0">
        <CoverImage item={item} variant="hero" showCaption className="absolute inset-0" />
        <span
          className="absolute top-3 left-3 z-10 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-md bg-black/50"
          style={{ color }}
        >
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
        <SourceLink href={item.url} label={item.source_label || 'Source'} compact className="absolute top-2.5 right-2.5 z-10" />
      </a>
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <h2 className="font-display font-semibold text-[1.7rem] sm:text-3xl leading-[1.15] tracking-tight">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fore)] hover:text-[var(--accent)] transition-colors line-clamp-3"
          >
            {item.title}
          </a>
        </h2>
        <p className="text-sm text-[var(--mut)] mt-3 leading-relaxed line-clamp-3">{item.summary}</p>
        <div className="mt-auto pt-5 flex items-center gap-3 text-[11px] text-[var(--dim)]">
          <span className="font-semibold text-[var(--mut)]">{item.source_label || item.source}</span>
          <span aria-hidden>·</span>
          <span>{timeAgo(item.published_at)}</span>
          <StoryMetrics item={item} className="ml-auto" />
        </div>
      </div>
    </article>
  );
}

function SecondaryStory({ item, rank }: { item: NewsItem; rank: number }) {
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  return (
    <article className="group flex gap-3 p-3 animate-fade-up">
      <span className="font-display font-semibold text-xl text-[var(--dim)]/60 flex-shrink-0 pt-0.5 select-none tabular-nums">
        {String(rank).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-semibold uppercase tracking-widest"
            style={{ color }}
          >
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
          <span className="text-[10px] font-mono text-[var(--dim)]">· {timeAgo(item.published_at)}</span>
        </div>
        <h3 className="font-display font-medium text-[15px] leading-snug tracking-tight">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fore)] hover:text-[var(--accent)] transition-colors line-clamp-3"
          >
            {item.title}
          </a>
        </h3>
        <p className="text-[11px] text-[var(--dim)] mt-1 flex items-center gap-2">
          <span className="truncate text-[var(--mut)]">{item.source_label || item.source}</span>
          <StoryMetrics item={item} />
        </p>
      </div>
    </article>
  );
}

function MiniStory({ item, rank }: { item: NewsItem; rank: number }) {
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  return (
    <article className="group flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--card)] overflow-hidden panel-hover animate-fade-up">
      {/* Thumbnail */}
      <div className="relative h-24 flex-shrink-0 overflow-hidden">
        <CoverImage item={item} variant="thumb" className="absolute inset-0" />
      </div>
      <div className="p-2.5 flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="font-mono text-[9px] text-[var(--dim)] tabular-nums">{String(rank).padStart(2, '0')}</span>
          <span className="text-[8px] font-semibold uppercase tracking-widest" style={{ color }}>
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-medium leading-snug text-[var(--fore)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
        >
          {item.title}
        </a>
        <div className="mt-auto pt-1.5 flex items-center gap-1.5 text-[8px] font-mono text-[var(--dim)]">
          <span className="truncate text-[var(--mut)]">{item.source_label || item.source}</span>
          <span aria-hidden>·</span>
          <span className="flex-shrink-0">{timeAgo(item.published_at)}</span>
        </div>
      </div>
    </article>
  );
}

function StoryMetrics({ item, className }: { item: NewsItem; className?: string }) {
  return (
    <span className={`flex items-center gap-2 flex-shrink-0 ${className || ''}`}>
      {item.tweet_metrics?.likeCount ? <span>♥ {formatNumber(item.tweet_metrics.likeCount)}</span> : null}
      {item.score ? <span>▲ {formatNumber(item.score)}</span> : null}
      {item.num_comments && item.source_type !== 'arxiv' ? <span>💬 {formatNumber(item.num_comments)}</span> : null}
    </span>
  );
}