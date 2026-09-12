import { getNewsItems } from './db';
import type { NewsItem } from './types';

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'model', 'models', 'new', 'mini',
  'pro', 'max', 'ultra', 'turbo', 'preview', 'latest', 'free', 'batch', 'think',
]);

/**
 * Generic tech words that must NEVER qualify a match on their own.
 * ("Turbo", "Pro", "V2" appear in thousands of unrelated headlines.)
 */
const GENERIC = new Set([
  'model', 'models', 'mini', 'nano', 'micro', 'turbo', 'ultra', 'super', 'hyper',
  'mega', 'giga', 'tera', 'pro', 'max', 'plus', 'lite', 'air', 'flash', 'go',
  'one', 'neo', 'nova', 'prime', 'core', 'base', 'chat', 'instruct', 'preview',
  'latest', 'beta', 'alpha', 'coder', 'code', 'math', 'vision', 'audio', 'video',
  'image', 'speech', 'version', 'vers', 'v1', 'v2', 'v3', 'v4', 'v5',
  'mk', 'gen', 'xl', 'xs', 'hd', 'new', 'next', 'smart', 'fast', 'free', 'open', 'live',
]);

/**
 * Model-family prefixes. These identify the lab's lineup, not the specific
 * model — "claude" alone must not qualify a story for Claude Sonnet 5.
 */
const FAMILY = new Set([
  'gpt', 'claude', 'gemini', 'llama', 'grok', 'qwen', 'mistral', 'deepseek',
  'gemma', 'phi', 'mixtral', 'sora', 'whisper', 'codex', 'palm', 'dall',
]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP.has(t));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary match (so "flux" doesn't match "influx"). */
function wordHit(text: string, token: string): boolean {
  return new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i').test(text);
}

/**
 * Strict gate: is this story GENUINELY about the model?
 *
 * A story qualifies only via one of:
 *  1. Exact full-name substring ("GPT Sol Latest" appears verbatim), or
 *  2. A distinctive model token with word boundaries ("schematron" — long
 *     and non-generic), or
 *  3. Provider AND a core (non-generic, len>=3) model token together
 *     ("openai" + "sol").
 *
 * Provider-only, generic-word-only ("turbo", "v2", "pro") or substring
 * accidents never qualify — better to show nothing than wrong news.
 */
export function isGenuineMention(
  model: { name: string; provider: string },
  title: string,
  summary?: string
): boolean {
  const text = `${title} ${summary || ''}`;
  const lowerText = text.toLowerCase();
  const name = model.name.toLowerCase().trim();
  if (!name) return false;

  // Gate 1: exact full-name substring.
  if (lowerText.includes(name)) return true;

  const nameTokens = tokens(model.name);
  const providerTokens = tokens(model.provider || '');
  const distinctive = nameTokens.filter(t => t.length >= 4 && !GENERIC.has(t) && !FAMILY.has(t));
  const core = nameTokens.filter(t => t.length >= 3 && !GENERIC.has(t) && !FAMILY.has(t));

  // Gate 2: distinctive token with word boundaries.
  for (const t of distinctive) {
    if (wordHit(text, t)) return true;
  }

  // Gate 3: provider + core model token together.
  const hasProvider = providerTokens.some(t => wordHit(text, t));
  if (hasProvider) {
    for (const t of core) {
      if (wordHit(text, t)) return true;
    }
  }

  return false;
}

/**
 * Server-side reverse cross-link: news items genuinely about this model.
 * Returns [] rather than unrelated stories.
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

  const scored: Array<{ item: NewsItem; score: number }> = [];
  for (const item of items) {
    if (!isGenuineMention(model, item.title, item.summary)) continue;
    // Rank genuine hits: exact-name beats token hits; fresher wins ties.
    const text = `${item.title} ${item.summary || ''}`.toLowerCase();
    let score = 0;
    if (text.includes(model.name.toLowerCase())) score += 10;
    const t = new Date(item.published_at).getTime();
    if (!isNaN(t)) score += Math.max(0, 5 - (Date.now() - t) / 86_400_000);
    scored.push({ item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item);
}
