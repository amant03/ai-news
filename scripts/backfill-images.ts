/**
 * One-shot script to backfill images on existing news items.
 * Run with: npx tsx scripts/backfill-images.ts
 */
import { readStore } from '../lib/db';
import { upsertNewsItems } from '../lib/db';
import { enrichImages } from '../lib/image-enrichment';

async function main() {
  console.log('Loading existing news items...');
  const store = readStore();
  const items = store.items || [];
  console.log(`Found ${items.length} items`);

  const result = await enrichImages(items);
  console.log(`Enrichment result:`, result);

  // Persist back to the store
  await upsertNewsItems(items);
  console.log('Done — news.json updated with images');
}

main().catch(console.error);
