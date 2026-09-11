import fs from 'fs';
import path from 'path';
import { parseAADatasets, mergeAAIntoModels, type AAModelEntry } from './aa-scraper';
import { readSlimModelDatabase, type SlimModel } from './model-registry';

/**
 * Per-model AA harvester.
 *
 * For every catalog model missing benchmark metrics, fetches its
 * artificialanalysis.ai model page (skipped when AA has no such page) and
 * harvests the embedded class-peer datasets — one page typically yields a
 * dozen models. Merges everything into data/models-slim.json.
 *
 * Usage: npx tsx lib/aa-model-harvest.ts [maxPages]
 *   maxPages caps fetched pages (CI uses a small daily cap; default: all).
 */

const AA_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function coreOf(name: string): string {
  return name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function candidateSlugs(name: string): string[] {
  const full = slugOf(name);
  const core = slugOf(name.replace(/\(.*?\)/g, ''));
  const short = core.split('-').slice(0, 4).join('-');
  const out = [full];
  if (core && core !== full) out.push(core);
  if (short && short !== core && short !== full && short.length >= 8) out.push(short);
  return out;
}

async function fetchModelPage(slug: string): Promise<string | null> {
  const res = await fetch(`https://artificialanalysis.ai/models/${slug}`, {
    signal: AbortSignal.timeout(25_000),
    headers: AA_HEADERS,
  });
  if (res.status === 404) return null;
  if (res.status === 429 || res.status === 503) throw new Error(`rate-limited HTTP ${res.status}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function needsMetrics(m: SlimModel): boolean {
  return (
    m.intelligenceIndex == null ||
    m.aaSpeed == null ||
    m.aaCostPerTask == null ||
    m.aaVerbosity == null ||
    m.aaLatency == null
  );
}

async function main(): Promise<void> {
  const maxPages = parseInt(process.argv[2] || '', 10) || Infinity;
  const slim = readSlimModelDatabase();
  if (!slim) {
    console.error('[harvest] No data/models-slim.json found');
    process.exit(1);
  }

  const queue = slim.models.filter(needsMetrics);
  console.log(`[harvest] ${queue.length} of ${slim.models.length} models need metrics (cap: ${maxPages === Infinity ? 'none' : maxPages})`);

  const harvested = new Set<string>();
  const isCovered = (name: string) => {
    const c = coreOf(name);
    if (!c) return false;
    for (const h of harvested) {
      if (h.includes(c) || c.includes(h)) return true;
    }
    return false;
  };

  const pool: AAModelEntry[] = [];
  let fetched = 0;
  let hits = 0;
  let consecutiveFails = 0;

  for (const m of queue) {
    if (fetched >= maxPages) {
      console.log('[harvest] page cap reached');
      break;
    }
    if (isCovered(m.name || '')) continue;

    let html: string | null = null;
    let hitSlug = '';
    for (const slug of candidateSlugs(m.name || '')) {
      if (fetched >= maxPages) break;
      fetched++;
      try {
        const page = await fetchModelPage(slug);
        if (page) {
          html = page;
          hitSlug = slug;
          break;
        }
      } catch (err) {
        consecutiveFails++;
        console.log(`[harvest] ${slug}: ${err instanceof Error ? err.message : err}`);
        if (consecutiveFails >= 5) {
          console.log('[harvest] too many failures, aborting');
          break;
        }
        await sleep(8000);
      }
      await sleep(350);
    }
    if (consecutiveFails >= 5) break;
    if (!html) continue;

    consecutiveFails = 0;
    hits++;
    const rows = parseAADatasets(html);
    console.log(`[harvest] HIT ${(m.name || '').slice(0, 40)} <- ${hitSlug} (${rows.length} rows)`);
    for (const r of rows) {
      pool.push(r);
      const c = coreOf(r.name);
      if (c) harvested.add(c);
    }
    await sleep(900);
  }

  console.log(`[harvest] fetched ${fetched} pages, ${hits} hits, ${pool.length} rows`);
  if (pool.length === 0) {
    console.log('[harvest] nothing harvested, keeping existing data');
    return;
  }

  const merged = mergeAAIntoModels(slim.models as unknown as Array<Record<string, unknown>>, pool);
  slim.updatedAt = new Date().toISOString();
  const fp = path.join(process.cwd(), 'data', 'models-slim.json');
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(slim, null, 2));
  console.log(`[harvest] slim saved: ${merged.updated} fields updated, ${merged.added} models added`);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => {
    console.error('[harvest] failed:', err);
    process.exit(1);
  });
}
