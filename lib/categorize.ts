import { Category, CATEGORY_LABEL } from './types';

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

export function categoryLabel(category: Category): string {
  return CATEGORY_LABEL[category] || category;
}
