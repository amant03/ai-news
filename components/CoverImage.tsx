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

/**
 * Every story always has a picture. A vivid illustrated poster sits underneath;
 * a real photo covers it when the article has one. If the photo fails, the
 * illustration stays — never a blank block.
 */
export default function CoverImage({ item, variant = 'thumb', className = '', showCaption = false }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const src = usableImageUrl(item.image_url);
  const showPhoto = !!src && !failed;
  const art = useMemo(() => posterArt(item), [item]);

  return (
    <div className={`${className} relative overflow-hidden`} style={{ background: art.bg }}>
      <PosterArt art={art} title={item.title} category={item.category} />

      {showPhoto && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 pointer-events-none" />

      {showCaption && (
        <div className="absolute left-3 bottom-2.5 flex items-center gap-1.5">
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
        <span className="absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
          {CATEGORY_LABEL[item.category] || item.category}
        </span>
      )}
    </div>
  );
}

interface PosterArtSpec {
  bg: string;
  color: string;
  ink: string;
  seed: number;
  motif: Category;
}

function posterArt(item: NewsItem): PosterArtSpec {
  const color = CATEGORY_COLOR[item.category] || '#38bdf8';
  const seed = hash(`${item.category}-${item.source}-${item.title}`);
  const palettes = [
    ['#12324a', '#0b6b7a', '#1aa6b8'],
    ['#2a1548', '#6b2d8a', '#c45cd6'],
    ['#14321f', '#1f7a4a', '#3dd68c'],
    ['#3a2410', '#b45309', '#fbbf24'],
    ['#3a1020', '#be185d', '#fb7185'],
    ['#0f2744', '#1d4ed8', '#60a5fa'],
  ];
  const [c1, c2, c3] = palettes[seed % palettes.length];
  return {
    bg: `linear-gradient(152deg, ${c1} 0%, ${c2} 48%, ${c3} 100%)`,
    color,
    ink: c3,
    seed,
    motif: item.category,
  };
}

function PosterArt({ art, title, category }: { art: PosterArtSpec; title: string; category: Category }) {
  const initials = (title || 'AI').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AI';
  const id = `p${art.seed}`;
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="80%" cy="0%" r="70%">
          <stop offset="0%" stopColor={art.color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={art.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${id}-g)`} />
      <Motif kind={category} seed={art.seed} color={art.color} />
      <text x="28" y="148" fill="white" fillOpacity="0.16" fontSize="72" fontWeight="700" fontFamily="var(--font-unbounded), sans-serif">
        {initials}
      </text>
      <circle cx="332" cy="48" r="36" fill={art.color} fillOpacity="0.22" />
      <circle cx="332" cy="48" r="18" fill={art.color} fillOpacity="0.55" />
    </svg>
  );
}

function Motif({ kind, seed, color }: { kind: Category; seed: number; color: string }) {
  const n = 5 + (seed % 4);
  if (kind === 'research') {
    return (
      <g fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="3">
        <rect x="240" y="70" width="110" height="140" rx="6" transform="rotate(-8 295 140)" />
        <rect x="255" y="80" width="110" height="140" rx="6" transform="rotate(6 310 150)" fill={color} fillOpacity="0.12" />
        <line x1="270" y1="110" x2="340" y2="110" />
        <line x1="270" y1="128" x2="330" y2="128" />
        <line x1="270" y1="146" x2="320" y2="146" />
      </g>
    );
  }
  if (kind === 'product') {
    return (
      <g fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.5" strokeWidth="3">
        <rect x="250" y="70" width="120" height="90" rx="16" />
        <circle cx="310" cy="185" r="22" />
        <rect x="270" y="88" width="80" height="10" rx="5" fillOpacity="0.45" />
      </g>
    );
  }
  if (kind === 'safety') {
    return (
      <g fill={color} fillOpacity="0.18" stroke={color} strokeOpacity="0.55" strokeWidth="3">
        <path d="M310 55 l50 18 v40 c0 38 -22 62 -50 78 c-28 -16 -50 -40 -50 -78 v-40 z" />
        <path d="M310 95 v40" fill="none" />
        <circle cx="310" cy="88" r="6" />
      </g>
    );
  }
  if (kind === 'policy') {
    return (
      <g fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.5" strokeWidth="3">
        <rect x="250" y="150" width="22" height="55" />
        <rect x="284" y="120" width="22" height="85" />
        <rect x="318" y="95" width="22" height="110" />
        <rect x="352" y="70" width="22" height="135" />
      </g>
    );
  }
  // model / other — node constellation
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (seed % 7) * 0.2;
    return { x: 300 + Math.cos(a) * 70, y: 120 + Math.sin(a) * 48 };
  });
  return (
    <g>
      {pts.map((p, i) => {
        const q = pts[(i + 2) % pts.length];
        return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={color} strokeOpacity="0.35" strokeWidth="2" />;
      })}
      {pts.map((p, i) => (
        <circle key={`c${i}`} cx={p.x} cy={p.y} r={6 + (i % 3) * 3} fill={color} fillOpacity="0.55" />
      ))}
    </g>
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
