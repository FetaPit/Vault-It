// Modern UK Build-to-Rent residential tower (Manchester / London type, 2020s).
// 30 residential storeys (floor-to-floor 3.150 = 42 courses, 225 mm flat slabs) over a two-storey podium (ground 4.50 +
// mezzanine 3.75): double-height glazed residents' lobby with automatic doors under a cantilevered canopy, retail and
// café frontage with signage fascias, a two-storey amenity wing (café + gym) with a residents' roof garden.
// Structure: piled raft, reinforced-concrete core slip-formed a storey ahead, perimeter columns, flat slabs (375 mm
// transfer slab over the podium). Façade on a 2.925 m grid (900 mm brick piers, 2.025 m floor-to-ceiling bays) with
// reconstituted-stone slab-edge bands, dark aluminium windows with 1.1 m guarding transoms, hung balconies with
// frameless glass balustrades and stainless hanger rods, a louvred brick crown screening the roof plant, lift overrun,
// BMU on a perimeter track with its cleaning cradle, aircraft-warning lights. During the build: hoarding, piling rig,
// climbing tower crane (jib re-positioned at each climb), edge protection that is struck as each band of floors is clad.
// CLEAN SHELL (what the app draws): `K.clean` builds only what a viewer sees from outside — the buyer's own floor in real brick
// (frames, glass, balconies, gold bands) over a plain solid silhouette of everything else (podium, wing, one wall + slab band per
// floor, crown, roof deck, lift overrun). No structure, interiors, crane, hoarding, edge protection, landscaping or neighbours.
// PERFORMANCE: only the buyer's own floor (opts.floor, 1–30) is laid in real 3D brick — a cavity wall (facing brick,
// insulation, blockwork) laid course by course while the frame keeps rising above it; every other floor uses the
// true-scale brick-slip `cladding` material with real 3D bands, frames, glass and balconies.
(function (H) {
  'use strict';
  var UK = H.UK;

  H.models.apartment = function (K, opts) {
    opts = opts || {};
    var NF = 30, uf = Math.max(1, Math.min(NF, Math.round(+opts.floor) || 5));
    K.brickPalette = 'red';

    // ── dimensions (all on the 225 × 75 brick module) ──
    var CH = UK.CH, FTF = UK.STOREY_APT, SLAB = 0.225, WALL = UK.WALL;
    var PIER = 0.90, BAY = 2.025, PITCH = PIER + BAY, NB = 8;
    var PC = PIER + UK.CW / 2;                                   // corner piers carry an extra half-bat so every course closes on a legal closer
    var W = 2 * PC + NB * BAY + (NB - 1) * PIER, D = 2 * PC + 6 * BAY + 4 * PIER + 2.7;   // 24.4125 × 20.3625 (n.5 brick modules)
    var YG = UK.DPC, YM = YG + 60 * CH, Y1 = YM + 50 * CH;       // ground 0.15, mezzanine 4.65, floor 1 at 8.40
    var SILL = 2 * CH, HEAD = 35 * CH, ZTOP = 39 * CH;           // per floor: 2-course upstand, window head 2.625, soffit 2.925
    function FFL(n) { return Y1 + (n - 1) * FTF; }               // residential floor n (n = NF + 1 → roof slab)
    var ROOF = FFL(NF + 1), CROWN = ROOF + FTF, OVR = ROOF + 62 * CH;
    function lvY(s) { return s <= 0 ? YG : (s === 1 ? YM : FFL(s - 1)); }   // storey s: 0 ground, 1 mezzanine, n + 1 floor n
    function slabTh(s) { return s === 2 ? 0.375 : SLAB; }
    var WX0 = -3 * PITCH, WZ0 = -(5 * PITCH + PIER);             // amenity wing x ∈ [−8.775, 0], z ∈ [−15.525, 0]
    var CX0 = W / 2 - 4.5, CX1 = W / 2 + 4.5, CZ0 = -D / 2 - 3.375, CZ1 = -D / 2 + 3.375;   // core 9.0 × 6.75
    var PODIUM = 0x8a7a72, TOWER = 0xffffff;                    // brick-slip tints (podium in a darker brick)
    var PTS = [[0, 0], [W, 0], [W, -D], [0, -D]];
    var HC = 0.72;                                               // crane + temporary works struck after the roof
    var FR = 'upvcGrey', FWD = 0.06, G0 = 0.15, G1 = 0.22;       // window frames: dark aluminium, 150 mm reveal
    var GREENS = [0x3c6b35, 0x2f5a2c, 0x4b7a3c, 0x557f3f];
    function hsh(a, b, c) { var x = (a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 1013904223; x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16; return (x >>> 0) / 4294967296; }

    // ── façade runs (outer-face lines, same numbering as wallLoop: 0 front, 1 right, 2 back, 3 left) ──
    function mkRun(ax, az, bx, bz, out) { var L = Math.hypot(bx - ax, bz - az); return { ax: ax, az: az, bx: bx, bz: bz, L: L, out: out, tx: (bx - ax) / L, tz: (bz - az) / L }; }
    var RUNS = [mkRun(0, 0, W, 0, [0, 1]), mkRun(W, 0, W, -D, [1, 0]), mkRun(W, -D, 0, -D, [0, -1]), mkRun(0, -D, 0, 0, [-1, 0])];
    var WRUNS = [mkRun(WX0, 0, 0, 0, [0, 1]), mkRun(WX0, WZ0, WX0, 0, [-1, 0]), mkRun(0, WZ0, WX0, WZ0, [0, -1])];
    // axis-aligned box on a run: u0..u1 along the face, y0..y1, d0..d1 depth in from the outer face (negative = proud).
    // No yaw (sizes are swapped on X-facing runs) so the world-space brick-slip shader maps every face at true scale.
    function rbox(mat, r, u0, u1, y0, y1, d0, d1, o) {
      if (u1 - u0 < 1e-4 || y1 - y0 < 1e-4 || d1 - d0 < 1e-4) return null;
      var uc = (u0 + u1) / 2, dc = (d0 + d1) / 2, ax = Math.abs(r.tx) > 0.5;
      return K.box(mat, r.ax + r.tx * uc - r.out[0] * dc, (y0 + y1) / 2, r.az + r.tz * uc - r.out[1] * dc, ax ? u1 - u0 : d1 - d0, y1 - y0, ax ? d1 - d0 : u1 - u0, o);
    }
    function clad(r, u0, u1, y0, y1, tint, d0, d1) { return rbox('cladding', r, u0, u1, y0, y1, d0 == null ? 0 : d0, d1 == null ? WALL : d1, { color: tint == null ? TOWER : tint }); }
    function cl(x, y, z, sx, sy, sz, tint) { return K.box('cladding', x, y, z, sx, sy, sz, { color: tint == null ? TOWER : tint }); }
    function uniq(a) { a.sort(function (p, q) { return p - q; }); var o = []; a.forEach(function (v) { if (!o.length || v - o[o.length - 1] > 1e-6) o.push(v); }); return o; }
    // fill a wall between openings, zone by zone (zones split at every opening edge); matFn(yb, yt) → {mat, tint, d0, d1}
    function fillWall(r, uA, uB, ops, edges, matFn) {
      var lo = Math.min.apply(null, edges), hi = Math.max.apply(null, edges), e = edges.slice();
      ops.forEach(function (o) { [o.v0, o.v1].forEach(function (v) { if (v > lo && v < hi) e.push(v); }); });
      e = uniq(e);
      for (var i = 0; i < e.length - 1; i++) {
        var yb = e[i], yt = e[i + 1], m = matFn(yb, yt);
        if (!m) continue;
        H._courseSegments(uA, uB, yb, yt, ops, null).forEach(function (s) {
          if (s[1] - s[0] < 0.02) return;
          if (m.mat === 'cladding') clad(r, s[0], s[1], yb, yt, m.tint, m.d0, m.d1);
          else rbox(m.mat, r, s[0], s[1], yb, yt, m.d0 == null ? 0 : m.d0, m.d1 == null ? WALL : m.d1);
        });
      }
    }

    // ── typical-floor openings: front bays 1–2 and 5–6 are balcony doors, the rest floor-to-ceiling windows ──
    function bayU(j) { return PC + j * PITCH; }
    var BALC = [1, 2, 5, 6], SIDE_U = [0, 1, 2].map(bayU).concat([0, 1, 2].map(function (j) { return bayU(2) + BAY + 2.7 + j * PITCH; }));   // sides: 6 bays round a 2.7 m solid pier
    function floorOps(ri) {
      var L = [];
      if (ri % 2 === 0) for (var j = 0; j < NB; j++) { var door = ri === 0 && BALC.indexOf(j) >= 0; L.push({ u0: bayU(j), u1: bayU(j) + BAY, v0: door ? 0 : SILL, v1: HEAD, door: door, j: j }); }
      else SIDE_U.forEach(function (u, j) { L.push({ u0: u, u1: u + BAY, v0: SILL, v1: HEAD, door: false, j: j }); });
      return L;
    }
    function absOps(list, f) { return list.map(function (o) { return { u0: o.u0, u1: o.u1, v0: f + o.v0, v1: f + o.v1, door: o.door, j: o.j, type: 'void' }; }); }
    function trimA(ri) { return ri % 2 ? WALL : 0; }
    function trimB(ri, r) { return ri % 2 ? r.L - WALL : r.L; }

    // precast reconstituted-stone band over the edge of slab n — gold-anodised above and below the buyer's floor
    function band(n) {
      var y1 = FFL(n), gold = n === uf || n === uf + 1;
      RUNS.forEach(function (r, ri) { rbox(gold ? 'gold' : 'stone', r, ri % 2 ? WALL : -0.025, ri % 2 ? r.L - WALL : r.L + 0.025, y1 - SLAB, y1, -0.025, WALL); });
    }
    // a typical floor in brick-slip panels (brick + cavity + inner leaf depth so the reveals read correctly)
    function cladFloor(n) {
      var f = FFL(n);
      if (n >= 2) band(n);
      RUNS.forEach(function (r, ri) {
        fillWall(r, trimA(ri), trimB(ri, r), absOps(floorOps(ri), f), [f, f + SILL, f + HEAD, f + ZTOP], function () { return { mat: 'cladding', tint: TOWER }; });
      });
    }

    // ═══ STRUCTURE ═══
    var COLS = [];
    [PC / 2, bayU(2) - PIER / 2, W / 2, bayU(6) - PIER / 2, W - PC / 2].forEach(function (x) { COLS.push([x, -(WALL + 0.20), 0.60, 0.30], [x, -D + WALL + 0.20, 0.60, 0.30]); });
    [D / 2 - PITCH - 0.9, D / 2, D / 2 + PITCH + 0.9].forEach(function (u) { COLS.push([W - WALL - 0.20, -u, 0.30, 0.60], [WALL + 0.20, -u, 0.30, 0.60]); });
    [[4.2, -4.2], [W - 4.2, -4.2], [4.2, -D + 4.2], [W - 4.2, -D + 4.2]].forEach(function (c) { COLS.push([c[0], c[1], 0.45, 0.45]); });
    var WCOLS = [[WX0 + PITCH + PIER / 2, -(WALL + 0.2), 0.6, 0.3], [WX0 + 2 * PITCH + PIER / 2, -(WALL + 0.2), 0.6, 0.3],
      [WX0 + PITCH + PIER / 2, WZ0 + WALL + 0.2, 0.6, 0.3], [WX0 + 2 * PITCH + PIER / 2, WZ0 + WALL + 0.2, 0.6, 0.3],
      [WX0 + WALL + 0.2, WZ0 + 2 * PITCH + PIER / 2, 0.3, 0.6], [WX0 + WALL + 0.2, WZ0 + 3 * PITCH + PIER / 2, 0.3, 0.6], [WX0 / 2, WZ0 / 2, 0.45, 0.45]];
    var LX0 = bayU(3) - PIER / 2, LX1 = bayU(4) + BAY + PIER / 2;   // double-height lobby (bays 3–4)
    function columns(s) {
      var y0 = lvY(s), y1 = lvY(s + 1) - slabTh(s + 1);
      COLS.forEach(function (c) {
        var top = (s === 0 && c[0] > LX0 && c[0] < LX1 && c[1] > CZ1) ? YM : y1;     // runs through the open lobby
        K.box('concrete', c[0], (y0 + top) / 2, c[1], c[2], top - y0, c[3]);
      });
      if (s <= 1) WCOLS.forEach(function (c) { K.box('concrete', c[0], (y0 + y1) / 2, c[1], c[2], y1 - y0, c[3]); });
    }
    function core(s) {   // lift + stair core; storey NF + 2 is the lift overrun above the roof
      var y0 = lvY(s), y1 = s > NF + 1 ? OVR : lvY(s + 1), yc = (y0 + y1) / 2, h = y1 - y0, t = 0.30, zc = (CZ0 + CZ1) / 2, xm = W / 2 + 0.6;
      K.box('concrete', W / 2, yc, CZ1 - t / 2, CX1 - CX0, h, t);
      K.box('concrete', W / 2, yc, CZ0 + t / 2, CX1 - CX0, h, t);
      K.box('concrete', CX0 + t / 2, yc, zc, t, h, CZ1 - CZ0 - 2 * t);
      K.box('concrete', CX1 - t / 2, yc, zc, t, h, CZ1 - CZ0 - 2 * t);
      K.box('concrete', xm, yc, zc, 0.25, h, CZ1 - CZ0 - 2 * t);                                  // stair / lift wall
      K.box('concrete', (CX0 + t + xm - 0.125) / 2, yc, zc, xm - 0.125 - CX0 - t, h, 0.20);         // between the lift shafts
    }
    function slabAt(s) {
      var y = lvY(s), th = slabTh(s), x0 = WALL, x1 = W - WALL, z0 = -D + WALL, z1 = -WALL;
      if (s === 1) { K.slab(x0, z0, LX0, z1, y, th); K.slab(LX1, z0, x1, z1, y, th); K.slab(LX0, z0, LX1, CZ1, y, th); }
      else K.slab(x0, z0, x1, z1, y, th);
      if (s === 1 || s === 2) K.slab(WX0 + WALL, WZ0 + WALL, WALL, -WALL, y, th);
    }
    // edge protection (double guard rail + posts) on each new slab; struck in bands of five floors once they are clad
    var railBins = {};
    function rails(s) {
      if (s < 2) return;
      var y = lvY(s), e = WALL + 0.02, a0 = K.items.length;
      [0.5, 1.05].forEach(function (hy) {
        K.box('string', W / 2, y + hy, -e, W - 2 * e, 0.05, 0.05); K.box('string', W / 2, y + hy, -D + e, W - 2 * e, 0.05, 0.05);
        K.box('string', e, y + hy, -D / 2, 0.05, 0.05, D - 2 * e); K.box('string', W - e, y + hy, -D / 2, 0.05, 0.05, D - 2 * e);
      });
      [e, W / 3, 2 * W / 3, W - e].forEach(function (x) { [-e, -D + e].forEach(function (z) { K.box('scaffold', x, y + 0.55, z, 0.05, 1.1, 0.05); }); });
      [-D / 3, -2 * D / 3].forEach(function (z) { [e, W - e].forEach(function (x) { K.box('scaffold', x, y + 0.55, z, 0.05, 1.1, 0.05); }); });
      var bin = Math.floor((s - 2) / 5); railBins[bin] = (railBins[bin] || []).concat(K.items.slice(a0));
    }

    // ── climbing tower crane (flat-top, 50 m jib) behind the wing, tied to the tower as it climbs ──
    var CRX = -4.2, CRZ = -19.2, mastTop = 0, jibY = 0, jibs = [], JANG = [0.50, 0.80, 0.45, 0.62], FINALJ = Math.ceil((OVR + 9) / 3) * 3;
    var HCO = { hideAfter: HC };
    function mastTo(y) {
      var a = 0.9, C = [[-a, -a], [a, -a], [a, a], [-a, a]];
      while (mastTop < y - 1e-6) {
        var y0 = mastTop, h = 3.0;
        C.forEach(function (c) { K.box('string', CRX + c[0], y0 + h / 2, CRZ + c[1], 0.16, h, 0.16, HCO); });
        for (var i = 0; i < 4; i++) { var p = C[i], q = C[(i + 1) % 4]; K.beam('string', [CRX + p[0], y0 + 0.05, CRZ + p[1]], [CRX + q[0], y0 + h - 0.05, CRZ + q[1]], 0.07, 0.07, HCO); }
        mastTop += h;
      }
    }
    function jibGroup(y, ang) {
      var a0 = K.items.length, tx = Math.cos(ang), tz = Math.sin(ang), nx = -tz, nz = tx, ry = -ang;
      var P = function (s, sd, up) { return [CRX + tx * s + nx * sd, y + up, CRZ + tz * s + nz * sd]; };
      K.box('string', CRX, y + 0.4, CRZ, 2.4, 0.8, 2.4, { ry: ry });                                  // slewing unit
      var cb = P(0.6, 1.9, 0); K.box('garageDoor', cb[0], y + 0.1, cb[2], 1.8, 2.0, 1.4, { ry: ry }); // operator's cab
      var cg = P(1.52, 1.9, 0); K.box('curtain', cg[0], y + 0.3, cg[2], 0.04, 1.1, 1.2, { ry: ry });
      // jib: triangular lattice 1.4 wide, top chord tapering 1.6 → 0.8 m
      var L = 50, st = 3.125, hw = 0.7, hh = 1.6, b0 = 1.2, J = function (s, sd, up) { return P(b0 + s, sd, 0.8 + up); };
      var top = function (s) { return hh * (1 - 0.5 * s / L); };
      K.beam('string', J(0, -hw, 0), J(L, -hw, 0), 0.14, 0.14); K.beam('string', J(0, hw, 0), J(L, hw, 0), 0.14, 0.14);
      K.beam('string', J(0, 0, hh), J(L, 0, top(L)), 0.12, 0.12);
      for (var s = 0; s < L - 0.1; s += st) {
        var m = s + st / 2;
        [-hw, hw].forEach(function (sd) { K.beam('string', J(s, sd, 0), J(m, 0, top(m)), 0.06, 0.06); K.beam('string', J(m, 0, top(m)), J(s + st, sd, 0), 0.06, 0.06); });
        K.beam('string', J(s, -hw, 0), J(s, hw, 0), 0.06, 0.06);
      }
      // counter-jib with walkway, hoist winch and counterweights
      [-0.9, 0.9].forEach(function (sd) { K.beam('string', P(-1.2, sd, 0.9), P(-15, sd, 0.9), 0.30, 0.18); });
      for (var c = -2.5; c > -15; c -= 2.5) K.beam('string', P(c, -0.9, 0.9), P(c, 0.9, 0.9), 0.10, 0.10);
      var wk = P(-8.1, 0, 1.05); K.box('metal', wk[0], wk[1], wk[2], 13.8, 0.04, 1.5, { ry: ry });
      var wn = P(-6.5, 0, 1.6); K.box(FR, wn[0], wn[1], wn[2], 1.6, 1.0, 1.3, { ry: ry });
      for (var k = 0; k < 4; k++) { var cw = P(-13.0 - k * 0.42, 0, -0.4); K.box('concrete', cw[0], cw[1], cw[2], 0.38, 2.4, 2.0, { ry: ry }); }
      // trolley, hoist rope, hook block and a load (concrete skip) being lifted from the delivery bay
      var tp = P(b0 + 0.85 * L, 0, 0.5), hy = 3.2;
      K.box(FR, tp[0], tp[1], tp[2], 1.4, 0.4, 1.4, { ry: ry });
      K.beam('upvcBlack', [tp[0], tp[1] - 0.2, tp[2]], [tp[0], hy + 0.9, tp[2]], 0.035, 0.035);
      K.box('string', tp[0], hy + 0.55, tp[2], 0.42, 0.7, 0.30, { ry: ry });
      K.box('concrete', tp[0], hy - 0.75, tp[2], 1.3, 1.1, 1.3, { ry: ry });
      jibs.push(K.items.slice(a0));
    }
    function climb(y, tieY) {
      mastTo(y);
      if (tieY != null) [-0.6, 0.6].forEach(function (sd) { K.beam('string', [CRX + 0.9, tieY, CRZ + sd], [WALL + 0.3, tieY, CRZ + sd * 2.2], 0.16, 0.16, HCO); });
      jibGroup(y, JANG[jibs.length % JANG.length]);
      jibY = y;
    }
    function craneCheck(s) {
      var top = lvY(Math.min(s + 2, NF + 2)) + FTF;
      if (jibY < FINALJ && top + 6 > jibY) climb(Math.min(FINALJ, Math.ceil((top + 28) / 3) * 3), lvY(s + 1) - 1.0);
    }

    function struct(s) {
      K.stage('masonry');
      if (s === 0) core(0);
      core(s + 1);          // the core is slip-formed a storey ahead of the floor plates
      columns(s);
      slabAt(s + 1);
      rails(s + 1);
      craneCheck(s);
    }

    // ═══ PODIUM (ground + mezzanine) ═══
    var shop = function (u) { return [{ u0: u, u1: u + BAY, v0: 0.60, v1: 4.425, kind: 'shop' }, { u0: u, u1: u + BAY, v0: YM + SILL, v1: 7.725, kind: 'win' }]; };
    var lobby = function (u) { return [{ u0: u, u1: u + BAY, v0: YG, v1: 7.725, kind: 'lobby' }]; };
    var serv = function (u) { return [{ u0: u, u1: u + BAY, v0: YG, v1: 3.0, kind: 'service' }, { u0: u, u1: u + BAY, v0: YM + SILL, v1: 7.725, kind: 'win' }]; };
    var high = function (u) { return [{ u0: u, u1: u + BAY, v0: 1.50, v1: 3.825, kind: 'win' }, { u0: u, u1: u + BAY, v0: YM + SILL, v1: 7.725, kind: 'win' }]; };
    var PODS = (function () {
      var out = [], i, a;
      for (a = [], i = 0; i < NB; i++) a = a.concat(i === 3 || i === 4 ? lobby(bayU(i)) : shop(bayU(i)));
      out.push({ r: RUNS[0], uA: 0, uB: W, ops: a, tower: true });
      a = []; SIDE_U.forEach(function (u, j) { a = a.concat(j < 3 ? shop(u) : (j === 3 ? serv(u) : high(u))); });
      out.push({ r: RUNS[1], uA: WALL, uB: D - WALL, ops: a, tower: true });
      for (a = [], i = 0; i < NB; i++) a = a.concat([1, 5, 6].indexOf(i) >= 0 ? serv(bayU(i)) : high(bayU(i)));
      out.push({ r: RUNS[2], uA: 0, uB: W, ops: a, tower: true });
      out.push({ r: RUNS[3], uA: WALL, uB: D + WZ0, ops: serv(PC), tower: true });
      for (a = [], i = 0; i < 3; i++) a = a.concat(shop(PIER + i * PITCH));
      out.push({ r: WRUNS[0], uA: 0, uB: -WX0, ops: a });
      for (a = [], i = 0; i < 5; i++) a = a.concat(i >= 3 ? shop(PIER + i * PITCH) : high(PIER + i * PITCH));
      out.push({ r: WRUNS[1], uA: WALL, uB: -WZ0 - WALL, ops: a });
      out.push({ r: WRUNS[2], uA: 0, uB: -WX0, ops: serv(PIER).concat(high(PIER + PITCH)) });
      return out;
    })();
    function podiumFacade() {
      PODS.forEach(function (P) {
        fillWall(P.r, P.uA, P.uB, P.ops, [0, 0.6, 4.425, YM, 7.725, 8.025, Y1], function (yb, yt) {
          if (yt <= 0.6 + 1e-6) return { mat: 'stone', d0: -0.03 };                                       // stone plinth / stall risers
          if (yb >= 4.425 - 1e-6 && yt <= YM + 1e-6) return { mat: 'stone', d0: -0.025 };                 // mezzanine band
          if (yb >= 8.025 - 1e-6) return { mat: P.tower && uf === 1 ? 'gold' : 'stone', d0: -0.025 };     // podium cornice band
          return { mat: 'cladding', tint: PODIUM };
        });
      });
    }
    function wingParapet() {
      WRUNS.forEach(function (r, i) {
        var uA = i === 1 ? WALL : 0, uB = i === 1 ? r.L - WALL : r.L;
        clad(r, uA, uB, Y1, Y1 + 6 * CH, PODIUM);
        rbox('stone', r, uA, uB, Y1 + 6 * CH, Y1 + 7 * CH, -0.03, WALL + 0.02);
      });
    }

    // ═══ THE BUYER'S FLOOR: light-steel-frame (SFS) backing wall, then a real half-brick facing leaf laid course by course
    //     while the frame above keeps rising (the wallLoop hooks run the later frame / façade steps between courses) ═══
    var SFS = [{ mat: 'insulation', d0: 0.1525, d1: 0.2025 }, { mat: 'closer', d0: 0.2025, d1: 0.2145 }];   // 50 mm ventilated cavity, mineral wool, sheathing board
    var LINING = { mat: 'timberWhite', d0: 0.2895, d1: WALL };                                             // plasterboard (fit-out)
    function layer(f, openings, L) {
      RUNS.forEach(function (r, ri) {
        var uA = ri % 2 ? L.d1 : L.d0, uB = r.L - uA;
        fillWall(r, uA, uB, openings[ri], [f, f + SILL, f + HEAD, f + ZTOP], function () { return L; });
      });
    }
    function sfsFrame(f, openings) {   // 75 mm C-studs at 600 centres, jamb studs, head / sill / top / bottom tracks
      var d0 = 0.2145, d1 = 0.2895;
      RUNS.forEach(function (r, ri) {
        var ops = openings[ri], uA = ri % 2 ? d1 : d0, uB = r.L - uA, inOp = function (u) { return ops.some(function (o) { return u > o.u0 - 0.06 && u < o.u1 + 0.06; }); };
        for (var u = uA + 0.025; u < uB; u += 0.6) if (!inOp(u)) rbox('steel', r, u - 0.025, u + 0.025, f + 0.05, f + ZTOP - 0.05, d0, d1);
        ops.forEach(function (o) {
          [o.u0 - 0.05, o.u1].forEach(function (u) { rbox('steel', r, u, u + 0.05, f + 0.05, f + ZTOP - 0.05, d0, d1); });
          rbox('steel', r, o.u0, o.u1, o.v1, o.v1 + 0.05, d0, d1);
          if (o.v0 > f + 0.01) rbox('steel', r, o.u0, o.u1, o.v0 - 0.05, o.v0, d0, d1);
        });
        rbox('steel', r, uA, uB, f, f + 0.05, d0, d1); rbox('steel', r, uA, uB, f + ZTOP - 0.05, f + ZTOP, d0, d1);
      });
    }
    var userOpenings = {};
    var steps = [], si = 0, facStart = {};
    function userFacade() {
      var f = FFL(uf), openings = userOpenings;
      if (uf >= 2) band(uf);
      RUNS.forEach(function (r, ri) { openings[ri] = absOps(floorOps(ri), f); });
      sfsFrame(f, openings); SFS.forEach(function (L) { layer(f, openings, L); });
      var start = si, R = steps.length - si, NC = 39, hooks = [];
      for (var c = 0; c < NC; c++) (function (c) {
        hooks.push({ y: f + (c + 0.5) * CH, fn: function () { var end = start + Math.floor((c + 1) * R / NC); while (si < end) { steps[si++](); } K.stage('masonry'); } });
      })(c);
      K.wallLoop(PTS, { y0: f, y1: f + ZTOP, leaves: 'single', palette: 'red', openings: openings, hooks: hooks });
      K.stage('masonry');
      // stainless-steel lintel angles in the bed joint over every opening (bearing 100 mm each side)
      RUNS.forEach(function (r, ri) { openings[ri].forEach(function (o) { rbox('steel', r, o.u0 - 0.10, o.u1 + 0.10, o.v1, o.v1 + 0.008, 0.002, UK.BW); }); });
    }
    function facade(s) {
      K.stage('masonry');
      facStart[s - 1] = K.items.length;
      if (s === 0) return podiumFacade();
      if (s === 1) return wingParapet();
      if (s - 1 === uf) return userFacade();
      cladFloor(s - 1);
    }
    // crown: brick piers continue one storey above the roof as an open louvred screen with a deep stone coping band
    function crown() {
      K.stage('masonry');
      facStart[NF + 1] = K.items.length;
      band(NF + 1);
      RUNS.forEach(function (r, ri) {
        var ops = floorOps(ri).map(function (o) { return { u0: o.u0, u1: o.u1, v0: ROOF + 15 * CH, v1: ROOF + HEAD }; });
        fillWall(r, trimA(ri), trimB(ri, r), ops, [ROOF, ROOF + ZTOP], function () { return { mat: 'cladding', tint: TOWER }; });
        rbox('stone', r, ri % 2 ? WALL : -0.04, ri % 2 ? r.L - WALL : r.L + 0.04, ROOF + ZTOP, CROWN, -0.04, WALL + 0.10);
        rbox('metal', r, ri % 2 ? WALL : -0.05, ri % 2 ? r.L - WALL : r.L + 0.05, CROWN, CROWN + 0.02, -0.05, WALL + 0.12);   // coping flashing
      });
      K.slab(CX0, CZ0, CX1, CZ1, OVR + 0.25, 0.25);   // overrun roof
    }

    function meta() {
      return {
        name: 'Residential tower · floor ' + uf + ' of ' + NF,
        focus: { y0: FFL(uf) - SLAB - 0.02, y1: FFL(uf + 1) - SLAB + 0.02 },   // the user's own floor: what the deposit builds
        info: { storeys: NF + 2, floors: NF, floor: uf, floorLevel: FFL(uf), floorTop: FFL(uf) + ZTOP, frontage: W, depth: D, podium: Y1,
          roof: ROOF, eave: ROOF, crown: CROWN, ridge: CROWN, height: OVR + 0.25 }
      };
    }

    // ═══ CLEAN SHELL ═══
    // Everything the finished building shows from outside, and nothing else. The kit builds the buyer's floor bottom-up by height
    // (rows = its 75 mm courses) and the viewer draws every other part as a flat faint silhouette, so for those parts only the
    // solid outline matters: one cladding wall per run per floor with its stone slab-edge band, no openings, no fittings.
    if (K.clean) {
      K.stage('masonry');
      // podium (ground + mezzanine) and the amenity wing: solid walls with the stone plinth, mezzanine band and cornice
      PODS.forEach(function (P) {
        fillWall(P.r, P.uA, P.uB, [], [0, 0.6, 4.425, YM, 7.725, 8.025, Y1], function (yb, yt) {
          if (yt <= 0.6 + 1e-6) return { mat: 'stone', d0: -0.03 };
          if (yb >= 4.425 - 1e-6 && yt <= YM + 1e-6) return { mat: 'stone', d0: -0.025 };
          if (yb >= 8.025 - 1e-6) return { mat: P.tower && uf === 1 ? 'gold' : 'stone', d0: -0.025 };
          return { mat: 'cladding', tint: PODIUM };
        });
      });
      wingParapet();
      K.box('mortarDark', (WX0 + WALL) / 2, Y1 - 0.05, WZ0 / 2, -WX0 - WALL, 0.10, -WZ0 - 2 * WALL);   // wing roof deck (the garden's floor)
      K.box(FR, (LX0 + LX1) / 2, 4.62 - 0.15, 1.8, LX1 - LX0 + 0.6, 0.30, 3.6);                    // entrance canopy
      // typical floors: slab-edge band + one solid cladding wall per run; the buyer's floor is laid in real brick instead
      for (var fl = 1; fl <= NF; fl++) {
        var fy = FFL(fl);
        if (fl >= 2) band(fl);
        if (fl === uf) continue;
        RUNS.forEach(function (r, ri) { fillWall(r, trimA(ri), trimB(ri, r), [], [fy, fy + ZTOP], function () { return { mat: 'cladding', tint: TOWER }; }); });
      }
      // the buyer's floor: SFS-backed half-brick skin laid course by course, then frames, glass and the two front balconies
      var cf = FFL(uf), cops = {};
      RUNS.forEach(function (r, ri) { cops[ri] = absOps(floorOps(ri), cf); });
      K.wallLoop(PTS, { y0: cf, y1: cf + ZTOP, leaves: 'single', palette: 'red', openings: cops });
      K.stage('fitout');
      RUNS.forEach(function (r, ri) { cops[ri].forEach(function (o) { windowUnit(r, o, cf + 1.10, 1); }); });
      [[1, 2], [5, 6]].forEach(function (b) { balcony(bayU(b[0]) - PIER / 2, bayU(b[1]) + BAY + PIER / 2, cf, uf, true); });
      // crown (louvre openings kept: they shape the skyline), roof deck and the lift overrun as plain solids
      K.stage('masonry');
      band(NF + 1);
      RUNS.forEach(function (r, ri) {
        var ops = floorOps(ri).map(function (o) { return { u0: o.u0, u1: o.u1, v0: ROOF + 15 * CH, v1: ROOF + HEAD }; });
        fillWall(r, trimA(ri), trimB(ri, r), ops, [ROOF, ROOF + ZTOP], function () { return { mat: 'cladding', tint: TOWER }; });
        rbox('stone', r, ri % 2 ? WALL : -0.04, ri % 2 ? r.L - WALL : r.L + 0.04, ROOF + ZTOP, CROWN, -0.04, WALL + 0.10);
      });
      K.box('stone', W / 2, ROOF + 0.10, -D / 2, W - 2 * WALL, 0.20, D - 2 * WALL);
      K.box('stone', (CX0 + CX1) / 2, (ROOF + OVR + 0.25) / 2, (CZ0 + CZ1) / 2, CX1 - CX0, OVR + 0.25 - ROOF, CZ1 - CZ0);
      K.env(0, 0, -D, W, CROWN, 0); K.env(WX0, 0, WZ0, 0, Y1 + 7 * CH, 0); K.env(CX0, ROOF, CZ0, CX1, OVR + 0.25, CZ1);
      K.anchor('front', W / 2, 1.5, 0); K.anchor('top', W / 2, CROWN, -D / 2); K.anchor('ridge', W / 2, CROWN, -D / 2);
      K.anchor('myFloor', W / 2, cf + 1.5, 0.05);
      return meta();
    }

    // ═══ BUILD ═══
    // setting out + hoarding + welfare cabins
    K.stage('setout');
    var HX0 = WX0 - 3.6, HX1 = W + 4.6, HZ = 6.15, HZB = -D - 4.4, HO = { hideAfter: 0.80 };
    [[0, 0], [W, 0], [W, -D], [0, -D], [WX0, 0], [WX0, WZ0]].forEach(function (p) { K.box('timber', p[0], 0.2, p[1], 0.05, 0.40, 0.05, { hideAfter: 0.12 }); });
    K.box('string', W / 2, 0.3, 0.02, W + 0.6, 0.004, 0.004, { hideAfter: 0.12 }); K.box('string', W / 2, 0.3, -D - 0.02, W + 0.6, 0.004, 0.004, { hideAfter: 0.12 });
    K.box('string', -0.02, 0.3, -D / 2, 0.004, 0.004, D + 0.6, { hideAfter: 0.12 }); K.box('string', W + 0.02, 0.3, -D / 2, 0.004, 0.004, D + 0.6, { hideAfter: 0.12 });
    [[HX0, 16.6], [22.6, HX1]].forEach(function (s) { K.box('doorGreen', (s[0] + s[1]) / 2, 1.2, HZ, s[1] - s[0], 2.4, 0.05, HO); K.box('timberWhite', (s[0] + s[1]) / 2, 2.3, HZ + 0.03, s[1] - s[0], 0.18, 0.01, HO); });
    K.box('scaffold', 19.6, 1.1, HZ - 0.3, 5.9, 2.2, 0.04, HO);                                  // mesh site gates
    K.box('doorGreen', HX0, 1.2, (HZ + HZB) / 2, 0.05, 2.4, HZ - HZB, HO); K.box('doorGreen', HX1, 1.2, (HZ + HZB) / 2, 0.05, 2.4, HZ - HZB, HO);
    K.box('doorGreen', (HX0 + HX1) / 2, 1.2, HZB, HX1 - HX0, 2.4, 0.05, HO);
    [0, 1].forEach(function (k) { K.box('garageDoor', W + 2.6, 1.3 + k * 2.65, HZB + 3.6, 3.0, 2.6, 6.0, HO); K.box('curtain', W + 1.08, 1.5 + k * 2.65, HZB + 3.6, 0.04, 0.9, 4.2, HO); });

    // foundations: CFA piles (rig), piled raft, crane base, spoil heap
    K.stage('found');
    K.sph('soil', -9.5, 0.6, -23.0, 3.0, 1.4, 2.4, { hideAfter: 0.12 });
    K.box('concrete', CRX, -0.5, CRZ, 6.0, 1.2, 6.0, HO);
    var rigA = K.items.length;
    K.box('upvcBlack', 17.4, 0.45, -5.0, 0.8, 0.9, 5.0); K.box('upvcBlack', 20.0, 0.45, -5.0, 0.8, 0.9, 5.0);
    K.box('string', 18.7, 1.75, -5.4, 3.4, 1.6, 4.0); K.box('garageDoor', 17.6, 3.0, -4.6, 1.2, 1.1, 1.3);
    K.box('string', 18.7, 12.0, -2.9, 0.7, 21.0, 0.7); K.box('steel', 18.7, 6.0, -2.9 + 0.5, 0.3, 11.0, 0.3);
    COLS.concat(WCOLS, [[CX0, CZ0], [CX1, CZ0], [CX0, CZ1], [CX1, CZ1], [W / 2, CZ1], [W / 2, CZ0]]).forEach(function (c) { K.cyl('concrete', c[0], -0.125, c[1], 0.30, 0.95); });
    var pileItems = K.items.slice(rigA), raft = K.box('concrete', W / 2, -0.6, -D / 2, W + 1.2, 1.2, D + 1.2);
    K.box('concrete', WX0 / 2, -0.45, -0.3, -WX0, 0.9, 0.6); K.box('concrete', WX0 / 2, -0.45, WZ0 + 0.3, -WX0, 0.9, 0.6); K.box('concrete', WX0 + 0.3, -0.45, WZ0 / 2, 0.6, 0.9, -WZ0);

    // ground-floor slabs + crane erected
    K.stage('slab');
    K.slab(WALL, -D + WALL, W - WALL, -WALL, YG, 0.15);
    K.slab(WX0 + WALL, WZ0 + WALL, WALL, -WALL, YG, 0.15);
    K.box('dpc', W / 2, YG + 0.002, -WALL / 2, W, 0.004, WALL);
    climb(45, null);

    // frame + façade (façade three storeys behind the frame); the buyer's floor in real brick
    for (var s0 = 0; s0 <= NF + 1; s0++) (function (s) {
      steps.push(function () { struct(s); });
      if (s >= 3) steps.push(function () { facade(s - 3); });
    })(s0);
    for (var s1 = NF - 1; s1 <= NF + 1; s1++) (function (s) { steps.push(function () { facade(s); }); })(s1);
    steps.push(crown);
    while (si < steps.length) { steps[si++](); K.stage('masonry'); }

    // ═══ ROOF ═══
    var PL = ROOF + 0.20;   // top of the roof build-up
    K.stage('roofframe');
    // BMU track (two rails on plinths, 2.55 m in from the façade) and steel plant frames
    var TI = 2.55, tx0 = TI, tx1 = W - TI, tz0 = -D + TI, tz1 = -TI;
    [-0.3, 0.3].forEach(function (g) {
      K.box('steel', W / 2, PL + 0.22, tz1 + g, tx1 - tx0 + 0.6, 0.15, 0.10); K.box('steel', W / 2, PL + 0.22, tz0 + g, tx1 - tx0 + 0.6, 0.15, 0.10);
      K.box('steel', tx0 + g, PL + 0.22, -D / 2, 0.10, 0.15, tz1 - tz0 + 0.6); K.box('steel', tx1 + g, PL + 0.22, -D / 2, 0.10, 0.15, tz1 - tz0 + 0.6);
    });
    for (var px = tx0; px <= tx1 + 1e-6; px += (tx1 - tx0) / 6) [tz0, tz1].forEach(function (z) { K.box('concrete', px, PL + 0.07, z, 0.4, 0.14, 0.9); });
    for (var pz = tz0 + (tz1 - tz0) / 5; pz < tz1 - 0.1; pz += (tz1 - tz0) / 5) [tx0, tx1].forEach(function (x) { K.box('concrete', x, PL + 0.07, pz, 0.9, 0.14, 0.4); });
    [[5.3, -10.1, 3.4, 5.0], [19.0, -10.1, 3.2, 6.6], [12.15, -15.4, 9.0, 2.4]].forEach(function (p) {
      [-1, 1].forEach(function (sd) { K.box('steel', p[0] + sd * (p[2] / 2 - 0.2), PL + 0.12, p[1], 0.2, 0.25, p[3]); });
    });
    K.stage('roofcover');
    K.box('insulation', W / 2, ROOF + 0.075, -D / 2, W - 2 * WALL - 0.02, 0.15, D - 2 * WALL - 0.02);
    K.box('membrane', W / 2, ROOF + 0.155, -D / 2, W - 2 * WALL - 0.03, 0.01, D - 2 * WALL - 0.03);
    K.box('gravel', W / 2, ROOF + 0.18, -D / 2, W - 2 * WALL - 0.04, 0.04, D - 2 * WALL - 0.04);
    // crown louvres (raked blades between the piers)
    RUNS.forEach(function (r, ri) {
      var ax = ri % 2 === 0;
      floorOps(ri).forEach(function (o) {
        for (var y = ROOF + 15 * CH + 0.08; y < ROOF + HEAD - 0.05; y += 0.15) rbox('metal', r, o.u0, o.u1, y, y + 0.11, 0.12, 0.15, ax ? { rx: 0.7 } : { rz: 0.7 });
        rbox(FR, r, (o.u0 + o.u1) / 2 - 0.025, (o.u0 + o.u1) / 2 + 0.025, ROOF + 15 * CH, ROOF + HEAD, 0.10, 0.17);   // louvre mullion
      });
    });
    // plant: AHU, VRF condensers, booster tanks, generator flue
    K.box('metal', 5.3, PL + 1.35, -10.1, 3.0, 2.2, 4.8);
    [-1.2, 1.2].forEach(function (dz) { K.cyl('upvcBlack', 5.3, PL + 2.5, -10.1 + dz, 0.55, 0.12); });
    [-8.0, -10.1, -12.2].forEach(function (z) { [18.0, 20.0].forEach(function (x) { K.box('garageDoor', x, PL + 0.95, z, 1.2, 1.5, 1.0); K.cyl('upvcBlack', x, PL + 1.73, z, 0.38, 0.06); }); });
    [9.2, 15.1].forEach(function (x) { K.box('steel', x, PL + 1.35, -15.4, 3.2, 2.2, 2.2); });
    K.tube('metal', [3.6, PL, -6.0], [3.6, CROWN + 1.6, -6.0], 0.18); K.tube('metal', [4.2, PL, -6.0], [4.2, CROWN + 1.6, -6.0], 0.18);
    // BMU (building maintenance unit) parked on the front track, jib over the crown
    var bx = W / 2;
    K.box('garageDoor', bx, PL + 0.75, tz1, 2.8, 0.9, 2.2); K.box('concrete', bx, PL + 1.45, tz1 - 0.6, 2.2, 0.5, 0.9);
    K.box('garageDoor', bx, PL + 3.3, tz1, 0.6, 4.2, 0.6);
    K.box('garageDoor', bx, PL + 5.55, (tz1 + 1.3) / 2, 0.45, 0.45, 1.3 - tz1 + 0.6);
    K.box('garageDoor', bx, PL + 5.35, 1.25, 3.4, 0.25, 0.35);
    // overrun: roof access door, PV array, aircraft-warning lights, lightning finials
    K.box('metal', CX0 + 1.6, ROOF + 1.15, CZ1 + 0.03, 1.0, 2.1, 0.06);
    for (var pv = 0; pv < 4; pv++) [-1, 1].forEach(function (sd) { K.box('curtain', CX0 + 1.4 + pv * 2.05, OVR + 0.55, (CZ0 + CZ1) / 2 + sd * 1.4, 1.95, 0.04, 1.0, { rx: -0.3 }); });
    [[CX0 + 0.2, CZ0 + 0.2], [CX1 - 0.2, CZ0 + 0.2], [CX0 + 0.2, CZ1 - 0.2], [CX1 - 0.2, CZ1 - 0.2]].forEach(function (c) { K.sph('doorRed', c[0], OVR + 0.38, c[1], 0.12, 0.12, 0.12); K.tube('metal', [c[0], OVR + 0.25, c[1]], [c[0], OVR + 0.28, c[1]], 0.06); });
    K.tube('metal', [W / 2, OVR + 0.25, CZ1 - 0.6], [W / 2, OVR + 3.0, CZ1 - 0.6], 0.04);
    [[0.2, -0.2], [W - 0.2, -0.2], [0.2, -D + 0.2], [W - 0.2, -D + 0.2]].forEach(function (c) { K.tube('metal', [c[0], CROWN, c[1]], [c[0], CROWN + 1.2, c[1]], 0.015); });

    // ═══ FIT-OUT ═══
    function frameSet(r, o, noGlass) {   // perimeter frame + glass sheet, set back in a 150 mm reveal
      rbox(FR, r, o.u0, o.u1, o.v1 - FWD, o.v1, G0, G1); rbox(FR, r, o.u0, o.u1, o.v0, o.v0 + FWD, G0, G1);
      rbox(FR, r, o.u0, o.u0 + FWD, o.v0 + FWD, o.v1 - FWD, G0, G1); rbox(FR, r, o.u1 - FWD, o.u1, o.v0 + FWD, o.v1 - FWD, G0, G1);
      if (!noGlass) rbox('glass', r, o.u0 + FWD, o.u1 - FWD, o.v0 + FWD, o.v1 - FWD, 0.178, 0.196);
    }
    function mull(r, u, y0, y1, w, mat) { rbox(mat || FR, r, u - (w || 0.06) / 2, u + (w || 0.06) / 2, y0, y1, G0, G1); }
    function tran(r, u0, u1, y, w) { rbox(FR, r, u0, u1, y - (w || 0.06) / 2, y + (w || 0.06) / 2, G0, G1); }
    function cill(r, o) { rbox(FR, r, o.u0 - 0.03, o.u1 + 0.03, o.v0 - 0.035, o.v0 + 0.005, -0.045, G0); }
    function windowUnit(r, o, guardY, seed) {
      frameSet(r, o);
      var w = o.u1 - o.u0;
      if (o.door) {   // two-panel sliding door onto the balcony
        mull(r, o.u0 + w / 2, o.v0 + FWD, o.v1 - FWD, 0.09);
        rbox('metal', r, o.u0 + w / 2 - 0.17, o.u0 + w / 2 - 0.14, o.v0 + 0.95, o.v0 + 1.25, G0 - 0.03, G0);
        return;
      }
      mull(r, o.u0 + w * 0.6, o.v0 + FWD, o.v1 - FWD);                                 // fixed light + opening vent
      if (guardY > o.v0 + 0.3 && guardY < o.v1 - 0.3) tran(r, o.u0 + FWD, o.u1 - FWD, guardY);   // 1.1 m guarding transom
      cill(r, o);
      if (seed < 0.30) { var top = o.v1 - 0.08, bh = 0.35 + seed * 4.5; rbox('timberWhite', r, o.u0 + 0.10, o.u1 - 0.10, top - bh, top, 0.32, 0.335); }   // roller blind
    }
    function interiorWalls(f) {   // corridor ring round the core + flat party walls (what you see through the glass)
      var y = f + ZTOP / 2, h = ZTOP, In = 6.0, t = 0.10;
      K.box('render', W / 2, y, -In, W - 2 * WALL, h, t); K.box('render', W / 2, y, -D + In, W - 2 * WALL, h, t);
      K.box('render', In, y, -D / 2, t, h, D - 2 * In); K.box('render', W - In, y, -D / 2, t, h, D - 2 * In);
      K.box('render', W / 2, y, -(WALL + In) / 2, t, h, In - WALL); K.box('render', W / 2, y, -D + (WALL + In) / 2, t, h, In - WALL);
      K.box('render', (WALL + In) / 2, y, -D / 2, In - WALL, h, t); K.box('render', W - (WALL + In) / 2, y, -D / 2, In - WALL, h, t);
    }
    function balcony(x0, x1, f, n, user) {   // precast deck on thermal-break connectors, hung from the slab edge above
      var d = 1.60, zf = 0.025, xc = (x0 + x1) / 2, w = x1 - x0, RM = user ? 'gold' : 'metal', EM = user ? 'gold' : FR;
      K.box(K.clean ? 'stone' : 'concrete', xc, f - 0.15, zf + d / 2, w, 0.20, d);
      K.box('paving', xc, f - 0.04, zf + d / 2 - 0.02, w - 0.10, 0.02, d - 0.12);
      K.box(EM, xc, f - 0.14, zf + d + 0.02, w + 0.02, 0.26, 0.04);
      [x0 + 0.02, x1 - 0.02].forEach(function (x) { K.box(EM, x, f - 0.14, zf + d / 2, 0.04, 0.26, d); });
      K.box('glass', xc, f + 0.51, zf + d - 0.03, w - 0.08, 1.08, 0.02);
      [x0 + 0.05, x1 - 0.05].forEach(function (x) { K.box('glass', x, f + 0.51, zf + d / 2 + 0.05, 0.02, 1.08, d - 0.14); });
      K.box(RM, xc, f + 1.07, zf + d - 0.03, w - 0.06, 0.04, 0.05);
      [x0 + 0.05, x1 - 0.05].forEach(function (x) { K.box(RM, x, f + 1.07, zf + d / 2 + 0.05, 0.05, 0.04, d - 0.14); });
      var yTop = FFL(n + 1) - 0.12;
      [x0 + 0.12, x1 - 0.12].forEach(function (x) { K.tube('steel', [x, f - 0.06, zf + d - 0.08], [x, yTop, 0.03], 0.016); });
    }
    function furnish(f) {   // the buyer's two front flats: oak floor, living, dining, kitchen, bedroom, warm pendants; balcony set
      K.box('timber', W / 2, f + 0.012, -(WALL + 6.0) / 2, W - 2 * WALL, 0.024, 6.0 - WALL - 0.06);
      layer(f, userOpenings, LINING);
      [0, 1].forEach(function (m) {
        var X = function (x) { x += PC - PIER; return m ? W - x : x; };
        var b = function (mat, x, y, z, sx, sy, sz, o) { K.box(mat, X(x), f + y, z, sx, sy, sz, o); };
        b('render', 3.375, ZTOP / 2, -3.15, 0.10, ZTOP, 5.7);                                                   // bedroom wall
        b('timberWhite', 1.95, 0.20, -4.95, 1.65, 0.36, 2.0); b('insulation', 1.95, 0.42, -4.75, 1.6, 0.10, 1.55);     // bed + duvet
        b('doorGrey', 1.95, 0.65, -5.92, 1.75, 1.0, 0.08); b('timberWhite', 1.6, 0.43, -5.7, 0.5, 0.08, 0.3); b('timberWhite', 2.3, 0.43, -5.7, 0.5, 0.08, 0.3);
        b('insulation', 6.3, 0.03, -3.3, 2.6, 0.01, 1.9);                                                        // rug
        b('doorGrey', 6.3, 0.22, -4.55, 2.4, 0.44, 0.95); b('doorGrey', 6.3, 0.62, -4.95, 2.4, 0.40, 0.22);       // sofa
        b('doorGrey', 5.0, 0.32, -4.55, 0.2, 0.64, 0.95); b('doorGrey', 7.6, 0.32, -4.55, 0.2, 0.64, 0.95);
        b('timber', 6.3, 0.40, -3.2, 1.1, 0.05, 0.6); b('upvcBlack', 6.3, 0.19, -3.2, 0.9, 0.36, 0.4);         // coffee table
        b('doorBlue', 4.4, 0.40, -2.2, 0.8, 0.80, 0.8);                                                          // armchair
        K.tube('upvcBlack', [X(7.95), f, -5.2], [X(7.95), f + 1.45, -5.2], 0.015); K.sph('gold', X(7.95), f + 1.55, -5.2, 0.2, 0.16, 0.2);
        b('timber', 10.6, 0.75, -2.6, 1.6, 0.05, 0.9); b('timber', 10.0, 0.37, -2.6, 0.06, 0.72, 0.7); b('timber', 11.2, 0.37, -2.6, 0.06, 0.72, 0.7);
        [[10.15, -2.0], [11.05, -2.0], [10.15, -3.2], [11.05, -3.2]].forEach(function (c) { b('upvcBlack', c[0], 0.45, c[1], 0.44, 0.05, 0.44); b('upvcBlack', c[0], 0.68, c[1] + (c[1] > -2.6 ? 0.2 : -0.2), 0.44, 0.45, 0.04); });
        [10.2, 11.0].forEach(function (x) { K.tube('upvcBlack', [X(x), f + ZTOP, -2.6], [X(x), f + 1.75, -2.6], 0.006); K.sph('gold', X(x), f + 1.66, -2.6, 0.15, 0.12, 0.15); });
        b('timberWhite', 9.6, 0.45, -5.65, 3.0, 0.90, 0.6); b('stone', 9.6, 0.92, -5.65, 3.04, 0.04, 0.64);    // kitchen run
        b('timberWhite', 11.6, 1.15, -5.65, 0.9, 2.3, 0.6); b('timberWhite', 9.6, 1.95, -5.78, 3.0, 0.7, 0.35);
        b('doorGreen', 9.6, 0.45, -4.3, 1.8, 0.90, 0.9); b('stone', 9.6, 0.92, -4.3, 1.9, 0.04, 0.95);           // island
        K.cyl('terracotta', X(8.4), f + 0.22, -1.0, 0.22, 0.44); K.sph('plant', X(8.4), f + 0.85, -1.0, 0.38, 0.45, 0.38, { color: GREENS[1] });
        b('timber', 6.3, 0.72, 0.85, 0.7, 0.03, 0.7); b('metal', 6.3, 0.36, 0.85, 0.05, 0.70, 0.05);               // balcony bistro set
        b('upvcBlack', 5.7, 0.45, 0.85, 0.42, 0.05, 0.42); b('upvcBlack', 6.9, 0.45, 0.85, 0.42, 0.05, 0.42);
        b(FR, 8.5, 0.30, 1.25, 0.9, 0.55, 0.4); K.sph('plant', X(8.5), f + 0.75, 1.25, 0.45, 0.28, 0.2, { color: GREENS[2] });
      });
    }
    function floorFit(n) {
      var f = FFL(n), user = n === uf;
      interiorWalls(f);
      RUNS.forEach(function (r, ri) {
        absOps(floorOps(ri), f).forEach(function (o) {
          windowUnit(r, o, f + 1.10, user ? 1 : hsh(n, ri, o.j));
          if (user) rbox('gold', r, o.u0 + 0.12, o.u1 - 0.12, f + ZTOP - 0.05, f + ZTOP - 0.01, 0.33, 0.70);   // warm LED cove at the ceiling
        });
      });
      [[1, 2], [5, 6]].forEach(function (b) { balcony(bayU(b[0]) - PIER / 2, bayU(b[1]) + BAY + PIER / 2, f, n, user); });   // the buyer's balconies get gold rails + edges
      if (user) furnish(f);
    }
    function podiumFit() {
      PODS.forEach(function (P) {
        var r = P.r;
        P.ops.forEach(function (o, k) {
          var w = o.u1 - o.u0;
          if (o.kind === 'win') return windowUnit(r, o, o.v0 > YM ? YM + 1.10 : -1, 0.5 + 0.5 * hsh(k, 7, 3));
          if (o.kind === 'shop') {        // shopfront: stall riser, big pane, transom light, signage fascia with lettering
            var g = { u0: o.u0, u1: o.u1, v0: o.v0, v1: 3.825 };
            frameSet(r, g); tran(r, o.u0 + FWD, o.u1 - FWD, 3.0); cill(r, g);
            rbox('upvcBlack', r, o.u0, o.u1, 3.825, 4.425, 0.06, 0.16);
            rbox('gold', r, o.u0 + w * 0.18, o.u1 - w * 0.18, 4.03, 4.22, 0.04, 0.06);
            return;
          }
          if (o.kind === 'lobby') {       // double-height curtain wall with automatic sliding doors at ground level
            frameSet(r, o);
            [1 / 3, 2 / 3].forEach(function (q) { mull(r, o.u0 + w * q, o.v0 + FWD, o.v1 - FWD, 0.07); });
            [2.475, 4.425, 6.075].forEach(function (y) { tran(r, o.u0 + FWD, o.u1 - FWD, y, 0.07); });
            var d0 = o.u0 + w / 3, d1 = o.u0 + 2 * w / 3;
            rbox('metal', r, d0 - 0.03, d0 + 0.02, YG, 2.44, 0.09, G0); rbox('metal', r, d1 - 0.02, d1 + 0.03, YG, 2.44, 0.09, G0);
            rbox('metal', r, d0, d1, YG + 1.0, YG + 1.04, 0.07, 0.09);
            rbox('upvcBlack', r, d0 - 0.4, d1 + 0.4, YG, YG + 0.012, -1.2, 0.0);      // entrance matwell
            return;
          }
          // service doors: louvred steel pairs (refuse, substation, cycle store)
          rbox('metal', r, o.u0 + 0.04, o.u1 - 0.04, o.v0, o.v1 - 0.06, 0.12, 0.16);
          for (var y = o.v0 + 0.35; y < o.v1 - 0.25; y += 0.16) rbox(FR, r, o.u0 + 0.14, o.u1 - 0.14, y, y + 0.035, 0.10, 0.12);
          mull(r, (o.u0 + o.u1) / 2, o.v0, o.v1 - 0.06, 0.04, 'upvcBlack'); rbox(FR, r, o.u0, o.u1, o.v1 - 0.06, o.v1, 0.08, 0.16);
        });
      });
      // entrance canopy: cantilevered steel blade with a bronze soffit, tie rods to the façade, gold name plate
      var cx0 = LX0 - 0.3, cx1 = LX1 + 0.3, cd = 3.6, cy = 4.62;
      K.box(FR, (cx0 + cx1) / 2, cy - 0.15, cd / 2, cx1 - cx0, 0.30, cd);
      K.box('gold', (cx0 + cx1) / 2, cy - 0.31, cd / 2 + 0.02, cx1 - cx0 - 0.2, 0.02, cd - 0.2);
      [cx0 + 0.4, cx1 - 0.4].forEach(function (x) { K.tube('steel', [x, cy, cd - 0.3], [x, 7.6, 0.03], 0.03); });
      K.box('gold', (cx0 + cx1) / 2, cy - 0.15, cd + 0.012, 3.0, 0.16, 0.02);
      // lobby: stone floor, timber-lined core wall with lift doors, reception, seating, pendants, feature tree
      K.box('stone', (LX0 + LX1) / 2, YG + 0.01, (CZ1 - WALL) / 2, LX1 - LX0, 0.02, -CZ1 - WALL);
      K.box('timber', (LX0 + LX1) / 2, (YG + 7.9) / 2, CZ1 + 0.03, LX1 - LX0, 7.9 - YG, 0.06);
      [10.2, 11.6].forEach(function (x) { K.box('metal', x, YG + 1.15, CZ1 + 0.07, 1.1, 2.3, 0.03); });
      K.box('timber', 13.6, YG + 0.55, -4.0, 2.4, 1.1, 0.7); K.box('stone', 13.6, YG + 1.12, -4.0, 2.5, 0.04, 0.8);
      [[10.6, -2.3], [10.6, -3.9]].forEach(function (c, i) { K.box('doorGrey', c[0], YG + 0.22, c[1], 1.9, 0.44, 0.85); K.box('doorGrey', c[0], YG + 0.6, c[1] + (i ? -0.32 : 0.32), 1.9, 0.4, 0.2); });
      [10.4, 12.15, 13.9].forEach(function (x) { K.tube('upvcBlack', [x, 8.02, -3.0], [x, 6.2, -3.0], 0.008); K.sph('gold', x, 6.0, -3.0, 0.32, 0.24, 0.32); });
      K.cyl('upvcBlack', 14.4, YG + 0.35, -1.4, 0.45, 0.7); K.sph('plant', 14.4, YG + 1.6, -1.4, 0.75, 0.9, 0.75, { color: GREENS[0] });
      // café (wing ground floor) and gym (wing mezzanine) behind the glass; retail shelving in the tower shops
      K.box('timber', -4.4, YG + 0.5, -6.2, 4.5, 1.0, 0.7); K.box('stone', -4.4, YG + 1.02, -6.2, 4.6, 0.04, 0.8);
      [-7.0, -4.4, -1.8].forEach(function (x) { K.cyl('timberWhite', x, YG + 0.74, -2.2, 0.36, 0.03); K.cyl('upvcBlack', x, YG + 0.37, -2.2, 0.03, 0.72); });
      [-7.3, -5.4, -3.5, -1.6].forEach(function (x) { K.box('upvcBlack', x, YM + 0.6, -2.4, 0.8, 1.2, 1.9); });
      [[0, 1, 2], [5, 6, 7]].forEach(function (g) { g.forEach(function (j) { K.box('timberWhite', bayU(j) + BAY / 2, YG + 0.9, -3.4, 1.6, 1.8, 0.45); }); });
      // roof garden balustrade on the wing parapet
      WRUNS.forEach(function (r, i) {
        var uA = i === 1 ? WALL : 0, uB = i === 1 ? r.L - WALL : r.L, yb = Y1 + 7 * CH;
        rbox('glass', r, uA + 0.05, uB - 0.05, yb, yb + 0.68, 0.14, 0.16);
        rbox('metal', r, uA + 0.02, uB - 0.02, yb + 0.68, yb + 0.72, 0.12, 0.18);
      });
    }

    K.stage('fitout');
    podiumFit();
    for (var fn = 1; fn <= NF; fn++) { K.stage('fitout'); floorFit(fn); }

    // ═══ EXTERNAL WORKS ═══
    K.stage('external');
    function treeAt(x, y, z, h, k) {
      K.cyl('bark', x, y + h * 0.3, z, 0.06 + h * 0.012, h * 0.6);
      for (var i = 0; i < 5; i++) { var a = i * 1.26 + k, rr = h * 0.13; K.sph('plant', x + Math.cos(a) * rr, y + h * (0.62 + 0.07 * (i % 3)), z + Math.sin(a) * rr, h * 0.2, h * 0.17, h * 0.2, { color: GREENS[(i + k) % 4] }); }
    }
    function bench(x, y, z, alongX) {
      K.box('timber', x, y + 0.45, z, alongX ? 1.8 : 0.5, 0.06, alongX ? 0.5 : 1.8);
      [-0.7, 0.7].forEach(function (d) { K.box(FR, alongX ? x + d : x, y + 0.21, alongX ? z : z + d, alongX ? 0.06 : 0.45, 0.42, alongX ? 0.45 : 0.06); });
    }
    function slabs(x0, z0, x1, z1) {   // 1200 × 600 paving slabs, stretcher laid
      for (var z = z0, row = 0; z < z1 - 0.01; z += 0.6, row++) for (var x = x0 - (row % 2 ? 0.6 : 0); x < x1 - 0.01; x += 1.2) {
        var a = Math.max(x0, x), b = Math.min(x1, x + 1.2), zz = Math.min(z1, z + 0.6);
        if (b - a > 0.05) K.box('paving', (a + b) / 2, 0.02, (z + zz) / 2, b - a - 0.008, 0.04, zz - z - 0.008);
      }
    }
    var FX0 = WX0 - 3.0, FX1 = W + 4.2;
    slabs(FX0, 0, FX1, 6.3);
    slabs(W, -D - 4.0, FX1, 0);
    K.box('paving', (FX0 + W) / 2, 0.02, -D - 2.0, W - FX0, 0.04, 4.0);
    K.box('paving', (FX0 + WX0) / 2, 0.02, (-D + WZ0) / 2 - 0.0, WX0 - FX0, 0.04, D);
    K.box('paving', WX0 / 2, 0.02, (-D + WZ0) / 2, -WX0, 0.04, D + WZ0);
    // street: granite kerbs, asphalt carriageway with centre line and double yellow lines, far footway
    var SX0 = -30, SX1 = 50;
    K.box('stone', (SX0 + SX1) / 2, 0.06, 6.375, SX1 - SX0, 0.125, 0.15);
    K.box('membrane', (SX0 + SX1) / 2, 0.006, 10.05, SX1 - SX0, 0.012, 7.2);
    for (var lx = SX0 + 1; lx < SX1 - 3; lx += 6) K.box('timberWhite', lx + 1.5, 0.014, 10.05, 3.0, 0.004, 0.10);
    [6.62, 6.76].forEach(function (z) { K.box('string', (SX0 + SX1) / 2, 0.014, z, SX1 - SX0, 0.004, 0.05); });
    K.box('stone', (SX0 + SX1) / 2, 0.06, 13.725, SX1 - SX0, 0.125, 0.15);
    K.box('paving', (SX0 + SX1) / 2, 0.04, 15.3, SX1 - SX0, 0.08, 3.0);
    // brick planters with trees, benches, bollards, lamps, cycle stands, bins, café terrace
    [[-10.2, 4.7], [2.0, 4.7], [18.2, 4.7], [26.3, 4.7]].forEach(function (p, i) {
      cl(p[0], 0.25, p[1], 1.8, 0.5, 1.8, PODIUM); K.box('soil', p[0], 0.51, p[1], 1.6, 0.02, 1.6);
      treeAt(p[0], 0.5, p[1], 6.5 + (i % 2), i);
    });
    bench(5.4, 0, 4.8, true); bench(22.3, 0, 4.8, true);
    for (var bo = LX0; bo <= LX1 + 0.01; bo += (LX1 - LX0) / 5) K.cyl('upvcBlack', bo, 0.45, 5.9, 0.1, 0.9);
    [-6.0, 7.6, 20.5].forEach(function (x) { K.tube(FR, [x, 0, 5.95], [x, 6.0, 5.95], 0.07); K.box(FR, x, 6.0, 6.45, 0.18, 0.08, 1.1); K.box('gold', x, 5.95, 6.85, 0.14, 0.02, 0.4); });
    for (var cz = -1.5; cz > -9.0; cz -= 1.0) { K.tube('steel', [W + 1.6, 0, cz], [W + 1.6, 0.75, cz], 0.024); K.tube('steel', [W + 2.3, 0, cz], [W + 2.3, 0.75, cz], 0.024); K.tube('steel', [W + 1.6, 0.75, cz], [W + 2.3, 0.75, cz], 0.024); }
    [[8.2, 5.5], [16.4, 5.5]].forEach(function (b) { K.cyl('upvcBlack', b[0], 0.45, b[1], 0.25, 0.9); });
    [-7.3, -4.4, -1.5].forEach(function (x, i) {
      K.cyl('metal', x, 0.74, 1.7, 0.36, 0.03); K.cyl('upvcBlack', x, 0.37, 1.7, 0.03, 0.72);
      [-0.65, 0.65].forEach(function (d) { K.box('upvcBlack', x + d, 0.45, 1.7, 0.42, 0.05, 0.42); K.box('upvcBlack', x + d * 1.3, 0.68, 1.7, 0.04, 0.45, 0.42); });
      if (i !== 1) { K.cyl(FR, x, 1.25, 1.7, 0.025, 2.5); K.sph('timberWhite', x, 2.45, 1.7, 1.35, 0.22, 1.35); }
    });
    // residents' roof garden on the wing: timber deck, brick planters, trees, pergola, benches
    var gy = Y1 + 0.12;
    K.box('timber', WX0 / 2 + 0.0, Y1 + 0.06, WZ0 / 2, -WX0 - 2 * WALL, 0.12, -WZ0 - 2 * WALL);
    cl(WX0 + WALL + 0.55, gy + 0.3, WZ0 / 2, 1.0, 0.6, -WZ0 - 2 * WALL - 1.2, PODIUM); K.box('soil', WX0 + WALL + 0.55, gy + 0.61, WZ0 / 2, 0.85, 0.02, -WZ0 - 2 * WALL - 1.4);
    [-12.0, -9.0, -6.0, -3.0].forEach(function (z, i) { K.sph('plant', WX0 + WALL + 0.55, gy + 0.85, z, 0.42, 0.32, 0.6, { color: GREENS[i % 4] }); });
    treeAt(WX0 + WALL + 0.55, gy + 0.6, -13.2, 3.8, 2); treeAt(WX0 + WALL + 0.55, gy + 0.6, -1.8, 3.4, 3);
    [[-5.2, -11.0], [-1.6, -11.0], [-5.2, -7.0], [-1.6, -7.0]].forEach(function (c) { K.box('timber', c[0], gy + 1.3, c[1], 0.12, 2.6, 0.12); });
    [-11.0, -7.0].forEach(function (z) { K.box('timber', -3.4, gy + 2.62, z, 4.0, 0.2, 0.08); });
    for (var pg = -10.8; pg <= -7.1; pg += 0.6) K.box('timber', -3.4, gy + 2.76, pg, 4.2, 0.08, 0.06);
    K.box('timber', -3.4, gy + 0.74, -9.0, 2.2, 0.05, 0.9); bench(-3.4, gy, -10.2, true); bench(-3.4, gy, -7.8, true);
    bench(-2.0, gy, -3.0, false);

    // ═══ SNAGGING: façade clean from the BMU cradle ═══
    K.stage('snag');
    var cyY = FFL(21) + 1.2, cz0 = 0.85;
    K.box('metal', bx, cyY, cz0, 3.6, 0.10, 0.75); K.box('string', bx, cyY + 0.55, cz0 + 0.36, 3.6, 0.05, 0.04); K.box('string', bx, cyY + 1.05, cz0 + 0.36, 3.6, 0.05, 0.04);
    [-1.78, 1.78].forEach(function (d) { K.box('string', bx + d, cyY + 0.55, cz0, 0.06, 1.1, 0.75); K.tube('upvcBlack', [bx + d * 0.9, cyY + 1.1, cz0], [bx + d * 0.45, PL + 5.25, 1.25], 0.012); });

    // ═══ temporary works: each crane position hides when the crane climbs; edge protection when its floors are clad ═══
    var cnt = {}, idx = new Array(K.items.length), SB = {};
    K.items.forEach(function (it, i) { var c = cnt[it.st] || 0; idx[i] = c; cnt[it.st] = c + 1; });
    H.STAGES.forEach(function (st) { SB[st.key] = st; });
    function tOf(it) { var st = SB[it.st], n = cnt[it.st], i = idx[it.seq]; return Math.fround(st.t0 + (st.t1 - st.t0) * (n > 1 ? i / (n - 1) : 1) * 0.999 + 1e-6); }
    function hideAt(items, h) { items.forEach(function (it) { it.h = h; }); }
    jibs.forEach(function (g, k) { hideAt(g, k + 1 < jibs.length ? tOf(jibs[k + 1][0]) : HC); });
    hideAt(pileItems, tOf(raft));
    Object.keys(railBins).forEach(function (b) { var ne = Math.min(5 * (+b) + 5, NF + 1); hideAt(railBins[b], tOf(K.items[facStart[ne]])); });

    // ── neighbours (always-ghost context): a six-storey mansion block across the side street, a four-storey block to the left ──
    K.ghost(function () {
      [[W + 7.5, W + 26, -19, -1.5, 6 * 3.0 + 0.6], [WX0 - 21, WX0 - 5.5, -17, -1.5, 4 * 3.0 + 0.6]].forEach(function (g) {
        K.box('brick', (g[0] + g[1]) / 2, g[4] / 2, (g[2] + g[3]) / 2, g[1] - g[0], g[4], g[3] - g[2]);
        for (var y = 3.0; y < g[4] - 0.5; y += 3.0) K.box('stone', (g[0] + g[1]) / 2, y, g[3] + 0.02, g[1] - g[0], 0.15, 0.06);
      });
    });

    // ── blueprint silhouette, anchors ──
    K.env(0, 0, -D, W, CROWN, 0); K.env(WX0, 0, WZ0, 0, Y1 + 7 * CH, 0); K.env(CX0, ROOF, CZ0, CX1, OVR + 0.25, CZ1);
    K.anchor('front', W / 2, 1.5, 0); K.anchor('top', W / 2, CROWN, -D / 2); K.anchor('ridge', W / 2, CROWN, -D / 2);
    K.anchor('myFloor', W / 2, FFL(uf) + 1.5, 0.05);
    return meta();
  };
})(HB3D);
