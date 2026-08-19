'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  { icon: '💻', label: 'Best model for coding', q: 'Best model for coding' },
  { icon: '💰', label: 'Cheapest models', q: 'Cheapest models' },
  { icon: '⚡', label: 'Fastest models', q: 'Fastest models' },
  { icon: '🔍', label: 'Compare Claude vs GPT', q: 'Compare Claude Opus 5 and GPT-5.6 Sol' },
  { icon: '🏠', label: 'Open weight models', q: 'Open weight models for self hosting' },
  { icon: '📊', label: 'Quantization guide', q: 'Quantization guide' },
];

function renderMessage(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  lines.forEach((line, i) => {
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
    const isSeparator = /^\|[\s\-|]+\|$/.test(line.trim());

    if (isTableRow && !isSeparator) {
      const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
      if (!inTable) inTable = true;
      tableRows.push(cells);
      return;
    }

    if (inTable && !isTableRow) {
      elements.push(
        <div key={`table-${i}`} className="my-3 rounded-lg overflow-hidden border border-[var(--color-line)]">
          {tableRows.map((row, ri) => (
            <div key={ri} className={`flex ${ri === 0 ? 'bg-[var(--surface)] text-[var(--dim)] text-[10px] uppercase tracking-wider font-semibold' : 'text-[var(--foreground)]'} ${ri > 0 ? 'border-t border-[var(--color-line)]' : ''}`}>
              {row.map((cell, ci) => (
                <div key={ci} className="flex-1 px-3 py-2 text-xs min-w-0">{cell}</div>
              ))}
            </div>
          ))}
        </div>
      );
      inTable = false;
      tableRows = [];
    }

    if (isSeparator) return;

    let rendered = line
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--foreground)] font-semibold">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--accent)] text-[11px] font-mono">$1</code>');

    if (line.startsWith('### ')) {
      elements.push(<div key={i} className="text-sm font-bold text-[var(--foreground)] mt-3 mb-1">{rendered.replace('### ', '')}</div>);
    } else if (line.startsWith('## ')) {
      elements.push(<div key={i} className="text-base font-bold text-[var(--foreground)] mt-4 mb-1">{rendered.replace('## ', '')}</div>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      const text = rendered.replace(/^[-•]\s*/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-[var(--accent)] mt-0.5 text-xs">›</span>
          <span className="text-xs text-[var(--foreground)] opacity-90" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      const text = rendered.replace(/^\d+\.\s*/, '');
      elements.push(
        <div key={i} className="flex gap-2.5 ml-1 my-1">
          <span className="text-[var(--accent)] font-mono text-xs font-bold min-w-[16px]">{num}.</span>
          <span className="text-xs text-[var(--foreground)] opacity-90 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<div key={i} className="text-xs text-[var(--foreground)] opacity-90 leading-relaxed my-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />);
    }
  });

  if (inTable && tableRows.length > 0) {
    elements.push(
      <div key="table-end" className="my-3 rounded-lg overflow-hidden border border-[var(--color-line)]">
        {tableRows.map((row, ri) => (
          <div key={ri} className={`flex ${ri === 0 ? 'bg-[var(--surface)] text-[var(--dim)] text-[10px] uppercase tracking-wider font-semibold' : 'text-[var(--foreground)]'} ${ri > 0 ? 'border-t border-[var(--color-line)]' : ''}`}>
            {row.map((cell, ci) => (
              <div key={ci} className="flex-1 px-3 py-2 text-xs min-w-0">{cell}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return <>{elements}</>;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm AI Pulse's model advisor. Ask me anything about AI models — use cases, comparisons, pricing, or recommendations." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const q = text || input.trim();
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
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]" style={{ background: 'var(--background)' }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
          {messages.map((msg, i) => (
            <div key={i} className={`animate-fade-up ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
              {msg.role === 'assistant' ? (
                <div className="flex gap-3 my-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 rounded-xl px-4 py-3 text-xs leading-relaxed"
                       style={{ background: 'var(--card)', border: '1px solid var(--color-line)' }}>
                    {renderMessage(msg.content)}
                  </div>
                </div>
              ) : (
                <div className="flex justify-end my-4">
                  <div className="max-w-[75%] rounded-xl px-4 py-3 text-xs leading-relaxed"
                       style={{ background: 'var(--accent)', color: 'var(--background)' }}>
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 my-4 animate-fade-up">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg, var(--accent), var(--violet))' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: 'var(--card)', border: '1px solid var(--color-line)' }}>
                <div className="flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Suggestions (show only at start) */}
      {messages.length <= 1 && (
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s.q)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--card)', border: '1px solid var(--color-line)', color: 'var(--foreground)' }}>
                <span className="text-sm">{s.icon}</span>
                <span className="text-[11px] font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0" style={{ borderTop: '1px solid var(--color-line)', background: 'var(--background)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about models, pricing, use cases..."
                className="w-full rounded-xl px-4 py-3 text-xs outline-none transition-all placeholder:opacity-40"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--color-line)',
                  color: 'var(--foreground)',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--color-line)'}
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading || !input.trim()}
              className="rounded-xl px-4 py-3 text-xs font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
              style={{ background: 'var(--accent)', color: 'var(--background)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
