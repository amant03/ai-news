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

export default function DomainBar({ selected, counts, onChange }: DomainBarProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-gradient-to-br from-[#0c1628] to-[#120e22] p-4 sm:p-5">
      <div className="mb-3">
        <p className="font-display text-base sm:text-lg font-semibold text-[var(--fore)]">Who’s reading today?</p>
        <p className="text-[12px] text-[var(--mut)] mt-0.5">
          We’ll show stories and model charts that match — you can switch anytime.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" role="group" aria-label="Choose your view">
        {DOMAIN_OPTIONS.map(opt => {
          const active = selected === opt.value;
          const count = counts[opt.value] ?? 0;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`ring-focus rounded-xl border p-3.5 text-left transition-all ${
                active
                  ? 'border-cyan-400/70 bg-cyan-400/12 shadow-[0_0_0_1px_rgba(56,221,245,0.25)]'
                  : 'border-[var(--color-line)] bg-[#0a0f1c]/50 text-[var(--mut)] hover:border-cyan-400/30 hover:text-[var(--fore)]'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`font-display text-sm font-semibold ${active ? 'text-cyan-100' : 'text-[var(--fore)]'}`}>
                  {opt.label}
                </span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-cyan-400/20 text-cyan-200' : 'bg-[var(--color-line)] text-[var(--dim)]'}`}>
                    {count}
                  </span>
                )}
              </span>
              <span className="block text-[11px] text-[var(--dim)] mt-1">{opt.who}</span>
              <span className="block text-[11px] text-[var(--mut)] mt-0.5">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
