import { NextResponse } from 'next/server';
import { readStatus } from '@/lib/status';

const DATA_REPO = process.env.DATA_REPO;
const DATA_BRANCH = process.env.DATA_BRANCH || 'main';

export async function GET() {
  // On Vercel, prefer the committed status.json from GitHub raw for live health data.
  if (process.env.VERCEL === '1' && DATA_REPO) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${DATA_REPO}/${DATA_BRANCH}/data/status.json`, {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const status = await res.json();
        return NextResponse.json(status);
      }
    } catch {
      /* fall through to local */
    }
  }

  return NextResponse.json(readStatus());
}
