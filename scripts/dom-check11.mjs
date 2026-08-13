import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 5000));

const info = await page.evaluate(() => {
  const out = {};
  const body = document.body.innerText;
  out.overflow = document.documentElement.scrollWidth > window.innerWidth;
  out.scrollHeight = document.body.scrollHeight;

  // Header
  out.header = {
    hasBrand: body.includes('AI PULSE'),
    hasRefresh: [...document.querySelectorAll('button')].some(b => /refresh|refresh now/i.test(b.innerText)),
    hasLiveBadge: body.includes('SOURCES ONLINE') || body.includes('LIVE'),
  };

  // FilterBar
  out.filters = {
    hasCategoryTabs: [...document.querySelectorAll('button')].filter(b => /All|Frontier|Open Source|Research|Business|Policy/i.test(b.innerText)).length,
    hasSearch: !!document.querySelector('input[placeholder*="Search"]'),
  };

  // DomainBar
  out.domainBar = {
    hasPickFeed: body.includes('Pick your feed'),
    hasBusiness: body.includes('Business'),
    hasTech: body.includes('Tech'),
    hasResearch: body.includes('Research'),
  };

  // ModelWatch
  const mw = [...document.querySelectorAll('section')].find(s => s.innerText.includes('MODEL WATCH'));
  out.modelWatch = {
    present: !!mw,
    hasTabs: mw ? ['LEADERBOARD','VALUE','POPULARITY','NEWEST'].filter(t => mw.innerText.includes(t)).length : 0,
    hasReleaseRadar: mw ? mw.innerText.includes('RELEASE RADAR') : false,
  };

  // AIRadar
  out.aiRadar = {
    hasMood: body.includes('AI MOOD RADAR') || body.includes('MOOD RADAR'),
    hasSentiment: body.includes('MODEL SENTIMENT') || body.includes('Sentiment'),
  };

  // Sidebar
  out.sidebar = {
    hasTrending: body.includes('TRENDING'),
    hasSources: body.includes('SOURCES'),
  };

  // News cards
  const cards = [...document.querySelectorAll('article')];
  out.news = {
    cards: cards.length,
    withDate: cards.filter(c => /ago|min|hour|day/.test(c.innerText)).length,
    withSource: cards.filter(c => /·|source|https/i.test(c.innerText)).length,
  };

  // Footer
  out.footer = {
    present: body.includes('AI Pulse') || body.includes('POWERED BY'),
    hasAgentStatus: body.includes('AGENT') || body.includes('AUTO'),
  };

  return out;
});
console.log(JSON.stringify({ errors, ...info }, null, 2));
await browser.close();
