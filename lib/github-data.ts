// Fetches files committed by the GitHub Actions agent (data/news.json etc.)
// directly from raw.githubusercontent.com so the deployed serverless app
// always serves the freshest committed data between deploys.
//
// For PRIVATE repos the raw URL requires authentication; set GITHUB_DATA_TOKEN
// (fine-grained PAT with "Contents: Read" on this repo) in Vercel env vars.
// Public repos work without a token.
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
