// Cold load of the house builder, the way a tester meets it (v0.7 preview edits E12, owner 1 Nov 2026: "Measure from a cold load
// (cleared cache, phone), not a warm one"). A fresh browser context (nothing stored, so the demo data loads, no sign-in), phone
// viewport 390 x 844 at 3x, CPU throttled 4x, then the House tab is opened and the stage scrolled into view. Reported from that tap:
//   firstFrame  ms until the first 3D frame is drawn (the house is on screen)
//   stillAt     ms until the still picture is on screen (0 = it was there before the tap, null = never shown)
//   longMax     the longest main-thread task (a frozen page) from the tap until the house has settled
//   tbt         ms blocked in total (long tasks over 50 ms)
//   lagP95/Max  how late a 50 ms timer fires (what a tap waits)
//   settled     ms until the viewer reports settled (nothing landing, nothing easing); the pixel-ratio switch is then probed (see below)
//   laidAtFirst how many bricks were already in place on the first frame (the finished house shows at once when this is the plan's count)
//   animated    bricks that dropped in after the first frame
// Usage: node tests/hb_coldload.js [runs]   (VI_INDEX=/path/index.html for another build). Also used by test_hb_speed.js.
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = require('./lib/vi').FILE_URL;

const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];

// in the page: arm the observers, open the House tab, wait for the first 3D frame and the settled house (or the time limit)
const COLD = (limit) => new Promise(done => {
  const R = { lt: [], lts: [], lag: [], t0: 0, firstFrame: null, stillAt: null, settled: null, laidAtFirst: null, planned: null, animated: 0, lite: null, dpr: null, ltAfter: 0, dprLaying: null, courseBricks: null };
  let po = null; try { po = new PerformanceObserver(l => l.getEntries().forEach(e => { R.lt.push(e.duration); R.lts.push(e.startTime); })); po.observe({ entryTypes: ['longtask'] }); } catch (e) {}
  const scene = document.getElementById('house-scene');
  const stillUp = () => { const c = document.getElementById('hbStill'); return !!(c && c._key && scene && scene.getAttribute('data-engine') !== '3d' && getComputedStyle(c).display !== 'none' && c.width > 1); };
  R.t0 = performance.now(); R.app = [];
  // the house path's own entry points, timed: a long task is ours when one of these, or a costly renderer frame, ran inside it
  const wrapFn = (obj, name) => { const f = obj && obj[name]; if (typeof f !== 'function' || f._coldWrapped) return; const w = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { R.app.push([t, performance.now() - t]); } }; w._coldWrapped = true; obj[name] = w; };
  ['hb3dRedraw', 'hb3dWarmTypes', 'hb3dModel'].forEach(n => wrapFn(window, n)); if (window.HB3D) ['build', 'brandPlan'].forEach(n => wrapFn(HB3D, n));
  let due = performance.now() + 50; const tick = () => { if (R.done) return; const n = performance.now(); R.lag.push(Math.max(0, n - due)); due = n + 50; setTimeout(tick, 50); }; setTimeout(tick, 50);
  try { showTab('house'); scene.scrollIntoView({ block: 'center' }); } catch (e) { R.err = String(e && e.message); }
  const finish = () => {
    R.done = true; if (po) po.disconnect();
    const q = (a, f) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
    const v = window.HB3D && HB3D.viewer, bi = v && v.brandInfo && v.brandInfo();
    // long tasks once the house is on screen until it settles (the course laying), by when each task started: the poll runs on
    // requestAnimationFrame, which a software GPU paces at seconds a frame, so a task that began after the house settled (the idle
    // compile of the other house types, 700 ms later) must not be counted just because the poll had not yet seen the settle
    const tEnd = R.settled == null ? Infinity : Math.min(R.t0 + R.settled, R.settledReal == null ? Infinity : R.settledReal);
    // On a software GPU (SwiftShader here and on CI) the browser's frame commit waits for the GPU to finish the previous frame, inside the
    // same task as the renderer's own 10 to 30 ms of JavaScript: 2 to 5 s on CI, 9 to 12 s here. That is GPU wall time, which these runs
    // cannot measure (the owner's devices do, with ?perf=1), not main-thread code, so a long task that begins with a frame whose own cost
    // was under 50 ms is set aside as a GPU wait (reported as gpuWait). On a real GPU every long task counts.
    // (the browser's rendering task waits for the GPU first and then runs the frame's callbacks at its end, so a long task counts as
    // ours when the house path's own code inside it adds up to 50 ms or more: renderer frames by their own cost, plus calls into
    // hb3dRedraw, the idle precompile and the model builder, which the probe wraps below, nested calls counted once; the rest of such a
    // task is the browser's wait for the software GPU)
    const soft = !!(v && v.softGPU && v.softGPU()), frames = soft && v.frameLog ? v.frameLog() : [];
    const spans = frames.map(f => [f.t, f.js]).concat(R.app).sort((a, b) => a[0] - b[0]);
    const gpuWait = [], after = [];
    if (R.firstFrame != null) R.lt.forEach((d, i) => { const st = R.lts[i], en = st + d; if (st < R.t0 + R.firstFrame || st >= tEnd) return;
      let ours = 0, until = -1; spans.forEach(a => { if (a[0] < st - 1 || a[0] > en) return; if (a[0] < until) return; ours += a[1]; until = a[0] + a[1]; });
      if (!soft || ours >= 50) after.push(d); else gpuWait.push(d); });
    done({ firstFrame: R.firstFrame, stillAt: R.stillAt, settled: R.settled, longMax: Math.max(0, ...R.lt), longN: R.lt.length, tbt: R.lt.reduce((s, d) => s + Math.max(0, d - 50), 0),
      longMaxAfter: Math.max(0, ...after), tbtAfter: after.reduce((s, d) => s + Math.max(0, d - 50), 0), gpuWait: Math.max(0, ...gpuWait), gpuWaitN: gpuWait.length, soft, dprLaying: R.dprMin == null ? R.dprLaying : R.dprMin, courseBricks: R.courseBricks,
      lagP95: q(R.lag, 0.95), lagMax: Math.max(0, ...R.lag), laidAtFirst: R.laidAtFirst, planned: R.planned, animated: R.animatedCourse == null ? R.animated : R.animatedCourse, lite: v ? !!v._bLite : null,
      dpr: v ? v.renderer.getPixelRatio() : null, kind: R.kind, bricks: bi ? bi.bricks : null, row: bi ? bi.row : null, engine: scene ? scene.getAttribute('data-engine') : null, err: R.err });
  };
  const seen = new Set();
  const poll = () => {
    const now = performance.now() - R.t0;
    if (R.stillAt == null && stillUp()) R.stillAt = now;
    const v = window.HB3D && HB3D.viewer;
    if (v && (v._bDraws || 0) > 0) {
      if (R.firstFrame == null) {
        R.firstFrame = now; R.ltAt = R.lt.length; R.dprLaying = v.renderer.getPixelRatio(); R.kind = v.engine || 'three';
        if (v.engine === 'house_gl') { try { const ls = v.layStats(), st = HB3D.brandStats(v.model, v._target == null ? v.p : v._target); R.laidAtFirst = ls.settledAtOpen; R.planned = st.bricksLaid; R.courseBricks = st.rowBricks; } catch (e) {} }
        else try { const recs = (v._bm || []).filter(Boolean), nowS = v._bNow();
          let laid = 0; recs.forEach(r => { if (r.part !== 'brick') return; for (let k = 0; k < r.cnt; k++) if (r.laid[k] <= nowS - 0.9 || r.laid[k] < -999) laid++; });
          R.laidAtFirst = laid; const st = HB3D.brandStats(v.model, v._bTarget == null ? v.p : v._bTarget); R.planned = st.bricksLaid; R.courseBricks = st.rowBricks; } catch (e) {}
      }
      // bricks that drop in after the first frame: a lay time within the clock (not the instant -1000 stamp)
      if (v.engine === 'house_gl') { try { R.animated = v.layStats().animated; } catch (e) {} }
      else try { (v._bm || []).forEach((r, ri) => { if (!r || r.part !== 'brick') return; for (let k = 0; k < r.cnt; k++) { const key = ri + ':' + k; if (r.laid[k] > -999 && r.laid[k] < 1e8 && !seen.has(key)) { seen.add(key); R.animated++; } } }); } catch (e) {}
      if (R.settled == null && v.settled() && now - R.firstFrame > 300) {
        R.settled = now; R.animatedCourse = R.animated; R.ltAtProbe = R.lt.length;
        if (v.engine === 'house_gl' && v._lastStampAt != null) R.settledReal = v._lastStampAt * 1000 + 3000;   // when the stage really settled (last brick landed + 3 s), which the paced poll sees late   // the on-screen window ends here: the probe below resizes the buffer twice, which costs SwiftShader seconds and a phone nothing
        // the opening course may have landed before SwiftShader's first frame here, so the pixel-ratio switch is probed on the settled house:
        // a brick stamped as landing now makes the next tick busy (1.25 on a 3x phone); stamped as long landed, a tick 350 ms later rests (2)
        if (v.engine === 'house_gl') { R.dprMin = v.renderer.getPixelRatio(); R.restAt = now + 350; }   // one pixel ratio throughout (the brand book's)
        else try {
          const rec = (v._bm || []).find(r => r && r.part === 'brick' && r.cnt > 0), k = rec.cnt - 1, was = rec.laid[k];
          rec.laid[k] = v._bNow(); v._brandTick(); R.dprMin = v.renderer.getPixelRatio();
          rec.laid[k] = was; R.restAt = now + 350;
        } catch (e) { R.probeErr = String(e && e.message); }
      }
      if (R.settled != null && R.restAt != null && now >= R.restAt && R.laySettled == null) { try { if (v._brandTick) v._brandTick(); } catch (e) {} R.laySettled = now; }
    }
    if ((R.laySettled != null && now > R.laySettled + 300) || now > limit) return finish();
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
});

async function coldLoad(opts) {
  opts = opts || {};
  const b = await chromium.launch({ args: GPU_ARGS });
  const errs = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
    await routeThree(ctx);
    const p = await ctx.newPage(); p.setDefaultTimeout(120000);
    p.on('pageerror', e => errs.push(e.message));
    // the path a phone with a working GPU takes (the default): the browser here draws WebGL in software, which the app spots and answers
    // with its lite mode; hold that off as test_hb_speed does, so the numbers are the app's work, not SwiftShader's. opts.soft = true
    // keeps the software path (an old phone whose GPU Chrome will not use) for comparison.
    if (!opts.soft) await p.addInitScript(() => { window.VI_HB_FULL = true;   // the brand-book renderer (house_gl) reads this flag
      const iv = setInterval(() => { if (window.HB3D && HB3D.Viewer && HB3D.Viewer.prototype._brandTick) { clearInterval(iv);
      const VP = HB3D.Viewer.prototype; Object.defineProperty(VP, '_bSoft', { get: () => false, set() {}, configurable: true }); Object.defineProperty(VP, '_bCost', { get: () => 0, set() {}, configurable: true }); } }, 5); });
    // the demo house (what a fresh device shows: 22,500 of a 48,000 deposit on the terraced house, row 62) seeded before the page runs, so
    // builds before and after the demo fix compare like for like; opts.fresh = true leaves storage empty (the demo seeds it itself)
    if (!opts.fresh) await p.addInitScript(() => { if (!localStorage.getItem('ht3')) localStorage.setItem('ht3', JSON.stringify({ saved: 22500, target: 240000, houseType: 'terraced', depositPct: 20,
      deposits: [{ date: '01/10/2025', amount: 5000 }, { date: '01/11/2025', amount: 4500 }, { date: '01/12/2025', amount: 3500 }, { date: '01/01/2026', amount: 4000 }, { date: '01/02/2026', amount: 3200 }, { date: '01/03/2026', amount: 2300 }],
      prices: { terraced: 240000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, apartmentFloor: 5 })); });
    if (opts.init) await p.addInitScript(opts.init);
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.rate || 4 });
    const tNav = Date.now();
    await p.goto(INDEX + (opts.query || ''), { waitUntil: 'load' });
    const loadMs = Date.now() - tNav;
    // three.js (about 1 MB of script) is preloaded once the page sits idle; wait for that, so the tap below measures the house builder, not
    // the browser parsing three.js (the same before and after, and up to 5 s here at 4x), then open the House tab as the tester would
    await p.waitForFunction(() => !!(window.THREE && THREE.OrbitControls) || !!(window.HB3D && HB3D.HouseGL && typeof hbGLEngine === 'function' && hbGLEngine()), null, { timeout: 30000 }).catch(() => {});   // the brand-book renderer needs no three.js
    const threeMs = Date.now() - tNav;
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    const r = await p.evaluate(COLD, opts.limit || 60000);
    r.loadMs = loadMs; r.threeMs = threeMs; r.errs = errs.slice();
    if (opts.after) r.after = await opts.after(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await ctx.close();
    return r;
  } finally { await b.close().catch(() => {}); }
}
module.exports = { coldLoad };
const fmt = r => `page load ${r.loadMs} ms, three.js in by ${r.threeMs} ms, then from the tap: first 3D frame ${r.firstFrame == null ? 'never' : r.firstFrame.toFixed(0) + ' ms'} · still picture ${r.stillAt == null ? 'not shown' : 'at ' + r.stillAt.toFixed(0) + ' ms'} · settled ${r.settled == null ? 'not within limit' : r.settled.toFixed(0) + ' ms'} · longest task ${r.longMax.toFixed(0)} ms (${r.longN} long tasks, ${r.tbt.toFixed(0)} ms blocked; once the house is on screen longest ${r.longMaxAfter.toFixed(0)} ms, ${r.tbtAfter.toFixed(0)} ms blocked${r.gpuWaitN ? '; ' + r.gpuWaitN + ' GPU wait(s) on the software GPU set aside, longest ' + r.gpuWait.toFixed(0) + ' ms' : ''}) · tap waits p95 ${r.lagP95.toFixed(0)} / max ${r.lagMax.toFixed(0)} ms · bricks on first frame ${r.laidAtFirst} of ${r.planned}, ${r.animated} dropped in after (top course ${r.courseBricks}) · row ${r.row}, ${r.bricks} bricks${r.lite ? ' · lite' : ''} · pixel ratio ${r.dprLaying} laying, ${r.dpr} at rest${r.errs.length ? ' · PAGE ERRORS ' + r.errs[0].slice(0, 80) : ''}`;
module.exports.fmt = fmt;

if (require.main === module) (async () => {
  const runs = parseInt(process.argv[2], 10) || 1, soft = process.argv.includes('--soft'), fresh = process.argv.includes('--fresh');
  for (let i = 0; i < runs; i++) { const r = await coldLoad({ soft, fresh }); console.log(`[cold ${soft ? 'software GL' : 'phone GPU path'}${fresh ? ', fresh device' : ''} ${i + 1}/${runs}] ${fmt(r)}`); }
})().catch(e => { console.log('FAIL:', e.message); process.exit(1); });
