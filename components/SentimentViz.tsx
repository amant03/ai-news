'use client';

const POS = '#16a34a';
const NEG = '#dc2626';
const NEU = '#94a3b8';

export function SentimentPie({ positive, negative, neutral, size = 92 }: {
  positive: number; negative: number; neutral: number; size?: number;
}) {
  const total = Math.max(1, positive + negative + neutral);
  const r = 34;
  const c = 2 * Math.PI * r;
  const segs = [
    { v: positive, color: POS },
    { v: negative, color: NEG },
    { v: neutral, color: NEU },
  ];
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 84 84" role="img" aria-label={`Sentiment: ${positive} positive, ${negative} negative, ${neutral} neutral`}>
      <circle cx="42" cy="42" r={r} fill="none" strokeWidth="12" stroke="var(--color-line)" opacity="0.35" />
      {segs.map((s, i) => {
        const frac = s.v / total;
        const el = (
          <circle
            key={i}
            cx="42" cy="42" r={r} fill="none"
            stroke={s.color} strokeWidth="12"
            strokeDasharray={`${Math.max(0, frac * c - (frac > 0 && frac < 1 ? 1.5 : 0))} ${c}`}
            strokeDashoffset={-offset * c}
            strokeLinecap="butt"
            transform="rotate(-90 42 42)"
            opacity={s.v === 0 ? 0 : 0.9}
          />
        );
        offset += frac;
        return el;
      })}
      <text x="42" y="40" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--fore)">{total}</text>
      <text x="42" y="52" textAnchor="middle" fontSize="8" fill="var(--dim)">texts</text>
    </svg>
  );
}

/** Oscillator gauge: needle swings negative (left/red) ↔ positive (right/green). */
export function SentimentGauge({ score, width = 220 }: { score: number; width?: number }) {
  const clamped = Math.max(-1, Math.min(1, score));
  const angle = (clamped + 1) * 90; // 0..180
  const cx = 110, cy = 100, r = 80;
  const rad = ((180 - angle) * Math.PI) / 180;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);
  const arc = (a0: number, a1: number) => {
    const p0 = [cx + r * Math.cos((a0 * Math.PI) / 180), cy - r * Math.sin((a0 * Math.PI) / 180)];
    const p1 = [cx + r * Math.cos((a1 * Math.PI) / 180), cy - r * Math.sin((a1 * Math.PI) / 180)];
    return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`;
  };
  const label = clamped > 0.15 ? 'Positive' : clamped < -0.15 ? 'Negative' : 'Neutral';
  const color = clamped > 0.15 ? POS : clamped < -0.15 ? NEG : NEU;
  return (
    <div style={{ width }} role="img" aria-label={`Sentiment gauge: ${label} (${clamped.toFixed(2)})`}>
      <svg viewBox="0 0 220 112" className="w-full">
        <defs>
          <linearGradient id="sent-gauge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={NEG} />
            <stop offset="50%" stopColor={NEU} />
            <stop offset="100%" stopColor={POS} />
          </linearGradient>
        </defs>
        <path d={arc(0, 180)} fill="none" stroke="url(#sent-gauge)" strokeWidth="12" strokeLinecap="round" opacity="0.85" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--fore)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="7" fill="var(--fore)" />
        <circle cx={cx} cy={cy} r="3" fill="var(--background)" />
        <text x="14" y="110" fontSize="9" fill={NEG} fontWeight="600">NEG</text>
        <text x="196" y="110" fontSize="9" fill={POS} fontWeight="600">POS</text>
      </svg>
      <div className="text-center -mt-1">
        <span className="text-[12px] font-semibold" style={{ color }}>{label}</span>
        <span className="text-[11px] text-[var(--dim)] tabular-nums"> · {clamped >= 0 ? '+' : ''}{clamped.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function SentimentLegend({ positive, negative, neutral }: { positive: number; negative: number; neutral: number }) {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-[var(--mut)]">
      <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: POS }} />{positive} positive</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: NEG }} />{negative} negative</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: NEU }} />{neutral} neutral</span>
    </div>
  );
}
