// Measures the cash and metals 3D stages on a phone profile (390 px, touch, CPU 4x): draw calls, triangles,
// orbit frame time p95 (real requestAnimationFrame frames while the camera turns), long tasks while opening.
// Run: node tests/v3_measure.js   (prints one JSON line per case; not a pass/fail test)
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = require('./lib/vi').FILE_URL;
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
const SEED = (accts, metals) => `(function(){if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:${JSON.stringify(accts)},physicalCash:[{id:1,where:'Safe',amount:300,date:'2026-10-01'}],metals:${JSON.stringify(metals)},metalPrices:{gold:2000,silver:25,platinum:900,palladium:1000}}));})()`;
const CASES = [
  { name: 'cash £25,300 (2 accounts + £300 physical)', sub: 'cash', accts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 20000 }, { id: 6, name: 'Monzo', type: 'Current', balance: 5000 }], metals: {} },
  { name: 'cash £250,300 (3 accounts)', sub: 'cash', accts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 200000 }, { id: 6, name: 'Monzo', type: 'Current', balance: 30000 }, { id: 7, name: 'ISA', type: 'ISA', balance: 20000 }], metals: {} },
  { name: 'metals 1 oz gold', sub: 'metals', accts: [], metals: { gold: 1 } },
  { name: 'metals 100 oz gold', sub: 'metals', accts: [], metals: { gold: 100 } },
  { name: 'metals 1,000 oz gold', sub: 'metals', accts: [], metals: { gold: 1000 } },
  { name: 'metals all four (50, 500, 20, 10 oz)', sub: 'metals', accts: [], metals: { gold: 50, silver: 500, platinum: 20, palladium: 10 } },
];
(async () => {
  const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
  const b = await chromium.launch({ args: GPU_ARGS });
  for (const C of CASES) {
    if (only && !only.test(C.name)) continue;
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await routeThree(ctx);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED(C.accts, C.metals));
    await p.addInitScript(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([e.startTime, e.duration]))).observe({ entryTypes: ['longtask'] }); } catch (e) {} });
    await p.goto(INDEX, { waitUntil: 'load' }); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
    await p.waitForFunction(() => window.V3 && V3._warmed, null, { timeout: 40000 }).catch(() => {});
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = await p.evaluate(sub => { const t = performance.now(); showTab('assets'); showSubtab('assets', sub, null); return t; }, C.sub);
    const key = C.sub === 'cash' ? 'cash' : 'metals';
    await p.waitForFunction(k => window.V3 && V3[k] && V3[k].root.children.length, key, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(4000);
    const r = await p.evaluate(async ([k, t0]) => {
      const V = V3[k]; V.r.info.autoReset = true; V.r.render(V.sc, V.cam);
      const calls = V.r.info.render.calls, tris = V.r.info.render.triangles;
      const t = V.ctl.target, c = V.cam.position, rad = Math.hypot(c.x - t.x, c.z - t.z), a0 = Math.atan2(c.z - t.z, c.x - t.x);
      const d = [], own = []; let last = 0;
      await new Promise(res => { let i = 0; const step = now => { if (last) d.push(now - last); last = now; const a = a0 + (++i) * 0.05; c.x = t.x + rad * Math.cos(a); c.z = t.z + rad * Math.sin(a); V.ctl.update(); const s0 = performance.now(); V.r.render(V.sc, V.cam); own.push(performance.now() - s0); if (i < 24) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
      d.sort((x, y) => x - y); own.sort((x, y) => x - y);
      const lt = window.__lt.filter(x => x[0] >= t0);
      return { calls, tris, dpr: V.r.getPixelRatio(), rafP95: +d[Math.floor(d.length * .95)].toFixed(1), ownP95: +own[Math.floor(own.length * .95)].toFixed(1), ownP50: +own[Math.floor(own.length * .5)].toFixed(1), longTasks: lt.length, longMax: Math.round(Math.max(0, ...lt.map(x => x[1]))) };
    }, [key, t0]);
    { const line = JSON.stringify(Object.assign({ case: C.name }, r, { errors: errs.length })); console.log(line); require('fs').appendFileSync(process.env.VI_MEASURE_OUT || require('path').join(require('os').tmpdir(), 'v3measure.jsonl'), line + '\n'); }
    await ctx.close();
  }
  await b.close();
})();
