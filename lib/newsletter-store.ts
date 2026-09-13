import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fetchCommittedFile, commitFilesToRepo } from './github-data';

/**
 * Newsletter subscriber persistence.
 *
 * The signup API runs on Vercel serverless, where the filesystem is
 * read-only — writing data/newsletter.json there throws EROFS, which is
 * why every signup failed with "Something went wrong." Subscribers are
 * therefore persisted by committing data/newsletter.json to the data repo
 * via the GitHub API (free, no new services). Local file writes still work
 * in dev/CI. When neither backend is available the API returns an honest
 * 503 instead of a cryptic 500.
 *
 * Requires GITHUB_DATA_TOKEN with "Contents: Read and write" on DATA_REPO
 * for production signups. Commits use the `chore: refresh` prefix so Vercel
 * skips the rebuild (subscriber data is read at request time, not build).
 */

const FILE = 'data/newsletter.json';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmail(raw: unknown): string {
  return (raw ?? '').toString().trim().toLowerCase();
}

function parseList(text: string): string[] {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is string => typeof e === 'string' && isValidEmail(e));
  } catch {
    return [];
  }
}

function readLocal(): string[] | null {
  try {
    const p = join(process.cwd(), FILE);
    if (!existsSync(p)) return null;
    return parseList(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function writeLocal(subs: string[]): boolean {
  try {
    const p = join(process.cwd(), FILE);
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(p, JSON.stringify(subs, null, 2));
    return true;
  } catch {
    return false; // read-only FS on serverless — expected, not fatal
  }
}

function repoConfigured(): boolean {
  return Boolean(process.env.DATA_REPO && process.env.GITHUB_DATA_TOKEN);
}

export async function loadSubscribers(): Promise<string[]> {
  const local = readLocal();
  if (local) return local;
  try {
    const raw = await fetchCommittedFile(FILE, 15000);
    if (raw) return parseList(raw);
  } catch {
    /* fall through */
  }
  return [];
}

export interface AddResult {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
  status?: number;
}

async function commit(subs: string[]): Promise<boolean> {
  const res = await commitFilesToRepo(
    [{ path: FILE, content: `${JSON.stringify(subs, null, 2)}\n` }],
    'chore: refresh newsletter subscribers'
  );
  return res.ok;
}

export async function addSubscriber(raw: unknown): Promise<AddResult> {
  const email = normalizeEmail(raw);
  if (!email || !isValidEmail(email)) {
    return { ok: false, error: 'Invalid email address.', status: 400 };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const subs = await loadSubscribers();
    if (subs.includes(email)) return { ok: true, duplicate: true };

    const next = [...subs, email];
    const localSaved = writeLocal(next);

    if (repoConfigured()) {
      if (await commit(next)) return { ok: true };
      // Commit failed (e.g. concurrent signup moved the ref) — reload and
      // retry once; the reload may already contain our email.
      continue;
    }

    if (localSaved) return { ok: true };
    return {
      ok: false,
      status: 503,
      error: 'Newsletter signup is temporarily unavailable — please try again later.',
    };
  }

  return {
    ok: false,
    status: 503,
    error: 'Could not save your subscription — please try again in a minute.',
  };
}
