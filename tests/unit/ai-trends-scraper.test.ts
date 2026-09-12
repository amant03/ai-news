import { describe, expect, it } from 'vitest';
import { parseTrendModels, buildTrendDataset } from '@/lib/ai-trends-scraper';

function flightHtml(innerJson: string): string {
  const payload = `x{"initialModels":${innerJson}}y`;
  const escaped = JSON.stringify(payload).slice(1, -1);
  return `<html><body><script>self.__next_f.push([1,"${escaped}"])</script></body></html>`;
}

const ROW = {
  slug: 'gpt-6-astra',
  name: 'GPT-6 Astra (max)',
  shortName: 'GPT-6 Astra (max)',
  releaseDate: '2026-09-01',
  intelligenceIndex: 55.1,
  price1mBlended7To2To1: 7.175,
  medianOutputSpeed: 65.0,
  isOpenWeights: false,
  inferenceParametersActiveBillions: null,
  parameters: null,
  contextWindowTokens: 1000000,
  creator: { name: 'OpenAI', slug: 'openai', color: '#10a37f', country: 'us' },
};

describe('parseTrendModels', () => {
  it('extracts the frontier series', () => {
    const rows = parseTrendModels(flightHtml(JSON.stringify([ROW])));
    expect(rows).toHaveLength(1);
    expect(rows[0].slug).toBe('gpt-6-astra');
  });

  it('returns [] without the payload', () => {
    expect(parseTrendModels('<html><body>nothing</body></html>')).toEqual([]);
  });
});

describe('buildTrendDataset', () => {
  const slim = [
    {
      id: 'openai/gpt-6-astra', name: 'GPT-6 Astra', provider: 'OpenAI', source: 'openrouter',
      family: 'closed', released: '2026-09-01', intelligenceIndex: 55.5,
      promptPrice: 4, completionPrice: 20, aaSpeed: 60, params: undefined, context: '1M',
    },
  ];

  it('prefers slim metrics and fills creator meta from the scrape', () => {
    const out = buildTrendDataset(slim as never, [ROW]);
    expect(out).toHaveLength(1);
    expect(out[0].intelligence).toBe(55.5); // slim wins
    expect(out[0].country).toBe('United States');
    expect(out[0].color).toBe('#10a37f');
  });

  it('adds scrape-only models and drops dateless records', () => {
    const only = { ...ROW, slug: 'brand-new', name: 'Brand New', releaseDate: '2026-10-01' };
    const bad = { ...ROW, slug: 'nodate', name: 'No Date', releaseDate: undefined };
    const out = buildTrendDataset([], [only, bad]);
    expect(out.map(p => p.slug)).toEqual(['brand-new']);
  });
});
