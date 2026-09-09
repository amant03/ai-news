export type SortDir = 'asc' | 'desc';
export type ColSort<T extends string> = { key: T; dir: SortDir } | null;

/**
 * Column-header sort toggle used across every leaderboard table.
 * Cycle is symmetric: default dir -> opposite -> back (never clears, so
 * "click descending then ascending" always works for any column).
 */
export function toggleSort<T extends string>(prev: ColSort<T>, key: T, defaultDir: SortDir = 'desc'): ColSort<T> {
  if (!prev || prev.key !== key) return { key, dir: defaultDir };
  return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
}

export function compareValues(a: number | string | undefined, b: number | string | undefined): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  const an = typeof a === 'number' ? a : NaN;
  const bn = typeof b === 'number' ? b : NaN;
  if (isNaN(an) && isNaN(bn)) return 0;
  if (isNaN(an)) return 1;
  if (isNaN(bn)) return -1;
  return an - bn;
}

/**
 * Generic, stable client-side sort. Missing/undefined values always sort to
 * the bottom regardless of direction, so toggling asc<->desc only ever
 * reverses the rows that actually have data.
 */
export function sortByCol<T, K extends string>(
  list: T[],
  colSort: ColSort<K>,
  value: (item: T, key: K) => number | string | undefined,
  tie?: (a: T, b: T) => number
): T[] {
  if (!colSort) return list;
  const arr = [...list];
  const sign = colSort.dir === 'asc' ? 1 : -1;
  const tb = tie ?? (() => 0);
  arr.sort((a, b) => {
    const av = value(a, colSort.key);
    const bv = value(b, colSort.key);
    if ((av === undefined) !== (bv === undefined)) return av === undefined ? 1 : -1;
    const c = compareValues(av, bv);
    if (c !== 0) return c * sign;
    return tb(a, b);
  });
  return arr;
}