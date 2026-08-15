/**
 * Comprehensive model timeline data for AI Trends analysis.
 * Each entry: model name, lab, release date, intelligence index, price ($/1M tokens), country.
 * Sources: Artificial Analysis, official announcements, press releases.
 */

export interface ModelTimeline {
  name: string;
  lab: string;
  date: string; // ISO date
  intelligence: number;
  price: number | null; // $/1M tokens avg, null = unknown
  speed: number | null; // tokens/sec, null = unknown
  country: string;
  isOpen: boolean;
}

export const LAB_COLORS: Record<string, string> = {
  'Anthropic': '#d97706',
  'OpenAI': '#10a37f',
  'Google': '#4285f4',
  'Meta': '#3b82f6',
  'xAI': '#6b7280',
  'DeepSeek': '#059669',
  'Alibaba': '#f97316',
  'Mistral': '#f59e0b',
  'NVIDIA': '#76b900',
  'Zhipu': '#ec4899',
  'Moonshot': '#8b5cf6',
  'MiniMax': '#ef4444',
  'Cohere': '#a855f7',
  'Kimi': '#3b82f6',
  'ByteDance': '#fe2c55',
  'Microsoft': '#00a4ef',
};

export const COUNTRY_COLORS: Record<string, string> = {
  'United States': '#1e40af',
  'China': '#dc2626',
  'France': '#2563eb',
  'United Kingdom': '#7c3aed',
  'Canada': '#059669',
  'Israel': '#d97706',
  'South Korea': '#0891b2',
  'Japan': '#be185d',
  'India': '#f97316',
  'UAE': '#16a34a',
};

export const MODELS_TIMELINE: ModelTimeline[] = [
  // === OpenAI ===
  { name: 'GPT-3', lab: 'OpenAI', date: '2020-06-11', intelligence: 8, price: null, speed: null, country: 'United States', isOpen: false },
  { name: 'GPT-3.5', lab: 'OpenAI', date: '2022-03-15', intelligence: 12, price: 2.0, speed: null, country: 'United States', isOpen: false },
  { name: 'GPT-4', lab: 'OpenAI', date: '2023-03-14', intelligence: 28, price: 30.0, speed: null, country: 'United States', isOpen: false },
  { name: 'GPT-4 Turbo', lab: 'OpenAI', date: '2023-11-06', intelligence: 30, price: 10.0, speed: null, country: 'United States', isOpen: false },
  { name: 'GPT-4o', lab: 'OpenAI', date: '2024-05-13', intelligence: 38, price: 2.5, speed: 80, country: 'United States', isOpen: false },
  { name: 'o1', lab: 'OpenAI', date: '2024-12-05', intelligence: 48, price: 15.0, speed: 30, country: 'United States', isOpen: false },
  { name: 'o3', lab: 'OpenAI', date: '2025-04-16', intelligence: 55, price: 10.0, speed: 40, country: 'United States', isOpen: false },
  { name: 'GPT-4.1', lab: 'OpenAI', date: '2025-04-14', intelligence: 50, price: 2.0, speed: 90, country: 'United States', isOpen: false },
  { name: 'o4-mini', lab: 'OpenAI', date: '2025-04-16', intelligence: 52, price: 1.1, speed: 120, country: 'United States', isOpen: false },
  { name: 'GPT-5.6', lab: 'OpenAI', date: '2026-07-08', intelligence: 61, price: 2.5, speed: 166, country: 'United States', isOpen: false },

  // === Anthropic ===
  { name: 'Claude 2', lab: 'Anthropic', date: '2023-07-11', intelligence: 18, price: 8.0, speed: null, country: 'United States', isOpen: false },
  { name: 'Claude 3 Haiku', lab: 'Anthropic', date: '2024-03-13', intelligence: 30, price: 0.25, speed: 150, country: 'United States', isOpen: false },
  { name: 'Claude 3 Opus', lab: 'Anthropic', date: '2024-03-13', intelligence: 36, price: 15.0, speed: 30, country: 'United States', isOpen: false },
  { name: 'Claude 3.5 Sonnet', lab: 'Anthropic', date: '2024-06-20', intelligence: 40, price: 3.0, speed: 80, country: 'United States', isOpen: false },
  { name: 'Claude 3.5 Haiku', lab: 'Anthropic', date: '2024-10-22', intelligence: 42, price: 0.8, speed: 120, country: 'United States', isOpen: false },
  { name: 'Claude Opus 4', lab: 'Anthropic', date: '2025-05-22', intelligence: 56, price: 15.0, speed: 30, country: 'United States', isOpen: false },
  { name: 'Claude Sonnet 4', lab: 'Anthropic', date: '2025-06-20', intelligence: 52, price: 3.0, speed: 80, country: 'United States', isOpen: false },
  { name: 'Claude Fable 5', lab: 'Anthropic', date: '2026-06-12', intelligence: 62, price: 15.0, speed: 25, country: 'United States', isOpen: false },
  { name: 'Claude Opus 5', lab: 'Anthropic', date: '2026-08-01', intelligence: 63, price: 15.0, speed: 20, country: 'United States', isOpen: false },

  // === Google ===
  { name: 'PaLM 2', lab: 'Google', date: '2023-05-10', intelligence: 20, price: 4.0, speed: null, country: 'United States', isOpen: false },
  { name: 'Gemini 1.0 Pro', lab: 'Google', date: '2023-12-06', intelligence: 25, price: 2.0, speed: 60, country: 'United States', isOpen: false },
  { name: 'Gemini 1.5 Pro', lab: 'Google', date: '2024-02-15', intelligence: 35, price: 3.5, speed: 70, country: 'United States', isOpen: false },
  { name: 'Gemini 1.5 Flash', lab: 'Google', date: '2024-05-14', intelligence: 30, price: 0.075, speed: 200, country: 'United States', isOpen: false },
  { name: 'Gemini 2.0 Flash', lab: 'Google', date: '2024-12-11', intelligence: 40, price: 0.1, speed: 250, country: 'United States', isOpen: false },
  { name: 'Gemini 2.5 Pro', lab: 'Google', date: '2025-03-25', intelligence: 55, price: 1.25, speed: 150, country: 'United States', isOpen: false },
  { name: 'Gemini 2.5 Flash', lab: 'Google', date: '2025-04-09', intelligence: 48, price: 0.15, speed: 340, country: 'United States', isOpen: false },
  { name: 'Gemini 3.7 Flash', lab: 'Google', date: '2026-06-01', intelligence: 56, price: 0.08, speed: 340, country: 'United States', isOpen: false },

  // === Meta ===
  { name: 'Llama 2', lab: 'Meta', date: '2023-07-18', intelligence: 14, price: null, speed: null, country: 'United States', isOpen: true },
  { name: 'Llama 3 70B', lab: 'Meta', date: '2024-04-18', intelligence: 28, price: 0.8, speed: 60, country: 'United States', isOpen: true },
  { name: 'Llama 3.1 405B', lab: 'Meta', date: '2024-07-23', intelligence: 35, price: 2.0, speed: 30, country: 'United States', isOpen: true },
  { name: 'Llama 3.2', lab: 'Meta', date: '2024-09-25', intelligence: 32, price: 0.5, speed: 100, country: 'United States', isOpen: true },
  { name: 'Llama 3.3 70B', lab: 'Meta', date: '2024-12-06', intelligence: 38, price: 0.6, speed: 80, country: 'United States', isOpen: true },
  { name: 'Llama 4 Maverick', lab: 'Meta', date: '2025-04-05', intelligence: 53, price: 0.3, speed: 111, country: 'United States', isOpen: true },
  { name: 'Llama 4 Scout', lab: 'Meta', date: '2025-04-05', intelligence: 45, price: 0.15, speed: 180, country: 'United States', isOpen: true },

  // === xAI ===
  { name: 'Grok-1', lab: 'xAI', date: '2023-11-04', intelligence: 15, price: null, speed: null, country: 'United States', isOpen: true },
  { name: 'Grok-2', lab: 'xAI', date: '2024-08-13', intelligence: 32, price: 3.0, speed: 60, country: 'United States', isOpen: false },
  { name: 'Grok-3', lab: 'xAI', date: '2025-02-17', intelligence: 52, price: 3.0, speed: 90, country: 'United States', isOpen: false },
  { name: 'Grok 4.6', lab: 'xAI', date: '2026-03-15', intelligence: 61, price: 3.0, speed: 69, country: 'United States', isOpen: false },

  // === DeepSeek ===
  { name: 'DeepSeek V2', lab: 'DeepSeek', date: '2024-05-06', intelligence: 22, price: 0.14, speed: 60, country: 'China', isOpen: true },
  { name: 'DeepSeek V3', lab: 'DeepSeek', date: '2024-12-26', intelligence: 40, price: 0.27, speed: 60, country: 'China', isOpen: true },
  { name: 'DeepSeek R1', lab: 'DeepSeek', date: '2025-01-20', intelligence: 45, price: 0.55, speed: 30, country: 'China', isOpen: true },
  { name: 'DeepSeek V4', lab: 'DeepSeek', date: '2025-06-01', intelligence: 53, price: 0.35, speed: 90, country: 'China', isOpen: true },

  // === Alibaba (Qwen) ===
  { name: 'Qwen 1.5 72B', lab: 'Alibaba', date: '2024-02-05', intelligence: 22, price: 0.5, speed: 50, country: 'China', isOpen: true },
  { name: 'Qwen 2 72B', lab: 'Alibaba', date: '2024-06-07', intelligence: 28, price: 0.4, speed: 60, country: 'China', isOpen: true },
  { name: 'Qwen 2.5 72B', lab: 'Alibaba', date: '2024-09-19', intelligence: 33, price: 0.35, speed: 70, country: 'China', isOpen: true },
  { name: 'Qwen 3 235B', lab: 'Alibaba', date: '2025-04-29', intelligence: 50, price: 0.4, speed: 50, country: 'China', isOpen: true },
  { name: 'Qwen 3.5 397B', lab: 'Alibaba', date: '2026-02-16', intelligence: 58, price: 0.39, speed: 45, country: 'China', isOpen: true },

  // === Mistral ===
  { name: 'Mistral 7B', lab: 'Mistral', date: '2023-09-27', intelligence: 12, price: null, speed: 120, country: 'France', isOpen: true },
  { name: 'Mixtral 8x7B', lab: 'Mistral', date: '2023-12-11', intelligence: 18, price: 0.3, speed: 100, country: 'France', isOpen: true },
  { name: 'Mistral Large', lab: 'Mistral', date: '2024-02-26', intelligence: 30, price: 4.0, speed: 40, country: 'France', isOpen: false },
  { name: 'Mistral Large 2', lab: 'Mistral', date: '2024-07-24', intelligence: 35, price: 2.0, speed: 50, country: 'France', isOpen: false },
  { name: 'Pixtral Large', lab: 'Mistral', date: '2024-11-18', intelligence: 38, price: 2.0, speed: 50, country: 'France', isOpen: false },
  { name: 'Mistral Medium 3', lab: 'Mistral', date: '2025-06-10', intelligence: 45, price: 0.8, speed: 80, country: 'France', isOpen: false },

  // === Zhipu (GLM) ===
  { name: 'GLM-4', lab: 'Zhipu', date: '2024-01-16', intelligence: 22, price: 0.7, speed: 50, country: 'China', isOpen: false },
  { name: 'GLM-4.7', lab: 'Zhipu', date: '2024-12-22', intelligence: 34, price: 0.4, speed: 60, country: 'China', isOpen: true },
  { name: 'GLM-5.1', lab: 'Zhipu', date: '2026-04-07', intelligence: 47, price: 0.97, speed: 55, country: 'China', isOpen: true },

  // === Moonshot (Kimi) ===
  { name: 'Kimi', lab: 'Moonshot', date: '2024-03-20', intelligence: 20, price: 0.7, speed: 40, country: 'China', isOpen: false },
  { name: 'Kimi K2', lab: 'Moonshot', date: '2025-01-15', intelligence: 35, price: 0.6, speed: 50, country: 'China', isOpen: false },
  { name: 'Kimi K3', lab: 'Moonshot', date: '2026-05-01', intelligence: 60, price: 1.0, speed: 45, country: 'China', isOpen: false },

  // === MiniMax ===
  { name: 'MiniMax-01', lab: 'MiniMax', date: '2025-01-15', intelligence: 30, price: 0.5, speed: 60, country: 'China', isOpen: false },
  { name: 'MiniMax M3', lab: 'MiniMax', date: '2026-04-01', intelligence: 45, price: 0.8, speed: 50, country: 'China', isOpen: false },

  // === NVIDIA ===
  { name: 'Nemotron 4 340B', lab: 'NVIDIA', date: '2024-06-24', intelligence: 25, price: 0.5, speed: 40, country: 'United States', isOpen: true },
  { name: 'Nemotron 3 Ultra', lab: 'NVIDIA', date: '2025-03-01', intelligence: 42, price: 0.6, speed: 156, country: 'United States', isOpen: true },

  // === Cohere ===
  { name: 'Command R+', lab: 'Cohere', date: '2024-04-04', intelligence: 25, price: 1.5, speed: 60, country: 'Canada', isOpen: false },
  { name: 'Command A', lab: 'Cohere', date: '2025-02-10', intelligence: 38, price: 1.0, speed: 70, country: 'Canada', isOpen: false },

  // === Space XAI (Grok separate) ===
  // Already covered under xAI

  // === Motif Technologies ===
  { name: 'Muse Spark 1/2', lab: 'Motif Technologies', date: '2026-01-15', intelligence: 53, price: 0.4, speed: 111, country: 'United States', isOpen: false },

  // === ByteDance ===
  { name: 'Doubao Pro', lab: 'ByteDance', date: '2024-08-01', intelligence: 28, price: 0.3, speed: 80, country: 'China', isOpen: false },
  { name: 'Doubao 1.5 Pro', lab: 'ByteDance', date: '2025-04-01', intelligence: 40, price: 0.25, speed: 100, country: 'China', isOpen: false },

  // === Microsoft ===
  { name: 'Phi-3', lab: 'Microsoft', date: '2024-04-22', intelligence: 22, price: 0.1, speed: 120, country: 'United States', isOpen: true },
  { name: 'Phi-4', lab: 'Microsoft', date: '2024-12-12', intelligence: 30, price: 0.07, speed: 150, country: 'United States', isOpen: true },
];

/** Get unique labs sorted by their latest model's intelligence score */
export function getLabsByLatestIntelligence(): string[] {
  const labLatest: Record<string, number> = {};
  for (const m of MODELS_TIMELINE) {
    if (!labLatest[m.lab] || m.intelligence > labLatest[m.lab]) {
      labLatest[m.lab] = m.intelligence;
    }
  }
  return Object.entries(labLatest)
    .sort(([, a], [, b]) => b - a)
    .map(([lab]) => lab);
}

/** Get models for a specific lab, sorted by date */
export function getLabModels(lab: string): ModelTimeline[] {
  return MODELS_TIMELINE
    .filter(m => m.lab === lab)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Get best model per lab */
export function getBestModelPerLab(): Array<{ lab: string; model: ModelTimeline }> {
  const best: Record<string, ModelTimeline> = {};
  for (const m of MODELS_TIMELINE) {
    if (!best[m.lab] || m.intelligence > best[m.lab].intelligence) {
      best[m.lab] = m;
    }
  }
  return Object.entries(best)
    .sort(([, a], [, b]) => b.intelligence - a.intelligence)
    .map(([lab, model]) => ({ lab, model }));
}

/** Get models grouped by country */
export function getModelsByCountry(): Record<string, ModelTimeline[]> {
  const grouped: Record<string, ModelTimeline[]> = {};
  for (const m of MODELS_TIMELINE) {
    (grouped[m.country] = grouped[m.country] || []).push(m);
  }
  return grouped;
}
