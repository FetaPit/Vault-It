// v0.9.1 (Chief of Staff, 3 Nov 2026): the Net worth 3D plate and the Budget tree map were cropped at the bottom at 1440 (and on live) with real data.
// The camera fit measured once and ignored the idle yaw swing; now it iterates and covers the swing. With real demo data, at 1100 and 1440  no gold plate outline touches the stage's bottom, left or right edge at any point of the swing, and the Budget map's blocks stay inside.
// Run: node tests/test_v091_3d_fit.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
const bsrc = require('fs').readFileSync(__dirname + '/test_bd_flags.js', 'utf8'); const EXP = eval(bsrc.match(/const EXP = (\[.*\]);/)[1]);
// solid gold plate outline pixels (alpha .9) on the stage edges; the fading ping ring (alpha <= .45) is meant to pass beyond it. The Net worth tag top right is skipped: top 100 px
const edgeGold = (id) => { const cv = document.getElementById(id), x = cv.getContext('2d'), w = cv.width, h = cv.height, k = w / cv.clientWidth; let n = 0;
  const px = (X, Y) => { const d = x.getImageData(X, Y, 1, 1).data; return d[3] > 180 && d[0] > 170 && d[1] > 140 && d[2] < 150 && d[0] - d[2] > 60; };
  for (let X = 2; X < w - 2; X += 2) for (let Y of [h - 3, h - 2]) if (px(X, Y)) n++;
  for (let Y = Math.round(100 * k); Y < h - 2; Y += 2) for (let X of [1, 2, w - 3, w - 2]) if (px(X, Y)) n++;
  return n; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1100, 800], [1440, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, { theme: 'dark', flag: true }); await p.addInitScript((e) => { const o = JSON.parse(localStorage.getItem('pos_ov1')); if (o.expenses.length < 3) { o.expenses = e; localStorage.setItem('pos_ov1', JSON.stringify(o)); } }, EXP);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2000);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    const T = w + 'x' + h + ': ';
    await p.evaluate(() => document.getElementById('nw3d-hero-stage').scrollIntoView({ block: 'center' })); await p.waitForTimeout(7000);
    let worst = 0; for (let i = 0; i < 100; i++) { worst = Math.max(worst, await p.evaluate(edgeGold, 'nw3d-hero-cv')); await p.waitForTimeout(280); }   // one full swing is 26 s
    ok(worst === 0, T + 'Net worth plate stays inside the stage through the camera swing (' + worst + ' edge pixels)');
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(600); await p.click('#bd-view button[data-v="3d"]');
    await p.evaluate(() => document.getElementById('bd3d-stage').scrollIntoView({ block: 'center' })); await p.waitForTimeout(7000);
    const r = await p.evaluate(() => { const e = bd3d.engine(), cv = document.getElementById('bd3d-cv'); return { rects: e.rects(), cw: cv.clientWidth, ch: cv.clientHeight }; });
    worst = 0; for (let i = 0; i < 120; i++) { worst = Math.max(worst, await p.evaluate(edgeGold, 'bd3d-cv')); await p.waitForTimeout(290); }   // one full swing is 33 s
    ok(worst === 0, T + 'Budget tree map outline stays inside the stage (' + worst + ' edge pixels)');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
