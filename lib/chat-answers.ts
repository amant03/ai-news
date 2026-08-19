import { readFileSync } from 'fs';
import { join } from 'path';

interface Model {
  name: string;
  provider: string;
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
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'models.json'), 'utf-8');
    const data = JSON.parse(raw);
    return data.models || [];
  } catch {
    return [];
  }
}

function findModel(query: string, models: Model[]): Model | null {
  const q = query.toLowerCase().trim();
  let m = models.find(m => m.name.toLowerCase() === q);
  if (m) return m;
  m = models.find(m => m.name.toLowerCase().includes(q));
  if (m) return m;
  m = models.find(m => m.provider.toLowerCase().includes(q));
  return m || null;
}

function fmt(m: Model): string {
  const p = [`${m.name} (${m.provider})`];
  if (m.intelligenceIndex != null) p.push(`Intel: ${m.intelligenceIndex}`);
  if (m.aaSpeed != null) p.push(`Speed: ${m.aaSpeed} t/s`);
  if (m.aaCostPerTask != null) p.push(`Cost: $${m.aaCostPerTask}/task`);
  if (m.context) p.push(`Ctx: ${m.context}`);
  if (m.params) p.push(`Params: ${m.params}`);
  return p.join(' | ');
}

export function answerQuestion(question: string): string {
  const models = loadModels();
  const q = question.toLowerCase();

  if (/^(hi|hello|hey|howdy|greetings)/i.test(q)) {
    return "Hello! I'm AI Pulse's model advisor. Ask me about:\n\n- Best model for your use case\n- Compare models by intelligence, speed, or cost\n- Recommendations within your budget\n- Model specs and pricing\n\nWhat would you like to know?";
  }

  if (/what is (this|ai pulse|the site)/i.test(q)) {
    return "AI Pulse tracks 600+ AI models with benchmarks from Artificial Analysis — intelligence, speed, cost, and more.";
  }

  // Specific use cases BEFORE general "best model"
  if (/cod(e|ing)|program|software|develop|debug|script/i.test(q)) {
    const c = models.filter(m => m.codingIndex != null).sort((a, b) => (b.codingIndex || 0) - (a.codingIndex || 0)).slice(0, 5);
    if (c.length) return "**Top 5 Coding Models:**\n\n" + c.map((m, i) => `${i + 1}. ${fmt(m)} | Coding Index: ${m.codingIndex}`).join('\n\n');
    // Fallback: use intelligence as proxy
    const top = models.filter(m => m.intelligenceIndex != null).sort((a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0)).slice(0, 5);
    return "**Top 5 Models for Coding (by intelligence):**\n\n" + top.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/chat|convers|talk|discuss/i.test(q)) {
    const c = models.filter(m => m.intelligenceIndex != null && m.aaSpeed != null).sort((a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0)).slice(0, 5);
    return "**Best for Chat:**\n\n" + c.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/vision|image|see|visual|multimodal/i.test(q)) {
    const v = models.filter(m => m.name.toLowerCase().includes('vision') || m.name.toLowerCase().includes('gpt') || m.name.toLowerCase().includes('gemini') || m.name.toLowerCase().includes('claude')).sort((a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0)).slice(0, 5);
    return "**Top Vision/Multimodal:**\n\n" + v.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/fastest|speed|quick|low latency/i.test(q)) {
    const f = models.filter(m => m.aaSpeed != null).sort((a, b) => (b.aaSpeed || 0) - (a.aaSpeed || 0)).slice(0, 5);
    return "**Top 5 Fastest (tokens/sec):**\n\n" + f.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/cheapest|lowest cost|budget|affordable/i.test(q)) {
    const c = models.filter(m => m.aaCostPerTask != null).sort((a, b) => (a.aaCostPerTask || 999) - (b.aaCostPerTask || 999)).slice(0, 5);
    return "**Top 5 Cheapest (per task):**\n\n" + c.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  if (/open.?weight|self.?host|local|run locally|on.?premise/i.test(q)) {
    const o = models.filter(m => m.openWeights === true).slice(0, 5);
    return o.length ? "**Top 5 Open-Weight Models:**\n\n" + o.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n') + "\n\nCan be self-hosted and fine-tuned." : "No open-weight models found.";
  }

  if (/quantiz|gguf|ggml|awq|gptq/i.test(q)) {
    return "**Quantization Guide:**\n\n- **GGUF**: Best for CPU/llama.cpp. Use Q4_K_M for balance, Q8 for quality.\n- **AWQ**: Best for GPU inference. 4-bit quant with minimal quality loss.\n- **GPTQ**: Older GPU quantization. Good but AWQ preferred.\n- **BitsAndBytes**: Easy 4/8-bit loading in Python.\n\nFor self-hosted models, check HuggingFace for quantized versions.";
  }

  if (/price|cost|pricing|how much|expensive/i.test(q)) {
    const p = models.filter(m => m.promptPrice != null).sort((a, b) => (a.promptPrice || 999) - (b.promptPrice || 999)).slice(0, 10);
    return "**Pricing (per 1M tokens):**\n\n" + p.map(m => `- ${m.name}: Input $${m.promptPrice} / Output $${m.completionPrice || '?'}`).join('\n');
  }

  if (/compare|vs|versus|difference between/i.test(q)) {
    const words = q.split(/\s+/);
    const skip = new Set(['compare', 'vs', 'versus', 'between', 'the', 'and', 'with', 'model', 'models']);
    const names = words.filter(w => w.length > 3 && !skip.has(w));
    const found = names.map(n => findModel(n, models)).filter(Boolean) as Model[];
    if (found.length >= 2) {
      const a = found[0], b = found[1];
      return `**${a.name} vs ${b.name}:**\n\n| | ${a.name} | ${b.name} |\n|---|---|---|\n| Intelligence | ${a.intelligenceIndex || 'N/A'} | ${b.intelligenceIndex || 'N/A'} |\n| Speed | ${a.aaSpeed || 'N/A'} t/s | ${b.aaSpeed || 'N/A'} t/s |\n| Cost/Task | $${a.aaCostPerTask || 'N/A'} | $${b.aaCostPerTask || 'N/A'} |\n| Context | ${a.context || 'N/A'} | ${b.context || 'N/A'} |\n| Provider | ${a.provider} | ${b.provider} |`;
    }
    return "Provide two model names. Example: 'Compare Claude Opus 5 and GPT-5.6 Sol'";
  }

  if (/recommend|suggest|which.*should|what.*best for|use case/i.test(q)) {
    return "**Recommendations by Use Case:**\n\n- **Coding:** Claude Opus 5, GPT-5.6 Sol, Gemini 3.7 Flash\n- **Chat:** Claude Opus 5, Grok 4.6, GPT-5.6 Sol\n- **Budget:** Gemini 3.7 Flash ($0.75/task), Kimi K3 ($0.84/task)\n- **Speed:** Gemini 3.7 Flash (340 t/s)\n- **Self-hosted:** Qwen3.5 397B, DeepSeek V4 Pro\n\nTell me your specific use case and budget!";
  }

  // Generic "best model" LAST
  if (/best model|top model|most intelligent|highest intelligence/i.test(q)) {
    const top = models.filter(m => m.intelligenceIndex != null).sort((a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0)).slice(0, 5);
    return "**Top 5 Most Intelligent:**\n\n" + top.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n');
  }

  const modelMatch = q.match(/(?:tell me about|info on|details for|what is|about)\s+(.+)/i);
  if (modelMatch) {
    const m = findModel(modelMatch[1], models);
    if (m) {
      return `**${m.name}** (${m.provider})\n\nIntelligence: ${m.intelligenceIndex || 'N/A'}\nSpeed: ${m.aaSpeed || 'N/A'} t/s\nCost/Task: $${m.aaCostPerTask || 'N/A'}\nContext: ${m.context || 'N/A'}\nParams: ${m.params || 'N/A'}\nLicense: ${m.license || 'N/A'}\nOpen Weight: ${m.openWeights ? 'Yes' : 'No'}` + (m.description ? `\n\n${m.description}` : '');
    }
    return `Model "${modelMatch[1]}" not found.`;
  }

  if (/budget|afford|spend|pay/i.test(q)) {
    const cheap = models.filter(m => m.aaCostPerTask != null).sort((a, b) => (a.aaCostPerTask || 999) - (b.aaCostPerTask || 999)).slice(0, 5);
    return "**Most Affordable Models:**\n\n" + cheap.map((m, i) => `${i + 1}. ${fmt(m)}`).join('\n\n') + "\n\nTell me your budget for a specific recommendation!";
  }

  if (/quantiz|gguf|ggml|awq|gptq/i.test(q)) {
    return "**Quantization Guide:**\n\n- **GGUF**: Best for CPU/llama.cpp. Use Q4_K_M for balance, Q8 for quality.\n- **AWQ**: Best for GPU inference. 4-bit quant with minimal quality loss.\n- **GPTQ**: Older GPU quantization. Good but AWQ preferred.\n- **BitsAndBytes**: Easy 4/8-bit loading in Python.\n\nFor self-hosted models, check HuggingFace for quantized versions.";
  }

  return `I can help with:\n\n- **"Best model for coding"** — recommendations by use case\n- **"Compare Claude and GPT"** — side-by-side comparison\n- **"Cheapest models"** — budget-friendly options\n- **"Fastest models"** — speed rankings\n- **"Tell me about Gemini"** — specific model details\n- **"Open weight models"** — self-hostable options\n- **"Quantization guide"** — GGUF, AWQ, GPTQ info\n\nWhat would you like to know?`;
}
