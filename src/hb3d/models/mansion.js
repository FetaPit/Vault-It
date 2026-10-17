// Georgian manor house (c. 1770): symmetrical seven-bay, three-storey brick block (19.35 × 11.25 m) on a raised
// ground floor, one-brick solid walls — the entrance front in true Flemish bond with burnt headers, the other walls
// in Flemish-faced brickwork — rusticated stone quoins, stone plinth, first-floor string course and a modillion
// cornice under a brick parapet with stone coping; gauged-brick flat arches with keystones, stone cills, six-over-six
// timber sashes set back behind the reveal; tetrastyle Tuscan portico with a pediment over a six-panel door and
// radiating fanlight; hipped slate roof behind a lead box gutter with three lead-cheeked dormers front and back and
// two spine-wall chimney stacks; two-storey hipped wings (7.2 × 8.55 m) set back 1.35 m with boxed modillion eaves.
// Forecourt: gravel sweep round a lawn turning circle with a fountain, iron railings on a stone kerb, rusticated gate
// piers with ball finials and wrought-iron gates, clipped yews, box hedges and parkland trees.
(function (H) {
  var UK = H.UK;
  H.models.mansion = function (K, opts) {
    K.brickPalette = 'red';
    var CH = UK.CH, J = UK.J, BL = UK.BL, BH = UK.BH, BW = UK.BW, CL = UK.CL;
    var T = BL;                                                    // one-brick (215 mm) solid walls
    var y0 = -0.15, Y = function (n) { return y0 + n * CH; };      // course n bottom (75 mm module)
    var PI = Math.PI;
    // ── plan (metres, brick-modular) ──
    var W = 19.35, D = 11.25, cx = W / 2;                         // main block 172 × 100 half-bricks
    var WW = 7.2, WD = 8.55, WS = 1.35;                            // wings: width, depth, set-back
    var wz1 = -WS, wz0 = -WS - WD;                                 // wing front / rear faces
    // ── levels (course indices) ──
    var N = { plinth: 8, gfl: 10, gwin0: 18, gwin1: 46, str0: 54, str1: 57, fwin0: 62, fwin1: 94, ffl2: 98,
      swin0: 104, swin1: 126, corn0: 133, corn1: 139, par: 149, wTop: 93, wfwin1: 84 };
    var FFL0 = Y(N.gfl), FFL1 = Y(N.str0), FFL2 = Y(N.ffl2);       // 0.60 · 3.90 · 7.20
    var bays = [-8.25, -5.55, -2.85, 0, 2.85, 5.55, 8.25].map(function (d) { return cx + d; });
    var WIN = 1.125;                                               // window opening width (10 half-bricks)

    // ── colours ──
    var PAL = {
      str: [0xa4553a, 0x9c4a33, 0xb0603f, 0x95473a, 0xa95c45, 0x8f402c, 0xb3644a, 0x9a5038],
      hdr: [0x8a4230, 0x7c3b2d, 0x6a3a3a, 0x5a3c44, 0x4c3a44, 0x86432f, 0x5e3936],   // burnt / vitrified headers
      plinth: [0x6e4232, 0x5f3a2c, 0x744836, 0x684034],
      rub: [0xc2683f, 0xb95f3a, 0xc8744a, 0xbd6a44]                                  // rubbed (gauged) bricks
    };
    function jit(c, a) {
      var j = 1 + (K.rand() - 0.5) * (a == null ? 0.10 : a);
      var r = Math.min(255, Math.round(((c >> 16) & 255) * j)), g = Math.min(255, Math.round(((c >> 8) & 255) * j)), b = Math.min(255, Math.round((c & 255) * j));
      return (r << 16) | (g << 8) | b;
    }
    function pick(p) { return jit(p[Math.floor(K.rand() * p.length)]); }
    function S() { return jit(0xf6f3ec, 0.07); }                  // Portland stone tint (multiplies the stone material)

    // ── run helpers: a run is a straight wall face a→b; out = left normal (−dz, dx); depth measured inwards ──
    function mk(ax, az, bx, bz, o) {
      var L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      return Object.assign({ ax: ax, az: az, bx: bx, bz: bz, L: L, dx: dx, dz: dz, out: [-dz, dx], ry: Math.atan2(-dz, dx), ex: [], ev: {}, bands: [], breaks: {} }, o || {});
    }
    function rpt(r, u, d) { return [r.ax + r.dx * u - r.out[0] * d, r.az + r.dz * u - r.out[1] * d]; }
    function rbox(mat, r, u0, u1, ya, yb, d0, d1, o) {
      var p = rpt(r, (u0 + u1) / 2, (d0 + d1) / 2), oo = Object.assign({}, o || {}); oo.ry = r.ry;
      return K.box(mat, p[0], (ya + yb) / 2, p[1], u1 - u0, yb - ya, d1 - d0, oo);
    }
    function on(r, k, fn) { (r.ev[k] = r.ev[k] || []).push(fn); }

    // ── brick courses: Flemish bond laid from the run origin (headers centred on the stretchers below,
    //    queen closer after the first header on odd courses). bond 'flemish' = full one-brick wall (stretcher pairs
    //    + through headers); 'face' = Flemish-faced wall (face stretchers + through headers, lime core behind) ──
    function layCourse(r, k, segs) {
      var yb = Y(k), ya = yb + J, yt = yb + CH, plinth = k < N.plinth, units = [], u = 0, nx = 'S';
      if (k % 2 === 1) { units.push(['H', 0, BW]); units.push(['Q', BW + J, BW + J + 0.046]); u = BW + 2 * J + 0.046; }
      while (u < r.L - 0.02) { var Lu = nx === 'S' ? BL : BW; units.push([nx, u, Math.min(u + Lu, r.L)]); u += Lu + J; nx = nx === 'S' ? 'H' : 'S'; }
      var si = 0;
      for (var i = 0; i < units.length; i++) {
        var un = units[i];
        for (var s = si; s < segs.length; s++) {
          var sg = segs[s]; if (sg[0] >= un[2]) break;
          var a = Math.max(un[1], sg[0]), e = Math.min(un[2], sg[1]);
          if (e - a < 0.03) continue;
          if (un[0] === 'S') {
            rbox('brick', r, a, e, ya, yt, 0, BW, { color: pick(plinth ? PAL.plinth : PAL.str), kind: 'brick' });
            if (r.bond === 'flemish') rbox('brick', r, a, e, ya, yt, T - BW, T, { color: pick(plinth ? PAL.plinth : PAL.str), kind: 'brick' });
          } else {
            rbox('brick', r, a, e, ya, yt, 0, T, { color: pick(plinth ? PAL.plinth : (K.rand() < 0.65 ? PAL.hdr : PAL.str)), kind: 'brick' });
          }
        }
      }
      segs.forEach(function (sg) { if (sg[1] - sg[0] > 0.02) rbox('mortarLime', r, sg[0], sg[1], yb, yt, 0.006, T); });
    }
    function subtract(segs, a, b) {
      var out = [];
      segs.forEach(function (s) { if (b <= s[0] || a >= s[1]) { out.push(s); return; } if (a > s[0]) out.push([s[0], a]); if (b < s[1]) out.push([b, s[1]]); });
      return out;
    }

    // ── corners: convex corner between run A (ending) and run B (starting). Rusticated quoins over course ranges
    //    (4-course stones, alternately long 0.45 / short 0.3375 on each face, projecting 15 mm); elsewhere the two
    //    runs take turns to run through the corner (bonded corner) ──
    var corners = [];
    function corner(A, B, ranges, par) { var c = { A: A, B: B, q: ranges, par: par || 0 }; A.eC = c; B.sC = c; corners.push(c); return c; }
    function quoinAt(c, k) {
      for (var i = 0; i < c.q.length; i++) {
        var q = c.q[i];
        if (k >= q[0] && k < q[1]) { var g = Math.floor((k - q[0]) / 4), lng = (g + c.par) % 2 === 0; return { la: lng ? 0.45 : 0.3375, lb: lng ? 0.3375 : 0.45, first: (k - q[0]) % 4 === 0 }; }
      }
      return null;
    }
    function emitQuoin(c, k, q) {
      var A = c.A, B = c.B, ya = Y(k), yt = Y(k + 4), p = 0.015, col = S();
      rbox('stone', A, A.L - q.la, A.L + p, ya + J, yt, -p, T, { color: col });
      rbox('stone', B, T, q.lb, ya + J, yt, -p, T, { color: col });
      rbox('mortarLime', A, A.L - q.la, A.L - 0.006, ya, ya + J, 0.006, T);
      rbox('mortarLime', B, T, q.lb, ya, ya + J, 0.006, T);
    }

    // ── stone bands (plinth, string course, cornice core): replace whole courses through the wall. Runs flagged
    //    `own` (the faces along X) carry the band round the corners; projections drop to flush in `breaks` ──
    function emitBand(r, b) {
      var ya = Y(b.n0), yt = Y(b.n1), p = b.p || 0;
      var us = r.sC ? (r.own ? -p : T) : 0, ue = r.eC ? (r.own ? r.L + p : r.L - T) : r.L;
      var cuts = [us, ue], br = (r.breaks[b.key] || []).filter(function (z) { return z[1] > us && z[0] < ue; });
      br.forEach(function (z) { cuts.push(Math.max(us, z[0]), Math.min(ue, z[1])); });
      cuts.sort(function (a, c) { return a - c; });
      for (var i = 0; i < cuts.length - 1; i++) {
        var a = cuts[i], e = cuts[i + 1]; if (e - a < 0.005) continue;
        var m = (a + e) / 2, flush = br.some(function (z) { return m > z[0] && m < z[1]; });
        var a2 = flush ? Math.max(a, 0) : a, e2 = flush ? Math.min(e, r.L) : e;
        if (e2 - a2 > 0.005) rbox('stone', r, a2, e2, ya + J, yt, flush ? 0 : -p, T, { color: S() });
      }
      rbox('mortarLime', r, Math.max(us, 0), Math.min(ue, r.L), ya, ya + J, 0.006, T);
      if (b.extra) b.extra(r, us, ue);
    }

    // ── openings: exclusion rectangles in course space + stone / gauged-brick dressings timed with the courses ──
    var fits = [];
    function opening(r, uc, w, n0, n1, o) {
      o = Object.assign({ r: r, u0: uc - w / 2, u1: uc + w / 2, uc: uc, n0: n0, n1: n1, v0: Y(n0), v1: Y(n1), kind: 'window', head: 'gauged', cill: true }, o || {});
      var u0 = o.u0, u1 = o.u1;
      r.ex.push([n0, n1, u0, u1]);
      if (o.kind === 'window' && o.cill) { r.ex.push([n0 - 1, n0, u0 - 0.1125, u1 + 0.1125]); on(r, n0 - 1, function () { cill(r, o); }); }
      if (o.head === 'gauged' || o.head === 'key') {
        for (var j = 0; j < 3; j++) r.ex.push([n1 + j, n1 + j + 1, u0 - 0.0375 * (j + 0.5), u1 + 0.0375 * (j + 0.5)]);
        if (o.head === 'key') r.ex.push([n1 + 3, n1 + 4, uc - 0.095, uc + 0.095]);
        on(r, n1, function () { gaugedArch(r, o, o.head === 'key'); });
      } else if (o.head === 'stone') {
        r.ex.push([n1, n1 + 3, u0 - 0.1125, u1 + 0.1125]);
        on(r, n1, function () { rbox('stone', r, u0 - 0.1125, u1 + 0.1125, Y(n1) + J, Y(n1 + 3), 0, T, { color: S() }); rbox('mortarLime', r, u0 - 0.1125, u1 + 0.1125, Y(n1), Y(n1) + J, 0.006, T); });
      }
      fits.push(o);
      return o;
    }
    function cill(r, o) {
      var ya = Y(o.n0 - 1);
      rbox('stone', r, o.u0 - 0.1125, o.u1 + 0.1125, ya + J, o.v0, -0.045, T, { color: S() });
      rbox('mortarLime', r, o.u0 - 0.1125, o.u1 + 0.1125, ya, ya + J, 0.006, T);
    }
    // gauged flat arch: rubbed-brick voussoirs radiating from a point one span below the opening (skewback 1 : 2),
    // timber lintel behind, optional projecting stone keystone
    function gaugedArch(r, o, key) {
      var u0 = o.u0, u1 = o.u1, uc = o.uc, w = u1 - u0, ya = o.v1, H3 = 3 * CH, wt = w + 0.1125;
      var n = Math.round(wt / 0.072); if (n % 2 === 0) n++;
      for (var i = 0; i < n; i++) {
        var ub0 = u0 + w * i / n, ub1 = u0 + w * (i + 1) / n, ut0 = u0 - 0.05625 + wt * i / n, ut1 = u0 - 0.05625 + wt * (i + 1) / n;
        var bm = (ub0 + ub1) / 2, tm = (ut0 + ut1) / 2, cu = (bm + tm) / 2;
        if (key && Math.abs(cu - uc) < 0.1) continue;
        var th = Math.atan2(tm - bm, H3), wd = ((ub1 - ub0) + (ut1 - ut0)) / 2 - 0.005;
        var len = (H3 - 0.012 - wd * Math.abs(Math.sin(th))) / Math.cos(th), p = rpt(r, cu, BW / 2);
        K.box('brick', p[0], ya + H3 / 2, p[1], wd, len, BW, { ry: r.ry, rz: -th, color: pick(PAL.rub), kind: 'brick' });
      }
      rbox('timber', r, u0 - 0.01875, u1 + 0.01875, ya, ya + H3 - 0.01, BW + 0.01, T);
      if (key) rbox('stone', r, uc - 0.095, uc + 0.095, ya + 0.004, ya + H3 + CH, -0.02, BW, { color: S() });
    }

    // ── the wall loop: every run rises course by course together; hooks fire as the brickwork reaches them ──
    function buildWalls(runs, nMax, hooks) {
      hooks.sort(function (a, b) { return a.n - b.n; });
      var hk = 0;
      for (var k = 0; k < nMax; k++) {
        while (hk < hooks.length && hooks[hk].n <= k) { hooks[hk].fn(); hk++; }
        K.stage('masonry');
        runs.forEach(function (r) {
          if (k < (r.n0 || 0) || k >= r.n1) return;
          var band = null;
          r.bands.forEach(function (b) { if (k >= b.n0 && k < b.n1) band = b; });
          if (band) { if (k === band.n0) emitBand(r, band); return; }
          var uA = 0, uB = r.L, q;
          if (r.sC) { q = quoinAt(r.sC, k); uA = q ? q.lb : (((k + r.sC.par) % 2 === 0) ? 0 : CL); if (q && q.first && r.sC.emit !== false) emitQuoin(r.sC, k, q); }
          if (r.eC) { q = quoinAt(r.eC, k); uB = q ? r.L - q.la : (((k + r.eC.par) % 2 === 0) ? r.L - CL : r.L); }
          var segs = [[uA, uB]];
          r.ex.forEach(function (x) { if (k >= x[0] && k < x[1]) segs = subtract(segs, x[2], x[3]); });
          segs.sort(function (a, b) { return a[0] - b[0]; });
          if (segs.length) layCourse(r, k, segs);
          (r.ev[k] || []).forEach(function (f) { f(); });
        });
      }
      while (hk < hooks.length) { hooks[hk].fn(); hk++; }
    }

    //@@PART2@@
  };
})(HB3D);
