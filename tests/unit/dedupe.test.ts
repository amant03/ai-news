import { describe, expect, it } from 'vitest';
import { normalizeTitle, tokens, titlesSimilar, isDuplicate } from '@/lib/dedupe';
import { item } from './fixture';

describe('normalizeTitle', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeTitle('GPT-5 Launches TODAY!')).toBe('gpt 5 launches today');
  });

  it('returns empty for empty input', () => {
    expect(normalizeTitle('')).toBe('');
  });
});

describe('titlesSimilar', () => {
  it('matches identical titles', () => {
    expect(titlesSimilar('OpenAI releases GPT-5', 'OpenAI releases GPT-5')).toBe(true);
  });

  it('matches containment', () => {
    expect(titlesSimilar('OpenAI releases GPT-5 today', 'OpenAI releases GPT-5')).toBe(true);
  });

  it('rejects unrelated titles', () => {
    expect(titlesSimilar('OpenAI releases GPT-5', 'Local bakery wins sourdough prize')).toBe(false);
  });

  it('returns false for empty inputs', () => {
    expect(titlesSimilar('', 'Something')).toBe(false);
    expect(titlesSimilar('', '')).toBe(false);
  });
});

describe('isDuplicate', () => {
  it('matches identical URLs ignoring trailing slash and www', () => {
    const a = item({ url: 'https://www.example.com/story/' });
    const b = item({ url: 'https://example.com/story', title: 'Completely different headline' });
    expect(isDuplicate(a, b)).toBe(true);
  });

  it('falls back to title similarity for different URLs', () => {
    const a = item({ url: 'https://a.com/1', title: 'Anthropic unveils Claude Fable 5' });
    const b = item({ url: 'https://b.com/2', title: 'Anthropic unveils Claude Fable 5 today' });
    expect(isDuplicate(a, b)).toBe(true);
  });

  it('returns false for distinct stories', () => {
    const a = item({ url: 'https://a.com/1', title: 'OpenAI releases GPT-5' });
    const b = item({ url: 'https://b.com/2', title: 'Local bakery wins sourdough prize' });
    expect(isDuplicate(a, b)).toBe(false);
  });
});

describe('tokens', () => {
  it('returns a set of normalized tokens', () => {
    expect(tokens('Hello hello world')).toEqual(new Set(['hello', 'world']));
  });
});
