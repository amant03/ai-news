import { fetchAAHtml, parseCurrentModel } from '../lib/aa-parse';

async function main() {
  for (const slug of ['deepseek-v4-pro-0903', 'mistral-large-3', 'deepseek-v4-1-flash']) {
    try {
      const html = await fetchAAHtml(`https://artificialanalysis.ai/models/${slug}`);
      const parsed = parseCurrentModel(html);
      console.log(slug, '-> family:', parsed?.family, '| intel:', parsed?.intelligenceIndex, '| name:', parsed?.name);
    } catch (err) {
      console.log(slug, 'FAILED:', err instanceof Error ? err.message : err);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
