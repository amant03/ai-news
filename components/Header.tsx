'use client';

import { useEffect, useState } from 'react';
import { countdown } from '@/lib/format';
import { useTheme } from '@/lib/theme';

interface HeaderProps {
  total: number;
  onlineSources: number;
  lastUpdated: Date | null;
  nextRefreshAt: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const NAV = [
  { href: '/', label: 'News' },
  { href: '/models', label: 'Models' },
  { href: '/image', label: 'Image' },
  { href: '/trends', label: 'AI Trends' },
  { href: '/leaderboards', label: 'Leaderboards' },
];

/**
 * Artificial-Analysis-style top bar: brand mark on the left, a slim nav row
 * beside it, refresh + theme on the right. No stats clutter — keep it clean.
 */
export default function Header({
  total,
  onlineSources,
  lastUpdated: _lastUpdated,
  nextRefreshAt,
  isRefreshing,
  onRefresh,
}: HeaderProps) {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('#top');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the nav item for the current route.
  useEffect(() => {
    const path = window.location.pathname;
    const match = NAV.find(n => n.href === path);
    setActive(match ? match.href : '#top');
  }, []);

  const refreshIn = nextRefreshAt ? countdown(nextRefreshAt) : '…';

  return (
    <header
      className="sticky top-0 z-50 border-b border-[var(--color-line)] backdrop-blur-xl"
      style={{ background: 'var(--header-bg)' }}
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-2.5">
          {/* Brand mark — top left */}
          <a href="/" className="flex items-center gap-2.5 group min-w-0" aria-label="AI Pulse home">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-[var(--violet)]/20 border border-[var(--accent)]/30">
              <span className="text-[var(--accent)] font-display font-bold text-sm tracking-tight">AI</span>
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse" />
            </div>
            <div className="hidden sm:block leading-none">
              <span className="font-display font-semibold text-lg tracking-tight text-[var(--fore)]">
                AI <span className="gradient-text italic">Pulse</span>
              </span>
            </div>
          </a>

          {/* Nav row — same line as the brand */}
          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Primary">
            {NAV.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`ring-focus whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  active === item.href
                    ? 'text-[var(--fore)] bg-[var(--input)]/70'
                    : 'text-[var(--mut)] hover:text-[var(--fore)] hover:bg-[var(--input)]/40'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right: live dot, refresh, theme */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-[var(--dim)] mr-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--ok)] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--ok)]" />
              </span>
              <span>{total} stories</span>
              <span aria-hidden>·</span>
              <span>{onlineSources} sources</span>
              <span aria-hidden>·</span>
              <span title="next refresh">{refreshIn}</span>
            </div>

            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="ring-focus w-8 h-8 flex items-center justify-center rounded-lg text-[var(--mut)] border border-[var(--color-line)] hover:text-[var(--fore)] hover:border-[var(--mut)] transition-colors"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <circle cx="12" cy="12" r="4" />
                  <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh news"
              className="ring-focus w-8 h-8 flex items-center justify-center rounded-lg text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin-slow' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}