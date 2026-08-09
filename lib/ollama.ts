import { Category } from './types';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = 'llama3.2:3b';

interface OllamaResponse {
  summary: string;
  category: Category;
}

export async function summarizeAndCategorize(
  title: string,
  content: string
): Promise<OllamaResponse> {
  // Default fallback if Ollama is unavailable
  const defaultResponse: OllamaResponse = {
    summary: content.slice(0, 200),
    category: categorizeBasic(title + ' ' + content),
  };

  try {
    const prompt = `You are an AI news editor. Analyze this AI news item and provide:
1. A concise 1-2 sentence summary
2. A category from: model, research, product, safety, policy, other

Return ONLY valid JSON: {"summary": "...", "category": "..."}

Title: ${title}
Content: ${content.slice(0, 500)}`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 200,
        },
      }),
    });

    if (!response.ok) {
      console.log('Ollama not available, using fallback categorization');
      return defaultResponse;
    }

    const data = await response.json();
    const parsed = JSON.parse(data.response);
    
    return {
      summary: parsed.summary || defaultResponse.summary,
      category: validateCategory(parsed.category) || defaultResponse.category,
    };
  } catch (error) {
    console.log('Ollama error, using fallback:', error instanceof Error ? error.message : error);
    return defaultResponse;
  }
}

function categorizeBasic(text: string): Category {
  const lower = text.toLowerCase();
  
  if (/\b(model|gpt|claude|gemini|llama|mistral|release|launch|introducing)\b/.test(lower)) {
    return 'model';
  }
  if (/\b(research|paper|study|benchmark|arxiv)\b/.test(lower)) {
    return 'research';
  }
  if (/\b(product|feature|update|tool|api|platform)\b/.test(lower)) {
    return 'product';
  }
  if (/\b(safety|alignment|security|guardrail)\b/.test(lower)) {
    return 'safety';
  }
  if (/\b(policy|regulation|governance)\b/.test(lower)) {
    return 'policy';
  }
  return 'other';
}

function validateCategory(cat: string): Category | null {
  const valid: Category[] = ['model', 'research', 'product', 'safety', 'policy', 'other'];
  const lower = cat.toLowerCase();
  if (valid.includes(lower as Category)) {
    return lower as Category;
  }
  return null;
}

// Also export as `sum` for shorter import
export const sum = summarizeAndCategorize;

