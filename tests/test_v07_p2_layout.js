// v0.7 final round part 2 (owner, 2 Nov, from the fold test), items 3 and 4:
// 3) Dashboard on mobile: the Assets, Liabilities and Debt cards have room between them and never overlap (390 and 884).
// 4) The Level 1 / 2 / 3 cards sit side by side on a phone as a swipeable carousel (scroll-snap), so the house stage gets more room: House tab and landing hero.
// Run: node tests/test_v07_p2_layout.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
const LAND = APP.replace(/index\.html$/, 'landing.html');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
const HOUSE = () => { if (localStorage.getItem('ht3x')) return; localStorage.setItem('ht3x', '1'); const s = { saved: 20000, target: 120000, houseType: 'terraced', depositPct: 20, prices: { terraced: 120000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, deposits: [{ amount: 20000, date: '30/10/2026' }] }; localStorage.setItem('ht3', JSON.stringify(s)); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [390, 884, 1100]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, { theme: 'dark', flag: true }); await p.addInitScript(HOUSE);
    await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    // 3) Own and owe cards
    await p.evaluate(() => showTab('overview')); await p.waitForTimeout(800);
    const c = await p.evaluate(() => { const rs = [...document.getElementById('ov-summary-row').children].map(e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
      const gaps = []; for (let i = 1; i < rs.length; i++) { const a = rs[i - 1], d = rs[i]; gaps.push(d.t >= a.b - 1 ? d.t - a.b : (d.l - a.r)); }
      const hit = rs.some((a, i) => rs.some((d, j) => j > i && a.l < d.r - 1 && d.l < a.r - 1 && a.t < d.b - 1 && d.t < a.b - 1));
      return { n: rs.length, gaps, hit, side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
    ok(c.n === 3 && !c.hit && c.gaps.every(g => g >= (w < 700 ? 14 : 10)), w + ' px: Assets, Liabilities and Debt cards do not touch or overlap (gaps ' + c.gaps.map(Math.round) + ')');
    ok(!c.side, w + ' px: dashboard has no sideways scroll');
    // 4) levels carousel
    await p.evaluate(() => showTab('house')); await p.waitForTimeout(3000);
    const l = await p.evaluate(() => { const e = document.getElementById('hb-levels'), cs = getComputedStyle(e), ks = [...e.children], tops = ks.map(k => Math.round(k.getBoundingClientRect().top));
      return { n: ks.length, oneRow: Math.max(...tops) - Math.min(...tops) <= 2, ox: cs.overflowX, snap: cs.scrollSnapType, kSnap: ks.every(k => getComputedStyle(k).scrollSnapAlign !== 'none'), h: Math.round(e.getBoundingClientRect().height), side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
    ok(l.n === 3 && l.oneRow, w + ' px: the three level cards sit side by side in one row');
    if (w < 700) {
      ok(/auto|scroll/.test(l.ox) && /x/.test(l.snap) && l.kSnap, w + ' px: the row swipes sideways and snaps (' + l.ox + ', ' + l.snap + ')');
      ok(l.h <= 48, w + ' px: the row is one card high, leaving the stage room (' + l.h + ' px)');
    }
    ok(!l.side, w + ' px: House tab has no sideways scroll');
    await ctx.close();
  }
  // landing hero carousel at phone width
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(LAND); await p.waitForTimeout(1200);
    const l = await p.evaluate(() => { const e = document.querySelector('.levels'), cs = getComputedStyle(e), ks = [...e.children], tops = ks.map(k => Math.round(k.getBoundingClientRect().top)); return { n: ks.length, oneRow: Math.max(...tops) - Math.min(...tops) <= 2, snap: cs.scrollSnapType, kSnap: ks.every(k => getComputedStyle(k).scrollSnapAlign !== 'none'), side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
    ok(l.n >= 3 && l.oneRow && /x/.test(l.snap) && l.kSnap && !l.side, 'landing 390 px: level cards in one swipeable snapping row (' + l.snap + ')'); await ctx.close(); }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
