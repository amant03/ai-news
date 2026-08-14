import { Pool, PoolClient } from 'pg';
import { NewsItem } from './types';
import { normalizeTitle } from './dedupe';
import { classifyDomain } from './categorize';

/**
 * PostgreSQL persistence layer for AI Pulse.
 *
 * The agent keeps writing the JSON snapshot (so the serverless/Vercel build
 * keeps working), but everything is ALSO mirrored into Postgres, which keeps
 * the full history (no 30-day / 2500-item pruning) and powers the API with
 * proper pagination, facets, and agent run logs.
 *
 * Set DATABASE_URL (e.g. postgresql://postgres:postgres@127.0.0.1:5432/ainews)
 * to enable. When it is missing or unreachable, every function here degrades
 * to "nothing" so callers fall back to the JSON store.
 */

export function getPgConfig(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return url;
}

export function hasPg(): boolean {
  return !!getPgConfig();
}

let pool: Pool | null = null;

export function getPool(): Pool | null {
  const cfg = getPgConfig();
  if (!cfg) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: cfg,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    pool.on('error', err => {
      console.error('[pg] idle client error:', err.message);
    });
  }
  return pool;
}

async function withClient<T>(fn: (c: PoolClient) => Promise<T>): Promise<T | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const client = await p.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[pg] query failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
CREATE OR REPLACE FUNCTION normalize_title_clean(t TEXT) RETURNS TEXT AS $$
  SELECT lower(regexp_replace(coalesce(t, ''), '[^a-z0-9]+', ' ', 'g'));
$$ LANGUAGE sql IMMUTABLE;

CREATE TABLE IF NOT EXISTS news_items (
  id            BIGSERIAL PRIMARY KEY,
  url           TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  summary       TEXT,
  content       TEXT,
  source        TEXT,
  source_label  TEXT,
  source_type   TEXT,
  author        TEXT,
  category      TEXT,
  domain        TEXT,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  source_detail TEXT,
  image_url     TEXT,
  score         DOUBLE PRECISION,
  num_comments  INTEGER,
  tweet_metrics JSONB
);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_source ON news_items (source);
CREATE INDEX IF NOT EXISTS idx_news_source_type ON news_items (source_type);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_items (category);
CREATE INDEX IF NOT EXISTS idx_news_domain ON news_items (domain);

CREATE TABLE IF NOT EXISTS agent_runs (
  id            BIGSERIAL PRIMARY KEY,
  ran_at        TIMESTAMPTZ DEFAULT now(),
  environment   TEXT,
  duration_ms   INTEGER,
  inserted      INTEGER,
  known         INTEGER,
  pruned        INTEGER,
  total_after   INTEGER,
  source_counts JSONB,
  log_tail      TEXT,
  status        TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_ran ON agent_runs (ran_at DESC);

CREATE TABLE IF NOT EXISTS models (
  id                 TEXT PRIMARY KEY,
  name               TEXT,
  provider           TEXT,
  source             TEXT,
  released           TEXT,
  family             TEXT,
  params             TEXT,
  context            TEXT,
  description        TEXT,
  prompt_price       DOUBLE PRECISION,
  completion_price   DOUBLE PRECISION,
  value_score        DOUBLE PRECISION,
  intelligence_index DOUBLE PRECISION,
  coding_index       DOUBLE PRECISION,
  agentic_index      DOUBLE PRECISION,
  hf_downloads       BIGINT,
  hf_likes           BIGINT,
  elo                DOUBLE PRECISION,
  arena_rank         INTEGER,
  num_votes          BIGINT,
  license            TEXT,
  mentions           INTEGER,
  reddit_mentions    INTEGER,
  x_mentions         INTEGER,
  buzz               INTEGER,
  free_tier          BOOLEAN,
  local_only         BOOLEAN,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS status (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
`;

export async function initPgSchema(): Promise<boolean> {
  const ok = await withClient(async c => {
    await c.query(SCHEMA_SQL);
    return true;
  });
  return !!ok;
}

// ---------------------------------------------------------------------------
// News items
// ---------------------------------------------------------------------------

interface Row {
  url: string;
  title: string;
  summary: string | null;
  content: string | null;
  source: string | null;
  source_label: string | null;
  source_type: string | null;
  author: string | null;
  category: string | null;
  domain: string | null;
  published_at: string | null;
  created_at: string | null;
  source_detail: string | null;
  image_url: string | null;
  score: number | null;
  num_comments: number | null;
  tweet_metrics: Record<string, unknown> | null;
}

function rowToNewsItem(r: Row): NewsItem {
  return {
    id: undefined,
    source: r.source || 'other',
    source_label: r.source_label || undefined,
    source_type: (r.source_type as NewsItem['source_type']) || 'web',
    title: r.title,
    summary: r.summary || '',
    content: r.content || r.summary || '',
    url: r.url,
    author: r.author || '',
    category: (r.category as NewsItem['category']) || 'other',
    domain: (r.domain as NewsItem['domain']) || undefined,
    published_at: r.published_at || new Date().toISOString(),
    created_at: r.created_at || undefined,
    source_detail: r.source_detail || undefined,
    image_url: r.image_url || undefined,
    score: r.score ?? undefined,
    num_comments: r.num_comments ?? undefined,
    tweet_metrics: r.tweet_metrics
      ? {
          likeCount: Number(r.tweet_metrics.likeCount) || 0,
          retweetCount: Number(r.tweet_metrics.retweetCount) || 0,
          replyCount: Number(r.tweet_metrics.replyCount) || 0,
          viewCount: Number(r.tweet_metrics.viewCount) || 0,
        }
      : undefined,
  };
}

function newsItemToRow(i: NewsItem): Record<string, unknown> {
  return {
    url: i.url,
    title: i.title,
    summary: i.summary || null,
    content: i.content || i.summary || null,
    source: i.source || 'other',
    source_label: i.source_label || null,
    source_type: i.source_type || 'web',
    author: i.author || null,
    category: i.category || 'other',
    domain: i.domain || classifyDomain(i.title, i.summary || i.content),
    published_at: i.published_at || new Date().toISOString(),
    source_detail: i.source_detail || null,
    image_url: i.image_url || null,
    score: i.score ?? null,
    num_comments: i.num_comments ?? null,
    tweet_metrics: i.tweet_metrics ? JSON.stringify(i.tweet_metrics) : null,
  };
}

/**
 * Upsert a batch of news items. Returns { inserted, known } mirroring the
 * JSON-store semantics. URL is the unique key; near-duplicates by title are
 * also rejected against existing rows in the batch.
 */
export async function upsertNewsItemsPg(items: NewsItem[]): Promise<{ inserted: number; known: number }> {
  if (!hasPg() || items.length === 0) return { inserted: 0, known: 0 };
  const ok = await withClient(async c => {
    let inserted = 0;
    let known = 0;
    const seenTitles = new Set<string>();
    const seenUrls = new Set<string>();

    for (const item of items) {
      if (!item.url || !item.title) {
        known++;
        continue;
      }
      const nt = normalizeTitle(item.title);
      if (seenTitles.has(nt) || seenUrls.has(item.url)) {
        known++;
        continue;
      }

      const dup = await c.query('SELECT 1 FROM news_items WHERE url = $1 OR normalize_title_clean($2) = normalize_title_clean(title) LIMIT 1', [
        item.url,
        item.title,
      ]);
      if ((dup.rowCount ?? 0) > 0) {
        known++;
        continue;
      }

      const row = newsItemToRow(item);
      const cols = Object.keys(row);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      await c.query(
        `INSERT INTO news_items (${cols.join(', ')}) VALUES (${placeholders})
         ON CONFLICT (url) DO NOTHING`,
        cols.map(k => row[k])
      );
      seenTitles.add(nt);
      seenUrls.add(item.url);
      inserted++;
    }
    return { inserted, known };
  });
  return ok || { inserted: 0, known: 0 };
}

export interface PgNewsQuery {
  limit: number;
  offset: number;
  source?: string;
  category?: string;
  sourceType?: string;
  domain?: string;
}

export async function getNewsPg(q: PgNewsQuery): Promise<NewsItem[]> {
  const ok = await withClient(async c => {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (col: string, val: string | undefined) => {
      if (val && val !== 'all') {
        params.push(val);
        where.push(`${col} = $${params.length}`);
      }
    };
    add('source', q.source);
    add('source_type', q.sourceType);
    add('category', q.category);
    add('domain', q.domain);

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(q.limit);
    const limitIdx = params.length;
    params.push(q.offset);
    const offsetIdx = params.length;

    const res = await c.query(
      `SELECT * FROM news_items ${whereSql}
       ORDER BY published_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    return (res.rows as Row[]).map(rowToNewsItem);
  });
  return ok || [];
}

export async function countNewsPg(q: Omit<PgNewsQuery, 'limit' | 'offset'>): Promise<number> {
  const ok = await withClient(async c => {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (col: string, val: string | undefined) => {
      if (val && val !== 'all') {
        params.push(val);
        where.push(`${col} = $${params.length}`);
      }
    };
    add('source', q.source);
    add('source_type', q.sourceType);
    add('category', q.category);
    add('domain', q.domain);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const res = await c.query(`SELECT count(*)::int AS n FROM news_items ${whereSql}`, params);
    return Number(res.rows[0]?.n || 0);
  });
  return ok ?? 0;
}

export async function getFacetsPg(): Promise<{
  sources: Array<{ value: string; label: string; count: number; type: string }>;
  categories: Array<{ value: string; label: string; count: number; type: string }>;
  types: Array<{ value: string; label: string; count: number; type: string }>;
  domains: Array<{ value: string; label: string; count: number; type: string }>;
}> {
  const ok = await withClient(async c => {
    const sources = await c.query(
      `SELECT COALESCE(source, 'other') AS value, count(*)::int AS count
       FROM news_items GROUP BY COALESCE(source, 'other') ORDER BY count DESC`
    );
    const sourceMeta = await c.query(
      `SELECT DISTINCT ON (COALESCE(source, 'other')) COALESCE(source, 'other') AS value,
              source_label, source_type
       FROM news_items
       WHERE source_label IS NOT NULL
       ORDER BY COALESCE(source, 'other'), published_at DESC`
    );
    const metaByValue = new Map<string, { source_label: string | null; source_type: string | null }>();
    for (const r of sourceMeta.rows as Array<{ value: string; source_label: string | null; source_type: string | null }>) {
      metaByValue.set(r.value, { source_label: r.source_label, source_type: r.source_type });
    }
    const categories = await c.query(`SELECT category AS value, count(*)::int AS count FROM news_items WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC`);
    const types = await c.query(`SELECT source_type AS value, count(*)::int AS count FROM news_items WHERE source_type IS NOT NULL GROUP BY source_type ORDER BY count DESC`);
    const domains = await c.query(`SELECT COALESCE(domain, 'general') AS value, count(*)::int AS count FROM news_items GROUP BY domain ORDER BY count DESC`);
    return {
      sources: (sources.rows as Array<{ value: string; count: number }>).map(r => {
        const meta = metaByValue.get(r.value);
        return {
          value: r.value,
          label: meta?.source_label || r.value,
          count: r.count,
          type: meta?.source_type || 'web',
        };
      }),
      categories: (categories.rows as Array<{ value: string; count: number }>).map(r => ({ value: r.value, label: r.value, count: r.count, type: 'category' })),
      types: (types.rows as Array<{ value: string; count: number }>).map(r => ({ value: r.value, label: r.value, count: r.count, type: 'type' })),
      domains: (domains.rows as Array<{ value: string; count: number }>).map(r => ({ value: r.value, label: r.value, count: r.count, type: 'domain' })),
    };
  });
  return (
    ok || {
      sources: [],
      categories: [],
      types: [],
      domains: [],
    }
  );
}

// ---------------------------------------------------------------------------
// Agent runs (the agent's output, shown in the UI)
// ---------------------------------------------------------------------------

export interface AgentRun {
  id: number;
  ran_at: string;
  environment: string | null;
  duration_ms: number | null;
  inserted: number | null;
  known: number | null;
  pruned: number | null;
  total_after: number | null;
  source_counts: Record<string, number> | null;
  log_tail: string | null;
  status: string | null;
}

export interface AgentRunInput {
  environment: string;
  durationMs: number;
  inserted: number;
  known: number;
  pruned: number;
  totalAfter: number;
  source_counts: Record<string, number>;
  log_tail: string;
  status: string;
}

export async function recordAgentRunPg(run: AgentRunInput): Promise<boolean> {
  if (!hasPg()) return false;
  const ok = await withClient(async c => {
    await c.query(
      `INSERT INTO agent_runs (environment, duration_ms, inserted, known, pruned, total_after, source_counts, log_tail, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        run.environment || 'local',
        run.durationMs ?? null,
        run.inserted ?? null,
        run.known ?? null,
        run.pruned ?? null,
        run.totalAfter ?? null,
        run.source_counts ? JSON.stringify(run.source_counts) : null,
        run.log_tail || null,
        run.status || 'ok',
      ]
    );
    return true;
  });
  return !!ok;
}

export async function getAgentRunsPg(limit = 10): Promise<AgentRun[]> {
  const ok = await withClient(async c => {
    const res = await c.query(`SELECT * FROM agent_runs ORDER BY ran_at DESC LIMIT $1`, [limit]);
    return (res.rows as unknown as AgentRun[]).map(r => ({
      ...r,
      source_counts: typeof r.source_counts === 'string' ? JSON.parse(r.source_counts as unknown as string) : r.source_counts,
    }));
  });
  return ok || [];
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export async function upsertModelsPg(models: Array<Record<string, unknown>>): Promise<boolean> {
  if (!hasPg() || models.length === 0) return false;
  const ok = await withClient(async c => {
    for (const m of models) {
      if (!m.id) continue;
      await c.query(
        `INSERT INTO models (id, name, provider, source, released, family, params, context, description,
                             prompt_price, completion_price, value_score, intelligence_index, coding_index, agentic_index,
                             hf_downloads, hf_likes, elo, arena_rank, num_votes, license, mentions, reddit_mentions,
                             x_mentions, buzz, free_tier, local_only)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, provider = EXCLUDED.provider, source = EXCLUDED.source,
           released = EXCLUDED.released, family = EXCLUDED.family, params = EXCLUDED.params,
           context = EXCLUDED.context, description = EXCLUDED.description,
           prompt_price = EXCLUDED.prompt_price, completion_price = EXCLUDED.completion_price,
           value_score = EXCLUDED.value_score, intelligence_index = EXCLUDED.intelligence_index,
           coding_index = EXCLUDED.coding_index, agentic_index = EXCLUDED.agentic_index,
           hf_downloads = EXCLUDED.hf_downloads, hf_likes = EXCLUDED.hf_likes,
           elo = EXCLUDED.elo, arena_rank = EXCLUDED.arena_rank, num_votes = EXCLUDED.num_votes,
           license = EXCLUDED.license, mentions = EXCLUDED.mentions,
           reddit_mentions = EXCLUDED.reddit_mentions, x_mentions = EXCLUDED.x_mentions,
           buzz = EXCLUDED.buzz, free_tier = EXCLUDED.free_tier, local_only = EXCLUDED.local_only,
           updated_at = now()`,
        [
          m.id, m.name ?? null, m.provider ?? null, m.source ?? null, m.released ?? null,
          m.family ?? null, m.params ?? null, m.context ?? null, m.description ?? null,
          m.promptPrice ?? null, m.completionPrice ?? null, m.valueScore ?? null,
          m.intelligenceIndex ?? null, m.codingIndex ?? null, m.agenticIndex ?? null,
          m.hfDownloads ?? null, m.hfLikes ?? null, m.elo ?? null, m.arenaRank ?? null,
          m.numVotes ?? null, m.license ?? null, m.mentions ?? null, m.redditMentions ?? null,
          m.xMentions ?? null, m.buzz ?? null, m.freeTier ?? null, m.localOnly ?? null,
        ]
      );
    }
    return true;
  });
  return !!ok;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export async function writeStatusPg(key: string, value: unknown): Promise<boolean> {
  if (!hasPg()) return false;
  const ok = await withClient(async c => {
    await c.query(
      `INSERT INTO status (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
    return true;
  });
  return !!ok;
}

export async function readStatusPg(key: string): Promise<unknown | null> {
  const ok = await withClient(async c => {
    const res = await c.query(`SELECT value FROM status WHERE key = $1`, [key]);
    if (!res.rows[0]) return null;
    const v = res.rows[0].value;
    return typeof v === 'string' ? JSON.parse(v) : v;
  });
  return ok ?? null;
}
