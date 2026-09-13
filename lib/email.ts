import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Newsletter email plumbing (Resend free tier, env-gated, default off).
 *
 * - `sendEmail()` is the only sender: no RESEND_API_KEY → returns ok:false,
 *   sends nothing, never throws. Callers must never fail a signup because
 *   email failed.
 * - Renderers are pure (unit-tested): welcome mail + daily digest with top
 *   stories and biggest model release, both carrying a signed unsubscribe
 *   link.
 */

export interface Story {
  title: string;
  url: string;
  source_label?: string;
  source?: string;
  summary?: string;
  published_at?: string;
}

export interface ModelRelease {
  name: string;
  provider: string;
  released?: string;
  slug?: string;
}

export function emailSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'https://ai-news-one-sigma.vercel.app';
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function emailFrom(): string {
  return process.env.RESEND_FROM || 'AI Pulse <digest@localhost>';
}

function unsubscribeSecret(): string {
  // Production should set NEWSLETTER_SECRET (or reuse CRON_SECRET). The
  // fallback only signs unsubscribe links; the repo is private so the
  // forgery window is negligible, but set the secret anyway.
  return process.env.NEWSLETTER_SECRET || process.env.CRON_SECRET || 'ai-pulse-dev-fallback-secret';
}

/** Signed one-click unsubscribe token for an email address. */
export function signUnsubscribe(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHmac('sha256', unsubscribeSecret()).update(normalized).digest('hex').slice(0, 32);
}

export function verifyUnsubscribe(email: string, token: string): boolean {
  const expected = signUnsubscribe(email);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string): string {
  return `${emailSiteUrl()}/unsubscribe?email=${encodeURIComponent(email.trim().toLowerCase())}&token=${signUnsubscribe(email)}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mailShell(title: string, bodyHtml: string, email: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#18181b">`
    + `<p style="font-size:20px;font-weight:700;margin:0 0 4px">AI Pulse</p>`
    + `<p style="font-size:12px;color:#71717a;margin:0 0 20px">${esc(title)}</p>`
    + bodyHtml
    + `<hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0 12px"/>`
    + `<p style="font-size:12px;color:#71717a">One email a day. <a href="${unsubscribeUrl(email)}">Unsubscribe anytime</a>.</p>`
    + `</div>`;
}

export function renderWelcomeEmail(email: string): { subject: string; html: string; text: string } {
  const subject = 'Welcome to AI Pulse — your first digest is on its way';
  const html = mailShell(
    'Welcome aboard',
    `<p>You're in. Every morning you'll get the <strong>top 5 AI stories</strong> plus the <strong>biggest model release</strong> — no fluff, just signal.</p>`
    + `<p>Your first digest (today's top stories) is arriving in a separate email right now.</p>`
    + `<p><a href="${emailSiteUrl()}/">Browse today's front page</a></p>`,
    email
  );
  const text = [
    "You're subscribed to AI Pulse.",
    '',
    'Every morning: top 5 AI stories + biggest model release.',
    'Your first digest (today\'s top stories) arrives separately right now.',
    '',
    `Browse: ${emailSiteUrl()}/`,
    `Unsubscribe: ${unsubscribeUrl(email)}`,
  ].join('\n');
  return { subject, html, text };
}

export function renderDailyDigest(
  email: string,
  stories: Story[],
  model: ModelRelease | null,
  date = new Date()
): { subject: string; html: string; text: string } {
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const subject = `AI Pulse — top ${stories.length} stories for ${dateStr}`;
  const itemsHtml = stories
    .map(s => `<li style="margin-bottom:12px"><a href="${esc(s.url)}">${esc(s.title)}</a><br/><span style="color:#71717a;font-size:12px">${esc(s.source_label || s.source || '')}</span></li>`)
    .join('');
  const modelHtml = model
    ? `<h2 style="font-size:16px;margin:20px 0 8px">Biggest model release</h2>`
      + `<p><strong>${esc(model.name)}</strong> by ${esc(model.provider)}`
      + (model.released ? ` — released ${esc(model.released.slice(0, 10))}` : '')
      + (model.slug ? ` — <a href="${emailSiteUrl()}/models/${esc(model.slug)}">analysis</a>` : '')
      + `</p>`
    : '';
  const html = mailShell(
    `Daily digest — ${esc(dateStr)}`,
    `<ol style="padding-left:20px">${itemsHtml}</ol>${modelHtml}`,
    email
  );
  const text = [
    `AI Pulse — daily digest (${dateStr})`,
    '',
    ...stories.map((s, i) => `${i + 1}. ${s.title} — ${s.url}`),
    ...(model ? ['', `Biggest model release: ${model.name} by ${model.provider}`] : []),
    '',
    `Unsubscribe: ${unsubscribeUrl(email)}`,
  ].join('\n');
  return { subject, html, text };
}

function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export interface TodayDigest {
  stories: Story[];
  model: ModelRelease | null;
}

/**
 * Today's top stories + most notable recent model release, read from the
 * committed data files (works in API routes with file tracing and in CI
 * scripts). Never throws — returns empty on any failure.
 */
export async function loadTodayDigest(storyCount = 5): Promise<TodayDigest> {
  const out: TodayDigest = { stories: [], model: null };
  try {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const newsFile = join(process.cwd(), 'data', 'news.json');
    if (existsSync(newsFile)) {
      const raw = JSON.parse(readFileSync(newsFile, 'utf-8'));
      const items: Story[] = Array.isArray(raw) ? raw : raw.items || [];
      const cutoff = Date.now() - 24 * 3600 * 1000;
      const byDate = [...items]
        .filter(i => i && i.title && i.url)
        .sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
      const recent = byDate.filter(i => new Date(i.published_at || 0).getTime() >= cutoff);
      out.stories = (recent.length ? recent : byDate).slice(0, storyCount);
    }
    const slimFile = join(process.cwd(), 'data', 'models-slim.json');
    if (existsSync(slimFile)) {
      const slim = JSON.parse(readFileSync(slimFile, 'utf-8'));
      const models = slim.models || [];
      const dated = models.filter((m: any) => m && m.name && m.released);
      dated.sort((a: any, b: any) => {
        const ai = a.intelligenceIndex !== undefined ? 1 : 0;
        const bi = b.intelligenceIndex !== undefined ? 1 : 0;
        if (ai !== bi) return bi - ai;
        return String(b.released).localeCompare(String(a.released));
      });
      const top = dated[0];
      if (top) {
        out.model = {
          name: String(top.name),
          provider: String(top.provider || 'Unknown'),
          released: top.released,
          slug: slugOf(String(top.name)),
        };
      }
    }
  } catch {
    /* keep empty */
  }
  return out;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Send one email via Resend. Never throws; returns ok:false when unconfigured. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  timeoutMs?: number;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: emailFrom(),
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl(opts.to)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
