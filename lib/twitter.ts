import { NewsItem } from './types';

interface TwitterAccount {
  username: string;
  source: string;
  displayName: string;
}

const ACCOUNTS: TwitterAccount[] = [
  { username: 'OpenAI', source: 'openai', displayName: 'OpenAI' },
  { username: 'AnthropicAI', source: 'anthropic', displayName: 'Anthropic' },
  { username: 'GoogleDeepMind', source: 'google', displayName: 'Google DeepMind' },
  { username: 'MistralAI', source: 'mistral', displayName: 'Mistral AI' },
  { username: 'AIatMeta', source: 'meta', displayName: 'Meta AI' },
  { username: 'deepseek_ai', source: 'deepseek', displayName: 'DeepSeek' },
  { username: 'Alibaba_Qwen', source: 'qwen', displayName: 'Qwen' },
  { username: 'GoogleAI', source: 'google', displayName: 'Google AI' },
  { username: 'huggingface', source: 'huggingface', displayName: 'Hugging Face' },
];

// Nitter instances for RSS fallback
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.lacontrevoie.fr',
  'https://nitter.1d4.us',
  'https://nitter.kavin.rocks',
];

function categorize(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(model|gpt|claude|gemini|llama|mistral|deepseek|qwen|release|launch|introducing)\b/.test(lower)) return 'model';
  if (/\b(research|paper|study|benchmark|arxiv|findings)\b/.test(lower)) return 'research';
  if (/\b(product|feature|update|tool|api|platform|app|available)\b/.test(lower)) return 'product';
  if (/\b(safety|alignment|security|guardrail)\b/.test(lower)) return 'safety';
  if (/\b(policy|regulation|governance)\b/.test(lower)) return 'policy';
  return 'other';
}

// Try extracting user ID from x.com HTML
async function extractUserId(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://x.com/${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Try to find user ID in the embedded initial state
    const userIdMatch = html.match(/"user_id":"(\d+)"/);
    if (userIdMatch) return userIdMatch[1];

    // Try alternate patterns
    const restIdMatch = html.match(/"rest_id":"(\d+)"/);
    if (restIdMatch) return restIdMatch[1];

    // Try JSON-LD
    const jsonldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonldMatch) {
      try {
        const jsonld = JSON.parse(jsonldMatch[1]);
        if (jsonld.mainEntity?.identifier) return jsonld.mainEntity.identifier;
      } catch { /* ignore */ }
    }

    return null;
  } catch {
    return null;
  }
}

// Scrape tweets from x.com HTML
async function scrapeUserPage(username: string): Promise<NewsItem[]> {
  const items: NewsItem[] = [];

  try {
    const res = await fetch(`https://x.com/${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return items;

    const html = await res.text();

    // Extract tweets from the page's embedded data
    // Look for tweet data in the initial state JSON
    const tweetBlocks = html.match(/<div[^>]*data-testid="tweet"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g);
    
    if (tweetBlocks) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      for (const block of tweetBlocks.slice(0, 20)) {
        const textMatch = block.match(/data-testid="tweetText"[^>]*>([\s\S]*?)<\/div>/);
        if (!textMatch) continue;

        const rawText = textMatch[1].replace(/<[^>]*>/g, '').trim();
        if (!rawText || rawText.startsWith('@')) continue;

        // Try to extract timestamp
        const timeMatch = block.match(/datetime="([^"]+)"/);
        const publishedAt = timeMatch ? timeMatch[1] : new Date().toISOString();

        // Skip tweets older than 1 month
        if (new Date(publishedAt) < oneMonthAgo) continue;

        // Extract tweet ID for URL
        const tweetIdMatch = block.match(/status\/(\d+)/);
        const tweetId = tweetIdMatch ? tweetIdMatch[1] : '';

        // Extract metrics
        const likeMatch = block.match(/data-testid="like"[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/);
        const retweetMatch = block.match(/data-testid="retweet"[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/);

        // Find the matching account
        const account = ACCOUNTS.find(a => a.username === username);
        if (!account) continue;

        items.push({
          source: account.source,
          source_type: 'twitter',
          title: rawText.length > 150 ? rawText.slice(0, 147) + '...' : rawText,
          summary: rawText,
          content: rawText,
          url: `https://x.com/${username}/status/${tweetId}`,
          author: account.displayName,
          category: categorize(rawText) as 'model' | 'research' | 'product' | 'safety' | 'policy' | 'other',
          published_at: publishedAt,
          tweet_metrics: {
            likeCount: likeMatch ? parseInt(likeMatch[1]) : 0,
            retweetCount: retweetMatch ? parseInt(retweetMatch[1]) : 0,
            replyCount: 0,
            viewCount: 0,
          },
        });
      }
    }

    return items;
  } catch {
    return items;
  }
}

// Fetch via Nitter RSS (most reliable)
async function fetchViaNitter(account: TwitterAccount): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  for (const instance of NITTER_INSTANCES) {
    try {
      const res = await fetch(`${instance}/${account.username}/rss`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;

      const text = await res.text();
      const entries = text.match(/<item>[\s\S]*?<\/item>/g);
      if (!entries) continue;

      for (const entry of entries) {
        const title = entry.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          || entry.match(/<title>(.*?)<\/title>/)?.[1];
        const link = entry.match(/<link>(.*?)<\/link>/)?.[1];
        const pubDate = entry.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
        const desc = entry.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
          || entry.match(/<description>(.*?)<\/description>/)?.[1];

        if (!title || !link) continue;
        
        const tweetDate = pubDate ? new Date(pubDate) : new Date();
        if (tweetDate < oneMonthAgo) continue;

        const cleanText = title.replace(/<[^>]*>/g, '').trim();
        items.push({
          source: account.source,
          source_type: 'twitter',
          title: cleanText.length > 150 ? cleanText.slice(0, 147) + '...' : cleanText,
          summary: cleanText,
          content: desc ? desc.replace(/<[^>]*>/g, '') : cleanText,
          url: link,
          author: account.displayName,
          category: categorize(cleanText) as 'model' | 'research' | 'product' | 'safety' | 'policy' | 'other',
          published_at: tweetDate.toISOString(),
          tweet_metrics: { likeCount: 0, retweetCount: 0, replyCount: 0, viewCount: 0 },
        });
      }

      if (items.length > 0) {
        console.log(`  ✓ @${account.username} (Nitter): ${items.length} tweets`);
        return items;
      }
    } catch {
      continue;
    }
  }
  return items;
}

// Try X API v1.1 with guest token
async function fetchViaAPI(account: TwitterAccount): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  const bearerToken = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  try {
    // Get guest token
    const guestRes = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!guestRes.ok) return items;
    const { guest_token } = await guestRes.json();

    // Get user timeline
    const timelineRes = await fetch(
      `https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${account.username}&count=200&tweet_mode=extended&exclude_replies=true&include_rts=false`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'x-guest-token': guest_token,
          'User-Agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!timelineRes.ok) return items;

    const tweets = await timelineRes.json();
    if (!Array.isArray(tweets)) return items;

    for (const tweet of tweets) {
      const text = tweet.full_text || tweet.text;
      if (!text) continue;

      const tweetDate = new Date(tweet.created_at);
      if (tweetDate < oneMonthAgo) continue;

      items.push({
        source: account.source,
        source_type: 'twitter',
        title: text.length > 150 ? text.slice(0, 147) + '...' : text,
        summary: text,
        content: text,
        url: `https://x.com/${account.username}/status/${tweet.id_str}`,
        author: account.displayName,
        category: categorize(text) as 'model' | 'research' | 'product' | 'safety' | 'policy' | 'other',
        published_at: tweet.created_at,
        tweet_metrics: {
          likeCount: tweet.favorite_count || 0,
          retweetCount: tweet.retweet_count || 0,
          replyCount: tweet.reply_count || 0,
          viewCount: 0,
        },
      });
    }

    console.log(`  ✓ @${account.username} (API): ${items.length} tweets`);
    return items;
  } catch {
    return items;
  }
}

export async function fetchTwitterTimeline(): Promise<NewsItem[]> {
  console.log('  Fetching Twitter/X timelines for past 30 days...');
  const allItems: NewsItem[] = [];

  for (const account of ACCOUNTS) {
    let items: NewsItem[] = [];

    // Strategy 1: X API v1.1 with guest token
    // Strategy 2: Nitter RSS
    // Strategy 3: X.com HTML scraping

    items = await fetchViaAPI(account);
    if (items.length === 0) {
      items = await fetchViaNitter(account);
    }
    if (items.length === 0) {
      console.log(`  Trying HTML scrape for @${account.username}...`);
      items = await scrapeUserPage(account.username);
    }

    if (items.length === 0) {
      console.log(`  ⚠ No tweets found for @${account.username}`);
    }

    allItems.push(...items);
    // Rate limiting delay
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`  📊 Total tweets fetched: ${allItems.length}`);
  return allItems;
}
