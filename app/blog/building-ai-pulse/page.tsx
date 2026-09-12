import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Building AI Pulse · ${SITE_NAME}`,
  description:
    'How an autonomous AI-news aggregator was rebuilt into a polished product: design tokens, hybrid chat, growth loops, CI, and accessibility — with zero paid services.',
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl font-semibold tracking-tight">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-relaxed text-[var(--mut)]">{children}</p>;
}

export default function BuildingAiPulse() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-[720px] px-5 pb-16 pt-8">
        <p className="section-label">Build log</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
          Building AI Pulse: from working aggregator to operated product
        </h1>
        <p className="mt-2 text-sm text-[var(--mut)]">
          The full engineering story — what changed, why, and what it costs to run (nothing).
        </p>

        <H>Start with the front door</H>
        <P>
          The highest-leverage work was unglamorous: one sticky header instead of two navs,
          skeletons instead of literal “— stories” placeholders, and a homepage that states
          what the product is within five seconds. A new hero band pulls live numbers from
          existing APIs, the persona lens moved from a buried widget into the hero, and Top
          Stories became a real card grid with model cross-links (“Mentions: GPT-5” → the
          model page). Design tokens (single indigo accent, 10-step gray, category dots)
          and a small shadcn-style primitive set keep every later page consistent.
        </P>

        <H>Make the data legible</H>
        <P>
          Leaderboards got one-sentence auto-generated takeaways (“X leads on raw
          intelligence, but Y delivers the best score-per-dollar”) computed deterministically
          from already-sorted data — the difference between a data page and a data story.
          Model pages link both directions (news → model and model → news) and gained a
          side-by-side compare route. Long tables got sticky headers, client-side search,
          and bounded scroll containers.
        </P>

        <H>Hybrid chat, zero budget</H>
        <P>
          The deterministic chat engine stayed the default: instant, free, auditable. An
          opt-in “Ask AI” mode reuses the same retrieval results as grounded context for a
          self-hosted model, rate-limited per IP, with graceful fallback to deterministic
          answers whenever the backend is missing or slow. Every AI answer carries a
          “grounded in live data” badge so users always know which engine replied.
        </P>

        <H>Growth loops and hygiene</H>
        <P>
          Vercel Analytics and Speed Insights went in first so later decisions have data. The
          newsletter gained a real send path (Resend free tier, dry-run by default), the ops
          history became a public changelog, and the homepage shows a “since last refresh”
          delta. Underneath: 42 Vitest unit tests over the ranking/dedup/sentiment pipeline,
          Playwright smoke + axe specs (0 critical/serious on core routes), CI separating
          code-quality gates from data jobs, dependency-free error handling (no paid
          APM — Vercel runtime logs plus a branded error page), and a
          sitemap covering every model URL plus FAQ JSON-LD.
        </P>

        <H>What I&apos;d tell an interviewer</H>
        <P>
          The interesting constraints were all platform-shaped: a 60-second serverless cap
          (so cron dispatches GitHub Actions instead of scraping inline), a 100 MB catalog
          that had to become 60 KB to deploy, and a zero-dollar budget that made “free and
          deterministic first” an architecture rather than a limitation. Details in{' '}
          <Link href="/changelog" className="font-medium text-[var(--accent-hover)] hover:underline">
            the changelog
          </Link>{' '}
          — the pipeline&apos;s receipts, updated every 4 hours.
        </P>

        <p className="mt-10 text-sm">
          <Link href="/" className="font-medium text-[var(--accent-hover)] hover:underline">
            ← Back to AI Pulse
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
