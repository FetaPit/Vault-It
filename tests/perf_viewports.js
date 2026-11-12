// Viewport speed on a phone profile (owner, 4 Nov: "Viewports still too slow: cash, gold/precious metals, wealth inventory and
// liabilities. Measure first (cold load, 390 px, CPU 4x), then fix.").
// Serves the repo over http (not file://, so the model library loads the way it does live), Chromium at 390 x 844, touch, CPU 4x,
// every outside host blocked (three.js comes from the local copy in tests/vendor). Seeds 3 cash accounts and physical cash,
// gold and silver, 5 wealth items and 2 liabilities with library 3D models, then opens each viewport on a cold page load.
// For each: tap to first 3D frame, long tasks and total blocking time in the first 6 s, p95 tap latency, draw calls and
// triangles, and for the item viewer the expanded modal's open and close.
// Run: node tests/perf_viewports.js            prints a table and one JSON line per viewport
//      VI_ROOT=/path/to/other/checkout node tests/perf_viewports.js   measures another copy of the app
//      PERF_ONLY=inventory  one viewport (cash, metals, inventory, liabilities); PERF_OUT=file.jsonl appends each row; PERF_PROFILE=1 prints a CPU profile
// Not a pass/fail test: the budgets that gate CI are in tests/test_viewport_perf.js.
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const routeThree = require('./three_route');
const ROOT = process.env.VI_ROOT || path.join(__dirname, '..');
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
const RUNS = +(process.env.PERF_RUNS || 1), ONLY = process.env.PERF_ONLY ? new RegExp(process.env.PERF_ONLY) : null;
const log = m => { if (process.env.PERF_DEBUG) process.stderr.write(new Date().toISOString().slice(11, 19) + ' ' + m + '\n'); };
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
function serve() {
  return new Promise(res => { const s = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(ROOT, path.normalize(u)); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
    s.listen(0, '127.0.0.1', () => res(s)); });
}
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'models', 'catalog.json'), 'utf8')).models;
const lib = uid => { const m = CAT.find(x => x.uid === uid); return { src: 'lib', cid: m.uid, pid: m.id, t: m.title, by: m.creator, lic: /CC-BY/i.test(m.licence || '') ? 'CC-BY' : 'CC0', licFull: m.licence || '', file: m.file, item: m.item || '', standin: !!m.standin, standinFor: m.standinFor || '', url: m.source || '', attr: m.attribution || '' }; };
const WI = [[11, 'Gibson Les Paul', 2200, 'instruments:gibson-les-paul'], [12, 'Rolex Submariner', 8500, 'collectibles:rolex-submariner'], [13, 'Harp', 4000, 'instruments:harp'],
  [14, 'Shure SM58 microphone', 90, 'instruments:shure-sm58-microphone'], [15, 'Mountain bike', 900, 'collectibles:mountain-bike']];
const LI = [[21, 'Kia Sportage', 18000, 'cars:kia-sportage'], [22, 'Ford Fiesta', 6000, 'cars:ford-fiesta']];
const AL = { cashAccounts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 12000 }, { id: 6, name: 'Monzo', type: 'Current', balance: 2500 }, { id: 7, name: 'Cash ISA', type: 'ISA', balance: 8000 }],
  physicalCash: [{ id: 1, where: 'Safe', amount: 300, date: '2026-10-01' }], metals: { gold: 10, silver: 100 }, metalPrices: { gold: 2000, silver: 25, platinum: 900, palladium: 1000 },
  otherAssets: WI.map(([id, name, value, uid]) => ({ id, name, value, model: lib(uid) })),
  liabilities: LI.map(([id, name, value, uid]) => ({ id, name, value, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z', model: lib(uid) })) };
const SEED = `(function(){if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi-theme','dark');localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('vi_pioneer',JSON.stringify({active:true,email:'t@t.com'}));localStorage.setItem('pos_al1',${JSON.stringify(JSON.stringify(AL))});})()`;
const HIDE = '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}';
// long tasks, input-to-paint (Event Timing) and every WebGL draw, labelled by the viewport its canvas sits in
const HOOK = () => {
  const T = window.__P = { lt: [], ev: [], r: [] };
  try { new PerformanceObserver(l => l.getEntries().forEach(e => T.lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.interactionId) T.ev.push([e.startTime, e.duration, e.name, e.interactionId, (e.target && (e.target.id || e.target.className || e.target.tagName) || '') + '']); })).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
  const lab = cv => !cv.isConnected ? 'off' : cv.closest('#i3d-modal') ? 'modal' : cv.closest('.i3d-live') ? 'tile' : cv.closest('#cashSceneCard') ? 'cash' : cv.closest('#metalsSceneCard') ? 'metals' : cv.closest('#tab-house,#house-page,.hb3d') ? 'house' : 'other';
  const wrap = O => { const W = function (o) { O.call(this, o); const self = this, rr = this.render; this.render = function (s, c) { const t = performance.now(); rr.call(self, s, c);
      T.r.push([t, performance.now() - t, lab(self.domElement), self.info.render.calls, self.info.render.triangles]); };
      ['setSize', 'setPixelRatio', 'setDrawingBufferSize'].forEach(k => { const f = self[k]; self[k] = function () { const t = performance.now(); try { return f.apply(self, arguments); } finally { (T.sz = T.sz || []).push([Math.round(t), k, Math.round(performance.now() - t), [].slice.call(arguments).map(x => typeof x === 'number' ? +x.toFixed(2) : x).join('x'), lab(self.domElement)]); } }; }); }; W.prototype = O.prototype; Object.keys(O).forEach(k => W[k] = O[k]); return W; };
  // three.min.js fills window.THREE in place: wrap the renderer constructor the moment it is put there, before any renderer exists
  let three; Object.defineProperty(window, 'THREE', { configurable: true, get: () => three, set: v => { three = v; let R;
    try { Object.defineProperty(v, 'WebGLRenderer', { configurable: true, enumerable: true, get: () => R, set: x => { R = x && !x.__w ? wrap(x) : x; if (R) R.__w = 1; } }); } catch (e) {} } });
};
const p95 = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]; };
async function tapEl(p, sel) { const h = await p.$(sel); if (!h) throw new Error('no ' + sel); await h.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(150);
  const b = await h.boundingBox(); if (!b) throw new Error('hidden ' + sel); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }
async function now(p) { return p.evaluate(() => performance.now()); }
// time to the first frame of a viewport after t0, and what the page did in the 6 s after it
async function window6(p, t0, label, wait) {
  await p.waitForFunction(([t0, l]) => __P.r.some(x => x[0] >= t0 && x[2] === l), [t0, label], { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(wait || 6000);
  return p.evaluate(([t0, l]) => { const T = __P, f = T.r.find(x => x[0] >= t0 && x[2] === l), lt = T.lt.filter(x => x[0] >= t0 && x[0] < t0 + 6000), last = T.r.filter(x => x[2] === l).pop();
    return { first: f ? Math.round(f[0] + f[1] - t0) : null, longTasks: lt.length, longMax: Math.round(Math.max(0, ...lt.map(x => x[1]))), tbt: Math.round(lt.reduce((a, x) => a + Math.max(0, x[1] - 50), 0)),
      frames: T.r.filter(x => x[0] >= t0 && x[0] < t0 + 6000 && x[2] === l).length, calls: last ? last[3] : null, tris: last ? last[4] : null }; }, [t0, label]);
}
async function cold(b, origin, fn) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, storageState: STATE });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await routeThree(ctx);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(HOOK);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // the models live in IndexedDB, which storageState does not carry: copy them in before the app starts
  await p.addInitScript(recs => { if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); window.__idbSeed = new Promise(res => { const rq = indexedDB.open('vi_photos', 1);
    rq.onupgradeneeded = () => { const db = rq.result; if (!db.objectStoreNames.contains('sets')) db.createObjectStore('sets'); };
    rq.onsuccess = () => { const db = rq.result; if (!db.objectStoreNames.contains('sets')) { db.close(); return res(); } const tx = db.transaction('sets', 'readwrite'), st = tx.objectStore('sets');
      recs.forEach(([k, b64]) => { const s = atob(b64), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); st.put({ glb: a.buffer, fmt: 'glb', updated: Date.now() }, k); });
      tx.oncomplete = () => { db.close(); res(); }; }; }); }, IDB);
  log('goto'); const t = Date.now(); await p.goto(origin + '/index.html', { waitUntil: 'load' }); const load = Date.now() - t;
  await p.addStyleTag({ content: HIDE });
  await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls && !!THREE.GLTFLoader, null, { timeout: 60000 }).catch(() => {});
  log('loaded ' + (Date.now() - t)); await p.waitForTimeout(4000);   // the person reads the overview first; the idle warm-up runs here as it does live
  if (process.env.PERF_PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  const out = await fn(p);
  if (process.env.PERF_PROFILE) { const { profile } = await cdp.send('Profiler.stop'); const self = {}, byId = {}; profile.nodes.forEach(n => byId[n.id] = n);
    const dt = profile.timeDeltas, cnt = {}; profile.samples.forEach((id, i) => cnt[id] = (cnt[id] || 0) + (dt[i] || 0));
    profile.nodes.forEach(n => { const f = n.callFrame, k = (f.functionName || '(anon)') + ' ' + (f.url || '').split('/').pop() + ':' + (f.lineNumber + 1); self[k] = (self[k] || 0) + (cnt[n.id] || 0) / 1000; });
    // inclusive time too, per function, by walking parents
    const par = {}; profile.nodes.forEach(n => (n.children || []).forEach(c => par[c] = n.id)); const inc = {};
    profile.nodes.forEach(n => { const t = (cnt[n.id] || 0) / 1000; if (!t) return; const seen = new Set(); let id = n.id; while (id != null) { const f = byId[id].callFrame, k = (f.functionName || '(anon)') + ':' + (f.lineNumber + 1); if (!seen.has(k)) { inc[k] = (inc[k] || 0) + t; seen.add(k); } id = par[id]; } });
    console.error('SELF', JSON.stringify(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => k + ' ' + v.toFixed(0))));
    console.error('INCL', JSON.stringify(Object.entries(inc).sort((a, b) => b[1] - a[1]).slice(0, 45).map(([k, v]) => k + ' ' + v.toFixed(0)))); }
  if (process.env.PERF_DEBUG) console.error('SIZES', JSON.stringify(await p.evaluate(() => ({ sz: __P.sz, warmed: window.V3 && V3._warmed, wt: window.__wt })).catch(() => null)));
  if (process.env.PERF_DEBUG) console.log(JSON.stringify(out)); out.load = load; out.errors = errs.slice(0, 3); await ctx.close(); return out;
}
async function tapLatency(p, t0) { return p.evaluate(t0 => { const by = {}; __P.ev.filter(e => e[0] >= t0).forEach(e => { by[e[3]] = Math.max(by[e[3]] || 0, e[1]); }); return Object.values(by); }, t0); }
async function sceneTab(p, sub) {
  const t0 = await now(p);
  await tapEl(p, '.tab-btn[data-tab="assets"]').catch(() => p.evaluate(() => showTab('assets')));
  await p.waitForTimeout(300);
  await tapEl(p, '#assets-page .subtab-btn[data-sub="' + sub + '"]');
  // the stage sits below the fold on a phone: the person scrolls straight down to it (it draws only once in view)
  const card = sub === 'cash' ? '#cashSceneCard' : '#metalsSceneCard';
  await p.waitForTimeout(200); const ts = await p.evaluate(c => { document.querySelector(c).scrollIntoView({ block: 'center', behavior: 'instant' }); return performance.now(); }, card);
  const w = await window6(p, t0, sub); w.fromScroll = await p.evaluate(([ts, l]) => { const f = __P.r.find(x => x[0] >= ts && x[2] === l); return f ? Math.round(f[0] + f[1] - ts) : null; }, [ts, sub]);
  // a few taps on the stage and the sub-tabs while it is open
  for (let i = 0; i < 3; i++) { await tapEl(p, sub === 'cash' ? '#cashSceneCard canvas' : '#metalsSceneCard canvas').catch(() => {}); await p.waitForTimeout(250); }
  const taps = await tapLatency(p, t0); w.tapP95 = p95(taps); w.taps = taps.length;
  return w;
}
async function items(p, kind) {
  const sub = kind === 'wi' ? 'other' : 'liabilities', list = kind === 'wi' ? '#other-assets-list' : '#liabilities-list';
  const t0 = await now(p);
  await tapEl(p, '.tab-btn[data-tab="assets"]').catch(() => p.evaluate(() => showTab('assets')));
  await p.waitForTimeout(300);
  await tapEl(p, '#assets-page .subtab-btn[data-sub="' + sub + '"]');
  await p.waitForSelector(list + ' img.i3d-thumb', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const listLt = await p.evaluate(t0 => { const lt = __P.lt.filter(x => x[0] >= t0); return { longTasks: lt.length, tbt: Math.round(lt.reduce((a, x) => a + Math.max(0, x[1] - 50), 0)) }; }, t0);
  // 1. tap the first tile: it turns into a live 3D view
  log('list'); const t1 = await now(p); await tapEl(p, list + ' img.i3d-thumb');
  const tile = await window6(p, t1, 'tile', 2500);
  // orbit the tile with a finger, sideways
  const box = await (await p.$(list + ' .i3d-live canvas')).boundingBox().catch(() => null);
  if (box) { const cx = box.x + box.width / 2, cy = box.y + box.height / 2; await cdpDrag(p, cx - 60, cy, cx + 60, cy); }
  await p.waitForTimeout(800);
  // 2. the expand button opens the full viewer
  log('expand'); const t2 = await now(p); await tapEl(p, list + ' .inv-exp');
  const modal = await window6(p, t2, 'modal');
  // 3. close it with the X
  log('close'); const t3 = await now(p); await tapEl(p, '#i3d-modal .inv-x');
  await p.waitForTimeout(2500);
  const close = await p.evaluate(t3 => { const ev = __P.ev.filter(e => e[0] >= t3), lt = __P.lt.filter(x => x[0] >= t3); return { closeMs: Math.round(Math.max(0, ...ev.map(e => e[1]))), gone: !document.getElementById('i3d-modal'),
    framesAfter: __P.r.filter(x => x[0] >= t3 + 300 && x[2] !== 'off').length, longTasks: lt.length }; }, t3);
  const taps = await tapLatency(p, t0);
  return { list: listLt, tile, modal, close, tapP95: p95(taps), taps: taps.length };
}
async function cdpDrag(p, x0, y0, x1, y1) { const c = await p.context().newCDPSession(p); const pt = (x, y) => [{ x, y, id: 1 }];
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(x0, y0) });
  for (let i = 1; i <= 10; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10) }); await p.waitForTimeout(30); }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await c.detach(); }
let STATE = null, IDB = [];
(async () => {
  const srv = await serve(), origin = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({ args: GPU_ARGS });
  // seed once at full speed: the data, then each model's tile picture drawn by the app itself, as if just picked from the library
  log('seed'); { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await routeThree(ctx);
    const p = await ctx.newPage(); await p.addInitScript(SEED); await p.goto(origin + '/index.html', { waitUntil: 'load' });
    await p.waitForFunction(() => !!window.THREE && !!THREE.GLTFLoader, null, { timeout: 60000 });
    await p.evaluate(async () => { const tv = /tv!==(\d)/.exec(i3dRefreshThumbs.toString()); for (const [k, list] of [['wi', alState.otherAssets], ['li', alState.liabilities]]) for (const it of list) {
      const buf = await (await fetch('models/' + it.model.file)).arrayBuffer(); await i3dPut(k, it.id, buf, 'glb'); const obj = await i3dParse(buf.slice(0), 'glb', k); i3dStyle(obj);
      it.model.fmt = 'glb'; it.model.thumb = i3dThumb(obj); it.model.tv = tv ? +tv[1] : 2; it.model.at = Date.now(); } saveAL(); });
    IDB = await p.evaluate(() => new Promise(res => { const rq = indexedDB.open('vi_photos', 1); rq.onsuccess = () => { const out = [], st = rq.result.transaction('sets').objectStore('sets'), c = st.openCursor();
      c.onsuccess = () => { const cur = c.result; if (!cur) return res(out); if (/^m:/.test(cur.key)) { const u = new Uint8Array(cur.value.glb); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); out.push([cur.key, btoa(s)]); } cur.continue(); }; }; }));
    log('seeded ' + IDB.length); STATE = await ctx.storageState(); await ctx.close(); }
  const rows = [];
  for (let run = 0; run < RUNS; run++) {
    for (const [view, fn] of [['cash', p => sceneTab(p, 'cash')], ['metals', p => sceneTab(p, 'metals')], ['inventory', p => items(p, 'wi')], ['liabilities', p => items(p, 'li')]]) {
      if (ONLY && !ONLY.test(view)) continue; log('cold ' + view); const row = Object.assign({ view }, await cold(b, origin, fn)); rows.push(row); console.log(JSON.stringify(row));
      if (process.env.PERF_OUT) fs.appendFileSync(process.env.PERF_OUT, JSON.stringify(row) + '\n'); }
  }
  const f = v => v == null ? '-' : String(v);
  console.log('\nview         first frame  long tasks  worst  TBT 6s  tap p95  calls  tris   | modal first  modal TBT  close  frames after close');
  rows.forEach(r => { const s = r.tile || r; console.log([r.view.padEnd(12), f(s.first).padStart(11), f(s.longTasks).padStart(11), f(s.longMax).padStart(6), f(s.tbt).padStart(7), f(r.tapP95 && Math.round(r.tapP95)).padStart(8), f(s.calls).padStart(6), f(s.tris).padStart(6),
    '|', r.modal ? f(r.modal.first).padStart(11) + f(r.modal.tbt).padStart(11) + f(r.close.closeMs).padStart(7) + f(r.close.framesAfter).padStart(8) : ''].join(' ')); });
  await b.close(); srv.close();
})().catch(e => { console.log('FAIL:', e.stack || e); process.exit(1); });
