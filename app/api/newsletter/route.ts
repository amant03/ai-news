import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const FILE = join(DATA_DIR, 'newsletter.json');

function load(): string[] {
  try {
    if (existsSync(FILE)) {
      return JSON.parse(readFileSync(FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function save(subs: string[]) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(subs, null, 2));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email ?? '').toString().trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email address.' }, { status: 400 });
    }

    const subs = load();

    if (subs.includes(email)) {
      return NextResponse.json({ ok: true, message: 'Already subscribed.' });
    }

    subs.push(email);
    save(subs);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}

export async function GET() {
  const subs = load();
  return NextResponse.json({ ok: true, count: subs.length, subscribers: subs });
}
