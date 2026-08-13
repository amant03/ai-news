import Parser from 'rss-parser';
import { NewsItem } from './types';
import { categorizeContent } from './categorize';

const parser = new Parser({
  timeout: 12000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:content:url', 'mediaContentUrl'],
      ['media:thumbnail:url', 'mediaThumbnailUrl'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

interface RSSFeedConfig {
  name: string;
  url: string;
  source: string;
  source_label?: string;
  category?: 'model' | 'research' | 'product' | 'safety' | 'policy' | 'other';
}

const RSS_FEEDS: RSSFeedConfig[] = [
  // Company blogs
  { name: 'OpenAI', url: 'https://openai.com/news/rss', source: 'openai', source_label: 'OpenAI' },
  { name: 'Anthropic', url: 'https://www.anthropic.com/rss.xml', source: 'anthropic', source_label: 'Anthropic' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', source: 'google', source_label: 'Google DeepMind' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', source: 'huggingface', source_label: 'Hugging Face' },
  { name: 'Meta AI', url: 'https://ai.meta.com/blog/rss/', source: 'meta', source_label: 'Meta AI' },
  { name: 'Mistral', url: 'https://mistral.ai/feed.xml', source: 'mistral', source_label: 'Mistral' },
  { name: 'Microsoft AI', url: 'https://blogs.microsoft.com/ai/feed/', source: 'microsoft-ai', source_label: 'Microsoft AI' },
  { name: 'NVIDIA AI', url: 'https://blogs.nvidia.com/blog/feed/', source: 'nvidia', source_label: 'NVIDIA' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', source: 'google-ai', source_label: 'Google AI' },
  { name: 'Perplexity', url: 'https://www.perplexity.ai/hub/feed.xml', source: 'perplexity', source_label: 'Perplexity' },
  { name: 'PostHog', url: 'https://posthog.com/blog/rss.xml', source: 'posthog', source_label: 'PostHog' },
  { name: 'Cohere', url: 'https://cohere.com/blog/rss.xml', source: 'cohere', source_label: 'Cohere' },
  { name: 'Together AI', url: 'https://www.together.ai/blog/rss.xml', source: 'together', source_label: 'Together AI' },
  { name: 'LangChain', url: 'https://blog.langchain.dev/rss/', source: 'langchain', source_label: 'LangChain' },

  // Tech media
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'techcrunch', source_label: 'TechCrunch' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'the-verge', source_label: 'The Verge' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', source: 'venturebeat', source_label: 'VentureBeat' },
  { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', source: 'wired', source_label: 'Wired' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', source: 'mit-tr', source_label: 'MIT Tech Review' },
  { name: 'The Next Web AI', url: 'https://thenextweb.com/ai/feed', source: 'thenextweb', source_label: 'The Next Web' },
  { name: 'Ars Technica AI', url: 'https://arstechnica.com/ai/feed/', source: 'arstechnica', source_label: 'Ars Technica' },
  { name: 'CNBC AI', url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', source: 'cnbc', source_label: 'CNBC' },
];

export function fetchRSSFeeds(): Promise<NewsItem[]> {
  return fetchRSSFeedsFor(RSS_FEEDS);
}

export async function fetchRSSFeedsFor(feeds: RSSFeedConfig[]): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];

  const results = await Promise.allSettled(
    feeds.map(async feed => {
      try {
        const parsed = await parser.parseURL(feed.url);
        const items: NewsItem[] = [];

        for (const item of parsed.items.slice(0, 12)) {
          if (!item.title || !item.link) continue;

          const content = item.contentSnippet || item.content || item.summary || '';
          const publishedAt = item.pubDate || new Date().toISOString();
          const image = extractImage(item, feed.url);

          items.push({
            source: feed.source,
            source_label: feed.source_label || feed.name,
            source_type: 'rss',
            title: item.title,
            summary: content.slice(0, 300),
            content: content,
            url: item.link,
            author: feed.name,
            category: feed.category || categorizeContent(item.title, content),
            published_at: publishedAt,
            image_url: image,
            source_detail: feed.name,
          });
        }
        return { name: feed.name, items };
      } catch (error) {
        console.log(`  ✗ RSS ${feed.name} failed: ${error instanceof Error ? error.message : error}`);
        return { name: feed.name, items: [] as NewsItem[] };
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.items.length > 0) {
      console.log(`  ✓ RSS ${result.value.name}: ${result.value.items.length} items`);
      allItems.push(...result.value.items);
    }
  }

  return allItems;
}

/**
 * Some feeds return protocol-relative (//cdn...) or site-relative (/img/...)
 * image URLs. Prefix them with the feed's origin so they resolve correctly.
 */
function normalizeImageUrl(url: string, feedUrl: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) {
    try {
      return new URL(url, feedUrl).href;
    } catch {
      return url;
    }
  }
  return url;
}

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)/i;

function looksLikeImage(url: string): boolean {
  return IMG_EXT.test(url);
}

function firstImageUrl(urls: Array<string | undefined>): string | undefined {
  for (const u of urls) {
    if (u && looksLikeImage(u)) return u;
  }
  return undefined;
}

/**
 * Pull the best candidate thumbnail out of an RSS item, trying (in order):
 * 1. enclosure
 * 2. media:content / media:thumbnail (from customFields)
 * 3. <img> tags embedded in the item content
 * 4. og:image meta from the content
 */
function extractImage(item: Record<string, unknown>, feedUrl: string): string | undefined {
  const normalize = (u: string | undefined) => (u ? normalizeImageUrl(u, feedUrl) : undefined);

  const enclosure = item.enclosure as { url?: string } | undefined;
  const mediaContent = item.mediaContent as Array<Record<string, unknown>> | undefined;
  const mediaThumb = item.mediaThumbnail as Array<Record<string, unknown>> | undefined;
  const mediaContentUrl = item.mediaContentUrl as string | undefined;
  const mediaThumbUrl = item.mediaThumbnailUrl as string | undefined;

  const fromEnclosure = enclosure?.url ? normalize(enclosure.url) : undefined;
  const fromMedia = firstImageUrl([
    mediaContent?.[0]?.url as string | undefined,
    mediaContent?.[0]?.$.url as string | undefined,
    mediaThumb?.[0]?.$.url as string | undefined,
    mediaThumbUrl,
    mediaContentUrl,
  ]);
  const fromMediaNorm = normalize(fromMedia);

  const contentHtml = (item.content as string) || (item.contentEncoded as string) || '';
  let fromContent: string | undefined;
  const imgMatch = contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) {
    const src = imgMatch[1].trim();
    if (src.startsWith('data:')) {
      // try a later img (data URIs are useless)
      const all = [...contentHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
      for (let i = 1; i < all.length; i++) {
        const u = all[i][1].trim();
        if (u.startsWith('http') && looksLikeImage(u)) { fromContent = normalize(u); break; }
      }
    } else {
      fromContent = normalize(src);
    }
  }

  const ogMatch = contentHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const fromOg = ogMatch ? normalize(ogMatch[1]) : undefined;

  return firstImageUrl([fromEnclosure, fromMediaNorm, fromContent, fromOg]);
}
