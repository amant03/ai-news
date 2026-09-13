import { NextRequest, NextResponse } from 'next/server';
import {
  addThreadComment,
  loadEngagement,
  sanitizeNick,
  sanitizeText,
  voteThreadComment,
} from '@/lib/engagement-store';

/**
 * On-site comment threads. GET ?key= → full thread.
 * POST {action:'add', key, nick, text, parentId?} → append (nested reply
 * when parentId is set). POST {action:'vote', key, id, dir} → +1.
 * Anonymous by design until login lands; nick is free text.
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

function validKey(key: unknown): key is string {
  return typeof key === 'string' && /^[a-f0-9]{8,32}$/.test(key);
}

export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('key') || '';
  if (!validKey(key)) return NextResponse.json({ ok: false, error: 'Invalid story key.' }, { status: 400 });
  const db = await loadEngagement();
  const e = db[key];
  return NextResponse.json({
    ok: true,
    likes: e?.likes ?? 0,
    dislikes: e?.dislikes ?? 0,
    comments: e?.comments ?? [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = ipOf(req);
    const body = await req.json();
    if (!validKey(body?.key)) {
      return NextResponse.json({ ok: false, error: 'Invalid story key.' }, { status: 400 });
    }

    if (body?.action === 'vote') {
      if (limited(ip, 40, 60_000)) {
        return NextResponse.json({ ok: false, error: 'Too many votes — slow down.' }, { status: 429 });
      }
      const id = (body?.id ?? '').toString().slice(0, 32);
      const dir = body?.dir === 'down' ? 'down' : 'up';
      const res = await voteThreadComment(body.key, id, dir);
      if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 503 });
      return NextResponse.json({ ok: true, likes: res.likes, dislikes: res.dislikes });
    }

    // default: add comment/reply
    if (limited(ip, 8, 60_000)) {
      return NextResponse.json({ ok: false, error: 'Too many comments — slow down.' }, { status: 429 });
    }
    const text = sanitizeText(body?.text);
    if (!text) {
      return NextResponse.json({ ok: false, error: 'Write something first (min 2 characters).' }, { status: 400 });
    }
    const parentId = body?.parentId ? String(body.parentId).slice(0, 32) : undefined;
    const res = await addThreadComment(body.key, sanitizeNick(body?.nick), text, parentId);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: res.status || 503 });
    }
    return NextResponse.json({ ok: true, comment: res.comment });
  } catch {
    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}
