import * as fs from 'fs';
import * as path from 'path';

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

const AA_T2I_URL = 'https://artificialanalysis.ai/image/leaderboard/text-to-image';
const DATA_PATH = path.join(process.cwd(), 'data', 't2i-models.json');

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

export async function scrapeT2ILeaderboard(): Promise<T2IData> {
  console.log('[t2i-scraper] Fetching', AA_T2I_URL);

  const res = await fetch(AA_T2I_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AI-Pulse-Bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch T2I page: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  console.log('[t2i-scraper] Fetched', html.length, 'bytes');

  const models: T2IModel[] = [];

  // Parse table rows from HTML
  // The AA page has a table with rows like:
  // <tr>...<td>1</td><td>1</td><td>OpenAI</td><td>GPT Image 2 (high)</td><td>1,368</td><td>-10/10</td><td>14,449</td><td>Apr 2026</td><td>$211.0 /1k imgs</td></tr>

  // Try to find table rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let rank = 0;

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];

    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim());
    }

    if (cells.length >= 9) {
      const range = cells[1] || '';
      const creator = cells[2] || '';
      const name = cells[3] || '';
      const elo = parseElo(cells[4]);
      const ci = cells[5] || '';
      const samples = parseSamples(cells[6]);
      const released = cells[7] || '';
      const price = parsePrice(cells[8]);

      if (name && elo > 0) {
        rank++;
        models.push({
          rank,
          range: range || `${rank}`,
          creator,
          name,
          elo,
          ci,
          samples,
          released,
          price,
        });
      }
    }
  }

  console.log('[t2i-scraper] Parsed', models.length, 'models');

  const data: T2IData = {
    updatedAt: new Date().toISOString(),
    source: 'Artificial Analysis Text to Image Arena',
    url: AA_T2I_URL,
    total: models.length,
    models,
  };

  return data;
}

export function saveT2IData(data: T2IData): void {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log('[t2i-scraper] Saved', data.total, 'models to', DATA_PATH);
}

export async function runT2IScraper(): Promise<void> {
  try {
    const data = await scrapeT2ILeaderboard();
    if (data.models.length > 0) {
      saveT2IData(data);
    } else {
      console.error('[t2i-scraper] No models parsed — keeping existing data');
    }
  } catch (err) {
    console.error('[t2i-scraper] Error:', err);
    // Keep existing data file on error
  }
}

// CLI entry point
if (require.main === module) {
  runT2IScraper().then(() => process.exit(0)).catch(() => process.exit(1));
}