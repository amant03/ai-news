import Parser from 'rss-parser';
import { NewsItem } from './types';
import { categorizeContent } from './categorize';

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

interface GoogleNewsConfig {
  query: string;
  hours?: number;
}

const QUERIES: GoogleNewsConfig[] = [
  { query: 'artificial intelligence', hours: 48 },
  { query: '"large language model"', hours: 48 },
  { query: 'AI funding', hours: 48 },
  { query: 'AI model release', hours: 48 },
  { query: 'AI regulation policy', hours: 72 },
  { query: 'OpenAI OR Anthropic OR Google DeepMind OR Meta AI', hours: 72 },
];

function buildUrl(config: GoogleNewsConfig): string {
  const hours = config.hours || 48;
  const q = encodeURIComponent(config.query);
  return `https://news.google.com/rss/search?q=${q}+when:${hours}h&hl=en-US&gl=US&ceid=US:en`;
}

export async function fetchGoogleNews(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const seen = new Set<string>();

  for (const cfg of QUERIES) {
    try {
      const url = buildUrl(cfg);
      const parsed = await parser.parseURL(url);

      for (const item of parsed.items.slice(0, 15)) {
        if (!item.title || !item.link) continue;

        // Google News title format: "Headline - Publisher"
        let title = item.title;
        let publisher = 'Google News';
        const dashIndex = item.title.lastIndexOf(' - ');
        if (dashIndex > 5) {
          title = item.title.slice(0, dashIndex).trim();
          publisher = item.title.slice(dashIndex + 3).trim();
        }

        const key = title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const content = item.contentSnippet || item.content || '';
        const image = extractGoogleNewsImage(item as unknown as Record<string, unknown>);

        allItems.push({
          source: 'google-news',
          source_label: publisher,
          source_type: 'google',
          title: title.length > 200 ? title.slice(0, 197) + '...' : title,
          summary: content.slice(0, 300),
          content: content,
          url: item.link,
          author: publisher,
          category: categorizeContent(title, content),
          published_at: item.pubDate || new Date().toISOString(),
          source_detail: cfg.query,
          image_url: image,
        });
      }
      console.log(`  ✓ Google News "${cfg.query}": ${parsed.items.length} items`);
    } catch (error) {
      console.log(`  ✗ Google News "${cfg.query}" failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  return allItems;
}

/**
 * Google News items embed images either in <media:content>/<media:thumbnail>
 * or inside the content:encoded HTML. Extract the best candidate.
 */
function extractGoogleNewsImage(item: Record<string, unknown>): string | undefined {
  const rawItem = item as unknown as { media?: Record<string, unknown> };
  const mediaContent = rawItem.media?.content as { $?: { url?: string } } | undefined;
  if (mediaContent?.$?.url) return mediaContent.$.url;

  const thumbnail = rawItem.media?.thumbnail as { $?: { url?: string } } | undefined;
  if (thumbnail?.$?.url) return thumbnail.$.url;

  const contentHtml = (item.contentEncoded as string) || (item.content as string) || '';
  const imgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && !imgMatch[1].startsWith('data:')) return imgMatch[1];

  return undefined;
}
