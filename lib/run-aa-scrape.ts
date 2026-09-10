import { fetchAAData, mergeAAIntoModels, readAACatalog } from './aa-scraper';
import { readSlimModelDatabase, writeSlimModelDatabase } from './model-registry';
import { slimToModelRecord } from './models-catalog';

async function main() {
  console.log('=== AA index scrape ===');
  await fetchAAData();

  const aa = readAACatalog();
  const slim = readSlimModelDatabase();
  const records = (slim?.models || []).map(slimToModelRecord);
  const merged = mergeAAIntoModels(records as unknown as Array<Record<string, unknown>>, aa);
  console.log(`Merged into slim: ${merged.updated} fields, ${merged.added} new from ${aa.length} AA models`);

  writeSlimModelDatabase({
    updatedAt: new Date().toISOString(),
    sources: ['openrouter', 'aa'],
    counts: {
      total: records.length,
      withPricing: records.filter(m => m.promptPrice !== undefined).length,
      withBenchmarks: records.filter(m => m.intelligenceIndex !== undefined).length,
      withElo: records.filter(m => m.elo !== undefined).length,
      openWeights: records.filter(m => m.family === 'open-weights').length,
    },
    models: records,
  });

  const out = readSlimModelDatabase();
  const withSpeed = out?.models.filter(m => m.aaSpeed != null).length;
  const withCost = out?.models.filter(m => m.aaCostPerTask != null).length;
  const withVerb = out?.models.filter(m => m.aaVerbosity != null).length;
  const fable = out?.models.find(m => m.aaSlug === 'claude-fable-5-1' || /fable 5\.1/i.test(m.name));
  console.log(`slim total=${out?.total} speed=${withSpeed} cost=${withCost} verb=${withVerb}`);
  console.log('fable', fable);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
