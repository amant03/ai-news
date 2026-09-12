import { refreshProviderComparisons } from './provider-endpoints';

const limit = Math.max(1, parseInt(process.env.PROVIDER_SCRAPE_LIMIT || '80', 10) || 80);

refreshProviderComparisons(limit)
  .then(n => {
    console.log(`[run-provider-endpoints] refreshed ${n} models`);
    process.exit(0);
  })
  .catch(err => {
    console.error('[run-provider-endpoints] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
