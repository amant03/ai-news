const res = await fetch('https://r.jina.ai/https://x.com/elonmusk', {
  signal: AbortSignal.timeout(25000),
  headers: { 'X-Return-Format': 'markdown', 'X-Timeout': '15' },
});
const text = await res.text();
console.log('status', res.status, 'len', text.length);

const anchorRe = /\[([^\]]+)\]\(https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/(\d+)\)/g;
const matches = [];
let m;
while ((m = anchorRe.exec(text)) !== null) {
  matches.push({ dateText: m[1], id: m[2], start: m.index, end: anchorRe.lastIndex });
}

const LOGIN_RE = /log in or sign up|continue with phone|see what's happening/i;
const blocks = [];
for (let i = 0; i < matches.length; i++) {
  const cur = matches[i];
  const next = matches[i + 1];
  const segment = text.slice(cur.end, next ? next.start : text.length);
  const wall = segment.search(LOGIN_RE);
  const chunk = (wall >= 0 ? segment.slice(0, wall) : segment).trim();
  if (!chunk) continue;
  const img = chunk.match(/!\[[^\]]*\]\(([^)]+)\)/);
  let cleaned = chunk
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#*_>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  cleaned = cleaned.replace(/(?:\s+@?[A-Za-z0-9_.]{1,24})?\s+(\d+[.,]?\d*[KkMm]?)+\s*$/, '').trim();
  cleaned = cleaned.replace(/^\s*@[A-Za-z0-9_]+\s+/, '').trim();
  if (cleaned.length < 15) continue;
  blocks.push({ dateText: cur.dateText, text: cleaned, img: img?.[1] });
}
console.log('blocks:', blocks.length);
for (const b of blocks.slice(0, 8)) {
  console.log(`\n[${b.dateText}] ${b.text.slice(0, 140)}`);
  if (b.img) console.log('  img:', b.img.slice(0, 70));
}