import { NextResponse } from 'next/server';
import { seedKnowledgeBase } from '@/lib/seed-knowledge-base';
import { generateKnowledgeBase } from '@/lib/knowledge-base-generator';
import { runAgent } from '@/lib/agent';

export async function POST() {
  console.log('[KB] Knowledge base population...');
  console.log(`[KB] Time: ${new Date().toISOString()}`);

  await seedKnowledgeBase();

  // Also pull fresh items so the KB isn't just seed data.
  const agent = await runAgent({ skipOllama: true, sourceFilter: ['rss', 'google-news', 'hackernews'] });
  await generateKnowledgeBase();

  const result = {
    success: true,
    inserted: agent.inserted,
    totalItems: agent.totalAfter,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
