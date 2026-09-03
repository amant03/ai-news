// Reads files committed by the GitHub Actions agent (data/news.json etc.)
// so the deployed app serves fresh data without waiting for a Vercel rebuild.
//
// Private repos cannot use anonymous raw.githubusercontent.com (404). Prefer
// the Git Data API (works for files >1MB such as news.json). Set
// GITHUB_DATA_TOKEN in Vercel with "Contents: Read".
//
// commitFilesToRepo() needs "Contents: Read and write".
// dispatchWorkflow() needs "Actions: Read and write".
const DATA_REPO = process.env.DATA_REPO;
const DATA_BRANCH = process.env.DATA_BRANCH || 'main';

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = process.env.GITHUB_DATA_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ai-news-app',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function fetchCommittedFile(filePath: string, timeoutMs = 25000): Promise<string | null> {
  if (!DATA_REPO) return null;
  const token = process.env.GITHUB_DATA_TOKEN;
  const signal = AbortSignal.timeout(timeoutMs);

  // 1. GitHub API blob via tree SHA — reliable for private repos and files >1MB.
  if (token) {
    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${DATA_REPO}/git/trees/${encodeURIComponent(DATA_BRANCH)}?recursive=1`,
        { signal, cache: 'no-store', headers: authHeaders() }
      );
      if (treeRes.ok) {
        const tree = (await treeRes.json()) as { tree?: Array<{ path: string; sha: string; type: string }> };
        const entry = tree.tree?.find(t => t.path === filePath && t.type === 'blob');
        if (entry?.sha) {
          const blobRes = await fetch(`https://api.github.com/repos/${DATA_REPO}/git/blobs/${entry.sha}`, {
            signal,
            cache: 'no-store',
            headers: authHeaders({ Accept: 'application/vnd.github.raw' }),
          });
          if (blobRes.ok) {
            const text = await blobRes.text();
            if (text) return text;
          }
        }
      }
    } catch {
      /* fall through */
    }
  }

  // 2. Contents API with raw accept (small files).
  try {
    const res = await fetch(
      `https://api.github.com/repos/${DATA_REPO}/contents/${filePath}?ref=${encodeURIComponent(DATA_BRANCH)}`,
      { signal, cache: 'no-store', headers: authHeaders({ Accept: 'application/vnd.github.raw' }) }
    );
    if (res.ok) {
      const text = await res.text();
      if (text && !text.startsWith('{"message":')) return text;
    }
  } catch {
    /* fall through */
  }

  // 3. raw.githubusercontent.com (public repos, or PAT that raw accepts).
  try {
    const headers: Record<string, string> = { 'User-Agent': 'ai-news-app' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers.Accept = 'application/vnd.githubusercontent.raw';
    }
    const res = await fetch(`https://raw.githubusercontent.com/${DATA_REPO}/${DATA_BRANCH}/${filePath}`, {
      signal,
      cache: 'no-store',
      headers,
    });
    if (res.ok) return await res.text();
  } catch {
    /* ignore */
  }

  return null;
}

export interface RepoFile {
  path: string;
  content: string;
}

/**
 * Atomically commits multiple files to the data repo via the Git Data API
 * (single commit, supports files >1MB unlike the Contents API).
 * Returns ok:false (instead of throwing) when unconfigured/unauthorized —
 * e.g. GITHUB_DATA_TOKEN missing or lacking "Contents: write".
 */
export async function commitFilesToRepo(
  files: RepoFile[],
  message: string,
  timeoutMs = 60000
): Promise<{ ok: boolean; error?: string; commitSha?: string }> {
  const token = process.env.GITHUB_DATA_TOKEN;
  if (!DATA_REPO || !token) return { ok: false, error: 'DATA_REPO or GITHUB_DATA_TOKEN not configured' };
  if (files.length === 0) return { ok: false, error: 'no files to commit' };

  const apiBase = `https://api.github.com/repos/${DATA_REPO}`;
  let aborted = false;

  async function gh<T>(method: string, urlPath: string, body?: unknown): Promise<T> {
    if (aborted) throw new Error('aborted');
    const res = await fetch(`${apiBase}${urlPath}`, {
      method,
      headers: authHeaders(body ? { 'Content-Type': 'application/json' } : undefined),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`GitHub ${method} ${urlPath} -> ${res.status}: ${text.slice(0, 300)}`);
      if (res.status === 409 || res.status === 422) aborted = true;
      throw err;
    }
    return (await res.json()) as T;
  }

  try {
    const ref = await gh<{ object: { sha: string } }>('GET', `/git/ref/heads/${DATA_BRANCH}`);
    const headSha = ref.object.sha;
    const headCommit = await gh<{ tree: { sha: string } }>('GET', `/git/commits/${headSha}`);

    const blobShas: string[] = [];
    for (const file of files) {
      const blob = await gh<{ sha: string }>('POST', '/git/blobs', {
        content: file.content,
        encoding: 'utf-8',
      });
      blobShas.push(blob.sha);
    }

    const tree = await gh<{ sha: string }>('POST', '/git/trees', {
      base_tree: headCommit.tree.sha,
      tree: files.map((file, i) => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobShas[i],
      })),
    });

    const commit = await gh<{ sha: string }>('POST', '/git/commits', {
      message,
      tree: tree.sha,
      parents: [headSha],
    });
    await gh('PATCH', `/git/refs/heads/${DATA_BRANCH}`, { sha: commit.sha, force: false });

    return { ok: true, commitSha: commit.sha };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Kick the GitHub Actions news workflow. Returns ok:false when the token
 * lacks `actions: write` so the caller can no-op instead of hanging.
 */
export async function dispatchWorkflow(
  workflowFile: string,
  timeoutMs = 15000
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.GITHUB_DATA_TOKEN;
  if (!DATA_REPO || !token) return { ok: false, error: 'DATA_REPO or GITHUB_DATA_TOKEN not configured' };
  try {
    const res = await fetch(
      `https://api.github.com/repos/${DATA_REPO}/actions/workflows/${workflowFile}/dispatches`,
      {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ref: DATA_BRANCH }),
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      }
    );
    if (res.status === 204) return { ok: true };
    const text = await res.text().catch(() => '');
    return { ok: false, error: `GitHub dispatch ${res.status}: ${text.slice(0, 300)}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
