import * as fs from 'fs';
import * as path from 'path';

// ── Interfaces ──────────────────────────────────────────────────────────────

interface ImageEditingModel {
  rank: number;
  range: string;
  creator: string;
  name: string;
  elo: number;
  ci: string;
  samples: number;
  released: string;
  price: string;
  openWeights?: boolean;
}

interface VideoModel {
  rank: number;
  range: string;
  creator: string;
  name: string;
  elo: number;
  ci: string;
  samples: number;
  released: string;
  price: string;
  openWeights?: boolean;
}

interface SpeechToTextModel {
  rank: number;
  name: string;
  provider: string;
  wer: number;
  speedFactor: number;
  price: number;
}

interface TextToSpeechModel {
  rank: number;
  name: string;
  provider: string;
  qualityElo: number | null;
  price: number | null;
  speedFactor: number | null;
}

interface LeaderboardData<T> {
  updatedAt: string;
  source: string;
  url: string;
  total: number;
  models: T[];
}

// ── URL mapping ─────────────────────────────────────────────────────────────

const LEADERBOARDS = {
  imageEditing: {
    url: 'https://artificialanalysis.ai/image/leaderboard/image-editing',
    file: 'image-editing-models.json',
    source: 'Artificial Analysis Image Editing Arena',
    columns: ['rank', 'range', 'creator', 'name', 'elo', 'ci', 'samples', 'released', 'price'],
  },
  textToVideo: {
    url: 'https://artificialanalysis.ai/video/leaderboard/text-to-video',
    file: 'text-to-video-models.json',
    source: 'Artificial Analysis Text to Video Arena',
    columns: ['rank', 'range', 'creator', 'name', 'elo', 'ci', 'samples', 'released', 'price'],
  },
  imageToVideo: {
    url: 'https://artificialanalysis.ai/video/leaderboard/image-to-video',
    file: 'image-to-video-models.json',
    source: 'Artificial Analysis Image to Video Arena',
    columns: ['rank', 'range', 'creator', 'name', 'elo', 'ci', 'samples', 'released', 'price'],
  },
  videoEditing: {
    url: 'https://artificialanalysis.ai/video/leaderboard/video-editing',
    file: 'video-editing-models.json',
    source: 'Artificial Analysis Video Editing Arena',
    columns: ['rank', 'range', 'creator', 'name', 'elo', 'ci', 'samples', 'released', 'price'],
  },
  speechToText: {
    url: 'https://artificialanalysis.ai/speech-to-text',
    file: 'speech-to-text-models.json',
    source: 'Artificial Analysis Speech to Text',
    columns: ['rank', 'name', 'provider', 'wer', 'speedFactor', 'price'],
  },
  textToSpeech: {
    url: 'https://artificialanalysis.ai/text-to-speech',
    file: 'text-to-speech-models.json',
    source: 'Artificial Analysis Text to Speech',
    columns: ['rank', 'name', 'provider', 'qualityElo', 'price', 'speedFactor'],
  },
} as const;

type LeaderboardKey = keyof typeof LEADERBOARDS;

const DATA_DIR = path.join(process.cwd(), 'data');
const AA_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Parsing helpers ─────────────────────────────────────────────────────────

function parsePrice(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (cleaned.includes('No API')) return 'No API available';
  if (cleaned.includes('Coming soon')) return 'Coming soon';
  const m = cleaned.match(/\$([\d.]+)/);
  if (m) {
    const num = parseFloat(m[1]);
    return `$${num.toFixed(1)} /1k imgs`;
  }
  return cleaned || '—';
}

function parseVideoPrice(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (cleaned.includes('Coming soon')) return 'Coming soon';
  const m = cleaned.match(/\$([\d.]+)/);
  if (m) {
    const num = parseFloat(m[1]);
    return `$${num.toFixed(2)} /min`;
  }
  return cleaned || '—';
}

function parseElo(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

function parseSamples(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

function decodeHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// ── HTML table parser ───────────────────────────────────────────────────────

function extractTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(decodeHtml(cellMatch[1]));
    }
    if (cells.length >= 2) {
      rows.push(cells);
    }
  }
  return rows;
}

// ── Generic fetcher ─────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  console.log(`[aa-scraper] Fetching ${url}`);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: AA_HEADERS,
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  const html = await res.text();
  console.log(`[aa-scraper] Fetched ${html.length} bytes`);
  return html;
}

// ── Image/video leaderboard parser (rank, range, creator, name, elo, ci, samples, released, price) ──

function parseImageVideoTable(html: string, config: { url: string }): (ImageEditingModel | VideoModel)[] {
  const rows = extractTableRows(html);
  const models: (ImageEditingModel | VideoModel)[] = [];
  let rank = 0;

  for (const cells of rows) {
    if (cells.length < 9) continue;

    const range = cells[1] || '';
    const creator = cells[2] || '';
    const name = cells[3] || '';
    const elo = parseElo(cells[4]);
    const ci = cells[5] || '';
    const samples = parseSamples(cells[6]);
    const released = cells[7] || '';
    const priceRaw = cells[8] || '';
    const hasOpen = priceRaw.toLowerCase().includes('open') || cells.length > 9;

    if (name && elo > 0) {
      rank++;
      const entry: Record<string, unknown> = {
        rank,
        range: range || `${rank}`,
        creator,
        name,
        elo,
        ci,
        samples,
        released,
        price: config.url.includes('image') ? parsePrice(priceRaw) : parseVideoPrice(priceRaw),
      };
      if (hasOpen) entry.openWeights = true;
      models.push(entry as unknown as ImageEditingModel);
    }
  }

  return models;
}

// ── Speech-to-text parser ───────────────────────────────────────────────────

function parseSpeechToTextTable(html: string): SpeechToTextModel[] {
  const rows = extractTableRows(html);
  const models: SpeechToTextModel[] = [];
  let rank = 0;

  for (const cells of rows) {
    if (cells.length < 6) continue;

    const name = cells[1] || cells[0] || '';
    const provider = cells[2] || cells[1] || '';
    const wer = parseFloat(cells[3]) || 0;
    const speedFactor = parseFloat(cells[4]) || 0;
    const price = parseFloat(cells[5]) || 0;

    if (name && name.length > 1) {
      rank++;
      models.push({ rank, name, provider, wer, speedFactor, price });
    }
  }

  return models;
}

// ── Text-to-speech parser ───────────────────────────────────────────────────

function parseTextToSpeechTable(html: string): TextToSpeechModel[] {
  const rows = extractTableRows(html);
  const models: TextToSpeechModel[] = [];
  let rank = 0;

  for (const cells of rows) {
    if (cells.length < 3) continue;

    const name = cells[1] || cells[0] || '';
    const provider = cells[2] || cells[1] || '';
    const qualityElo = cells[3] ? parseFloat(cells[3]) : null;
    const price = cells[4] ? parseFloat(cells[4]) : null;
    const speedFactor = cells[5] ? parseFloat(cells[5]) : null;

    if (name && name.length > 1) {
      rank++;
      models.push({ rank, name, provider, qualityElo, price, speedFactor });
    }
  }

  return models;
}

// ── Main scrape functions ───────────────────────────────────────────────────

export async function scrapeLeaderboard(key: LeaderboardKey): Promise<boolean> {
  const config = LEADERBOARDS[key];
  try {
    const html = await fetchHtml(config.url);

    let models: unknown[];
    if (key === 'speechToText') {
      models = parseSpeechToTextTable(html);
    } else if (key === 'textToSpeech') {
      models = parseTextToSpeechTable(html);
    } else {
      models = parseImageVideoTable(html, config);
    }

    if (models.length === 0) {
      console.error(`[aa-scraper] No models parsed for ${key} — keeping existing data`);
      return false;
    }

    const data = {
      updatedAt: new Date().toISOString(),
      source: config.source,
      url: config.url,
      total: models.length,
      models,
    };

    const filePath = path.join(DATA_DIR, config.file);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[aa-scraper] Saved ${models.length} models to ${config.file}`);
    return true;
  } catch (err) {
    console.error(`[aa-scraper] Error scraping ${key}:`, err);
    return false;
  }
}

// ── Legacy T2I export ───────────────────────────────────────────────────────

interface T2IModel {
  rank: number;
  range: string;
  creator: string;
  name: string;
  elo: number;
  ci: string;
  samples: number;
  released: string;
  price: string;
  openWeights?: boolean;
}

interface T2IData {
  updatedAt: string;
  source: string;
  url: string;
  total: number;
  models: T2IModel[];
}

export async function scrapeT2ILeaderboard(): Promise<T2IData> {
  const config = LEADERBOARDS.imageEditing;
  const html = await fetchHtml(config.url);
  const models = parseImageVideoTable(html, config) as T2IModel[];
  return {
    updatedAt: new Date().toISOString(),
    source: config.source,
    url: config.url,
    total: models.length,
    models,
  };
}

export function saveT2IData(data: T2IData): void {
  const filePath = path.join(DATA_DIR, 't2i-models.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`[aa-scraper] Saved ${data.total} models to ${filePath}`);
}

// ── Unified entry point ─────────────────────────────────────────────────────

export async function runAllLeaderboards(): Promise<void> {
  const keys = Object.keys(LEADERBOARDS) as LeaderboardKey[];
  console.log(`[aa-scraper] Scraping ${keys.length} leaderboards...`);

  let success = 0;
  let failed = 0;

  for (const key of keys) {
    const ok = await scrapeLeaderboard(key);
    if (ok) success++;
    else failed++;
  }

  console.log(`[aa-scraper] Done. ${success} succeeded, ${failed} failed.`);
}

// Legacy alias
export async function runT2IScraper(): Promise<void> {
  await runAllLeaderboards();
}

// CLI entry point
if (require.main === module) {
  runAllLeaderboards().then(() => process.exit(0)).catch(() => process.exit(1));
}
