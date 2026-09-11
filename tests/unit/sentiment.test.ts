import { describe, expect, it } from 'vitest';
import { scoreText } from '@/lib/sentiment';

describe('scoreText', () => {
  it('returns 0 for neutral text with no lexicon hits', () => {
    expect(scoreText('The meeting is scheduled for Tuesday afternoon')).toBe(0);
  });

  it('scores positive headlines above zero', () => {
    expect(scoreText('Startup breakthrough: record funding round accelerates growth')).toBeGreaterThan(0);
  });

  it('scores negative headlines below zero', () => {
    expect(scoreText('Data breach lawsuit alleges massive failure and coverup')).toBeLessThan(0);
  });

  it('handles negation ("not a breakthrough")', () => {
    expect(scoreText('Not a breakthrough, disappointing results overall failure')).toBeLessThanOrEqual(0);
  });

  it('clamps output to [-1, 1] even for extreme text', () => {
    const extreme = 'breakthrough '.repeat(50) + 'amazing '.repeat(50);
    const s = scoreText(extreme);
    expect(s).toBeLessThanOrEqual(1);
    expect(s).toBeGreaterThanOrEqual(-1);
  });

  it('returns 0 for empty input', () => {
    expect(scoreText('')).toBe(0);
  });
});
