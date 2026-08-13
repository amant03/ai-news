import { NewsItem, Domain } from './types';
import { classifyDomain } from './categorize';
import { MODELS, PROVIDER_COLORS } from './models';

/**
 * Lightweight, deterministic sentiment analysis over the news store.
 * No external LLM required — we score headlines/summaries against a
 * curated lexicon of positive/negative/amplifier/negator signals, then
 * aggregate into per-model mood, landscape mood, and trends.
 *
 * This is "sentiment from what we already scrape" — Google News, RSS,
 * X/Twitter, Hacker News, Reddit, arXiv, GitHub — i.e. the internet's
 * AI conversation, sampled across 35+ sources.
 */

const POSITIVE = [
  'breakthrough', 'record', 'state-of-the-art', 'sota', 'best-in-class',
  'tops', 'beats', 'outperforms', 'leads', 'wins', 'surges', 'soars',
  'soaring', 'surge', 'jump', 'jumps', 'boost', 'boosted', 'unlock', 'unlocks',
  'milestone', 'breakthrough', 'accelerat', 'powerful', 'strong', 'robust',
  'impressive', 'impress', 'amazing', 'excellent', 'great', 'promising',
  'open-source', 'free', 'cheaper', 'faster', 'efficient', 'launch', 'launches',
  'releases', 'released', 'introduces', 'introducing', 'unveils', 'unveiled',
  'debuts', 'available', 'new', 'advance', 'advances', 'gains', 'gain',
  'improves', 'improved', 'improvement', 'upgrade', 'upgrades', 'adoption',
  'partnership', 'partners', 'funded', 'raises', 'raised', 'round', 'growth',
  'growing', 'profit', 'profitable', 'record', 'best', 'top', 'lead', 'leading',
  'dominant', 'dominates', 'momentum', 'buzz', 'popular', 'adopted',
];

const NEGATIVE = [
  'fail', 'fails', 'failed', 'failure', 'error', 'bug', 'bugs', 'crash',
  'crashes', 'broken', 'broke', 'downgrade', 'down', 'drop', 'drops', 'dropped',
  'fall', 'falls', 'fell', 'plunge', 'plunges', 'plunged', 'slump', 'slumps',
  'worry', 'worries', 'worrying', 'concern', 'concerns', 'concerned', 'risk',
  'risks', 'danger', 'dangerous', 'threat', 'threatens', 'harm', 'harms',
  'hurt', 'hurts', 'lawsuit', 'sues', 'sued', 'ban', 'banned', 'block', 'blocks',
  'blocked', 'restrict', 'restricts', 'restricted', 'limit', 'limits', 'limited',
  'criticiz', 'criticis', 'backlash', 'pushback', 'reject', 'rejects', 'rejected',
  'lose', 'loses', 'lost', 'layoff', 'layoffs', 'fired', 'scandal', 'leak',
  'leaked', 'breach', 'breached', 'hack', 'hacked', 'hackers', 'malware',
  'ransomware', 'vulnerability', 'vulnerabilities', 'exploit', 'exploits',
  'jailbreak', 'abuse', 'misuse', 'bias', 'biased', 'hallucinat', 'overhyped',
  'hype', 'questionable', 'uncertain', 'unclear', 'problem', 'problems',
  'struggle', 'struggles', 'struggling', 'delay', 'delays', 'delayed',
  'shortage', 'shortages', 'outage', 'outages', 'censorship', 'surveillance',
];

const NEGATORS = ['no', 'not', 'don\'t', "doesn't", "isn't", 'never', 'without', 'hardly', 'barely'];
const AMPLIFIERS = ['very', 'extremely', 'really', 'massively', 'hugely', 'significantly', 'major'];

export interface SentimentScore {
  score: number;          // -1..1 (weighted)
  positive: number;
  negative: number;
  neutral: number;
  count: number;
}

export interface ModelSentiment {
  id: string;
  name: string;
  provider: string;
  color: string;
  mentions: number;
  sentiment: SentimentScore;
  trend: number;          // recent period vs prior period score shift
  mood: 'bullish' | 'bearish' | 'neutral';
  hot: number;            // mention velocity (last 48h / total)
}

export interface LandscapeMood {
  score: number;
  mood: 'euphoric' | 'bullish' | 'neutral' | 'cautious' | 'bearish';
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  topPositive: string[];
  topNegative: string[];
}

export interface SentimentReport {
  landscape: LandscapeMood;
  models: ModelSentiment[];
  domains: Partial<Record<Domain, SentimentScore>>;
  updatedAt: string;
}

/** Score a single text snippet. Returns -1..1. */
export function scoreText(text: string): number {
  const tokens = text.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
  let score = 0;
  let hits = 0;
  let negate = false;
  let amplify = 1;

  for (const tok of tokens) {
    if (NEGATORS.includes(tok)) {
      negate = true;
      continue;
    }
    if (AMPLIFIERS.includes(tok)) {
      amplify = 2;
      continue;
    }
    let w = 0;
    if (POSITIVE.some(p => tok.startsWith(p) || tok.includes(p))) w = 1;
    else if (NEGATIVE.some(n => tok.startsWith(n) || tok.includes(n))) w = -1;
    if (w !== 0) {
      let val = w * amplify;
      if (negate) val = -val;
      score += val;
      hits++;
      negate = false;
      amplify = 1;
    }
  }
  if (hits === 0) return 0;
  const raw = score / hits;
  // Compress toward zero so a single mention can't dominate.
  return Math.max(-1, Math.min(1, raw * Math.sqrt(hits) / 2));
}

function pickProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] || '#64748b';
}

export function analyzeSentiment(items: NewsItem[]): SentimentReport {
  const now = Date.now();
  const recentStart = now - 7 * 24 * 60 * 60 * 1000;
  const priorStart = now - 14 * 24 * 60 * 60 * 1000;

  const valid = items.filter(i => i.title && i.title.length > 10);
  const landscape = { score: 0, positive: 0, negative: 0, neutral: 0, total: 0, topPositive: [] as string[], topNegative: [] as string[] };

  const domainScores: Partial<Record<Domain, SentimentScore>> = {};
  const domainInit = (d: Domain): SentimentScore => (domainScores[d] ??= { score: 0, positive: 0, negative: 0, neutral: 0, count: 0 });

  const posScored: Array<{ title: string; score: number }> = [];
  const negScored: Array<{ title: string; score: number }> = [];

  for (const item of valid) {
    const s = scoreText(`${item.title} ${item.summary || ''}`.slice(0, 400));
    const bucket = s > 0.15 ? 'positive' : s < -0.15 ? 'negative' : 'neutral';
    landscape[bucket]++;
    landscape.total++;
    landscape.score += s;

    const d = item.domain || classifyDomain(item.title, item.summary || '');
    const ds = domainInit(d);
    ds[bucket]++;
    ds.count++;
    ds.score += s;

    if (bucket === 'positive') posScored.push({ title: item.title, score: s });
    if (bucket === 'negative') negScored.push({ title: item.title, score: s });
  }

  landscape.score = valid.length ? landscape.score / valid.length : 0;
  const mood: LandscapeMood['mood'] = landscape.score > 0.25 ? 'euphoric' : landscape.score > 0.1 ? 'bullish' : landscape.score > -0.05 ? 'neutral' : landscape.score > -0.2 ? 'cautious' : 'bearish';
  const moodResult: LandscapeMood = {
    ...landscape,
    mood,
    topPositive: posScored.sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.title),
    topNegative: negScored.sort((a, b) => a.score - b.score).slice(0, 3).map(x => x.title),
  };

  for (const d of Object.keys(domainScores) as Domain[]) {
    const ds = domainScores[d]!;
    ds.score = ds.count ? ds.score / ds.count : 0;
  }

  // Per-model sentiment: match mentions across headlines/summaries.
  const modelSentiments: ModelSentiment[] = MODELS.map(m => {
    const lower = m.name.toLowerCase();
    const providerLower = m.provider.toLowerCase();
    const mentioned = valid.filter(i => {
      const t = `${i.title} ${i.summary || ''}`.toLowerCase();
      return t.includes(lower) || (providerLower.length > 2 && new RegExp(`\\b${providerLower}\\b`).test(t));
    });

    let score = 0, positive = 0, negative = 0, neutral = 0;
    let recentScore = 0, recentCount = 0, priorScore = 0, priorCount = 0;
    let hot = 0;

    for (const i of mentioned) {
      const s = scoreText(`${i.title} ${i.summary || ''}`.slice(0, 400));
      score += s;
      const ts = new Date(i.published_at).getTime();
      if (ts >= recentStart) {
        recentScore += s;
        recentCount++;
        if (ts >= now - 48 * 60 * 60 * 1000) hot++;
      } else if (ts >= priorStart) {
        priorScore += s;
        priorCount++;
      }
      if (s > 0.15) positive++;
      else if (s < -0.15) negative++;
      else neutral++;
    }

    const n = mentioned.length;
    const avg = n ? score / n : 0;
    const recentAvg = recentCount ? recentScore / recentCount : avg;
    const priorAvg = priorCount ? priorScore / priorCount : avg;
    const trend = recentCount > 0 ? recentAvg - priorAvg : 0;
    const moodOf: ModelSentiment['mood'] = avg > 0.15 ? 'bullish' : avg < -0.15 ? 'bearish' : 'neutral';

    return {
      id: m.id,
      name: m.name,
      provider: m.provider,
      color: pickProviderColor(m.provider),
      mentions: n,
      sentiment: { score: avg, positive, negative, neutral, count: n },
      trend,
      mood: moodOf,
      hot,
    };
  }).filter(m => m.mentions > 0).sort((a, b) => b.mentions - a.mentions);

  return {
    landscape: moodResult,
    models: modelSentiments,
    domains: domainScores,
    updatedAt: new Date().toISOString(),
  };
}
