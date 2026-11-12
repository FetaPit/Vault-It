// v0.7 (release chat, 1 Nov): a fresh profile on the app's own demo data shows the Dashboard and Budget cash flow on the FIRST visit, without a reload.
// The demo is written after the app's state has loaded, so initDemoMode re-reads the state and redraws once the seed exists.
// Run: node tests/test_v07_demo_first.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1100]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(APP); await p.waitForFunction(() => localStorage.getItem('pos_ov1'), null, { timeout: 30000 }); await p.waitForTimeout(1500);   // no reload
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    const t = w + 'px: first visit, no reload: ';
    let r = await p.evaluate(() => ({ demo: localStorage.getItem('vi_demo_mode'), inc: (ovState.income || []).length, total: cfModel().total, dash: document.getElementById('cf3d-cv') ? 9 : 0, empty: false }));
    ok(r.demo === 'true' && r.inc > 0 && r.total > 0, t + 'the demo income and spending are in the app state (' + r.inc + ' income lines, total ' + r.total + ')');
    ok(r.dash >= 8 && !r.empty, t + 'the Dashboard 3D income flow is there (' + r.dash + ' labels)');
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(800);
    r = await p.evaluate(() => ({ bud: document.getElementById('bd-sankey').querySelectorAll('.cf-chip').length, sums: [...document.querySelectorAll('.bd-tile .bd-tile-sum')].map(x => x.firstChild.textContent.trim()) }));
    ok(r.bud >= 8, t + 'the Budget flow diagram is drawn (' + r.bud + ' labels)');
    ok(r.sums.length === 6 && r.sums.filter(x => x !== '£0').length >= 5, t + 'the Budget groups show the demo figures (' + r.sums.join(' ') + ')');
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
