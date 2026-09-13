'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { NewsItem } from '@/lib/types';
import { analyzeTexts } from '@/lib/sentiment';
import type { SocialComment, SocialThread } from '@/lib/social';
import { fetchRedditThread, redditIdFrom } from '@/lib/social';
import type { ThreadComment } from '@/lib/engagement-store';
import { SentimentPie, SentimentGauge, SentimentLegend } from './SentimentViz';

type SourceTab = 'site' | 'reddit' | 'hn' | 'x';

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function votedSet(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem('ai-pulse-votes') || '{}');
  } catch {
    return {};
  }
}
function markVoted(id: string) {
  try {
    const v = votedSet();
    v[id] = true;
    localStorage.setItem('ai-pulse-votes', JSON.stringify(v));
  } catch {}
}

function VoteButtons({ likes, dislikes, voted, onVote, small }: {
  likes: number; dislikes: number; voted: boolean; onVote: (dir: 'up' | 'down') => void; small?: boolean;
}) {
  const btn = small ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]';
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => onVote('up')}
        disabled={voted}
        aria-label="Like"
        title={voted ? 'You already voted' : 'Like'}
        className={`${btn} rounded-md border border-[var(--color-line)] tabular-nums transition-colors ${voted ? 'opacity-40 cursor-default' : 'hover:border-[var(--ok)] hover:text-[var(--ok)]'}`}
      >
        ▲ {likes}
      </button>
      <button
        onClick={() => onVote('down')}
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

function SocialNode({ c, depth }: { c: SocialComment; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  return (
    <div className={`${depth > 0 ? 'ml-4 pl-3 border-l border-[var(--color-line)]' : ''}`}>
      <div className="py-2">
        <div className="flex items-center gap-2 text-[11px] text-[var(--dim)]">
          <span className="font-medium text-[var(--mut)]">{c.author}</span>
          <span className="tabular-nums">▲ {c.score}</span>
          {c.created_at && <span>{timeAgo(c.created_at)}</span>}
          {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline">↗</a>}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--fore)] whitespace-pre-wrap break-words">{c.text}</p>
        {(c.replies.length > 0 || (c.replyCount ?? 0) > 0) && (
          <button onClick={() => setOpen(o => !o)} className="mt-1 text-[11px] text-[var(--dim)] hover:text-[var(--fore)]">
            {open ? '–' : '+'} {c.replies.length > 0 ? `${c.replies.length} ${c.replies.length === 1 ? 'reply' : 'replies'}` : `${c.replyCount} ${c.replyCount === 1 ? 'reply' : 'replies'}`}
          </button>
        )}
      </div>
      {open && c.replies.map((r, i) => <SocialNode key={i} c={r} depth={depth + 1} />)}
    </div>
  );
}

function SiteNode({ c, storyKey, depth, onChanged }: {
  c: ThreadComment; storyKey: string; depth: number; onChanged: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [nick, setNick] = useState(() => {
    try {
      return localStorage.getItem('ai-pulse-nick') || '';
    } catch {
      return '';
    }
  });
  const [votes, setVotes] = useState({ likes: c.likes, dislikes: c.dislikes });
  const [hasVoted, setHasVoted] = useState(() => Boolean(votedSet()[`c:${c.id}`]));
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const net = votes.likes - votes.dislikes;

  const vote = async (dir: 'up' | 'down') => {
    if (hasVoted) return;
    setHasVoted(true);
    markVoted(`c:${c.id}`);
    setVotes(v => ({ likes: v.likes + (dir === 'up' ? 1 : 0), dislikes: v.dislikes + (dir === 'down' ? 1 : 0) }));
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', key: storyKey, id: c.id, dir }),
      });
      const data = await res.json();
      if (data.ok) setVotes({ likes: data.likes, dislikes: data.dislikes });
    } catch {}
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (text.length < 2 || sending) return;
    setSending(true);
    setErr('');
    try {
      try {
        localStorage.setItem('ai-pulse-nick', nick);
      } catch {}
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', key: storyKey, nick, text, parentId: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Reply failed.');
      setReply('');
      setReplyOpen(false);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reply failed.');
    }
    setSending(false);
  };

  const sorted = useMemo(
    () => [...(c.replies || [])].sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes)),
    [c.replies]
  );

  return (
    <div className={`${depth > 0 ? 'ml-4 pl-3 border-l-2 border-[var(--accent)]/25' : ''}`}>
      <div className="py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--dim)]">
          <span className="font-semibold text-[var(--fore)]">{c.nick}</span>
          <span className={`tabular-nums font-medium ${net > 0 ? 'text-[var(--ok)]' : net < 0 ? 'text-[var(--bad)]' : ''}`}>
            {net > 0 ? `+${net}` : net}
          </span>
          <span>{timeAgo(c.created_at)}</span>
          <VoteButtons likes={votes.likes} dislikes={votes.dislikes} voted={hasVoted} onVote={vote} small />
          <button onClick={() => setReplyOpen(o => !o)} className="hover:text-[var(--fore)] font-medium">Reply</button>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap break-words">{c.text}</p>
        {replyOpen && (
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <input
                value={nick}
                onChange={e => setNick(e.target.value)}
                placeholder="nickname (optional)"
                maxLength={40}
                className="w-36 rounded-lg border border-[var(--color-line)] bg-[var(--input)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]/50"
              />
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder={`Reply to ${c.nick}…`}
                maxLength={2000}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                className="flex-1 min-w-0 rounded-lg border border-[var(--color-line)] bg-[var(--input)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]/50"
              />
              <button
                onClick={sendReply}
                disabled={sending || reply.trim().length < 2}
                className="rounded-lg bg-[var(--fore)] px-3 py-1.5 text-[12px] font-medium text-[var(--background)] disabled:opacity-40"
              >
                {sending ? '…' : 'Reply'}
              </button>
            </div>
            {err && <p className="text-[11px] text-[var(--bad)]">{err}</p>}
          </div>
        )}
      </div>
      {sorted.map(r => <SiteNode key={r.id} c={r} storyKey={storyKey} depth={depth + 1} onChanged={onChanged} />)}
    </div>
  );
}

export default function StoryThread({ item, storyKey, onEngagement }: {
  item: NewsItem;
  storyKey: string;
  onEngagement?: (likes: number, dislikes: number, comments: number) => void;
}) {
  const [tab, setTab] = useState<SourceTab>('site');
  const [site, setSite] = useState<{ likes: number; dislikes: number; comments: ThreadComment[] } | null>(null);
  const [social, setSocial] = useState<Record<string, SocialThread | null>>({});
  const [socialErr, setSocialErr] = useState<Record<string, string>>({});
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [storyVotes, setStoryVotes] = useState<{ likes: number; dislikes: number } | null>(null);
  const [storyVoted, setStoryVoted] = useState(() => Boolean(votedSet()[`s:${storyKey}`]));
  const [nick, setNick] = useState(() => {
    try {
      return localStorage.getItem('ai-pulse-nick') || '';
    } catch {
      return '';
    }
  });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const refreshSite = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?key=${storyKey}`);
      const data = await res.json();
      if (data.ok) {
        setSite({ likes: data.likes, dislikes: data.dislikes, comments: data.comments });
        onEngagement?.(data.likes, data.dislikes, data.comments.length);
      }
    } catch {}
  }, [storyKey, onEngagement]);

  useEffect(() => {
    refreshSite();
  }, [refreshSite]);

  const loadSocial = useCallback(async (which: 'reddit' | 'hn') => {
    setSocial(prev => (prev[which] !== undefined ? prev : { ...prev, [which]: null }));
    if (social[which] !== undefined) return;
    setLoadingSocial(true);
    try {
      const threadParam = which === 'reddit'
        ? (item.thread_id || item.url)
        : (item.thread_id || '');
      const res = await fetch(`/api/social-comments?source=${which}&thread=${encodeURIComponent(threadParam)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Load failed.');
      setSocial(prev => ({ ...prev, [which]: data as SocialThread }));
    } catch (e) {
      // Reddit walls server IPs — retry straight from the browser, where the
      // public JSON API answers residential traffic with open CORS.
      if (which === 'reddit') {
        try {
          const id = redditIdFrom(item.thread_id || item.url);
          if (id) {
            const direct = await fetchRedditThread(id);
            setSocial(prev => ({ ...prev, [which]: direct }));
            setLoadingSocial(false);
            return;
          }
        } catch {
          /* fall through to honest error */
        }
      }
      setSocialErr(prev => ({ ...prev, [which]: e instanceof Error ? e.message : 'Load failed.' }));
      setSocial(prev => ({ ...prev, [which]: null }));
    }
    setLoadingSocial(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.thread_id, item.url, social]);

  useEffect(() => {
    if (tab === 'reddit' || tab === 'hn') loadSocial(tab);
  }, [tab, loadSocial]);

  const voteStory = async (dir: 'up' | 'down') => {
    if (storyVoted) return;
    setStoryVoted(true);
    markVoted(`s:${storyKey}`);
    setStoryVotes(v => ({ likes: (v?.likes ?? site?.likes ?? 0) + (dir === 'up' ? 1 : 0), dislikes: (v?.dislikes ?? site?.dislikes ?? 0) + (dir === 'down' ? 1 : 0) }));
    try {
      const res = await fetch('/api/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: storyKey, dir }),
      });
      const data = await res.json();
      if (data.ok) {
        setStoryVotes({ likes: data.likes, dislikes: data.dislikes });
        onEngagement?.(data.likes, data.dislikes, site?.comments.length ?? 0);
      }
    } catch {}
  };

  const postComment = async () => {
    const text = draft.trim();
    if (text.length < 2 || sending) return;
    setSending(true);
    setErr('');
    try {
      try {
        localStorage.setItem('ai-pulse-nick', nick);
      } catch {}
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', key: storyKey, nick, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Post failed.');
      setDraft('');
      refreshSite();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Post failed.');
    }
    setSending(false);
  };

  const sentiment = useMemo(() => {
    const texts = [`${item.title} ${item.summary || ''}`];
    for (const c of site?.comments || []) {
      texts.push(c.text);
      const walk = (list: ThreadComment[]) => {
        for (const r of list) {
          texts.push(r.text);
          walk(r.replies || []);
        }
      };
      walk(c.replies || []);
    }
    for (const key of ['reddit', 'hn'] as const) {
      const t = social[key];
      if (t && !t.unsupported) {
        for (const c of t.comments) {
          texts.push(c.text);
          for (const r of c.replies) texts.push(r.text);
        }
      }
    }
    return { ...analyzeTexts(texts), texts: texts.length };
  }, [item.title, item.summary, site?.comments, social]);

  const sortedSite = useMemo(() => {
    return [...(site?.comments || [])].sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
  }, [site?.comments]);

  const tabs: Array<{ id: SourceTab; label: string; count?: number | null }> = [
    { id: 'site', label: `Discussion (${site?.comments.length ?? 0})` },
    ...(item.source_type === 'reddit' || item.thread_id || /reddit\.com/.test(item.url) ? [{ id: 'reddit' as SourceTab, label: `Reddit${social.reddit?.total != null ? ` (${social.reddit.total})` : item.num_comments ? ` (${item.num_comments})` : ''}` }] : []),
    ...(item.source_type === 'hn' || item.thread_id || /ycombinator\.com/.test(item.url) ? [{ id: 'hn' as SourceTab, label: `Hacker News${social.hn?.total != null ? ` (${social.hn.total})` : item.num_comments ? ` (${item.num_comments})` : ''}` }] : []),
    ...(item.source_type === 'twitter' || /x\.com|twitter\.com/.test(item.url) ? [{ id: 'x' as SourceTab, label: 'X' }] : []),
  ];

  const likes = storyVotes?.likes ?? site?.likes ?? 0;
  const dislikes = storyVotes?.dislikes ?? site?.dislikes ?? 0;

  return (
    <div className="border-t border-[var(--color-line)] bg-[var(--surface)]/60 px-4 sm:px-5 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* Sentiment panel */}
        <div className="flex lg:flex-col items-center gap-4 rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-4">
          <SentimentPie positive={sentiment.positive} negative={sentiment.negative} neutral={sentiment.neutral} />
          <div>
            <SentimentGauge score={sentiment.score} width={200} />
            <div className="mt-2 flex justify-center">
              <SentimentLegend positive={sentiment.positive} negative={sentiment.negative} neutral={sentiment.neutral} />
            </div>
            <p className="mt-1.5 text-center text-[10px] text-[var(--dim)]">story + {Math.max(0, sentiment.texts - 1)} comments</p>
          </div>
        </div>

        {/* Discussion */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <VoteButtons likes={likes} dislikes={dislikes} voted={storyVoted} onVote={voteStory} />
            <span className="w-px h-4 bg-[var(--color-line)] mx-1" aria-hidden />
            <div className="flex gap-1 flex-wrap">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-[var(--fore)] text-[var(--background)]'
                      : 'border border-[var(--color-line)] text-[var(--mut)] hover:text-[var(--fore)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[12px] text-[var(--dim)] hover:text-[var(--fore)]">
              Read full story ↗
            </a>
          </div>

          {tab === 'site' && (
            <div>
              {sortedSite.length === 0 ? (
                <p className="py-4 text-[13px] text-[var(--dim)]">No comments yet — start the discussion below.</p>
              ) : (
                <div className="divide-y divide-[var(--color-line)]">
                  {sortedSite.map(c => <SiteNode key={c.id} c={c} storyKey={storyKey} depth={0} onChanged={refreshSite} />)}
                </div>
              )}
              <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--card)] p-3">
                <div className="flex gap-1.5 flex-col sm:flex-row">
                  <input
                    value={nick}
                    onChange={e => setNick(e.target.value)}
                    placeholder="nickname (optional, anonymous)"
                    maxLength={40}
                    className="sm:w-44 rounded-lg border border-[var(--color-line)] bg-[var(--input)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]/50"
                  />
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Add a comment…"
                    maxLength={2000}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); postComment(); } }}
                    className="flex-1 min-w-0 rounded-lg border border-[var(--color-line)] bg-[var(--input)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]/50"
                  />
                  <button
                    onClick={postComment}
                    disabled={sending || draft.trim().length < 2}
                    className="rounded-lg bg-[var(--fore)] px-4 py-2 text-[12px] font-medium text-[var(--background)] disabled:opacity-40"
                  >
                    {sending ? '…' : 'Comment'}
                  </button>
                </div>
                {err && <p className="text-[11px] text-[var(--bad)]">{err}</p>}
              </div>
            </div>
          )}

          {(tab === 'reddit' || tab === 'hn') && (
            <div>
              {loadingSocial && social[tab] === null && !socialErr[tab] ? (
                <p className="py-4 text-[13px] text-[var(--dim)]">Loading {tab === 'reddit' ? 'Reddit' : 'Hacker News'} thread…</p>
              ) : socialErr[tab] ? (
                <div className="py-4">
                  <p className="text-[13px] text-[var(--bad)]">{socialErr[tab]}</p>
                  <a
                    href={tab === 'reddit' ? `https://www.reddit.com/comments/${item.thread_id || ''}/` : `https://news.ycombinator.com/item?id=${item.thread_id || ''}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-1 inline-block text-[12px] underline underline-offset-2"
                  >
                    Open thread directly ↗
                  </a>
                </div>
              ) : social[tab] ? (
                <>
                  <p className="mb-1 text-[11px] text-[var(--dim)]">
                    Top comments by score · {social[tab]!.total ?? social[tab]!.comments.length} total ·{' '}
                    <a href={social[tab]!.postUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">full thread ↗</a>
                  </p>
                  <div className="divide-y divide-[var(--color-line)]">
                    {[...social[tab]!.comments].sort((a, b) => b.score - a.score).map((c, i) => <SocialNode key={i} c={c} depth={0} />)}
                  </div>
                  {social[tab]!.comments.length === 0 && (
                    <p className="py-4 text-[13px] text-[var(--dim)]">No comments synced for this thread yet.</p>
                  )}
                </>
              ) : null}
            </div>
          )}

          {tab === 'x' && (
            <div className="py-4">
              <p className="text-[13px] text-[var(--mut)] leading-relaxed">
                X blocks automated reply fetching
                {item.tweet_metrics ? (
                  <> — this post has <strong>{item.tweet_metrics.likeCount.toLocaleString()} likes</strong>,{' '}
                  <strong>{item.tweet_metrics.retweetCount.toLocaleString()} reposts</strong> and{' '}
                  <strong>{item.tweet_metrics.replyCount.toLocaleString()} replies</strong></>
                ) : ''}.
              </p>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-lg bg-[var(--fore)] px-4 py-2 text-[12px] font-medium text-[var(--background)]">
                Join the discussion on X ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
