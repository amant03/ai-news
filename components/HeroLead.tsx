import { NewsItem, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/format';

interface HeroLeadProps {
  items: NewsItem[];
}

export default function HeroLead({ items }: HeroLeadProps) {
  if (items.length === 0) return null;
  const displayed = items.slice(0, 10);

  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayed.map((item) => (
          <Card key={item.url} item={item} />
        ))}
      </div>
    </section>
  );
}

function Card({ item }: { item: NewsItem }) {
  const color = CATEGORY_COLOR[item.category] || '#6b7280';
  return (
    <article className="group flex flex-col rounded-xl border border-[var(--color-line)] p-4 panel-hover">
      <div className="flex items-center gap-2 mb-2">
        <span className="dot" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--mut)]">
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
        <span className="text-[11px] text-[var(--dim)] ml-auto">{timeAgo(item.published_at)}</span>
      </div>
      <h3 className="text-[15px] font-medium leading-snug tracking-tight mb-3">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--fore)] hover:underline decoration-[var(--mut)]/50 underline-offset-2 line-clamp-2"
        >
          {item.title}
        </a>
      </h3>
      <div className="mt-auto flex items-center gap-2 text-[11px] text-[var(--dim)]">
        <span className="font-medium text-[var(--mut)]">{item.source_label || item.source}</span>
        <StoryMetrics item={item} />
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
