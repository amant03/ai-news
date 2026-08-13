import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 3000));
const info = await page.evaluate(() => {
  // find the section label element near hero
  const sections = [...document.querySelectorAll('h2')].map(h => ({ text: h.innerText, cls: h.className }));
  const main = document.querySelector('main');
  return {
    h2s: sections,
    mainFirst300: main ? main.innerText.slice(0, 300) : null,
    hasCategoryAccent: document.querySelectorAll('article > div.h-0\\.5').length,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();