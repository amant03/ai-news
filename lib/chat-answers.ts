import { retrieve, searchNews, getAllModels, findModelByName, type RetrievedItem } from './chat-retrieval';

// ---------------------------------------------------------------------------
// Smart answer engine: retrieval + pattern-based answer generation.
// No LLM needed — combines TF-IDF retrieval with structured answer templates.
// ---------------------------------------------------------------------------

interface Model {
  name: string;
  provider?: string;
  creator?: string;
  intelligenceIndex?: number;
  aaSpeed?: number;
  aaCostPerTask?: number;
  aaVerbosity?: number;
  context?: string;
  params?: string;
  license?: string;
  promptPrice?: number;
  completionPrice?: number;
  codingIndex?: number;
  agenticIndex?: number;
  elo?: number;
  openWeights?: boolean;
  released?: string;
  family?: string;
  description?: string;
}

function loadModels(): Model[] {
  return getAllModels() as unknown as Model[];
}

function vendor(m: Model): string {
  return m.provider || m.creator || 'Unknown';
}

function fmt(m: Model): string {
  const p = [`${m.name} (${vendor(m)})`];
  if (m.intelligenceIndex != null) p.push(`Intel: ${m.intelligenceIndex}`);
  if (m.aaSpeed != null) p.push(`Speed: ${m.aaSpeed} t/s`);
  if (m.aaCostPerTask != null) p.push(`Cost: $${m.aaCostPerTask}/task`);
  if (m.codingIndex != null) p.push(`Coding: ${m.codingIndex}`);
  if (m.context) p.push(`Ctx: ${m.context}`);
  if (m.params) p.push(`Params: ${m.params}`);
  if (m.promptPrice != null) p.push(`$${m.promptPrice}/1M in`);
  return p.join(' | ');
}

function findModel(query: string, models: Model[]): Model | null {
  const hit = findModelByName(query);
  if (hit) return hit as unknown as Model;
  const q = query.toLowerCase().trim();
  let m = models.find(m => m.name.toLowerCase() === q);
  if (m) return m;
  m = models.find(m => m.name.toLowerCase().includes(q));
  if (m) return m;
  m = models.find(m => vendor(m).toLowerCase().includes(q));
  return m || null;
}

// ---------------------------------------------------------------------------
// Query intent helpers
// ---------------------------------------------------------------------------

const MODEL_DETAIL_PATTERN = /(?:tell me about|info on|details for|detail on|what is|what are|about)\s+(.+)/i;

function isNewsQuery(q: string): boolean {
  return /\b(latest|recent|news|what.*(happen\w*|dropped|released|announced)|trend|story|article|headline|update|funding|raising|valuation|round)\b/i.test(q);
}

function isVideoQuery(q: string): boolean {
  return /\b(video\w*|film|clip|animation|sora|gen.?3\d?)\b/i.test(q);
}

function isImageQuery(q: string): boolean {
  return /\b(images?\b|imagen|picture\w*|photo\w*|generate.*visual|text.to.image|t2i)\b/i.test(q);
}

function isVagueFollowup(q: string): boolean {
  return /^(and|then|also|what about|how about|why\b|is it|does it|can you|tell me more|go on|elaborate|more (detail|info)?|give me more|explain more|any more|anything else|more|that|cool|nice)[\s\?!.]*$/i.test(q) ||
    /^(tell me more|elaborate|expand on that|any more|anything else)\b/i.test(q);
}

/**
 * Expand vague follow-up questions using conversation history.
 * e.g. "tell me more" + previous "What is happening with Mistral AI?" →
 *      "Mistral AI tell me more"
 */
function expandWithHistory(question: string, history?: Array<{ role: string; content: string }>): string {
  const q = question.trim();
  if (!isVagueFollowup(q) || !history || history.length === 0) return question;
  let lastUser = '';
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.role === 'user') {
      lastUser = history[i].content;
      break;
    }
  }
  if (!lastUser) return question;
  const topic = lastUser.replace(/^(compare|tell me about|what is|what are|who|how|why|best|top|the)\b/gi, '').trim();
  return `${topic || lastUser} ${q}`;
}

// ---------------------------------------------------------------------------
// Explainers for common AI concepts (answers questions that aren't in the data)
// ---------------------------------------------------------------------------

const EXPLAINERS: Array<{ pattern: RegExp; answer: string }> = [
  {
    pattern: /(transformer|attention|self.attention|tokenizer|token)/i,
    answer: `**How Transformers Work:**\n\nTransformers process text as sequences of **tokens** (small word chunks). Each token travels through **self-attention layers** that let the model weigh how relevant every other token is to it — this is what gives them long-range understanding.\n\nKey components:\n- **Attention**: computes queries/keys/values per token and mixes information across the sequence\n- **Feed-forward layers**: process each token independently after attention\n- **Positional encoding**: injects word order, since attention itself is order-blind\n\nThe same architecture powers GPT, Claude, Gemini and most modern LLMs.`,
  },
  {
    pattern: /(how does an? llm|what is an? llm|large language model|how do.*models.*work)/i,
    answer: `**What is a Large Language Model (LLM)?**\n\nAn LLM is a neural network trained on massive text corpora to predict the next token in a sequence. By learning statistical relationships between tokens, it can generate coherent text, reason, code, and follow instructions.\n\nHow it works in practice:\n1. Text is tokenized into chunks\n2. Tokens are embedded into vectors and processed through transformer layers\n3. At each step the model predicts a probability distribution over the next token\n4. Sampling from that distribution generates the reply\n\nYou can see live benchmarks (intelligence, speed, pricing, context) for 600+ LLMs on the **Leaderboard** page.`,
  },
  {
    pattern: /(what is.*(ag|agi)|artificial.?general.?intelligence|when.*(agi|ai.*human))/i,
    answer: `**What is AGI?**\n\nArtificial General Intelligence (AGI) refers to AI that can perform any intellectual task a human can — reasoning, learning, and adapting across domains without specialized training.\n\nCurrent state:\n- Frontier models (GPT-5.x, Claude, Gemini) are **narrow/broad AI** — extremely capable but still narrow in autonomy and reliability\n- Most experts estimate AGI is years away, though opinions vary widely\n- Key open problems: long-horizon planning, continuous learning, reliable truthfulness, and embodied understanding\n\nFor the latest AGI milestones and model releases, check the **News** page.`,
  },
  {
    pattern: /hal\w*cinat/i,
    answer: `**Why LLMs Hallucinate:**\n\nHallucination happens when a model generates fluent but factually wrong text. Common causes:\n\n- **Next-token prediction**: the model optimizes for plausible text, not verified facts\n- **Training cutoffs**: knowledge is frozen at training time\n- **Rare facts**: low-frequency knowledge isn't strongly encoded\n- **Confirmation pressure**: asking leading questions nudges the model toward agreeable answers\n\nModels with high **intelligenceIndex** (see the Leaderboard) tend to hallucinate less. For research tasks, ask the model to cite sources or verify with retrieval.`,
  },
  {
    pattern: /(rag|retrieval.?augmented|grounding)/i,
    answer: `**What is RAG (Retrieval-Augmented Generation)?**\n\nRAG combines an LLM with an external knowledge store:\n\n1. A query is embedded and used to **retrieve** relevant documents (vector search)\n2. Retrieved chunks are injected into the model's context as grounding evidence\n3. The model answers **with citations**, dramatically reducing hallucinations\n\nIt's the standard way to make LLMs answer questions about private/current data. This chat uses a similar lightweight retrieval approach over 2,500+ live articles and 600+ models.`,
  },
  {
    pattern: /(fine.?tun|sft|rlhf|reinforcement.*human)/i,
    answer: `**Fine-Tuning & RLHF:**\n\n- **Fine-tuning (SFT)**: taking a pre-trained model and continuing training on labeled examples for a domain/style.\n- **RLHF**: Reinforcement Learning from Human Feedback — a reward model trained on human preferences shapes the model's behavior.\n- **LoRA/QLoRA**: parameter-efficient methods that fine-tune a small set of adapters instead of all weights (cheap, runs on a single GPU).\n\nOpen-weight models (see open-weight leaderboard) can be fine-tuned freely; closed models only expose API-level customization.`,
  },
  {
    pattern: /(diffusion|stable diffusion|how.*image.*generated|text.?to.?image)/i,
    answer: `**How Text-to-Image Generation Works:**\n\nModern image models (Stable Diffusion, Midjourney, and the T2I models on this site) use **diffusion**:\n\n1. **Forward pass**: training images are progressively noised until they become pure static\n2. **Denoising**: the model learns to reverse that process, guided by text embeddings\n3. **Guidance**: during generation, the model denoises a random noise image while steering toward the prompt's semantics\n\nSee the **Text-to-Image Leaderboard** for ranked models with ELO ratings and pricing.`,
  },
  {
    pattern: /(context window|token limit|how much.*(remember|context))/i,
    answer: `**Context Windows Explained:**\n\nThe context window is how many tokens (input + output) a model can process at once. Think of it as working memory:\n\n- **Small (~8-32K)**: good for chat and short docs\n- **Medium (~100-200K)**: a few hundred pages\n- **Large (1M+)**: entire codebases or long books (e.g. Gemini 1M, Qwen 3.8 1M)\n\nThe Leaderboard shows the **Context** column for every model — filter by it to find models that fit long documents.`,
  },
  {
    pattern: /(reasoning|think|chain.?of.?thought|test.?time)/i,
    answer: `**Model Reasoning & Test-Time Compute:**\n\nFrontier models now spend extra compute at inference to "think longer" before answering — this is **test-time compute**:\n\n- Models can reason step-by-step (chain-of-thought) internally\n- Higher reasoning effort = better results on math/code/logic, but slower and more expensive\n- Many models expose effort levels (low/medium/high) in their APIs\n\nModels with the highest **intelligenceIndex** on the Leaderboard typically incorporate extended reasoning.`,
  },
  {
    pattern: /(friendliest|which.*company|which.*provider|who makes.*model|who built)/i,
    answer: `**AI Model Providers:**\n\nThe main players tracked on this site:\n\n- **OpenAI** — GPT-5.x family (GPT-5.6 Sol, Terra, Luna), reasoning + agents\n- **Anthropic** — Claude Opus/Sonnet/Haiku, strong at coding\n- **Google** — Gemini (incl. 1M context), open Gemma\n- **Meta AI** — Llama open-weight family\n- **DeepSeek**, **Qwen (Alibaba)**, **Mistral**, **xAI (Grok)**, **Z-ai** and more\n\nTry "compare GPT-5.6 and Gemini" or ask who's leading the Leaderboard.`,
  },
  {
    pattern: /\b(open.?source|open.?weight)\b/i,
    answer: `**Open-Source vs Open-Weight:**\n\n- **Open-weight**: model weights are public so you can run/fine-tune them, even if training data/code isn't fully open (Llama, DeepSeek, Qwen, Mistral, Gemma).\n- **Open-source**: the full stack including training code and data is public and modifiable.\n\nAll open-weight models on the Leaderboard (filterable) can be self-hosted — see the open-weight query for current top picks.`,
  },
  {
    pattern: /(ai safety|alignment|x.?risk|superintellig)/i,
    answer: `**AI Safety & Alignment:**\n\nThe field focuses on making AI behave reliably as it becomes more capable. Main areas:\n\n- **Alignment**: ensuring model goals/behavior match human intent\n- **Interpretability**: understanding why models make decisions\n- **Evaluation & red-teaming**: stress-testing before release\n- **Governance**: regulation, transparency, and safety standards (EU AI Act, US executive orders)\n\nWhy now? Frontier models keep getting more capable, and safety researchers argue capability growth must be matched by safety research. For current debates, ask about "AI safety news" and I'll pull the latest stories.`,
  },
  {
    pattern: /(training.*data|where.*trained|how.*trained|compute.*trained)/i,
    answer: `**How Models Are Trained:**\n\nTraining a frontier LLM involves:\n\n1. **Data collection**: trillions of tokens of web text, books, code, math\n2. **Pre-training**: massive GPU clusters (10k-100k+ accelerators) predict next tokens for months\n3. **Post-training**: fine-tuning, RLHF/reasoning reinforcement, safety alignment\n4. **Evaluation**: benchmark suites before release\n\nTraining costs run into the **hundreds of millions of dollars** for frontier models — one reason pricing varies so much (see the Pricing queries).`,
  },
];

function explainerFor(q: string): string | null {
  for (const e of EXPLAINERS) {
    if (e.pattern.test(q)) return e.answer;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Result formatting
// ---------------------------------------------------------------------------

function formatNewsResults(items: RetrievedItem[], query: string): string {
  if (items.length === 0) return '';
  const lines: string[] = [];
  const shown = items.slice(0, 5);
  for (const item of shown) {
    const date = item.meta.date ? new Date(item.meta.date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const src = item.meta.source || '';
    lines.push(`- **${item.title}** (${src}${date ? ', ' + date : ''})`);
    if (item.text) lines.push(`  ${item.text.slice(0, 160)}`);
    if (item.meta.url) lines.push(`  [Read more](${item.meta.url})`);
  }
  return lines.join('\n');
}

function formatModelResults(items: RetrievedItem[]): string {
  if (items.length === 0) return '';
  return items.slice(0, 5).map((item, i) => {
    const m = item.meta as any;
    const parts = [`${i + 1}. **${m.name}** (${m.provider || m.creator || 'Unknown'})`];
    const details: string[] = [];
    if (m.intelligenceIndex != null) details.push(`Intelligence: ${m.intelligenceIndex}`);
    if (m.codingIndex != null) details.push(`Coding: ${m.codingIndex}`);
    if (m.aaSpeed != null) details.push(`Speed: ${m.aaSpeed} t/s`);
    if (m.aaCostPerTask != null) details.push(`Cost: $${m.aaCostPerTask}/task`);
    if (m.promptPrice != null) details.push(`Input: $${m.promptPrice}/1M tokens`);
    if (m.context) details.push(`Context: ${m.context}`);
    if (m.openWeights || m.family === 'open-weights') details.push('Open-weight');
    if (m.rank != null) details.push(`Rank: #${m.rank}`);
    if (m.elo != null) details.push(`Elo: ${m.elo}`);
    if (m.price) details.push(m.price);
    if (details.length) parts.push(details.join(' | '));
    return parts.join('\n');
  }).join('\n\n');
}

// ---------------------------------------------------------------------------
// Main answer function
// ---------------------------------------------------------------------------

export function answerQuestion(question: string, history?: Array<{ role: string; content: string }>): string {
  const q = question.toLowerCase();
  const models = loadModels();

  // ---- Static / pattern-matched responses (fast path) ----

  if (/^(hi|hello|hey|howdy|greetings)/i.test(q)) {
    return "Hello! I'm AI Pulse's model advisor. I can help with:\n\n- **AI models** — benchmarks, pricing, comparisons\n- **AI news** — latest releases, funding, research\n- **Recommendations** — best model for your use case\n- **Industry trends** — what's happening in AI\n- **How AI works** — transformers, fine-tuning, RAG and more\n\nAsk me anything!";
  }

  if (/what is (this|ai pulse|the site)|what does.*ai pulse.*do/i.test(q)) {
    return "AI Pulse is a live AI news aggregator and model leaderboard. We track:\n\n- **2,500+** news articles from 20+ sources (TechCrunch, arXiv, Reddit, Hacker News, etc.)\n- **600+** AI models with benchmarks from Artificial Analysis\n- **Real-time** updates every 4 hours\n\nYou can ask me about any AI topic: recent news, model comparisons, pricing, speed, or how AI actually works!";
  }

  if (/quantiz|gguf|ggml|awq|gptq/i.test(q)) {
    return "**Quantization Guide:**\n\n- **GGUF**: Best for CPU/llama.cpp. Use Q4_K_M for balance, Q8 for quality.\n- **AWQ**: Best for GPU inference. 4-bit quant with minimal quality loss.\n- **GPTQ**: Older GPU quantization. Good but AWQ preferred.\n- **BitsAndBytes**: Easy 4/8-bit loading in Python.\n\nFor self-hosted models, check HuggingFace for quantized versions.";
  }

  // ---- Expand vague follow-ups with history context ----
  const effective = expandWithHistory(question, history);
  const eq = effective.toLowerCase();

  // ---- Domain-specific model queries (video / image) — before news ----
  if (isVideoQuery(eq)) {
    const rows = retrieve(effective, 8, ['t2v', 'i2v'])
      .sort((a, b) => ((a.meta.rank as number) || 999) - ((b.meta.rank as number) || 999));
    if (rows.length > 0) {
      const hasNews = isNewsQuery(eq);
      const all = rows.slice(0, 8);
      const t2v = all.filter(r => r.type === 't2v');
      const i2v = all.filter(r => r.type === 'i2v');
      const parts: string[] = [];
      if (hasNews) {
        const newsItems = searchNews(effective, 3);
        if (newsItems.length > 0) {
          parts.push("**Latest Video AI News:**\n");
          parts.push(formatNewsResults(newsItems, effective));
          parts.push('\n---\n');
        }
      }
      if (t2v.length > 0) {
        parts.push("**Top Text-to-Video Models:**\n");
        parts.push(t2v.slice(0, 4).map((item, i) => `${i + 1}. **${item.title}** — ${item.text}`).join('\n'));
      }
      if (i2v.length > 0) {
        if (parts.length) parts.push('\n');
        parts.push("**Top Image-to-Video Models:**\n");
        parts.push(i2v.slice(0, 4).map((item, i) => `${i + 1}. **${item.title}** — ${item.text}`).join('\n'));
      }
      return parts.join('\n');
    }
  }

  if (isImageQuery(eq)) {
    const rows = retrieve(effective, 8, ['t2i'])
      .sort((a, b) => ((a.meta.rank as number) || 999) - ((b.meta.rank as number) || 999));
    if (rows.length > 0) {
      const items = rows.slice(0, 5).map((item, i) => `${i + 1}. **${item.title}** — ${item.text}`);
      return `**Top Text-to-Image Models:**\n\n${items.join('\n')}\n\nSee the Text-to-Image Leaderboard for full rankings.`;
    }
  }

  // ---- News queries ----
  const wantsModelDetail = /(?:tell me about|info on|details for|detail on|what is|what are|about)\s+/i.test(eq) && !isNewsQuery(eq);
  if (isNewsQuery(eq) && !wantsModelDetail) {
    const newsItems = searchNews(effective, 8);
    const modelRows = retrieve(effective, 8, ['model']);
    const parts: string[] = [];
    if (newsItems.length > 0) {
      parts.push("**Latest AI News:**\n");
      parts.push(formatNewsResults(newsItems, effective));
    }
    if (modelRows.length > 0 && !/\b(video|image)\b/i.test(eq)) {
      if (parts.length) parts.push('\n---\n');
      parts.push("**Related Models:**\n");
      parts.push(formatModelResults(modelRows));
    }
    if (parts.length) return parts.join('\n');
  }

  if (/\b(cod(e|ing)|program(ming)?|software|develop(er|ment|ing)?|debug|script(ing)?)\b/i.test(eq)) {
    const c = models.filter(m => m.codingIndex != null).sort((a, b) => (b.codingIndex || 0) - (a.codingIndex || 0)).slice(0, 5);
    if (c.length) return "**Top 5 Coding Models:**\n\n" + c.map((m, i) => `${i + 1}. ${fmt(m)} | Coding Index: ${m.codingIndex}`).join('\n\n');
    const top = models.filter(m => m.intelligenceIndex != null).sort((a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0)).slice(0, 5);
    return "**Top 5 Models for Coding (by intelligence):**\n\n" + top.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/fastest|speed|quick|low latency/i.test(eq)) {
    const f = models.filter(m => m.aaSpeed != null).sort((a, b) => (b.aaSpeed || 0) - (a.aaSpeed || 0)).slice(0, 5);
    return "**Top 5 Fastest (tokens/sec):**\n\n" + f.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/cheapest|lowest cost|budget|affordable/i.test(eq)) {
    const c = models.filter(m => m.aaCostPerTask != null).sort((a, b) => (a.aaCostPerTask || 999) - (b.aaCostPerTask || 999)).slice(0, 5);
    return "**Top 5 Cheapest (per task):**\n\n" + c.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/open.?weight|self.?host|local|run locally|on.?premise/i.test(eq)) {
    const o = models.filter(m => m.family === 'open-weights' || m.openWeights === true).sort((a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0)).slice(0, 5);
    return o.length ? "**Top 5 Open-Weight Models:**\n\n" + o.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n') + "\n\nCan be self-hosted and fine-tuned." : "No open-weight models found in the current data.";
  }

  if (/compare|vs|versus|difference between/i.test(eq)) {
    const words = eq.split(/\s+/);
    const skip = new Set(['compare', 'vs', 'versus', 'between', 'the', 'and', 'with', 'model', 'models', 'a', 'an', 'me', 'of']);
    const names = words.filter(w => w.length > 3 && !skip.has(w));
    const found = names.map(n => findModel(n, models)).filter(Boolean) as Model[];
    if (found.length >= 2) {
      const a = found[0], b = found[1];
      return `**${a.name} vs ${b.name}:**\n\n| | ${a.name} | ${b.name} |\n|---|---|---|\n| Intelligence | ${a.intelligenceIndex || 'N/A'} | ${b.intelligenceIndex || 'N/A'} |\n| Speed | ${a.aaSpeed || 'N/A'} t/s | ${b.aaSpeed || 'N/A'} t/s |\n| Cost/Task | $${a.aaCostPerTask || 'N/A'} | $${b.aaCostPerTask ?? 'N/A'} |\n| Coding | ${a.codingIndex || 'N/A'} | ${b.codingIndex || 'N/A'} |\n| Context | ${a.context || 'N/A'} | ${b.context || 'N/A'} |\n| Provider | ${vendor(a)} | ${vendor(b)} |`;
    }
    return "Provide two model names. Example: 'Compare Claude Opus 5 and GPT-5.6 Sol'";
  }

  if (/best model|top model|most intelligent|highest intelligence|which.*(smartest|best)/i.test(eq)) {
    const top = models.filter(m => m.intelligenceIndex != null).sort((a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0)).slice(0, 5);
    return "**Top 5 Most Intelligent:**\n\n" + top.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/who's? leading|who leads|leading in ai|ai leader\w*|dominat\w*|the leader\b|top (company|provider)/i.test(eq)) {
    const top = models.filter(m => m.intelligenceIndex != null).sort((a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0)).slice(0, 5);
    const num1 = top[0];
    return num1
      ? `Right now, **${num1.name}** (${vendor(num1)}) is at the top of the leaderboard with an intelligence score of **${num1.intelligenceIndex}**, coding ${num1.codingIndex || 'N/A'} and ${num1.aaSpeed ? `${num1.aaSpeed} t/s` : 'N/A speed'}.\n\n**Top 5 right now:**\n\n${top.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n')}\n\nFor the full picture, check the **Leaderboard** page — rankings shift with every refresh.`
      : "Check the **Leaderboard** page for the current #1 model — rankings refresh every 4 hours.";
  }

  if (/price|pricing|how much|expensive|cheap/i.test(eq)) {
    const p = models.filter(m => m.promptPrice != null).sort((a, b) => (a.promptPrice || 999) - (b.promptPrice || 999)).slice(0, 10);
    return "**Pricing (per 1M tokens):**\n\n" + p.map(m => `- ${m.name}: Input $${m.promptPrice} / Output $${m.completionPrice || '?'}`).join('\n');
  }

  // ---- "Tell me about <model>" / "What is <model>" ----
  const modelMatch = eq.match(MODEL_DETAIL_PATTERN);
  if (modelMatch) {
    const m = findModel(modelMatch[1], models);
    if (m) {
      return `**${m.name}** (${vendor(m)})\n\nIntelligence: ${m.intelligenceIndex || 'N/A'}\nSpeed: ${m.aaSpeed || 'N/A'} t/s\nCost/Task: $${m.aaCostPerTask || 'N/A'}\nCoding: ${m.codingIndex || 'N/A'}\nContext: ${m.context || 'N/A'}\nParams: ${m.params || 'N/A'}\nLicense: ${m.license || 'N/A'}\nOpen Weight: ${m.openWeights || m.family === 'open-weights' ? 'Yes' : 'No'}` + (m.description ? `\n\n${m.description}` : '');
    }
  }

  // ---- Concept explainers (no data needed) ----
  const explainer = explainerFor(eq);
  if (explainer) return explainer;

  // ---- Fallback: smart retrieval from all data ----
  return smartRetrieve(effective);
}

// ---------------------------------------------------------------------------
// Smart retrieval-based answer generation
// ---------------------------------------------------------------------------

function smartRetrieve(query: string): string {
  const results = retrieve(query, 60);
  const newsResults = results.filter(r => r.type === 'news');
  const modelResults = results.filter(r => r.type === 'model');
  const otherResults = results.filter(r => !['news', 'model'].includes(r.type));

  const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;

  // Weak match — the data doesn't really address this question
  if (maxScore < 0.06 || results.length === 0) {
    const words = query.split(/\s+/).filter(w => w.length > 3).slice(0, 4);
    const topic = words.join(' ') || query;
    return `Great question! I scoured our database of **2,500+ news articles** and **600+ models**, but "${topic}" doesn't have strong coverage in our dataset yet.

**Here's what I can answer right now:**
- **Models** — "Tell me about Claude Opus 5", "Best open-weight model for local use", "Compare two models"
- **News** — "What's new in AI this week", "Latest funding rounds"
- **How AI works** — transformers, RAG, fine-tuning, diffusion, context windows, AI safety

If you share more about what you're trying to find, I'll dig deeper into our live data.`;
  }

  const parts: string[] = [];

  const wantsNews = isNewsQuery(query) && newsResults.length >= modelResults.length;

  if (wantsNews && newsResults.length > 0) {
    parts.push("**Latest AI News:**\n");
    parts.push(formatNewsResults(newsResults, query));
  }

  if (modelResults.length > 0) {
    if (parts.length > 0) parts.push('\n---\n');
    parts.push("**Related Models:**\n");
    parts.push(formatModelResults(modelResults));
  }

  if (otherResults.length > 0) {
    if (parts.length > 0) parts.push('\n---\n');
    const typeLabels: Record<string, string> = { t2i: 'Text-to-Image', t2v: 'Text-to-Video', i2v: 'Image-to-Video', aa: 'Artificial Analysis' };
    const grouped = new Map<string, RetrievedItem[]>();
    for (const r of otherResults) {
      const label = typeLabels[r.type] || r.type;
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label)!.push(r);
    }
    for (const [label, items] of grouped) {
      const ordered = [...items].sort((a, b) => ((a.meta.rank as number) || 999) - ((b.meta.rank as number) || 999));
      parts.push(`**${label} Models:**\n`);
      parts.push(ordered.slice(0, 3).map((item, i) => {
        const m = item.meta as any;
        return `${i + 1}. **${m.name}** (${m.provider || m.creator || 'Unknown'}) — ${item.text.slice(0, 100)}`;
      }).join('\n'));
    }
  }

  if (parts.length > 0) {
    return parts.join('\n');
  }

  return "I couldn't find a strong match for that. Try asking about a specific model, recent AI news, pricing, or a comparison — e.g. 'Best open-weight model', 'Tell me about Gemini 3', or 'What's new in AI this week'.";
}