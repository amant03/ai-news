# AI Pulse (ai-news) — Complete Technical Documentation

> Repo: `/Users/manasi/Codes/ai_news/ai-news`
> Package: `ai-news@0.2.0` | Framework: **Next.js 16.2.10 + React 19.2.4 + TypeScript 5**
> Styling: **Tailwind CSS v4 + @tailwindcss/postcss** | Charts: **recharts 3.10.1 + d3 7.9.0** | DB: **JSON file-store + PostgreSQL (`pg` 8.23)**
> Scraping: **rss-parser 3.13 + puppeteer 25.5 + tsx 4.23**
> Site name: `AI Pulse` (`lib/site.ts`). Deployed on Vercel (`vercel.json`), automation via GitHub Actions.

---

## 1. What this project is — All Functionalities

### A. Live AI News Aggregator (core)
- Aggregates ~2500 articles (30-day window, `pruneStore(30d,2500)`) from 9 source families every 4h.
- Sources: **38 RSS feeds** (OpenAI, Anthropic, DeepMind, HF, TechCrunch, Verge…), **Google News RSS** (6 queries), **Reddit** (5 subs), **Hacker News Algolia** (10 queries), **arXiv** (cs.AI/LG/CL), **YouTube** (6 channels), **GitHub trending + org events**, **11 HTML web-scrapes**, **X/Twitter** (70+ accounts, opt-in headless).
- Frontend (`/`): live ticker, hero top-10 grid, dense newswire, category pills, source filter, domain bar (Business/Tech/Research), keyword cloud, trending sidebar, daily heat-calendar, source health panel, agent-run history, newsletter signup.
- APIs: `GET /api/news?limit&offset&source&category&sourceType&domain&sort=latest|engagement&since` + facets.

### B. LLM Leaderboard / Model Watch
- Routes: `/models` (full board), `/models/[slug]` (detail), `/models/[slug]/providers` (API provider benchmarks), `/leaderboards` (wrapper).
- Merges 5 live sources: **OpenRouter** (pricing/catalog), **Artificial Analysis** (Intelligence/Speed/Cost), **HuggingFace** (downloads/likes), **Ollama** (library), **LMArena** (Elo/votes) + news buzz.
- Sorts: `intelligence|value|popularity|newest|elo|name`. Lean `toLean()` responses, `models-slim.json` (~60KB, 358 models) for serverless vs full `models.json` (~100MB, 601 models) locally.
- Charts: `IntelligenceScatter` (Intel vs cost + Pareto), `IntelligenceTimeline` (frontier over time), `AAModelCharts` (tokens/cost/context/speed), custom SVG `ScatterChart/VerticalBarChart`.

### C. Multi-modal Leaderboards (Artificial Analysis mirrors)
- `/image/leaderboard/text-to-image`, `/image/leaderboard/editing`, `/video/leaderboard/text-to-video|image-to-video|video-editing`, `/speech-to-text` (WER), `/text-to-speech` (Elo), `/speech-image-video` (hub).
- Data: `data/t2i-models.json (147)`, `text-to-video (36)`, `image-editing (69)`, `image-to-video (35)`, `video-editing (9)`, `speech-to-text (54)`, `text-to-speech (35)` — scraped daily by `lib/t2i-scraper.ts` via `models.yml` workflow.
- Shared UI pattern: category filter + ranked filter + sortable table (`lib/sortable.ts` + `SortableTh`) + auto FAQ from `sorted[0]`.

### D. Trends / Analytics / Geo-viz
- `/trends` → `AITrends`: 5 sections (progress, efficiency, countries, open-source, architecture) using static `MODELS_TIMELINE` + `recharts Line/Bar/Scatter`.
- `AIRadar` + `MoodIndicator` → `GET /api/sentiment?days=90` (lexicon mood gauge + model sentiment scatter).
- `HierarchicalEdgeBundling` (only `d3` user): circular supply/demand network from `lib/ai-supply-demand-data.ts` (47 flows, 11 countries).
- `CodingAgents` (`/coding-agents`): ~60 agentic coding evals (DeepSWE, SWE-Atlas, Terminal-Bench v2) with cost/perf/time Pareto.

### E. Deterministic AI Chat Advisor (`/chat`)
- `Chat.tsx` + `POST /api/chat {question,history}` → `lib/chat-answers.ts answerQuestion()` + `lib/chat-retrieval.ts retrieve()`.
- No LLM call: TF-IDF-like retrieval over `news.json + models.json/slim + t2i/t2v/aa`, intent routing (greeting/video/image/news/coding/fastest/cheapest/open/compare/best/pricing/tell-me-about-X), 13 hardcoded `EXPLAINERS` (transformers, RAG, diffusion…), follow-up expansion, weak-match guard.
- Why deterministic: zero cost, instant, no API key needed.

### F. Knowledge Base Export
- `AI_NEWS_KNOWLEDGE_BASE.md` (500 items grouped by model/research/product/safety/policy/other + stats + source breakdown) via `lib/knowledge-base-generator.ts generateKnowledgeBase()`.
- Triggers: `npm run generate-kb`, `POST /api/knowledge-base/generate`, `agent --kb`, `POST /api/knowledge-base` (seed+run+generate).

### G. Automation / Ops
- GitHub Actions `agent.yml`: every 4h (`0 */4 * * *`) runs `npx tsx lib/run-agent.ts --skip-models --skip-ollama`, commits `news.json/status.json/models-slim.json` as `chore: refresh`.
- `models.yml`: daily `0 5 * * *` runs `t2i-scraper`, commits 7 media JSONs.
- Vercel Cron `0 9 * * * → GET /api/cron` (Hobby daily poke only; checks `committedStatus()` age >3h → `dispatchWorkflow(agent.yml)`; never runs agent inline due to 60s limit). `ignoreCommand` skips deploys on `chore: refresh` commits.
- Scripts: `scrape-models.mts`, `backfill-images.ts`, `test-twitter.mts`, `purge-twitter-noise.mts`, `dom-check*.mjs`, `shot.mjs`, `generate-aa-data.js`.

---

## 2. Tech Stack — Usage / Method / Why

| Technology | Usage / Method in this repo | Why used |
|---|---|---|
| **Next.js 16 App Router** (`app/layout.tsx`, `page.tsx`, `route.ts`) | SSR Server Components for SEO (`generateMetadata`, JSON-LD, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`), Client Components (`'use client'`) for interactive boards, Route Handlers for APIs, `force-dynamic`, `outputFileTracingIncludes` for `data/*.json` | Single framework for SEO news pages + APIs + serverless deploy; file-based routing matches many leaderboards |
| **React 19** | `useState/useEffect/useMemo/useRef/useCallback`, `ThemeContext`, polling (`setInterval 60s/120s/180s`), `fetch()` client data, markdown-lite renderer in `Chat.tsx` | Interactive filtering/sorting/polling without page reload |
| **TypeScript 5 + `tsc --noEmit` + `eslint-config-next`** | Strict types (`NewsItem`, `ModelRecord`, `SlimModel`), `lib/types.ts` contract | Catch schema drift across JSON/PG/APIs |
| **Tailwind CSS v4** (`app/globals.css`, CSS vars `--fore/--mut/--color-line`) | All styling, dark/light via `data-theme`, responsive grids, marquee `animate-ticker` | Fast consistent UI, no CSS files per component |
| **recharts 3.10** | `ComposedChart/Scatter/LineChart/BarChart/ReferenceArea` in `IntelligenceScatter/Timeline`, `AAModelCharts`, `AITrends`, `CodingAgents` | Declarative React charts for benchmarks |
| **d3 7.9 (+ @types/d3)** | Only `HierarchicalEdgeBundling.tsx` (`d3.hierarchy/cluster`, edge bundling math) | Custom circular network impossible in recharts |
| **PostgreSQL via `pg`** (`lib/pg.ts`) | Tables `news_items, agent_runs, models, status`; `ON CONFLICT(url) DO NOTHING`, `normalize_title_clean()` SQL dedupe, paginated `getNewsPg/countNewsPg/getFacetsPg` | Full history (no 2500 prune), run logs; graceful `hasPg()==false` fallback to JSON |
| **JSON file-store** (`lib/db.ts`, `lib/storage.ts`, `data/*.json`) | `{meta,items}` atomic `.tmp` rename, `upsertNewsItems` + `isDuplicate`, `pruneStore`; Vercel path `/tmp/ai-news-data` seeded from bundle | Zero-config local dev + committable snapshot that Vercel serves via GitHub raw |
| **rss-parser 3.13** | `fetchRSSFeeds()` 38 feeds, `rss.ts`, `reddit.ts` (`.rss`), `youtube.ts` (`videos.xml`) | Robust RSS/Atom without browser |
| **Puppeteer 25.5** (`serverExternalPackages`, `DISABLE_X_SCRAPING`) | Opt-in `X_PUPPETEER` fallback for X/Twitter, `PUPPETEER_SKIP_DOWNLOAD=true` on Vercel | Only way to render JS-heavy X pages; disabled serverless by default |
| **Ollama (`llama3.2:3b`, `OLLAMA_URL`)** (`lib/ollama.ts`) | Optional `summarizeAndCategorize()` → `{summary,category}`, cache `data/summary-cache.json` keyed by normalized title, `enrichItem()` with keyword fallback | Free local LLM summaries; never blocks agent if offline |
| **Jina Reader + Nitter + syndication CDN** (`lib/twitter.ts`) | Chain: Nitter RSS (3 instances) → Jina (`JINA_API_KEY`, 3.5s spacing, 20-acct cap, 403 backoff) → Puppeteer; `cdn.syndication.twimg.com` for featured | No X API key needed; degrades gracefully |
| **GitHub REST + Git Data API** (`lib/github-data.ts`) | `fetchCommittedFile()` 3-tier (Contents API → `raw.githubusercontent` → git blob for >1MB private), `commitFilesToRepo()` atomic multi-file, `dispatchWorkflow()` | Lets serverless read freshest committed data without rebuild; powers `/api/cron` poke |
| **next/font/google + next/og** | `Inter + IBM_Plex_Mono + Fraunces` variables, `ImageResponse 1200x630` OG card | Brand typography + link previews |
| **tsx 4.23** | `npx tsx lib/run-agent.ts|run-seed.ts|run-generate-kb.ts`, `scripts/*.mts` | Run TS directly in CI without build |

---

## 3. Project Structure

```
app/
  page.tsx, layout.tsx, globals.css, sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx
  models/page.tsx, models/[slug]/page.tsx, models/[slug]/providers/page.tsx
  leaderboards/, trends/, image/, video/leaderboard/*, speech-to-text/, text-to-speech/,
  speech-image-video/, coding-agents/, chat/, image/
  api/news|status|models|models/catalog|cron|refresh|chat|sentiment|newsletter|
      knowledge-base|knowledge-base/generate|agent-runs/route.ts
components/ (37 files: Home, Header, Footer, Ticker, HeroLead, NewsCard, CoverImage,
  FilterBar, DomainBar, Trending, TrendingSidebar, DailyTrends, ModelWatch, ModelDetail,
  AAModelCharts, IntelligenceScatter/Timeline, AITrends, AIRadar, MoodIndicator, Chat,
  CodingAgents, ImageLeaderboard, LatestModels, HighlightsStrip, ModelNewsStrip, ...)
lib/
  agent.ts (orchestrator), run-agent.ts (CLI), fetcher.ts (compat), rss.ts, google-news.ts,
  reddit.ts, hackernews.ts, arxiv.ts, youtube.ts, github.ts, twitter.ts, web-scraper.ts,
  categorize.ts, dedupe.ts, rank.ts, engagement.ts, sentiment.ts, ollama.ts,
  image-enrichment.ts, storage.ts, db.ts, pg.ts, status.ts, github-data.ts, github.ts,
  model-registry.ts, models-catalog.ts, models.ts, aa-scraper.ts, aa-model-scraper.ts,
  t2i-scraper.ts, trends-data.ts, image-leaderboard.ts, coding-agents-data.ts,
  ai-supply-demand-data.ts, chat-retrieval.ts, chat-answers.ts, knowledge-base-generator.ts,
  seed-knowledge-base.ts, run-seed.ts, run-generate-kb.ts, run-clean.ts, run-migrate-pg.ts,
  format.ts, sortable.ts, site.ts, build.ts, theme.tsx, types.ts
data/ (news.json 2500, models.json 601, models-slim.json 358, aa-*.json, t2i/text-to-video/
  image-editing/image-to-video/video-editing/speech-*.json, status.json)
scripts/ (scrape-models.mts, backfill-images.ts, test-twitter.mts, purge-twitter-noise.mts,
  dom-check*.mjs, shot.mjs, generate-aa-data.js, parse-test.mts)
docs/aa-data-sources.md, .github/workflows/agent.yml|models.yml, vercel.json,
next.config.ts, package.json, AI_NEWS_KNOWLEDGE_BASE.md
```

---

## 4. Main Methods — Usage / Why (by file)

### 4.1 Orchestration
- `runAgent(options)` (`lib/agent.ts`): `initDB()` → parallel `withTimeout(fn,18s Vercel/60s)` per source + `recordSourceResult` → `enrichImages({entityOnly:maxHttp})` → Ollama `enrichItem` → `classifyDomain` → `upsertNewsItems` + `pruneStore` → `upsertNewsItemsPg` mirror → `writeStatus` → `refreshSlimOpenRouter()` → `recordAgentRunPg` → optional KB + `refreshModelDatabase/fetchAAData/mergeAAIntoModels` (skipped serverless). **Why:** fault-tolerant, time-bounded, keeps JSON+PG+slim in sync.
- `run-agent.ts` CLI: loads `.env.local` (tsx doesn't auto-load), parses `--loop --kb --sources --interval --skip-models/--skip-images/--skip-ollama`, `runOnce()` + pretty log. **Why:** local/CI entry (`npm run agent|agent:loop|agent:kb`).
- `fetchAllNews()` (`lib/fetcher.ts`): wraps `runAgent()` to old `{rssCount,twitterCount,webCount,totalInserted}` shape. **Why:** backward compat for old cron.

### 4.2 Ingestion (each: fetch → 72h/14d filter → `categorizeContent` → return `NewsItem[]`)
| File / Method | Method details | Why |
|---|---|---|
| `rss.ts fetchRSSFeeds()/fetchRSSFeedsFor()` | 38 feeds, 12 items/feed, `Promise.allSettled`, `extractImage` (enclosure→media:content→`<img>`→og:image) + `normalizeImageUrl` | Highest-quality company+media signal |
| `google-news.ts fetchGoogleNews()` | 6 queries (`AI,LLM,funding,releases,policy,labs`), `when:48/72h`, split `Title - Publisher`, title dedupe | Broad mainstream coverage |
| `reddit.ts fetchReddit()` | 5 subs via `/.rss`, 72h, score/comments regex | Community upvote signal |
| `hackernews.ts fetchHackerNews()` | `hn.algolia.com/search_by_date` 10 queries, `MIN_POINTS=25`, 72h | Tech-elite filter |
| `arxiv.ts fetchArxiv()` | `cs.AI/LG/CL` Atom `max_results=25`, manual XML regex, authors→`num_comments` | Research track |
| `youtube.ts fetchYouTube()` | 6 channels via `videos.xml`, 14d window | Video explainers |
| `github.ts fetchGitHub()` | `search/repositories?q=topic:ai+created:>date` (absolute date avoids 422) + org events filter | Code velocity |
| `twitter.ts fetchTwitterTimeline(), isNoiseTweet()` | 70+ accounts + 6 featured via `cdn.syndication`, Nitter→Jina→Puppeteer chain, `MODEL_SIGNAL/NOISE_RE`, `PER_ACCOUNT_CAP=6,TOTAL_CAP=260`, 45s deadline | Highest-signal releases; degrades gracefully; `DISABLE_X_SCRAPING` on Vercel |
| `web-scraper.ts scrapeWebSources(), scrapeArticleContent()` | 11 HTML sites, regex `<a>` + `extractSnippet/date` | Non-RSS long tail |
| `github-data.ts fetchCommittedFile(), commitFilesToRepo(), dispatchWorkflow()` | 3-tier read, Git Data API atomic commit, Actions dispatch | Fresh data without rebuild |

### 4.3 Processing / Enrichment
- `categorizeContent(), classifyDomain(), categoryLabel()` (`categorize.ts`): regex → `model/research/product/safety/policy/other` + `business/tech/research/general`. **Why:** zero-LLM instant classification.
- `normalizeTitle(), titlesSimilar(), isDuplicate()` (`dedupe.ts`): lower+stopword strip, host+path URL norm, Jaccard ≥0.72. **Why:** shared JSON+PG dedupe.
- `rankKey(), sortByRank()` (`rank.ts`): `published_at + CHANNEL_BONUS (rss+26h,google+22h,github-18h,twitter-2h) + quality (summary length, release/model boost, github penalty)`. **Why:** surfaces releases, suppresses noise.
- `engagementScore(), frontPageOrder(), diversifiedTopStories(), lastNHours()` (`engagement.ts`): `log10(1+s)*2.2` over views/likes/retweets/score/comments. **Why:** "internet cares" ordering + per-source diversity.
- `scoreText(), analyzeSentiment()` (`sentiment.ts`): lexicon `POSITIVE/NEGATIVE/NEGATORS/AMPLIFIERS` → `-1..1`, aggregates `landscape/models/domains`, 7d trend, 48h hot. **Why:** no-LLM mood dashboard.
- `checkOllama(), summarizeAndCategorize(), enrichItem()` (`ollama.ts`): `llama3.2:3b` JSON `{summary,category}` + file cache. **Why:** optional quality boost, never blocks.
- `enrichImages()` (`image-enrichment.ts`): `og:image→twitter:image→image_src` (4s timeout, concurrency 20) + 100+ `ENTITY_PHOTOS` regex → Wikimedia. Mutates in place. **Why:** visual feed without hotlinks.

### 4.4 Persistence
- `dataDir(), dataFile()` (`storage.ts`): `<cwd>/data` vs `/tmp/ai-news-data` on Vercel (seeded from bundle, skip >8MB `models.json`). **Why:** writable on read-only serverless.
- `readStore/writeStore/initDB/upsertNewsItems/pruneStore/getNewsItems/getFacets` (`db.ts`): atomic rename, dedupe, newest-first prune. **Why:** simple file DB.
- `hasPg/getPool/initPgSchema/upsertNewsItemsPg/getNewsPg/.../record/getAgentRunsPg/upsertModelsPg` (`pg.ts`): full history + pagination + logs. **Why:** production history; null when `DATABASE_URL` missing.
- `readStatus/writeStatus/recordSourceResult` (`status.ts`): `{lastRun,lastSuccess,nextRun,totalItems,sources:{ok,count,error}}`. **Why:** health + cron skip.

### 4.5 Models Catalog
- `scrapeOpenRouter/HuggingFace/Ollama/LmarenaRanks/Freellm, mergeModelData(), refreshModelDatabase(), refreshSlimOpenRouter(), toSlim()` (`model-registry.ts` 842 lines): `valueScore=(II/perM)*5`, `normalizeKey`, richness-prefer merge, alias expansion, 48h buzz, `8M/rank^0.95` pull-estimate, 600 cap. **Why:** survives single-source failure; slim solves 100MB deploy problem.
- `loadModelCatalog(), slimToModelRecord()` (`models-catalog.ts`): GitHub slim → local slim → lean full. **Why:** deployed APIs always fresh.
- `fetchAAData(), parseAADatasets(), mergeAAIntoModels(), inferProvider()` (`aa-scraper.ts`): JSON-LD → `__NEXT_DATA__` → `aa-models.json` seed. **Why:** authoritative Intelligence/Speed/Cost.
- `scrapeAllModels()` (`aa-model-scraper.ts`): per-model pages, `AA_SCRAPE_LIMIT=25`, 800ms throttle. **Why:** deep fill within CI budget.
- `scrapeLeaderboard/runAllLeaderboards` (`t2i-scraper.ts`): 6 media boards HTML parse. **Why:** feeds image/video/speech pages.
- `MODELS_TIMELINE, getLabsByLatestIntelligence...` (`trends-data.ts`): static timeline. **Why:** trends without live query.
- `findModelsInItems(), topBenchmarked()` (`models.ts`): 12 curated frontier + headline match fallback. **Why:** Model Watch never empty.

### 4.6 Chat / KB
- `generateKnowledgeBase()` (`knowledge-base-generator.ts`): `getNewsItems(500)` grouped → markdown with stats/source/TOC. **Why:** exportable RAG context.
- `retrieve(), searchNews(), getAllModels/findModelByName()` (`chat-retrieval.ts`): TF-IDF-like (stopwords, norm TF, exact+substring), recency/intel boost, lazy cache. **Why:** zero-dep retrieval.
- `answerQuestion()` (`chat-answers.ts`): intent routing + 13 explainers + history expansion + weak-match guard. **Why:** structured answers, zero LLM cost.

### 4.7 Frontend key methods
- `Home.tsx`: `useCallback/useMemo/useRef/useState/useEffect`, `PAGE_SIZE=300`, 60s poll `/api/news+status`, `frontPageOrder/diversifiedTopStories`, localStorage domain. **Why:** fast paginated live feed.
- `ModelWatch.tsx`: tabs `intelligence/value/popularity/newest` + openness + search, `fetch /api/models?sort&limit=120` 180s poll. **Why:** interactive board.
- `Header.tsx`: `useTheme()`, scroll `stuck` blur, `countdown()`, 60s `/api/status` poll. **Why:** live nav + next-run countdown.
- `CoverImage.tsx`: `usableImageUrl()` + deterministic SVG gradient fallback. **Why:** never broken image.
- `Chat.tsx`: `POST /api/chat {question,history}`, auto-scroll, markdown-lite (tables/bold/code/links). **Why:** advisor UX.
- `HierarchicalEdgeBundling.tsx`: `useRef/useEffect` + `d3`, category filter + hover panel. **Why:** geopolitics viz.
- `sortable.ts toggleSort/compareValues/sortByCol`: desc-default symmetric toggle, stable, undefined-bottom. **Why:** shared by every leaderboard.
- `format.ts timeAgo/formatNumber/countdown/typeIcon/typeLabel`, `site.ts siteUrl()/SITE_*`, `theme.tsx ThemeProvider (localStorage ai-pulse-theme + prefers-color-scheme + data-theme)`, `build.ts BUILD_TAG/URL`. **Why:** consistent UX/SEO/theme.

---

## 5. API Reference

| Method+Route | Input | Output | Backend used | Why |
|---|---|---|---|---|
| `GET /api/news` | `limit,offset,source,category,sourceType,domain,sort,since` | `{items,total,facets}` | Vercel: `fetchCommittedFile(news.json)`+60s `memoryCache` else `getNewsPg/getNewsItems` + `sortByRank/frontPageOrder` | Fresh snapshot serverless, full PG locally |
| `GET /api/status` | — | `{lastRun,sources,totalItems,lastRuns[5]}` | `readStatus()` or committed + `getAgentRunsPg(5)` | Health without rebuild |
| `GET /api/models` | `sort,limit` | lean models + `modelNews` | PG `models` else `loadModelCatalog()` + `sortModels()+toLean()` | Avoid 100MB blob |
| `GET /api/models/catalog` | — | full lean catalog | `loadModelCatalog()`, `no-store` | `/models` page source |
| `GET /api/cron` | `Bearer CRON_SECRET` | `{ok,dispatched}` always 200 | `committedStatus()` age>3h → `dispatchWorkflow(agent.yml)`, `maxDuration=30` | Hobby poke delegates to Actions |
| `POST /api/refresh` | — | agent result | `runAgent()` inline | Manual refresh |
| `POST /api/chat` | `{question,history}` | `{answer,sources}` | `answerQuestion()` | Deterministic advisor |
| `GET /api/sentiment` | `?days=90` | `{landscape,models,domains,trend,hot}` | `analyzeSentiment(loadItems())` | Lexicon mood |
| `POST /api/newsletter` | `{email}` | `{ok}` | regex + `data/newsletter.json` | No external service |
| `POST /api/knowledge-base` | — | `{items}` | `seedKnowledgeBase()+runAgent()+generateKnowledgeBase()` | Ensure non-seed KB |
| `POST /api/knowledge-base/generate` | — | `{path,itemCount,seededNew}` | `seed+generate` | On-demand export |
| `GET /api/agent-runs` | `?limit=8` | `{runs,backend}` | `getAgentRunsPg()` else `{backend:json}` | Run history UI |

---

## 6. Data Schemas (essentials)

- `NewsItem`: `{id?, source, source_label?, source_type: rss|twitter|web|google|reddit|hn|arxiv|youtube|github, title, summary, content, url, author, category: model|research|product|safety|policy|other, domain?: business|tech|research|general, published_at, created_at?, image_url?, score?, num_comments?, tweet_metrics?}` (`lib/types.ts`).
- `ModelRecord`: `{id,name,provider,source,released?,family?,params?,context?, promptPrice/completionPrice/valueScore, intelligenceIndex/codingIndex/agenticIndex/aaSpeed/aaCostPerTask/aaVerbosity, hfDownloads/hfLikes, elo/arenaRank/numVotes/license, mentions/redditMentions/xMentions/buzz, freeTier/localOnly, description?, license?}`.
- `SlimModel`: lean subset above (license ≤160ch) — 358 rows.
- Media rows: `{rank,range,creator,name,elo,ci,samples,released,price,openWeights?}`; STT `{rank,name,provider,wer,speedFactor,price}`; TTS `{rank,name,provider,qualityElo,price,speedFactor}`.

---

## 7. How to run / verify

```bash
npm run dev          # next dev
npm run build && npm start
npm run lint; npm run typecheck  # eslint; tsc --noEmit
npm run seed         # npx tsx lib/run-seed.ts
npm run generate-kb  # npx tsx lib/run-generate-kb.ts
npm run agent        # npx tsx lib/run-agent.ts
npm run agent:loop   # --loop --kb (AGENT_INTERVAL_MS default 4h)
npm run agent:kb     # --kb
```

Env (see `.env.example`): `OLLAMA_URL/MODEL`, `DATA_REPO/BRANCH`, `GITHUB_DATA_TOKEN`, `AGENT_INTERVAL_MS`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `DISABLE_X_SCRAPING`.
