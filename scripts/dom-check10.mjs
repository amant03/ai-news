import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 4500));

const clickTab = async label => {
  await page.evaluate(l => {
    [...document.querySelectorAll('[role="tab"]')].find(b => b.innerText.trim() === l)?.click();
  }, label);
  await new Promise(r => setTimeout(r, 1600));
};

const probe = () =>
  page.evaluate(() => {
    const section = [...document.querySelectorAll('section')].find(s => s.innerText.includes('MODEL WATCH'));
    if (!section) return 'NO SECTION';
    const rows = [...section.querySelectorAll('div.rounded-xl')].filter(d => /CLOSED|OPEN-WEIGHTS/.test(d.innerText.toUpperCase()));
    return rows.slice(0, 3).map(r => r.innerText.replace(/\n+/g, ' / ').slice(0, 190));
  });

const res = { intelligence: await probe() };
await clickTab('Value');
res.value = await probe();
await clickTab('Popularity');
res.popularity = await probe();
await clickTab('Newest');
res.newest = await probe();

console.log(JSON.stringify({ errors, ...res }, null, 2));
await browser.close();
