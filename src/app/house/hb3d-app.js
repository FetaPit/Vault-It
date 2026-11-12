// ═══════════════════════════════════════════════════════════════
// HOUSE BUILDER 3D — app integration (engine: HB3D in <head>). Falls back to the SVG engine silently.
// ═══════════════════════════════════════════════════════════════
var HB3DAPP = { viewer: null, key: '', models: {}, order: [], want: null, lastP: null, lastMode: null, idle: {} };
// Feature flags: ?<name>=new turns one on for this visit (?<name>=old turns it off), localStorage 'vi-flag-<name>' = '1' keeps it on.
var VI_FLAG_DEFAULT = { nw: true };   // nw: 3D net worth on. The house builder has no flag: the brand build is the only one (owner, 31 Oct / 1 Nov 2026)
function viFlag(name) {
  // ?x=new (or Settings) puts this device on the new view; ?x=old puts it on the classic one. Without either, the default above applies.
  try { var q = new URLSearchParams(location.search).get(name);
    if (q === 'new') { viFlagSet(name, true); return true; } if (q === 'old' || q === '0') { viFlagSet(name, false); return false; }
    var v = localStorage.getItem('vi-flag-' + name); return v == null ? !!VI_FLAG_DEFAULT[name] : v !== '0'; } catch (e) { return !!VI_FLAG_DEFAULT[name]; }
}
function viFlagSet(name, on) { try { localStorage.setItem('vi-flag-' + name, on ? '1' : '0'); } catch (e) {} }
// ═══════════════════════════════════════════════════════════════
// ?perf=1 — ON-DEVICE PERFORMANCE OVERLAY (v0.7 final round). Off unless the URL has perf=1 (kept in localStorage 'vi-perf' until ?perf=0).
// Page level only: it samples the viewer through HB3D.perf.frame (one call per drawn frame), a longtask observer and timing marks here.
// ═══════════════════════════════════════════════════════════════
(function () {
  var on = false;
  try { var q = new URLSearchParams(location.search).get('perf');
    if (q === '1') { localStorage.setItem('vi-perf', '1'); on = true; } else if (q === '0') { localStorage.removeItem('vi-perf'); } else on = localStorage.getItem('vi-perf') === '1'; } catch (e) { on = /[?&]perf=1/.test(location.search); }
  if (!on) return;
  var S = { frames: 0, dts: [], orbit: [], draws: [], over33: 0, longN: 0, longMax: 0, last: 0, tabAt: null, firstFrameMs: null, build: null, lay: null, dragging: false, v: null };
  var MAXN = 400;
  var S3 = { name: null, dts: [], over33: 0, last: 0, frames: 0 };   // the coin and metals stages (v0.8, owner 2 Nov: the overlay named the house while on Cash and savings)
  function pct(a, q) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }
  function f1(x) { return x == null ? '-' : (Math.round(x * 10) / 10).toString(); }
  function glInfo(v) {
    try { var gl = v.renderer.getContext(), v2 = (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext), x = gl.getExtension('WEBGL_debug_renderer_info');
      return (v2 ? 'WebGL2' : 'WebGL1') + (x ? ' · ' + gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : ''); } catch (e) { return 'n/a'; }
  }
  function snapshot() {
    var v = S.v || window.HB3DAPP && HB3DAPP.viewer, now = performance.now(), n1 = 0, i;
    for (i = S.draws.length - 1; i >= 0 && now - S.draws[i] <= 1000; i--) n1++;
    var info = null; try { info = v && v.brandInfo ? v.brandInfo() : null; } catch (e) {}
    var cv = v && v.renderer ? v.renderer.domElement : null, mem = performance.memory;
    var sm = window.HB3DAPP && HB3DAPP.want || {};
    return { frames: S.frames, fps: n1, p50: pct(S.dts, 0.5), p95: pct(S.dts, 0.95), max: S.dts.length ? Math.max.apply(null, S.dts) : null, over33: S.over33,
      longN: S.longN, longMax: S.longMax, heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null, dpr: v && v.renderer ? v.renderer.getPixelRatio() : window.devicePixelRatio,
      canvas: cv ? cv.width + 'x' + cv.height : null, gl: v && v.renderer ? glInfo(v) : null, bricks: v && v.model ? v.model.counts.bricks : null, bricksTotal: info ? info.bricksTotal : null,
      engine: v ? (v.engine === 'house_gl' ? 'house_gl · one instanced draw' + (v._bCalm ? ' · at rest' : ' · live') : 'three.js r' + (window.THREE ? THREE.REVISION : '?') + (v.brand ? ' · brand shaders' : ' · standard') + (v._bLite ? ' · lite' : (v._bCalm ? ' · at rest' : ' · full'))) : 'not started',
      firstFrameMs: S.firstFrameMs, buildMs: S.build, layMs: S.lay, orbitP95: pct(S.orbit, 0.95), orbitN: S.orbit.length, type: sm.type || (window.state && state.houseType) || null,
      viewport: S3.last > S.last ? S3.name : 'house builder', stageFrames: S3.frames, stageP50: pct(S3.dts, 0.5), stageP95: pct(S3.dts, 0.95), stageOver33: S3.over33, stageCalls: S3.calls == null ? null : S3.calls, stageTris: S3.tris == null ? null : S3.tris };
  }
  function lines(k) {
    var st = k.viewport && k.viewport !== 'house builder' ? ['viewport ' + k.viewport + (/^Item 3D/.test(k.viewport) ? ' (three.js, lit)' : ' (three.js, matcap)') + ' · stage frames ' + k.stageFrames + ' · p50 ' + f1(k.stageP50) + ' · p95 ' + f1(k.stageP95) + ' ms · >33 ms: ' + k.stageOver33 + (k.stageCalls == null ? '' : ' · draws ' + k.stageCalls + ' · triangles ' + Number(k.stageTris).toLocaleString('en-GB')), 'house figures below are from its last visit'] : ['viewport house builder'];
    return st.concat(['fps ' + k.fps + '   frames ' + k.frames, 'frame ms p50 ' + f1(k.p50) + ' · p95 ' + f1(k.p95) + ' · max ' + f1(k.max), 'frames >33 ms: ' + k.over33,
      'long tasks ' + k.longN + ' · worst ' + f1(k.longMax) + ' ms', 'JS heap ' + (k.heapMB == null ? 'n/a' : k.heapMB + ' MB'),
      'DPR ' + f1(k.dpr) + ' · canvas ' + (k.canvas || '-'), 'renderer ' + (k.gl || '-'), 'bricks ' + (k.bricks == null ? '-' : k.bricks) + (k.bricksTotal ? ' (' + k.bricksTotal + ' UK)' : ''),
      'engine ' + k.engine, 'first 3D frame ' + (k.firstFrameMs == null ? 'waiting' : f1(k.firstFrameMs) + ' ms from House tab'), 'build ' + f1(k.buildMs) + ' ms · lay ' + f1(k.layMs) + ' ms',
      'orbit p95 ' + f1(k.orbitP95) + ' ms (' + k.orbitN + ' frames)']);
  }
  function report() {
    var k = snapshot();
    return ['Vault-It performance report', 'date ' + new Date().toISOString(), 'userAgent ' + navigator.userAgent, 'viewport ' + innerWidth + 'x' + innerHeight, 'devicePixelRatio ' + window.devicePixelRatio, 'house type ' + (k.type || '-'), ''].concat(lines(k)).join('\n');
  }
  window.VIPERF = { snapshot: snapshot, report: report,
    stageFrame: function (name, calls, tris) { var t = performance.now(); if (S3.name !== name) { S3.name = name; S3.dts = []; S3.over33 = 0; S3.frames = 0; S3.last = 0; } S3.frames++; S3.calls = calls; S3.tris = tris;   // v0.9.2: the stage's draws and triangles, so the owner can read them on his phone
      if (S3.last) { var dt = t - S3.last; if (dt < 1000) { S3.dts.push(dt); if (S3.dts.length > MAXN) S3.dts.shift(); if (dt > 33) S3.over33++; } } S3.last = t; },
    mark: function (n) { if (n === 'tab') { S.tabAt = performance.now(); S.firstFrameMs = null; } },
    phase: function (n, ms) { S[n] = ms; } };
  // the engine calls this once per drawn frame
  var wait = setInterval(function () { if (window.HB3D) { clearInterval(wait); HB3D.perf = { frame: function (v) {
    var t = performance.now(); S.v = v; S.frames++; S.draws.push(t); if (S.draws.length > 200) S.draws.shift();
    if (S.firstFrameMs == null) S.firstFrameMs = t - (S.tabAt == null ? 0 : S.tabAt);
    if (S.last) { var dt = t - S.last; if (dt < 1000) { S.dts.push(dt); if (S.dts.length > MAXN) S.dts.shift(); if (dt > 33) S.over33++; if (S.dragging) { S.orbit.push(dt); if (S.orbit.length > MAXN) S.orbit.shift(); } } }
    S.last = t; } }; } }, 30);
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { S.longN++; if (e.duration > S.longMax) S.longMax = e.duration; }); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  document.addEventListener('pointerdown', function (e) { if (e.target && e.target.closest && e.target.closest('#house-scene')) { S.dragging = true; S.last = 0; } }, true);
  ['pointerup', 'pointercancel'].forEach(function (n) { document.addEventListener(n, function () { S.dragging = false; S.last = 0; }, true); });
  function mount() {
    var el = document.createElement('div'); el.id = 'vi-perf';
    el.style.cssText = 'position:fixed;right:4px;top:4px;z-index:10002;width:226px;max-width:calc(100vw - 8px);background:rgba(8,14,16,.88);color:#cfe;font:max(10px,var(--vi-fs-1))/1.35 "Share Tech Mono",monospace;border:1px solid #2a8f8a;border-radius:6px;padding:5px 6px;pointer-events:none;';
    el.innerHTML = '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font:inherit"></pre><div style="margin-top:4px;display:flex;gap:6px"><button data-act="copy" style="pointer-events:auto;font:inherit;padding:3px 8px;background:#123734;color:#cfe;border:1px solid #2a8f8a;border-radius:4px">Copy report</button><button data-act="min" style="pointer-events:auto;font:inherit;padding:3px 8px;background:#123734;color:#cfe;border:1px solid #2a8f8a;border-radius:4px">Hide</button></div>';
    document.body.appendChild(el);
    var pre = el.firstChild, min = false;
    function tick() { if (!min) pre.textContent = lines(snapshot()).join('\n'); }
    setInterval(tick, 500); tick();
    el.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-act'); if (!a) return;
      if (a === 'min') { min = !min; pre.style.display = min ? 'none' : ''; ev.target.textContent = min ? 'Show' : 'Hide'; return; }
      var txt = report(), old = el.querySelector('textarea'); if (old) old.remove();
      function fallback() { var ta = document.createElement('textarea'); ta.readOnly = true; ta.value = txt; ta.rows = 6; ta.style.cssText = 'display:block;width:100%;margin-top:4px;font:inherit;pointer-events:auto;box-sizing:border-box'; el.appendChild(ta); ta.focus(); ta.select(); }
      try { navigator.clipboard.writeText(txt).then(function () { ev.target.textContent = 'Copied'; setTimeout(function () { ev.target.textContent = 'Copy report'; }, 1500); }, fallback); } catch (e) { fallback(); }
    });
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
// The brand build (brand handover 6.2 to 6.10): the only house builder (owner, 1 Nov 2026: the old one is deleted), Levels 1 and 2.
function hbBrandOn() { return typeof HB3D !== 'undefined' && !!HB3D.brandStats; }
// 6.8 gamified feedback (brand build): pop-up, stage flash and milestone toasts. Toasts only after the person has interacted, never during the opening build.
var _hbEngaged = false, _hbMS = [[1, 'Site cleared'], [5, 'Foundations'], [10, '10%'], [25, 'Quarter'], [50, 'Halfway'], [75, 'Three-quarters'], [100, 'Deposit ready']];
function hbPop(txt) { var h = document.getElementById('hb-pops'); if (!h) return; var e = document.createElement('div'); e.className = 'pop'; e.textContent = txt; h.appendChild(e); requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 1300); }); }); }   // the 1.3 s count starts once it is drawn (two frames: a click can run inside the current frame): the house rebuild after a deposit can hold the page for over a second, and the pop used to vanish unseen
function hbFlash() { var sc = document.getElementById('house-scene'); if (!sc) return; sc.classList.remove('flash'); void sc.offsetWidth; sc.classList.add('flash'); }
function hbBrandMS(p0, p1) {
  if (!_hbEngaged) return; var hit = null;
  _hbMS.forEach(function (m) { var t = m[0] / 100; if (p0 < t - 1e-9 && p1 >= t - 1e-9) hit = m; });
  if (hit) toast(hit[0] === 100 ? 'Keys are yours.' : 'Milestone: ' + hit[0] + '% ' + hit[1]);
}
function hbBrandLaid(vBase, shown) {   // what the deposit bought, in bricks: "+£5 · +4 bricks" or "+£5 · 0.42 of a brick"
  var bi = hbBrickInfo(), nb = bi && bi.perBrick > 0 ? vBase / bi.perBrick : 0;
  return '+£' + shown + ' · ' + (nb >= 1 ? '+' + Math.round(nb) + ' brick' + (Math.round(nb) === 1 ? '' : 's') : nb.toFixed(2) + ' of a brick');
}
// brand maths for a compiled model: brick value = deposit target x 0.77 / bricks, bricks laid = floor(bricks x seg(p, 0.03, 0.80))
function hbBrandModel(m) { return !!(m && m.clean && !m.custom && m.rows && hbBrandOn()); }
function hb3dOn() {
  try {
    if (typeof HB3D === 'undefined' || !HB3D || HB3D._failed) return false;
    if (localStorage.getItem('vi_hb3d') === 'off') return false;
    if (hbGLEngine()) return HB3D.HouseGL.supported();   // v0.7: the brand-book renderer needs no three.js
    if (!HB3D.Viewer) return viThreeState() < 3 && viGlOk();   // three.js not here yet: hb3dRedraw asks for it and comes back
    return HB3D.supported();
  } catch (e) { return false; }
}
// v0.7 final round (owner, 1 Nov 2026): the house is drawn by src/hb3d/house_gl.js, the brand book's renderer. The old three.js viewer
// stays for one release behind ?house=legacy (remembered on the device until ?house=new); uploaded designs (Level 3) still need it.
function hbGLEngine() {
  try {
    if (typeof HB3D === 'undefined' || !HB3D.HouseGL) return false;
    var q = new URLSearchParams(location.search).get('house');
    if (q === 'legacy') localStorage.setItem('vi-house', 'legacy'); else if (q === 'new') localStorage.removeItem('vi-house');
    return localStorage.getItem('vi-house') !== 'legacy';
  } catch (e) { return !!(typeof HB3D !== 'undefined' && HB3D.HouseGL); }
}
var HB3D_TYPES = { terraced: 1, semi: 1, detached: 1, mansion: 1, flat: 1, apartment: 1, custom: 1 };
function hb3dType(t) { return HB3D_TYPES[t] ? t : 'terraced'; }
// a type with no 3D model yet keeps the SVG drawing (never substitute a different house)
function hb3dActive() { var el = document.getElementById('house-scene'); return hb3dOn() && !!el && el.getAttribute('data-engine') === '3d'; }
function hb3dHas(t) { if (t === 'custom') return !!HB3DAPP.customModel; return typeof HB3D !== 'undefined' && !!(HB3D.models && HB3D.models[hb3dType(t)]); }
function hb3dFloor(type, f) { var mx = type === 'flat' ? 10 : (type === 'apartment' ? 30 : 1); return Math.max(1, Math.min(mx, parseInt(f, 10) || 5)); }
function hb3dDetail() { return 'clean'; }   // the brand build draws the clean shell only
function hb3dKey(type, floor) { return type + '|' + (type === 'custom' ? (HB3DAPP.designId || '') : (type === 'flat' || type === 'apartment') ? floor : '') + '|' + hb3dDetail(); }
// compiled models are cached (small LRU) — building one takes 0.1–0.5 s
function hb3dModel(type, floor) {
  if (type === 'custom') return HB3DAPP.customModel || null;
  if (typeof HB3D === 'undefined' || !HB3D.build || !hb3dHas(type)) return null;
  type = hb3dType(type); floor = hb3dFloor(type, floor);
  var k = hb3dKey(type, floor), m = HB3DAPP.models[k];
  if (!m) {
    var _pt = window.VIPERF ? performance.now() : 0;
    m = HB3D.build(type, { floor: floor, detail: hb3dDetail() });
    if (_pt) VIPERF.phase('build', performance.now() - _pt);
    HB3DAPP.models[k] = m; HB3DAPP.order.push(k);
    if (window._hbHudWait) { window._hbHudWait = false; setTimeout(function () { try { hbRenderHUD(); hbWriteStats(); hbBrickLineUpdate(); } catch (e) {} }, 0); }   // Level 1 card was on "Counting bricks…"
    while (HB3DAPP.order.length > 8) { var old = HB3DAPP.order.shift(); if (old !== HB3DAPP.key) delete HB3DAPP.models[old]; else HB3DAPP.order.push(old); if (HB3DAPP.order.length <= 8) break; }   // room for every standard type warmed in idle time (v0.7 A2) plus a few floors
  }
  return m;
}
function hb3dModelIfReady(type, floor) { if (type === 'custom') return HB3DAPP.customModel || null; type = hb3dType(type); floor = hb3dFloor(type, floor); return HB3DAPP.models[hb3dKey(type, floor)] || null; }
// build in the background (idle time) so counts are ready without slowing the page
function hb3dIdleBuild(type, floor) {
  if (type === 'custom' || typeof HB3D === 'undefined' || !HB3D.build || !hb3dHas(type)) return;
  type = hb3dType(type); floor = hb3dFloor(type, floor);
  var k = hb3dKey(type, floor);
  if (HB3DAPP.models[k] || HB3DAPP.idle[k]) return;
  HB3DAPP.idle[k] = 1;
  var run = function () { try { hb3dModel(type, floor); delete HB3DAPP.idle[k]; hbRenderHUD(); hbWriteStats(); } catch (e) { delete HB3DAPP.idle[k]; } };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 60);
}
// v0.7 A2 (David, 2 Nov 2026): once the first house has settled, compile the other standard types one per idle slice and keep their laying
// plans, so a first switch to any type never pays the model compile at tap time (the switch is then the renderer's buffer fill alone)
function hb3dWarmTypes() {
  if (HB3DAPP.warmed || typeof HB3D === 'undefined' || !HB3D.build) return;
  var v = HB3DAPP.viewer; if (!v || !v.settled || !v.settled()) { clearTimeout(HB3DAPP.warmT); HB3DAPP.warmT = setTimeout(hb3dWarmTypes, 700); return; }
  HB3DAPP.warmed = true;
  var todo = ['terraced', 'semi', 'detached', 'flat', 'apartment', 'mansion'].filter(function (t) { return hb3dHas(t) && !hb3dModelIfReady(t, state.apartmentFloor); });
  var next = function () {
    var t = todo.shift(); if (!t) return;
    var go = function () {
      var vv = HB3DAPP.viewer;   // never while a finger is on the stage or just after: a compile would stall an orbit frame
      if (vv && (vv._drag || vv._pinch || vv._fly || performance.now() - (vv._touch || 0) < 1500)) { todo.unshift(t); setTimeout(next, 1000); return; }
      try { var m = hb3dModel(t, state.apartmentFloor); if (m && HB3D.brandPlan) HB3D.brandPlan(m); } catch (e) {}
      if (window.requestIdleCallback) requestIdleCallback(next, { timeout: 4000 }); else setTimeout(next, 250); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 250);
  };
  next();
}
// Which scene to show (mirrors the SVG redraw + hbAfterDraw precedence)
