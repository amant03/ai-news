/** Canonical site origin used for metadata, sitemap, robots, and JSON-LD. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export const SITE_NAME = 'AI Pulse';
export const SITE_TAGLINE = 'Live AI news and model leaderboard';
export const SITE_DESCRIPTION =
  'Autonomous AI news feed and model leaderboard. Compare frontier models by cost, accuracy, and value. Headlines from OpenAI, Anthropic, Google DeepMind, Hacker News, Reddit, arXiv, GitHub and 40+ free sources.';
