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
  { href: '/coding-agents', label: 'Coding Agents' },
  { href: '/trends', label: 'AI Trends' },
  { href: '/leaderboards', label: 'Leaderboards' },
];

/**
 * Clean AA-style header: logo left, pill nav center, minimal actions right.
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
  const [active, setActive] = useState('/');

  useEffect(() => {
    setActive(window.location.pathname);
  }, []);

  const refreshIn = nextRefreshAt ? countdown(nextRefreshAt) : '...';

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)]" style={{ background: 'var(--header-bg)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-[1400px] mx-auto px-5">
        <div className="flex items-center justify-between gap-4 h-14">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0" aria-label="AI Pulse home">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-white font-bold text-xs">AI</span>
            </div>
            <span className="font-semibold text-sm tracking-tight hidden sm:block">AI Pulse</span>
          </a>

          {/* Pill nav */}
          <nav className="hidden md:flex items-center bg-neutral-100 rounded-full px-1 py-1" aria-label="Primary">
            {NAV.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  active === item.href
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Mobile nav */}
          <nav className="flex md:hidden items-center gap-1" aria-label="Primary">
            {NAV.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  active === item.href
                    ? 'bg-black text-white'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-neutral-400 tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {refreshIn}
            </span>
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
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
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors disabled:opacity-40"
            >
              <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin-slow' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
