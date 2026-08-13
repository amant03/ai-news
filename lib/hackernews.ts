import { NewsItem } from './types';
import { categorizeContent } from './categorize';

interface HNItem {
  objectID: string;
  title: string;
  url?: string;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
  story_text?: string;
}

const QUERIES = ['AI', 'LLM', 'GPT', 'AGI', 'machine learning', 'open source AI'];

const MIN_POINTS = 30;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

export async function fetchHackerNews(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const seen = new Set<string>();
  const now = Date.now();

  for (const query of QUERIES) {
    try {
      const q = encodeURIComponent(`"${query}"`);
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=story&hitsPerPage=30`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) {
        console.log(`  ✗ HN "${query}": HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { hits: HNItem[] };

      for (const hit of data.hits) {
        if (!hit.title) continue;
        const age = now - new Date(hit.created_at).getTime();
        if (age > MAX_AGE_MS) continue;
        if ((hit.points || 0) < MIN_POINTS) continue;

        const key = hit.title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const content = (hit.story_text || '').replace(/<[^>]*>/g, '').slice(0, 500);

        allItems.push({
          source: 'hacker-news',
          source_label: 'Hacker News',
          source_type: 'hn',
          title: hit.title,
          summary: content.slice(0, 300) || `${hit.points} points, ${hit.num_comments} comments on Hacker News.`,
          content,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          author: hit.author || 'Hacker News',
          category: categorizeContent(hit.title, content),
          published_at: hit.created_at,
          source_detail: `HN · ${query}`,
          score: hit.points,
          num_comments: hit.num_comments,
        });
      }
      console.log(`  ✓ HN "${query}": ${data.hits.length} raw hits`);
    } catch (error) {
      console.log(`  ✗ HN "${query}" failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  return allItems;
}
