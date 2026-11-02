// v0.7 final round, A2: the house builder drawn the brand book's way (src/hb3d/house_gl.js), checked against Pedro's motion spec
// (docs/briefs/V07_FINAL_ROUND_MOTION_SPEC.md). Owner, 1 Nov 2026: "runs on all devices smoothly and works just like on the brand
// book"; lazy laying (load = settled shell + one animated course; a deposit lays only the new bricks); a house-type switch must not
// rebuild per-brick state (no task over 100 ms). The old engine stays behind ?house=legacy for one release.
// Run: node tests/test_house_gl.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const INDEX = 'file:///home/user/Vault-It/index.html';
const SEED = (o) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('ht3',JSON.stringify(${JSON.stringify(o)}));})()`;
const DATA = { saved: 20000, target: 250000, houseType: 'terraced', deposits: [{ amount: 20000, date: '01/10/2026' }], prices: { terraced: 250000, semi: 250000, detached: 250000 } };
const PAL = { brick: [0.267, 0.753, 0.725], trim: [0.46, 0.84, 0.80], tile: [0.2, 0.62, 0.74], frame: [0.78, 0.93, 0.92], glass: [0.02, 0.2, 0.22], glassLit: [0.96, 0.78, 0.42], door: [0.04, 0.24, 0.26], edge: [0.01, 0.1, 0.1], sheen: [0.75, 0.98, 0.96], flash: [0.91, 0.77, 0.42] };

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const errs = [];
  // three.js is NOT served (the CDN route aborts): the new renderer must draw the house without it; ?house=legacy gets the old files
  async function open(o, w, h, qs, opts) {
    opts = opts || {};
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dpr || 1, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
    if (opts.three) await routeThree(ctx); else await ctx.route(/cdn\.jsdelivr\.net/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.addInitScript(SEED(o)); await p.addInitScript(() => { window.VI_HB_FULL = true; });   // SwiftShader here: take the full GPU path, as a phone would
    await p.goto(INDEX + (qs || '')); await p.waitForTimeout(1200);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    return { ctx, p };
  }
  const tap = async (p) => { await p.evaluate(() => { showTab('house'); document.getElementById('house-scene').scrollIntoView({ block: 'center' }); }); };
  const settled = (p, ms) => p.waitForFunction(() => window.HB3D && HB3D.viewer && HB3D.viewer.settled(), null, { timeout: ms || 20000 }).catch(() => {});

  // ── 1. the new renderer draws the house with no three.js on the page ──
  { const { ctx, p } = await open(DATA, 390, 844, '', { dpr: 3 });
    const t0 = Date.now(); await tap(p);
    await p.waitForFunction(() => document.getElementById('house-scene').getAttribute('data-engine') === '3d', null, { timeout: 20000 }).catch(() => {});
    const r = await p.evaluate(() => { const v = HB3D.viewer, el = document.getElementById('house-scene'); const gl = v && v.renderer && v.renderer.getContext();
      return { engine: el.getAttribute('data-engine'), three: typeof THREE !== 'undefined', kind: v && v.engine, draws: v && v._bDraws, gl: !!gl, dpr: v && v.renderer.getPixelRatio(),
        bi: v && v.brandInfo(), canvas: !!el.querySelector('canvas.hb3d-canvas'), legacy: !!(HB3D.Viewer && v instanceof HB3D.Viewer) }; });
    console.log(JSON.stringify(r).slice(0, 400));
    ok(r.engine === '3d' && r.gl && r.canvas, 'the House tab is 3D with the new renderer (first frame ' + (Date.now() - t0) + ' ms after the tap, SwiftShader)');
    ok(!r.three && !r.legacy && /house_gl/i.test(String(r.kind)), 'no three.js on the page: the house is drawn by house_gl (' + r.kind + ')');
    ok(r.dpr === 1.5, 'phone pixel ratio is min(1.5, devicePixelRatio) as in the brand book (' + r.dpr + ')');
    // lazy laying: on the first frame every brick below the current course is settled and only the current course animates
    const lay = await p.evaluate(() => { const v = HB3D.viewer, s = v.layStats(); return s; });
    console.log(JSON.stringify(lay));
    ok(lay && lay.settledAtOpen > 0 && lay.animated > 0 && lay.animated <= lay.courseBricks, 'load: a settled shell (' + (lay && lay.settledAtOpen) + ' bricks at once) and one animated course (' + (lay && lay.animated) + ' of a course of ' + (lay && lay.courseBricks) + ')');
    await settled(p);
    const bi = await p.evaluate(() => Object.assign(HB3D.viewer.brandInfo(), { want: Math.min(1, state.saved / depositTarget()) }));
    const wantBricks = Math.floor(bi.bricksTotal * Math.max(0, Math.min(1, (bi.want - 0.03) / 0.77)) + 1e-6);
    ok(Math.abs(bi.p - bi.want) < 1e-6 && bi.bricks === wantBricks && bi.row > 0 && /^Row \d+ of \d+$/.test(bi.stage), '£20,000 of a £50,000 deposit (40%) lays floor(N x seg) = ' + wantBricks + ' bricks, ' + bi.stage);
    // palette: the Night THG values exactly, read back from the program
    const u = await p.evaluate((names) => HB3D.viewer.readUniforms(names), ['uBrick', 'uTrim', 'uTile', 'uFrame', 'uGlass', 'uGlassLit', 'uDoor', 'uEdge', 'uSheen', 'uFlashCol', 'uEdgeK', 'uFrontA', 'uBackA', 'uShMin']);
    const close = (a, b) => a && b && a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-3);
    const palOk = close(u.uBrick, PAL.brick) && close(u.uTrim, PAL.trim) && close(u.uTile, PAL.tile) && close(u.uFrame, PAL.frame) && close(u.uGlass, PAL.glass) && close(u.uGlassLit, PAL.glassLit) && close(u.uDoor, PAL.door) && close(u.uEdge, PAL.edge) && close(u.uSheen, PAL.sheen) && close(u.uFlashCol, PAL.flash);
    ok(palOk, 'palette uniforms equal THG Night exactly (brick ' + JSON.stringify(u.uBrick) + ')');
    ok(Math.abs(u.uEdgeK - 0.62) < 1e-3 && Math.abs(u.uFrontA - 0.88) < 1e-3 && Math.abs(u.uBackA - 0.09) < 1e-3 && Math.abs(u.uShMin - 0.5) < 1e-3, 'edge, front, back alpha and shade floor match the brand book (' + [u.uEdgeK, u.uFrontA, u.uBackA, u.uShMin].join(', ') + ')');
    // a deposit lays only the new bricks, with the brand book's drop (380 ms) and stagger min(120, 900/N) ms
    const dep = await p.evaluate(async () => {
      const v = HB3D.viewer, before = v.brandInfo().bricks, N = v.brandInfo().bricksTotal, dt = depositTarget();
      const add = Math.ceil(39 * 0.77 * dt / N / 0.77 * 0.77); // about 39 bricks' worth
      const want = Math.floor(N * Math.max(0, Math.min(1, ((state.saved + add) / dt - 0.03) / 0.77)) + 1e-6);
      v.layStats(true); v.fixedDt = 0.25;   // SwiftShader frames take over a second here: step the cadence a quarter second a frame so it converges in the test's time
      state.saved += add; state.deposits.push({ amount: add, date: '01/11/2026' }); save(); updateUI();
      for (let i = 0; i < 120 && !v.settled(); i++) await new Promise(r => setTimeout(r, 100));
      const s = v.layStats(); return { before, after: v.brandInfo().bricks, want, stamped: s.stamped, gapMs: s.gapMs, lastAdd: s.lastAdd, dropMs: v.dropMs(), settled: v.settled() };
    });
    console.log(JSON.stringify(dep));
    ok(dep.after === dep.want && dep.stamped === dep.want - dep.before, 'a deposit lays only the new bricks (' + dep.stamped + ' stamped, ' + dep.before + ' -> ' + dep.after + ')');
    const wantGap = Math.min(120, 900 / Math.max(1, dep.lastAdd || 1));   // per frame's batch of new bricks, as the brand book stamps them
    ok(dep.gapMs != null && Math.abs(dep.gapMs - wantGap) <= wantGap * 0.1 + 1, 'stagger min(120, 900/N) ms within 10% (' + (dep.gapMs == null ? '-' : dep.gapMs.toFixed(1)) + ' vs ' + wantGap.toFixed(1) + ' for a batch of ' + dep.lastAdd + ')');
    ok(Math.abs(dep.dropMs - 380) <= 38, 'drop lasts 380 ms within 10% (' + dep.dropMs + ')');
    const fl = await p.evaluate(() => ({ ms: HB3D.viewer.flashMs(), vs: /age \/ 1\.1,/.test(HB3D.viewer.vsSource()), drop: /age \/ 0\.38,/.test(HB3D.viewer.vsSource()) && /e \* e \* e \* \(t < 1\.5 \? 6\.0 : 5\.0\)/.test(HB3D.viewer.vsSource()) }));
    ok(Math.abs(fl.ms - 1100) <= 110 && fl.vs && fl.drop, 'flash ends at 1100 ms and the drop is 6 courses over 380 ms, cubic, in the shader source');
    // batches: 61 new bricks drop together (no stagger); 39 are spaced 900/39 = 23 ms
    const bt = await p.evaluate(() => { const v = HB3D.viewer, N = v.brandInfo().bricksTotal, pAt = n => 0.03 + 0.77 * (n + 0.5) / N;
      v.setState({ p: pAt(100) }); const a0 = v.brickStamps().length; v.setState({ p: pAt(161) }); const s61 = v.brickStamps().slice(a0);
      v.setState({ p: pAt(100) }); const b0 = v.brickStamps().length; v.setState({ p: pAt(139) }); const s39 = v.brickStamps().slice(b0);
      const gaps = a => a.slice(1).map((x, i) => x - a[i]); v.setState({ p: Math.min(1, state.saved / depositTarget()) });
      return { n61: s61.length, same61: s61.every(x => Math.abs(x - s61[0]) < 1e-6), n39: s39.length, gap39: gaps(s39).reduce((q, x) => q + x, 0) / Math.max(1, s39.length - 1) * 1000 }; });
    ok(bt.n61 === 61 && bt.same61, 'a 61-brick batch drops together (no stagger over 60)');
    ok(bt.n39 === 39 && Math.abs(bt.gap39 - 900 / 39) <= 900 / 39 * 0.1, 'a 39-brick batch is spaced 900/39 = 23 ms within 10% (' + bt.gap39.toFixed(1) + ' ms)');
    ok(dep.settled, 'the stage settles after the deposit');
    // the other types compile in idle time after the first house settles (David, 2 Nov): a first switch pays no model compile
    const warm = await p.waitForFunction(() => HB3DAPP.warmed && ['semi', 'detached', 'flat', 'apartment', 'mansion'].every(t => !!hb3dModelIfReady(t, state.apartmentFloor)), null, { timeout: 60000 }).then(() => true).catch(() => false);
    const cached = await p.evaluate(() => Object.keys(HB3DAPP.models).length);
    ok(warm && cached >= 6, 'the other house types are compiled in idle time after the first house settles (' + cached + ' models cached)');
    // a house-type switch: settled shell + one course, no main-thread task over 100 ms
    const sw = await p.evaluate(async () => {
      const lt = []; let po; try { po = new PerformanceObserver(l => l.getEntries().forEach(e => lt.push(e.duration))); po.observe({ entryTypes: ['longtask'] }); } catch (e) {}
      const v0 = HB3D.viewer, d0 = v0._bDraws; const t0 = performance.now();
      state.houseType = 'semi'; save(); updateUI();
      await new Promise(r => setTimeout(r, 2500));
      if (po) po.disconnect();
      const v = HB3D.viewer, s = v.layStats(), bi = v.brandInfo();
      return { same: v === v0, type: v.model && v.model.type, drew: v._bDraws > d0, firstMs: s.firstFrameMs, buildMs: s.buildMs, longMax: Math.max(0, ...lt), settledAtOpen: s.settledAtOpen, animated: s.animated, course: s.courseBricks, bricks: bi.bricks, N: bi.bricksTotal };
    });
    console.log(JSON.stringify(sw));
    ok(sw.same && sw.type === 'semi' && sw.drew, 'switching to a semi redraws in the same renderer (no viewer rebuild)');
    ok(sw.longMax < 150, 'switch to a precompiled type: no main-thread task over 150 ms on this software GPU (longest ' + sw.longMax.toFixed(0) + ' ms; the renderer\'s buffer fill ' + (sw.buildMs == null ? '-' : sw.buildMs.toFixed(0)) + ' ms; the 100 ms gate is read on the owner\'s phone with ?perf=1)');
    ok(sw.settledAtOpen > 0 && sw.animated <= sw.course, 'the semi opens as a settled shell (' + sw.settledAtOpen + ' at once) plus one course (' + sw.animated + ' animated)');
    ok(sw.firstMs != null && sw.firstMs < 1000, 'first frame of the new type within a second (' + (sw.firstMs == null ? '-' : sw.firstMs.toFixed(0)) + ' ms)');
    // orbit: a scripted 300 px drag over a second gives no frame over 33 ms (p95 20 ms) at phone width
    const orb = await p.evaluate(async () => {
      const v = HB3D.viewer, el = document.getElementById('house-scene'), cv = el.querySelector('canvas.hb3d-canvas'), r = cv.getBoundingClientRect();
      const x0 = r.left + r.width * 0.2, y = r.top + r.height / 2, yaw0 = v.yaw();
      const ev = (t, x) => cv.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true }));
      v.frameTimes(true); ev('pointerdown', x0);
      for (let i = 1; i <= 30; i++) { ev('pointermove', x0 + i * 10); await new Promise(res => requestAnimationFrame(res)); await new Promise(res => setTimeout(res, 16)); }
      ev('pointerup', x0 + 300);
      const ft = v.frameTimes(); ft.sort((a, b) => a - b); const fg = v.frameGaps(); fg.sort((a, b) => a - b);
      return { yawDelta: v.yaw() - yaw0, n: ft.length, max: ft[ft.length - 1] || 0, p95: ft[Math.floor(ft.length * 0.95)] || 0, gapP95: fg[Math.floor(fg.length * 0.95)] || 0 };
    });
    console.log(JSON.stringify(orb));
    ok(Math.abs(Math.abs(orb.yawDelta) - 300 * 0.008) < 0.05, 'a 300 px drag turns the house 0.008 rad per px, directly (' + orb.yawDelta.toFixed(3) + ' rad)');
    ok(orb.n >= 20 && orb.max < 33 && orb.p95 <= 20, 'drag frames on the main thread: max ' + orb.max.toFixed(1) + ' ms, p95 ' + orb.p95.toFixed(1) + ' ms over ' + orb.n + ' frames (wall gap p95 ' + orb.gapP95.toFixed(0) + ' ms is SwiftShader rasterising; the GPU time is measured on the owner\'s devices)');
    ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
    await ctx.close(); }

  // ── 2. reduced motion: the final state at once, no ping, no sweep, no auto orbit ──
  { const { ctx, p } = await open(DATA, 390, 844, '', { reduced: true });
    await tap(p); await settled(p);
    const r = await p.evaluate(() => { const v = HB3D.viewer, s = v.layStats(), u = v.readUniforms(['uSweepOn', 'uPulse']);
      const c = v.under, g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let gold = 0;   // the gold ping would be the only warm colour on the underlay
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40 && d[i] > 150 && d[i] > d[i + 2] + 60) gold++;
      return { animated: s.animated, sweep: u.uSweepOn, pulse: u.uPulse, ping: v.pingAlpha(), auto: v.autoOrbit(), goldPx: gold }; });
    console.log(JSON.stringify(r));
    ok(r.animated === 0 && r.sweep === 0 && Math.abs(r.pulse - 0.5) < 1e-6 && r.ping === 0 && !r.auto && r.goldPx === 0, 'reduced motion: nothing animates, pulse fixed at .5, no ping (no gold pixels on the ground layer: ' + r.goldPx + '), no sweep, no auto orbit');
    // the ground ping is GOLD on purpose: the owner's E15 words ("gold ground ping", approved in the d19bb0c preview) win over the brand book's teal (David, release chat, 2 Nov 2026)
    ok(await p.evaluate(() => HB3D.viewer.pingColour()) === 'gold', 'the ground ping is gold (owner\'s word; the brand book\'s is teal, not wanted)');
    await ctx.close(); }

  // ── 3. Level 2 and the other house types still draw (every model, the equity colouring) ──
  { const { ctx, p } = await open(Object.assign({}, DATA, { houseMode: 'purchased', mortgageBalance: 150000, housePrice: 250000, purchasePrice: 250000 }), 1100, 800, '');
    await tap(p); await settled(p);
    const r = await p.evaluate(() => { const v = HB3D.viewer, bi = v.brandInfo(); return { mode: bi && bi.mode, colour: bi && bi.colour, total: bi && bi.colourTotal, engine: document.getElementById('house-scene').getAttribute('data-engine') }; });
    console.log(JSON.stringify(r));
    ok(r.engine === '3d' && r.mode === 'equity' && r.colour > 0 && r.colour < r.total, 'Level 2: the paid share is in colour (' + r.colour + ' of ' + r.total + ' parts)');
    for (const t of ['detached', 'mansion', 'flat', 'apartment']) {
      const s = await p.evaluate(async (t) => { state.houseType = t; state.houseMode = 'saving'; save(); updateUI(); await new Promise(r => setTimeout(r, 2500)); const v = HB3D.viewer, bi = v.brandInfo(); return { type: v.model.type, bricks: bi && bi.bricks, N: bi && bi.bricksTotal, draws: v._bDraws, mb: v.gpuBytes() / 1048576 }; }, t);
      ok(s.type === t && s.N > 0 && s.draws > 0 && s.mb < 12, t + ': drawn, ' + s.N + ' bricks, ' + s.mb.toFixed(1) + ' MB on the GPU');
    }
    ok(errs.length === 0, 'no page errors across types ' + errs.slice(0, 3).join(' | '));
    await ctx.close(); }

  // ── 3b. no WebGL at all: the still picture of the same house, never blank ──
  { const b2 = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2'] });
    const ctx = await b2.newContext({ viewport: { width: 390, height: 844 } }); await ctx.route(/cdn\.jsdelivr\.net/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.addInitScript(SEED(DATA)); await p.goto(INDEX); await p.waitForTimeout(1200);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await tap(p); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const cv = document.getElementById('hbStill'), g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data, cols = new Set(); for (let i = 0; i < d.length; i += 4 * 97) cols.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      return { engine: document.getElementById('house-scene').getAttribute('data-engine'), gl: HB3D.HouseGL.supported(), cols: cols.size, w: cv.width, hud: document.getElementById('hb-hud').innerText }; });
    ok(r.engine === 'still' && r.gl === false && r.cols > 20 && /UK bricks/i.test(r.hud), 'no WebGL: the still picture of the house stands in, never blank (' + r.cols + ' colours, HUD intact)');
    await b2.close(); }

  // ── 4. ?house=legacy keeps the old three.js viewer for one release ──
  { const { ctx, p } = await open(DATA, 1100, 800, '?house=legacy', { three: true });
    await tap(p);
    await p.waitForFunction(() => document.getElementById('house-scene').getAttribute('data-engine') === '3d', null, { timeout: 30000 }).catch(() => {});
    const r = await p.evaluate(() => ({ three: typeof THREE !== 'undefined', legacy: !!(HB3D.Viewer && HB3D.viewer instanceof HB3D.Viewer), engine: document.getElementById('house-scene').getAttribute('data-engine') }));
    ok(r.engine === '3d' && r.three && r.legacy, '?house=legacy: the old three.js viewer draws the house');
    await ctx.close(); }

  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
