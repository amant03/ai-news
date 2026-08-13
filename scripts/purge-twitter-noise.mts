import { readStore, writeStore } from '../lib/db.js';
import { isNoiseTweet } from '../lib/twitter.js';

const store = readStore();
const before = store.items.length;
const twitterItems = store.items.filter(i => i.source_type === 'twitter');
const noise = twitterItems.filter(i => isNoiseTweet(i.title || ''));
console.log(`twitter total: ${twitterItems.length}, junk: ${noise.length}`);
noise.slice(0, 8).forEach(i => console.log('  junk: [' + i.source_label + '] ' + (i.title || '').slice(0, 60)));
store.items = store.items.filter(i => i.source_type !== 'twitter' || !isNoiseTweet(i.title || ''));
const after = store.items.length;
console.log(`items: ${before} -> ${after} (removed ${before - after})`);
writeStore(store);
