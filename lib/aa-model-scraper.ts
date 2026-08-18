import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'models.json');
const MODELS_URL = 'https://artificialanalysis.ai/models/';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; AI-Pulse-Bot/1.0)',
  'Accept': 'text/html,application/xhtml+xml',
};

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractNumber(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function extractFromPage(html: string, name: string): {
  aaSpeed?: number;
  aaCostPerTask?: number;
  aaVerbosity?: number;
  intelligenceIndex?: number;
  context?: string;
  params?: string;
  license?: string;
  description?: string;
} {
  const result: Record<string, any> = {};

  // Speed: "40.3Output tokens per second" or "40.3t/s"
  const speedMatch = html.match(/([\d.]+)\s*(?:Output tokens per second|t\/s)/i);
  if (speedMatch) result.aaSpeed = parseFloat(speedMatch[1]);

  // Intelligence: "41Artificial Analysis Intelligence Index" or "#20 / 10741"
  const intelMatch = html.match(/(\d+(?:\.\d+)?)\s*Artificial Analysis Intelligence Index/i);
  if (intelMatch) result.intelligenceIndex = parseFloat(intelMatch[1]);
  if (!result.intelligenceIndex) {
    const intelMatch2 = html.match(/#(\d+)\s*\/\s*\d+(\d+(?:\.\d+)?)/);
    if (intelMatch2) result.intelligenceIndex = parseFloat(intelMatch2[2]);
  }

  // Cost per task: "Cost per Intelligence Index task" followed by a dollar amount
  const costMatch = html.match(/Cost per Intelligence Index task[^$]*\$([\d.]+)/i);
  if (costMatch) result.aaCostPerTask = parseFloat(costMatch[1]);
  // Alternative: try "Cost per task" section
  if (!result.aaCostPerTask) {
    const costMatch2 = html.match(/\$([\d.]+)\s*per task/i);
    if (costMatch2) result.aaCostPerTask = parseFloat(costMatch2[1]);
  }

  // Verbosity: skip for now — values are unreliable from HTML parsing
  // We'll manually set verbosity for key models

  // Context window
  const ctxMatch = html.match(/Context window[^<]*?(\d+[kKmM])\s/i);
  if (ctxMatch) result.context = ctxMatch[1].toUpperCase();

  // Parameters
  const paramMatch = html.match(/([\d.]+[Bb])\s*(?:total )?parameters/i);
  if (paramMatch) result.params = paramMatch[1];

  // License
  const licMatch = html.match(/License[^<]*?((?:MIT|Apache|Llama|Gemma|Proprietary)[^<]*)/i);
  if (licMatch) result.license = licMatch[1].trim();

  return result;
}

export async function scrapeAllModels(): Promise<number> {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  let updated = 0;

  // Find models that need data (have intelligence but missing speed/cost/verb)
  const needsData = data.models.filter((m: any) =>
    m.intelligenceIndex != null && (m.aaSpeed == null || m.aaCostPerTask == null || m.aaVerbosity == null)
  );

  console.log(`[aa-model-scraper] Found ${needsData.length} models needing data`);

  for (let i = 0; i < needsData.length; i++) {
    const model = needsData[i];
    const slug = slugify(model.name);
    const url = `${MODELS_URL}${slug}`;

    try {
      console.log(`[${i + 1}/${needsData.length}] Fetching ${model.name} → ${url}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: HEADERS });

      if (!res.ok) {
        console.log(`  → ${res.status} ${res.statusText} — skipping`);
        await sleep(500);
        continue;
      }

      const html = await res.text();
      const extracted = extractFromPage(html, model.name);

      // Update model with extracted data (only fill missing fields)
      if (extracted.aaSpeed != null && model.aaSpeed == null) {
        model.aaSpeed = extracted.aaSpeed;
        updated++;
      }
      if (extracted.aaCostPerTask != null && model.aaCostPerTask == null) {
        model.aaCostPerTask = extracted.aaCostPerTask;
        updated++;
      }
      if (extracted.aaVerbosity != null && model.aaVerbosity == null) {
        model.aaVerbosity = extracted.aaVerbosity;
        updated++;
      }
      if (extracted.intelligenceIndex != null && model.intelligenceIndex == null) {
        model.intelligenceIndex = extracted.intelligenceIndex;
        updated++;
      }
      if (extracted.context != null && model.context == null) {
        model.context = extracted.context;
        updated++;
      }
      if (extracted.params != null && model.params == null) {
        model.params = extracted.params;
        updated++;
      }
      if (extracted.license != null && model.license == null) {
        model.license = extracted.license;
        updated++;
      }

      const fields = Object.keys(extracted).filter(k => (extracted as any)[k] != null);
      if (fields.length > 0) {
        console.log(`  → Updated: ${fields.join(', ')}`);
      } else {
        console.log(`  → No data extracted`);
      }

      // Rate limit: 1 request per 800ms
      await sleep(800);

    } catch (err: any) {
      console.log(`  → Error: ${err.message}`);
      await sleep(1000);
    }
  }

  // Save updated data
  fs.writeFileSync(DATA_PATH, JSON.stringify(data));
  console.log(`[aa-model-scraper] Done. ${updated} fields updated across ${needsData.length} models.`);

  return updated;
}

// CLI entry point
if (require.main === module) {
  scrapeAllModels().then(() => process.exit(0)).catch(() => process.exit(1));
}