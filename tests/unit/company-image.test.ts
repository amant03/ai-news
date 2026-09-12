import { describe, expect, it } from 'vitest';
import { companyFor, publisherFavicon, publisherHost, coverName } from '@/lib/company-image';
import { usableImageUrl } from '@/components/CoverImage';

describe('companyFor', () => {
  it('resolves the company from title text', () => {
    expect(companyFor({ title: 'OpenAI launches GPT Sol for enterprise', summary: '' })?.name).toBe('OpenAI');
    expect(companyFor({ title: 'Anthropic unveils Sonnet 5', summary: '' })?.logo).toMatch(/wikimedia\.org/);
  });

  it('returns null when no company is mentioned', () => {
    expect(companyFor({ title: 'Local bakery wins sourdough prize', summary: '' })).toBeNull();
  });
});

describe('publisher favicon', () => {
  it('builds a favicon URL from the article host', () => {
    expect(publisherFavicon('https://www.the-decoder.com/article')).toBe(
      'https://www.google.com/s2/favicons?domain=the-decoder.com&sz=128'
    );
  });

  it('returns null for bad URLs', () => {
    expect(publisherFavicon('not a url')).toBeNull();
    expect(publisherFavicon(undefined)).toBeNull();
    expect(publisherHost(undefined)).toBeNull();
  });
});

describe('coverName', () => {
  it('prefers company, then source label, then host', () => {
    expect(
      coverName(
        { title: '', summary: '', url: 'https://x.com/y', source: 'x', source_label: 'X' },
        { name: 'OpenAI', logo: 'https://example.com/logo.png' }
      )
    ).toBe('OpenAI');
    expect(
      coverName({ title: '', summary: '', url: 'https://x.com/y', source: 'x', source_label: 'X' }, null)
    ).toBe('X');
    expect(
      coverName({ title: '', summary: '', url: 'https://the-decoder.com/a', source: 'web' }, null)
    ).toBe('The-decoder');
  });
});

describe('usableImageUrl', () => {
  it('rejects junk placeholder avatars', () => {
    expect(usableImageUrl('https://avatars.githubusercontent.com/u/1000?v=4')).toBeUndefined();
    expect(usableImageUrl('https://avatars.githubusercontent.com/u/4000?s=400')).toBeUndefined();
  });

  it('keeps real avatars and photos', () => {
    expect(usableImageUrl('https://avatars.githubusercontent.com/u/164660?v=4')).toMatch(/s=400/);
    expect(usableImageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
  });
});
