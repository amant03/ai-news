import { getNewsItems } from './db';
import type { NewsItem } from './types';

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'model', 'models', 'new', 'mini',
  'pro', 'max', 'ultra', 'turbo', 'preview', 'latest', 'free', 'batch', 'think',
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP.has(t));
}

/**
 * Server-side reverse cross-link: news items mentioning this model.
 * Scores title+summary token overlap against the model name + provider.
 */
export function findRelatedNews(
  model: { name: string; provider: string },
  limit = 6
): NewsItem[] {
  let items: NewsItem[] = [];
  try {
    items = getNewsItems(400, 0) as NewsItem[];
  } catch {
    return [];
  }
  const nameTokens = tokens(model.name);
  const providerTokens = tokens(model.provider || '');
  const scored: Array<{ item: NewsItem; score: number }> = [];

  for (const item of items) {
    const text = `${item.title} ${item.summary || ''}`.toLowerCase();
    let score = 0;
    for (const t of nameTokens) {
      if (text.includes(t)) score += t.length >= 5 ? 2 : 1;
    }
    for (const t of providerTokens) {
      if (text.includes(t)) score += 0.5;
    }
    // Full-name exact hit is a strong signal.
    if (text.includes(model.name.toLowerCase())) score += 3;
    if (score > 0) scored.push({ item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item);
}
