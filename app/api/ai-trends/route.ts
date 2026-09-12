import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

/** AI trends dataset: frontier intelligence, price and speed over time. */
export async function GET() {
  try {
    const file = join(process.cwd(), 'data', 'ai-trends.json');
    if (!existsSync(file)) return NextResponse.json({ models: [], updatedAt: null });
    const data = JSON.parse(readFileSync(file, 'utf-8'));
    if (!Array.isArray(data?.models)) return NextResponse.json({ models: [], updatedAt: null });
    return NextResponse.json({ models: data.models, updatedAt: data.updatedAt || null });
  } catch {
    return NextResponse.json({ models: [], updatedAt: null });
  }
}
