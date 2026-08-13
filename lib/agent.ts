import { NewsItem } from './types';
import { initDB, upsertNewsItems, pruneStore, readStore } from './db';
import { loadSummaryCache, saveSummaryCache, enrichItem } from './ollama';
import { AgentStatus, readStatus, writeStatus, recordSourceResult } from './status';
import { fetchRSSFeeds } from './rss';
import { fetchGoogleNews } from './google-news';
import { fetchHackerNews } from './hackernews';
import { fetchReddit } from './reddit';
import { fetchArxiv } from './arxiv';
import { fetchYouTube } from './youtube';
import { fetchGitHub } from './github';
import { fetchTwitterTimeline } from './twitter';
import { scrapeWebSources } from './web-scraper';

interface SourceSpec {
  key: string;
  label: string;
  fn: () => Promise<NewsItem[]>;
  skipInCi?: boolean;
}

const SOURCES: SourceSpec[] = [
  { key: 'rss', label: 'Company + Media RSS', fn: fetchRSSFeeds },
  { key: 'google-news', label: 'Google News', fn: fetchGoogleNews },
  { key: 'hackernews', label: 'Hacker News', fn: fetchHackerNews },
  { key: 'reddit', label: 'Reddit', fn: fetchReddit },
  { key: 'arxiv', label: 'arXiv', fn: fetchArxiv },
  { key: 'youtube', label: 'YouTube', fn: fetchYouTube },
  { key: 'github', label: 'GitHub', fn: fetchGitHub },
  { key: 'web', label: 'Web scraping', fn: scrapeWebSources },
  { key: 'twitter', label: 'X / Twitter', fn: fetchTwitterTimeline, skipInCi: true },
];

export interface RunResult {
  sourceCounts: Record<string, number>;
  inserted: number;
  known: number;
  totalAfter: number;
  pruned: number;
  durationMs: number;
  environment: string;
}

export async function runAgent(options?: {
  regenerateKB?: boolean;
  skipOllama?: boolean;
  sourceFilter?: string[];
}): Promise<RunResult> {
  console.log('🔄 Starting AI news agent...');
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log(`   Environment: ${process.env.AGENT_MODE === 'ci' ? 'CI (GitHub Actions)' : 'local'}`);

  await initDB();
  const start = Date.now();

  const cache = loadSummaryCache();
  const status: AgentStatus = {
    lastRun: new Date().toISOString(),
    environment: process.env.AGENT_MODE === 'ci' ? 'ci' : 'local',
    sources: readStatus().sources || {},
  };

  const isCi = process.env.AGENT_MODE === 'ci';
  const sourceFilter = options?.sourceFilter;

  const enabledSources = SOURCES.filter(
    s =>
      (!isCi || !s.skipInCi || process.env.X_SCRAPING === 'true') &&
      (!sourceFilter || sourceFilter.includes(s.key))
  );

  // Run all sources in parallel; each is individually fault-tolerant.
  const results = await Promise.all(
    enabledSources.map(async spec => {
      const t0 = Date.now();
      try {
        const items = await spec.fn();
        recordSourceResult(status, spec.key, true, items.length);
        console.log(`   [${spec.key}] ${items.length} items in ${Date.now() - t0}ms`);
        return { key: spec.key, items };
      } catch (error) {
        recordSourceResult(status, spec.key, false, 0, error instanceof Error ? error.message : 'unknown error');
        console.log(`   [${spec.key}] FAILED: ${error instanceof Error ? error.message : error}`);
        return { key: spec.key, items: [] as NewsItem[] };
      }
    })
  );

  const allItems: NewsItem[] = [];
  const sourceCounts: Record<string, number> = {};
  for (const r of results) {
    sourceCounts[r.key] = r.items.length;
    allItems.push(...r.items);
  }

  console.log(`\n📊 Total fetched: ${allItems.length} items`);

  // Enrich summaries/categories (Ollama when available, else keyword fallback).
  let enriched = 0;
  if (!options?.skipOllama && allItems.length > 0) {
    console.log('🧠 Enriching with LLM (Ollama if available)...');
    for (const item of allItems) {
      try {
        const result = await enrichItem(item.title, item.content || item.summary, cache);
        if (result.summary && result.summary !== item.summary) {
          item.summary = result.summary;
        }
        item.category = result.category;
        enriched++;
      } catch {
        // keep defaults
      }
    }
  } else {
    // Keyword categorization is already applied per-source; nothing more to do.
  }
  console.log(`   Enriched ${enriched} items`);

  // Persist
  const { inserted, known } = await upsertNewsItems(allItems);
  const pruned = await pruneStore(30, 2500);

  const store = readStore();
  status.lastSuccess = new Date().toISOString();
  status.totalItems = store.items.length;
  status.insertedLastRun = inserted;
  saveSummaryCache(cache);
  writeStatus(status);

  // Regenerate the markdown knowledge base if requested.
  if (options?.regenerateKB) {
    try {
      const { generateKnowledgeBase } = await import('./knowledge-base-generator');
      await generateKnowledgeBase();
    } catch (error) {
      console.log(`   KB regen skipped: ${error instanceof Error ? error.message : error}`);
    }
  }

  const durationMs = Date.now() - start;
  console.log(`\n✅ Done. Inserted ${inserted} new, ${known} known, pruned ${pruned}. Total ${store.items.length} items in ${(durationMs / 1000).toFixed(1)}s`);

  return {
    sourceCounts,
    inserted,
    known,
    totalAfter: store.items.length,
    pruned,
    durationMs,
    environment: process.env.AGENT_MODE === 'ci' ? 'ci' : 'local',
  };
}
