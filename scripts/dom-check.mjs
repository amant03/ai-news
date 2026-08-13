import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 3000));
const info = await page.evaluate(() => {
  const count = (sel) => document.querySelectorAll(sel).length;
  const text = (sel) => { const el = document.querySelector(sel); return el ? el.innerText.slice(0, 200) : null; };
  return {
    articles: count('article'),
    hero: count('article .h-0\\.5'),
    ticker: count('a[href]') > 50,
    bodyText: document.body.innerText.length,
    h1: text('h1'),
    feedMix: document.body.innerText.includes('Feed mix'),
    liveLabel: document.body.innerText.includes('LIVE'),
    sourcesOnline: document.body.innerText.includes('channels online'),
  };
});
console.log(JSON.stringify({ errors, info }, null, 2));
await browser.close();