// Small flat — a 10-storey brick-faced residential block (UK, 2010s–2020s), 18.000 × 12.150 on the 225 mm brick module.
// Structure: bored piles + ground beams, reinforced-concrete frame (300 × 300 columns, stair/lift core, 225 mm flat slabs,
// floor-to-floor 3.000 = 40 courses). Envelope: 102.5 mm facing brick in stretcher bond on stainless shelf angles at every
// floor (precast slab-edge bands with a movement joint below), 100 mm insulated cavity, 100 mm blockwork; grey casements
// under brick soldier courses on reconstituted-stone sills, French doors onto bolt-on steel balconies (glass to the street,
// steel balusters to the garden), ground-floor terraces behind hedges, glazed communal entrance with canopy and signage,
// integral bin / cycle / plant stores, parapet roof (sedum, PV, lift overrun, hatch, plant), rainwater pipes, forecourt
// parking, cycle stands and a communal garden. A tower crane and edge protection stand during the frame stage.
// THE USER'S FLOOR (opts.floor, 1 = ground … 10 = top) is laid in real 3D bricks course by course (wallLoop: brick +
// insulation + blocks) and picked out with gold trims; the other storeys use true-scale brick-slip cladding panels.
(function (H) {
  'use strict';
  var UK = H.UK, CH = UK.CH, BW = UK.BW, J = UK.J, WALL = UK.WALL, CAV = UK.CAV, KW = UK.KW;
  var loopRuns = H._loopRuns, courseSegs = H._courseSegments;
  var SB = 0.09, FD = 0.07, FW = 0.065;              // window frames: set back from the brick face, depth, face width

  // point on a run at u along its outer face, d inward (negative = in front of the face)
  function P(r, u, d) { return [r.ax + (r.bx - r.ax) / r.L * u - r.out[0] * d, r.az + (r.bz - r.az) / r.L * u - r.out[1] * d]; }
  function RY(r) { return Math.atan2(-(r.bz - r.az), r.bx - r.ax); }

  // stroke font for the building-name letters (unit box, [x0,y0,x1,y1] strokes)
  var FONT = {
    V: [[0, 1, 0.5, 0], [0.5, 0, 1, 1]], A: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.24, 0.4, 0.76, 0.4]],
    U: [[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 1, 1]], L: [[0, 1, 0, 0], [0, 0, 1, 0]], T: [[0, 1, 1, 1], [0.5, 1, 0.5, 0]],
    H: [[0, 0, 0, 1], [1, 0, 1, 1], [0, 0.5, 1, 0.5]], O: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0], [1, 0, 0, 0]],
    S: [[1, 1, 0, 1], [0, 1, 0, 0.5], [0, 0.5, 1, 0.5], [1, 0.5, 1, 0], [1, 0, 0, 0]], E: [[0, 0, 0, 1], [0, 1, 1, 1], [0, 0.5, 0.75, 0.5], [0, 0, 1, 0]]
  };

  H.models.flat = function (K, opts) {
    opts = opts || {};
    var NS = 10, fl = parseInt(opts.floor, 10);
    var FLOOR = isNaN(fl) ? 5 : Math.max(1, Math.min(NS, fl)), MY = FLOOR - 1;      // MY = storey index (0 = ground)
    var W = 18.0, D = 12.15, FTF = 40 * CH, SLAB = 0.225, G0 = UK.DPC;
    var FFL = function (s) { return G0 + FTF * s; };                                  // finished floor level of storey s
    var yBot = function (s) { return s === 0 ? -0.15 : FFL(s); };                    // bottom of the storey's facing brick
    var yTop = function (s) { return FFL(s + 1) - SLAB; };                           // underside of the slab-edge band above
    var ROOF = FFL(NS), PAR = ROOF + 16 * CH;                                         // 30.150 roof slab, 31.350 parapet
    var pts = [[0, 0], [W, 0], [W, -D], [0, -D]], runs = loopRuns(pts);              // runs: 0 front · 1 right · 2 back · 3 left
    var PAL = 'blend', MYPAL = MY === 0 ? 'red' : PAL;
    var IN = WALL + 0.005;                                                            // inside face of the inner leaf
    // CLEAN SHELL (K.clean): the viewer draws every storey but the user's own as a plain faint silhouette, so those storeys
    // get only what shapes it (wall block, slab-edge bands, balcony slabs, parapet, roof). The user's storey keeps its
    // exterior only (real bricks, frames, glass, doors, balcony, bands, trims): no interiors, blinds, frame, rainwater
    // pipes, plant, landscaping or temporaries. Everything not needed is built inside K.fine(), so the full model is unchanged.
    var CL = !!K.clean;
    var GROUND = !CL || MY === 0;        // ground-floor exterior detail (entrance screen, stores, fire exits) is only the user's in the clean shell
    var CANOPY = !CL || MY === 1;        // the entrance canopy (deck at 3.15, lettering 2.98–3.12) lies in floor 2's height range, not floor 1's

    // box on a run (u along the face, d inward). Axis-aligned yaws are folded into the sizes (a box is symmetric under
    // 90° turns) so the instance has no rotation: the viewer's brick-slip shader picks its UV plane from the
    // un-instanced normal, so a yawed cladding box would otherwise show stretched stripes on the gable ends.
    function box(m, r, u, d, y, su, sy, sd, o) {
      var c = P(r, u, d); o = o ? Object.assign({}, o) : {}; o.ry = RY(r) + (o.ry || 0);
      if (!o.rx && !o.rz) {
        var q = Math.round(o.ry / (Math.PI / 2));
        if (Math.abs(o.ry - q * Math.PI / 2) < 1e-9) { if (q % 2) { var t = su; su = sd; sd = t; } o.ry = 0; }
      }
      return K.box(m, c[0], y, c[1], su, sy, sd, o);
    }
    function tube(m, r, ua, da, ya, ub, db, yb, rad, o) { var a = P(r, ua, da), b = P(r, ub, db); return K.tube(m, [a[0], ya, a[1]], [b[0], yb, b[1]], rad, o); }
    function beam(m, r, ua, da, ya, ub, db, yb, w, d, o) { var a = P(r, ua, da), b = P(r, ub, db); return K.beam(m, [a[0], ya, a[1]], [b[0], yb, b[1]], w, d, o); }
    function pick(a) { return a[Math.floor(K.rand() * a.length) % a.length]; }

    // ── frame grid: perimeter columns behind the brick piers, internal columns, stair + lift core ──
    var COLS = [];
    [0.4525, 4.725, 7.2, 10.8, 13.275, W - 0.4525].forEach(function (x) { COLS.push([x, -0.4525]); COLS.push([x, -D + 0.4525]); });
    [-4.05, -8.1].forEach(function (z) { [0.4525, 4.725, 13.275, W - 0.4525].forEach(function (x) { COLS.push([x, z]); }); });
    var CORE = [[9.0, -4.15, 3.8, 0.2], [9.0, -8.0, 3.8, 0.2], [7.2, -6.075, 0.2, 3.65], [10.8, -6.075, 0.2, 3.65], [9.0, -6.975, 0.2, 1.85]];

    // ── façade layout (225 mm module); u along each run from its start corner, v absolute heights ──
    function layout(s) {
      var f = FFL(s), O = [[], [], [], []];
      function add(ri, u0, u1, v0, v1, kind, sill, soldier) { O[ri].push({ ri: ri, s: s, u0: u0, u1: u1, v0: f + v0, v1: f + v1, kind: kind, sill: !!sill, soldier: soldier !== false }); }
      [0, 2].forEach(function (ri) {
        [[0.675, 1.8], [4.95, 6.075]].forEach(function (a) { add(ri, a[0], a[1], 0.9, 2.25, 'win', true); add(ri, W - a[1], W - a[0], 0.9, 2.25, 'win', true); });
        add(ri, 2.7, 4.5, 0, 2.25, s ? 'balc' : 'patio'); add(ri, W - 4.5, W - 2.7, 0, 2.25, s ? 'balc' : 'patio');
      });
      if (s) add(0, 8.325, 9.675, 0.6, 2.25, 'stair', true); else add(0, 7.425, 10.575, 0, 2.55, 'entrance');
      if (!s) add(2, 8.55, 9.45, 0, 2.1, 'exitGlazed');
      [1, 3].forEach(function (ri) {
        if (!s && ri === 3) { add(3, 1.575, 3.375, 0, 2.1, 'cycle'); add(3, 5.625, 6.525, 0, 2.1, 'plant'); add(3, 8.775, 10.575, 0, 2.1, 'bins'); return; }
        add(ri, 1.575, 2.7, 0.9, 2.25, 'win', true); add(ri, D - 2.7, D - 1.575, 0.9, 2.25, 'win', true);
        if (s) add(ri, 5.625, 6.525, 0.6, 2.25, 'stair', true); else add(ri, 5.625, 6.525, 0, 2.1, 'exit');
      });
      return O;
    }
    var LAY = []; for (var si = 0; si < NS; si++) LAY.push(layout(si));
    // the hole an opening makes in the facing brick: opening + sill course below + soldier course above (5 mm joints at the jambs)
    function cut(o) { return { u0: o.u0 - J / 2, u1: o.u1 + J / 2, v0: o.v0 - (o.sill ? CH : 0), v1: o.v1 + (o.soldier ? 3 * CH : 0) }; }

    // ── details shared by the brick storey and the cladding storeys ──
    function sill(o) {     // reconstituted-stone sill, stooled ends, 45 mm projection, weathered top
      box('stone', runs[o.ri], (o.u0 + o.u1) / 2, (SB + FD - 0.045) / 2, o.v0 - 0.0375, o.u1 - o.u0 + 0.15, 0.07, SB + FD + 0.045, { rx: 0.05 });
    }
    function lintel(o, real) {   // galvanised steel cavity lintel: toe under the facing brick (+ web and inner flange in real walls)
      var r = runs[o.ri], w = o.u1 - o.u0 + 0.30, uc = (o.u0 + o.u1) / 2;
      box('steel', r, uc, 0.005 + 0.0975 / 2, o.v1 + 0.004, w, 0.008, 0.0975);
      if (!real) return;
      beam('steel', r, uc, BW, o.v1 + 0.006, uc, BW + CAV, o.v1 + 0.16, 0.006, w);
      box('steel', r, uc, BW + CAV + KW / 2, o.v1 + 0.004, w, 0.008, KW);
    }
    function soldiers(o, real) {  // soldier course over the head, mortar behind, backing behind cladding
      var r = runs[o.ri], w = o.u1 - o.u0, n = Math.max(1, Math.round(w / CH)), pitch = w / n, uc = (o.u0 + o.u1) / 2;
      for (var i = 0; i < n; i++) box('brick', r, o.u0 + pitch * (i + 0.5), BW / 2, o.v1 + J + UK.BL / 2, pitch - J, UK.BL, BW, real ? { color: K._brickColor(MYPAL), kind: 'brick' } : { color: K._brickColor('red') });
      // (clean shell: the inside of the skin is visible, so the mortar back sits 4 mm inside the brick backs, like the kit's course mortar, to avoid z-fighting)
      var md = CL ? BW - 0.010 : BW - 0.006;
      box('mortar', r, uc, 0.006 + md / 2, o.v1 + 1.5 * CH, w + J, 3 * CH, md);
      if (!real) box('block', r, uc, BW + (WALL - BW) / 2, o.v1 + 1.5 * CH, w + J, 3 * CH, WALL - BW, { color: 0x8c8c88 });
    }
    // inner leaf + insulation the wallLoop cut away round an opening (its block rows are 3 courses high)
    function innerInfill(o, y0, y1) {
      var c = cut(o), R = 3 * CH, r = runs[o.ri], uc = (c.u0 + c.u1) / 2;
      var k0 = Math.floor((c.v0 - y0) / R + 1e-6), k1 = Math.ceil((c.v1 - y0) / R - 1e-6);
      var a = Math.max(y0 + k0 * R, y0 < 0 ? y0 + R : y0), b = Math.min(y1, y0 + k1 * R);
      [[a, o.v0], [o.v1, b]].forEach(function (g) {
        if (g[1] - g[0] < 0.02) return;
        box('block', r, uc, BW + CAV + KW / 2, (g[0] + g[1]) / 2, c.u1 - c.u0, g[1] - g[0] - 0.004, KW, { color: 0x8e8e8a });
        box('insulation', r, uc, BW + CAV / 2, (g[0] + g[1]) / 2, c.u1 - c.u0, g[1] - g[0] - 0.004, CAV - 0.012);
      });
    }
    function goldLine(yc, h, base) {   // "your floor" trim: front/back strips wrap the corners
      var t = 0.03;
      runs.forEach(function (r, ri) {
        var e = base + t, uA = ri % 2 ? 0 : -e, uB = ri % 2 ? r.L : r.L + e;
        box('gold', r, (uA + uB) / 2, -(base + t / 2), yc, uB - uA, h, t);
      });
    }
    // precast slab-edge band at the top of storey s (edge of slab s+1) with the shelf-angle movement joint under it
    function band(s) {
      var y = FFL(s + 1), e = 0.015;
      runs.forEach(function (r, ri) {
        var uA = ri % 2 ? 0.2025 : -e, uB = ri % 2 ? r.L - 0.2025 : r.L + e;
        box('stone', r, (uA + uB) / 2, (0.2025 - e) / 2, y - SLAB / 2, uB - uA, SLAB, 0.2025 + e);
        K.fine(function () { box('dpc', r, r.L / 2, -0.002, y - SLAB - 0.006, r.L, 0.012, 0.004); });
      });
    }

    // Bond tidy-up after wallLoop (kit _layRun artefacts on runs that start and end on a half-bond):
    // the mid-run closer can come out a full 225 mm long → lay a true 215 mm brick with 5 mm joints either side;
    // the inner leaf can get 45 mm block slivers → cut them to 100 mm by shortening the neighbouring block.
    function tidyBond(i0) {
      var its = K.items, rows = {};
      for (var i = i0; i < its.length; i++) {
        var it = its[i];
        if (it.k === 'brick' && it.sx > UK.BL + 0.001) it.sx = UK.BL;
        // 65 mm make-up course of sliced blocks under the slab soffit (deflection head): built, but not counted as blocks
        if (it.k === 'block' && it.sy < UK.KW - 0.002) { it.k = ''; it.c = 0x9a9a95; continue; }
        if (it.k === 'block') { var key = it.y.toFixed(4) + '|' + it.ry.toFixed(4); (rows[key] = rows[key] || []).push(it); }
      }
      Object.keys(rows).forEach(function (key) {
        var row = rows[key];
        row.forEach(function (sl) {
          if (sl.sx >= 0.1 - 1e-6) return;
          var tx = Math.cos(sl.ry), tz = -Math.sin(sl.ry), us = sl.x * tx + sl.z * tz, ns = sl.x * tz - sl.z * tx;
          row.some(function (nb) {
            if (nb === sl || nb.sx < 0.2) return false;
            var un = nb.x * tx + nb.z * tz;
            if (Math.abs(nb.x * tz - nb.z * tx - ns) > 1e-4 || Math.abs(Math.abs(un - us) - (sl.sx / 2 + J + nb.sx / 2)) > 1e-3) return false;
            var dir = un < us ? 1 : -1, far = un - dir * nb.sx / 2, take = 0.1 - sl.sx;   // far end of the neighbour stays put
            nb.sx -= take; un = far + dir * nb.sx / 2;
            sl.sx = 0.1; us = far + dir * (nb.sx + J + 0.05);
            var dn = un - (nb.x * tx + nb.z * tz), ds = us - (sl.x * tx + sl.z * tz);
            nb.x += dn * tx; nb.z += dn * tz; sl.x += ds * tx; sl.z += ds * tz;
            return true;
          });
        });
      });
    }

    // ── the user's storey: real cavity wall, course by course ──
    function userStorey(s, O) {
      var y0 = yBot(s), y1 = yTop(s), openings = {}, hooks = [];
      if (s > 0) hooks.push({ y: y0, fn: function () { goldLine(FFL(s) - 0.04, 0.07, 0.015); } });
      else hooks.push({ y: G0, fn: function () { goldLine(G0 - 0.035, 0.07, 0); } });
      O.forEach(function (list, ri) {
        openings[ri] = list.map(function (o) { var c = cut(o); return { u0: c.u0, u1: c.u1, v0: c.v0, v1: c.v1, type: 'void' }; });
        list.forEach(function (o) {
          if (o.sill) hooks.push({ y: o.v0, fn: function () { sill(o); } });
          hooks.push({ y: o.v1, fn: function () { K.fine(function () { lintel(o, true); }); if (o.soldier) soldiers(o, true); } });
        });
      });
      var i0 = K.items.length;
      K.wallLoop(pts, { y0: y0, y1: y1, leaves: 'cavity', palette: MYPAL, openings: openings, hooks: hooks, frame: 'upvcGrey',
        bands: s === 0 ? [{ y0: -0.15, y1: G0, palette: 'brown' }] : null });
      tidyBond(i0);
      K.stage('masonry');
      K.fine(function () { O.forEach(function (list) { list.forEach(function (o) { innerInfill(o, y0, y1); }); }); });
    }

    // ── clean shell, any storey but the user's: one plain wall block per face (the viewer draws it as a faint silhouette) ──
    function hull(s) {
      var y0 = yBot(s), y1 = yTop(s);
      runs.forEach(function (r, ri) {
        var uA = ri % 2 ? WALL : 0, uB = ri % 2 ? r.L - WALL : r.L;
        box('cladding', r, (uA + uB) / 2, WALL / 2, (y0 + y1) / 2, uB - uA, y1 - y0, WALL);
      });
    }

    // ── any other storey: brick-slip cladding panels (true-scale texture) rising in lifts, cut round the openings ──
    function cladStorey(s, O) {
      var y0 = yBot(s), y1 = yTop(s), C = O.map(function (list) { return list.map(cut); });
      var ys = [y0, y1]; if (s === 0) ys.push(G0);
      C.forEach(function (l) { l.forEach(function (c) { [c.v0, c.v1].forEach(function (v) { if (v > y0 + 1e-6 && v < y1 - 1e-6) ys.push(v); }); }); });
      ys = ys.map(function (v) { return Math.round(v * 1e4) / 1e4; }).sort(function (a, b) { return a - b; }).filter(function (v, i, a) { return !i || v - a[i - 1] > 1e-6; });
      var lifts = [];
      for (var i = 0; i < ys.length - 1; i++) {
        var a = ys[i], n = Math.round((ys[i + 1] - a) / CH), k = Math.max(1, Math.ceil(n / 6));
        for (var j = 0; j < k; j++) lifts.push([a + CH * Math.round(n * j / k), a + CH * Math.round(n * (j + 1) / k)]);
      }
      var ev = [];
      O.forEach(function (list) { list.forEach(function (o) {
        if (o.sill) ev.push({ y: o.v0 - CH, fn: function () { sill(o); } });
        ev.push({ y: o.v1, fn: function () { lintel(o, false); if (o.soldier) soldiers(o, false); } });
      }); });
      ev.sort(function (a, b) { return a.y - b.y; });
      var e = 0;
      lifts.forEach(function (L) {
        while (e < ev.length && ev[e].y <= L[0] + 1e-6) ev[e++].fn();
        var col = L[0] < G0 - 1e-6 ? 0x6e5f58 : 0xffffff;                     // dark engineering-brick plinth below DPC
        runs.forEach(function (r, ri) {
          var uA = ri % 2 ? WALL : 0, uB = ri % 2 ? r.L - WALL : r.L;
          courseSegs(uA, uB, L[0], L[1], C[ri], null).forEach(function (sg) {
            if (sg[1] - sg[0] < 0.004) return;
            box('cladding', r, (sg[0] + sg[1]) / 2, WALL / 2, (L[0] + L[1]) / 2, sg[1] - sg[0], L[1] - L[0], WALL, { color: col });
          });
        });
      });
      while (e < ev.length) ev[e++].fn();
    }

    // ── frame: columns + core for storey s, then the slab above (two pours) and its edge protection ──
    function edgeProtect(y) {
      var o = { hideAfter: 0.5 };
      runs.forEach(function (r) {
        var uA = 0.25, uB = r.L - 0.25, n = Math.ceil((uB - uA) / 3);
        for (var i = 0; i <= n; i++) box('string', r, uA + (uB - uA) * i / n, 0.25, y + 0.55, 0.045, 1.1, 0.045, o);
        [0.5, 1.05].forEach(function (h) { box('string', r, r.L / 2, 0.25, y + h, uB - uA, 0.04, 0.03, o); });
      });
    }
    function frame(s) {
      K.stage('masonry');
      var y0 = FFL(s), y1 = yTop(s), yc = (y0 + y1) / 2, h = y1 - y0;
      COLS.forEach(function (c) { K.box('concrete', c[0], yc, c[1], 0.30, h, 0.30); });
      CORE.forEach(function (w) { K.box('concrete', w[0], yc, w[1], w[2], h, w[3]); });
      K.box('concrete', (0.2025 + 9) / 2, y1 + SLAB / 2, -D / 2, 9 - 0.2025, SLAB, D - 0.405);
      K.box('concrete', (9 + W - 0.2025) / 2, y1 + SLAB / 2, -D / 2, W - 0.2025 - 9, SLAB, D - 0.405);
      edgeProtect(FFL(s + 1));
    }
    function envelope(s) {
      K.stage('masonry');
      if (s === MY) userStorey(s, LAY[s]); else if (CL) hull(s); else cladStorey(s, LAY[s]);
      band(s);
      // top trim: in the clean shell it sits on the joint under the slab-edge band so it falls inside the user's floor (rows)
      if (s === MY) goldLine(CL ? yTop(s) - 0.02 : yTop(s) + 0.04, 0.07, 0.015);
    }

    // ── fit-out: windows, doors, balconies ──
    var BLIND = [0xece6d6, 0xd9d4ca, 0xbfb8aa, 0x8f969c, 0xe8e2cf, 0x6d655c];
    function blind(r, u0, u1, top, h, d) {
      if (CL || K.rand() > 0.45) return;                 // blinds are interior: full model only
      var drop = h * (0.12 + K.rand() * 0.55);
      box('column', r, (u0 + u1) / 2, d, top - drop / 2, u1 - u0, drop, 0.012, { color: pick(BLIND) });
    }
    function frameBox(r, u, y, su, sy, d0) { box('upvcGrey', r, u, d0 == null ? SB + FD / 2 : d0, y, su, sy, FD); }
    function glass(r, a, b, ya, yb, d0) { if (b - a > 0.02 && yb - ya > 0.02) box('glass', r, (a + b) / 2, d0 == null ? SB + FD / 2 : d0, (ya + yb) / 2, b - a, yb - ya, 0.024, { lightsOn: 1 }); }
    function outerFrame(r, o, fw, d0, noBottom) {
      var w = o.u1 - o.u0, h = o.v1 - o.v0, uc = (o.u0 + o.u1) / 2, yc = (o.v0 + o.v1) / 2;
      frameBox(r, uc, o.v1 - fw / 2, w, fw, d0); if (!noBottom) frameBox(r, uc, o.v0 + fw / 2, w, fw, d0);
      frameBox(r, o.u0 + fw / 2, yc, fw, h - fw * (noBottom ? 1 : 2), d0); frameBox(r, o.u1 - fw / 2, yc, fw, h - fw * (noBottom ? 1 : 2), d0);
    }
    function glazeWin(o) {   // casement: fixed + side-hung opening light, top-hung fanlight over a transom
      var r = runs[o.ri], w = o.u1 - o.u0, uc = (o.u0 + o.u1) / 2, iv0 = o.v0 + FW, iv1 = o.v1 - FW;
      outerFrame(r, o, FW);
      var nm = Math.max(1, Math.round(w / 0.6)), tr = o.v1 - o.v0 > 1.0 ? iv1 - 0.34 : null;
      for (var i = 1; i < nm; i++) frameBox(r, o.u0 + w * i / nm, (iv0 + iv1) / 2, 0.06, iv1 - iv0);
      if (tr) frameBox(r, uc, tr, w - 2 * FW, 0.05);
      for (var j = 0; j < nm; j++) {
        var a = o.u0 + w * j / nm + (j ? 0.03 : FW), b = o.u0 + w * (j + 1) / nm - (j < nm - 1 ? 0.03 : FW);
        if (tr) { glass(r, a, b, iv0, tr - 0.025); glass(r, a, b, tr + 0.025, iv1); } else glass(r, a, b, iv0, iv1);
      }
      // opening sash of the first light: its own frame, a little proud of the outer frame
      var sa = o.u0 + FW, sb = nm > 1 ? o.u0 + w / nm - 0.03 : o.u1 - FW, st = tr ? tr - 0.025 : iv1, sd = SB + 0.02;
      box('upvcGrey', r, (sa + sb) / 2, sd, st - 0.022, sb - sa, 0.044, 0.03); box('upvcGrey', r, (sa + sb) / 2, sd, iv0 + 0.022, sb - sa, 0.044, 0.03);
      box('upvcGrey', r, sa + 0.022, sd, (iv0 + st) / 2, 0.044, st - iv0, 0.03); box('upvcGrey', r, sb - 0.022, sd, (iv0 + st) / 2, 0.044, st - iv0, 0.03);
      blind(r, o.u0 + FW, o.u1 - FW, iv1, iv1 - iv0, SB + FD + 0.035);
    }
    function glazeDoor(o) {  // French doors (balcony) / patio doors: two glazed leaves, meeting stiles, kick rails, threshold
      var r = runs[o.ri], uc = (o.u0 + o.u1) / 2, iv0 = o.v0 + FW, iv1 = o.v1 - FW;
      outerFrame(r, o, FW);
      frameBox(r, uc, (iv0 + iv1) / 2, 0.12, iv1 - iv0);
      [[o.u0 + FW, uc - 0.06], [uc + 0.06, o.u1 - FW]].forEach(function (lf, i) {
        box('upvcGrey', r, (lf[0] + lf[1]) / 2, SB + 0.02, iv0 + 0.075, lf[1] - lf[0], 0.15, 0.03);
        box('upvcGrey', r, (lf[0] + lf[1]) / 2, SB + 0.02, iv1 - 0.03, lf[1] - lf[0], 0.06, 0.03);
        box('upvcGrey', r, i ? lf[1] - 0.03 : lf[0] + 0.03, SB + 0.02, (iv0 + iv1) / 2, 0.06, iv1 - iv0, 0.03);
        glass(r, lf[0], lf[1], iv0 + 0.15, iv1);
        box('metal', r, i ? lf[0] + 0.05 : lf[1] - 0.05, SB - 0.005, o.v0 + 1.05, 0.022, 0.15, 0.02);
      });
      box('metal', r, uc, SB - 0.02, o.v0 + 0.012, o.u1 - o.u0, 0.024, 0.10);
      if (!CL && K.rand() < 0.5) {   // curtains drawn to the sides (interior: full model only)
        var cc = pick(BLIND); [o.u0 + FW + 0.12, o.u1 - FW - 0.12].forEach(function (u) { box('column', r, u, SB + FD + 0.06, (iv0 + iv1) / 2 + 0.05, 0.24, iv1 - iv0 - 0.1, 0.04, { color: cc }); });
      }
    }
    function exitDoor(o) {   // steel fire-exit door (or glazed garden door) with sign plaque
      var r = runs[o.ri], uc = (o.u0 + o.u1) / 2, w = o.u1 - o.u0, h = o.v1 - o.v0;
      outerFrame(r, o, FW, null, true);
      box(o.kind === 'exitGlazed' ? 'upvcGrey' : 'doorGrey', r, uc, SB + 0.03, o.v0 + (h - FW) / 2, w - 2 * FW - 0.006, h - FW - 0.006, 0.05);
      if (o.kind === 'exitGlazed') glass(r, o.u0 + FW + 0.1, o.u1 - FW - 0.1, o.v0 + 0.35, o.v1 - FW - 0.1, SB + 0.0);
      else glass(r, uc - 0.1, uc + 0.1, o.v0 + 1.25, o.v0 + 1.75, SB + 0.0);
      box('binGreen', r, uc, SB - 0.0, o.v0 + 1.1, 0.3, 0.12, 0.012);
      box('metal', r, o.u1 - FW - 0.08, SB - 0.005, o.v0 + 1.0, 0.03, 0.16, 0.03);
      box('stone', r, uc, -0.15, G0 - 0.075 + 0.0, w + 0.2, 0.15, 0.30);
    }
    function louvreDoor(o) { // ventilated store doors: steel frame, leaves with angled louvre blades, kick plates, signs
      var r = runs[o.ri], uc = (o.u0 + o.u1) / 2, w = o.u1 - o.u0, two = w > 1.2, d0 = SB + 0.035;
      outerFrame(r, o, FW, null, true);
      var a = o.u0 + FW, b = o.u1 - FW, top = o.v1 - FW;
      if (two) box('balcony', r, uc, d0, (o.v0 + top) / 2, 0.06, top - o.v0, 0.05);
      [a + 0.03, b - 0.03].forEach(function (u) { box('balcony', r, u, d0, (o.v0 + top) / 2, 0.06, top - o.v0, 0.05); });
      box('balcony', r, uc, d0, o.v0 + 0.15, b - a, 0.30, 0.05);
      box('balcony', r, uc, d0, top - 0.04, b - a, 0.08, 0.05);
      for (var y = o.v0 + 0.36; y < top - 0.10; y += 0.085) box('balcony', r, uc, d0, y, b - a - 0.08, 0.075, 0.008, { rx: 0.7 });
      box('metal', r, two ? uc + 0.09 : b - 0.12, SB - 0.01, o.v0 + 1.05, 0.03, 0.18, 0.03);
      box('upvc', r, uc, SB - 0.01, top - 0.25, 0.42, 0.13, 0.012);   // sign plaque
    }
    function entranceScreen(o) {   // aluminium entrance screen: side lights, double doors, fanlight, lit lobby behind
      var r = runs[0], sbE = 0.2, d0 = sbE + 0.06, fwE = 0.08, uc = (o.u0 + o.u1) / 2;
      var fb = function (u, y, su, sy) { box('upvcGrey', r, u, d0, y, su, sy, 0.12); };
      var dA = 8.1, dB = 9.9, tY = o.v0 + 2.25, top = o.v1 - fwE;
      fb(uc, o.v1 - fwE / 2, o.u1 - o.u0, fwE); fb(o.u0 + fwE / 2, (o.v0 + o.v1) / 2, fwE, o.v1 - o.v0); fb(o.u1 - fwE / 2, (o.v0 + o.v1) / 2, fwE, o.v1 - o.v0);
      fb(dA, (o.v0 + top) / 2, 0.10, top - o.v0); fb(dB, (o.v0 + top) / 2, 0.10, top - o.v0); fb(uc, tY + 0.04, o.u1 - o.u0 - 2 * fwE, 0.08);
      [[o.u0 + fwE, dA - 0.05], [dB + 0.05, o.u1 - fwE]].forEach(function (sl) { fb((sl[0] + sl[1]) / 2, o.v0 + 0.06, sl[1] - sl[0], 0.12); glass(r, sl[0], sl[1], o.v0 + 0.12, tY, d0); });
      [[o.u0 + fwE, dA - 0.05], [dA + 0.05, dB - 0.05], [dB + 0.05, o.u1 - fwE]].forEach(function (fl) { glass(r, fl[0], fl[1], tY + 0.08, top, d0); });
      [[dA + 0.05, uc - 0.004], [uc + 0.004, dB - 0.05]].forEach(function (lf, i) {
        var lc = (lf[0] + lf[1]) / 2, lw = lf[1] - lf[0];
        box('upvcGrey', r, lc, d0, o.v0 + 0.11, lw, 0.22, 0.06); box('upvcGrey', r, lc, d0, tY - 0.05, lw, 0.10, 0.06);
        box('upvcGrey', r, lf[0] + 0.05, d0, (o.v0 + tY) / 2, 0.10, tY - o.v0, 0.06); box('upvcGrey', r, lf[1] - 0.05, d0, (o.v0 + tY) / 2, 0.10, tY - o.v0, 0.06);
        glass(r, lf[0] + 0.1, lf[1] - 0.1, o.v0 + 0.22, tY - 0.1, d0);
        tube('metal', r, i ? lf[0] + 0.16 : lf[1] - 0.16, d0 - 0.09, o.v0 + 0.6, i ? lf[0] + 0.16 : lf[1] - 0.16, d0 - 0.09, o.v0 + 1.6, 0.016);
      });
      box('metal', r, uc, sbE - 0.03, o.v0 + 0.006, o.u1 - o.u0, 0.012, 0.25);    // level threshold
      // lobby: stone floor, plaster walls, letter-box bank, ceiling lights (interior: full model only)
      K.fine(function () {
        var lz = 2.7;
        box('stone', r, uc, (IN + lz) / 2, G0 + 0.03, 3.6, 0.02, lz - IN);
        [7.25, 10.75].forEach(function (u) { box('render', r, u, (IN + lz) / 2, G0 + 1.35, 0.06, 2.6, lz - IN, { color: 0xeae5d8 }); });
        box('render', r, uc, lz - 0.005, G0 + 1.35, 3.5, 2.6, 0.01, { color: 0xe4ddcf });
        box('metal', r, uc, lz - 0.16, G0 + 1.25, 2.4, 1.2, 0.3);
        for (var i = 1; i < 8; i++) box('upvcGrey', r, uc - 1.2 + 0.3 * i, lz - 0.31, G0 + 1.25, 0.012, 1.2, 0.01);
        for (var k = 1; k < 4; k++) box('upvcGrey', r, uc, lz - 0.31, G0 + 0.65 + 0.3 * k, 2.4, 0.012, 0.01);
        [8.4, 9.6].forEach(function (u) { var c = P(r, u, 1.5); K.cyl('gold', c[0], yTop(0) - 0.03, c[1], 0.12, 0.02); });
      });
    }

    // bolt-on steel balcony on a front/back run: cantilever arms on thermal-break connectors at the slab edge,
    // soffit plate, decking, glass balustrade with stainless rail (street side) or steel flat-bar balusters (garden side)
    var balcPlants = [];
    function balcony(r, u0, u1, y, d, glassy) {
      var w = u1 - u0, uc = (u0 + u1) / 2, M = 'balcony', z0 = -0.015;
      [u0 + 0.05, u1 - 0.05].forEach(function (u) { box(M, r, u, z0 - d / 2, y - 0.13, 0.10, 0.20, d); });
      box(M, r, uc, z0 - d + 0.05, y - 0.13, w, 0.20, 0.10);
      box(M, r, uc, z0 - d / 2, y - 0.23, w, 0.012, d);
      var nb = Math.floor((d - 0.12) / 0.145);
      if (CL) box('stone', r, uc, z0 - d / 2, y - 0.0175, w - 0.2, 0.025, d - 0.1);     // clean shell: the timber deck is one board-coloured plate
      else for (var i = 0; i < nb; i++) box('timber', r, uc, z0 - 0.03 - 0.145 * (i + 0.5), y - 0.0175, w - 0.2, 0.025, 0.135);
      var fz = z0 - d + 0.05, RAIL = CL ? 'upvcGrey' : 'metal';                         // (clean drops 'metal': the glass rail keeps a visible handrail)
      if (glassy) {
        var nP = Math.max(1, Math.round(w / 1.3)), pw = (w - 0.06) / nP;
        box(M, r, uc, fz, y + 0.05, w, 0.10, 0.08);
        for (var p = 0; p < nP; p++) box('glass', r, u0 + 0.03 + pw * (p + 0.5), fz, y + 0.6, pw - 0.02, 1.0, 0.0175);
        [u0 + 0.04, u1 - 0.04].forEach(function (u) {
          box(M, r, u, z0 - d / 2, y + 0.05, 0.08, 0.10, d - 0.1);
          box('glass', r, u, z0 - d / 2 - 0.03, y + 0.6, 0.0175, 1.0, d - 0.16);
          box(RAIL, r, u, z0 - d / 2, y + 1.125, 0.05, 0.045, d - 0.06);
        });
        box(RAIL, r, uc, fz, y + 1.125, w, 0.045, 0.05);
      } else {
        var post = function (u, dz) { box(M, r, u, dz, y + 0.55, 0.05, 1.1, 0.05); };
        var nPo = Math.max(1, Math.round(w / 1.3));
        for (var q = 0; q <= nPo; q++) post(u0 + 0.04 + (w - 0.08) * q / nPo, fz);
        [u0 + 0.04, u1 - 0.04].forEach(function (u) {
          post(u, z0 - 0.05);
          box(M, r, u, z0 - d / 2, y + 1.08, 0.05, 0.05, d - 0.06); box(M, r, u, z0 - d / 2, y + 0.10, 0.04, 0.04, d - 0.06);
          for (var dz = 0.13; dz < d - 0.08; dz += 0.11) box(M, r, u, z0 - dz, y + 0.59, 0.014, 0.94, 0.014);
        });
        box(M, r, uc, fz, y + 1.08, w, 0.05, 0.05); box(M, r, uc, fz, y + 0.10, w, 0.04, 0.04);
        for (var uu = u0 + 0.15; uu < u1 - 0.1; uu += 0.11) box(M, r, uu, fz, y + 0.59, 0.014, 0.94, 0.014);
      }
      tube('metal', r, u1 - 0.3, z0 - d + 0.12, y - 0.16, u1 - 0.3, z0 - d - 0.06, y - 0.19, 0.018);   // drainage spout
      if (K.rand() < 0.55) balcPlants.push([r, u0 + 0.3 + K.rand() * 0.4, z0 - d + 0.3, y]);
    }
    // clean shell, context storeys: a balcony is just its slab (it shapes the silhouette and shows the floors)
    function balconySlab(r, u0, u1, y, d) { box('balcony', r, (u0 + u1) / 2, -0.015 - d / 2, y - 0.13, u1 - u0, 0.20, d); }
    // the balcony span for a 'balc' opening: 225 mm beyond the door on the near corner side, 1.8 m the other way
    function balcSpan(o) { var left = o.u0 < W / 2; return [left ? o.u0 - 0.225 : o.u0 - 1.8, left ? o.u1 + 1.8 : o.u1 + 0.225]; }

    function interior(s) {   // floor finish, plaster ceiling and the rooms' back walls (seen through the glass)
      var y0 = FFL(s), y1 = yTop(s);
      K.box('timber', W / 2, y0 + 0.01, -D / 2, W - 2 * IN, 0.02, D - 2 * IN);
      K.box('render', W / 2, y1 - 0.0075, -D / 2, W - 2 * IN, 0.015, D - 2 * IN, { color: 0xd9d5cc });
      K.box('render', W / 2, (y0 + y1) / 2, -D / 2, W - 5.4, y1 - y0 - 0.04, D - 5.4, { color: 0x4f4b47 });
    }

    function letters(text, r, uc, y, d, h) {   // brass-finish stainless letters (stroke font), centred on uc
      var lw = h * 0.68, st = h * 0.15, gap = h * 0.30, total = 0;
      text.split('').forEach(function (ch) { total += ch === ' ' ? lw * 0.8 : lw + gap; });
      var u = uc - (total - gap) / 2;
      text.split('').forEach(function (ch) {
        if (ch === ' ') { u += lw * 0.8; return; }
        (FONT[ch] || []).forEach(function (s) {
          var ax = u + s[0] * lw, ay = y + s[1] * h, bx = u + s[2] * lw, by = y + s[3] * h, L = Math.hypot(bx - ax, by - ay), ex = (bx - ax) / L * st / 2, ey = (by - ay) / L * st / 2;
          beam('upvc', r, ax - ex, d, ay - ey, bx + ex, d, by + ey, st, 0.016);
        });
        u += lw + gap;
      });
    }

    // ── tower crane (erected after the piling, struck before landscaping) ──
    function crane(cx, cz, Hm, jib, cjib) {
      var o = { hideAfter: 0.80 }, m = 'string', a = 0.8;
      K.box('concrete', cx, 0.45, cz, 4.5, 0.9, 4.5, o);
      var C = [[-a, -a], [a, -a], [a, a], [-a, a]];
      C.forEach(function (c) { K.tube(m, [cx + c[0], 0.9, cz + c[1]], [cx + c[0], Hm, cz + c[1]], 0.06, o); });
      for (var y = 0.9, i = 0; y < Hm - 0.2; y += 2.5, i++) {
        var y2 = Math.min(Hm, y + 2.5);
        for (var f = 0; f < 4; f++) {
          var p = C[f], q = C[(f + 1) % 4], up = (i + f) % 2;
          K.tube(m, [cx + p[0], up ? y : y2, cz + p[1]], [cx + q[0], up ? y2 : y, cz + q[1]], 0.025, o);
        }
      }
      var yb = Hm + 0.8;
      K.box('steel', cx, Hm + 0.4, cz, 2.2, 0.8, 2.2, o);                                   // slewing unit
      K.box('upvc', cx + 1.1, Hm - 0.3, cz + 1.3, 1.3, 1.9, 1.1, o);                        // cab
      K.box('glass', cx + 1.1, Hm - 0.2, cz + 1.86, 1.1, 1.3, 0.03, o);
      K.tube(m, [cx - a, yb, cz], [cx, yb + 6, cz], 0.08, o); K.tube(m, [cx + a, yb, cz], [cx, yb + 6, cz], 0.08, o);   // tower head
      // jib: triangular lattice along +X
      var j0 = cx + a, j1 = cx + jib;
      [-0.6, 0.6].forEach(function (dz) { K.tube(m, [j0, yb, cz + dz], [j1, yb, cz + dz], 0.05, o); });
      K.tube(m, [j0, yb + 1.3, cz], [j1 - 1, yb + 1.3, cz], 0.05, o);
      for (var x = j0, k = 0; x < j1 - 1.5; x += 2, k++) [-0.6, 0.6].forEach(function (dz) {
        K.tube(m, [x + (k % 2 ? 2 : 0), yb, cz + dz], [x + (k % 2 ? 0 : 2), yb + 1.3, cz], 0.022, o);
      });
      // counter-jib with walkway and concrete counterweights
      var c1 = cx - cjib;
      [-0.6, 0.6].forEach(function (dz) { K.tube(m, [cx - a, yb, cz + dz], [c1, yb, cz + dz], 0.06, o); });
      K.box('scaffoldBoard', (cx - a + c1) / 2, yb + 0.05, cz, cjib - a, 0.04, 1.1, o);
      for (var w = 0; w < 4; w++) K.box('concrete', c1 + 0.5 + w * 0.55, yb - 0.6, cz, 0.5, 2.0, 1.6, o);
      // pendants, trolley, rope and hook block
      K.tube('steel', [cx, yb + 6, cz], [cx + jib * 0.62, yb + 1.3, cz], 0.02, o);
      K.tube('steel', [cx, yb + 6, cz], [c1 + 0.5, yb + 0.1, cz], 0.02, o);
      var tx = cx + jib * 0.45;
      K.box('steel', tx, yb - 0.15, cz, 0.8, 0.3, 1.4, o);
      K.tube('steel', [tx, yb - 0.3, cz], [tx, ROOF + 6.5, cz], 0.012, o);
      K.box('string', tx, ROOF + 6.2, cz, 0.35, 0.6, 0.3, o);
    }

    // ── helpers for the external works ──
    function eurobin(x, z, mat) {   // 1100 L communal bin
      K.box(mat, x, 0.62, z, 1.26, 0.96, 0.98, {}); K.box(mat, x, 1.13, z + 0.02, 1.30, 0.06, 1.02, { rx: 0.06 });
      [[-0.5, -0.36], [0.5, -0.36], [-0.5, 0.36], [0.5, 0.36]].forEach(function (w) { K.cyl('rubber', x + w[0], 0.1, z + w[1], 0.1, 0.05, { rz: Math.PI / 2 }); });
    }
    function sheffield(x, z) { K.tube('metal', [x, 0, z - 0.35], [x, 0.75, z - 0.35], 0.024); K.tube('metal', [x, 0, z + 0.35], [x, 0.75, z + 0.35], 0.024); K.tube('metal', [x, 0.75, z - 0.35], [x, 0.75, z + 0.35], 0.024); }
    function streetLight(x, z, dz) {
      K.cyl('upvcGrey', x, 3.0, z, 0.07, 6.0); K.beam('upvcGrey', [x, 5.9, z], [x, 6.05, z + dz], 0.08, 0.08);
      K.box('upvcGrey', x, 6.0, z + dz, 0.25, 0.1, 0.5); K.box('gold', x, 5.94, z + dz, 0.18, 0.02, 0.4);
    }
    function hedge(x0, z0, x1, z1, h) { K.box('plant', (x0 + x1) / 2, h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0, { color: pick([0x2f5a2c, 0x35602f, 0x2c5229]) }); }

    // ═══════════ BUILD ═══════════
    K.fine(function () {
      // set-out: profile pegs + string lines on the outer face, total station on a tripod
      K.stage('setout');
      runs.forEach(function (r) {
        box('string', r, r.L / 2, -0.01, 0.3, r.L + 1.2, 0.004, 0.004, { hideAfter: 0.12 });
        [-0.6, r.L + 0.6].forEach(function (u) { box('timber', r, u, -0.01, 0.2, 0.05, 0.5, 0.05, { hideAfter: 0.12 }); });
      });
      COLS.forEach(function (c) { K.box('timber', c[0], 0.15, c[1], 0.04, 0.3, 0.04, { hideAfter: 0.12 }); });
      [0, 2.1, 4.2].forEach(function (an) { K.beam('string', [W + 3 + 0.4 * Math.cos(an), 0, 3 + 0.4 * Math.sin(an)], [W + 3, 1.35, 3], 0.03, 0.03, { hideAfter: 0.10 }); });
      K.box('upvc', W + 3, 1.5, 3, 0.18, 0.26, 0.16, { hideAfter: 0.10 });

      // foundations: piling mat, CFA piles + caps under the columns, ground beams under the walls, starter bars, crane base
      K.stage('found');
      K.box('gravel', W / 2, 0.02, -D / 2, W + 6, 0.04, D + 6, { hideAfter: 0.80 });
      [[W + 6, -D - 3], [-6, 3.5]].forEach(function (s) { K.sph('soil', s[0], 0.35, s[1], 2.4, 0.9, 1.7, { hideAfter: 0.11 }); });
      COLS.forEach(function (c) { K.cyl('concrete', c[0], -6.6, c[1], 0.3, 11.0); K.box('concrete', c[0], -0.55, c[1], 1.2, 0.75, 1.2); });
      runs.forEach(function (r) { box('concrete', r, r.L / 2, 0.30, -0.50, r.L, 0.70, 0.60); });
      COLS.forEach(function (c) { [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { K.tube('steel', [c[0] + q[0] * 0.1, -0.2, c[1] + q[1] * 0.1], [c[0] + q[0] * 0.1, 1.1, c[1] + q[1] * 0.1], 0.013, { hideAfter: 0.122 }); }); });
      crane(-5.5, -6.0, 37.0, 31.0, 10.0);

      // ground-floor slab (suspended on the ground beams)
      K.stage('slab');
      K.box('concrete', (0.2025 + 9) / 2, G0 - SLAB / 2, -D / 2, 9 - 0.2025, SLAB, D - 0.405);
      K.box('concrete', (9 + W - 0.2025) / 2, G0 - SLAB / 2, -D / 2, W - 0.2025 - 9, SLAB, D - 0.405);
    });

    // frame rises floor by floor; the envelope follows two storeys behind (the user's storey course by course)
    var LAG = 2;
    for (var s = 0; s < NS + LAG; s++) { if (s < NS) K.fine(function () { frame(s); }); if (s - LAG >= 0) envelope(s - LAG); }

    // ── roof structure: parapets (rising), lift overrun, hatch upstand, tapered insulation ──
    K.stage('roofframe');
    // (clean shell: the parapet is one block per face and a slab closes the top of the silhouette)
    for (var pl = 0; pl < (CL ? 1 : 4); pl++) {
      var pa = ROOF + pl * 4 * CH, pb = CL ? PAR : pa + 4 * CH;
      runs.forEach(function (r, ri) {
        var uA = ri % 2 ? WALL : 0, uB = ri % 2 ? r.L - WALL : r.L;
        box('cladding', r, (uA + uB) / 2, WALL / 2, (pa + pb) / 2, uB - uA, pb - pa, WALL, { color: 0xffffff });
      });
    }
    var OV = { x0: 8.85, x1: 10.95, z0: -8.25, z1: -5.7, h: 2.55 };
    K.box('cladding', (OV.x0 + OV.x1) / 2, ROOF + OV.h / 2, (OV.z0 + OV.z1) / 2, OV.x1 - OV.x0, OV.h, OV.z1 - OV.z0, { color: 0xffffff });
    if (CL) K.box('render', W / 2, ROOF - SLAB / 2, -D / 2, W - 2 * IN, SLAB, D - 2 * IN);          // roof slab: closes the top
    K.fine(function () {
      K.box('concrete', 8.0, ROOF + 0.3, -7.05, 1.1, 0.6, 1.1);                                 // roof-hatch upstand over the stair
      for (var ir = 0; ir < 10; ir++) {
        var iz0 = -IN - (D - 2 * IN) * ir / 10, iz1 = -IN - (D - 2 * IN) * (ir + 1) / 10;
        K.box('insulation', W / 2, ROOF + 0.075, (iz0 + iz1) / 2, W - 2 * IN - 0.02, 0.15, Math.abs(iz1 - iz0) - 0.01);
      }
    });

    // ── roof finishes: membrane + upstands, aluminium copings, gravel margin, sedum blanket, paved walkways, PV ──
    K.stage('roofcover');
    var RF = ROOF + 0.16;
    K.fine(function () {
      K.box('membrane', W / 2, RF - 0.005, -D / 2, W - 2 * IN, 0.01, D - 2 * IN);
      runs.forEach(function (r, ri) {
        var uA = ri % 2 ? IN : 0, uB = ri % 2 ? r.L - IN : r.L;
        box('membrane', r, (uA + uB) / 2, IN + 0.005, RF + 0.15, uB - uA, 0.30, 0.01);
        box('gravel', r, (uA + uB) / 2 + 0, IN + 0.25, RF + 0.025, ri % 2 ? uB - uA - 1.0 : uB - uA - 2 * IN, 0.05, 0.5);
      });
    });
    runs.forEach(function (r, ri) {
      var e = 0.045, uA = ri % 2 ? WALL + e : -e, uB = ri % 2 ? r.L - WALL - e : r.L + e;
      box('upvcGrey', r, (uA + uB) / 2, WALL / 2, PAR + 0.025, uB - uA, 0.05, WALL + 2 * e);
      K.fine(function () {
        box('upvcGrey', r, (uA + uB) / 2, -e + 0.005, PAR - 0.03, uB - uA, 0.06, 0.01);
        box('upvcGrey', r, (uA + uB) / 2, WALL + e - 0.005, PAR - 0.03, uB - uA, 0.06, 0.01);
      });
    });
    K.box('upvcGrey', (OV.x0 + OV.x1) / 2, ROOF + OV.h + 0.025, (OV.z0 + OV.z1) / 2, OV.x1 - OV.x0 + 0.09, 0.05, OV.z1 - OV.z0 + 0.09);
    K.fine(function () {
      K.box('upvcGrey', 8.0, ROOF + 0.64, -7.05, 1.2, 0.07, 1.2, { rx: 0.04 });                // hatch lid
      // zones kept clear of sedum: walkway, plant pad, overrun + hatch
      var WALK = [1.0, -5.55, 17.0, -4.95], PAD = [12.4, -11.1, 16.9, -8.4], CLR = [7.2, -8.6, 11.3, -5.4];
      var inRect = function (x0, z0, x1, z1, R) { return x1 > R[0] && x0 < R[2] && z1 > R[1] && z0 < R[3]; };
      var SEDUM = [0x5f7a3c, 0x66803f, 0x6e7c41, 0x5a7238, 0x74783f, 0x6a6e3c];
      for (var sx = IN + 0.55; sx < W - IN - 0.6; sx += 2.0) for (var sz = -IN - 0.55; sz > -D + IN + 0.6; sz -= 1.0) {
        var mx1 = Math.min(sx + 2.0, W - IN - 0.55), mz0 = Math.max(sz - 1.0, -D + IN + 0.55);
        if (inRect(sx, mz0, mx1, sz, WALK) || inRect(sx, mz0, mx1, sz, PAD) || inRect(sx, mz0, mx1, sz, CLR)) continue;
        K.box('plant', (sx + mx1) / 2, RF + 0.035, (sz + mz0) / 2, mx1 - sx - 0.02, 0.07, sz - mz0 - 0.02, { color: pick(SEDUM) });
      }
      var slab6 = function (x0, z0, x1, z1) { for (var x = x0; x < x1 - 0.05; x += 0.6) for (var z = z0; z < z1 - 0.05; z += 0.6) K.box('paving', x + 0.3, RF + 0.04, z + 0.3, 0.592, 0.05, 0.592, { kind: 'tile' }); };
      slab6(WALK[0], WALK[1], WALK[2], WALK[3]); slab6(PAD[0], PAD[1], PAD[2], PAD[3]); slab6(7.5, -6.55, 8.7, -5.55);
      // PV arrays on ballasted frames, tilted 12° to the street
      var tilt = 12 * Math.PI / 180;
      [-1.75, -3.75].forEach(function (rz) {
        for (var px = 1.6; px < 16.4; px += 1.78) {
          K.box('metal', px + 0.85, RF + 0.1, rz + 0.45, 0.06, 0.2, 0.06); K.box('metal', px + 0.85, RF + 0.27, rz - 0.45, 0.06, 0.54, 0.06);
          K.box('curtain', px + 0.85, RF + 0.33, rz, 1.70, 0.035, 1.0, { rx: -tilt });
        }
        K.box('metal', 9.0, RF + 0.2, rz + 0.45, 14.4, 0.04, 0.05); K.box('metal', 9.0, RF + 0.53, rz - 0.45, 14.4, 0.04, 0.05);
        K.box('concrete', 9.0, RF + 0.04, rz, 14.4, 0.08, 0.3);
      });
    });

    // ── fit-out, floor by floor: interiors, windows, doors, balconies; then entrance canopy, rainwater pipes, roof plant ──
    K.stage('fitout');
    for (s = 0; s < NS; s++) {
      K.fine(function () { interior(s); });
      if (CL && s !== MY) {   // clean shell, context storey: balcony slabs only (windows, doors and glazing are invisible in the silhouette)
        if (s > 0) [0, 2].forEach(function (ri) {
          LAY[s][ri].forEach(function (o) { if (o.kind === 'balc') { var bs = balcSpan(o); balconySlab(runs[ri], bs[0], bs[1], FFL(s), 1.5); } });
        });
        continue;
      }
      LAY[s].forEach(function (list) {
        list.forEach(function (o) {
          if (o.kind === 'win' || o.kind === 'stair') glazeWin(o);
          else if (o.kind === 'balc' || o.kind === 'patio') glazeDoor(o);
          else if (o.kind === 'entrance') entranceScreen(o);
          else if (o.kind === 'exit' || o.kind === 'exitGlazed') exitDoor(o);
          else louvreDoor(o);
        });
      });
      if (s > 0) [0, 2].forEach(function (ri) {
        LAY[s][ri].forEach(function (o) {
          if (o.kind !== 'balc') return;
          var bs = balcSpan(o);
          balcony(runs[ri], bs[0], bs[1], FFL(s), 1.5, ri === 0);
        });
      });
    }
    // entrance canopy: aluminium deck, fascia, white soffit with downlights, stainless tie rods back to the wall
    var R0 = runs[0], cu0 = 6.975, cu1 = 11.025, cd = 1.5, cyB = 2.95, cyT = 3.15, cw = cu1 - cu0;
    box('upvcGrey', R0, 9.0, -0.015 - cd / 2, cyT - 0.025, cw, 0.05, cd);
    box('upvcGrey', R0, 9.0, -0.015 - cd + 0.03, (cyB + cyT) / 2, cw, cyT - cyB, 0.06);
    if (CANOPY) {
      [cu0 + 0.03, cu1 - 0.03].forEach(function (u) { box('upvcGrey', R0, u, -0.015 - cd / 2, (cyB + cyT) / 2, 0.06, cyT - cyB, cd); });
      box('upvc', R0, 9.0, -0.015 - cd / 2, cyB + 0.01, cw - 0.12, 0.012, cd - 0.06);
      K.fine(function () {
        [8.0, 9.0, 10.0].forEach(function (u) { var c = P(R0, u, -0.8); K.cyl('gold', c[0], cyB, c[1], 0.06, 0.012); });
        [cu0 + 0.25, cu1 - 0.25].forEach(function (u) { tube('metal', R0, u, -cd + 0.1, cyT - 0.02, u, -0.02, cyT + 1.35, 0.014); box('metal', R0, u, -0.01, cyT + 1.35, 0.12, 0.14, 0.02); });
      });
    }
    if (GROUND) {   // dry-riser inlet cabinet + label, door-entry panel
      box('doorRed', R0, 6.75, -0.10, 0.85, 0.55, 0.50, 0.20); box('upvc', R0, 6.75, -0.01, 1.2, 0.5, 0.09, 0.01);
      box('metal', R0, 10.95, -0.02, 1.3, 0.18, 0.32, 0.04); box('upvcBlack', R0, 10.95, -0.045, 1.38, 0.10, 0.07, 0.01);
    }
    K.fine(function () {
      // rainwater pipes from parapet outlets down both gable ends: hopper heads, clips at 2 m, shoes over gullies
      [[W, -0.45, 1], [W, -D + 0.45, 1], [0, -0.45, -1], [0, -D + 0.45, -1]].forEach(function (q) {
        var x = q[0], z = q[1], sd = q[2], xo = x + sd * 0.085, top = PAR - 0.6;
        K.box('lead', x + sd * 0.03, top + 0.32, z, 0.08, 0.12, 0.14);
        K.box('gutter', x + sd * 0.10, top + 0.16, z, 0.17, 0.32, 0.30);
        K.tube('gutter', [xo, top, z], [xo, 0.22, z], 0.05);
        for (var cy = 1.5; cy < top - 0.3; cy += 2.0) K.box('gutter', x + sd * 0.05, cy, z, 0.10, 0.04, 0.13);
        K.box('gutter', xo + sd * 0.04, 0.17, z, 0.17, 0.08, 0.12);
        K.box('steel', xo + sd * 0.12, 0.02, z, 0.30, 0.03, 0.30);
      });
      // roof plant: heat-pump condensers on a steel frame, extract cowls, AOV, guard rail round the hatch
      for (var cu = 0; cu < 3; cu++) {
        var ux = 13.1 + cu * 1.35;
        K.box('steel', ux, RF + 0.1, -9.75, 1.2, 0.08, 1.3); K.box('upvc', ux, RF + 0.82, -9.75, 1.0, 1.35, 0.42);
        [0.25, -0.3].forEach(function (dy) { K.cyl('gutter', ux, RF + 0.82 + dy, -9.53, 0.22, 0.02, { rx: Math.PI / 2 }); });
      }
      [[3.0, -8.0], [5.0, -9.5], [15.0, -6.5], [3.0, -10.4]].forEach(function (c) { K.cyl('metal', c[0], RF + 0.4, c[1], 0.12, 0.8); K.cyl('metal', c[0], RF + 0.86, c[1], 0.2, 0.1); });
      K.box('upvcGrey', 7.6, RF + 0.35, -8.15, 1.0, 0.6, 0.7); K.box('balcony', 7.6, RF + 0.66, -8.15, 1.05, 0.04, 0.75, { rx: 0.2 });
      [[7.35, -7.7], [8.65, -7.7], [8.65, -6.45], [7.35, -6.45]].forEach(function (c) { K.box('string', c[0], RF + 0.55, c[1], 0.05, 1.1, 0.05); });
      [[8.0, -7.7, 1.3, 0.04], [8.65, -7.075, 0.04, 1.25], [7.35, -7.075, 0.04, 1.25]].forEach(function (g) { [0.55, 1.08].forEach(function (h) { K.box('string', g[0], RF + h, g[1], g[2], 0.04, g[3]); }); });
    });

    // ── external works: forecourt, terraces, parking, cycle stands, bin store apron, street, communal garden ──
    K.fine(function () {
    K.stage('external');
    var zP0 = 7.4, zK = 9.4;
    K.paving(7.65, 0.0, 10.35, zP0);                                                      // entrance path
    K.paving(-4.2, zP0, 11.4, zK); K.paving(21.0, zP0, 24.0, zK);                         // pavement
    K.stage('external');
    K.box('membrane', 16.2, 0.025, (2.6 + zK) / 2, 9.6, 0.03, zK - 2.6);                  // parking bays + crossover (tarmac)
    for (var bx = 0; bx <= 4; bx++) K.box('upvc', 11.4 + bx * 2.4, 0.042, 5.0, 0.08, 0.006, 4.8);
    K.box('upvc', 16.2, 0.042, 2.64, 9.6, 0.006, 0.08);
    for (bx = 0; bx < 4; bx++) K.box('concrete', 12.6 + bx * 2.4, 0.08, 3.1, 1.6, 0.12, 0.18);
    K.box('upvc', 11.6, 0.6, 2.8, 0.25, 1.2, 0.18); K.box('gold', 11.6, 1.05, 2.9, 0.12, 0.08, 0.01);   // EV charge point
    K.box('stone', 10.0, 0.07, zK + 0.06, 28.4, 0.14, 0.12);                               // kerb
    K.box('membrane', 10.0, 0.005, zK + 3.5, 32.0, 0.01, 6.8);                             // road
    for (var dx = -5.0; dx < 25.0; dx += 3.0) K.box('upvc', dx, 0.012, zK + 3.5, 1.5, 0.004, 0.1);
    K.box('grass', 1.5, 0.012, 4.8, 11.4, 0.02, 4.4);                                       // front lawn (left)
    K.box('gravel', 9.0, 0.015, 0.3, W + 0.6, 0.03, 0.6);                                  // drip strip along the façade
    [[-0.6, 0.6, 2.4, 2.4], [15.6, 0.6, 18.6, 2.4], [6.3, 0.6, 7.65, 2.4], [10.35, 0.6, 11.7, 2.4]].forEach(function (b) { K.box('gravel', (b[0] + b[2]) / 2, 0.02, (b[1] + b[3]) / 2, b[2] - b[0], 0.03, b[3] - b[1]); });
    // ground-floor terraces (front + back) behind hedges
    [[2.475, 6.3], [11.7, 15.525]].forEach(function (t) {
      K.paving(t[0], 0.0, t[1], 2.4); K.paving(t[0], -D - 2.4, t[1], -D);
      K.stage('external');
      hedge(t[0] - 0.5, 0.0, t[0] - 0.05, 2.9, 1.1); hedge(t[1] + 0.05, 0.0, t[1] + 0.5, 2.9, 1.1); hedge(t[0] - 0.05, 2.45, t[1] + 0.05, 2.9, 1.1);
      hedge(t[0] - 0.5, -D - 2.9, t[0] - 0.05, -D, 1.1); hedge(t[1] + 0.05, -D - 2.9, t[1] + 0.5, -D, 1.1); hedge(t[0] - 0.05, -D - 2.9, t[1] + 0.05, -D - 2.45, 1.1);
    });
    for (var cs = 0; cs < 4; cs++) sheffield(5.0 + cs * 0.9, 5.2);
    [[7.4, 1.6], [7.4, 4.6], [10.6, 1.6], [10.6, 4.6]].forEach(function (b) { K.cyl('upvcGrey', b[0], 0.45, b[1], 0.08, 0.9); K.cyl('gold', b[0], 0.86, b[1], 0.085, 0.06); });
    // side path to the stores, bins out on the apron
    K.paving(-2.4, -D, 0.0, zP0);
    K.stage('external');
    eurobin(-1.25, -1.9, 'binBlack'); eurobin(-1.25, -3.3, 'binGreen'); eurobin(-1.25, -4.7, 'binBlue');
    // communal garden + boundary fence behind
    K.box('grass', 9.0, 0.012, -D - 5.5, 26.0, 0.02, 11.0);
    K.paving(7.65, -D - 7.0, 10.35, -D);
    K.stage('external');
    K.box('timber', 5.0, 0.45, -D - 5.5, 1.8, 0.06, 0.5); [4.3, 5.7].forEach(function (x) { K.box('upvcGrey', x, 0.22, -D - 5.5, 0.06, 0.44, 0.45); });
    K.fence([[-4.0, -D - 11.0], [22.0, -D - 11.0]], 1.8);
    K.tree(-2.2, 5.6, 6.5); K.tree(3.6, 6.4, 5.5); K.tree(22.6, 4.8, 6.0); K.tree(1.5, -D - 6.0, 7.0); K.tree(15.5, -D - 7.0, 6.5); K.tree(19.8, -3.0, 6.0);
    [[0.0, 3.3], [1.1, 2.9], [16.4, 3.2], [17.3, 3.5], [6.9, 1.4], [11.0, 1.5], [-0.6, -D - 1.0], [18.6, -D - 1.2]].forEach(function (p) { K.shrub(p[0], p[1], 0.45 + K.rand() * 0.25); });
    K.stage('external');
    streetLight(-1.0, zK - 0.4, 0.9); streetLight(19.0, zK - 0.4, 0.9);
    });   // end of the external works (full model only)

    // ── snagging + handover: building name on the canopy, balcony planters ──
    K.stage('snag');
    if (CANOPY) letters('VAULT HOUSE', R0, 9.0, cyB + 0.03, -0.015 - cd - 0.008, 0.14);
    K.fine(function () {
      balcPlants.forEach(function (b) {
        var c = P(b[0], b[1], b[2]);
        K.cyl('terracotta', c[0], b[3] + 0.2, c[1], 0.17, 0.4); K.sph('plant', c[0], b[3] + 0.55, c[1], 0.26, 0.26, 0.26, { color: pick([0x3c6b35, 0x2f5a2c, 0x4b7a3c]) });
      });

      // ── neighbours (blueprint ghosts) ──
      K.ghost(function () {
        K.box('brick', -16.0, 9.0, -6.5, 12.0, 18.0, 13.0);
        K.box('brick', 31.0, 6.75, -5.5, 12.0, 13.5, 11.0);
      });
    });
    // the finished silhouette

    K.env(0, -0.15, -D, W, PAR, 0);
    K.env(OV.x0, ROOF, OV.z0, OV.x1, ROOF + OV.h, OV.z1);
    [[2.475, 6.3], [11.7, 15.525]].forEach(function (t) { K.env(t[0], FFL(1) - 0.24, 0, t[1], FFL(NS - 1) + 1.15, 1.515); K.env(t[0], FFL(1) - 0.24, -D - 1.515, t[1], FFL(NS - 1) + 1.15, -D); });
    K.stage('masonry');

    K.anchor('front', W / 2, 1.5, 0); K.anchor('top', W / 2, PAR, -D / 2);
    K.anchor('myFloor', W / 2, FFL(MY) + 1.5, 0);
    return {
      name: 'Small flat · floor ' + FLOOR + ' of ' + NS,
      focus: { y0: FFL(MY) - SLAB - 0.02, y1: FFL(MY + 1) - SLAB + 0.02 },   // the user's own floor: what the deposit builds
      info: { storeys: NS, floor: FLOOR, floorLevel: FFL(MY), frontage: W, depth: D, height: PAR, flatsPerFloor: 4, floorToFloor: FTF }
    };
  };
})(HB3D);
