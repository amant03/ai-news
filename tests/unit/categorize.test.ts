import { describe, expect, it } from 'vitest';
import { categorizeContent, classifyDomain } from '@/lib/categorize';

describe('categorizeContent', () => {
  it('detects model releases', () => {
    expect(categorizeContent('OpenAI launches GPT-5 with frontier weights', '')).toBe('model');
  });

  it('detects research papers', () => {
    expect(categorizeContent('New preprint: evaluation of reasoning models on arXiv', '')).toBe('research');
  });

  it('detects safety incidents', () => {
    expect(categorizeContent('Major jailbreak vulnerability found in popular chatbot', '')).toBe('safety');
  });

  it('detects policy news', () => {
    expect(categorizeContent('Senate passes AI regulation legislation', '')).toBe('policy');
  });

  it('falls back to other', () => {
    expect(categorizeContent('Local weather remains pleasant this weekend', '')).toBe('other');
  });
});

describe('classifyDomain', () => {
  it('prioritizes research for papers', () => {
    expect(classifyDomain('Study: benchmark findings from researchers', '')).toBe('research');
  });

  it('detects business for funding news', () => {
    expect(classifyDomain('Startup raises $40M Series B at $1B valuation', '')).toBe('business');
  });

  it('detects tech for model/API news', () => {
    expect(classifyDomain('New open weights release with 128K context API', '')).toBe('tech');
  });

  it('falls back to general', () => {
    expect(classifyDomain('A pleasant essay about weekend hobbies', '')).toBe('general');
  });
});
