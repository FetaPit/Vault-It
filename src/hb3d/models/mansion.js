// Georgian manor house (c. 1770): symmetrical seven-bay, three-storey brick block (19.35 × 11.25 m) on a raised
// ground floor, one-brick solid walls — the entrance front in true Flemish bond with burnt headers, the other walls
// in Flemish-faced brickwork — rusticated stone quoins, stone plinth, first-floor string course and a modillion
// cornice under a brick parapet with stone coping; gauged-brick flat arches with keystones, stone cills, six-over-six
// timber sashes set back behind the reveal; tetrastyle Tuscan portico with a pediment over a six-panel door and
// radiating fanlight; hipped slate roof behind a lead box gutter with three lead-cheeked dormers front and back and
// two spine-wall chimney stacks; two-storey hipped wings (7.2 × 8.55 m) set back 1.35 m with boxed modillion eaves.
// Forecourt: gravel sweep round a lawn turning circle with a fountain, iron railings on a stone kerb, rusticated gate
// piers with ball finials and wrought-iron gates, clipped yews, box hedges and parkland trees.
// Clean shell (Kit detail 'clean'): K.fine() holds everything that is not visible exterior (foundations, scaffold, floors and
// ceilings, rainwater goods, forecourt, lantern); the hidden back stretchers of the Flemish walls, the brickwork buried behind
// the wings / portico podium / garden-door landing, the stack courses inside the roof void and 2/3 of the mortar cores are
// never laid; K.shell() registers the outer-face loops. Full-model output is unchanged.
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
    function S() { return jit(0xe4dccb, 0.06); }                  // Portland stone (explicit instance colour)
    function slateCol() { var c = K.rand() < 0.2 ? 0x4e4954 : 0x464c56; return jit(c, 0.14); }   // Welsh blue-grey, a few heather slates

    // ── run helpers: a run is a straight wall face a→b; out = left normal (−dz, dx); depth measured inwards ──
    function mk(ax, az, bx, bz, o) {
      var L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      return Object.assign({ ax: ax, az: az, bx: bx, bz: bz, L: L, dx: dx, dz: dz, out: [-dz, dx], ry: Math.atan2(-dz, dx), ex: [], ev: {}, bands: [], breaks: {} }, o || {});
    }
    function rpt(r, u, d) { return [r.ax + r.dx * u - r.out[0] * d, r.az + r.dz * u - r.out[1] * d]; }
    function rbox(mat, r, u0, u1, ya, yb, d0, d1, o) {
      var uc = (u0 + u1) / 2, dc = (d0 + d1) / 2, oo = o || {};         // no per-brick allocations: _push reads o at once
      oo.ry = r.ry;
      return K.box(mat, r.ax + r.dx * uc - r.out[0] * dc, (ya + yb) / 2, r.az + r.dz * uc - r.out[1] * dc, u1 - u0, yb - ya, d1 - d0, oo);
    }
    function on(r, k, fn) { (r.ev[k] = r.ev[k] || []).push(fn); }

    // ── brick courses: Flemish bond set out from BOTH ends of the run (as bricklayers do from the quoins), the two
    //    halves meeting in a broken-bond closer at r.mid (placed in an opening where possible). End phase: 'thru' =
    //    this run turns the corner (quoin header + queen closer), 'stop' = the other wall's header covers the corner
    //    (start one brick in, with a header), 'free' = alternate by course. bond 'flemish' = full one-brick wall
    //    (stretcher pairs + through headers); 'face' = Flemish-faced wall (face stretchers + through headers, lime core) ──
    function layCourse(r, k, segs, es, ee) {
      var yb = Y(k), ya = yb + J, yt = yb + CH, plinth = k < N.plinth, full = r.bond === 'flemish' || (r.parapet && k >= N.corn1);   // parapets: fair-faced both sides
      var oddS = es === 'thru' ? true : (es === 'stop' ? false : k % 2 === 1);
      var oddE = ee === 'thru' ? true : (ee === 'stop' ? false : k % 2 === 1);
      var mid = r.mid != null ? r.mid : r.L / 2, units = [], back = [], u = 0, v = r.L, nx = 'S', Lu, i;
      if (oddS) { units.push(['H', 0, BW]); units.push(['Q', BW + J, BW + J + 0.046]); u = BW + 2 * J + 0.046; }
      while (u + (Lu = nx === 'S' ? BL : BW) <= mid) { units.push([nx, u, u + Lu]); u += Lu + J; nx = nx === 'S' ? 'H' : 'S'; }
      if (oddE) { back.push(['H', r.L - BW, r.L]); back.push(['Q', r.L - BW - J - 0.046, r.L - BW - J]); v = r.L - BW - 2 * J - 0.046; }
      nx = 'S';
      while (v - (Lu = nx === 'S' ? BL : BW) >= Math.max(mid, u)) { back.push([nx, v - Lu, v]); v -= Lu + J; nx = nx === 'S' ? 'H' : 'S'; }
      var c = u;                                                   // broken bond: whole stretchers, then one cut unit
      while (v - c > BL + 2 * J + 0.03) { units.push(['S', c, c + BL]); c += BL + J; }
      var g = v - c;
      if (g > BL) { var pd = (g - BL) / 2; units.push(['S', c + pd, c + pd + BL]); }
      else if (g > BW) units.push(['S', c, v]);
      else if (g >= 0.03) units.push(['C', c, v]);
      for (i = back.length - 1; i >= 0; i--) units.push(back[i]);
      var si = 0;
      for (i = 0; i < units.length; i++) {
        var un = units[i];
        for (var s = si; s < segs.length; s++) {
          var sg = segs[s]; if (sg[0] >= un[2]) break;
          var a = Math.max(un[1], sg[0]), e = Math.min(un[2], sg[1]);
          if (sg[1] <= un[1]) { si = s + 1; continue; }
          if (e - a < 0.03) continue;
          if (un[0] === 'S') {
            rbox('brick', r, a, e, ya, yt, 0, BW, { color: pick(plinth ? PAL.plinth : PAL.str), kind: 'brick' });
            if (full && !K.clean) rbox('brick', r, a, e, ya, yt, T - BW, T, { color: pick(plinth ? PAL.plinth : PAL.str), kind: 'brick' });   // back stretchers: hidden, full model only
          } else {
            rbox('brick', r, a, e, ya, yt, 0, T, { color: pick(plinth ? PAL.plinth : (K.rand() < 0.65 ? PAL.hdr : PAL.str)), kind: 'brick' });
          }
        }
      }
      // bed + perpends behind the units, recessed 6 mm from the face AND from the cut ends (reveals, corners)
      if (K.clean) { mortarAcc(r, k, segs); return; }
      segs.forEach(function (sg) { if (sg[1] - sg[0] > 0.03) rbox('mortarLime', r, sg[0] + 0.006, sg[1] - 0.006, yb, yt, 0.006, T - 0.006); });
    }
    // clean shell: the lime core is one box per up-to-eight courses of an unchanged segment (the joints look the same,
    // the instance count drops by two thirds); flushed when the walls are finished
    function mortarAcc(r, k, segs) {
      var prev = r.mopen || [], cur = [];
      segs.forEach(function (sg) {
        if (sg[1] - sg[0] <= 0.03) return;
        var g = null;
        for (var i = 0; i < prev.length; i++) { var p = prev[i]; if (p.k1 === k && p.k1 - p.k0 < 8 && Math.abs(p.a - sg[0]) < 0.001 && Math.abs(p.b - sg[1]) < 0.001) { g = p; break; } }
        if (g) g.k1 = k + 1; else { g = { a: sg[0], b: sg[1], k0: k, k1: k + 1 }; (r.mlist = r.mlist || []).push(g); }
        cur.push(g);
      });
      r.mopen = cur;
    }
    function flushMortar(runs) {
      runs.forEach(function (r) {
        (r.mlist || []).forEach(function (g) { rbox('mortarLime', r, g.a + 0.006, g.b - 0.006, Y(g.k0), Y(g.k1), 0.006, T - 0.006); });
        r.mlist = []; r.mopen = [];
      });
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
        var m = (a + e) / 2, hz = br.filter(function (z) { return m > z[0] && m < z[1]; })[0], flush = !!hz;
        if (flush && hz[2] === 'buried' && K.clean) continue;               // flush stone buried behind a wing / the portico podium
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
        for (var j = 0; j < 3; j++) r.ex.push([n1 + j, n1 + j + 1, u0 - 0.01875 * (j + 0.5), u1 + 0.01875 * (j + 0.5)]);   // cut to the 1:4 skewback
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
    // gauged flat arch: an odd number of rubbed-brick voussoirs fanning out to a 1 : 4 skewback, three courses deep,
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
    function buildWalls(runs, nMax, hooks, stage) {
      hooks.sort(function (a, b) { return a.n - b.n; });
      var hk = 0, k0 = Math.min.apply(null, runs.map(function (r) { return r.n0 || 0; }));
      for (var k = k0; k < nMax; k++) {
        while (hk < hooks.length && hooks[hk].n <= k) { hooks[hk].fn(); hk++; }
        K.stage(stage || 'masonry');
        runs.forEach(function (r) {
          if (k < (r.n0 || 0) || k >= r.n1) return;
          var band = null;
          r.bands.forEach(function (b) { if (k >= b.n0 && k < b.n1) band = b; });
          if (band) { if (k === band.n0) emitBand(r, band); return; }
          var uA = 0, uB = r.L, q, es = 'free', ee = 'free';
          if (r.sC) {
            q = quoinAt(r.sC, k);
            if (q) { uA = q.lb; if (q.first && r.sC.emit !== false) emitQuoin(r.sC, k, q); }
            else { es = ((k + r.sC.par) % 2 === 0) ? 'thru' : 'stop'; uA = es === 'thru' ? 0 : CL; }
          }
          if (r.eC) {
            q = quoinAt(r.eC, k);
            if (q) uB = r.L - q.la;
            else { ee = ((k + r.eC.par) % 2 === 1) ? 'thru' : 'stop'; uB = ee === 'thru' ? r.L : r.L - CL; }
          }
          var segs = [[uA, uB]];
          r.ex.forEach(function (x) { if (k >= x[0] && k < x[1]) segs = subtract(segs, x[2], x[3]); });
          segs.sort(function (a, b) { return a[0] - b[0]; });
          if (segs.length) layCourse(r, k, segs, es, ee);
          (r.ev[k] || []).forEach(function (f) { f(); });
        });
      }
      while (hk < hooks.length) { hooks[hk].fn(); hk++; }
      if (K.clean) { K.stage(stage || 'masonry'); flushMortar(runs); }
    }

    // ── six-over-six box sash (fit-out): painted box frame behind a 4½" reveal, upper sash on the outer track,
    //    lower sash on the inner, 3 × 2 panes each between slender glazing bars, horns on the upper sash ──
    function sashFit(r, o, set) {
      set = set == null ? 0.105 : set;
      var u0 = o.u0, u1 = o.u1, v0 = o.v0, v1 = o.v1;
      var B = function (ua, ub, ya, yb, da, db, m) { if (ub - ua > 0.002 && yb - ya > 0.002) rbox(m || 'timberPaint', r, ua, ub, ya, yb, set + da, set + db); };
      var fw = 0.055, hd = 0.06, sd = 0.05;
      B(u0, u1, v1 - hd, v1, 0, 0.10);                                   // head
      B(u0 - 0.012, u1 + 0.012, v0, v0 + sd, -0.035, 0.10);             // sill, nosing over the stone cill
      B(u0, u0 + fw, v0 + sd, v1 - hd, 0, 0.10); B(u1 - fw, u1, v0 + sd, v1 - hd, 0, 0.10);   // pulley stiles
      var a = u0 + fw, b = u1 - fw, lo = v0 + sd, hi = v1 - hd, vm = (lo + hi) / 2, st = 0.045, br = 0.018;
      [[vm - 0.02, hi, 0.012, 0.047, 0.05, 0.04], [lo, vm + 0.02, 0.052, 0.087, 0.04, 0.075]].forEach(function (s, si) {
        var y0 = s[0], y1 = s[1], d0 = s[2], d1 = s[3];
        B(a, a + st, y0, y1, d0, d1); B(b - st, b, y0, y1, d0, d1);                     // stiles
        B(a + st, b - st, y1 - s[4], y1, d0, d1); B(a + st, b - st, y0, y0 + s[5], d0, d1);   // top / bottom (meeting) rails
        var ga = a + st, gb = b - st, gy0 = y0 + s[5], gy1 = y1 - s[4], dm = (d0 + d1) / 2;
        B(ga, gb, gy0, gy1, dm - 0.003, dm + 0.003, 'glass');
        for (var c = 1; c < 3; c++) { var uc = ga + (gb - ga) * c / 3; B(uc - br / 2, uc + br / 2, gy0, gy1, d0 + 0.006, d1 - 0.006); }
        var ym = (gy0 + gy1) / 2; B(ga, gb, ym - br / 2, ym + br / 2, d0 + 0.006, d1 - 0.006);
        if (si === 0) { B(a, a + st, y0 - 0.06, y0, d0, d1); B(b - st, b, y0 - 0.06, y0, d0, d1); }   // horns
      });
    }

    // ── six-panel door under a radiating fanlight (fit-out); o.glazed → glazed upper panels (garden door) ──
    function doorFit(r, o, col) {
      var set = 0.10, u0 = o.u0, u1 = o.u1, v0 = o.v0, v1 = o.v1, uc = (u0 + u1) / 2, fw = 0.075, F = 'timberPaint';
      var B = function (m, ua, ub, ya, yb, da, db, oo) { if (ub - ua > 0.002 && yb - ya > 0.002) return rbox(m, r, ua, ub, ya, yb, set + da, set + db, oo); };
      var lh = 2.04, tr = v0 + lh + 0.01, ga = u0 + fw, gb = u1 - fw;
      B(F, u0, u0 + fw, v0, v1 - fw, 0, 0.12); B(F, u1 - fw, u1, v0, v1 - fw, 0, 0.12); B(F, u0, u1, v1 - fw, v1, 0, 0.12);
      B(F, ga, gb, tr, tr + 0.07, -0.015, 0.12);                          // transom
      var fy0 = tr + 0.07, fy1 = v1 - fw, fh = fy1 - fy0;
      if (fh > 0.12) {
        B('glass', ga, gb, fy0, fy1, 0.045, 0.051);
        var hub = rpt(r, uc, set + 0.04);
        K.cyl(F, hub[0], fy0, hub[1], 0.06, 0.035, { rx: PI / 2, ry: r.ry });
        var R0 = Math.min(fh, (gb - ga) / 2) * 0.62;
        for (var i = 1; i < 8; i++) {                                     // radiating bars out to the frame
          var th = PI * i / 8, cx_ = Math.cos(th), sy_ = Math.sin(th);
          var Lb = Math.min(fh / sy_, Math.abs(cx_) > 1e-3 ? (gb - ga) / 2 / Math.abs(cx_) : 9) - 0.05;
          var pb = rpt(r, uc + cx_ * (Lb + 0.05) / 2, set + 0.04);
          K.box(F, pb[0], fy0 + sy_ * (Lb + 0.05) / 2, pb[1], Lb - 0.05, 0.016, 0.03, { ry: r.ry, rz: th });
        }
        for (var j = 0; j < 8; j++) {                                     // the arc of the fan
          var tm = PI * (j + 0.5) / 8, ch = 2 * R0 * Math.sin(PI / 16), pa = rpt(r, uc + Math.cos(tm) * R0, set + 0.04);
          K.box(F, pa[0], fy0 + Math.sin(tm) * R0, pa[1], ch, 0.016, 0.03, { ry: r.ry, rz: tm - PI / 2 });
        }
      }
      // the leaf: stiles, rails and muntin framing six fielded panels (short top, tall middle, bottom)
      // the leaf, framed: stiles, four rails and a muntin round six recessed fielded panels (or glazing)
      var la = ga + 0.003, lb = gb - 0.003, y0 = v0 + 0.006, yT = tr - 0.003, sw = 0.12, mw = 0.10, pw = (lb - la - 2 * sw - mw) / 2;
      var rows = [[0.20, 0.45], [0.83, 0.70], [1.63, yT - y0 - 1.63 - 0.11]];
      B(col, la, la + sw, y0, yT, 0.03, 0.075); B(col, lb - sw, lb, y0, yT, 0.03, 0.075);
      [[0, 0.20], [0.65, 0.83], [1.53, 1.63], [yT - y0 - 0.11, yT - y0]].forEach(function (rl) { B(col, la + sw, lb - sw, y0 + rl[0], y0 + rl[1], 0.03, 0.075); });
      rows.forEach(function (rw, ri) {
        var ya = y0 + rw[0], yb = ya + rw[1], glass = o.glazed && ri > 0;
        B(col, la + sw + pw, la + sw + pw + mw, ya, yb, 0.03, 0.075);                     // muntin
        [la + sw, la + sw + pw + mw].forEach(function (pu) {
          if (glass) {
            B('glass', pu, pu + pw, ya, yb, 0.05, 0.056);
            B(col, pu + pw / 2 - 0.01, pu + pw / 2 + 0.01, ya, yb, 0.04, 0.065);
            if (ri === 1) B(col, pu, pu + pw, (ya + yb) / 2 - 0.01, (ya + yb) / 2 + 0.01, 0.04, 0.065);
          } else {
            B(col, pu, pu + pw, ya, yb, 0.05, 0.065);                                     // panel, 20 mm behind the framing
            B(col, pu + 0.04, pu + pw - 0.04, ya + 0.04, yb - 0.04, 0.04, 0.05);           // raised field
          }
        });
      });
      var kn = rpt(r, uc, set + 0.012);                                   // brass knob on the muntin, knocker, letter plate
      K.cyl('brass', kn[0], y0 + 1.0, kn[1], 0.032, 0.05, { rx: PI / 2, ry: r.ry });
      B('brass', uc - 0.04, uc + 0.04, y0 + 1.42, y0 + 1.56, 0.014, 0.03);
      B('brass', uc - 0.13, uc + 0.13, y0 + 0.71, y0 + 0.765, 0.018, 0.03);
    }

    // ── scaffold run in front of a wall face a→b (out = left normal): standards, ledger, guard rail, transoms and
    //    five boards; each lift appears as the brickwork reaches it, all struck before the fit-out ends ──
    function scafRun(ax, az, bx, bz, y, yPrev) {
      var r = mk(ax, az, bx, bz), hide = { hideAfter: 0.80 }, off = 1.15, n = Math.max(1, Math.round(r.L / 2.0));
      for (var i = 0; i <= n; i++) {
        var p = rpt(r, r.L * i / n, -off), q = rpt(r, r.L * i / n, -0.12);
        K.tube('scaffold', [p[0], yPrev, p[1]], [p[0], y + 1.0, p[1]], 0.024, hide);
        K.tube('scaffold', [p[0], y - 0.05, p[1]], [q[0], y - 0.05, q[1]], 0.024, hide);    // transom to the wall
      }
      var a = rpt(r, 0, -off), b = rpt(r, r.L, -off);
      K.tube('scaffold', [a[0], y - 0.05, a[1]], [b[0], y - 0.05, b[1]], 0.024, hide);
      K.tube('scaffold', [a[0], y + 1.0, a[1]], [b[0], y + 1.0, b[1]], 0.024, hide);
      for (var bi = 0; bi < 5; bi++) rbox('scaffoldBoard', r, 0, r.L, y - 0.026, y + 0.012, -(0.165 + (bi + 1) * 0.19), -(0.17 + bi * 0.19), hide);
    }

    // ── main cornice mouldings (added to the cornice band): bed mould, modillions, corona, cymatium ──
    var PC = 0.06;                                                    // projection of the frieze (band core)
    function corniceExtra(r) {
      var yb = Y(N.corn0), L = r.L;
      [[0.175, 0.25, 0.13], [0.34, 0.43, 0.40], [0.43, 0.475, 0.37]].forEach(function (ly) {
        var p = ly[2], a = r.sC ? (r.own ? -p : -PC) : 0, e = r.eC ? (r.own ? L + p : L + PC) : L;
        rbox('stone', r, a, e, yb + ly[0], yb + ly[1], -p, -PC, { color: S() });
      });
      for (var u = 0.3; u < L - 0.25; u += 0.4) rbox('stone', r, u - 0.045, u + 0.045, yb + 0.25, yb + 0.34, -0.34, -0.13, { color: S() });
    }
    // stone coping on the parapet, mitred round the corners by the X-runs
    function coping(r) {
      var c = 0.035, a = r.sC ? (r.own ? -c : T + c) : 0, e = r.eC ? (r.own ? r.L + c : r.L - T - c) : r.L;
      rbox('mortarLime', r, Math.max(a, 0), Math.min(e, r.L), Y(N.par), Y(N.par) + J, 0.006, T);
      rbox('stone', r, a, e, Y(N.par) + J, Y(N.par) + 0.11, -c, T + c, { color: S() });
    }
    // boxed timber eaves cornice of the wings: fascia (corona), soffit on modillions, bed mould, ogee gutter
    function wingEaves(r, e, ov) {
      var sy = e - 0.19, P = 'timberPaint', own = r.own, ext = function (x) { return [r.sC ? -x : 0, r.eC ? r.L + x : r.L]; };
      K.stage('roofframe');
      var f = ext(own ? ov + 0.03 : ov), so = ext(own ? ov : 0), bm = ext(own ? 0.05 : 0);
      rbox(P, r, f[0], f[1], sy - 0.02, e + 0.03, -ov - 0.03, -ov);
      rbox(P, r, so[0], so[1], sy, sy + 0.02, -ov, 0);
      rbox(P, r, bm[0], bm[1], sy - 0.09, sy, -0.05, 0);
      for (var u = 0.25; u < r.L - 0.2; u += 0.4) rbox(P, r, u - 0.04, u + 0.04, sy - 0.08, sy, -ov + 0.05, -0.05);
      K.stage('fitout');
      var g = ext(ov + 0.09), ga = rpt(r, g[0], -ov - 0.09), gb = rpt(r, g[1], -ov - 0.09);   // runs meet at the mitre
      K.tube('gutter', [ga[0], e - 0.03, ga[1]], [gb[0], e - 0.03, gb[1]], 0.06);
      if (own && r.sC) K.sph('gutter', ga[0], e - 0.03, ga[1], 0.06);
      if (own && r.eC) K.sph('gutter', gb[0], e - 0.03, gb[1], 0.06);
    }
    function downpipe(r, u, yTop, dOut, yFoot) {                     // cast-iron downpipe with swan neck and shoe
      var a = rpt(r, u, dOut), b = rpt(r, u, -0.09), y2 = yTop - 0.25, y3 = y2 - 0.35;
      K.tube('gutter', [a[0], yTop, a[1]], [a[0], y2, a[1]], 0.036);
      K.tube('gutter', [a[0], y2, a[1]], [b[0], y3, b[1]], 0.036);
      K.tube('gutter', [b[0], y3, b[1]], [b[0], (yFoot || 0) + 0.12, b[1]], 0.036);
      K.box('gutter', b[0], (yFoot || 0) + 0.07, b[1], 0.12, 0.10, 0.12, { ry: r.ry });
      pipeEars(r, u, -0.09, (yFoot || 0) + 0.6, y3 - 0.2);
    }
    function pipeEars(r, u, d, ya, yb) {                              // cast-iron ears spiked into the joints
      for (var y = ya; y <= yb + 1e-6; y += Math.max(0.5, (yb - ya) / Math.max(1, Math.round((yb - ya) / 1.8)))) {
        var yy = (y > 0.4 && y < 0.66) ? 0.75 : ((y > 3.85 && y < 4.2) ? 4.25 : y);   // clear of the plinth and string course
        rbox('gutter', r, u - 0.05, u + 0.05, yy - 0.02, yy + 0.02, d, 0);
      }
    }

    // ── chimney stack in Flemish-faced brickwork (one brick thick round the flues), corners bonded like the walls,
    //    two oversailing courses, mortar flaunching, clay pots, lead apron where it leaves the roof ──
    function stack(s, n0, n1, roofY, nEnv) {
      var x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, z0 = s.z - s.d / 2, z1 = s.z + s.d / 2;
      var ring = function (o, na, nb) {
        var q = { bond: 'face', n0: na, n1: nb };
        var a = mk(x0 - o, z1 + o, x1 + o, z1 + o, Object.assign({ own: true }, q)), b = mk(x1 + o, z1 + o, x1 + o, z0 - o, q);
        var c = mk(x1 + o, z0 - o, x0 - o, z0 - o, Object.assign({ own: true }, q)), d = mk(x0 - o, z0 - o, x0 - o, z1 + o, q);
        corner(d, a, [], 0); corner(a, b, [], 1); corner(b, c, [], 0); corner(c, d, [], 1);
        return [a, b, c, d];
      };
      buildWalls(ring(0, n0, n1 - 2).concat(ring(0.045, n1 - 2, n1)), n1, [], 'roofcover');
      var top = Y(n1);
      K.box('mortarDark', s.x, top + 0.04, s.z, s.w + 0.01, 0.08, s.d + 0.01);
      for (var i = 0; i < s.pots; i++) {
        var px = x0 + s.w * (i + 0.5) / s.pots;
        K.cyl('terracotta', px, top + 0.38, s.z, 0.115, 0.60, {});
        K.cyl('terracotta', px, top + 0.70, s.z, 0.13, 0.05, {});
      }
      K.box('lead', s.x, roofY + 0.10, s.z, s.w + 0.10, 0.20, s.d + 0.10);
      K.env(x0, Y(nEnv == null ? n0 : nEnv), z0, x1, top + 0.75, z1);
    }

    // ── hipped slate roof, ridge along X, over the eaves-line rectangle [x0,x1]×[z0,z1]; e = top of the rafters at the
    //    eaves line; open0/open1 = that end abuts a wall (no hip there). frame(): ridge board, hip rafters, commons and
    //    jacks at 400 c/c trimmed round the holes; cover(): battens, then 500 × 250 Welsh slates course by course
    //    (broken bond, 75 mm head lap, cut to the hips in two steps), lead hip and ridge rolls.
    //    holes: plan rectangles [xa,xb,za,zb] (dormers, stacks) left unslated ──
    var SG = 0.2125, SLL = 0.5, SLW = 0.25, STH = 0.006, KICK = 0.022, SOFF = 0.025 + STH / 2 + 0.002;
    // triangular pieces in any plane: Euler angles (order YZX, as the viewer) from a basis whose columns are the local
    // axes; isoTri = isosceles prism (base b0→b1, apex over the base midpoint); rightTri = right triangle (right angle
    // at C) as two isosceles prisms meeting at the mid-point of the hypotenuse
    function eulerYZX(m) {
      var z = Math.asin(Math.max(-1, Math.min(1, m[1][0])));
      if (Math.abs(m[1][0]) < 0.9999999) return [Math.atan2(-m[1][2], m[1][1]), Math.atan2(-m[2][0], m[0][0]), z];
      return [0, Math.atan2(m[0][2], m[2][2]), z];
    }
    function isoTri(mat, b0, b1, ap, th, o) {
      var X = [b1[0] - b0[0], b1[1] - b0[1], b1[2] - b0[2]], sx = Math.hypot(X[0], X[1], X[2]);
      var mid = [(b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2, (b0[2] + b1[2]) / 2], Yv = [ap[0] - mid[0], ap[1] - mid[1], ap[2] - mid[2]], sy = Math.hypot(Yv[0], Yv[1], Yv[2]);
      if (sx < 0.01 || sy < 0.005) return null;
      X = X.map(function (v) { return v / sx; }); Yv = Yv.map(function (v) { return v / sy; });
      var Z = [X[1] * Yv[2] - X[2] * Yv[1], X[2] * Yv[0] - X[0] * Yv[2], X[0] * Yv[1] - X[1] * Yv[0]];
      var e = eulerYZX([[X[0], Yv[0], Z[0]], [X[1], Yv[1], Z[1]], [X[2], Yv[2], Z[2]]]);
      return K.tri(mat, (mid[0] + ap[0]) / 2, (mid[1] + ap[1]) / 2, (mid[2] + ap[2]) / 2, sx, sy, th, Object.assign({ rx: e[0], ry: e[1], rz: e[2] }, o || {}));
    }
    function rightTri(mat, C, A, B, th, o) {
      var M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
      isoTri(mat, C, A, M, th, o); isoTri(mat, C, B, M, th, Object.assign({}, o, { kind: '' }));   // one slate, counted once
    }
    function hipRoof(o) {
      var pr = o.pitch * PI / 180, t = Math.tan(pr), cs = Math.cos(pr), half = (o.z1 - o.z0) / 2, zm = (o.z0 + o.z1) / 2;
      var R = { o: o, pr: pr, t: t, cs: cs, half: half, zm: zm, ridgeY: o.e + half * t, xr0: o.open0 ? o.x0 : o.x0 + half, xr1: o.open1 ? o.x1 : o.x1 - half };
      var slopes = [
        { ax: 0, a0: o.x0, a1: o.x1, c0: !o.open0, c1: !o.open1, H: function (x, z) { return o.z1 - z; }, P: function (a, h) { return [a, o.z1 - h]; }, rot: function (th) { return { rx: th }; }, n: [0, cs, Math.sin(pr)] },
        { ax: 0, a0: o.x0, a1: o.x1, c0: !o.open0, c1: !o.open1, H: function (x, z) { return z - o.z0; }, P: function (a, h) { return [a, o.z0 + h]; }, rot: function (th) { return { rx: -th }; }, n: [0, cs, -Math.sin(pr)] }
      ];
      if (!o.open1) slopes.push({ ax: 1, a0: o.z0, a1: o.z1, c0: true, c1: true, H: function (x) { return o.x1 - x; }, P: function (a, h) { return [o.x1 - h, a]; }, rot: function (th) { return { rz: -th }; }, n: [Math.sin(pr), cs, 0] });
      if (!o.open0) slopes.push({ ax: 1, a0: o.z0, a1: o.z1, c0: true, c1: true, H: function (x) { return x - o.x0; }, P: function (a, h) { return [o.x0 + h, a]; }, rot: function (th) { return { rz: th }; }, n: [-Math.sin(pr), cs, 0] });
      var prep = function () { slopes.forEach(function (S) {
        S.holes = (o.holes || []).map(function (hl) {
          var h0 = S.H(hl[0], hl[2]), h1 = S.H(hl[1], hl[3]), a0 = S.ax ? hl[2] : hl[0], a1 = S.ax ? hl[3] : hl[1];
          return { h0: Math.min(h0, h1), h1: Math.max(h0, h1), a0: Math.min(a0, a1), a1: Math.max(a0, a1) };
        });
        S.ext = function (h) { return [S.a0 + (S.c0 ? h : 0), S.a1 - (S.c1 ? h : 0)]; };
        S.cut = function (aL, aR, h) { var sg = [[aL, aR]]; S.holes.forEach(function (hl) { if (h > hl.h0 && h < hl.h1) sg = subtract(sg, hl.a0, hl.a1); }); return sg; };
      }); };
      K.env(o.x0, o.e, o.z0, o.x1, R.ridgeY, o.z1);
      R.frame = function () {
        prep(); K.stage('roofframe');
        var rc = 0.075 / cs, rb = [[R.xr0, R.xr1]];
        (o.holes || []).forEach(function (hl) { if (zm > hl[2] && zm < hl[3]) rb = subtract(rb, hl[0] - 0.03, hl[1] + 0.03); });
        rb.forEach(function (s) { if (s[1] - s[0] > 0.05) K.box('timber', (s[0] + s[1]) / 2, R.ridgeY - 0.11, zm, s[1] - s[0], 0.2, 0.038); });
        if (!o.open0) [o.z0, o.z1].forEach(function (z) { K.beam('timber', [o.x0, o.e - 0.12, z], [R.xr0, R.ridgeY - 0.12, zm], 0.2, 0.05); });
        if (!o.open1) [o.z0, o.z1].forEach(function (z) { K.beam('timber', [o.x1, o.e - 0.12, z], [R.xr1, R.ridgeY - 0.12, zm], 0.2, 0.05); });
        slopes.forEach(function (S) {
          for (var a = S.a0 + 0.2; a < S.a1 - 0.1; a += 0.4) {
            var lim = Math.min(half, S.c0 ? a - S.a0 : 1e9, S.c1 ? S.a1 - a : 1e9) - 0.03;
            if (lim < 0.12) continue;
            var pcs = [[0.05, lim]];
            S.holes.forEach(function (hl) { if (a > hl.a0 - 0.03 && a < hl.a1 + 0.03) pcs = subtract(pcs, hl.h0 - 0.02, hl.h1 + 0.02); });
            pcs.forEach(function (pc) {
              if (pc[1] - pc[0] < 0.1) return;
              var p0 = S.P(a, pc[0]), p1 = S.P(a, pc[1]);
              K.beam('timber', [p0[0], o.e + pc[0] * t - rc, p0[1]], [p1[0], o.e + pc[1] * t - rc, p1[1]], 0.15, 0.05);
            });
          }
        });
      };
      R.cover = function () {
        prep(); K.stage('roofcover');
        var sMax = half / cs;
        function slate(S, aL, aR, s0, le, off) {
          var hc = (s0 + le / 2) * cs, p = S.P((aL + aR) / 2, hc), w = aR - aL - 0.004, y = o.e + hc * t + (off + le / 2 * Math.sin(KICK)) / cs;
          K.box('slate', p[0], y, p[1], S.ax ? le : w, STH, S.ax ? w : le, Object.assign(S.rot(pr - KICK), { kind: 'tile', color: slateCol() }));
        }
        slopes.forEach(function (S) {
          for (var bi = 0; ; bi++) {                                    // battens at slate gauge
            var hb = (bi * SG + 0.05) * cs; if (hb > half - 0.03) break;
            var ex = S.ext(hb); if (ex[1] - ex[0] < 0.05) break;
            S.cut(ex[0], ex[1], hb).forEach(function (sg) {
              if (sg[1] - sg[0] < 0.05) return;
              var p = S.P((sg[0] + sg[1]) / 2, hb);
              K.box('timber', p[0], o.e + hb * t + 0.0125 / cs, p[1], S.ax ? 0.05 : sg[1] - sg[0], 0.025, S.ax ? sg[1] - sg[0] : 0.05, S.rot(pr));
            });
          }
          for (var i = 0; ; i++) {
            var s0 = i * SG; if (s0 > sMax - 0.05) break;
            var le = Math.min(SLL, sMax - s0), eT = S.ext((s0 + le) * cs), eB = S.ext(s0 * cs), hc = (s0 + le / 2) * cs;
            if (eB[1] - eB[0] < 0.03) break;
            if (eT[0] > eT[1]) { var m = (eT[0] + eT[1]) / 2; eT = [m, m]; }
            var shift = (i % 2) * SLW / 2, off = SOFF + (i % 2) * 0.0012;
            for (var a = S.a0 - SLW + shift; a < S.a1; a += SLW) {   // whole slates, cut square at the hip line at their head
              var aL = Math.max(eT[0], a), aR = Math.min(eT[1], a + SLW);
              if (aR - aL < 0.03) continue;
              S.cut(aL, aR, hc).forEach(function (sg) { if (sg[1] - sg[0] >= 0.03) slate(S, sg[0], sg[1], s0, le, off); });
            }
            // raking hip cut: the triangle between that square cut and the hip line, as a true triangular slate piece
            var W3 = function (a, s) { var p = S.P(a, s * cs), d = off + 0.003; return [p[0] + S.n[0] * d, o.e + s * Math.sin(pr) + S.n[1] * d, p[1] + S.n[2] * d]; };
            [[S.c0, eT[0], eB[0]], [S.c1, eT[1], eB[1]]].forEach(function (hc2) {
              if (!hc2[0] || Math.abs(hc2[1] - hc2[2]) < 0.02) return;
              rightTri('slate', W3(hc2[1], s0), W3(hc2[2], s0), W3(hc2[1], s0 + le), STH, { kind: 'tile', color: slateCol() });
            });
          }
        });
        // lead rolls on the hips and the ridge (on a lead saddle dressed over both slopes)
        var so = (SOFF + 0.012) / cs + 0.03;
        var hips = [];
        if (!o.open0) [o.z0, o.z1].forEach(function (z) { hips.push([[o.x0, o.e + so, z], [R.xr0, R.ridgeY + so, zm]]); });
        if (!o.open1) [o.z0, o.z1].forEach(function (z) { hips.push([[o.x1, o.e + so, z], [R.xr1, R.ridgeY + so, zm]]); });
        hips.forEach(function (hp) { K.tube('lead', hp[0], hp[1], 0.045); });
        if (R.xr1 - R.xr0 > 0.05) {
          [1, -1].forEach(function (sd) {
            var hh = half - 0.09 * cs, y = o.e + hh * t + (SOFF + 0.01) / cs;
            K.box('lead', (R.xr0 + R.xr1) / 2, y, zm + sd * 0.09 * cs, R.xr1 - R.xr0 + (o.open0 || o.open1 ? 0 : 0.1), 0.01, 0.18, { rx: sd * pr });
          });
          K.tube('lead', [R.xr0, R.ridgeY + so, zm], [R.xr1, R.ridgeY + so, zm], 0.05);
        }
      };
      return R;
    }

    // ── lead-clad dormer on a slope of roof R, dh behind the eaves line: painted timber front with a six-over-six
    //    sash, lead cheeks (each right triangle = two isosceles prisms meeting at the mid-point of the hypotenuse),
    //    lead flat roof under a timber cornice, lead apron dressed over the slates in front ──
    function dormerSpec(R, xc, front) {
      var o = R.o, w = 1.15, dh = 0.75, hF = 1.5, zf = front ? o.z1 - dh : o.z0 + dh, D = hF / R.t;
      return { R: R, xc: xc, front: front, w: w, dh: dh, hF: hF, zf: zf, D: D,
        hole: [xc - w / 2 - 0.03, xc + w / 2 + 0.03, front ? zf - D : zf, front ? zf : zf + D] };
    }
    function dormer(d) {
      var R = d.R, o = R.o, w = d.w, D = d.D, P = 'timberPaint';
      var dr = d.front ? mk(d.xc - w / 2, d.zf, d.xc + w / 2, d.zf) : mk(d.xc + w / 2, d.zf, d.xc - w / 2, d.zf);
      var yf = o.e + d.dh * R.t + (SOFF + 0.004) / R.cs, yt = yf + d.hF, v0 = yf + 0.2, v1 = yt - 0.16;
      K.stage('roofcover');
      rbox(P, dr, 0, 0.09, yf, yt - 0.05, 0, 0.1); rbox(P, dr, w - 0.09, w, yf, yt - 0.05, 0, 0.1);   // corner posts
      rbox(P, dr, 0.09, w - 0.09, v1, yt - 0.05, 0, 0.1);                                      // head
      rbox('lead', dr, 0.09, w - 0.09, yf, v0, 0.03, 0.1);                                     // lead panel under the sill
      [0.015, w - 0.015].forEach(function (u) {                                               // cheeks
        var p1 = rpt(dr, u, D / 4), p2 = rpt(dr, u, D / 2);
        K.tri('lead', p1[0], (yf + yt) / 2, p1[1], d.hF, D / 2, 0.03, { ry: dr.ry + PI / 2, rz: -PI / 2 });
        K.tri('lead', p2[0], yt - d.hF / 4, p2[1], D, d.hF / 2, 0.03, { ry: dr.ry + PI / 2, rz: PI });
      });
      rbox('lead', dr, -0.04, w + 0.04, yt - 0.05, yt + 0.02, 0, D + 0.1);                     // lead flat
      rbox(P, dr, -0.09, w + 0.09, yt - 0.07, yt + 0.06, -0.12, 0);                            // cornice
      var hh = d.dh - 0.15, c = d.front ? [d.xc, o.z1 - hh] : [d.xc, o.z0 + hh];
      K.box('lead', c[0], o.e + hh * R.t + (SOFF + 0.012) / R.cs, c[1], w + 0.16, 0.008, 0.3 / R.cs, { rx: (d.front ? 1 : -1) * R.pr });
      K.stage('fitout');
      sashFit(dr, { u0: 0.09, u1: w - 0.09, v0: v0, v1: v1 }, 0.015);
      K.stage('roofcover');
    }

    // ═══ PLAN ═══ runs go clockwise seen from above (outer face on the left normal):
    // main block F front · MR right · B rear · ML left; wings: LF/RF fronts, LS/RS outer sides, LB/RB rears (the
    // inner wing walls are the main block's side walls, which the wing fronts and rears butt against)
    var F = mk(0, 0, W, 0, { own: true, bond: 'flemish' }), MR = mk(W, 0, W, -D, { bond: 'face' });
    var B = mk(W, -D, 0, -D, { own: true, bond: 'face' }), ML = mk(0, -D, 0, 0, { bond: 'face' });
    var LF = mk(-WW, wz1, 0, wz1, { own: true, bond: 'face', n1: N.wTop }), LS = mk(-WW, wz0, -WW, wz1, { bond: 'face', n1: N.wTop });
    var LB = mk(0, wz0, -WW, wz0, { own: true, bond: 'face', n1: N.wTop });
    var RF = mk(W, wz1, W + WW, wz1, { own: true, bond: 'face', n1: N.wTop }), RS = mk(W + WW, wz1, W + WW, wz0, { bond: 'face', n1: N.wTop });
    var RB = mk(W + WW, wz0, W, wz0, { own: true, bond: 'face', n1: N.wTop });
    var MAIN = [F, MR, B, ML], WINGS = [LF, LS, LB, RF, RS, RB];
    MAIN.forEach(function (r) { r.n1 = N.par; r.parapet = true; });
    // corners: rusticated quoins between the plinth, string course and cornice; F/B (and wing fronts/rears) turn the
    // bonded corners on even courses, so both elevations stay mirror-symmetric
    var QM = [[N.gfl, N.str0], [N.str1, N.corn0]], QW = [[N.gfl, N.str0], [N.str1, N.wTop]];
    corner(ML, F, QM, 0); corner(F, MR, QM, 1); corner(MR, B, QM, 0); corner(B, ML, QM, 1);
    corner(LS, LF, QW, 0); corner(LB, LS, QW, 1); corner(RF, RS, QW, 1); corner(RS, RB, QW, 0);
    // stone bands: plinth water table (to ground-floor level), first-floor string course, cornice (main block)
    var bPl = { key: 'pl', n0: N.plinth, n1: N.gfl, p: 0.05 }, bStr = { key: 'str', n0: N.str0, n1: N.str1, p: 0.04 };
    var bCorn = { key: 'corn', n0: N.corn0, n1: N.corn1, p: PC, extra: corniceExtra };
    MAIN.forEach(function (r) { r.bands.push(bPl, bStr, bCorn); });
    WINGS.forEach(function (r) { r.bands.push(bPl, bStr); });
    F.breaks = { pl: [[cx - 2.35, cx + 2.35, 'buried']], str: [[cx - 2.3, cx + 2.3]] };   // portico platform and pediment
    B.breaks = { pl: [[cx - 1.05, cx + 1.05, 'buried']] };                              // garden-door landing
    [MR, ML].forEach(function (r) { r.breaks = { pl: [[WS - 0.05, WS + WD + 0.05, 'buried']], str: [[WS - 0.04, WS + WD + 0.04, 'buried']] }; });   // inside the wings

    // openings: seven bays; centre bay = front door under the portico (first-floor sill raised over the pediment)
    bays.forEach(function (x, i) {
      if (i !== 3) opening(F, x, WIN, N.gwin0, N.gwin1, { head: 'key' });
      opening(F, x, WIN, i === 3 ? 66 : N.fwin0, N.fwin1, { head: 'key' });
      opening(F, x, WIN, N.swin0, N.swin1, { head: 'gauged' });
      if (i !== 3) opening(B, x, WIN, N.gwin0, N.gwin1, { head: 'gauged' });
      opening(B, x, WIN, N.fwin0, N.fwin1, { head: 'gauged' });
      opening(B, x, WIN, N.swin0, N.swin1, { head: 'gauged' });
    });
    var DOORN = 42, door = opening(F, cx, 1.35, N.gfl, DOORN, { kind: 'door', head: 'key', cill: false });
    var rdoor = opening(B, cx, 1.125, N.gfl, DOORN, { kind: 'door', head: 'key', cill: false, glazed: true });
    [LF, RF, LB, RB].forEach(function (r) { [1.35, 3.6, 5.85].forEach(function (u) { opening(r, u, WIN, N.gwin0, N.gwin1, { head: 'gauged' }); opening(r, u, WIN, N.fwin0, N.wfwin1, { head: 'gauged' }); }); });
    [LS, RS].forEach(function (r) { [1.875, 4.275, 6.675].forEach(function (u) { opening(r, u, WIN, N.gwin0, N.gwin1, { head: 'gauged' }); opening(r, u, WIN, N.fwin0, N.wfwin1, { head: 'gauged' }); }); });

    // ── foundations: concrete trench fill, blockwork to the first facing course, oversite slab, DPC ──
    K.fine(function () {                                               // (all below ground or temporary: not in the clean shell)
      K.foundation([[0, 0], [W, 0], [W, -D], [0, -D]]);
      K.foundation([[-WW, wz1], [0, wz1], [0, wz0], [-WW, wz0]]);
      K.foundation([[W, wz1], [W + WW, wz1], [W + WW, wz0], [W, wz0]]);
    });
    // clean shell: outer-face loops (everything deeper inside the walls is dropped), and the plinth courses buried
    // behind the portico podium and the garden-door landing are never laid
    K.shell([[0, 0], [W, 0], [W, -D], [0, -D]], y0, Y(N.corn1));
    K.shell([[-WW, wz1], [0, wz1], [0, wz0], [-WW, wz0]], y0, Y(N.wTop));
    K.shell([[W, wz1], [W + WW, wz1], [W + WW, wz0], [W, wz0]], y0, Y(N.wTop));
    if (K.clean) { F.ex.push([0, N.plinth, cx - 2.35, cx + 2.35]); B.ex.push([0, N.plinth, cx - 1.05, cx + 1.05]); }

    // ── hooks fired as the brickwork reaches them: suspended timber floors, scaffold lifts, parapet coping ──
    var hooks = [], hook = function (n, fn) { hooks.push({ n: n, fn: fn }); };
    var flr = function (x0, z0, x1, z1, y, deck, ceil) {                // joists + boards, lath-and-plaster ceiling below
      K.fine(function () {                                              // interiors: full model only
        K.floor(x0, z0, x1, z1, y, { deck: deck });
        if (ceil) K.box('timberWhite', (x0 + x1) / 2, y - UK.JOIST_D - 0.007, (z0 + z1) / 2, x1 - x0, 0.014, z1 - z0);
      });
    };
    var mainFloor = function (y, ceil) { flr(T, -D + T, W - T, -T, y, true, ceil); };
    var wingFloor = function (y, deck, ceil) { flr(-WW + T, wz0 + T, 0, wz1 - T, y, deck, ceil); flr(W, wz0 + T, W + WW - T, wz1 - T, y, deck, ceil); };
    hook(N.gfl, function () { mainFloor(FFL0, false); wingFloor(FFL0, true, false); });
    hook(N.str0, function () { mainFloor(FFL1, true); wingFloor(FFL1, true, true); });
    hook(N.ffl2, function () { mainFloor(FFL2, true); });
    hook(N.wTop, function () { wingFloor(Y(N.wTop), false, true); });
    hook(N.corn1, function () { mainFloor(Y(N.corn1), true); });
    var lifts = [1.95, 3.75, 5.55, 7.35, 9.15, 10.95];
    lifts.forEach(function (y, i) {
      var yp = i ? lifts[i - 1] + 1.0 : 0;
      hook(Math.round((y - 0.6 - y0) / CH), function () {
        K.fine(function () {                                            // scaffolding: full model only
          scafRun(-0.6, 0, W + 0.6, 0, y, yp); scafRun(W + 0.6, -D, -0.6, -D, y, yp);
          if (y > 7) return;
          scafRun(-WW - 0.6, wz1, -0.05, wz1, y, yp); scafRun(-WW, wz0 - 0.1, -WW, wz1, y, yp); scafRun(-0.05, wz0, -WW - 0.6, wz0, y, yp);
          scafRun(W + 0.05, wz1, W + WW + 0.6, wz1, y, yp); scafRun(W + WW, wz1, W + WW, wz0 - 0.1, y, yp); scafRun(W + WW + 0.6, wz0, W + 0.05, wz0, y, yp);
        });
      });
    });
    hook(N.par, function () { MAIN.forEach(coping); });
    // wing roofs (needed here: the clean shell stops the main block's side walls where they are buried behind a wing)
    var WP = 30, wtn = Math.tan(WP * PI / 180), WOV = 0.40, WE = Y(N.wTop) + 0.075 + 0.15 / Math.cos(WP * PI / 180) - (WOV + 0.11) * wtn;
    if (K.clean) {   // the brickwork buried behind each wing, up to 0.24 m under the wing roof, in 0.3 m strips along the wing
      var wh = (wz1 - wz0 + 2 * WOV) / 2, wzm = (wz0 + wz1) / 2;
      for (var zs = wz0; zs < wz1 - 0.01; zs += 0.3) {
        var ze = Math.min(zs + 0.3, wz1), hmin = wh - Math.max(Math.abs(zs - wzm), Math.abs(ze - wzm));
        var nTop = Math.floor((WE + hmin * wtn - 0.24 - Y(0)) / CH);
        if (nTop > 0) { MR.ex.push([0, nTop, -ze, -zs]); ML.ex.push([0, nTop, zs + D, ze + D]); }
      }
    }
    K.stage('masonry');
    buildWalls(MAIN.concat(WINGS), N.par, hooks);

    // ═══ ROOFS ═══ main: hipped, 38°, behind the parapet over a lead box gutter; wings: hipped 30°, boxed eaves,
    // the inner end abutting the main block's side wall (no hip there)
    var GW = 0.30, ME = 10.5, MP = 38;
    var stacks = [cx - 3.0, cx + 3.0].map(function (x) { return { x: x, z: -D / 2, w: 1.79, d: 0.89, pots: 4 }; });
    var hole = function (s) { return [s.x - s.w / 2 - 0.06, s.x + s.w / 2 + 0.06, s.z - s.d / 2 - 0.06, s.z + s.d / 2 + 0.06]; };
    var mainRoof = hipRoof({ x0: T + GW, x1: W - T - GW, z0: -D + T + GW, z1: -T - GW, e: ME, pitch: MP });
    var dormers = [];
    [cx - 5.55, cx, cx + 5.55].forEach(function (x) { dormers.push(dormerSpec(mainRoof, x, true), dormerSpec(mainRoof, x, false)); });
    mainRoof.o.holes = stacks.map(hole).concat(dormers.map(function (d) { return d.hole; }));
    var wStacks = [{ x: -1.8, z: (wz0 + wz1) / 2, w: 1.115, d: 0.665, pots: 2 }, { x: W + 1.8, z: (wz0 + wz1) / 2, w: 1.115, d: 0.665, pots: 2 }];
    var lRoof = hipRoof({ x0: -WW - WOV, x1: 0, z0: wz0 - WOV, z1: wz1 + WOV, e: WE, pitch: WP, open1: true, holes: [hole(wStacks[0])] });
    var rRoof = hipRoof({ x0: W, x1: W + WW + WOV, z0: wz0 - WOV, z1: wz1 + WOV, e: WE, pitch: WP, open0: true, holes: [hole(wStacks[1])] });

    // roof structure: wall plates (main: on the attic floor behind the box gutter), rafters, wing eaves carpentry
    K.stage('roofframe');
    var mpt = ME + 0.05 * Math.tan(MP * PI / 180) - 0.15 / Math.cos(MP * PI / 180), ad = Y(N.corn1) + 0.022;
    MAIN.forEach(function (r) {
      var a = r.own ? T + GW : T + GW + 0.1, e = r.L - a;
      rbox('timber', r, a, e, ad, mpt, T + GW, T + GW + 0.1);
      rbox('timber', r, r.own ? T : T + GW, r.L - (r.own ? T : T + GW), ad, ad + 0.02, T, T + GW);   // gutter board
    });
    WINGS.forEach(function (r) {
      var a = r.own ? (r.sC ? 0.06 : 0) : 0.16, e = r.own ? (r.eC ? r.L - 0.06 : r.L) : r.L - 0.16;
      rbox('timber', r, a, e, Y(N.wTop), Y(N.wTop) + 0.075, 0.06, 0.16);
    });
    mainRoof.frame(); lRoof.frame(); rRoof.frame();
    WINGS.forEach(function (r) { wingEaves(r, WE, WOV); });

    // stacks first (built off the attic floors), then the lead box gutter, slating, dormers, abutment flashings
    var stackTop = function (s, R) {
      var n0 = R === mainRoof ? N.corn1 : N.wTop, n1 = Math.round((R.ridgeY + (R === mainRoof ? 1.25 : 1.05) - y0) / CH);
      var roofY = R.ridgeY - s.d / 2 * R.t + SOFF / R.cs - 0.03;
      // clean shell: the part of the stack inside the roof void is never laid; brickwork starts just under the lead apron
      stack(s, K.clean ? Math.max(n0, Math.floor((roofY - y0) / CH) - 1) : n0, n1, roofY, n0);
    };
    stacks.forEach(function (s) { stackTop(s, mainRoof); });
    stackTop(wStacks[0], lRoof); stackTop(wStacks[1], rRoof);
    K.stage('roofcover');
    MAIN.forEach(function (r) {
      var a = r.own ? T : T + GW, e = r.L - a;
      rbox('lead', r, a, e, ad + 0.02, ad + 0.03, T, T + GW);
      rbox('lead', r, a, e, ad + 0.03, ad + 0.22, T, T + 0.006);                // upstand dressed up the parapet
      var b2 = r.own ? T + GW - 0.02 : T + GW;                                   // lead-dressed board under the slate eaves
      rbox('lead', r, b2, r.L - b2, ad + 0.03, ME + 0.02, T + GW - 0.02, T + GW);
    });
    mainRoof.cover();
    dormers.forEach(dormer);
    lRoof.cover(); rRoof.cover();
    [[lRoof, -0.02], [rRoof, W + 0.02]].forEach(function (rf) {               // lead flashings where the wing roofs meet the main walls
      var R = rf[0], o = R.o, x = rf[1], so = (SOFF + 0.004) / R.cs + 0.09 / R.cs;
      [o.z0, o.z1].forEach(function (z) { K.beam('lead', [x, o.e + so, z], [x, R.ridgeY + so, R.zm], 0.18, 0.03); });
    });
    K.anchor('ridge', cx, mainRoof.ridgeY, -D / 2);

    // ═══ FIT-OUT ═══ sashes, doors, rainwater goods (lead heads + cast-iron pipes on the rear, wing swan-necks)
    K.stage('fitout');
    fits.forEach(function (o) { if (o.kind === 'door') doorFit(o.r, o, 'doorGreen'); else sashFit(o.r, o); });
    K.fine(function () {                                                // rainwater goods: not in the clean shell
      [0.62, W - 0.62].forEach(function (u) {
        var p = rpt(B, u, -0.11);
        K.box('lead', p[0], 9.62, p[1], 0.34, 0.30, 0.22, { ry: B.ry });
        K.tube('gutter', [p[0], 9.47, p[1]], [p[0], 0.12, p[1]], 0.036);
        K.box('gutter', p[0], 0.07, p[1], 0.12, 0.10, 0.12, { ry: B.ry });
        pipeEars(B, u, -0.11, 0.6, 9.2);
      });
      [[LF, LF.L - 0.35], [LB, 0.35], [RF, 0.35], [RB, RB.L - 0.35]].forEach(function (d) { downpipe(d[0], d[1], WE - 0.06, -WOV - 0.09); });
    });

    // ═══ PORTICO ═══ tetrastyle Tuscan: stone podium and steps, four columns with pilaster responds, entablature
    // (architrave, frieze, dentil cornice) returned to the wall, pediment with raking cornices under lead
    K.stage(K.clean ? 'fitout' : 'external');                          // (the clean shell drops the 'external' stage: the portico stays)
    var px0 = cx - 2.35, px1 = cx + 2.35, pz = 2.30, colZ = 1.95, cr = 0.19, ez = colZ + cr + 0.04, pb = 3.825;
    K.box('stone', cx, 0.225, pz / 2, px1 - px0, 0.45, pz, { color: S() });
    K.box('stone', cx, 0.525, (pz + 0.03) / 2, px1 - px0 + 0.06, 0.15, pz + 0.03, { color: S() });
    for (var st = 1; st <= 3; st++) K.box('stone', cx, (0.6 - 0.15 * st) / 2, pz + 0.03 + 0.35 * (st - 0.5), px1 - px0 + 0.3 * st, 0.6 - 0.15 * st, 0.35, { color: S() });
    [-1.8, -0.6, 0.6, 1.8].forEach(function (dx) {
      K.column(cx + dx, colZ, FFL0, 3.3 - FFL0, cr, { mat: 'column' });
      if (Math.abs(dx) > 1) {                                              // responds against the wall
        K.box('column', cx + dx, (FFL0 + 3.18) / 2, 0.06, 0.40, 3.18 - FFL0, 0.12);
        K.box('column', cx + dx, 3.24, 0.08, 0.48, 0.12, 0.16);
      }
    });
    K.box('column', cx, 3.39, ez / 2, 4.2, 0.18, ez);                                   // architrave (porch ceiling)
    K.box('column', cx, 3.565, (ez - 0.02) / 2, 4.16, 0.17, ez - 0.02);                // frieze
    K.box('column', cx, 3.74, (ez + 0.15) / 2, 4.5, 0.17, ez + 0.15);                  // cornice
    for (var dx2 = -2.04; dx2 <= 2.041; dx2 += 0.12) K.box('column', cx + dx2, 3.627, ez + 0.025, 0.055, 0.055, 0.09);   // dentils
    for (var dz2 = 0.12; dz2 < ez; dz2 += 0.12) [-1, 1].forEach(function (sd) { K.box('column', cx + sd * 2.105, 3.627, dz2, 0.09, 0.055, 0.055); });
    var rk = 0.25, phw = 2.25, pd = ez + 0.15, rakeY = function (x, off) { return pb + rk * (phw - Math.abs(x - cx)) + off / Math.cos(Math.atan(rk)); };
    K.tri('stone', cx, pb + (phw - 0.02) * rk / 2, (pd - 0.08) / 2 + 0.01, 2 * (phw - 0.02), (phw - 0.02) * rk, pd - 0.1, { color: S() });   // tympanum
    [-1, 1].forEach(function (sd) {
      var xe = cx + sd * phw;
      K.beam('column', [xe, rakeY(xe, 0.075), pd / 2], [cx, rakeY(cx, 0.075), pd / 2], 0.15, pd);            // raking cornice
      K.beam('lead', [xe + sd * 0.03, rakeY(xe, 0.156), pd / 2 + 0.01], [cx, rakeY(cx, 0.156), pd / 2 + 0.01], 0.012, pd + 0.04);
    });
    K.env(px0, 0, 0, px1, rakeY(cx, 0.17), pz + 1.1);
    // garden door: stone landing and steps down to the terrace
    K.box('stone', cx, 0.3, -D - 0.55, 2.1, 0.6, 1.1, { color: S() });
    for (var rs = 1; rs <= 3; rs++) K.box('stone', cx, (0.6 - 0.15 * rs) / 2, -D - 1.1 - 0.35 * (rs - 0.5), 2.1 + 0.3 * rs, 0.6 - 0.15 * rs, 0.35, { color: S() });

    // ═══ GROUNDS ═══ gravel sweep round a lawn turning circle with a fountain, lawns, box hedges, clipped yews,
    // rear terrace and lawn, iron railings on a stone kerb with rusticated gate piers and wrought-iron gates, parkland trees
    var IRON = 'gutter';
    K.fine(function () {                                               // forecourt, gardens, boundary and trees: full model only
    var GZ = 16, XL = -WW - 1.5, XR = W + WW + 1.5, TC = [cx, 9.0];
    var flat =function (m, x0, z0, x1, z1, h, col) { if (x1 - x0 > 0.01 && z1 - z0 > 0.01) K.box(m, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0, col ? { color: col } : {}); };
    flat('gravel', -2.5, 0, W + 2.5, GZ - 0.3, 0.03);
    flat('gravel', XL, wz1, 0, 0, 0.03); flat('gravel', W, wz1, XR, 0, 0.03);
    flat('grass', XL, 0, -2.5, GZ - 0.3, 0.02); flat('grass', W + 2.5, 0, XR, GZ - 0.3, 0.02);
    flat('grass', XL, wz0, -WW, wz1, 0.02); flat('grass', W + WW, wz0, XR, wz1, 0.02);
    flat('grass', XL, -D, 0, wz0, 0.02); flat('grass', W, -D, XR, wz0, 0.02);
    flat('grass', XL, -D - 3, -0.5, -D, 0.02); flat('grass', W + 0.5, -D - 3, XR, -D, 0.02);
    flat('grass', XL, -D - 16, XR, -D - 3, 0.02);
    K.paving(-0.5, -D - 3, cx - 1.5, -D); K.paving(cx + 1.5, -D - 3, W + 0.5, -D); K.paving(cx - 1.5, -D - 3, cx + 1.5, -D - 2.25);
    K.stage('external');
    // turning circle: 24-sided lawn (two offset 12-gons), stone kerb, fountain with basin, pedestal and bowl
    [0, PI / 12].forEach(function (a) { K.cyl('grass', TC[0], 0.04, TC[1], 4.0, 0.03, { ry: a }); });
    for (var ki = 0; ki < 24; ki++) { var ka = ki * PI / 12; K.box('stone', TC[0] + Math.cos(ka) * 4.04, 0.05, TC[1] + Math.sin(ka) * 4.04, 0.09, 0.1, 1.07, { ry: -ka, color: S() }); }
    [0, PI / 12].forEach(function (a) {
      K.cyl('stone', TC[0], 0.25, TC[1], 1.35, 0.42, { ry: a, color: 0xd6cfbf });
      K.cyl('glass', TC[0], 0.465, TC[1], 1.2, 0.012, { ry: a });
    });
    K.cyl('stone', TC[0], 0.47 + 0.4, TC[1], 0.15, 0.8, { color: 0xd6cfbf });
    K.cyl('stone', TC[0], 1.33, TC[1], 0.58, 0.12, { color: 0xd6cfbf });
    K.cyl('glass', TC[0], 1.395, TC[1], 0.5, 0.01, {});
    K.sph('stone', TC[0], 1.56, TC[1], 0.12, 0.16, 0.12, { color: 0xd6cfbf });
    // box hedges along the lawns and round the forecourt, clipped yew cones
    var hedge = function (x0, z0, x1, z1) { K.box('plant', (x0 + x1) / 2, 0.3, (z0 + z1) / 2, x1 - x0, 0.6, z1 - z0, { color: jit(0x2f5a2c, 0.06) }); };
    hedge(-2.95, 0.6, -2.55, GZ - 1.0); hedge(W + 2.55, 0.6, W + 2.95, GZ - 1.0);
    hedge(XL + 0.3, GZ - 1.0, -2.55, GZ - 0.6); hedge(W + 2.55, GZ - 1.0, XR - 0.3, GZ - 0.6);
    [2.5, 6.5, 10.5].forEach(function (z) {
      [-3.6, W + 3.6, -WW + 1.0, W + WW - 1.0].forEach(function (x) {
        K.sph('plant', x, 0.65, z, 0.55, 0.65, 0.55, { color: jit(0x234a26, 0.05) });
        K.sph('plant', x, 1.45, z, 0.33, 0.5, 0.33, { color: jit(0x234a26, 0.05) });
      });
    });
    // boundary: stone kerb, railings, gate piers, gates
    var gate0 = cx - 2.0, gate1 = cx + 2.0;
    [[XL, gate0 - 0.4], [gate1 + 0.4, XR]].forEach(function (sg) {
      K.box('stone', (sg[0] + sg[1]) / 2, 0.225, GZ, sg[1] - sg[0], 0.45, 0.42, { color: S() });
      [1.0, 1.75].forEach(function (y) { K.box(IRON, (sg[0] + sg[1]) / 2, y, GZ, sg[1] - sg[0] - 0.1, 0.035, 0.025); });
      for (var x = sg[0] + 0.1; x < sg[1] - 0.05; x += 0.125) K.box(IRON, x, 1.2, GZ, 0.018, 1.5, 0.018);
    });
    [XL, XR].forEach(function (x) { K.box('stone', x + (x < 0 ? 0.25 : -0.25), 0.95, GZ, 0.5, 1.9, 0.5, { color: S() }); K.box('stone', x + (x < 0 ? 0.25 : -0.25), 1.95, GZ, 0.6, 0.1, 0.6, { color: S() }); });
    [gate0 - 0.4, gate1 + 0.4].forEach(function (x) {                       // rusticated piers, cornice cap, ball finial
      for (var i = 0; i < 9; i++) { var wq = i % 2 ? 0.74 : 0.8; K.box('stone', x, 0.15 + i * 0.3, GZ, wq, 0.285, wq, { color: S() }); }
      K.box('stone', x, 2.775, GZ, 0.95, 0.15, 0.95, { color: S() });
      K.box('stone', x, 2.91, GZ, 0.4, 0.12, 0.4, { color: S() });
      K.sph('stone', x, 3.21, GZ, 0.24, 0.24, 0.24, { color: S() });
    });
    for (var gx = gate0 + 0.06; gx < gate1 - 0.03; gx += 0.12) {
      var gh = 1.9 + 0.35 * Math.cos((gx - cx) / 2.0 * PI / 2);              // arched top rising to the meeting stiles
      K.box(IRON, gx, 0.1 + gh / 2, GZ, 0.02, gh, 0.02);
    }
    [0.25, 1.0].forEach(function (y) { K.box(IRON, cx, y, GZ, gate1 - gate0 - 0.04, 0.04, 0.03); });
    [-1, 1].forEach(function (sd) { K.box(IRON, cx + sd * 0.012, 1.25, GZ, 0.04, 2.3, 0.04); });
    // parkland trees
    [[XL - 5, 4], [XR + 5, 4], [XL - 4, -8], [XR + 4, -8], [XL - 2, -D - 10], [XR + 2, -D - 10], [cx - 7, -D - 13], [cx + 7, -D - 13]].forEach(function (p, i) { K.tree(p[0], p[1], 8 + (i % 3) * 1.5); });
    K.stage('external');
    });                                                                 // end of the full-model grounds
    // ═══ SNAGGING ═══ hanging lantern in the portico (full model only)
    K.fine(function () {
      K.stage('snag');
      K.box('metal', cx, 3.08, 1.1, 0.02, 0.44, 0.02);
      K.box(IRON, cx, 2.84, 1.1, 0.28, 0.05, 0.28);
      K.box('glass', cx, 2.64, 1.1, 0.22, 0.36, 0.22);
      K.box(IRON, cx, 2.44, 1.1, 0.24, 0.04, 0.24);
    });
    K.stage('masonry');

    K.anchor('front', cx, 1.5, 0); K.anchor('top', cx, mainRoof.ridgeY, -D / 2);
    return { name: 'Georgian manor house', info: { storeys: 3, bays: 7, wings: 2, frontage: W + 2 * WW, depth: D, eave: Y(N.par), ridge: mainRoof.ridgeY } };
  };
})(HB3D);
