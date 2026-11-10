// ═══════════════════════════════════════════════════════════════
// HB3D BRAND: the brand book's build animation and hologram look on every three.js house model (Level 1 deposit build).
// The only house builder (owner, 1 Nov 2026: the classic viewer is deleted): Level 1 (the deposit lays the bricks) and Level 2
// (the paid share solid below a gold line, mortgage free lit). The app calls viewer.setBrand(true).
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
  // v0.7 opening: the progress to show at once, so that only the bricks laid since the last visit (lastSeen bricks, null on a first
  // visit) animate, capped at the course being laid. A first visit lays the top course; a visit with nothing new lays nothing.
  // Returns p itself when the build is past the brickwork (roof, glazing) or before it (foundations).
  H.brandOpenFrom = function (m, p, lastSeen) {
    var P = H.brandPlan(m), N = P.N, L = H.brandBricksLaid(N, p);
    if (!N || L <= 0 || p > 0.80) return p;
    var courseStart = lowerBound(P.course, P.course[L - 1]);   // the first brick of the course the last brick sits in
    var from = lastSeen == null ? courseStart : Math.max(courseStart, Math.min(L, Math.floor(lastSeen)));
    if (from >= L) return p;
    return 0.03 + 0.77 * (from + 0.5) / N;   // floor(N * seg) lands on exactly `from` bricks
  };

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
    var c0 = N ? course[0] : 0, doorPts = [], rank2 = rank.map(function (rk) { return null; });
    rest.forEach(function (r) {
      var cb = Math.round((r.bot - R.y0) / R.ch) + 1;     // the course this part sits in
      var byCourse = !N || cb < c0 ? -1 : Math.min(N - 1, lowerBound(course, cb));   // shows with the first brick of its course
      if (r.part === 'glass' || r.part === 'frame' || r.part === 'door') {   // Level 1: glazing goes in at the end; Level 2 colours it with its course
        rank[r.bi][r.i] = N + T; if (r.part === 'door') doorPts.push(r);
        (rank2[r.bi] || (rank2[r.bi] = Float64Array.from(rank[r.bi])))[r.i] = byCourse; return;
      }
      rank[r.bi][r.i] = byCourse;
    });
    rank2 = rank2.map(function (r2, bi) { return r2 || rank[bi]; });
    // each batch sorted by rank (then by the Level 2 order), so what shows, and what is in colour, is always a prefix of the instances
    var perm = rank.map(function (rk, bi) { var r2 = rank2[bi], ix = []; for (var i = 0; i < rk.length; i++) ix.push(i); ix.sort(function (p, q) { return rk[p] - rk[q] || r2[p] - r2[q] || p - q; }); return Int32Array.from(ix); });
    var sorted = rank.map(function (rk, bi) { var pm = perm[bi], out = new Float64Array(rk.length); for (var k = 0; k < pm.length; k++) out[k] = rk[pm[k]]; return out; });
    var sorted2 = rank2.map(function (rk, bi) { var pm = perm[bi], out = new Float64Array(rk.length); for (var k = 0; k < pm.length; k++) out[k] = rk[pm[k]]; return out; });
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
    m._bp = { N: N, T: T, rows: R, course: course, top: top, bBi: bBi, bK: bK, tileTop: tileTop, parts: parts, perm: perm, rank: sorted, rank2: sorted2, door: door, cx: cx, cz: cz };
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
  // Level 2 (owner, 1 Nov 2026): how many parts are in full colour for an equity share e of the home's value (same laying order)
  H.brandColourUnits = function (P, e) { e = clamp(e || 0, 0, 1); return e >= 1 - 1e-9 ? 1e15 : Math.floor((P.N + P.T) * e + 1e-6); };
  // real material colours (sRGB) for parts the kit does not colour itself
  var MATCOL = { mortar: 0xb9b2a5, mortarDark: 0x8f8a80, mortarLime: 0xd0c4a8, insulation: 0xe6d9a2, closer: 0xd8d2c0, concrete: 0x9c9a94, soil: 0x4a3a2c, dpc: 0x16181b,
    timber: 0xc8a06e, timberWhite: 0xf1efe9, chipboard: 0xb9955f, steel: 0x6e7880, metal: 0x9aa3ab, felt: 0x2a2d33, ridge: 0x4a4440, lead: 0x6b7178, stone: 0xd9cfb6,
    render: 0xeae5d8, pebbledash: 0xd3cbb5, upvc: 0xf3f3ef, upvcGrey: 0x3a3f45, upvcBlack: 0x1d2024, timberPaint: 0xf0ede4, glass: 0x9fc4d6, doorRed: 0x7a1d22,
    doorBlue: 0x1d2f55, doorGreen: 0x1f4a35, doorBlack: 0x15171a, doorGrey: 0x464c53, garageDoor: 0xe9e9e4, brass: 0xc9a84c, gutter: 0x1b1d20, terracotta: 0xa65638,
    column: 0xece6d6, balcony: 0x30363d, curtain: 0x5d7a8c, gold: 0xe8c56a, slate: 0x4f5660, tileClay: 0x9c4a32, tileConcrete: 0x6d6a66, brick: 0x9b4a35, block: 0xa9a59c };
  H.brandColourOf = function (b, i) { var c = b.color && b.color[i] >= 0 ? b.color[i] : MATCOL[b.mat]; return c == null ? 0xbdb8ae : c; };
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

  // ── Night palette (brand engine THG.dark). The 3D viewports keep the Night look in Daylight too (owner, 30 Oct). ──
  var C = H.BRAND_C = { brick: [0.267, 0.753, 0.725], trim: [0.46, 0.84, 0.80], tile: [0.2, 0.62, 0.74], frame: [0.78, 0.93, 0.92], glass: [0.02, 0.2, 0.22], glassLit: [0.96, 0.78, 0.42],
    door: [0.04, 0.24, 0.26], edge: [0.01, 0.1, 0.1], sheen: [0.75, 0.98, 0.96], flash: [0.91, 0.77, 0.42], shMin: 0.5, edgeK: 0.62, front: 0.88, back: 0.09 };   // shared with the still picture (no three.js needed)
  function boot() {   // the viewer methods need THREE and H.Viewer; with three.js loaded later (viThree) H._boot calls this
  if (!H.Viewer || typeof THREE === 'undefined') return;
  var VP = H.Viewer.prototype;

  var C = H.BRAND_C;
  var TEAL = [68 / 255, 192 / 255, 185 / 255], GOLD = [232 / 255, 197 / 255, 106 / 255], RAFTER = [120 / 255, 230 / 255, 222 / 255];
  function softGL(r) {   // a GPU drawn in software (no graphics chip, or a blocklisted one): the 3D must stay light there
    try { var gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'), name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(name || '')); } catch (e) { return false; }
  }
  H.brandSoftGL = softGL;
  var mqRM = null;   // one media query, read every frame (a new matchMedia each frame cost more than the brick maths)
  function reduced() {
    try { if (!mqRM && window.matchMedia) mqRM = window.matchMedia('(prefers-reduced-motion: reduce)'); return (document.body && document.body.classList.contains('reduced-motion')) || !!(mqRM && mqRM.matches); } catch (e) { return false; }
  }
  H.brandReduced = reduced;
  function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }

  // per-brick shader: drop in (0.38 s, e^3), fade in, gold flash (1.1 s), mortar bevel, pulse, sweep band
  // BRAND_STATIC: the same look for parts that have finished landing, baked into one plain mesh per part (positions, normals and the
  // per-brick face size and seed already in world space), so a phone draws thousands of settled bricks as one cheap mesh
  var VS = [
    '#ifdef BRAND_STATIC',
    'attribute vec2 aFS; attribute vec3 aIO;',
    '#else',
    'attribute float aLaid;',
    '#endif',
    '#ifdef BRAND_COLOUR',
    'varying vec3 vCol;',
    '#ifdef BRAND_STATIC',
    'attribute vec3 aCol;',
    '#endif',
    '#endif',
    'uniform float uNow; uniform float uDrop; uniform float uFlashOn; uniform float uFade;',
    'varying vec3 vN; varying vec3 vW; varying vec2 vUV; varying vec2 vFS; varying float vFlash; varying float vAlpha; varying float vSeed;',
    'void main() {',
    '  float vis = 1.0; float drop = 0.0; vFlash = 0.0;',
    '  #ifdef BRAND_STATIC',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  vN = normalize(mat3(modelMatrix) * normal);',
    '  vFS = aFS; vec3 io = (modelMatrix * vec4(aIO, 1.0)).xyz;',
    '  #else',
    '  mat4 im = mat4(1.0);',
    '  #ifdef USE_INSTANCING',
    '  im = instanceMatrix;',
    '  #endif',
    '  #ifndef BRAND_LAST',
    '  float age = uNow - aLaid;',
    '  if (aLaid > 1.0e8 || age < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',
    '  float d = clamp(age / 0.9, 0.0, 1.0); vis = smoothstep(0.0, 0.5, d); float e = 1.0 - d; drop = e * e * e * uDrop;',
    '  vFlash = uFlashOn * (1.0 - clamp(age / 2.0, 0.0, 1.0));',
    '  #endif',
    '  vec4 wp = modelMatrix * im * vec4(position, 1.0); wp.y += drop;',
    '  vN = normalize(mat3(modelMatrix) * mat3(im) * normal);',
    '  vec3 sc = vec3(length(im[0].xyz), length(im[1].xyz), length(im[2].xyz)); vec3 an = abs(normal);',
    '  vFS = an.x > 0.5 ? sc.zy : (an.y > 0.5 ? sc.xz : sc.xy);',
    '  vec3 io = (modelMatrix * im * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
    '  #endif',
    '  vUV = uv; vW = wp.xyz; vAlpha = vis * uFade;',
    '  vSeed = fract(sin(dot(io.xz + vec2(io.y * 1.3, io.x * 0.7), vec2(12.9898, 78.233))) * 43758.5453);',
    '  #ifdef BRAND_COLOUR',
    '  #ifdef BRAND_STATIC',
    '  vCol = aCol;',
    '  #elif defined(USE_INSTANCING_COLOR)',
    '  vCol = instanceColor;',
    '  #else',
    '  vCol = vec3(1.0);',
    '  #endif',
    '  #endif',
    '  gl_Position = projectionMatrix * viewMatrix * wp;',
    '}'].join('\n');
  var FS = [
    'uniform vec3 uBase; uniform vec3 uLitCol; uniform float uLit; uniform vec3 uEdge; uniform vec3 uSheen; uniform vec3 uFlashCol;',
    'uniform float uShMin; uniform float uEdgeK; uniform float uPulse; uniform float uBuilt; uniform float uSweep; uniform float uSweepOn; uniform float uSweepW;',
    'uniform float uBack; uniform float uFrontA; uniform float uBackA; uniform float uTone; uniform float uBevel;',
    'varying vec3 vN; varying vec3 vW; varying vec2 vUV; varying vec2 vFS; varying float vFlash; varying float vAlpha; varying float vSeed;',
    '#ifdef BRAND_COLOUR',
    'varying vec3 vCol;',
    '#endif',
    'void main() {',
    '  vec3 L = normalize(vec3(-0.45, 0.7, 0.55)); float lt = max(0.0, dot(normalize(vN), L)); float sh = uShMin + (1.0 - uShMin) * lt;',
    '  #ifdef BRAND_COLOUR',
    '  vec3 base = mix(vCol * (1.0 - uTone + 2.0 * uTone * vSeed), uLitCol, uLit);',   // Level 2: the real material colour of each part
    '  #else',
    '  vec3 base = mix(uBase * (1.0 - uTone + 2.0 * uTone * vSeed), uLitCol, uLit);',
    '  #endif',
    '  vec3 col = base * sh;',
    '  vec2 dd = min(vUV, 1.0 - vUV) * vFS; float ed = min(dd.x, dd.y); float bev = smoothstep(0.0, uBevel, ed);',
    '  col = mix(col, uEdge * (0.6 + 0.4 * sh), (1.0 - bev) * uEdgeK);',
    '  #ifdef BRAND_COLOUR',
    '  col = mix(col, vec3(0.267, 0.753, 0.725) * sh, 0.16);',   // a subtle teal hue over the real colours (owner, 1 Nov)
    '  #endif',
    '  float fl = clamp(vFlash, 0.0, 1.0); col = mix(col, uFlashCol, fl * 0.9);',
    '  float a;',
    '  #ifdef BRAND_LAST',
    '  col = mix(col, vec3(1.0, 0.94, 0.64), 0.88) * (1.08 + 0.3 * uPulse); a = 1.0;',
    '  #else',
    '  col *= 0.95 + 0.1 * uPulse;',
    '  float s = 1.0 - clamp(abs(vW.y - uSweep) / uSweepW, 0.0, 1.0); col = mix(col, uSheen, s * 0.5 * uSweepOn);',
    '  a = uBack > 0.5 ? uBackA * vAlpha : (uFrontA + 0.06 * uPulse * uBuilt + 0.2 * fl) * vAlpha;',
    '  #endif',
    '  #ifdef BRAND_OPAQUE',
    '  gl_FragColor = vec4(col, 1.0);',
    '  #else',
    '  gl_FragColor = vec4(col * a, a);',
    '  #endif',
    '}'].join('\n');

  function shared() {   // uniforms every brand material reads (one object each, shared by reference)
    return { uNow: { value: 0 }, uPulse: { value: 0.5 }, uBuilt: { value: 0 }, uSweep: { value: -1e3 }, uSweepOn: { value: 0 }, uSweepW: { value: 6 * CH },
      uFadeGlaze: { value: 0 }, uLitGlass: { value: 0 }, uLitDoor: { value: 0 }, one: { value: 1 }, zero: { value: 0 } };
  }
  function brandMat(U, look, back, last, opaque, stat, colour) {
    var u = {
      uNow: U.uNow, uPulse: U.uPulse, uBuilt: U.uBuilt, uSweep: U.uSweep, uSweepOn: U.uSweepOn, uSweepW: U.uSweepW,
      uBase: { value: v3(look.base) }, uLitCol: { value: v3(look.lit || look.base) }, uLit: look.litU || U.zero,
      uEdge: { value: v3(look.edge || C.edge) }, uSheen: { value: v3(C.sheen) }, uFlashCol: { value: v3(C.flash) },
      uShMin: { value: C.shMin }, uEdgeK: { value: look.edgeK == null ? C.edgeK : look.edgeK }, uBevel: { value: look.bevel || 0.012 },
      uBack: { value: back ? 1 : 0 }, uFrontA: { value: look.front == null ? C.front : look.front }, uBackA: { value: C.back }, uTone: { value: look.tone || 0 },
      uDrop: { value: look.drop || 0 }, uFlashOn: { value: look.flash || 0 }, uFade: look.fadeU || U.one
    };
    // opaque (bricks, roof, trim; owner 31 Oct): drawn solid with the depth test, so each pixel is shaded about once. The see-through
    // version blended every brick behind every other and froze phones ("Page unresponsive"); at 0.88 alpha it looked the same.
    var mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: !opaque, premultipliedAlpha: true,
      depthWrite: !back, depthTest: !back, side: back ? THREE.BackSide : THREE.FrontSide });
    mat.defines = {}; if (last) mat.defines.BRAND_LAST = ''; if (opaque) mat.defines.BRAND_OPAQUE = ''; if (stat) mat.defines.BRAND_STATIC = '';
    if (colour) { mat.defines.BRAND_COLOUR = ''; mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -1; }   // Level 2: drawn over the hologram brick it replaces
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
      this.renderer.domElement.addEventListener('webglcontextlost', function () { self._bModel = null; });   // static meshes keep no page copy: rebuilt on restore
      this.controls.addEventListener('start', function () { self._bTouch = performance.now(); self._bDrag = true; if (self.brand) self.controls.autoRotate = false; });
      this.controls.addEventListener('end', function () { self._bTouch = performance.now(); self._bDrag = false; });
    }
    this.apply();
  };
  VP._brandActive = function () {
    var m = this.model;
    return !!(this.brand && m && m.clean && !m.custom && m.rows && m.batches && (this.mode === 'build' || this.mode === 'site' || this.mode === 'equity' || this.mode === 'complete'));
  };
  VP._bNow = function () { if (!this._bT0) this._bT0 = performance.now(); return (performance.now() - this._bT0) / 1000; };

  VP._brandClear = function () {
    var g = this._bGroup;
    if (g) {
      if (g.parent) g.parent.remove(g);
      g.traverse(function (o) { if (o.geometry && o.geometry !== H._geoms().box) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    this._bBakeTok = (this._bBakeTok || 0) + 1; if (this._bBakeT) { clearTimeout(this._bBakeT); this._bBakeT = 0; }
    this._bGroup = null; this._bm = null; this._bModel = null; this._bCutOn = null; this._bInfo = null; this._bV = null; this._bPrimed = false; this._bLastJ = -1;
  };

  function staticMesh(n, V, I, U, look, solid, order, part) {
    var sg = new THREE.BufferGeometry();   // uploaded a slice at a time as it is baked (v0.7); once complete the page's copy is dropped (see bakeUpload)
    [['position', 3], ['normal', 3], ['uv', 2], ['aFS', 2], ['aIO', 3]].forEach(function (a) { sg.setAttribute(a[0], new THREE.BufferAttribute(new Float32Array(n * V * a[1]), a[1])); });
    sg.setAttribute('aCol', new THREE.BufferAttribute(new Uint8Array(n * V * 3), 3, true));   // Level 2's real colours (3 bytes a vertex)
    sg.setIndex(new THREE.BufferAttribute(n * V > 65535 ? new Uint32Array(n * I) : new Uint16Array(n * I), 1));
    sg.setDrawRange(0, 0);
    var stat = new THREE.Mesh(sg, brandMat(U, look, false, false, solid, true));
    stat.frustumCulled = false; stat.renderOrder = order; stat.visible = false; stat.name = 'static:' + part;
    return stat;
  }
  // each part's real colour, in laying order (bytes, sRGB: the brand shaders write colours as they are)
  function rgbOf(b, pm, n) { var out = new Uint8Array(n * 3); for (var k = 0; k < n; k++) { var c = H.brandColourOf(b, pm[k]); out[k * 3] = (c >> 16) & 255; out[k * 3 + 1] = (c >> 8) & 255; out[k * 3 + 2] = c & 255; } return out; }
  // bake instances [k0, k1) of a part into its static mesh (world positions, normals as mat3(instance) * normal, face sizes, origins)
  function bakeRange(rec, k0, k1) {
    var g = rec.front.geometry, sg = rec.stat.geometry, V = rec.V, I = rec.I, M = rec.mats;
    var P0 = g.attributes.position.array, N0 = g.attributes.normal.array, U0 = g.attributes.uv ? g.attributes.uv.array : null, X0 = g.index ? g.index.array : null;
    var A = sg.attributes, pos = A.position.array, nor = A.normal.array, uv = A.uv.array, fs = A.aFS.array, io = A.aIO.array, idx = sg.index.array, ac = A.aCol.array, RC = rec.rgb;
    for (var k = k0; k < k1; k++) {
      var m = k * 16, a = M[m], b = M[m + 1], c = M[m + 2], d = M[m + 4], e = M[m + 5], f = M[m + 6], gg = M[m + 8], h = M[m + 9], ii = M[m + 10], tx = M[m + 12], ty = M[m + 13], tz = M[m + 14];
      var sx = Math.sqrt(a * a + b * b + c * c), sy = Math.sqrt(d * d + e * e + f * f), sz = Math.sqrt(gg * gg + h * h + ii * ii);
      for (var j = 0; j < V; j++) {
        var o = (k * V + j), o3 = o * 3, o2 = o * 2, x = P0[j * 3], y = P0[j * 3 + 1], z = P0[j * 3 + 2], nx = N0[j * 3], ny = N0[j * 3 + 1], nz = N0[j * 3 + 2];
        pos[o3] = a * x + d * y + gg * z + tx; pos[o3 + 1] = b * x + e * y + h * z + ty; pos[o3 + 2] = c * x + f * y + ii * z + tz;
        nor[o3] = a * nx + d * ny + gg * nz; nor[o3 + 1] = b * nx + e * ny + h * nz; nor[o3 + 2] = c * nx + f * ny + ii * nz;
        var ax = Math.abs(nx), ay = Math.abs(ny);
        if (ax > 0.5) { fs[o2] = sz; fs[o2 + 1] = sy; } else if (ay > 0.5) { fs[o2] = sx; fs[o2 + 1] = sz; } else { fs[o2] = sx; fs[o2 + 1] = sy; }
        if (U0) { uv[o2] = U0[j * 2]; uv[o2 + 1] = U0[j * 2 + 1]; }
        io[o3] = tx; io[o3 + 1] = ty; io[o3 + 2] = tz;
        ac[o3] = RC[k * 3]; ac[o3 + 1] = RC[k * 3 + 1]; ac[o3 + 2] = RC[k * 3 + 2];
      }
      for (var q = 0; q < I; q++) idx[k * I + q] = (X0 ? X0[q] : q) + k * V;
    }
  }
  H._brandBakeRange = bakeRange;
  // v0.7: the static mesh goes to the GPU a slice at a time, in step with the bake (drawn with an empty range meanwhile), so the finished
  // house never arrives as one 15 MB upload in a single frame; after the last slice the page's copies are dropped
  var STAT_ATTRS = [['position', 3], ['normal', 3], ['uv', 2], ['aFS', 2], ['aIO', 3], ['aCol', 3]];
  function slice(at, o, c) {   // widen a pending slice rather than replace it: two bake steps can land between frames
    var r = at.updateRange; if (r.count > 0) { var e = Math.max(r.offset + r.count, o + c); o = Math.min(r.offset, o); c = e - o; }
    r.offset = o; r.count = c; at.needsUpdate = true;
  }
  function bakeUpload(rec, k0, k1, done) {
    var sg = rec.stat.geometry, V = rec.V, I = rec.I;
    STAT_ATTRS.forEach(function (a) { slice(sg.attributes[a[0]], k0 * V * a[1], (k1 - k0) * V * a[1]); });
    slice(sg.index, k0 * I, (k1 - k0) * I);
    rec.stat.visible = true;   // an empty draw range until landed parts move in: the frame only uploads
    if (done) rec.stat.onAfterRender = function () {   // the last slice has gone up in this frame: the page's copies go
      this.onAfterRender = function () {};
      STAT_ATTRS.forEach(function (a) { sg.attributes[a[0]].array = null; }); sg.index.array = null;
    };
  }
  // bake every part a slice at a time (about 4 ms each), between frames, so the page stays responsive on a slow phone
  VP._bBakeGo = function () {
    var self = this, tok = this._bBakeTok;
    var step = function () {
      self._bBakeT = 0;
      if (tok !== self._bBakeTok || !self._bm) return;
      var t0 = performance.now(), left = false;
      for (var r = 0; r < self._bm.length; r++) {
        var rec = self._bm[r]; if (!rec || !rec.stat || rec.ready >= rec.n) continue;
        var r0 = rec.ready;
        while (rec.ready < rec.n && performance.now() - t0 < 4) { var k1 = Math.min(rec.n, rec.ready + 64); bakeRange(rec, rec.ready, k1); rec.ready = k1; }
        if (rec.ready > r0) bakeUpload(rec, r0, rec.ready, rec.ready >= rec.n);
        if (rec.ready < rec.n) { left = true; break; }
      }
      self.dirty = true;
      if (left) self._bBakeT = setTimeout(step, 16); else self.wake();
    };
    this._bBakeT = setTimeout(step, 30);
  };
  // move landed parts into the static mesh and give the instanced mesh only what is still landing ([S, cnt) of the laying order).
  // The static mesh is drawn once it is fully baked (one complete upload, then the page's copy is dropped)
  function syncPart(rec, now) {
    var S = Math.min(rec.S, rec.cnt), lim = rec.stat && rec.ready >= rec.n ? rec.cnt : 0;
    while (S < lim && rec.laid[S] + 2.05 <= now) S++;   // drop 0.9 s, flash 2 s: after that a part looks the same either way
    if (S === rec.S && rec.act === rec.cnt && !rec.dirtyA) return;
    var c0 = Math.min(rec.cutS || 0, S);   // Level 2: the hologram is not drawn under parts already in colour
    var m = rec.cnt - S, im = rec.front.instanceMatrix;
    if (m > 0) {
      im.array.set(rec.mats.subarray(S * 16, rec.cnt * 16)); im.updateRange.offset = 0; im.updateRange.count = m * 16; im.needsUpdate = true;
      rec.alaid.set(rec.laid.subarray(S, rec.cnt)); rec.attr.updateRange.offset = 0; rec.attr.updateRange.count = m; rec.attr.needsUpdate = true;
    }
    rec.front.count = m; rec.front.visible = m > 0;
    if (rec.stat) { rec.stat.geometry.setDrawRange(c0 * rec.I, (S - c0) * rec.I); rec.stat.visible = S > c0 || (rec.ready > 0 && rec.ready < rec.n); }   // still baking: visible with an empty range so its slices upload
    rec.S = S; rec.act = rec.cnt; rec.dirtyA = false;
  }

  // build the brand meshes and environment for the current model (once per model)
  VP._brandBuild = function () {
    this._brandClear();
    var self = this, m = this.model, P = H.brandPlan(m), G = H._geoms(), R = P.rows, U = this._bU || (this._bU = shared()), budget = 640000;
    var grp = this._bGroup = new THREE.Group(); grp.name = 'brand';
    var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(0, 0, 0, 'YZX'), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3();
    var compose = function (xf, o, k) { tmpP.set(xf[o], xf[o + 1], xf[o + 2]); tmpS.set(xf[o + 3] * k, xf[o + 4] * k, xf[o + 5] * k); tmpE.set(xf[o + 6], xf[o + 7], xf[o + 8], 'YZX'); tmpQ.setFromEuler(tmpE); return tmpM.compose(tmpP, tmpQ, tmpS); };
    this._bm = m.batches.map(function (b, bi) {
      var part = P.parts[bi]; if (part === 'ctx' || part === 'none') return null;
      var n = b.count, pm = P.perm[bi], geo = (G[b.shape] || G.box).clone(), laid = new Float32Array(n).fill(1e9);
      var at = new THREE.InstancedBufferAttribute(laid, 1); at.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aLaid', at);
      var solid = part === 'brick' || part === 'roof' || part === 'trim' || part === 'gold';
      var look = lookOf(part, U), front = new THREE.InstancedMesh(geo, brandMat(U, look, false, false, solid), n);
      for (var k = 0; k < n; k++) front.setMatrixAt(k, compose(b.xf, pm[k] * 10, 1));
      front.instanceMatrix.needsUpdate = true; front.frustumCulled = false; front.count = 0; front.renderOrder = part === 'glass' ? 6 : 4;
      front.name = 'part:' + part; grp.add(front);
      // speed (owner, 31 Oct): the instanced mesh only carries the parts still landing; the ones that have landed move into one static
      // mesh with the same look (baked a slice at a time while the page is idle), so a frame draws a few hundred instances, not thousands
      var mats = Float32Array.from(front.instanceMatrix.array), alaid = new Float32Array(n).fill(1e9);
      at.array = alaid; front.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      var V = geo.attributes.position.count, I = geo.index ? geo.index.count : V, stat = null;
      // memory: 52 bytes a vertex on the GPU (the copy in the page is dropped once uploaded). Parts merge while the house stays under
      // about 33 MB; anything bigger (the mansion's 48,000 bricks) stays instanced as before
      if (n * V <= budget) { budget -= n * V; stat = staticMesh(n, V, I, U, look, solid, front.renderOrder, part); grp.add(stat); }
      var back = null;   // the faint far-face pass is gone (owner, 31 Oct): drawn without a depth test it redrew each pixel dozens of times
      if (false) {
        back = new THREE.InstancedMesh(geo, brandMat(U, look, true), n); back.instanceMatrix = front.instanceMatrix;
        back.frustumCulled = false; back.count = 0; back.renderOrder = 3; grp.add(back);
      }
      return { bi: bi, part: part, n: n, front: front, back: back, laid: laid, attr: at, rank: P.rank[bi], cnt: 0, drop: part === 'brick' || part === 'roof',
        mats: mats, alaid: alaid, stat: stat, V: V, I: I, ready: 0, S: 0, act: -1, look: look, rgb: rgbOf(b, pm, n), cutS: 0 };
    });
    this._bBakeGo();
    // window glow (6.5, Night): a soft gold radial over each pane, alpha (0.22 + 0.10 * pulse) * lit, additive, no depth write
    this._bGlow = null;
    this._bm.forEach(function (rec) {
      if (!rec || rec.part !== 'glass') return;
      var gm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uLit: U.uLitGlass, uPulse: U.uPulse, uCol: { value: v3(C.flash) } },
        vertexShader: 'varying vec3 vL; void main() { vL = position; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
        fragmentShader: ['uniform float uLit; uniform float uPulse; uniform vec3 uCol; varying vec3 vL;',
          'void main() { float d = length(vL.xy) * 2.0; float a = smoothstep(1.0, 0.0, d) * (0.22 + 0.10 * uPulse) * uLit; gl_FragColor = vec4(uCol * a, a); }'].join('\n') });
      var glow = new THREE.InstancedMesh(G.box, gm, rec.n);
      for (var k = 0; k < rec.n; k++) glow.setMatrixAt(k, compose(m.batches[rec.bi].xf, P.perm[rec.bi][k] * 10, 1.9));
      glow.instanceMatrix.needsUpdate = true; glow.frustumCulled = false; glow.renderOrder = 8; glow.name = 'glow:glass'; grp.add(glow);
      self._bGlow = glow;
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
    // the ground ping: a flat gold band (a fixed 100 mm wide, so it reads on a phone where a GL line is one faint pixel), its rectangle
    // rewritten each frame by ringSet()
    var rg0 = new THREE.BufferGeometry(); rg0.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    rg0.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
    var ring = new THREE.Mesh(rg0, new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD[0], GOLD[1], GOLD[2]), transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));   // additive: it glows over the grid rather than covering it
    ring.position.set(cx, y0 + 0.015, cz); ring.renderOrder = 2; ring.frustumCulled = false; grp.add(ring);
    ring.userData.set = function (hw, hd) {   // half width and half depth of the rectangle, band 100 mm wide
      var a = rg0.attributes.position.array, t = 0.1, o = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], i = [[-hw + t, -hd + t], [hw - t, -hd + t], [hw - t, hd - t], [-hw + t, hd - t]];
      for (var q = 0; q < 4; q++) { a[q * 3] = o[q][0]; a[q * 3 + 1] = 0; a[q * 3 + 2] = o[q][1]; a[12 + q * 3] = i[q][0]; a[12 + q * 3 + 1] = 0; a[12 + q * 3 + 2] = i[q][1]; }
      rg0.attributes.position.needsUpdate = true;
    };
    ring.userData.set(w / 2, d / 2);
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
    // cold start (v0.7): before the first real frame, compile the shaders one part a frame (viewer loop), each in its own short task
    if (!this._bDraws) {
      var warm = [null], seen = {}, sig = function (mt) { return Object.keys(mt.defines || {}).sort().join(',') + '|' + (mt.transparent ? 't' : 'o'); };   // the environment together, then one frame per distinct program
      this._bm.forEach(function (rec) {
        if (!rec) return;
        var k = sig(rec.front.material); if (!seen[k]) { seen[k] = 1; warm.push(rec.front); }
        if (rec.stat) { var ks = sig(rec.stat.material); if (!seen[ks]) { seen[ks] = 1; warm.push({ mat: rec.stat.material, V: rec.V, I: rec.I }); } }
      });
      if (this._bGlow) warm.push(this._bGlow); warm.push(hl);
      this._bWarm = warm;
    }
  };
  // one warm-up frame: only the given part is drawn (into the hidden canvas), so its shader program compiles now rather than in the
  // first visible frame. A static part is stood in for by a one-brick mesh with the same material (its own geometry must not be uploaded
  // before it is baked).
  VP._brandWarm = function () {
    var grp = this._bGroup, o = this._bWarm.shift();
    if (!grp || this.lost || !this._brandActive()) { this._bWarm = null; return; }
    if (!this.resize()) { this._bWarm = null; return; }
    var saved = []; grp.children.forEach(function (c) { saved.push([c, c.visible]); });
    var tmp = null, cnt = null, PART = /^(part|static|glow|colour|colourStatic):|^lastBrick$/;
    if (!o) grp.children.forEach(function (c) { if (PART.test(c.name)) c.visible = false; });   // the environment alone
    else {
      grp.children.forEach(function (c) { c.visible = c === o; });
      if (o.isInstancedMesh) { cnt = o.count; o.count = Math.min(1, o.instanceMatrix.count); o.visible = o.count > 0; }
      else if (o.mat) {   // one real brick-sized box in front of the camera, so the fragment program is compiled too (a degenerate mesh draws no pixels)
        var g = new THREE.BufferGeometry(), g0 = H._geoms().box, E = this._bEnvObj;
        ['position', 'normal', 'uv'].forEach(function (k) { g.setAttribute(k, g0.attributes[k]); }); g.setIndex(g0.index);
        var V0 = g0.attributes.position.count, fs = new Float32Array(V0 * 2).fill(1), io = new Float32Array(V0 * 3);
        for (var q = 0; q < V0; q++) { io[q * 3] = E.cx; io[q * 3 + 1] = 1; io[q * 3 + 2] = E.cz; }
        g.setAttribute('aFS', new THREE.BufferAttribute(fs, 2)); g.setAttribute('aIO', new THREE.BufferAttribute(io, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(new Uint8Array(V0 * 3).fill(128), 3, true));
        tmp = new THREE.Mesh(g, o.mat); tmp.position.set(E.cx, 1, E.cz); tmp.frustumCulled = false; grp.add(tmp);
      } else o.visible = true;
    }
    try { this.renderer.render(this.scene, this.camera); } catch (e) {}
    if (tmp) { grp.remove(tmp); tmp.geometry.dispose(); }
    if (o && o.isInstancedMesh && cnt != null) o.count = cnt;
    saved.forEach(function (s) { s[0].visible = s[1]; });
    if (!this._bWarm.length) { this._bWarm = null; this.dirty = true; }
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

  // Level 2 colour layer (owner, 1 Nov 2026): the same parts again in their real colours, laid over the hologram in the same order
  // with the same drop and flash. Landed parts sit in a static mesh that shares the hologram's baked buffers; parts still landing
  // are instances. Made on first use.
  function colourLayer(self, rec) {
    if (rec.C) return rec.C;
    var U = self._bU, n = rec.n, lk = Object.assign({}, rec.look, { edge: [0.55, 0.53, 0.50], edgeK: rec.part === 'brick' ? 0.5 : (rec.look.edgeK == null ? 0.3 : rec.look.edgeK), tone: 0.06 });
    var solid = rec.part !== 'glass', C = { laid: new Float32Array(n).fill(1e9), cnt: 0, S: 0, act: -1, dirty: true, stat: null };
    var gf = new THREE.BufferGeometry(), g0 = rec.front.geometry;
    ['position', 'normal', 'uv'].forEach(function (k) { if (g0.attributes[k]) gf.setAttribute(k, g0.attributes[k]); }); if (g0.index) gf.setIndex(g0.index);
    C.alaid = new Float32Array(n).fill(1e9); C.attr = new THREE.InstancedBufferAttribute(C.alaid, 1); C.attr.setUsage(THREE.DynamicDrawUsage); gf.setAttribute('aLaid', C.attr);
    var f = C.front = new THREE.InstancedMesh(gf, brandMat(U, lk, false, false, solid, false, true), n);
    f.instanceMatrix.setUsage(THREE.DynamicDrawUsage); f.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); f.instanceColor.setUsage(THREE.DynamicDrawUsage);
    f.frustumCulled = false; f.count = 0; f.visible = false; f.renderOrder = rec.front.renderOrder + 1; f.name = 'colour:' + rec.part; self._bGroup.add(f);
    if (rec.stat) {
      var sg = rec.stat.geometry, g2 = new THREE.BufferGeometry();
      ['position', 'normal', 'uv', 'aFS', 'aIO', 'aCol'].forEach(function (k) { g2.setAttribute(k, sg.attributes[k]); }); g2.setIndex(sg.index); g2.setDrawRange(0, 0);
      C.stat = new THREE.Mesh(g2, brandMat(U, lk, false, false, solid, true, true)); C.stat.frustumCulled = false; C.stat.visible = false;
      C.stat.renderOrder = rec.front.renderOrder + 1; C.stat.name = 'colourStatic:' + rec.part; self._bGroup.add(C.stat);
    }
    return (rec.C = C);
  }
  function syncColour(rec, now) {
    var C = rec.C, S = Math.min(C.S, C.cnt), lim = rec.stat && rec.ready >= rec.n ? C.cnt : 0;
    while (S < lim && C.laid[S] + 2.05 <= now) S++;
    if (S === C.S && C.act === C.cnt && !C.dirty) return;
    var m = C.cnt - S, f = C.front;
    if (m > 0) {
      f.instanceMatrix.array.set(rec.mats.subarray(S * 16, C.cnt * 16)); f.instanceMatrix.updateRange.offset = 0; f.instanceMatrix.updateRange.count = m * 16; f.instanceMatrix.needsUpdate = true;
      var ic = f.instanceColor.array; for (var k = S; k < C.cnt; k++) { var o = (k - S) * 3; ic[o] = rec.rgb[k * 3] / 255; ic[o + 1] = rec.rgb[k * 3 + 1] / 255; ic[o + 2] = rec.rgb[k * 3 + 2] / 255; }
      f.instanceColor.updateRange.offset = 0; f.instanceColor.updateRange.count = m * 3; f.instanceColor.needsUpdate = true;
      C.alaid.set(C.laid.subarray(S, C.cnt)); C.attr.updateRange.offset = 0; C.attr.updateRange.count = m; C.attr.needsUpdate = true;
    }
    f.count = m; f.visible = m > 0;
    if (C.stat) { C.stat.geometry.setDrawRange(0, S * rec.I); C.stat.visible = S > 0; }
    if (rec.cutS !== S) { rec.cutS = S; rec.dirtyA = true; }   // the hologram stops under what is now in colour
    C.S = S; C.act = C.cnt; C.dirty = false;
  }
  // how many parts of each kind are in colour for equity share e; new ones get their lay time (stagger as Level 1)
  VP._brandColour = function (on, e, now, inst) {
    var self = this, P = H.brandPlan(this.model), Vc = H.brandColourUnits(P, e), V0 = this._bVc == null ? 0 : this._bVc;
    var add = Math.max(0, Vc - V0), stp = (!inst && add > 0 && add <= 60) ? Math.min(0.12, 0.9 / add) : 0;
    (this._bm || []).forEach(function (rec) {
      if (!rec) return;
      if (!on) { if (rec.C) { rec.C.front.visible = false; if (rec.C.stat) rec.C.stat.visible = false; rec.C.cnt = 0; rec.C.S = 0; rec.C.laid.fill(1e9); rec.C.dirty = true; } if (rec.cutS) { rec.cutS = 0; rec.dirtyA = true; } return; }
      var C = colourLayer(self, rec), k1 = lowerBound(P.rank2[rec.bi], Vc), k0 = C.cnt;
      if (k1 > k0) { for (var k = k0; k < k1; k++) C.laid[k] = inst ? -1000 : now + Math.floor(Math.max(0, P.rank2[rec.bi][k] - V0)) * stp; C.dirty = true; }
      else if (k1 < k0) { for (var k2 = k1; k2 < k0; k2++) C.laid[k2] = 1e9; C.dirty = true; }
      C.cnt = k1; syncColour(rec, now);
    });
    this._bVc = on ? Vc : null;
    return Vc;
  };

  // apply(): the Level 1 build under the brand look
  VP._brandApplyAll = function () {
    var m = this.model, F = m.focus;
    if (this._bModel !== m) this._brandBuild();
    if (this._bMode !== this.mode) { this._bPrimed = false; this._bMode = this.mode; this._bEq = null; }   // a new level: the hologram shows at once, the colour lays from 0
    this._brandEnv(true);
    var P = H.brandPlan(m), IDLE = H._IDLE_PLANE;
    this.batches.forEach(function (B, bi) {   // flats: the rest of the block, a faint silhouette
      if (B.main) B.main.visible = P.parts[bi] === 'ctx' && B.b.hideAfter >= 2;
    });
    if (this.edges) { this.edges.visible = !F && (this.mode === 'build' || this.mode === 'site'); this.edges.material.clippingPlanes = [IDLE]; this.edges.material.opacity = 0.34; }   // the finished house as a faint wire
    if (this.focusBox) this.focusBox.visible = true;
    this._brandApply();
    this._lastMode = this.mode;
    this.dirty = true; this.wake();
  };

  // counts, per-brick stamps and the frame's uniforms (called by apply() and every animated frame)
  VP._brandApply = function () {
    var m = this.model; if (!m || !this._bm) return;
    var L2 = this.mode === 'equity' || this.mode === 'complete';
    var P = H.brandPlan(m), R = P.rows, p = this.mode === 'site' ? 0 : (L2 ? 1 : this.p), now = this._bNow(), motion = reduced(), red = motion || !!this._bLite, U = this._bU, E = this._bEnvObj;
    var V = units(P, p), V0 = this._bV == null ? -1 : this._bV, inst = motion || !this._bPrimed;   // lite keeps the drop and flash, not the ambient motion
    var add = Math.max(0, V - Math.max(V0, 0)), stp = (!inst && add > 0 && add <= 60) ? Math.min(0.12, 0.9 / add) : 0;
    var open = !!this._bOpen; this._bOpen = false;
    if (open && !inst && add > 0) stp = Math.min(0.04, 1.2 / add);   // the opening course: each brick 40 ms after the last, the whole course started within 1.2 s
    if (V !== V0) {
      this._bm.forEach(function (rec) {
        if (!rec) return;
        var k1 = lowerBound(rec.rank, V), k0 = rec.cnt;
        if (k1 > k0) {
          for (var k = k0; k < k1; k++) {
            var glaze = rec.part === 'glass' || rec.part === 'door' || rec.part === 'frame';
            rec.laid[k] = (inst || glaze) ? -1000 : now + Math.floor(Math.max(0, rec.rank[k] - Math.max(V0, 0))) * stp;
          }
          rec.dirtyA = true;
        } else if (k1 < k0) {   // un-laying is instant
          for (var k2 = k1; k2 < k0; k2++) rec.laid[k2] = 1e9;
          rec.dirtyA = true;
        }
        rec.cnt = k1;
      });
      this._bV = V;
      if (V > V0) this._bGrow = now;
    }
    this._bPrimed = true;
    // Level 2: the parts in full colour follow the equity share of the home's value (eased by the frame loop, from 0 when the level opens)
    var eqS = L2 ? (this._bEq == null ? this.eq : this._bEq) : 0, Vc = this._brandColour(L2, eqS, now, motion);
    this._bm.forEach(function (rec) { if (rec) syncPart(rec, now); });
    var st = H.brandStats(m, p), L = st.bricksLaid, pulse = red ? 0.5 : 0.5 + 0.5 * Math.sin(performance.now() * 0.002244);
    // the last brick laid: stays lit pale gold, 14% proud; shown once it has landed
    var hl = this._bHL, last = null;
    if (L > 0 && !L2) {
      var j = L - 1, rec = this._bm[P.bBi[j]], kk = P.bK[j], b = m.batches[P.bBi[j]], o = P.perm[P.bBi[j]][kk] * 10, xf = b.xf;
      if (this._bLastJ !== j) {
        var mm = new THREE.Matrix4(), e = new THREE.Euler(xf[o + 6], xf[o + 7], xf[o + 8], 'YZX');
        mm.compose(new THREE.Vector3(xf[o], xf[o + 1], xf[o + 2]), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(xf[o + 3] * 1.14, xf[o + 4] * 1.14, xf[o + 5] * 1.14));
        hl.matrix.copy(mm); hl.matrixWorldNeedsUpdate = true; this._bLastJ = j;
      }
      var landed = motion || (rec && now >= rec.laid[kk] + 0.9);
      last = { n: L, x: xf[o], y: xf[o + 1], z: xf[o + 2], shown: !!landed };
      hl.visible = !!landed;
    } else { hl.visible = false; this._bLastJ = -1; }
    // stage uniforms
    U.uNow.value = now; U.uPulse.value = pulse; U.uBuilt.value = seg(p, 0.05, 1);
    U.uFadeGlaze.value = seg(p, 0.88, 0.93); U.uLitGlass.value = seg(p, 0.93, 0.96); U.uLitDoor.value = seg(p, 0.96, 1);
    if (this.mode === 'equity') { U.uLitGlass.value = 0; U.uLitDoor.value = 0; }   // the lights go on when the mortgage is paid off
    var cy = Vc <= 0 ? R.y0 : (Vc <= P.N ? P.top[Vc - 1] : (P.T ? P.tileTop[Math.min(P.T - 1, Vc - P.N - 1)] : R.y1));   // top of the last part in colour
    var top = Math.max(R.y1, R.y0 + 1), span = top - R.y0;
    U.uSweepOn.value = (red || this._bLite) ? 0 : 1;
    U.uSweep.value = R.y0 + ((now * 20 * CH) % (span + 40 * CH)) - 10 * CH;   // 20 courses a second, repeating
    // environment
    var sb = seg(p, 0.005, 0.03), fnd = seg(p, 0, 0.03);
    E.site.material.opacity = 0.55 * sb; E.site.visible = sb > 0;
    E.fline.material.opacity = 0.75 * fnd; E.fline.visible = fnd > 0; E.fillMat.opacity = 0.14 * fnd; E.fills.forEach(function (f) { f.visible = fnd > 0; });
    // the ground ping (E15, owner 1 Nov: "a subtle rectangle spreading out around the house, like on the net worth 3D viewport"): gold, every
    // 2.8 s, 0.45 to 0, in lite too (Pedro A2); reduced motion keeps a still rectangle half way out
    var ping = motion ? 0.5 : (performance.now() % 2800) / 2800, rg = ping * E.big * 0.625;
    E.ring.visible = p > 0.05 && !L2; E.ring.userData.set(E.w / 2 + rg, E.d / 2 + rg); E.ring.material.opacity = motion ? 0.22 : (1 - ping) * 0.45;
    if (E.rafters) { var nT = Math.ceil(seg(p, 0.60, 0.80) * 18); E.rafters.visible = nT > 0; E.rafters.geometry.setDrawRange(0, nT * E.rafters.userData.per); }
    var pa = L2 ? (eqS > 0 && eqS < 1 ? 1 : 0) : 1 - seg(p, 0.97, 1), sy = L2 ? cy : st.y;
    E.slice.visible = pa > 0 && p > 0; E.slice.position.y = sy; E.sFill.material.opacity = 0.11 * pa; E.sLine.material.opacity = 0.95 * pa;
    this._bPulse = pulse;
    this._bInfo = { mode: this.mode, eq: eqS, colour: L2 ? Math.min(P.N + P.T, Vc) : 0, colourTotal: P.N + P.T, p: p, row: st.row, rows: st.rows, y: sy, bricks: L, bricksTotal: st.bricksTotal, tiles: st.tilesLaid, tilesTotal: st.tilesTotal, stage: st.stage,
      sliceA: pa, keys: st.keys && !L2, last: last, pulse: pulse, door: P.door, cx: E.cx, cz: E.cz, top: m.height, lite: !!this._bLite, reduced: motion };
    // auto orbit (6.6.8): drifts round slowly, stops at a touch, resumes after 2.5 s idle; off for reduced motion
    var ctl = this.controls;
    if (red || this._bLite) ctl.autoRotate = false;
    else if (!ctl.autoRotate && !this._bDrag && performance.now() - (this._bTouch || 0) > 2500) { ctl.autoRotate = true; ctl.autoRotateSpeed = 0.12 * 60 / (2 * Math.PI); }
    this.dirty = true;
  };

  // frame loop: ease the displayed progress toward the target, then redraw (only while on screen)
  VP._brandTick = function () {
    this._bCalm = false;
    if (!this._brandActive() || !this._bm) { this._bTickT = 0; return false; }
    if (this._bVis === false || (typeof document !== 'undefined' && document.hidden)) { this._bTickT = 0; return false; }
    var t = performance.now(), raw = this._bTickT ? (t - this._bTickT) / 1000 : 1 / 60; this._bTickT = t;
    if (!this._bT0) this._bT0 = t;
    // lite (6.10, tightened 31 Oct after "Page unresponsive"): straight away on a software-drawn GPU (SwiftShader, llvmpipe, Microsoft Basic
    // Render), or once the first frames after a one-second warm-up average more than 50 ms each. Lite: pixel ratio 1, no ambient pulse,
    // sweep, ring or auto orbit, frames spaced by the loop, and no drawing at all once the house has settled.
    if (this._bSoft == null) this._bSoft = softGL(this.renderer);
    if (!this._bLite && (this._bSoft || (t - this._bT0 > 1000 && (this._bDraws || 0) > 4 && this._bCost > 50))) {
      this._bLite = true; var w = this.el.clientWidth, h = this.el.clientHeight;
      if (w > 2 && h > 2) { this.renderer.setPixelRatio(this._bSoft ? 0.75 : 1); this.renderer.setSize(w, h, false); }   // software GL: three quarters resolution, a third of the work
      this.controls.autoRotate = false;
    }
    if (this._bLite && !this.dirty && this._brandSettled() && !this._bDrag && this._bWasSettled) {   // still and unchanged: only the ground ping moves (at the lite pace)
      var ringOn = this._bEnvObj && this._bEnvObj.ring.visible && !reduced() && this._bVis !== false;
      this._bPingPace = !!ringOn;
      if (ringOn) { this._brandApply(); return true; }
      return false;
    }
    this._bPingPace = false;
    var dt = Math.min(this._bLite ? 0.5 : 0.05, raw);
    var target = this._bTarget == null ? this.p : this._bTarget, red = reduced(), calm = red;
    if (red) this.p = target;
    else if (this.p !== target) { this.p += (target - this.p) * Math.min(1, dt * 0.55); if (Math.abs(target - this.p) < 0.0003) this.p = target; }   // slow motion (owner, 31 Oct): a deposit builds over about five seconds
    if (this.mode === 'equity' || this.mode === 'complete') {   // Level 2: the colour bricks lay as the equity share eases up, from 0 when the level opens
      if (this._bEq == null) this._bEq = red ? this.eq : 0;
      if (red) this._bEq = this.eq;
      else if (this._bEq !== this.eq) { this._bEq += (this.eq - this._bEq) * Math.min(1, dt * 0.55); if (Math.abs(this.eq - this._bEq) < 0.0003) this._bEq = this.eq; }
    }
    this._brandApply();
    this._bWasSettled = this._brandSettled();
    // pixel ratio (E14): full at rest for sharp hairlines; a phone drops to 1.25 while bricks land, the camera flies or a finger is down, and
    // is back about 300 ms after the last of those (the buffer is resized only at those two moments)
    var busy = !this._bWasSettled || this._bDrag || !!this._fly;
    if (busy) { this._bBusyT = t; if (!this._bBusy) { this._bBusy = true; if (this._setDpr) this._setDpr(); } }
    else if (this._bBusy && t - (this._bBusyT || 0) > 300) { this._bBusy = false; if (this._setDpr) this._setDpr(); }
    // at rest (nothing landing, no touch for 1.5 s, no camera fly): only the slow pulse, sweep, ring and orbit move, and they run on the
    // clock, so the frame loop draws them at most 30 times a second (a 120 Hz phone was drawing four times as often for the same look)
    this._bCalm = !red && !this._bLite && this._bWasSettled && !this._bDrag && !this._fly && !this._anim && t - (this._bTouch || 0) > 1500;
    if (calm || this._bLite) return !this._bWasSettled || !!this._fly;
    return true;   // pulse, sweep and ring keep the stage alive
  };
  VP._brandSettled = function () {
    var target = this._bTarget == null ? this.p : this._bTarget;
    if (Math.abs(target - this.p) > 1e-9) return false;
    if ((this.mode === 'equity' || this.mode === 'complete') && (this._bEq == null || Math.abs(this._bEq - this.eq) > 1e-9)) return false;
    var now = this._bNow(), busy = false;
    (this._bm || []).forEach(function (rec) {
      if (rec && rec.cnt > 0 && rec.laid[rec.cnt - 1] > -999 && now < rec.laid[rec.cnt - 1] + 2.1) busy = true;
      if (rec && rec.C && rec.C.cnt > 0 && rec.C.laid[rec.C.cnt - 1] > -999 && now < rec.C.laid[rec.C.cnt - 1] + 2.1) busy = true;
    });
    return !busy;
  };
  VP.brandInfo = function () { return this._brandActive() ? this._bInfo : null; };
  }   // end boot()
  if (H.Viewer) boot(); else H._bootBrand = boot;
})(HB3D);
