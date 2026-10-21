// Modern UK new-build detached house (2015–2025 volume-builder style — Barratt / Persimmon / Taylor Wimpey), 4 bedrooms.
// 9.90 × 8.55 m two-storey main block in cavity walls (multi-red 'blend' facing brick, stretcher bond, darker brindle
// plinth below DPC, 100 mm insulated cavity, block inner leaf), wall plate 5.40, 35° gable roof on fink trusses in concrete
// interlocking tiles with half-round ridge and dry verge, a two-storey projecting front gable with GRP valleys
// (reconstituted-stone heads with keystones, stone cills), soldier-course heads elsewhere, anthracite uPVC casements,
// composite front door under a tiled apex canopy on gallows brackets, rear French doors, attached single garage (cavity
// wall, sectional door, its own 35° roof abutting the house gable with stepped lead flashings), black fascia, soffit and
// box-ends, square-line gutters and downpipes with swan-necks, 8-panel PV array, SVP, balanced boiler flue, meter boxes,
// air bricks, EV charge point, plastered rooms behind the glazing; herringbone block-paved drive, slab paths and patio,
// lawns, close-board fences with ledged-and-braced side gates, bins, shed, rotary dryer, trees, footway and road.
// Faint ghost neighbours at a distance.
(function (H) {
  var UK = H.UK, CH = UK.CH, BW = UK.BW, CAV = UK.CAV, WALL = UK.WALL, J = UK.J, CW = UK.CW, RAD = Math.PI / 180;
  H.models.detached = function (K, opts) {
    var PAL = 'blend', PLINTH = 'brown', FRAME = 'upvcGrey', FASCIA = 'upvcBlack', TILE = UK.TILES.concrete;
    K.brickPalette = PAL;
    // ── dimensions: outer faces of the facing brick, on the brick module (0.225 on plan, 0.075 courses) ──
    var W = 9.90, D = 8.55, y0 = -0.15;                                   // main block 44 × 38 bricks on plan
    var PX0 = 0.90, PX1 = 4.725, PZ = 0.675;                              // projecting front gable (17 bricks wide, 3 proud)
    var PXc = (PX0 + PX1) / 2, pHalf = (PX1 - PX0) / 2;
    var floor1 = UK.DPC + UK.STOREY;                                      // 2.775 first-floor level (35 courses up)
    var eave = y0 + 74 * CH;                                              // 5.40 wall plate (soffit clears the first-floor soldier heads)
    var pitch = 35, TP = Math.tan(pitch * RAD), COS = Math.cos(pitch * RAD), ov = 0.30, vg = 0.05;
    var ridge = eave + D / 2 * TP, pRidge = eave + pHalf * TP;            // 8.39 / 6.74
    var GX0 = W, GX1 = W + 3.15, GZ0 = -0.45, GD = 6.075, GZ1 = GZ0 - GD, GZm = (GZ0 + GZ1) / 2;   // attached single garage
    var gEave = y0 + 38 * CH, gRidge = gEave + GD / 2 * TP;               // 2.70 / 4.83 (soffit clears the door's soldier course)
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
      if (segs.length) K._layRun(r, yb, UK.BL, UK.BH, BW, segs, { uA: uA, uB: uB, mid: (uA + uB) / 2, unit: 'brick', palette: yb < UK.DPC - 1e-6 ? PLINTH : PAL });
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
    // scaffold: the inner line on each side stands clear of everything fixed to that face while the scaffold is up
    // (to p .80), with inner guard rails across the wider gap (kit adds them when inner > 0.30):
    //  back  — inner 0.50 clears the rear eaves (tiles −8.85, gutter −8.915) and the transom ends stop under the
    //          gutter line instead of in the soffit; off 1.55 keeps a 4-board platform
    //  front — inner 0.40 off the projection face clears the porch canopy (pediment / tiles to 0.97 off the main wall)
    //          and the transom ends clear the projection's dry verge (to 0.76); off 1.45 keeps 4 boards
    //  left  — inner 0.40 clears the boiler flue terminal (to −0.27) and the main verge (to −0.09); off 1.17 keeps
    //          the run inside the 1.35 m side passage (3 boards)
    //  right — kit default 1.15 / 0.15 off the garage gable
    var SCAF = [[0, PZ], [GX1, PZ], [GX1, -D], [0, -D]];
    var SCAF_O = { off: { front: 1.45, right: 1.15, back: 1.55, left: 1.17 }, inner: { front: 0.40, back: 0.50, left: 0.40 } };
    [[1.40, 2.0], [3.40, 4.0], [5.00, 5.8]].forEach(function (s) { hooks.push({ y: s[0], fn: function (k) { k.stage('masonry'); k.scaffoldLift(SCAF, s[1], SCAF_O); } }); });
    var i0 = K.items.length, mark = -1;
    hooks.push({ y: 99, fn: function () { mark = K.items.length; } });
    var gab = function (L, top) { return { ridgeU: L / 2, ridgeY: top + LIFT, half: L / 2, eaveY: eave + LIFT }; };
    K.wallLoop(pts, {
      y0: y0, y1: eave, leaves: 'cavity', palette: PAL, frame: FRAME, sills: 'stone', lintels: 'none',
      gables: { 2: gab(PX1 - PX0, pRidge), 5: gab(D, ridge), 7: gab(D, ridge) },
      openings: wlOpen, hooks: hooks, bands: [{ y0: y0, y1: UK.DPC, palette: PLINTH }]
    });
    // garage door + back door frames (fit-out)
    K.stage('fitout');
    K._openingFit(gF, { u0: gDoor.u0, u1: gDoor.u1, v0: 0.075, v1: gDoor.v1, type: 'garage', color: 'doorGrey' }, { frame: FRAME });
    K._openingFit(gB, { u0: gBack.u0, u1: gBack.u1, v0: gBack.v0, v1: gBack.v1, type: 'door', color: 'doorGrey' }, { frame: FRAME });
    K.stage('masonry');
    retime(i0, mark);
    K.env(0, 0, -D, W, eave, 0); K.env(PX0, 0, 0, PX1, eave, PZ); K.env(GX0, 0, GZ1, GX1, gEave, GZ0);

    // ═══ 3. ROOF STRUCTURE ═══
    // Each roof slope is described in its own frame: a runs along the eaves (world X or Z), h is the horizontal distance
    // inward from the eaves wall face (negative = overhang); heights follow the kit build-up from the wall-plate line eY
    // (rafter centre-line 0.05 above it, felt, 25 × 50 battens at gauge, tiles).
    var T = TILE, PR = pitch * RAD, RTOP = 0.05 + 0.0485 / COS, HF = -ov + 0.05;   // HF: fascia face, 50 mm inside the tile drip
    var GIN = -HF, GOUT = -HF + 0.115;                                    // square-line gutter: inner / outer edge from the wall face
    var mkS = function (ax, face, inw, eY, a0, a1, hTop, o) { return Object.assign({ ax: ax, face: face, inw: inw, eY: eY, a0: a0, a1: a1, hTop: hTop }, o || {}); };
    var VGAP = 0.07;                                                      // tiles cut back from the valley line (open GRP channel)
    var pClip = function (h) { return [[Math.max(-pHalf - 0.1, -h + VGAP), PZ + vg]]; };   // projection slopes stop at the valleys (z = −h)
    // valley edge of a tile course between h0 (bottom) and h1: where the cut line runs from (row bottom) to (row top)
    var pCut = function (h0, h1) { var t = Math.min(h1, pHalf); return t > h0 ? [{ a: -h0 + VGAP, b: -t + VGAP, h1: t, key: '0s' }] : []; };
    var mCut = function (h0, h1) { var t = Math.min(h1, pHalf + VGAP); if (t <= h0) return [];
      return [{ a: PXc - pHalf + h0 - VGAP, b: PXc - pHalf + t - VGAP, h1: t, key: '0e' }, { a: PXc + pHalf - h0 + VGAP, b: PXc + pHalf - t + VGAP, h1: t, key: '1s' }]; };
    var SL = {
      mF: mkS('x', 0, -1, eave, -vg, W + vg, D / 2, { clip: function (h) { if (h >= pHalf + VGAP) return null; var w = pHalf - h + VGAP; return [[-vg, PXc - w], [PXc + w, W + vg]]; }, vcut: mCut }),
      mR: mkS('x', -D, 1, eave, -vg, W + vg, D / 2),
      pL: mkS('z', PX0, 1, eave, -pHalf - 0.1, PZ + vg, pHalf, { from: 1, clip: pClip, vcut: pCut }),
      pR: mkS('z', PX1, -1, eave, -pHalf - 0.1, PZ + vg, pHalf, { from: 1, clip: pClip, vcut: pCut }),
      gF: mkS('x', GZ0, -1, gEave, W + 0.004, GX1 + vg, GD / 2, { from: 1 }),
      gR: mkS('x', GZ1, 1, gEave, W + 0.004, GX1 + vg, GD / 2, { from: 1 })
    };
    function WP(S, a, h, y) { return S.ax === 'x' ? [a, y, S.face + S.inw * h] : [S.face + S.inw * h, y, a]; }
    function AB(S, mat, a, h, y, la, lh, sy, o) { var p = WP(S, a, h, y); return K.box(mat, p[0], y, p[2], S.ax === 'x' ? la : lh, sy, S.ax === 'x' ? lh : la, o || {}); }
    function SB(S, mat, a, h, y, la, ls, th, o, ext) {     // box lying on the slope (la along the eaves, ls up the slope)
      var p = WP(S, a, h, y), g = PR + (ext || 0), rr = S.ax === 'x' ? { rx: S.inw < 0 ? g : -g } : { rz: S.inw > 0 ? g : -g };
      return K.box(mat, p[0], p[1], p[2], S.ax === 'x' ? la : ls, th, S.ax === 'x' ? ls : la, Object.assign(rr, o || {}));
    }
    var rafterY = function (S, h) { return S.eY + 0.05 + h * TP; };
    var tileY = function (S, h) { return S.eY + TPL + h * TP; };
    var tileCol = function () { var b = [0x4a4a4c, 0x47474a, 0x4d4c4d, 0x494a4d][Math.floor(K.rand() * 4)], j = 1 + (K.rand() - 0.5) * 0.06;
      return (Math.min(255, Math.round(((b >> 16) & 255) * j)) << 16) | (Math.min(255, Math.round(((b >> 8) & 255) * j)) << 8) | Math.min(255, Math.round((b & 255) * j)); };
    // fink trussed rafter at a: rafters with tails to the fascia, ceiling tie, W webs; S1/S2 the two slopes of the span
    function truss(S1, S2, a, span) {
      var top = span / 2, ap = WP(S1, a, top, rafterY(S1, top) - 0.02), c = function (S, h) { return WP(S, a, h, rafterY(S, h)); };
      var t = function (S, h) { return WP(S, a, h, S.eY + 0.0985); };
      K.beam('timber', c(S1, HF + 0.022), ap, 0.097, 0.035); K.beam('timber', c(S2, HF + 0.022), ap, 0.097, 0.035);
      K.beam('timber', t(S1, 0.10), t(S2, 0.10), 0.097, 0.035);
      [S1, S2].forEach(function (S) { var q = t(S, span / 3); K.beam('timber', q, c(S, span / 4), 0.072, 0.035); K.beam('timber', q, ap, 0.072, 0.035); });
    }
    K.stage('roofframe');
    // steel beam over the opening into the projection, wall plates bedded on the inner leaves
    var ipl = IO + UK.KW / 2;
    K.box('steel', PXc, eave - 0.10, -ipl, PX1 - PX0 + 0.20, 0.20, 0.10, {});
    [[W / 2, -ipl, W - 2 * IO, 0.10], [W / 2, -D + ipl, W - 2 * IO, 0.10]].forEach(function (w) { K.box('timber', w[0], eave + 0.025, w[1], w[2], 0.05, w[3], {}); });
    [PX0 + ipl, PX1 - ipl].forEach(function (x) { K.box('timber', x, eave + 0.025, (PZ - IO - ipl) / 2, 0.10, 0.05, PZ - IO + ipl, {}); });
    [GZ0 - ipl, GZ1 + ipl].forEach(function (z) { K.box('timber', (W + GX1 - IO) / 2, gEave + 0.025, z, GX1 - IO - W, 0.05, 0.10, {}); });
    // main trusses at 600 c/c between the gable inner leaves, binders at the apex and along the ties
    for (var ta = WALL + 0.05; ta <= W - WALL - 0.04; ta += UK.TRUSS_C) truss(SL.mF, SL.mR, ta, D);
    K.box('timber', W / 2, ridge - 0.06, -D / 2, W - 2 * WALL, 0.10, 0.035, {});
    [-D / 3, -2 * D / 3].forEach(function (z) { K.box('timber', W / 2, eave + 0.17, z, W - 2 * WALL, 0.035, 0.097, {}); });
    // projecting gable: one truss inside the front gable, then the valley set (jack rafters on lay boards over the main slope)
    truss(SL.pL, SL.pR, PZ - WALL - 0.05, PX1 - PX0);
    [-0.2775, -0.8775, -1.4775].forEach(function (z) {
      [SL.pL, SL.pR].forEach(function (S) { var h0 = -z + 0.04; K.beam('timber', WP(S, z, h0, rafterY(S, h0)), WP(S, z, pHalf, pRidge + 0.03), 0.097, 0.035); });
    });
    K.box('timber', PXc, pRidge - 0.02, (PZ - WALL - pHalf) / 2, 0.035, 0.15, PZ - WALL + pHalf, {});
    [[PX0, PX0 - ov], [PX1, PX1 + ov]].forEach(function (v) {   // valley lay boards from the eaves corner to the ridge junction
      K.beam('timber', [v[0], eave + 0.06, 0], [PXc, pRidge + 0.06, -pHalf], 0.025, 0.225);
    });
    // garage trusses span front to back; raking ledgers on the house wall carry the abutment
    for (var ga = W + 0.25; ga <= GX1 - WALL - 0.04; ga += UK.TRUSS_C) truss(SL.gF, SL.gR, ga, GD);
    [SL.gF, SL.gR].forEach(function (S) { K.beam('timber', WP(S, W + 0.03, HF + 0.022, rafterY(S, HF + 0.022)), WP(S, W + 0.03, GD / 2, gRidge + 0.03), 0.15, 0.05); });
    K.box('timber', (W + GX1 - WALL) / 2, gRidge - 0.06, GZm, GX1 - WALL - W, 0.10, 0.035, {});
    // gable rakes (laid by wallLoop/gCourse in 'roofcover') are built up to the braced trusses next, before fascia and felt
    (function () { var keep = [], gab = []; K.items.forEach(function (it) { if (it.st === 'roofcover') { it.st = 'roofframe'; gab.push(it); } else keep.push(it); }); K.items = keep.concat(gab); })();

    // fascia, soffit and gable box-ends (black uPVC) fixed to the rafter tails before felting
    function eavesBoards(S, fa, sa, ends) {
      var fTop = S.eY + RTOP + HF * TP + 0.02, sy = fTop - 0.185;
      AB(S, FASCIA, (fa[0] + fa[1]) / 2, HF + 0.011, fTop - 0.10, fa[1] - fa[0], 0.022, 0.20);
      AB(S, FASCIA, (sa[0] + sa[1]) / 2, (HF + 0.022) / 2, sy, sa[1] - sa[0], -(HF + 0.022), 0.012);
      (ends || []).forEach(function (e) {
        AB(S, FASCIA, e, HF / 2, (sy + fTop) / 2, 0.02, -HF, fTop - sy + 0.006);
        var a = WP(S, e, HF + 0.07, tileY(S, HF + 0.07) - 0.11), b = WP(S, e, -0.01, tileY(S, -0.01) - 0.11);
        K.beam(FASCIA, a, b, 0.17, 0.02);
      });
    }
    var EAV = [
      [SL.mF, [-vg, PX0 + HF], [-vg, PX0 + HF + 0.022], [-vg + 0.01]],
      [SL.mF, [PX1 - HF, W + vg], [PX1 - HF - 0.022, W + vg], [W + vg - 0.01]],
      [SL.pL, [-HF - 0.022, PZ + vg], [0, PZ + vg], [PZ + vg - 0.01]],
      [SL.pR, [-HF - 0.022, PZ + vg], [0, PZ + vg], [PZ + vg - 0.01]],
      [SL.mR, [-vg, W + vg], [-vg, W + vg], [-vg + 0.01, W + vg - 0.01]],
      [SL.gF, [W, GX1 + vg], [W, GX1 + vg], [GX1 + vg - 0.01]],
      [SL.gR, [W, GX1 + vg], [W, GX1 + vg], [GX1 + vg - 0.01]]
    ];
    EAV.forEach(function (e) { eavesBoards(e[0], e[1], e[2], e[3]); });

    // ═══ 4. ROOF COVERING (after the gables are built up to the trusses) ═══
    K.stage('roofcover');
    var SLOPES = [SL.gF, SL.gR, SL.mF, SL.mR, SL.pL, SL.pR];
    var slopeLen = function (S) { return (S.hTop + ov) / COS; };
    var rowsOf = function (S) { return Math.ceil((slopeLen(S) - (T.l - T.gauge)) / T.gauge); };
    var rangesAt = function (S, h) { return (S.clip && S.clip(h)) || [[S.a0, S.a1]]; };
    // breathable membrane, then 25 × 50 battens at the tile gauge (cut back along the valleys)
    SLOPES.forEach(function (S) { var hm = (S.hTop - ov) / 2; SB(S, 'felt', (S.a0 + S.a1) / 2, hm, S.eY + RTOP + 0.003 / COS + hm * TP, S.a1 - S.a0, slopeLen(S), 0.004); });
    SLOPES.forEach(function (S) {
      for (var b = 0; b < rowsOf(S); b++) {
        var h = -ov + (b + 0.5) * T.gauge * COS, y = S.eY + RTOP + 0.0125 / COS + h * TP;
        rangesAt(S, h).forEach(function (g) { if (g[1] - g[0] > 0.05) SB(S, 'timber', (g[0] + g[1]) / 2, h, y, g[1] - g[0], 0.05, 0.025); });
      }
    });
    // GRP dry valley troughs from the eaves corners to where the projection ridge meets the main slope
    [PX0 - ov, PX1 + ov].forEach(function (x) { var a = [x, eave + TPL - ov * TP - 0.022, ov], b = [PXc, pRidge + TPL - 0.022, -pHalf]; K.beam('membrane', a, lerp3(a, b, 0.93), 0.02, 0.36); });
    // concrete interlocking tiles course by course from the eaves, all slopes together (low courses first); straight bond
    // set out from the verge, cut tiles at the valleys, the abutment and the top course under the ridge
    var jobs = [];
    SLOPES.forEach(function (S) {
      var Ls = slopeLen(S), L = S.a1 - S.a0, cov = S.from ? T.cover : L / Math.max(1, Math.round(L / T.cover)), n = Math.ceil(L / cov - 1e-6);
      for (var row = 0; row < rowsOf(S); row++) (function (row) {
        var d0 = row * T.gauge, d1 = Math.min(d0 + T.l, Ls + 0.03), hc = -ov + (d0 + d1) / 2 * COS;
        if (d1 - d0 < 0.06) return;
        jobs.push({ y: tileY(S, hc), fn: function () {
          var y = tileY(S, hc) + (row % 2) * 0.0005, h0 = -ov + d0 * COS, rg = rangesAt(S, h0), ec = {};
          for (var c = 0; c < n; c++) {
            var ta = S.from ? S.a1 - (c + 1) * cov : S.a0 + c * cov, tb = ta + cov;
            rg.forEach(function (g, gi) {
              var a = Math.max(ta, g[0]), b = Math.min(tb, g[1]), col = tileCol();
              if (b - a > 0.04) SB(S, T.mat, (a + b) / 2, hc, y, b - a - 0.004, d1 - d0, T.th, { kind: 'tile', color: col }, 0.035);
              if (Math.abs(b - g[1]) < 1e-6) ec[gi + 'e'] = col; if (Math.abs(a - g[0]) < 1e-6) ec[gi + 's'] = col;
            });
          }
          // cut tiles along a valley: the cut line crosses the course diagonally, so fill it in four steps (≈ 85 × 105 mm)
          if (S.vcut) S.vcut(h0, -ov + d1 * COS).forEach(function (v) {
            var sTop = d0 + (v.h1 - h0) / COS, ce = Math.cos(PR + 0.035), se = Math.sin(PR + 0.035), dc = (d0 + d1) / 2;
            for (var k = 0; k < 4; k++) {
              var sa = d0 + (sTop - d0) * k / 4, sb = d0 + (sTop - d0) * (k + 1) / 4, am = v.a + (v.b - v.a) * (k + 0.5) / 4, ds = (sa + sb) / 2 - dc;
              if (Math.abs(am - v.a) > 0.01) SB(S, T.mat, (v.a + am) / 2, hc + ds * ce, y + ds * se, Math.abs(am - v.a), sb - sa, T.th, { color: ec[v.key] || tileCol() }, 0.035);
            }
          });
        } });
      })(row);
    });
    jobs.sort(function (p, q) { return p.y - q.y; }).forEach(function (j) { j.fn(); });
    // half-round ridge tiles (450 long, edges bedded on the top course) with dry-ridge end caps at the verges
    var RY0 = TPL + T.th / 2 / COS - 0.135 * TP + 0.008, CAPY = TPL + T.th / 2 / COS - 0.014;
    function ridgeRun(x0, z0, x1, z1, y) {
      var L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.45)), e = 0.003 / L;
      for (var i = 0; i < n; i++) {
        var t0 = i / n + e, t1 = (i + 1) / n - e;
        K.tube('ridge', [x0 + (x1 - x0) * t0, y, z0 + (z1 - z0) * t0], [x0 + (x1 - x0) * t1, y, z0 + (z1 - z0) * t1], 0.135, { kind: 'tile', color: tileCol() }).sx = 0.30;
      }
    }
    ridgeRun(0, -D / 2, W, -D / 2, ridge + RY0);
    ridgeRun(PXc, -pHalf + 0.10, PXc, PZ, pRidge + RY0);
    ridgeRun(W, GZm, GX1, GZm, gRidge + RY0);
    [[-vg + 0.025, -D / 2, ridge, 1], [W + vg - 0.025, -D / 2, ridge, 1], [PXc, PZ + vg - 0.025, pRidge, 0], [GX1 + vg - 0.025, GZm, gRidge, 1]].forEach(function (c) {
      K.tri(FASCIA, c[0], c[2] + CAPY, c[1], 0.34, 0.21, 0.05, c[3] ? { ry: Math.PI / 2 } : {});
    });
    // dry verge units clipped over the verge tiles, one per course
    function vergeUnits(S, a) {
      var Ls = slopeLen(S);
      for (var d0 = 0; d0 < Ls - 0.05; d0 += T.gauge) {
        var d1 = Math.min(d0 + T.gauge + 0.015, Ls + 0.02), hc = -ov + (d0 + d1) / 2 * COS;
        SB(S, 'upvcBlack', a, hc, tileY(S, hc) - 0.032, 0.035, d1 - d0, 0.09, {});
      }
    }
    [SL.mF, SL.mR].forEach(function (S) { vergeUnits(S, -vg - 0.0175); vergeUnits(S, W + vg + 0.0175); });
    [SL.pL, SL.pR].forEach(function (S) { vergeUnits(S, PZ + vg + 0.0175); });
    [SL.gF, SL.gR].forEach(function (S) { vergeUnits(S, GX1 + vg + 0.0175); });
    // garage roof abutment: lead cover flashing over the tiles and stepped flashing tucked into the house bed joints
    [SL.gF, SL.gR].forEach(function (S) {
      var hm = (S.hTop - ov) / 2, ts = T.th / 2 / COS, b0 = tileY(S, 0) + ts;
      SB(S, 'lead', W + 0.075, hm, tileY(S, hm) + ts + 0.004, 0.15, slopeLen(S), 0.005);
      for (var k = Math.floor((b0 - ov * TP - y0) / CH); k < 400; k++) {
        var yc = y0 + k * CH, h1 = Math.max(-ov, (yc - b0) / TP), h2 = Math.min(S.hTop, (yc + CH - b0) / TP);
        if (h1 >= S.hTop) break;
        if (h2 - h1 < 0.01) continue;
        var yb = Math.max(yc, b0 + h1 * TP) - 0.012;
        AB(S, 'lead', W + 0.003, (h1 + h2) / 2, (yb + yc + 2 * CH) / 2, 0.005, h2 - h1, yc + 2 * CH - yb);
      }
    });

    // ═══ 5. RAINWATER GOODS, PV, SVP (fit-out) ═══
    K.stage('fitout');
    function gutterRun(S, a0, a1) { var gt = S.eY + RTOP + HF * TP + 0.005; AB(S, 'gutter', (a0 + a1) / 2, HF - 0.0575, gt - 0.0375, a1 - a0, 0.115, 0.075); }
    // 65 mm square downpipe: outlet, swan-neck under the soffit back to the wall, clips at 1.5 m, shoe over a trapped gully
    function downpipe(S, a) {
      var gb = S.eY + RTOP + HF * TP + 0.005 - 0.075, hg = HF - 0.0575, hp = -0.045, y1 = gb - 0.12, y2 = y1 - (hp - hg), e = 0.022;
      AB(S, 'gutter', a, hg, gb - 0.03, 0.08, 0.08, 0.06);
      AB(S, 'gutter', a, hg, (gb + y1) / 2, 0.065, 0.065, gb - y1 + 0.02);
      K.beam('gutter', WP(S, a, hg - e, y1 + e), WP(S, a, hp + e, y2 - e), 0.065, 0.065);
      AB(S, 'gutter', a, hp, (y2 + 0.2) / 2, 0.065, 0.065, y2 - 0.2);
      for (var cy = 0.55; cy < y2 - 0.25; cy += 1.5) AB(S, 'gutter', a, hp + 0.004, cy, 0.085, 0.075, 0.04);
      K.beam('gutter', WP(S, a, hp, 0.24), WP(S, a, hp - 0.085, 0.12), 0.065, 0.065);
      AB(S, 'gutter', a, hp - 0.10, 0.04, 0.22, 0.22, 0.06);
      AB(S, 'steel', a, hp - 0.10, 0.072, 0.16, 0.16, 0.006);
    }
    gutterRun(SL.mF, -vg, PX0 - GOUT); gutterRun(SL.pL, GIN, PZ + vg - 0.01); gutterRun(SL.pR, GIN, PZ + vg - 0.01); gutterRun(SL.mF, PX1 + GOUT, W + vg);
    gutterRun(SL.mR, -vg, W + vg); gutterRun(SL.gF, W + 0.005, GX1 + vg); gutterRun(SL.gR, W + 0.005, GX1 + vg);
    downpipe(SL.pL, PZ - 0.12); downpipe(SL.mF, W - 0.10); downpipe(SL.mR, 0.25); downpipe(SL.mR, W - 0.25);
    downpipe(SL.gF, GX1 - 0.15); downpipe(SL.gR, GX1 - 0.15);
    // 8 × 400 W all-black PV modules (1722 × 1134, portrait) on rails, ≥ 0.4 m clear of the verge and the valley
    var PW = 1.134, PLn = 1.722, pvA1 = W + vg - 0.42, pvA0 = pvA1 - 4 * PW - 3 * 0.02, pvD0 = 0.85;
    var onPV = function (d, lift) { var h = -ov + d * COS; return [h, tileY(SL.mF, h) + lift]; };
    [[pvD0 + 0.30, 0.05], [pvD0 + PLn - 0.30, 0.05], [pvD0 + PLn + 0.32, 0.05], [pvD0 + 2 * PLn - 0.28, 0.05]].forEach(function (rl) {
      var q = onPV(rl[0], rl[1]); SB(SL.mF, 'metal', (pvA0 + pvA1) / 2, q[0], q[1], pvA1 - pvA0 + 0.10, 0.04, 0.04);
    });
    for (var pr = 0; pr < 2; pr++) for (var pc = 0; pc < 4; pc++) {
      var pa = pvA0 + pc * (PW + 0.02) + PW / 2, pd = pvD0 + pr * (PLn + 0.02) + PLn / 2, q = onPV(pd, 0.10);
      SB(SL.mF, 'curtain', pa, q[0], q[1], PW - 0.04, PLn - 0.04, 0.03, { color: 0x1b2633 });
      [-1, 1].forEach(function (s) {
        var qe = onPV(pd + s * (PLn / 2 - 0.02), 0.10); SB(SL.mF, 'upvcBlack', pa, qe[0], qe[1], PW, 0.04, 0.04);
        SB(SL.mF, 'upvcBlack', pa + s * (PW / 2 - 0.02), q[0], q[1], 0.04, PLn - 0.08, 0.04);
      });
      SB(SL.mF, 'metal', pa, q[0], q[1] + 0.004, PW - 0.06, 0.006, 0.03, { color: 0x56606a });
    }
    // soil-and-vent pipe through the rear slope with a weathering collar and cage
    var svh = 1.25, sv = WP(SL.mR, 5.4, svh, 0), svy = tileY(SL.mR, svh);
    SB(SL.mR, 'lead', 5.4, svh, svy + 0.016, 0.40, 0.46, 0.008);
    K.cyl('gutter', sv[0], svy + 0.20, sv[2], 0.055, 0.56, {});
    K.cyl('gutter', sv[0], svy + 0.50, sv[2], 0.068, 0.07, {});

    // ═══ 6. OPENINGS FIT-OUT NOT COVERED BY THE KIT ═══
    function RB(r, mat, u, d, y, su, sy, sd, o) { var p = RP(r, u, d); return K.box(mat, p[0], y, p[1], su, sy, sd, Object.assign({ ry: K._ry(r) }, o || {})); }
    // rear French doors: frame with a low threshold, two glazed leaves (stiles, rails, handles at the meeting stiles), step
    (function () {
      var r = runs[6], o = OPS[6][1], fw = 0.07, d0 = 0.13, uc = (o.u0 + o.u1) / 2, h = o.v1 - o.v0;
      RB(r, FRAME, uc, d0, o.v1 - fw / 2, o.u1 - o.u0, fw, 0.07);
      RB(r, FRAME, uc, d0 - 0.01, o.v0 + 0.02, o.u1 - o.u0, 0.04, 0.09);
      [o.u0 + fw / 2, o.u1 - fw / 2].forEach(function (u) { RB(r, FRAME, u, d0, (o.v0 + o.v1) / 2, fw, h, 0.07); });
      [[o.u0 + fw, uc - 0.002], [uc + 0.002, o.u1 - fw]].forEach(function (lf, i) {
        var a = lf[0], b = lf[1], lc = (a + b) / 2, lw = b - a, sw = 0.085, ya = o.v0 + 0.04, yt = o.v1 - fw, dl = d0 - 0.008;
        RB(r, FRAME, lc, dl, yt - sw / 2, lw, sw, 0.06); RB(r, FRAME, lc, dl, ya + 0.06, lw, 0.12, 0.06);
        RB(r, FRAME, a + sw / 2, dl, (ya + yt) / 2, sw, yt - ya, 0.06); RB(r, FRAME, b - sw / 2, dl, (ya + yt) / 2, sw, yt - ya, 0.06);
        RB(r, 'glass', lc, d0, (ya + 0.12 + yt - sw) / 2, lw - 2 * sw, yt - sw - ya - 0.12, 0.024, { lightsOn: 1 });
        RB(r, 'metal', i ? a + 0.045 : b - 0.045, dl - 0.04, 1.05, 0.02, 0.20, 0.025);
      });
      RB(r, 'stone', uc, -0.15, 0.075, o.u1 - o.u0 + 0.20, 0.15, 0.30, { stage: 'external' });
    })();
    // obscured glazing to the WC, en-suite, bathroom and landing windows
    Object.keys(OPS).forEach(function (ri) { OPS[ri].forEach(function (o) {
      if (o.obscure) RB(runs[ri], 'glass', (o.u0 + o.u1) / 2, 0.15, (o.v0 + o.v1) / 2, o.u1 - o.u0 - 0.14, o.v1 - o.v0 - 0.14, 0.006, { color: 0xe3eaee });
    }); });

    // ═══ 7. PORCH CANOPY: tiled apex on anthracite gallows brackets, black GRP pediment and soffit, lead flashing ═══
    var CAN = (function () {
      var o = OPS[4][0], xc = PX1 + (o.u0 + o.u1) / 2, w = 1.56, d = 0.92, yb = HD + 4 * CH, cp = 40 * RAD, ct = Math.tan(cp), half = w / 2, rise = half * ct;
      var CC = Math.cos(cp), tl = 0.25, tg = 0.10, tc = 0.155, Ls = (half + 0.06) / CC, dz = d + 0.04;
      K.stage('fitout');
      [xc - half + 0.07, xc + half - 0.07].forEach(function (x) {
        K.box(FRAME, x, yb - 0.27, 0.03, 0.07, 0.54, 0.06, {});
        K.box(FRAME, x, yb - 0.035, d / 2 + 0.01, 0.07, 0.07, d - 0.02, {});
        K.beam(FRAME, [x, yb - 0.50, 0.06], [x, yb - 0.07, d - 0.16], 0.06, 0.06);
      });
      K.box(FASCIA, xc, yb + 0.01, d / 2, w + 0.12, 0.02, d, {});
      [-1, 1].forEach(function (sd) {
        K.box(FASCIA, xc + sd * (half + 0.05), yb + 0.04, dz / 2, 0.02, 0.10, dz, {});
        K.beam(FASCIA, [xc + sd * (half + 0.07), yb + 0.03, d + 0.035], [xc, yb + 0.11 + rise, d + 0.035], 0.12, 0.022);
        K.beam('lead', [xc + sd * (half + 0.06), yb + 0.08, 0.006], [xc, yb + 0.12 + rise, 0.006], 0.11, 0.008);
      });
      K.tri(FASCIA, xc, yb + 0.06 + rise / 2, d + 0.005, w, rise, 0.03, {});
      K.cyl('gold', xc, yb - 0.004, d / 2, 0.04, 0.01, {});
      [-1, 1].forEach(function (sd) {
        for (var row = 0; row * tg < Ls - 0.04; row++) {
          var d0 = row * tg, d1 = Math.min(d0 + tl, Ls + 0.02), hx = -0.06 + (d0 + d1) / 2 * CC;
          var x = xc + sd * (half - hx), y = yb + 0.08 + hx * ct + (row % 2) * 0.0005;
          for (var zc = row % 2 ? -tc / 2 : 0; zc < dz - 0.02; zc += tc) {
            var za = Math.max(0, zc), z1 = Math.min(zc + tc, dz);
            if (z1 - za > 0.03) K.box('tileConcrete', x, y, (za + z1) / 2, d1 - d0, 0.012, z1 - za - 0.003, { rz: sd < 0 ? cp + 0.04 : -(cp + 0.04), kind: 'tile', color: tileCol() });
          }
        }
      });
      K.tube('ridge', [xc, yb + 0.06 + rise + 0.035, 0.0], [xc, yb + 0.06 + rise + 0.035, dz], 0.07, { kind: 'tile', color: tileCol() }).sx = 0.12;
      K.env(xc - half - 0.07, yb - 0.55, 0, xc + half + 0.07, yb + rise + 0.15, dz);
      return { xc: xc, half: half, yb: yb };
    })();

    // ═══ 8. INTERIOR FINISHES SEEN THROUGH THE GLAZING ═══
    K.stage('fitout');
    [[WALL, -D + WALL, W - WALL, -WALL], [PX0 + WALL, -WALL, PX1 - WALL, PZ - WALL]].forEach(function (f, i) {
      var cx = (f[0] + f[2]) / 2, cz = (f[1] + f[3]) / 2, fw = f[2] - f[0], fd = f[3] - f[1];
      K.box('timber', cx, UK.DPC + 0.012, cz, fw, 0.024, fd, { color: 0x9a7a57 });                     // engineered oak
      K.box('render', cx, floor1 - 0.2075, cz, fw, 0.0125, fd, { color: 0xecebe6 });                 // plasterboard ceilings
      K.box('timber', cx, floor1 + 0.028, cz, fw, 0.012, fd, { color: 0x8c8780 });                   // carpet
      K.box('render', cx, eave + 0.044, cz, fw, 0.0125, fd, { color: 0xecebe6 });
    });
    // plaster skim on the inner leaf (cut round the openings) and stud partitions, so the glazing shows rooms, not blockwork
    var PLW = 0xe7e3da, STY = [[UK.DPC + 0.024, floor1 - 0.2075], [floor1 + 0.034, eave + 0.044]];
    runs.forEach(function (r, ri) {
      var u0 = r.convexStart ? WALL : -WALL, u1 = r.convexEnd ? r.L - WALL : r.L + WALL, ops = OPS[ri] || [];
      STY.forEach(function (st) {
        var ys = [st[0], st[1]];
        ops.forEach(function (o) { [o.v0, o.v1].forEach(function (v) { if (v > st[0] + 1e-6 && v < st[1] - 1e-6) ys.push(v); }); });
        ys.sort(function (a, b) { return a - b; });
        for (var i = 0; i < ys.length - 1; i++) {
          if (ys[i + 1] - ys[i] < 0.01) continue;
          H._courseSegments(u0, u1, ys[i], ys[i + 1], ops, null).forEach(function (sg) {
            if (sg[1] - sg[0] > 0.02) RB(r, 'render', (sg[0] + sg[1]) / 2, WALL + 0.0065, (ys[i] + ys[i + 1]) / 2, sg[1] - sg[0], ys[i + 1] - ys[i], 0.013, { color: PLW });
          });
        }
      });
    });
    var part = function (x0, z0, x1, z1, s) { var y = STY[s]; K.box('render', (x0 + x1) / 2, (y[0] + y[1]) / 2, (z0 + z1) / 2, Math.max(0.10, x1 - x0), y[1] - y[0], Math.max(0.10, z1 - z0), { color: 0xdcd7cc }); };
    var ZS = -4.35, IW = WALL;
    [[IW, 3.5], [4.4, 6.3], [7.2, W - IW]].forEach(function (x) { part(x[0], ZS, x[1], ZS, 0); });           // ground: spine wall
    part(4.875, ZS, 4.875, -IW, 0); part(6.55, ZS, 6.55, -IW, 0); part(6.6, -1.65, 7.65, -1.65, 0); part(7.65, -1.65, 7.65, -IW, 0);
    [[IW, 3.6], [4.5, W - IW]].forEach(function (x) { part(x[0], ZS, x[1], ZS, 1); });                        // first: landing, bedrooms
    part(4.875, ZS, 4.875, -IW, 1); part(6.30, -2.2, 6.30, -IW, 1); part(4.875, -2.2, 6.30, -2.2, 1);
    part(3.9, -D + IW, 3.9, ZS, 1); part(6.1, -D + IW, 6.1, ZS, 1);

    // ═══ 9. SERVICES AND SMALL FITTINGS ═══
    K.stage('fitout');
    var R7 = runs[7], R4 = runs[4], R6 = runs[6];
    // meter boxes on the left flank in front of the side gate: recessed electric cabinet, half-height gas box
    RB(R7, 'upvc', D - 0.75, -0.004, 0.85, 0.44, 0.64, 0.01, { color: 0xd9d7d0 }); RB(R7, 'upvc', D - 0.75, -0.011, 0.85, 0.40, 0.60, 0.006);
    RB(R7, 'upvcBlack', D - 0.75 + 0.15, -0.016, 0.85, 0.02, 0.05, 0.006);
    RB(R7, 'upvc', D - 1.35, -0.06, 0.32, 0.48, 0.52, 0.12, { color: 0xd9d7d0 }); RB(R7, 'upvc', D - 1.35, -0.122, 0.32, 0.44, 0.48, 0.006);
    RB(R7, 'upvcBlack', D - 1.35 + 0.16, -0.127, 0.32, 0.02, 0.05, 0.006);
    // condensing-boiler balanced flue (white terminal + rosette) and its condensate pipe, rear of the left flank
    RB(R7, 'upvc', 1.6, -0.004, 1.95, 0.17, 0.17, 0.008);
    K.tube('upvc', [-0.005, 1.95, -D + 1.6], [-0.20, 1.95, -D + 1.6], 0.050); K.tube('upvc', [-0.20, 1.95, -D + 1.6], [-0.27, 1.95, -D + 1.6], 0.063);
    K.tube('upvc', [-0.025, 1.86, -D + 1.85], [-0.025, 0.12, -D + 1.85], 0.012);
    // plastic air bricks to the sub-floor void, one course under the DPC
    [[0, [0.45]], [2, [0.5, 3.3]], [4, [2.2, 3.8]], [5, [6.8]], [6, [0.6, 3.0, 6.0, 9.2]], [7, [1.0, 3.5, 6.5]]].forEach(function (ab) {
      ab[1].forEach(function (u) { RB(runs[ab[0]], 'upvcBlack', u, -0.003, 0.1175, 0.215, 0.065, 0.008, { color: 0x3f3730 }); });
    });
    // EV charge point (Part S) on the garage pier by the drive, conduit to ground
    RB(gF, 'upvcGrey', 0.225, -0.055, 1.15, 0.20, 0.34, 0.11); RB(gF, 'gold', 0.225, -0.112, 1.22, 0.02, 0.09, 0.004);
    RB(gF, 'upvcBlack', 0.225, -0.10, 0.98, 0.10, 0.08, 0.06); RB(gF, 'upvcGrey', 0.30, -0.02, 0.50, 0.03, 0.96, 0.03);
    K.stage('snag');
    // house number, wall lanterns, video doorbell
    RB(R4, 'doorBlack', 0.225, -0.008, 1.55, 0.21, 0.15, 0.012);
    RB(R4, 'brass', 0.17, -0.016, 1.55, 0.016, 0.09, 0.004);                                                   // "1"
    [[0.26, 1.590, 0.05, 0.013], [0.278, 1.570, 0.013, 0.04], [0.26, 1.550, 0.05, 0.013], [0.242, 1.530, 0.013, 0.04], [0.26, 1.510, 0.05, 0.013]]
      .forEach(function (g) { RB(R4, 'brass', g[0], -0.016, g[1], g[2], g[3], 0.004); });                       // "2"
    [[R4, CAN.xc + CAN.half + 0.12 - PX1, 1.85], [R6, 5.65, 2.05]].forEach(function (l) {
      RB(l[0], 'upvcBlack', l[1], -0.06, l[2], 0.12, 0.24, 0.12); RB(l[0], 'gold', l[1], -0.06, l[2] - 0.01, 0.085, 0.16, 0.125);
      RB(l[0], 'upvcBlack', l[1], -0.06, l[2] + 0.135, 0.15, 0.03, 0.15);
    });
    RB(R4, 'upvcBlack', 1.53, -0.013, 1.30, 0.045, 0.13, 0.025); RB(R4, 'metal', 1.53, -0.027, 1.34, 0.025, 0.025, 0.004);

    // ═══ 10. LANDSCAPING (open-plan front, herringbone drive, enclosed rear garden) ═══
    var BX0 = -1.35, BX1 = GX1 + 1.15, BZF = 6.30, BZR = -D - 10.5;           // plot boundary: left, right, back of footway, rear
    var DX0 = 7.35, DX1 = 13.35, DZ = 0.15;                                    // drive: left/right edging lines, house-side edge
    K.stage('external');
    // drive: 200 × 100 blocks in 45° herringbone inside a charcoal soldier-course edging, on a sand bed (cut blocks read as bed)
    K.box('blockPaving', (DX0 + DX1) / 2, 0.022, (DZ + BZF) / 2, DX1 - DX0, 0.036, BZF - DZ, { color: 0x6e5d4f });
    K.box('blockPaving', (W + DX1) / 2, 0.022, (GZ0 + DZ) / 2, DX1 - W, 0.036, DZ - GZ0, { color: 0x6e5d4f });
    var inDrive = function (x, z) { return (x > DX0 + 0.10 && x < DX1 - 0.10 && z > DZ && z < BZF - 0.10) || (x > W && x < DX1 - 0.10 && z > GZ0 && z <= DZ + 1e-6); };
    var HC = Math.SQRT1_2, ep = [HC, -HC], eq = [HC, HC], OX = (DX0 + DX1) / 2, OZ = (DZ + BZF) / 2, PAVE = [0x7d6a5a, 0x6b5a4c, 0x8a7766, 0x5d4f45, 0x76655a];
    var hb = function (pc, qc, sp, sq) {
      var cx = OX + 0.1 * (pc * ep[0] + qc * eq[0]), cz = OZ + 0.1 * (pc * ep[1] + qc * eq[1]), ok = true;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s) { if (ok && !inDrive(cx + s[0] * sp * 0.05 * ep[0] + s[1] * sq * 0.05 * eq[0], cz + s[0] * sp * 0.05 * ep[1] + s[1] * sq * 0.05 * eq[1])) ok = false; });
      if (ok) K.box('blockPaving', cx, 0.03, cz, sp * 0.1 - 0.004, 0.04, sq * 0.1 - 0.004, { ry: Math.PI / 4, color: PAVE[Math.floor(K.rand() * PAVE.length)] });
    };
    for (var t = -60; t <= 60; t++) for (var m = Math.floor((-60 - t) / 4); m <= Math.ceil((60 - t) / 4); m++) {
      var p0 = t + 4 * m;
      hb(p0 + 1, t + 0.5, 2, 1); hb(p0 + 0.5, t + 2, 1, 2);
    }
    for (var ez = DZ + 0.05; ez < BZF - 0.05; ez += 0.20) [DX0 + 0.05, DX1 - 0.05].forEach(function (x) { K.box('blockPaving', x, 0.03, ez + 0.05, 0.096, 0.04, 0.196, { color: 0x3d3a38 }); });
    for (var ex = DX0; ex < DX1 - 0.05; ex += 0.20) K.box('blockPaving', ex + 0.10, 0.03, BZF - 0.05, 0.196, 0.04, 0.096, { color: 0x3d3a38 });
    K.box('gravel', (DX0 + W) / 2, 0.025, DZ / 2, W - DX0, 0.03, DZ, {});                       // drip strip along the house front
    // slab paths: door to the drive, down the left flank to the side gate and garden; right passage; rear patio
    K.paving(PX1 + 0.08, DZ, DX0, 1.35); K.paving(BX0 + 0.10, -D, -0.05, 1.15); K.paving(GX1 + 0.05, GZ1, BX1 - 0.05, -1.20);
    K.paving(2.40, -D - 3.60, 7.80, -D);
    K.stage('external');
    K.box('soil', (PX1 + 0.08 - 0.05) / 2, 0.016, 0.575, PX1 + 0.13, 0.03, 1.15, { color: 0x3b2c22 });   // bark-mulched bed along the front
    K.box('soil', (DX1 + BX1) / 2, 0.016, (-1.2 + BZF) / 2, BX1 - DX1, 0.03, BZF + 1.2, { color: 0x3b2c22 });
    K.lawn(BX0, 1.15, PX1 + 0.08, BZF); K.lawn(PX1 + 0.08, 1.35, DX0, BZF);
    K.lawn(BX0, BZR, BX1, -D); K.lawn(W, -D, BX1, GZ1);
    // boundary: close-board fences with timber side gates (ledged and braced), low hedge to the open-plan front
    K.fence([[BX0, -1.60], [BX0, BZR], [BX1, BZR], [BX1, -1.20]], 1.80);
    function gate(x0, z0, x1, z1, h, side) {
      K.stage('external');
      var L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, ry = Math.atan2(-uz, ux), nx = uz * side, nz = -ux * side;
      var at = function (u, o) { return [x0 + ux * u + nx * o, z0 + uz * u + nz * o]; };
      var pp = at(L - 0.06, 0); K.box('fencePost', pp[0], (h + 0.10) / 2, pp[1], 0.10, h + 0.10, 0.10, {}); K.box('fencePost', pp[0], h + 0.115, pp[1], 0.13, 0.03, 0.13, {});
      for (var u = 0.07; u < L - 0.16; u += 0.10) { var b = at(u + 0.05, 0); K.box('fence', b[0], 0.06 + (h - 0.08) / 2, b[1], 0.096, h - 0.08, 0.022, { ry: ry, color: [0x7a5434, 0x6f4b2e, 0x80583a][Math.floor(K.rand() * 3)] }); }
      var gw = L - 0.20, gc = 0.07 + gw / 2;
      [0.25, h / 2, h - 0.25].forEach(function (y) { var c = at(gc, -0.03); K.box('fence', c[0], y, c[1], gw, 0.095, 0.03, { ry: ry, color: 0x5e4029 }); });
      var b0 = at(0.12, -0.03), b1 = at(L - 0.20, -0.03); K.beam('fence', [b0[0], 0.30, b0[1]], [b1[0], h / 2 - 0.05, b1[1]], 0.09, 0.03, { color: 0x5e4029 });
      var lt = at(L - 0.22, 0.03); K.box('metal', lt[0], 1.05, lt[1], 0.12, 0.03, 0.02, { ry: ry });
    }
    gate(BX0, -1.60, -0.02, -1.60, 1.80, 1); gate(BX1, -1.20, GX1 + 0.02, -1.20, 1.80, -1);
    K.stage('external');
    K.box('plant', BX0 + 0.25, 0.35, (1.20 + BZF) / 2, 0.45, 0.70, BZF - 1.20, { color: 0x2f5a2c });
    // street: footway, kerb (dropped at the crossover), carriageway, street light
    K.paving(-4.2, BZF, 18.0, BZF + 1.8);
    K.stage('external');
    [[-4.2, DX0 - 0.6, 0.14], [DX0 - 0.6, DX1 + 0.6, 0.05], [DX1 + 0.6, 18.0, 0.14]].forEach(function (k) { K.box('stone', (k[0] + k[1]) / 2, k[2] / 2, BZF + 1.875, k[1] - k[0], k[2], 0.15, { color: 0xb9b5ab }); });
    K.box('membrane', 6.9, 0.006, BZF + 5.0, 22.2, 0.012, 6.2, {});
    for (var lx = -3.5; lx < 18; lx += 3.0) K.box('upvc', lx, 0.013, BZF + 5.0, 1.5, 0.004, 0.10, {});
    K.cyl('upvcGrey', -2.6, 3.0, BZF + 1.55, 0.07, 6.0, {}); K.beam('upvcGrey', [-2.6, 5.9, BZF + 1.55], [-2.6, 6.05, BZF + 2.45], 0.08, 0.08);
    K.box('upvcGrey', -2.6, 6.0, BZF + 2.5, 0.25, 0.10, 0.5, {}); K.box('gold', -2.6, 5.945, BZF + 2.5, 0.18, 0.02, 0.4, {});
    // garden shed (shiplap, felted apex roof), rotary dryer, bins in the side passage
    (function () {
      var x0 = 11.55, x1 = 13.95, z0 = BZR + 0.35, z1 = BZR + 2.15, h = 1.95, sx = (x0 + x1) / 2, sz = (z0 + z1) / 2;
      K.box('concrete', sx, 0.05, sz, x1 - x0 + 0.2, 0.10, z1 - z0 + 0.2, {});
      for (var y = 0.10; y < h - 0.01; y += 0.125) K.box('fence', sx, y + 0.0625, sz, x1 - x0, 0.12, z1 - z0, { color: [0x7d5a3a, 0x75533a, 0x83603f][Math.floor(K.rand() * 3)] });
      K.box('fence', sx - 0.3, 1.0, z1 + 0.012, 0.80, 1.80, 0.025, { color: 0x6a4a30 }); K.box('glass', sx + 0.65, 1.35, z1 + 0.01, 0.60, 0.45, 0.02, {});
      [-1, 1].forEach(function (s) { K.box('felt', sx, h + 0.22, sz + s * 0.47, x1 - x0 + 0.2, 0.03, 1.10, { rx: s * 0.44 }); });
      K.tri('fence', sx - (x1 - x0) / 2 + 0.03, h + 0.21, sz, 0.06, 0.42, z1 - z0, { ry: Math.PI / 2, color: 0x7d5a3a }); K.tri('fence', sx + (x1 - x0) / 2 - 0.03, h + 0.21, sz, 0.06, 0.42, z1 - z0, { ry: Math.PI / 2, color: 0x7d5a3a });
      K.cyl('metal', 6.4, 0.9, -D - 7.0, 0.02, 1.8, {});
      for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2 + 0.4; K.tube('metal', [6.4, 1.70, -D - 7.0], [6.4 + 1.3 * Math.cos(a), 1.80, -D - 7.0 + 1.3 * Math.sin(a)], 0.012); }
      [0.55, 0.95, 1.3].forEach(function (rr) { for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2 + 0.4, b = a + Math.PI / 2;
        K.tube('string', [6.4 + rr * Math.cos(a), 1.79, -D - 7.0 + rr * Math.sin(a)], [6.4 + rr * Math.cos(b), 1.79, -D - 7.0 + rr * Math.sin(b)], 0.003, { color: 0xdedede }); } });
    })();
    K.bin(BX1 - 0.52, -2.0, Math.PI / 2, 'binBlack'); K.bin(BX1 - 0.52, -2.75, Math.PI / 2, 'binGreen'); K.bin(BX1 - 0.52, -3.5, Math.PI / 2, 'binBlue');
    K.tree(1.9, 4.3, 5.0); K.tree(9.6, BZR + 1.0, 6.0); K.tree(BX1 - 0.9, BZR + 6.0, 5.0);
    [[0.42, 0.62, 0.32], [1.25, 0.98, 0.24], [4.45, 0.98, 0.24], [2.85, 0.98, 0.20], [14.0, 2.8, 0.20], [14.0, 4.7, 0.20],
     [BX0 + 0.6, BZR + 3.5, 0.5], [BX0 + 0.6, BZR + 5.2, 0.45], [BX1 - 0.6, BZR + 4.5, 0.5], [3.2, BZR + 0.7, 0.45], [5.0, BZR + 0.7, 0.4]]
      .forEach(function (s) { K.shrub(s[0], s[1], s[2]); });
    // neighbours as faint blueprint ghosts
    K.ghostHouse(-14.0, -4.1, -D, 0, eave, ridge, 'x'); K.ghostHouse(17.5, 27.4, -D, 0, eave, ridge, 'x');

    // ═══ 11. TIDY-UP PASSES ON KIT OUTPUT ═══
    fixSlivers();
    // wallLoop's mortar segments end flush with the corner/reveal brick ends (coplanar faces z-fight as light "teeth"): pull them back 2 mm
    K.items.forEach(function (it) { if (it.m === 'mortar' && !it.g && it.sx > 0.03) it.sx -= 0.004; });
    // composite door mouldings: the kit's 0xdddddd tint now renders literally white; use a lighter shade of the door colour
    K.items.forEach(function (it) { if (it.m === 'doorGrey' && it.c === 0xdddddd) it.c = 0x5a6067; });
    K.stage('masonry');
    K.env(-vg, eave, -D - ov, W + vg, ridge + 0.1, ov, { k: 'gable', axis: 'x' }); K.env(PX0 - ov, eave, 0, PX1 + ov, pRidge + 0.1, PZ + vg, { k: 'gable', axis: 'z' }); K.env(W, gEave, GZ1 - ov, GX1 + vg, gRidge + 0.1, GZ0 + ov, { k: 'gable', axis: 'z' });
    K.anchor('front', W / 2, 1.5, 0); K.anchor('top', W / 2, ridge, -D / 2);
    return {
      name: 'Modern detached house',
      info: { storeys: 2, bedrooms: 4, frontage: GX1, width: W, depth: D, eave: eave, ridge: ridge, pitch: pitch, garage: [GX1 - GX0, GD], projection: PZ }
    };

    // Block-cut slivers (< 100 mm) beside openings and on gable rakes: take the cut from the neighbouring block so both pieces
    // are ≥ 100 mm (as a bricklayer sets out); an isolated sliver becomes non-counted infill.
    function fixSlivers() {
      var groups = {};
      K.items.forEach(function (it) {
        if (it.k !== 'block' || it.g) return;
        var alongX = Math.abs(Math.cos(it.ry)) > 0.5, key = Math.round(it.y * 400) + (alongX ? 'x' : 'z') + Math.round((alongX ? it.z : it.x) * 200);
        (groups[key] = groups[key] || []).push({ it: it, ax: alongX });
      });
      Object.keys(groups).forEach(function (key) {
        var g = groups[key], ax = g[0].ax, c = function (e) { return ax ? e.it.x : e.it.z; }, set = function (e, lo, hi) { if (ax) e.it.x = (lo + hi) / 2; else e.it.z = (lo + hi) / 2; e.it.sx = hi - lo; };
        g.sort(function (p, q) { return c(p) - c(q); });
        g.forEach(function (e, i) {
          var L = e.it.sx; if (L >= UK.KW - 0.0005) return;
          var lo = c(e) - L / 2, hi = c(e) + L / 2, nb = null, side = 0;
          [i - 1, i + 1].forEach(function (j, s) {
            if (nb || j < 0 || j >= g.length) return;
            var n = g[j], nl = c(n) - n.it.sx / 2, nh = c(n) + n.it.sx / 2;
            if (n.it.sx >= 0.21 && (s ? nl - hi : lo - nh) < 0.02) { nb = n; side = s ? 1 : -1; }
          });
          if (!nb) { e.it.k = ''; return; }
          var need = UK.KW - L + 0.001, nl2 = c(nb) - nb.it.sx / 2, nh2 = c(nb) + nb.it.sx / 2;
          if (side > 0) { set(e, lo, hi + need); set(nb, nl2 + need, nh2); } else { set(e, lo - need, hi); set(nb, nl2, nh2 - need); }
        });
      });
    }

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
