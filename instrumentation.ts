export async function register() {
  // Production observability is intentionally dependency-free (no paid APM):
  // server errors surface via Vercel runtime logs + app/global-error.tsx.
}

export function onRequestError(err: unknown) {
  console.error('[request-error]', err);
}
