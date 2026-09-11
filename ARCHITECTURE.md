# AI Pulse — Architecture Notes

Written for a technical reader. Not a feature list: the five decisions and
tradeoffs that shape this codebase, and why each was made.

## 1. JSON file-store + Postgres dual-write (`lib/db.ts`, `lib/pg.ts`, `lib/storage.ts`)

Every pipeline write goes to a local JSON snapshot **and**, when `DATABASE_URL`
is set, to Postgres. Every read checks `hasPg()` and falls back to JSON.

Why both instead of just Postgres:

- **Zero-config local dev and CI.** `git clone && npm run dev` works with no
  database. E2E tests run against the committed snapshot.
- **Committable snapshot Vercel can serve without a DB connection.**
  The 4-hour GitHub Actions agent commits `data/news.json` / `data/status.json`;
  production reads them via `raw.githubusercontent.com` (`lib/github-data.ts`)
  or from the serverless bundle (`outputFileTracingIncludes`). The site stays
  fresh on Hobby with no always-on database.
- **Graceful degradation.** Features that need history (`/changelog` run
  timeline, chat analytics) render a live-status fallback when PG is absent —
  no empty pages, no placeholder text, never a crash.

Cost: JSON has no indexes, so hot paths cap their scans (`getNewsItems(400, 0)`,
top-K retrieval). Postgres remains the richest path when configured.

## 2. `models.json` (100 MB) vs `models-slim.json` (60 KB)

The full model database carries benchmark blobs, descriptions and license texts
that Vercel serverless functions cannot bundle (`outputFileTracingExcludes`
drops `data/models.json` entirely). The 4-hour model workflow publishes a
leaned `models-slim.json` (~60 KB, ~99% smaller) with exactly the fields the UI
needs (`lib/model-registry.ts` `toSlim()`).

`lib/models-catalog.ts` loads slim-first with a three-tier fallback
(committed GitHub raw → local slim → leaned full DB), so leaderboards render
identically in every environment. The `/api/models` route leans each record
again before responding — the old endpoint once shipped ~54 MB.

## 3. X/Twitter degrade chain (`lib/twitter.ts`)

X has no free API, so the agent walks a degrade chain per account, cheapest
first: **Nitter mirrors → Jina reader → X syndication endpoint → opt-in
Puppeteer** (`X_PUPPETEER=true`; a single launch can eat 30 s+, so it is never
default). Circuit-breakers skip the rest once Nitter fails 5× consecutively,
and Jina's ~20 rpm free-tier limit is respected with spacing plus one retry on
403. Flagship model-release language from X gets a ranking boost (`lib/rank.ts`)
so "Grok 4.6 is now out" surfaces over generic chatter — with a freshness
half-life so it decays after 48 h.

## 4. Deterministic-first chat, opt-in free LLM (`lib/chat-answers.ts`, `lib/chat-retrieval.ts`, `app/api/chat/ai/route.ts`)

The default advisor is a zero-cost deterministic engine: TF-IDF retrieval over
the news + model catalogs plus intent routing. It is instant, free, works
offline, and every answer is auditable against the dataset.

The "Ask AI" toggle adds a second, explicitly labeled mode that **reuses the
same `retrieve()` top-K results as grounded context** (top 8 news + top 10
models, summaries truncated to ~200 chars) and reasons over them with a
self-hosted Ollama model — no paid API, no API key, no per-query cost. The
system prompt instructs the model to answer only from context and to say so
when the context lacks the answer. Guardrails:

- Env gate (`ENABLE_LLM_CHAT=true`) — missing flag returns the deterministic
  answer with a notice; the client flips the toggle back off.
- In-memory 20 req/hour/IP limit (429 degrades to deterministic, unlimited).
- Any backend failure degrades to the deterministic engine. The app never
  breaks because of AI mode.
- Best-effort `chat_events` logging (PG when available) so the
  deterministic-vs-AI usage split is measurable.

## 5. Vercel Hobby cron workaround (`app/api/cron/route.ts`, `.github/workflows/agent.yml`)

Hobby caps functions at 60 s and cron at daily — far too small for a scrape
loop. So `/api/cron` never runs the agent inline: it checks data freshness and
**dispatches the GitHub Actions workflow** (free minutes), which does the real
4-hour fetching and commits the results. Code-quality CI (`.github/workflows/ci.yml`:
typecheck → vitest → build → Playwright) is a separate workflow from the data
jobs — pipeline and product gates stay independent.

## Appendix — resume bullets (draft, all demonstrable)

- Built and operate an autonomous AI-news platform ingesting 9 source types
  (RSS, Reddit, HN, arXiv, GitHub, X, YouTube, Google News, web) on a 4-hour
  cycle, with dedup, ranking and sentiment pipelines over 2,500+ articles and
  600+ models.
- Designed a hybrid chat advisor: zero-cost deterministic retrieval engine by
  default, opt-in rate-limited grounded LLM mode (free self-hosted backend)
  with graceful fallback — balancing cost, latency and factual accuracy.
- Cut serverless deploy payload ~99% (100 MB → 60 KB) via a dual full/slim
  model-catalog strategy with tiered loading and lean API responses.
- Instrumented CI (typecheck/unit/build/E2E on every push), Sentry error
  monitoring, Vercel Analytics + Speed Insights, and axe-clean (0
  critical/serious) accessibility on core routes.
