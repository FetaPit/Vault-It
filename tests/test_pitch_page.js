// vault-it.co/pitch-Eligent in a real browser, served through the real Worker routing from the real build:
// all 15 slides scroll on a phone with no sideways scroll, the Present button gives a one-slide view
// (arrow keys, on-screen buttons, swipe, counter, Esc to leave), and the app's two live 3D viewports draw with demo data.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), DIST = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vaultit-pitch-'));

(async () => {
  cp.execFileSync('node', [path.join(ROOT, 'tools', 'build_site.js')], { env: { ...process.env, SITE_OUT: DIST }, stdio: ['ignore', 'ignore', 'inherit'] });
  const { route } = await import(pathToFileURL(path.join(ROOT, 'worker', 'index.mjs')).href);
  const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.js': 'text/javascript' };
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

  // Live 3D viewports: the app's Net worth in 3D and Net worth progress, with the app's demo data
  p = await open(1280, 800);
  const hosts = new Set(); p.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1') hosts.add(u.hostname); });
  for (const [kind, sid, re] of [['nw', 'features', /^Own £[\d,]+ · Owe £[\d,]+ · Net worth £[\d,]+$/], ['trk', 'evidence', /^Today: net worth £[\d,]+ · debt £[\d,]+$/]]) {
    await p.locator('#' + sid).scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
    const st = await p.evaluate((kind) => { const b = document.querySelector('.live[data-live="' + kind + '"]'); if (!b) return null;
      const cv = b.querySelector('canvas'), r = cv.getBoundingClientRect(), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0;
      for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 40) lit++;
      return { on: b.classList.contains('on'), read: b.querySelector('.live-read').textContent, w: r.width, h: r.height, lit }; }, kind);
    ok(st && st.on, kind + ': the live viewport is on the ' + sid + ' slide');
    ok(st && re.test(st.read), kind + ': its readout shows the demo figures: ' + (st && st.read));
    ok(st && st.lit > 500, kind + ': the 3D scene is drawn (' + (st && st.lit) + ' lit samples)');
    ok(st && Math.abs(st.w / st.h - (kind === 'nw' ? 1080 / 560 : 1040 / 560)) < 0.02, kind + ': it sits in its slot on the slide: ' + JSON.stringify(st && [st.w, st.h]));
  }
  ok([...hosts].every((h) => /^fonts\.(googleapis|gstatic)\.com$/.test(h)), 'no outside hosts besides Google Fonts: ' + [...hosts]);
  await p.locator('#features').scrollIntoViewIfNeeded(); await p.evaluate(() => document.getElementById('pv-open').click()); await p.waitForTimeout(600);   // a pointer click would first scroll the sticky header's page to the top
  const c0 = (await counter(p)).trim();
  const lb = await p.locator('.frame.on .live canvas').boundingBox();
  ok(!!lb, 'the live viewport shows in the one-slide view');
  if (lb) { await p.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2); await p.mouse.move(lb.x + 10, lb.y + 10); await p.mouse.down(); await p.mouse.move(lb.x + 160, lb.y + 10, { steps: 6 }); await p.mouse.up(); }
  ok((await counter(p)).trim() === c0 && /^5 \/ 15$/.test(c0), 'clicking or dragging the 3D does not change slide: ' + c0 + ' then ' + (await counter(p)));
  await p.locator('.frame.on .live [data-z="in"]').click();
  ok((await counter(p)).trim() === c0, 'the zoom buttons do not change slide either');
  ok(p.errs.length === 0, 'no page errors with the live viewports: ' + p.errs.join(' | '));
  await p.keyboard.press('Escape');

  // A phone's scrolling deck is too small for the live 3D: the matching still shows instead
  p = await open(390, 844);
  await p.locator('#features').scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
  const ph = await p.evaluate(() => [...document.querySelectorAll('.live')].map((b) => { const im = b.parentNode.querySelector('img[data-live="' + b.dataset.live + '"]');
    return { on: b.classList.contains('on'), op: getComputedStyle(b).opacity, still: !!(im && im.complete && im.naturalWidth > 100) }; }));
  ok(ph.length === 2 && ph.every((x) => !x.on && x.op === '0' && x.still), 'at 390 px the live viewports stay off and their stills show: ' + JSON.stringify(ph));

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

  // Presenter view: a private second window with beats and cues that follows the audience deck, and drives it
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const aud = await ctx2.newPage(); aud.errs = []; aud.on('pageerror', (e) => aud.errs.push(e.message));
  const pre = await ctx2.newPage(); pre.errs = []; pre.on('pageerror', (e) => pre.errs.push(e.message));
  await aud.goto(BASE + '/pitch-Eligent?present=1', { waitUntil: 'domcontentloaded' });
  await pre.goto(BASE + '/pitch-Eligent-presenter', { waitUntil: 'domcontentloaded' }); await pre.waitForTimeout(500);
  const pn = () => pre.evaluate(() => document.getElementById('pr-n').textContent.trim());
  const beat = () => pre.evaluate(() => document.getElementById('pr-beat').textContent.trim());
  ok(await aud.evaluate(() => document.body.classList.contains('present')) && (await counter(aud)).trim() === '1 / 15', '?present=1 opens the audience deck in the one-slide view');
  ok(/linked/i.test(await pre.evaluate(() => document.getElementById('pr-link').textContent)), 'the presenter view shows it is linked to the audience window');
  ok(/\b1 \/ 15/.test(await pn()) && (await beat()).length > 3, 'the presenter view starts on slide 1 with its beat: ' + (await pn()) + ' · ' + (await beat()));
  const b1 = await beat();
  await aud.keyboard.press('ArrowRight'); await pre.waitForTimeout(300);
  ok(/\b2 \/ 15/.test(await pn()) && (await beat()) !== b1, 'moving the audience deck switches the notes: ' + (await pn()) + ' · ' + (await beat()));
  await pre.click('#pr-next'); await pre.waitForTimeout(300);
  ok((await counter(aud)).trim() === '3 / 15', 'Next in the presenter view moves the audience deck: ' + (await counter(aud)));
  await pre.keyboard.press('ArrowRight'); await pre.keyboard.press('ArrowRight'); await pre.waitForTimeout(300);
  ok((await counter(aud)).trim() === '5 / 15' && /\b5 \/ 15/.test(await pn()), 'arrow keys in the presenter view drive the audience deck too');
  ok(/drag/i.test(await pre.evaluate(() => document.getElementById('pr-cues').textContent)), 'the live demo slide carries its DO cue');
  ok((await pre.locator('#pr-cues svg').count()) >= 2, 'the cues carry their icons');
  ok(await pre.evaluate(() => document.querySelector('#pr-cur .frame, #pr-cur section') !== null && document.querySelector('#pr-nxt section') !== null), 'the mirror shows the current and next slide');
  ok(!/pr-|presenter/.test(await aud.evaluate(() => document.body.innerText)), 'nothing from the presenter view shows in the audience window');
  for (const [w, h] of [[1280, 800], [390, 844]]) { await pre.setViewportSize({ width: w, height: h }); await pre.waitForTimeout(200);
    ok(await pre.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'presenter view has no sideways scroll at ' + w + ' px'); }
  ok(aud.errs.length === 0 && pre.errs.length === 0, 'no page errors in either window: ' + aud.errs.concat(pre.errs).join(' | '));
  await ctx2.close();

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL:', e.message); process.exit(1); });
