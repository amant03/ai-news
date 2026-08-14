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

export default function Header({
  total,
  onlineSources,
  lastUpdated,
  nextRefreshAt,
  isRefreshing,
  onRefresh,
}: HeaderProps) {
  const [, setNow] = useState(0);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshIn = nextRefreshAt ? countdown(nextRefreshAt) : '…';

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] backdrop-blur-xl" style={{ background: 'var(--header-bg)' }}>
      <div className="hairline-gradient absolute top-0 inset-x-0 opacity-60" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3.5">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-cyan-400/30">
              <span className="text-[var(--cyan)] font-display font-bold text-lg">AI</span>
              <span className="absolute -inset-1 rounded-xl border border-cyan-400/20 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg sm:text-xl tracking-tight text-[var(--fore)] leading-none">
                AI <span className="gradient-text">PULSE</span>
              </h1>
              <p className="hidden sm:block text-[11px] text-[var(--mut)] mt-1 truncate">
                AI news for everyone · updated every 4h
              </p>
            </div>
          </div>

          {/* Live / stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 animate-pulse-dot" />
              </span>
              <span className="text-[11px] font-medium tracking-widest uppercase text-[var(--ok)]">Live</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="font-mono text-sm text-[var(--fore)] tabular-nums">{formatCount(total)}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--dim)]">stories</div>
              </div>

              <div className="h-8 w-px bg-[var(--color-line)]" />

              <div className="text-right">
                <div className="font-mono text-sm text-[var(--fore)] tabular-nums">{onlineSources}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--dim)]">sources</div>
              </div>

              <div className="h-8 w-px bg-[var(--color-line)]" />

              <div className="text-right hidden lg:block">
                <div className="font-mono text-sm text-[var(--cyan)] tabular-nums">{refreshIn}</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--dim)]">next refresh</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right">
              <div className="text-[10px] text-[var(--dim)] uppercase tracking-wider">last sync</div>
              <div className="font-mono text-xs text-[var(--mut)]">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
              </div>
            </div>
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="ring-focus w-9 h-9 flex items-center justify-center rounded-xl text-[var(--mut)] border border-[var(--color-line)] hover:text-[var(--fore)] hover:border-[var(--mut)] transition-colors"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="4" />
                  <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="ring-focus flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-cyan-400/10 border border-cyan-400/30 text-[var(--cyan)] hover:bg-cyan-400/20 hover:border-cyan-300/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin-slow' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Syncing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
}
