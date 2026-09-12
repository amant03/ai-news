import type { ModelRecord } from './model-registry';
import { canonicalSlug, modelMatchesSlug } from './model-slug';
import { modelSourceLinks } from './models';
import type { CodingAgent } from './coding-agents-data';

export interface UseLink {
  label: string;
  href: string;
  /** Internal (Next.js) or external link. */
  internal?: boolean;
  note?: string;
}

export interface UseGroup {
  title: string;
  links: UseLink[];
}

/**
 * Official provider consoles. Only well-known consoles are listed —
 * unknown providers get no link rather than a guessed URL.
 */
const OFFICIAL_CONSOLES: Record<string, { label: string; href: string }> = {
  openai: { label: 'OpenAI Platform', href: 'https://platform.openai.com' },
  anthropic: { label: 'Anthropic Console', href: 'https://console.anthropic.com' },
  google: { label: 'Google AI Studio', href: 'https://aistudio.google.com' },
  xai: { label: 'xAI', href: 'https://x.ai' },
  meta: { label: 'Llama', href: 'https://www.llama.com' },
  mistral: { label: 'Mistral Console', href: 'https://console.mistral.ai' },
  deepseek: { label: 'DeepSeek Platform', href: 'https://platform.deepseek.com' },
  microsoft: { label: 'Azure AI', href: 'https://ai.azure.com' },
  amazon: { label: 'AWS Bedrock', href: 'https://aws.amazon.com/bedrock' },
  nvidia: { label: 'NVIDIA Build', href: 'https://build.nvidia.com' },
  cohere: { label: 'Cohere Dashboard', href: 'https://dashboard.cohere.com' },
  perplexity: { label: 'Perplexity', href: 'https://www.perplexity.ai' },
  groq: { label: 'Groq Console', href: 'https://console.groq.com' },
  'together ai': { label: 'Together AI', href: 'https://api.together.ai' },
  together: { label: 'Together AI', href: 'https://api.together.ai' },
  fireworks: { label: 'Fireworks AI', href: 'https://fireworks.ai' },
  moonshot: { label: 'Moonshot Platform', href: 'https://platform.moonshot.ai' },
  ollama: { label: 'Ollama', href: 'https://ollama.com' },
  'hugging face': { label: 'Hugging Face', href: 'https://huggingface.co' },
};

export function officialConsole(provider: string | undefined): UseLink | null {
  if (!provider) return null;
  const key = provider.toLowerCase().replace(/^[^a-z0-9]+/, '').trim();
  const hit = OFFICIAL_CONSOLES[key];
  return hit ? { label: hit.label, href: hit.href } : null;
}

export interface HarnessHit {
  harness: string;
  /** Best-scoring variant label, e.g. "Codex - GPT-5.6 Sol (max)". */
  bestLabel: string;
  bestIndex: number | null;
  variants: number;
}

function splitHarness(label: string): { harness: string; modelPart: string } | null {
  const i = label.indexOf(' - ');
  if (i <= 0) return null;
  return { harness: label.slice(0, i).trim(), modelPart: label.slice(i + 3).trim() };
}

const normProvider = (p: unknown): string =>
  String(p || '').toLowerCase().replace(/^[^a-z0-9]+/, '').replace(/[-_]/g, '');

const PROVIDER_WORDS = new Set([
  'openai', 'anthropic', 'google', 'deepmind', 'xai', 'meta', 'mistral',
  'deepseek', 'qwen', 'alibaba', 'moonshot', 'zai', 'openrouter', 'ai',
]);
const STOP_WORDS = new Set(['latest', 'free', 'batch', 'preview', 'models', 'model']);

/** Model-family prefixes identify the lineup, not the model — excluded from matching. */
const FAMILY = new Set([
  'gpt', 'claude', 'gemini', 'llama', 'grok', 'qwen', 'mistral', 'deepseek',
  'gemma', 'phi', 'mixtral', 'sora', 'whisper', 'codex', 'palm', 'dall',
]);

function coreTokens(name: string): string[] {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(t => t && !PROVIDER_WORDS.has(t) && !STOP_WORDS.has(t) && !FAMILY.has(t));
}

const foldDigits = (t: string): string => t.replace(/[0-9]/g, '');

/**
 * Conservative model-part match: exact slug match wins, otherwise every
 * core token of the catalog name must hit the harness model part.
 */
function harnessScore(catalogName: string, modelPart: string): number {
  if (
    modelMatchesSlug({ name: catalogName }, modelPart) ||
    canonicalSlug(catalogName) === canonicalSlug(modelPart)
  ) {
    return 100;
  }
  const s = coreTokens(catalogName);
  const a = coreTokens(modelPart);
  // Single-word family-named models (Sora, Grok): fall back to a
  // word-boundary hit on the full name.
  if (s.length === 0) {
    const flat = String(catalogName || '').toLowerCase().trim();
    if (flat && new RegExp(`\\b${flat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(modelPart)) {
      return 2;
    }
    return -1;
  }
  if (a.length === 0) return -1;
  let score = 0;
  for (const t of s) {
    if (a.includes(t)) {
      score += 2;
      continue;
    }
    const f = foldDigits(t);
    if (f && a.some(x => foldDigits(x) === f)) {
      score += 1;
      continue;
    }
    return -1;
  }
  return score;
}

/**
 * Coding harnesses / tools that ship this model (Codex, Claude Code,
 * Cursor …), derived from the coding-agents board. One row per harness,
 * ranked by its best index score for this model.
 */
export function harnessesFor(
  model: { name: string; provider: string },
  agents: CodingAgent[]
): HarnessHit[] {
  const byHarness = new Map<string, HarnessHit>();
  const provider = normProvider(model.provider);

  for (const a of agents) {
    const split = splitHarness(a.label);
    if (!split) continue;
    if (provider && normProvider(a.provider) !== provider) continue;
    const score = harnessScore(model.name, split.modelPart);
    if (score < 2) continue;
    const cur = byHarness.get(split.harness);
    const idx = typeof a.index === 'number' ? a.index : null;
    if (!cur) {
      byHarness.set(split.harness, { harness: split.harness, bestLabel: a.label, bestIndex: idx, variants: 1 });
    } else {
      cur.variants += 1;
      if (idx !== null && (cur.bestIndex === null || idx > cur.bestIndex)) {
        cur.bestIndex = idx;
        cur.bestLabel = a.label;
      }
    }
  }

  return [...byHarness.values()].sort((x, y) => (y.bestIndex ?? -1) - (x.bestIndex ?? -1));
}

/**
 * Grouped "where to use this model" — official console, aggregators and
 * playgrounds, coding harnesses, self-hosting. Empty groups are omitted by
 * the caller; at minimum the providers/compare links always apply.
 */
export function availabilityGroups(
  model: ModelRecord & { id: string; name: string; provider: string },
  agents: CodingAgent[],
  providersHref: string
): UseGroup[] {
  const groups: UseGroup[] = [];

  const direct: UseLink[] = [];
  const console = officialConsole(model.provider);
  if (console) direct.push(console);
  if (direct.length) groups.push({ title: 'Official API', links: direct });

  const play: UseLink[] = modelSourceLinks({
    id: model.id,
    name: model.name,
    source: model.source,
    elo: model.elo,
    intelligenceIndex: model.intelligenceIndex,
    hfDownloads: model.hfDownloads,
  }).map(l => ({ label: l.label, href: l.href }));
  play.push({ label: 'Compare API providers', href: providersHref, internal: true });
  groups.push({ title: 'Try it & compare prices', links: play });

  const harnesses = harnessesFor(model, agents);
  if (harnesses.length) {
    groups.push({
      title: 'Coding harnesses that run it',
      links: harnesses.map(h => ({
        label: h.harness,
        href: '/coding-agents',
        internal: true,
        note:
          h.bestIndex !== null
            ? `${h.bestLabel} · index ${h.bestIndex.toFixed(1)}${h.variants > 1 ? ` · ${h.variants} variants` : ''}`
            : h.bestLabel,
      })),
    });
  }

  const selfHost: UseLink[] = [];
  const isOpen = model.family === 'open-weights' || model.family === 'open';
  if (isOpen) {
    selfHost.push({ label: 'Hugging Face weights', href: `https://huggingface.co/search/full-text?q=${encodeURIComponent(model.name)}` });
    selfHost.push({ label: 'Ollama library', href: 'https://ollama.com/library' });
  } else if (model.freeTier || model.localOnly) {
    selfHost.push({ label: 'Ollama library', href: 'https://ollama.com/library' });
  }
  if (selfHost.length) groups.push({ title: 'Self-host', links: selfHost });

  return groups;
}
