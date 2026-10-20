// Victorian mid-terrace (c. 1890), a "tunnel-back": two storeys of one-brick solid walls in Flemish bond (red facing
// brick, buff London-stock string course and dentil eaves course to the street), stone dressings, canted ground-floor
// bay with a slate roof, four-panel door with fanlight, knob, knocker and two stone steps, timber sashes; slate cut
// roof (ridge parallel to the street) with painted fascias and cast-iron half-round gutters, swan-necks and downpipes.
// The houses are handed in pairs: the hall/stair wall (right) is shared with the paired outrigger next door, the
// fireplace wall (left) with the other neighbour, so the main stack (8 pots, one row per house) stands on the left
// party wall and the kitchen-range stack (4 pots) on the right outrigger party wall. The outrigger roof runs into the
// main rear slope in lead valleys; its eaves, gutter and downpipe are on the yard side only.
// Hidden construction is of its time: lime-concrete strip and corbelled brick footings, a suspended timber ground floor
// on honeycomb sleeper walls (terracotta air bricks below), chimney breasts gathered into the stack in the loft, a
// one-brick spine wall, a straight stair rising from the back room, quarry tiles in the kitchen. Rear yard: 1.8 m
// one-brick walls with brick-on-edge coping, a ledged back gate to the alley, flags, gullies, outside WC. Front: dwarf
// wall with coursed piers, cast-iron gate, encaustic tiled path, bins, meter box. Neighbours are ghosts.
(function (H) {
  'use strict';
  var UK = H.UK, CH = UK.CH, BW = UK.BW, BL = UK.BL, BH = UK.BH, J = UK.J, CW = UK.CW, RAD = Math.PI / 180;

  function RUN(ax, az, bx, bz, out) { return { ax: ax, az: az, bx: bx, bz: bz, L: Math.hypot(bx - ax, bz - az), out: out }; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function cutIv(list, a, b) {
    var o = [];
    list.forEach(function (s) { if (b <= s[0] || a >= s[1]) { o.push(s); return; } if (a > s[0]) o.push([s[0], a]); if (b < s[1]) o.push([b, s[1]]); });
    return o;
  }
  // rectangle [x0,z0,x1,z1] minus rectangular holes → rectangles (strips along x, equal neighbours merged)
  function rectMinus(R, holes) {
    var xs = [R[0], R[2]];
    holes.forEach(function (h) { [h[0], h[2]].forEach(function (x) { if (x > R[0] + 1e-6 && x < R[2] - 1e-6) xs.push(x); }); });
    xs.sort(function (a, b) { return a - b; });
    xs = xs.filter(function (x, i) { return !i || x - xs[i - 1] > 1e-6; });
    var out = [], prev = null;
    for (var i = 0; i < xs.length - 1; i++) {
      var xa = xs[i], xb = xs[i + 1], xm = (xa + xb) / 2, iv = [[R[1], R[3]]];
      holes.forEach(function (h) { if (xm > h[0] && xm < h[2]) iv = cutIv(iv, h[1], h[3]); });
      var key = iv.map(function (s) { return s[0].toFixed(4) + ':' + s[1].toFixed(4); }).join('|');
      if (prev && prev.key === key) { prev.rects.forEach(function (r) { r[2] = xb; }); continue; }
      prev = { key: key, rects: iv.map(function (s) { return [xa, s[0], xb, s[1]]; }) };
      Array.prototype.push.apply(out, prev.rects);
    }
    return out.filter(function (r) { return r[2] - r[0] > 0.02 && r[3] - r[1] > 0.02; });
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var L = Math.hypot(a[0], a[1], a[2]); return [a[0] / L, a[1] / L, a[2] / L]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  // a box whose local X runs along unit u and local Y along unit v (⟂ u); local Z = u × v (YZX Euler angles, as the viewer)
  function obox(K, mat, c, u, v, su, sv, sw, o) {
    var w = cross(u, v);
    return K.box(mat, c[0], c[1], c[2], su, sv, sw, Object.assign({}, o || {}, { rz: Math.asin(Math.max(-1, Math.min(1, u[1]))), ry: Math.atan2(-u[2], u[0]), rx: Math.atan2(-w[1], v[1]) }));
  }

  H.models.terraced = function (K, opts) {
    K.brickPalette = 'red';
    // ═══ 0. DIMENSIONS (outer faces of the brickwork; 75 mm courses) ═══
    var W = 4.95, D1 = 8.54, Wo = 3.14, Do = 4.49;                       // frontage, main depth, outrigger width/depth
    var XO = W - Wo, ZB = -D1 - Do;                                       // outrigger side-wall face (1.81), back face (−13.03)
    var y0 = -0.15, ffl = 0.30, gf = 41 * CH;                             // raised ground floor (2 steps), 3.075 floor to floor
    var floor1 = ffl + gf, eave = y0 + 83 * CH;                           // first floor 3.375, wall plate 6.075
    var pitch = 40, TAN = Math.tan(pitch * RAD), rise = D1 / 2 * TAN, ridge = eave + rise;
    var oEave = y0 + 79 * CH, oPitch = 35, OTAN = Math.tan(oPitch * RAD), oRise = Wo / 2 * OTAN, oRidge = oEave + oRise;
    var oFloor = floor1 - 0.15;                                           // outrigger first floor: a step down from the landing
    var XL = BL, XR = W - BL, ZF = -BL, ZR = -D1 + BL, OXM = XO + Wo / 2; // inner faces of the solid walls; outrigger ridge line
    var T = UK.TILES.slate, OM = H._slopeOffs(pitch * RAD, T), OO = H._slopeOffs(oPitch * RAD, T);
    var FASC = 'gutter', MORT = 'mortarLime', COMMON = 'brown', BOARD = 0x8d6a45, sash = 'sash22', stone = 'stone';
    var pts = [[0, 0], [W, 0], [W, -D1], [W, ZB], [XO, ZB], [XO, -D1], [0, -D1]];
    // runs: 0 front · 1 right party (main) · 2 right party (outrigger) · 3 outrigger back · 4 outrigger side · 5 main back · 6 left party
    var R0 = RUN(0, 0, W, 0, [0, 1]), R5 = RUN(XO, -D1, 0, -D1, [0, -1]);
    var rb = function (m, r, u, d, y, su, sy, sd, o) { var p = K._runPoint(r, u, d); return K.box(m, p[0], y, p[1], su, sy, sd, Object.assign({ ry: K._ry(r) }, o || {})); };
    var segsOf = function (r, a, b, yb, ops, g) { return H._courseSegments(a, b, yb, yb + CH, ops, g || null); };
    function layFlem(r, yb, k, segs, pal) { if (segs.length) K._layRun(r, yb, BL, BH, BL, segs, { uA: 0, uB: r.L, mid: r.L / 2, unit: 'brick', palette: pal, bond: 'flemish', course: k, mortarMat: MORT }); }
    function layHalf(r, yb, k, segs, pal) {   // half-brick stretcher bond, half bats at both ends on alternate courses
      if (segs.length) K._layRun(r, yb, BL, BH, BW, segs, { uA: k % 2 ? -CW : 0, uB: k % 2 ? r.L + CW : r.L, mid: r.L / 2, unit: 'brick', palette: pal, mortarMat: MORT });
    }

    // ═══ 1. OPENINGS (u along the run from its start corner; v absolute). Rear sashes 1.8 m tall under stone lintels ═══
    var AIR = [];
    function air(run, u, v0) { AIR.push({ run: run, u: u, v0: v0 }); return { u0: u, u1: u + BL, v0: v0, v1: v0 + 2 * CH, type: 'void' }; }
    function win(u0, u1, v0, v1, st) { return { u0: u0, u1: u1, v0: v0, v1: v1, type: 'window', style: st || sash, lintel: stone, sill: stone }; }
    var openings = {
      0: [{ u0: 0.45, u1: 2.85, v0: 0.15, v1: 3.00, type: 'void' },                       // bay mouth, carried by a bressummer
          { u0: 3.39, u1: 4.425, v0: ffl, v1: 3.00, type: 'door', fanlight: true, color: 'doorGreen', knob: true, knocker: true, lintel: stone },
          win(1.08, 2.215, floor1 + 0.75, floor1 + 2.25), win(3.465, 4.375, floor1 + 0.75, floor1 + 2.25),
          air(0, 0.12, 0.0), air(0, 4.58, 0.0)],
      3: [win(0.90, 2.025, 1.05, 2.85), win(1.125, 2.025, floor1 + 0.75, floor1 + 2.10)],
      4: [{ u0: 0.675, u1: 1.575, v0: 0.15, v1: 2.40, type: 'door', fanlight: true, color: 'doorBlack', knob: true, lintel: stone },
          win(2.25, 3.375, 1.05, 2.85), win(2.475, 3.15, floor1 + 0.90, floor1 + 2.10, 'sash')],
      5: [win(0.35, 1.475, 1.05, 2.85), win(0.45, 1.35, floor1 + 0.75, floor1 + 2.10), air(5, 0.45, 0.075), air(5, 1.30, 0.075)]
    };

    // ═══ 2. INTERIOR: breasts, spine wall, cross wall, floors, stair ═══
    // chimney breasts (1½-brick projection, 1.35 wide): parlour + back room and the bedrooms over them on the left party
    // wall, gathered in the loft into the shared stack at the ridge; kitchen range + back bedroom on the outrigger party wall
    var BP = 0.3275, BHW = 0.675, BT = y0 + 121 * CH;
    var SZ = -D1 / 2, SW = 0.7875, SD = 1.4625, SY0 = y0 + 109 * CH, SY1 = y0 + 144 * CH;          // main stack on the party line x = 0
    var OSZ = -10.20, OSW = 0.7875, OSD = 0.89, OSY1 = y0 + 104 * CH;                              // outrigger stack on x = W
    var MB = [-2.0, -6.40].map(function (zc, i) {
      return { zc: zc, fires: [[0.90, ffl, ffl + 13 * CH], [0.675, floor1, floor1 + 11 * CH]],
        top: i ? [SZ - SD / 2 + 0.005, SZ - 0.005] : [SZ + 0.005, SZ + SD / 2 - 0.005] };       // where the gathered breast meets the stack
    });
    var KFIRES = [[1.125, 0.15, 0.15 + 18 * CH], [0.675, oFloor, oFloor + 11 * CH]];
    function breastCourse(xw, sg, zLo, zHi, bp, yb, k, fires) {   // three half-brick faces round the flues, fireplace openings
      var xf = xw + sg * bp, L = zHi - zLo, ev = k % 2 === 0;
      var F = sg > 0 ? RUN(xf, zHi, xf, zLo, [1, 0]) : RUN(xf, zLo, xf, zHi, [-1, 0]);
      var C1 = RUN(xw, zHi, xf, zHi, [0, 1]), C2 = RUN(xw, zLo, xf, zLo, [0, -1]);
      var ops = (fires || []).map(function (f) { return { u0: L / 2 - f[0] / 2, u1: L / 2 + f[0] / 2, v0: f[1], v1: f[2] + 2 * CH }; });
      var fa = ev ? 0 : CW, fb = ev ? L : L - CW, cb = ev ? bp - CW : bp;      // corners alternate between the face and the cheeks
      var fs = segsOf(F, fa, fb, yb, ops);
      if (fs.length) K._layRun(F, yb, BL, BH, BW, fs, { uA: fa, uB: fb, mid: (fa + fb) / 2, unit: 'brick', palette: COMMON, mortarMat: MORT });
      if (cb > 0.04) [C1, C2].forEach(function (c) { K._layRun(c, yb, BL, BH, BW, [[0, cb]], { uA: 0, uB: cb, mid: cb / 2, unit: 'brick', palette: COMMON, mortarMat: MORT }); });
      (fires || []).forEach(function (f) { if (Math.abs(yb - f[2]) < 1e-6) rb('stone', F, L / 2, BW / 2, f[2] + CH, f[0] + 0.20, 2 * CH - 0.004, BW - 0.01); });
    }
    // one-brick spine wall between the front and back rooms (half-brick above the first floor), door to the back room,
    // opening where the stair arrives
    var SPN = RUN(XL + 0.01, -4.20, XR - 0.01, -4.20, [0, 1]), SDX = function (x) { return x - SPN.ax; };
    var SPN_GF = [{ u0: SDX(3.39), u1: SDX(4.22), v0: ffl, v1: 2.40 + 2 * CH }];
    var SPN_FF = [{ u0: SDX(3.30), u1: SPN.L + 0.10, v0: floor1, v1: floor1 + 2.10 + 2 * CH }];
    var SPN_LINT = [[SDX(3.24), SDX(4.37), 2.40, BL], [SDX(3.15), SPN.L + 0.12, floor1 + 2.10, BW]];
    // the main back wall carried on across the outrigger (back room ↔ kitchen, back bedroom ↔ outrigger bedroom), its top
    // stepped under the outrigger roof
    var XW = RUN(XR - 0.01, -D1, XO + BL + 0.02, -D1, [0, -1]), XDX = function (x) { return XW.ax - x; };
    var XW_OPS = [{ u0: XDX(3.38), u1: XDX(2.55), v0: ffl, v1: 2.40 + 2 * CH }, { u0: XDX(3.38), u1: XDX(2.55), v0: floor1, v1: floor1 + 2.10 + 2 * CH }];
    var XW_LINT = [[XDX(3.53), XDX(2.40), 2.40, BL], [XDX(3.53), XDX(2.40), floor1 + 2.10, BL]];
    var LO = 0.05 + (0.0485 + 0.025) / Math.cos(oPitch * RAD);
    var XW_G = { ridgeU: XDX(OXM), ridgeY: oRidge + LO, eaveY: oEave + LO, half: Wo / 2 };
    function lintels(r, list, yb) { list.forEach(function (l) { if (Math.abs(yb - l[2]) < 1e-6) rb('timber', r, (l[0] + l[1]) / 2, l[3] / 2, l[2] + CH, l[1] - l[0], 2 * CH - 0.004, l[3] - 0.01); }); }
    // dentil eaves course: alternate headers projecting 55 mm, under the soffit
    function dentils(r, a, b, yb, pal) { for (var u = a; u + BW <= b + 1e-6; u += 2 * CW) rb('brick', r, u + BW / 2, BL / 2 - 0.055, yb + J + BH / 2, BW, BH, BL, { color: K._brickColor(pal, 0.95), kind: 'brick' }); }
    // terracotta air brick (215 × 140) to the sub-floor void, set 5 mm back, with its slots
    function airBrick(a) {
      var r = a.run === 0 ? R0 : R5, uc = a.u + BL / 2, yc = a.v0 + CH;
      rb('terracotta', r, uc, 0.05, yc, BL - 0.008, 2 * CH - 0.016, 0.09);
      for (var i = 0; i < 3; i++) for (var j = 0; j < 5; j++) rb('gutter', r, uc + (j - 2) * 0.038, 0.0035, yc + (i - 1) * 0.036, 0.024, 0.018, 0.003);
    }
    // everything laid course by course with the main walls
    function courseK(k) {
      var yb = y0 + k * CH;
      K.stage('masonry');
      if (yb < eave - 1e-6) {
        if (yb < floor1 - 1e-6) layFlem(SPN, yb, k, segsOf(SPN, 0, SPN.L, yb, SPN_GF), COMMON);
        else layHalf(SPN, yb, k, segsOf(SPN, 0, SPN.L, yb, SPN_FF), COMMON);
        lintels(SPN, SPN_LINT, yb);
        layFlem(XW, yb, k, segsOf(XW, 0, XW.L, yb, XW_OPS, XW_G), COMMON);
        lintels(XW, XW_LINT, yb);
      }
      MB.forEach(function (b) {
        if (yb < eave - 1e-6) breastCourse(XL, 1, b.zc - BHW, b.zc + BHW, BP, yb, k, b.fires);
        else if (yb < BT - 1e-6) { var t = (yb - eave) / (BT - eave); breastCourse(XL, 1, lerp(b.zc - BHW, b.top[0], t), lerp(b.zc + BHW, b.top[1], t), lerp(0.30, 0.18, t), yb, k, null); }
      });
      if (yb < oEave - 1e-6) breastCourse(XR, -1, OSZ - BHW, OSZ + BHW, BP, yb, k, KFIRES);
      if (Math.abs(yb - (eave - 4 * CH)) < 1e-6) { dentils(R0, 0.06, W - 0.06, yb, 'london'); dentils(R5, 0.06, XO - 0.06, yb, 'red'); }
      AIR.forEach(function (a) { if (Math.abs(yb - a.v0) < 1e-6) airBrick(a); });
    }
    // floors: joists at 400 c/c spanning party wall to party wall, trimmed round hearths and the stairwell
    var SPINE_HOLE = [XL, -4.415, XR, -4.20];
    var hearthHole = function (xw, sg, zc) { return sg > 0 ? [xw, zc - BHW, xw + BP + 0.45, zc + BHW] : [xw - BP - 0.45, zc - BHW, xw, zc + BHW]; };
    var GF_HOLES = MB.map(function (b) { return hearthHole(XL, 1, b.zc); });
    var STAIRWELL = [XR - 0.87, -7.60, XR, -4.415];
    var FF_HOLES = GF_HOLES.concat([STAIRWELL]), OF_HOLES = [hearthHole(XR, -1, OSZ)];
    function joists(x0, z0, x1, z1, yTop, jd, holes, skipZ) {
      for (var z = z0 + 0.06; z <= z1 - 0.03; z += 0.40) {
        if ((skipZ || []).some(function (s) { return z > s[0] - 0.04 && z < s[1] + 0.04; })) continue;
        var iv = [[x0, x1]];
        holes.forEach(function (h) { if (z + 0.03 > h[1] && z - 0.03 < h[3]) iv = cutIv(iv, h[0], h[2]); });
        iv.forEach(function (s) { if (s[1] - s[0] > 0.10) K.box('timber', (s[0] + s[1]) / 2, yTop - jd / 2, z, s[1] - s[0], jd, UK.JOIST_W, {}); });
      }
      holes.forEach(function (h) {   // trimmers along the open edges of each hole
        var za = Math.max(z0, h[1]), zb = Math.min(z1, h[3]);
        [[h[0], -1], [h[2], 1]].forEach(function (e) { if (e[0] > x0 + 0.05 && e[0] < x1 - 0.05) K.box('timber', e[0] + e[1] * UK.JOIST_W / 2, yTop - jd / 2, (za + zb) / 2, UK.JOIST_W, jd, zb - za, {}); });
      });
    }
    function deck(R, holes, yTop) { rectMinus(R, holes).forEach(function (q) { K.box('timber', (q[0] + q[2]) / 2, yTop - 0.011, (q[1] + q[3]) / 2, q[2] - q[0] - 0.004, 0.022, q[3] - q[1] - 0.004, { color: BOARD }); }); }
    function sleepers() {   // half-brick honeycomb sleeper walls on the oversite
      [1.60, 3.30].forEach(function (xs) {
        for (var c = 0; c < 2; c++) for (var z = ZF - 0.08 - (c ? 0.1625 : 0); z - BL > ZR + 0.05; z -= 0.325) {
          var zc = z - BL / 2; if (zc + BL / 2 > -4.47 && zc - BL / 2 < -4.15) continue;
          K.box('brick', xs, c * CH + J + BH / 2, zc, BW, BH, BL, { color: K._brickColor(COMMON), kind: 'brick' });
        }
      });
    }
    function groundFloor() {   // wall plates on the sleepers, 100 × 50 joists; boards go down at the fit-out
      [1.60, 3.30].forEach(function (xs) { [[ZR + 0.08, -4.47], [-4.15, ZF - 0.08]].forEach(function (s) { K.box('timber', xs, 0.164, (s[0] + s[1]) / 2, 0.10, 0.028, s[1] - s[0], {}); }); });
      joists(XL, ZR, XR, ZF, ffl - 0.022, 0.10, GF_HOLES, [[-4.415, -4.20]]);
    }
    // straight flight of 15 risers rising from the back room toward the front along the right party wall
    function stair() {
      var n = 15, R = gf / n, G = 0.22, zTop = -4.415, zFoot = zTop - (n - 1) * G, x0 = XR - 0.85, xc = (x0 + XR) / 2, tw = 0.85 - 0.064;
      for (var i = 1; i <= n; i++) {
        var zr = zFoot + (i - 1) * G;
        K.box('timber', xc, ffl + (i - 1) * R + (R - 0.025) / 2, zr + 0.009, tw, R - 0.025, 0.018, {});        // riser
        if (i < n) K.box('timber', xc, ffl + i * R - 0.0125, zr + G / 2 - 0.01, tw, 0.025, G + 0.02, {}); // tread + nosing
      }
      [x0 + 0.016, XR - 0.016].forEach(function (x) { K.beam('timberPaint', [x, ffl + 0.10, zFoot - 0.08], [x, floor1 + 0.12, zTop], 0.28, 0.032, {}); });   // strings
      K.box('timberPaint', x0 + 0.045, ffl + 0.575, zFoot - 0.05, 0.09, 1.15, 0.09, {});                                                               // newel
      var rail = function (z) { return ffl + 1.05 + (z - zFoot) / (zTop - zFoot) * (floor1 + 0.90 - ffl - 1.05); };
      K.beam('timber', [x0 + 0.045, rail(zFoot - 0.05), zFoot - 0.05], [x0 + 0.045, rail(zTop), zTop], 0.06, 0.05, {});
      for (var b = 1; b < n; b++) { var zb = zFoot + (b - 0.5) * G, yt = ffl + b * R; K.box('timberPaint', x0 + 0.045, (yt + rail(zb)) / 2, zb, 0.032, rail(zb) - yt, 0.032, {}); }
    }
    // underground: lime-concrete strip and corbelled brick footings for the internal walls, breasts and bay
    function footing(r, wt) {
      var c = K._runPoint(r, r.L / 2, wt / 2), ry = K._ry(r);
      K.stage('found');
      K.box('concrete', c[0], -0.785, c[1], r.L + 0.30, 0.23, Math.max(0.60, wt + 0.30), { ry: ry, color: 0xbdb6a2 });
      [0.44, 0.39, 0.33, 0.27].forEach(function (fw, k) { K.box('brick', c[0], -0.67 + k * CH + J + BH / 2, c[1], r.L + Math.max(0, fw - wt), BH, Math.max(fw, wt), { ry: ry, color: 0x7a4a36 }); });
      for (var y = -0.67 + 4 * CH; y < -0.15 - 1e-6; y += CH) K.box('brick', c[0], y + J + BH / 2, c[1], r.L, BH, wt, { ry: ry, color: 0x7a4a36 });
      K.stage('masonry');
    }

    // ═══ 3. SET-OUT, FOUNDATIONS, OVERSITE (the slab follows the L-shaped plan, none in the yard) ═══
    K.foundation(pts, { era: 'victorian' });
    [SPN, XW].forEach(function (r) { footing(r, BL); });
    MB.forEach(function (b) { footing(RUN(XL + BP, b.zc + BHW, XL + BP, b.zc - BHW, [1, 0]), BP); });
    footing(RUN(XR - BP, OSZ - BHW, XR - BP, OSZ + BHW, [-1, 0]), BP);
    var BAY = { x0: 0.45, x1: 2.85, d: 0.675 }, S2 = Math.SQRT1_2;
    [RUN(0.45, 0, 1.125, 0.675, [-S2, S2]), RUN(1.125, 0.675, 2.175, 0.675, [0, 1]), RUN(2.175, 0.675, 2.85, 0, [S2, S2])].forEach(function (r) { footing(r, BW); });
    K.stage('slab');
    K.box('concrete', (XO + BL + XR) / 2, 0.0675, (ZB + BL - D1) / 2, XR - XO - BL, 0.135, -D1 - (ZB + BL), {});   // kitchen floor bed
    K.stage('masonry');

    // ═══ 4. BAY (built with the façade: its brickwork and stone are re-timed course by course below) ═══
    var b0 = K.items.length;
    K.bayWindow({ x0: BAY.x0, x1: BAY.x1, d: BAY.d, zf: 0, sill: ffl + 0.60, head: ffl + 2.55, top: 3.00, rise: 0.30, style: 'sash22', palette: 'red', frame: 'timberPaint', fascia: FASC });
    var bayMas = [], bayRest = [];
    K.items.splice(b0).forEach(function (it) {
      if (it.st !== 'masonry') { bayRest.push(it); return; }
      if (it.m === 'stone' && it.sy > 0.6) {   // stone mullion piers: set in blocks of four courses as the brickwork rises
        var nbk = Math.round(it.sy / 0.30), bh = it.sy / nbk, yb0 = it.y - it.sy / 2;
        for (var q = 0; q < nbk; q++) bayMas.push(Object.assign({}, it, { y: yb0 + (q + 0.5) * bh, sy: bh - 0.003 }));
        return;
      }
      bayMas.push(it);
    });
    Array.prototype.push.apply(K.items, bayRest);

    // ═══ 5. MASONRY: the wall loop lays the shell course by course; hooks raise everything else with it ═══
    var hooks = [];
    var NK = Math.round((BT - y0) / CH);
    for (var kc = 0; kc < NK; kc++) (function (k) { hooks.push({ y: y0 + k * CH, fn: function () { courseK(k); } }); })(kc);
    hooks.push({ y: -0.001, fn: function () { K.stage('masonry'); sleepers(); } });
    hooks.push({ y: 0.15, fn: function () { K.stage('masonry'); groundFloor(); } });
    hooks.push({ y: oFloor - 0.20, fn: function () { K.stage('masonry'); joists(XO + BL, ZB + BL, XR, -D1, oFloor, UK.JOIST_D, OF_HOLES, null); } });
    hooks.push({ y: floor1 - 0.20, fn: function () { K.stage('masonry'); joists(XL, ZR, XR, ZF, floor1, UK.JOIST_D, FF_HOLES, [[-4.415, -4.20]]); } });
    hooks.push({ y: floor1 + 0.15, fn: function () { K.stage('masonry'); stair(); } });
    hooks.push({ y: 2.775 - 0.001, fn: function () { K.stage('masonry'); K.box('timber', 1.65, 2.8865, -0.1075, 2.70, 0.223, 0.205, {}); } });   // bressummer over the bay mouth
    // independent tied scaffold, front and back only (never along the party walls); the front lift stands clear of the bay
    var SCF = { runs: [{ a: [-0.25, 0], b: [W + 0.25, 0], out: [0, 1], off: 1.90, inner: 0.85 }] };
    var SCR = { runs: [
      { a: [XO, ZB], b: [W, ZB], out: [0, -1], off: 1.20, inner: 0.40, ext: [1.20, 0] },              // outrigger back (ladder bay)
      { a: [XO, -D1 - 1.25], b: [XO, ZB], out: [-1, 0], off: 1.20, inner: 0.40, ext: [0, 1.20] },      // outrigger side, in the side return
      { a: [0.10, -D1], b: [XO - 0.43, -D1], out: [0, -1], off: 1.20, inner: 0.40 }                   // main back wall, in the side return
    ] };
    [[1.40, 2.0], [3.40, 4.0], [5.00, 5.8]].forEach(function (s) { hooks.push({ y: s[0], fn: function () { K.stage('masonry'); K.scaffoldLift(pts, s[1], SCF); K.scaffoldLift(pts, s[1], SCR); } }); });
    var w0 = K.items.length, mark = -1;
    hooks.push({ y: 99, fn: function () { mark = K.items.length; } });
    K.wallLoop(pts, {
      y0: y0, y1: eave, bond: 'flemish', palette: 'red', party: [1, 2, 6], partyBond: 'flemish', partyPalette: 'brown', lintels: stone, sills: stone, frame: 'timberPaint', mortar: MORT, setback: 0.11,
      runY1: { 2: oEave, 3: oEave, 4: oEave }, gablesAfterRoof: false, gableLift: 'auto',
      gables: { 1: { ridgeU: D1 / 2, ridgeY: ridge, half: D1 / 2, eaveY: eave }, 6: { ridgeU: D1 / 2, ridgeY: ridge, half: D1 / 2, eaveY: eave }, 3: { ridgeU: Wo / 2, ridgeY: oRidge, half: Wo / 2, eaveY: oEave } },
      openings: openings, hooks: hooks,
      bands: [{ y0: floor1 - 0.075, y1: floor1 + 0.075, palette: 'london', runs: [0] }]
    });
    // lintels and sills the loop appends at the end, and the bay's brickwork and stone, go in as the walls reach them
    var tail = K.items.splice(mark), movers = bayMas, rest = [];
    tail.forEach(function (it) { (it.st === 'masonry' ? movers : rest).push(it); });
    (function retime(a, m) {
      var items = K.items, bi = [], by = [], slot = {};
      for (var i = a; i < m; i++) { var it = items[i]; if (it.k === 'brick' && !it.g) { bi.push(i); by.push(Math.max(by.length ? by[by.length - 1] : -9, it.y - it.sy / 2)); } }
      movers.forEach(function (it) {
        var e = H._extents(it), thr = it.y - e[1] - 0.004, lo = 0, hi = by.length;
        while (lo < hi) { var md = (lo + hi) >> 1; if (by[md] < thr) lo = md + 1; else hi = md; }
        var at = lo < bi.length ? bi[lo] : m;
        (slot[at] = slot[at] || []).push(it);
      });
      var out = [];
      for (var j = 0; j < items.length; j++) { if (slot[j]) Array.prototype.push.apply(out, slot[j]); out.push(items[j]); }
      if (slot[items.length]) Array.prototype.push.apply(out, slot[items.length]);
      K.items = out.concat(rest);
    })(w0, mark);
    // the Flemish front ends a perpend short of the right party line (where next door's brickwork carries on); with the
    // neighbour drawn as a ghost that joint would show as a column of mortar, so the corner units are slid onto the line
    K.items.forEach(function (q) {
      if (q.g || q.m !== 'brick' || q.k !== 'brick' || Math.abs(Math.sin(q.ry || 0)) > 1e-6 || q.z > 0.001 || q.z < -BL || q.y > eave) return;
      var gx = W - (q.x + q.sx / 2); if (gx > 0.004 && gx < 0.013) q.x += gx;
    });

    // ═══ 6. STACKS, built off the gables before the roof is covered ═══
    K.stage('masonry');
    // shared 8-pot stack centred on the left party wall at the ridge: courses buried under the slope are left out, and it
    // gets lead aprons and stepped flashings (on our side only) once the slates under it are laid
    K.chimney({ x: 0, z: SZ, y0: SY0, y1: SY1, w: SW, d: SD, pots: 8, potH: 0.75, palette: 'red', stage: 'masonry',
      roof: { axis: 'x', ridgeZ: SZ, ridgeY: ridge, pitch: pitch, tile: 'slate', a0: 0, a1: W } });
    // shared kitchen-range stack rising off the outrigger party wall from its eaves (flashed on our side below)
    K.chimney({ x: W, z: OSZ, y0: oEave, y1: OSY1, w: OSW, d: OSD, pots: 4, potH: 0.60, palette: 'red', stage: 'masonry' });

    // ═══ 7. ROOFS: main cut roof, then the outrigger whose ridge runs into the main rear slope ═══
    K.roofGable({ x0: 0, x1: W, z0: -D1, z1: 0, eaveY: eave, pitch: pitch, ridge: 'x', tile: 'slate', overhang: 0.15, verge: 0, cut: true, barge: false, ridgeMat: 'ridge',
      fascia: FASC, eavesRange: { s0: [0, XO] }, downpipeAt: { s0: [XO - 0.15], s1: [W - 0.10] } });
    var r0 = K.items.length, zTopV = -D1 + (oRidge + OO.top - eave - OM.top) / TAN;
    K.roofGable({ x0: XO, x1: W, z0: ZB, z1: -D1 + (oRidge - eave) / TAN, eaveY: oEave, pitch: oPitch, ridge: 'z', tile: 'slate', overhangs: [0.15, 0], verge: 0, cut: true, barge: false, ridgeMat: 'ridge',
      fascia: FASC, eaves: 's0', eavesRange: { s0: [ZB, -D1] }, downpipeAt: { s0: [ZB + 0.18] }, verges: 'a0' });
    // the outrigger's plates and purlins stop in the cross wall; its rafters and ceiling joists stay out of the main house
    var zIn = ZR - 0.005;
    for (var ii = r0; ii < K.items.length; ii++) {
      var it = K.items[ii]; if (it.st !== 'roofframe' || it.g) continue;
      if (!it.rx && !it.ry && !it.rz && it.sz > 1.0 && it.y < oRidge - 0.3) { var za = it.z - it.sz / 2, zb = Math.min(it.z + it.sz / 2, zIn); it.sz = zb - za; it.z = (za + zb) / 2; }
      else if (it.sz < 0.2 && it.z > zIn) it._cut = 1;
    }
    K.items = K.items.filter(function (q) { return !q._cut; });
    K.stage('roofcover');
    // lead valleys where the outrigger roof meets the main rear slope: a sheet dressed on each slope along the valley line
    var yA = function (z) { return eave + OM.top + (z + D1) * TAN; };
    var zEdge = -D1 - 0.15, yEdge = yA(zEdge), hiPt = [OXM, oRidge + OO.top, zTopV];
    function valley(lo, hi, nA, sgA, nB) {
      var dv = sub(hi, lo), Lv = Math.hypot(dv[0], dv[1], dv[2]), v = norm(dv), mid = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
      [[norm(nA), sgA], [norm(nB), -sgA]].forEach(function (pl) {
        var n = pl[0], e = norm(cross(n, v)); if (e[0] * pl[1] < 0) e = [-e[0], -e[1], -e[2]];
        obox(K, 'lead', [mid[0] + e[0] * 0.07 + n[0] * 0.009, mid[1] + e[1] * 0.07 + n[1] * 0.009, mid[2] + e[2] * 0.07 + n[2] * 0.009], v, n, Lv, 0.004, 0.14);
      });
    }
    valley([XO + (yEdge - oEave - OO.top) / OTAN, yEdge, zEdge], hiPt, [0, 1, -TAN], -1, [-OTAN, 1, 0]);
    valley([W - (yEdge - oEave - OO.top) / OTAN, yEdge, zEdge], hiPt, [0, 1, -TAN], 1, [OTAN, 1, 0]);
    // outrigger stack: back gutter + cover flashing on the uphill face, stepped flashings down both sides to the party wall
    (function () {
      var yC = function (x) { return oEave + OO.top + (W - x) * OTAN; }, cos = Math.cos(oPitch * RAD), th = 0.006, xi = W - OSW / 2;
      var xb = xi - 0.125;
      K.box('lead', xb, yC(xb) + (th / 2 + 0.004) / cos, OSZ, 0.25 / cos, th, OSD + 0.15, { rz: -oPitch * RAD });
      K.box('lead', xi - 0.004, yC(xi) + 0.07, OSZ, th, 0.16, OSD + 0.012, {});
      var te = 0.045 + 0.05 / cos, run = CH / OTAN;
      [OSZ - OSD / 2 - 0.005, OSZ + OSD / 2 + 0.005].forEach(function (zf) {
        K.beam('lead', [xi, yC(xi) + 0.045, zf], [W, yC(W) + 0.045, zf], 0.10, th, {});
        for (var yj = oEave + Math.ceil((yC(W) + te - oEave) / CH) * CH; yj <= yC(xi) + te + CH + 1e-6; yj += CH) {
          var sj = Math.max(xi, W - (yj - te - yC(W)) / OTAN), sk = Math.min(W, sj + run);
          if (sk - sj > 0.01) K.box('lead', (sj + sk) / 2, yj - CH / 2 - 0.01, zf + (zf < OSZ ? -0.002 : 0.002), sk - sj, CH + 0.02, 0.004, {});
        }
      });
      // lead-lined valley gutter on the party wall between our outrigger roof and the paired one next door
      [[ZB, OSZ - OSD / 2 - 0.01], [OSZ + OSD / 2 + 0.01, -D1]].forEach(function (s) { K.box('lead', W + 0.06, oEave + 0.065, (s[0] + s[1]) / 2, 0.24, 0.006, s[1] - s[0], {}); });
    })();

    // ═══ 8. FIT-OUT: fireplaces, range, floors, rainwater to the party valley, soil stack, lamp, number, aerial ═══
    K.stage('fitout');
    function fireFit(xw, sg, zc, f, kitchen) {
      var xf = xw + sg * BP, w = f[0], v0 = f[1], v1 = f[2], h = v1 - v0;
      K.box('stone', xf + sg * 0.225, v0 - 0.008, zc, 0.45, 0.04, w + 0.40, {});                                  // hearth
      if (kitchen) {   // black-leaded range filling the opening, brass rail, oven door
        K.box('gutter', xf - sg * 0.20, v0 + (h - 0.12) / 2, zc, 0.40, h - 0.12, w - 0.04, {});
        K.box('brass', xf + sg * 0.03, v0 + 0.80, zc, 0.02, 0.02, w - 0.10, {});
        K.box('steel', xf + sg * 0.004, v0 + 0.45, zc - w * 0.22, 0.008, 0.40, w * 0.36, {});
        return;
      }
      K.box('gutter', xf - sg * 0.18, v0 + (h - 0.06) / 2, zc, 0.02, h - 0.06, w - 0.08, {});                    // cast-iron register grate
      K.box('gutter', xf - sg * 0.10, v0 + 0.16, zc, 0.12, 0.18, w * 0.55, {});                                   // fire basket
      [-1, 1].forEach(function (s) { K.box('timberPaint', xf + sg * 0.015, (v0 + v1 + 0.25) / 2, zc + s * (w / 2 + 0.07), 0.03, v1 + 0.25 - v0, 0.12, {}); });
      K.box('timberPaint', xf + sg * 0.015, v1 + 0.125, zc, 0.03, 0.25, w + 0.26, {});                            // frieze
      K.box('timberPaint', xf + sg * 0.09, v1 + 0.27, zc, 0.18, 0.04, w + 0.44, {});                              // mantel shelf
    }
    MB.forEach(function (b) { b.fires.forEach(function (f) { fireFit(XL, 1, b.zc, f, false); }); });
    fireFit(XR, -1, OSZ, KFIRES[0], true); fireFit(XR, -1, OSZ, KFIRES[1], false);
    // floorboards, kitchen quarry tiles, boards in the bay
    deck([XL, ZR, XR, ZF], GF_HOLES.concat([SPINE_HOLE]), ffl);
    deck([XL, ZR, XR, ZF], FF_HOLES.concat([SPINE_HOLE]), floor1);
    deck([XO + BL, ZB + BL, XR, -D1], OF_HOLES, oFloor);
    for (var qx = XO + BL; qx < XR - 0.02; qx += 0.30) for (var qz = ZB + BL; qz < -D1 - 0.02; qz += 0.30) {
      var qw = Math.min(0.30, XR - qx), qd = Math.min(0.30, -D1 - qz), hx = qx + qw / 2, hz = qz + qd / 2, hh = OF_HOLES[0];
      if (hx > hh[0] && hx < hh[2] && hz > hh[1] && hz < hh[3]) continue;
      K.box('paving', hx, 0.144, hz, qw - 0.006, 0.012, qd - 0.006, { color: [0x8e3524, 0x83301f, 0x96402c, 0x7a2d1d][Math.floor(K.rand() * 4)] });
    }
    var bayIn = function (x) { var d = BW + 0.01; return Math.min(BAY.d - d, x - BAY.x0 - d * Math.SQRT2, BAY.x1 - d * Math.SQRT2 - x); };
    for (var sx = BAY.x0; sx < BAY.x1 - 1e-6; sx += 0.20) {
      var zm = Math.min(bayIn(sx), bayIn(Math.min(BAY.x1, sx + 0.20)));
      if (zm > 0.02) K.box('timber', sx + 0.10, ffl - 0.011, (zm + ZF) / 2, 0.196, 0.022, zm - ZF, { color: BOARD });
    }
    // hopper head and downpipe at the back for the party valley gutter; cast-iron soil-and-vent pipe on the outrigger
    (function () {
      var x = W - 0.25, z = ZB - 0.09;
      K.box('gutter', x, oEave - 0.10, z - 0.01, 0.24, 0.18, 0.16, {});
      K.box('lead', (x + W) / 2 + 0.05, oEave - 0.02, ZB - 0.03, W - x + 0.10, 0.03, 0.08, {});
      K.tube('gutter', [x, oEave - 0.19, z], [x, 0.10, z], 0.034, {});
      for (var cy = oEave - 0.60; cy > 0.40; cy -= 1.80) { K.cyl('gutter', x, cy, z, 0.042, 0.05, {}); K.box('gutter', x, cy, z + 0.045, 0.12, 0.035, 0.05, {}); }
      K.box('gutter', x, 0.08, z - 0.03, 0.12, 0.05, 0.14, {});
      var sx2 = W - 0.45, sz = ZB - 0.07, top = oEave + 0.95;
      K.tube('gutter', [sx2, 0.0, sz], [sx2, top, sz], 0.05, {});
      for (var sy = 0.9; sy < top - 0.3; sy += 1.8) { K.cyl('gutter', sx2, sy, sz, 0.06, 0.06, {}); K.box('gutter', sx2, sy, sz + 0.05, 0.16, 0.04, 0.03, {}); }
      K.tube('gutter', [sx2, oFloor + 0.12, sz], [sx2, oFloor + 0.12, ZB + 0.02], 0.05, {});                     // WC branch
      K.cyl('gutter', sx2, 0.06, sz, 0.065, 0.12, {});                                                           // boot into the drain
      K.sph('metal', sx2, top + 0.07, sz, 0.055, 0.08, 0.055, {});                                               // wire balloon
    })();
    // wall lantern by the door, gilt numerals on the fanlight
    K.box('gutter', 4.62, 2.32, 0.06, 0.025, 0.025, 0.12, {});
    K.box('upvcBlack', 4.62, 2.20, 0.12, 0.14, 0.03, 0.14, {});
    K.box('glass', 4.62, 2.09, 0.12, 0.11, 0.18, 0.11, { color: 0xf1d79a });
    K.box('upvcBlack', 4.62, 1.99, 0.12, 0.12, 0.025, 0.12, {});
    (function () {
      var SEG = { a: [0, 1, 1], g: [0, 0, 1], d: [0, -1, 1], b: [1, 0.5, 0], c: [1, -0.5, 0], e: [-1, -0.5, 0], f: [-1, 0.5, 0] }, w = 0.055, h = 0.10, s = 0.011;
      [['2', -0.045], ['7', 0.045]].forEach(function (dg) {
        ({ 2: 'abged', 7: 'abc' })[dg[0]].split('').forEach(function (k) {
          var q = SEG[k];
          K.box('brass', 3.9075 + dg[1] + q[0] * w / 2, 2.757 + q[1] * h / 2, -0.131, q[2] ? w : s, q[2] ? s : h / 2, 0.003, {});
        });
      });
    })();
    // TV aerial strapped to the back of the main stack
    (function () {
      var ax = 0.22, az = SZ - SD / 2 - 0.07, yb = SY1 - 0.60, yt = SY1 + 1.55, ey = yt - 0.20;
      K.tube('metal', [ax, yb, az], [ax, yt, az], 0.02, {});
      [yb + 0.10, yb + 0.40].forEach(function (y) { K.box('metal', ax, y, az + 0.04, 0.05, 0.03, 0.05, {}); K.box('metal', 0, y, SZ - SD / 2 - 0.004, SW + 0.012, 0.022, 0.006, {}); });
      K.tube('metal', [ax, ey, az - 0.30], [ax, ey, az + 1.0], 0.012, {});
      for (var e = 0; e < 7; e++) { var hl = 0.26 - e * 0.015, ez = az - 0.22 + e * 0.19; K.tube('metal', [ax - hl, ey, ez], [ax + hl, ey, ez], 0.005, {}); }
      K.box('metal', ax, ey - 0.06, az - 0.30, 0.44, 0.24, 0.015, {});
    })();

    // ═══ 9. FRONT GARDEN: one-brick dwarf wall, coursed piers, cast-iron gate on the tiled path, gravel, shrubs, bins, meter ═══
    var gz = 3.375;
    K.gardenWall([[-0.105, gz], [W, gz]], 0.825, { gates: [{ seg: 0, u0: 3.405, u1: 4.455 }], palette: 'red', coping: 'stone', bond: 'flemish', mortar: MORT });
    K.gardenWall([[0.11, 0.05], [0.11, gz]], 0.825, { palette: 'red', coping: 'stone', bond: 'flemish', mortar: MORT });
    K.tiledPath(3.30, 0.60, 4.35, gz + BL);
    K.stage('external');
    K.box('gravel', 1.705, 0.015, gz / 2, 3.18, 0.03, gz - 0.01, {});
    K.box('upvc', 3.055, 0.21, 0.125, 0.34, 0.42, 0.25, {}); K.box('gutter', 3.18, 0.30, 0.252, 0.02, 0.02, 0.004, {});   // semi-concealed meter box
    K.shrub(0.75, 2.4, 0.42); K.shrub(1.5, 2.65, 0.32);
    K.bin(2.30, 2.55, 0, 'binBlack'); K.bin(2.95, 2.55, 0, 'binGreen');

    // ═══ 10. REAR YARD: flags, 1.8 m one-brick walls with brick-on-edge coping, back gate to the alley, gullies, WC ═══
    var ZY = -17.53;                                                          // rear boundary (alley side)
    K.paving(0.115, ZB, XO - 0.005, -D1 - 0.005);                             // side return
    K.paving(0.115, ZY + BL + 0.005, W - BL / 2 - 0.005, ZB - 0.005);         // yard behind the outrigger
    var YW = { palette: 'red', coping: 'brick', bond: 'flemish', mortar: MORT };
    K.gardenWall([[-BL / 2, -D1 - 0.01], [-BL / 2, ZY + BL + 0.01]], 1.80, YW);
    K.gardenWall([[-BL / 2, ZY], [W + BL / 2, ZY]], 1.80, Object.assign({ gates: [{ seg: 0, u0: 0.75, u1: 1.65 }], gateMat: false }, YW));
    K.gardenWall([[W + BL / 2, ZY + BL + 0.01], [W + BL / 2, ZB - 0.01]], 1.80, YW);
    K.stage('external');
    (function backGate() {   // ledged and braced boarded gate, hung on the yard side
      var gx0 = -BL / 2 + 0.75, gx1 = -BL / 2 + 1.65, gzz = ZY + BL + 0.02, cx = (gx0 + gx1) / 2, w = gx1 - gx0 - 0.02, nb = 8, bw = w / nb;
      for (var i = 0; i < nb; i++) K.box('fence', gx0 + 0.01 + (i + 0.5) * bw, 0.93, gzz - 0.012, bw - 0.006, 1.70, 0.022, { color: 0x2e4636 });
      [0.30, 0.95, 1.60].forEach(function (y) { K.box('fence', cx, y, gzz + 0.016, w - 0.08, 0.10, 0.03, { color: 0x29402f }); });
      [[0.30, 0.95], [0.95, 1.60]].forEach(function (s) { K.beam('fence', [gx0 + 0.10, s[0] + 0.06, gzz + 0.016], [gx1 - 0.10, s[1] - 0.06, gzz + 0.016], 0.09, 0.028, { color: 0x29402f }); });
      [0.30, 1.60].forEach(function (y) { K.box('gutter', gx0 + 0.20, y, gzz + 0.034, 0.36, 0.035, 0.006, {}); });
      K.box('gutter', gx1 - 0.08, 1.05, gzz + 0.04, 0.14, 0.03, 0.02, {});
    })();
    function gully(x, z) { K.box('concrete', x, 0.031, z, 0.26, 0.062, 0.26, {}); K.box('gutter', x, 0.0625, z, 0.16, 0.004, 0.16, {}); }
    gully(XO - 0.15, -D1 - 0.17); gully(XO - 0.19, ZB + 0.18); gully(W - 0.25, ZB - 0.22);
    K.box('gutter', 2.60, 0.051, -16.0, 0.66, 0.008, 0.51, {}); K.box('metal', 2.60, 0.056, -16.0, 0.60, 0.006, 0.45, {});   // inspection chamber
    (function outsideWC() {   // half-brick privy in the yard corner, mono-pitch slate roof, ledged door with gaps top and bottom
      var x0 = 3.52, x1 = W - BL / 2 - 0.012, zf = -15.85, zb = ZY + BL + 0.012, hF = 27 * CH, hB = 35 * CH, dep = zf - zb;
      var RW = [RUN(x0, zf, x1, zf, [0, 1]), RUN(x1, zf, x1, zb, [1, 0]), RUN(x1, zb, x0, zb, [0, -1]), RUN(x0, zb, x0, zf, [-1, 0])];
      var door = [{ u0: 0.28, u1: 1.03, v0: 0, v1: hF }];
      var gab = [null, { ridgeU: dep, ridgeY: hB, eaveY: hF, half: dep }, null, { ridgeU: 0, ridgeY: hB, eaveY: hF, half: dep }];
      for (var k = 0; k < 35; k++) {
        var yb = k * CH, ev = k % 2 === 0;
        RW.forEach(function (r, i) {
          var own = (i % 2 === 0) === ev, a = own ? 0 : CW, b = own ? r.L : r.L - CW, top = i === 0 ? hF : (i === 2 ? hB : 99);
          if (yb >= top - 1e-6) return;
          var segs = H._courseSegments(a, b, yb, yb + CH, i === 0 ? door : null, gab[i]);
          if (segs.length) K._layRun(r, yb, BL, BH, BW, segs, { uA: a, uB: b, mid: (a + b) / 2, unit: 'brick', palette: 'red', mortarMat: MORT });
        });
        if (Math.abs(yb - 25 * CH) < 1e-6) rb('timber', RW[0], 0.655, BW / 2, yb + CH, 1.05, 2 * CH - 0.004, BW - 0.01);
      }
      var th = Math.atan2(hB - hF, dep), tn = Math.tan(th), cs = Math.cos(th), sn = Math.sin(th), ze = zf + 0.10, ye = hF + 0.03 - 0.10 * tn;
      var Ls = (ze - zb) / cs, ax0 = x0 - 0.06, ax1 = x1 + 0.03;
      K.box('timber', (ax0 + ax1) / 2, ye + Ls * sn / 2 + 0.01, (ze + zb) / 2, ax1 - ax0, 0.022, Ls, { rx: th });   // boarding on the rafters
      for (var rr = 0; rr * T.gauge < Ls - 0.05; rr++) {
        var dd = rr * T.gauge + T.l / 2, ll = Math.min(T.l, Ls - rr * T.gauge), dc = rr * T.gauge + ll / 2, sh = rr % 2 ? T.cover / 2 : 0;
        for (var a = ax0 - sh; a < ax1 - 0.01; a += T.cover) {
          var aL = Math.max(ax0, a), aR = Math.min(ax1, a + T.cover); if (aR - aL < 0.03) continue;
          K.box('slate', (aL + aR) / 2, ye + dc * sn + 0.028 + rr * 0.0006, ze - dc * cs, aR - aL - 0.004, T.th, ll, { rx: th - 0.012, kind: 'tile', color: [0x40464f, 0x3b4048, 0x454b54][Math.floor(K.rand() * 3)] });
        }
      }
      K.box(FASC, (ax0 + ax1) / 2, ye - 0.04, ze + 0.011, ax1 - ax0, 0.12, 0.022, {});
      K.box('gutter', (ax0 + ax1) / 2, ye - 0.03, ze + 0.07, ax1 - ax0, 0.06, 0.10, {});
      for (var bi = 0; bi < 6; bi++) K.box('fence', x0 + 0.29 + (bi + 0.5) * 0.12, 0.98, zf - 0.03, 0.114, 1.62, 0.022, { color: 0x2e4636 });   // boards, gaps top and bottom
      K.box('gutter', x0 + 0.95, 1.0, zf - 0.012, 0.10, 0.025, 0.012, {});
      [0.35, 1.55].forEach(function (y) { K.box('gutter', x0 + 0.45, y, zf - 0.016, 0.30, 0.03, 0.005, {}); });
    })();

    // ═══ 11. NEIGHBOURS (ghosts): main bodies, paired outriggers, and the stacks on alternate party walls ═══
    [-2, -1, 1, 2].forEach(function (n) { K.ghostHouse(n * W, (n + 1) * W, -D1, 0, eave, ridge, 'x'); });
    [[W, W + Wo], [-W, -W + Wo], [-W - Wo, -W], [3 * W - Wo, 3 * W]].forEach(function (g) { K.ghostHouse(g[0], g[1], ZB, -D1, oEave, oRidge, 'z'); });
    K.ghost(function () {
      var gs = function (x, z, yb, yt, w, d, n) {
        K.box('brick', x, (yb + yt) / 2, z, w, yt - yb, d, {});
        var per = n > 4 ? 4 : 2, sp = d / per;
        for (var i = 0; i < n; i++) K.cyl('terracotta', x + (Math.floor(i / per) - 0.5) * w / 2, yt + 0.38, z + (i % per - (per - 1) / 2) * sp, 0.11, 0.70, {});
      };
      [-2 * W, 2 * W].forEach(function (x) { gs(x, SZ, ridge - 0.65, SY1, SW, SD, 8); });
      [-W, 3 * W].forEach(function (x) { gs(x, OSZ, oEave, OSY1, OSW, OSD, 4); });
    });

    K.items.forEach(function (q, i) { q.seq = i; });
    K.stage('masonry');
    K.anchor('front', W / 2, 1.5, 0); K.anchor('top', W / 2, ridge, -D1 / 2);
    return { name: 'Victorian mid-terrace', info: { storeys: 2, frontage: W, depth: D1 + Do, eave: eave, ridge: ridge, roof: 'slate cut roof 40°, outrigger 35°', walls: 'one-brick Flemish bond' } };
  };
})(HB3D);
