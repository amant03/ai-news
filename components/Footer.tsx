'use client';

import { useState, FormEvent } from 'react';
import { BUILD_TAG } from '@/lib/build';

const EXPLORE = [
  { href: '/', label: 'News' },
  { href: '/models', label: 'Models' },
  { href: '/leaderboards', label: 'LLM Leaderboard' },
  { href: '/coding-agents', label: 'Coding Agents' },
  { href: '/trends', label: 'AI Trends' },
  { href: '/chat', label: 'Chat' },
];

const MEDIA = [
  { href: '/speech-image-video', label: 'Speech, Image & Video' },
  { href: '/image/leaderboard/text-to-image', label: 'Text to Image' },
  { href: '/image/leaderboard/editing', label: 'Image Editing' },
  { href: '/video/leaderboard/text-to-video', label: 'Text to Video' },
  { href: '/video/leaderboard/image-to-video', label: 'Image to Video' },
  { href: '/video/leaderboard/video-editing', label: 'Video Editing' },
];

const SPEECH = [
  { href: '/speech-to-text', label: 'Speech to Text' },
  { href: '/text-to-speech', label: 'Text to Speech' },
  { href: '/models', label: 'All Models' },
];

function FooterNewsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email.');
      return;
    }
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) throw new Error();
      try {
        const existing = JSON.parse(localStorage.getItem('ai-pulse-subs') || '[]');
        if (!existing.includes(trimmed)) {
          existing.push(trimmed);
          localStorage.setItem('ai-pulse-subs', JSON.stringify(existing));
        }
      } catch {}
      setDone(true);
      setEmail('');
    } catch {
      setError('Something went wrong.');
    }
  };

  if (done) return <p className="text-sm font-medium">You&apos;re in — see you tomorrow.</p>;

  return (
    <form onSubmit={submit}>
      <p className="text-sm font-medium mb-2">Get notified about new stories</p>
      <div className="flex border border-current p-1.5 max-w-sm">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:opacity-60"
          aria-label="Email address"
        />
        <button type="submit" className="btn-plum shrink-0">
          Subscribe
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs">{error}</p>}
    </form>
  );
}

function LinkCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70 mb-3">{title}</p>
      <ul className="space-y-2">
        {links.map(l => (
          <li key={l.href + l.label}>
            <a href={l.href} className="text-sm hover:underline underline-offset-4">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Lavender footer in the Artificial Analysis style: oversized serif brand,
 * newsletter subscribe box, link columns, build tag.
 */
export default function Footer() {
  return (
    <footer className="aa-footer mt-16">
      <div className="max-w-[1400px] mx-auto px-5 pt-12 pb-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <a href="/" className="font-display text-4xl md:text-5xl font-medium tracking-tight">
              AI Pulse
            </a>
            <p className="mt-3 text-sm leading-relaxed max-w-[36ch] opacity-80">
              Independent tracking of the AI frontier — every story and every model, ranked by
              intelligence, speed and cost.
            </p>
            <div className="mt-6">
              <FooterNewsletter />
            </div>
          </div>
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <LinkCol title="Explore" links={EXPLORE} />
            <LinkCol title="Image & Video" links={MEDIA} />
            <LinkCol title="Speech & Models" links={SPEECH} />
          </div>
        </div>
        <div className="mt-10 pt-5 border-t border-current/20 flex flex-wrap items-center justify-between gap-2 text-xs opacity-80">
          <span>© 2026 AI Pulse</span>
          <span className="aa-footer-dim font-mono text-[11px]">build {BUILD_TAG}</span>
        </div>
      </div>
    </footer>
  );
}
