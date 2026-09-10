'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-5">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--dim)] mb-2">AI Pulse</p>
        <h1 className="font-display text-2xl font-medium tracking-tight mb-3">This page hit a snag</h1>
        <p className="text-sm text-[var(--mut)] mb-6">
          {error.message || 'Something went wrong while rendering. Try again.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-full bg-[var(--fore)] text-[var(--background)] text-sm font-medium"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
