import { DOMAIN_OPTIONS } from './DomainBar';
import type { Domain } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Skeleton } from './ui/skeleton';

interface HeroProps {
  storyCount: number | null;
  modelCount: number | null;
  persona: Domain | 'all';
  onPersonaChange: (d: Domain | 'all') => void;
  loading?: boolean;
}

export default function Hero({
  storyCount,
  modelCount,
  persona,
  onPersonaChange,
  loading = false,
}: HeroProps) {
  return (
    <section aria-label="Intro" className="hero-enter pt-2 pb-8">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent-hover)]">
        Live
      </p>
      <h1 className="mt-2 font-semibold tracking-tight text-[var(--foreground)] whitespace-nowrap text-[clamp(1.4rem,4.5vw,2.25rem)]">
        The AI frontier, tracked automatically.
      </h1>
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
            <span className="inline-flex items-center rounded-full bg-[var(--input)] px-3 py-1 text-xs tabular-nums text-[var(--mut)]">
              {storyCount.toLocaleString('en-US')} stories tracked in the last 30 days
            </span>
            {modelCount !== null && (
              <span className="inline-flex items-center rounded-full bg-[var(--input)] px-3 py-1 text-xs tabular-nums text-[var(--mut)]">
                {modelCount.toLocaleString('en-US')} models compared
              </span>
            )}
          </>
        )}
      </div>
    </section>
  );
}
