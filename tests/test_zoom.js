// Zoom on the 3D house builder (the brand build is the only one; the SVG blueprint zoom is gone, owner 1 Nov 2026).
// Every house type is framed inside the stage at the default zoom (a flat or apartment frames your floor); the + and − buttons (houseZoomIn / houseZoomOut) move the 3D camera
// (HB3D.viewer.zoom()) and stay within the limits; reset returns to the default. Pinch zoom on touch is in tests/test_hb3d_levels.js.
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 640, height: 900 }, hasTouch: true, reducedMotion: 'reduce' }); await routeThree(ctx);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { if (localStorage.getItem('ht3')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
    localStorage.setItem('ht3', JSON.stringify({ saved: 30000, target: 250000, houseType: 'terraced', deposits: [{ amount: 30000, date: '01/10/2026' }], prices: { terraced: 250000, semi: 300000, detached: 450000, mansion: 900000, flat: 200000, apartment: 220000 } })); });
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await page.evaluate(() => showTab('house'));
  const ready = t => page.waitForFunction(t => window.HB3D && HB3D.viewer && HB3D.viewer.model && HB3D.viewer.brandInfo && HB3D.viewer.brandInfo() && HB3DAPP.want && HB3DAPP.want.type === t && HB3D.viewer.settled(), t, { timeout: 60000 }).catch(() => {});
  await ready('terraced');
  ok(Math.abs(await page.evaluate(() => _houseZoom) - 1.2) < 1e-9, 'default zoom is 1.2×');
  ok(await page.evaluate(() => document.getElementById('house-scene').getAttribute('data-engine') === '3d' && !document.getElementById('houseSvg')), 'the 3D stage is the house view (no SVG)');
  // every house type is framed inside the stage at the default zoom (the house's 8 corners project inside it)
  for (const t of ['terraced', 'semi', 'detached', 'mansion', 'flat', 'apartment']) {
    await page.evaluate(t => { state.houseType = t; state.target = state.prices[t]; save(); updateUI(); resetView(); }, t); await ready(t); await page.waitForTimeout(300);
    const f = await page.evaluate(() => { const v = HB3D.viewer, bb = v.model.bounds, W = v.el.clientWidth, H = v.el.clientHeight; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const x of [bb.min[0], bb.max[0]]) for (const y of [bb.min[1], bb.max[1]]) for (const z of [bb.min[2], bb.max[2]]) { const q = v.project(x, y, z); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
      const c = v.controls.target, tq = v.project(c.x, c.y, c.z); return { W, H, x0, x1, y0, y1, z: v.zoom(), focus: !!v.model.focus, tx: tq.x, ty: tq.y }; });
    const tol = 0.08;   // the brand build fills the frame; a box corner may reach just past the edge
    if (f.focus) { ok(f.tx > 0 && f.tx < f.W && f.ty > 0 && f.ty < f.H, t + ': the camera frames your floor (centre ' + f.tx.toFixed(0) + ', ' + f.ty.toFixed(0) + ' in ' + f.W + ' x ' + f.H + ')'); }
    else ok(f.x0 > -f.W * tol && f.x1 < f.W * (1 + tol) && f.y0 > -f.H * tol && f.y1 < f.H * (1 + tol) && (f.x1 - f.x0) > f.W * 0.3, t + ': framed in the stage at the default zoom (x ' + f.x0.toFixed(0) + '…' + f.x1.toFixed(0) + ' of ' + f.W + ', y ' + f.y0.toFixed(0) + '…' + f.y1.toFixed(0) + ' of ' + f.H + ')');
    await page.locator('#houseSceneCard').screenshot({ path: 'shots/zoom_' + t + '.png' });
  }
  await page.evaluate(() => { state.houseType = 'terraced'; state.target = state.prices.terraced; save(); updateUI(); resetView(); }); await ready('terraced'); await page.waitForTimeout(300);
  const z0 = await page.evaluate(() => HB3D.viewer.zoom());
  await page.evaluate(() => houseZoomIn()); await page.waitForTimeout(100);
  const z1 = await page.evaluate(() => ({ cam: HB3D.viewer.zoom(), hz: _houseZoom }));
  ok(Math.abs(z1.cam / z0 - 1.2) < 0.02 && Math.abs(z1.hz - 1.44) < 1e-6, '+ zooms the 3D camera in by 1.2× (' + z0.toFixed(2) + ' → ' + z1.cam.toFixed(2) + ')');
  await page.evaluate(() => { houseZoomOut(); houseZoomOut(); }); await page.waitForTimeout(100);
  const z2 = await page.evaluate(() => HB3D.viewer.zoom());
  ok(z2 < z0 && Math.abs(z2 / z0 - 1 / 1.2) < 0.02, '− zooms the 3D camera out (' + z2.toFixed(2) + ')');
  await page.evaluate(() => { for (let i = 0; i < 40; i++) houseZoomIn(); }); await page.waitForTimeout(100);
  const zmax = await page.evaluate(() => ({ hz: _houseZoom, max: hb3dMaxZoom() }));
  ok(zmax.hz <= zmax.max + 1e-9, 'zooming in stops at the closest the camera may go (' + zmax.hz.toFixed(2) + ' ≤ ' + zmax.max.toFixed(2) + ')');
  await page.evaluate(() => { for (let i = 0; i < 40; i++) houseZoomOut(); }); await page.waitForTimeout(100);
  ok(await page.evaluate(() => _houseZoom) >= 0.5 - 1e-9, 'zooming out stops at 0.5×');
  await page.evaluate(() => resetView()); await page.waitForTimeout(400);
  ok(Math.abs(await page.evaluate(() => _houseZoom) - 1.2) < 1e-6 && Math.abs(await page.evaluate(() => HB3D.viewer.zoom()) - z0) < 0.02, 'reset returns to the default view');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
