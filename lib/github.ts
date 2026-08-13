import { NewsItem } from './types';
import { categorizeContent } from './categorize';

const ORGS = [
  { name: 'openai', label: 'OpenAI' },
  { name: 'anthropics', label: 'Anthropic' },
  { name: 'huggingface', label: 'Hugging Face' },
  { name: 'microsoft', label: 'Microsoft' },
  { name: 'google-deepmind', label: 'Google DeepMind' },
  { name: 'xai', label: 'xAI' },
  { name: 'mistralai', label: 'Mistral' },
];

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface GHRepo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  updated_at: string;
  created_at: string;
  owner: { avatar_url?: string; login?: string };
  homepage: string | null;
}

export async function fetchGitHub(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const seen = new Set<string>();

  try {
    // Trending AI repos (topic-based, recently updated, most stars)
    const res = await fetch(
      'https://api.github.com/search/repositories?q=topic:ai+created:>72h&sort=stars&order=desc&per_page=20',
      {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent': 'ai-news-aggregator',
          'Accept': 'application/vnd.github+json',
        },
      }
    );
    if (res.ok) {
      const data = (await res.json()) as { items?: GHRepo[] };
      const now = Date.now();
      for (const repo of data.items || []) {
        if (now - new Date(repo.created_at).getTime() > MAX_AGE_MS) continue;
        if (seen.has(repo.full_name)) continue;
        seen.add(repo.full_name);

        const desc = repo.description || `${repo.full_name} — ${repo.stargazers_count} stars on GitHub.`;
        allItems.push({
          source: 'github',
          source_label: 'GitHub',
          source_type: 'github',
          title: repo.full_name,
          summary: desc.slice(0, 300),
          content: desc,
          url: repo.html_url,
          author: repo.owner?.login || 'GitHub',
          category: categorizeContent(repo.full_name + ' ' + desc, ''),
          published_at: repo.created_at,
          source_detail: 'GitHub Trending',
          image_url: repo.owner?.avatar_url,
          score: repo.stargazers_count,
          num_comments: repo.forks_count,
        });
      }
      console.log(`  ✓ GitHub trending: ${allItems.length} repos`);
    } else {
      console.log(`  ✗ GitHub search: HTTP ${res.status} (rate limit may be hit)`);
    }
  } catch (error) {
    console.log(`  ✗ GitHub search failed: ${error instanceof Error ? error.message : error}`);
  }

  // Org events (releases, pushes) — a single batched call
  try {
    const results = await Promise.allSettled(
      ORGS.slice(0, 4).map(async org => {
        const r = await fetch(`https://api.github.com/orgs/${org.name}/events?per_page=15`, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'ai-news-aggregator', 'Accept': 'application/vnd.github+json' },
        });
        if (!r.ok) return [] as NewsItem[];
        const events = (await r.json()) as Array<{
          type: string;
          created_at: string;
          actor?: { login?: string };
          repo?: { name?: string };
          payload?: {
            ref?: string;
            head?: { message?: string };
            releases?: Array<{ tag_name?: string; html_url?: string; name?: string }>;
          };
        }>;

        const items: NewsItem[] = [];
        for (const ev of events) {
          // Only keep meaningful events: releases, or pushes with a real commit
          // message. Bare branch pushes ("refs/heads/...") are noise.
          const ref = ev.payload?.ref || '';
          const commitMessage = ev.payload?.head?.message || '';
          const isRelease = ev.type === 'ReleaseEvent' || ref.startsWith('refs/tags/');
          const text = isRelease ? `Release ${ref.replace('refs/tags/', '')}` : commitMessage;
          if (!text || text.length < 20) continue;
          const repoName = ev.repo?.name || org.name;
          items.push({
            source: 'github',
            source_label: org.label,
            source_type: 'github',
            title: `[${repoName}] ${text.split('\n')[0]}`.slice(0, 200),
            summary: text.slice(0, 300),
            content: text,
            url: `https://github.com/${repoName}`,
            author: ev.actor?.login || org.label,
            category: 'other',
            published_at: ev.created_at,
            source_detail: `GitHub · ${org.label}`,
          });
        }
        return items;
      })
    );

    let orgItems = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        orgItems += r.value.length;
        allItems.push(...r.value);
      }
    }
    console.log(`  ✓ GitHub org events: ${orgItems} items`);
  } catch (error) {
    console.log(`  ✗ GitHub org events failed: ${error instanceof Error ? error.message : error}`);
  }

  return allItems;
}
