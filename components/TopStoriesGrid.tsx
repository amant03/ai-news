import type { NewsItem } from '@/lib/types';
import Link from 'next/link';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { timeAgo } from '@/lib/format';
import CoverImage from './CoverImage';
import { findModelMention } from '@/lib/model-mentions';
import { Skeleton } from './ui/skeleton';

export function TopStoriesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Loading top stories">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--color-line)] overflow-hidden">
          <Skeleton className="h-36 w-full rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopStoriesEmpty({ onReset }: { onReset?: () => void }) {
  return (
    <div className="py-16 text-center border border-dashed border-[var(--color-line)] rounded-[var(--radius-lg)]">
      <p className="text-sm font-medium text-[var(--foreground)]">No stories match this filter yet</p>
      <p className="mt-1 text-sm text-[var(--mut)]">Try a broader lens or clear your search.</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-4 inline-flex h-9 items-center rounded-[var(--radius-md)] bg-[var(--gray-900)] px-4 text-sm font-medium text-white"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

export default function TopStoriesGrid({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return <TopStoriesEmpty />;
  const [first, ...rest] = items;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {first && <StoryCard item={first} hero />}
      {rest.map(item => (
        <StoryCard key={item.url} item={item} />
      ))}
    </div>
  );
}

function StoryCard({ item, hero = false }: { item: NewsItem; hero?: boolean }) {
  const color = CATEGORY_COLOR[item.category] || 'var(--cat-other)';
  const mention = findModelMention(item);
  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--card)] card-lift ${
        hero ? 'sm:col-span-2 lg:col-span-2' : ''
      }`}
    >
      <div className={`relative flex-shrink-0 ${hero ? 'h-44 sm:h-52' : 'h-32 sm:h-36'}`}>
        <CoverImage item={item} variant={hero ? 'hero' : 'thumb'} className="absolute inset-0 h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="dot" style={{ backgroundColor: color }} aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--mut)]">
            {CATEGORY_LABEL[item.category] || item.category}
          </span>
          <span className="ml-auto text-[11px] tabular-nums text-[var(--mut)]">
            {item.source_label || item.source} · {timeAgo(item.published_at)}
          </span>
        </div>
        <h3
          className={`font-medium leading-snug tracking-tight ${
            hero ? 'text-lg md:text-xl' : 'text-sm md:text-base'
          }`}
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--foreground)] line-clamp-2 group-hover:underline underline-offset-4"
          >
            {item.title}
          </a>
        </h3>
        {mention && (
          <div className="mt-2">
            <Link
              href={`/models/${mention.slug}`}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-hover)] hover:underline"
            >
              Mentions: {mention.name}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
