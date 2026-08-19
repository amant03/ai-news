'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Best model for coding',
  'Cheapest models',
  'Compare Claude Opus 5 and GPT-5.6 Sol',
  'Fastest models',
  'Open weight models',
  'Quantization guide',
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm AI Pulse's model advisor. Ask me anything about AI models — use cases, comparisons, pricing, or recommendations." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(Boolean).map(c => c.trim());
        if (cells.length <= 1) return match;
        return '<div class="flex gap-4 text-xs">' + cells.map(c => `<span class="flex-1">${c}</span>`).join('') + '</div>';
      });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-3xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-100'
            }`}>
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 text-neutral-400 rounded-lg px-4 py-3 text-sm">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-neutral-800">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about models, pricing, use cases..."
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
