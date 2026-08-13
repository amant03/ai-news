import { fetchTwitterTimeline } from '../lib/twitter.js';

process.env.AGENT_MODE = 'ci';
process.env.X_SCRAPING = 'true';
process.env.JINA_ONLY = 'true';

const started = Date.now();
const items = await fetchTwitterTimeline();
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\nTOTAL: ${items.length} tweets in ${elapsed}s`);
const bySrc: Record<string, number> = {};
for (const i of items) bySrc[i.source_label || 'unknown'] = (bySrc[i.source_label || 'unknown'] || 0) + 1;
console.log(JSON.stringify(bySrc));
console.log('\n--- sample items ---');
items.slice(0, 12).forEach(i => console.log(`  [${i.source_label}] ${i.title.slice(0, 95)}`));