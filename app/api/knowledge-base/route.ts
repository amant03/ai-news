import { NextResponse } from 'next/server';
import { fetchRSSFeeds } from '@/lib/rss';
import { fetchTwitterTimeline } from '@/lib/twitter';
import { initDB, insertNewsItem } from '@/lib/db';
import { sum } from '@/lib/ollama';

export async function POST() {
  console.log('[KB] First-time knowledge base population...');
  console.log(`[KB] Time: ${new Date().toISOString()}`);

  await initDB();

  // Fetch from RSS feeds
  console.log('[KB] Fetching RSS feeds...');
  const rssItems = await fetchRSSFeeds();
  let rssInserted = 0;

  for (const item of rssItems) {
    try {
      const enhanced = await sum(item.title, item.content);
      if (enhanced) {
        item.summary = enhanced.summary || item.summary;
        item.category = enhanced.category || item.category;
      }
    } catch { /* Ollama not available, use defaults */ }
    
    const inserted = await insertNewsItem(item);
    if (inserted) rssInserted++;
  }

  // Fetch from Twitter
  console.log('[KB] Fetching Twitter/X timelines...');
  const twitterItems = await fetchTwitterTimeline();
  let twitterInserted = 0;

  for (const item of twitterItems) {
    const inserted = await insertNewsItem(item);
    if (inserted) twitterInserted++;
  }

  const result = {
    success: true,
    rss: { total: rssItems.length, inserted: rssInserted },
    twitter: { total: twitterItems.length, inserted: twitterInserted },
    totalInserted: rssInserted + twitterInserted,
    timestamp: new Date().toISOString(),
  };

  console.log(`[KB] Done: ${rssInserted}/${rssItems.length} RSS + ${twitterInserted}/${twitterItems.length} Twitter = ${rssInserted + twitterInserted} new items`);

  return NextResponse.json(result);
}
