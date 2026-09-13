'use client';

import { useEffect, useState } from 'react';

export function hasVoted(id: string): boolean {
  try {
    return Boolean(JSON.parse(localStorage.getItem('ai-pulse-votes') || '{}')[id]);
  } catch {
    return false;
  }
}

export function markVoted(id: string) {
  try {
    const v = JSON.parse(localStorage.getItem('ai-pulse-votes') || '{}');
    v[id] = true;
    localStorage.setItem('ai-pulse-votes', JSON.stringify(v));
  } catch {}
}

export function VoteButtons({ likes, dislikes, voted, onVote, small }: {
  likes: number; dislikes: number; voted: boolean; onVote: (dir: 'up' | 'down') => void; small?: boolean;
}) {
  const btn = small ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-[12px]';
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={e => { e.stopPropagation(); onVote('up'); }}
        disabled={voted}
        aria-label="Like"
        title={voted ? 'You already voted' : 'Like'}
        className={`${btn} rounded-md border border-[var(--color-line)] tabular-nums transition-colors ${voted ? 'opacity-40 cursor-default' : 'hover:border-[var(--ok)] hover:text-[var(--ok)]'}`}
      >
        ▲ {likes}
      </button>
      <button
        onClick={e => { e.stopPropagation(); onVote('down'); }}
        disabled={voted}
        aria-label="Dislike"
        title={voted ? 'You already voted' : 'Dislike'}
        className={`${btn} rounded-md border border-[var(--color-line)] tabular-nums transition-colors ${voted ? 'opacity-40 cursor-default' : 'hover:border-[var(--bad)] hover:text-[var(--bad)]'}`}
      >
        ▼ {dislikes}
      </button>
    </span>
  );
}

/** Story-level votes with optimistic UI. Returns counts + voter for any row. */
export function useStoryVotes(storyKey: string | null, initial: { likes: number; dislikes: number }) {
  const [counts, setCounts] = useState(initial);
  const [voted, setVoted] = useState(() => (storyKey ? hasVoted(`s:${storyKey}`) : false));

  // Stay in sync when server truth arrives later (bulk load, thread votes).
  useEffect(() => {
    setCounts(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.likes, initial.dislikes]);

  const vote = async (dir: 'up' | 'down') => {
    if (!storyKey || voted) return;
    setVoted(true);
    markVoted(`s:${storyKey}`);
    setCounts(c => ({ likes: c.likes + (dir === 'up' ? 1 : 0), dislikes: c.dislikes + (dir === 'down' ? 1 : 0) }));
    try {
      const res = await fetch('/api/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: storyKey, dir }),
      });
      const data = await res.json();
      if (data.ok) {
        setCounts({ likes: data.likes, dislikes: data.dislikes });
        return { likes: data.likes as number, dislikes: data.dislikes as number };
      }
    } catch {}
    return undefined;
  };

  return { ...counts, voted, vote };
}

/** Compact row-level votes. Renders disabled zeros until counts load. */
export function RowVotes({ entry, onCount }: {
  entry: { key: string; likes: number; dislikes: number } | null | undefined;
  onCount?: (likes: number, dislikes: number) => void;
}) {
  const { likes, dislikes, voted, vote } = useStoryVotes(entry?.key ?? null, {
    likes: entry?.likes ?? 0,
    dislikes: entry?.dislikes ?? 0,
  });
  return (
    <VoteButtons
      small
      likes={likes}
      dislikes={dislikes}
      voted={voted || !entry}
      onVote={async dir => {
        const res = await vote(dir);
        if (res && onCount) onCount(res.likes, res.dislikes);
      }}
    />
  );
}
