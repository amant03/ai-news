import { NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/fetcher';

export async function POST() {
  try {
    const result = await fetchAllNews();
    
    return NextResponse.json({
      success: true,
      message: `Fetched ${result.rssCount} RSS items, ${result.twitterCount} tweets, and ${result.webCount} web items. Inserted ${result.totalInserted} new items.`,
      ...result,
    });
  } catch (error) {
    console.error('Refresh failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
