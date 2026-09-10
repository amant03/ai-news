interface SectionHeaderProps {
  title: string;
  kicker?: string;
  note?: string;
  right?: React.ReactNode;
  id?: string;
  rule?: boolean;
  className?: string;
}

/**
 * AA-style section heading: optional small-caps kicker, bold title,
 * grey sub-note and right-aligned meta. Optional hairline rule below.
 */
export default function SectionHeader({ title, kicker, note, right, id, rule = true, className = '' }: SectionHeaderProps) {
  return (
    <div id={id} className={`mb-5 ${className}`.trim()}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {kicker && <div className="kicker mb-1.5">{kicker}</div>}
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--fore)] leading-tight">
            {title}
          </h2>
          {note && <p className="text-[13px] text-[var(--mut)] mt-1.5 leading-relaxed max-w-2xl">{note}</p>}
        </div>
        {right && <div className="shrink-0 pb-0.5">{right}</div>}
      </div>
      {rule && <div className="mt-4 h-px bg-[var(--color-line)]" aria-hidden />}
    </div>
  );
}