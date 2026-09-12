# AGENTS.md — AI Pulse

Next.js 16 / React 19 / TypeScript 5 / Tailwind v4 aggregator of AI news + model leaderboards.
Live: https://ai-news-one-sigma.vercel.app/

## Mandatory: route decisions through the installed skills

`.opencode/skills/` contains the full mattpocock/skills set (MIT). These are
loaded every session. **Every technical decision and multi-step task must go
through them — do not freelance the process:**

- Unsure which flow fits, or starting any non-trivial change → `ask-matt`
  (router), then `grill-me` / `grill-with-docs` to align before building.
- Fixing a bug or regression → `diagnosing-bugs` (red reproduction first,
  minimise, hypothesise, instrument, fix, regression-test).
- Building a feature → `tdd` (red-green-refactor, one vertical slice at a time).
- Before any commit → `code-review` (Standards axis + Spec axis).
- Merge/rebase conflicts → `resolving-merge-conflicts` (hunk by hunk by intent,
  never `--abort` the user's operation).
- External facts (docs, pricing, APIs, benchmarks) → `research` (primary
  sources, cited Markdown). Never guess URLs, versions, or API shapes.
- Big/multi-session work → `to-spec` + `to-tickets` first, then `implement`.
- Design changes → `codebase-design` (deep modules, small interfaces).
- If my reply doesn't land → user may fire `wait-what`; re-pitch plainly.

User-invoked flows (`/grill-me`, `/implement`, `/triage`, …) orchestrate; they
never call each other. Model-invoked discipline (`tdd`, `code-review`,
`diagnosing-bugs`, …) applies automatically when the task fits — say which
skill governed each decision in the final summary.

## Hard project constraints (non-negotiable)

- **Free / open-source only. Zero paid services, zero API costs.** No Sentry,
  no paid LLM APIs, no key-gated services in code paths. New deps must be free
  (Ollama over paid inference, Resend free-tier only behind env gates that
  default off).
- No fabricated data: skeletons while loading, honest empty states, never
  placeholder text or guessed numbers/URLs.
- Autonomous pipelines must degrade gracefully (a failed source never blocks a
  run; see `lib/agent.ts` timeout pattern and `agent.yml` always-commit).

## Verification (run before declaring done)

- `npm run typecheck`, `npx vitest run`, `npm run build`
- `npx playwright test` for UI/route changes
- `git status` clean intent, concise commits, push to `main` (Vercel deploys it)

## Key docs

- `ARCHITECTURE.md` — the five load-bearing decisions and tradeoffs
- `app/blog/building-ai-pulse/page.tsx` — public build log
- `.opencode/skills/` — skill index (37 skills: engineering, productivity, misc, in-progress)

## Agent skills

### Issue tracker

GitHub Issues on `amant03/ai-news` via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Defaults: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
`wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. `CONTEXT.md` + `docs/adr/` don't exist yet — proceed silently;
`/domain-modeling` creates them lazily. See `docs/agents/domain.md`.
