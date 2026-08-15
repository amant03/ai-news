'use client';

import { useMemo, useState } from 'react';
import { NewsItem, Category, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
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

function seedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

/**
 * Generate a deterministic inline SVG data-URI card background.
 * No external network requests — always renders instantly.
 * Each story gets a unique gradient + category motif.
 */
function cardBgDataUri(item: NewsItem): string {
  const color = CATEGORY_COLOR[item.category] || '#38bdf8';
  const h = seedHash(`${item.category}-${item.source}-${item.title}`);
  const palettes = [
    ['#12324a', '#0b6b7a', '#1aa6b8'],
    ['#2a1548', '#6b2d8a', '#c45cd6'],
    ['#14321f', '#1f7a4a', '#3dd68c'],
    ['#3a2410', '#b45309', '#fbbf24'],
    ['#3a1020', '#be185d', '#fb7185'],
    ['#0f2744', '#1d4ed8', '#60a5fa'],
    ['#1a1a2e', '#16213e', '#0f3460'],
    ['#2d1b69', '#5b21b6', '#8b5cf6'],
  ];
  const [c1, c2, c3] = palettes[h % palettes.length];
  const initials = (item.title || 'AI').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI';
  const words = item.title.split(/\s+/).filter(Boolean).slice(0, 4);
  const line1 = words.slice(0, 2).join(' ');
  const line2 = words.slice(2, 4).join(' ');
  const n = 4 + (h % 4);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (h % 7) * 0.3;
    return { x: 320 + Math.cos(a) * 80, y: 100 + Math.sin(a) * 50 };
  });
  const circles = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="${4 + (p.x % 4)}" fill="${color}" fill-opacity="0.4"/>`).join('');
  const lines = pts.map((p, i) => { const q = pts[(i + 2) % pts.length]; return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${color}" stroke-opacity="0.25" stroke-width="1.5"/>`; }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="50%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c3}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="200" fill="url(#g)"/>
    <g opacity="0.15">${circles}${lines}</g>
    <text x="22" y="50" fill="white" fill-opacity="0.9" font-size="18" font-weight="700" font-family="sans-serif">${line1}</text>
    ${line2 ? `<text x="22" y="72" fill="white" fill-opacity="0.9" font-size="18" font-weight="700" font-family="sans-serif">${line2}</text>` : ''}
    <text x="22" y="180" fill="white" fill-opacity="0.5" font-size="10" font-weight="500" font-family="sans-serif" letter-spacing="2">${CATEGORY_LABEL[item.category] || item.category}</text>
    <circle cx="350" cy="45" r="28" fill="${color}" fill-opacity="0.25"/>
    <circle cx="350" cy="45" r="14" fill="${color}" fill-opacity="0.5"/>
    <text x="22" y="32" fill="white" fill-opacity="0.3" font-size="36" font-weight="700" font-family="sans-serif">${initials}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Every story always has a picture. A vivid gradient card sits as the
 * guaranteed base layer. A real photo covers it when available.
 */
export default function CoverImage({ item, variant = 'thumb', className = '', showCaption = false }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const realSrc = usableImageUrl(item.image_url);
  const showPhoto = !!realSrc && !failed;
  const art = useMemo(() => posterArt(item), [item]);
  const bgUri = useMemo(() => cardBgDataUri(item), [item]);

  return (
    <div className={`${className} relative overflow-hidden`} style={{ background: art.bg }}>
      {/* Guaranteed inline gradient card — always renders */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bgUri} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />

      {/* Real photo on top — loads if available */}
      {showPhoto && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={realSrc!}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5 pointer-events-none z-20" />

      {showCaption && (
        <div className="absolute left-3 bottom-2.5 flex items-center gap-1.5 z-30">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold"
            style={{ backgroundColor: `${art.color}33`, color: art.color }}
          >
            {typeIcon(item.source_type)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
            {(item.source_label || item.source).slice(0, 22)}
          </span>
        </div>
      )}

      {!showPhoto && variant === 'hero' && (
        <span className="absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 z-30">
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
      )}
    </div>
  );
}

interface PosterArtSpec {
  bg: string;
  color: string;
}

function posterArt(item: NewsItem): PosterArtSpec {
  const color = CATEGORY_COLOR[item.category] || '#38bdf8';
  const h = seedHash(`${item.category}-${item.source}-${item.title}`);
  const palettes = [
    ['#12324a', '#0b6b7a', '#1aa6b8'],
    ['#2a1548', '#6b2d8a', '#c45cd6'],
    ['#14321f', '#1f7a4a', '#3dd68c'],
    ['#3a2410', '#b45309', '#fbbf24'],
    ['#3a1020', '#be185d', '#fb7185'],
    ['#0f2744', '#1d4ed8', '#60a5fa'],
  ];
  const [c1, c2, c3] = palettes[h % palettes.length];
  return {
    bg: `linear-gradient(152deg, ${c1} 0%, ${c2} 48%, ${c3} 100%)`,
    color,
  };
}
