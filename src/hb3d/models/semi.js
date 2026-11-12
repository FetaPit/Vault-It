// 1930s semi-detached house — the LEFT half of a pair (the right-hand half is the neighbour, drawn as a ghost).
// 6.975 × 8.55 m two-storey block in cavity walls (red/brown 'blend' facing brick in stretcher bond, block inner leaf,
// insulated cavity), brick ground floor and pebbledash first floor on the front; full-height canted bay carried up into a
// hipped projection of the main roof; recessed porch behind a semicircular brick arch with a sunrise-glazed front door and
// a stained-glass side light; white-painted timber casements with leaded top lights; 40° cut roof in plain clay tiles,
// hipped at our end and running on into the neighbour's half over a blockwork party wall; shared chimney stack on the
// party wall at the ridge with four pots; side door, rear French doors; side drive with timber gates, low brick front
// wall with a privet hedge, lawn, crazy-paved path, bins, patio and fenced rear garden.
(function (H) {
  'use strict';
  var UK = H.UK, CH = UK.CH, BW = UK.BW, CAV = UK.CAV, WALL = UK.WALL, J = UK.J, CW = UK.CW, KW = UK.KW;
  var RAD = Math.PI / 180, IO = BW + CAV, T22 = Math.tan(22.5 * RAD), R2 = Math.SQRT2;

  // straight run (outer face a → b); outward normal on the left of travel seen from above (as the kit's loops)
  function RUN(ax, az, bx, bz) { var L = Math.hypot(bx - ax, bz - az); return { ax: ax, az: az, bx: bx, bz: bz, L: L, out: [-(bz - az) / L, (bx - ax) / L] }; }
  function P(r, u, d) { return [r.ax + (r.bx - r.ax) / r.L * u - r.out[0] * d, r.az + (r.bz - r.az) / r.L * u - r.out[1] * d]; }
  function RY(r) { return Math.atan2(-(r.bz - r.az), r.bx - r.ax); }
  function inward(r, d) { return RUN(r.ax - r.out[0] * d, r.az - r.out[1] * d, r.bx - r.out[0] * d, r.bz - r.out[1] * d); }

  // ── roof geometry ──
  // A roof "solid" is a set of planes, each rising at the common pitch inward (unit plan normal n) from an eaves line
  // through o; its surface is the lowest of its planes inside its footprint (every plane distance ≥ −ov, and every clip
  // half-plane ≥ 0). Where two solids overlap (main roof + bay projection) the higher one wins, so hips, valleys and the
  // projection's ridge all fall out of the same rule. Everything is linear along a line, so trimming is exact.
  function PL(ox, oz, nx, nz) { var L = Math.hypot(nx, nz); return { o: [ox, oz], n: [nx / L, nz / L] }; }
  function lin(pl, A, d) { return [(A[0] - pl.o[0]) * pl.n[0] + (A[1] - pl.o[1]) * pl.n[1], d[0] * pl.n[0] + d[1] * pl.n[1]]; }
  function cut(iv, a, b) {                     // keep λ with a + bλ ≥ 0
    if (!iv) return null;
    if (Math.abs(b) < 1e-9) return a >= -1e-9 ? iv : null;
    var r = -a / b, lo = iv[0], hi = iv[1];
    if (b > 0) lo = Math.max(lo, r); else hi = Math.min(hi, r);
    return hi - lo > 1e-6 ? [lo, hi] : null;
  }
  // part of the line A + dλ (λ in iv) inside solid S where S's surface stands at/above plane F (S's own facet test),
  // or strictly above F (another solid hiding F)
  function inSolid(S, A, d, iv, F, eps) {
    for (var i = 0; i < S.planes.length && iv; i++) {
      var pj = S.planes[i], a = lin(pj, A, d);
      iv = cut(iv, a[0] + S.ov, a[1]);
      if (F && pj !== F) { var f = lin(F, A, d); iv = cut(iv, a[0] - f[0] - eps, a[1] - f[1]); }
    }
    for (var c = 0; c < (S.clips || []).length && iv; c++) { var b = lin(S.clips[c], A, d); iv = cut(iv, b[0], b[1]); }
    return iv;
  }
  function facetIvs(solids, S, F, A, d, lim, gap) {   // λ-intervals of the line on which facet F is the visible roof
    // (gap > 0 holds the facet back from valleys with another solid, leaving an open lead valley)
    var base = inSolid(S, A, d, lim, F, 0); if (!base) return [];
    var out = [base];
    solids.forEach(function (S2) {
      if (S2 === S || !out.length) return;
      var e = inSolid(S2, A, d, base, F, gap ? -gap : 1e-6); if (!e) return;
      var nx = [];
      out.forEach(function (iv) { if (e[1] <= iv[0] || e[0] >= iv[1]) nx.push(iv); else { if (e[0] > iv[0] + 1e-6) nx.push([iv[0], e[0]]); if (e[1] < iv[1] - 1e-6) nx.push([e[1], iv[1]]); } });
      out = nx;
    });
    return out;
  }
  function ivAnd(a, b) { var o = []; a.forEach(function (x) { b.forEach(function (y) { var lo = Math.max(x[0], y[0]), hi = Math.min(x[1], y[1]); if (hi > lo + 1e-6) o.push([lo, hi]); }); }); return o; }
  function surfD(solids, x, z) {                 // roof surface (as plane distance) at a plan point, or null
    var best = null;
    solids.forEach(function (S) {
      var m = 1e9, ok = true;
      S.planes.forEach(function (p) { var dd = (x - p.o[0]) * p.n[0] + (z - p.o[1]) * p.n[1]; if (dd < -S.ov - 1e-6) ok = false; m = Math.min(m, dd); });
      (S.clips || []).forEach(function (c) { if ((x - c.o[0]) * c.n[0] + (z - c.o[1]) * c.n[1] < -1e-6) ok = false; });
      if (ok && (best == null || m > best)) best = m;
    });
    return best;
  }

  H.models.semi = function (K, opts) {
    // ═══ 0. DIMENSIONS (outer faces of the facing brick; 225 mm on plan, 75 mm courses) ═══
    var PAL = 'blend', FRAME = 'timberPaint';
    K.brickPalette = PAL;
    var W = 6.975, D = 8.55, y0 = -0.15;                    // 31 × 38 bricks
    var F1 = y0 + 40 * CH, EAVE = y0 + 74 * CH;             // first floor 2.85 (2.70 floor-to-floor), wall plate 5.40
    var PITCH = 40, TAN = Math.tan(PITCH * RAD), COS = Math.cos(PITCH * RAD), OV = 0.30;
    var RB = 0.05 / COS;                                    // rafter centre-line above the wall top at the outer face
    var YR = function (s) { return EAVE + RB + s * TAN; };  // rafter centre-line at plan distance s inside an eaves line
    var BX0 = 0.45, BX1 = 3.375, BD = 0.675, HB = (BX1 - BX0) / 2, BXM = (BX0 + BX1) / 2;      // canted bay
    var PX0 = 4.05, PX1 = 5.175, PXM = (PX0 + PX1) / 2, PR = (PX1 - PX0) / 2;                  // porch arch
    var SPR = y0 + 29 * CH, PDEP = 1.20, RE = PR + J / 2 + UK.BL + 0.005;                      // springing 2.025, extrados
    var RIDGE = YR(D / 2);
    var rb = function (m, r, u, d, y, su, sy, sd, o) { var p = P(r, u, d); return K.box(m, p[0], y, p[1], su, sy, sd, Object.assign({ ry: RY(r) }, o || {})); };
    // mortar bed/perps behind units laid by us: recessed 6 mm, kept 2 mm inside the ends and 4 mm off the top and back faces
    var mort = function (r, u0, u1, yb, h, d0) { d0 = d0 || 0.006; if (u1 - u0 > 0.01) rb('mortar', r, (u0 + u1) / 2, d0 + (BW - 0.004 - d0) / 2, yb + (h - 0.004) / 2, u1 - u0 - 0.004, h - 0.004, BW - 0.004 - d0); };
    var pts = [[0, 0], [W, 0], [W, -D], [0, -D]];
    var runs = H._loopRuns(pts);                            // 0 front · 1 party (right) · 2 rear · 3 left side (hip end)
    // bay faces: left splay, front, right splay (A → B → C → D)
    var bA = [BX0, 0], bB = [BX0 + BD, BD], bC = [BX1 - BD, BD], bD = [BX1, 0];
    var BAY = [RUN(bA[0], bA[1], bB[0], bB[1]), RUN(bB[0], bB[1], bC[0], bC[1]), RUN(bC[0], bC[1], bD[0], bD[1])].map(function (r, i) {
      return { r: r, i0: i === 0 ? 0.02 : 0.125, i1: i === 2 ? 0.02 : 0.125, ops: [] };
    });

    // shared stack on the party wall at the ridge (half each side), carried by our chimney breast against the party wall
    var CHW = 0.89, CHD = 0.665, CHZ = -D / 2, CHY0 = y0 + 118 * CH, CHY1 = y0 + 138 * CH, XB0 = W - CHW / 2;
    var CBF = RUN(XB0, CHZ + CHD / 2, W, CHZ + CHD / 2), CBI = RUN(XB0, CHZ - CHD / 2, XB0, CHZ + CHD / 2), CBB = RUN(W, CHZ - CHD / 2, XB0, CHZ - CHD / 2);
    var FIRE = [UK.DPC, F1].map(function (v) { return { u0: 0.1075, u1: 0.5575, v0: v, v1: v + 9 * CH, type: 'void' }; });
    var FIREH = FIRE.map(function (o) { return { u0: o.u0, u1: o.u1, v0: o.v1, v1: o.v1 + 2 * CH, type: 'void' }; });
    function breastCourse(k) {   // brick breast round the flues, fireplace openings on the ground and first floors
      var yb = y0 + k * CH, ev = k % 2 === 0;
      if (yb < UK.DPC - 1e-6 || yb >= CHY0 - 1e-6) return;
      var PW = KW + J;   // the cheeks butt the party-wall blockwork
      [[CBF, ev ? CW : 0, CBF.L - PW, null], [CBI, ev ? 0 : CW, ev ? CBI.L : CBI.L - CW, FIRE.concat(FIREH)], [CBB, PW, ev ? CBB.L - CW : CBB.L, null]].forEach(function (c) {
        var segs = H._courseSegments(c[1], c[2], yb, yb + CH, c[3], null);
        if (segs.length) K._layRun(c[0], yb, UK.BL, UK.BH, BW, segs, { uA: c[1], uB: c[2], mid: (c[1] + c[2]) / 2, unit: 'brick', palette: 'brown' });
      });
      FIRE.forEach(function (o) { if (Math.abs(yb - o.v1) < 1e-6) rb('concrete', CBI, (o.u0 + o.u1) / 2, BW / 2, o.v1 + CH, o.u1 - o.u0, 2 * CH - 0.004, BW); });
    }
    var bayInZ = function (x, d) { return Math.min(BD - d, x - BX0 - d * R2, BX1 - d * R2 - x); };   // bay interior front edge

    // ═══ 1. OPENINGS (u along the run from its start corner; v absolute) ═══
    // head 'soldier' = brick-on-end course over a galvanised cavity lintel; 'steel' = lintel only (under the pebbledash)
    var WINS = [];
    function win(r, u0, u1, v0, v1, o) { var w = Object.assign({ r: r, u0: u0, u1: u1, v0: v0, v1: v1, kind: 'win', head: 'soldier', sill: true, lights: 1 }, o || {}); WINS.push(w); return w; }
    var R0 = runs[0], R2r = runs[2], R3 = runs[3];
    win(R0, 5.625, 6.30, 1.20, 2.25, { leaded: true });                                       // hall
    win(R0, PX0, PX1, 3.75, 5.025, { head: 'steel', lights: 2, leaded: true });               // box room over the porch
    win(R0, 5.7375, 6.30, 4.20, 5.025, { head: 'steel', leaded: true, stained: true });       // landing
    win(R2r, 1.125, 2.70, UK.DPC, 2.25, { kind: 'french', sill: false });                     // dining-room French doors
    win(R2r, 4.275, 5.40, 1.05, 2.25, { lights: 2 });                                         // kitchen
    win(R2r, 1.125, 2.475, 3.75, 5.025, { lights: 2 });                                        // bedroom 2
    win(R2r, 4.50, 5.175, 4.05, 5.025, { obscure: true });                                     // bathroom
    win(R3, 1.125, 2.0625, UK.DPC, 2.25, { kind: 'door', sill: false });                      // side (kitchen) door
    win(R3, 3.60, 4.275, 4.05, 5.025, { obscure: true });                                      // WC
    BAY.forEach(function (f, i) {
      var L = f.r.L, n = i === 1 ? 3 : 1;
      f.wins = [win(f.r, 0.1125, L - 0.1125, 0.75, 2.25, { lights: n, leaded: true, bay: true }),
                win(f.r, 0.1125, L - 0.1125, 3.60, 5.025, { head: 'steel', lights: n, leaded: true, bay: true })];
    });
    function holes(o) {   // the hole an opening makes in the facing brick: frame + cill course below + soldier course above
      var h = [{ u0: o.u0, u1: o.u1, v0: o.v0, v1: o.v1, type: 'void' }];
      if (o.sill) h.push({ u0: o.u0 - 0.05, u1: o.u1 + 0.05, v0: o.v0 - CH, v1: o.v0, type: 'void' });
      if (o.head === 'soldier') h.push({ u0: o.u0, u1: o.u1, v0: o.v1, v1: o.v1 + 3 * CH, type: 'void' });
      return h;
    }
    var wl = { 0: [], 2: [], 3: [] };
    WINS.forEach(function (o) { if (!o.bay) Array.prototype.push.apply(wl[runs.indexOf(o.r)], holes(o)); });
    BAY.forEach(function (f) { f.wins.forEach(function (o) { Array.prototype.push.apply(f.ops, holes(o)); }); });
    wl[0].push({ u0: BX0, u1: BX1, v0: UK.DPC, v1: EAVE, type: 'void' });     // bay mouth: the bay walls carry the roof
    wl[0].push({ u0: PX0, u1: PX1, v0: UK.DPC, v1: SPR, type: 'void' });      // porch opening up to the springing
    var archHW = function (y) { var dy = y - SPR; return dy < RE ? Math.sqrt(RE * RE - dy * dy) : 0; };
    for (var ka = 0; ka * CH < RE; ka++) { var ya = SPR + ka * CH; wl[0].push({ u0: PXM - archHW(ya), u1: PXM + archHW(ya), v0: ya, v1: ya + CH, type: 'void' }); }

    // ═══ 2. SET-OUT, FOUNDATIONS, SLAB ═══
    K.foundation(pts);
    K.stage('found');
    BAY.forEach(function (f) { var c = P(f.r, f.r.L / 2, WALL / 2); K.box('concrete', c[0], -0.6125, c[1], f.r.L + 0.30, 0.775, 0.60, { ry: RY(f.r) }); });
    BAY.forEach(function (f) { var c = P(f.r, f.r.L / 2, WALL / 2); K.box('block', c[0], -0.1875, c[1], f.r.L, 0.075, WALL, { ry: RY(f.r), color: 0x7d7d79 }); });
    K.stage('slab');
    for (var sx = BX0; sx < BX1 - 1e-6; sx += 0.195) {                        // bay oversite slab, in strips cut to the canted plan
      var zm = Math.min(bayInZ(sx, WALL), bayInZ(Math.min(BX1, sx + 0.195), WALL));
      if (zm > 0.02) K.box('concrete', sx + 0.0975, 0.10, zm / 2, 0.195, 0.15, zm, {});
    }
    K.box('concrete', BXM, 0.1625, -WALL / 2, BX1 - BX0, 0.025, WALL, {});    // screed over the wall stub in the bay mouth
    BAY.forEach(function (f) { var c = P(f.r, f.r.L / 2, WALL / 2); K.box('dpc', c[0], UK.DPC + 0.001, c[1], f.r.L, 0.004, WALL + 0.004, { ry: RY(f.r) }); });

    // ═══ 3. MASONRY HELPERS ═══
    var blockLine = function (y, up) { var m = (y - y0) / (3 * CH); m = up ? Math.ceil(m - 1e-6) : Math.floor(m + 1e-6); return y0 + Math.max(1, m) * 3 * CH; };
    var colBlock = function () { var v = 0x86 + Math.floor(K.rand() * 14); return (v << 16) | (v << 8) | (v - 4); };
    function under(o) {   // cill on the course below the frame + the inner-leaf make-up under the opening
      K.stage('masonry');
      var r = o.r, uc = (o.u0 + o.u1) / 2, vlo = o.sill ? o.v0 - CH : o.v0, a = blockLine(vlo, false);
      if (o.sill) rb('stone', r, uc, BW / 2 - 0.0225, o.v0 - CH / 2 + 0.002, o.u1 - o.u0 + 0.10, CH - 0.006, BW + 0.045);
      if (o.v0 - a > 0.01) rb('block', r, uc, IO + KW / 2, (a + o.v0) / 2, o.u1 - o.u0 + (o.sill ? 0.10 : 0), o.v0 - a, KW, { color: colBlock() });
    }
    function head(o) {    // galvanised cavity lintel, soldier course, precast lintel in the inner leaf
      K.stage('masonry');
      var r = o.r, w = o.u1 - o.u0, uc = (o.u0 + o.u1) / 2;
      var la = Math.max(0, o.u0 - 0.15), lb = Math.min(r.L, o.u1 + 0.15), lc = (la + lb) / 2;    // 150 mm bearings (less at bay corners)
      rb('steel', r, lc, BW / 2, o.v1 + 0.003, lb - la, 0.006, BW);
      rb('steel', r, lc, BW + CAV / 2, o.v1 + 0.10, lb - la, 0.19, 0.005, { rx: 0.42 });
      if (o.head === 'soldier') {
        var n = Math.max(1, Math.round(w / CH)), pt = w / n;
        for (var i = 0; i < n; i++) rb('brick', r, o.u0 + pt * (i + 0.5), BW / 2, o.v1 + 0.008 + UK.BL / 2, Math.min(UK.BH, pt - J), UK.BL, BW, { color: K._brickColor(PAL), kind: 'brick' });
        mort(r, o.u0, o.u1, o.v1, 3 * CH);
      }
      var top = Math.min(blockLine(o.v1 + (o.head === 'soldier' ? 3 * CH : 0), true), EAVE);
      if (top > o.v1 + 0.01) rb('concrete', r, uc, IO + KW / 2, (o.v1 + top) / 2, w, top - o.v1, KW);
    }
    // canted bay: outer brick leaf (half-bat stagger at the obtuse corners) + block inner leaf + insulation, course by course
    function bayCourse(k) {
      var yb = y0 + k * CH, odd = k % 2 === 1;
      BAY.forEach(function (f) {
        var r = f.r, L = r.L, segs = H._courseSegments(0, L, yb, yb + CH, f.ops, null);
        if (segs.length) K._layRun(r, yb, UK.BL, UK.BH, BW, segs, { uA: odd ? -CW : 0, uB: odd ? L + CW : L, mid: L / 2, unit: 'brick', palette: PAL });
        if (k % 3 === 0 && yb >= -0.001) {
          var ir = inward(r, IO), bt = Math.min(yb + UK.KCH, EAVE), a = f.i0, b = L - f.i1, bk = (k / 3) % 2;
          var bs = H._courseSegments(a, b, yb, bt, f.ops, null);
          if (!bs.length) return;
          K._layRun(ir, yb, UK.KL, Math.min(UK.KH, bt - yb - J), KW, bs, { uA: a - (bk ? UK.KCL / 2 : 0), uB: b, mid: (a + b) / 2, unit: 'block', mat: 'block', mortar: false });
          bs.forEach(function (s) { if (s[1] - s[0] > 0.05) rb('insulation', r, (s[0] + s[1]) / 2, BW + CAV / 2, (yb + bt) / 2, s[1] - s[0], bt - yb - 0.004, CAV - 0.012); });
        }
      });
    }
    // recessed porch: single-leaf brick reveals and back wall (door frame in between), arch spandrels cut to the curve
    var PWL = RUN(PX0, -WALL, PX0, -PDEP), PWR = RUN(PX1, -PDEP, PX1, -WALL), PBW = RUN(PX0, -PDEP, PX1, -PDEP);
    var PTOP = y0 + 37 * CH, DH = y0 + 31 * CH;               // porch soffit 2.625, door-frame head 2.175
    function lay1(r, yb, a, b, odd) { K._layRun(r, yb, UK.BL, UK.BH, BW, [[a, b]], { uA: odd ? a - CW : a, uB: b, mid: (a + b) / 2, unit: 'brick', palette: PAL }); }
    function porchCourse(k) {
      var yb = y0 + k * CH, odd = k % 2 === 1;
      if (yb < PTOP - 1e-6) { lay1(PWL, yb, 0, PWL.L, odd); lay1(PWR, yb, 0, PWR.L, !odd); }
      if (yb < UK.DPC - 1e-6 || (yb >= DH + 2 * CH - 1e-6 && yb < PTOP - 1e-6)) lay1(PBW, yb, 0, PBW.L, odd);
      if (Math.abs(yb - DH) < 1e-6) rb('concrete', PBW, PBW.L / 2, BW / 2, DH + CH, PBW.L, 2 * CH - 0.004, BW);
      if (yb >= SPR - 1e-6 && yb < SPR + RE) {
        // cut bricks from the stepped hole to the extrados at the course top, set 1 mm back so the ring reads in front
        var h0 = archHW(yb) - J / 2, hm = archHW(yb + CH), len = h0 - hm;
        var spans = hm < 1e-6 ? [[PXM - h0, PXM + h0]] : [[PXM - h0, PXM - hm], [PXM + hm, PXM + h0]];   // crown course: straight across
        if (len > 0.02) spans.forEach(function (s) {
          var L = s[1] - s[0], np = Math.ceil(L / UK.BL), pl = (L - (np - 1) * J) / np;
          for (var q = 0; q < np; q++) rb('brick', R0, s[0] + q * (pl + J) + pl / 2, BW / 2 + 0.001, yb + J + UK.BH / 2, pl, UK.BH, BW, { color: K._brickColor(PAL), kind: 'brick' });
          mort(R0, s[0], s[1], yb, CH, 0.007);
        });
      }
      // party corners of the front and rear walls: the façade runs on into the neighbour's half, so the courses the
      // party wall would own get a half bat instead of a block end
      if (odd && yb < EAVE - 1e-6) {
        rb('brick', R0, W - BW / 2, BW / 2, yb + J + UK.BH / 2, BW, UK.BH, BW, { color: K._brickColor(PAL), kind: 'brick' });
        mort(R0, W - CW, W, yb, CH);
        rb('brick', R2r, BW / 2, BW / 2, yb + J + UK.BH / 2, BW, UK.BH, BW, { color: K._brickColor(PAL), kind: 'brick' });
        mort(R2r, 0, CW, yb, CH);
      }
    }
    // the arch ring: 25 bricks on end, radial, rough-ring joints (wedge-shaped mortar behind)
    function arch() {
      var n = 25, rm = PR + J / 2 + UK.BL / 2;
      for (var i = 0; i < n; i++) {
        var th = Math.PI * (i + 0.5) / n, x = PXM + rm * Math.cos(th), y = SPR + rm * Math.sin(th), rz = th - Math.PI / 2;
        K.box('brick', x, y, -BW / 2, UK.BH, UK.BL, BW, { rz: rz, color: K._brickColor(PAL, 0.94), kind: 'brick' });
        K.box('mortar', x, y, -0.006 - (BW - 0.010) / 2, Math.PI * (RE + 0.005) / n, UK.BL - 0.004, BW - 0.010, { rz: rz });
      }
    }
    // scaffold lifts round the front, hip end and rear (the pair is scaffolded as one: the run carries on past the party wall)
    function scaffold(y) {
      var x0 = -1.15, x1 = W + 1.2, z1 = BD + 1.15, z0 = -D - 1.15, hide = { hideAfter: 0.80 };
      [[x1, z1, x0, z1, [0, -1]], [x0, z1, x0, z0, [1, 0]], [x0, z0, x1, z0, [0, 1]]].forEach(function (e) {
        var L = Math.hypot(e[2] - e[0], e[3] - e[1]), n = Math.max(1, Math.round(L / 2.0)), inw = e[4], horiz = Math.abs(e[3] - e[1]) < 1e-6;
        for (var i = 0; i <= n; i++) { var px = e[0] + (e[2] - e[0]) * i / n, pz = e[1] + (e[3] - e[1]) * i / n; K.tube('scaffold', [px, Math.max(0, y - 2.0), pz], [px, y + 1.0, pz], 0.024, hide); }
        K.tube('scaffold', [e[0], y, e[1]], [e[2], y, e[3]], 0.024, hide);
        K.tube('scaffold', [e[0], y + 1.0, e[1]], [e[2], y + 1.0, e[3]], 0.024, hide);
        for (var bi = 0; bi < 4; bi++) { var oo = 0.15 + bi * 0.23; K.box('scaffoldBoard', (e[0] + e[2]) / 2 + inw[0] * oo, y + 0.03, (e[1] + e[3]) / 2 + inw[1] * oo, horiz ? L : 0.225, 0.038, horiz ? 0.225 : L, hide); }
      });
    }

    // ═══ 4. MASONRY: the wall loop lays the main walls course by course; hooks raise the bay, porch, heads, cills,
    //        floor and scaffold with it ═══
    var hooks = [];
    WINS.forEach(function (o) {
      hooks.push({ y: o.v0 - CH, fn: function () { under(o); } });
      hooks.push({ y: o.v1, fn: function () { head(o); } });
    });
    var NB = Math.round((EAVE - y0) / CH);
    for (var kc = 0; kc < NB; kc++) (function (k) { hooks.push({ y: y0 + k * CH, fn: function () { K.stage('masonry'); bayCourse(k); porchCourse(k); breastCourse(k); } }); })(kc);
    hooks.push({ y: SPR, fn: function () { K.stage('masonry'); arch(); } });
    hooks.push({ y: F1 - 0.20, fn: function () {
      K.stage('masonry');
      K.floor(WALL, -D + WALL, W - KW, -WALL, F1);
      for (var x = BX0 + 0.20; x < BX1 - 0.15; x += 0.40) {                  // joists run on into the bay
        var zt = bayInZ(x, WALL + 0.02); if (zt > -0.1) K.box('timber', x, F1 - UK.JOIST_D / 2, (zt - WALL) / 2, UK.JOIST_W, UK.JOIST_D, zt + WALL, {});
      }
      for (var sx2 = BX0; sx2 < BX1 - 1e-6; sx2 += 0.195) {
        var zm2 = Math.min(bayInZ(sx2, WALL), bayInZ(Math.min(BX1, sx2 + 0.195), WALL));
        if (zm2 > -WALL + 0.02) K.box('chipboard', sx2 + 0.0975, F1 + 0.011, (zm2 - WALL) / 2, 0.195, 0.022, zm2 + WALL, {});
      }
    } });
    [[1.40, 2.0], [3.40, 4.0], [5.00, 5.8]].forEach(function (s) { hooks.push({ y: s[0], fn: function () { K.stage('masonry'); scaffold(s[1]); } }); });
    var i0 = K.items.length, mark = -1;
    hooks.push({ y: 99, fn: function () { mark = K.items.length; } });
    K.wallLoop(pts, {
      y0: y0, y1: EAVE, leaves: 'cavity', palette: PAL, frame: FRAME, party: [1],
      gables: { 1: { ridgeU: D / 2, ridgeY: EAVE + D / 2 * TAN - 0.02, half: D / 2, eaveY: EAVE } },   // party wall up under the tiles
      openings: wl, hooks: hooks
    });
    retime(i0, mark);
    K.stage('masonry');
    for (var kb = NB; y0 + kb * CH < CHY0 - 1e-6; kb++) breastCourse(kb);                                                      // breast on up through the loft
    // the party wall is our blockwork leaf only: it stops against the back of the front and rear facing brick (which
    // runs on into the neighbour's half)
    K.items = K.items.filter(function (it) {
      if (it.g || (it.m !== 'block' && it.m !== 'mortar') || it.x < W - KW - 1e-3 || it.x > W + 1e-3 || Math.abs(Math.abs(it.ry) - Math.PI / 2) > 1e-6) return true;
      var a = Math.max(it.z - it.sx / 2, -D + BW + J / 2), b = Math.min(it.z + it.sx / 2, -BW - J / 2);
      if (b - a < (it.k === 'block' ? 0.10 : 0.02)) return false;
      it.sx = b - a; it.z = (a + b) / 2; return true;
    });
    tidyBlocks();
    K.env(0, 0, -D, W, EAVE, 0);
    K.env(BX0, 0, 0, BX1, EAVE, BD);
    // No block slivers: a cut under 100 mm takes the difference from its neighbour in the course (as a bricklayer
    // would); a short pier piece with no neighbour is a site-cut make-up piece (built, not counted as a block).
    function tidyBlocks() {
      var rows = {};
      K.items.forEach(function (it) { if (it.k === 'block') { var key = it.y.toFixed(4) + '|' + it.ry.toFixed(4); (rows[key] = rows[key] || []).push(it); } });
      Object.keys(rows).forEach(function (key) {
        var row = rows[key];
        row.forEach(function (sl) {
          if (sl.sx >= 0.1 - 1e-6) return;
          var tx = Math.cos(sl.ry), tz = -Math.sin(sl.ry), us = sl.x * tx + sl.z * tz, ns = sl.x * tz - sl.z * tx;
          var done = row.some(function (nb) {
            if (nb === sl || nb.sx < 0.2) return false;
            var un = nb.x * tx + nb.z * tz;
            if (Math.abs(nb.x * tz - nb.z * tx - ns) > 1e-4 || Math.abs(Math.abs(un - us) - (sl.sx / 2 + J + nb.sx / 2)) > 1e-3) return false;
            var dir = un < us ? 1 : -1, far = un - dir * nb.sx / 2, take = 0.1 - sl.sx;
            nb.sx -= take; var un2 = far + dir * nb.sx / 2, us2 = far + dir * (nb.sx + J + 0.05);
            nb.x += (un2 - un) * tx; nb.z += (un2 - un) * tz; sl.sx = 0.1; sl.x += (us2 - us) * tx; sl.z += (us2 - us) * tz;
            return true;
          });
          if (!done) { sl.k = ''; sl.c = 0x8f8f8a; }
        });
      });
    }

    // ═══ 5. ROOF: cut roof (rafters, hips, valleys, ridges, purlins) → felt, battens, plain clay tiles, hips and ridge ═══
    var T = UK.TILES.plain, TOFF = (0.05 + 0.003 + 0.025 + T.th / 2) / COS, FASC = 'timberPaint';
    var MAIN = { ov: OV, planes: [PL(0, 0, 0, -1), PL(0, -D, 0, 1), PL(0, 0, 1, 0)], clips: [PL(W, 0, -1, 0)] };         // hip at our end, runs on at the party line
    var BAYR = { ov: OV, planes: [PL(0, BD, 0, -1), PL(BX0, 0, 1, -1), PL(BX1, 0, -1, -1), PL(BX0, 0, 1, 0), PL(BX1, 0, -1, 0)], clips: [PL(0, -2.5, 0, 1)] };
    var SOLIDS = [MAIN, BAYR];
    var fr = function (F) { var n = F.n; return { n: n, t: [-n[1], n[0]], ry: Math.atan2(-n[0], -n[1]) }; };
    var p3 = function (q, dy) { var d = surfD(SOLIDS, q[0], q[1]); return [q[0], YR(d == null ? 0 : d) + (dy || 0), q[1]]; };
    var lerp2 = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
    // hips, valleys and ridges of the hipped main roof and the bay's hipped projection (plan points)
    var aT = BD / (2 - R2), EL = [BX0 + BD - OV * T22, BD + OV], ER = [BX1 - BD + OV * T22, BD + OV];
    var TL = [BX0 + aT, -aT * (R2 - 1)], TR = [BX1 - aT, -aT * (R2 - 1)], APX = [BXM, BD - HB], RND = [BXM, -HB];
    var VL = [BX0 - OV * T22, OV], VR = [BX1 + OV * T22, OV], HIPX = [D / 2, -D / 2];
    var HIPS = [[[-OV, OV], HIPX], [[-OV, -D - OV], HIPX], [EL, TL], [TL, APX], [bA, TL], [ER, TR], [TR, APX], [bD, TR]];
    var VALLEYS = [[VL, bA], [bA, RND], [VR, bD], [bD, RND]], RIDGES = [[HIPX, [W, -D / 2]], [APX, RND]];
    var TCOL = [0x9a4e36, 0x924a34, 0xa0543b, 0x8a4430, 0x975038];
    var tileCol = function () { var c = TCOL[Math.floor(K.rand() * TCOL.length)], j = 1 + (K.rand() - 0.5) * 0.08; return (Math.min(255, Math.round(((c >> 16) & 255) * j)) << 16) | (Math.min(255, Math.round(((c >> 8) & 255) * j)) << 8) | Math.min(255, Math.round((c & 255) * j)); };

    K.stage('roofframe');
    var plate = function (r, a, b) { if (b - a > 0.05) rb('timber', r, (a + b) / 2, IO + KW / 2, EAVE + IO * TAN / 2, b - a, IO * TAN, KW); };   // wall plate packed to the rafter seat
    plate(R0, WALL, BX0); plate(R0, BX1, W - KW); plate(R2r, KW, W - WALL); plate(R3, WALL, D - WALL);
    BAY.forEach(function (f) { plate(f.r, f.i0, f.r.L - f.i1); });
    for (var cx = 0.45; cx < XB0 - 0.05; cx += 0.40) K.box('timber', cx, EAVE + IO * TAN + 0.05, -D / 2, UK.JOIST_W, 0.10, D - 2 * WALL, {});   // ceiling joists
    for (var bx = BX0 + 0.35; bx < BX1 - 0.3; bx += 0.40) { var zt = bayInZ(bx, WALL); if (zt > -0.2) K.box('timber', bx, EAVE + IO * TAN + 0.05, (zt - WALL) / 2, UK.JOIST_W, 0.10, zt + WALL, {}); }
    HIPS.concat(VALLEYS).forEach(function (h) { K.beam('timber', p3(h[0], -0.04), p3(h[1], -0.04), 0.175, 0.05, {}); });     // hip + valley rafters
    RIDGES.forEach(function (h) { K.beam('timber', p3(h[0], -0.025), p3(h[1], -0.025), 0.175, 0.032, {}); });                     // ridge boards
    SOLIDS.forEach(function (S) { S.planes.forEach(function (F) {                                                            // commons + jacks at 400 c/c
      var f = fr(F);
      for (var u = -11.8; u < 12; u += 0.4) {
        var A = [F.o[0] + f.t[0] * u, F.o[1] + f.t[1] * u];
        facetIvs(SOLIDS, S, F, A, f.n, [-OV, 12]).forEach(function (iv) {
          if (iv[1] - iv[0] > 0.08) K.beam('timber', [A[0] + f.n[0] * iv[0], YR(iv[0]), A[1] + f.n[1] * iv[0]], [A[0] + f.n[0] * iv[1], YR(iv[1]), A[1] + f.n[1] * iv[1]], 0.10, 0.047, {});
        });
      }
    }); });
    var PS = 2.2, PY = YR(PS) - 0.05 / COS - 0.10;                                                                             // purlins under the rafters
    K.box('timber', (PS + 0.1 + W) / 2, PY, -PS, W - PS - 0.15, 0.20, 0.075, {});
    K.box('timber', (PS + 0.1 + W) / 2, PY, -D + PS, W - PS - 0.15, 0.20, 0.075, {});
    K.box('timber', PS, PY, -D / 2, 0.075, 0.20, D - 2 * PS - 0.2, {});

    K.stage('roofcover');
    // shared stack on the party wall at the ridge: built off the party gable before the roof is tiled
    K.chimney({ x: W, z: CHZ, y0: CHY0, y1: CHY1, w: CHW, d: CHD, pots: 4, palette: PAL });
    K.stage('roofcover');
    var FACETS = []; SOLIDS.forEach(function (S) { S.planes.forEach(function (F) { FACETS.push({ S: S, F: F, f: fr(F) }); }); });
    var ROWS = Math.ceil(6.4 / T.gauge), GAP = 0;
    var ivsAt = function (fc, s, gap) { return facetIvs(SOLIDS, fc.S, fc.F, [fc.F.o[0] + fc.f.n[0] * s, fc.F.o[1] + fc.f.n[1] * s], fc.f.t, [-40, 40], gap); };
    var inside = function (list, a, b) { return list.some(function (iv) { return iv[0] <= a + 1e-4 && iv[1] >= b - 1e-4; }); };
    var place = function (fc, s, u) { return [fc.F.o[0] + fc.f.n[0] * s + fc.f.t[0] * u, fc.F.o[1] + fc.f.n[1] * s + fc.f.t[1] * u]; };
    var slab = function (m, fc, s, iv, dy, sy, sl, o) { var p = place(fc, s, (iv[0] + iv[1]) / 2); return K.box(m, p[0], YR(s) + dy, p[1], iv[1] - iv[0], sy, sl, Object.assign({ ry: fc.f.ry, rx: PITCH * RAD }, o || {})); };
    // eaves: painted timber fascia and soffit, fixed to the rafter feet before the roof is felted
    var FY = YR(-OV) + 0.05 / COS - 0.0875;
    var EAV = [[[-OV, OV], VL], [VL, EL], [EL, ER], [ER, VR], [VR, [W, OV]], [[-OV, -D - OV], [-OV, OV]], [[W, -D - OV], [-OV, -D - OV]]];
    EAV.forEach(function (e) {
      var r = RUN(e[0][0], e[0][1], e[1][0], e[1][1]);
      rb(FASC, r, r.L / 2, -0.011, FY, r.L, 0.175, 0.022);
      rb(FASC, r, r.L / 2, OV / 2, FY - 0.0935, r.L, 0.012, OV);
    });
    // breathable felt in strips, then 25 × 38 battens at the 100 mm gauge, over the whole roof
    FACETS.forEach(function (fc) {
      for (var r = 0; r < ROWS; r += 3) {
        var s0 = -OV + r * T.gauge * COS, s1 = s0 + 3 * T.gauge * COS;
        ivAnd(ivsAt(fc, s0 + 0.002, 0), ivsAt(fc, s1, 0)).forEach(function (iv) { slab('felt', fc, (s0 + s1) / 2, iv, 0.052 / COS, 0.003, 3 * T.gauge + 0.02); });
      }
      for (var b = 0; b < ROWS; b++) { var sbt = -OV + (b * T.gauge + T.l - 0.03) * COS; ivsAt(fc, sbt, 0).forEach(function (iv) { if (iv[1] - iv[0] > 0.16) slab('timber', fc, sbt, [iv[0] + 0.06, iv[1] - 0.06], 0.066 / COS, 0.025, 0.038); }); }
    });
    // plain tiles course by course from the eaves, broken bond, cut to the hips and held back from the open valleys
    for (var row = 0; row < ROWS; row++) FACETS.forEach(function (fc) {
      var sb = -OV + row * T.gauge * COS, sc = sb + T.l / 2 * COS, sh = row % 2 ? T.cover / 2 : 0;
      var headL = ivsAt(fc, sb + T.l * COS - 0.003, 0), headM = ivsAt(fc, sb + 0.16 * COS - 0.003, 0);
      ivAnd(ivsAt(fc, sb + 0.003, GAP), ivsAt(fc, sb + T.gauge * COS - 0.003, GAP)).forEach(function (iv) {
        for (var a = Math.floor((iv[0] - sh) / T.cover) * T.cover + sh; a < iv[1] - 1e-6; a += T.cover) {
          var aL = Math.max(iv[0], a), aR = Math.min(iv[1], a + T.cover); if (aR - aL < 0.03) continue;
          // a tile whose hidden head would stand proud past a hip or ridge is cut short
          var tl = inside(headL, aL, aR) ? T.l : (inside(headM, aL, aR) ? 0.16 : T.gauge + 0.01), tc = sb + tl / 2 * COS;
          var p = place(fc, tc, (aL + aR) / 2);
          K.box(T.mat, p[0], YR(tc) + TOFF, p[1], aR - aL - 0.004, T.th, tl, { ry: fc.f.ry, rx: PITCH * RAD - 0.03, kind: 'tile', color: tileCol() });
        }
      });
    });
    VALLEYS.forEach(function (h) {                                                                                         // purpose-made valley tiles
      var n = Math.max(1, Math.round(Math.hypot(h[1][0] - h[0][0], h[1][1] - h[0][1]) / 0.20));
      for (var i = 0; i < n; i++) K.beam(T.mat, p3(lerp2(h[0], h[1], i / n), TOFF - 0.004), p3(lerp2(h[0], h[1], (i + 0.96) / n), TOFF - 0.004), T.th, 0.24, { kind: 'tile', color: tileCol() });
    });
    HIPS.concat(RIDGES).forEach(function (h) {                                                                              // half-round hip and ridge tiles
      var n = Math.max(1, Math.round(Math.hypot(h[1][0] - h[0][0], h[1][1] - h[0][1]) / 0.30));
      for (var i = 0; i < n; i++) K.tube('tileClay', p3(lerp2(h[0], h[1], i / n), TOFF - 0.04), p3(lerp2(h[0], h[1], (i + 1) / n), TOFF - 0.04), 0.085, { kind: 'tile', color: tileCol() });
    });
    // lead apron, back gutter and step flashings round the stack
    var cf = CHZ + CHD / 2, cb = CHZ - CHD / 2, dF = D / 2 - CHD / 2;
    K.box('lead', W, YR(dF - 0.08) + TOFF + 0.01, cf + 0.08, CHW + 0.12, 0.006, 0.18 / COS, { rx: PITCH * RAD });
    K.box('lead', W, YR(dF - 0.08) + TOFF + 0.01, cb - 0.08, CHW + 0.12, 0.006, 0.18 / COS, { ry: Math.PI, rx: PITCH * RAD });
    [cf, cb].forEach(function (z) { K.box('lead', W, YR(dF) + TOFF + 0.08, z + Math.sign(z - CHZ) * 0.004, CHW + 0.10, 0.18, 0.006, {}); });
    [cf, cb].forEach(function (z) { K.beam('lead', [W - CHW / 2 - 0.004, YR(dF) + TOFF + 0.035, z], [W - CHW / 2 - 0.004, YR(D / 2) + TOFF + 0.035, CHZ], 0.10, 0.006, {}); });
    // cast-iron half-round gutters on the fascia brackets (the front run wraps round the bay)
    EAV.forEach(function (e) {
      var r = RUN(e[0][0], e[0][1], e[1][0], e[1][1]), g0 = P(r, -0.02, -0.08), g1 = P(r, r.L + 0.02, -0.08);
      K.tube('gutter', [g0[0], FY + 0.03, g0[1]], [g1[0], FY + 0.03, g1[1]], 0.056, {});
    });
    K.env(-OV, EAVE, -D - OV, W, RIDGE, OV, { k: 'hip', axis: 'x', hips: [true, false] });   // hipped at our end, runs on to the party wall

    // ═══ 6. FIT-OUT: casements with leaded top lights, sunrise front door, French doors, side door, rainwater ═══
    K.stage('fitout');
    var SET = 0.05, FD = 0.07, FW = 0.06, D0 = SET + FD / 2;
    var fb = function (r, u, y, su, sy, d, sd, o) { rb(FRAME, r, u, d == null ? D0 : d, y, su, sy, sd || FD, o); };
    var glass = function (r, a, b, ya, yb, d, col) { if (b - a > 0.02 && yb - ya > 0.02) rb('glass', r, (a + b) / 2, d == null ? D0 : d, (ya + yb) / 2, b - a, yb - ya, 0.012, col ? { color: col } : {}); };
    // diamond leaded lights (lead cames at ±58°, 75 mm apart) over a pane
    function lattice(r, a, b, ya, yb, d) {
      var ang = 58 * RAD, cs = Math.cos(ang), sn = Math.sin(ang), sp = 0.075;
      [1, -1].forEach(function (sg) {
        var dir = [sg * cs, sn], nr = [-sn, sg * cs];
        var cc = [[a, ya], [b, ya], [a, yb], [b, yb]].map(function (p) { return p[0] * nr[0] + p[1] * nr[1]; });
        for (var c = Math.min.apply(null, cc) + sp / 2; c < Math.max.apply(null, cc); c += sp) {
          var t0 = -1e9, t1 = 1e9;
          [[0, a, b], [1, ya, yb]].forEach(function (ax) {
            var base = c * nr[ax[0]], dd = dir[ax[0]], ta = (ax[1] - base) / dd, tb = (ax[2] - base) / dd;
            t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
          });
          if (t1 - t0 < 0.03) continue;
          var tm = (t0 + t1) / 2;
          rb('lead', r, c * nr[0] + tm * dir[0], d, c * nr[1] + tm * dir[1], t1 - t0, 0.006, 0.004, { rz: sg * ang });
        }
      });
    }
    var STAIN = [0xd9a441, 0x5f8f4e, 0xa8323a, 0x3d5f9a];
    function casement(o) {
      var r = o.r, w = o.u1 - o.u0, h = o.v1 - o.v0, uc = (o.u0 + o.u1) / 2, n = o.lights;
      fb(r, uc, o.v1 - FW / 2, w, FW); fb(r, o.u0 + FW / 2, (o.v0 + o.v1) / 2, FW, h); fb(r, o.u1 - FW / 2, (o.v0 + o.v1) / 2, FW, h);
      fb(r, uc, o.v0 + 0.035, w, 0.07, D0 - 0.012, FD + 0.024);                                     // weathered timber cill
      var iv0 = o.v0 + 0.07, iv1 = o.v1 - FW, tl = h > 0.9 ? Math.min(0.36, h * 0.27) : 0, tr = iv1 - tl;
      if (tl) fb(r, uc, tr, w - 2 * FW, 0.055);                                                     // transom
      var lw = (w - 2 * FW - (n - 1) * FW) / n, gcol = o.obscure ? 0xdde4e8 : null;
      for (var i = 0; i < n; i++) {
        var a = o.u0 + FW + i * (lw + FW), b = a + lw;
        if (i > 0) fb(r, a - FW / 2, (iv0 + iv1) / 2, FW, iv1 - iv0);                               // mullion
        var top = tl ? tr - 0.0275 : iv1;
        glass(r, a, b, iv0, top, null, gcol);
        // opening casement: a sash frame standing 10 mm proud inside the outer frame
        [[a + 0.0175, (iv0 + top) / 2, 0.035, top - iv0], [b - 0.0175, (iv0 + top) / 2, 0.035, top - iv0], [(a + b) / 2, iv0 + 0.0225, lw, 0.045], [(a + b) / 2, top - 0.0175, lw, 0.035]].forEach(function (s) { fb(r, s[0], s[1], s[2], s[3], D0 - 0.01, 0.045); });
        if (tl) {
          glass(r, a, b, tr + 0.0275, iv1, null, gcol);
          if (o.leaded) lattice(r, a, b, tr + 0.0275, iv1, D0 - 0.008);
          if (o.stained) rb('glass', r, (a + b) / 2, D0 - 0.007, (tr + iv1) / 2, 0.06, 0.06, 0.004, { rz: Math.PI / 4, color: STAIN[2] });
        }
        if (o.stained) { lattice(r, a + 0.035, b - 0.035, iv0 + 0.045, top - 0.035, D0 - 0.018); [0.3, 0.55, 0.8].forEach(function (f, j) { rb('glass', r, (a + b) / 2, D0 - 0.017, iv0 + (top - iv0) * f, 0.07, 0.07, 0.004, { rz: Math.PI / 4, color: STAIN[j] }); }); }
      }
      rb('timberWhite', r, uc, WALL + 0.01, o.v0 + 0.01, w + 0.06, 0.025, 0.14);                   // window board
    }
    function french(o) {   // pair of glazed timber doors, ten panes a leaf
      var r = o.r, w = o.u1 - o.u0, uc = (o.u0 + o.u1) / 2, v0 = o.v0, v1 = o.v1;
      fb(r, uc, v1 - FW / 2, w, FW); fb(r, o.u0 + FW / 2, (v0 + v1) / 2, FW, v1 - v0); fb(r, o.u1 - FW / 2, (v0 + v1) / 2, FW, v1 - v0);
      rb('stone', r, uc, D0 - 0.02, v0 - 0.01, w, 0.03, FD + 0.06);                                 // hardwood threshold
      var lw = (w - 2 * FW) / 2, top = v1 - FW;
      [0, 1].forEach(function (k) {
        var a = o.u0 + FW + k * lw, b = a + lw, m = (a + b) / 2, dd = D0;
        fb(r, a + 0.035, (v0 + top) / 2, 0.07, top - v0, dd, 0.05); fb(r, b - 0.035, (v0 + top) / 2, 0.07, top - v0, dd, 0.05);
        fb(r, m, v0 + 0.10, lw - 0.14, 0.20, dd, 0.05); fb(r, m, top - 0.035, lw - 0.14, 0.07, dd, 0.05);
        glass(r, a + 0.07, b - 0.07, v0 + 0.20, top - 0.07);
        fb(r, m, (v0 + 0.20 + top - 0.07) / 2, 0.022, top - 0.27, dd - 0.012, 0.03);
        for (var q = 1; q < 5; q++) fb(r, m, v0 + 0.20 + (top - 0.27) * q / 5, lw - 0.14, 0.022, dd - 0.012, 0.03);
        rb('brass', r, k ? a + 0.05 : b - 0.05, dd - 0.035, v0 + 1.0, 0.02, 0.16, 0.025);
      });
      var st = P(r, uc, -0.15); K.box('stone', st[0], 0.075, st[1], w + 0.20, 0.15, 0.30, { ry: RY(r), stage: 'external' });
    }
    WINS.forEach(function (o) {
      if (o.kind === 'win') casement(o);
      else if (o.kind === 'french') french(o);
      else K._openingFit(o.r, { u0: o.u0, u1: o.u1, v0: o.v0, v1: o.v1, type: 'door', color: 'doorGreen' }, { frame: FRAME, setback: SET });
    });
    K.stage('fitout');
    // ── recessed porch: sunrise-glazed front door with a stained-glass side light, quarry-tiled floor, lantern ──
    (function () {
      var r = PBW, L = r.L, v0 = UK.DPC + 0.04, hd = DH, dd = 0.06, lu0 = 0.05, lu1 = 0.85, lc = (lu0 + lu1) / 2, top = hd - 0.05;
      fb(r, 0.025, (v0 + hd) / 2, 0.05, hd - v0, dd); fb(r, L - 0.025, (v0 + hd) / 2, 0.05, hd - v0, dd); fb(r, 0.875, (v0 + hd) / 2, 0.05, hd - v0, dd);
      fb(r, L / 2, hd - 0.025, L, 0.05, dd);
      rb('stone', r, lc, dd, v0 - 0.01, 0.80, 0.02, 0.10);                                          // oak threshold
      var LEAF = 'doorGreen', yc = v0 + 1.02, gl0 = lu0 + 0.12, gl1 = lu1 - 0.12, gtop = top - 0.12, ld = dd + 0.005;
      rb(LEAF, r, lc, ld, (v0 + yc) / 2, 0.80, yc - v0, 0.045);                                     // lower leaf (rails + panels)
      rb(LEAF, r, lu0 + 0.06, ld, (yc + top) / 2, 0.12, top - yc, 0.045); rb(LEAF, r, lu1 - 0.06, ld, (yc + top) / 2, 0.12, top - yc, 0.045);
      rb(LEAF, r, lc, ld, top - 0.06, gl1 - gl0, 0.12, 0.045);
      [[lc - 0.17, v0 + 0.50], [lc + 0.17, v0 + 0.50]].forEach(function (pn) { rb(LEAF, r, pn[0], ld - 0.026, pn[1], 0.24, 0.62, 0.012, { color: 0x2a5a42 }); });
      rb('glass', r, lc, ld, (yc + gtop) / 2, gl1 - gl0, gtop - yc, 0.010);                         // upper glazing
      var sp = P(r, lc, ld - 0.012); K.cyl('glass', sp[0], yc, sp[1], 0.26, 0.012, { rx: Math.PI / 2, ry: RY(r), color: STAIN[0] });   // the rising sun
      for (var k = 1; k < 6; k++) { var th = Math.PI * k / 6; rb(FRAME, r, lc + Math.cos(th) * 0.13, ld - 0.02, yc + Math.sin(th) * 0.13, 0.26, 0.014, 0.012, { rz: th }); }
      rb(FRAME, r, lc, ld - 0.02, yc + 0.265, gl1 - gl0, 0.02, 0.012);
      for (var q = 1; q < 3; q++) rb(FRAME, r, gl0 + (gl1 - gl0) * q / 3, ld - 0.02, (yc + 0.275 + gtop) / 2, 0.016, gtop - yc - 0.275, 0.012);
      rb('brass', r, lc, ld - 0.03, v0 + 0.90, 0.25, 0.05, 0.01); rb('brass', r, lu1 - 0.08, ld - 0.035, v0 + 0.98, 0.05, 0.05, 0.04);
      // side light: timber panel below, stained-glass leaded light above
      rb(FRAME, r, (0.90 + L - 0.05) / 2, dd, (v0 + yc) / 2, L - 0.95, yc - v0, 0.04);
      for (var j = 0; j < 4; j++) { var ya = yc + (top - yc) * j / 4, yb = yc + (top - yc) * (j + 1) / 4; glass(r, 0.90, L - 0.05, ya + 0.004, yb - 0.004, dd, STAIN[j]); }
      lattice(r, 0.90, L - 0.05, yc, top, dd - 0.01);
      // porch floor in red and black quarry tiles, step to the path, plastered soffit, lantern
      K.stage('external');
      for (var tx = 0, ti = 0; tx < PX1 - PX0 - 0.01; tx += 0.15, ti++) for (var tz = -PDEP, tj = 0; tz < 0.29; tz += 0.15, tj++) {
        var tw = Math.min(0.15, PX1 - PX0 - tx), tdp = Math.min(0.15, 0.30 - tz);
        K.box('paving', PX0 + tx + tw / 2, tz < 0 ? UK.DPC + 0.032 : 0.16, tz + tdp / 2, tw - 0.004, tz < 0 ? 0.015 : 0.03, tdp - 0.004, { color: (ti + tj) % 2 ? 0x1f1d1c : 0x8e3524 });
      }
      K.box('brick', PXM, 0.0725, 0.15, PX1 - PX0 + 0.10, 0.145, 0.30, { color: 0x7a3626 });         // step
      K.stage('fitout');
      K.box('timberWhite', PXM, PTOP + 0.012, (-WALL - PDEP) / 2, PX1 - PX0, 0.024, PDEP - WALL, {});
      K.cyl('metal', PXM, PTOP - 0.10, -0.75, 0.006, 0.20, {});
      K.box('upvcBlack', PXM, PTOP - 0.33, -0.75, 0.17, 0.26, 0.17, {}); K.box('glass', PXM, PTOP - 0.34, -0.75, 0.15, 0.20, 0.15, { color: 0xf3d9a0 });
      K.box('brass', PX1 + 0.20, 1.55, 0.006, 0.06, 0.09, 0.008, {}); K.box('brass', PX1 + 0.28, 1.55, 0.006, 0.06, 0.09, 0.008, {});   // house number
    })();
    // ── rainwater: swan-neck offsets from the gutter outlets to cast-iron downpipes, brackets, shoes over gullies ──
    function downpipe(x, zg, zw) {
      var s = zw > zg ? 1 : -1, yt = FY - 0.02, yo = FY - 0.30;
      K.tube('gutter', [x, yt, zg], [x, yt - 0.08, zg], 0.034, {});
      K.tube('gutter', [x, yt - 0.08, zg], [x, yo, zw], 0.034, {});
      K.tube('gutter', [x, yo, zw], [x, 0.12, zw], 0.034, {});
      for (var by = 0.9; by < yo - 0.2; by += 1.8) K.box('gutter', x, by, zw + s * 0.03, 0.10, 0.03, 0.02, {});
      K.tube('gutter', [x, 0.12, zw], [x, 0.06, zw - s * 0.10], 0.036, {});
      K.stage('external'); K.box('concrete', x, 0.03, zw - s * 0.14, 0.24, 0.06, 0.24, {}); K.box('gutter', x, 0.062, zw - s * 0.14, 0.15, 0.006, 0.15, {}); K.stage('fitout');
    }
    downpipe(0.20, OV + 0.08, 0.05); downpipe(W - 0.10, OV + 0.08, 0.05);
    downpipe(0.20, -D - OV - 0.08, -D - 0.05); downpipe(W - 0.15, -D - OV - 0.08, -D - 0.05);
    // TV aerial strapped to the stack
    var ax = W - 0.25, az = CHZ - CHD / 2 - 0.05;
    K.tube('metal', [ax, CHY1 - 0.55, az], [ax, CHY1 + 1.25, az], 0.02, {});
    [CHY1 - 0.45, CHY1 - 0.15].forEach(function (y) { K.box('metal', ax, y, az + 0.025, 0.05, 0.03, 0.05, {}); K.box('metal', W, y, az + 0.045, CHW + 0.01, 0.025, 0.006, {}); });   // wall brackets + strapping
    K.tube('metal', [ax, CHY1 + 1.05, az - 0.45], [ax, CHY1 + 1.05, az + 0.55], 0.012, {});
    for (var ae = 0; ae < 6; ae++) K.tube('metal', [ax - 0.24 + ae * 0.02, CHY1 + 1.05, az - 0.4 + ae * 0.18], [ax + 0.24 - ae * 0.02, CHY1 + 1.05, az - 0.4 + ae * 0.18], 0.005, {});
    // terracotta air bricks under the suspended timber ground floor
    [[R0, 0.9], [R0, 6.6], [R3, 3.0], [R3, 6.2], [R2r, 3.4], [R2r, 6.3]].forEach(function (a) { rb('terracotta', a[0], a[1], -0.003, y0 + 3 * CH + J + UK.BH / 2, UK.BL, UK.BH, 0.012); });

    // ═══ 7. EXTERNAL: pebbledash to the first floor of the front and the bay (bell-cast bead at the floor line) ═══
    function render(r, ya, yb, ops) {
      K.stage('external');
      var ys = [ya, yb];
      ops.forEach(function (o) { [o.v0, o.v1].forEach(function (v) { if (v > ya + 1e-6 && v < yb - 1e-6) ys.push(v); }); });
      for (var y = ya + 0.6; y < yb - 0.1; y += 0.6) ys.push(y);
      ys = ys.map(function (v) { return Math.round(v * 1e4) / 1e4; }).sort(function (a, b) { return a - b; }).filter(function (v, i, a) { return !i || v - a[i - 1] > 1e-6; });
      for (var i = 0; i < ys.length - 1; i++) {
        // panels overlap their neighbours by 3 mm (same coat, so no seam shows) and stand 2 mm off the brick face
        H._courseSegments(0, r.L, ys[i], ys[i + 1], ops, null).forEach(function (s) { if (s[1] - s[0] > 0.02) rb('pebbledash', r, (s[0] + s[1]) / 2, -0.012, (ys[i] + ys[i + 1]) / 2 + 0.0015, s[1] - s[0] + 0.003, ys[i + 1] - ys[i] + 0.003, 0.020); });
      }
      H._courseSegments(0, r.L, ya, ya + 0.03, ops, null).forEach(function (s) { rb('render', r, (s[0] + s[1]) / 2, -0.016, ya + 0.012, s[1] - s[0], 0.03, 0.032); });
    }
    render(R0, F1, EAVE, wl[0]);
    BAY.forEach(function (f) { render(f.r, F1, EAVE, f.ops); });

    // ═══ 8. LANDSCAPING: front garden, side drive and gates, rear patio and garden, street ═══
    K.stage('external');
    var GZ = 6.0, XB = -3.30, RZ = -D - 12.0;                       // front boundary, left boundary, rear boundary
    // low front wall in matching brick with a brick-on-edge coping and a white timber gate on the path; privet behind
    K.gardenWall([[-0.15, GZ], [W - 0.06, GZ]], 0.60, { gates: [{ seg: 0, u0: PXM - 0.30 + 0.15, u1: PXM + 0.60 + 0.15 }], palette: PAL, coping: 'brick', gateMat: 'timberPaint' });
    K.stage('external');
    [[-0.05, PXM - 0.45], [PXM + 0.75, W - 0.15]].forEach(function (h) {
      for (var hx = h[0]; hx < h[1] - 0.05; hx += 0.6) { var hw = Math.min(0.6, h[1] - hx); K.box('plant', hx + hw / 2, 0.45, GZ - 0.38, hw + 0.04, 0.90, 0.48, { color: [0x2f5a2c, 0x335f2e, 0x2b5228][Math.floor(K.rand() * 3)] }); }
    });
    // crazy-paved path from the gate to the porch step
    var pr = K.rand;
    for (var pz = 0.32, prow = 0; pz < GZ - 0.25; prow++) {
      var ph = 0.22 + pr() * 0.2, px = PXM - 0.45;
      while (px < PXM + 0.45 - 0.02) { var pw = Math.min(0.20 + pr() * 0.25, PXM + 0.45 - px); K.box('paving', px + pw / 2, 0.02, pz + ph / 2, pw - 0.025, 0.04, ph - 0.025, { color: [0xa39a8a, 0x8d8679, 0xb3a58e, 0x7f7a72][Math.floor(pr() * 4)] }); px += pw; }
      pz += ph;
    }
    K.lawn(-0.10, 1.25, PXM - 0.50, GZ - 0.65); K.lawn(PXM + 0.50, 0.40, W - 0.10, GZ - 0.65);
    K.stage('external'); K.box('soil', (BX0 - 0.1 + PXM - 0.5) / 2, 0.015, 0.95, PXM - 0.5 - BX0 + 0.1, 0.03, 0.55, {});   // bed under the bay
    K.shrub(0.30, 0.95, 0.35); K.shrub(2.05, 1.05, 0.30); K.shrub(3.55, 0.85, 0.28); K.shrub(6.55, 0.75, 0.40);
    K.tree(0.35, 4.9, 3.3);                                         // flowering cherry by the front wall
    // side drive: twin concrete wheel strips with gravel between, to a pair of close-boarded gates beside the house
    K.stage('external');
    K.box('gravel', (XB + 0.1) / 2, 0.015, (GZ + 0.2 - D - 0.3) / 2, -XB - 0.1, 0.03, GZ + 0.2 + D + 0.3, {});
    [-2.35, -1.05].forEach(function (cx) { for (var cz = GZ + 0.15; cz > -1.55; cz -= 1.5) { var cl = Math.min(1.5, cz + 1.55); K.box('concrete', cx, 0.04, cz - cl / 2, 0.60, 0.05, cl - 0.012, {}); } });
    var GT = -1.55, gx0 = XB + 0.10, gx1 = -0.05, gm = (gx0 + gx1) / 2;
    [gx0, gx1].forEach(function (x) { K.box('fencePost', x, 0.95, GT, 0.10, 1.90, 0.10, {}); });
    [[gx0 + 0.06, gm - 0.01], [gm + 0.01, gx1 - 0.06]].forEach(function (lf) {
      var c = (lf[0] + lf[1]) / 2, w = lf[1] - lf[0];
      K.box('fence', c, 0.95, GT, w, 1.65, 0.025, { color: 0x7a5434 });
      [0.40, 1.50].forEach(function (y) { K.box('fence', c, y, GT - 0.03, w - 0.05, 0.10, 0.03, { color: 0x6a4a2e }); });
      K.beam('fence', [lf[0] + 0.05, 0.45, GT - 0.03], [lf[1] - 0.05, 1.45, GT - 0.03], 0.09, 0.03, { color: 0x6a4a2e });
    });
    K.bin(-0.55, -0.80, 0, 'binBlack'); K.bin(-1.25, -0.80, 0, 'binGreen'); K.bin(-1.95, -0.80, 0, 'binBlue');
    // boundaries: low fence to the front, 1.8 m close-board fences round the back garden
    K.fence([[XB, GZ], [XB, GT]], 0.90); K.fence([[XB, GT], [XB, RZ]], 1.80); K.fence([[XB, RZ], [W, RZ]], 1.80); K.fence([[W, -D - 0.2], [W, RZ]], 1.80);
    // rear: 600 × 600 slab patio outside the French doors, lawn, a garden shed
    K.paving(-0.10, -D - 3.0, W - 0.10, -D - 0.10);
    K.lawn(XB + 0.1, RZ + 0.1, W - 0.1, -D - 3.0);
    K.stage('external');
    K.box('fence', XB + 1.4, 1.0, RZ + 1.2, 2.4, 2.0, 1.8, { color: 0x6e5034 }); K.box('felt', XB + 1.4, 2.06, RZ + 1.2, 2.6, 0.06, 2.0, { rx: 0.08 });
    K.box('timberPaint', XB + 1.4, 0.9, RZ + 2.11, 0.75, 1.75, 0.02, {});
    // street: slab footway and kerb in front of the boundary
    K.paving(XB, GZ + 0.15, W, GZ + 2.05);
    K.stage('external'); K.box('stone', (XB + W) / 2, 0.06, GZ + 2.15, W - XB, 0.12, 0.15, {});

    // ═══ 9. NEIGHBOUR: the other half of the pair, mirrored about the party wall, as a blueprint ghost ═══
    K.ghost(function () {
      var X = function (x) { return 2 * W - x; };
      K.box('brick', 1.5 * W, EAVE / 2, -0.05, W, EAVE, 0.10, {}); K.box('brick', 1.5 * W, EAVE / 2, -D + 0.05, W, EAVE, 0.10, {});
      K.box('brick', 2 * W - 0.05, EAVE / 2, -D / 2, 0.10, EAVE, D, {});
      BAY.forEach(function (f) { var r = f.r, c = P(r, r.L / 2, 0.05); K.box('brick', X(c[0]), EAVE / 2, c[1], r.L, EAVE, 0.10, { ry: -RY(r) }); });
      var GM = { ov: OV, planes: [PL(0, 0, 0, -1), PL(0, -D, 0, 1), PL(2 * W, 0, -1, 0)], clips: [PL(W, 0, 1, 0)] };
      var GB = { ov: OV, planes: [PL(0, BD, 0, -1), PL(X(BX0), 0, -1, -1), PL(X(BX1), 0, 1, -1), PL(X(BX0), 0, -1, 0), PL(X(BX1), 0, 1, 0)], clips: [PL(0, -2.5, 0, 1)] };
      var GS = [GM, GB], gg = 0.45, gc = 0.9;
      GS.forEach(function (S) { S.planes.forEach(function (F) {
        var f = fr(F);
        for (var q = 0; q < 6.4; q += gg) {
          var s = -OV + (q + gg / 2) * COS, A = [F.o[0] + f.n[0] * s, F.o[1] + f.n[1] * s];
          facetIvs(GS, S, F, A, f.t, [-40, 40]).forEach(function (iv) {
            for (var a = Math.floor(iv[0] / gc) * gc; a < iv[1] - 1e-6; a += gc) {
              var aL = Math.max(iv[0], a), aR = Math.min(iv[1], a + gc); if (aR - aL < 0.03) continue;
              var p = [A[0] + f.t[0] * (aL + aR) / 2, A[1] + f.t[1] * (aL + aR) / 2];
              K.box('tileClay', p[0], YR(s) + TOFF, p[1], aR - aL, 0.03, gg / COS, { ry: f.ry, rx: PITCH * RAD, color: 0x9a4e36 });
            }
          });
        }
      }); });
      K.box('brick', 1.5 * W, 0.30, GZ, W - 0.1, 0.60, 0.10, {});
    });

    K.anchor('front', W / 2, 1.5, 0); K.anchor('top', W / 2, RIDGE, -D / 2);
    return { name: '1930s semi-detached', info: { storeys: 2, frontage: W, depth: D, eave: EAVE, ridge: RIDGE, bay: '2-storey canted', roof: 'hipped, plain clay tiles 40°' } };

    // Lintels, cills and cavity closers that the kit appends after the last course are moved back in the build order so
    // each appears as the brickwork reaches it.
    function retime(a, m) {
      if (m < 0) return;
      var items = K.items, tail = items.splice(m), movers = [], rest = [];
      tail.forEach(function (it) { (it.st === 'masonry' ? movers : rest).push(it); });
      var bi = [], by = [];
      for (var i = a; i < m; i++) { var it = items[i]; if (it.k === 'brick' && !it.g) { bi.push(i); by.push(Math.max(by.length ? by[by.length - 1] : -9, it.y - it.sy / 2)); } }
      var slot = {};
      movers.forEach(function (it) {
        var e = H._extents(it), thr = (it.m === 'steel' ? it.y - e[1] : it.y + e[1]) - 0.02, lo = 0, hi = by.length;
        while (lo < hi) { var md = (lo + hi) >> 1; if (by[md] < thr) lo = md + 1; else hi = md; }
        var at = lo < bi.length ? bi[lo] : m;
        (slot[at] = slot[at] || []).push(it);
      });
      var out = [];
      for (var j = 0; j < m; j++) { if (slot[j]) out.push.apply(out, slot[j]); out.push(items[j]); }
      if (slot[m]) out.push.apply(out, slot[m]);
      K.items = out.concat(rest);
    }
  };
})(HB3D);
