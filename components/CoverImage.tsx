'use client';

import { useMemo, useState } from 'react';
import { NewsItem, CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { typeIcon } from '@/lib/format';
import { companyFor, publisherFavicon, coverName } from '@/lib/company-image';

interface CoverImageProps {
  item: NewsItem;
  variant?: 'hero' | 'thumb';
  className?: string;
  showCaption?: boolean;
}

/** Placeholder GitHub avatar IDs used as junk fallbacks — never real photos. */
const AVATAR_PLACEHOLDER_RE = /avatars\.githubusercontent\.com\/u\/(1000|1234|2000|3000|4000)([/?#]|$)/i;

/** Drop unusable or broken image URLs (tiny avatars, doubled origins, junk placeholders). */
export function usableImageUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let url = raw.trim();
  const doubled = url.match(/https?:\/\/[^\s]+?(https?:\/\/\S+)/i);
  if (doubled) url = doubled[1];
  url = url.replace(/&amp;/g, '&').replace(/&#038;/g, '&');
  if (!/^https?:\/\//i.test(url)) return undefined;
  if (AVATAR_PLACEHOLDER_RE.test(url)) return undefined;
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
 * Every story always has a picture, and it never shows article text.
 * Layer stack (top to bottom):
 *   1. Real article photo (og:image etc.) — object-cover.
 *   2. Company logo from the story (Wikimedia Commons asset), else the
 *      publisher's favicon — object-contain on the gradient.
 *   3. Monogram: single company/publisher initial on a deterministic
 *      gradient — always rendered, so there is never a blank frame.
 */
export default function CoverImage({ item, variant = 'thumb', className = '', showCaption = false }: CoverImageProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);

  const realSrc = usableImageUrl(item.image_url);
  const showPhoto = !!realSrc && !photoFailed;

  const company = useMemo(() => companyFor(item), [item]);
  const favicon = useMemo(() => publisherFavicon(item.url), [item]);
  const name = coverName(item, company);
  const monogram = (name.trim().charAt(0) || 'A').toUpperCase();
  const art = useMemo(() => posterArt(item), [item]);

  const logoSrc = company && !logoFailed ? company.logo : null;
  const faviconSrc = !logoSrc && favicon && !faviconFailed ? favicon : null;

  return (
    <div className={`${className} relative overflow-hidden`} style={{ background: art.bg }}>
      {/* Monogram base — always rendered, never blank, never article text */}
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <span
          className={`font-semibold text-white/70 select-none ${variant === 'hero' ? 'text-7xl' : 'text-5xl'}`}
        >
          {monogram}
        </span>
        <span className="absolute left-3 bottom-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
          {company ? company.name : CATEGORY_LABEL[item.category] || item.category}
        </span>
      </div>

      {/* Company logo or publisher favicon */}
      {logoSrc && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain p-8 z-10"
          referrerPolicy="no-referrer"
          onError={() => setLogoFailed(true)}
        />
      )}
      {faviconSrc && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={faviconSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain p-10 z-10"
          referrerPolicy="no-referrer"
          onError={() => setFaviconFailed(true)}
        />
      )}

      {/* Real photo on top — loads if available */}
      {showPhoto && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={realSrc!}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-20"
          referrerPolicy="no-referrer"
          onError={() => setPhotoFailed(true)}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5 pointer-events-none z-30" />

      {showCaption && (
        <div className="absolute left-3 bottom-2.5 flex items-center gap-1.5 z-40">
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

      {!showPhoto && !logoSrc && !faviconSrc && variant === 'hero' && (
        <span className="absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 z-40">
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
