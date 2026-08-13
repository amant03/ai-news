import type { Metadata } from "next";
import { Unbounded, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const sans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AI Pulse — Live AI News",
  description: "Autonomously updated AI news from OpenAI, Anthropic, Google DeepMind, Hacker News, Reddit, arXiv, GitHub and 30+ free sources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#05070e]">{children}</body>
    </html>
  );
}
