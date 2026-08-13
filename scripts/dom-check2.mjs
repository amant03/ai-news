import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 3500));
const info = await page.evaluate(() => {
  const body = document.body.innerText;
  const idx = body.indexOf('Feed mix');
  return {
    hasFeedMix: idx >= 0,
    feedContext: idx >= 0 ? body.slice(idx - 60, idx + 400) : null,
    hasChannelsOnline: body.includes('channels online'),
    signalHealthIdx: body.indexOf('Signal Health'),
    signalContext: body.indexOf('Signal Health') >= 0 ? body.slice(body.indexOf('Signal Health'), body.indexOf('Signal Health') + 600) : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();