import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/chat-answers';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }
    const answer = answerQuestion(question);
    return NextResponse.json({ answer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
