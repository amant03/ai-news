'use client';

import { useState, useEffect } from 'react';
import ChatPanel from './ChatPanel';

const NUDGES = [
  'Ask me about today’s top story!',
  'Which model should you try?',
  'Cheapest smart model right now?',
  'Summarize the AI newswire!',
];

function BotFace() {
  return (
    <div className="bot-3d" aria-hidden>
      <div className="bot-eye bot-eye-left"><span className="bot-pupil" /></div>
      <div className="bot-eye bot-eye-right"><span className="bot-pupil" /></div>
      <div className="bot-smile" />
      <div className="bot-antenna"><span className="bot-antenna-dot" /></div>
    </div>
  );
}

/**
 * Animated 3D chatbot launcher (replaces the plain round button).
 * The bot bobs, blinks and periodically nudges with a speech bubble.
 * Opens the full multi-question chat panel on click.
 */
const DISMISS_KEY = 'ai-pulse-bot-dismissed';

export default function BotWidget() {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  useEffect(() => {
    if (open || dismissed) return;
    let count = 0;
    const start = setTimeout(() => setNudge(1), 4000);
    const id = setInterval(() => {
      count += 1;
      if (count > 5) {
        clearInterval(id);
        return;
      }
      setNudge(n => (n % NUDGES.length) + 1);
    }, 9000);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [open, dismissed]);

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {open && <ChatPanel onClose={() => setOpen(false)} title="Pulse Bot" />}

      {!open && nudge > 0 && !dismissed && (
        <button
          onClick={() => setOpen(true)}
          className="animate-fade-up max-w-[220px] rounded-2xl rounded-br-md border border-[var(--color-line)] bg-[var(--card)] px-3.5 py-2.5 text-left text-[12px] leading-snug text-[var(--fore)] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)] hover:border-[var(--mut)]/50 transition-colors"
        >
          {NUDGES[(nudge - 1) % NUDGES.length]}
          <span
            role="button"
            aria-label="Dismiss"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); dismiss(); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); dismiss(); } }}
            className="ml-2 text-[var(--dim)] hover:text-[var(--fore)]"
          >
            ✕
          </span>
        </button>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Minimize chat' : 'Open Pulse Bot chat'}
        className="group relative flex items-center justify-center rounded-3xl transition-transform hover:scale-105 active:scale-95"
        style={{
          width: 64,
          height: 64,
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--cyan) 100%)',
          boxShadow: '0 16px 40px -10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        {!open && <span className="absolute inset-0 rounded-3xl bot-ping" aria-hidden />}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <BotFace />
        )}
      </button>
    </div>
  );
}
