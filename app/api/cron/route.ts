import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent';

// Scheduled endpoint (Vercel Cron). Primary automation runs in GitHub Actions;
// this is a safety net for local/self-hosted deployments.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('⏰ Cron job triggered - fetching news...');
    const result = await runAgent({ regenerateKB: true });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
