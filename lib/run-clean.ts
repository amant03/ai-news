import { readStore, writeStore } from './db';

function stripHtml(input: string): string {
  // If we start mid-attribute (no leading "<"), cut everything up to the last ">".
  const lastGt = input.lastIndexOf('>');
  const start = lastGt >= 0 ? lastGt + 1 : 0;
  return input
    .slice(start)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const store = readStore();
let removed = 0;
let fixed = 0;

const cleaned = store.items.map(item => {
  // Drop junk titles from the jina.ai guest API (boilerplate lines).
  if (/^(URL Source|Title|Author|Published|Updated|Source)\s*:/i.test(item.title)) {
    removed++;
    return null;
  }

  // Drop branch-push style GitHub noise.
  if (item.source_type === 'github' && /refs\/heads\//.test(item.title)) {
    removed++;
    return null;
  }

  // Fix raw HTML leaked into summaries.
  if (/<[a-z][^>]*>/i.test(item.summary) || /(?:text-[a-z-]+|bg-[a-z-]+|mb-\d+|mt-\d+|label-[a-z-]+|class=|\s*>)/i.test(item.summary)) {
    item.summary = stripHtml(item.summary).slice(0, 300);
    fixed++;
  }
  if (/<[a-z][^>]*>/i.test(item.content || '')) {
    item.content = stripHtml(item.content || '').slice(0, 600);
  }

  // Drop "Credit: ..." / "URL Source" style image-credit snippets.
  if (/^(Credit:|URL Source:)/.test(item.title) && item.summary.length < 60) {
    removed++;
    return null;
  }

  return item;
}).filter(Boolean) as typeof store.items;

store.items = cleaned;
store.meta.count = cleaned.length;
writeStore(store);
console.log(`Cleaned: removed ${removed} junk items, fixed ${fixed} summaries. Total now ${cleaned.length}.`);