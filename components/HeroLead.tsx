import { NewsItem, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';

interface HeroLeadProps {
  items: NewsItem[];
}

export default function HeroLead({ items }: HeroLeadProps) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  const secondaries = rest.slice(0, 4);
  const tail = rest.slice(4, 10);

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3">
        <LeadStory item={lead} />
        <div className="flex flex-col divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
          {secondaries.map((item) => (
            <SecondaryStory key={item.url} item={item} />
          ))}
        </div>
      </div>
      {tail.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {tail.map((item) => (
            <MiniStory key={item.url} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function LeadStory({ item }: { item: NewsItem }) {
  const color = CATEGORY_COLOR[item.category] || '#6b7280';
  return (
    <article className="group flex flex-col rounded-lg border border-[var(--color-line)] p-6 h-full hover:border-neutral-300 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ backgroundColor: `${color}12`, color }}
        >
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
        <span className="text-[11px] text-neutral-400">{timeAgo(item.published_at)}</span>
      </div>
      <h2 className="text-xl font-semibold leading-snug tracking-tight mb-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-black hover:text-violet-600 transition-colors"
        >
          {item.title}
        </a>
      </h2>
      <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mb-4">{item.summary}</p>
      <div className="mt-auto flex items-center gap-2 text-[11px] text-neutral-400">
        <span className="font-medium text-neutral-600">{item.source_label || item.source}</span>
        <StoryMetrics item={item} />
      </div>
    </article>
  );
}

function SecondaryStory({ item }: { item: NewsItem }) {
  const color = CATEGORY_COLOR[item.category] || '#6b7280';
  return (
    <article className="group flex gap-3 p-3 hover:bg-neutral-50 transition-colors">
      <div className="w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: `${color}40` }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color }}>
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
          <span className="text-[10px] text-neutral-400">{timeAgo(item.published_at)}</span>
        </div>
        <h3 className="text-[15px] font-medium leading-snug tracking-tight">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black hover:text-violet-600 transition-colors line-clamp-2"
          >
            {item.title}
          </a>
        </h3>
        <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-2">
          <span className="truncate text-neutral-500">{item.source_label || item.source}</span>
          <StoryMetrics item={item} />
        </p>
      </div>
    </article>
  );
}

function MiniStory({ item }: { item: NewsItem }) {
  const color = CATEGORY_COLOR[item.category] || '#6b7280';
  return (
    <article className="group flex flex-col rounded-lg border border-[var(--color-line)] p-3 hover:border-neutral-300 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[8px] font-semibold uppercase tracking-widest" style={{ color }}>
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-medium leading-snug text-black line-clamp-2 group-hover:text-violet-600 transition-colors"
      >
        {item.title}
      </a>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] text-neutral-400">
        <span className="truncate text-neutral-500">{item.source_label || item.source}</span>
        <span aria-hidden>·</span>
        <span className="flex-shrink-0">{timeAgo(item.published_at)}</span>
      </div>
    </article>
  );
}

function StoryMetrics({ item, className }: { item: NewsItem; className?: string }) {
  return (
    <span className={`flex items-center gap-2 flex-shrink-0 ${className || ''}`}>
      {item.tweet_metrics?.likeCount ? <span>{formatNumber(item.tweet_metrics.likeCount)}</span> : null}
      {item.score ? <span>{formatNumber(item.score)}</span> : null}
      {item.num_comments && item.source_type !== 'arxiv' ? <span>{formatNumber(item.num_comments)}</span> : null}
    </span>
  );
}
