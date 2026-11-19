// vault-it.co/pitch-Eligent-five: the five-minute pitch (owner, 19 Nov 2026: "a new pitch deck refined from all feedback deliverable in 5 mins
// verbally ... interacive"), served through the real Worker routing from the real build. Eight slides, problem first; the figures are the v3
// business plan's (base and best case, consumers and partners together) and the live decks'; two switches (Sam's £50, base / best), a Notes
// view with the spoken script and a five-minute timer, the same Present view as the other decks; ends on £250,000 under SEIS plus one introduction.
require('./lib/vi');
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaultit-pitch-five-'));
const SRC = path.join(ROOT, 'site/pitch-eligent/five.html');

(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  ok(fs.existsSync(path.join(DIST, 'landing', 'pitch-Eligent-five.html')) && fs.existsSync(path.join(DIST, 'landing', 'pitch-eligent-five.html')), 'the build publishes pitch-Eligent-five.html and its lower-case alias');
  if (fails) { console.log('FAILURES ' + fails); process.exit(1); }
  const { route } = await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href);
  const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript', '.mp4': 'video/mp4' };
  const misses = [];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const r = route('vault-it.co', u.pathname);
    const f = r.file && path.join(DIST, r.file);
    if (!f || !fs.existsSync(f)) { misses.push(u.pathname); res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  }).listen(0);
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  const open = async (w, h, touch, q) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch });
    const page = await ctx.newPage(); page.errs = []; page.on('pageerror', (e) => page.errs.push(e.message));
    await page.goto(BASE + '/pitch-Eligent-five' + (q || ''), { waitUntil: 'load' }); await page.waitForTimeout(400); return page;
  };
  const txt = (p, id) => p.evaluate((id) => (document.getElementById(id) || {}).innerText || '', id);
  const html = fs.readFileSync(SRC, 'utf8');

  let p = await open(390, 844, true);
  const n = await p.locator('.frame').count();
  ok(n === 8, 'eight slides for five minutes: ' + n);
  { const ids = await p.evaluate(() => [...document.querySelectorAll('.frame > section')].map((s) => s.id));
    ok(ids.join() === 'cover,sam,scale,solution,whopays,growth,proof,ask', 'problem first, the ask last: ' + ids); }
  ok(p.errs.length === 0, 'no page errors: ' + p.errs.join(' | '));
  const body = await p.evaluate(() => document.body.innerText);
  ok(/Not regulated by the FCA\. Not financial advice\./i.test(body), 'the FCA line is on the page');
  { const each = await p.evaluate(() => [...document.querySelectorAll('.frame > section')].filter((s) => !/NOT REGULATED BY THE FCA\. NOT FINANCIAL ADVICE\./i.test(s.innerText)).map((s) => s.id));
    ok(each.length === 0, 'every slide carries the FCA line: ' + each); }
  ok(!/—/.test(body) && !/—|&mdash;/.test(html), 'no em dashes');
  ok(!/Vault ?It\b|VaultIt|Vault·It/.test(body), 'the name is written Vault-It');
  { const hosts = [...html.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]).filter((h, i, a) => a.indexOf(h) === i).sort();
    ok(hosts.join() === 'fonts.googleapis.com,fonts.gstatic.com,vault-it.co', 'no new outside hosts: ' + hosts.join(', '));
    ok(!/font-family:[^;"]*(Inter|Roboto|Helvetica|Georgia|Times)/i.test(html) && !/font:[^;"]*(Inter|Roboto|Helvetica|Georgia|Times)/i.test(html), 'fonts are Syne, DM Sans and Share Tech Mono only'); }
  ok(!/December 2027|break-even/i.test(body), 'the follow-up deck\'s December 2027 break-even line is not repeated');
  ok(!/testimonial|only \d+ left|was £/i.test(body), 'no testimonials, scarcity or reference prices');

  // Slide 2: Sam, from the live deck's example, with the £50 switch
  { const s = await txt(p, 'sam');
    ok(/34/.test(s) && /£16,874/.test(s) && /£6,874/.test(s) && /24\.9%/.test(s) && /£10,000/.test(s) && /9\.9%/.test(s) && /£2,300/.test(s) && /£1,850/.test(s) && /£66/.test(s), 'Sam\'s figures are the live deck\'s example');
    ok(/StepChange/i.test(s) && /7 Nov(ember)? 2026/i.test(s), 'Sam names the source of the averages and the date of the engine run');
    const read = () => p.evaluate(() => ({ keys: document.getElementById('sam-keys').textContent.trim(), free: document.getElementById('sam-free').textContent.trim(), on: (document.querySelector('#sam [data-sam][aria-pressed="true"]') || {}).dataset.sam }));
    let r = await read(); ok(r.on === 'min' && r.keys === 'August 2035' && r.free === 'August 2031', 'minimums only: debt-free August 2031, keys August 2035: ' + JSON.stringify(r));
    await p.evaluate(() => document.querySelector('#sam [data-sam="plus"]').click());
    r = await read(); ok(r.on === 'plus' && r.keys === 'August 2034', '£50 a month more: keys August 2034: ' + JSON.stringify(r));
    ok(/one year sooner/i.test(await txt(p, 'sam')), 'the switch says what £50 does: one year sooner');
    await p.evaluate(() => document.querySelector('#sam [data-sam="min"]').click()); r = await read(); ok(r.keys === 'August 2035', 'and back again'); }
  // Slide 3: how many, each with its source
  { const s = await txt(p, 'scale');
    ok(/8\.4m/.test(s) && /MaPS/.test(s) && /2\.7m/.test(s) && /English Housing Survey/i.test(s) && /£36,500/.test(s) && /9\.7 years/.test(s) && /£9,999/.test(s) && /£400 a month/.test(s), 'the problem in numbers, with sources');
    ok(/Moneybox/.test(s) && /Tembo/.test(s) && /below zero/i.test(s), 'competitors are named and the gap is stated'); }
  { const s = await txt(p, 'solution'); ok(/below zero/i.test(s) && /14,465/.test(s) && /August 2035/i.test(s) && !/March 2031/.test(s), 'the solution slide keeps Sam\'s date, one example through the deck');
    ok(await p.evaluate(() => !!document.querySelector('#solution video[src="pitch/house-build.mp4"][poster="pitch/house-still.jpg"][muted][playsinline]')), 'the 3D house builds on the solution slide'); }
  // Slide 5: who pays, B2B first, prices match Stripe and the plan
  { const s = await txt(p, 'whopays');
    ok(/£5\.99 a month/.test(s) && /£59\.99 a year/.test(s) && !/£7\.99/.test(s), 'consumer prices match Stripe');
    ok(/£738 to £936/.test(s) && /£18 to £40/.test(s) && /£185 to £234/.test(s) && /£10,000 to £25,000/.test(s) && /£1 to £3/.test(s) && /about £1/i.test(s), 'the three partner offers carry the plan\'s figures');
    ok(/No partner has been approached/i.test(s) && /assumption/i.test(s), 'it says the partner prices are untested'); }
  // Slide 6: consumers and partners together, base and best
  { const read = () => p.evaluate(() => { const o = { on: (document.querySelector('#growth [data-case][aria-pressed="true"]') || {}).dataset.case }; document.querySelectorAll('#growth [data-g]').forEach((e) => { o[e.dataset.g] = e.textContent.trim(); }); return o; });
    let g = await read();
    ok(g.on === 'base' && [g['subs-1'], g['subs-2'], g['subs-3']].join() === '37,113,203' && [g['partner-1'], g['partner-2'], g['partner-3']].join('|') === '0|833|4,500' && [g['rev-1'], g['rev-2'], g['rev-3']].join('|') === '£4,498|£46,256|£100,166', 'base case: subscribers, partner-funded users and revenue by year: ' + JSON.stringify(g));
    ok(/27 months/.test(await txt(p, 'growth')) && /does not break even/i.test(await txt(p, 'growth')), 'base case says it plainly: 27 months, no break-even inside three years');
    await p.evaluate(() => document.querySelector('#growth [data-case="best"]').click()); g = await read();
    ok(g.on === 'best' && [g['subs-1'], g['subs-2'], g['subs-3']].join('|') === '172|809|1,997' && [g['partner-1'], g['partner-2'], g['partner-3']].join('|') === '0|4,667|14,667' && [g['rev-1'], g['rev-2'], g['rev-3']].join('|') === '£20,793|£141,137|£429,814', 'best case: ' + JSON.stringify(g));
    ok(/£108,281/.test(await txt(p, 'growth')), 'best case: cash never below £108,281');
    ok(/model/i.test(await txt(p, 'growth')) && /not trading data/i.test(await txt(p, 'growth')), 'the growth slide says these are model outputs');
    await p.evaluate(() => document.querySelector('#growth [data-case="base"]').click()); }
  // Slide 7: where it is today
  { const s = await txt(p, 'proof');
    const t = await p.evaluate(() => [...document.querySelectorAll('#proof [data-now]')].map((e) => e.dataset.now + '=' + e.querySelector('b').textContent.trim()).join());
    ok(t === 'people=26,saved=11,waitlist=9,paying=0', 'traction on 19 Nov 2026, the user count the owner gave that day (26): ' + t);
    ok(/founder's count/i.test(s) && !/\b14 accounts\b/.test(s), 'the slide says whose count the 26 is');
    ok(/since the 7 november pitch/i.test(s) && /v0\.95/.test(s) && /10 November/.test(s) && /vault-it\.co\/demo-a/.test(s) && /business plan v3/i.test(s) && /36-month/.test(s) && !/Web Summit/i.test(s), 'progress since the 7 Nov pitch: v0.95 released 10 Nov, the live demo, plan v3 and its 36-month model (owner, 19 Nov: "other progression to highlight")');
    ok(/trust centre in development/i.test(s) && /HexaTown/.test(s) && /security and compliance/i.test(s) && /NDA signed/i.test(s) && !/ISO 27001 certified|certified to ISO|SOC 2/i.test(s), 'the trust centre is in development and HexaTown is named, with no certificate claimed (owner, 19 Nov)');
    ok(/19 November 2026/i.test(s) && /pre-revenue/i.test(s) && /15 to 20% equity/.test(s) && !/25%/.test(s) && /February 2027/i.test(s) && /September 2028/i.test(s), 'dated, pre-revenue, the open seats and the two dated milestones'); }
  // Slide 8: the two asks
  { const a = await txt(p, 'ask');
    ok(/£250,000/.test(a) && /SEIS/.test(a) && /March 2027/.test(a) && /27 months/.test(a) && /advance assurance/i.test(a), 'ask one: £250,000 under SEIS, closing March 2027, 27 months');
    const uf = await p.evaluate(() => [...document.querySelectorAll('#ask [data-fund]')].map((e) => [e.dataset.fund, e.innerText]));
    const pct = uf.map((x) => x[0]).join('/'), sum = uf.reduce((s, x) => s + +(x[1].match(/£([\d,]+)/) || [0, '0'])[1].replace(/,/g, ''), 0);
    ok(pct === '63/10/9/5/13' && sum === 250000, 'use of funds is the plan\'s and adds to £250,000: ' + pct + ' = £' + sum);
    ok(/one introduction/i.test(a) && /mortgage broker/i.test(a) && /building society/i.test(a) && /debt charity/i.test(a), 'ask two: one introduction to a broker, building society or debt charity');
    ok(await p.evaluate(() => !!document.querySelector('#ask a[href="https://vault-it.co/demo-a"]')), 'the demo link is exactly https://vault-it.co/demo-a, on the last slide'); }
  // The spoken script: one part per slide, five minutes
  { const say = await p.evaluate(() => [...document.querySelectorAll('.frame')].map((f) => ({ secs: +f.dataset.secs, words: ((f.querySelector('.say') || {}).textContent || '').trim().split(/\s+/).filter(Boolean).length })));
    const secs = say.reduce((s, x) => s + x.secs, 0), words = say.reduce((s, x) => s + x.words, 0);
    ok(say.every((x) => x.secs > 0 && x.words >= 20), 'every slide has its part of the script and a time budget: ' + JSON.stringify(say));
    ok(secs === 300, 'the time budgets add to 5:00: ' + secs + 's');
    ok(words >= 600 && words <= 760, 'the script is a five-minute read, 600 to 760 words: ' + words);
    ok(say.every((x) => x.words / x.secs <= 2.7), 'no slide asks for more than about 160 words a minute: ' + say.map((x) => Math.round(x.words / x.secs * 60)).join(' '));
    ok(await p.evaluate(() => [...document.querySelectorAll('.say')].every((e) => getComputedStyle(e).display === 'none')), 'the script never shows on the slides themselves'); }
  // brand marks
  { const w = await p.evaluate(() => { const h = document.querySelector('#cover h1'), sp = h && h.querySelector('span'); return h && sp ? { all: h.textContent, it: sp.textContent, col: getComputedStyle(sp).color, rest: getComputedStyle(h).color } : null; });
    ok(w && w.all === 'Vault-It' && w.it === '-It' && w.col === 'rgb(68, 192, 185)' && w.rest !== w.col, 'the wordmark draws "-It" in teal'); }
  { const t = await p.evaluate(() => { const out = {}; document.querySelectorAll('#cover h2 span').forEach((s) => { out[s.textContent] = getComputedStyle(s).color; }); return out; });
    ok(t.red === 'rgb(200, 32, 42)' && t.your === 'rgb(68, 192, 185)' && t.home === 'rgb(232, 197, 106)', 'the tagline fills: red dark red, your teal, home gold: ' + JSON.stringify(t)); }
  { const imgs = await p.evaluate(() => [...document.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, alt: i.hasAttribute('alt') })));
    ok(imgs.length >= 1 && imgs.every((i) => i.ok && i.alt), 'every image loads and has alt text: ' + JSON.stringify(imgs.filter((i) => !i.ok))); }
  { const gaps = await p.evaluate(() => [...document.querySelectorAll('.frame > section')].map((sec) => { const foot = sec.querySelector('.foot'); if (!foot) return [sec.id, -1]; const ft = foot.getBoundingClientRect().top; let low = 0; [...sec.children].forEach((c) => { if (c !== foot && !c.matches('video,.fade')) low = Math.max(low, c.getBoundingClientRect().bottom); }); return [sec.id, Math.round((ft - low) * 10) / 10]; }));
    ok(gaps.every((g) => g[1] >= 1), 'on every slide the content clears the footer line (phone page, fallback fonts included): ' + gaps.map((g) => g.join(':')).join(' ')); }
  { const over = await p.evaluate(() => [...document.querySelectorAll('.frame > section')].filter((s) => s.scrollHeight > 1081 || s.scrollWidth > 1921).map((s) => s.id + ' ' + s.scrollWidth + 'x' + s.scrollHeight));
    ok(over.length === 0, 'nothing spills out of a slide: ' + over.join(' ')); }
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on a phone');

  // Notes on a phone: the script for the slide in view, no sideways scroll
  await p.evaluate(() => document.getElementById('nv-open').click());
  ok(await p.evaluate(() => document.body.classList.contains('notes') && getComputedStyle(document.getElementById('nv')).display !== 'none'), 'Notes opens the script panel');
  ok(/Pete Thickett/.test(await txt(p, 'nv-text')), 'the panel shows the cover\'s part of the script');
  { const say = await p.evaluate(() => document.querySelector('.frame:has(#proof) .say').textContent); ok(/26 people/.test(say) && /HexaTown/.test(say) && /trust centre/i.test(say) && !/\b14 accounts\b/.test(say), 'the script says 26 people and names the trust centre and HexaTown');
    ok(/7 November/.test(say) && /version 0\.95/.test(say), 'the script says what has moved since the 7 November pitch'); }
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on a phone with Notes open');
  ok(misses.length === 0, 'every file the page asks for exists in the build: ' + misses.join(' '));

  // Laptop: Present, the timer and the keys
  p = await open(1280, 800);
  await p.click('#pv-open');
  const counter = () => p.evaluate(() => (document.querySelector('#pv-count') || {}).textContent.trim());
  ok(await p.evaluate(() => document.body.classList.contains('present')), 'Present turns on the one-slide view');
  ok(await counter() === '1 / ' + n, 'the counter reads 1 / ' + n + ': ' + await counter());
  await p.keyboard.press('n');
  ok(await p.evaluate(() => document.body.classList.contains('notes')), 'N opens Notes while presenting');
  { const fit = await p.evaluate(() => { const f = document.querySelector('.frame.on').getBoundingClientRect(), v = document.getElementById('nv').getBoundingClientRect(); return { fr: Math.round(f.right), fb: Math.round(f.bottom), vl: Math.round(v.left), vt: Math.round(v.top), w: Math.round(f.width) }; });
    ok((fit.fr <= fit.vl + 1 || fit.fb <= fit.vt + 1) && fit.w >= 600, 'the slide sits beside the script, not under it: ' + JSON.stringify(fit)); }
  ok(await txt(p, 'nv-timer') === '5:00', 'the timer starts at 5:00: ' + await txt(p, 'nv-timer'));
  await p.keyboard.press('ArrowRight'); ok(await counter() === '2 / ' + n, 'right arrow moves one slide');
  ok(/Meet Sam/.test(await txt(p, 'nv-text')), 'the script follows the slide');
  await p.waitForTimeout(1300);
  ok(/^4:5\d$/.test(await txt(p, 'nv-timer')), 'the timer runs from the first move off the cover: ' + await txt(p, 'nv-timer'));
  await p.keyboard.press('t');
  ok(await p.evaluate(() => document.getElementById('sam-keys').textContent.trim()) === 'August 2034', 'T flips the switch on the slide in view (Sam: £50 more)');
  await p.click('#sam [data-sam="min"]'); ok(await counter() === '2 / ' + n && await p.evaluate(() => document.getElementById('sam-keys').textContent.trim()) === 'August 2035', 'clicking a switch does not change slide');
  await p.keyboard.press('End'); ok(await counter() === n + ' / ' + n, 'End jumps to the last slide');
  await p.keyboard.press('n'); ok(!(await p.evaluate(() => document.body.classList.contains('notes'))), 'N closes Notes');
  await p.keyboard.press('Escape'); ok(!(await p.evaluate(() => document.body.classList.contains('present'))), 'Esc leaves the one-slide view');
  ok(p.errs.length === 0, 'no page errors on the laptop: ' + p.errs.join(' | '));

  // Two windows: the one with Notes drives the audience window
  { const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const me = await ctx.newPage(), room = await ctx.newPage();
    await room.goto(BASE + '/pitch-Eligent-five?present', { waitUntil: 'load' }); await me.goto(BASE + '/pitch-Eligent-five?present&notes', { waitUntil: 'load' }); await me.waitForTimeout(300);
    ok(await me.evaluate(() => document.body.classList.contains('notes')) && !(await room.evaluate(() => document.body.classList.contains('notes'))), '?notes opens the script in the presenter\'s window only');
    await me.keyboard.press('ArrowRight'); await me.keyboard.press('ArrowRight'); await room.waitForTimeout(400);
    ok(await room.evaluate(() => document.querySelector('.frame.on section').id) === 'scale', 'the audience window follows the presenter\'s window');
    await ctx.close(); }

  // Print: one slide a page, no controls, no script
  await p.emulateMedia({ media: 'print' });
  ok(await p.evaluate(() => ['nv', 'pv-bar'].every((id) => getComputedStyle(document.getElementById(id)).display === 'none') && getComputedStyle(document.querySelector('header')).display === 'none'), 'in print the controls and the script are hidden');
  await b.close(); srv.close(); fs.rmSync(DIST, { recursive: true, force: true });
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL:', e.message); process.exit(1); });
