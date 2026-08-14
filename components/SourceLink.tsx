interface SourceLinkProps {
  href: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

/** Opens the original source in a new tab. Compact = icon-only control. */
export default function SourceLink({ href, label = 'Source', compact = false, className = '' }: SourceLinkProps) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open source: ${label}`}
      aria-label={`Open source: ${label}`}
      className={`ring-focus inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 text-white/90 backdrop-blur-md hover:border-cyan-300/50 hover:bg-cyan-400/15 hover:text-[var(--cyan)] transition-colors ${
        compact ? 'w-8 h-8 justify-center' : 'px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider'
      } ${className}`}
    >
      <svg className={compact ? 'w-3.5 h-3.5' : 'w-3 h-3'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      {!compact && <span className="leading-none">{label}</span>}
    </a>
  );
}

export function SourcePills({ links }: { links: Array<{ label: string; href: string }> }) {
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map(l => (
        <a
          key={l.href + l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="ring-focus inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--input)]/80 px-2 py-0.5 text-[10px] font-medium text-[var(--mut)] hover:text-[var(--cyan)] hover:border-cyan-400/40 transition-colors"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {l.label}
        </a>
      ))}
    </div>
  );
}
