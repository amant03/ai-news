import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 3000));
const info = await page.evaluate(() => {
  const body = document.body.innerText.toUpperCase();
  const covers = document.querySelectorAll('[class*="overflow-hidden"]').length;
  const imgs = [...document.querySelectorAll('article img')].filter(i => i.complete && i.naturalWidth > 0).length;
  const genCovers = [...document.querySelectorAll('article [style*="gradient"]')].length;
  return {
    hasModelWatch: body.includes('MODEL WATCH'),
    hasLeaderboardTab: body.includes('LEADERBOARD'),
    hasReleasesTab: body.includes('RELEASES'),
    realImages: imgs,
    generatedCovers: genCovers,
    hasBenchLabels: ['LMArena'.toUpperCase(), 'SWE'.toUpperCase(), 'MMLU'.toUpperCase()].filter(w => body.includes(w)),
    errors: [],
  };
});
console.log(JSON.stringify({ info, errors }, null, 2));
await browser.close();