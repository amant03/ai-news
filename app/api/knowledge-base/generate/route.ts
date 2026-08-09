import { NextResponse } from 'next/server';
import { generateKnowledgeBase } from '@/lib/knowledge-base-generator';
import { seedKnowledgeBase } from '@/lib/seed-knowledge-base';

export async function POST() {
  try {
    // First seed any missing data
    const seeded = await seedKnowledgeBase();

    // Then regenerate the knowledge base file from database
    const result = await generateKnowledgeBase();

    return NextResponse.json({
      success: true,
      message: `Knowledge base generated with ${result.itemCount} articles (${seeded} new from seed)`,
      path: result.path,
      itemCount: result.itemCount,
      seededNew: seeded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Knowledge base generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
