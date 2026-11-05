// v0.9.2 baseline: every 3D viewport measured the same way, against the House Builder (CoS brief, 4 Nov: "The House Builder is the
// benchmark; every viewport must perform like it"). Not pass/fail. Serves the repo over http, Chromium, CPU 4x, outside hosts blocked,
// the demo data a new device gets. Counts WebGL draws at the context level, so it sees the House Builder's own engine as well as three.js.
// For each viewport, at 390 px (touch) and 1100 px: tap to first draw, long tasks and blocking time in the first 6 s (and in the first 1.5 s), steady frames a
// second and frame time while idle (on-demand stages should be near 0), while turning (a drag), draws per frame, canvas size and pixel
// ratio, and whether it keeps drawing after you leave the tab.
// Run: node tests/perf_baseline.js   (VI_ROOT=/path/to/checkout, PB_ONLY=house|cash|metals|crypto|roadmap|overview, PB_WIDTHS=390,1100, PB_PROFILE=1 prints a CPU profile of the open)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const routeThree = require('./three_route');
const ROOT = process.env.VI_ROOT || path.join(__dirname, '..');
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
const ONLY = process.env.PB_ONLY ? new RegExp(process.env.PB_ONLY) : null, WIDTHS = (process.env.PB_WIDTHS || '390,1100').split(',').map(Number);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
const serve = () => new Promise(res => { const s = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(ROOT, path.normalize(u)); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res(s)); });
// signed in, demo data (the first-run demo a new device gets), so every viewport has something to draw
const SEED = `(function(){if(localStorage.getItem('vi_pb'))return;localStorage.setItem('vi_pb','1');localStorage.setItem('vi-theme','dark');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('vi_pioneer',JSON.stringify({active:true,email:'t@t.com'}));})()`;
const HIDE = '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}';
const HOOK = () => {
  const T = window.__B = { lt: [], d: [], frame: 0, ft: [] };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => T.lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  const tick = t => { T.frame++; T.ft.push(t); if (T.ft.length > 2000) T.ft.shift(); requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  let id = 0; const cid = c => c.__pb || (c.__pb = ++id);
  [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(C => { if (!C) return; ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawElementsInstancedANGLE', 'drawArraysInstancedANGLE'].forEach(k => {
    const f = C.prototype[k]; if (!f) return; C.prototype[k] = function () { const cv = this.canvas; T.d.push([performance.now(), T.frame, cid(cv), cv.isConnected && cv.offsetParent !== null ? 1 : 0]); if (T.d.length > 200000) T.d.splice(0, 100000); return f.apply(this, arguments); }; }); });
  // ANGLE_instanced_arrays draws go through the extension object
  const ge = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { const g = ge.call(this, t, o);
    if (g && /webgl/.test(t) && !g.__pbx) { g.__pbx = 1; const gx = g.getExtension.bind(g); g.getExtension = n => { const x = gx(n); if (x && n === 'ANGLE_instanced_arrays' && !x.__pb) { x.__pb = 1; const cv = this;
      ['drawElementsInstancedANGLE', 'drawArraysInstancedANGLE'].forEach(k => { const f = x[k].bind(x); x[k] = function () { T.d.push([performance.now(), T.frame, cid(cv), cv.isConnected && cv.offsetParent !== null ? 1 : 0]); return f.apply(null, arguments); }; }); } return x; }; } return g; };
};
const VIEWS = {
  house: { go: "showTab('house')", sel: '#tab-house canvas, #house-page canvas, .hb3d canvas' },
  cash: { go: "showTab('assets');showSubtab('assets','cash',document.querySelector('[data-sub=cash]'))", scroll: '#cashSceneCard' },
  metals: { go: "showTab('assets');showSubtab('assets','metals',document.querySelector('[data-sub=metals]'))", scroll: '#metalsSceneCard' },
  crypto: { go: "showTab('assets');showSubtab('assets','crypto',document.querySelector('[data-sub=crypto]'))" },
  roadmap: { go: "showTab('achievements')" },
  overview: { go: "showTab('overview')" },
};
async function measure(b, origin, w, name, V) {
  const mobile = w < 700;
  const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: mobile ? 844 : 900 } }, mobile ? { deviceScaleFactor: 3, isMobile: true, hasTouch: true } : {}));
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await routeThree(ctx);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.addInitScript(SEED); await p.addInitScript(HOOK);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(origin + '/index.html', { waitUntil: 'load' }); await p.addStyleTag({ content: HIDE });
  await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(4000);
  // start on a tab with no 3D (Budget), so the open below is a cold open of this viewport
  if (name !== 'overview') { await p.evaluate(() => showTab('budget')); await p.waitForTimeout(1500); }
  if (process.env.PB_PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  const t0 = await p.evaluate(go => { const t = performance.now(); (0, eval)(go); return t; }, V.go);
  if (V.scroll) { await p.waitForTimeout(200); await p.evaluate(s => { const e = document.querySelector(s); e && e.scrollIntoView({ block: 'center', behavior: 'instant' }); }, V.scroll); }
  await p.waitForTimeout(6000);
  const open = await p.evaluate(t0 => { const B = __B, vis = B.d.filter(x => x[0] >= t0 && x[3]), lt = B.lt.filter(x => x[0] >= t0 && x[0] < t0 + 6000);
    const canv = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent !== null && c.width * c.height > 20000).map(c => c.width + 'x' + c.height + '@' + (c.width / Math.max(1, c.clientWidth)).toFixed(2));
    return { first: vis.length ? Math.round(vis[0][0] - t0) : null, longTasks: lt.length, longMax: Math.round(Math.max(0, ...lt.map(x => x[1]))), tbt: Math.round(lt.reduce((a, x) => a + Math.max(0, x[1] - 50), 0)), tbt1500: Math.round(lt.filter(x => x[0] < t0 + 1500).reduce((a, x) => a + Math.max(0, x[1] - 50), 0)), canvases: canv }; }, t0);
  if (process.env.PB_PROFILE) { const { profile } = await cdp.send('Profiler.stop'); const byId = {}, par = {}, cnt = {}; profile.nodes.forEach(n => { byId[n.id] = n; (n.children || []).forEach(c => par[c] = n.id); });
    profile.samples.forEach((id, i) => cnt[id] = (cnt[id] || 0) + (profile.timeDeltas[i] || 0)); const inc = {}, self = {};
    profile.nodes.forEach(n => { const t = (cnt[n.id] || 0) / 1000; if (!t) return; const f0 = n.callFrame, k0 = (f0.functionName || '(anon)') + ':' + (f0.lineNumber + 1); self[k0] = (self[k0] || 0) + t;
      const seen = new Set(); let id = n.id; while (id != null) { const f = byId[id].callFrame, k = (f.functionName || '(anon)') + ':' + (f.lineNumber + 1); if (!seen.has(k)) { inc[k] = (inc[k] || 0) + t; seen.add(k); } id = par[id]; } });
    const top = o => Object.entries(o).filter(([k]) => !/^\((root|idle|program|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => k + ' ' + v.toFixed(0)).join(', ');
    console.error('PROFILE ' + name + ' ' + w + '\n  self: ' + top(self) + '\n  incl: ' + top(inc)); }
  // idle: 3 s with nothing touched. An on-demand stage should draw nothing; a continuous loop draws every frame.
  const ti = await p.evaluate(() => performance.now()); await p.waitForTimeout(3000);
  const idle = await p.evaluate(ti => { const B = __B, d = B.d.filter(x => x[0] >= ti && x[3]), fr = new Set(d.map(x => x[1])), ft = B.ft.filter(t => t >= ti), gaps = ft.slice(1).map((t, i) => t - ft[i]).sort((a, b) => a - b);
    return { drawFps: +(fr.size / 3).toFixed(1), drawsPerFrame: fr.size ? +(d.length / fr.size).toFixed(1) : 0, rafFps: +(ft.length / 3).toFixed(1), frameP95: gaps.length ? Math.round(gaps[Math.floor(gaps.length * 0.95)]) : null }; }, ti);
  // turning: a sideways drag across the biggest visible canvas
  let turn = null; const box = await p.evaluate(() => { const c = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent !== null).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0]; if (!c) return null; c.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
  if (box && box.w > 100) { const td = await p.evaluate(() => performance.now());
    if (mobile) { const c = await ctx.newCDPSession(p); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x - 80, y: box.y }] });
      for (let i = 1; i <= 30; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x - 80 + i * 5.3, y: box.y }] }); await p.waitForTimeout(33); }
      await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); }
    else { await p.mouse.move(box.x - 80, box.y); await p.mouse.down(); for (let i = 1; i <= 30; i++) { await p.mouse.move(box.x - 80 + i * 5.3, box.y); await p.waitForTimeout(33); } await p.mouse.up(); }
    turn = await p.evaluate(td => { const B = __B, d = B.d.filter(x => x[0] >= td && x[0] < td + 1100 && x[3]), fr = [...new Set(d.map(x => x[1]))], ft = B.ft.filter(t => t >= td && t < td + 1100), gaps = ft.slice(1).map((t, i) => t - ft[i]).sort((a, b) => a - b);
      return { drawFps: +(fr.length / 1.1).toFixed(1), drawsPerFrame: fr.length ? +(d.length / fr.length).toFixed(1) : 0, frameP95: gaps.length ? Math.round(gaps[Math.floor(gaps.length * 0.95)]) : null }; }, td); }
  // leave the tab: anything still drawing after this is a loop running off screen
  const th = await p.evaluate(() => { showTab('budget'); return performance.now(); }); await p.waitForTimeout(2500);
  const hidden = await p.evaluate(th => __B.d.filter(x => x[0] >= th + 500).length, th);
  await ctx.close();
  return Object.assign({ view: name, width: w }, open, { idle, turn, drawsAfterLeaving: hidden, errors: errs.slice(0, 2) });
}
(async () => {
  const srv = await serve(), origin = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({ args: GPU_ARGS });
  for (const w of WIDTHS) for (const [name, V] of Object.entries(VIEWS)) { if (ONLY && !ONLY.test(name)) continue;
    const r = await measure(b, origin, w, name, V).catch(e => ({ view: name, width: w, error: String(e).slice(0, 200) })); console.log(JSON.stringify(r));
    if (process.env.PB_OUT) fs.appendFileSync(process.env.PB_OUT, JSON.stringify(r) + '\n'); }
  await b.close(); srv.close();
})();
