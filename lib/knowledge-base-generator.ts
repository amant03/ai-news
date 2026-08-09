import fs from 'fs';
import path from 'path';
import { getNewsItems, getNewsCount, initDB } from './db';
import { NewsItem } from './types';

const KB_FILE = path.join(process.cwd(), 'AI_NEWS_KNOWLEDGE_BASE.md');

interface GroupedNews {
  model: NewsItem[];
  research: NewsItem[];
  product: NewsItem[];
  safety: NewsItem[];
  policy: NewsItem[];
  other: NewsItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  model: 'Frontier Model Releases',
  research: 'Research Breakthroughs',
  product: 'Product & Business Updates',
  safety: 'AI Safety & Security',
  policy: 'Regulation & Policy',
  other: 'Other Notable News',
};

const CATEGORY_ICONS: Record<string, string> = {
  model: '🧠',
  research: '🔬',
  product: '💼',
  safety: '🛡️',
  policy: '⚖️',
  other: '📌',
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getSourceBadge(source: string): string {
  const badges: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    meta: 'Meta',
    mistral: 'Mistral',
    deepseek: 'DeepSeek',
    qwen: 'Qwen',
    gemma: 'Gemma',
    groq: 'Groq',
    huggingface: 'Hugging Face',
  };
  return badges[source] || source;
}

function formatNewsItem(item: NewsItem, index: number): string {
  const source = item.source_type === 'twitter' ? '🐦' : item.source_type === 'web' ? '🌐' : '📰';
  const lines: string[] = [];

  lines.push(`### ${item.title}`);
  lines.push('');
  lines.push(`| Detail | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Source** | ${source} ${getSourceBadge(item.source)} |`);
  lines.push(`| **Date** | ${formatDate(item.published_at)} (${timeAgo(item.published_at)}) |`);
  lines.push(`| **Category** | ${CATEGORY_ICONS[item.category] || '📌'} ${item.category} |`);

  if (item.author) {
    lines.push(`| **Author** | ${item.author} |`);
  }

  if (item.summary) {
    lines.push('');
    lines.push(`**Summary:** ${item.summary}`);
  }

  lines.push('');
  lines.push(`**URL:** [${item.url}](${item.url})`);

  if (item.tweet_metrics) {
    lines.push('');
    lines.push(`**Engagement:** ❤️ ${item.tweet_metrics.likeCount}  🔄 ${item.tweet_metrics.retweetCount}  💬 ${item.tweet_metrics.replyCount}`);
  }

  lines.push('');
  lines.push(`---`);
  lines.push('');

  return lines.join('\n');
}

function generateStatsBlock(news: NewsItem[], grouped: GroupedNews): string {
  const totalItems = news.length;
  const modelCount = grouped.model.length;
  const researchCount = grouped.research.length;
  const productCount = grouped.product.length;
  const safetyCount = grouped.safety.length;
  const policyCount = grouped.policy.length;

  return [
    '## 📊 Knowledge Base Statistics',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| **Total Articles** | ${totalItems} |`,
    `| 🧠 **Model Releases** | ${modelCount} |`,
    `| 🔬 **Research** | ${researchCount} |`,
    `| 💼 **Product/Business** | ${productCount} |`,
    `| 🛡️ **Safety/Security** | ${safetyCount} |`,
    `| ⚖️ **Policy/Regulation** | ${policyCount} |`,
    '',
  ].join('\n');
}

function generateSourceBreakdown(news: NewsItem[]): string {
  const sourceMap = new Map<string, number>();
  for (const item of news) {
    const key = item.source;
    sourceMap.set(key, (sourceMap.get(key) || 0) + 1);
  }

  const lines = ['## 📡 Source Breakdown', '', '| Source | Articles |', '|--------|----------|'];
  for (const [source, count] of [...sourceMap.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| **${getSourceBadge(source)}** | ${count} |`);
  }

  lines.push('');
  return lines.join('\n');
}

export async function generateKnowledgeBase(): Promise<{ path: string; itemCount: number }> {
  await initDB();

  const allNews = await getNewsItems(500, 0);
  const recentCount = await getNewsCount();

  // Group by category
  const grouped: GroupedNews = {
    model: [],
    research: [],
    product: [],
    safety: [],
    policy: [],
    other: [],
  };

  for (const item of allNews) {
    if (grouped[item.category]) {
      grouped[item.category].push(item);
    } else {
      grouped.other.push(item);
    }
  }

  const sections: string[] = [];

  // Header
  sections.push([
    '# AI News Knowledge Base',
    '',
    `> **Auto-generated knowledge base of major AI news, model releases, and industry impacts.**`,
    `> Last Updated: ${new Date().toISOString()}`,
    `> Total Articles Tracked: ${recentCount}`,
    `> Generated from AI Pulse database`,
    '',
    '---',
    '',
  ].join('\n'));

  // Table of Contents
  sections.push('## 📑 Table of Contents\n');
  sections.push(generateStatsBlock(allNews, grouped));
  sections.push(generateSourceBreakdown(allNews));

  // Add TOC links
  sections.push('### Categories\n');
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const items = grouped[key as keyof GroupedNews];
    if (items.length > 0) {
      sections.push(`- [${CATEGORY_ICONS[key] || '📌'} ${label}](#${label.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '')}) — ${items.length} articles`);
    }
  }
  sections.push('');

  sections.push('---\n');

  // Category sections
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const items = grouped[key as keyof GroupedNews];
    if (items.length === 0) continue;

    sections.push(`## ${CATEGORY_ICONS[key] || '📌'} ${label}\n`);

    items.forEach((item, index) => {
      sections.push(formatNewsItem(item, index));
    });
  }

  // Footer
  sections.push([
    '---',
    '',
    '## 🔄 Maintenance',
    '',
    'This knowledge base is automatically generated. To regenerate:',
    '',
    '```bash',
    '# Trigger regeneration via API',
    'curl -X POST http://localhost:3000/api/knowledge-base/generate',
    '',
    '# Or it regenerates automatically every 12h alongside the news cron job',
    '```',
    '',
    '---',
    '',
    `*Generated on ${new Date().toISOString()} by AI Pulse Knowledge Base Generator*`,
    '',
  ].join('\n'));

  const content = sections.join('\n');
  fs.writeFileSync(KB_FILE, content, 'utf-8');

  console.log(`📝 Knowledge base written to ${KB_FILE} (${allNews.length} articles)`);

  return {
    path: KB_FILE,
    itemCount: allNews.length,
  };
}

export { KB_FILE };
