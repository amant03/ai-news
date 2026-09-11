/**
 * Daily newsletter digest sender (Phase 4, minimal path).
 *
 * Reads data/newsletter.json + the top stories of the day and sends via
 * Resend's free tier. Without RESEND_API_KEY (or with --dry-run) it prints
 * the digest to stdout and sends nothing — safe to run anywhere.
 *
 * Usage:
 *   npx tsx scripts/send-digest.mts --dry-run
 *   RESEND_API_KEY=... RESEND_FROM="AI Pulse <digest@yourdomain.com>" npx tsx scripts/send-digest.mts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || !process.env.RESEND_API_KEY;

interface NewsItem {
  title: string;
  url: string;
  source_label?: string;
  source?: string;
  summary?: string;
  published_at?: string;
}

function loadSubs(): string[] {
  const f = join(process.cwd(), 'data', 'newsletter.json');
  try {
    if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8'));
  } catch { /* ignore */ }
  return [];
}

function loadTopStories(n = 5): NewsItem[] {
  const f = join(process.cwd(), 'data', 'news.json');
  try {
    const raw = JSON.parse(readFileSync(f, 'utf-8'));
    const items: NewsItem[] = Array.isArray(raw) ? raw : raw.items || [];
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const byDate = [...items].sort(
      (a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    );
    const recent = byDate.filter(i => new Date(i.published_at || 0).getTime() >= cutoff);
    return (recent.length ? recent : byDate).slice(0, n);
  } catch {
    return [];
  }
}

function renderDigest(stories: NewsItem[]): { subject: string; html: string; text: string } {
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const subject = `AI Pulse — top ${stories.length} stories for ${date}`;
  const itemsHtml = stories
    .map(s => `<li style="margin-bottom:12px"><a href="${s.url}">${s.title}</a><br/><span style="color:#71717a;font-size:12px">${s.source_label || s.source || ''}</span></li>`)
    .join('');
  const html = `<h1>AI Pulse — daily digest</h1><p>${date}. Top ${stories.length} stories + biggest model moves, tracked automatically.</p><ol>${itemsHtml}</ol><p style="color:#71717a;font-size:12px">Unsubscribe anytime — reply STOP.</p>`;
  const text = [`AI Pulse — daily digest (${date})`, '', ...stories.map((s, i) => `${i + 1}. ${s.title} — ${s.url}`)].join('\n');
  return { subject, html, text };
}

async function main() {
  const subs = loadSubs();
  const stories = loadTopStories(5);
  if (stories.length === 0) {
    console.log('No stories available — nothing to send.');
    return;
  }
  const { subject, html, text } = renderDigest(stories);

  if (dryRun) {
    console.log(`[dry-run] ${subs.length} subscriber(s). Would send:`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    return;
  }

  const from = process.env.RESEND_FROM || 'AI Pulse <digest@localhost>';
  let sent = 0;
  for (const to of subs) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (res.ok) sent += 1;
    else console.error(`Failed for ${to}: ${await res.text()}`);
  }
  console.log(`Sent ${sent}/${subs.length} digests.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
