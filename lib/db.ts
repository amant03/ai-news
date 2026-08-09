import fs from 'fs';
import path from 'path';
import { NewsItem } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'news.json');

interface Store {
  items: NewsItem[];
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): Store {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    return { items: [] };
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

function writeStore(store: Store) {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export async function initDB() {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    writeStore({ items: [] });
  }
  console.log(`🗄️  Database: ${DB_FILE}`);
}

export async function insertNewsItem(item: NewsItem): Promise<boolean> {
  const store = readStore();
  const exists = store.items.some(existing => existing.url === item.url);
  if (exists) return false;

  store.items.push({
    ...item,
    id: Date.now() + Math.floor(Math.random() * 1000),
    created_at: new Date().toISOString(),
  });

  writeStore(store);
  return true;
}

export async function getNewsItems(
  limit: number = 50,
  offset: number = 0,
  source?: string,
  category?: string
): Promise<NewsItem[]> {
  const store = readStore();
  let filtered = [...store.items];

  if (source && source !== 'all') {
    filtered = filtered.filter(item => item.source === source);
  }
  if (category && category !== 'all') {
    filtered = filtered.filter(item => item.category === category);
  }

  filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  return filtered.slice(offset, offset + limit);
}

export async function getNewsCount(source?: string, category?: string): Promise<number> {
  const store = readStore();
  let filtered = store.items;
  if (source && source !== 'all') filtered = filtered.filter(item => item.source === source);
  if (category && category !== 'all') filtered = filtered.filter(item => item.category === category);
  return filtered.length;
}
