import { describe, expect, it } from 'vitest';
import {
  benchmarkFamilies,
  bestPerHarness,
  evalReward,
  modelOfRun,
  normalizeBenchmark,
  normalizeHarness,
  runsByModel,
  type CodingAgent,
} from '@/lib/coding-agents-data';

function agent(evals: Array<[string, number]>): CodingAgent {
  return {
    label: 'Test Agent',
    agent: 'Test',
    provider: 'test',
    index: 50,
    cost: 1,
    wallTime: 60,
    steps: 10,
    totalTokens: 1000,
    inputTokens: 800,
    outputTokens: 200,
    cacheTokens: 0,
    cacheHitRate: 0,
    evals: evals.map(([benchmark, reward]) => ({ benchmark, reward, inputTokens: 0, outputTokens: 0 })),
  };
}

describe('normalizeBenchmark', () => {
  it('strips version suffixes so AA renames keep matching', () => {
    expect(normalizeBenchmark('DeepSWE')).toBe('deepswe');
    expect(normalizeBenchmark('DeepSWE v1.1')).toBe('deepswe');
    expect(normalizeBenchmark('Terminal-Bench v2')).toBe('terminal-bench');
    expect(normalizeBenchmark('Terminal-Bench v4')).toBe('terminal-bench');
    expect(normalizeBenchmark('SWE-Atlas-QnA')).toBe('swe-atlas-qna');
  });
});

describe('benchmarkFamilies', () => {
  it('finds renamed benchmarks and labels them with the live version', () => {
    const agents = [
      agent([['DeepSWE v1.1', 0.6], ['Terminal-Bench v4', 0.5], ['SWE-Atlas-QnA', 0.4]]),
      agent([['DeepSWE v1.1', 0.7], ['Terminal-Bench v4', 0.55], ['SWE-Atlas-QnA', 0.45]]),
    ];
    const fams = benchmarkFamilies(agents);
    expect(fams.map(f => f.key)).toEqual(['deepswe', 'terminal-bench', 'swe-atlas-qna']);
    expect(fams.map(f => f.label)).toEqual(['DeepSWE v1.1', 'Terminal-Bench v4', 'SWE-Atlas-QnA']);
  });

  it('still matches the legacy slugs used by the static fallback', () => {
    const agents = [agent([['DeepSWE', 0.6], ['Terminal-Bench v2', 0.5]])];
    expect(benchmarkFamilies(agents).map(f => f.label)).toEqual(['DeepSWE', 'Terminal-Bench v2']);
  });
});

describe('harness helpers', () => {
  it('strips harness version suffixes', () => {
    expect(normalizeHarness('Antigravity SDK v0.1.12')).toBe('Antigravity SDK');
    expect(normalizeHarness('Claude Code')).toBe('Claude Code');
  });

  it('extracts the model from a run label', () => {
    expect(modelOfRun('Claude Code - Fable 5.1 (max) (with fallback)', 'Claude Code'))
      .toBe('Fable 5.1 (max) (with fallback)');
    expect(modelOfRun('Antigravity SDK - Gemini 3.8 Flash (high)', 'Antigravity SDK v0.1.12'))
      .toBe('Gemini 3.8 Flash (high)');
  });

  it('ranks best run per harness by index', () => {
    const board = bestPerHarness([
      { ...agent([]), agent: 'Claude Code', label: 'Claude Code - A', index: 40 },
      { ...agent([]), agent: 'Claude Code', label: 'Claude Code - B', index: 60 },
      { ...agent([]), agent: 'Codex', label: 'Codex - C', index: 50 },
    ]);
    expect(board.map(b => b.harness)).toEqual(['Claude Code', 'Codex']);
    expect(board[0].best.index).toBe(60);
    expect(board[0].runs).toBe(2);
  });

  it('groups runs by model, most-covered first', () => {
    const groups = runsByModel([
      { ...agent([]), agent: 'Claude Code', label: 'Claude Code - X', index: 40 },
      { ...agent([]), agent: 'Codex', label: 'Codex - X', index: 55 },
      { ...agent([]), agent: 'Cursor', label: 'Cursor - Y', index: 70 },
    ]);
    expect(groups[0].model).toBe('X');
    expect(groups[0].runs).toHaveLength(2);
    expect(groups[0].runs[0].index).toBe(55);
  });
});

describe('evalReward', () => {
  it('resolves rewards across old and new slugs', () => {
    const a = agent([['DeepSWE v1.1', 0.6431]]);
    expect(evalReward(a, 'deepswe')).toBeCloseTo(0.6431, 4);
    expect(evalReward(agent([['DeepSWE', 0.5]]), 'deepswe')).toBe(0.5);
  });

  it('returns null when the agent lacks the benchmark', () => {
    expect(evalReward(agent([]), 'deepswe')).toBeNull();
  });
});
