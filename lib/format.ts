export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'recently';
  const now = Date.now();
  const seconds = Math.floor((now - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** JSON null and NaN both fail `!== undefined` checks; only real numbers survive. */
export function finiteNum(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function formatNumber(num?: number): string {
  if (!num && num !== 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function countdown(target: Date): string {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'now';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function typeIcon(type: string): string {
  switch (type) {
    case 'twitter': return '𝕏';
    case 'reddit': return '●';
    case 'hn': return 'Y';
    case 'arxiv': return 'ƒ';
    case 'youtube': return '▶';
    case 'github': return '⌥';
    case 'google': return 'g';
    case 'rss': return '⌁';
    default: return '◈';
  }
}

export function typeLabel(type: string): string {
  switch (type) {
    case 'twitter': return 'X';
    case 'reddit': return 'Reddit';
    case 'hn': return 'Hacker News';
    case 'arxiv': return 'arXiv';
    case 'youtube': return 'YouTube';
    case 'github': return 'GitHub';
    case 'google': return 'Google News';
    case 'rss': return 'RSS';
    case 'web': return 'Web';
    default: return type;
  }
}
