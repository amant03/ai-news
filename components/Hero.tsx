import { DOMAIN_OPTIONS } from './DomainBar';
import type { Domain } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Skeleton } from './ui/skeleton';

interface HeroProps {
  syncedAgo: string | null;
  storyCount: number | null;
  modelCount: number | null;
  persona: Domain | 'all';
  onPersonaChange: (d: Domain | 'all') => void;
  loading?: boolean;
}

export default function Hero({
  syncedAgo,
  storyCount,
  modelCount,
  persona,
  onPersonaChange,
  loading = false,
}: HeroProps) {
  return (
    <section aria-label="Intro" className="hero-enter pt-2 pb-8">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent-hover)]">
        Live{syncedAgo ? ` · Synced ${syncedAgo}` : ''}
      </p>
      <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)] max-w-[20ch]">
        The AI frontier, tracked automatically.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--mut)] max-w-[60ch]">
        AI Pulse aggregates news, model releases and benchmark data from 40+ sources every 4
        hours — no editors, no manual curation — and ranks every model by intelligence, speed
        and cost so you can see what&apos;s actually worth using.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--mut)]">Show me:</span>
        <Tabs value={persona} onValueChange={v => onPersonaChange(v as Domain | 'all')}>
          <TabsList aria-label="Persona lens">
            {DOMAIN_OPTIONS.map(o => (
              <TabsTrigger key={o.value} value={o.value}>
                {o.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">
        {loading || storyCount === null ? (
          <>
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="h-6 w-40 rounded-full" />
          </>
        ) : (
          <>
            <span className="inline-flex items-center rounded-full bg-[var(--gray-100)] px-3 py-1 text-xs tabular-nums text-[var(--gray-700)]">
              {storyCount.toLocaleString('en-US')} stories tracked in the last 30 days
            </span>
            {modelCount !== null && (
              <span className="inline-flex items-center rounded-full bg-[var(--gray-100)] px-3 py-1 text-xs tabular-nums text-[var(--gray-700)]">
                {modelCount.toLocaleString('en-US')} models compared
              </span>
            )}
          </>
        )}
      </div>
    </section>
  );
}
