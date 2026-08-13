import Parser from 'rss-parser';
import { NewsItem } from './types';
import { categorizeContent } from './categorize';

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
});

interface YouTubeChannel {
  id: string;
  name: string;
}

// Channel IDs are the ones YouTube's own pages reference in their RSS <link rel="alternate">.
// Note: YouTube's RSS endpoint is flaky — some channels return 404/500 intermittently.
// Failed channels are skipped gracefully.
const CHANNELS: YouTubeChannel[] = [
  { id: 'UCXZCJLdBC09xxGZ6gcdrc6A', name: 'OpenAI' },
  { id: 'UCSHZKyawb77ixDdsGog4iWA', name: 'Lex Fridman' },
  { id: 'UCbfYPyITQ-7l4upoX8nvctg', name: 'Two Minute Papers' },
  { id: 'UCtatfZMf-8EkIwASXM4ts0A', name: 'AssemblyAI' },
  { id: 'UCP7jMXSY2xbc3KCAE0MHQ-A', name: 'Google DeepMind' },
  { id: 'UCZHmQk67mSJgfCCTn7xBfew', name: 'Yannic Kilcher' },
];

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export async function fetchYouTube(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const now = Date.now();

  for (const channel of CHANNELS) {
    try {
      const parsed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`);

      for (const item of parsed.items.slice(0, 10)) {
        if (!item.title || !item.link) continue;
        const age = now - new Date(item.pubDate || Date.now()).getTime();
        if (age > MAX_AGE_MS) continue;

        const content = item.contentSnippet || item.content || '';
        let image: string | undefined;
        const rawItem = item as unknown as { media?: { thumbnail?: { $?: { url?: string } } } };
        const thumb = rawItem.media?.thumbnail as { $?: { url?: string } } | undefined;
        if (thumb?.$?.url) image = thumb.$.url;

        allItems.push({
          source: 'youtube',
          source_label: channel.name,
          source_type: 'youtube',
          title: item.title,
          summary: content.slice(0, 300),
          content: content,
          url: item.link,
          author: channel.name,
          category: categorizeContent(item.title, content),
          published_at: item.pubDate || new Date().toISOString(),
          source_detail: `YouTube · ${channel.name}`,
          image_url: image,
        });
      }
      console.log(`  ✓ YouTube ${channel.name}: ${parsed.items.length} items`);
    } catch (error) {
      console.log(`  ✗ YouTube ${channel.name}: ${error instanceof Error ? error.message : 'feed unavailable'}`);
    }
  }

  return allItems;
}
