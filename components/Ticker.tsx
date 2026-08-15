import { NewsItem, CATEGORY_COLOR } from '@/lib/types';

interface TickerProps {
  items: NewsItem[];
}

export default function Ticker({ items }: TickerProps) {
  if (items.length === 0) return null;

  // Double the list for a seamless marquee loop
  const doubled = [...items, ...items];

  return (
    <div className="relative border-b border-[var(--color-line)] overflow-hidden" style={{ background: 'var(--ticker-bg)' }}>
      <div className="flex items-stretch">
        {/* Live label */}
        <div className="z-10 flex items-center gap-2 px-3 sm:px-4 py-2 border-r border-[var(--color-line)] flex-shrink-0" style={{ background: 'var(--ticker-label-bg)' }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--ok)] opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--ok)]" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--ok)] whitespace-nowrap">
            Live
          </span>
        </div>

        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div className="animate-ticker flex items-center whitespace-nowrap will-change-transform">
            {doubled.map((item, i) => {
              const color = CATEGORY_COLOR[item.category] || '#94a3b8';
              return (
                <a
                  key={`${item.url}-${i}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2 text-xs text-[var(--mut)] hover:text-[var(--fore)] transition-colors"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[10px] text-[var(--dim)] uppercase">
                    {item.source_label || item.source}
                  </span>
                  <span className="line-clamp-1">{item.title}</span>
                  <span className="text-[var(--dim)]" aria-hidden>↗</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--ticker-bg)] to-transparent" />
    </div>
  );
}