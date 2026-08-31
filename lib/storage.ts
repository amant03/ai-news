import fs from 'fs';
import path from 'path';

// Resolves a WRITABLE data directory for JSON stores.
//
// Locally: <cwd>/data as before.
// On Vercel (serverless) the deployment filesystem is read-only except /tmp,
// so stores live in /tmp/ai-news-data and are seeded once per instance from
// the read-only snapshot bundled at deploy time (last committed data). This
// keeps dedupe state correct within an invocation instead of starting empty.
const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');
const SERVERLESS_DATA_DIR = '/tmp/ai-news-data';

let resolved: string | null = null;

export function dataDir(): string {
  if (resolved) return resolved;

  if (process.env.VERCEL === '1') {
    const dir = SERVERLESS_DATA_DIR;
    try {
      fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(BUNDLED_DATA_DIR)) {
        // Never copy models.json (~96MB) into /tmp — it blows the serverless
        // memory/time budget and the news cron does not need it.
        const skip = new Set(['models.json']);
        for (const name of fs.readdirSync(BUNDLED_DATA_DIR)) {
          if (skip.has(name)) continue;
          const src = path.join(BUNDLED_DATA_DIR, name);
          const dst = path.join(dir, name);
          try {
            const st = fs.statSync(src);
            if (!fs.existsSync(dst) && st.isFile() && st.size < 8 * 1024 * 1024) {
              fs.copyFileSync(src, dst);
            }
          } catch {
            /* skip unseedable file */
          }
        }
      }
    } catch {
      /* fall through to bundled dir */
    }
    resolved = dir;
    return dir;
  }

  resolved = BUNDLED_DATA_DIR;
  return BUNDLED_DATA_DIR;
}

export function dataFile(name: string): string {
  return path.join(dataDir(), name);
}
