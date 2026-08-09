import { initDB, insertNewsItem } from './db';
import { fetchRSSFeeds } from './rss';
import { fetchTwitterTimeline } from './twitter';
import { scrapeWebSources } from './web-scraper';
import { summarizeAndCategorize } from './ollama';
import { NewsItem } from './types';

export async function fetchAllNews(): Promise<{ rssCount: number; twitterCount: number; webCount: number; totalInserted: number }> {
  console.log('🔄 Starting news fetch...');
  console.log(`   Time: ${new Date().toISOString()}`);
  
  // Initialize database
  await initDB();
  
  // Fetch from RSS feeds
  console.log('\n📰 Fetching RSS feeds...');
  const rssItems = await fetchRSSFeeds();
  
  // Fetch from Twitter
  console.log('\n🐦 Fetching Twitter...');
  const twitterItems = await fetchTwitterTimeline();
  
  // Fetch from web sources (supplementary scraping)
  console.log('\n🌐 Fetching web sources...');
  const webItems = await scrapeWebSources();
  
  // Combine all items
  const allItems = [...rssItems, ...twitterItems, ...webItems];
  console.log(`\n📊 Total items fetched: ${allItems.length}`);
  
  // Process and insert items
  let insertedCount = 0;
  
  for (const item of allItems) {
    try {
      // Use Ollama to enhance summary and categorization
      const enhanced = await summarizeAndCategorize(item.title, item.content);
      
      const finalItem: NewsItem = {
        ...item,
        summary: enhanced.summary || item.summary,
        category: enhanced.category || item.category,
      };
      
      const inserted = await insertNewsItem(finalItem);
      if (inserted) {
        insertedCount++;
      }
    } catch (error) {
      console.error(`Failed to process item: ${item.title}`, error);
      // Insert without enhancement
      await insertNewsItem(item);
      insertedCount++;
    }
  }
  
  console.log(`\n✅ Done! Inserted ${insertedCount} new items`);
  
  return {
    rssCount: rssItems.length,
    twitterCount: twitterItems.length,
    webCount: webItems.length,
    totalInserted: insertedCount,
  };
}
