import { describe, expect, it } from 'vitest';
import {
  loadTodayDigest,
  renderDailyDigest,
  renderWelcomeEmail,
  signUnsubscribe,
  unsubscribeUrl,
  verifyUnsubscribe,
} from '@/lib/email';

const STORIES = [
  { title: 'Story One', url: 'https://example.com/1', source_label: 'Test' },
  { title: 'Story Two', url: 'https://example.com/2', source: 'TestWire' },
];

describe('unsubscribe signing', () => {
  it('round-trips and normalizes case', () => {
    const token = signUnsubscribe('User@Example.COM');
    expect(verifyUnsubscribe('user@example.com', token)).toBe(true);
    expect(verifyUnsubscribe('user@example.com', token + 'x')).toBe(false);
    expect(verifyUnsubscribe('other@example.com', token)).toBe(false);
  });

  it('builds an unsubscribe URL with email + token', () => {
    const url = unsubscribeUrl('user@example.com');
    expect(url).toContain('/unsubscribe?email=user%40example.com&token=');
  });
});

describe('renderWelcomeEmail', () => {
  it('mentions the digest and unsubscribe', () => {
    const m = renderWelcomeEmail('user@example.com');
    expect(m.subject).toContain('Welcome');
    expect(m.text).toContain('Unsubscribe:');
    expect(m.html).toContain('/unsubscribe?');
  });
});

describe('renderDailyDigest', () => {
  it('lists stories and the model release', () => {
    const m = renderDailyDigest(
      'user@example.com',
      STORIES,
      { name: 'TestModel X', provider: 'TestLab', released: '2026-09-13T00:00:00Z', slug: 'testmodel-x' }
    );
    expect(m.subject).toContain('top 2 stories');
    expect(m.text).toContain('Story One — https://example.com/1');
    expect(m.text).toContain('Biggest model release: TestModel X by TestLab');
    expect(m.html).toContain('/models/testmodel-x');
  });

  it('works without a model release', () => {
    const m = renderDailyDigest('user@example.com', STORIES, null);
    expect(m.text).toContain('Story Two');
    expect(m.text).not.toContain('Biggest model release');
  });
});

describe('loadTodayDigest', () => {
  it('loads stories from the repo data files', async () => {
    const d = await loadTodayDigest(5);
    expect(d.stories.length).toBeGreaterThan(0);
    expect(d.stories.length).toBeLessThanOrEqual(5);
  });
});
