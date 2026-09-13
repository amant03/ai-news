/**
 * Daily newsletter digest sender.
 *
 * Reads data/newsletter.json + today's top stories + biggest model release
 * and sends the digest via Resend's free tier. Without RESEND_API_KEY
 * (or with --dry-run) it prints the digest to stdout and sends nothing —
 * safe to run anywhere. Scheduled daily by .github/workflows/digest.yml.
 *
 * Usage:
 *   npx tsx scripts/send-digest.mts --dry-run
 *   RESEND_API_KEY=... RESEND_FROM="AI Pulse <daily@yourdomain.com>" npx tsx scripts/send-digest.mts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { isEmailConfigured, loadTodayDigest, renderDailyDigest, sendEmail } from '../lib/email.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || !isEmailConfigured();

function loadSubs(): string[] {
  const f = join(process.cwd(), 'data', 'newsletter.json');
  try {
    if (!existsSync(f)) return [];
    const parsed: unknown = JSON.parse(readFileSync(f, 'utf-8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is string => typeof e === 'string' && e.includes('@'));
  } catch {
    return [];
  }
}

async function main() {
  const subs = loadSubs();
  const { stories, model } = await loadTodayDigest(5);
  if (stories.length === 0) {
    console.log('No stories available — nothing to send.');
    return;
  }
  if (subs.length === 0) {
    console.log('No subscribers — nothing to send.');
    return;
  }

  if (dryRun) {
    const preview = renderDailyDigest('preview@example.com', stories, model);
    console.log(`[dry-run] ${subs.length} subscriber(s). Would send:`);
    console.log(`Subject: ${preview.subject}`);
    // Titles only: per-recipient unsubscribe links stay out of the logs.
    for (const s of stories) console.log(`- ${s.title}`);
    if (model) console.log(`Biggest model release: ${model.name} by ${model.provider}`);
    return;
  }

  let sent = 0;
  for (const to of subs) {
    const { subject, html, text } = renderDailyDigest(to, stories, model);
    const res = await sendEmail({ to, subject, html, text });
    if (res.ok) sent += 1;
    else console.error(`Failed for ${to}: ${res.error}`);
    // Gentle pacing for free-tier rate limits.
    await new Promise(r => setTimeout(r, 600));
  }
  console.log(`Sent ${sent}/${subs.length} digests.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
