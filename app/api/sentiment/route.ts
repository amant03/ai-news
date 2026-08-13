import { NextRequest, NextResponse } from 'next/server';
import { readStore } from '@/lib/db';
import { analyzeSentiment } from '@/lib/sentiment';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '90', 10) || 90, 1), 365);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const store = readStore();
    const recent = (store.items || []).filter(i => i.published_at >= cutoff);

    const report = analyzeSentiment(recent);
    return NextResponse.json(report);
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return NextResponse.json({ error: 'Sentiment analysis failed' }, { status: 500 });
  }
}
