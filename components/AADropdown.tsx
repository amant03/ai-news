'use client';

import { useEffect, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

/**
 * AA-style dropdown: label + chevron, opens a bordered menu, closes on
 * outside click / Escape. Used for prompt options, blend ratios, filters.
 */
export default function AADropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-line)] text-[12px] font-medium text-[var(--fore)] hover:border-neutral-300 transition-colors"
      >
        <span className="text-[var(--mut)]">{label}:</span>
        <span>{current?.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
        >
          <path d="M1.5 3.5 L5 7 L8.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 min-w-[190px] rounded-lg border border-[var(--color-line)] bg-[var(--card)] shadow-lg py-1">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`block w-full text-left px-3.5 py-2 text-[12px] hover:bg-[var(--hover)] transition-colors ${
                o.value === value ? 'font-medium text-[var(--fore)]' : 'text-[var(--dim)]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}