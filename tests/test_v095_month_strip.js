// v0.95 (owner, 11 Nov): "fix the month strip clipping at 390". The contribution-streak month strip in the House Builder History card
// must show every month inside the card at 390 px (no sideways scroll, nothing cut off); on desktop it stays one row.
// Run: node tests/test_v095_month_strip.js
require('./lib/vi'); const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SEED = () => {
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  if (localStorage.getItem('g095m')) return; localStorage.setItem('g095m', '1');
  localStorage.setItem('ht3', JSON.stringify({ saved: 16000, target: 320000, houseType: 'semi', depositPct: 20, deposits: [{ amount: 16000, date: '30/10/2026' }] }));
};
const HIDE = '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}';
(async () => {
  const b = await chromium.launch();
  for (const [w, mob] of [[390, true], [360, true], [1100, false]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: mob, hasTouch: mob });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com|google\.com\/s2/, r => r.abort());
    const p = await ctx.newPage();
    await p.addInitScript(SEED); await p.goto(APP); await p.waitForTimeout(1500); await p.addStyleTag({ content: HIDE });
    await p.evaluate(() => { try { setSetting('view', 'adv'); } catch (e) {} showTab('house'); }); await p.waitForTimeout(1200);
    for (const mode of ['monthly', 'weekly']) {
      await p.evaluate(m => { state.habitMode = m; renderHabitTracker(); }, mode);
      const r = await p.evaluate(() => { const c = document.getElementById('habit-circles'), cr = c.getBoundingClientRect(); let maxR = 0, n = 0;
        c.querySelectorAll('span,div').forEach(e => { if (e.children.length === 0 && e.textContent.trim()) { n++; maxR = Math.max(maxR, e.getBoundingClientRect().right); } });
        return { sw: c.scrollWidth, cw: c.clientWidth, over: Math.round(maxR - cr.right), labels: n, page: document.documentElement.scrollWidth > innerWidth + 1 }; });
      ok(r.sw <= r.cw + 1 || w >= 700, w + 'px ' + mode + ': the strip does not scroll sideways ' + JSON.stringify(r));
      ok(r.over <= 1 || w >= 700, w + 'px ' + mode + ': no label is cut off at the right edge ' + JSON.stringify(r));
      ok(!r.page, w + 'px ' + mode + ': the page does not scroll sideways');
    }
    await p.evaluate(() => { state.habitMode = 'monthly'; renderHabitTracker(); });
    const m = await p.evaluate(() => [...document.querySelectorAll('#habit-circles span')].map(e => e.textContent).filter(t => /^(Jan|Nov|Dec)$/.test(t)).length);
    ok(m === 9, w + 'px: Jan, Nov and Dec are drawn for all three years (' + m + ')');
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
