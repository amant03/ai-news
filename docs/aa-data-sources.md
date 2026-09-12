# Artificial Analysis — Data Source Reference

This document maps every piece of data we mirror from
[artificialanalysis.ai](https://artificialanalysis.ai) into this codebase, so we
never have to rediscover where it lives. Keep it updated when you touch AA data.

## Data we mirror and where it lives

| AA data | Where we keep it | Loaded by |
| --- | --- | --- |
| Intelligence Index (top models) | `data/aa-models.json` (seed), merged into `data/models.json` | `lib/aa-scraper.ts` → `lib/agent.ts` |
| Verbosity (output tokens per Intelligence Index task) | `data/aa-models.json` → `data/models.json` (`aaVerbosity`) | `lib/aa-scraper.ts` |
| Provider benchmarks (live pricing / features per provider) | `data/aa-providers.json` (refreshed from OpenRouter endpoints API) | `lib/provider-endpoints.ts` → server components in `app/models/[slug]/providers/` |
| Full model database (prices, context, family) | `data/models.json` | `lib/model-registry.ts` |

## Page inventory (as of Aug 2026)

### https://artificialanalysis.ai/models — LLM leaderboard
- Table of all benchmarked models (609 total, 29 highlighted as "NEW"-flagged).
- Columns: model, provider, Intelligence Index, Coding Index, Cost per Task,
  Speed (output tokens/s), Context, Price, Released, Openness (Open Weights /
  Open Weights (Commercial Use Restricted) / Proprietary), Reasoning (lightbulb).
- Tab views: Intelligence Index, Coding, Agentic Index, Speed, Price, Context,
  Openness Index, Image/Video/Text inputs, Voice.
- Toggle chips: `Open Weights / Proprietary`, `Reasoning / Non-Reasoning`,
  `Text Only / Multimodal Inputs`.
- The live page is a React app; a reliable alternative is the JSON embedded in
  the page (`__NEXT_DATA__` script tag) with fields `intelligence_index`,
  `tokens_per_second`, `cost_per_task` (see `scrapeAAHtml()` in `lib/aa-scraper.ts`).

### https://artificialanalysis.ai/models/{slug} — model detail
- Header: provider + logo, `Open weights model` / `Proprietary model` badge,
  released date.
- Model summary cards:
  - **Intelligence**: `#rank / classSize`, score, `x of 4 units`.
  - **Speed**: output tokens per second (may be N/A if no API provider yet).
  - **Cost per Task**: weighted avg USD per Intelligence Index task, plus
    In/Out price per 1M tokens.
  - **Verbosity**: `#rank / classSize`, output tokens from Intelligence Index,
    `x of 4 units`.
- Comparison summary paragraph (AA-generated prose).
- Technical specifications: Reasoning, Input modality, Output modality,
  Context window, Total parameters, License, Model weights (HF link).
- Sections: Intelligence (9-eval composite), Benchmarks, Openness Index,
  Intelligence Index Comparisons (vs cost/time/speed), Token Use, Cost,
  Pricing (cache hit/input/output), Context Window, Model Size.
- FAQ section with answers for "released", "created by", "intelligent",
  "verbose", "reasoning", "modalities", "context", "open source",
  "parameters", "license", "API availability".

### https://artificialanalysis.ai/models/{slug}/providers — API provider benchmarks
- "Fastest" top-5 by output speed (t/s).
- "Lowest Latency" top-5 by time to first answer token (s).
- "Lowest Price" top-5 by blended price per 1M tokens (7:2:1 cache-input-output).
- Summary prose (best performance, best price, variance).
- Table ("Key Comparison Metrics & API Features"): provider, context window,
  function calling, JSON mode, license, cost per task (USD), median tokens/s,
  first chunk (s), total response (s), reasoning time (s).
- Charts: pricing (cache hit/input/output), blended price, cache discount,
  output speed vs price, latency vs output speed, time to first answer token,
  end-to-end response time.
- Note: median = P50 over past 72h; workload = 10k input tokens.

## Benchmarks in the Intelligence Index (v4.1.1)

Composite of 9 evaluations:

1. GDPval-AA v2 — agentic real-world work tasks, (Elo-500)/2000
2. 𝜏³-Banking — agentic tool use
3. Terminal-Bench v2.1 — agentic coding & terminal use
4. SciCode — coding
5. Humanity's Last Exam — reasoning & knowledge
6. GPQA Diamond — scientific reasoning
7. CritPt — physics reasoning
8. AA-Omniscience — knowledge (accuracy + non-hallucination)
9. AA-LCR — long-context reasoning

See https://artificialanalysis.ai/methodology/intelligence-benchmarking.

## Comparison class rules (AA)

Metrics compare against same class:
- Reasoning vs non-reasoning: reasoning models compare across both.
- Open weights models compare only with open weights models of same size class:
  Tiny ≤4B, Small 4B–40B, Medium 40B–150B, Large >150B.
- Proprietary models compare across both, same price range using blended
  3:1 input/output ratio: <$0.15, $0.15–$1, >$1 per 1M tokens.

## How the merge works

`lib/agent.ts` (every 4h CI run, and on-demand refresh):
1. `lib/model-registry.ts` rebuilds `data/models.json` from OpenRouter, HF,
   Ollama, LMArena, freellm.
2. `lib/aa-scraper.ts` `fetchAAData()`: live-scrape `https://artificialanalysis.ai/models`
   (falls back to `data/aa-models.json` seed).
3. `mergeAAIntoModels()` fills `intelligenceIndex`, `aaSpeed`, `aaCostPerTask`,
   `aaVerbosity` on matching models (match by normalized name; adds new records
   with `source: 'aa'` when no match).

## Known gaps / next steps

- Provider benchmark pages (`/models/{slug}/providers`) are refreshed from
  OpenRouter's public endpoints API (`lib/provider-endpoints.ts`, daily via
  `models.yml`); `data/aa-providers.json` holds the latest snapshot.
- Live scrape of the leaderboard is flaky (Next.js app); the `__NEXT_DATA__`
  JSON path should be prioritized. If it keeps failing, bump the seed file —
  it is the CI fallback and the source of truth for the frontier top-29.
- AA "Open Weights (Commercial Use Restricted)" third bucket is not modelled
  yet; we collapse to `open-weights`.
