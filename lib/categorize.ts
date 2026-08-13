import { Category, CATEGORY_LABEL, Domain } from './types';

export function categorizeContent(title: string, content = ''): Category {
  const text = `${title} ${content}`.toLowerCase();

  if (/\b(model|gpt-|claude|gemini|llama|mistral|deepseek|qwen|sonnet|opus|release|launch|introducing|debuts|unveil|frontier model|weights)\b/.test(text)) {
    return 'model';
  }
  if (/\b(research|paper|study|benchmark|arxiv|findings|scientists|researchers|preprint|evaluation)\b/.test(text)) {
    return 'research';
  }
  if (/\b(product|feature|update|tool|api|platform|app|launch|available|integration|acquisition|funding|ipo|startup)\b/.test(text)) {
    return 'product';
  }
  if (/\b(safety|alignment|security|guardrail|jailbreak|ransomware|vulnerability|malware|attack|abuse|deepfake|scam)\b/.test(text)) {
    return 'safety';
  }
  if (/\b(policy|regulation|governance|ethics|compliance|law|ban|restrict|block|lawsuit|court|legislation|act)\b/.test(text)) {
    return 'policy';
  }
  return 'other';
}

/**
 * Classify an item into an editorial domain: business / tech / research /
 * general. "Research" wins first (papers, arXiv, studies), then business
 * signals (funding, IPOs, revenue, deals), then pure tech/engineering.
 */
export function classifyDomain(title: string, content = ''): Domain {
  const text = `${title} ${content}`.toLowerCase();

  if (/\b(paper|arxiv|preprint|study|research|researchers|scientists|benchmark study|findings|evaluation|publication)\b/.test(text)) {
    return 'research';
  }
  if (/\b(funding|raise|raised|ipo|valuation|revenue|earnings|acquisition|merger|startup|investors|deal|billion|million|market cap|stock|share|quarterly|profit|loss|layoff|hiring)\b/.test(text)) {
    return 'business';
  }
  if (/\b(model|gpt-|claude|gemini|grok|llama|mistral|deepseek|qwen|sonnet|opus|haiku|weights|release|unveil|launch|api|sdk|framework|coding|agent|infrastructure|chip|gpu|training|inference)\b/.test(text)) {
    return 'tech';
  }
  return 'general';
}

export function categoryLabel(category: Category): string {
  return CATEGORY_LABEL[category] || category;
}
