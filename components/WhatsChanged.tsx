'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** "What changed" strip — renders only when real delta data exists. */
export default function WhatsChanged() {
  const [delta, setDelta] = useState<{ newStories: number | null; since: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/changelog')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (mounted && d?.delta?.newStories != null) setDelta(d.delta);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  if (!delta || delta.newStories === null) return null;
  return (
    <p className="mt-3 text-[13px] text-[var(--mut)]">
      Since the last refresh:{' '}
      <span className="font-semibold tabular-nums text-[var(--foreground)]">
        +{delta.newStories} stories
      </span>{' '}
      <Link href="/changelog" className="font-medium text-[var(--accent-hover)] hover:underline">
        See what changed →
      </Link>
    </p>
  );
}
