import { NextResponse } from 'next/server';
import { loadModelCatalog } from '@/lib/models-catalog';

export const dynamic = 'force-dynamic';

// Full lean catalog for the /models page. Served from the committed
// models-slim.json (rebuilt every 4h by CI) or Postgres — never from the
// stale, ~100MB deploy-time models.json with its multi-MB license blobs.
export async function GET() {
  try {
    const catalog = await loadModelCatalog();
    if (!catalog) {
      return NextResponse.json({ updatedAt: null, sources: [], total: 0, models: [] });
    }
    return NextResponse.json(catalog, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[models/catalog] failed:', error);
    return NextResponse.json({ updatedAt: null, sources: [], total: 0, models: [] }, { status: 500 });
  }
}