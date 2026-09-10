interface SectionHeaderProps {
  title: string;
  kicker?: string;
  note?: string;
  right?: React.ReactNode;
  id?: string;
  rule?: boolean;
  className?: string;
  /** Show the dark-purple "Updated" pill next to the title. */
  updated?: boolean;
  /** Show the mint "New" tag next to the title. */
  isNew?: boolean;
}

/**
 * Artificial Analysis-style section heading: plum small-caps kicker,
 * serif title with optional Updated/New badges, grey sub-note,
 * right-aligned meta and an optional hairline rule below.
 */
export default function SectionHeader({
  title,
  kicker,
  note,
  right,
  id,
  rule = true,
  className = '',
  updated = false,
  isNew = false,
}: SectionHeaderProps) {
  return (
    <div id={id} className={`mb-5 ${className}`.trim()}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {kicker && <div className="kicker mb-2">{kicker}</div>}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="font-display text-[26px] font-medium tracking-tight text-[var(--fore)] leading-tight">
              {title}
            </h2>
            {updated && <span className="badge-updated">Updated</span>}
            {isNew && <span className="tag-new">New</span>}
          </div>
          {note && <p className="text-[15px] text-[var(--mut)] mt-2 leading-relaxed max-w-[60ch]">{note}</p>}
        </div>
        {right && <div className="shrink-0 pb-0.5">{right}</div>}
      </div>
      {rule && <div className="mt-4 h-px bg-[var(--color-line)]" aria-hidden />}
    </div>
  );
}
