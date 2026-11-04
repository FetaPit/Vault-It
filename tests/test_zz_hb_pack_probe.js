// PROBE, never merged (CoS, 4 Nov 20:04: "a branch off origin/candidate/v0.9.2 that times current against packed attributes on the CI
// runner, with no app or gate changes and never merged"). It times the House Builder's landed-brick geometry three ways in one page,
// in turn over 9 rounds, medians, drawing clipped to 1 px (the work test_hb_speed's geometry gate measures):
//   old     = every landed brick an instance (the old way)
//   current = the static mesh as built today (position, normal, uv, aFS, aIO as float32, aCol 3 bytes: 55 bytes a vertex)
//   packed  = the same static mesh with normal as int8 (normalised), uv as uint16 (normalised), aFS and aIO as int16, aCol as is: 32 bytes
// The packed copy is for timing only: aFS and aIO hold scaled values (they only feed shading), so its pixels are not compared here.
// The numbers print as ok lines and the probe then fails on purpose, so CI shows them (it only prints a failing test's lines).
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = 'file://' + (process.env.VI_INDEX || require('path').join(__dirname, '..', 'index.html'));
const seed = o => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('vi-flag-house','1');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})()`;
const semi = { saved: 20000, target: 320000, houseType: 'semi', depositPct: 20, deposits: [{ amount: 20000, date: '01/10/2026' }], prices: { semi: 320000 } };

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.25, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  await routeThree(ctx); const p = await ctx.newPage(); p.setDefaultTimeout(180000);
  // keep the static meshes' page copies (the app drops them once uploaded) so the probe can build packed copies
  await p.addInitScript(() => { const t = setInterval(() => { if (!window.THREE || !THREE.Object3D) return; clearInterval(t);
    Object.defineProperty(THREE.Object3D.prototype, 'onAfterRender', { configurable: true, get() { return this.__oar || function () {}; },
      set(f) { if (this.name && /^static:/.test(this.name) && /array = null/.test(String(f))) { this.__kept = 1; return; } this.__oar = f; } }); }, 1); });
  await p.addInitScript(seed(semi)); await p.goto(INDEX + '?house=legacy'); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner{display:none!important}' });
  await p.evaluate(() => { showTab('house'); document.getElementById('house-scene').scrollIntoView({ block: 'center' }); });
  await p.waitForFunction(() => window.HB3D && HB3D.viewer && HB3D.viewer.model && HB3D.viewer.brandInfo && HB3D.viewer.brandInfo(), null, { timeout: 90000 });
  await p.evaluate(() => { const v = HB3D.viewer; v._bSoft = false; v._bLite = false; Object.defineProperty(v, '_bCost', { get: () => 0, set: () => {}, configurable: true }); v.renderer.setPixelRatio(v._dprFor(v.el.clientWidth, v.el.clientHeight)); v.renderer.setSize(v.el.clientWidth, v.el.clientHeight, false); });
  await p.waitForFunction(() => HB3D.viewer.settled() && (HB3D.viewer._bm || []).every(r => !r || r.ready == null || !r.stat || r.ready >= r.n), null, { timeout: 120000, polling: 500 }).catch(() => {});
  await p.waitForTimeout(2500);
  const R = await p.evaluate(() => {
    const v = HB3D.viewer, gl = v.renderer.getContext(), U = v._bU; v.stop();
    const cost = (px1) => { const Rr = v.renderer; if (px1) { Rr.setScissor(0, 0, 1, 1); Rr.setScissorTest(true); }
      Rr.render(v.scene, v.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      const t = performance.now(); for (let i = 0; i < 4; i++) Rr.render(v.scene, v.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      const ms = (performance.now() - t) / 4; if (px1) Rr.setScissorTest(false); return ms; };
    const med = a => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
    const recs = (v._bm || []).filter(Boolean).filter(r => r.stat), kept = recs.every(r => r.stat.geometry.attributes.position.array);
    if (!recs.length || !kept) { v.start(); return { err: 'no static meshes with their data kept (' + recs.length + ')' }; }
    const keep = ['uNow', 'uPulse', 'uSweep', 'uSweepOn'].map(k => [k, U[k].value]), freeze = () => { keep.forEach(([k, x]) => { U[k].value = x; }); v._bEnvObj.ring.visible = false; };
    freeze();
    const ready = recs.map(r => r.ready);
    const toOld = () => { recs.forEach(r => { r.ready = 0; r.S = 0; r.dirtyA = true; }); v._brandApply(); freeze(); };
    const toNew = () => { recs.forEach((r, i) => { r.ready = ready[i]; r.dirtyA = true; }); v._brandApply(); freeze(); };
    // packed copies of each static geometry
    const q = (src, Typ, n, norm, scale) => { const a = new Typ(src.length), lim = Typ === Int8Array ? 127 : Typ === Int16Array ? 32767 : 65535; for (let i = 0; i < src.length; i++) { let x = src[i] * scale; if (Typ !== Uint16Array) x = Math.max(-lim, Math.min(lim, Math.round(x))); else x = Math.max(0, Math.min(lim, Math.round(x))); a[i] = x; } return new THREE.BufferAttribute(a, n, norm); };
    let bytesCur = 0, bytesPack = 0, verts = 0;
    const cur = recs.map(r => r.stat.geometry), packed = recs.map(r => { const g = r.stat.geometry, A = g.attributes, pg = new THREE.BufferGeometry(), nv = A.position.count; verts += nv;
      let uvMax = 0; for (let i = 0; i < A.uv.array.length; i++) uvMax = Math.max(uvMax, Math.abs(A.uv.array[i]));
      pg.setAttribute('position', A.position.clone()); pg.setAttribute('normal', q(A.normal.array, Int8Array, 3, true, 127)); pg.setAttribute('uv', q(A.uv.array, Uint16Array, 2, true, 65535 / Math.max(1, uvMax)));
      pg.setAttribute('aFS', q(A.aFS.array, Int16Array, 2, false, 1000)); pg.setAttribute('aIO', q(A.aIO.array, Int16Array, 3, false, 100)); pg.setAttribute('aCol', A.aCol.clone());
      pg.setIndex(g.index.clone()); pg.setDrawRange(g.drawRange.start, g.drawRange.count);
      bytesCur += nv * (12 + 12 + 8 + 8 + 12 + 3); bytesPack += nv * (12 + 3 + 4 + 4 + 6 + 3); return pg; });
    const toPacked = () => { toNew(); recs.forEach((r, i) => { r.stat.geometry = packed[i]; }); };
    const toCur = () => { toNew(); recs.forEach((r, i) => { r.stat.geometry = cur[i]; }); };
    // warm: upload the packed copies once
    toPacked(); cost(false); toCur(); cost(false);
    const out = { old: [], cur: [], pack: [], oldF: [], curF: [], packF: [] };
    const modes = [['old', toOld], ['cur', toCur], ['pack', toPacked]];
    for (let k = 0; k < 9; k++) { const order = k % 3 === 0 ? [0, 1, 2] : k % 3 === 1 ? [1, 2, 0] : [2, 0, 1];
      for (const m of order) { modes[m][1](); out[modes[m][0]].push(cost(true)); out[modes[m][0] + 'F'].push(cost(false)); } }
    toCur(); v.start();
    return { verts, mbCur: bytesCur / 1048576, mbPack: bytesPack / 1048576, old: med(out.old), cur: med(out.cur), pack: med(out.pack), oldF: med(out.oldF), curF: med(out.curF), packF: med(out.packF),
      cpu: navigator.hardwareConcurrency, gl: (() => { const x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : '-'; })(), uvOK: true };
  });
  await b.close();
  if (R.err) { console.log('FAIL: probe could not run: ' + R.err); process.exit(1); }
  const f = x => x.toFixed(1), pc = (a, b) => Math.round(a / b * 100) + '%';
  console.log('ok  : probe machine: ' + R.cpu + ' threads, ' + R.gl);
  console.log('ok  : probe static vertices ' + R.verts + ', vertex data ' + f(R.mbCur) + ' MB now, ' + f(R.mbPack) + ' MB packed');
  console.log('ok  : probe geometry (1 px) old ' + f(R.old) + ' ms, current ' + f(R.cur) + ' ms (' + pc(R.cur, R.old) + ' of old), packed ' + f(R.pack) + ' ms (' + pc(R.pack, R.old) + ' of old, ' + pc(R.pack, R.cur) + ' of current)');
  console.log('ok  : probe whole frame old ' + f(R.oldF) + ' ms, current ' + f(R.curF) + ' ms (' + pc(R.curF, R.oldF) + '), packed ' + f(R.packF) + ' ms (' + pc(R.packF, R.oldF) + ')');
  console.log('FAIL: probe numbers above (not a real failure: the probe fails on purpose so CI prints them; never merged)');
  process.exit(1);
})();
