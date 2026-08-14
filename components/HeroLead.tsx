import { NewsItem, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';
import CoverImage from './CoverImage';
import SourceLink from './SourceLink';

interface HeroLeadProps {
  items: NewsItem[];
}

/**
 * Traditional news "top story" cluster: one big lead story with a
 * secondary story stacked beside it, then two more below. Everything
 * is image-first so skimmers can scan the whole top of the page fast.
 */
export default function HeroLead({ items }: HeroLeadProps) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  const [side, ...rest2] = rest;
  const below = rest2.slice(0, 2);

  return (
    <section aria-label="Top stories">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lead story */}
        <LeadStory item={lead} />

        {/* Secondary story beside the lead */}
        {side && (
          <SecondaryStory item={side} />
        )}
      </div>

      {/* Two more below */}
      {below.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {below.map((item, i) => (
            <MiniStory key={item.url} item={item} index={i} />
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
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative block h-64 sm:h-80 flex-shrink-0">
        <CoverImage item={item} variant="hero" showCaption className="absolute inset-0" />
        <span
          className="absolute top-3 left-3 z-10 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-md bg-black/45"
          style={{ color }}
        >
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
        <SourceLink href={item.url} label={item.source_label || 'Source'} compact className="absolute top-2.5 right-2.5 z-10" />
      </a>
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <h2 className="font-display font-bold text-xl sm:text-2xl leading-tight">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fore)] hover:text-[var(--cyan)] transition-colors line-clamp-3"
          >
            {item.title}
          </a>
        </h2>
        <p className="text-[13px] text-[var(--mut)] mt-2 leading-relaxed line-clamp-2">{item.summary}</p>
        <div className="mt-auto pt-4 flex items-center gap-2 text-[11px] text-[var(--dim)]">
          <span className="font-medium text-[var(--mut)]">{item.source_label || item.source}</span>
          <span>·</span>
          <span>{timeAgo(item.published_at)}</span>
          <StoryMetrics item={item} className="ml-auto" />
        </div>
      </div>
    </article>
  );
}

function SecondaryStory({ item }: { item: NewsItem }) {
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--card)] panel-hover animate-fade-up h-full">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative block h-48 sm:h-52 flex-shrink-0">
        <CoverImage item={item} variant="hero" className="absolute inset-0" />
        <span
          className="absolute top-3 left-3 z-10 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-md bg-black/45"
          style={{ color }}
        >
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
      </a>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-lg leading-snug">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fore)] hover:text-[var(--cyan)] transition-colors line-clamp-3"
          >
            {item.title}
          </a>
        </h3>
        <p className="text-[12px] text-[var(--mut)] mt-1.5 leading-relaxed line-clamp-2">{item.summary}</p>
        <div className="mt-auto pt-3 flex items-center gap-2 text-[11px] text-[var(--dim)]">
          <span className="font-medium text-[var(--mut)]">{item.source_label || item.source}</span>
          <span>·</span>
          <span>{timeAgo(item.published_at)}</span>
          <SourceLink href={item.url} compact className="ml-auto" />
        </div>
      </div>
    </article>
  );
}

function MiniStory({ item, index }: { item: NewsItem; index: number }) {
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  return (
    <article className="group flex gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--card)] panel-hover p-3 animate-fade-up"
      style={{ animationDelay: `${index * 70}ms` }}>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="relative block w-28 sm:w-36 h-20 sm:h-24 rounded-xl overflow-hidden flex-shrink-0">
        <CoverImage item={item} variant="thumb" className="absolute inset-0" />
      </a>
      <div className="min-w-0 flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color }}>
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
        <h4 className="font-medium text-sm leading-snug">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--fore)] hover:text-[var(--cyan)] transition-colors line-clamp-2"
          >
            {item.title}
          </a>
        </h4>
        <div className="mt-auto pt-1 flex items-center gap-1.5 text-[10px] text-[var(--dim)]">
          <span className="text-[var(--mut)] truncate">{item.source_label || item.source}</span>
          <span>·</span>
          <span className="flex-shrink-0">{timeAgo(item.published_at)}</span>
        </div>
      </div>
    </article>
  );
}

function StoryMetrics({ item, className }: { item: NewsItem; className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className || ''}`}>
      {item.score ? <span>▲ {formatNumber(item.score)}</span> : null}
      {item.tweet_metrics?.likeCount ? <span>♥ {formatNumber(item.tweet_metrics.likeCount)}</span> : null}
    </span>
  );
}
