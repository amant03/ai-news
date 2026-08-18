'use client';

import Header from '@/components/Header';

const CATEGORIES = [
  {
    title: 'Image Generation',
    items: [
      { name: 'Text to Image Leaderboard', href: '/image/leaderboard/text-to-image', desc: 'Rankings for AI image generation models by Elo from blind user comparisons', status: 'live' },
      { name: 'Image Editing Leaderboard', href: '/image/leaderboard/editing', desc: 'Rankings for AI image editing models', status: 'live' },
      { name: 'Image Arena', href: '#', desc: 'Vote on AI-generated images in blind comparisons', status: 'coming' },
    ],
  },
  {
    title: 'Speech',
    items: [
      { name: 'Speech to Text', href: '/speech-to-text', desc: 'Rankings for AI speech recognition models', status: 'live' },
      { name: 'Text to Speech', href: '/text-to-speech', desc: 'Rankings for AI text-to-speech models', status: 'live' },
      { name: 'Speech to Speech', href: '#', desc: 'Rankings for AI voice conversion models', status: 'coming' },
    ],
  },
  {
    title: 'Video',
    items: [
      { name: 'Text to Video', href: '/video/leaderboard/text-to-video', desc: 'Rankings for AI video generation models', status: 'live' },
      { name: 'Image to Video', href: '/video/leaderboard/image-to-video', desc: 'Rankings for AI image-to-video models', status: 'live' },
      { name: 'Video Editing', href: '/video/leaderboard/video-editing', desc: 'Rankings for AI video editing models', status: 'live' },
    ],
  },
  {
    title: 'Music',
    items: [
      { name: 'Music Generation', href: '#', desc: 'Rankings for AI music generation models', status: 'coming' },
    ],
  },
];

export default function SpeechImageVideoPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-[1400px] mx-auto px-5 pt-8 pb-16">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight">Speech, Image &amp; Video</h1>
          <p className="text-sm text-neutral-500 mt-2">
            Leaderboards, arenas, and benchmarks for multimodal AI models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATEGORIES.map(cat => (
            <section key={cat.title} className="border border-[var(--color-line)] rounded-lg p-5">
              <h2 className="text-lg font-semibold tracking-tight mb-4">{cat.title}</h2>
              <div className="space-y-3">
                {cat.items.map(item => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-start justify-between gap-3 p-3 rounded-lg transition-colors block ${
                      item.status === 'live'
                        ? 'hover:bg-neutral-50 border border-[var(--color-line)]'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[14px] flex items-center gap-2">
                        {item.name}
                        {item.status === 'live' && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-green-50 text-green-600 border border-green-600/20">
                            Live
                          </span>
                        )}
                        {item.status === 'coming' && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-neutral-100 text-neutral-400 border border-neutral-200">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-neutral-500 mt-1">{item.desc}</div>
                    </div>
                    {item.status === 'live' && (
                      <svg className="w-4 h-4 text-neutral-400 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}