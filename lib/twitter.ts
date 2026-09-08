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
  { username: 'simonw', source: 'other', displayName: 'Simon Willison', executive: true },
  { username: 'noamshazeer', source: 'other', displayName: 'Noam Shazeer', executive: true },
  { username: 'EMostaque', source: 'stability', displayName: 'Emad Mostaque', executive: true },

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
  { username: 'stabilityai', source: 'stability', displayName: 'Stability AI' },
  { username: 'Replicate', source: 'replicate', displayName: 'Replicate' },
  { username: 'EleutherAI', source: 'eleuther', displayName: 'EleutherAI' },
  { username: 'NousResearch', source: 'nous', displayName: 'Nous Research' },
  { username: 'phind', source: 'phind', displayName: 'Phind' },
  { username: 'zhipu_ai', source: 'zhipu', displayName: 'Zhipu AI' },
  { username: 'MoonshotAI', source: 'moonshot', displayName: 'Moonshot AI' },
  { username: 'MiniMax_AI', source: 'minimax', displayName: 'MiniMax' },
  { username: 'RWKV', source: 'rwkv', displayName: 'RWKV' },
  { username: '01AI_org', source: '01ai', displayName: '01.AI' },
  { username: 'LiquidAI_', source: 'liquid', displayName: 'Liquid AI' },
  { username: 'cohereforai', source: 'cohere', displayName: 'Cohere For AI' },

  // Benchmark / evaluation trackers — the "who's on top" signal
  { username: 'lmarena_ai', source: 'lmarena', displayName: 'LMArena' },
  { username: 'ArtificialAnlys', source: 'artificial-analysis', displayName: 'Artificial Analysis' },
  { username: 'SWEbench', source: 'swebench', displayName: 'SWE-bench' },
  { username: 'LiveBench_org', source: 'livebench', displayName: 'LiveBench' },
  { username: 'open_nnet', source: 'nnet', displayName: 'NN-ETF' },
  { username: 'sasha_belitsky', source: 'other', displayName: 'Sasha Belitsky' },
  { username: 'abacaj', source: 'other', displayName: 'Alex Baca' },
];

/**
 * Hand-picked high-signal tweets (model releases, benchmark results) fetched
 * directly via X's public syndication endpoint. These always run regardless of
 * jina rate limits so the feed never misses a flagship announcement.
 */
const FEATURED_TWEETS: Array<{ url: string; username: string; source: string; displayName: string }> = [
  {
    url: 'https://x.com/ArtificialAnlys/status/2097025638695940590',
    username: 'ArtificialAnlys',
    source: 'artificial-analysis',
    displayName: 'Artificial Analysis',
  },
  {
    url: 'https://x.com/elonmusk/status/2097245786694099341',
    username: 'elonmusk',
    source: 'xai',
    displayName: 'Elon Musk',
  },
  {
    url: 'https://x.com/sama/status/2096647371983880383',
    username: 'sama',
    source: 'openai',
    displayName: 'Sam Altman',
  },
  {
    url: 'https://x.com/gdb/status/2097082100268802188',
    username: 'gdb',
    source: 'openai',
    displayName: 'Greg Brockman',
  },
  {
    url: 'https://x.com/sundarpichai/status/2097326390765109627',
    username: 'sundarpichai',
    source: 'google',
    displayName: 'Sundar Pichai',
  },
  {
    url: 'https://x.com/simonw/status/2096647325049626918',
    username: 'simonw',
    source: 'meta',
    displayName: 'Simon Willison',
  },
];

const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
  'https://nitter.space',
  'https://nitter.kavin.rocks',
  'https://nitter.1d4.us',
  'https://nitter.nicfab.it',
];

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Hard cap so a noisy account can't flood the feed.
const PER_ACCOUNT_CAP = 6;
const TOTAL_CAP = 260;
// jina free tier (no API key) rate-limits to ~20 rpm per IP. Hammering 46
// accounts in a tight loop trips 403s and the whole source returns 0 tweets.
// Without a key we scrape only the highest-signal subset with generous spacing.
const JINA_FREE_TIER_ACCOUNTS = 20;
const JINA_SPACING_MS = 3500;
const NITTER_SPACING_MS = 800;

function shouldScrapeX(): boolean {
  if (process.env.DISABLE_X_SCRAPING === 'true') return false;
  if (process.env.VERCEL === '1') return false; // serverless: no headless browser
  if (process.env.AGENT_MODE === 'ci' && process.env.X_SCRAPING !== 'true') return false;
  return true;
}

// Model-release / benchmark keywords. When an account posts a lot, we keep
// the model-focused tweets and drop the chit-chat.
const MODEL_SIGNAL = /\b(model|gpt|claude|gemini|grok|llama|mistral|deepseek|qwen|sonnet|opus|haiku|release|launch|benchmark|leaderboard|fine[- ]tun|open[- ]source|weights|context|agent|reasoning|paper|new|upgrade|update|now|today)\b/i;

/** Junk that jina renders from profile rails / dead pages — never real tweets. */
const NOISE_RE =
  /profile banner|this page doesn'?t exist|try searching for something else|^image\s*\d*:?|^!\s*image\s*\d+\s*:|^user avatar|^\d{1,2}:\d{2}\s|^replying to\b|^@[a-z0-9_]+$|account may be private|only available on the app|unable to show this account|^\d+\.\s+.+?https?:\/\/x\.com\//i;

export function isNoiseTweet(title: string): boolean {
  if (!title || title.length < 8) return true;
  if (NOISE_RE.test(title)) return true;
  if (/^https?:\/\//.test(title)) return true;
  const alpha = title.replace(/[^a-zA-Z]/g, '').length;
  return alpha < title.length * 0.3;
}

function sortForModelSignal(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => {
    const sa = MODEL_SIGNAL.test(a.title) ? 1 : 0;
    const sb = MODEL_SIGNAL.test(b.title) ? 1 : 0;
    if (sa !== sb) return sb - sa;
    return 0;
  });
}

export async function fetchTwitterTimeline(): Promise<NewsItem[]> {
  console.log('  Fetching X/Twitter timelines (best-effort)...');
  const allItems: NewsItem[] = [];

  // Featured tweets go through X's public syndication API first — it doesn't
  // trip the jina rate-limit wall, so flagship model news always lands.
  for (const t of FEATURED_TWEETS) {
    try {
      const item = await fetchFeaturedTweet(t);
      if (item) {
        console.log(`  ✓ featured @${t.username}: ${item.title.slice(0, 60)}...`);
        allItems.push(item);
      } else {
        console.log(`  ⚠ featured @${t.username} returned nothing`);
      }
    } catch (error) {
      console.log(`  ✗ featured @${t.username}: ${error instanceof Error ? error.message : 'error'}`);
    }
    await new Promise(r => setTimeout(r, JINA_SPACING_MS));
  }

  // Respect jina's free-tier rate limit: with no API key, scrape a focused
  // subset of the highest-signal accounts instead of all 46 (which 403s out).
  const hasJinaKey = !!process.env.JINA_API_KEY;
  const activeAccounts = hasJinaKey ? ACCOUNTS : ACCOUNTS.slice(0, JINA_FREE_TIER_ACCOUNTS);
  if (!hasJinaKey) {
    console.log(`   No JINA_API_KEY — limiting X scrape to ${activeAccounts.length} core accounts (${(JINA_SPACING_MS / 1000)}s spacing)`);
  }

  let consecutiveNitterFail = 0;

  for (const account of activeAccounts) {
    let items: NewsItem[] = [];

    // Nitter RSS is the primary path: fast, structured, no auth required.
    if (shouldScrapeX()) {
      items = await fetchViaNitter(account);
      if (items.length === 0) {
        consecutiveNitterFail++;
      } else {
        consecutiveNitterFail = 0;
      }
    }

    // If nitter fails for 5+ consecutive accounts, it's likely down — skip the rest.
    if (items.length === 0 && consecutiveNitterFail >= 5) {
      console.log(`   ⏹ Skipping remaining X accounts — nitter is unreachable (${consecutiveNitterFail} consecutive failures)`);
      break;
    }

    // jina reader is the fallback when nitter is down or returns nothing.
    if (items.length === 0 && shouldScrapeX()) {
      items = await fetchViaJinaReader(account);
    }

    // Last resort: headless browser (often hits the login wall — degrades gracefully).
    if (items.length === 0 && shouldScrapeX()) {
      console.log(`  Trying Puppeteer for @${account.username}...`);
      items = await scrapeWithPuppeteer(account);
    }

    if (items.length === 0) {
      console.log(`  ⚠ No tweets for @${account.username}`);
    } else {
      const kept = sortForModelSignal(items).slice(0, PER_ACCOUNT_CAP);
      console.log(`  ✓ @${account.username}: ${kept.length} tweets`);
      allItems.push(...kept);
    }

    await new Promise(r => setTimeout(r, JINA_SPACING_MS));
    if (allItems.length >= TOTAL_CAP) break;
  }

  console.log(`  📊 Total tweets fetched: ${allItems.length}`);
  return allItems;
}

interface SyndicationTweet {
  text?: string;
  created_at?: string;
  id_str?: string;
  favorite_count?: number;
  conversation_count?: number;
  retweet_count?: number;
  user?: { name?: string; screen_name?: string };
  mediaDetails?: Array<{ media_url_https?: string; type?: string }>;
  photos?: Array<{ url?: string }>;
}

/**
 * Fetch a single tweet via X's public syndication endpoint. No auth, no jina —
 * much more resistant to the rate-limit walls that block the timeline scrapes.
 */
async function fetchFeaturedTweet(meta: { url: string; username: string; source: string; displayName: string }): Promise<NewsItem | null> {
  const idMatch = meta.url.match(/status\/(\d+)/);
  if (!idMatch) return null;
  const id = idMatch[1];

  const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=x`, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
  });
  if (!res.ok) {
    console.log(`   syndication @${meta.username}: HTTP ${res.status}`);
    return null;
  }
  const data = (await res.json()) as SyndicationTweet;
  if (!data?.text) return null;

  const raw = data.text.replace(/https:\/\/t\.co\/\S+/g, '').replace(/\s+/g, ' ').trim();
  const text = raw.length > 280 ? raw.slice(0, 277) + '...' : raw;
  if (isNoiseTweet(text)) return null;

  const publishedAt = data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString();
  if (Date.now() - new Date(publishedAt).getTime() > MAX_AGE_MS) return null;

  const imageUrl =
    data.mediaDetails?.find(m => m.type === 'photo')?.media_url_https ||
    data.photos?.[0]?.url ||
    undefined;

  return {
    source: meta.source,
    source_label: meta.displayName,
    source_type: 'twitter',
    title: text,
    summary: text,
    content: text,
    url: meta.url,
    author: meta.displayName,
    category: categorizeContent(text, ''),
    published_at: publishedAt,
    source_detail: 'X',
    image_url: imageUrl,
    tweet_metrics: {
      likeCount: data.favorite_count ?? 0,
      retweetCount: data.retweet_count ?? 0,
      replyCount: data.conversation_count ?? 0,
      viewCount: 0,
    },
  };
}

let lastJinaRateLimited = false;

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
      if (isNoiseTweet(t.text)) continue;
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
        if (isNoiseTweet(clean)) continue;
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

async function fetchViaJinaReader(account: TwitterAccount): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  try {
    const headers: Record<string, string> = {
      'X-Return-Format': 'markdown',
      'X-Timeout': '15',
    };
    const apiKey = process.env.JINA_API_KEY;
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    // jina free tier rate-limits hard on x.com (403). One retry with backoff,
    // then move on — stacking retries just burns the rate-limit budget.
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(`https://r.jina.ai/https://x.com/${account.username}`, {
          signal: AbortSignal.timeout(20000),
          headers,
        });
      } catch (error) {
        if (attempt === 1) throw error;
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }
      if (res.status === 403 && attempt === 0) {
        console.log(`  ⏳ jina @${account.username}: 403, one retry in 6s...`);
        await new Promise(r => setTimeout(r, 6000));
        continue;
      }
      break;
    }
    if (!res) return items;
    if (res.status === 403) {
      lastJinaRateLimited = true;
      console.log(`  ✗ jina @${account.username}: HTTP 403 (rate limit)`);
      return items;
    }
    if (!res.ok) {
      console.log(`  ✗ jina @${account.username}: HTTP ${res.status}`);
      return items;
    }
    const text = await res.text();

    // jina flattens each tweet onto one line like:
    //   * [avatar](url) [Name](url) [@handle](url) [23h](status/123)  TEXT  [img](...) 1.2K 45 ...
    // A tweet can also span lines inside markdown. We split the whole document
    // on status anchors [date](x.com/<handle>/status/<id>), then attribute each
    // following segment (minus profile plumbing) as that tweet's text.
    const anchorRe = /\[([^\]]+)\]\(https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/(\d+)\)/g;
    const matches: Array<{ dateText: string; id: string; start: number; end: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(text)) !== null) {
      matches.push({ dateText: m[1], id: m[2], start: m.index, end: anchorRe.lastIndex });
    }

    const LOGIN_RE = /log in or sign up|continue with phone|see what's happening/i;
    const blocks: Array<{ id: string; dateText: string; text: string; img?: string }> = [];
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const next = matches[i + 1];
      const segment = text.slice(cur.end, next ? next.start : text.length);

      // Cut everything after the login-wall marker (profile footer).
      const wall = segment.search(LOGIN_RE);
      const chunk = (wall >= 0 ? segment.slice(0, wall) : segment).trim();
      if (!chunk) continue;

      const img = chunk.match(/!\[[^\]]*\]\(([^)]+)\)/);
      let cleaned = chunk
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/[#*_>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Strip trailing engagement numbers ("1.2K 45 908 78K") and any residue
      // handle that jina leaves before the next tweet ("@SpaceXAI").
      cleaned = cleaned.replace(/(?:\s+@?[A-Za-z0-9_.]{1,24})?\s+(\d+[.,]?\d*[KkMm]?)+\s*$/, '').trim();
      cleaned = cleaned.replace(/^\s*@[A-Za-z0-9_]+\s+/, '').trim();

      if (cleaned.length < 15) continue;
      if (isNoiseTweet(cleaned)) continue;

      blocks.push({
        id: cur.id,
        dateText: cur.dateText,
        text: cleaned,
        img: img?.[1] && /\.(jpe?g|png|webp|gif|avif)/i.test(img[1]) ? img[1] : undefined,
      });
      if (blocks.length >= 12) break;
    }

    for (const b of blocks) {
      const publishedAt = b.dateText ? dateTextToIso(b.dateText) : new Date().toISOString();
      if (Date.now() - new Date(publishedAt).getTime() > MAX_AGE_MS) continue;
      const clean = b.text.length > 150 ? b.text.slice(0, 147) + '...' : b.text;
      items.push({
        source: account.source,
        source_label: account.displayName,
        source_type: 'twitter',
        title: clean,
        summary: b.text,
        content: b.text,
        url: `https://x.com/${account.username}/status/${b.id}`,
        author: account.displayName,
        category: categorizeContent(clean, ''),
        published_at: publishedAt,
        source_detail: account.executive ? 'X · Founder' : 'X',
        image_url: b.img,
        tweet_metrics: { likeCount: 0, retweetCount: 0, replyCount: 0, viewCount: 0 },
      });
    }
    return items;
  } catch (error) {
    console.log(`  ✗ jina @${account.username}: ${error instanceof Error ? error.message : 'error'}`);
    return items;
  }
}

/**
 * X shows relative dates in the markdown ("23h", "25m", "3d", "just now")
 * or absolute ("Aug 10"). Convert to ISO.
 */
function dateTextToIso(dt: string): string {
  const d = dt.trim().toLowerCase();
  const now = Date.now();
  const rel = d.match(/^(\d+)\s*(s|m|h|d)$/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2];
    const ms = unit === 's' ? n * 1000 : unit === 'm' ? n * 60_000 : unit === 'h' ? n * 3_600_000 : n * 86_400_000;
    return new Date(now - ms).toISOString();
  }
  if (/just now/.test(d)) return new Date().toISOString();
  // "Aug 10" absolute — assume current year, roll back if it's in the future.
  const year = new Date().getFullYear();
  const parsed = new Date(`${dt}, ${year}`);
  if (isNaN(parsed.getTime())) return new Date().toISOString();
  if (parsed.getTime() > now) parsed.setFullYear(year - 1);
  return parsed.toISOString();
}