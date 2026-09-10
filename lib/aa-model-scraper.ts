import { scrapeAAModelPages } from './aa-scraper';

export async function scrapeAllModels(): Promise<number> {
  const limit = Math.max(1, parseInt(process.env.AA_SCRAPE_LIMIT || '40', 10) || 40);
  return scrapeAAModelPages({ limit });
}

if (require.main === module) {
  scrapeAllModels()
    .then(n => {
      console.log(`[aa-model-scraper] updated ${n} pages`);
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
