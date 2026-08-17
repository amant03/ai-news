/**
 * AI Supply and Demand flows between countries.
 * Sources: Stanford AI Index 2025, OECD AI Compute, BIS Working Paper 1343.
 * Compiled for hierarchical edge bundling visualization.
 */

export interface AIFlow {
  source: string;
  target: string;
  value: number;       // relative weight (1–100)
  category: 'investment' | 'compute' | 'talent' | 'models';
  label: string;
}

export interface AICountryNode {
  id: string;
  region: string;
  shortLabel: string;
  // Supply side (production capacity)
  computeSupply: number;   // GPU availability tier (0-100)
  modelSupply: number;     // number of frontier models produced
  investmentSupply: number; // VC investment in AI ($B)
  // Demand side (adoption)
  talentDemand: number;    // AI talent concentration
  adoptionDemand: number;  // enterprise AI adoption rate
}

export const AI_FLOWS: AIFlow[] = [
  // ─── Investment flows ($B) ───
  { source: 'United States', target: 'China', value: 2.1, category: 'investment', label: '$2.1B VC investment' },
  { source: 'United States', target: 'United Kingdom', value: 3.8, category: 'investment', label: '$3.8B VC investment' },
  { source: 'United States', target: 'India', value: 1.9, category: 'investment', label: '$1.9B VC investment' },
  { source: 'United States', target: 'Israel', value: 2.4, category: 'investment', label: '$2.4B VC investment' },
  { source: 'United States', target: 'Canada', value: 1.6, category: 'investment', label: '$1.6B VC investment' },
  { source: 'United States', target: 'France', value: 0.9, category: 'investment', label: '$0.9B VC investment' },
  { source: 'United States', target: 'Germany', value: 0.7, category: 'investment', label: '$0.7B VC investment' },
  { source: 'United States', target: 'Japan', value: 0.6, category: 'investment', label: '$0.6B VC investment' },
  { source: 'United States', target: 'Singapore', value: 0.5, category: 'investment', label: '$0.5B VC investment' },
  { source: 'United States', target: 'Saudi Arabia', value: 0.4, category: 'investment', label: '$0.4B VC investment' },
  { source: 'China', target: 'Singapore', value: 1.2, category: 'investment', label: '$1.2B VC investment' },
  { source: 'China', target: 'Southeast Asia', value: 0.8, category: 'investment', label: '$0.8B VC investment' },
  { source: 'China', target: 'Middle East', value: 0.6, category: 'investment', label: '$0.6B VC investment' },
  { source: 'United Kingdom', target: 'France', value: 0.4, category: 'investment', label: '$0.4B VC investment' },
  { source: 'United Kingdom', target: 'Germany', value: 0.3, category: 'investment', label: '$0.3B VC investment' },
  { source: 'Japan', target: 'Southeast Asia', value: 0.3, category: 'investment', label: '$0.3B VC investment' },

  // ─── Compute supply flows (GPU shipments, relative) ───
  { source: 'United States', target: 'Global', value: 30, category: 'compute', label: 'NVIDIA GPU exports' },
  { source: 'South Korea', target: 'United States', value: 15, category: 'compute', label: 'Samsung HBM memory' },
  { source: 'Japan', target: 'United States', value: 10, category: 'compute', label: 'Tokyo Electron equipment' },
  { source: 'Netherlands', target: 'Global', value: 12, category: 'compute', label: 'ASML lithography' },
  { source: 'Taiwan', target: 'United States', value: 20, category: 'compute', label: 'TSMC chip manufacturing' },
  { source: 'Taiwan', target: 'China', value: 8, category: 'compute', label: 'TSMC chip supply' },
  { source: 'United States', target: 'China', value: 5, category: 'compute', label: 'Restricted GPU exports' },
  { source: 'United States', target: 'India', value: 6, category: 'compute', label: 'Cloud GPU allocation' },
  { source: 'United States', target: 'Europe', value: 8, category: 'compute', label: 'Azure/AWS GPU regions' },
  { source: 'United States', target: 'Japan', value: 5, category: 'compute', label: 'Cloud GPU allocation' },
  { source: 'United States', target: 'Saudi Arabia', value: 4, category: 'compute', label: 'Cloud infrastructure' },

  // ─── Talent flows (relative migration) ───
  { source: 'India', target: 'United States', value: 18, category: 'talent', label: 'AI talent migration' },
  { source: 'China', target: 'United States', value: 12, category: 'talent', label: 'AI talent migration' },
  { source: 'China', target: 'Canada', value: 4, category: 'talent', label: 'AI talent migration' },
  { source: 'United Kingdom', target: 'United States', value: 5, category: 'talent', label: 'AI talent migration' },
  { source: 'Europe', target: 'United States', value: 6, category: 'talent', label: 'AI talent migration' },
  { source: 'India', target: 'United Kingdom', value: 3, category: 'talent', label: 'AI talent migration' },
  { source: 'India', target: 'Canada', value: 2, category: 'talent', label: 'AI talent migration' },
  { source: 'Southeast Asia', target: 'United States', value: 3, category: 'talent', label: 'AI talent migration' },
  { source: 'South Korea', target: 'United States', value: 2, category: 'talent', label: 'AI talent migration' },
  { source: 'Japan', target: 'United States', value: 2, category: 'talent', label: 'AI talent migration' },

  // ─── Model/technology transfers ───
  { source: 'United States', target: 'Global', value: 25, category: 'models', label: 'OpenAI/Anthropic API access' },
  { source: 'United States', target: 'Europe', value: 8, category: 'models', label: 'Model API access' },
  { source: 'United States', target: 'Japan', value: 5, category: 'models', label: 'Model API access' },
  { source: 'United States', target: 'India', value: 6, category: 'models', label: 'Model API access' },
  { source: 'United States', target: 'South Korea', value: 4, category: 'models', label: 'Model API access' },
  { source: 'China', target: 'Southeast Asia', value: 7, category: 'models', label: 'Baidu/Alibaba APIs' },
  { source: 'China', target: 'Middle East', value: 4, category: 'models', label: 'Baidu/Alibaba APIs' },
  { source: 'China', target: 'Africa', value: 3, category: 'models', label: 'Tencent/ByteDance APIs' },
  { source: 'United States', target: 'Middle East', value: 3, category: 'models', label: 'Model API access' },
  { source: 'Europe', target: 'Africa', value: 2, category: 'models', label: 'Mistral open models' },
];

export const AI_COUNTRIES: AICountryNode[] = [
  // North America
  { id: 'United States', region: 'North America', shortLabel: 'US', computeSupply: 95, modelSupply: 85, investmentSupply: 109.1, talentDemand: 90, adoptionDemand: 78 },
  { id: 'Canada', region: 'North America', shortLabel: 'CA', computeSupply: 35, modelSupply: 15, investmentSupply: 3.2, talentDemand: 45, adoptionDemand: 55 },
  // Europe
  { id: 'United Kingdom', region: 'Europe', shortLabel: 'UK', computeSupply: 30, modelSupply: 20, investmentSupply: 4.5, talentDemand: 55, adoptionDemand: 60 },
  { id: 'France', region: 'Europe', shortLabel: 'FR', computeSupply: 25, modelSupply: 18, investmentSupply: 3.8, talentDemand: 40, adoptionDemand: 45 },
  { id: 'Germany', region: 'Europe', shortLabel: 'DE', computeSupply: 28, modelSupply: 10, investmentSupply: 2.9, talentDemand: 42, adoptionDemand: 50 },
  // Asia-Pacific
  { id: 'China', region: 'Asia-Pacific', shortLabel: 'CN', computeSupply: 70, modelSupply: 65, investmentSupply: 9.3, talentDemand: 70, adoptionDemand: 72 },
  { id: 'Japan', region: 'Asia-Pacific', shortLabel: 'JP', computeSupply: 40, modelSupply: 12, investmentSupply: 2.1, talentDemand: 35, adoptionDemand: 40 },
  { id: 'South Korea', region: 'Asia-Pacific', shortLabel: 'KR', computeSupply: 45, modelSupply: 8, investmentSupply: 1.8, talentDemand: 38, adoptionDemand: 42 },
  { id: 'India', region: 'Asia-Pacific', shortLabel: 'IN', computeSupply: 20, modelSupply: 10, investmentSupply: 1.25, talentDemand: 60, adoptionDemand: 35 },
  { id: 'Singapore', region: 'Asia-Pacific', shortLabel: 'SG', computeSupply: 22, modelSupply: 5, investmentSupply: 1.5, talentDemand: 35, adoptionDemand: 50 },
  // Middle East
  { id: 'Saudi Arabia', region: 'Middle East', shortLabel: 'SA', computeSupply: 15, modelSupply: 2, investmentSupply: 100, talentDemand: 15, adoptionDemand: 25 },
];

export const REGION_COLORS: Record<string, string> = {
  'North America': '#3b82f6',
  'Europe': '#8b5cf6',
  'Asia-Pacific': '#f97316',
  'Middle East': '#10b981',
};

export const FLOW_CATEGORY_COLORS: Record<string, string> = {
  investment: '#3b82f6',
  compute: '#f97316',
  talent: '#10b981',
  models: '#8b5cf6',
};
