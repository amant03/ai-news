'use client';

import { DOMAIN_LABEL, Domain } from '@/lib/types';

export interface DomainOption {
  value: Domain | 'all';
  label: string;
  hint: string;
}

export const DOMAIN_OPTIONS: DomainOption[] = [
  { value: 'all', label: 'All Signals', hint: 'Everything we track' },
  { value: 'business', label: 'Business', hint: 'Funding, IPOs, earnings, deals' },
  { value: 'tech', label: 'Tech', hint: 'Models, releases, tooling, infra' },
  { value: 'research', label: 'Research', hint: 'Papers, arXiv, benchmarks' },
];

interface DomainBarProps {
  selected: Domain | 'all';
  counts: Partial<Record<Domain | 'all', number>>;
  onChange: (d: Domain | 'all') => void;
}

export default function DomainBar({ selected, counts, onChange }: DomainBarProps) {
  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--dim)]">View</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--mut)]">Pick your feed</span>
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="News view">
        {DOMAIN_OPTIONS.map(opt => {
          const active = selected === opt.value;
          const count = counts[opt.value] ?? 0;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`ring-focus rounded-xl border p-3 text-left transition-all ${
                active
                  ? 'border-cyan-400/60 bg-cyan-400/10 text-[var(--fore)]'
                  : 'border-[var(--color-line)] text-[var(--mut)] hover:border-[var(--mut)] hover:text-[var(--fore)]'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`font-display text-sm font-medium ${active ? 'text-cyan-200' : ''}`}>
                  {opt.label}
                </span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-cyan-400/20 text-cyan-200' : 'bg-[var(--color-line)] text-[var(--dim)]'}`}>
                    {count}
                  </span>
                )}
              </span>
              <span className="block text-[11px] text-[var(--dim)] mt-1">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
