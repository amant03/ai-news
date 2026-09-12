import type { NewsItem } from './types';

export interface CompanyHit {
  /** Display name, e.g. "OpenAI". */
  name: string;
  /** Hotlinkable logo URL (Wikimedia Commons, free). */
  logo: string;
}

interface Entry {
  match: RegExp;
  name: string;
  logo: string;
}

const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';

/**
 * Company / product logos keyed by article text. Only entries with verified
 * Wikimedia Commons assets are listed — anything else falls through to the
 * publisher favicon, then to a monogram. (The agent-side ENTITY_PHOTOS map
 * additionally carries founder photos and rough placeholders; cards use this
 * stricter company-only list so a logo is never a stranger's avatar.)
 */
const COMPANIES: Entry[] = [
  { match: /\bchatgpt\b/i, name: 'ChatGPT', logo: `${W}/0/04/ChatGPT_logo.svg/440px-ChatGPT_logo.svg.png` },
  { match: /\bopenai\b|\bgpt-?5\b|\bgpt-?4\b|\bsora\b|\bdall-?e\b|\bwhisper\b/i, name: 'OpenAI', logo: `${W}/4/4d/OpenAI_logo.svg/440px-OpenAI_logo.svg.png` },
  { match: /\bclaude\b|\banthropic\b/i, name: 'Anthropic', logo: `${W}/7/78/Anthropic_logo.svg/440px-Anthropic_logo.svg.png` },
  { match: /\bgemini\b|\bgemma\b/i, name: 'Google Gemini', logo: `${W}/8/8a/Google_Gemini_logo.svg/440px-Google_Gemini_logo.svg.png` },
  { match: /\bdeepmind\b/i, name: 'Google DeepMind', logo: `${W}/0/0f/Google_DeepMind_logo.svg/440px-Google_DeepMind_logo.svg.png` },
  { match: /\bgoogle\b/i, name: 'Google', logo: `${W}/2/2f/Google_2015_logo.svg/440px-Google_2015_logo.svg.png` },
  { match: /\bmeta\s*ai\b|\bllama\b/i, name: 'Meta', logo: `${W}/7/7b/Meta_Platforms_Inc._logo.svg/440px-Meta_Platforms_Inc._logo.svg.png` },
  { match: /\bx\.ai\b|\bgrok\b/i, name: 'xAI', logo: `${W}/2/2d/XAI_logo.svg/440px-XAI_logo.svg.png` },
  { match: /\bmistral\b|\bmixtral\b|\bcodestral\b|\bdevstral\b|\bmathstral\b/i, name: 'Mistral', logo: `${W}/e/e6/Mistral_AI_logo.svg/440px-Mistral_AI_logo.svg.png` },
  { match: /\bnvidia\b/i, name: 'NVIDIA', logo: `${W}/2/21/Nvidia_logo.svg/440px-Nvidia_logo.svg.png` },
  { match: /\bamd\b/i, name: 'AMD', logo: `${W}/7/7c/AMD_Logo.svg/440px-AMD_Logo.svg.png` },
  { match: /\bintel\b/i, name: 'Intel', logo: `${W}/c/c3/Intel_logo_%282020%2C_light_blue%29.svg/440px-Intel_logo_%282020%2C_light_blue%29.svg.png` },
  { match: /\bmicrosoft\b|\bcopilot\b|\bphi-?\d\b/i, name: 'Microsoft', logo: `${W}/4/44/Microsoft_logo.svg/440px-Microsoft_logo.svg.png` },
  { match: /\baws\b|\bbedrock\b/i, name: 'AWS', logo: `${W}/9/93/Amazon_Web_Services_Logo.svg/440px-Amazon_Web_Services_Logo.svg.png` },
  { match: /\bamazon\b/i, name: 'Amazon', logo: `${W}/a/a9/Amazon_logo.svg/440px-Amazon_logo.svg.png` },
  { match: /\bapple\b/i, name: 'Apple', logo: `${W}/f/fa/Apple_logo_black.svg/440px-Apple_logo_black.svg.png` },
  { match: /\bbaidu\b|\bernie\b/i, name: 'Baidu', logo: `${W}/b/bf/Baidu_logo.svg/440px-Baidu_logo.svg.png` },
  { match: /\balibaba\b|\bqwen\b/i, name: 'Alibaba', logo: `${W}/6/69/Alibaba_cloud_logo.svg/440px-Alibaba_cloud_logo.svg.png` },
  { match: /\bbytedance\b/i, name: 'ByteDance', logo: `${W}/e/e3/ByteDance_logo.svg/440px-ByteDance_logo.svg.png` },
  { match: /\btesla\b/i, name: 'Tesla', logo: `${W}/b/bd/Tesla_Motors.svg/440px-Tesla_Motors.svg.png` },
  { match: /\bspacex\b/i, name: 'SpaceX', logo: `${W}/d/de/SpaceX-Logo.svg/440px-SpaceX-Logo.svg.png` },
  { match: /\bcohere\b|\bcommand[-\s]?r\b/i, name: 'Cohere', logo: `${W}/4/46/Cohere_logo.svg/440px-Cohere_logo.svg.png` },
  { match: /\bstability\s*ai\b|\bstable\s*diffusion\b/i, name: 'Stability AI', logo: `${W}/6/6c/Stability_AI_logo.svg/440px-Stability_AI_logo.svg.png` },
  { match: /\bmidjourney\b/i, name: 'Midjourney', logo: `${W}/e/e6/Midjourney_logo.png/440px-Midjourney_logo.png` },
  { match: /\bhugging\s*face\b/i, name: 'Hugging Face', logo: `${W}/e/e0/HuggingFace_logo_%28modified%29.svg/440px-HuggingFace_logo_%28modified%29.svg.png` },
  { match: /\bperplexity\b/i, name: 'Perplexity', logo: `${W}/1/1f/Perplexity_AI_logo.svg/440px-Perplexity_AI_logo.svg.png` },
  { match: /\bgroq\b/i, name: 'Groq', logo: `${W}/c/c3/Groq_logo.svg/440px-Groq_logo.svg.png` },
  { match: /\bscale\s*ai\b/i, name: 'Scale AI', logo: `${W}/1/17/Scale_AI_logo.svg/440px-Scale_AI_logo.svg.png` },
  { match: /\bsnowflake\b/i, name: 'Snowflake', logo: `${W}/f/f5/Snowflake_Logo.svg/440px-Snowflake_Logo.svg.png` },
  { match: /\bdatabricks\b/i, name: 'Databricks', logo: `${W}/5/50/Databricks_logo.svg/440px-Databricks_logo.svg.png` },
  { match: /\breplit\b/i, name: 'Replit', logo: `${W}/b/b4/Replit_logo.svg/440px-Replit_logo.svg.png` },
  { match: /\bgithub\b/i, name: 'GitHub', logo: `${W}/9/91/Octicons-mark-github.svg/440px-Octicons-mark-github.svg.png` },
  { match: /\breddit\b/i, name: 'Reddit', logo: `${W}/5/58/Reddit_logo_new.svg/440px-Reddit_logo_new.svg.png` },
  { match: /\btwitter\b|\bX\s*(platform|social|post)\b/i, name: 'X', logo: `${W}/c/ce/X_logo_2023.svg/440px-X_logo_2023.svg.png` },
  { match: /\byoutube\b/i, name: 'YouTube', logo: `${W}/0/09/YouTube_full-color_icon_%282017%29.svg/440px-YouTube_full-color_icon_%282017%29.svg.png` },
  { match: /\bfigma\b/i, name: 'Figma', logo: `${W}/3/33/Figma-logo.svg/440px-Figma-logo.svg.png` },
  { match: /\bslack\b/i, name: 'Slack', logo: `${W}/d/d5/Slack_icon_2019.svg/440px-Slack_icon_2019.svg.png` },
  { match: /\bdiscord\b/i, name: 'Discord', logo: `${W}/5/51/Discord_logo.svg/440px-Discord_logo.svg.png` },
];

/** First company mentioned in title + summary, if any. */
export function companyFor(item: Pick<NewsItem, 'title' | 'summary'>): CompanyHit | null {
  const text = `${item.title || ''} ${item.summary || ''}`;
  for (const c of COMPANIES) {
    if (c.match.test(text)) return { name: c.name, logo: c.logo };
  }
  return null;
}

/** Publisher hostname from the article URL. */
export function publisherHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Publisher favicon via Google's free favicon service (no key).
 * Always paired with an onError fallback — never depended upon alone.
 */
export function publisherFavicon(url: string | undefined): string | null {
  const host = publisherHost(url);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
}

/** Display name for the monogram fallback: company, else publisher. */
export function coverName(
  item: Pick<NewsItem, 'title' | 'summary' | 'url' | 'source' | 'source_label'>,
  company: CompanyHit | null
): string {
  if (company) return company.name;
  if (item.source_label) return item.source_label;
  const host = publisherHost(item.url);
  if (host) {
    const base = host.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return item.source || 'AI';
}
