import { NewsItem } from './types';
import { categorizeContent } from './categorize';
import type { Browser, Page } from 'puppeteer';

interface TwitterAccount {
  username: string;
  source: string;
  displayName: string;
  // Founder / executive signals get boosted in the UI.
  executive?: boolean;
}

/**
 * The heart of the model feed: founders, CEOs and official AI model providers.
 * Ordered roughly by signal value. Twitter/X is the highest-signal channel for
 * model releases, benchmark claims and capability announcements.
 */
const ACCOUNTS: TwitterAccount[] = [
  // Founders & CEOs
  { username: 'elonmusk', source: 'xai', displayName: 'Elon Musk', executive: true },
  { username: 'sama', source: 'openai', displayName: 'Sam Altman', executive: true },
  { username: 'DarioAmodei', source: 'anthropic', displayName: 'Dario Amodei', executive: true },
  { username: 'demishassabis', source: 'google', displayName: 'Demis Hassabis', executive: true },
  { username: 'ylecun', source: 'meta', displayName: 'Yann LeCun', executive: true },
  { username: 'fchollet', source: 'other', displayName: 'François Chollet', executive: true },
  { username: 'AndrewYNg', source: 'other', displayName: 'Andrew Ng', executive: true },
  { username: 'sundarpichai', source: 'google', displayName: 'Sundar Pichai', executive: true },
  { username: 'gdb', source: 'anthropic', displayName: 'Greg Brockman', executive: true },
  { username: 'miramurati', source: 'other', displayName: 'Mira Murati', executive: true },
  { username: 'IOEN_C', source: 'other', displayName: 'Ilya Sutskever', executive: true },
  { username: 'karpathy', source: 'other', displayName: 'Andrej Karpathy', executive: true },
  { username: 'AravindSrinivas', source: 'perplexity', displayName: 'Aravind Srinivas', executive: true },
  { username: 'Jim_Fan', source: 'other', displayName: 'Jim Fan', executive: true },

  // Model providers — official accounts
  { username: 'OpenAI', source: 'openai', displayName: 'OpenAI' },
  { username: 'AnthropicAI', source: 'anthropic', displayName: 'Anthropic' },
  { username: 'GoogleDeepMind', source: 'google', displayName: 'Google DeepMind' },
  { username: 'GoogleAI', source: 'google', displayName: 'Google AI' },
  { username: 'MistralAI', source: 'mistral', displayName: 'Mistral AI' },
  { username: 'AIatMeta', source: 'meta', displayName: 'Meta AI' },
  { username: 'deepseek_ai', source: 'deepseek', displayName: 'DeepSeek' },
  { username: 'Alibaba_Qwen', source: 'qwen', displayName: 'Qwen' },
  { username: 'huggingface', source: 'huggingface', displayName: 'Hugging Face' },
  { username: 'hf_inference', source: 'huggingface', displayName: 'Hugging Face' },
  { username: 'xai', source: 'xai', displayName: 'xAI' },
  { username: 'MicrosoftAI', source: 'microsoft-ai', displayName: 'Microsoft AI' },
  { username: 'nvidia', source: 'nvidia', displayName: 'NVIDIA' },
  { username: 'groqinc', source: 'groq', displayName: 'Groq' },
  { username: 'Perplexity_AI', source: 'perplexity', displayName: 'Perplexity' },
  { username: 'cohere', source: 'cohere', displayName: 'Cohere' },
  { username: 'togethercompute', source: 'together', displayName: 'Together AI' },
  { username: 'ollama', source: 'ollama', displayName: 'Ollama' },
  { username: 'databricks', source: 'databricks', displayName: 'Databricks' },
  { username: 'Cerebras', source: 'cerebras', displayName: 'Cerebras' },

  // Benchmark / evaluation trackers — the "who's on top" signal
  { username: 'lmarena_ai', source: 'lmarena', displayName: 'LMArena' },
  { username: 'ArtificialAnlys', source: 'artificial-analysis', displayName: 'Artificial Analysis' },
  { username: 'SWEbench', source: 'swebench', displayName: 'SWE-bench' },
  { username: 'LiveBench_org', source: 'livebench', displayName: 'LiveBench' },
];

const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
  'https://nitter.space',
];

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Hard cap so a noisy account can't flood the feed.
const PER_ACCOUNT_CAP = 6;
const TOTAL_CAP = 220;

function shouldScrapeX(): boolean {
  if (process.env.DISABLE_X_SCRAPING === 'true') return false;
  if (process.env.VERCEL === '1') return false; // serverless: no headless browser
  if (process.env.AGENT_MODE === 'ci' && process.env.X_SCRAPING !== 'true') return false;
  return true;
}

export async function fetchTwitterTimeline(): Promise<NewsItem[]> {
  console.log('  Fetching X/Twitter timelines (best-effort)...');
  const allItems: NewsItem[] = [];

  for (const account of ACCOUNTS) {
    let items: NewsItem[] = [];

    // Nitter RSS is the fastest, most reliable path (no login wall).
    if (shouldScrapeX()) {
      items = await fetchViaNitter(account);
    }

    if (items.length === 0 && shouldScrapeX()) {
      console.log(`  Trying Puppeteer for @${account.username}...`);
      items = await scrapeWithPuppeteer(account);
    }

    if (items.length === 0) {
      items = await fetchViaGuestApi(account);
    }

    if (items.length === 0) {
      console.log(`  ⚠ No tweets for @${account.username}`);
    } else {
      console.log(`  ✓ @${account.username}: ${items.length} tweets`);
      allItems.push(...items.slice(0, PER_ACCOUNT_CAP));
    }

    await new Promise(r => setTimeout(r, 600));
    if (allItems.length >= TOTAL_CAP) break;
  }

  console.log(`  📊 Total tweets fetched: ${allItems.length}`);
  return allItems;
}

async function scrapeWithPuppeteer(account: TwitterAccount): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  let browser: Browser | null = null;

  try {
    const puppeteerMod = await import('puppeteer');
    const launch = puppeteerMod.default?.launch ?? puppeteerMod.launch;
    if (typeof launch !== 'function') return items;

    browser = await launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
    });

    const page: Page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(`https://x.com/${account.username}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    // Wait for tweets to render (may hit the login wall — fine, we degrade gracefully)
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 7000 }).catch(() => null);

    const tweets = (await page.$$eval(
      'article[data-testid="tweet"]',
      els =>
        els.slice(0, 12).map(el => {
          const textEl = el.querySelector('[data-testid="tweetText"]');
          const text = textEl ? (textEl as HTMLElement).innerText : '';
          const timeEl = el.querySelector('time');
          const date = timeEl?.getAttribute('datetime') || '';
          const linkEl = el.querySelector('a[href*="/status/"]');
          const link = linkEl?.getAttribute('href') || '';
          const likeEl = el.querySelector('[data-testid="like"]');
          const likeText = likeEl?.getAttribute('aria-label') || '';
          const repostEl = el.querySelector('[data-testid="retweet"]');
          const repostText = repostEl?.getAttribute('aria-label') || '';
          const imgEl = el.querySelector('img[src*="pbs.twimg.com/media"]');
          const img = imgEl?.getAttribute('src') || '';
          return { text, date, link, likeText, repostText, img };
        })
    )) as { text: string; date: string; link: string; likeText: string; repostText: string; img: string }[];

    for (const t of tweets) {
      if (!t.text) continue;
      const publishedAt = t.date || new Date().toISOString();
      if (Date.now() - new Date(publishedAt).getTime() > MAX_AGE_MS) continue;

      const likeMatch = t.likeText.match(/([\d.,]+[KkMm]?)/);
      const repostMatch = t.repostText.match(/([\d.,]+[KkMm]?)/);

      items.push({
        source: account.source,
        source_label: account.displayName,
        source_type: 'twitter',
        title: t.text.length > 150 ? t.text.slice(0, 147) + '...' : t.text,
        summary: t.text,
        content: t.text,
        url: t.link
          ? `https://x.com${t.link}`
          : `https://x.com/${account.username}/status`,
        author: account.displayName,
        category: categorizeContent(t.text, ''),
        published_at: publishedAt,
        source_detail: account.executive ? 'X · Founder' : 'X',
        image_url: t.img || undefined,
        tweet_metrics: {
          likeCount: likeMatch ? parseCompact(likeMatch[1]) : 0,
          retweetCount: repostMatch ? parseCompact(repostMatch[1]) : 0,
          replyCount: 0,
          viewCount: 0,
        },
      });
    }
  } catch (error) {
    console.log(`  ✗ X scrape @${account.username}: ${error instanceof Error ? error.message : 'error'}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }

  return items;
}

function parseCompact(value: string): number {
  const n = parseFloat(value.replace(/,/g, '').replace(/K$/i, '').replace(/M$/i, ''));
  if (isNaN(n)) return 0;
  if (/M$/i.test(value)) return Math.round(n * 1_000_000);
  if (/K$/i.test(value)) return Math.round(n * 1_000);
  return Math.round(n);
}

async function fetchViaNitter(account: TwitterAccount): Promise<NewsItem[]> {
  const items: NewsItem[] = [];

  for (const instance of NITTER_INSTANCES) {
    try {
      const res = await fetch(`${instance}/${account.username}/rss`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;

      const text = await res.text();
      const entries = text.match(/<item>[\s\S]*?<\/item>/g);
      if (!entries || entries.length === 0) continue;

      for (const entry of entries.slice(0, 15)) {
        const title = entry.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || entry.match(/<title>(.*?)<\/title>/)?.[1];
        const link = entry.match(/<link>(.*?)<\/link>/)?.[1];
        const pubDate = entry.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
        if (!title || !link) continue;
        const tweetDate = pubDate ? new Date(pubDate) : new Date();
        if (Date.now() - tweetDate.getTime() > MAX_AGE_MS) continue;

        const clean = title.replace(/<[^>]*>/g, '').trim();
        const media = entry.match(/<media:content[^>]*url=["']([^"']+)["']/i) || entry.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
        const mediaUrl = media?.[1]?.replace(/&amp;/g, '&');
        items.push({
          source: account.source,
          source_label: account.displayName,
          source_type: 'twitter',
          title: clean.length > 150 ? clean.slice(0, 147) + '...' : clean,
          summary: clean,
          content: clean,
          url: link,
          author: account.displayName,
          category: categorizeContent(clean, ''),
          published_at: tweetDate.toISOString(),
          source_detail: account.executive ? 'X · Founder' : 'X',
          image_url: mediaUrl && /\.(jpe?g|png|webp|gif|avif)/i.test(mediaUrl) ? mediaUrl : undefined,
          tweet_metrics: { likeCount: 0, retweetCount: 0, replyCount: 0, viewCount: 0 },
        });
      }

      if (items.length > 0) return items;
    } catch {
      continue;
    }
  }
  return items;
}

async function fetchViaGuestApi(account: TwitterAccount): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  try {
    const res = await fetch(`https://r.jina.ai/https://x.com/${account.username}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return items;
    const text = await res.text();
    const lines = text
      .split('\n')
      .filter(
        l =>
          l.trim().length > 20 &&
          !/^(Title|URL|URL Source|Author|Published|Updated|Published Time|Updated Time|Note|Source)\s*:/.test(l)
      );
    for (const line of lines.slice(0, 10)) {
      const clean = line.replace(/^###?\s*/, '').replace(/[\[\]()#@]/g, '').trim();
      if (clean.length < 20) continue;
      items.push({
        source: account.source,
        source_label: account.displayName,
        source_type: 'twitter',
        title: clean.length > 150 ? clean.slice(0, 147) + '...' : clean,
        summary: clean,
        content: clean,
        url: `https://x.com/${account.username}`,
        author: account.displayName,
        category: categorizeContent(clean, ''),
        published_at: new Date().toISOString(),
        source_detail: account.executive ? 'X · Founder' : 'X',
        tweet_metrics: { likeCount: 0, retweetCount: 0, replyCount: 0, viewCount: 0 },
      });
    }
    return items;
  } catch {
    return items;
  }
}