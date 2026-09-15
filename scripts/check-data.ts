/**
 * Data health check (free, read-only, no commits).
 *
 * Runs every 8h via .github/workflows/data-check.yml and fails loudly when
 * the site's data is stale, thin, or unreachable — plus a light cross-check
 * against the live sources (Artificial Analysis, OpenRouter) so drift gets
 * caught instead of silently served. A red workflow emails the repo owner.
 *
 * Usage: npx tsx scripts/check-data.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const results: Check[] = [];
function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}: ${detail}`);
}

function readJson(rel: string): any | null {
  try {
    const f = join(process.cwd(), rel);
    if (!existsSync(f)) return null;
    return JSON.parse(readFileSync(f, 'utf-8'));
  } catch {
    return null;
  }
}

async function reachable(url: string, timeoutMs = 15000): Promise<{ ok: boolean; status?: number }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

async function main() {
  console.log('[check-data] freshness + coverage + online cross-check');

  // 1. News freshness (agent runs every 4h; tolerate 12h).
  const news = readJson('data/news.json');
  const items: any[] = Array.isArray(news) ? news : news?.items || [];
  const newest = items.reduce((m, i) => {
    const t = new Date(i.published_at || 0).getTime();
    return Number.isFinite(t) && t > m ? t : m;
  }, 0);
  const newsAgeH = newest ? (Date.now() - newest) / 3600000 : Infinity;
  check('news fresh', items.length > 100 && newsAgeH < 12, `${items.length} items, newest ${Number.isFinite(newsAgeH) ? newsAgeH.toFixed(1) + 'h' : 'never'} old`);

  // 2. Model catalog depth.
  const slim = readJson('data/models-slim.json');
  const models: any[] = slim?.models || [];
  const withIntel = models.filter(m => m.intelligenceIndex != null).length;
  check('models catalog', models.length > 100 && withIntel > 40, `${models.length} models, ${withIntel} with intelligence`);

  // 3. Coding-agents board freshness (refreshed by the 4h agent job).
  const agents = readJson('data/coding-agents.json');
  const agentsAgeH = agents?.updatedAt ? (Date.now() - new Date(agents.updatedAt).getTime()) / 3600000 : Infinity;
  check('coding-agents fresh', (agents?.models?.length || 0) > 0 && agentsAgeH < 30, `${agents?.models?.length || 0} agents, updated ${Number.isFinite(agentsAgeH) ? agentsAgeH.toFixed(1) + 'h' : 'never'} ago`);

  // 4. Provider coverage for the frontier (top-20 by intelligence).
  // Uses the same alias-aware resolution as the providers page — display
  // names drift ("... (Adaptive Reasoning, Max Effort, ...)" vs the
  // canonical key), so a naive slug would report false gaps.
  const { canonicalSlug, allSlugsFor } = await import('../lib/model-slug.js');
  const providers = readJson('data/aa-providers.json');
  const top20 = [...models]
    .filter(m => m.intelligenceIndex != null)
    .sort((a, b) => b.intelligenceIndex - a.intelligenceIndex)
    .slice(0, 20);
  const resolveEntry = (m: any) => {
    const keys = [canonicalSlug(m.name || ''), ...allSlugsFor({ id: m.id, name: m.name, aaSlug: m.aaSlug })];
    for (const k of keys) {
      const e = providers?.models?.[k];
      if (e && Array.isArray(e.providers) && e.providers.length > 0) return e;
    }
    return null;
  };
  const covered = top20.filter(m => resolveEntry(m) !== null).length;
  check('provider coverage top-20', top20.length > 0 && covered / top20.length >= 0.7, `${covered}/${top20.length} top models have providers`);

  // 5. Fable 5.1 specifically (user-flagged): must resolve with 2+ providers.
  const fable = top20.find(m => /fable/i.test(m.name || ''));
  const fableRows = fable ? resolveEntry(fable)?.providers?.length || 0 : 0;
  check('fable providers', !fable || fableRows >= 2, fable ? `${fableRows} providers for ${fable.name}` : 'fable not in top-20');

  // 6. Online cross-checks (sources reachable + rough parity).
  const aa = await reachable('https://artificialanalysis.ai/models');
  check('AA reachable', aa.ok, aa.ok ? `HTTP ${aa.status}` : 'unreachable');
  let orCount = 0;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = (await res.json()) as { data?: unknown[] };
      orCount = Array.isArray(data?.data) ? data.data.length : 0;
    }
  } catch { /* ignore */ }
  check('openrouter parity', orCount > 0 && models.length > orCount * 0.2, `openrouter lists ${orCount}, we track ${models.length}`);

  const failed = results.filter(r => !r.ok);
  console.log(`[check-data] ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.error(`[check-data] FAILING: ${failed.map(f => f.name).join(', ')}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[check-data] crashed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
