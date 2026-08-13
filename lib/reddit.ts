import Parser from 'rss-parser';
import { NewsItem } from './types';
import { categorizeContent } from './categorize';

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
});

const SUBREDDITS = [
  'MachineLearning',
  'LocalLLaMA',
  'OpenAI',
  'artificial',
  'StableDiffusion',
];

const MAX_AGE_MS = 72 * 60 * 60 * 1000;

export async function fetchReddit(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const now = Date.now();

  for (const sub of SUBREDDITS) {
    try {
      const parsed = await parser.parseURL(`https://www.reddit.com/r/${sub}/.rss`);

      for (const item of parsed.items.slice(0, 12)) {
        if (!item.title || !item.link) continue;

        const age = now - new Date(item.pubDate || Date.now()).getTime();
        if (age > MAX_AGE_MS) continue;

        const raw = item as unknown as {
          content?: string;
          contentSnippet?: string;
          media?: { thumbnail?: { $?: { url?: string } } | string };
        };

        const content = (item.contentSnippet || item.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        // Reddit score embedded in description HTML
        let score: number | undefined;
        const scoreMatch = (item.content || '').match(/score:?\s*([\d,]+)/i);
        if (scoreMatch) score = parseInt(scoreMatch[1].replace(/,/g, ''), 10);
        const commentsMatch = (item.content || '').match(/([\d,]+)\s*comments?/i);
        const numComments = commentsMatch ? parseInt(commentsMatch[1].replace(/,/g, ''), 10) : undefined;

        let image: string | undefined;
        const thumbnail = raw.media?.thumbnail as { $?: { url?: string } } | undefined;
        if (thumbnail?.$?.url && /^https?:\/\//.test(thumbnail.$.url)) {
          image = thumbnail.$.url;
        }

        allItems.push({
          source: 'reddit',
          source_label: `r/${sub}`,
          source_type: 'reddit',
          title: item.title.length > 200 ? item.title.slice(0, 197) + '...' : item.title,
          summary: content.slice(0, 300) || `Top post on r/${sub}.`,
          content: content,
          url: item.link,
          author: `r/${sub}`,
          category: categorizeContent(item.title, content),
          published_at: item.pubDate || new Date().toISOString(),
          source_detail: `r/${sub}`,
          image_url: image,
          score,
          num_comments: numComments,
        });
      }
      console.log(`  ✓ Reddit r/${sub}: ${parsed.items.length} items`);
    } catch (error) {
      console.log(`  ✗ Reddit r/${sub} failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  return allItems;
}
