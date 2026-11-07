// vault-it.co/pitch-Eligent in a real browser, served through the real Worker routing from the real build:
// all 17 slides scroll on a phone with no sideways scroll, the Present button gives a one-slide view
// (arrow keys, on-screen buttons, swipe, counter, Esc to leave), and the app's two live 3D viewports draw with demo data.
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
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
  ok((await p.locator('.frame').count()) === 17, 'the page has the 17 slides');
  { const t = await p.evaluate(() => document.body.innerText); ok(!/£199|19,900/.test(t) && /£149 once/.test(t) && /100 seats at £149, up to £14,900/.test(t), 'Founding Membership matches the live Stripe price: £149, 100 places'); }
  { const t = await p.evaluate(() => document.body.innerText); ok(!/£49\.99 a year/.test(t) && /£5\.99\/mo/.test(t) && /or £59\.99 a year/.test(t), 'Pioneer yearly matches the full live price: £59.99, not the old £49.99'); }
  // v2 (owner's decisions, 6 Nov 2026): one ask with its use of funds, a forecast with both break-even lines, B2B prices, the first buyer
  { const ids = await p.evaluate(() => [...document.querySelectorAll('.frame > section')].map((s) => s.id));
    ok(ids.join() === 'cover,team,nd,problem,gap,solution,features,evidence,whynow,model,partner,impact,gtm,traction,forecast,ask,close', 'v2 slide order, with the forecast before the ask: ' + ids); }
  const txt = async (id) => p.evaluate((id) => (document.getElementById(id) || {}).innerText || '', id);
  { const a = await txt('ask');
    ok(/£250,000/.test(a) && /SEIS/.test(a) && /March 2027/.test(a) && /equity terms on request/i.test(a), 'the ask: £250,000 under SEIS, closing March 2027, equity terms on request');
    const uf = await p.evaluate(() => [...document.querySelectorAll('#ask [data-fund]')].map((e) => [e.dataset.fund, e.innerText]));
    const pct = uf.map((x) => x[0]).join('/'), sum = uf.reduce((s, x) => s + +(x[1].match(/£([\d,]+)/) || [0, '0'])[1].replace(/,/g, ''), 0);
    ok(pct === '35/20/15/15/15' && sum === 250000, 'use of funds 35/20/15/15/15 and the pounds add to £250,000: ' + pct + ' = £' + sum); }
  { const f = await txt('forecast');
    const rows = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#forecast tr[data-row]')].map((r) => [r.dataset.row, [...r.querySelectorAll('td')].slice(1).map((c) => c.textContent.trim() === '–' ? 0 : +c.textContent.replace(/[£,]/g, ''))])));
    const sum = (...a) => [0, 1, 2].map((i) => a.reduce((t, k) => t + rows[k][i], 0)), eq = (x, y) => x.join() === y.join();
    const total = sum('consumer', 'pilots', 'partner', 'sponsored'), net = total.map((t, i) => t - rows.costs[i]), cum = net.map((_, i) => net.slice(0, i + 1).reduce((x, y) => x + y, 0));
    ok(eq(rows.pilots, [12500, 0, 0]) && eq(rows.partner, [35000, 200000, 500000]) && rows.sponsored[0] === 5000 && rows.sponsored[1] === 49990 && rows.sponsored[2] > rows.sponsored[1], 'the forecast has one line per B2B stream: 5 paid pilots, Partner licences, sponsored Pioneer: ' + JSON.stringify(rows));
    ok(eq(rows.total, total) && eq(rows.net, net) && eq(rows.cumulative, cum) && eq(rows.total, [66900, 282990, 720975]) && eq(rows.cumulative, [49400, 273390, 804365]), 'the totals, net and cumulative profit add up: ' + total + ' | ' + net + ' | ' + cum);
    ok(rows.cumulative[1] > 250000 && /£273,390/.test(f) && /October 2028/.test(f) && /December 2027/.test(f) && /£13,900/.test(f) && /illustrative/i.test(f) && /not yet modelled/i.test(f) && !/£16,900|December 2028/.test(f), 'the forecast says cumulative profit passes £250,000 (October 2028), the with-raise line, and what is not modelled'); }
  { const b2 = await txt('partner'); ok(/£2,500 to £5,000/.test(b2) && /£10k to £25k/.test(b2) && /£1 to £3/.test(b2) && /pen test/i.test(b2), 'the B2B slide prices the four offers and the cost of delivering white label'); }
  { const g = await txt('gtm'); ok(/3,000/.test(g) && /4%/.test(g) && /30%/.test(g) && /30-day/.test(g), 'go to market: funnel, channels and targets'); }
  ok(/sav/i.test(await txt('problem')) && /co-?founder, operations/i.test(await txt('team')) && /25% equity/.test(await txt('team')) && /250 to 750 participants/.test(await txt('nd')), 'problem leads with savers, the team slide names the operations co-founder and the 25% equity offer, the ND slide the UoL pilot');
  { const t = await p.evaluate(() => document.body.innerText); ok(!/14-DAY|14-day/.test(t) && /30-DAY/i.test(t), 'the trial is 30 days, as in the app'); }
  // v3 (owner's edits, 7 Nov 2026)
  { const w = await p.evaluate(() => { const h = document.querySelector('#cover h1'), sp = h && h.querySelector('span'); return h && sp ? { all: h.textContent, it: sp.textContent, col: getComputedStyle(sp).color, rest: getComputedStyle(h).color } : null; });
    ok(w && w.all === 'Vault-It' && w.it === '-It' && w.col === 'rgb(68, 192, 185)' && w.rest !== w.col, 'the wordmark draws "-It" in teal: ' + JSON.stringify(w)); }
  { const t = await p.evaluate(() => { const out = {}; document.querySelectorAll('[data-tag] span, #cover h2 span').forEach((s) => { const cs = getComputedStyle(s); out[s.textContent] = { c: cs.color, stroke: cs.webkitTextStrokeWidth }; });
      const lum = (c) => { const m = c.match(/\d+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      out.contrast = out.red ? (lum(out.red.c) + 0.05) / (lum('rgb(0, 19, 26)') + 0.05) : 0; return out; });
    ok(t.red && t.your && t.home && t.red.c === 'rgb(200, 32, 42)' && t.your.c === 'rgb(68, 192, 185)' && t.home.c === 'rgb(232, 197, 106)' && t.red.stroke === '0px' && t.contrast >= 3, 'the tagline: red in dark red fill, your in teal, home in gold fill, still legible (contrast ' + (t.contrast && t.contrast.toFixed(2)) + ')'); }
  { const w = await p.evaluate(() => [...document.querySelectorAll('.frame > section h2')].filter((h) => h.closest('section').id !== 'cover').map((h) => h.closest('section').id + ':' + getComputedStyle(h).fontWeight).filter((x) => !/:700$/.test(x)));
    ok(w.length === 0, 'every slide title uses the same Syne weight (700): ' + w); }
  { const tm = await txt('team'), t3 = await p.evaluate(() => !!document.querySelector('#team [data-banner]'));
    ok(t3 && ['Malcolm McPhee', 'Business Lincolnshire', 'David Amor', 'Enso Brain', 'Chris Bowser', 'Will Quenby', 'Accelerate Pipeline', 'Carolline Pallu', 'Barbican Creative Hub'].every((x) => tm.includes(x)) && !/Lucas Cox/.test(tm) && /Chris Gueffier/.test(tm) && /Rita Fortes/.test(tm), 'the team slide has the banner and the new people, and Lucas Cox is gone'); }
  { const im = await txt('impact'), sh = await p.evaluate(() => [...document.querySelectorAll('#impact [data-share]')].map((e) => +e.dataset.share)), br = await p.evaluate(() => !!document.querySelector('#impact svg[data-bridge]'));
    ok(br && sh.join() === '50,25,25' && sh.reduce((x, y) => x + y, 0) === 100 && /Public debt grants/.test(im) && /The charity/.test(im) && /Vault-It/.test(im) && /bridge/i.test(im) && /window/i.test(im) && ['Assets', 'Income', 'Debts', 'Net worth'].every((x) => im.includes(x)) && /reallocation/i.test(im) && /escalat/i.test(im), 'the Impact licence slide: 50 / 25 / 25 funding and the bridge-and-window graphic: ' + sh); }
  { const pt = await txt('partner'); ok(/Grant-funded/.test(pt) && /50% public debt grants/.test(pt) && !/Free or at cost/.test(pt), 'the B2B slide shows how the Impact licence is funded'); }
  { const m = await txt('model'), h3 = await p.evaluate(() => [...document.querySelectorAll('#model h3')].map((h) => h.textContent.trim()));
    ok(!h3.includes('Free') && !/Household/.test(m) && /30-day free trial/i.test(m) && ['£5.99', '£59.99', '£149', '£3.99', '£49.99', '£99'].every((x) => m.includes(x)) && /limited time/i.test(m) && /100/.test(m), 'business model: no Free tier, a 30-day free trial, the signed-off prices and the testers\' limited-time discount: ' + h3); }
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
  ok(/^1 \/ 17$/.test((await counter(p)).trim()), 'the counter reads 1 / 17: ' + (await counter(p)));
  const fit = await p.evaluate(() => { const r = document.querySelector('.frame.on').getBoundingClientRect(); return { w: r.width, h: r.height, l: r.left, t: r.top }; });
  ok(Math.abs(fit.w - 1280) < 2 && Math.abs(fit.h - 720) < 2 && Math.abs(fit.t - 40) < 2, 'the slide fills the screen at 16:9, centred: ' + JSON.stringify(fit));
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
  v = await visible(p);
  ok(v.length === 1 && v[0] === 'nd' && (await counter(p)).trim() === '3 / 17', 'right arrow moves forward one slide at a time: ' + v + ' ' + (await counter(p)));
  await p.keyboard.press('ArrowLeft');
  ok((await counter(p)).trim() === '2 / 17', 'left arrow goes back');
  await p.click('#pv-next');
  ok((await counter(p)).trim() === '3 / 17', 'the on-screen next button works');
  await p.click('#pv-prev');
  ok((await counter(p)).trim() === '2 / 17', 'the on-screen back button works');
  await p.keyboard.press('End');
  ok((await counter(p)).trim() === '17 / 17', 'End jumps to the last slide');
  await p.keyboard.press('ArrowRight');
  ok((await counter(p)).trim() === '17 / 17', 'it stops at the last slide');
  await p.keyboard.press('Home');
  ok((await counter(p)).trim() === '1 / 17', 'Home jumps to the first slide');
  await p.keyboard.press('Escape');
  ok(!(await p.evaluate(() => document.body.classList.contains('present'))) && (await visible(p)).length === 17, 'Esc leaves the one-slide view and shows every slide again');

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
  ok((await counter(p)).trim() === c0 && /^7 \/ 17$/.test(c0), 'clicking or dragging the 3D does not change slide: ' + c0 + ' then ' + (await counter(p)));
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
  ok((await counter(p)).trim() === '2 / 17', 'swiping left moves to the next slide');
  await swipe(120);
  ok((await counter(p)).trim() === '1 / 17', 'swiping right goes back');
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
  ok(await aud.evaluate(() => document.body.classList.contains('present')) && (await counter(aud)).trim() === '1 / 17', '?present=1 opens the audience deck in the one-slide view');
  ok(/linked/i.test(await pre.evaluate(() => document.getElementById('pr-link').textContent)), 'the presenter view shows it is linked to the audience window');
  ok(/\b1 \/ 17/.test(await pn()) && (await beat()).length > 3, 'the presenter view starts on slide 1 with its beat: ' + (await pn()) + ' · ' + (await beat()));
  const b1 = await beat();
  await aud.keyboard.press('ArrowRight'); await pre.waitForTimeout(300);
  ok(/\b2 \/ 17/.test(await pn()) && (await beat()) !== b1, 'moving the audience deck switches the notes: ' + (await pn()) + ' · ' + (await beat()));
  await pre.click('#pr-next'); await pre.waitForTimeout(300);
  ok((await counter(aud)).trim() === '3 / 17', 'Next in the presenter view moves the audience deck: ' + (await counter(aud)));
  for (let i = 0; i < 4; i++) await pre.keyboard.press('ArrowRight'); await pre.waitForTimeout(300);
  ok((await counter(aud)).trim() === '7 / 17' && /\b7 \/ 17/.test(await pn()), 'arrow keys in the presenter view drive the audience deck too');
  ok(/drag/i.test(await pre.evaluate(() => document.getElementById('pr-cues').textContent)), 'the live demo slide carries its DO cue');
  ok((await pre.locator('#pr-cues svg').count()) >= 2, 'the cues carry their icons');
  ok(/^This is the app, live/m.test(await pre.evaluate(() => document.getElementById('pr-script').innerText)), 'the script panel shows this slide\'s script');
  { const r = await pre.evaluate(() => { const a = document.querySelector('.pr-sc').getBoundingClientRect(), s = document.querySelector('.pr-side').getBoundingClientRect(); return { l: a.left > innerWidth / 2, below: a.top >= s.bottom - 1 }; });
    ok(r.l && r.below, 'the script sits in the lower right, under the notes: ' + JSON.stringify(r)); }
  ok(await pre.evaluate(() => document.querySelector('#pr-cur .frame, #pr-cur section') !== null && document.querySelector('#pr-nxt section') !== null), 'the mirror shows the current and next slide');
  ok(!/pr-|presenter/.test(await aud.evaluate(() => document.body.innerText)), 'nothing from the presenter view shows in the audience window');
  for (const [w, h] of [[1280, 800], [390, 844]]) { await pre.setViewportSize({ width: w, height: h }); await pre.waitForTimeout(200);
    ok(await pre.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'presenter view has no sideways scroll at ' + w + ' px');
    const lay = await pre.evaluate(() => { const sc = document.querySelector('.pr-sc'), sd = document.querySelector('.pr-side'), m = document.querySelector('.pr-mir').getBoundingClientRect(), a = sc.getBoundingClientRect(), b = sd.getBoundingClientRect();
      return { sideFits: sd.scrollHeight <= sd.clientHeight + 2, scFits: w => true, apart: a.bottom <= m.top + 1 || a.left >= m.right - 1, scH: sc.clientHeight, scS: sc.scrollHeight }; });
    ok(lay.sideFits && lay.apart && (w > 820 || lay.scH + 2 >= lay.scS), 'at ' + w + ' px the notes and script do not overlap the mirror and the script shows in full on a phone: ' + JSON.stringify(lay)); }
  {
    const C = await pre.evaluate(() => { const ids = [...document.getElementById('pr-slides').content.querySelectorAll('section')].map((s) => s.id); return { ids, n: ids.length }; });
    ok(C.n === 17 && C.ids.join() === 'cover,team,nd,problem,gap,solution,features,evidence,whynow,model,partner,impact,gtm,traction,forecast,ask,close', 'the presenter mirror carries the same 17 slides'); }
  { const src = await pre.content(); ok(!/free or at cost/i.test(src) && /Impact licence: grant-funded/.test(src) && /grant-funded, a split we are proposing/.test(src), 'the presenter notes describe the Impact licence as grant-funded, not free or at cost'); }
  await pre.keyboard.press('End'); await pre.waitForTimeout(200);
  ok(/\b17 \/ 17/.test(await pn()), 'the presenter view reaches slide 17');
  await pre.keyboard.press('ArrowLeft'); await pre.waitForTimeout(200);
  ok(/250,000/.test(await pre.evaluate(() => document.getElementById('pr-script').innerText)) && /Start 4:\d\d/.test(await pre.evaluate(() => document.getElementById('pr-win').textContent)), 'the ask has its script and starts before 5:00');
  ok(aud.errs.length === 0 && pre.errs.length === 0, 'no page errors in either window: ' + aud.errs.concat(pre.errs).join(' | '));
  await ctx2.close();

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL:', e.message); process.exit(1); });
