import fs from 'fs';
import path from 'path';
import { Category } from './types';
import { categorizeContent } from './categorize';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

const CACHE_FILE = path.join(process.cwd(), 'data', 'summary-cache.json');

interface OllamaResponse {
  summary: string;
  category: Category;
}

let ollamaAvailable: boolean | null = null;

export async function checkOllama(): Promise<boolean> {
  if (ollamaAvailable !== null) return ollamaAvailable;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
    ollamaAvailable = res.ok;
  } catch {
    ollamaAvailable = false;
  }
  return ollamaAvailable;
}

export async function summarizeAndCategorize(
  title: string,
  content: string
): Promise<OllamaResponse> {
  const defaultResponse: OllamaResponse = {
    summary: content.slice(0, 200) || title,
    category: categorizeContent(title, content),
  };

  const available = await checkOllama();
  if (!available) return defaultResponse;

  try {
    const prompt = `You are an AI news editor. Analyze this AI news item and provide:
1. A concise 1-2 sentence summary
2. A category from: model, research, product, safety, policy, other

Return ONLY valid JSON: {"summary": "...", "category": "..."}

Title: ${title}
Content: ${content.slice(0, 600)}`;

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        format: 'json',
        stream: false,
        options: { temperature: 0.3, num_predict: 220 },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return defaultResponse;
    const data = await response.json();
    let parsed: Partial<OllamaResponse>;
    try {
      parsed = JSON.parse(data.response || '{}');
    } catch {
      return defaultResponse;
    }

    return {
      summary: (parsed.summary || defaultResponse.summary).slice(0, 400),
      category: validateCategory(parsed.category) || defaultResponse.category,
    };
  } catch {
    return defaultResponse;
  }
}

export function validateCategory(cat?: string): Category | null {
  if (!cat) return null;
  const valid: Category[] = ['model', 'research', 'product', 'safety', 'policy', 'other'];
  const lower = cat.toLowerCase();
  if (valid.includes(lower as Category)) return lower as Category;
  return null;
}

// ---- Enrichment cache (avoids re-summarizing the same headline across runs) ----

export type SummaryCache = Map<string, OllamaResponse>;

export function loadSummaryCache(): SummaryCache {
  const map: SummaryCache = new Map();
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as Record<string, OllamaResponse>;
      for (const [k, v] of Object.entries(raw)) {
        map.set(k.toLowerCase(), v);
      }
    }
  } catch {
    /* ignore */
  }
  return map;
}

export function saveSummaryCache(cache: SummaryCache) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, OllamaResponse> = {};
    for (const [k, v] of cache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    /* ignore */
  }
}

function cacheKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);
}

/**
 * Enrich an item's summary + category, using a shared cache.
 * Falls back to keyword categorization + snippet when Ollama is unavailable.
 */
export async function enrichItem(
  title: string,
  content: string,
  cache: SummaryCache
): Promise<OllamaResponse> {
  const key = cacheKey(title);
  if (!key) return { summary: content.slice(0, 200), category: categorizeContent(title, content) };

  const cached = cache.get(key);
  if (cached) return cached;

  const result = await summarizeAndCategorize(title, content);
  cache.set(key, result);
  return result;
}

export const sum = summarizeAndCategorize;
