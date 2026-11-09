// Renders the net worth over time post: the app's own "Net worth progress" card with Forecast on, filmed frame by frame.
//   PW=<playwright> MUXER=<mp4-muxer.js> node docs/marketing/instagram/networth.js
// Opens index.html with example figures (the same seed as tests/test_nw3d.js), puts the page on a virtual clock so every
// frame is exact, and lets slides.js draw each frame around the card's canvas. Writes out/networth-01.mp4 and a cover PNG.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PW || 'playwright');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(__dirname, 'out');
const fileUrl = (p) => 'file:///' + p.split(path.sep).join('/');
const save = (name, b64) => { fs.writeFileSync(path.join(OUT, name), Buffer.from(b64.replace(/^data:[^,]+,/, ''), 'base64')); console.log('  wrote', name); };

// example figures only: none of this is anyone's real money
const seed = () => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi-flag-nw', '1');
  if (!localStorage.getItem('pos_debt1')) {
    localStorage.setItem('vi_declined_demo', 'true');
    localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
    localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
    localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }],
      snapshots: [{ month: '2026-03', nw: 4200, debt: 9800, income: 2300 }, { month: '2026-06', nw: 6900, debt: 9000, income: 2300 }, { month: '2026-08', nw: 9100, debt: 8100, income: 2400 }] }));
    localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Barclaycard', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }, { id: 2, name: 'Car loan', original: 6000, balance: 3650, rate: 8, min: 180, type: 'loan' }] }));
    localStorage.setItem('pos_al1', JSON.stringify({ metals: { gold: 1, silver: 10, platinum: 0, palladium: 0 }, cashAccounts: [{ id: 1, name: 'Savings', type: 'Savings', balance: 6420, rate: 4 }],
      otherAssets: [{ id: 4, name: 'Watch', value: 1800 }], liabilities: [] }));
    localStorage.setItem('ht3', JSON.stringify({ saved: 8500, target: 240000, houseType: 'terraced', depositPct: 20, deposits: [] }));
  }
  // virtual clock: animation frames run only when the renderer steps them
  let T = 0; const q = [];
  const step = (ms) => { T += ms; const cbs = q.splice(0); cbs.forEach(cb => { try { cb(T); } catch (e) { console.error(e); } }); };
  performance.now = () => T;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  window.__vt = { step, pump: (ms) => { for (let i = 0; i < ms / 33.34; i++) step(33.34); }, now: () => T };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 760, height: 1000 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('page error:', e.message));
  await p.addInitScript(seed);
  await p.goto(fileUrl(path.join(ROOT, 'index.html')));
  for (let i = 0; i < 20; i++) { await p.evaluate(() => window.__vt.pump(150)); await p.waitForTimeout(100); }
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#vi-tour,.vi-tour{display:none!important}' });
  await p.evaluate(() => showTab('overview'));
  for (let i = 0; i < 6; i++) { await p.evaluate(() => window.__vt.pump(150)); await p.waitForTimeout(100); }
  const fc = await p.evaluate(() => { const b = document.getElementById('nw3d-fc'); if (b.getAttribute('aria-pressed') !== 'true') b.click(); return b.getAttribute('aria-pressed'); });
  await p.evaluate(() => { const c = document.getElementById('nw3d-trk-card'); window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 10); });
  for (let i = 0; i < 6; i++) { await p.evaluate(() => window.__vt.pump(150)); await p.waitForTimeout(100); }
  const d = await p.evaluate(() => nw3d.tracker.data());
  console.log('forecast', fc, 'months', d.labels.join(', '), 'today', d.today);
  if (d.labels.length <= d.today + 1) throw new Error('forecast months missing');

  await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Oxanium:wght@700&family=Syne:wght@800&family=DM+Sans:wght@400;500;700&family=Share+Tech+Mono&display=block' });
  await p.addScriptTag({ path: process.env.MUXER || require.resolve('mp4-muxer/build/mp4-muxer.js') });
  // __NW.at(ms): move the clock to ms after the start, replaying the card's intro at 0, and hand back its canvas
  await p.evaluate(() => {
    const cv = document.getElementById('nw3d-trk-cv'); let base = null;
    window.__NW = { at(ms) {
      if (base === null || ms === 0) { window.__vt.step(33.34); base = window.__vt.now(); nw3d.tracker.replay(); }
      if (nw3d.tracker.st) nw3d.tracker.st.zoom = 1.3;   // fill the 4:5 panel
      while (window.__vt.now() < base + ms) window.__vt.step(Math.min(33.34, base + ms - window.__vt.now()) || 33.34);
      return cv;
    } };
  });
  await p.addScriptTag({ path: path.join(__dirname, 'slides.js') });
  console.log('prepare', JSON.stringify(await p.evaluate(() => window.__IG.prepare())));
  const sets = await p.evaluate(() => window.__IG.sets);
  const i = sets.indexOf('networth');
  const r = await p.evaluate(k => window.__IG.encode(k), i);
  save('networth-01.mp4', r.mp4);
  save('networth-01-cover.png', r.png);
  await browser.close();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
