import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { fetchCommittedFile, commitJsonFile } from './github-data';

/**
 * Anonymous engagement store: per-story likes/dislikes + nested comments.
 *
 * Same free persistence pattern as the newsletter: local file in dev/CI,
 * committed `data/engagement.json` in production (needs GITHUB_DATA_TOKEN
 * with Contents write). No login — authors are free-text nicknames.
 * Server never trusts counts from clients; votes are +1/-1 deltas applied
 * to stored totals, with per-IP sliding-window rate limits in the API.
 */

const FILE = 'data/engagement.json';
const MAX_COMMENT_LEN = 2000;
const MAX_NICK_LEN = 40;
const MAX_COMMENTS_PER_ITEM = 500;

export interface ThreadComment {
  id: string;
  nick: string;
  text: string;
  created_at: string;
  likes: number;
  dislikes: number;
  replies: ThreadComment[];
}

export interface ItemEngagement {
  likes: number;
  dislikes: number;
  comments: ThreadComment[];
}

export type EngagementDb = Record<string, ItemEngagement>;

/** Stable key per story so renames/URL params don't split threads. */
export function engagementKey(input: { url?: string; title?: string }): string {
  const raw = (input.url || input.title || '').trim().toLowerCase().split('?')[0];
  return createHash('sha1').update(raw).digest('hex').slice(0, 16);
}

export function sanitizeNick(raw: unknown): string {
  const s = (raw ?? '').toString().replace(/[\r\n<>]+/g, ' ').trim().slice(0, MAX_NICK_LEN);
  return s || 'anon';
}

export function sanitizeText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.replace(/<[^>]*>/g, '').trim().slice(0, MAX_COMMENT_LEN);
  return s.length >= 2 ? s : null;
}

function emptyItem(): ItemEngagement {
  return { likes: 0, dislikes: 0, comments: [] };
}

function parseDb(text: string): EngagementDb {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const db: EngagementDb = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const r = v as Record<string, unknown>;
      db[k] = {
        likes: typeof r.likes === 'number' ? Math.max(0, Math.floor(r.likes)) : 0,
        dislikes: typeof r.dislikes === 'number' ? Math.max(0, Math.floor(r.dislikes)) : 0,
        comments: Array.isArray(r.comments) ? (r.comments as ThreadComment[]).filter(c => c && typeof c.id === 'string') : [],
      };
    }
    return db;
  } catch {
    return {};
  }
}

function readLocal(): EngagementDb | null {
  try {
    const p = join(process.cwd(), FILE);
    if (!existsSync(p)) return null;
    return parseDb(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function writeLocal(db: EngagementDb): boolean {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(join(process.cwd(), FILE), JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}

function repoConfigured(): boolean {
  return Boolean(process.env.DATA_REPO && process.env.GITHUB_DATA_TOKEN);
}

export async function loadEngagement(): Promise<EngagementDb> {
  const local = readLocal();
  if (local && Object.keys(local).length > 0) return local;
  try {
    const raw = await fetchCommittedFile(FILE, 15000);
    if (raw) {
      const db = parseDb(raw);
      if (Object.keys(db).length > 0) return db;
    }
  } catch {
    /* fall through */
  }
  return local ?? {};
}

async function persist(db: EngagementDb): Promise<{ ok: boolean; error?: string }> {
  if (repoConfigured()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      writeLocal(db); // best-effort cache
      const res = await commitJsonFile(FILE, db, 'engagement votes/comments');
      if (res.ok) return { ok: true };
    }
    return { ok: false, error: 'Could not save — please try again in a minute.' };
  }
  if (writeLocal(db)) return { ok: true };
  return { ok: false, error: 'Engagement is temporarily unavailable — please try again later.' };
}

export async function voteItem(key: string, dir: 'up' | 'down'): Promise<{ ok: boolean; likes: number; dislikes: number; error?: string }> {
  const db = await loadEngagement();
  const item = db[key] ?? emptyItem();
  if (dir === 'up') item.likes += 1;
  else item.dislikes += 1;
  db[key] = item;
  const res = await persist(db);
  if (!res.ok) return { ok: false, likes: item.likes, dislikes: item.dislikes, error: res.error };
  return { ok: true, likes: item.likes, dislikes: item.dislikes };
}

function findComment(list: ThreadComment[], id: string): ThreadComment | null {
  for (const c of list) {
    if (c.id === id) return c;
    const hit = findComment(c.replies || [], id);
    if (hit) return hit;
  }
  return null;
}

export async function addThreadComment(
  key: string,
  nick: string,
  text: string,
  parentId?: string
): Promise<{ ok: boolean; comment?: ThreadComment; error?: string; status?: number }> {
  const db = await loadEngagement();
  const item = db[key] ?? emptyItem();
  const count = (function walk(list: ThreadComment[]): number {
    return list.reduce((n, c) => n + 1 + walk(c.replies || []), 0);
  })(item.comments);
  if (count >= MAX_COMMENTS_PER_ITEM) {
    return { ok: false, error: 'Comment thread is full.', status: 429 };
  }
  const comment: ThreadComment = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    nick,
    text,
    created_at: new Date().toISOString(),
    likes: 0,
    dislikes: 0,
    replies: [],
  };
  if (parentId) {
    const parent = findComment(item.comments, parentId);
    if (!parent) return { ok: false, error: 'Parent comment not found.', status: 404 };
    parent.replies.push(comment);
  } else {
    item.comments.push(comment);
  }
  db[key] = item;
  const res = await persist(db);
  if (!res.ok) return { ok: false, error: res.error, status: 503 };
  return { ok: true, comment };
}

export async function voteThreadComment(
  key: string,
  id: string,
  dir: 'up' | 'down'
): Promise<{ ok: boolean; likes?: number; dislikes?: number; error?: string }> {
  const db = await loadEngagement();
  const item = db[key];
  if (!item) return { ok: false, error: 'Thread not found.' };
  const c = findComment(item.comments, id);
  if (!c) return { ok: false, error: 'Comment not found.' };
  if (dir === 'up') c.likes += 1;
  else c.dislikes += 1;
  const res = await persist(db);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, likes: c.likes, dislikes: c.dislikes };
}
