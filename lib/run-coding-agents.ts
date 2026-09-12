import { scrapeCodingAgents } from './coding-agents-scraper';

scrapeCodingAgents()
  .then(n => {
    console.log(`[run-coding-agents] refreshed ${n} agents`);
    process.exit(0);
  })
  .catch(err => {
    console.error('[run-coding-agents] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
