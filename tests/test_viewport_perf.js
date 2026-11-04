// v0.9.2 viewport speed budgets (owner, 4 Nov 2026: "Viewports still too slow: cash, gold/precious metals, wealth inventory and
// liabilities. Measure first (cold load, 390 px, CPU 4x), then fix."). The full measurement is tests/perf_viewports.js; this test
// gates the fixed numbers that made those viewports slow, so a regression fails CI. Wall-clock times swing with machine load and
// this machine's software GPU, so they are printed, never gated.
//  - wealth inventory and liabilities: one WebGL renderer for the tile's live view and the full viewer, however often they open;
//    the tile hands its model to the full viewer (no second read); one draw per frame; nothing draws after close; draw calls and
//    triangles under budget; a tap on the live tile still opens the full viewer (its listeners moved off the shared canvas)
//  - cash and precious metals: the idle warm-up (renderer and shaders) starts as soon as the 3D engine is in; each open sets the drawing buffer size at most three times (once to fit, once to the lower pixel
//    ratio while coins land, once back); a pixel ratio change and a resize were two sets each; draw calls and triangles under budget
// Run: node tests/test_viewport_perf.js     (VI_ROOT=/path/to/checkout to test another copy)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const routeThree = require('./three_route');
const ROOT = process.env.VI_ROOT || path.join(__dirname, '..');
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); }; const info = m => console.log('info:', m);
// cash triangles: every stack is a closed solid since v0.9.2 (about 121k at £25k; past about 160k of stacks, blocks fall back to painted boxes)
const ITEM_CALLS = 40, ITEM_TRIS = 20000, CASH_CALLS = 16, CASH_TRIS = 170000, METAL_CALLS = 20, METAL_TRIS = 4000, REALLOCS = 3;
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css' };
const serve = () => new Promise(res => { const s = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(ROOT, path.normalize(u)); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res(s)); });
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'models', 'catalog.json'), 'utf8')).models;
const lib = uid => { const m = CAT.find(x => x.uid === uid); return { src: 'lib', cid: m.uid, pid: m.id, t: m.title, by: m.creator, lic: /CC-BY/i.test(m.licence || '') ? 'CC-BY' : 'CC0', licFull: m.licence || '', file: m.file, item: m.item || '', standin: !!m.standin, standinFor: m.standinFor || '', url: m.source || '', attr: m.attribution || '' }; };
const AL = { cashAccounts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 12000 }, { id: 6, name: 'Monzo', type: 'Current', balance: 2500 }], physicalCash: [{ id: 1, where: 'Safe', amount: 300, date: '2026-10-01' }],
  metals: { gold: 10, silver: 100 }, metalPrices: { gold: 2000, silver: 25, platinum: 900, palladium: 1000 },
  otherAssets: [[11, 'Gibson Les Paul', 2200, 'instruments:gibson-les-paul'], [12, 'Rolex Submariner', 8500, 'collectibles:rolex-submariner'], [13, 'Mountain bike', 900, 'collectibles:mountain-bike']].map(([id, name, value, uid]) => ({ id, name, value, model: lib(uid) })),
  liabilities: [{ id: 21, name: 'Ford Fiesta', value: 6000, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z', model: lib('cars:ford-fiesta') }] };
const SEED = `(function(){if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi-theme','dark');localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('vi_pioneer',JSON.stringify({active:true,email:'t@t.com'}));localStorage.setItem('pos_al1',${JSON.stringify(JSON.stringify(AL))});})()`;
// every WebGL renderer made, every draw (with the animation frame it fell in and the viewport its canvas sits in), every drawing-buffer size set (the browser clears and reallocates the buffer on each, even to the same size)
const HOOK = () => {
  const T = window.__P = { made: [], r: [], buf: [], frame: 0 };
  document.addEventListener('vi-three', () => { T.three = performance.now(); });
  document.addEventListener('DOMContentLoaded', () => { const f = window.v3Warm; if (typeof f === 'function') window.v3Warm = function () { if (T.warmAt == null) T.warmAt = performance.now(); return f.apply(this, arguments); }; });
  const tick = () => { T.frame++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  const lab = cv => !cv.isConnected ? 'off' : cv.closest('#i3d-modal') ? 'modal' : cv.closest('.i3d-live') ? 'tile' : cv.closest('#cashSceneCard') ? 'cash' : cv.closest('#metalsSceneCard') ? 'metals' : 'other';
  const wrap = O => { const W = function (o) { O.call(this, o); T.made.push([performance.now(), !!(o && o.preserveDrawingBuffer)]); const self = this, rr = this.render;
    this.render = function (s, c) { rr.call(self, s, c); T.r.push([performance.now(), T.frame, lab(self.domElement), self.info.render.calls, self.info.render.triangles]); }; }; W.prototype = O.prototype; Object.keys(O).forEach(k => W[k] = O[k]); return W; };
  let three; Object.defineProperty(window, 'THREE', { configurable: true, get: () => three, set: v => { three = v; let R;
    try { Object.defineProperty(v, 'WebGLRenderer', { configurable: true, enumerable: true, get: () => R, set: x => { R = x && !x.__w ? wrap(x) : x; if (R) R.__w = 1; } }); } catch (e) {} } });
  ['width', 'height'].forEach(k => { const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, k), set = d.set;
    Object.defineProperty(HTMLCanvasElement.prototype, k, { configurable: true, get: d.get, set: function (v) { if (/v3-canvas|i3d-canvas/.test(this.className)) T.buf.push([performance.now(), this.className, k, v]); return set.call(this, v); } }); });
};
const HIDE = '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}';
async function tap(p, sel) { const h = await p.$(sel); if (!h) return false; await h.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(150);
  const b = await h.boundingBox(); if (!b) return false; await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); return true; }
const settle = (p, ms) => p.waitForTimeout(ms);
const perFrame = (p, t0, l) => p.evaluate(([t0, l]) => { const by = {}; __P.r.filter(x => x[0] >= t0 && x[2] === l).forEach(x => by[x[1]] = (by[x[1]] || 0) + 1); const v = Object.values(by); return { frames: v.length, worst: Math.max(0, ...v) }; }, [t0, l]);
const last = (p, l) => p.evaluate(l => { const x = __P.r.filter(r => r[2] === l).pop(); return x ? { calls: x[3], tris: x[4] } : null; }, l);
(async () => {
  const srv = await serve(), origin = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({ args: GPU_ARGS }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await routeThree(ctx);
  // seed: the data, then each model on the device with the tile picture the app draws itself
  { const p = await ctx.newPage(); await p.addInitScript(SEED); await p.goto(origin + '/index.html', { waitUntil: 'load' });
    await p.waitForFunction(() => !!window.THREE && !!THREE.GLTFLoader, null, { timeout: 60000 });
    await p.evaluate(async () => { const tv = /tv!==(\d)/.exec(i3dRefreshThumbs.toString()); for (const [k, list] of [['wi', alState.otherAssets], ['li', alState.liabilities]]) for (const it of list) {
      const buf = await (await fetch('models/' + it.model.file)).arrayBuffer(); await i3dPut(k, it.id, buf, 'glb'); const obj = await i3dParse(buf.slice(0), 'glb', k); i3dStyle(obj);
      it.model.fmt = 'glb'; it.model.thumb = i3dThumb(obj); it.model.tv = tv ? +tv[1] : 2; it.model.at = Date.now(); } saveAL(); });
    await p.close(); }
  // a cold page on the phone profile, CPU 4x
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.addInitScript(HOOK);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(origin + '/index.html', { waitUntil: 'load' }); await p.addStyleTag({ content: HIDE });
  await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls && !!THREE.GLTFLoader, null, { timeout: 60000 }).catch(() => {});
  await settle(p, 3000);
  // the cash and metals warm-up is asked for as soon as the page has loaded and the 3D engine is in (whichever comes last)
  const ws = await p.evaluate(() => { const ld = performance.getEntriesByType('navigation')[0], ready = Math.max(__P.three || 0, ld ? ld.loadEventEnd : 0); return { three: __P.three, ready, first: __P.warmAt == null ? null : __P.warmAt }; });
  ok(ws.three != null && ws.first != null && ws.first - ws.ready < 500, 'the cash and metals warm-up starts within 0.5 s of the page and the 3D engine both being ready (' + (ws.first != null && ws.three != null ? Math.round(ws.first - ws.ready) + ' ms' : 'not seen') + '; it waited for a 1.5 s poll)');
  await p.evaluate(() => { const f = window.i3dParse; window.__parses = 0; window.i3dParse = function () { window.__parses++; return f.apply(this, arguments); }; });

  // ── 1. cash and savings: tab, sub-tab, scroll down to the stage ──
  let t0 = await p.evaluate(() => performance.now());
  await p.evaluate(() => showTab('assets')); await tap(p, '#assets-page .subtab-btn[data-sub="cash"]'); await settle(p, 200);
  await p.evaluate(() => document.querySelector('#cashSceneCard').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForFunction(t0 => __P.r.some(x => x[0] >= t0 && x[2] === 'cash'), t0, { timeout: 60000 }).catch(() => {});
  await settle(p, 4000);
  let r = await p.evaluate(t0 => { const f = __P.r.find(x => x[0] >= t0 && x[2] === 'cash'); return { first: f ? Math.round(f[0] - t0) : null, buf: __P.buf.filter(x => x[0] >= t0 && /v3/.test(x[1])) }; }, t0);
  let lc = await last(p, 'cash'); const reallocs = rs => rs.filter(x => x[2] === 'width').length;   // each resize sets the width then the height: one reallocation (here the two can land far apart, the software GPU stalls on the first)
  ok(r.first != null, 'cash and savings draws in 3D once scrolled into view');
  info('cash: tab tap to first frame ' + r.first + ' ms (software GPU here; read on a phone with ?perf=1)');
  if (process.env.VP_DEBUG) console.log(JSON.stringify(r.buf.map(x => [Math.round(x[0] - t0), x[2], x[3]])));
  ok(reallocs(r.buf) <= REALLOCS, 'cash: the drawing buffer is reallocated ' + reallocs(r.buf) + ' times while it opens (budget ' + REALLOCS + ')');
  ok(lc && lc.calls <= CASH_CALLS && lc.tris <= CASH_TRIS, 'cash: ' + (lc && lc.calls) + ' draw calls, ' + (lc && lc.tris) + ' triangles a frame (budget ' + CASH_CALLS + ', ' + CASH_TRIS + ')');

  // ── 2. precious metals ──
  t0 = await p.evaluate(() => performance.now());
  await p.evaluate(() => scrollTo(0, 0)); await tap(p, '#assets-page .subtab-btn[data-sub="metals"]'); await settle(p, 200);
  await p.evaluate(() => document.querySelector('#metalsSceneCard').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForFunction(t0 => __P.r.some(x => x[0] >= t0 && x[2] === 'metals'), t0, { timeout: 60000 }).catch(() => {});
  await settle(p, 4000);
  r = await p.evaluate(t0 => { const f = __P.r.find(x => x[0] >= t0 && x[2] === 'metals'); return { first: f ? Math.round(f[0] - t0) : null, buf: __P.buf.filter(x => x[0] >= t0 && /v3/.test(x[1])) }; }, t0);
  lc = await last(p, 'metals');
  ok(r.first != null, 'precious metals draws in 3D once scrolled into view'); info('metals: sub-tab tap to first frame ' + r.first + ' ms');
  ok(reallocs(r.buf) <= REALLOCS, 'metals: the drawing buffer is reallocated ' + reallocs(r.buf) + ' times while it opens (budget ' + REALLOCS + ')');
  ok(lc && lc.calls <= METAL_CALLS && lc.tris <= METAL_TRIS, 'metals: ' + (lc && lc.calls) + ' draw calls, ' + (lc && lc.tris) + ' triangles a frame (budget ' + METAL_CALLS + ', ' + METAL_TRIS + ')');

  // ── 3. wealth inventory: tap a tile (live view), expand (full viewer), close, expand another, close ──
  await p.evaluate(() => scrollTo(0, 0)); await tap(p, '#assets-page .subtab-btn[data-sub="other"]'); await p.waitForSelector('#other-assets-list img.i3d-thumb', { timeout: 20000 }).catch(() => {});
  await settle(p, 800);
  t0 = await p.evaluate(() => performance.now()); await tap(p, '#other-assets-list img.i3d-thumb');
  await p.waitForFunction(t0 => __P.r.some(x => x[0] >= t0 && x[2] === 'tile'), t0, { timeout: 30000 }).catch(() => {});
  r = await p.evaluate(t0 => { const f = __P.r.find(x => x[0] >= t0 && x[2] === 'tile'); return f ? Math.round(f[0] - t0) : null; }, t0);
  ok(r != null, 'wealth inventory: a tap on a model tile turns it into a live 3D view'); info('tile: tap to first frame ' + r + ' ms');
  await settle(p, 600);
  t0 = await p.evaluate(() => performance.now()); await tap(p, '#other-assets-list .inv-exp');
  await p.waitForFunction(t0 => __P.r.some(x => x[0] >= t0 && x[2] === 'modal'), t0, { timeout: 30000 }).catch(() => {});
  r = await p.evaluate(t0 => { const f = __P.r.find(x => x[0] >= t0 && x[2] === 'modal'); return f ? Math.round(f[0] - t0) : null; }, t0);
  ok(r != null, 'wealth inventory: expand opens the full viewer'); info('full viewer: tap to first frame ' + r + ' ms');
  ok(await p.evaluate(() => window.__parses) === 1, 'the tile hands its model to the full viewer: the file is read once, not twice (' + await p.evaluate(() => window.__parses) + ')');
  // sample at least 20 frames of the turning model (under CI load 2 s gave as few as 4), up to 20 s; the gate stays at one draw a frame
  const t1 = await p.evaluate(() => performance.now());
  await p.waitForFunction(t1 => new Set(__P.r.filter(x => x[0] >= t1 && x[2] === 'modal').map(x => x[1])).size >= 20, t1, { timeout: 20000 }).catch(() => {});
  const pf = await perFrame(p, t1, 'modal'); const lm = await last(p, 'modal');
  ok(pf.frames >= 20 && pf.worst <= 1, 'the turning model is drawn once a frame (' + pf.frames + ' frames, at most ' + pf.worst + ' draws in one)');
  ok(lm && lm.calls <= ITEM_CALLS && lm.tris <= ITEM_TRIS, 'full viewer: ' + (lm && lm.calls) + ' draw calls, ' + (lm && lm.tris) + ' triangles a frame (budget ' + ITEM_CALLS + ', ' + ITEM_TRIS + ')');
  t0 = await p.evaluate(() => performance.now()); await tap(p, '#i3d-modal .inv-x'); await p.waitForFunction(() => !document.getElementById('i3d-modal'), null, { timeout: 20000 }).catch(() => {});
  const gone = await p.evaluate(() => performance.now()), closeMs = Math.round(gone - t0); await settle(p, 1200);
  const after = await p.evaluate(g => __P.r.filter(x => x[0] >= g + 100 && x[2] !== 'cash' && x[2] !== 'metals').length, gone);
  if (process.env.VP_DEBUG) console.log(JSON.stringify(await p.evaluate(t0 => __P.r.filter(x => x[0] >= t0).map(x => [Math.round(x[0] - t0), x[2]]), t0)), closeMs);
  ok(after === 0, 'after close nothing is drawing (' + after + ' frames)'); info('close: tap to gone ' + closeMs + ' ms');
  // the second item: straight to the full viewer, then close
  await tap(p, '#other-assets-list .wi-tile:nth-child(2) .inv-exp'); await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 30000 }).catch(() => {}); await settle(p, 800);
  ok(await p.evaluate(() => !!document.querySelector('#i3d-modal canvas.i3d-canvas')), 'a second item opens in the full viewer');
  await tap(p, '#i3d-modal .inv-x'); await settle(p, 600);
  // the live tile again, then a single tap on it opens the full viewer (its tap now listens on the tile, not the shared canvas)
  await tap(p, '#other-assets-list img.i3d-thumb'); await p.waitForFunction(() => !!document.querySelector('#other-assets-list .i3d-live canvas'), null, { timeout: 30000 }).catch(() => {}); await settle(p, 500);
  await tap(p, '#other-assets-list .i3d-live'); await p.waitForFunction(() => !!document.getElementById('i3d-modal'), null, { timeout: 10000 }).catch(() => {});
  ok(await p.evaluate(() => !!document.getElementById('i3d-modal')), 'a single tap on the live tile still opens the full viewer');
  await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 30000 }).catch(() => {}); await settle(p, 400);
  ok(await p.evaluate(() => !document.querySelector('#other-assets-list .i3d-live')), 'the tile goes back to its picture while the full viewer is open');
  await tap(p, '#i3d-modal .inv-x'); await settle(p, 400);

  // ── 4. liabilities: expand, close ──
  await p.evaluate(() => scrollTo(0, 0)); await tap(p, '#assets-page .subtab-btn[data-sub="liabilities"]'); await p.waitForSelector('#liabilities-list .inv-exp', { timeout: 20000 }).catch(() => {}); await settle(p, 600);
  t0 = await p.evaluate(() => performance.now()); await tap(p, '#liabilities-list .inv-exp');
  await p.waitForFunction(t0 => __P.r.some(x => x[0] >= t0 && x[2] === 'modal'), t0, { timeout: 30000 }).catch(() => {});
  r = await p.evaluate(t0 => { const f = __P.r.find(x => x[0] >= t0 && x[2] === 'modal'); return f ? Math.round(f[0] - t0) : null; }, t0);
  ok(r != null, 'liabilities: expand opens the full viewer'); info('liabilities full viewer: tap to first frame ' + r + ' ms');
  await settle(p, 1200); const ll = await last(p, 'modal');
  ok(ll && ll.calls <= ITEM_CALLS && ll.tris <= ITEM_TRIS, 'liabilities: ' + (ll && ll.calls) + ' draw calls, ' + (ll && ll.tris) + ' triangles a frame');
  await tap(p, '#i3d-modal .inv-x'); await settle(p, 600);
  ok(await p.evaluate(() => !document.getElementById('i3d-modal')), 'liabilities: X closes the full viewer');
  const made = await p.evaluate(() => __P.made.filter(m => !m[1]).length);
  ok(made <= 2, 'one WebGL renderer for cash and metals and one for every tile and full-viewer open (' + made + ' on the page; it was a new one per open)');
  // ── 5. the kept models: two at most, dropped when an item's file changes or goes, and a read that started before a change is not kept ──
  const kc = await p.evaluate(async () => { const mk = () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 1), new THREE.MeshBasicMaterial())); return g; };
    const a = mk(), b = mk(), c = mk(); i3dCachePut('wi', 901, a); i3dCachePut('wi', 902, b); i3dCachePut('wi', 903, c);
    const out = { evicted: i3dCacheGet('wi', 901) === null, kept: i3dCacheGet('wi', 902) === b && i3dCacheGet('wi', 903) === c, size: _i3dKeep.length };
    await i3dDel('wi', 903); out.delDrops = i3dCacheGet('wi', 903) === null;
    const v = i3dVer('wi', 902); await i3dPut('wi', 902, new ArrayBuffer(8), 'glb'); out.putDrops = i3dCacheGet('wi', 902) === null;
    out.staleRefused = i3dCachePut('wi', 902, mk(), v) === false && i3dCacheGet('wi', 902) === null; await i3dDel('wi', 902);
    // two live views at the same moment (never in normal use): the second gets its own renderer and both close cleanly
    const h1 = document.createElement('div'), h2 = document.createElement('div'); [h1, h2].forEach(h => { h.style.cssText = 'position:fixed;left:0;top:0;width:120px;height:120px'; document.body.appendChild(h); });
    const v1 = new I3DView(h1, mk(), { auto: false }), v2 = new I3DView(h2, mk(), { auto: false }); out.fallback = !!v1._sh && !v2._sh && v1.r !== v2.r;
    v1.dispose(); v2.dispose(); h1.remove(); h2.remove(); out.freed = !_i3dSh.view; return out; });
  ok(kc.evicted && kc.kept && kc.size === 2, 'two read models are kept at most; a third drops the oldest (' + kc.size + ' kept)');
  ok(kc.delDrops && kc.putDrops, 'a removed model or a new file drops the kept copy');
  ok(kc.staleRefused, 'a read that started before the file changed is not kept (no old model shown on the next open)');
  ok(kc.fallback && kc.freed, 'a second live view at the same moment gets its own renderer, and closing both frees the shared stage');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); srv.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL:', e.stack || e); process.exit(1); });
