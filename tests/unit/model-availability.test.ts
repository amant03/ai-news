import { describe, expect, it } from 'vitest';
import { officialConsole, harnessesFor, availabilityGroups } from '@/lib/model-availability';
import { CODING_AGENTS, type CodingAgent } from '@/lib/coding-agents-data';

function agent(label: string, provider: string, index: number): CodingAgent {
  return {
    label, agent: label.split(' - ')[0], provider, index, cost: 1,
    wallTime: 60, steps: 10, totalTokens: 1000, inputTokens: 800,
    outputTokens: 200, cacheTokens: 0, cacheHitRate: 0, evals: [],
  };
}

describe('officialConsole', () => {
  it('maps known providers', () => {
    expect(officialConsole('OpenAI')).toEqual({ label: 'OpenAI Platform', href: 'https://platform.openai.com' });
    expect(officialConsole('~openai')).toEqual({ label: 'OpenAI Platform', href: 'https://platform.openai.com' });
  });

  it('returns null instead of guessing for unknown providers', () => {
    expect(officialConsole('Obscure Lab')).toBeNull();
    expect(officialConsole(undefined)).toBeNull();
  });
});

describe('harnessesFor', () => {
  const agents = [
    agent('Codex - GPT-5.6 Sol (max)', 'openai', 66.6),
    agent('Codex - GPT-5.6 Sol (medium)', 'openai', 64.0),
    agent('Cursor CLI - GPT-5.5 (medium)', 'openai', 60.0),
    agent('Claude Code - Opus 5 (xhigh)', 'anthropic', 65.0),
  ];

  it('groups variants under one harness, ranked by best index', () => {
    const hits = harnessesFor({ name: 'GPT Sol Latest', provider: 'OpenAI' }, agents);
    expect(hits.map(h => h.harness)).toEqual(['Codex']);
    expect(hits[0].variants).toBe(2);
    expect(hits[0].bestIndex).toBe(66.6);
  });

  it('does not cross model lines or providers', () => {
    const hits = harnessesFor({ name: 'GPT Sol Latest', provider: 'OpenAI' }, agents);
    expect(hits.some(h => h.harness === 'Claude Code')).toBe(false);
    const opus = harnessesFor({ name: 'Claude Opus 5', provider: 'Anthropic' }, agents);
    expect(opus.map(h => h.harness)).toEqual(['Claude Code']);
  });
});

describe('harnessesFor (real board)', () => {
  it('finds harnesses for a frontier model', () => {
    const hits = harnessesFor({ name: 'GPT Sol Latest', provider: 'OpenAI' }, CODING_AGENTS);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].harness).toBeTruthy();
  });
});

describe('availabilityGroups', () => {
  it('omits empty groups and always offers provider comparison', () => {
    const groups = availabilityGroups(
      { id: 'x', name: 'Obscure Model 1', provider: 'Obscure Lab', source: 'test', family: 'closed' } as never,
      [],
      '/models/x/providers'
    );
    const titles = groups.map(g => g.title);
    expect(titles).not.toContain('Official API');
    expect(titles).not.toContain('Coding harnesses that run it');
    expect(titles).not.toContain('Self-host');
    const play = groups.find(g => g.title === 'Try it & compare prices');
    expect(play?.links.some(l => l.href === '/models/x/providers')).toBe(true);
  });

  it('shows self-host links for open-weights models', () => {
    const groups = availabilityGroups(
      { id: 'y', name: 'Llama 4 Maverick', provider: 'Meta', source: 'test', family: 'open-weights' } as never,
      [],
      '/models/y/providers'
    );
    expect(groups.map(g => g.title)).toContain('Self-host');
  });
});
