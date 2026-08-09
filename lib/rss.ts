import Parser from 'rss-parser';
import { NewsItem, SourceFilter } from './types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AI-News-Aggregator/1.0',
  },
});

interface RSSFeedConfig {
  name: string;
  url: string;
  source: SourceFilter;
}

const RSS_FEEDS: RSSFeedConfig[] = [
  { name: 'OpenAI', url: 'https://openai.com/news/rss', source: 'openai' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', source: 'google' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', source: 'huggingface' },
  { name: 'Meta AI', url: 'https://ai.meta.com/blog/rss/', source: 'meta' },
  { name: 'Anthropic', url: 'https://www.anthropic.com/rss.xml', source: 'anthropic' },
  { name: 'Mistral', url: 'https://mistral.ai/feed.xml', source: 'mistral' },
];

function mapSourceToDB(source: SourceFilter): string {
  const mapping: Record<SourceFilter, string> = {
    openai: 'openai',
    anthropic: 'anthropic',
    google: 'google',
    meta: 'meta',
    mistral: 'mistral',
    deepseek: 'deepseek',
    qwen: 'qwen',
    gemma: 'gemma',
    groq: 'groq',
    huggingface: 'huggingface',
    all: 'unknown',
  };
  return mapping[source] || 'unknown';
}

function categorizeContent(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  if (/\b(model|gpt|claude|gemini|llama|mistral|release|launch|introducing)\b/.test(text)) {
    return 'model';
  }
  if (/\b(research|paper|study|benchmark|evaluation|findings)\b/.test(text)) {
    return 'research';
  }
  if (/\b(product|feature|update|tool|api|platform|app)\b/.test(text)) {
    return 'product';
  }
  if (/\b(safety|alignment|security|guardrail|responsible)\b/.test(text)) {
    return 'safety';
  }
  if (/\b(policy|regulation|governance|ethics|compliance)\b/.test(text)) {
    return 'policy';
  }
  return 'other';
}

export async function fetchRSSFeeds(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`Fetching RSS: ${feed.name}...`);
      const parsed = await parser.parseURL(feed.url);
      
      for (const item of parsed.items.slice(0, 20)) {
        if (!item.title || !item.link) continue;

        const content = item.contentSnippet || item.content || item.summary || '';
        const category = categorizeContent(item.title, content);
        
        allItems.push({
          source: mapSourceToDB(feed.source),
          source_type: 'rss',
          title: item.title,
          summary: content.slice(0, 300),
          content: content,
          url: item.link,
          author: feed.name,
          category: category as 'model' | 'research' | 'product' | 'safety' | 'policy' | 'other',
          published_at: item.pubDate || new Date().toISOString(),
        });
      }
      
      console.log(`  ✓ ${feed.name}: ${parsed.items.length} items`);
    } catch (error) {
      console.error(`  ✗ ${feed.name} failed:`, error instanceof Error ? error.message : error);
    }
  }

  return allItems;
}
