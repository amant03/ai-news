import { NextResponse } from 'next/server';
import { getNewsItems, readStore } from '@/lib/db';
import { NewsItem } from '@/lib/types';
import { findModelsInItems, topBenchmarked, MODELS } from '@/lib/models';
import { rankKey } from '@/lib/rank';

export const dynamic = 'force-dynamic';

/**
 * Model Watch: the model releases + capability data shown prominently on the
 * homepage. Combines the curated registry with live model-related headlines.
 */
export async function GET() {
  try {
    readStore();
    const items = getNewsItems(5000, 0);

    const models = findModelsInItems(items, 12);
    const leaderboard = topBenchmarked();

    const modelNames = new Set<string>(MODELS.map(m => m.name.toLowerCase()));
    const providerNames = new Set<string>(MODELS.map(m => m.provider.toLowerCase()));
    const modelNews = items
      .filter(i => {
        const t = i.title.toLowerCase();
        return modelNames.has(t) ||
          providerNames.has(t) ||
          /\b(gpt|claude|gemini|grok|llama|mistral|deepseek|qwen|sonnet|opus|haiku|benchmark|leaderboard|releases|introduces|unveils|launches?)\b/.test(t);
      })
      .sort((a, b) => rankKey(b) - rankKey(a))
      .slice(0, 20) as NewsItem[];

    return NextResponse.json({
      models,
      leaderboard,
      modelNews,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Model watch failed:', error);
    return NextResponse.json({ models: [], leaderboard: [], modelNews: [] }, { status: 500 });
  }
}