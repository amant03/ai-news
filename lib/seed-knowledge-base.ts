import { initDB, upsertNewsItems } from './db';
import { NewsItem } from './types';

const SEED_DATA: NewsItem[] = [
  // GPT-5.6
  {
    source: 'openai',
    source_type: 'web',
    title: 'GPT-5.6 Unveiled: Soul/Terra/Luna Tiers — Blocked by US Government',
    summary: 'OpenAI unveiled GPT-5.6 with three tiers (Soul, Terra, Luna). The Soul model beat Claude on coding benchmarks. US government requested access be limited to vetted partners only due to exceptional cybersecurity capability.',
    content: 'OpenAI unveiled GPT 5.6, its most powerful model ever built — and the US government stepped in before the public could touch it. GPT 5.6 comes in three tiers: Soul (flagship), Terra (balanced at half price), and Luna (fast/cheap). On coding benchmarks, Soul beat Claude\'s frontier model. The US government requested limiting access to vetted partners due to cybersecurity vulnerability discovery capabilities.',
    url: 'https://imfounder.com/science-tech/ai/ai-updates-july-2026-gpt56-claude-ai-inflation/',
    author: 'imfounder',
    category: 'model',
    published_at: '2026-07-08T00:00:00Z',
  },
  // Claude Sonnet 5
  {
    source: 'anthropic',
    source_type: 'web',
    title: 'Claude Sonnet 5 Launches at $2/M — Most Capable Sonnet Yet',
    summary: 'Claude Sonnet 5 launched at $2/M input tokens (introductory through August 31). 63.2% on agentic coding benchmark vs Sonnet 4.6\'s 58.1%. 1M token context window. Available on Anthropic, Bedrock, Vertex, and Azure.',
    content: 'Anthropic launched Claude Sonnet 5 — the most capable Sonnet yet, approaching Opus 4 performance at $2/M input tokens. Agentic coding benchmark: 63.2% vs Sonnet 4.6\'s 58.1%. 1M token context window. Default model for Free and Pro plans.',
    url: 'https://aitoolsrecap.com/Blog/AINewsJuly2026.aspx',
    author: 'AIToolsRecap',
    category: 'model',
    published_at: '2026-07-01T00:00:00Z',
  },
  // Claude Fable 5 returns
  {
    source: 'anthropic',
    source_type: 'web',
    title: 'Claude Fable 5 Returns After Three-Week US Government Ban',
    summary: 'US Commerce Department lifted export controls on Claude Fable 5 after nearly three weeks offline. Enhanced security with new classifier blocking the jailbreak technique that triggered the ban. Access resumes with usage quotas capped through July 7.',
    content: 'The US Commerce Department lifted export controls on Claude Fable 5 on July 1 after nearly three weeks offline. Anthropic\'s flagship model returns with enhanced security including a new classifier blocking the jailbreak technique that triggered the ban.',
    url: 'https://gulfnews.com/technology/claude-fable-5-is-back-after-us-ban-heres-what-changed-1.500595474',
    author: 'Gulf News',
    category: 'model',
    published_at: '2026-07-01T00:00:00Z',
  },
  // Apple sues OpenAI
  {
    source: 'openai',
    source_type: 'web',
    title: 'Apple Sues OpenAI for Trade Secret Theft — Siri Switches to Gemini',
    summary: 'Apple filed trade secret theft lawsuit against OpenAI over IO Products acquisition. New Siri launching autumn 2026 will use Google Gemini instead of ChatGPT. Active litigation is material S-1 risk at OpenAI\'s IPO window.',
    content: 'Apple sued OpenAI for trade secret theft over IO Products acquisition. New Siri launching autumn 2026 will use Gemini, not ChatGPT. Active litigation from Apple is material S-1 risk at OpenAI\'s IPO window. The co-operation phase of Big Tech AI is formally over.',
    url: 'https://aitoolsrecap.com/Blog/ai-news-july-11-2026',
    author: 'AIToolsRecap',
    category: 'policy',
    published_at: '2026-07-10T00:00:00Z',
  },
  // ChatGPT Work
  {
    source: 'openai',
    source_type: 'web',
    title: 'OpenAI Launches ChatGPT Work — Merges Codex + GPT-5.6 Desktop',
    summary: 'Agent-based product powered by Codex + GPT-5.6. Codex and ChatGPT desktop merged into one app: Chat, Codex, Work modes. Agentic workspace market now has four products competing directly.',
    content: 'OpenAI launched ChatGPT Work — merges Codex + GPT-5.6 desktop into one app with Chat, Codex, Work modes. Four agentic workspace competitors now in the market.',
    url: 'https://aitoolsrecap.com/Blog/ai-news-july-11-2026',
    author: 'AIToolsRecap',
    category: 'product',
    published_at: '2026-07-10T00:00:00Z',
  },
  // Meta Muse Spark 1.1
  {
    source: 'meta',
    source_type: 'web',
    title: 'Meta Muse Spark 1.1 Launches — First Paid Meta Model',
    summary: 'Meta launched Muse Spark 1.1 as its first paid model at $1.25/$4.25/M tokens. 1M context window, MCP support. Enters direct competition with GPT, Claude, and Gemini in the paid model market.',
    content: 'Meta Muse Spark 1.1 launched as first paid Meta model ($1.25/$4.25/M, 1M context, MCP support). Agentic workspace market now has four products competing directly.',
    url: 'https://aitoolsrecap.com/Blog/ai-news-july-11-2026',
    author: 'AIToolsRecap',
    category: 'model',
    published_at: '2026-07-10T00:00:00Z',
  },
  // SK Hynix IPO
  {
    source: 'other',
    source_type: 'web',
    title: 'SK Hynix +13% on Nasdaq Debut — $1.27T Market Cap, Largest Foreign IPO Ever',
    summary: 'SK Hynix closed +13% on Nasdaq debut ($168.01, $1.27T market cap, 7x oversubscribed). $26.5B offering was largest-ever US IPO by a foreign company.',
    content: 'SK Hynix rose 13% in first day of trading on Nasdaq, closing at $168.01. $26.5B offering was largest-ever US IPO by a foreign company, 7x oversubscribed. The infrastructure IPO signal Anthropic and OpenAI needed.',
    url: 'https://aitoolsrecap.com/Blog/ai-news-july-11-2026',
    author: 'AIToolsRecap',
    category: 'other',
    published_at: '2026-07-10T00:00:00Z',
  },
  // First autonomous AI ransomware
  {
    source: 'other',
    source_type: 'web',
    title: 'First Autonomous AI Ransomware Attack Documented (JADEPUFFER)',
    summary: 'Sysdig published analysis of first end-to-end autonomous AI ransomware attack. AI agent gained access via Langflow vulnerability, encrypted 1,342 records with unrecoverable key. 600+ payloads, no human operator.',
    content: 'Sysdig published full analysis of first documented end-to-end autonomous AI ransomware attack. AI agent gained initial access through Langflow vulnerability, swept for API keys, pivoted laterally, forged authentication tokens, encrypted 1,342 config records with unrecoverable key. 600+ payloads, no human operator.',
    url: 'https://tech-reader.blog/2026/07/ai-news-sat-july-11-2026.html',
    author: 'Tech-Reader',
    category: 'safety',
    published_at: '2026-07-07T00:00:00Z',
  },
  // US Treasury systemic risk
  {
    source: 'other',
    source_type: 'web',
    title: 'US Treasury Analysts Call AI a Systemic Risk — ECB, UK Follow Suit',
    summary: 'Career Treasury analysts concluded AI boom is too entrenched to unwind quietly. ECB gave European banks until Oct 31 to prove AI resilience. UK put AWS, Google Cloud, Microsoft, Oracle under financial supervision.',
    content: 'Regulators picked a word for AI this week: systemic. Career Treasury analysts concluded the boom is now too entrenched to unwind quietly. ECB gave every significant European bank until October 31 to prove it can take an AI-powered punch. UK put AWS, Google Cloud, Microsoft and Oracle under supervision for firms that can break the financial system.',
    url: 'https://aiweekly.co/issues/treasury-analysts-called-ai-a-systemic-risk-treasury',
    author: 'AI Weekly',
    category: 'policy',
    published_at: '2026-07-13T00:00:00Z',
  },
  // Robotics IPOs
  {
    source: 'other',
    source_type: 'web',
    title: 'Three Humanoid Companies Move Toward Public Markets in One Week',
    summary: 'Agility filed SPAC at $2.5B, Unitree cleared Shanghai IPO, Tesla converting Model S line to Optimus factory. Mistral shipped robot brain with single cheap camera. Robotics sector accelerating toward public markets.',
    content: 'Three humanoid companies moved toward public markets in a single week. Agility filed SPAC at $2.5B, Unitree cleared Shanghai IPO, Tesla started converting Model S line into Optimus factory. Mistral shipped a robot brain that navigates with one cheap camera. Locomotion is getting solved, models still lose basic world knowledge when trained to act.',
    url: 'https://aiweekly.co/issues/robotics-is-moving-fast-ipos-new-models-and-smarter-robots',
    author: 'AI Weekly',
    category: 'product',
    published_at: '2026-07-09T00:00:00Z',
  },
  // AlphaFold Nobel winner joins Anthropic
  {
    source: 'anthropic',
    source_type: 'web',
    title: 'AlphaFold Nobel Winner Joins Anthropic — AI for Science Push',
    summary: 'Nobel Prize-winning AlphaFold researcher joined Anthropic, signaling major push into AI for science and biology. One of several AI wins in the past week.',
    content: 'AlphaFold\'s Nobel winner just joined Anthropic, signaling Anthropic\'s expansion into AI for science and biology.',
    url: 'https://aiweekly.co/issues/alphafolds-nobel-winner-just-joined-anthropic-and-6-more-ai',
    author: 'AI Weekly',
    category: 'research',
    published_at: '2026-07-07T00:00:00Z',
  },
  // NVIDIA BioNeMo
  {
    source: 'other',
    source_type: 'web',
    title: 'NVIDIA BioNeMo Agent Toolkit — AI Runs Real Drug Discovery',
    summary: 'NVIDIA launched BioNeMo Agent Toolkit. AI now runs drug discovery tools: type "design 10 protein binders for PDL1" → agent plans, runs GPU cluster, returns 3D structures. Drug discovery: days to minutes.',
    content: 'NVIDIA launched BioNeMo Agent Toolkit. Until now, AI could read about how to design medicine. Now it can run the scientific tools. Type "design 10 protein binders for PDL1", agent plans every step, runs GPU cluster, drops 3D molecular structures into viewer. OpenAI and Anthropic integrating into toolkit.',
    url: 'https://imfounder.com/science-tech/ai/ai-updates-july-2026-gpt56-claude-ai-inflation/',
    author: 'imfounder',
    category: 'product',
    published_at: '2026-07-06T00:00:00Z',
  },
  // California Anthropic deal
  {
    source: 'anthropic',
    source_type: 'web',
    title: 'California Signs Statewide Anthropic Deal — 50% Discount for All Agencies',
    summary: 'Governor Newsom signed deal giving all California state agencies, cities, and counties access to Claude at 50% discount. Politically notable as federal government simultaneously designated Anthropic a "supply-chain risk."',
    content: 'Governor Gavin Newsom signed a first-of-its-kind deal giving all California state agencies, cities, and counties access to Claude at 50% discount. Politically notable because federal government simultaneously designated Anthropic a "supply-chain risk."',
    url: 'https://aitoolsrecap.com/Blog/AINewsJuly2026.aspx',
    author: 'AIToolsRecap',
    category: 'policy',
    published_at: '2026-07-01T00:00:00Z',
  },
  // AI detects brain bleeding
  {
    source: 'other',
    source_type: 'web',
    title: 'AI Detects Brain Bleeding Seconds Before Doctors Can',
    summary: 'Israeli researchers: AI detects life-threatening brain hemorrhages in seconds, before physicians can visually identify them on scans.',
    content: 'Healthcare and technology leaders in Israel reported AI detecting life-threatening conditions such as brain hemorrhages in seconds, before physicians can visually identify them on scans.',
    url: 'https://crescendo.ai/news/latest-ai-news-and-updates',
    author: 'Crescendo',
    category: 'research',
    published_at: '2026-07-10T00:00:00Z',
  },
  // Claude Mythos finds Squid vuln
  {
    source: 'anthropic',
    source_type: 'web',
    title: 'Claude Mythos Finds 29-Year-Old Squid Vulnerability (CVE-2026-47729)',
    summary: 'Claude Mythos discovered CVE-2026-47729, a 29-year-old memory leak in Squid web proxy, through Project Glasswing security auditing. Frontier AI finding critical vuln before attackers did.',
    content: 'Claude Mythos discovered CVE-2026-47729, a 29-year-old memory leak vulnerability in Squid web proxy server, through Project Glasswing authorized security auditing. A week later, this detail would read differently as autonomous AI ransomware emerged.',
    url: 'https://tech-reader.blog/2026/07/ai-news-sat-july-11-2026.html',
    author: 'Tech-Reader',
    category: 'safety',
    published_at: '2026-07-06T00:00:00Z',
  },
  // UN AI Governance
  {
    source: 'other',
    source_type: 'web',
    title: 'UN Global Dialogue on AI Governance — 169 Countries Convene in Geneva',
    summary: 'Most significant multilateral AI governance conversation ever held. Two days of deliberation on frameworks, guardrails, and governance architecture for rapidly advancing AI technology.',
    content: 'The UN Global Dialogue on AI Governance convened 169 countries in Geneva for the most significant multilateral AI conversation ever held. Yoshua Bengio warned AI is outpacing governments\' ability to adapt.',
    url: 'https://tech-reader.blog/2026/07/ai-news-sat-july-11-2026.html',
    author: 'Tech-Reader',
    category: 'policy',
    published_at: '2026-07-07T00:00:00Z',
  },
  // Xi Jinping World AI Conference
  {
    source: 'other',
    source_type: 'web',
    title: 'Xi Jinping to Deliver First-Ever Keynote at World AI Conference Shanghai',
    summary: 'Beijing signals escalation in global AI governance push as US rivalry deepens. First-ever keynote by Xi at this conference.',
    content: 'Xi Jinping to deliver first-ever keynote at World AI Conference Shanghai July 17. Beijing signals escalation in global AI governance push as US rivalry deepens.',
    url: 'https://english.news.cn/20260713/f7e3e7febe9e4feea2cc28989cb14d2d/c.html',
    author: 'Xinhua',
    category: 'policy',
    published_at: '2026-07-13T00:00:00Z',
  },
  // Helsing Series E
  {
    source: 'other',
    source_type: 'web',
    title: 'Helsing Closes $1.8B Series E at $18B Valuation — Europe\'s Largest Defense AI Startup',
    summary: 'Goldman Sachs Alternatives, Dragoneer, Iconiq, CPPIB, and JPMorgan back European defense AI startup focused on AI-drone systems.',
    content: 'Helsing closes $1.8B Series E at $18B valuation with Goldman Sachs Alternatives, Dragoneer, Iconiq, CPPIB and JPMorgan. Europe\'s largest defense startup cements AI-drone position.',
    url: 'https://aiweekly.co',
    author: 'AI Weekly',
    category: 'other',
    published_at: '2026-07-13T00:00:00Z',
  },
  // Tesla AI5 chip
  {
    source: 'other',
    source_type: 'web',
    title: 'Tesla Tapes Out Next-Gen AI5 Chip for Optimus Robots and Supercomputers',
    summary: 'Tesla tapes out next-gen AI5 chip for Optimus robots and Dojo supercomputer. Produced in US by TSMC and Samsung.',
    content: 'Tesla taped out next-gen AI5 chip for Optimus robots and supercomputers. Produced in the US by TSMC and Samsung.',
    url: 'https://aitoolsrecap.com/Blog/ai-news-july-11-2026',
    author: 'AIToolsRecap',
    category: 'product',
    published_at: '2026-07-10T00:00:00Z',
  },
  // jscrambler npm attack
  {
    source: 'other',
    source_type: 'web',
    title: 'Compromised jscrambler npm Release Drops Rust Infostealer Targeting AI Coding Tools',
    summary: 'Compromised jscrambler npm 8.14.0 release drops Rust infostealer targeting Claude Desktop, Cursor, Windsurf, VS Code and Zed config files. Supply chain attack on AI developer tooling.',
    content: 'Compromised jscrambler npm 8.14.0 release drops Rust infostealer targeting Claude Desktop, Cursor, Windsurf, VS Code and Zed config files — stealing API keys and tokens from AI coding tool configurations.',
    url: 'https://aiweekly.co',
    author: 'AI Weekly',
    category: 'safety',
    published_at: '2026-07-13T00:00:00Z',
  },
];

export async function seedKnowledgeBase(): Promise<number> {
  await initDB();

  const { inserted } = await upsertNewsItems(SEED_DATA);

  console.log(`🌱 Seeded ${inserted} new items into knowledge base`);
  return inserted;
}
