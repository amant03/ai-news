'use client';

import { useState, FormEvent } from 'react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setStatus('error');
        return;
      }

      // Persist locally so the form stays hidden on revisit.
      try {
        const existing = JSON.parse(localStorage.getItem('ai-pulse-subs') || '[]');
        if (!existing.includes(trimmed)) {
          existing.push(trimmed);
          localStorage.setItem('ai-pulse-subs', JSON.stringify(existing));
        }
      } catch {}

      setStatus('success');
      setEmail('');
    } catch {
      setError('Network error — try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section className="relative rounded-2xl border border-[var(--color-line)] bg-[var(--card)] px-6 py-10 text-center animate-fade-up">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ok)]/15">
            <svg className="h-5 w-5 text-[var(--ok)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-display font-semibold text-lg text-[var(--fore)] tracking-tight">You&rsquo;re in.</h3>
          <p className="mt-2 text-sm text-[var(--mut)] leading-relaxed">
            Welcome aboard. We&rsquo;ll deliver the daily AI snapshot — no fluff, just signal.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative rounded-2xl border border-[var(--color-line)] bg-[var(--card)] px-6 py-10 animate-fade-up">
      <div className="mx-auto max-w-lg text-center">
        <p className="kicker mb-2">Newsletter</p>
        <h3 className="font-display font-semibold text-[1.35rem] text-[var(--fore)] tracking-tight leading-snug">
          Get the daily AI snapshot
        </h3>
        <p className="mt-2 text-sm text-[var(--mut)] leading-relaxed">
          Top stories, model updates, and trend analysis delivered to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            className="ring-focus flex-1 min-w-0 rounded-xl border border-[var(--color-line)] bg-[var(--input)] px-4 py-3 text-sm text-[var(--fore)] placeholder:text-[var(--dim)] transition-colors focus:border-[var(--accent)]/50"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="ring-focus rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--ink)] tracking-tight transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {status === 'loading' ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Subscribing…
              </span>
            ) : (
              'Subscribe'
            )}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-xs text-[var(--bad)] animate-slide-in">{error}</p>
        )}

        <p className="mt-4 text-[11px] text-[var(--dim)]">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
