import fs from 'fs';
import path from 'path';
import { NewsItem } from './types';
import { isDuplicate } from './dedupe';
import { classifyDomain } from './categorize';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'news.json');

interface Store {
  meta: {
    lastRun?: string;
    lastUpdated?: string;
    count?: number;
  };
  items: NewsItem[];
}

const DEFAULT_STORE: Store = { meta: {}, items: [] };

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readStore(): Store {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    return { meta: {}, items: [] };
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { meta: {}, items: parsed };
    }
    return { meta: parsed.meta || {}, items: parsed.items || [] };
  } catch {
    return { meta: {}, items: [] };
  }
}

export function writeStore(store: Store) {
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_FILE);
}

export async function initDB() {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    writeStore(DEFAULT_STORE);
  }
}

/**
 * Batch upsert. Dedupes against existing items by URL + normalized title.
 * Returns counts of inserted vs already-known.
 */
export async function upsertNewsItems(items: NewsItem[]): Promise<{ inserted: number; known: number }> {
  const store = readStore();
  let inserted = 0;
  let known = 0;

  for (const item of items) {
    if (!item.url || !item.title) continue;
    const exists = store.items.some(existing => isDuplicate(existing, item));
    if (exists) {
      known++;
      continue;
    }
    store.items.push({
      ...item,
      id: Date.now() + Math.floor(Math.random() * 1000000),
      created_at: new Date().toISOString(),
    });
    inserted++;
  }

  if (inserted > 0) {
    store.meta.lastUpdated = new Date().toISOString();
    store.meta.count = store.items.length;
    writeStore(store);
  }

  return { inserted, known };
}

/**
 * Drop items older than maxAgeDays and cap the store size.
 * Always sorts newest-first.
 */
export async function pruneStore(maxAgeDays = 30, maxItems = 2500): Promise<number> {
  const store = readStore();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

  const before = store.items.length;
  store.items = store.items.filter(item => {
    const t = new Date(item.published_at).getTime();
    return !isNaN(t) && t >= cutoff;
  });

  store.items.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  if (store.items.length > maxItems) {
    store.items = store.items.slice(0, maxItems);
  }

  store.meta.count = store.items.length;
  if (store.items.length !== before) {
    writeStore(store);
  }
  return before - store.items.length;
}

export function getNewsItems(
  limit = 50,
  offset = 0,
  source?: string,
  category?: string,
  sourceType?: string,
  domain?: string
): NewsItem[] {
  const store = readStore();
  let filtered = store.items;

  if (source && source !== 'all') {
    filtered = filtered.filter(item => item.source === source || item.source_label?.toLowerCase() === source.toLowerCase());
  }
  if (category && category !== 'all') {
    filtered = filtered.filter(item => item.category === category);
  }
  if (sourceType && sourceType !== 'all') {
    filtered = filtered.filter(item => item.source_type === sourceType);
  }
  if (domain && domain !== 'all') {
    filtered = filtered.filter(item => (item.domain || classifyDomain(item.title, item.summary || item.content)) === domain);
  }

  return filtered.slice(offset, offset + limit);
}

export function getNewsCount(source?: string, category?: string, sourceType?: string, domain?: string): number {
  const store = readStore();
  let filtered = store.items;
  if (source && source !== 'all') filtered = filtered.filter(item => item.source === source || item.source_label?.toLowerCase() === source.toLowerCase());
  if (category && category !== 'all') filtered = filtered.filter(item => item.category === category);
  if (sourceType && sourceType !== 'all') filtered = filtered.filter(item => item.source_type === sourceType);
  if (domain && domain !== 'all') filtered = filtered.filter(item => (item.domain || classifyDomain(item.title, item.summary || item.content)) === domain);
  return filtered.length;
}

export interface Facet {
  value: string;
  label: string;
  count: number;
  type: string;
}

export function getFacets(): { sources: Facet[]; categories: Facet[]; types: Facet[]; domains: Facet[] } {
  const store = readStore();
  const sourceMap = new Map<string, { label: string; type: string; count: number }>();
  const categoryMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  const domainMap = new Map<string, number>();

  for (const item of store.items) {
    const s = item.source || 'other';
    const entry = sourceMap.get(s) || { label: item.source_label || s, type: item.source_type, count: 0 };
    entry.count++;
    sourceMap.set(s, entry);
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
    typeMap.set(item.source_type, (typeMap.get(item.source_type) || 0) + 1);
    const d = item.domain || 'general';
    domainMap.set(d, (domainMap.get(d) || 0) + 1);
  }

  const sources = [...sourceMap.entries()]
    .map(([value, v]) => ({ value, label: v.label, count: v.count, type: v.type }))
    .sort((a, b) => b.count - a.count);
  const categories = [...categoryMap.entries()].map(([value, count]) => ({ value, label: value, count, type: 'category' }));
  const types = [...typeMap.entries()].map(([value, count]) => ({ value, label: value, count, type: 'type' }));
  const domains = [...domainMap.entries()].map(([value, count]) => ({ value, label: value, count, type: 'domain' }));

  return { sources, categories, types, domains };
}

export function getStoreMeta() {
  return readStore().meta;
}
