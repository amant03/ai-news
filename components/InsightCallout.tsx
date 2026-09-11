export default function InsightCallout({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p
      role="note"
      aria-label="Key takeaway"
      className="mt-3 max-w-[70ch] rounded-[var(--radius-md)] border border-[var(--accent)]/20 bg-[var(--accent-subtle)] px-4 py-2.5 text-sm leading-relaxed text-[var(--foreground)]"
    >
      <span className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-hover)]">
        TL;DR
      </span>
      {text}
    </p>
  );
}
