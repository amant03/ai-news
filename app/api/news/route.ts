import { NextRequest, NextResponse } from 'next/server';
import { getNewsItems, getNewsCount, initDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initDB();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const source = searchParams.get('source') || undefined;
    const category = searchParams.get('category') || undefined;

    const [items, total] = await Promise.all([
      getNewsItems(limit, offset, source, category),
      getNewsCount(source, category),
    ]);

    return NextResponse.json({
      items,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', items: [], total: 0 },
      { status: 500 }
    );
  }
}
