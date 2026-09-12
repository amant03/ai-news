import { describe, expect, it } from 'vitest';
import { isGenuineMention } from '@/lib/related-news';

describe('isGenuineMention', () => {
  const schematron = { name: 'Schematron V2 Turbo', provider: ' obscure-lab' };

  it('rejects generic turbo/version headlines with no real mention', () => {
    expect(isGenuineMention(schematron, 'New Turbo engine boosts sports car sales', '')).toBe(false);
    expect(isGenuineMention(schematron, 'Startup raises Series B to build V2 platform', '')).toBe(false);
  });

  it('accepts a headline actually naming the model', () => {
    expect(
      isGenuineMention(schematron, 'Obscure-Lab releases Schematron V2 Turbo for agents', '')
    ).toBe(true);
  });

  it('rejects provider-only stories', () => {
    const sol = { name: 'GPT Sol Latest', provider: 'OpenAI' };
    expect(
      isGenuineMention(sol, 'OpenAI targets Wall Street junior bankers with new ChatGPT', '')
    ).toBe(false);
  });

  it('accepts provider + core-token stories', () => {
    const sol = { name: 'GPT Sol Latest', provider: 'OpenAI' };
    expect(isGenuineMention(sol, 'OpenAI launches GPT Sol for enterprise agents', '')).toBe(true);
  });

  it('does not match substrings inside other words', () => {
    const flux = { name: 'Flux Pro', provider: 'Black Forest Labs' };
    // "flux" must not match "influx"; "pro" is generic anyway.
    expect(isGenuineMention(flux, 'Influx of new AI startups this quarter', '')).toBe(false);
    expect(isGenuineMention(flux, 'Black Forest Labs unveils Flux Pro image model', '')).toBe(true);
  });

  it('does not let family words qualify other models', () => {
    const sonnet = { name: 'Claude Sonnet 5', provider: 'Anthropic' };
    // About Claude Code / a Claude competitor — not Sonnet 5.
    expect(
      isGenuineMention(sonnet, 'Anthropic Adds Plugin Evals to Claude Code', '')
    ).toBe(false);
    expect(
      isGenuineMention(sonnet, 'SpaceXAI Wants A Cursor-Powered Claude Killer', '')
    ).toBe(false);
    // But a Sonnet-specific story qualifies.
    expect(isGenuineMention(sonnet, 'Anthropic unveils Sonnet 5 with 1M context', '')).toBe(true);
  });

  it('rejects cross-model family matches', () => {
    const sol = { name: 'GPT Sol Latest', provider: 'OpenAI' };
    expect(isGenuineMention(sol, 'GPT-6 Astra: The next generation in intelligence', '')).toBe(
      false
    );
  });

  it('accepts exact full-name mentions', () => {
    const m = { name: 'Claude Sonnet 5', provider: 'Anthropic' };
    expect(isGenuineMention(m, 'Hands on with Claude Sonnet 5: a coding leap', '')).toBe(true);
  });

  it('handles empty model names safely', () => {
    expect(isGenuineMention({ name: '', provider: 'x' }, 'Anything at all', '')).toBe(false);
  });
});
