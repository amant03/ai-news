import { scrapeAiTrends } from './ai-trends-scraper';

scrapeAiTrends()
  .then(n => {
    console.log(`[run-ai-trends] wrote ${n} trend points`);
    process.exit(0);
  })
  .catch(err => {
    console.error('[run-ai-trends] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
