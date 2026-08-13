import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
for (let i = 0; i < 6; i++) {
  await new Promise(r => setTimeout(r, 1000));
  const s = await page.evaluate(() => ({
    hasTopStories: document.body.innerText.includes('Top Stories'),
    heroImages: document.querySelectorAll('article div.h-40').length,
    gridCards: document.querySelectorAll('article').length,
  }));
  console.log(i + 's', JSON.stringify({ errors: errors.length, ...s }));
}
await browser.close();