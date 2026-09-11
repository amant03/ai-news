import { NextRequest, NextResponse } from 'next/server';
import { retrieve } from '@/lib/chat-retrieval';
import { answerQuestion } from '@/lib/chat-answers';
import { hasPg, getPool } from '@/lib/pg';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Simple in-memory per-IP rate limit: 20 AI-mode requests / hour.
// (Hobby-scale guard so a runaway client can't pin the function.)
const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now >= entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

// Best-effort observability: PG when available, otherwise in-memory + logs.
const memStats = { ai: 0, fallback: 0 };
async function logEvent(mode: 'ai' | 'fallback', ok: boolean, latencyMs: number) {
  memStats[mode] += 1;
  console.log(`[chat-ai] mode=${mode} ok=${ok} latencyMs=${latencyMs}`);
  if (!hasPg()) return;
  try {
    const pool = getPool();
    await pool?.query(
      `INSERT INTO chat_events (mode, ok, latency_ms) VALUES ($1, $2, $3)`,
      [mode, ok, latencyMs]
    );
  } catch {
    /* table is optional — skip silently */
  }
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function buildContext(question: string): string {
  const hits = retrieve(question, 18);
  const news = hits.filter(h => h.type === 'news').slice(0, 8);
  const models = hits.filter(h => h.type !== 'news').slice(0, 10);
  const lines: string[] = [];
  if (news.length) {
    lines.push('NEWS (title — summary — source):');
    for (const n of news) {
      const src = String(n.meta?.source || 'unknown');
      lines.push(`- ${n.title} — ${(n.text || '').slice(0, 200)} [${src}]`);
    }
  }
  if (models.length) {
    lines.push('MODELS (name — key specs):');
    for (const m of models) {
      lines.push(`- ${m.title} — ${(m.text || '').slice(0, 200)}`);
    }
  }
  return lines.join('\n');
}

async function askOllama(question: string, context: string): Promise<string | null> {
  const base = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const prompt = `You are AI Pulse's model & news advisor. Answer ONLY using the information in CONTEXT below. If the context doesn't contain the answer, say so plainly rather than guessing. Cite the specific model or article you used by name.

CONTEXT:
${context}

QUESTION: ${question}

ANSWER (2-6 sentences, plain text, no markdown tables):`;
  try {
    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.2, num_predict: 400 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.response || '').trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const body = await req.json();
    const { question, history } = body as { question: string; history?: ChatMessage[] };
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Env gate: AI mode is strictly opt-in infrastructure.
    if (process.env.ENABLE_LLM_CHAT !== 'true') {
      await logEvent('fallback', true, Date.now() - started);
      return NextResponse.json({
        fallback: true,
        answer: answerQuestion(question, history),
        notice: 'AI mode is not enabled on this deployment — answered with the instant deterministic engine instead.',
      });
    }

    if (rateLimited(clientIp(req))) {
      await logEvent('fallback', false, Date.now() - started);
      return NextResponse.json(
        {
          fallback: true,
          answer: answerQuestion(question, history),
          notice: "You've hit the AI-mode limit for now (20/hour) — deterministic mode is still unlimited.",
        },
        { status: 429 }
      );
    }

    const context = buildContext(question);
    const answer = await askOllama(question, context);
    if (!answer) {
      await logEvent('fallback', false, Date.now() - started);
      return NextResponse.json({
        fallback: true,
        answer: answerQuestion(question, history),
        notice: 'AI model is unreachable right now — answered with the deterministic engine instead.',
      });
    }

    await logEvent('ai', true, Date.now() - started);
    return NextResponse.json({ answer, mode: 'ai' });
  } catch (err) {
    console.error('[chat-ai] Error:', err);
    try {
      const body = await req.clone().json().catch(() => ({}));
      const q = typeof body?.question === 'string' ? body.question : 'What are the latest AI developments?';
      await logEvent('fallback', false, Date.now() - started);
      return NextResponse.json({ fallback: true, answer: answerQuestion(q) });
    } catch {
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  }
}

export async function GET() {
  // Liveness + (in-memory) usage split for the case study.
  return NextResponse.json({
    enabled: process.env.ENABLE_LLM_CHAT === 'true',
    backend: 'ollama-free',
    limitPerHour: LIMIT,
    stats: memStats,
  });
}
