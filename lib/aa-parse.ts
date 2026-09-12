/**
 * Parse Artificial Analysis HTML (Next.js flight payload + JSON-LD) into
 * structured model records. AA pages SSR the full model object into
 * self.__next_f.push(...) so we don't need Puppeteer.
 */

export interface AAParsedModel {
  slug: string;
  name: string;
  shortName?: string;
  provider: string;
  released?: string;
  family?: 'closed' | 'open-weights';
  isReasoning?: boolean;
  params?: string;
  context?: string;
  license?: string;
  intelligenceIndex?: number;
  codingIndex?: number;
  agenticIndex?: number;
  aaSpeed?: number;
  aaCostPerTask?: number;
  aaVerbosity?: number;
  aaLatency?: number;
  promptPrice?: number;
  completionPrice?: number;
  cacheHitPrice?: number;
  description?: string;
  inputModalities?: string;
  outputModalities?: string;
  hostModelCount?: number;
  evals?: Record<string, number>;
}

const HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function fetchAAHtml(url: string, timeoutMs = 35000): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`AA HTTP ${res.status} for ${url}`);
  return res.text();
}

export function flightText(html: string): string {
  const marker = 'self.__next_f.push(';
  let from = 0;
  let text = '';
  while (true) {
    const i = html.indexOf(marker, from);
    if (i < 0) break;
    const start = i + marker.length;
    const end = html.indexOf(')</script>', start);
    if (end < 0) break;
    const chunk = html.slice(start, end);
    from = end + 1;
    try {
      const parsed = JSON.parse(chunk) as unknown;
      if (Array.isArray(parsed) && typeof parsed[1] === 'string') text += parsed[1] + '\n';
      else text += JSON.stringify(parsed) + '\n';
    } catch {
      text += chunk + '\n';
    }
  }
  return text;
}

function extractJsonObject(src: string, startKey: string): string | null {
  const start = src.indexOf(startKey);
  if (start < 0) return null;
  const brace = src.indexOf('{', start);
  if (brace < 0) return null;
  let depth = 0;
  for (let j = brace; j < src.length; j++) {
    const ch = src[j];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(brace, j + 1);
    }
  }
  return null;
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = parseFloat(v);
    return isFinite(n) ? n : undefined;
  }
  return undefined;
}

function formatContext(tokens?: number): string | undefined {
  if (!tokens) return undefined;
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return m >= 10 ? `${Math.round(m)}M` : `${m.toFixed(m % 1 === 0 ? 0 : 1)}M`;
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

function formatParams(b?: number): string | undefined {
  if (b == null || !isFinite(b)) return undefined;
  if (b >= 1000) return `${(b / 1000).toFixed(1)}T`;
  if (b >= 1) return `${b >= 10 ? Math.round(b) : b.toFixed(1)}B`;
  return `${Math.round(b * 1000)}M`;
}

function modalities(flags: Array<[boolean | undefined, string]>): string | undefined {
  const on = flags.filter(([v]) => v).map(([, l]) => l);
  return on.length ? on.join(', ') : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromCurrentModel(raw: any): AAParsedModel | null {
  if (!raw || typeof raw !== 'object') return null;
  const slug = String(raw.slug || '').trim();
  const name = String(raw.name || raw.shortName || '').trim();
  if (!slug || !name) return null;

  const speed = num(raw.timescaleData?.medianOutputSpeed) ?? num(raw.medianOutputSpeed);
  const latency = num(raw.timescaleData?.medianTimeToFirstChunk) ?? num(raw.timeToFirstAnswerToken?.total);
  const cost = num(raw.intelligenceIndexCostPerTask?.cost?.total);
  const verbosity =
    num(raw.canonicalIntelligenceIndexTokenCount?.output) ??
    num(raw.intelligenceIndexOutputTokensPerTask?.output);
  const creator = raw.creator?.name || raw.model_creator?.name || '';
  const ctx = num(raw.contextWindowTokens);
  const params = num(raw.parameters) ?? num(raw.inferenceParametersActiveBillions);

  const evals: Record<string, number> = {};
  const evalKeys: Array<[string, string]> = [
    ['hle', 'hle'],
    ['gpqa', 'gpqa'],
    ['scicode', 'scicode'],
    ['lcr', 'lcr'],
    ['critpt', 'critpt'],
    ['gdpvalNormalized', 'gdpval'],
    ['terminalbenchV40', 'terminalbench'],
    ['omniscience', 'omniscience'],
    ['analystAgent', 'analystAgent'],
    ['automationBenchPartialScore', 'automationBench'],
    ['ifbench', 'ifbench'],
    ['tauBanking', 'tauBanking'],
    ['mmmuPro', 'mmmuPro'],
    ['livecodebench', 'livecodebench'],
  ];
  for (const [k, out] of evalKeys) {
    const v = num(raw[k]);
    if (v !== undefined) evals[out] = v;
  }

  // Openness: only set when the payload says so explicitly. A missing signal
  // must stay undefined (downstream detectFamily decides) — defaulting to
  // 'closed' once poisoned DeepSeek rows as closed.
  const openCat = typeof raw.openSourceCategorization === 'string' ? raw.openSourceCategorization : '';
  const openKnown = raw.isOpenWeights === true || openCat === 'open-weights';
  const closedKnown = raw.isOpenWeights === false || (openCat !== '' && openCat !== 'open-weights');

  return {
    slug,
    name,
    shortName: raw.shortName ? String(raw.shortName) : undefined,
    provider: String(creator || 'Unknown'),
    released: raw.releaseDate ? String(raw.releaseDate) : undefined,
    family: openKnown ? 'open-weights' : closedKnown ? 'closed' : undefined,
    isReasoning: raw.isReasoning === true,
    params: formatParams(params),
    context: formatContext(ctx),
    license: raw.licenseName ? String(raw.licenseName) : undefined,
    intelligenceIndex: num(raw.intelligenceIndex),
    aaSpeed: speed,
    aaCostPerTask: cost,
    aaVerbosity: verbosity,
    aaLatency: latency,
    promptPrice: num(raw.price1mInputTokens),
    completionPrice: num(raw.price1mOutputTokens),
    cacheHitPrice: num(raw.cacheHitPrice),
    inputModalities: modalities([
      [raw.inputModalityText, 'text'],
      [raw.inputModalityImage, 'image'],
      [raw.inputModalitySpeech, 'speech'],
      [raw.inputModalityVideo, 'video'],
    ]),
    outputModalities: modalities([
      [raw.outputModalityText, 'text'],
      [raw.outputModalityImage, 'image'],
      [raw.outputModalitySpeech, 'speech'],
      [raw.outputModalityVideo, 'video'],
    ]),
    hostModelCount: num(raw.hostModelCount),
    evals: Object.keys(evals).length ? evals : undefined,
  };
}

export function parseCurrentModel(html: string): AAParsedModel | null {
  const text = flightText(html);
  const raw = extractJsonObject(text, '"currentModel":');
  if (!raw) return null;
  try {
    return fromCurrentModel(JSON.parse(raw));
  } catch {
    return null;
  }
}

interface JsonLdDataset {
  data?: Array<Record<string, unknown>>;
}

function slugFromDetailsUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const m = url.match(/\/models\/([a-z0-9-]+)\/?$/i);
  return m ? m[1] : undefined;
}

export function parseJsonLdCharts(html: string): AAParsedModel[] {
  const bySlug = new Map<string, AAParsedModel>();
  const upsert = (slug: string, patch: Partial<AAParsedModel> & { name?: string }) => {
    const prev = bySlug.get(slug);
    const name = patch.name || prev?.name || slug;
    bySlug.set(slug, {
      provider: patch.provider || prev?.provider || 'Unknown',
      family: patch.family || prev?.family || undefined,
      ...prev,
      ...patch,
      slug,
      name,
    });
  };

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const block of blocks) {
    let obj: JsonLdDataset;
    try {
      obj = JSON.parse(block[1]) as JsonLdDataset;
    } catch {
      continue;
    }
    if (!Array.isArray(obj.data)) continue;
    for (const row of obj.data) {
      const slug = slugFromDetailsUrl(row.detailsUrl);
      if (!slug) continue;
      const name = typeof row.label === 'string' ? row.label : undefined;
      const intel = num(row.artificialAnalysisIntelligenceIndex ?? row.intelligenceIndex);
      const speed = num(row.medianOutputSpeed ?? row.outputSpeed);
      const cost = num(row.costPerIntelligenceIndexTask);
      const patch: Partial<AAParsedModel> = { name };
      if (intel !== undefined) patch.intelligenceIndex = intel;
      if (speed !== undefined) patch.aaSpeed = speed;
      if (cost !== undefined) patch.aaCostPerTask = cost;
      if (typeof row.answer === 'number' && typeof row.reasoning === 'number' && !cost) {
        // stacked cost-per-task rows
        const total =
          (num(row.answer) || 0) +
          (num(row.reasoning) || 0) +
          (num(row.cacheWrite) || 0) +
          (num(row.cacheHit) || 0) +
          (num(row.input) || 0);
        if (total > 0) patch.aaCostPerTask = total;
      }
      upsert(slug, patch);
    }
  }
  return [...bySlug.values()];
}

/** Pull every currentModel-shaped object out of a flight payload. */
export function parseFlightModels(html: string): AAParsedModel[] {
  const text = flightText(html);
  const bySlug = new Map<string, AAParsedModel>();

  const marker = '"slug":"';
  let from = 0;
  while (true) {
    const i = text.indexOf(marker, from);
    if (i < 0) break;
    from = i + marker.length;
    // Only consider objects that also have intelligenceIndex nearby
    const window = text.slice(Math.max(0, i - 80), i + 400);
    if (!window.includes('"name":')) continue;

    let start = -1;
    let depth = 0;
    for (let k = i; k >= Math.max(0, i - 4000); k--) {
      if (text[k] === '}') depth++;
      else if (text[k] === '{') {
        if (depth === 0) {
          start = k;
          break;
        }
        depth--;
      }
    }
    if (start < 0) continue;
    depth = 0;
    let end = -1;
    for (let k = start; k < Math.min(text.length, start + 20000); k++) {
      if (text[k] === '{') depth++;
      else if (text[k] === '}') {
        depth--;
        if (depth === 0) {
          end = k + 1;
          break;
        }
      }
    }
    if (end < 0) continue;
    const raw = text.slice(start, end);
    if (!raw.includes('"intelligenceIndex"') && !raw.includes('"timescaleData"')) continue;
    try {
      const parsed = fromCurrentModel(JSON.parse(raw));
      if (!parsed) continue;
      const prev = bySlug.get(parsed.slug);
      bySlug.set(parsed.slug, prev ? { ...prev, ...parsed } : parsed);
    } catch {
      /* skip broken windows */
    }
  }
  return [...bySlug.values()];
}

export function mergeParsed(models: AAParsedModel[][]): AAParsedModel[] {
  const bySlug = new Map<string, AAParsedModel>();
  for (const list of models) {
    for (const m of list) {
      const prev = bySlug.get(m.slug);
      if (!prev) {
        bySlug.set(m.slug, m);
        continue;
      }
      bySlug.set(m.slug, {
        ...prev,
        ...Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined && v !== null && v !== '')),
        evals: { ...(prev.evals || {}), ...(m.evals || {}) },
      } as AAParsedModel);
    }
  }
  return [...bySlug.values()];
}

export function slugsFromHtml(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/\/models\/([a-z0-9][a-z0-9-]{2,})/gi)) {
    const slug = m[1].toLowerCase();
    if (slug === 'leaderboard' || slug === 'providers') continue;
    found.add(slug);
  }
  return [...found];
}
