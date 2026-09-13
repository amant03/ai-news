import { NextRequest, NextResponse } from 'next/server';
import { addSubscriber, loadSubscribers, removeSubscriber } from '@/lib/newsletter-store';
import { loadTodayDigest, renderDailyDigest, renderWelcomeEmail, sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await addSubscriber(body?.email);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Request failed.' },
        { status: result.status || 500 }
      );
    }

    if (result.duplicate) {
      return NextResponse.json({ ok: true, message: 'Already subscribed.' });
    }

    // New subscriber: send welcome + today's digest immediately (2 emails).
    // Email failures never fail the signup — they are logged only.
    const email = (body?.email ?? '').toString().trim().toLowerCase();
    try {
      const welcome = renderWelcomeEmail(email);
      const w = await sendEmail({ to: email, ...welcome });
      if (!w.ok) console.error('[newsletter] welcome email failed:', w.error);
      const digest = await loadTodayDigest(5);
      if (digest.stories.length > 0) {
        const d = renderDailyDigest(email, digest.stories, digest.model);
        const r = await sendEmail({ to: email, ...d });
        if (!r.ok) console.error('[newsletter] first digest failed:', r.error);
      }
    } catch (err) {
      console.error('[newsletter] instant emails failed:', err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[newsletter] POST failed:', err);
    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await removeSubscriber(body?.email, body?.token);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Request failed.' },
        { status: result.status || 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[newsletter] DELETE failed:', err);
    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}

export async function GET() {
  // Count only — subscriber emails are never exposed through the API.
  const subs = await loadSubscribers();
  return NextResponse.json({ ok: true, count: subs.length });
}
