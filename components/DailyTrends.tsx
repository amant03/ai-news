'use client';

import { useMemo, useState } from 'react';
import { NewsItem } from '@/lib/types';
import { engagementScore, frontPageOrder } from '@/lib/engagement';
import { timeAgo } from '@/lib/format';

interface DailyTrendsProps {
  items: NewsItem[];
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * A calendar of what the AI space was talking about — one cell per day.
 * The hotter the day (more stories + more engagement), the stronger the glow.
 * Clicking a day reveals that day's trending stories and topics.
 */
export default function DailyTrends({ items }: DailyTrendsProps) {
  const now = new Date();
  const [selected, setSelected] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const byDay = useMemo(() => {
    const map = new Map<string, NewsItem[]>();
    for (const item of items) {
      const key = item.published_at.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    for (const [k, v] of map) {
      map.set(k, frontPageOrder(v));
    }
    return map;
  }, [items]);

  const year = now.getFullYear();
  const month = ((now.getMonth() + monthOffset) % 12 + 12) % 12;
  const viewYear = year + Math.floor((now.getMonth() + monthOffset) / 12);

  const firstDay = new Date(viewYear, month, 1).getDay();
  const daysInMonth = new Date(viewYear, month + 1, 0).getDate();

  const selectedKey = selected || `${viewYear}-${String(month + 1).padStart(2, '0')}-${String(Math.min(now.getDate(), daysInMonth)).padStart(2, '0')}`;
  const selectedDay = selected || `${viewYear}-${String(month + 1).padStart(2, '0')}-01`;
  const dayItems = byDay.get(selectedDay) || [];
  const dayEngagement = dayItems.reduce((sum, i) => sum + engagementScore(i), 0);
  const dayTopics = useMemo(() => topicsFor(dayItems), [dayItems]);

  return (
    <section className="glass rounded-2xl p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-[var(--fore)]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--violet)] mr-2 align-middle" />
          Daily Trends
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonthOffset(m => m - 1)} aria-label="Previous month" className="ring-focus w-6 h-6 flex items-center justify-center rounded-md text-[var(--dim)] hover:text-[var(--fore)] hover:bg-[var(--input)] transition-colors">‹</button>
          <span className="text-[10px] font-mono text-[var(--mut)] px-1">{MONTH_NAMES[month]} {viewYear}</span>
          <button onClick={() => setMonthOffset(m => m + 1)} aria-label="Next month" className="ring-focus w-6 h-6 flex items-center justify-center rounded-md text-[var(--dim)] hover:text-[var(--fore)] hover:bg-[var(--input)] transition-colors">›</button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="text-center text-[9px] font-mono text-[var(--dim)]">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${viewYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const list = byDay.get(key) || [];
          const count = list.length;
          const heat = Math.min(1, list.reduce((s, it) => s + engagementScore(it), 0) / 12);
          const isSelected = key === selectedKey;
          const isToday = key === `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          return (
            <button
              key={key}
              onClick={() => { setSelected(key); if (monthOffset !== 0) setMonthOffset(0); }}
              title={`${key} · ${count} stories`}
              className={`ring-focus aspect-square rounded-lg text-[10px] font-mono flex items-center justify-center transition-all border ${
                isSelected
                  ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                  : 'border-[var(--color-line)] text-[var(--mut)] hover:border-[var(--mut)]'
              }`}
              style={{
                backgroundColor: count > 0 ? `rgba(154, 123, 212, ${0.12 + heat * 0.5})` : 'transparent',
                color: isSelected ? 'var(--accent)' : undefined,
              }}
            >
              <span className={isToday ? 'relative flex items-center justify-center' : ''}>
                {day}
                {isToday && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <div className="mt-3 rounded-xl border border-[var(--color-line)] bg-[var(--input)]/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[var(--fore)]">{selectedDay}</span>
          <span className="text-[10px] font-mono text-[var(--dim)]">
            {dayItems.length} stories · 🔥 {dayEngagement.toFixed(1)} heat
          </span>
        </div>

        {dayTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {dayTopics.slice(0, 6).map(t => (
              <span key={t.word} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--violet)]/10 border border-[var(--violet)]/20 text-[var(--violet)]">
                {t.word}
              </span>
            ))}
          </div>
        )}

        <ul className="space-y-1.5">
          {dayItems.slice(0, 5).map(item => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block text-[12px] leading-snug text-[var(--mut)] hover:text-[var(--fore)] line-clamp-2 transition-colors"
              >
                {item.title}
              </a>
              <span className="text-[9px] font-mono text-[var(--dim)]">{timeAgo(item.published_at)} · {item.source_label || item.source}</span>
            </li>
          ))}
          {dayItems.length === 0 && <li className="text-[11px] text-[var(--dim)]">No stories captured that day.</li>}
        </ul>
      </div>
    </section>
  );
}

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'from', 'that', 'this', 'new', 'ai', 'are', 'has', 'have', 'will',
  'its', 'into', 'about', 'after', 'over', 'their', 'they', 'what', 'how', 'you', 'your', 'get', 'can', 'but',
  'not', 'one', 'two', 'all', 'out', 'via', 'llm', 'using', 'why', 'more', 'than', 'been', 'was', 'were', 'them',
  'him', 'her', 'august', 'could', 'would', 'should', 'first', 'last', 'most', 'which', 'when', 'where',
]);

function topicsFor(items: NewsItem[]): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items.slice(0, 120)) {
    const title = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const words = title.split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
    for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }));
}