/**
 * Quick image backfill — fetches og:image for items missing images,
 * falls back to entity mapping. Directly updates data/news.json.
 * Run: npx tsx scripts/backfill-images.ts
 */
import fs from 'fs';
import path from 'path';
import { enrichImages } from '../lib/image-enrichment';

const DATA_FILE = path.join(process.cwd(), 'data', 'news.json');

interface Store {
  meta: { lastUpdated: string; count: number };
  items: Array<{ url: string; title: string; image_url?: string; [k: string]: unknown }>;
}

function readStore(): Store {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeStore(store: Store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

async function main() {
  console.log('Loading news items...');
  const store = readStore();
  const items = store.items || [];
  console.log(`Total: ${items.length} items`);

  const needImg = items.filter(i => !i.image_url && !/news\.google\.com/i.test(i.url || ''));
  console.log(`Missing images (excluding Google News): ${needImg.length}`);

  if (needImg.length === 0) {
    console.log('All items have images. Nothing to do.');
    return;
  }

  const result = await enrichImages(items as any);
  console.log(`Result:`, result);

  // Save directly — no dedup logic, just write the updated items
  store.meta.lastUpdated = new Date().toISOString();
  store.meta.count = store.items.length;
  writeStore(store);

  const withImg = items.filter(i => i.image_url).length;
  console.log(`Done! ${withImg}/${items.length} items now have images.`);
}

main().catch(console.error);
