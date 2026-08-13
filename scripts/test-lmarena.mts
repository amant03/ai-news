import { scrapeLmarenaRanks } from '../lib/model-registry.js';

const rows = await scrapeLmarenaRanks();
console.log('lmarena rows:', rows.length);
rows.slice(0, 12).forEach(m =>
  console.log(`  ${m.name} | ${m.provider} | ${m.license || '-'} | elo=${m.elo} | votes=${m.numVotes} | $${m.promptPrice}/${m.completionPrice}`)
);
