'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK = [
  'Best model for coding',
  'Cheapest models',
  'Fastest models',
];

export default function ChatPanel({ onClose, title = 'Model Advisor' }: { onClose: () => void; title?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! Ask me about AI news and models — top stories, comparisons, pricing, recommendations." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || data.error || 'No response' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to server.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-up w-[min(92vw,380px)] rounded-2xl border border-[var(--color-line)] bg-[var(--card)] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col h-[min(70vh,520px)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-line)] shrink-0">
        <div className="w-6 h-6 rounded-md bg-[var(--fore)] flex items-center justify-center shrink-0">
          <span className="text-[var(--background)] font-bold text-[10px]">AI</span>
        </div>
        <span className="text-[13px] font-semibold text-[var(--fore)]">{title}</span>
        <a href="/chat" className="ml-1 text-[11px] text-[var(--dim)] hover:text-[var(--accent)] transition-colors">
          full page ↗
        </a>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-full text-[var(--dim)] hover:text-[var(--fore)] hover:bg-[var(--input)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' ? (
              <div className="max-w-[90%] rounded-xl border border-[var(--color-line)] bg-[var(--surface)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--fore)] whitespace-pre-wrap">
                {msg.content}
              </div>
            ) : (
              <div
                className="max-w-[85%] rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed"
                style={{ background: 'var(--fore)', color: 'var(--background)' }}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-1.5 items-center px-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--dim)' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--dim)', animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--dim)', animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
          {QUICK.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-[11px] px-2.5 py-1.5 rounded-full border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)] hover:border-[var(--mut)] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={e => { e.preventDefault(); send(); }}
        className="p-3 border-t border-[var(--color-line)] flex gap-2 shrink-0"
        style={{ background: 'var(--background)' }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about news, models…"
          disabled={loading}
          aria-label="Ask about news and models"
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[var(--color-line)] text-[13px] text-[var(--fore)] placeholder:text-[var(--dim)] outline-none focus:border-[var(--accent)]/50"
          style={{ background: 'var(--input)' }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
          style={{ background: 'var(--fore)', color: 'var(--background)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
