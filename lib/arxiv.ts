import { NewsItem } from './types';
import { categorizeContent } from './categorize';

const CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL'];
const MAX_RESULTS = 25;
const MAX_AGE_MS = 72 * 60 * 60 * 1000;

export async function fetchArxiv(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const seen = new Set<string>();
  const now = Date.now();

  for (const category of CATEGORIES) {
    try {
      const url = `http://export.arxiv.org/api/query?search_query=cat:${category}&sortBy=submittedDate&sortOrder=descending&max_results=${MAX_RESULTS}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!res.ok) {
        console.log(`  ✗ arXiv ${category}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();

      // Parse Atom XML entries
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match: RegExpExecArray | null;
      let count = 0;

      while ((match = entryRegex.exec(xml)) !== null) {
        const block = match[1];
        const title = cleanXml(extractTag(block, 'title')).replace(/\s+/g, ' ').trim();
        const idMatch = block.match(/<id>([^<]+)<\/id>/);
        const link = idMatch ? idMatch[1].replace('http://arxiv.org', 'https://arxiv.org') : '';
        const published = extractTag(block, 'published') || extractTag(block, 'updated');
        const summary = cleanXml(extractTag(block, 'summary')).replace(/\s+/g, ' ').trim().slice(0, 800);
        const authors = [...block.matchAll(/<name>([^<]+)<\/name>/g)].map(m => m[1]);

        if (!title || !link) continue;
        const age = now - new Date(published).getTime();
        if (age > MAX_AGE_MS) continue;

        const key = title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        allItems.push({
          source: 'arxiv',
          source_label: `arXiv ${category}`,
          source_type: 'arxiv',
          title: title.length > 200 ? title.slice(0, 197) + '...' : title,
          summary: summary.slice(0, 300),
          content: summary,
          url: link,
          author: authors.slice(0, 3).join(', '),
          category: categorizeContent(title, summary),
          published_at: new Date(published).toISOString(),
          source_detail: `arXiv ${category}`,
          num_comments: authors.length,
        });
        count++;
      }
      console.log(`  ✓ arXiv ${category}: ${count} entries`);
    } catch (error) {
      console.log(`  ✗ arXiv ${category} failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  return allItems;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : '';
}

function cleanXml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
