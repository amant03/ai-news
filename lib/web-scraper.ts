import { NewsItem } from './types';

interface WebSource {
  name: string;
  source: string;
  url: string;
  type: 'rss' | 'html';
  rssUrl?: string;
  selectors?: {
    item?: string;
    title?: string;
    link?: string;
    description?: string;
    date?: string;
  };
}

const WEB_SOURCES: WebSource[] = [
  {
    name: 'AI Weekly',
    source: 'other',
    url: 'https://aiweekly.co/ai-news-today',
    type: 'html',
  },
  {
    name: 'AIToolsRecap',
    source: 'other',
    url: 'https://aitoolsrecap.com/Blog/AINewsJuly2026.aspx',
    type: 'html',
  },
  {
    name: 'TechPP AI',
    source: 'other',
    url: 'https://techpp.com/tag/ai/',
    type: 'html',
  },
  {
    name: 'Crescendo AI News',
    source: 'other',
    url: 'https://www.crescendo.ai/news/latest-ai-news-and-updates',
    type: 'html',
  },
  {
    name: 'Third Run Time',
    source: 'other',
    url: 'https://thirdruntime.com/',
    type: 'html',
  },
  {
    name: 'ScienceDaily AI',
    source: 'other',
    url: 'https://www.sciencedaily.com/news/computers_math/artificial_intelligence/',
    type: 'html',
  },
  {
    name: 'Reuters AI',
    source: 'other',
    url: 'https://www.reuters.com/technology/artificial-intelligence/',
    type: 'html',
  },
  {
    name: 'AI News',
    source: 'other',
    url: 'https://www.artificialintelligence-news.com/categories/artificial-intelligence/',
    type: 'html',
  },
];

function categorizeContent(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();

  if (/\b(model|gpt|claude|gemini|llama|mistral|release|launch|introducing|sonnet|opus|fable|spark)\b/.test(text)) {
    return 'model';
  }
  if (/\b(research|paper|study|benchmark|evaluation|findings|arxiv)\b/.test(text)) {
    return 'research';
  }
  if (/\b(product|feature|update|tool|api|platform|app|launch)\b/.test(text)) {
    return 'product';
  }
  if (/\b(safety|alignment|security|guardrail|responsible|jailbreak|ransomware|vulnerability)\b/.test(text)) {
    return 'safety';
  }
  if (/\b(policy|regulation|governance|ethics|compliance|law|ban|restrict|block)\b/.test(text)) {
    return 'policy';
  }
  return 'other';
}

function extractLinksFromHtml(html: string, baseUrl: string): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const seen = new Set<string>();

  const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    const linkText = match[2].replace(/<[^>]*>/g, '').trim();

    if (!href || !linkText || linkText.length < 15) continue;
    if (href.startsWith('#')) continue;
    if (href.startsWith('/')) href = new URL(href, baseUrl).toString();
    if (!href.startsWith('http')) continue;

    // Skip navigation/generic links
    if (/\b(login|signup|subscribe|register|home|about|contact|privacy|terms)\b/i.test(linkText)) continue;

    const key = href.split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);

    // Extract surrounding context as snippet
    const fullMatch = match[0];
    const beforeContext = html.substring(Math.max(0, match.index - 200), match.index);
    const snippet = extractSnippet(beforeContext + fullMatch);

    results.push({ title: linkText, url: href, snippet });
  }

  return results;
}

function extractSnippet(text: string): string {
  const cleaned = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
  return cleaned.length > 300 ? cleaned.slice(0, 297) + '...' : cleaned;
}

function extractArticleContent(html: string): { title: string; paragraphs: string[] } {
  let title = '';

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  if (!title) {
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
    if (ogTitle) title = ogTitle[1];
  }

  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(html)) !== null) {
    const text = pMatch[1].replace(/<[^>]*>/g, '').trim();
    if (text.length > 20) {
      paragraphs.push(text);
    }
  }

  return { title, paragraphs };
}

function determinePublishedDate(html: string, baseUrl: string): string {
  // Try multiple date patterns
  const datePatterns = [
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']*)["']/i,
    /<meta[^>]*name=["']date["'][^>]*content=["']([^"']*)["']/i,
    /<time[^>]*datetime=["']([^"']*)["']/i,
    /(\d{4}-\d{2}-\d{2})/,
  ];

  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
  }

  return new Date().toISOString();
}

export async function scrapeWebSources(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const processed = new Set<string>();

  for (const source of WEB_SOURCES) {
    try {
      console.log(`  Fetching web: ${source.name}...`);
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        console.log(`    ✗ ${source.name}: HTTP ${response.status}`);
        continue;
      }

      const html = await response.text();
      const baseUrl = new URL(source.url);
      const links = extractLinksFromHtml(html, source.url);

      let sourceItems = 0;
      for (const link of links.slice(0, 15)) {
        if (processed.has(link.url)) continue;
        processed.add(link.url);

        const category = categorizeContent(link.title, link.snippet);

        allItems.push({
          source: source.source,
          source_type: 'web',
          title: link.title.length > 200 ? link.title.slice(0, 197) + '...' : link.title,
          summary: link.snippet.slice(0, 300),
          content: link.snippet,
          url: link.url,
          author: source.name,
          category: category as 'model' | 'research' | 'product' | 'safety' | 'policy' | 'other',
          published_at: determinePublishedDate(html, source.url),
        });
        sourceItems++;
      }

      console.log(`    ✓ ${source.name}: ${sourceItems} items`);
    } catch (error) {
      console.log(`    ✗ ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return allItems;
}

export async function scrapeArticleContent(url: string): Promise<{ title: string; content: string; date: string } | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const { title, paragraphs } = extractArticleContent(html);
    const date = determinePublishedDate(html, url);

    return {
      title: title || 'Untitled',
      content: paragraphs.join('\n\n'),
      date,
    };
  } catch {
    return null;
  }
}
