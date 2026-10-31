// Phone sign-off group C (owner, 31 Oct): Cash and savings 3D draws a smaller ground plane (survey grid) that fades out in the scene's fog,
// so the scene is lighter and the grid has no visible hard edge. Run: node tests/test_signoff_c.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[390, 844], [1100, 900]]) {
    const ph = w < 700, ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: ph, hasTouch: ph }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
      localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 2000 }], physicalCash: [{ id: 1, where: 'Safe', amount: 347, date: '2026-10-01' }], metals: {} })); });
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner{display:none!important}' });
    await p.evaluate(() => showTab('assets')); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const V = V3.cash, g = V.grid; g.geometry.computeBoundingBox(); const bb = g.geometry.boundingBox, side = bb.max.x - bb.min.x, R = V.R;
      return { side, R, ratio: side / R, fog: g.material.fog, far: V.sc.fog.far / R, lines: g.geometry.attributes.position.count / 2 }; });
    const T = w + 'px: ';
    ok(r.R > 0 && r.ratio <= 8.1, T + 'the ground grid is about 7 scene sizes wide, not 14 (' + r.ratio.toFixed(1) + ')');
    ok(r.fog === true && r.far <= 5.1, T + 'the grid fades into the fog, so it has no hard edge (fog far ' + r.far.toFixed(1) + ' x size)');
    ok(r.lines <= 340, T + 'fewer grid lines to draw (' + r.lines + ')');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
