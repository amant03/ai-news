import { refreshModelDatabase, readModelDatabase } from '../lib/model-registry.js';
import { readStore } from '../lib/db.js';

const store = readStore();
const items = store.items || [];
console.log(`Scraping model database from ${items.length} stored items (multi-source)...`);

const db = await refreshModelDatabase(items);
console.log(`\nUpdated: ${db.updatedAt}`);
console.log(`Total: ${db.counts.total} | pricing: ${db.counts.withPricing} | benchmarks: ${db.counts.withBenchmarks} | elo: ${db.counts.withElo} | open-weights: ${db.counts.openWeights}`);

console.log('\n--- by source ---');
const bySrc: Record<string, number> = {};
for (const m of db.models) bySrc[m.source] = (bySrc[m.source] || 0) + 1;
for (const [k, v] of Object.entries(bySrc).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(12)} ${v}`);

console.log('\n--- top by intelligence ---');
db.models.filter(m => m.intelligenceIndex !== undefined).slice(0, 8).forEach(m =>
  console.log(`  ${m.name.padEnd(28)} AA=${m.intelligenceIndex} $${m.promptPrice ?? '?'}/${m.completionPrice ?? '?'} [${m.source}]`));

console.log('\n--- top by value for money ---');
db.models.filter(m => m.valueScore !== undefined).sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0)).slice(0, 8).forEach(m =>
  console.log(`  ${m.name.padEnd(28)} value=${m.valueScore} AA=${m.intelligenceIndex} $${m.promptPrice}/${m.completionPrice} [${m.source}]`));

console.log('\n--- top by HF downloads (open-weights) ---');
db.models.filter(m => m.hfDownloads).sort((a, b) => (b.hfDownloads ?? 0) - (a.hfDownloads ?? 0)).slice(0, 8).forEach(m =>
  console.log(`  ${m.name.padEnd(28)} dl=${m.hfDownloads} likes=${m.hfLikes} [${m.source}]`));

console.log('\n--- LMArena Elo top ---');
db.models.filter(m => m.elo !== undefined).sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0)).slice(0, 8).forEach(m =>
  console.log(`  ${m.name.padEnd(28)} elo=${m.elo} rank=${m.arenaRank} [${m.source}]`));

console.log('\n--- top by mentions ---');
db.models.filter(m => m.mentions).sort((a, b) => (b.mentions ?? 0) - (a.mentions ?? 0)).slice(0, 8).forEach(m =>
  console.log(`  ${m.name.padEnd(28)} mentions=${m.mentions} x=${m.xMentions ?? 0} reddit=${m.redditMentions ?? 0} [${m.source}]`));

console.log('\n--- latest releases ---');
db.models.filter(m => m.released).sort((a, b) => (b.released ?? '').localeCompare(a.released ?? '')).slice(0, 10).forEach(m =>
  console.log(`  ${m.name.padEnd(28)} ${(m.released || '').slice(0, 10)} [${m.source}]`));

console.log('\n--- free tier ---');
db.models.filter(m => m.freeTier).slice(0, 10).forEach(m => console.log(`  ${m.name} [${m.provider}]`));

console.log('\n--- local only (ollama) ---');
db.models.filter(m => m.localOnly).slice(0, 10).forEach(m => console.log(`  ${m.name} rank=${m.arenaRank}`));
