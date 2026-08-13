import { runAgent } from './agent';

/**
 * Backward-compatible wrapper around the new agent orchestrator.
 * Returns the summary object expected by the old refresh/cron routes.
 */
export async function fetchAllNews(options?: { regenerateKB?: boolean }) {
  const result = await runAgent({ regenerateKB: options?.regenerateKB });

  return {
    rssCount: result.sourceCounts.rss ?? 0,
    twitterCount: result.sourceCounts.twitter ?? 0,
    webCount: result.sourceCounts.web ?? 0,
    totalInserted: result.inserted,
    totalItems: result.totalAfter,
    durationMs: result.durationMs,
    environment: result.environment,
  };
}
