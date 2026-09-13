import { NextRequest, NextResponse } from 'next/server';
import { engagementKey, loadEngagement, voteItem } from '@/lib/engagement-store';

/**
 * Story votes. GET ?keys=k1,k2 or ?urls=u1,u2 → counts per story
 * (keys are sha1(url) — computed server-side so browsers never need crypto).
 * POST {key, dir} → +1 like/dislike. Best-effort per-IP rate limit
 * (serverless instances don't share memory; abuse shows in git history).
 */

const hits = new Map<string, number[]>();

function limited(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

function ipOf(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const keys = (params.get('keys') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 60);
  const urls = (params.get('urls') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 60);
  const db = await loadEngagement();
  const pick = (k: string) => {
    const e = db[k];
    return e
      ? { key: k, likes: e.likes, dislikes: e.dislikes, comments: e.comments.length }
      : { key: k, likes: 0, dislikes: 0, comments: 0 };
  };
  if (urls.length > 0) {
    return NextResponse.json({
      ok: true,
      engagement: urls.map(u => ({ url: u, ...pick(engagementKey({ url: u })) })),
    });
  }
  const out: Record<string, { likes: number; dislikes: number; comments: number }> = {};
  for (const k of keys) {
    const e = db[k];
    out[k] = e
      ? { likes: e.likes, dislikes: e.dislikes, comments: e.comments.length }
      : { likes: 0, dislikes: 0, comments: 0 };
  }
  return NextResponse.json({ ok: true, engagement: out });
}

export async function POST(req: NextRequest) {
  try {
    if (limited(ipOf(req), 30, 60_000)) {
      return NextResponse.json({ ok: false, error: 'Too many votes — slow down.' }, { status: 429 });
    }
    const body = await req.json();
    const key = (body?.key ?? '').toString().slice(0, 32);
    const dir = body?.dir === 'down' ? 'down' : 'up';
    if (!/^[a-f0-9]{8,32}$/.test(key)) {
      return NextResponse.json({ ok: false, error: 'Invalid story key.' }, { status: 400 });
    }
    const res = await voteItem(key, dir);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 503 });
    return NextResponse.json({ ok: true, likes: res.likes, dislikes: res.dislikes });
  } catch {
    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}
