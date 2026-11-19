// ── HOUSE TYPE TILES IN 3D (welcome, onboarding chunk 2) ──
// Owner, 12 Nov 2026: "Make the icons for the house type in the app minuture 3D models of our exisiting models that we use in the house
// builder that can be rotated with the same viewport background." 15 Nov: "Go with the 3D house tiles. happy with icons".
// The six tiles keep their slate still (hbtPaint) and stay plain buttons: wPickHouse is untouched. The 3D is an extra layer on top:
//   - the six houses are the House builder's own clean models, built in a worker (the quick ones first, the manor last) and drawn by ONE
//     HB3D.TileHouses canvas over the grid, a scissored viewport per tile (phones cap WebGL contexts);
//   - the canvas is handed to a second worker (OffscreenCanvas), so the WebGL context, the shader compile and every frame stay off the
//     page's main thread: at phone-class load, doing them on the page blocked the welcome for 200 to 340 ms (stress-doctor, 15 Nov 2026);
//   - it starts on its own only when the welcome is the screen in front (not under the sign-in card), the tiles are in view, the page is
//     idle and the three.js warm-up is done. A browser without OffscreenCanvas keeps the slates until the first touch or focus on a tile,
//     then goes live on the page (the brief's "stills that go live on touch");
//   - each tile shows its slate until its own first frame; no WebGL, a software GPU, a low-end phone or any failure keeps the slates;
//   - a sideways drag or swipe turns that tile's model (it does not pick the tile; a tap still does); vertical moves are left to the page
//     (touch-action pan-y), so the page never scrolls sideways and vertical scrolling is never trapped;
//   - Left and Right turn the focused model, Up and Down tilt it; the picked tile turns slowly on its own (the other five hold still: six
//     spinning tiles kept the GPU busy enough to slow taps at phone-class load), none with reduced motion;
//   - it stops when the tiles leave the view or the tab is hidden, and is freed when the welcome closes;
//   - while the tiles are live the sign-in house behind the welcome holds still (viSigninScene, auth.js): the two scenes together cost a
//     third of the frame rate at phone-class load; it turns again when the tiles leave the view.
var _wt3 = null, _wt3State = '', _wt3InView = false, _wt3Poll = 0, _wt3Wk = null, _wt3Drag = null, _wt3NoClick = false, _wt3Mode = '';
var WT3_BUILD = ['terraced', 'semi', 'detached', 'flat', 'apartment', 'mansion'];   // build order: the quick ones first, the manor (60,000 parts) last
var _wt3Stats = {};   // main-thread cost of starting the tiles (tests, stress runs)
function _wt3Host() { return document.getElementById('w-htypes'); }
function _wt3Surface() {   // 'login' (sign-in on top), 'welcome' (the onboarding is in front) or '' (closed)
  if (typeof _ahSurface === 'function') return _ahSurface();
  var wo = document.getElementById('welcome-overlay'); return wo && getComputedStyle(wo).display !== 'none' ? 'welcome' : '';
}
function _wt3Forced() { return !!window.VI_TILES3D; }
function _wt3LowEnd() {
  if (_wt3Forced()) return false;
  var n = navigator, c = n.connection || {};
  return !!(c.saveData || (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory < 2) || /[?&]tiles3d=0/.test(location.search));
}
function _wt3Day() { return document.documentElement.getAttribute('data-theme') === 'light'; }
function _wt3Reduced() { try { return (document.body && document.body.classList.contains('reduced-motion')) || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
function _wt3Offscreen() { return typeof OffscreenCanvas !== 'undefined' && typeof HTMLCanvasElement !== 'undefined' && !!HTMLCanvasElement.prototype.transferControlToOffscreen && typeof Worker !== 'undefined'; }
function viTiles3DLive() { return !!(_wt3 && _wt3.on && document.querySelector('#w-htypes .w-ht.live')); }   // auth.js reads it
function _wt3Signin() { try { if (typeof viSigninScene === 'function') viSigninScene(); } catch (e) {} }
function viTiles3DCheck() {
  var g = _wt3Host(); if (!g) return;
  var sf = _wt3Surface();
  if (_wt3) {
    if (!sf) { _wt3Off(''); return; }   // the welcome closed: free the GPU (a later welcome may start it again)
    var on = sf === 'welcome' && _wt3InView && !document.hidden;
    if (on !== _wt3.on) { _wt3.on = on; _wt3.send(on ? 'start' : 'stop'); }
    _wt3Signin();
    return;
  }
  clearTimeout(_wt3Poll); _wt3Poll = 0;
  if (_wt3State === 'off' || _wt3State === 'wait' || _wt3State === 'touch') return;
  if (!sf) return;   // closed: the overlay observer brings us back
  if (sf !== 'welcome' || !_wt3InView || document.hidden) { _wt3Poll = setTimeout(viTiles3DCheck, 1000); return; }   // sign-in on top, or the tiles out of view: look again in a second (cheap)
  if (typeof HB3D === 'undefined' || !HB3D.TileHouses || !HB3D.houseGLData || typeof Worker === 'undefined' || !document.getElementById('hb3d-engine') || _wt3LowEnd()) { _wt3State = 'off'; return; }
  if (!_wt3Offscreen() || window.VI_TILES3D_NOOFF) { _wt3State = 'touch'; return; }   // no OffscreenCanvas: stills until a touch or focus on a tile
  _wt3State = 'wait';
  var t0 = performance.now();
  var go = function () {   // after the app's three.js warm-up (v3Warm, one shader at a time) if it is running, so the two never compete for the GPU (6 s at most)
    if (typeof V3 !== 'undefined' && V3 && V3._warm && !V3._warmed && performance.now() - t0 < 6000) { setTimeout(go, 250); return; }
    try { _wt3Start('worker'); } catch (e) { _wt3Off('off'); }
  };
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 400);
}
function _wt3Off(st) {
  var t = _wt3; _wt3 = null; _wt3State = st; _wt3Mode = '';
  if (_wt3Wk) { try { _wt3Wk.terminate(); } catch (e) {} _wt3Wk = null; }
  if (t) { try { t.dispose(); } catch (e) {} }
  document.querySelectorAll('#w-htypes .w-ht.live').forEach(function (b) { b.classList.remove('live'); });
  _wt3Drag = null; _wt3Signin();
}
function _wt3Measure() {   // the grid and each icon box, in CSS pixels relative to the grid (layout read only here: start, resize, theme)
  var g = _wt3Host(); if (!g || !_wt3) return;
  var r = g.getBoundingClientRect(), rects = {};
  g.querySelectorAll('.w-ht').forEach(function (b) { var i = b.querySelector('.ico'); if (!i) return; var q = i.getBoundingClientRect(); rects[b.dataset.type] = { x: q.left - r.left, y: q.top - r.top, w: q.width, h: q.height }; });
  // the icon boxes are circles (owner, 19 Nov): the one canvas shows only inside them, so no roof or chimney pokes past a circle's edge
  var mk = Object.keys(rects).map(function (k) { var q = rects[k], rr = Math.min(q.w, q.h) / 2; return 'radial-gradient(circle ' + rr.toFixed(1) + 'px at ' + (q.x + q.w / 2).toFixed(1) + 'px ' + (q.y + q.h / 2).toFixed(1) + 'px,#000 ' + Math.max(0, rr - 1).toFixed(1) + 'px,transparent ' + rr.toFixed(1) + 'px)'; }).join(',');
  var cs = _wt3.cv && _wt3.cv.style; if (cs && mk) { cs.webkitMaskImage = mk; cs.maskImage = mk; cs.webkitMaskRepeat = cs.maskRepeat = 'no-repeat'; }
  Object.keys(rects).forEach(function (k) { var q = rects[k], d = Math.min(q.w, q.h) * 0.07; rects[k] = { x: q.x + d, y: q.y + d, w: q.w - 2 * d, h: q.h - 2 * d }; });   // each house drawn a little inside its circle, so its roof clears the rim
  var dpr = Math.min(window.innerWidth < 700 ? 1.5 : 2, window.devicePixelRatio || 1);
  if (r.width > 2 && r.height > 2) _wt3.send('rects', { w: Math.round(r.width), h: Math.round(r.height), dpr: dpr, rects: rects });
}
// mode 'worker': OffscreenCanvas in a worker. mode 'page': the same renderer on the page (no OffscreenCanvas; started by a touch or focus)
function _wt3Start(mode) {
  var g = _wt3Host(), eng = document.getElementById('hb3d-engine');
  if (!g || !eng) { _wt3State = 'off'; return; }
  if (mode === 'worker' && (_wt3Surface() !== 'welcome' || !_wt3InView || document.hidden)) { _wt3State = ''; viTiles3DCheck(); return; }
  var keys = [].slice.call(g.querySelectorAll('.w-ht')).map(function (b) { return b.dataset.type; });
  var t0 = performance.now();
  _wt3Stats = { mode: mode, at: t0, ctorMs: 0, loadMs: 0, firstAt: 0, allAt: 0 };
  var cv = document.createElement('canvas');
  cv.className = 'w-ht-cv'; cv.setAttribute('aria-hidden', 'true'); cv.tabIndex = -1;
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;outline:none;z-index:1';
  var opts = { keys: keys, day: _wt3Day(), reduced: _wt3Reduced(), turn: 30, keepSpin: !!window.VI_TILES3D_SPIN, forced: _wt3Forced(), spinKey: typeof _wHouse !== 'undefined' ? _wHouse : null };
  var P = { on: false, mode: mode, cv: cv, st: { yaw: {}, frames: {}, n: {}, spin: false } }, rw = null, th = null;
  if (mode === 'worker') {
    var off = cv.transferControlToOffscreen();
    var rmain = function () { HB3D.tilesWorker(self); };
    var rurl = URL.createObjectURL(new Blob([eng.textContent, '\n;(', rmain.toString(), ')();'], { type: 'text/javascript' }));
    rw = new Worker(rurl); URL.revokeObjectURL(rurl);
    rw.postMessage({ t: 'init', canvas: off, opts: opts }, [off]);
    P.send = function (t, m, tr) { var o = m || {}; o.t = t; try { rw.postMessage(o, tr || []); } catch (e) {} };
    P.dispose = function () { try { rw.postMessage({ t: 'dispose' }); } catch (e) {} setTimeout(function () { try { rw.terminate(); } catch (e) {} }, 200); if (cv.parentNode) cv.parentNode.removeChild(cv); };
    rw.onmessage = function (e) {
      var m = e.data || {}; if (_wt3 !== P) return;
      if (m.t === 'state') P.st = m.s;
      else if (m.t === 'first') first(m.k);
      else if (m.t === 'fail') { _wt3Off(m.why === 'soft' ? 'off' : 'touch'); }   // a software GPU: the slates; no WebGL in a worker: live on touch, on the page
      else if (m.t === 'lost') _wt3Off('off');
    };
    rw.onerror = function () { if (_wt3 === P) _wt3Off('touch'); };
  } else {
    try { th = new HB3D.TileHouses(cv, opts); } catch (e) { _wt3State = 'off'; return; }
    if (th.soft && !opts.forced) { try { th.dispose(); } catch (e) {} _wt3State = 'off'; return; }   // a software GPU: the slates
    P.send = function (t, m) {
      m = m || {};
      if (t === 'load') { var t1 = performance.now(); th.load(m.k, m.d); _wt3Stats.loadMs += performance.now() - t1; }
      else if (t === 'rects') th.setRects(m.w, m.h, m.dpr, m.rects);
      else if (t === 'turn') th.turn(m.k, m.dy, m.dp); else if (t === 'hold') th.hold(m.k, m.on);
      else if (t === 'start') th.start(); else if (t === 'stop') th.stop();
      else if (t === 'day') th.setDay(m.on); else if (t === 'reduced') th.setReduced(m.on); else if (t === 'spin') th.setSpin(m.k);
    };
    P.dispose = function () { try { th.dispose(); } catch (e) {} if (cv.parentNode) cv.parentNode.removeChild(cv); };
    th.onFirstFrame = function (k) { first(k); };
    th.onLost = function () { _wt3Off('off'); };
    th.onState = function () { P.st = th.state(); };
  }
  function first(k) {
    var b = g.querySelector('.w-ht[data-type="' + k + '"]'); if (b) b.classList.add('live');
    var now = performance.now(); if (!_wt3Stats.firstAt) { _wt3Stats.firstAt = now - t0; _wt3Signin(); }
    if (g.querySelectorAll('.w-ht.live').length === keys.length) { _wt3Stats.allAt = now - t0; _wt3State = 'on'; }
  }
  g.appendChild(cv);
  _wt3 = P; _wt3State = 'build'; _wt3Mode = mode;
  _wt3Stats.ctorMs = performance.now() - t0;
  _wt3Measure();
  // the six houses, built off the main thread; each is handed to the renderer as soon as it is ready (transferred, not copied)
  var main = function () {
    self.onmessage = function (e) {
      e.data.types.forEach(function (t) {
        try { var d = HB3D.houseGLData(HB3D.build(t, { detail: 'clean' })); d.key = t; self.postMessage(d, [d.data.buffer]); }
        catch (err) { self.postMessage({ key: t, error: String((err && err.message) || err) }); }
      });
      self.postMessage({ done: true });
    };
  };
  var url = URL.createObjectURL(new Blob([eng.textContent, '\n;(', main.toString(), ')();'], { type: 'text/javascript' }));
  var wk = _wt3Wk = new Worker(url); URL.revokeObjectURL(url);
  wk.onmessage = function (e) {
    var d = e.data || {};
    if (_wt3 !== P) { try { wk.terminate(); } catch (x) {} return; }
    if (d.done) { wk.terminate(); if (_wt3Wk === wk) _wt3Wk = null; return; }
    if (d.error || !d.data) return;   // that one tile keeps its slate
    try { P.send('load', { k: d.key, d: d }, [d.data.buffer]); } catch (err) { _wt3Off('off'); }
  };
  wk.onerror = function () { if (_wt3 === P) _wt3Off('off'); };
  wk.postMessage({ types: WT3_BUILD.filter(function (t) { return keys.indexOf(t) >= 0; }) });
  viTiles3DCheck();
}
function _wt3Wake() {   // a touch or focus on a tile where the 3D waits for one (no OffscreenCanvas)
  if (_wt3 || _wt3State !== 'touch' || _wt3Surface() !== 'welcome') return;
  try { _wt3Start('page'); } catch (e) { _wt3Off('off'); }
}
// turning by hand: a sideways drag or swipe on a live tile turns its model; the first 6 px decide (sideways turns, up or down is the page's)
function _wt3Key(el) { var b = el && el.closest && el.closest('#w-htypes .w-ht.live'); return b ? b.dataset.type : ''; }
(function () {
  var g = _wt3Host(); if (!g) return;
  g.addEventListener('pointerdown', function (e) {
    _wt3Wake();
    var k = _wt3Key(e.target); if (!k || !_wt3 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    _wt3Drag = { id: e.pointerId, k: k, x: e.clientX, y: e.clientY, lx: e.clientX, axis: '', el: e.target.closest('.w-ht') };
  });
  g.addEventListener('focusin', function () { _wt3Wake(); });
  g.addEventListener('pointermove', function (e) {
    var D = _wt3Drag; if (!D || D.id !== e.pointerId || !_wt3) return;
    var dx = e.clientX - D.x, dy = e.clientY - D.y;
    if (!D.axis) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { D.axis = 'x'; _wt3.send('hold', { k: D.k, on: true }); try { D.el.setPointerCapture(e.pointerId); } catch (x) {} }
      else if (Math.abs(dy) > 6) { _wt3Drag = null; return; }   // up or down: the page scrolls
      else return;
    }
    var d = (e.clientX - D.lx) * 0.01; D.lx = e.clientX;
    _wt3.send('turn', { k: D.k, dy: d }); _wt3.st.yaw[D.k] = (_wt3.st.yaw[D.k] || 0) + d;   // the page's copy of the turn follows at once
  });
  var end = function (e) {
    var D = _wt3Drag; if (!D || D.id !== e.pointerId) return;
    _wt3Drag = null; if (_wt3) _wt3.send('hold', { k: D.k, on: false });
    if (D.axis === 'x') { _wt3NoClick = true; setTimeout(function () { _wt3NoClick = false; }, 0); }   // the drag turned the model: the click that follows does not pick
  };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end); g.addEventListener('lostpointercapture', end);
  g.addEventListener('click', function (e) { if (_wt3NoClick) { _wt3NoClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
  g.addEventListener('click', function () { if (_wt3 && typeof _wHouse !== 'undefined') _wt3.send('spin', { k: _wHouse }); });   // after wPickHouse: the picked tile is the one that turns
  g.addEventListener('keydown', function (e) {
    var k = _wt3Key(e.target); if (!k || !_wt3 || e.altKey || e.ctrlKey || e.metaKey) return;
    var K = e.key, dy = 0, dp = 0;
    if (K === 'ArrowLeft') dy = -0.2; else if (K === 'ArrowRight') dy = 0.2; else if (K === 'ArrowUp') dp = 0.08; else if (K === 'ArrowDown') dp = -0.08; else return;
    _wt3.send('turn', { k: k, dy: dy, dp: dp }); _wt3.st.yaw[k] = (_wt3.st.yaw[k] || 0) + dy;
    e.preventDefault();
  });
  if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver(function (es) { _wt3InView = es[es.length - 1].isIntersecting; viTiles3DCheck(); }, { threshold: [0, 0.01] }).observe(g);
  else _wt3InView = true;
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { _wt3Measure(); }).observe(g);
  document.addEventListener('visibilitychange', function () { viTiles3DCheck(); });
  try { var wo = document.getElementById('welcome-overlay'), lo = document.getElementById('login-overlay'); [wo, lo].forEach(function (ov) { if (ov) new MutationObserver(function () { viTiles3DCheck(); }).observe(ov, { attributes: true, attributeFilter: ['style', 'class'] }); }); } catch (e) {}
  try { new MutationObserver(function () { if (_wt3) { _wt3.send('day', { on: _wt3Day() }); _wt3Measure(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) {}
  try { var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)'); if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (_wt3) _wt3.send('reduced', { on: _wt3Reduced() }); }); } catch (e) {}
  window.addEventListener('load', function () { setTimeout(viTiles3DCheck, 0); });
})();
// tests and stress runs read this; nothing in the app depends on it
window.viTiles3D = {
  info: function () {
    var g = _wt3Host(), s = _wt3 ? _wt3.st : null, o = { state: _wt3State, mode: _wt3Mode, canvases: g ? g.querySelectorAll('canvas').length : 0, live: [], yaw: {}, n: {}, frames: {}, spin: !!(s && s.spin), stats: _wt3Stats };
    if (g) g.querySelectorAll('.w-ht.live').forEach(function (b) { o.live.push(b.dataset.type); });
    if (s) { o.yaw = Object.assign({}, s.yaw); o.n = Object.assign({}, s.n); o.frames = Object.assign({}, s.frames); }
    return o;
  }
};
