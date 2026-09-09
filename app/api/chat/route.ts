import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/chat-answers';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, history } = body as { question: string; history?: ChatMessage[] };

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const answer = answerQuestion(question, history);
    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error('[chat] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
