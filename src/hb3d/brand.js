// ═══════════════════════════════════════════════════════════════
// HB3D BRAND: the brand book's build animation and hologram look on every three.js house model (Level 1 deposit build).
// Ships behind the house flag (?house=new, or localStorage vi-flag-house = 1): the app calls viewer.setBrand(true).
// With the flag off nothing here runs and the viewer behaves exactly as before.
//
// Stage schedule by deposit progress p = saved / depositTarget (brand handover 6.4):
//   0.005 to 0.03 site boundary · 0 to 0.03 footprint · 0.03 to 0.80 bricks in laying order (course by course, round the
//   ring: front, right, back, left) · 0.60 to 0.80 roof timbers · 0.80 to 0.88 roof tiles, eaves to ridge · 0.88 to 0.93
//   glazing · 0.93 to 0.96 lights on · 0.96 to 1 decorating (door turns gold) · 0.999 keys glint.
// Money to bricks (6.2): brickValue = depositTarget * 0.77 / bricksTotal, bricksLaid = floor(bricksTotal * seg(p, .03, .80)).
// Each model keeps its own brick total and row count. One course = 75 mm = one brand world unit.
// ═══════════════════════════════════════════════════════════════
(function (H) {
  'use strict';
  var CH = 0.075, SHARE = 0.77;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  H.seg = seg;
  H.BRAND = { share: SHARE, bricks: [0.03, 0.80], timbers: [0.60, 0.80], tiles: [0.80, 0.88], glaze: [0.88, 0.93], lights: [0.93, 0.96], decor: [0.96, 1], keys: 0.999 };
  H.brandBrickValue = function (depositTarget, bricksTotal) { return depositTarget * SHARE / Math.max(1, bricksTotal); };
  H.brandBricksLaid = function (bricksTotal, p) { return bricksTotal > 0 ? Math.floor(bricksTotal * seg(p, 0.03, 0.80) + 1e-6) : 0; };

  // ── parts of a house, by material (bricks and tiles by the kit's per-instance kind) ──
  var ROOF = { slate: 1, tileClay: 1, tileConcrete: 1, ridge: 1 };
  var GLAZE = { glass: 1, upvc: 1, upvcGrey: 1, upvcBlack: 1, timberPaint: 1, curtain: 1, balcony: 1, brass: 1 };
  function isDoor(mat) { return /^door/.test(mat) || mat === 'garageDoor'; }
  function partOf(m, b) {
    if (b.ghost || b.hideAfter < 2) return 'none';
    if (m.focus && !b.focus) return 'ctx';                 // flats: the rest of the block stays a faint outline
    var bricks = b.kinds && b.kinds.brick, tiles = b.kinds && b.kinds.tile;
    if (bricks && bricks >= b.count / 2) return 'brick';
    if (tiles || ROOF[b.mat]) return 'roof';
    if (b.mat === 'glass') return 'glass';
    if (isDoor(b.mat)) return 'door';
    if (GLAZE[b.mat]) return 'frame';
    if (b.mat === 'gold') return 'gold';
    return 'trim';
  }
  // half height of a part (Euler order YZX, as the viewer composes it): the y row of Ry*Rz*Rx is [sin rz, cos rz cos rx, -cos rz sin rx]
  function halfY(xf, o) {
    var rx = xf[o + 6], rz = xf[o + 8], sz = Math.sin(rz), cz = Math.cos(rz);
    return (Math.abs(sz) * Math.abs(xf[o + 3]) + Math.abs(cz * Math.cos(rx)) * Math.abs(xf[o + 4]) + Math.abs(cz * Math.sin(rx)) * Math.abs(xf[o + 5])) / 2;
  }
  function lowerBound(a, v, n) { var lo = 0, hi = n == null ? a.length : n; while (lo < hi) { var mid = (lo + hi) >> 1; if (a[mid] < v) lo = mid + 1; else hi = mid; } return lo; }
  H._lowerBound = lowerBound;

  // ── the laying plan of a compiled model (pure maths, cached on the model) ──
  // Every part gets a rank on one scale: bricks 0..N-1 (laying order), trim the order of the first brick of its course,
  // roof N..N+T-1 (tiles eaves to ridge), glazing and doors N+T. A part shows when its rank < units(p).
  H.brandPlan = function (m) {
    if (m._bp) return m._bp;
    var R = m.rows || { y0: 0, y1: Math.max(0.5, m.height), n: Math.max(1, Math.round(m.height / CH)), ch: CH };
    var bb = m.bounds, cx = (bb.min[0] + bb.max[0]) / 2, cz = (bb.min[2] + bb.max[2]) / 2, TAU = Math.PI * 2;
    var a0 = Math.atan2(bb.min[0] - cx, bb.max[2] - cz);   // the ring starts at the front left corner and runs front, right, back, left
    var ang = function (x, z) { var a = (Math.atan2(x - cx, z - cz) - a0) % TAU; return a < 0 ? a + TAU : a; };
    var parts = [], bricks = [], roof = [], rest = [];
    m.batches.forEach(function (b, bi) {
      var part = partOf(m, b); parts.push(part);
      if (part === 'ctx' || part === 'none') return;
      for (var i = 0; i < b.count; i++) {
        var o = i * 10, x = b.xf[o], y = b.xf[o + 1], z = b.xf[o + 2], hy = halfY(b.xf, o), k = b.kind ? b.kind[i] : (part === 'brick' ? 1 : 0);
        if (k === 1) bricks.push({ bi: bi, i: i, c: Math.round((y + hy - R.y0) / R.ch), a: ang(x, z), top: y + hy });
        else if (k === 2 || part === 'roof') roof.push({ bi: bi, i: i, y: y, a: ang(x, z), tile: k === 2, top: y + hy });
        else rest.push({ bi: bi, i: i, part: part, bot: y - hy, x: x, y: y, z: z, sz: Math.abs(b.xf[o + 5]) });
      }
    });
    bricks.sort(function (p, q) { return p.c - q.c || p.a - q.a || p.bi - q.bi || p.i - q.i; });
    var N = bricks.length, course = new Int32Array(N), top = new Float32Array(N), bBi = new Int32Array(N), bI = new Int32Array(N);
    bricks.forEach(function (r, j) { course[j] = r.c; top[j] = r.top; bBi[j] = r.bi; bI[j] = r.i; });
    var tiles = roof.filter(function (r) { return r.tile; }).sort(function (p, q) { return p.y - q.y || p.a - q.a || p.bi - q.bi || p.i - q.i; });
    var T = tiles.length, tileY = new Float32Array(T), tileTop = new Float32Array(T);
    tiles.forEach(function (r, o) { tileY[o] = r.y; tileTop[o] = r.top; });
    var rank = m.batches.map(function (b) { return new Float64Array(b.count).fill(-1e9); });
    bricks.forEach(function (r, j) { rank[r.bi][r.i] = j; });
    tiles.forEach(function (r, o) { rank[r.bi][r.i] = N + o; });
    roof.forEach(function (r) { if (!r.tile) rank[r.bi][r.i] = T ? N + Math.min(T - 1, lowerBound(tileY, r.y + 1e-6)) : Math.max(0, N - 1); });
    var c0 = N ? course[0] : 0, doorPts = [];
    rest.forEach(function (r) {
      if (r.part === 'glass' || r.part === 'frame' || r.part === 'door') { rank[r.bi][r.i] = N + T; if (r.part === 'door') doorPts.push(r); return; }
      var cb = Math.round((r.bot - R.y0) / R.ch) + 1;     // the course this part sits in
      rank[r.bi][r.i] = !N || cb < c0 ? -1 : Math.min(N - 1, lowerBound(course, cb));   // shows with the first brick of its course
    });
    // each batch sorted by rank, so what shows is always a prefix of the instances
    var perm = rank.map(function (rk) { var ix = []; for (var i = 0; i < rk.length; i++) ix.push(i); ix.sort(function (p, q) { return rk[p] - rk[q] || p - q; }); return Int32Array.from(ix); });
    var sorted = rank.map(function (rk, bi) { var pm = perm[bi], out = new Float64Array(rk.length); for (var k = 0; k < pm.length; k++) out[k] = rk[pm[k]]; return out; });
    var inv = perm.map(function (pm) { var v = new Int32Array(pm.length); for (var k = 0; k < pm.length; k++) v[pm[k]] = k; return v; });
    var bK = new Int32Array(N); for (var j = 0; j < N; j++) bK[j] = inv[bBi[j]][bI[j]];
    // the front door (for the keys glint): door leaves on the front-most face
    var door = null;
    if (doorPts.length) {
      var zmax = -1e9; doorPts.forEach(function (d) { zmax = Math.max(zmax, d.z); });
      var dd = doorPts.filter(function (d) { return d.z > zmax - 0.3; }), sx = 0, sy = 0;
      dd.forEach(function (d) { sx += d.x; sy += d.y; });
      door = [sx / dd.length + 0.18, sy / dd.length, zmax + 0.05];
    }
    m._bp = { N: N, T: T, rows: R, course: course, top: top, bBi: bBi, bK: bK, tileTop: tileTop, parts: parts, perm: perm, rank: sorted, door: door, cx: cx, cz: cz };
    return m._bp;
  };
  // progress → how many ranks are released
  function units(P, p) {
    if (p <= 0) return -1;
    if (p < 0.03) return -0.5;                                 // foundations: parts below the first course
    if (p <= 0.80) return H.brandBricksLaid(P.N, p);
    if (p >= 0.88) return P.N + P.T + 1;
    return P.N + Math.floor(P.T * seg(p, 0.80, 0.88) + 1e-6);
  }
  H.brandUnits = units;
  function stageName(P, p, row) {
    if (p <= 0) return 'Your plot';
    if (p < 0.03) return p < 0.005 ? 'Site cleared' : 'Foundations';
    if (p <= 0.80) return 'Row ' + row + ' of ' + P.rows.n;
    if (p < 0.88) return P.T ? 'Roof tiles' : 'Fitting out';
    if (p < 0.93) return 'Glazing';
    if (p < 0.96) return 'Lights on';
    return p >= 0.999 ? 'Keys are yours' : 'Decorating';
  }
  // what the deposit has built at progress p (the HUD, the caption and the 3D scene all read this)
  H.brandStats = function (m, p) {
    var P = H.brandPlan(m), R = P.rows, N = P.N, T = P.T;
    p = clamp(p || 0, 0, 1);
    var L = H.brandBricksLaid(N, p), TL = p <= 0.80 ? 0 : (p >= 0.88 ? T : Math.floor(T * seg(p, 0.80, 0.88) + 1e-6));
    var row = L > 0 ? clamp(P.course[L - 1], 1, R.n) : 0, y = L > 0 ? P.top[L - 1] : R.y0 + 0.02;
    if (TL > 0) { var tr = clamp(Math.round((P.tileTop[TL - 1] - R.y0) / R.ch), 1, R.n); if (tr > row) { row = tr; y = Math.max(y, P.tileTop[TL - 1]); } }
    if (p >= 0.88 && N) { row = R.n; y = Math.max(y, R.y1); }   // shell complete: every course of the house is there
    // bricks in the course being laid, and how many of them are still to lay
    var cur = L > 0 && L < N ? P.course[L] : (L === 0 && N ? P.course[0] : -1), first = cur >= 0 ? H._lowerBound(P.course, cur) : N, next = cur >= 0 ? H._lowerBound(P.course, cur + 1) : N;
    return { bricksLaid: L, bricksTotal: N, tilesLaid: TL, tilesTotal: T, row: row, rows: R.n, y: y, p: p,
      rowBricks: next - first, rowLeft: Math.max(0, next - Math.max(L, first)), bricksDone: L >= N && N > 0,
      stage: stageName(P, p, row), keys: p >= 0.999 };
  };

  if (!H.Viewer || typeof THREE === 'undefined') return;
  var VP = H.Viewer.prototype;

  // ── Night palette (brand engine THG.dark). The 3D viewports keep the Night look in Daylight too (owner, 30 Oct). ──
  var C = { brick: [0.267, 0.753, 0.725], trim: [0.46, 0.84, 0.80], tile: [0.2, 0.62, 0.74], frame: [0.78, 0.93, 0.92], glass: [0.02, 0.2, 0.22], glassLit: [0.96, 0.78, 0.42],
    door: [0.04, 0.24, 0.26], edge: [0.01, 0.1, 0.1], sheen: [0.75, 0.98, 0.96], flash: [0.91, 0.77, 0.42], shMin: 0.5, edgeK: 0.62, front: 0.88, back: 0.09 };
  var TEAL = [68 / 255, 192 / 255, 185 / 255], GOLD = [232 / 255, 197 / 255, 106 / 255], RAFTER = [120 / 255, 230 / 255, 222 / 255];
  function reduced() {
    try { return (document.body && document.body.classList.contains('reduced-motion')) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  H.brandReduced = reduced;
  function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }

  // per-brick shader: drop in (0.38 s, e^3), fade in, gold flash (1.1 s), mortar bevel, pulse, sweep band
  var VS = [
    'attribute float aLaid;',
    'uniform float uNow; uniform float uDrop; uniform float uFlashOn; uniform float uFade;',
    'varying vec3 vN; varying vec3 vW; varying vec2 vUV; varying vec2 vFS; varying float vFlash; varying float vAlpha; varying float vSeed;',
    'void main() {',
    '  mat4 im = mat4(1.0);',
    '  #ifdef USE_INSTANCING',
    '  im = instanceMatrix;',
    '  #endif',
    '  float vis = 1.0; float drop = 0.0; vFlash = 0.0;',
    '  #ifndef BRAND_LAST',
    '  float age = uNow - aLaid;',
    '  if (aLaid > 1.0e8 || age < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',
    '  float d = clamp(age / 0.38, 0.0, 1.0); vis = smoothstep(0.0, 0.5, d); float e = 1.0 - d; drop = e * e * e * uDrop;',
    '  vFlash = uFlashOn * (1.0 - clamp(age / 1.1, 0.0, 1.0));',
    '  #endif',
    '  vec4 wp = modelMatrix * im * vec4(position, 1.0); wp.y += drop;',
    '  vN = normalize(mat3(modelMatrix) * mat3(im) * normal);',
    '  vec3 sc = vec3(length(im[0].xyz), length(im[1].xyz), length(im[2].xyz)); vec3 an = abs(normal);',
    '  vFS = an.x > 0.5 ? sc.zy : (an.y > 0.5 ? sc.xz : sc.xy);',
    '  vUV = uv; vW = wp.xyz; vAlpha = vis * uFade;',
    '  vec3 io = (modelMatrix * im * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
    '  vSeed = fract(sin(dot(io.xz + vec2(io.y * 1.3, io.x * 0.7), vec2(12.9898, 78.233))) * 43758.5453);',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}'].join('\n');
  var FS = [
    'uniform vec3 uBase; uniform vec3 uLitCol; uniform float uLit; uniform vec3 uEdge; uniform vec3 uSheen; uniform vec3 uFlashCol;',
    'uniform float uShMin; uniform float uEdgeK; uniform float uPulse; uniform float uBuilt; uniform float uSweep; uniform float uSweepOn; uniform float uSweepW;',
    'uniform float uBack; uniform float uFrontA; uniform float uBackA; uniform float uTone; uniform float uBevel;',
    'varying vec3 vN; varying vec3 vW; varying vec2 vUV; varying vec2 vFS; varying float vFlash; varying float vAlpha; varying float vSeed;',
    'void main() {',
    '  vec3 L = normalize(vec3(-0.45, 0.7, 0.55)); float lt = max(0.0, dot(normalize(vN), L)); float sh = uShMin + (1.0 - uShMin) * lt;',
    '  vec3 base = mix(uBase * (1.0 - uTone + 2.0 * uTone * vSeed), uLitCol, uLit);',
    '  vec3 col = base * sh;',
    '  vec2 dd = min(vUV, 1.0 - vUV) * vFS; float ed = min(dd.x, dd.y); float bev = smoothstep(0.0, uBevel, ed);',
    '  col = mix(col, uEdge * (0.6 + 0.4 * sh), (1.0 - bev) * uEdgeK);',
    '  float fl = clamp(vFlash, 0.0, 1.0); col = mix(col, uFlashCol, fl * 0.9);',
    '  float a;',
    '  #ifdef BRAND_LAST',
    '  col = mix(col, vec3(1.0, 0.94, 0.64), 0.88) * (1.08 + 0.3 * uPulse); a = 1.0;',
    '  #else',
    '  col *= 0.95 + 0.1 * uPulse;',
    '  float s = 1.0 - clamp(abs(vW.y - uSweep) / uSweepW, 0.0, 1.0); col = mix(col, uSheen, s * 0.5 * uSweepOn);',
    '  a = uBack > 0.5 ? uBackA * vAlpha : (uFrontA + 0.06 * uPulse * uBuilt + 0.2 * fl) * vAlpha;',
    '  #endif',
    '  gl_FragColor = vec4(col * a, a);',
    '}'].join('\n');

  function shared() {   // uniforms every brand material reads (one object each, shared by reference)
    return { uNow: { value: 0 }, uPulse: { value: 0.5 }, uBuilt: { value: 0 }, uSweep: { value: -1e3 }, uSweepOn: { value: 0 }, uSweepW: { value: 6 * CH },
      uFadeGlaze: { value: 0 }, uLitGlass: { value: 0 }, uLitDoor: { value: 0 }, one: { value: 1 }, zero: { value: 0 } };
  }
  function brandMat(U, look, back, last) {
    var u = {
      uNow: U.uNow, uPulse: U.uPulse, uBuilt: U.uBuilt, uSweep: U.uSweep, uSweepOn: U.uSweepOn, uSweepW: U.uSweepW,
      uBase: { value: v3(look.base) }, uLitCol: { value: v3(look.lit || look.base) }, uLit: look.litU || U.zero,
      uEdge: { value: v3(C.edge) }, uSheen: { value: v3(C.sheen) }, uFlashCol: { value: v3(C.flash) },
      uShMin: { value: C.shMin }, uEdgeK: { value: look.edgeK == null ? C.edgeK : look.edgeK }, uBevel: { value: look.bevel || 0.012 },
      uBack: { value: back ? 1 : 0 }, uFrontA: { value: look.front == null ? C.front : look.front }, uBackA: { value: C.back }, uTone: { value: look.tone || 0 },
      uDrop: { value: look.drop || 0 }, uFlashOn: { value: look.flash || 0 }, uFade: look.fadeU || U.one
    };
    var mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: true, premultipliedAlpha: true,
      depthWrite: !back, depthTest: !back, side: back ? THREE.BackSide : THREE.FrontSide });
    if (last) mat.defines = { BRAND_LAST: '' };
    return mat;
  }
  function lookOf(part, U) {
    switch (part) {
      case 'brick': return { base: C.brick, tone: 0.1, drop: 6 * CH, flash: 1, bevel: 0.014 };
      case 'roof': return { base: C.tile, tone: 0.06, drop: 5 * CH, flash: 0.5, bevel: 0.01 };
      case 'glass': return { base: C.glass, lit: C.glassLit, litU: U.uLitGlass, fadeU: U.uFadeGlaze, front: 0.8, edgeK: 0 };
      case 'door': return { base: C.door, lit: C.flash, litU: U.uLitDoor, fadeU: U.uFadeGlaze, edgeK: 0.3 };
      case 'frame': return { base: C.frame, fadeU: U.uFadeGlaze, edgeK: 0.2 };
      case 'gold': return { base: C.flash, edgeK: 0.2 };
      default: return { base: C.trim, edgeK: 0.35, bevel: 0.01 };
    }
  }
  // soft radial gradients drawn in the shader (no canvas textures: uploading a 2D canvas stalls software GL)
  function stageBgMesh() {   // --stage-bg (Night): radial-gradient(120% 90% at 50% 100%, #06242A 0%, #00131A 45%, #080808 100%)
    var mat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }',
      fragmentShader: ['varying vec2 vUv;',
        'void main() { float d = length((vUv - vec2(0.5, 0.0)) / vec2(1.2, 0.9));',
        '  vec3 c0 = vec3(0.0235, 0.1412, 0.1647), c1 = vec3(0.0, 0.0745, 0.1020), c2 = vec3(0.0314);',
        '  vec3 c = d < 0.45 ? mix(c0, c1, d / 0.45) : mix(c1, c2, clamp((d - 0.45) / 0.55, 0.0, 1.0));',
        '  gl_FragColor = vec4(c, 1.0); }'].join('\n') });
    var q = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), mat); q.frustumCulled = false; q.renderOrder = -10;
    return q;
  }
  function glowMesh(size) {   // teal 24% at the centre, 7% at 60%, nothing at the edge
    var mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, premultipliedAlpha: true,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: ['varying vec2 vUv;',
        'void main() { float d = length(vUv - 0.5) * 2.0; float a = d < 0.6 ? mix(0.24, 0.072, d / 0.6) : mix(0.072, 0.0, clamp((d - 0.6) / 0.4, 0.0, 1.0));',
        '  gl_FragColor = vec4(vec3(0.2667, 0.7529, 0.7255) * a, a); }'].join('\n') });
    return new THREE.Mesh(new THREE.PlaneBufferGeometry(size, size), mat);
  }
  function lineMat(rgb, a, dashed) {
    var o = { color: new THREE.Color(rgb[0], rgb[1], rgb[2]), transparent: true, opacity: a, depthWrite: false, fog: false, toneMapped: false };
    var m = dashed ? new THREE.LineDashedMaterial(Object.assign(o, { dashSize: 0.6, gapSize: 0.45 })) : new THREE.LineBasicMaterial(o);
    return m;
  }
  function rectPts(x0, z0, x1, z1, y) { return [x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0]; }
  function segs(pts, mat) { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return new THREE.LineSegments(g, mat); }

  VP.setBrand = function (on) {
    on = !!on;
    if (on === !!this.brand) return;
    this.brand = on; this._bPrimed = false;
    if (this.model) try { this.fit(); } catch (e) {}   // the brand framing is closer, so re-frame when the look changes
    var self = this, w = this.el.clientWidth, h = this.el.clientHeight;
    if (w > 2 && h > 2) { this.renderer.setPixelRatio(this._dprFor(w, h)); this.renderer.setSize(w, h, false); }
    if (on && !this._bHooked) {   // once per viewer: visibility, and auto orbit that yields to the user
      this._bHooked = true; this._bVis = true;
      if (typeof IntersectionObserver !== 'undefined') {
        this._bIO = new IntersectionObserver(function (es) { self._bVis = es[es.length - 1].isIntersecting; if (self._bVis) self.wake(); }, { threshold: 0.01 });
        this._bIO.observe(this.el);
      }
      this.controls.addEventListener('start', function () { self._bTouch = performance.now(); self._bDrag = true; if (self.brand) self.controls.autoRotate = false; });
      this.controls.addEventListener('end', function () { self._bTouch = performance.now(); self._bDrag = false; });
    }
    this.apply();
  };
  VP._brandActive = function () {
    var m = this.model;
    return !!(this.brand && m && m.clean && !m.custom && m.rows && m.batches && (this.mode === 'build' || this.mode === 'site'));
  };
  VP._bNow = function () { if (!this._bT0) this._bT0 = performance.now(); return (performance.now() - this._bT0) / 1000; };

  VP._brandClear = function () {
    var g = this._bGroup;
    if (g) {
      if (g.parent) g.parent.remove(g);
      g.traverse(function (o) { if (o.geometry && o.geometry !== H._geoms().box) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    this._bGroup = null; this._bm = null; this._bModel = null; this._bInfo = null; this._bV = null; this._bPrimed = false; this._bLastJ = -1;
  };

  // build the brand meshes and environment for the current model (once per model)
  VP._brandBuild = function () {
    this._brandClear();
    var self = this, m = this.model, P = H.brandPlan(m), G = H._geoms(), R = P.rows, U = this._bU || (this._bU = shared());
    var grp = this._bGroup = new THREE.Group(); grp.name = 'brand';
    var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(0, 0, 0, 'YZX'), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3();
    var compose = function (xf, o, k) { tmpP.set(xf[o], xf[o + 1], xf[o + 2]); tmpS.set(xf[o + 3] * k, xf[o + 4] * k, xf[o + 5] * k); tmpE.set(xf[o + 6], xf[o + 7], xf[o + 8], 'YZX'); tmpQ.setFromEuler(tmpE); return tmpM.compose(tmpP, tmpQ, tmpS); };
    this._bm = m.batches.map(function (b, bi) {
      var part = P.parts[bi]; if (part === 'ctx' || part === 'none') return null;
      var n = b.count, pm = P.perm[bi], geo = (G[b.shape] || G.box).clone(), laid = new Float32Array(n).fill(1e9);
      var at = new THREE.InstancedBufferAttribute(laid, 1); at.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aLaid', at);
      var look = lookOf(part, U), front = new THREE.InstancedMesh(geo, brandMat(U, look, false), n);
      for (var k = 0; k < n; k++) front.setMatrixAt(k, compose(b.xf, pm[k] * 10, 1));
      front.instanceMatrix.needsUpdate = true; front.frustumCulled = false; front.count = 0; front.renderOrder = part === 'glass' ? 6 : 4;
      front.name = 'part:' + part; grp.add(front);
      var back = null;
      if (part === 'brick' || part === 'trim') {   // far faces, faint: the hologram reads as solid brickwork you can see into
        back = new THREE.InstancedMesh(geo, brandMat(U, look, true), n); back.instanceMatrix = front.instanceMatrix;
        back.frustumCulled = false; back.count = 0; back.renderOrder = 3; grp.add(back);
      }
      return { bi: bi, part: part, n: n, front: front, back: back, laid: laid, attr: at, rank: P.rank[bi], cnt: 0, drop: part === 'brick' || part === 'roof' };
    });
    // the most recently laid brick: pale gold, 14% proud, pulsing
    var hl = this._bHL = new THREE.Mesh(G.box, brandMat(U, { base: C.brick, edgeK: 0.4, bevel: 0.014 }, false, true));
    hl.matrixAutoUpdate = false; hl.visible = false; hl.renderOrder = 7; grp.add(hl);
    // ── environment (6.6): ground glow, fading grid, site boundary, footprint, ring ping, rafters, gold slice ──
    var bb = m.bounds, x0 = bb.min[0], x1 = bb.max[0], z0 = bb.min[2], z1 = bb.max[2], w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, big = Math.max(w, d, 6), y0 = R.y0;
    var glowR = big * 1.9, glow = glowMesh(glowR * 2), bg = stageBgMesh(); grp.add(bg);
    glow.rotation.x = -Math.PI / 2; glow.position.set(cx, 0.003, cz); glow.renderOrder = 1; grp.add(glow);
    var E = big * 1.25, sp = E / 5, gpos = [], gcol = [];
    for (var i = -5; i <= 5; i++) {   // 11 lines each way, alpha 0.30 * (1 - |i| / 6.5), strongest in the middle; drawn at 60% as GL lines are crisper than canvas lines
      var a = 0.30 * 0.6 * (1 - Math.abs(i) / 6.5), c = [TEAL[0] * a, TEAL[1] * a, TEAL[2] * a];
      gpos.push(cx + i * sp, 0.002, cz - E, cx + i * sp, 0.002, cz + E, cx - E, 0.002, cz + i * sp, cx + E, 0.002, cz + i * sp);
      for (var q = 0; q < 4; q++) gcol.push(c[0], c[1], c[2]);
    }
    var gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3));
    var grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    grid.renderOrder = 1; grp.add(grid);
    var m20 = 20 * CH, site = segs(rectPts(x0 - m20, z0 - m20, x1 + m20, z1 + m20, y0 + 0.01), lineMat(TEAL, 0, true));
    site.computeLineDistances(); site.renderOrder = 2; grp.add(site);
    // footprint: the ground-floor outline of each block of the house (or of your floor in a flat)
    var rects = (m.envelope || []).filter(function (e) { return e[1] <= y0 + 0.3 && e[4] > y0 + 0.05; }).map(function (e) { return [e[0], e[2], e[3], e[5]]; });
    if (!rects.length) rects = [[x0, z0, x1, z1]];
    var fpts = []; rects.forEach(function (r) { fpts.push.apply(fpts, rectPts(r[0], r[1], r[2], r[3], y0 + 0.012)); });
    var fline = segs(fpts, lineMat(TEAL, 0)); fline.renderOrder = 2; grp.add(fline);
    var fillMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(TEAL[0], TEAL[1], TEAL[2]), transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide });
    var fills = rects.map(function (r) { var f = new THREE.Mesh(new THREE.PlaneBufferGeometry(r[2] - r[0], r[3] - r[1]), fillMat); f.rotation.x = -Math.PI / 2; f.position.set((r[0] + r[2]) / 2, y0 + 0.008, (r[1] + r[3]) / 2); f.renderOrder = 2; grp.add(f); return f; });
    var ring = new THREE.LineLoop(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5], 3)), lineMat(TEAL, 0));
    ring.position.set(cx, y0 + 0.015, cz); ring.renderOrder = 2; grp.add(ring);
    // roof timbers: 18 rafters per roof, front to back, as bright lines (shown 0.60 to 0.80)
    var roofs = [], NR = 18;
    (m.envelope || []).forEach(function (e) {
      var sh = e[6]; if (!sh || (sh.k !== 'gable' && sh.k !== 'hip')) return;
      var X = sh.axis === 'x', ex0 = e[0], ey0 = e[1], ez0 = e[2], ex1 = e[3], ey1 = e[4], ez1 = e[5], half = Math.min(ex1 - ex0, ez1 - ez0) / 2;
      var h0 = sh.k === 'hip' && (!sh.hips || sh.hips[0]) ? half : 0, h1 = sh.k === 'hip' && (!sh.hips || sh.hips[1]) ? half : 0, list = [];
      for (var r = 0; r < NR; r++) {
        var t = r / (NR - 1);
        if (X) { var u = ex0 + t * (ex1 - ex0), ur = clamp(u, ex0 + h0, ex1 - h1), zm = (ez0 + ez1) / 2; list.push([u, ey0, ez0, ur, ey1, zm, u, ey0, ez1, ur, ey1, zm]); }
        else { var uz = ez0 + t * (ez1 - ez0), uzr = clamp(uz, ez0 + h0, ez1 - h1), xm = (ex0 + ex1) / 2; list.push([ex0, ey0, uz, xm, ey1, uzr, ex1, ey0, uz, xm, ey1, uzr]); }
      }
      roofs.push(list);
    });
    var rafters = null;
    if (roofs.length) {   // interleaved by rafter number so every roof gets its timbers together
      var rp = []; for (var r2 = 0; r2 < NR; r2++) roofs.forEach(function (l) { rp.push.apply(rp, l[r2]); });
      rafters = segs(rp, lineMat(RAFTER, 0.85)); rafters.renderOrder = 2; rafters.userData.per = 4 * roofs.length; grp.add(rafters);
    }
    // the gold slice: a translucent amber quad 14 courses larger than the footprint, at the course being laid
    var sm = 14 * CH, slice = new THREE.Group();
    var sFill = new THREE.Mesh(new THREE.PlaneBufferGeometry(w + 2 * sm, d + 2 * sm), new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD[0], GOLD[1], GOLD[2]), transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false }));
    sFill.rotation.x = -Math.PI / 2; sFill.position.set(cx, 0, cz); sFill.renderOrder = 8;
    var sLine = segs(rectPts(x0 - sm, z0 - sm, x1 + sm, z1 + sm, 0), lineMat(GOLD, 0.95)); sLine.material.depthTest = false; sLine.renderOrder = 9;
    slice.add(sFill); slice.add(sLine); slice.visible = false; grp.add(slice);
    [[bg, 'bg'], [glow, 'glow'], [grid, 'grid'], [site, 'site'], [fline, 'footprint'], [ring, 'ring'], [rafters, 'rafters'], [slice, 'slice'], [hl, 'lastBrick']].forEach(function (o) { if (o[0]) o[0].name = o[1]; });
    this._bEnvObj = { glow: glow, grid: grid, site: site, fline: fline, fillMat: fillMat, fills: fills, ring: ring, rafters: rafters, slice: slice, sFill: sFill, sLine: sLine, w: w, d: d, big: big, cx: cx, cz: cz };
    this.scene.add(grp);
    this._bModel = m; this._bV = null; this._bPrimed = false; this._bLastJ = -1;
  };

  // scene look on/off: the stage gradient replaces the plain background, the brand grid replaces the survey grid
  VP._brandEnv = function (on) {
    if (on === !!this._bOn) return;
    this._bOn = on;
    if (on) {
      this._bSaved = { bg: this.scene.background, ground: this.ground.visible, grid: this.grid.visible };
      this.scene.background = null; this.ground.visible = false; this.grid.visible = false;   // the stage gradient is a screen quad in the brand group
      if (this._bGroup) this._bGroup.visible = true;
    } else {
      var s = this._bSaved || {};
      if (s.bg) this.scene.background = s.bg; this.ground.visible = s.ground !== false; this.grid.visible = s.grid !== false;
      if (this._bGroup) this._bGroup.visible = false;
      this.controls.autoRotate = false;
    }
    this.dirty = true;
  };

  // apply(): the Level 1 build under the brand look
  VP._brandApplyAll = function () {
    var m = this.model, F = m.focus;
    if (this._bModel !== m) this._brandBuild();
    this._brandEnv(true);
    var P = H.brandPlan(m), IDLE = H._IDLE_PLANE;
    this.batches.forEach(function (B, bi) {
      var part = P.parts[bi], b = B.b, mats = B.mats;
      if (part === 'ctx') {   // flats: the rest of the block, a faint silhouette as before
        B.rev.visible = false; B.main.visible = b.hideAfter >= 2; B.main.count = B.n; B.main.castShadow = false; B.main.receiveShadow = false;
        B.main.material = mats.blue; mats.blue.clippingPlanes = [IDLE];
      } else { B.main.visible = false; B.rev.visible = false; }
    });
    if (this.edges) { this.edges.visible = !F; this.edges.material.clippingPlanes = [IDLE]; this.edges.material.opacity = 0.34; }   // the finished house as a faint wire
    if (this.rowBand) this.rowBand.visible = false;
    if (this.water) this.water.visible = false;
    if (this.focusBox) this.focusBox.visible = true;
    this._brandApply();
    if (this._lastMode !== this.mode) this._shadowDirty = true;   // one refresh clears any old shadow; the hologram casts none
    this._lastMode = this.mode;
    this.dirty = true; this.wake();
  };

  // counts, per-brick stamps and the frame's uniforms (called by apply() and every animated frame)
  VP._brandApply = function () {
    var m = this.model; if (!m || !this._bm) return;
    var P = H.brandPlan(m), R = P.rows, p = this.mode === 'site' ? 0 : this.p, now = this._bNow(), motion = reduced(), red = motion || !!this._bLite, U = this._bU, E = this._bEnvObj;
    var V = units(P, p), V0 = this._bV == null ? -1 : this._bV, inst = motion || !this._bPrimed;   // lite keeps the drop and flash, not the ambient motion
    var add = Math.max(0, V - Math.max(V0, 0)), stp = (!inst && add > 0 && add <= 60) ? Math.min(0.12, 0.9 / add) : 0;
    if (V !== V0) {
      this._bm.forEach(function (rec) {
        if (!rec) return;
        var k1 = lowerBound(rec.rank, V), k0 = rec.cnt;
        if (k1 > k0) {
          for (var k = k0; k < k1; k++) {
            var glaze = rec.part === 'glass' || rec.part === 'door' || rec.part === 'frame';
            rec.laid[k] = (inst || glaze) ? -1000 : now + Math.floor(Math.max(0, rec.rank[k] - Math.max(V0, 0))) * stp;
          }
          rec.attr.needsUpdate = true;
        } else if (k1 < k0) {   // un-laying is instant
          for (var k2 = k1; k2 < k0; k2++) rec.laid[k2] = 1e9;
          rec.attr.needsUpdate = true;
        }
        rec.cnt = k1; rec.front.count = k1; rec.front.visible = k1 > 0;
        if (rec.back) { rec.back.count = k1; rec.back.visible = k1 > 0; }
      });
      this._bV = V;
      if (V > V0) this._bGrow = now;
    }
    this._bPrimed = true;
    var st = H.brandStats(m, p), L = st.bricksLaid, pulse = red ? 0.5 : 0.5 + 0.5 * Math.sin(performance.now() * 0.002244);
    // the last brick laid: stays lit pale gold, 14% proud; shown once it has landed
    var hl = this._bHL, last = null;
    if (L > 0) {
      var j = L - 1, rec = this._bm[P.bBi[j]], kk = P.bK[j], b = m.batches[P.bBi[j]], o = P.perm[P.bBi[j]][kk] * 10, xf = b.xf;
      if (this._bLastJ !== j) {
        var mm = new THREE.Matrix4(), e = new THREE.Euler(xf[o + 6], xf[o + 7], xf[o + 8], 'YZX');
        mm.compose(new THREE.Vector3(xf[o], xf[o + 1], xf[o + 2]), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(xf[o + 3] * 1.14, xf[o + 4] * 1.14, xf[o + 5] * 1.14));
        hl.matrix.copy(mm); hl.matrixWorldNeedsUpdate = true; this._bLastJ = j;
      }
      var landed = motion || (rec && now >= rec.laid[kk] + 0.38);
      last = { n: L, x: xf[o], y: xf[o + 1], z: xf[o + 2], shown: !!landed };
      hl.visible = !!landed;
    } else { hl.visible = false; this._bLastJ = -1; }
    // stage uniforms
    U.uNow.value = now; U.uPulse.value = pulse; U.uBuilt.value = seg(p, 0.05, 1);
    U.uFadeGlaze.value = seg(p, 0.88, 0.93); U.uLitGlass.value = seg(p, 0.93, 0.96); U.uLitDoor.value = seg(p, 0.96, 1);
    var top = Math.max(R.y1, R.y0 + 1), span = top - R.y0;
    U.uSweepOn.value = (red || this._bLite) ? 0 : 1;
    U.uSweep.value = R.y0 + ((now * 20 * CH) % (span + 40 * CH)) - 10 * CH;   // 20 courses a second, repeating
    // environment
    var sb = seg(p, 0.005, 0.03), fnd = seg(p, 0, 0.03);
    E.site.material.opacity = 0.55 * sb; E.site.visible = sb > 0;
    E.fline.material.opacity = 0.75 * fnd; E.fline.visible = fnd > 0; E.fillMat.opacity = 0.14 * fnd; E.fills.forEach(function (f) { f.visible = fnd > 0; });
    var ping = red ? 0 : (performance.now() % 2800) / 2800, rg = ping * E.big * 0.625;
    E.ring.visible = !red && p > 0.05; E.ring.scale.set(E.w + 2 * rg, 1, E.d + 2 * rg); E.ring.material.opacity = (1 - ping) * (0.10 + 0.40 * seg(p, 0.5, 1));
    if (E.rafters) { var nT = Math.ceil(seg(p, 0.60, 0.80) * 18); E.rafters.visible = nT > 0; E.rafters.geometry.setDrawRange(0, nT * E.rafters.userData.per); }
    var pa = 1 - seg(p, 0.97, 1);
    E.slice.visible = pa > 0 && p > 0; E.slice.position.y = st.y; E.sFill.material.opacity = 0.11 * pa; E.sLine.material.opacity = 0.95 * pa;
    this._bPulse = pulse;
    this._bInfo = { p: p, row: st.row, rows: st.rows, y: st.y, bricks: L, bricksTotal: st.bricksTotal, tiles: st.tilesLaid, tilesTotal: st.tilesTotal, stage: st.stage,
      sliceA: pa, keys: st.keys, last: last, pulse: pulse, door: P.door, cx: E.cx, cz: E.cz, top: m.height, lite: !!this._bLite, reduced: red };
    // auto orbit (6.6.8): drifts round slowly, stops at a touch, resumes after 2.5 s idle; off for reduced motion
    var ctl = this.controls;
    if (red || this._bLite) ctl.autoRotate = false;
    else if (!ctl.autoRotate && !this._bDrag && performance.now() - (this._bTouch || 0) > 2500) { ctl.autoRotate = true; ctl.autoRotateSpeed = 0.12 * 60 / (2 * Math.PI); }
    this.dirty = true;
  };

  // frame loop: ease the displayed progress toward the target, then redraw (only while on screen)
  VP._brandTick = function () {
    if (!this._brandActive() || !this._bm) { this._bTickT = 0; return false; }
    if (this._bVis === false || (typeof document !== 'undefined' && document.hidden)) { this._bTickT = 0; return false; }
    var t = performance.now(), raw = this._bTickT ? (t - this._bTickT) / 1000 : 1 / 60; this._bTickT = t;
    // a device that cannot keep up (frames slower than 1/10 s on average) drops to the lite stage (6.10): pixel ratio 1, no
    // ambient pulse, sweep or ring, and it only draws while something is building, so it never runs hot doing nothing
    // Speed is judged only after the warm-up (shader compile and the first geometry upload make the first seconds slow on
    // every device): from 3 s in, a running average slower than 1/8 s over 40 frames means the device cannot keep up.
    if (!this._bT0) this._bT0 = t;
    if (raw < 2 && t - this._bT0 > 3000) { this._bEma = this._bEma == null ? raw : this._bEma * 0.9 + raw * 0.1; this._bFrames = (this._bFrames || 0) + 1; }
    if (!this._bLite && this._bFrames > 40 && this._bEma > 0.125) {
      this._bLite = true; var w = this.el.clientWidth, h = this.el.clientHeight;
      if (w > 2 && h > 2) { this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false); }
    }
    // lite (6.10): pixel ratio 1 and about 12 frames a second; the pulse and ring ping stay, only the sweep and auto orbit stop
    if (this._bLite && !reduced() && t - (this._bLastDraw || 0) < 80 && this._brandSettled()) return true;
    this._bLastDraw = t;
    var dt = Math.min(this._bLite ? 0.5 : 0.05, raw);
    var target = this._bTarget == null ? this.p : this._bTarget, red = reduced(), calm = red;
    if (red) this.p = target;
    else if (this.p !== target) { this.p += (target - this.p) * Math.min(1, dt * 1.7); if (Math.abs(target - this.p) < 0.0003) this.p = target; }
    this._brandApply();
    if (calm) return !this._brandSettled() || !!this._fly;
    return true;   // pulse, sweep and ring keep the stage alive
  };
  VP._brandSettled = function () {
    var target = this._bTarget == null ? this.p : this._bTarget;
    if (Math.abs(target - this.p) > 1e-9) return false;
    var now = this._bNow(), busy = false;
    (this._bm || []).forEach(function (rec) { if (rec && rec.cnt > 0 && rec.laid[rec.cnt - 1] > -999 && now < rec.laid[rec.cnt - 1] + 1.5) busy = true; });
    return !busy;
  };
  VP.brandInfo = function () { return this._brandActive() ? this._bInfo : null; };
})(HB3D);
