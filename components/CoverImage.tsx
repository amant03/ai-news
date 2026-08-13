'use client';

import { useMemo, useState } from 'react';
import { NewsItem, Category, CATEGORY_COLOR } from '@/lib/types';
import { typeIcon } from '@/lib/format';

interface CoverImageProps {
  item: NewsItem;
  variant?: 'hero' | 'thumb';
  className?: string;
}

/**
 * Always-rendered visual for a story. Uses the article's real image when
 * available; otherwise generates a deterministic, category-colored gradient
 * with a subtle pattern + source glyph so every card feels vivid.
 */
export default function CoverImage({ item, variant = 'thumb', className = '' }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  const showImage = !!item.image_url && !failed;

  const style = useMemo(() => {
    return generatedCover(item.category, item.source || '', color);
  }, [item.category, item.source, color]);

  if (showImage) {
    return (
      <div className={`${className} relative overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c]/80 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`} style={{ background: style.background }}>
      {/* pattern */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{ backgroundImage: style.pattern, backgroundSize: '26px 26px' }}
      />
      {/* radial glow */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl opacity-40"
        style={{ backgroundColor: `${color}55` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-[#0a0f1c]/10 to-transparent" />

      {/* glyph + label */}
      {variant === 'hero' ? (
        <div className="absolute left-4 bottom-3 flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold"
            style={{ backgroundColor: `${color}33`, color }}
          >
            {typeIcon(item.source_type)}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/85">
            {(item.source_label || item.source).slice(0, 26)}
          </span>
        </div>
      ) : (
        <div className="absolute left-3 bottom-2.5 flex items-center gap-1.5">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold"
            style={{ backgroundColor: `${color}33`, color }}
          >
            {typeIcon(item.source_type)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
            {(item.source_label || item.source).slice(0, 20)}
          </span>
        </div>
      )}
    </div>
  );
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function generatedCover(category: Category, source: string, color: string): { background: string; pattern: string } {
  const h = hash(`${category}-${source}`);
  const palettes: Array<[string, string, string]> = [
    ['#0b1220', '#12203a', '#1a2a4a'],
    ['#0d1018', '#1a1430', '#2a1a4a'],
    ['#0a0f1a', '#10242e', '#1c3a46'],
    ['#0c0f1a', '#2a1c2e', '#3a1c3e'],
  ];
  const [c1, c2, c3] = palettes[h % palettes.length];

  const dot = 'radial-gradient(circle, currentColor 1px, transparent 1px)';
  const grid = 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)';
  const pattern = h % 2 === 0 ? dot : grid;

  // Tint the gradient with the category color so cards are visually distinct.
  return {
    background: `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%), radial-gradient(80% 120% at 80% 0%, ${color}30, transparent 55%)`,
    pattern,
  };
}