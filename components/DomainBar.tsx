'use client';

import { Domain } from '@/lib/types';

export interface DomainOption {
  value: Domain | 'all';
  label: string;
  hint: string;
  who: string;
}

export const DOMAIN_OPTIONS: DomainOption[] = [
  { value: 'all', label: 'Everyone', hint: 'A mix of all AI news', who: 'Just catching up' },
  { value: 'business', label: 'Business', hint: 'Deals, funding, products', who: 'I follow the money' },
  { value: 'tech', label: 'Technical', hint: 'Models, tools, how it works', who: 'I build with AI' },
  { value: 'research', label: 'Research', hint: 'Papers and benchmarks', who: 'I read the papers' },
];

interface DomainBarProps {
  selected: Domain | 'all';
  counts: Partial<Record<Domain | 'all', number>>;
  onChange: (d: Domain | 'all') => void;
}

/**
 * Compact sidebar widget: pick your reading view. Lives in the right rail so
 * it never eats up the page width like the old full-width banner did.
 */
export default function DomainBar({ selected, counts, onChange }: DomainBarProps) {
  return (
    <section className="glass rounded-2xl p-4">
      <h3 className="font-display font-medium text-sm uppercase tracking-widest text-[var(--fore)] mb-1">
        Who’s reading today?
      </h3>
      <p className="text-[11px] text-[var(--dim)] mb-3">Stories & model charts tuned to you — switch anytime.</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose your view">
        {DOMAIN_OPTIONS.map(opt => {
          const active = selected === opt.value;
          const count = counts[opt.value] ?? 0;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`ring-focus rounded-xl border px-3 py-2.5 text-left transition-all ${
                active
                  ? 'border-[var(--accent)]/70 bg-[var(--accent)]/10'
                  : 'border-[var(--color-line)] hover:border-[var(--mut)]'
              }`}
            >
              <span className={`block font-display text-[13px] font-semibold ${active ? 'text-[var(--accent)]' : 'text-[var(--fore)]'}`}>
                {opt.label}
              </span>
              <span className="block text-[10px] text-[var(--dim)] mt-0.5 truncate">{opt.who}</span>
              {count > 0 && (
                <span className={`mt-1 inline-block text-[9px] px-1.5 py-px rounded-full ${active ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-[var(--input)] text-[var(--dim)]'}`}>
                  {count} stories
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}