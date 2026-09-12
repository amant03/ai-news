import { describe, expect, it } from 'vitest';
import { mergeAAIntoModels, type AAModelEntry } from '@/lib/aa-scraper';

function aa(overrides: Partial<AAModelEntry> & { slug: string; name: string }): AAModelEntry {
  return {
    provider: 'Unknown',
    intelligenceIndex: null,
    speed: null,
    costPerTask: null,
    verbosity: null,
    ...overrides,
  };
}

function rec(id: string, name: string, provider: string): Record<string, unknown> {
  return { id, name, provider, source: 'openrouter' };
}

const AA = [
  aa({ slug: 'gpt-5-6-sol', name: 'GPT-5.6 Sol (max)', provider: 'OpenAI', intelligenceIndex: 47.1, speed: 59.5 }),
  aa({ slug: 'gpt-5-6-terra', name: 'GPT-5.6 Terra (max)', provider: 'OpenAI', intelligenceIndex: 45.0, speed: 61.0 }),
  aa({ slug: 'claude-sonnet-5', name: 'Claude Sonnet 5 (thinking)', provider: 'Anthropic', intelligenceIndex: 44.0, speed: 70.0 }),
  aa({ slug: 'claude-opus-5', name: 'Claude Opus 5 (high)', provider: 'Anthropic', intelligenceIndex: 48.0, speed: 40.0 }),
];

describe('mergeAAIntoModels alias pass', () => {
  it('maps an OpenRouter latest-pointer to the right AA sibling', () => {
    const models = [rec('~openai/gpt-sol-latest', 'OpenAI GPT Sol Latest', '~openai')];
    mergeAAIntoModels(models, AA);
    expect(models[0].aaSlug).toBe('gpt-5-6-sol');
    expect(models[0].intelligenceIndex).toBeCloseTo(47.1, 1);
    expect(models[0].name).toBe('OpenAI GPT Sol Latest'); // never renamed
  });

  it('does not cross sonnet/opus lines', () => {
    const models = [rec('~anthropic/claude-sonnet-latest', 'Anthropic Claude Sonnet Latest', '~anthropic')];
    mergeAAIntoModels(models, AA);
    expect(models[0].aaSlug).toBe('claude-sonnet-5');
  });

  it('refuses matches across providers', () => {
    const models = [rec('qwen/qwen-max', 'Qwen Max', 'Qwen')];
    mergeAAIntoModels(models, AA);
    expect(models[0].aaSlug).toBeUndefined();
    expect(models[0].intelligenceIndex).toBeUndefined();
  });

  it('leaves already-matched records alone', () => {
    const models = [rec('openai/gpt-5', 'GPT-5', 'OpenAI')];
    (models[0] as Record<string, unknown>).aaSlug = 'gpt-5-6-terra';
    mergeAAIntoModels(models, AA);
    expect(models[0].aaSlug).toBe('gpt-5-6-terra');
  });
});
