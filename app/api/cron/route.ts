import { NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/fetcher';
import { seedKnowledgeBase } from '@/lib/seed-knowledge-base';
import { generateKnowledgeBase } from '@/lib/knowledge-base-generator';

// This endpoint is called by Vercel Cron every 12 hours
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('⏰ Cron job triggered - fetching news...');
    const result = await fetchAllNews();
    
    // Seed any missing knowledge base items and regenerate .md
    console.log('\n📚 Regenerating knowledge base...');
    const seeded = await seedKnowledgeBase();
    const kbResult = await generateKnowledgeBase();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
      knowledgeBase: {
        seeded: seeded,
        totalArticles: kbResult.itemCount,
        filePath: kbResult.path,
      },
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
