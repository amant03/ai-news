import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
await page.setViewport({ width: 1440, height: 1500, deviceScaleFactor: 1 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 5000));
const info = await page.evaluate(() => {
  const body = document.body.innerText.toUpperCase();
  return {
    hasTabs: ['LEADERBOARD', 'VALUE', 'POPULARITY', 'NEWEST'].filter(t => body.includes(t)),
    hasSearch: document.querySelector('input[aria-label="Search models"]') !== null,
    hasReleaseRadar: body.includes('RELEASE RADAR'),
    modelMentions: ['CLAUDE OPUS 5', 'GROK 4.6', 'DEEPSEEK V4', 'GPT-5.6', 'GEMMA 4'].filter(m => body.includes(m)),
    hasCatalogLine: body.includes('MODELS · OPENROUTER'),
    hasValue: body.includes('VALUE') && body.includes('INT INDEX'),
  };
});
console.log(JSON.stringify({ errors, ...info }, null, 2));
await browser.close();
