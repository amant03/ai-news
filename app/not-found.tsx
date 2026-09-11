import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="max-w-[1400px] mx-auto px-5 py-24 text-center">
      <p className="section-label">404</p>
      <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
        This page drifted off the frontier.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--mut)] max-w-[50ch] mx-auto">
        The link may be outdated, or the page moved during a refresh. Head back to the
        newswire or explore the model leaderboard instead.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-[var(--radius-md)] bg-[var(--gray-900)] px-4 text-sm font-medium text-white"
        >
          Back to news
        </Link>
        <Link
          href="/models"
          className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--color-line)] px-4 text-sm font-medium"
        >
          View models
        </Link>
        <Link
          href="/chat"
          className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--color-line)] px-4 text-sm font-medium"
        >
          Ask chat
        </Link>
      </div>
    </main>
  );
}
