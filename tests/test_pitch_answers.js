// vault-it.co/pitch-Eligent-answers: the short deck answering the investor's four questions after the Eligent pitch (owner, 8 Nov 2026),
// served through the real Worker routing from the real build. Six slides or fewer, the figures from the brief, the demo link exact,
// every image resolves, the FCA line visible, the same Present view as the main deck, no sideways scroll on a phone.
require('./lib/vi');
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaultit-pitch-answers-'));

(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  ok(fs.existsSync(path.join(DIST, 'landing', 'pitch-Eligent-answers.html')) && fs.existsSync(path.join(DIST, 'landing', 'pitch-eligent-answers.html')), 'the build publishes pitch-Eligent-answers.html and its lower-case alias');
  const { route } = await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href);
  const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript' };
  const misses = [];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const r = route('vault-it.co', u.pathname);
    const f = r.file && path.join(DIST, r.file);
    if (!f || !fs.existsSync(f)) { misses.push(u.pathname); res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  }).listen(0);
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  const open = async (w, h, touch) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch });
    const page = await ctx.newPage(); page.errs = []; page.on('pageerror', (e) => page.errs.push(e.message));
    await page.goto(BASE + '/pitch-Eligent-answers', { waitUntil: 'load' }); await page.waitForTimeout(400); return page;
  };
  const txt = (p, id) => p.evaluate((id) => (document.getElementById(id) || {}).innerText || '', id);

  let p = await open(390, 844, true);
  const n = await p.locator('.frame').count();
  ok(n > 0 && n <= 6, 'six slides or fewer: ' + n);
  ok(p.errs.length === 0, 'no page errors: ' + p.errs.join(' | '));
  const body = await p.evaluate(() => document.body.innerText);
  ok(/Not regulated by the FCA\. Not financial advice\./i.test(body), 'the FCA line is on the page');
  ok(/Vault-It, published by PT Live Design/.test(body) && !/incorporation submitted/.test(body), 'one owner entity: Vault-It, published by PT Live Design (owner, 8 Nov)');
  ok(!/—/.test(body) && !/—/.test(fs.readFileSync(path.join(ROOT, 'site/pitch-eligent/answers.html'), 'utf8')), 'no em dashes');
  { const html = fs.readFileSync(path.join(ROOT, 'site/pitch-eligent/answers.html'), 'utf8');
    const hosts = [...html.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]).filter((h, i, a) => a.indexOf(h) === i).sort();
    ok(hosts.join() === 'fonts.googleapis.com,fonts.gstatic.com,vault-it.co', 'no new outside hosts: ' + hosts.join(', '));
    ok(!/font-family:[^;"]*(?!Syne|DM Sans|Share Tech Mono|Arial|Courier New|monospace|sans-serif)(Inter|Roboto|Helvetica|Georgia|Times)/i.test(html), 'fonts are Syne, DM Sans and Share Tech Mono only'); }
  // the four answers
  { const s = await txt(p, 'spend'); ok(/£3,214\.08/.test(s) && /£2,410\.56/.test(s) && /£2,661\.63/.test(s) && /JANUARY TO NOVEMBER 2026/.test(s) && /own money/i.test(s) && /PT Live Design/.test(s) && /whole of PT Live Design, Vault-It included/i.test(s) && !/£606|£226|Everything else/.test(s), 'invested to date: the owner\'s three figures framed as PT Live Design funding Vault-It, no leftover receipt figures');
    const rows = await p.evaluate(() => [...document.querySelectorAll('#spend table[data-invest] tr[data-row]')].map((r) => r.dataset.row + '=' + r.querySelectorAll('td')[1].textContent.trim()));
    ok(rows.join() === 'invested=£3,214.08,spent=£2,410.56,turnover=£2,661.63', 'the table has the three rows in order: ' + rows.join(' ')); }
  { const cats = await p.evaluate(() => [...document.querySelectorAll('#spend table[data-spend] tr[data-cat]')].map((r) => [...r.querySelectorAll('td')].map((c) => c.textContent.trim())));
    const sum = Math.round(cats.reduce((a, c) => a + +c[1].replace(/[£,]/g, ''), 0) * 100) / 100, total = await p.evaluate(() => document.querySelector('#spend tr[data-total] td:last-child').textContent.trim());
    ok(cats.length === 7 && sum === 2384.08 && total === '£2,384.08' && !cats.some((c) => /to review/i.test(c[0])), 'the spend table has the 7 categories (no "to review" row, owner 8 Nov: "drop") and they add to the shown total: ' + sum + ' vs ' + total);
    ok(!/Synthesia|Upwork|Trainline|Facebook|Incogni|Amazon|Wix|Claude/.test(await txt(p, 'spend')), 'categories only, no supplier names'); }
  { const a = await txt(p, 'ask'); ok(/£250,000/.test(a) && /SEIS/.test(a) && /March 2027/.test(a) && /50% income tax relief/.test(a) && /December 2027/.test(a) && /£43,400/.test(a) && /£261,390/.test(a), 'the ask: £250,000 under SEIS, closing March 2027, break-even December 2027');
    const uf = await p.evaluate(() => [...document.querySelectorAll('#ask [data-fund]')].map((e) => [e.dataset.fund, e.innerText]));
    const pct = uf.map((x) => x[0]).join('/'), sum = uf.reduce((s, x) => s + +(x[1].match(/£([\d,]+)/) || [0, '0'])[1].replace(/,/g, ''), 0);
    ok(pct === '35/20/15/15/15' && sum === 250000, 'use of funds 35/20/15/15/15 adds to £250,000: ' + pct + ' = £' + sum); }
  { const f = await txt(p, 'founders'); ok(/Pete Thickett/.test(f) && /Solo founder today/.test(f) && /25% equity/.test(f) && /two seats open/i.test(f) && ['David Amor', 'Malcolm McPhee', 'Rita Fortes', 'Chris Gueffier'].every((x) => f.includes(x)), 'founders: one today, two seats, the four advisers the owner named'); }
  { const imgs = await p.evaluate(() => [...document.querySelectorAll('#product img')].map((i) => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })));
    ok(imgs.length === 6 && imgs.every((i) => i.ok), 'the product slide shows six real screenshots and every one loads: ' + JSON.stringify(imgs.filter((i) => !i.ok)));
    ok(imgs.every((i) => /^pitch\/answers\/[a-z-]+\.jpg$/.test(i.src)), 'screenshots come from pitch/answers/ on the same host'); }
  { const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
    ok(links.includes('https://vault-it.co/demo-a'), 'the demo link is exactly https://vault-it.co/demo-a: ' + links.join(' '));
    ok(links.includes('https://vault-it.co/pitch-Eligent'), 'the full deck link is vault-it.co/pitch-Eligent'); }
  { const bf = await txt(p, 'launch'); ok(/100 places at £149/.test(bf) && /never reopened/.test(bf) && !/£199|£99/.test(bf), 'the Founding pre-sale matches Stripe: 100 places at £149'); }
  // brand marks
  { const w = await p.evaluate(() => { const h = document.querySelector('#cover h1'), sp = h && h.querySelector('span'); return h && sp ? { all: h.textContent, it: sp.textContent, col: getComputedStyle(sp).color, rest: getComputedStyle(h).color } : null; });
    ok(w && w.all === 'Vault-It' && w.it === '-It' && w.col === 'rgb(68, 192, 185)' && w.rest !== w.col, 'the wordmark draws "-It" in teal'); }
  { const t = await p.evaluate(() => { const out = {}; document.querySelectorAll('#cover h2 span').forEach((s) => { out[s.textContent] = getComputedStyle(s).color; }); return out; });
    ok(t.red === 'rgb(200, 32, 42)' && t.your === 'rgb(68, 192, 185)' && t.home === 'rgb(232, 197, 106)', 'the tagline fills: red dark red, your teal, home gold: ' + JSON.stringify(t)); }
  { const gap = await p.evaluate(() => { const foot = document.querySelector('#spend .foot'), prev = foot.previousElementSibling; return foot.getBoundingClientRect().top - prev.getBoundingClientRect().bottom; });
    ok(gap > 0, 'slide 2: the note sits above the footer line, no overlap (gap ' + Math.round(gap) + 'px)'); }
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on a phone');
  ok(misses.length === 0, 'every file the page asks for exists in the build: ' + misses.join(' '));

  // Laptop: the Present view
  p = await open(1280, 800);
  await p.click('#pv-open');
  const counter = () => p.evaluate(() => (document.querySelector('#pv-count') || {}).textContent.trim());
  ok(await p.evaluate(() => document.body.classList.contains('present')), 'Present turns on the one-slide view');
  ok(await counter() === '1 / ' + n, 'the counter reads 1 / ' + n + ': ' + await counter());
  await p.keyboard.press('ArrowRight'); ok(await counter() === '2 / ' + n, 'right arrow moves one slide');
  await p.keyboard.press('End'); ok(await counter() === n + ' / ' + n, 'End jumps to the last slide');
  await p.keyboard.press('Escape'); ok(!(await p.evaluate(() => document.body.classList.contains('present'))), 'Esc leaves the one-slide view');
  await b.close(); srv.close(); fs.rmSync(DIST, { recursive: true, force: true });
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL:', e.message); process.exit(1); });
