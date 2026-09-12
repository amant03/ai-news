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

  it('skips rows without an index score', () => {
    const bad = { ...ROW, displayLabel: 'Broken', indexScore: null };
    expect(parseCodingRows(flightHtml(JSON.stringify([bad])))).toHaveLength(0);
  });

  it('returns [] for pages without rows', () => {
    expect(parseCodingRows('<html><body>no data here</body></html>')).toEqual([]);
  });
});
