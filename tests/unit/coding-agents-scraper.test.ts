import { describe, expect, it } from 'vitest';
import { parseCodingRows } from '@/lib/coding-agents-scraper';

function flightHtml(rowsJson: string): string {
  const payload = `x"$L1c"null{"rows":${rowsJson}}y`;
  const escaped = JSON.stringify(payload).slice(1, -1);
  return `<html><body><script>self.__next_f.push([1,"${escaped}"])</script></body></html>`;
}

const ROW = {
  displayLabel: 'Codex - GPT-6 Astra (max)',
  agentName: 'Codex',
  provider: 'openai',
  indexScore: 0.6164504498789397,
  mean: {
    costUsd: 7.081,
    agentWallTimeSec: 610.4,
    steps: 114.2,
    inputTokens: 6812390.1,
    outputTokens: 54860.4,
    cacheTokens: 6360943.2,
    cacheHitRate: 0.89912,
    totalTokens: 13228192.7,
  },
  evals: [
    { evaluationDatasetSlug: 'DeepSWE v1.1', mean: { reward: 0.68731, inputTokens: 9770635, outputTokens: 88016 } },
    { evaluationDatasetSlug: 'SWE-Atlas-QnA', mean: { reward: 0.4328, inputTokens: 7897843, outputTokens: 47042 } },
  ],
};

describe('parseCodingRows', () => {
  it('parses flight rows into agent records', () => {
    const agents = parseCodingRows(flightHtml(JSON.stringify([ROW])));
    expect(agents).toHaveLength(1);
    const a = agents[0];
    expect(a.label).toBe('Codex - GPT-6 Astra (max)');
    expect(a.agent).toBe('Codex');
    expect(a.index).toBeCloseTo(61.6, 1);
    expect(a.cost).toBeCloseTo(7.08, 2);
    expect(a.wallTime).toBe(610);
    expect(a.evals).toHaveLength(2);
    expect(a.evals[0]).toMatchObject({ benchmark: 'DeepSWE v1.1' });
    expect(a.evals[0].reward).toBeCloseTo(0.6873, 4);
  });

  it('captures AA detail fields (display, weights, safety, sums, percentiles, versions)', () => {
    const rich = {
      ...ROW,
      display: { agent: 'Codex', model: 'GPT-6 Astra (max)', creator: { agent: 'OpenAI', model: 'OpenAI' } },
      hostModelSlug: 'openai_gpt-6-astra',
      isHighlighted: true,
      mean: { ...ROW.mean, cacheWriteTokens: 111.2 },
      sums: { costUsd: 99.99 },
      percentiles: {
        costUsd: { p05: 1, p25: 2, p50: 3, p75: 4, p95: 5 },
        totalTokens: { p05: 10, p25: 20, p50: 30, p75: 40, p95: 50 },
      },
      versions: { 'deep-swe-v1.1': { min: { version: '2.1.263', dateReleased: '2026-09-06' } } },
      safety: { attemptCount: 10, refusedAttemptCount: 1, hardStopAttemptCount: 0, recoveredAttemptCount: 1, fallbackAttemptCount: 0, continuedAttemptCount: 0, rate: 0.1 },
      evals: [
        { evaluationDatasetSlug: 'DeepSWE v1.1', datasetIndexName: 'deep-swe-v1.1', weight: 0.3333, mean: { reward: 0.5, inputTokens: 100, cacheWriteTokens: 10, outputTokens: 20 } },
      ],
    };
    const agents = parseCodingRows(flightHtml(JSON.stringify([rich])));
    expect(agents).toHaveLength(1);
    const a = agents[0];
    expect(a.model).toBe('GPT-6 Astra (max)');
    expect(a.creator).toBe('OpenAI');
    expect(a.hostModelSlug).toBe('openai_gpt-6-astra');
    expect(a.cacheWriteTokens).toBe(111);
    expect(a.totalCostUsd).toBeCloseTo(99.99, 2);
    expect(a.costPercentiles).toMatchObject({ p05: 1, p50: 3, p95: 5 });
    expect(a.harnessVersions).toMatchObject({ 'deep-swe-v1.1': { version: '2.1.263' } });
    expect(a.safety).toMatchObject({ attempts: 10, refused: 1 });
    expect(a.evals[0]).toMatchObject({ datasetIndexName: 'deep-swe-v1.1', weight: 0.3333, cacheWriteTokens: 10 });
  });

  it('skips rows without an index score', () => {
    const bad = { ...ROW, displayLabel: 'Broken', indexScore: null };
    expect(parseCodingRows(flightHtml(JSON.stringify([bad])))).toHaveLength(0);
  });

  it('returns [] for pages without rows', () => {
    expect(parseCodingRows('<html><body>no data here</body></html>')).toEqual([]);
  });
});
