import { NewsItem, CATEGORY_COLOR } from '@/lib/types';

interface TickerProps {
  items: NewsItem[];
}

export default function Ticker({ items }: TickerProps) {
  if (items.length === 0) return null;

  // Double the list for a seamless marquee loop
  const doubled = [...items, ...items];

  return (
    <div className="relative border-b border-[var(--color-line)] bg-[#070b15] overflow-hidden">
      <div className="flex items-stretch">
        {/* Live label */}
        <div className="z-10 flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#0a1120] border-r border-[var(--color-line)] flex-shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300 whitespace-nowrap">
            LIVE
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
                  className="flex items-center gap-2 px-5 py-2 text-xs text-[var(--mut)] hover:text-cyan-300 transition-colors"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[10px] text-[var(--dim)] uppercase">
                    {item.source_label || item.source}
                  </span>
                  <span className="line-clamp-1">{item.title}</span>
                  <span className="text-cyan-400/70" aria-hidden>↗</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#070b15] to-transparent" />
    </div>
  );
}
