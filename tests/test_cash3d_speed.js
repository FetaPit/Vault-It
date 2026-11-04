// Cash and savings in 3D (and precious metals, the same viewer) open without freezing a phone (owner, 2 Nov 2026, fold test on
// candidate 76be8ec: 70 long tasks, worst 1167 ms; "the viewport for the house builder is perfect, so do not change any of that
// whatsoever. Maybe we can learn from that viewport for the others."). The house builder's lessons, applied here: one cheap
// shader family with baked shading (no reflection map, no real-time shadows), build once per change, cheap framing, compile up
// front, render on demand. Measured on a phone profile: 390 px at 3x, touch, CPU 4x, the demo-size balance (£25,300 = 2,530 stacks).
// Run: node tests/test_cash3d_speed.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = 'file://' + (process.env.VI_INDEX || require('path').join(__dirname, '..', 'index.html'));
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// wall-clock times swing with machine load (CI shards run two browsers at once), so they are reported, never gated;
// the gates are the fixed numbers that make a stage slow: builds, compiles, shader kinds, draw calls and triangles (CoS, 3 Nov)
const info = m => console.log('info:', m);
const CASH_CALLS = 16, CASH_TRIS = 2500, METAL_CALLS = 20, METAL_TRIS = 4000;   // measured 13 / 1,756 and 17 / 2,874 on 40c6018 (the old coin stacks drew 121,464 triangles)
// v0.9.1 cash 3D look: up to 12 blocks of 1,000 each block is its hundred real stacks in one shape; past that (as here at £25,300)
// a block is the painted box again, so this budget is unchanged.
const SEED = (cash, metals) => `(function(){if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:[{id:5,name:'Savings',type:'Savings',balance:${cash}}],physicalCash:[{id:1,where:'Safe',amount:300,date:'2026-10-01'}],metals:${JSON.stringify(metals)},metalPrices:{gold:2000,silver:25,platinum:900,palladium:1000}}));})()`;
// timed spans of the viewer's own code, long tasks with their start, and every render call's own main-thread cost
const HOOK = () => {
  const T = window.__T = { spans: [], lt: [], renders: [], pmrem: 0, gl: 0, contexts: [] };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => T.lt.push([e.startTime, e.duration]))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  window.__arm = () => {
    const span = (n, f) => { const w = function () { const t = performance.now(), g = T.gl; try { return f.apply(this, arguments); } finally { T.spans.push([n, t, performance.now() - t, T.gl - g]); } }; w._w = 1; return w; };
    ['renderCashISO', 'renderMetalsISO', 'v3Cash', 'v3Metals', 'v3CashNow', 'v3MetalsNow'].forEach(n => { if (typeof window[n] === 'function' && !window[n]._w) window[n] = span(n, window[n]); });
    if (!V3Scene.prototype.clear._w) V3Scene.prototype.clear = span('clear', V3Scene.prototype.clear);
    if (!V3Scene._w) { const O = V3Scene; const W = function (h, l) { const t = performance.now(), g = T.gl; O.call(this, h, l); T.spans.push(['V3Scene', t, performance.now() - t, T.gl - g]);
      const r = this.r, rr = r.render.bind(r); r.render = function (s, c) { const t1 = performance.now(), g = T.gl, n0 = r.info.programs ? r.info.programs.length : 0; rr(s, c); T.renders.push([t1, performance.now() - t1, T.gl - g, (r.info.programs ? r.info.programs.length : 0) - n0]); }; if (!r._w) r._w = 1; };
      W.prototype = O.prototype; W._w = 1; window.V3Scene = W; }
    // time spent inside WebGL calls (on this machine's software GPU a sync call waits for the GPU process; on a phone it does not)
    [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(C => { if (!C || C.prototype._w) return; C.prototype._w = 1;
      Object.getOwnPropertyNames(C.prototype).forEach(k => { const d = Object.getOwnPropertyDescriptor(C.prototype, k); if (!d || typeof d.value !== 'function' || k === 'constructor') return; const f = d.value;
        C.prototype[k] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { T.gl += performance.now() - t; } }; }); });
    // a canvas drawing-buffer resize is the GPU side's work too (it reallocates there): counted with the WebGL time
    ['width', 'height'].forEach(k => { const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, k); if (!d || d.set._w) return; const set = d.set;
      const w = function (v) { const t = performance.now(); try { return set.call(this, v); } finally { T.gl += performance.now() - t; } }; w._w = 1; Object.defineProperty(HTMLCanvasElement.prototype, k, { get: d.get, set: w, configurable: true }); });
    const R = THREE.WebGLRenderer; if (!R._w) { THREE.WebGLRenderer = function (o) { T.contexts.push(performance.now()); R.call(this, o); }; THREE.WebGLRenderer.prototype = R.prototype; THREE.WebGLRenderer._w = 1; }
    const PP = THREE.PMREMGenerator.prototype; if (!PP._w) { const f = PP.fromScene; PP.fromScene = function () { T.pmrem++; return f.apply(this, arguments); }; PP._w = 1; }
  };
};
(async () => {
  const b = await chromium.launch({ args: GPU_ARGS }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await routeThree(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(SEED(25000, { gold: 40, silver: 20, platinum: 0, palladium: 0 })); await p.addInitScript(HOOK);
  await p.goto(INDEX, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
  await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => window.__arm());
  // the idle warm-up: the shared renderer and the coin and bar shaders, compiled one per idle slice before any tap
  const warm = await p.waitForFunction(() => window.V3 && V3._warmed, null, { timeout: 40000 }).then(() => true).catch(() => false);
  const w = await p.evaluate(() => ({ programs: V3._r && V3._r.info.programs ? V3._r.info.programs.length : 0 }));
  ok(warm && w.programs >= 3, 'the coin and bar stage warms up in idle time once three.js is in (' + w.programs + ' shader programs ready before any tap)');
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // ── 1. open Cash and savings the way a tap does (the tab, then the sub-tab) ──
  const t0 = await p.evaluate(() => { const t = performance.now(); showTab('assets'); showSubtab('assets', 'cash', null); return t; });
  await p.waitForFunction(() => window.V3 && V3.cash && __T.renders.length > 0, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(5000);
  const o = await p.evaluate(t0 => { const V = V3.cash, T = __T, ours = T.spans.filter(s => s[1] >= t0);
    return { units: V && V.stats && V.stats.units, stacks: V && V.stats && V.stats.fullStacks, builds: ours.filter(s => s[0] === 'clear').length,
      longest: Math.max(0, ...ours.filter(s => s[0] === 'renderCashISO' || s[0] === 'v3CashNow').map(s => s[2] - s[3])), spans: ours.filter(s => s[0] === 'renderCashISO' || s[0] === 'v3CashNow' || s[0] === 'V3Scene').map(s => s[0] + ' ' + s[2].toFixed(0) + ' (GL ' + s[3].toFixed(0) + ')').join(', '),
      contexts: T.contexts.filter(t => t >= t0).length, shared: !!V3._r && V3.cash && V3.cash.r === V3._r, newPrograms: T.renders.filter(x => x[0] >= t0).reduce((a, x) => a + x[3], 0), firstOwn: T.renders.filter(x => x[0] >= t0).map(x => x[1] - x[2])[0],
      pmrem: T.pmrem, shadows: !!(V && V.r.shadowMap.enabled), programs: V && V.r.info.programs ? V.r.info.programs.length : -1, pbr: !!(V && V.r.info.programs && V.r.info.programs.some(x => /standard|physical/i.test(x.name))),
      firstRender: (T.renders.find(x => x[0] >= t0) || [0, null])[1], dpr: V && V.r.getPixelRatio(), canvas: !!document.querySelector('#cashSceneCard canvas.v3-canvas') }; }, t0);
  console.log(JSON.stringify(o));
  ok(o.canvas && o.units === 25300 && o.stacks === 2530, 'Cash and savings opens in 3D: £25,300 as 2,530 stacks of £1 coins');
  ok(o.builds === 1, 'one build per open, not one per tab call (' + o.builds + ' builds)');
  ok(o.pmrem === 0, 'no reflection map is generated (PMREM runs: ' + o.pmrem + ')');
  ok(!o.shadows, 'no real-time shadow pass; the contact shadow is baked');
  ok(o.programs > 0 && !o.pbr, 'no physically based shaders: matcap and basic ones only (' + o.programs + ' small programs for both stages, tag and floor included)');
  ok(o.contexts === 0 && o.shared, 'the stage uses the shared renderer made in the warm-up: no WebGL context created at the tap (' + o.contexts + ')');
  ok(o.newPrograms === 0, 'the tap compiles no shader: the warm-up already did (' + o.newPrograms + ' compiled on opening)');
  info('opening: the viewer\'s own code on the phone profile (longest ' + o.longest.toFixed(0) + ' ms of JavaScript; time inside WebGL calls and canvas resizes is the software GPU here and is read on the owner\'s phone with ?perf=1: ' + o.spans + ')');
  info('the first draw\'s own JavaScript (' + (o.firstOwn == null ? '-' : o.firstOwn.toFixed(0)) + ' ms; ' + (o.firstRender == null ? '-' : o.firstRender.toFixed(0)) + ' ms with the software GPU)');
  ok(o.dpr <= 1.5 + 1e-9, 'pixel ratio capped at 1.5 on a touch screen (' + o.dpr + ')');

  // ── 1b. the coin colours: gold coins lifted into the brand gold, silver coins stay silver (QC, 2 Nov: the euro and rupee coins must not turn gold) ──
  const coins = await p.evaluate(() => Object.keys(V3_COINS).map(c => { const sp = V3_COINS[c], h = v3Lift(sp.outer, V3_LIFT), n = parseInt(h.slice(1), 16), r = n >> 16 & 255, b = n & 255;
    return { c, gold: v3IsGold(sp.outer), lifted: h, warm: r - b, inner: sp.inner ? v3Lift(sp.inner, V3_LIFT) : null }; }));
  console.log(JSON.stringify(coins));
  ok(coins.every(x => x.gold ? x.warm > 60 : x.warm < 30), 'gold coins are lifted toward the brand gold, silver coins stay neutral (' + coins.map(x => x.c + ' ' + x.lifted).join(', ') + ')');
  const eur = coins.find(x => x.c === 'EUR');
  ok(!eur || (!eur.gold && eur.inner && parseInt(eur.inner.slice(1, 3), 16) - parseInt(eur.inner.slice(5, 7), 16) > 30), 'the euro keeps its silver ring and gold centre (' + (eur && eur.lifted + ' / ' + eur.inner) + ')');

  // ── 2. the same data again (a tab switch back, a re-render): no rebuild, just a redraw ──
  const again = await p.evaluate(() => new Promise(res => { const V = V3.cash, kid = V.root.children[0], n = __T.spans.filter(s => s[0] === 'clear').length; renderCashISO(); renderCashISO();
    setTimeout(() => res({ same: V.root.children[0] === kid, builds: __T.spans.filter(s => s[0] === 'clear').length - n }), 500); }));
  ok(again.same && again.builds === 0, 'calling it again with the same balance keeps the built scene (' + again.builds + ' rebuilds)');

  // ── 3. orbit: main-thread cost of each frame while turning (the GPU's time is read on the owner's phone with ?perf=1) ──
  const orb = await p.evaluate(() => { const V = V3.cash, t = V.ctl.target, c = V.cam.position, r = Math.hypot(c.x - t.x, c.z - t.z), a0 = Math.atan2(c.z - t.z, c.x - t.x), d = [];
    for (let i = 1; i <= 30; i++) { const a = a0 + i * 0.03; c.x = t.x + r * Math.cos(a); c.z = t.z + r * Math.sin(a); V.ctl.update(); const s = performance.now(); V.r.render(V.sc, V.cam); d.push(performance.now() - s); }
    d.sort((x, y) => x - y); V.r.info.autoReset = true; V.r.render(V.sc, V.cam); return { p95: d[Math.floor(d.length * 0.95)], max: d[d.length - 1], calls: V.r.info.render.calls, tris: V.r.info.render.triangles }; });
  info('orbit frames on the main thread: p95 ' + orb.p95.toFixed(1) + ' ms, max ' + orb.max.toFixed(1) + ' ms');
  ok(orb.calls > 0 && orb.calls <= CASH_CALLS, 'orbit: each frame is ' + orb.calls + ' draw calls (budget ' + CASH_CALLS + ')');
  ok(orb.tris > 0 && orb.tris <= CASH_TRIS, 'orbit: each frame is ' + orb.tris + ' triangles at £25,300 (budget ' + CASH_TRIS + ')');

  // ── 4. precious metals, the same viewer: no reflection map, no shadows, one build ──
  await p.evaluate(() => { window.__tm = performance.now(); showSubtab('assets', 'metals', null); });
  await p.waitForFunction(() => window.V3 && V3.metals && V3.metals.stats && V3.metals.stats.gold, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(3000);
  const m = await p.evaluate(() => { const V = V3.metals, ours = __T.spans.filter(s => s[1] >= window.__tm);
    return { gold: !!(V && V.stats.gold), silver: !!(V && V.stats.silver), shadows: !!(V && V.r.shadowMap.enabled), pmrem: __T.pmrem, builds: ours.filter(s => s[0] === 'clear').length,
      longest: Math.max(0, ...ours.filter(s => s[0] === 'renderMetalsISO' || s[0] === 'v3MetalsNow').map(s => s[2] - s[3])), spans: ours.filter(s => s[0] === 'renderMetalsISO' || s[0] === 'v3MetalsNow').map(s => s[0] + ' ' + s[2].toFixed(0) + ' (GL ' + s[3].toFixed(0) + ')').join(', '), newPrograms: __T.renders.filter(x => x[0] >= window.__tm).reduce((a, x) => a + x[3], 0), calls: (V.r.info.autoReset = true, V.r.render(V.sc, V.cam), V.r.info.render.calls), tris: V.r.info.render.triangles }; });
  console.log(JSON.stringify(m));
  ok(m.gold && m.silver, 'precious metals draw gold and silver bars');
  ok(!m.shadows && m.pmrem === 0, 'metals: no shadow pass and no reflection map either');
  ok(m.builds === 1, 'metals: one build per open (' + m.builds + ')');
  info('metals: the viewer\'s own code (longest ' + m.longest.toFixed(0) + ' ms of JavaScript: ' + m.spans + ')');
  ok(m.calls > 0 && m.calls <= METAL_CALLS && m.tris <= METAL_TRIS, 'metals: ' + m.calls + ' draw calls, ' + m.tris + ' triangles (budget ' + METAL_CALLS + ' and ' + METAL_TRIS + ')');
  ok(m.newPrograms === 0, 'metals: the same renderer and warmed shaders, nothing compiled on opening (' + m.newPrograms + ')');

  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  // ── 5. the ?perf=1 overlay names the stage on screen and counts its frames (it used to show the house's while on Cash and savings) ──
  { const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message));
    await p2.goto(INDEX + '?perf=1', { waitUntil: 'load' }); await p2.waitForTimeout(1500);
    await p2.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p2.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
    await p2.evaluate(() => { showTab('assets'); showSubtab('assets', 'cash', null); });
    await p2.waitForFunction(() => window.VIPERF && VIPERF.snapshot().stageFrames > 0, null, { timeout: 30000 }).catch(() => {});
    const k = await p2.evaluate(() => { const k = VIPERF.snapshot(); return { viewport: k.viewport, frames: k.stageFrames, line: VIPERF.report().split('\n').find(l => /^viewport (Cash|Precious|house)/.test(l)) }; });
    ok(k.viewport === 'Cash and savings coins' && k.frames > 0 && /Cash and savings/.test(k.line || ''), 'the ?perf=1 overlay names the stage on screen and counts its frames (' + k.line + ')');
    await p2.evaluate(() => localStorage.removeItem('vi-perf')); await p2.close(); }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
