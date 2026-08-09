export interface NewsItem {
  id?: number;
  source: string;
  source_type: 'rss' | 'twitter' | 'web';
  title: string;
  summary: string;
  content: string;
  url: string;
  author: string;
  category: Category;
  published_at: string;
  created_at?: string;
  tweet_metrics?: TweetMetrics;
}

export interface TweetMetrics {
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
}

export type Category = 'model' | 'research' | 'product' | 'safety' | 'policy' | 'other';

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
  | 'all';

export const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'model', label: 'Model', color: '#3b82f6' },
  { value: 'research', label: 'Research', color: '#8b5cf6' },
  { value: 'product', label: 'Product', color: '#10b981' },
  { value: 'safety', label: 'Safety', color: '#f59e0b' },
  { value: 'policy', label: 'Policy', color: '#ef4444' },
  { value: 'other', label: 'Other', color: '#6b7280' },
];

export const SOURCES: { value: SourceFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All Sources', color: '#ffffff' },
  { value: 'openai', label: 'OpenAI', color: '#10a37f' },
  { value: 'anthropic', label: 'Anthropic', color: '#d97706' },
  { value: 'google', label: 'Google DeepMind', color: '#4285f4' },
  { value: 'meta', label: 'Meta AI', color: '#0668e1' },
  { value: 'mistral', label: 'Mistral', color: '#f97316' },
  { value: 'deepseek', label: 'DeepSeek', color: '#059669' },
  { value: 'qwen', label: 'Qwen', color: '#7c3aed' },
  { value: 'gemma', label: 'Gemma', color: '#ea4335' },
  { value: 'groq', label: 'Groq', color: '#f97316' },
  { value: 'huggingface', label: 'Hugging Face', color: '#ffd21e' },
];
