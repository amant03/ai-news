'use client';

import { useMemo, useState } from 'react';
import { NewsItem, Category, CATEGORY_COLOR } from '@/lib/types';
import { typeIcon } from '@/lib/format';

interface CoverImageProps {
  item: NewsItem;
  variant?: 'hero' | 'thumb';
  className?: string;
  showCaption?: boolean;
}

/** Drop unusable or broken image URLs (tiny avatars, doubled origins). */
export function usableImageUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim();
  const doubled = url.match(/https?:\/\/[^\s]+?(https?:\/\/\S+)/i);
  if (doubled) url = doubled[1];
  url = url.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
  if (!/^https?:\/\//i.test(url)) return undefined;
  if (/pbs\.twimg\.com\/profile_images\//i.test(url) && /_normal\./i.test(url)) return undefined;
  if (/avatars\.githubusercontent\.com/i.test(url)) {
    return url.includes('?') ? `${url}&s=400` : `${url}?s=400`;
  }
  return url;
}

/**
 * Always-rendered visual for a story. Uses the article's real image when
 * available; otherwise generates a deterministic, category-colored cover.
 */
export default function CoverImage({ item, variant = 'thumb', className = '', showCaption = true }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const color = CATEGORY_COLOR[item.category] || '#94a3b8';
  const src = usableImageUrl(item.image_url);
  const showImage = !!src && !failed;

  const style = useMemo(() => generatedCover(item.category, item.source || '', item.title || '', color), [item.category, item.source, item.title, color]);

  if (showImage) {
    return (
      <div className={`${className} relative overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070e]/80 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden`} style={{ background: style.background }}>
      <div className="absolute inset-0 opacity-[0.22]" style={{ backgroundImage: style.pattern, backgroundSize: style.patternSize }} />
      <div
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-2xl opacity-50"
        style={{ backgroundColor: `${color}66` }}
      />
      <div
        className="absolute -bottom-8 -left-6 w-32 h-32 rounded-full blur-2xl opacity-30"
        style={{ backgroundColor: `${color}55` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070e] via-[#05070e]/20 to-transparent" />

      <span
        className="absolute right-3 top-2 font-display font-bold text-white/10 leading-none select-none"
        style={{ fontSize: variant === 'hero' ? '4.5rem' : '2.8rem' }}
        aria-hidden
      >
        {(item.title || item.source || 'A').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI'}
      </span>

      {showCaption && variant === 'hero' && (
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
      )}
      {showCaption && variant !== 'hero' && (
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

function generatedCover(category: Category, source: string, title: string, color: string): {
  background: string;
  pattern: string;
  patternSize: string;
} {
  const h = hash(`${category}-${source}-${title}`);
  const palettes: Array<[string, string, string]> = [
    ['#071018', '#0e2a3a', '#123044'],
    ['#100814', '#241038', '#3a1450'],
    ['#08140f', '#0d2a22', '#164838'],
    ['#140c08', '#2a1810', '#4a2414'],
    ['#0a0c18', '#141e3a', '#1c2a52'],
  ];
  const [c1, c2, c3] = palettes[h % palettes.length];
  const patterns = [
    'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)',
    'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
    'repeating-linear-gradient(-18deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 14px)',
  ];
  const sizes = ['22px 22px', '28px 28px', '18px 18px'];
  const pi = h % patterns.length;

  return {
    background: `linear-gradient(148deg, ${c1} 0%, ${c2} 48%, ${c3} 100%), radial-gradient(90% 80% at 85% 0%, ${color}40, transparent 58%)`,
    pattern: patterns[pi],
    patternSize: sizes[pi],
  };
}
