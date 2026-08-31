// Fetches files committed by the GitHub Actions agent (data/news.json etc.)
// directly from raw.githubusercontent.com so the deployed serverless app
// always serves the freshest committed data between deploys.
//
// For PRIVATE repos the raw URL requires authentication; set GITHUB_DATA_TOKEN
// (fine-grained PAT with "Contents: Read" on this repo) in Vercel env vars.
// Public repos work without a token.
//
// commitFilesToRepo() additionally needs "Contents: Read and write" and is
// used by the Vercel cron route to push freshly fetched data back to the repo.
const DATA_REPO = process.env.DATA_REPO;
const DATA_BRANCH = process.env.DATA_BRANCH || 'main';

export async function fetchCommittedFile(filePath: string, timeoutMs = 15000): Promise<string | null> {
  if (!DATA_REPO) return null;
  try {
    const headers: Record<string, string> = {};
    const token = process.env.GITHUB_DATA_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
      `https://raw.githubusercontent.com/${DATA_REPO}/${DATA_BRANCH}/${filePath}`,
      { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store', headers }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
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
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // 409 from PATCH ref = race with another push (e.g. Actions agent);
      // anything else is a real failure worth surfacing.
      const err = new Error(`GitHub ${method} ${urlPath} -> ${res.status}: ${text.slice(0, 300)}`);
      if (res.status === 409 || res.status === 422) aborted = true;
      throw err;
    }
    return (await res.json()) as T;
  }

  try {
    // 1. Current head of the data branch.
    const ref = await gh<{ object: { sha: string } }>('GET', `/git/ref/heads/${DATA_BRANCH}`);
    const headSha = ref.object.sha;

    // 2. Base tree of the head commit.
    const headCommit = await gh<{ tree: { sha: string } }>('GET', `/git/commits/${headSha}`);

    // 3. Blobs for each file.
    const blobShas: string[] = [];
    for (const file of files) {
      const blob = await gh<{ sha: string }>('POST', '/git/blobs', {
        content: file.content,
        encoding: 'utf-8',
      });
      blobShas.push(blob.sha);
    }

    // 4. New tree replacing only the given paths.
    const tree = await gh<{ sha: string }>('POST', '/git/trees', {
      base_tree: headCommit.tree.sha,
      tree: files.map((file, i) => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobShas[i],
      })),
    });

    // 5. Commit + move the branch ref.
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
 * Kick the GitHub Actions news workflow (free minutes, 10 min timeout, git write).
 * Used by the Vercel daily cron as the preferred refresh path. Returns ok:false
 * when the token lacks `actions: write` so the caller can fall back to an inline run.
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
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
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
