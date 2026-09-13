import { describe, expect, it } from 'vitest';
import { isValidEmail, normalizeEmail } from '@/lib/newsletter-store';

describe('newsletter email handling', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('at62032@gmail.com')).toBe(true);
    expect(isValidEmail('a.b+tag@sub.example.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a @b.com')).toBe(false);
  });

  it('normalizes case and whitespace for dedupe', () => {
    expect(normalizeEmail('  AT62032@Gmail.COM ')).toBe('at62032@gmail.com');
    expect(normalizeEmail(null)).toBe('');
  });
});
