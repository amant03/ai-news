import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise(r => setTimeout(r, 5000));
const info = await p.evaluate(() => {
  const body = document.body.innerText.toUpperCase();
  const mw = [...document.querySelectorAll('section')].find(s => s.innerText.toUpperCase().includes('MODEL WATCH'));
  return {
    hasPickFeed: body.includes('PICK YOUR FEED'),
    mwTabs: mw ? ['LEADERBOARD', 'VALUE', 'POPULARITY', 'NEWEST'].filter(t => mw.innerText.toUpperCase().includes(t)) : [],
    hasRadar: body.includes('AI MOOD RADAR'),
    hasModelNews: body.includes('MODEL SIGNALS') || body.includes('RELEASE RADAR'),
    hasTwitterSource: body.includes('ELON MUSK') || body.includes('SAM ALTMAN') || body.includes('X ·'),
  };
});
console.log(JSON.stringify({ errs, ...info }, null, 2));
await b.close();
