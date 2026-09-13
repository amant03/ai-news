import { NextRequest, NextResponse } from 'next/server';
import { addSubscriber, loadSubscribers } from '@/lib/newsletter-store';

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[newsletter] POST failed:', err);
    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}

export async function GET() {
  // Count only — subscriber emails are never exposed through the API.
  const subs = await loadSubscribers();
  return NextResponse.json({ ok: true, count: subs.length });
}
