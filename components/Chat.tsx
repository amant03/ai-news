'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  /** True when answered by the opt-in AI mode (grounded, live data). */
  ai?: boolean;
}

const SUGGESTIONS = [
  { icon: '📰', label: 'Latest AI news', q: 'What are the latest AI news and developments?' },
  { icon: '💻', label: 'Best model for coding', q: 'Best model for coding' },
  { icon: '💰', label: 'Cheapest models', q: 'Cheapest models' },
  { icon: '⚡', label: 'Fastest models', q: 'Fastest models' },
  { icon: '🔍', label: 'Compare Claude vs GPT', q: 'Compare Claude Opus 5 and GPT-5.6 Sol' },
  { icon: '🏠', label: 'Open weight models', q: 'Open weight models for self hosting' },
];

const FOLLOW_UPS = [
  'Tell me more about this',
  'What are the alternatives?',
  'How does this compare to competitors?',
  'What are the latest trends in AI?',
];

function renderMessage(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const table = (key: string) => (
    <div key={key} className="my-3 rounded-lg overflow-hidden border border-[var(--color-line)]">
      {tableRows.map((row, ri) => (
        <div
          key={ri}
          className={`flex ${ri === 0 ? 'bg-[var(--surface)] text-[var(--mut)] text-[10px] uppercase tracking-wider font-semibold' : 'text-[var(--fore)]'} ${ri > 0 ? 'border-t border-[var(--color-line)]' : ''}`}
        >
          {row.map((cell, ci) => (
            <div key={ci} className="flex-1 px-3 py-2 text-xs min-w-0">{cell}</div>
          ))}
        </div>
      ))}
    </div>
  );

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
      elements.push(table(`table-${i}`));
      inTable = false;
      tableRows = [];
    }

    if (isSeparator) return;

    const rendered = line
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--fore)] font-semibold">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--accent)] text-[11px] font-mono">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline hover:opacity-80">$1</a>');

    if (line.startsWith('### ')) {
      elements.push(<div key={i} className="text-sm font-bold text-[var(--fore)] mt-3 mb-1">{rendered.replace('### ', '')}</div>);
    } else if (line.startsWith('## ')) {
      elements.push(<div key={i} className="text-base font-bold text-[var(--fore)] mt-4 mb-1">{rendered.replace('## ', '')}</div>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      const text = rendered.replace(/^[-•]\s*/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-[var(--accent)] mt-0.5 text-xs">›</span>
          <span className="text-[13px] text-[var(--fore)] opacity-90" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)?.[1];
      const text = rendered.replace(/^\d+\.\s*/, '');
      elements.push(
        <div key={i} className="flex gap-2.5 ml-1 my-1">
          <span className="text-[var(--accent)] font-mono text-xs font-bold min-w-[16px]">{num}.</span>
          <span className="text-[13px] text-[var(--fore)] opacity-90 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<div key={i} className="text-[13px] text-[var(--fore)] opacity-90 leading-relaxed my-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />);
    }
  });

  if (inTable && tableRows.length > 0) {
    elements.push(table('table-end'));
  }

  return <>{elements}</>;
}

function Avatar() {
  return (
    <div className="w-6 h-6 rounded-sm bg-[var(--fore)] flex items-center justify-center shrink-0 mt-0.5">
      <span className="text-[var(--background)] font-bold text-[10px] tracking-tight">AI</span>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm AI Pulse's assistant. I can help with:\n\n- **AI models** — benchmarks, pricing, comparisons\n- **AI news** — latest releases, funding rounds, research\n- **Recommendations** — best model for your use case\n- **Industry trends** — what's happening in AI right now\n\nAsk me anything!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput('');
    setNotice(null);
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    const useAi = aiMode;
    try {
      // Send conversation history for context
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(useAi ? '/api/chat/ai' : '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      if (data.fallback && useAi) {
        // AI mode unavailable — degrade gracefully to the deterministic engine.
        setAiMode(false);
        if (data.notice) setNotice(data.notice);
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || data.error || 'No response',
        ai: useAi && !data.fallback && res.ok,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to server. Please try again.' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const start = messages.length <= 1;
  const showFollowUps = messages.length >= 2 && !loading;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--card)] flex flex-col overflow-hidden h-[70vh] min-h-[440px] max-h-[760px]">
        {/* Conversation header */}
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[var(--color-line)] shrink-0">
          <Avatar />
          <span className="text-sm font-semibold tracking-tight text-[var(--fore)]">Model Advisor</span>
          <label
            className="ml-auto flex items-center gap-2 cursor-pointer select-none"
            title="Uses a free local model to reason over live model & news data. Deterministic mode is instant and free — try it first."
          >
            <span className="text-[11px] font-medium text-[var(--mut)]">Ask AI</span>
            <button
              role="switch"
              aria-checked={aiMode}
              aria-label="Toggle AI mode"
              onClick={e => { e.preventDefault(); setAiMode(v => !v); setNotice(null); }}
              className={`relative h-5 w-9 rounded-full transition-colors duration-150 ${
                aiMode ? 'bg-[var(--accent)]' : 'bg-[var(--gray-300)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-150 ${
                  aiMode ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>
          <span className="text-[11px] text-[var(--mut)] tabular-nums">
            {loading ? (
              <span className="inline-flex items-center gap-1.5 text-[var(--accent)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Thinking…
              </span>
            ) : (
              `${messages.length} message${messages.length === 1 ? '' : 's'}`
            )}
          </span>
        </div>

        {/* Fallback notice */}
        {notice && (
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--cat-safety)]/30 bg-[var(--cat-safety)]/10 px-3 py-2 text-xs text-[var(--foreground)]">
            <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss notice" className="text-[var(--mut)] hover:text-[var(--fore)]">
              ✕
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`animate-fade-up flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' ? (
                  <div className="flex gap-3 max-w-[85%]">
                    <Avatar />
                    <div className="flex-1 min-w-0 rounded-lg border border-[var(--color-line)] bg-[var(--surface)] px-4 py-3 text-[13px] leading-relaxed text-[var(--fore)]">
                      {msg.ai && (
                        <span className="mb-2 inline-flex items-center rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-hover)]">
                          AI-generated · grounded in live data
                        </span>
                      )}
                      {renderMessage(msg.content)}
                    </div>
                  </div>
                ) : (
                  <div
                    className="max-w-[75%] rounded-lg px-4 py-3 text-[13px] leading-relaxed"
                    style={{ background: 'var(--fore)', color: 'var(--background)' }}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 max-w-[85%] animate-fade-up">
                <Avatar />
                <div className="rounded-lg border border-[var(--color-line)] bg-[var(--surface)] px-4 py-3.5">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--dim)' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--dim)', animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--dim)', animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Suggestions (show only at start) */}
        {start && (
          <div className="px-5 pt-4 pb-4 shrink-0 border-t border-[var(--color-line)]">
            <div className="text-[11px] text-[var(--mut)] mb-2 font-medium uppercase tracking-wider">Try asking</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s.q)}
                  className="ring-focus flex items-center gap-2 px-3 py-2.5 rounded-full border text-left transition-colors hover:border-[var(--mut)]"
                  style={{ borderColor: 'var(--color-line)', color: 'var(--fore)' }}
                >
                  <span className="text-sm leading-none">{s.icon}</span>
                  <span className="text-[11px] font-medium text-[var(--mut)] truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up suggestions */}
        {showFollowUps && (
          <div className="px-5 pb-3 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {FOLLOW_UPS.map((f, i) => (
                <button
                  key={i}
                  onClick={() => send(f)}
                  className="ring-focus text-[11px] px-2.5 py-1 rounded-full border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)] hover:border-[var(--mut)] transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-4 shrink-0 border-t border-[var(--color-line)]" style={{ background: 'var(--background)' }}>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about models, news, pricing, trends…"
                disabled={loading}
                className="ring-focus w-full px-4 py-2.5 rounded-lg border border-[var(--color-line)] text-sm text-[var(--fore)] placeholder:text-[var(--mut)] outline-none transition-all"
                style={{ background: 'var(--input)' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="ring-focus flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 shrink-0"
              style={{ background: 'var(--fore)', color: 'var(--background)' }}
            >
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
