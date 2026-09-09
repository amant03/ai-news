'use client';

import type { SortDir } from '@/lib/sortable';

interface SortableThProps {
  label: string;
  active?: boolean;
  dir?: SortDir;
  onToggle: () => void;
  right?: boolean;
  width?: number;
  /** Override for pages that use a different accent style. */
  activeClass?: string;
  inactiveClass?: string;
}

/**
 * Reusable sortable table-header button with ▲▼ direction indicator.
 * Clicking toggles ascending <-> descending (see `toggleSort`).
 */
export default function SortableTh({
  label,
  active,
  dir,
  onToggle,
  right,
  width,
  activeClass = 'text-black',
  inactiveClass = 'text-neutral-400 hover:text-neutral-700',
}: SortableThProps) {
  return (
    <th
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${right ? 'text-right' : ''}`}
      style={width ? { width } : undefined}
    >
      <button
        onClick={onToggle}
        title={`Sort by ${label}${active ? ' (toggle direction)' : ''}`}
        className={`ring-focus inline-flex items-center gap-1 rounded transition-colors group/col ${
          active ? activeClass : inactiveClass
        } ${right ? 'justify-end w-full' : ''}`}
      >
        {label}
        <span className={`text-[8px] leading-none ${active ? 'opacity-100' : 'opacity-40'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </button>
    </th>
  );
}