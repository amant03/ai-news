import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent';
import { readStatus } from '@/lib/status';

// Local: runs the agent inline (fast, no serverless browser).
// Production (Vercel): the heavy lifting happens in the GitHub Actions agent;
// this endpoint runs a lightweight inline refresh too as a safety net.
export async function POST() {
  try {
    const result = await runAgent();

    return NextResponse.json({
      success: true,
      message: `Inserted ${result.inserted} new items (${result.totalAfter} total).`,
      ...result,
    });
  } catch (error) {
    console.error('Refresh failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Refresh endpoint. Use POST to trigger a refresh.',
    status: readStatus(),
  });
}
