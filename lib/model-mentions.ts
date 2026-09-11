import type { NewsItem } from '@/lib/types';
import { preferredSlug } from '@/lib/model-slug';

/** Lightweight model-mention detection for news → model cross-links. */
export interface ModelMention {
  name: string;
  slug: string;
}

const KNOWN_MODELS: Array<{ match: RegExp; name: string }> = [
  { match: /\bgpt-?5(\.\d+)?\b/i, name: 'GPT-5' },
  { match: /\bgpt-?4o?\b/i, name: 'GPT-4o' },
  { match: /\bo1\b/i, name: 'o1' },
  { match: /\bclaude\s?(sonnet|opus|haiku|fable)?\s?\d?/i, name: 'Claude' },
  { match: /\bgemini\s?\d?(\.\d+)?/i, name: 'Gemini' },
  { match: /\bgrok\s?\d?/i, name: 'Grok' },
  { match: /\bllama\s?\d?/i, name: 'Llama' },
  { match: /\bmistral/i, name: 'Mistral Large' },
  { match: /\bdeepseek\s?(r1|r2|v3)?/i, name: 'DeepSeek' },
  { match: /\bqwen/i, name: 'Qwen' },
  { match: /\bmixtral/i, name: 'Mixtral' },
  { match: /\bphi-?\d?/i, name: 'Phi' },
  { match: /\bstable\s?diffusion/i, name: 'Stable Diffusion' },
  { match: /\bdall-?e/i, name: 'DALL-E' },
  { match: /\bmidjourney/i, name: 'Midjourney' },
  { match: /\bsora/i, name: 'Sora' },
  { match: /\bwhisper/i, name: 'Whisper' },
];

export function findModelMention(item: NewsItem): ModelMention | null {
  const text = `${item.title} ${item.summary || ''}`;
  for (const k of KNOWN_MODELS) {
    const m = text.match(k.match);
    if (m) {
      const name = m[0].trim();
      return { name: name.length > 2 ? name : k.name, slug: preferredSlug({ name: k.name }) };
    }
  }
  return null;
}
