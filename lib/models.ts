import { NewsItem } from './types';

/**
 * Curated registry of frontier AI models with capability data points.
 * This powers the "Model Watch" section of the UI. Auto-updated by the agent
 * (weaves model-release headlines in), and periodically refreshed here as
 * the frontier moves.
 *
 * Note: figures are representative snapshot data points for the frontier
 * dashboard. Benchmarks differ across evaluation suites and versions; treat
 * them as directional comparisons, not lab-grade scores.
 */

export interface ModelEntry {
  id: string;
  name: string;
  provider: string;
  source: string;
  released: string; // ISO date
  family: 'closed' | 'open' | 'open-weights';
  params: string; // human friendly, e.g. "671B"
  context: string; // e.g. "128K"
  description: string;
  benchmarks?: Partial<Record<BenchKey, number | string>>;
  tags?: string[];
}

export type BenchKey =
  | 'elo'      // LMArena Elo
  | 'mmlu'     // MMLU-Pro (%)
  | 'gpqa'     // GPQA Diamond (%)
  | 'math'     // MATH-500 (%)
  | 'swe'      // SWE-bench Verified (%)
  | 'code'     // LiveCodeBench (%)
  | 'r1';      // Reasoning pass@1 (e.g. GPQA diamond w/ reasoning)

export const BENCH_LABELS: Record<BenchKey, string> = {
  elo: 'LMArena Elo',
  mmlu: 'MMLU-Pro',
  gpqa: 'GPQA Diamond',
  math: 'MATH-500',
  swe: 'SWE-bench Verified',
  code: 'LiveCodeBench',
  r1: 'Reasoning',
};

export const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: '#10a37f',
  Anthropic: '#d97706',
  Google: '#4285f4',
  xAI: '#e2e8f0',
  Meta: '#3b82f6',
  Mistral: '#f97316',
  DeepSeek: '#059669',
  Qwen: '#7c3aed',
  'Hugging Face': '#ffd21e',
  Microsoft: '#00a4ef',
  Moonshot: '#8b5cf6',
  Zhipu: '#f472b6',
  'Z-ai': '#f472b6',
  'Z.ai': '#f472b6',
  Ollama: '#94a3b8',
  Amazon: '#ff9900',
  NVIDIA: '#76b900',
  Cohere: '#d18ee2',
  Perplexity: '#20b8cd',
  MiniMax: '#ff6b6b',
  ByteDance: '#fe2c55',
  Groq: '#f97316',
  'Together AI': '#0ea5e9',
  Fireworks: '#fb7185',
};

export function providerColor(provider: string): string {
  if (PROVIDER_COLORS[provider]) return PROVIDER_COLORS[provider];
  const hit = Object.keys(PROVIDER_COLORS).find(k => k.toLowerCase() === provider.toLowerCase());
  return hit ? PROVIDER_COLORS[hit] : '#94a3b8';
}

export interface ModelLink {
  label: string;
  href: string;
}

/** Public pages where a user can verify a model's numbers. */
export function modelSourceLinks(m: {
  id: string;
  name: string;
  source: string;
  elo?: number;
  intelligenceIndex?: number;
  hfDownloads?: number;
}): ModelLink[] {
  const links: ModelLink[] = [];
  const id = m.id.replace(/^(ollama|lmarena|freellm)\//, '');

  if (m.source === 'openrouter' || (/^[a-z0-9.-]+\/[a-z0-9._-]+$/i.test(m.id) && m.source !== 'huggingface' && m.source !== 'ollama')) {
    links.push({ label: 'OpenRouter', href: `https://openrouter.ai/${m.id}` });
  }
  if (m.source === 'huggingface' && m.id.includes('/')) {
    links.push({ label: 'Hugging Face', href: `https://huggingface.co/${m.id}` });
  } else if (m.hfDownloads && m.id.includes('/') && m.source !== 'ollama') {
    links.push({ label: 'Hugging Face', href: `https://huggingface.co/${m.id}` });
  }
  if (m.source === 'ollama') {
    links.push({ label: 'Ollama', href: `https://ollama.com/library/${id}` });
  }
  if (m.elo !== undefined) {
    links.push({ label: 'LM Arena', href: 'https://lmarena.ai/leaderboard/text' });
  }
  if (m.source === 'freellm') {
    links.push({ label: 'FreeLLM', href: 'https://freellm.sh/' });
  }
  return links;
}

/**
 * The current frontier. Kept in rough recency order. These entries get merged
 * with live headlines in the Model Watch API.
 */
export const MODELS: ModelEntry[] = [
  {
    id: 'gpt-5.6',
    name: 'GPT-5.6',
    provider: 'OpenAI',
    source: 'openai',
    released: '2026-07-08',
    family: 'closed',
    params: '—',
    context: '1M',
    description: "OpenAI's flagship with three tiers (Soul, Terra, Luna). Soul beat Claude on coding benchmarks.",
    benchmarks: { swe: 82, code: 79, elo: '1400+', mmlu: 89, gpqa: 88 },
    tags: ['flagship', 'multi-modal'],
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    provider: 'Anthropic',
    source: 'anthropic',
    released: '2026-07-01',
    family: 'closed',
    params: '—',
    context: '1M',
    description: 'Most capable Sonnet yet. 63.2% agentic coding, launched at $2/M input tokens.',
    benchmarks: { swe: 63, code: 71, mmlu: 87, gpqa: 85 },
    tags: ['agentic', 'coding'],
  },
  {
    id: 'claude-fable-5',
    name: 'Claude Fable 5',
    provider: 'Anthropic',
    source: 'anthropic',
    released: '2026-06-12',
    family: 'closed',
    params: '—',
    context: '1M',
    description: 'Frontier reasoning model, briefly blocked by US export controls in July 2026.',
    benchmarks: { swe: 78, elo: '1390', mmlu: 88, gpqa: 90 },
    tags: ['reasoning'],
  },
  {
    id: 'grok-5',
    name: 'Grok 5',
    provider: 'xAI',
    source: 'xai',
    released: '2026-06-20',
    family: 'closed',
    params: '—',
    context: '256K',
    description: "Elon Musk's xAI flagship. Trained on the Colossus cluster, native multi-modal.",
    benchmarks: { swe: 74, code: 72, elo: '1375', mmlu: 87, gpqa: 86 },
    tags: ['flagship', 'multi-modal'],
  },
  {
    id: 'gemini-3',
    name: 'Gemini 3',
    provider: 'Google',
    source: 'google',
    released: '2026-06-05',
    family: 'closed',
    params: '—',
    context: '1M+',
    description: "Google's unified flagship spanning text, images, audio and code.",
    benchmarks: { swe: 76, code: 74, elo: '1380', mmlu: 88, gpqa: 87 },
    tags: ['flagship', 'multi-modal', 'long-context'],
  },
  {
    id: 'deepseek-r2',
    name: 'DeepSeek R2',
    provider: 'DeepSeek',
    source: 'deepseek',
    released: '2026-05-15',
    family: 'open-weights',
    params: '671B (MoE)',
    context: '128K',
    description: 'Open-weights MoE reasoning model that made Western labs cut API prices.',
    benchmarks: { swe: 69, code: 70, elo: '1360', mmlu: 86, gpqa: 88 },
    tags: ['open-weights', 'reasoning', 'MoE'],
  },
  {
    id: 'qwen3-max',
    name: 'Qwen3-Max',
    provider: 'Qwen',
    source: 'qwen',
    released: '2026-05-02',
    family: 'open-weights',
    params: '~600B (MoE)',
    context: '256K',
    description: "Alibaba's top-tier open-weights model, competitive with GPT-5 class.",
    benchmarks: { swe: 66, code: 68, elo: '1345', mmlu: 85, gpqa: 84 },
    tags: ['open-weights', 'MoE'],
  },
  {
    id: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    source: 'meta',
    released: '2026-04-05',
    family: 'open-weights',
    params: '400B (MoE)',
    context: '1M',
    description: "Meta's hybrid model with native multi-modal understanding.",
    benchmarks: { swe: 58, code: 60, elo: '1290', mmlu: 84, gpqa: 80 },
    tags: ['open-weights', 'multi-modal'],
  },
  {
    id: 'mistral-large-3',
    name: 'Mistral Large 3',
    provider: 'Mistral',
    source: 'mistral',
    released: '2026-03-10',
    family: 'closed',
    params: '~400B',
    context: '128K',
    description: 'European champion; strong multilingual + agentic coding.',
    benchmarks: { swe: 61, code: 63, elo: '1310', mmlu: 85, gpqa: 82 },
    tags: ['european', 'multilingual'],
  },
  {
    id: 'grok-code',
    name: 'Grok Code',
    provider: 'xAI',
    source: 'xai',
    released: '2026-06-25',
    family: 'closed',
    params: '—',
    context: '256K',
    description: "xAI's coding-specialist, paired with Cursor. Musk pushes it hard on X.",
    benchmarks: { code: 75, swe: 73 },
    tags: ['coding', 'agentic'],
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    source: 'openai',
    released: '2026-06-01',
    family: 'closed',
    params: '—',
    context: '128K',
    description: 'Fast, cheap OpenAI model for high-throughput agents.',
    benchmarks: { code: 68, mmlu: 82, elo: '1260' },
    tags: ['fast', 'cheap'],
  },
  {
    id: 'claude-haiku-4',
    name: 'Claude Haiku 4',
    provider: 'Anthropic',
    source: 'anthropic',
    released: '2026-05-20',
    family: 'closed',
    params: '—',
    context: '200K',
    description: "Anthropic's low-latency workhorse for agents.",
    benchmarks: { code: 66, mmlu: 83, elo: '1285' },
    tags: ['fast', 'agentic'],
  },
];

export function findModelsInItems(items: NewsItem[], limit = 12): ModelEntry[] {
  // Heuristic: match known model names in recent headlines, fall back to the
  // curated registry for the section so it's never empty.
  const matched = new Set<string>();
  const out: ModelEntry[] = [];

  for (const item of items.slice(0, 200)) {
    const title = item.title.toLowerCase();
    for (const m of MODELS) {
      if (matched.has(m.id)) continue;
      if (title.includes(m.name.toLowerCase()) || title.includes(m.provider.toLowerCase())) {
        matched.add(m.id);
        out.push(m);
        if (out.length >= limit) return out;
      }
    }
  }

  for (const m of MODELS) {
    if (out.length >= limit) break;
    if (!matched.has(m.id)) out.push(m);
  }

  return out;
}

export function topBenchmarked(): ModelEntry[] {
  return [...MODELS].sort((a, b) => {
    const eloA = typeof a.benchmarks?.elo === 'number' ? a.benchmarks.elo : 0;
    const eloB = typeof b.benchmarks?.elo === 'number' ? b.benchmarks.elo : 0;
    return eloB - eloA;
  });
}