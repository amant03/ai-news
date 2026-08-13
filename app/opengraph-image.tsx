import { ImageResponse } from 'next/og';

export const alt = 'AI Pulse — Live AI news and model leaderboard';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(145deg, #05070e 0%, #0c1630 55%, #140e28 100%)',
          color: '#e6edf7',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56,221,245,0.45)',
              background: 'rgba(56,221,245,0.12)',
              color: '#67e8f9',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <div style={{ fontSize: 28, letterSpacing: 6, textTransform: 'uppercase', color: '#8a97ad' }}>
            Pulse
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>
            Live AI news &amp; the model leaderboard
          </div>
          <div style={{ fontSize: 26, color: '#8a97ad', maxWidth: 860 }}>
            Cost vs accuracy. Top models. Headlines from 40+ sources.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 20, color: '#67e8f9' }}>
          <span>OpenAI</span>
          <span>Anthropic</span>
          <span>Gemini</span>
          <span>Llama</span>
          <span>DeepSeek</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
