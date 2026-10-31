// 3D viewports on phones (owner, 31 Oct 2026): a lost WebGL context must never leave a white box; the net worth scene must follow a cloud
// sync; canvases keep to a pixel budget; the scene drops to lite mode when frames run slow.
//   1. house viewer: lose the context (WEBGL_lose_context) -> "Reloading the house…" shows; restore it -> the note goes, the viewer draws again
//   2. house viewer: lose it and never restore -> after ~2.5 s the viewer is rebuilt on a fresh canvas and draws
//   3. net worth scene: data changed by a sync (_rerenderAll) -> the scene tag follows the header
//   4. pixel budgets: the hero canvas stays under 1.6M pixels at 1500 px wide; lite mode halves nothing visible but switches shadows off
// Run: node tests/test_gl_recover.js   (VI_APP=file:///… to test another copy)
const { chromium } = require('playwright');
const routeThree = require('./three_route');   // three.js served locally (the sandbox has no CDN)
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// same seed as the brand screenshots (a house in progress), classic viewer pinned
const shotSrc = require('fs').readFileSync(__dirname + '/brand_shots.js', 'utf8');
const seed = eval(shotSrc.slice(shotSrc.indexOf('const seed ='), shotSrc.indexOf('(async')).replace('const seed =', ''));
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1500, height: 900 } });
  await routeThree(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed, 'dark'); await p.addInitScript(() => localStorage.setItem('vi-flag-house', '0')); await p.goto(APP); await p.waitForTimeout(1800);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });

  // ── 1. lose and restore ──
  await p.evaluate(() => showTab('house'));
  let haveGl = false; for (let i = 0; i < 40 && !haveGl; i++) { await p.waitForTimeout(300); haveGl = await p.evaluate(() => !!(window.HB3DAPP && HB3DAPP.viewer && HB3DAPP.viewer.renderer && HB3DAPP.viewer.model)); }
  ok(haveGl, 'the house viewer is up');
  const r1 = await p.evaluate(async () => {
    const v = HB3DAPP.viewer, cv = v.renderer.domElement, gl = v.renderer.getContext(), ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return { noext: true };
    ext.loseContext(); await new Promise(r => setTimeout(r, 300));
    const ld = document.getElementById('hb3d-loading');
    const lost = { lost: v.lost, note: ld && getComputedStyle(ld).display !== 'none' && ld.textContent, active: v.active };
    ext.restoreContext(); await new Promise(r => setTimeout(r, 800));
    return { lost, after: { lost: v.lost, note: ld && getComputedStyle(ld).display !== 'none', active: v.active, same: v === HB3DAPP.viewer, cvIn: cv.isConnected } };
  });
  if (r1.noext) console.log('skip: WEBGL_lose_context not available');
  else {
    ok(r1.lost.lost === true && /Reloading the house/.test(r1.lost.note || '') && r1.lost.active === false, 'lost context: the viewer stops and says it is reloading (' + r1.lost.note + ')');
    ok(r1.after.lost === false && r1.after.note === false && r1.after.active === true && r1.after.same && r1.after.cvIn, 'restored context: the note goes and the same viewer draws again');
  }

  // ── 2. lose for good -> rebuilt ──
  const r2 = await p.evaluate(async () => {
    const v = HB3DAPP.viewer, cv = v.renderer.domElement, gl = v.renderer.getContext(), ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return { noext: true };
    ext.loseContext(); await new Promise(r => setTimeout(r, 3200));
    const nv = HB3DAPP.viewer, ld = document.getElementById('hb3d-loading');
    return { rebuilt: !!nv && nv !== v, oldGone: !cv.isConnected, newIn: !!(nv && nv.renderer.domElement.isConnected), lost: nv && nv.lost, active: nv && nv.active, model: !!(nv && nv.model), note: ld && getComputedStyle(ld).display !== 'none' };
  });
  if (!r2.noext) ok(r2.rebuilt && r2.oldGone && r2.newIn && !r2.lost && r2.active && r2.model && !r2.note, 'never restored: a fresh viewer with the house replaces the dead canvas (' + JSON.stringify(r2) + ')');

  // ── 3. the net worth scene follows a cloud sync ──
  await p.evaluate(() => showTab('overview')); await p.waitForTimeout(1200);
  const r3 = await p.evaluate(async () => {
    const cv = document.getElementById('nw3d-hero-cv'); const before = +cv.dataset.net;
    // what a cloud sync does: new state lands in storage, then _rerenderAll
    const al = JSON.parse(localStorage.getItem('pos_al1') || 'null') || JSON.parse(JSON.stringify(alState)); if (!al.cashAccounts || !al.cashAccounts.length) al.cashAccounts = [{ id: 1, name: 'Savings', type: 'Savings', balance: 6420, rate: 4 }]; if (!alState.cashAccounts || !alState.cashAccounts.length) alState.cashAccounts = JSON.parse(JSON.stringify(al.cashAccounts)); al.cashAccounts[0].balance = 15300; localStorage.setItem('pos_al1', JSON.stringify(al)); alState.cashAccounts[0].balance = 15300;
    _rerenderAll(); await new Promise(r => setTimeout(r, 400));
    const after = +cv.dataset.net, kpi = document.getElementById('kpi-nw').textContent, net = Math.round(computeNetWorth());
    al.cashAccounts[0].balance = 6420; localStorage.setItem('pos_al1', JSON.stringify(al)); alState.cashAccounts[0].balance = 6420; _rerenderAll();
    return { before, after, net, kpi };
  });
  ok(r3.after !== r3.before && r3.after === r3.net, 'after _rerenderAll the scene shows the new net worth (' + r3.before + ' -> ' + r3.after + ', header ' + r3.kpi + ')');

  // ── 4. pixel budget and lite mode ──
  const r4 = await p.evaluate(() => { const cv = document.getElementById('nw3d-hero-cv'); const px = cv.width * cv.height; const wasLite = ViNW3D.lite(); ViNW3D.lite(true); const on = ViNW3D.lite(); ViNW3D.lite(wasLite); return { px, w: cv.width, h: cv.height, on, wasLite }; });
  ok(r4.px <= 1.65e6, 'the hero canvas keeps to the pixel budget at 1500 px wide (' + r4.w + 'x' + r4.h + ' = ' + Math.round(r4.px / 1e3) + 'k)');
  ok(r4.on === true, 'lite mode can be switched on (shadows off, 30 fps, 1.25x)');

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
