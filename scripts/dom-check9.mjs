import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.setViewport({ width: 1440, height: 1500, deviceScaleFactor: 1 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 5000));

const clickTab = async label => {
  await page.evaluate(label => {
    const btn = [...document.querySelectorAll('[role="tab"]')].find(b => b.innerText.trim() === label);
    if (btn) btn.click();
  }, label);
  await new Promise(r => setTimeout(r, 1800));
};

const firstRows = async () => {
  return await page.evaluate(() => {
    const rows = [...document.querySelectorAll('section')].flatMap(s =>
      [...s.querySelectorAll('div.rounded-xl')].map(d => d.innerText)
    );
    const modelRows = rows.filter(r => /Int|Code|Agent|Ctx|Value/.test(r) && r.length < 400);
    return modelRows.slice(0, 4).map(r => r.replace(/\n/g, ' | ').slice(0, 150));
  });
};

const result = {};
result.intelligence = await firstRows();
await clickTab('Value');
result.value = await firstRows();
await clickTab('Popularity');
result.popularity = await firstRows();
await clickTab('Newest');
result.newest = await firstRows();

console.log(JSON.stringify({ errors, ...result }, null, 2));
await browser.close();
