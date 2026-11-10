// v0.95 (owner, 10 Nov): "the tester could not reset their own house deposits on the House Builder page ... it needs to be where it always has been" (bottom of the House Builder page).
// At 390 px the Reset Tracker button must be reachable at the bottom of the House Builder page, tappable, and clear the deposit.
// Run: node tests/test_v095_deposit_reset.js
require('./lib/vi'); const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SEED = () => {
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  if (localStorage.getItem('g095')) return; localStorage.setItem('g095', '1');
  localStorage.setItem('ht3', JSON.stringify({ saved: 16000, target: 320000, houseType: 'semi', depositPct: 20,
    prices: { terraced: 200000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, deposits: [{ amount: 16000, date: '30/10/2026' }] }));
};
const HIDE = '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}';
(async () => {
  const b = await chromium.launch();
  for (const [w, mob] of [[390, true], [1100, false]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: mob, hasTouch: mob });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com|google\.com\/s2/, r => r.abort());
    const p = await ctx.newPage(); p.on('dialog', d => d.accept());
    await p.addInitScript(SEED); await p.goto(APP); await p.waitForTimeout(1500); await p.addStyleTag({ content: HIDE });
    await p.evaluate(() => { try { setSetting('view', 'adv'); } catch (e) {} showTab('house'); }); await p.waitForTimeout(1200);
    const btn = p.locator('#btnReset');
    ok(await btn.count() === 1, w + 'px: Reset Tracker button exists');
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    const info = await p.evaluate(() => { const e = document.getElementById('btnReset'); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      const x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y);
      return { w: r.width, h: r.height, disp: cs.display, vis: cs.visibility, onTop: !!top && (top === e || e.contains(top)), inView: r.top >= 0 && r.bottom <= innerHeight, hOver: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ok(info && info.w > 40 && info.h >= 30 && info.disp !== 'none' && info.vis !== 'hidden', w + 'px: button is shown and big enough to tap ' + JSON.stringify(info));
    ok(info && info.onTop && info.inView, w + 'px: nothing covers the button after scrolling to it ' + JSON.stringify(info));
    await btn.click({ timeout: 4000 }).catch(e => ok(false, w + 'px: tap failed: ' + e.message.split('\n')[0]));
    await p.waitForTimeout(500);
    const st = await p.evaluate(() => ({ saved: state.saved, n: state.deposits.length }));
    ok(st.saved === 0 && st.n === 0, w + 'px: tapping Reset clears the deposits ' + JSON.stringify(st));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
