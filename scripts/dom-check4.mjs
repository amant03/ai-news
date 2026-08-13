import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 3500));
const info = await page.evaluate(() => {
  const body = document.body.innerText;
  return {
    len: body.length,
    searchPos: body.indexOf('Search AI news'),
    topStoriesPos: body.indexOf('Top Stories'),
    feedMixPos: body.indexOf('Feed mix'),
    latestSignalsPos: body.indexOf('Latest Signals'),
    signalHealthPos: body.indexOf('Signal Health'),
    trendingPos: body.indexOf('Trending Topics'),
    aboutPos: body.indexOf('About'),
    segment: body.slice(4500, 9500),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();