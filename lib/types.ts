export type SourceType =
  | 'rss'
  | 'twitter'
  | 'web'
  | 'google'
  | 'reddit'
  | 'hn'
  | 'arxiv'
  | 'youtube'
  | 'github';

export interface TweetMetrics {
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
}

export interface NewsItem {
  id?: number;
  source: string;
  source_label?: string;
  source_type: SourceType;
  title: string;
  summary: string;
  content: string;
  url: string;
  author: string;
  category: Category;
  domain?: Domain;
  published_at: string;
  created_at?: string;
  source_detail?: string;
  image_url?: string;
  score?: number;
  num_comments?: number;
  tweet_metrics?: TweetMetrics;
}

export type Category = 'model' | 'research' | 'product' | 'safety' | 'policy' | 'other';

/**
 * Editorial domain / vertical. Users can browse the whole feed ("all") or
 * focus on the business side, the tech side, or research-specific news.
 */
export type Domain = 'business' | 'tech' | 'research' | 'general';

export const DOMAIN_LABEL: Record<Domain, string> = {
  business: 'Business',
  tech: 'Tech',
  research: 'Research',
  general: 'News',
};

export type SourceFilter =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'meta'
  | 'mistral'
  | 'deepseek'
  | 'qwen'
  | 'gemma'
  | 'groq'
  | 'huggingface'
  | 'x'
  | 'reddit'
  | 'hacker-news'
  | 'google-news'
  | 'arxiv'
  | 'youtube'
  | 'github'
  | 'techcrunch'
  | 'the-verge'
  | 'venturebeat'
  | 'all';

export const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'model', label: 'Model', color: '#38bdf8' },
  { value: 'research', label: 'Research', color: '#a78bfa' },
  { value: 'product', label: 'Product', color: '#34d399' },
  { value: 'safety', label: 'Safety', color: '#fbbf24' },
  { value: 'policy', label: 'Policy', color: '#fb7185' },
  { value: 'other', label: 'Other', color: '#94a3b8' },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  model: 'Model',
  research: 'Research',
  product: 'Product',
  safety: 'Safety',
  policy: 'Policy',
  other: 'Other',
};

export const CATEGORY_COLOR: Record<Category, string> = {
  model: '#38bdf8',
  research: '#a78bfa',
  product: '#34d399',
  safety: '#fbbf24',
  policy: '#fb7185',
  other: '#94a3b8',
};

export const SOURCES: { value: SourceFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Sources', color: '#ffffff' },
  { value: 'openai', label: 'OpenAI', color: '#10a37f' },
  { value: 'anthropic', label: 'Anthropic', color: '#d97706' },
  { value: 'google', label: 'Google DeepMind', color: '#4285f4' },
  { value: 'meta', label: 'Meta AI', color: '#3b82f6' },
  { value: 'mistral', label: 'Mistral', color: '#f97316' },
  { value: 'deepseek', label: 'DeepSeek', color: '#059669' },
  { value: 'qwen', label: 'Qwen', color: '#7c3aed' },
  { value: 'huggingface', label: 'Hugging Face', color: '#ffd21e' },
  { value: 'x', label: 'X / Twitter', color: '#e2e8f0' },
  { value: 'reddit', label: 'Reddit', color: '#ff4500' },
  { value: 'hacker-news', label: 'Hacker News', color: '#ff6600' },
  { value: 'google-news', label: 'Google News', color: '#34a853' },
  { value: 'arxiv', label: 'arXiv', color: '#b91c1c' },
  { value: 'youtube', label: 'YouTube', color: '#ef4444' },
  { value: 'github', label: 'GitHub', color: '#e2e8f0' },
  { value: 'techcrunch', label: 'TechCrunch', color: '#22d3ee' },
  { value: 'the-verge', label: 'The Verge', color: '#a3e635' },
  { value: 'venturebeat', label: 'VentureBeat', color: '#facc15' },
];

export const SOURCE_LABEL: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google DeepMind',
  'google-ai': 'Google AI',
  meta: 'Meta AI',
  mistral: 'Mistral',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  gemma: 'Gemma',
  groq: 'Groq',
  huggingface: 'Hugging Face',
  x: 'X',
  reddit: 'Reddit',
  'hacker-news': 'Hacker News',
  'google-news': 'Google News',
  arxiv: 'arXiv',
  youtube: 'YouTube',
  github: 'GitHub',
  techcrunch: 'TechCrunch',
  'the-verge': 'The Verge',
  theverge: 'The Verge',
  venturebeat: 'VentureBeat',
  'msft-ai': 'Microsoft AI',
  'microsoft-ai': 'Microsoft AI',
  nvidia: 'NVIDIA',
  cohere: 'Cohere',
  stability: 'Stability AI',
  eleutherai: 'EleutherAI',
  xai: 'xAI',
  perplexity: 'Perplexity',
  posthog: 'PostHog',
  together: 'Together AI',
  ollama: 'Ollama',
  langchain: 'LangChain',
  wired: 'Wired',
  'mit-tr': 'MIT Tech Review',
  thenextweb: 'The Next Web',
  arstechnica: 'Ars Technica',
  cnbc: 'CNBC',
  'ai-news': 'AI News',
  'ai-weekly': 'AI Weekly',
  other: 'Other',
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] || source;
}

export const SOURCE_HOMEPAGE: Record<string, string> = {
  openai: 'https://openai.com/news',
  anthropic: 'https://www.anthropic.com/news',
  google: 'https://deepmind.google/discover/blog/',
  'google-ai': 'https://blog.google/technology/ai/',
  meta: 'https://ai.meta.com/blog/',
  mistral: 'https://mistral.ai/news',
  deepseek: 'https://www.deepseek.com/',
  qwen: 'https://qwenlm.github.io/',
  huggingface: 'https://huggingface.co/blog',
  x: 'https://x.com',
  reddit: 'https://www.reddit.com/r/MachineLearning/',
  'hacker-news': 'https://news.ycombinator.com/',
  'google-news': 'https://news.google.com/search?q=artificial+intelligence',
  arxiv: 'https://arxiv.org/list/cs.AI/recent',
  youtube: 'https://www.youtube.com/results?search_query=AI',
  github: 'https://github.com/topics/artificial-intelligence',
  techcrunch: 'https://techcrunch.com/category/artificial-intelligence/',
  'the-verge': 'https://www.theverge.com/ai-artificial-intelligence',
  venturebeat: 'https://venturebeat.com/category/ai/',
  nvidia: 'https://blogs.nvidia.com/',
  'microsoft-ai': 'https://blogs.microsoft.com/ai/',
  cohere: 'https://cohere.com/blog',
  perplexity: 'https://www.perplexity.ai/hub',
  posthog: 'https://posthog.com/blog',
  together: 'https://www.together.ai/blog',
  langchain: 'https://blog.langchain.dev/',
  wired: 'https://www.wired.com/tag/artificial-intelligence/',
  'mit-tr': 'https://www.technologyreview.com/topic/artificial-intelligence/',
  thenextweb: 'https://thenextweb.com/artificial-intelligence',
  arstechnica: 'https://arstechnica.com/ai/',
  cnbc: 'https://www.cnbc.com/artificial-intelligence/',
  xai: 'https://x.ai/news',
  ollama: 'https://ollama.com/library',
};

export function sourceHomepage(source: string): string | undefined {
  return SOURCE_HOMEPAGE[source] || SOURCE_HOMEPAGE[source.replace(/_/g, '-')];
}
