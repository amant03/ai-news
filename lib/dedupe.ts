import { NewsItem } from './types';

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ai|a\.i\.|the|a|an|of|for|with|and|in|on|at|to|is)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(title: string): Set<string> {
  return new Set(normalizeTitle(title).split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
  }
  const union = a.size + b.size - inter;
  return inter / union;
}

function normalizedUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

export function titlesSimilar(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return jaccard(tokens(a), tokens(b)) >= 0.72;
}

export function isDuplicate(existing: NewsItem, incoming: NewsItem): boolean {
  if (existing.url && incoming.url) {
    const a = normalizedUrl(existing.url);
    const b = normalizedUrl(incoming.url);
    if (a === b) return true;
  }
  return titlesSimilar(existing.title || '', incoming.title || '');
}
