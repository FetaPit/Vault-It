// v0.7 final round, round 1 item 1 (owner, 2 Nov, fold test): an uploaded 3D model's tile is a real viewport. One finger or the mouse orbits,
// two fingers pinch to zoom and drag to pan, a double tap or double click resets, a single tap or click opens the viewer; zoom is clamped; the
// page still scrolls from anywhere but the tile; and the item tiles are 20% larger than before (wider on tablets and the fold; on a 390 px phone, which
// fits two across, and on a laptop, three across, 20% taller instead).
// Run: node tests/test_v07_p3_items.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
function glb() {
  const pos = new Float32Array([0, 1, 0, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]);
  const idx = new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 3, 2, 1, 4, 3]);
  const bin = Buffer.concat([Buffer.from(pos.buffer), Buffer.from(idx.buffer), Buffer.alloc((4 - (pos.byteLength + idx.byteLength) % 4) % 4)]);
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1], metallicFactor: 0, roughnessFactor: 0.8 } }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 }, { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength, target: 34963 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 5, type: 'VEC3', min: [-1, 0, -1], max: [1, 1, 1] }, { bufferView: 1, componentType: 5123, count: idx.length, type: 'SCALAR' }] };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (b, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, b]); };
  return Buffer.concat([head, ch(js, 0x4E4F534A), ch(bin, 0x004E4942)]);
}
const GLB = glb();
const seed = theme => {
  localStorage.setItem('vi-theme', theme);
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  if (!localStorage.getItem('pos_al1')) localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Gibson Les Paul Standard', value: 2200 }], liabilities: [{ id: 21, name: 'Car', value: 4000, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z' }] }));
};

const dist = () => { const v = _i3dLive.view; return v.cam.position.distanceTo(v.ctl.target); };
async function load(b, o) {
  const ctx = await b.newContext({ viewport: { width: o.w, height: o.h || 900 }, isMobile: !!o.touch, hasTouch: !!o.touch }); await routeThree(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => o.errs.push(e.message));
  await p.addInitScript(seed, 'dark'); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
  await p.evaluate(() => { showTab('assets'); const b = [...document.querySelectorAll('#assets-page .subtab-btn')].find(x => /'other'/.test(x.getAttribute('onclick') || '')); showSubtab('assets', 'other', b); }); await p.waitForTimeout(500);
  return { ctx, p };
}
async function upload(p) {
  await p.evaluate(() => i3dPick('wi', 11)); await p.waitForTimeout(300);
  await p.setInputFiles('#i3d-modal input[type=file]', { name: 'guitar.glb', mimeType: 'model/gltf-binary', buffer: GLB });
  await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 15000 }).catch(() => {});
  await p.evaluate(() => i3dClose()); await p.waitForTimeout(400);
}
const center = (p) => p.evaluate(() => { const e = document.querySelector('#other-assets-list .wi-img-area'); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
(async () => {
  const b = await chromium.launch(); const errs = [];
  // ── laptop: mouse ──
  { const { ctx, p } = await load(b, { w: 1100, errs }); await upload(p);
    let c = await center(p); await p.mouse.move(c.x, c.y); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !!(window._i3dLive && _i3dLive.view)), 'mouse: hovering the tile starts the live view');
    const d0 = await p.evaluate(dist);
    await p.evaluate(() => { window.__wp = null; document.addEventListener('wheel', (e) => { window.__wp = e.defaultPrevented; }, { passive: true }); });
    await p.mouse.wheel(0, -300); await p.waitForTimeout(300);
    ok(await p.evaluate(dist) === d0 && await p.evaluate(() => window.__wp === false), 'mouse: the plain wheel over a tile that has not been clicked still scrolls the page (no zoom, not blocked)');
    await p.mouse.down(); for (let i = 1; i <= 6; i++) await p.mouse.move(c.x + i * 12, c.y + i * 3); await p.mouse.up(); await p.waitForTimeout(400);
    const dOrbit = await p.evaluate(dist);
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -400); await p.waitForTimeout(80); } await p.waitForTimeout(400);
    const dIn = await p.evaluate(dist);
    ok(dIn < dOrbit - 0.2, 'mouse: after a click or drag the wheel zooms in (' + dOrbit.toFixed(2) + ' to ' + dIn.toFixed(2) + ')');
    for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, -600); await p.waitForTimeout(30); } await p.waitForTimeout(500);
    const dMin = await p.evaluate(dist); ok(dMin >= 1.19, 'mouse: zoom in stops before the model is lost (closest ' + dMin.toFixed(2) + ')');
    for (let i = 0; i < 60; i++) { await p.mouse.wheel(0, 600); await p.waitForTimeout(30); } await p.waitForTimeout(500);
    const dMax = await p.evaluate(dist); ok(dMax <= 12.05, 'mouse: zoom out stops (furthest ' + dMax.toFixed(2) + ')');
    await p.keyboard.down('Control'); await p.mouse.move(c.x + 1, c.y + 1); await p.keyboard.up('Control');
    // pan with the right button, then the pan stays near the model
    await p.mouse.move(c.x, c.y); await p.mouse.down({ button: 'right' }); for (let i = 1; i <= 30; i++) await p.mouse.move(c.x + i * 10, c.y); await p.mouse.up({ button: 'right' }); await p.waitForTimeout(500);
    ok(await p.evaluate(() => { const v = _i3dLive.view; return v.ctl.target.distanceTo(v.home.t) <= 2.55; }), 'mouse: the right button pans, held near the model');
    // double click resets and does not open the viewer
    ok(await p.evaluate(() => !document.querySelector('.i3d-live .inv-ctl')), 'mouse: no control stack on the tile');
    // the stage stays Night in Daylight: the hint chip keeps its dark plate and light text
    { await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await p.waitForTimeout(200);
      const dk = await p.evaluate(() => { const lum = (s) => { const m = s.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); }; const h = document.querySelector('.i3d-hint'); return h ? lum(getComputedStyle(h).color) : -1; });
      ok(dk > .6 || dk === -1, 'Daylight: the hint chip text stays light on its dark plate (' + dk + ')');
      await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await p.waitForTimeout(200); }
    await p.mouse.dblclick(c.x, c.y); await p.waitForTimeout(700);
    ok(await p.evaluate(() => { const v = _i3dLive && _i3dLive.view; return !!v && v.cam.position.distanceTo(v.home.p) < 0.05 && v.ctl.target.distanceTo(v.home.t) < 0.05; }) && !(await p.$('#i3d-modal')), 'mouse: a double click puts the camera back and does not open the viewer');
    await p.mouse.click(c.x, c.y); await p.waitForTimeout(900);
    ok(!!(await p.$('#i3d-modal')), 'mouse: a single click still opens the full viewer');
    { const v = await p.evaluate(() => { const bs = [...document.querySelectorAll('#i3d-modal .inv-ctl button')], r = bs[0].getBoundingClientRect(), cs = getComputedStyle(bs[0]), ac = getComputedStyle(document.getElementById('i3d-auto'));
        return { n: bs.length, size: Math.round(r.width), radius: cs.borderTopLeftRadius, col: getComputedStyle(document.querySelector('#i3d-modal .inv-ctl')).flexDirection, icons: bs.every(x => x.querySelector('svg use')), glyphs: bs.some(x => /[+\u2212\uFF0B\uFF0D\u27F3\u2302-]/.test(x.textContent.trim())), pressed: document.getElementById('i3d-auto').getAttribute('aria-pressed'), pbc: ac.borderTopColor, tbc: getComputedStyle(bs[1]).borderTopColor }; });
      ok(v.n === 4 && v.size === 36 && v.radius === '8px' && v.col === 'column' && v.icons && !v.glyphs, 'full viewer: controls match the Net worth HUD (4 icon buttons, 36 px, radius 8, vertical, no text glyphs)');
      ok(v.pressed !== 'true' || v.pbc !== v.tbc, 'full viewer: the pressed Auto-rotate button has a teal border (' + v.pbc + ' vs ' + v.tbc + ')'); }
    await ctx.close(); }
  // ── phone and fold: touch ──
  for (const w of [390, 884]) {
    const { ctx, p } = await load(b, { w, h: 520, touch: true, errs }); await upload(p);
    const cdp = await ctx.newCDPSession(p);
    const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
    let c = await center(p); await p.waitForTimeout(300); c = await center(p);
    // first tap turns the picture into the live view
    await touch('touchStart', [[c.x, c.y]]); await touch('touchEnd', []); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !!(window._i3dLive && _i3dLive.view)), w + ' touch: the first tap starts the live view');
    ok(await p.evaluate(() => getComputedStyle(_i3dLive.view.r.domElement).touchAction === 'pan-y'), w + ' touch: the tile\'s canvas passes vertical swipes to the page (touch-action pan-y)');
    // the tile has a hint chip and no control stack (Pedro's review: too big on a 150 to 190 px tile)
    ok(await p.evaluate(() => { const h = document.querySelector('.i3d-hint'), tl = document.querySelector('.i3d-live').getBoundingClientRect(); if (!h || document.querySelectorAll('.i3d-live .inv-ctl').length) return false; const r = h.getBoundingClientRect(), cs = getComputedStyle(h);
      return /^Drag to turn$/.test(h.textContent.trim()) && !!h.querySelector('svg use[href="#vi-orbit"]') && Math.abs(r.left - tl.left - 6) <= 1 && Math.abs(tl.bottom - r.bottom - 6) <= 1 && cs.fontSize === '10px' && /Share Tech Mono/.test(cs.fontFamily); }), w + ' touch: a "Drag to turn" hint chip 6 px in at the bottom left, and no control stack on the tile');
    // one finger orbits
    const a0 = await p.evaluate(() => _i3dLive.view.cam.position.toArray());
    await touch('touchStart', [[c.x, c.y]]); for (let i = 1; i <= 8; i++) { await touch('touchMove', [[c.x + i * 8, c.y + i * 3]]); await p.waitForTimeout(20); } await touch('touchEnd', []); await p.waitForTimeout(500);
    const a1 = await p.evaluate(() => _i3dLive.view.cam.position.toArray());
    ok(Math.hypot(a1[0] - a0[0], a1[2] - a0[2]) > 0.3 && !(await p.$('#i3d-modal')), w + ' touch: one finger orbits, and does not open the viewer');
    // pinch out zooms in, pinch in zooms out
    const d0 = await p.evaluate(dist), sp = Math.min(c.w / 2 - 28, 50); c = { ...c, x: c.x - 24 };   // pinch left of centre: the controls sit bottom right
    await touch('touchStart', [[c.x - 12, c.y], [c.x + 12, c.y]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[c.x - 12 - i * (sp - 12) / 10, c.y], [c.x + 12 + i * (sp - 12) / 10, c.y]]); await p.waitForTimeout(20); } await touch('touchEnd', []); await p.waitForTimeout(600);
    const d1 = await p.evaluate(dist); ok(d1 < d0 - 0.3, w + ' touch: pinching out zooms in (' + d0.toFixed(2) + ' to ' + d1.toFixed(2) + ')');
    await touch('touchStart', [[c.x - sp, c.y], [c.x + sp, c.y]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[c.x - sp + i * (sp - 12) / 10, c.y], [c.x + sp - i * (sp - 12) / 10, c.y]]); await p.waitForTimeout(20); } await touch('touchEnd', []); await p.waitForTimeout(600);
    const d2 = await p.evaluate(dist); ok(d2 > d1 + 0.3 && d2 <= 12.05, w + ' touch: pinching in zooms out, within the limit (' + d1.toFixed(2) + ' to ' + d2.toFixed(2) + ')');
    // two fingers dragging together pan
    const t0 = await p.evaluate(() => _i3dLive.view.ctl.target.toArray());
    await touch('touchStart', [[c.x - 20, c.y], [c.x + 20, c.y]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[c.x - 20 + i * 3, c.y], [c.x + 20 + i * 3, c.y]]); await p.waitForTimeout(20); } await touch('touchEnd', []); await p.waitForTimeout(600);
    const t1 = await p.evaluate(() => _i3dLive.view.ctl.target.toArray());
    ok(Math.hypot(t1[0] - t0[0], t1[1] - t0[1], t1[2] - t0[2]) > 0.05, w + ' touch: two fingers dragging together pan');
    // double tap resets
    await touch('touchStart', [[c.x, c.y]]); await touch('touchEnd', []); await p.waitForTimeout(120); await touch('touchStart', [[c.x, c.y]]); await touch('touchEnd', []); await p.waitForTimeout(800);
    ok(await p.evaluate(() => { const v = _i3dLive && _i3dLive.view; return !!v && v.cam.position.distanceTo(v.home.p) < 0.05 && v.ctl.target.distanceTo(v.home.t) < 0.05; }) && !(await p.$('#i3d-modal')), w + ' touch: a double tap puts the camera back (no viewer)');
    // a vertical swipe that starts ON the tile scrolls the page (it does not orbit)
    { await p.evaluate(() => { document.querySelector('#other-assets-list .wi-img-area').scrollIntoView({ block: 'start' }); window.scrollBy(0, -120); }); await p.waitForTimeout(400); const cc = await p.evaluate(() => { const e = document.querySelector('#other-assets-list .wi-img-area'), r = e.getBoundingClientRect(); return { x: r.x + r.width / 2 - 20, y: r.y + r.height / 2 + 30 }; }); const yy0 = await p.evaluate(() => scrollY);
      await touch('touchStart', [[cc.x, cc.y]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[cc.x, cc.y - i * 25]]); await p.waitForTimeout(16); } await touch('touchEnd', []); await p.waitForTimeout(700);
      ok(await p.evaluate(() => scrollY) > yy0 + 30, w + ' touch: a vertical swipe that starts on the tile scrolls the page (' + yy0 + ' to ' + await p.evaluate(() => scrollY) + ')'); }
    // page scroll still works: a swipe that starts outside the tile scrolls the page
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    const y0 = await p.evaluate(() => scrollY);
    await touch('touchStart', [[8, 460]]); for (let i = 1; i <= 10; i++) { await touch('touchMove', [[8, 460 - i * 25]]); await p.waitForTimeout(16); } await touch('touchEnd', []); await p.waitForTimeout(700);
    const y1 = await p.evaluate(() => scrollY);
    ok(y1 > y0 + 40, w + ' touch: a swipe that starts off the tile still scrolls the page (' + y0 + ' to ' + y1 + ')');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), w + ' touch: no sideways scroll');
    await ctx.close(); }
  // ── tile sizes: 20% larger (the grid cannot fit a 20% larger tile in two columns on a 390 px phone) ──
  { const OLD = { 390: 154, 690: 145, 884: 152, 1100: 307 };
    for (const w of [390, 690, 884, 1100]) {
      const { ctx, p } = await load(b, { w, h: 900, touch: w < 700, errs });
      const r = await p.evaluate(() => { const e = document.querySelector('#other-assets-list .wi-img-area'), g = document.querySelector('#other-assets-list .wi-grid'), t = [...g.querySelectorAll('.wi-tile')].map(x => x.getBoundingClientRect()); const q = e.getBoundingClientRect();
        return { w: Math.round(q.width), h: Math.round(q.height), cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, over: t.some((a, i) => t.some((d, j) => j > i && a.left < d.right - 1 && d.left < a.right - 1 && a.top < d.bottom - 1 && d.top < a.bottom - 1)), side: document.documentElement.scrollWidth > innerWidth + 1 }; });
      if (w === 390) ok(r.cols === 2 && r.w >= OLD[w] - 2 && r.h >= OLD[w] * 1.2 - 1, w + ' px: two across, tile ' + r.w + ' x ' + r.h + ' (was ' + OLD[w] + ' square: a phone cannot fit two 20% wider tiles, so it is 20% taller)');
      else if (w === 1100) ok(r.w >= OLD[w] - 2 && r.h >= OLD[w] * 1.2 - 1, w + ' px: ' + r.cols + ' across, tile ' + r.w + ' x ' + r.h + ' (was ' + OLD[w] + ' square; three across cannot be wider, so 20% taller)');
      else ok(r.w >= OLD[w] * 1.2 - 1 && r.w === r.h, w + ' px: item tile ' + r.w + ' px square, was ' + OLD[w] + ' (' + r.cols + ' across)');
      ok(!r.over && !r.side, w + ' px: tiles do not overlap and the page does not scroll sideways');
      await ctx.close(); }
  }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
