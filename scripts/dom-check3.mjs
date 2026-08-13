import puppeteer from 'puppeteer';
const url = process.argv[2] || 'http://localhost:3000';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 3500));
const info = await page.evaluate(() => {
  const body = document.body.innerText;
  return body.slice(0, 3000);
});
console.log(info);
await browser.close();