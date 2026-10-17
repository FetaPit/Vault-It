// Modern UK new-build detached house (2015–2025 volume-builder style — Barratt / Persimmon / Taylor Wimpey), 4 bedrooms.
// 9.90 × 8.55 m two-storey main block in cavity walls (multi-red 'blend' facing brick, stretcher bond, 100 mm insulated
// cavity, block inner leaf), 35° gable roof in concrete interlocking tiles with half-round ridge and dry verge, a two-storey
// projecting front gable (reconstituted-stone heads with keystones, stone cills), soldier-course heads elsewhere, anthracite
// uPVC casements, composite front door under a tiled apex canopy on gallows brackets, rear French doors, attached single
// garage (cavity wall, up-and-over door, its own 35° roof abutting the house gable with lead flashings), black fascia,
// soffit, gutters and downpipes with swan-necks, solar PV array, SVP, boiler flue, meter boxes, air bricks, herringbone
// block-paved drive, slab path and patio, lawns, close-board fences with side gates, bins, shed, trees. Faint ghost
// neighbours at a distance.
(function (H) {
  var UK = H.UK, CH = UK.CH, BW = UK.BW, CAV = UK.CAV, WALL = UK.WALL, J = UK.J, CW = UK.CW, RAD = Math.PI / 180;
  H.models.detached = function (K, opts) {
    var PAL = 'blend', FRAME = 'upvcGrey', FASCIA = 'upvcBlack', TILE = UK.TILES.concrete;
    K.brickPalette = PAL;
    // ── dimensions: outer faces of the facing brick, on the brick module (0.225 on plan, 0.075 courses) ──
    var W = 9.90, D = 8.55, y0 = -0.15;                                   // main block 44 × 38 bricks on plan
    var PX0 = 0.90, PX1 = 4.725, PZ = 0.675;                              // projecting front gable (17 bricks wide, 3 proud)
    var PXc = (PX0 + PX1) / 2, pHalf = (PX1 - PX0) / 2;
    var floor1 = UK.DPC + UK.STOREY;                                      // 2.775 first-floor level (35 courses up)
    var eave = y0 + 72 * CH;                                              // 5.25 wall plate
    var pitch = 35, TP = Math.tan(pitch * RAD), COS = Math.cos(pitch * RAD), ov = 0.30, vg = 0.05;
    var ridge = eave + D / 2 * TP, pRidge = eave + pHalf * TP;            // 8.24 / 6.59
    var GX0 = W, GX1 = W + 3.15, GZ0 = -0.45, GD = 6.075, GZ1 = GZ0 - GD, GZm = (GZ0 + GZ1) / 2;   // attached single garage
    var gEave = y0 + 35 * CH, gRidge = gEave + GD / 2 * TP;               // 2.475 / 4.60
    var IO = BW + CAV;                                                    // inner-leaf offset from the outer face
    // tile centre-plane above the wall-plate line at the wall face (kit roof build-up: rafter, felt, batten, tile)
    var TPL = 0.05 + 0.0485 / COS + (0.025 + TILE.th / 2 + 0.006) / COS;
    var LIFT = 0.12;                                                      // gable rakes follow the underside of the verge tiles
    var tileY = function (eY, hIn) { return eY + TPL + hIn * TP; };       // tile plane at hIn inward from the eaves wall face
    var RUN = function (ax, az, bx, bz, out) { return { ax: ax, az: az, bx: bx, bz: bz, L: Math.hypot(bx - ax, bz - az), out: out }; };
    var RP = function (r, u, d) { return K._runPoint(r, u, d); };
    var lerp3 = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };

    // ── perimeter of the house (outer face of the facing brick) ──
    // runs: 0 front-left pier · 1 projection left return · 2 projection front (gable) · 3 projection right return ·
    //       4 front-right (door) · 5 right gable (garage side) · 6 rear · 7 left gable
    var pts = [[0, 0], [PX0, 0], [PX0, PZ], [PX1, PZ], [PX1, 0], [W, 0], [W, -D], [0, -D]];
    var runs = H._loopRuns(pts);
    // garage walls: front (from the house wall), outer side (gable), back (to the house wall)
    var gF = RUN(GX0, GZ0, GX1, GZ0, [0, 1]), gS = RUN(GX1, GZ0, GX1, GZ1, [1, 0]), gB = RUN(GX1, GZ1, GX0, GZ1, [0, -1]);
    gF.convexStart = false; gF.convexEnd = true; gS.convexStart = gS.convexEnd = true; gB.convexStart = true; gB.convexEnd = false;

    // ── openings (u along the run from its start corner; v absolute heights on the 75 mm gauge) ──
    var GS = 1.05, HD = 2.25, FS = 3.675, FH = 4.875;                      // ground sill/head, first sill/head
    var win = function (u0, w, v0, v1, head, extra) { return Object.assign({ u0: u0, u1: u0 + w, v0: v0, v1: v1, type: 'window', style: 'casement', head: head || 'soldier' }, extra || {}); };
    var OPS = {
      2: [win(0.90, 2.025, GS, HD, 'stone'), win(1.2375, 1.35, FS, FH, 'stone')],                                   // lounge / bedroom 1
      4: [{ u0: 0.45, u1: 1.4625, v0: 0.15, v1: HD, type: 'door', style: 'composite', color: 'doorGrey', head: 'soldier' },
          win(2.025, 0.45, 1.35, HD, 'soldier', { obscure: true }), win(3.15, 1.35, GS, HD),                         // WC slit, study
          win(0.5625, 0.675, FS, FH, 'soldier', { obscure: true }), win(3.15, 1.35, FS, FH)],                       // en-suite, bedroom 2
      5: [{ u0: 7.20, u1: 8.10, v0: 0.15, v1: HD, type: 'door', style: 'composite', color: 'doorGrey', head: 'soldier' }, // utility door
          win(7.3125, 0.675, 3.825, FH, 'soldier', { obscure: true })],
      6: [win(1.125, 1.35, 1.20, HD), { u0: 3.60, u1: 5.40, v0: 0.15, v1: HD, type: 'void', french: true, head: 'soldier' },
          win(6.975, 1.80, GS, HD), win(1.125, 1.35, FS, FH), win(4.1625, 0.675, 3.825, FH, 'soldier', { obscure: true }), win(7.20, 1.35, FS, FH)],
      7: [win(4.95, 1.125, GS, HD), win(5.175, 0.675, 3.825, FH, 'soldier', { obscure: true })]
    };
    // wallLoop openings + void slots for the heads (soldier course / stone head laid by us) and the cills
    var wlOpen = {}, heads = [];
    Object.keys(OPS).forEach(function (ri) {
      var list = wlOpen[ri] = [];
      OPS[ri].forEach(function (o) {
        list.push(Object.assign({}, o, { lintel: 'none', sill: o.type === 'window' ? 'stone' : false }));
        var slot = o.head === 'stone' ? { u0: o.u0 - 0.1125, u1: o.u1 + 0.1125, v0: o.v1, v1: o.v1 + 2 * CH, type: 'void' }
                                      : { u0: o.u0, u1: o.u1, v0: o.v1, v1: o.v1 + 3 * CH, type: 'void' };
        list.push(slot);
        if (o.type === 'window') list.push({ u0: o.u0 - 0.05, u1: o.u1 + 0.05, v0: o.v0 - CH, v1: o.v0, type: 'void' });
        heads.push({ r: runs[ri], o: o, slot: slot, steel: o.type === 'void' });
      });
    });
    // garage openings (cut list) — up-and-over door to the drive, personnel door to the garden
    var gDoor = { u0: 0.45, u1: 2.70, v0: y0, v1: 2.175, type: 'garage', head: 'soldier' };
    var gBack = { u0: 0.5625, u1: 1.575, v0: 0.075, v1: 2.175, type: 'door', head: 'soldier' };
    var gDoorSlot = { u0: gDoor.u0, u1: gDoor.u1, v0: gDoor.v1, v1: gDoor.v1 + 3 * CH, type: 'void' };
    var gBackSlot = { u0: gBack.u0, u1: gBack.u1, v0: gBack.v1, v1: gBack.v1 + 3 * CH, type: 'void' };
    var gOpsF = [gDoor, gDoorSlot], gOpsB = [gBack, gBackSlot];
    heads.push({ r: gF, o: gDoor, slot: gDoorSlot, steel: true }, { r: gB, o: gBack, slot: gBackSlot, steel: true });

    // ── helpers ──
    // head over an opening: soldier course (bricks on end, 65 mm faces) or reconstituted-stone head with keystone,
    // plus a precast lintel in the inner leaf; a steel cavity lintel for openings the kit does not fit itself
    function layHead(h) {
      K.stage('masonry');
      var r = h.r, o = h.o, s = h.slot, ry = K._ry(r), uc = (s.u0 + s.u1) / 2, w = s.u1 - s.u0, p;
      if (h.steel) {
        var ow = o.u1 - o.u0, lp = RP(r, (o.u0 + o.u1) / 2, BW + CAV / 2);
        K.box('steel', lp[0], o.v1 + 0.004, lp[1], ow + 0.30, 0.008, WALL - 0.02, { ry: ry });
        K.box('steel', lp[0], o.v1 + 0.08, lp[1], ow + 0.30, 0.15, 0.006, { ry: ry, rx: 0.5 });
      }
      if (o.head === 'stone') {
        p = RP(r, uc, BW / 2 - 0.002);
        K.box('stone', p[0], s.v0 + 0.0775, p[1], w - J, 0.145, BW + 0.004, { ry: ry });
        var pk = RP(r, uc, BW / 2 - 0.008);
        K.box('stone', pk[0], s.v0 + 0.090, pk[1], 0.20, 0.17, BW + 0.016, { ry: ry });          // keystone
      } else {
        var n = Math.max(1, Math.round(w / CH)), pt = w / n;
        for (var i = 0; i < n; i++) {
          p = RP(r, s.u0 + pt * (i + 0.5), BW / 2);
          K.box('brick', p[0], s.v0 + 0.008 + UK.BL / 2, p[1], Math.min(UK.BH, pt - J), UK.BL, BW, { ry: ry, color: K._brickColor(PAL), kind: 'brick' });
        }
        p = RP(r, uc, 0.006 + (BW - 0.006) / 2);
        K.box('mortar', p[0], s.v0 + 3 * CH / 2, p[1], w, 3 * CH, BW - 0.006, { ry: ry });
      }
      var bTop = y0 + UK.KCH * Math.ceil((s.v1 - y0) / UK.KCH - 1e-6);            // next block-course line above the slot
      p = RP(r, uc, IO + UK.KW / 2);
      K.box('concrete', p[0], (s.v0 + bTop) / 2, p[1], w, bTop - s.v0, UK.KW, { ry: ry });
    }
    // attached garage: cavity wall laid course by course with the house (outer brick leaf + block inner leaf, no insulation)
    var gGab = { ridgeU: GD / 2, ridgeY: gRidge + LIFT, half: GD / 2, eaveY: gEave + LIFT };
    var gGabIn = { ridgeU: GD / 2, ridgeY: gRidge + LIFT - IO * 0.8, half: GD / 2, eaveY: gEave + LIFT };
    function gLay(r, uA, uB, ops, gable, yb) {
      var segs = H._courseSegments(Math.max(0, uA), Math.min(r.L, uB), yb, yb + CH, ops, gable);
      if (segs.length) K._layRun(r, yb, UK.BL, UK.BH, BW, segs, { uA: uA, uB: uB, mid: (uA + uB) / 2, unit: 'brick', palette: PAL });
    }
    function gInner(r, iu0, iu1, ops, gable, yb, top) {
      var ir = RUN(r.ax - r.out[0] * IO, r.az - r.out[1] * IO, r.bx - r.out[0] * IO, r.bz - r.out[1] * IO, r.out);
      var bt = Math.min(yb + UK.KCH, top), bk = Math.round((yb - y0) / UK.KCH) % 2;
      var segs = H._courseSegments(iu0, iu1, yb, bt, ops, gable);
      if (segs.length) K._layRun(ir, yb, UK.KL, Math.min(UK.KH, bt - yb - J), UK.KW, segs, { uA: iu0 + (bk ? UK.KCL / 2 : 0), uB: iu1, mid: (iu0 + iu1) / 2, unit: 'block', mat: 'block', mortar: false });
    }
    function gCourse(k) {
      var yb = y0 + k * CH, ev = k % 2 === 0, gableOnly = yb + CH > gEave + 1e-6;
      K.stage(gableOnly ? 'roofcover' : 'masonry');          // gable rake is built up to the trussed roof (UK practice)
      if (!gableOnly) {
        // corners: front/back own the outer corners on even courses, the gable side on odd; half bats at the house butt joint
        gLay(gF, ev ? 0 : -CW, ev ? gF.L : gF.L - CW, gOpsF, null, yb);
        gLay(gB, ev ? 0 : CW, ev ? gB.L + CW : gB.L, gOpsB, null, yb);
        gLay(gS, ev ? CW : 0, ev ? gS.L - CW : gS.L, null, gGab, yb);
      } else gLay(gS, 0, gS.L, null, gGab, yb);
      if (k % 3 === 0 && yb >= -0.001) {
        if (yb < gEave - 0.01) { gInner(gF, 0, gF.L - IO, gOpsF, null, yb, gEave); gInner(gB, IO, gB.L, gOpsB, null, yb, gEave); }
        gInner(gS, IO, gS.L - IO, null, gGabIn, yb, gRidge + LIFT);
      }
      K.stage('masonry');
    }
    var allRuns = runs.concat([gF, gS, gB]);
    var innerSpan = function (r) { return [r.convexStart ? IO : 0, r.convexEnd ? r.L - IO : r.L]; };

    // ═══ 1. SET-OUT, FOUNDATIONS, SLAB ═══
    // pegs + string lines just outside each wall line (removed once the trenches are concreted)
    K.stage('setout');
    allRuns.forEach(function (r) {
      var ry = K._ry(r), a = RP(r, -0.45, -0.25), b = RP(r, r.L + 0.45, -0.25), c = RP(r, r.L / 2, -0.25);
      K.box('timber', a[0], 0.175, a[1], 0.05, 0.45, 0.05, { hideAfter: 0.12 });
      K.box('timber', b[0], 0.175, b[1], 0.05, 0.45, 0.05, { hideAfter: 0.12 });
      K.box('string', c[0], 0.30, c[1], r.L + 0.90, 0.004, 0.004, { ry: ry, hideAfter: 0.12 });
    });
    // trench-fill foundations: dug trench (dark), concrete poured to near ground level, blockwork to DPC
    K.stage('found');
    allRuns.forEach(function (r) { var c = RP(r, r.L / 2, WALL / 2); K.box('soil', c[0], 0.004, c[1], r.L + 0.60, 0.008, 0.75, { ry: K._ry(r), hideAfter: 0.10 }); });
    [[-1.2, -12.5, 1.1], [3.5, -13.2, 0.9], [11.8, -12.2, 1.0]].forEach(function (s) { K.sph('soil', s[0], 0, s[1], s[2] * 1.4, s[2] * 0.75, s[2], { hideAfter: 0.30 }); });   // spoil heaps
    allRuns.forEach(function (r) {
      var c = RP(r, r.L / 2, WALL / 2), ry = K._ry(r);
      K.box('concrete', c[0], -0.45, c[1], r.L + 0.60, 0.50, 0.60, { ry: ry });                       // trench fill
      K.box('concrete', c[0], 0.012, c[1], r.L + 0.60, 0.008, 0.60, { ry: ry, hideAfter: 0.12 });       // its wet top, seen from above
    });
    allRuns.forEach(function (r) {
      var c = RP(r, r.L / 2, WALL / 2), ry = K._ry(r), sp = innerSpan(r), ci = RP(r, (sp[0] + sp[1]) / 2, IO + UK.KW / 2);
      K.box('block', c[0], -0.175, c[1], r.L, 0.05, WALL, { ry: ry, color: 0x7d7d79 });                  // footing blocks to −0.15
      K.box('block', ci[0], -0.0375, ci[1], sp[1] - sp[0], 0.225, UK.KW, { ry: ry, color: 0x8a8a86 });   // inner leaf up to the first block course
    });
    K.stage('slab');
    [[WALL, -D + WALL, W - WALL, -WALL, UK.DPC], [PX0 + WALL, -WALL, PX1 - WALL, PZ - WALL, UK.DPC], [GX0, GZ1 + WALL, GX1 - WALL, GZ0 - WALL, 0.075]].forEach(function (s) {
      K.box('concrete', (s[0] + s[2]) / 2, (s[4] - 0.10) / 2, (s[1] + s[3]) / 2, s[2] - s[0], s[4] + 0.10, s[3] - s[1], {});
    });
    K.box('concrete', GX0 + (gDoor.u0 + gDoor.u1) / 2, (0.075 + y0) / 2, GZ0 - WALL / 2, gDoor.u1 - gDoor.u0, 0.075 - y0, WALL, {});   // garage threshold

    // ═══ 2. MASONRY (house + garage course by course, with hooks for DPC, heads, floor, scaffold) ═══
    var hooks = [];
    hooks.push({ y: UK.DPC, fn: function () {
      K.stage('masonry');
      allRuns.forEach(function (r) { var c = RP(r, r.L / 2, WALL / 2); K.box('dpc', c[0], UK.DPC + 0.002, c[1], r.L, 0.004, WALL + 0.004, { ry: K._ry(r) }); });
    } });
    heads.forEach(function (h) { hooks.push({ y: h.o.v1, fn: function () { layHead(h); } }); });
    var gN = Math.ceil((gRidge + LIFT - y0) / CH);
    for (var gk = 0; gk < gN; gk++) (function (k) { hooks.push({ y: y0 + k * CH, fn: function () { gCourse(k); } }); })(gk);
    hooks.push({ y: floor1 - 0.20, fn: function (k) {
      k.stage('masonry');
      k.floor(WALL, -D + WALL, W - WALL, -WALL, floor1);
      k.floor(PX0 + WALL, -WALL, PX1 - WALL, PZ - WALL, floor1);
    } });
    var SCAF = [[0, PZ], [GX1, PZ], [GX1, -D], [0, -D]];
    [[1.40, 2.0], [3.40, 4.0], [5.00, 5.8]].forEach(function (s) { hooks.push({ y: s[0], fn: function (k) { k.stage('masonry'); k.scaffoldLift(SCAF, s[1], { off: 1.15 }); } }); });
    var i0 = K.items.length, mark = -1;
    hooks.push({ y: 99, fn: function () { mark = K.items.length; } });
    var gab = function (L, top) { return { ridgeU: L / 2, ridgeY: top + LIFT, half: L / 2, eaveY: eave + LIFT }; };
    K.wallLoop(pts, {
      y0: y0, y1: eave, leaves: 'cavity', palette: PAL, frame: FRAME, sills: 'stone', lintels: 'none',
      gables: { 2: gab(PX1 - PX0, pRidge), 5: gab(D, ridge), 7: gab(D, ridge) },
      openings: wlOpen, hooks: hooks
    });
    // garage door + back door frames (fit-out)
    K.stage('fitout');
    K._openingFit(gF, { u0: gDoor.u0, u1: gDoor.u1, v0: 0.075, v1: gDoor.v1, type: 'garage', color: 'doorGrey' }, { frame: FRAME });
    K._openingFit(gB, { u0: gBack.u0, u1: gBack.u1, v0: gBack.v0, v1: gBack.v1, type: 'door', color: 'doorGrey' }, { frame: FRAME });
    K.stage('masonry');
    retime(i0, mark);
    K.env(0, 0, -D, W, eave, 0); K.env(PX0, 0, 0, PX1, eave, PZ); K.env(GX0, 0, GZ1, GX1, gEave, GZ0);

    //@@PART2@@
    return { name: 'tmp', info: {} };

    // Lintels, cills and cavity closers that the kit appends after the last course are moved back in the build order so each
    // appears as the brickwork reaches it (steel on the course at its bearing, cills/closers when the course under them is done).
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
