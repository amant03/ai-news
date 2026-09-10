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

  useEffect(() => {
    setActive(window.location.pathname);
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

  return (
    <header>
      <div className="max-w-[1400px] mx-auto px-5">
        <div className="flex items-stretch justify-between gap-2 sm:gap-3">
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

          {/* Center nav pill */}
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
              className="hidden md:flex items-center gap-1.5 text-[11px] text-neutral-500 tabular-nums mr-1.5 whitespace-nowrap"
              title="Live sync status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Synced {relTime(lastSync)}
              <span className="text-neutral-300 hidden xl:inline">· next {refreshIn}</span>
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
          </div>
        </div>

        {/* Mobile / tablet nav row */}
        <nav
          className="flex lg:hidden items-center gap-1 mt-2 overflow-x-auto no-scrollbar bg-neutral-100 rounded-full px-2 py-1.5"
          aria-label="Primary"
        >
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-colors ${
                active === item.href
                  ? 'bg-black text-white font-medium'
                  : 'text-neutral-600'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
