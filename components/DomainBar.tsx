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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-5 h-5 bg-black rounded-sm shrink-0" />
        <h2 className="text-lg font-semibold tracking-tight">Who&apos;s reading?</h2>
      </div>
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Choose your view">
        {DOMAIN_OPTIONS.map(opt => {
          const active = selected === opt.value;
          const count = counts[opt.value] ?? 0;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`ring-focus rounded-full border px-4 py-2 text-left transition-all ${
                active
                  ? 'bg-black text-white border-black'
                  : 'border-[var(--color-line)] hover:border-neutral-300'
              }`}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              {count > 0 && (
                <span className={`ml-2 text-[11px] ${active ? 'opacity-70' : 'text-neutral-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
