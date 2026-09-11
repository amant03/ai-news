'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-[600px] px-5 py-24 text-center">
          <p className="section-label">Something broke</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">The frontier glitched.</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--mut)]">
            Our error tracker caught this — try again, or head back to the newswire.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={reset}
              className="inline-flex h-9 items-center rounded-[var(--radius-md)] bg-[var(--gray-900)] px-4 text-sm font-medium text-white"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--color-line)] px-4 text-sm font-medium"
            >
              Back to news
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
