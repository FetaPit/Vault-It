// vault-it.co/pitch-Eligent in a real browser, served through the real Worker routing from the real build:
// all 15 slides scroll on a phone with no sideways scroll, and the Present button gives a one-slide view
// (arrow keys, on-screen buttons, swipe, counter, Esc to leave).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaultit-pitch-'));

(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  const { route } = await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href);
  const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const r = route('vault-it.co', u.pathname);
    const f = r.file && path.join(DIST, r.file);
    if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  }).listen(0);
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  const open = async (w, h, touch) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch });
    const page = await ctx.newPage(); page.errs = []; page.on('pageerror', (e) => page.errs.push(e.message));
    await page.goto(BASE + '/pitch-Eligent', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(300); return page;
  };
  const visible = (page) => page.evaluate(() => [...document.querySelectorAll('.frame')].filter((f) => getComputedStyle(f).display !== 'none').map((f) => f.querySelector('section').id));
  const counter = (page) => page.evaluate(() => (document.querySelector('#pv-count') || {}).textContent || '');

  // Phone: the scrolling deck
  let p = await open(390, 844);
  ok((await p.locator('.frame').count()) === 15, 'the page has the 15 slides');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll on a phone');
  const btn = p.locator('#pv-open');
  ok((await btn.count()) === 1 && await btn.isVisible(), 'a Present button is on the page');
  const box = await btn.boundingBox();
  ok(box && box.height >= 44 && box.width >= 44, 'the Present button is at least 44 px to tap: ' + JSON.stringify(box));

  // Laptop: one-slide view by button and keys
  p = await open(1280, 800);
  await p.click('#pv-open');
  ok(await p.evaluate(() => document.body.classList.contains('present')), 'Present turns on the one-slide view');
  let v = await visible(p);
  ok(v.length === 1 && v[0] === 'cover', 'exactly one slide shows, starting at the cover: ' + v);
  ok(/^1 \/ 15$/.test((await counter(p)).trim()), 'the counter reads 1 / 15: ' + (await counter(p)));
  const fit = await p.evaluate(() => { const r = document.querySelector('.frame.on').getBoundingClientRect(); return { w: r.width, h: r.height, l: r.left, t: r.top }; });
  ok(Math.abs(fit.w - 1280) < 2 && Math.abs(fit.h - 720) < 2 && Math.abs(fit.t - 40) < 2, 'the slide fills the screen at 16:9, centred: ' + JSON.stringify(fit));
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  v = await visible(p);
  ok(v.length === 1 && v[0] === 'gap' && (await counter(p)).trim() === '3 / 15', 'right arrow moves forward one slide at a time: ' + v + ' ' + (await counter(p)));
  await p.keyboard.press('ArrowLeft');
  ok((await counter(p)).trim() === '2 / 15', 'left arrow goes back');
  await p.click('#pv-next');
  ok((await counter(p)).trim() === '3 / 15', 'the on-screen next button works');
  await p.click('#pv-prev');
  ok((await counter(p)).trim() === '2 / 15', 'the on-screen back button works');
  await p.keyboard.press('End');
  ok((await counter(p)).trim() === '15 / 15', 'End jumps to the last slide');
  await p.keyboard.press('ArrowRight');
  ok((await counter(p)).trim() === '15 / 15', 'it stops at the last slide');
  await p.keyboard.press('Home');
  ok((await counter(p)).trim() === '1 / 15', 'Home jumps to the first slide');
  await p.keyboard.press('Escape');
  ok(!(await p.evaluate(() => document.body.classList.contains('present'))) && (await visible(p)).length === 15, 'Esc leaves the one-slide view and shows every slide again');

  // Phone: swipe through the one-slide view
  p = await open(390, 844, true);
  await p.click('#pv-open');
  const swipe = async (dx) => p.evaluate((dx) => {
    const el = document.querySelector('#pv-stage') || document.body;
    const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(200)], changedTouches: [t(200)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(200 + dx)], bubbles: true }));
  }, dx);
  await swipe(-120);
  ok((await counter(p)).trim() === '2 / 15', 'swiping left moves to the next slide');
  await swipe(120);
  ok((await counter(p)).trim() === '1 / 15', 'swiping right goes back');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll in the one-slide view on a phone');
  ok(p.errs.length === 0, 'no page errors: ' + p.errs.join(' | '));

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL:', e.message); process.exit(1); });
