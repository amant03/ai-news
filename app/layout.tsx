import type { Metadata } from 'next';
import { Unbounded, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from '@/lib/site';
import { ThemeProvider } from '@/lib/theme';

const display = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const sans = Instrument_Sans({
  variable: '--font-instrument',
  subsets: ['latin'],
});

const mono = IBM_Plex_Mono({
  variable: '--font-plex',
  subsets: ['latin'],
  weight: ['400', '500'],
});

const url = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: {
    default: `${SITE_NAME} — Live AI News & Model Leaderboard`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'AI news',
    'AI models',
    'LLM leaderboard',
    'model comparison',
    'OpenAI',
    'Anthropic',
    'Claude',
    'GPT',
    'Gemini',
    'artificial intelligence',
    'cost vs accuracy',
    'open weights',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: '/',
  },
};

// Set the theme before first paint to avoid a flash of the wrong color scheme.
const themeScript = `
(function () {
  try {
    var s = localStorage.getItem('ai-pulse-theme');
    var t = s === 'light' ? 'light' : (s === 'dark' ? 'dark' : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = t;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
