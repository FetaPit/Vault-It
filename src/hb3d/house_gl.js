// ═══════════════════════════════════════════════════════════════
// HB3D HOUSE_GL — the house builder drawn the brand book's way (v0.7 final round, A2; owner, 1 Nov 2026: "runs on all devices
// smoothly and works just like on the brand book"). Raw WebGL, no three.js: one shader program, one instanced draw per pass,
// every brick a unit cube placed by per-instance attributes, its drop, flash, pulse and sweep animated in the shader from a
// per-brick time stamp. The same models, laying plan (brandPlan), Level 1 / Level 2 rules and HUD maths (brandStats) as before:
// only the drawing changed. The old three.js viewer (viewer.js + brand.js) stays behind ?house=legacy for one release.
//
// Units: the shader and the 2D layers work in COURSES (1 = 75 mm, the brand book's unit), so the brand book's constants apply
// as written (drop 6 units, sweep 20 courses a second, bevel .07, ping 75 units); the API (project, rowInfo, brandInfo) speaks
// metres like the rest of the app. Layers in the stage, bottom to top: a 2D canvas (ground glow, grid, site boundary, footprint,
// ping, wire of the finished house, rafters), the GL canvas (bricks, transparent, premultiplied), a 2D canvas (gold slice,
// window glow). The ROW tag, last-brick ring and BRICK # pill are DOM overlays in index.html, placed with project().
//
// Lazy laying (owner, 1 Nov): on load everything below the newest course is stamped settled (one upload, one draw) and only that
// course lays itself; a deposit stamps only the new bricks, course after course, with the brand book's timings (drop 380 ms,
// stagger min(120, 900/N) ms, none over 60 at once); a house-type switch fills new instance buffers (no per-brick objects) and
// opens the new type the same way, so there is no main-thread task over 100 ms.
// ═══════════════════════════════════════════════════════════════
var HB3D = (typeof HB3D !== 'undefined' && HB3D) || {};
(function (H) {
  'use strict';
  var CH = 0.075, K = 1 / CH;                       // metres -> courses
  var C = H.BRAND_C;                                // Night palette (THG.dark), kept in Daylight too (owner, 1 Nov)
  var TEAL = [68, 192, 185], GOLD = [232, 197, 106], RAFTER = 'rgba(120,230,222,.85)', WIRE = 'rgba(68,192,185,.34)';
  var TYPE = { brick: 1, roof: 2, trim: 3, frame: 4, glass: 5, door: 6, gold: 7, ctx: 8 };
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + clamp(a, 0, 1).toFixed(3) + ')'; }
  var lowerBound = H._lowerBound;
  var mqRM = null;
  function reduced() {
    try { if (!mqRM && window.matchMedia) mqRM = window.matchMedia('(prefers-reduced-motion: reduce)'); return (document.body && document.body.classList.contains('reduced-motion')) || !!(mqRM && mqRM.matches); } catch (e) { return false; }
  }

  // ── shaders (brand book VS_SRC / FS_SRC, plus the kit's per-instance rotation, Level 2 colour and the flats' context) ──
  var VS = [
    'attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUV;',
    'attribute vec3 aOff; attribute vec3 aSize; attribute vec3 aRot; attribute vec4 aMeta; attribute vec3 aCol; attribute vec2 aTime;',
    'uniform mat4 uVP; uniform float uNow; uniform float uLast; uniform float uFlash; uniform float uGlaze; uniform float uVc; uniform float uFocal;',
    'varying vec3 vN; varying vec2 vUV; varying vec2 vFS; varying vec3 vW; varying float vFlash; varying float vAlpha; varying float vType; varying float vSeed; varying float vLast; varying vec3 vCol; varying float vColOn; varying float vPx;',
    'void main() {',
    '  float t = aMeta.x, st = aTime.x; float vis = 1.0, fl = 0.0, last = 0.0, drop = 0.0;',
    '  if (st > 1e8) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',   // not laid yet
    '  float age = uNow - st;',
    '  if (age < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',  // stamped for later in the stagger
    '  if (t < 2.5) {',                                                      // bricks and tiles: drop in, fade in, gold flash
    '    float d = clamp(age / 0.76, 0.0, 1.0); vis = smoothstep(0.0, 0.5, d); float e = 1.0 - d; drop = e * e * e * (t < 1.5 ? 6.0 : 5.0);',   // owner, 2 Nov 2026: twice the brand book's 0.38 s ("too fast")
    '    fl = uFlash * (1.0 - clamp(age / 2.2, 0.0, 1.0));',   // flash 2.2 s (brand book 1.1 s), the same override
    '    if (abs(aTime.y - uLast) < 0.5) last = 1.0;',
    '  } else if (t > 3.5 && t < 6.5) {',                                    // glazing and doors: in with the glazing stage
    '    vis = uGlaze; if (vis <= 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }',
    '  } else if (t < 7.5) {',                                               // trim and gold: appear in place
    '    vis = smoothstep(0.0, 0.5, clamp(age / 0.76, 0.0, 1.0));',
    '  }',
    '  float sa = sin(aRot.x), ca = cos(aRot.x), sb = sin(aRot.y), cb = cos(aRot.y), sg = sin(aRot.z), cg = cos(aRot.z);',
    '  mat3 R = mat3(cb * cg, sg, -sb * cg,  sb * sa - cb * sg * ca, cg * ca, sb * sg * ca + cb * sa,  cb * sg * sa + sb * ca, -cg * sa, cb * ca - sb * sg * sa);',   // Ry * Rz * Rx (YZX, as the kit)
    '  vec3 p = aOff + R * (aPos * aSize * (1.0 + 0.14 * last));',
    '  p.y += drop;',
    '  vFlash = fl; vAlpha = vis; vN = R * aNrm; vUV = aUV; vW = p; vType = t; vLast = last; vSeed = aMeta.z; vCol = aCol;',
    '  vColOn = (uVc >= 0.0 && aMeta.w < uVc) ? 1.0 : 0.0;',
    '  vec3 an = abs(aNrm);',
    '  vFS = an.x > 0.5 ? aSize.zy : (an.y > 0.5 ? aSize.xz : aSize.xy);',
    '  gl_Position = uVP * vec4(p, 1.0);',
    '  vPx = max(gl_Position.w, 0.5) / uFocal;',   // world courses a device pixel at this depth
    '}'].join('\n');
  var FS = [
    'precision mediump float;',
    'varying vec3 vN; varying vec2 vUV; varying vec2 vFS; varying vec3 vW; varying float vFlash; varying float vAlpha; varying float vType; varying float vSeed; varying float vLast; varying vec3 vCol; varying float vColOn; varying float vPx;',
    'uniform vec3 uBrick; uniform vec3 uTrim; uniform vec3 uTile; uniform vec3 uFrame; uniform vec3 uGlass; uniform vec3 uGlassLit; uniform vec3 uDoor; uniform vec3 uEdge; uniform vec3 uSheen; uniform vec3 uFlashCol;',
    'uniform float uPulse; uniform float uBuilt; uniform float uSweep; uniform float uSweepOn; uniform float uBack; uniform float uFrontA; uniform float uBackA; uniform float uShMin; uniform float uEdgeK; uniform vec2 uLit; uniform highp float uVc;',
    'void main() {',
    '  vec3 L = normalize(vec3(-0.45, 0.7, 0.55)); float lt = max(0.0, dot(normalize(vN), L)); float sh = uShMin + (1.0 - uShMin) * lt;',
    '  float t = vType; vec3 base;',
    '  if (t < 2.5 && t > 1.5) base = uTile * (0.94 + 0.12 * vSeed); else if (t < 2.5) base = uBrick * (0.9 + 0.2 * vSeed);',
    '  else if (t < 3.5) base = uTrim; else if (t < 4.5) base = uFrame; else if (t < 5.5) base = mix(uGlass, uGlassLit, uLit.x);',
    '  else if (t < 6.5) base = mix(uDoor, uFlashCol, uLit.y); else if (t < 7.5) base = uFlashCol; else base = uBrick;',
    '  if (vColOn > 0.5) base = vCol * (0.92 + 0.16 * vSeed);',                       // Level 2: the paid share in its real colours
    '  vec3 col = base * sh;',
    '  vec2 dd = min(vUV, 1.0 - vUV) * vFS; float ed = min(dd.x, dd.y);',
    '  float bw = max(0.07, vPx * 1.5); float bev = smoothstep(0.0, bw, ed);',   // the bevel never thinner than a pixel and a half (vPx: courses a pixel at this depth): no moire on the long walls (Pedro, 2 Nov)
    '  col = mix(col, uEdge * (0.6 + 0.4 * sh), (1.0 - bev) * uEdgeK);',
    '  float fl = clamp(vFlash, 0.0, 1.0); col = mix(col, uFlashCol, fl * 0.9);',
    '  if (vLast > 0.5) { col = mix(col, vec3(1.0, 0.94, 0.64), 0.88) * (1.08 + 0.3 * uPulse); }',
    '  col *= 0.95 + 0.1 * uPulse;',
    '  float s = 1.0 - clamp(abs(vW.y - uSweep) / 6.0, 0.0, 1.0); col = mix(col, uSheen, s * 0.5 * uSweepOn * (1.0 - vColOn));',
    '  float a;',
    '  if (t > 7.5) a = 0.06 * vAlpha;',                                                 // flats: the rest of the block, a faint silhouette
    '  else if (uBack > 0.5) a = uBackA * vAlpha;',
    '  else if (t > 4.5 && t < 5.5) a = 0.8 * vAlpha;',
    '  else a = (uFrontA + 0.06 * uPulse * uBuilt + 0.2 * fl) * vAlpha;',
    '  if (vColOn > 0.5) a = uBack > 0.5 ? 0.0 : 0.985 * vAlpha; else if (uVc >= 0.0 && uBack < 0.5 && t < 7.5) a *= 0.42;',   // Level 2: colour solid, the rest a fainter hologram
    '  if (vLast > 0.5) a = 1.0;',
    '  gl_FragColor = vec4(col * a, a);',
    '}'].join('\n');

  // ── geometry: unit shapes, 32-byte vertices (pos, nrm, uv), counter-clockwise from outside ──
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function quad(out, P, n, uv) {   // two triangles, wound to face n
    var tri = [[0, 1, 2], [0, 2, 3]];
    tri.forEach(function (t) {
      var p0 = P[t[0]], p1 = P[t[1]], p2 = P[t[2]], cr = cross([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]);
      var tt = (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2]) > 0 ? t : [t[0], t[2], t[1]];
      tt.forEach(function (k) { out.push(P[k][0], P[k][1], P[k][2], n[0], n[1], n[2], uv[k][0], uv[k][1]); });
    });
  }
  var UV4 = [[0, 0], [1, 0], [1, 1], [0, 1]], UVC = [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5], [0.5, 0.5]];
  function shapes() {
    var box = [], cyl = [], sph = [], tri = [];
    [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, -1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]].forEach(function (f) {
      var n = f[0], a = f[1], b = f[2], P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (q) { return [(n[0] + a[0] * q[0] + b[0] * q[1]) * 0.5, (n[1] + a[1] * q[0] + b[1] * q[1]) * 0.5, (n[2] + a[2] * q[0] + b[2] * q[1]) * 0.5]; });
      quad(box, P, n, UV4);
    });
    var NS = 12;   // cylinder along y, radius .5 (the kit's cyl)
    for (var i = 0; i < NS; i++) {
      var a0 = i / NS * Math.PI * 2, a1 = (i + 1) / NS * Math.PI * 2, c0 = Math.cos(a0) * 0.5, s0 = Math.sin(a0) * 0.5, c1 = Math.cos(a1) * 0.5, s1 = Math.sin(a1) * 0.5;
      var nm = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)];
      quad(cyl, [[c0, -0.5, s0], [c1, -0.5, s1], [c1, 0.5, s1], [c0, 0.5, s0]], nm, UVC);
      quad(cyl, [[0, 0.5, 0], [c0, 0.5, s0], [c1, 0.5, s1], [0, 0.5, 0]], [0, 1, 0], UVC);
      quad(cyl, [[0, -0.5, 0], [c1, -0.5, s1], [c0, -0.5, s0], [0, -0.5, 0]], [0, -1, 0], UVC);
    }
    // sphere: icosahedron, one subdivision, radius .5
    var t = (1 + Math.sqrt(5)) / 2, V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(function (v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; });
    var F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    var mid = function (a, b) { var m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], l = Math.hypot(m[0], m[1], m[2]); return [m[0] / l, m[1] / l, m[2] / l]; };
    var pushTri = function (a, b, c) { [a, b, c].forEach(function (v) { sph.push(v[0] * 0.5, v[1] * 0.5, v[2] * 0.5, v[0], v[1], v[2], 0.5, 0.5); }); };
    F.forEach(function (f) { var a = V[f[0]], b = V[f[1]], c = V[f[2]], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); pushTri(a, ab, ca); pushTri(ab, b, bc); pushTri(ca, bc, c); pushTri(ab, bc, ca); });
    // triangular prism: base (-.5,-.5)..(.5,-.5), apex (0,.5), depth +-.5 (the kit's tri)
    var A = [-0.5, -0.5], B = [0.5, -0.5], Cc = [0, 0.5], sl = Math.hypot(1, 0.5);
    quad(tri, [[A[0], A[1], 0.5], [B[0], B[1], 0.5], [Cc[0], Cc[1], 0.5], [A[0], A[1], 0.5]], [0, 0, 1], UVC);
    quad(tri, [[A[0], A[1], -0.5], [Cc[0], Cc[1], -0.5], [B[0], B[1], -0.5], [A[0], A[1], -0.5]], [0, 0, -1], UVC);
    quad(tri, [[A[0], A[1], -0.5], [B[0], B[1], -0.5], [B[0], B[1], 0.5], [A[0], A[1], 0.5]], [0, -1, 0], UV4);
    quad(tri, [[B[0], B[1], -0.5], [Cc[0], Cc[1], -0.5], [Cc[0], Cc[1], 0.5], [B[0], B[1], 0.5]], [1 / sl, 0.5 / sl, 0], UV4);
    quad(tri, [[Cc[0], Cc[1], -0.5], [A[0], A[1], -0.5], [A[0], A[1], 0.5], [Cc[0], Cc[1], 0.5]], [-1 / sl, 0.5 / sl, 0], UV4);
    return { box: new Float32Array(box), cyl: new Float32Array(cyl), sph: new Float32Array(sph), tri: new Float32Array(tri) };
  }

  // ── GL context and program (one for the stage) ──
  var UNIFORMS = ['uVP', 'uFocal', 'uNow', 'uLast', 'uFlash', 'uGlaze', 'uVc', 'uBrick', 'uTrim', 'uTile', 'uFrame', 'uGlass', 'uGlassLit', 'uDoor', 'uEdge', 'uSheen', 'uFlashCol', 'uPulse', 'uBuilt', 'uSweep', 'uSweepOn', 'uBack', 'uFrontA', 'uBackA', 'uShMin', 'uEdgeK', 'uLit'];
  var ATTRS = ['aPos', 'aNrm', 'aUV', 'aOff', 'aSize', 'aRot', 'aMeta', 'aCol', 'aTime'];
  function makeGL(cv) {
    var opts = { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    var gl = cv.getContext('webgl2', opts) || cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
    if (!gl) return null;
    var g2 = (typeof WebGL2RenderingContext !== 'undefined') && (gl instanceof WebGL2RenderingContext), ext = g2 ? null : gl.getExtension('ANGLE_instanced_arrays');
    if (!g2 && !ext) return null;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('house_gl shader: ' + gl.getShaderInfoLog(s)); return s; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('house_gl program: ' + gl.getProgramInfoLog(pr));
    var R = { gl: gl, pr: pr, g2: g2, ext: ext, A: {}, U: {}, geo: {}, geoN: {} };
    ATTRS.forEach(function (n) { R.A[n] = gl.getAttribLocation(pr, n); });
    UNIFORMS.forEach(function (n) { R.U[n] = gl.getUniformLocation(pr, n); });
    var S = shapes();
    Object.keys(S).forEach(function (k) { var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, S[k], gl.STATIC_DRAW); R.geo[k] = b; R.geoN[k] = S[k].length / 8; });
    R.div = function (loc, d) { if (loc < 0) return; if (g2) gl.vertexAttribDivisor(loc, d); else ext.vertexAttribDivisorANGLE(loc, d); };
    R.drawInst = function (first, count, n) { if (g2) gl.drawArraysInstanced(gl.TRIANGLES, first, count, n); else ext.drawArraysInstancedANGLE(gl.TRIANGLES, first, count, n); };
    return R;
  }
  var _sup = null;
  function supported() {
    if (_sup !== null) return _sup;
    try { var c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
      _sup = !!gl && (((typeof WebGL2RenderingContext !== 'undefined') && gl instanceof WebGL2RenderingContext) || !!gl.getExtension('ANGLE_instanced_arrays')); } catch (e) { _sup = false; }
    return _sup;
  }
  function softGL(gl) {
    try { var ext = gl.getExtension('WEBGL_debug_renderer_info'), name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(name || '')); } catch (e) { return false; }
  }

  // ── the house as instance buffers (built once per model; a Float32Array fill, no per-brick objects) ──
  var STRIDE = 16;   // floats an instance: off 3, size 3, rot 3, meta 4 (type, rank, seed, rank2), col 3
  var GROUPS = ['box', 'cyl', 'sph', 'tri', 'box-glass', 'cyl-glass', 'sph-glass', 'tri-glass'];
  function buildHouse(m) {
    var P = H.brandPlan(m), nAll = 0, recs = [];
    m.batches.forEach(function (b, bi) {
      var part = P.parts[bi]; if (part === 'none') return;
      if (part === 'ctx' && b.hideAfter < 2) return;
      nAll += b.count; recs.push({ bi: bi, part: part, type: TYPE[part] || TYPE.trim, n: b.count, group: (b.shape === 'cyl' || b.shape === 'sph' || b.shape === 'tri' ? b.shape : 'box') + (part === 'glass' ? '-glass' : '') });
    });
    var data = new Float32Array(nAll * STRIDE), stamp = new Float32Array(nAll * 2), at = 0, ranges = {}, wlist = [];
    GROUPS.forEach(function (g) {
      var start = at;
      recs.forEach(function (rec) {
        if (rec.group !== g) return;
        var b = m.batches[rec.bi], xf = b.xf, pm = P.perm[rec.bi], rank = P.rank[rec.bi], rank2 = P.rank2[rec.bi], ctx = rec.part === 'ctx', n = rec.n;
        rec.base = at; rec.rank = ctx ? null : rank;
        for (var k = 0; k < n; k++) {
          var i = ctx ? k : pm[k], o = i * 10, j = (at + k) * STRIDE, hex = H.brandColourOf(b, i);
          data[j] = xf[o] * K; data[j + 1] = xf[o + 1] * K; data[j + 2] = xf[o + 2] * K;
          data[j + 3] = xf[o + 3] * K; data[j + 4] = xf[o + 4] * K; data[j + 5] = xf[o + 5] * K;
          data[j + 6] = xf[o + 6]; data[j + 7] = xf[o + 7]; data[j + 8] = xf[o + 8];
          var sd = Math.sin((xf[o] + xf[o + 1] * 1.3) * 12.9898 + (xf[o + 2] + xf[o] * 0.7) * 78.233) * 43758.5453;
          data[j + 9] = rec.type; data[j + 10] = ctx ? -1e9 : rank[k]; data[j + 11] = sd - Math.floor(sd); data[j + 12] = ctx ? 1e15 : rank2[k];
          data[j + 13] = ((hex >> 16) & 255) / 255; data[j + 14] = ((hex >> 8) & 255) / 255; data[j + 15] = (hex & 255) / 255;
          stamp[(at + k) * 2] = ctx ? -1e9 : 1e9; stamp[(at + k) * 2 + 1] = at + k;
          if (rec.part === 'glass') wlist.push([xf[o] * K, xf[o + 1] * K, xf[o + 2] * K, Math.max(xf[o + 3], xf[o + 5]) * K, xf[o + 4] * K]);
        }
        at += n;
      });
      if (at > start) ranges[g] = [start, at - start];
    });
    // the finished house as a wire (viewer.js), rafters (brand.js) and the footprint, in courses
    var wire = [];
    (m.envelope || []).forEach(function (e) {
      var x0 = e[0] * K, y0 = e[1] * K, z0 = e[2] * K, x1 = e[3] * K, y1 = e[4] * K, z1 = e[5] * K, sh = e[6], s2 = function (a, b) { wire.push([a[0], a[1], a[2], b[0], b[1], b[2]]); };
      if (sh && (sh.k === 'gable' || sh.k === 'hip')) {
        var X = sh.axis === 'x', zm = (z0 + z1) / 2, xm = (x0 + x1) / 2, hh = Math.min(x1 - x0, z1 - z0) / 2;
        var h0 = sh.k === 'hip' && (!sh.hips || sh.hips[0]) ? hh : 0, h1 = sh.k === 'hip' && (!sh.hips || sh.hips[1]) ? hh : 0;
        var r0 = X ? [x0 + h0, y1, zm] : [xm, y1, z0 + h0], r1 = X ? [x1 - h1, y1, zm] : [xm, y1, z1 - h1];
        var c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
        for (var q = 0; q < 4; q++) s2(c[q], c[(q + 1) % 4]);
        s2(r0, r1);
        if (X) { s2(c[0], r0); s2(c[3], r0); s2(c[1], r1); s2(c[2], r1); } else { s2(c[0], r0); s2(c[1], r0); s2(c[3], r1); s2(c[2], r1); }
        return;
      }
      var cc = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (s) { s2(cc[s[0]], cc[s[1]]); });
    });
    var roofs = [], NR = 18;
    (m.envelope || []).forEach(function (e) {
      var sh = e[6]; if (!sh || (sh.k !== 'gable' && sh.k !== 'hip')) return;
      var X = sh.axis === 'x', ex0 = e[0] * K, ey0 = e[1] * K, ez0 = e[2] * K, ex1 = e[3] * K, ey1 = e[4] * K, ez1 = e[5] * K, half = Math.min(ex1 - ex0, ez1 - ez0) / 2;
      var h0 = sh.k === 'hip' && (!sh.hips || sh.hips[0]) ? half : 0, h1 = sh.k === 'hip' && (!sh.hips || sh.hips[1]) ? half : 0, list = [];
      for (var r = 0; r < NR; r++) {
        var t = r / (NR - 1);
        if (X) { var u = ex0 + t * (ex1 - ex0), ur = clamp(u, ex0 + h0, ex1 - h1), zm2 = (ez0 + ez1) / 2; list.push([[u, ey0, ez0, ur, ey1, zm2], [u, ey0, ez1, ur, ey1, zm2]]); }
        else { var uz = ez0 + t * (ez1 - ez0), uzr = clamp(uz, ez0 + h0, ez1 - h1), xm2 = (ex0 + ex1) / 2; list.push([[ex0, ey0, uz, xm2, ey1, uzr], [ex1, ey0, uz, xm2, ey1, uzr]]); }
      }
      roofs.push(list);
    });
    var bb = m.bounds, R = P.rows, y0 = R.y0 * K;
    var rects = (m.envelope || []).filter(function (e) { return e[1] <= R.y0 + 0.3 && e[4] > R.y0 + 0.05; }).map(function (e) { return [e[0] * K, e[2] * K, e[3] * K, e[5] * K]; });
    if (!rects.length) rects = [[bb.min[0] * K, bb.min[2] * K, bb.max[0] * K, bb.max[2] * K]];
    return { P: P, n: nAll, data: data, stamp: stamp, recs: recs, ranges: ranges, wire: wire, roofs: roofs, rects: rects, wlist: wlist, NR: NR,
      x0: bb.min[0] * K, x1: bb.max[0] * K, z0: bb.min[2] * K, z1: bb.max[2] * K, y0: y0, top: bb.max[1] * K, cx: (bb.min[0] + bb.max[0]) / 2 * K, cz: (bb.min[2] + bb.max[2]) / 2 * K,
      big: Math.max(bb.max[0] - bb.min[0], bb.max[2] - bb.min[2], 6) * K };
  }

  // ═══ the viewer ═══
  function HouseGL(container, opts) {
    var self = this;
    this.el = container; this.opts = opts || {}; this.engine = 'house_gl'; this.brand = true; this.mobile = !!this.opts.mobile;
    var mk = function (cls, z) { var c = document.createElement('canvas'); c.className = cls; c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;z-index:' + z + ';pointer-events:none'; return c; };
    this.under = mk('hb3d-under', 0); this.cv = mk('hb3d-canvas', 0); this.over = mk('hb3d-over', 0);
    this.cv.style.pointerEvents = 'auto'; this.cv.style.touchAction = 'none'; this.cv.setAttribute('role', 'img'); this.cv.setAttribute('aria-label', '3D house model'); this.cv.tabIndex = 0;
    container.insertBefore(this.over, container.firstChild); container.insertBefore(this.cv, this.over); container.insertBefore(this.under, this.cv);
    this.g2u = this.under.getContext('2d'); this.g2o = this.over.getContext('2d');
    this.R = makeGL(this.cv);
    if (!this.R) throw new Error('house_gl: WebGL with instancing is not available');
    var gl = this.R.gl;
    this._soft = !(H.forceFullGL || (typeof window !== 'undefined' && window.VI_HB_FULL)) && softGL(gl);   // tests force the full path on SwiftShader
    // the three.js-shaped bits index.html and the ?perf=1 overlay read
    this.renderer = { domElement: this.cv, getContext: function () { return gl; }, getPixelRatio: function () { return self.dpr; }, getSize: function (v) { if (v) { v.x = self.w; v.y = self.h; return v; } return { x: self.w, y: self.h }; } };
    this.controls = { minDistance: 1, maxDistance: 1e4, target: { x: 0, y: 0, z: 0 } };
    Object.defineProperty(this, 'dirty', { get: function () { return !!self._dirty; }, set: function (v) { self._dirty = !!v; } });   // as the old viewer's flag (tests, index.html)
    this.edges = { visible: false };
    this.mode = 'build'; this.p = 1; this.eq = 0; this.model = null; this.batches = [];
    this.yawA = 32 * Math.PI / 180; this.pitch = 20 * Math.PI / 180; this.dist = 400; this.fitDist = 400; this.tgt = [0, 40, 0]; this.pan = [0, 0, 0];
    this.w = 0; this.h = 0; this.dpr = 1;
    this.active = true; this._raf = 0; this._bDraws = 0; this._bLite = false; this._bCalm = false; this.lost = false;
    this._touch = -1e9; this._drag = null; this._fly = null; this._auto = !reduced() && !this._soft;
    this._stats = { settledAtOpen: 0, animated: 0, courseBricks: 0, stamped: 0, gapMs: null, firstFrameMs: null, t0: 0 };
    this._ft = []; this._fg = []; this._ftOn = false;
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.CULL_FACE); gl.depthFunc(gl.LEQUAL);
    this._loop = function (ts) {
      self._raf = 0;
      if (!self.active || self.offscreen || document.hidden || self.lost) { self._lastT = 0; return; }
      var now = performance.now();
      if (self._calm && now - (self._lastDraw || 0) < 32) { self._raf = requestAnimationFrame(self._loop); return; }   // at rest: 30 frames a second is plenty
      var t0 = now;
      var moving = self._tick(now);
      if (self._dirty || moving) { self._draw(now); self._lastDraw = now; }
      if (self._ftOn) { self._ft.push(performance.now() - t0); if (self._lastT) self._fg.push(now - self._lastT); }
      self._lastT = now;
      if (self._idleFrames > 3) return;   // nothing moving: sleep until woken (reduced motion, or a software GPU; a live stage keeps its pulse, sweep and ping)
      self._raf = requestAnimationFrame(self._loop);
    };
    // input: the brand book's orbit (yaw .008 rad/px, pitch .006 mouse only, auto-rotate after 2.5 s), wheel and pinch zoom, two-finger / right-button pan
    var cv = this.cv, ptrs = {};
    var pos = function (e) { return [e.clientX, e.clientY]; };
    cv.addEventListener('pointerdown', function (e) {
      ptrs[e.pointerId] = pos(e); var ids = Object.keys(ptrs);
      self._touch = performance.now(); self.wake();
      if (ids.length === 1) { self._drag = { x: e.clientX, y: e.clientY, yaw: self.yawA, pitch: self.pitch, pan: self.pan.slice(), mode: (e.button === 2 || self._panMode) ? 'pan' : 'orbit', type: e.pointerType }; self._bDrag = true; }
      else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; self._pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: self.zoom(), cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, pan: self.pan.slice() }; self._drag = null; }
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      cv.style.cursor = 'grabbing';
    });
    cv.addEventListener('pointermove', function (e) {
      if (!ptrs[e.pointerId]) return; ptrs[e.pointerId] = pos(e); var ids = Object.keys(ptrs);
      if (ids.length >= 2 && self._pinch) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]), P = self._pinch;
        self.setZoom(P.zoom * d / Math.max(1, P.d));
        var mx = (a[0] + b[0]) / 2 - P.cx, my = (a[1] + b[1]) / 2 - P.cy; self._panBy(P.pan, mx, my);
      } else if (self._drag) {
        var D = self._drag, dx = e.clientX - D.x, dy = e.clientY - D.y;
        if (D.mode === 'pan') self._panBy(D.pan, dx, dy);
        else { self.yawA = D.yaw - dx * 0.008; if (D.type === 'mouse') self.pitch = clamp(D.pitch + dy * 0.006, 0.1, 1.2); }
        self._viewChanged();
      }
      self._touch = performance.now(); self.wake();
    });
    var end = function (e) { delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) { self._drag = null; self._pinch = null; self._bDrag = false; } else self._pinch = null; self._touch = performance.now(); cv.style.cursor = 'grab'; self.wake(); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', end);
    cv.addEventListener('wheel', function (e) { e.preventDefault(); self.setZoom(self.zoom() * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); self._touch = performance.now(); }, { passive: false });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('keydown', function (e) {
      var k = e.key; if (k === 'ArrowLeft') self.yawA -= 0.12; else if (k === 'ArrowRight') self.yawA += 0.12; else if (k === 'ArrowUp') self.pitch = clamp(self.pitch + 0.06, 0.1, 1.2); else if (k === 'ArrowDown') self.pitch = clamp(self.pitch - 0.06, 0.1, 1.2);
      else if (k === '+' || k === '=') self.setZoom(self.zoom() * 1.12); else if (k === '-') self.setZoom(self.zoom() / 1.12); else return;
      e.preventDefault(); self._touch = performance.now(); self._viewChanged();
    });
    cv.style.cursor = 'grab';
    if (typeof ResizeObserver !== 'undefined') { this._ro = new ResizeObserver(function () { self.resize(); self.wake(); }); this._ro.observe(container); }
    this.offscreen = false; this._visRatio = typeof IntersectionObserver === 'undefined' ? 1 : 0;   // how much of the stage is on screen (the lay animation waits for half)
    if (typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver(function (es) { var e = es[es.length - 1], vis = e.isIntersecting; self._visRatio = e.intersectionRatio || 0; if (vis === !self.offscreen) { if (vis) self.wake(); return; } self.offscreen = !vis; if (vis) self.wake(); }, { threshold: [0.01, 0.5, 0.6] });
      this._io.observe(container);
    }
    this._onVis = function () { if (!document.hidden) self.wake(); };
    document.addEventListener('visibilitychange', this._onVis);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; self.stop(); if (self.onLost) self.onLost(); });
    cv.addEventListener('webglcontextrestored', function () {
      try { self.R = makeGL(cv); var g = self.R.gl; g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA); g.enable(g.CULL_FACE); g.depthFunc(g.LEQUAL); } catch (e) { return; }
      self.lost = false; self._hg = null; if (self.model) self.show(self.model, true); self.start(); if (self.onRestored) self.onRestored();
    });
    this.start();
  }
  H.HouseGL = HouseGL; HouseGL.supported = supported;
  var VP = HouseGL.prototype;

  VP.start = function () { this.active = true; this.wake(); };
  VP.wake = function () { this._idleFrames = 0; if (this.active && !this._raf && !this.lost) this._raf = requestAnimationFrame(this._loop); };
  VP.stop = function () { this.active = false; if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; } };
  VP.setBrand = function () {};
  VP.setPanMode = function (pan) { this._panMode = !!pan; };
  VP._bNow = function () { return performance.now() / 1000; };
  VP._viewChanged = function () { this._dirty = true; if (this.onView) this.onView(this); };
  VP.resize = function () {
    var w = this.el.clientWidth, h = this.el.clientHeight; if (!(w > 2 && h > 2)) return false;
    var dpr = (this._soft || this._lite) ? 1 : Math.min(window.innerWidth < 700 ? 1.5 : 2, window.devicePixelRatio || 1);   // the brand book's pixel ratio
    if (w === this.w && h === this.h && dpr === this.dpr) return true;
    this.w = w; this.h = h; this.dpr = dpr;
    [this.under, this.cv, this.over].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
    this._dirty = true;
    return true;
  };

  // ── model ──
  VP.show = function (model, keepCamera) {
    var t0 = performance.now();
    this.model = model; this._hg = null; this._V = null; this._Vc = null; this._primed = false; this._lastJ = -1; this._info = null; this._bEq = null;
    this._stats = { settledAtOpen: 0, animated: 0, courseBricks: 0, stamped: 0, gapMs: null, firstFrameMs: null, t0: t0, drawsAt: this._bDraws };
    this.batches = model ? model.batches.map(function (b) { return { b: b, n: b.count }; }) : [];
    if (!model) { this._dirty = true; return; }
    var HG = this._hg = buildHouse(model), gl = this.R.gl;
    if (this._buf) { gl.deleteBuffer(this._buf.inst); gl.deleteBuffer(this._buf.time); }
    var inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, inst); gl.bufferData(gl.ARRAY_BUFFER, HG.data, gl.STATIC_DRAW);
    var time = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, time); gl.bufferData(gl.ARRAY_BUFFER, HG.stamp, gl.DYNAMIC_DRAW);
    this._buf = { inst: inst, time: time, bytes: HG.data.byteLength + HG.stamp.byteLength };
    HG.data = null;   // the GPU has it; the page keeps only the stamps
    this._stampDirty = true;
    this.edges.visible = true;
    this.controls.minDistance = Math.max(13, HG.big * 0.12); this.controls.maxDistance = Math.max(this.fitDist * 5, HG.big * 20);
    if (!keepCamera) this.fit();
    this.apply();
    this._stats.buildMs = performance.now() - t0;
  };
  VP.fit = function () {
    this.resize();   // frame for the stage's real size (the first show() comes before any frame)
    var m = this.model, bb = m ? (m.frame || m.bounds) : { min: [-4, 0, -6], max: [4, 4, 2] };
    var cx = (bb.min[0] + bb.max[0]) / 2 * K, cz = (bb.min[2] + bb.max[2]) / 2 * K, Hh = Math.max(2, bb.max[1]) * K;
    var rad = Math.sqrt(Math.pow((bb.max[0] - bb.min[0]) * K, 2) + Math.pow((bb.max[2] - bb.min[2]) * K, 2) + Hh * Hh) / 2;
    this._radius = rad;
    var fov = 36 * Math.PI / 180, aspect = Math.max(0.5, (this.w || 16) / (this.h || 10));
    var aspF = aspect < 1 ? 0.98 / aspect : 0.9;   // the house fills the frame like the brand book, closer still on phones (owner, 30 Oct 2026)
    var F = m && m.focus, fRad = F ? Math.max(6 * K, Math.hypot((bb.max[0] - bb.min[0]) * K, (bb.max[2] - bb.min[2]) * K) / 2 * 1.05) : rad;
    var d = fRad / Math.sin(fov / 2) * aspF, dAll = rad / Math.sin(fov / 2) * aspF;
    this.fitDist = d; this.dist = d;
    this.tgt = [cx, F ? (F.y0 + F.y1) / 2 * K : Hh * (Hh > 20 * K ? 0.5 : 0.42), cz + 0.2 * K]; this.pan = [0, 0, 0];
    this.yawA = (this.opts.azimuth == null ? 32 : this.opts.azimuth) * Math.PI / 180; this.pitch = 20 * Math.PI / 180;
    this.controls.minDistance = Math.max(1.0 * K, fRad * 0.12); this.controls.maxDistance = Math.max(d * 5, dAll * 1.7);
    this._touch = performance.now(); this._viewChanged();
  };
  VP.distance = function () { return this.dist; };
  VP.zoom = function () { return this.fitDist / Math.max(1e-6, this.dist); };
  VP.setZoom = function (z) {
    z = Math.max(this.fitDist / this.controls.maxDistance, Math.min(this.fitDist / this.controls.minDistance, z));
    this.dist = this.fitDist / z; this._viewChanged(); this.wake();
  };
  VP._panBy = function (pan0, dx, dy) {   // screen-space pan: the target moves with the finger
    var cam = this._camera(), s = this.dist / this._focal();
    this.pan = [pan0[0] - (cam.r[0] * dx - cam.u[0] * dy) * s, pan0[1] - (cam.r[1] * dx - cam.u[1] * dy) * s, pan0[2] - (cam.r[2] * dx - cam.u[2] * dy) * s];
    this._viewChanged();
  };
  // camera in courses: position from yaw / pitch / dist round the target; right, up, forward
  VP._camera = function () {
    var T = [this.tgt[0] + this.pan[0], this.tgt[1] + this.pan[1], this.tgt[2] + this.pan[2]], cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), d = this.dist;
    var pos = [T[0] + d * Math.sin(this.yawA) * cp, T[1] + d * sp, T[2] + d * Math.cos(this.yawA) * cp];
    var f = [T[0] - pos[0], T[1] - pos[1], T[2] - pos[2]], l = Math.hypot(f[0], f[1], f[2]); f = [f[0] / l, f[1] / l, f[2] / l];
    var r = [-f[2], 0, f[0]], rl = Math.hypot(r[0], r[2]) || 1; r = [r[0] / rl, 0, r[2] / rl];
    var u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    this.controls.target.x = T[0] / K; this.controls.target.y = T[1] / K; this.controls.target.z = T[2] / K;
    return { pos: pos, r: r, u: u, f: f, T: T };
  };
  VP._focal = function () { return (this.h || 2) / 2 / Math.tan(18 * Math.PI / 180); };   // vertical fov 36 degrees, as the app's camera
  VP._vp = function () {   // view-projection, column major
    var c = this._camera(), pos = c.pos, r = c.r, u = c.u, f = c.f, d = this.dist, rad = this._radius || 100;
    var n = Math.max(0.5, Math.min(100, 0.05 * d)), fa = d + 3 * rad + 600, A = -(fa + n) / (fa - n), B = -2 * fa * n / (fa - n);
    var sy = 1 / Math.tan(18 * Math.PI / 180), sx = sy / Math.max(1e-6, (this.w || 1) / (this.h || 1));
    var dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
    // clip = P * V; V rows: r, u, -f ; P: [sx 0 0 0; 0 sy 0 0; 0 0 A B; 0 0 -1 0]
    return new Float32Array([sx * r[0], sy * u[0], -A * f[0], f[0], sx * r[1], sy * u[1], -A * f[1], f[1], sx * r[2], sy * u[2], -A * f[2], f[2],
      -sx * dot(r, pos), -sy * dot(u, pos), A * dot(f, pos) + B, -dot(f, pos)]);
  };
  // project a world point (metres) to container pixels; the course-unit version for the 2D layers
  VP._pt = function (x, y, z) {
    var c = this._cam || (this._cam = this._camera()), vx = x - c.pos[0], vy = y - c.pos[1], vz = z - c.pos[2];
    var X = vx * c.r[0] + vy * c.r[1] + vz * c.r[2], Y = vx * c.u[0] + vy * c.u[1] + vz * c.u[2], Z = vx * c.f[0] + vy * c.f[1] + vz * c.f[2];
    var behind = Z < 0.5; if (Z < 0.5) Z = 0.5; var s = this._focal() / Z;
    return [this.w / 2 + X * s, this.h / 2 - Y * s, Z, s, behind];
  };
  VP.project = function (x, y, z) { this._cam = null; var q = this._pt(x * K, y * K, z * K); return { x: q[0], y: q[1], behind: q[4] }; };

  // ── state ──
  VP.setState = function (s) {
    if (s.p != null) { this.p = clamp(s.p, 0, 1); this._target = this.p; }
    if (s.mode) this.mode = s.mode;
    if (s.eq != null) this.eq = clamp(s.eq, 0, 1);
    this.apply();
  };
  VP.animateTo = function (p1) { p1 = clamp(p1, 0, 1); if (this._pendingOpen != null) { this._pendingOpen = Math.max(this._pendingOpen, p1); this.wake(); return; } this._target = p1; this.wake(); };   // a deposit before the stage is half on screen joins the waiting opening
  // v0.7 opening: everything up to p0 is in place on the first frame; the bricks between p0 and p1 (the newest course at most) lay themselves
  VP.openAt = function (p0, p1) {
    p1 = clamp(p1, 0, 1); p0 = clamp(p0, 0, p1);
    this.p = p0; this._target = p0; this._primed = false; this._pendingOpen = null;
    this.apply();
    try { this._stats.settledAtOpen = H.brandBricksLaid(H.brandPlan(this.model).N, reduced() ? p1 : p0); } catch (e) {}   // the shell that was there at once (lazy laying; reduced motion: everything)
    if (p1 > p0) { if (reduced() || this._visRatio >= 0.5) this._openNow(p1); else this._pendingOpen = p1; }   // owner, 2 Nov: the top course lays once the stage is about half on screen, not at its first pixel
    this.wake();
  };
  VP._openNow = function (p1) { this._pendingOpen = null; this._open = true; this.p = p1; this._target = p1; this._applyStamps(); this._dirty = true; };
  VP.layPending = function () { return this._pendingOpen != null; };
  VP.apply = function () {
    var m = this.model; if (!m || !this._hg) { this._dirty = true; return; }
    if (this._mode !== this.mode) { this._primed = false; this._mode = this.mode; this._bEq = null; }   // a new level: the hologram shows at once, the colour lays from 0
    this._applyStamps();
    this._dirty = true; this.wake();
  };
  // stamps: which instances show, and when each one landed (the shader does the rest)
  VP._applyStamps = function () {
    var m = this.model, HG = this._hg, P = HG.P, L2 = this.mode === 'equity' || this.mode === 'complete';
    var p = this.mode === 'site' ? 0 : (L2 ? 1 : this.p), now = this._bNow(), motion = reduced();
    var V = H.brandUnits(P, p), V0 = this._V == null ? -1 : this._V, inst = motion || !this._primed;
    var add = Math.max(0, V - Math.max(V0, 0)), stp = (!inst && add > 0 && add <= 60) ? Math.min(0.24, 1.8 / add) : 0;   // owner, 2 Nov: twice the brand book's min(0.12, 0.9 / n)
    var open = !!this._open; this._open = false;
    if (open && !inst && add > 0) stp = Math.min(0.08, 2.4 / add);   // the opening course: each brick 80 ms after the last, the whole course started within 2.4 s (owner: twice the v0.7 preview pace)
    if (V !== V0) {
      var st = HG.stamp, S = this._stats, n0 = 0;
      HG.recs.forEach(function (rec) {
        if (!rec.rank) return;
        var k1 = lowerBound(rec.rank, V), k0 = rec.cnt || 0, base = rec.base, glaze = rec.type >= 4 && rec.type <= 6;
        if (k1 > k0) {
          for (var k = k0; k < k1; k++) st[(base + k) * 2] = (inst || glaze) ? -1e9 : now + Math.floor(Math.max(0, rec.rank[k] - Math.max(V0, 0))) * stp;
          if (rec.type <= 2) n0 += k1 - k0;
        } else if (k1 < k0) { for (var k2 = k1; k2 < k0; k2++) st[(base + k2) * 2] = 1e9; }   // un-laying is instant
        rec.cnt = k1;
      });
      if (inst) { if (!S.settledAtOpen && this._bDraws) S.settledAtOpen = Math.max(0, Math.min(P.N, V)); } else { S.animated += n0; S.stamped += n0; if (n0 > 0 && !open) { S.gapMs = stp * 1000; S.lastAdd = n0; } }
      if (open) { var Lb = H.brandBricksLaid(P.N, p), cur = Lb > 0 ? P.course[Lb - 1] : 0; S.courseBricks = Lb > 0 ? lowerBound(P.course, cur + 1) - lowerBound(P.course, cur) : 0; }
      this._stampDirty = true; this._V = V; this._lastStampAt = inst ? -1e9 : now + Math.max(0, add - 1) * stp; this._dirty = true;
    }
    this._primed = true;
    // Level 2: the parts in colour follow the equity share (eased by the frame loop, from 0 when the level opens)
    var eqS = L2 ? (this._bEq == null ? this.eq : this._bEq) : 0;
    var Vc1 = L2 ? H.brandColourUnits(P, eqS) : -1; if (Vc1 !== this._Vc) this._dirty = true; this._Vc = Vc1;
    var st2 = H.brandStats(m, p), L = st2.bricksLaid, pulse = motion ? 0.5 : 0.5 + 0.5 * Math.sin(performance.now() * 0.002244);
    var last = null; this._lastIdx = -1;
    if (L > 0 && !L2) {
      var j = L - 1, bi = P.bBi[j], rec = null; for (var q = 0; q < HG.recs.length; q++) if (HG.recs[q].bi === bi) { rec = HG.recs[q]; break; }
      if (rec) {
        var gi = rec.base + P.bK[j], b = m.batches[bi], o = P.perm[bi][P.bK[j]] * 10, xf = b.xf, stv = HG.stamp[gi * 2];
        var landed = motion || stv < -1e8 || now >= stv + 1.5;
        last = { n: L, x: xf[o], y: xf[o + 1], z: xf[o + 2], shown: !!landed }; if (gi !== this._lastIdxWas || landed !== this._lastLanded) this._dirty = true; this._lastIdx = gi; this._lastIdxWas = gi; this._lastLanded = landed;
      }
    }
    var cy = this._Vc <= 0 ? P.rows.y0 : (this._Vc <= P.N ? P.top[this._Vc - 1] : (P.T ? P.tileTop[Math.min(P.T - 1, this._Vc - P.N - 1)] : P.rows.y1));
    var pa = L2 ? (eqS > 0 && eqS < 1 ? 1 : 0) : 1 - seg(p, 0.97, 1), sy = L2 ? cy : st2.y;
    this._pulse = pulse; this._pa = pa; this._sy = sy; this._pNow = p; this._L2 = L2;
    this._info = { mode: this.mode, eq: eqS, colour: L2 ? Math.min(P.N + P.T, this._Vc) : 0, colourTotal: P.N + P.T, p: p, row: st2.row, rows: st2.rows, y: sy, bricks: L, bricksTotal: st2.bricksTotal, tiles: st2.tilesLaid, tilesTotal: st2.tilesTotal, stage: st2.stage,
      sliceA: pa, keys: st2.keys && !L2, last: last, pulse: pulse, door: P.door, cx: HG.cx / K, cz: HG.cz / K, top: m.height, lite: false, reduced: motion, engine: 'house_gl' };
  };
  VP.brandInfo = function () { return this._info; };
  VP.rowInfo = function () { var bi = this._info; if (!bi || !this.model || !this.model.rows) return null; return { y: bi.y, row: bi.row, rows: bi.rows, p: bi.p, brand: bi }; };
  VP.waterline = function () { var m = this.model; if (!m) return 0; var F = m.focus; return F ? F.y0 + this.eq * (F.y1 - F.y0) : (m.rows ? m.rows.y0 + this.eq * (m.rows.y1 - m.rows.y0) : this.eq * Math.max(0.5, m.height)); };
  VP.flyToRow = function (ms) {
    var ri = this.rowInfo(); if (!ri || !this._hg) return;
    var HG = this._hg, to = [HG.cx, Math.max(0.3 * K, ri.y * K), HG.cz];
    this._fly = { t0: performance.now(), ms: ms || 650, from: this.tgt.slice(), fromPan: this.pan.slice(), to: to, z0: this.zoom(), z1: Math.max(this.zoom(), 1.3) };
    this.wake();
  };
  VP.settled = function () {
    if (!this._bDraws || !this._hg) return false;
    var target = this._target == null ? this.p : this._target;
    if (Math.abs(target - this.p) > 1e-9) return false;
    if (this._L2 && (this._bEq == null || Math.abs(this._bEq - this.eq) > 1e-9)) return false;
    if (this._pendingOpen != null) return false;   // the top course is still waiting for the stage to be half on screen
    return this._bNow() >= (this._lastStampAt || -1e9) + 3.0;   // drop 0.76 s, flash 2.2 s: then nothing moves but the ambient motion
  };
  VP._brandActive = function () { return !!this._hg; };

  // ── frame ──
  VP._tick = function (now) {
    var m = this.model; if (!m || !this._hg) return;
    var raw = this._tickT ? (now - this._tickT) / 1000 : 1 / 60; this._tickT = now;
    if (this._pendingOpen != null && (reduced() || this._visRatio >= 0.5)) this._openNow(this._pendingOpen);   // the stage has come half on screen: lay the top course
    var dt = this.fixedDt || Math.min(0.05, raw), red = reduced(), target = this._target == null ? this.p : this._target, moving = false;   // fixedDt: tests on a software GPU step the cadence by frame, not by the clock
    if (red) { if (this.p !== target) { this.p = target; moving = true; } }
    else if (this.p !== target) { this.p += (target - this.p) * Math.min(1, dt * 0.85); if (Math.abs(target - this.p) < 0.0003) this.p = target; moving = true; }   // half the brand book's cadence (dt x 1.7): owner, 2 Nov, the build is twice as slow
    if (this._L2 || this.mode === 'equity' || this.mode === 'complete') {
      if (this._bEq == null) this._bEq = red ? this.eq : 0;
      if (red) this._bEq = this.eq;
      else if (this._bEq !== this.eq) { this._bEq += (this.eq - this._bEq) * Math.min(1, dt * 0.85); if (Math.abs(this.eq - this._bEq) < 0.0003) this._bEq = this.eq; moving = true; }
    }
    if (this._fly) {
      var f = this._fly, k = Math.min(1, (now - f.t0) / f.ms), e = 1 - Math.pow(1 - k, 3);
      this.pan = [f.to[0] - f.from[0], f.to[1] - f.from[1], f.to[2] - f.from[2]].map(function (d, i) { return f.fromPan[i] + (d - f.fromPan[i]) * e * 0 + (d) * e; });
      this.setZoom(f.z0 + (f.z1 - f.z0) * e);
      if (k >= 1) this._fly = null; moving = true;
    }
    if (this._auto && !red && !this._drag && !this._pinch && !this._fly && now - this._touch > 2500) { this.yawA += dt * 0.12; moving = true; }
    this._applyStamps();
    var live = !red && !this._soft, settled = this.settled();
    this._calm = settled && !this._drag && !this._pinch && !this._fly && now - this._touch > 1500 && !moving;
    this._bCalm = this._calm;
    if (live) this._dirty = true;   // pulse, sweep and the ping keep the stage alive
    this._idleFrames = !live && settled && !moving && !this._dirty ? (this._idleFrames || 0) + 1 : 0;   // without ambient motion the loop may sleep
    return moving || !!this._dirty;
  };
  VP._draw = function (now) {
    var m = this.model, HG = this._hg, R = this.R, gl = R.gl, A = R.A, U = R.U;
    if (!this.resize()) return;
    if (!m || !HG) { gl.viewport(0, 0, this.cv.width, this.cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); this.g2u.clearRect(0, 0, this.under.width, this.under.height); return; }
    var red = reduced(), p = this._pNow, tnow = now / 1000, pulse = this._pulse, P = HG.P;
    var ping = (red || this._soft) ? (red ? 0.5 : 0) : (now % 2800) / 2800, built = seg(p, 0.05, 1);
    var wa = seg(p, 0.88, 0.93), lit = seg(p, 0.93, 0.96), dec = seg(p, 0.96, 1);
    if (this.mode === 'equity') { lit = 0; dec = 0; }   // the lights go on when the mortgage is paid off
    if (this._L2) wa = 1;
    this._cam = null; var cam = this._cam = this._camera();
    // ── 2D underlay ──
    var g = this.g2u, W = this.w, Hh = this.h, dpr = this.dpr, self = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, Hh);
    var pt = function (x, y, z) { return self._pt(x, y, z); };
    var c0 = pt(HG.cx, 0, HG.cz), rad = 1.14 * HG.big * c0[3];
    g.save(); g.translate(c0[0], c0[1]); g.scale(1, Math.max(0.3, Math.sin(this.pitch)));
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, rad * 1.7); gr.addColorStop(0, rgba(TEAL, 0.24)); gr.addColorStop(0.6, rgba(TEAL, 0.24 * 0.3)); gr.addColorStop(1, rgba(TEAL, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad * 1.7, 0, Math.PI * 2); g.fill(); g.restore();
    var E = HG.big * 1.25, sp = E / 5, i;
    g.lineWidth = 1;
    for (i = -5; i <= 5; i++) {
      g.strokeStyle = rgba(TEAL, 0.30 * (1 - Math.abs(i) / 6.5));
      var a1 = pt(HG.cx + i * sp, 0, HG.cz - E), b1 = pt(HG.cx + i * sp, 0, HG.cz + E); g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.stroke();
      a1 = pt(HG.cx - E, 0, HG.cz + i * sp); b1 = pt(HG.cx + E, 0, HG.cz + i * sp); g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(b1[0], b1[1]); g.stroke();
    }
    var path = function (pts) { g.beginPath(); pts.forEach(function (q, k) { var s = pt(q[0], q[1], q[2]); if (k) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); }); g.closePath(); };
    var sb = seg(p, 0.005, 0.03), fnd = seg(p, 0, 0.03), y0 = HG.y0;
    if (sb > 0) { g.setLineDash([8, 6]); g.strokeStyle = rgba(TEAL, 0.55 * sb); g.lineWidth = 1.2; path([[HG.x0 - 20, y0, HG.z0 - 20], [HG.x1 + 20, y0, HG.z0 - 20], [HG.x1 + 20, y0, HG.z1 + 20], [HG.x0 - 20, y0, HG.z1 + 20]]); g.stroke(); g.setLineDash([]); }
    if (fnd > 0) { HG.rects.forEach(function (r) { path([[r[0], y0, r[1]], [r[2], y0, r[1]], [r[2], y0, r[3]], [r[0], y0, r[3]]]); g.fillStyle = rgba(TEAL, 0.14 * fnd); g.fill(); g.strokeStyle = rgba(TEAL, 0.75 * fnd); g.lineWidth = 1.4; g.stroke(); }); }
    // the ground ping (E15, owner 1 Nov: gold, every 2.8 s; brand book sizing: grows 75 units, alpha (1 - ping) x (.1 + .4 x seg(p, .5, 1)))
    this._pingA = 0;
    if (p > 0.05 && !this._L2 && !red && !this._soft) {   // reduced motion: no ping (Pedro's spec, section 10)
      var rg = ping * 75 * (HG.big / 120), ra = (1 - ping) * (0.1 + 0.4 * seg(p, 0.5, 1)); this._pingA = ra;
      path([[HG.x0 - rg, y0, HG.z0 - rg], [HG.x1 + rg, y0, HG.z0 - rg], [HG.x1 + rg, y0, HG.z1 + rg], [HG.x0 - rg, y0, HG.z1 + rg]]); g.strokeStyle = rgba(GOLD, ra); g.lineWidth = 2; g.stroke();
    }
    g.strokeStyle = WIRE; g.lineWidth = 1; g.beginPath();
    HG.wire.forEach(function (e) { var a = pt(e[0], e[1], e[2]), b = pt(e[3], e[4], e[5]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }); g.stroke();
    var nT = Math.ceil(seg(p, 0.60, 0.80) * HG.NR);
    if (nT > 0 && HG.roofs.length) { g.strokeStyle = RAFTER; g.lineWidth = 1.6; g.beginPath();
      HG.roofs.forEach(function (list) { for (var r = 0; r < nT; r++) list[r].forEach(function (s) { var a = pt(s[0], s[1], s[2]), b = pt(s[3], s[4], s[5]); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }); }); g.stroke(); }
    // ── GL: the bricks ──
    gl.viewport(0, 0, this.cv.width, this.cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(R.pr);
    if (this._stampDirty) { gl.bindBuffer(gl.ARRAY_BUFFER, this._buf.time); gl.bufferSubData(gl.ARRAY_BUFFER, 0, HG.stamp); this._stampDirty = false; }
    gl.uniformMatrix4fv(U.uVP, false, this._vp()); gl.uniform1f(U.uFocal, this._focal() * this.dpr);
    gl.uniform1f(U.uNow, tnow); gl.uniform1f(U.uLast, this._lastIdx); gl.uniform1f(U.uFlash, red ? 0 : 1); gl.uniform1f(U.uGlaze, wa); gl.uniform1f(U.uVc, this._Vc);
    gl.uniform3fv(U.uBrick, C.brick); gl.uniform3fv(U.uTrim, C.trim); gl.uniform3fv(U.uTile, C.tile); gl.uniform3fv(U.uFrame, C.frame); gl.uniform3fv(U.uGlass, C.glass); gl.uniform3fv(U.uGlassLit, C.glassLit);
    gl.uniform3fv(U.uDoor, C.door); gl.uniform3fv(U.uEdge, C.edge); gl.uniform3fv(U.uSheen, C.sheen); gl.uniform3fv(U.uFlashCol, C.flash);
    gl.uniform1f(U.uPulse, pulse); gl.uniform1f(U.uBuilt, built);
    var top = Math.max(P.rows.y1, P.rows.y0 + 1) * K, span = top - HG.y0;
    gl.uniform1f(U.uSweep, HG.y0 + ((tnow * 20) % (span + 40)) - 10); gl.uniform1f(U.uSweepOn, (red || this._soft) ? 0 : 1);
    gl.uniform1f(U.uShMin, C.shMin); gl.uniform1f(U.uEdgeK, C.edgeK); gl.uniform1f(U.uFrontA, C.front); gl.uniform1f(U.uBackA, C.back); gl.uniform2f(U.uLit, lit, dec);
    var bindGeo = function (name) { gl.bindBuffer(gl.ARRAY_BUFFER, R.geo[name]);
      gl.enableVertexAttribArray(A.aPos); gl.vertexAttribPointer(A.aPos, 3, gl.FLOAT, false, 32, 0); R.div(A.aPos, 0);
      gl.enableVertexAttribArray(A.aNrm); gl.vertexAttribPointer(A.aNrm, 3, gl.FLOAT, false, 32, 12); R.div(A.aNrm, 0);
      gl.enableVertexAttribArray(A.aUV); gl.vertexAttribPointer(A.aUV, 2, gl.FLOAT, false, 32, 24); R.div(A.aUV, 0); };
    var SB = STRIDE * 4, buf = this._buf;
    var bindInst = function (start) { var o = start * SB; gl.bindBuffer(gl.ARRAY_BUFFER, buf.inst);
      gl.enableVertexAttribArray(A.aOff); gl.vertexAttribPointer(A.aOff, 3, gl.FLOAT, false, SB, o); R.div(A.aOff, 1);
      gl.enableVertexAttribArray(A.aSize); gl.vertexAttribPointer(A.aSize, 3, gl.FLOAT, false, SB, o + 12); R.div(A.aSize, 1);
      gl.enableVertexAttribArray(A.aRot); gl.vertexAttribPointer(A.aRot, 3, gl.FLOAT, false, SB, o + 24); R.div(A.aRot, 1);
      gl.enableVertexAttribArray(A.aMeta); gl.vertexAttribPointer(A.aMeta, 4, gl.FLOAT, false, SB, o + 36); R.div(A.aMeta, 1);
      gl.enableVertexAttribArray(A.aCol); gl.vertexAttribPointer(A.aCol, 3, gl.FLOAT, false, SB, o + 52); R.div(A.aCol, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.time); gl.enableVertexAttribArray(A.aTime); gl.vertexAttribPointer(A.aTime, 2, gl.FLOAT, false, 8, start * 8); R.div(A.aTime, 1); };
    var drawGroups = function (glass) { GROUPS.forEach(function (gname) { var rg = HG.ranges[gname]; if (!rg || (/glass/.test(gname) !== glass)) return; bindGeo(gname.replace('-glass', '')); bindInst(rg[0]); R.drawInst(0, R.geoN[gname.replace('-glass', '')], rg[1]); }); };
    // pass A: far faces, faint, so the hologram reads as solid brickwork you can see into
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.cullFace(gl.FRONT); gl.uniform1f(U.uBack, 1); drawGroups(false);
    // pass B: near faces, depth tested; then the glass without a depth write
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.cullFace(gl.BACK); gl.uniform1f(U.uBack, 0); drawGroups(false);
    gl.depthMask(false); drawGroups(true); gl.depthMask(true);
    // ── 2D overlay: window glow, the gold slice ──
    var o2 = this.g2o; o2.setTransform(dpr, 0, 0, dpr, 0, 0); o2.clearRect(0, 0, W, Hh);
    if (lit > 0) { o2.save(); o2.globalCompositeOperation = 'lighter';
      var cq = pt(HG.cx, HG.y0, HG.cz);
      HG.wlist.forEach(function (w) { var q = pt(w[0], w[1], w[2]); if (q[4] || q[2] > cq[2] + 2) return;   /* windows round the back do not glow through the walls */ var r = Math.max(w[3], w[4]) * 0.9 * q[3], al = lit * (0.22 + 0.1 * pulse);
        var g2 = o2.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); g2.addColorStop(0, rgba(GOLD, al)); g2.addColorStop(1, rgba(GOLD, 0)); o2.fillStyle = g2; o2.beginPath(); o2.arc(q[0], q[1], r, 0, Math.PI * 2); o2.fill(); });
      o2.restore(); }
    var pa = this._pa;
    if (pa > 0 && p > 0) { var lv = this._sy * K, mg = 14; o2.save(); o2.shadowColor = rgba(GOLD, 0.8 * pa); o2.shadowBlur = 14;
      o2.beginPath(); [[HG.x0 - mg, lv, HG.z0 - mg], [HG.x1 + mg, lv, HG.z0 - mg], [HG.x1 + mg, lv, HG.z1 + mg], [HG.x0 - mg, lv, HG.z1 + mg]].forEach(function (q, k) { var s = pt(q[0], q[1], q[2]); if (k) o2.lineTo(s[0], s[1]); else o2.moveTo(s[0], s[1]); }); o2.closePath();
      o2.fillStyle = rgba(GOLD, 0.11 * pa); o2.fill(); o2.strokeStyle = rgba(GOLD, 0.95 * pa); o2.lineWidth = 1.6; o2.stroke(); o2.restore(); }
    this._dirty = false; this._bDraws++;
    if (this._stats.firstFrameMs == null) this._stats.firstFrameMs = performance.now() - this._stats.t0;
    if (H.perf) H.perf.frame(this);   // ?perf=1 overlay (index.html): one call per drawn frame
    if (this.onRender) this.onRender(this);
  };
  VP.dispose = function () {
    this.stop();
    if (this._ro) this._ro.disconnect(); if (this._io) this._io.disconnect();
    if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
    try { var gl = this.R.gl; if (this._buf) { gl.deleteBuffer(this._buf.inst); gl.deleteBuffer(this._buf.time); } var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (e) {}
    var self = this; [this.under, this.cv, this.over].forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
    this.model = null; this._hg = null;
  };

  // ── test and measurement hooks ──
  VP.layStats = function (reset) { var s = this._stats; if (reset) { s.animated = 0; s.stamped = 0; s.gapMs = null; } return { settledAtOpen: s.settledAtOpen, animated: s.animated, courseBricks: s.courseBricks, stamped: s.stamped, gapMs: s.gapMs, lastAdd: s.lastAdd, firstFrameMs: s.firstFrameMs, buildMs: s.buildMs }; };
  VP.readUniforms = function (names) { var gl = this.R.gl, out = {}, self = this; names.forEach(function (n) { var v = gl.getUniform(self.R.pr, self.R.U[n]); out[n] = v && v.length ? Array.prototype.slice.call(v) : v; }); return out; };
  VP.dropMs = function () { return 760; };   // owner, 2 Nov 2026: twice the brand book's 380 ms
  VP.yaw = function () { return this.yawA; };
  VP.frameTimes = function (reset) { if (reset) { this._ft = []; this._fg = []; this._ftOn = true; return []; } return this._ft.slice(); };   // main-thread cost of each frame (tick + draw + GL submit)
  VP.frameGaps = function () { return this._fg.slice(); };   // wall time between frames (includes the GPU and the harness)
  VP.pingAlpha = function () { return this._pingA || 0; };
  VP.autoOrbit = function () { return this._auto && !reduced(); };
  VP.gpuBytes = function () { return this._buf ? this._buf.bytes : 0; };
  VP.goLite = function () { this._lite = true; this._bLite = true; this._dirty = true; this.wake(); };   // pixel ratio 1 on demand (the old viewer's lite; nothing else to switch off here)
  VP.dropCourses = function () { return 6; };   // a brick drops six courses (0.45 m) as it lands, as the brand book
  VP.flashMs = function () { return 2200; };   // the gold flash fades over 2.2 s (VS: age / 2.2), twice the brand book's
  VP.vsSource = function () { return VS; };
  VP.pingColour = function () { return 'gold'; };   // the owner's E15 words ("gold ground ping"), kept over the brand book's teal (David, 2 Nov 2026)
  VP.brickStamps = function () { var HG = this._hg; if (!HG) return []; var rec = HG.recs.filter(function (r) { return r.type === 1 && r.rank; })[0]; if (!rec) return []; var out = []; for (var k = 0; k < (rec.cnt || 0); k++) out.push(HG.stamp[(rec.base + k) * 2]); return out; };   // lay stamps of the first brick part, in laying order (-1e9 = laid at once)
  VP.laidAll = function () { var HG = this._hg; return !!HG && HG.recs.every(function (r) { return !r.rank || (r.cnt || 0) === r.n; }); };
})(HB3D);
if (typeof module !== 'undefined') module.exports = HB3D;
