'use client';

import { useEffect, useState } from 'react';
import { countdown } from '@/lib/format';
import { useTheme } from '@/lib/theme';

interface HeaderProps {
  total?: number;
  onlineSources?: number;
  lastUpdated?: Date | null;
  nextRefreshAt?: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const NAV = [
  { href: '/', label: 'News' },
  { href: '/models', label: 'Models' },
  { href: '/coding-agents', label: 'Coding Agents' },
  { href: '/speech-image-video', label: 'Speech, Image, Video' },
  { href: '/trends', label: 'AI Trends' },
  { href: '/leaderboards', label: 'Leaderboards' },
];

function relTime(iso: string | null): string {
  if (!iso) return '…';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/**
 * Floating pill nav in the Artificial Analysis style: black logo pill,
 * neutral pill bar with rounded triggers, action pill cluster on the right.
 */
export default function Header({
  total: _total,
  onlineSources: _onlineSources,
  lastUpdated: _lastUpdated,
  nextRefreshAt,
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
}: HeaderProps = {}) {
  const { theme, toggle } = useTheme();
  const [active, setActive] = useState('/');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setActive(window.location.pathname);
  }, []);

  // Frost the floating bar once content starts sliding underneath it so the
  // ticker never shows through the gaps between pills.
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/status');
        const status = await res.json();
        if (!mounted) return;
        setLastSync(status.lastRun || status.lastSuccess || null);
      } catch {
        /* keep existing */
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const refreshIn = nextRefreshAt ? countdown(nextRefreshAt) : '...';
  const syncedTitle = lastSync ? `Last synced ${relTime(lastSync)}` : 'Checking sync status…';

  return (
    <header>
      <div className="max-w-[1400px] mx-auto px-5">
        <div
          className={`flex items-stretch justify-between gap-2 sm:gap-3 rounded-[1.75rem] px-2 py-1.5 transition-all duration-200 ${
            stuck
              ? 'bg-[var(--background)]/85 backdrop-blur-xl border border-[var(--color-line)]/70 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]'
              : 'border border-transparent'
          }`}
        >
          {/* Logo pill */}
          <a
            href="/"
            aria-label="AI Pulse home"
            className="flex items-center gap-2 pl-3.5 pr-4 sm:pr-5 bg-black rounded-full shrink-0"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--aa-mint)]" aria-hidden />
            <span className="font-display text-white text-[15px] sm:text-base font-medium tracking-tight whitespace-nowrap">
              AI Pulse
            </span>
          </a>

          {/* Center nav pill — single primary nav (desktop) */}
          <nav
            className="hidden lg:flex flex-1 items-center justify-center bg-neutral-100 rounded-[1.5rem] px-2 py-1.5 min-w-0"
            aria-label="Primary"
          >
            {NAV.map(item => (
              <a
                key={item.href}
                href={item.href}
                aria-current={active === item.href ? 'page' : undefined}
                className={`px-3 py-2 rounded-3xl text-sm whitespace-nowrap transition-colors ${
                  active === item.href
                    ? 'bg-black text-white font-medium'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right action pill */}
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-full pl-3 pr-1 py-1 shrink-0">
            <span
              className="hidden md:flex items-center gap-1.5 text-[11px] text-neutral-600 tabular-nums mr-1.5 whitespace-nowrap"
              title={syncedTitle}
            >
              <span className="relative flex h-1.5 w-1.5" aria-hidden>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              Synced {relTime(lastSync)}
              <span className="text-neutral-600 hidden xl:inline">· next {refreshIn}</span>
            </span>
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-600 hover:text-black hover:bg-black/5 transition-colors"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
            <button
              onClick={async () => {
                if (_onRefresh) {
                  _onRefresh();
                  return;
                }
                try {
                  await fetch('/api/refresh', { method: 'POST' });
                } catch {
                  /* ignore */
                }
              }}
              disabled={_isRefreshing}
              aria-label="Refresh"
              className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-600 hover:text-black hover:bg-black/5 transition-colors disabled:opacity-40"
            >
              <svg className={`w-4 h-4 ${_isRefreshing ? 'animate-spin-slow' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {/* Mobile menu — drawer, lg:hidden only */}
            <button
              onClick={() => setOpen(v => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full text-neutral-600 hover:text-black hover:bg-black/5 transition-colors"
            >
              {open ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <nav
            className="lg:hidden mt-2 rounded-2xl border border-[var(--color-line)] bg-[var(--card)] p-2 shadow-lg"
            aria-label="Primary mobile"
          >
            {NAV.map(item => (
              <a
                key={item.href}
                href={item.href}
                aria-current={active === item.href ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm transition-colors ${
                  active === item.href
                    ? 'bg-black text-white font-medium'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {item.label}
              </a>
            ))}
            <p className="px-4 py-2 text-[11px] tabular-nums text-neutral-400" title={syncedTitle}>
              Synced {relTime(lastSync)}
            </p>
          </nav>
        )}
      </div>
    </header>
  );
}
