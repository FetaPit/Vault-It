// 3D net worth draws on first show (owner, 31 Oct 2026, live defect on a phone: the scene stayed empty until the 3D view was toggled
// off and on). Cause: the stage read the oldest of several queued IntersectionObserver entries, so a stale "not visible" could stick.
// The test makes every observer deliver a stale "not intersecting" entry before the real ones, which is what the phone did, and
// checks the hero scene still draws without a toggle, at phone and desktop widths, in Night and Daylight.
// Run: node tests/test_nw3d_first.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const fs = require('fs'); const shotSrc = fs.readFileSync(__dirname + '/brand_shots.js', 'utf8');
const seed = eval(shotSrc.slice(shotSrc.indexOf('const seed ='), shotSrc.indexOf('(async')).replace('const seed =', ''));
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[390, 'dark'], [1180, 'light']]) {
    const mob = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.addInitScript(() => {   // every observer callback first sees a stale "not intersecting" entry for the same target
      const IO = window.IntersectionObserver;
      window.IntersectionObserver = function (cb, opt) { return new IO(function (es, ob) { const stale = es.map(e => ({ target: e.target, isIntersecting: false, intersectionRatio: 0, boundingClientRect: e.boundingClientRect, time: e.time - 1 })); cb(stale.concat(es), ob); }, opt); };
      window.IntersectionObserver.prototype = IO.prototype;
    });
    await p.addInitScript(seed, theme); await p.addInitScript(() => localStorage.setItem('vi-flag-nw', '1'));
    await p.goto(APP); await p.waitForTimeout(2000);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner,#pro-offer-modal,#tester-welcome{display:none!important}' });
    await p.evaluate(() => showTab('overview')); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const c = document.getElementById('nw3d-hero-cv'); const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 64) if (Math.abs(d[i] - d[i + 1]) + Math.abs(d[i + 1] - d[i + 2]) > 60) lit++; return { drawn: !!(nw3d.hero && nw3d.hero._P), lit, main: nw3d.main(), net: c.dataset.net }; });
    ok(r.main === '3d' && r.drawn && r.lit > 200, w + ' ' + theme + ': the 3D scene draws on first show, no toggle needed (' + JSON.stringify(r) + ')');
    await ctx.close();
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
