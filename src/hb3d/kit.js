// ═══════════════════════════════════════════════════════════════
// HB3D KIT — pure geometry builder (no DOM, no THREE). Units: metres.
// Axes: Y up, X along the street frontage, front façade on z = 0 facing +Z, building at z ≤ 0.
// Every component is recorded as an instanced primitive (box / cyl / sph) with a material key and a
// build time t ∈ [0,1]; the viewer batches them into THREE.InstancedMesh sorted by t, so the deposit
// progress p reveals exactly the instances with t ≤ p (bricks appear course by course, tiles row by row).
// ═══════════════════════════════════════════════════════════════
var HB3D = (typeof HB3D !== 'undefined' && HB3D) || {};
(function (H) {
  'use strict';

  // ── UK construction constants (BS EN 771-1 brick, NHBC practice) ──
  var UK = H.UK = {
    BL: 0.215, BH: 0.065, BW: 0.1025, J: 0.010,          // brick work size + joint
    CL: 0.225, CH: 0.075, CW: 0.1125,                     // coordinating sizes
    KL: 0.440, KH: 0.215, KW: 0.100, KCL: 0.450, KCH: 0.225, // concrete block (inner leaf)
    CAV: 0.100,                                           // cavity (full-fill insulation)
    WALL: 0.1025 + 0.100 + 0.100,                         // 0.3025 external cavity wall
    DPC: 0.150, STOREY: 2.625, STOREY_FLAT: 3.000, STOREY_APT: 3.150,
    DOOR_W: 0.838, DOOR_H: 1.981, HEAD: 2.100,
    JOIST_W: 0.047, JOIST_D: 0.195, JOIST_C: 0.400,
    TRUSS_C: 0.600, TRUSS_W: 0.035, TRUSS_D: 0.097,
    TILES: {
      concrete: { w: 0.330, l: 0.420, gauge: 0.345, cover: 0.300, th: 0.022, mat: 'tileConcrete', bond: 'straight' },
      plain:    { w: 0.165, l: 0.265, gauge: 0.100, cover: 0.165, th: 0.012, mat: 'tileClay', bond: 'broken' },
      slate:    { w: 0.250, l: 0.500, gauge: 0.2125, cover: 0.250, th: 0.006, mat: 'slate', bond: 'broken' }
    }
  };

  // Shared build timeline (deposit progress p → construction stage)
  var STAGES = H.STAGES = [   // aligned with the app's milestone toasts: 15% ground-floor walls, 30% ground floor done, 50% first floor, 65% roof structure, 80% lights on
    { key: 'setout',    name: 'Setting out the plot',          t0: 0.00, t1: 0.03 },
    { key: 'found',     name: 'Foundations poured',            t0: 0.03, t1: 0.10 },
    { key: 'slab',      name: 'DPC and ground-floor slab',     t0: 0.10, t1: 0.12 },
    { key: 'masonry',   name: 'Brickwork rising',              t0: 0.12, t1: 0.50 },
    { key: 'roofframe', name: 'Roof structure',                t0: 0.50, t1: 0.60 },
    { key: 'roofcover', name: 'Tiling the roof',               t0: 0.60, t1: 0.72 },
    { key: 'fitout',    name: 'Windows, doors and rainwater',  t0: 0.72, t1: 0.80 },
    { key: 'external',  name: 'Landscaping and finishing',     t0: 0.80, t1: 0.95 },
    { key: 'snag',      name: 'Snagging and handover',         t0: 0.95, t1: 1.00 }
  ];
  var STAGE_BY = {}; STAGES.forEach(function (s) { STAGE_BY[s.key] = s; });
  H.stageAt = function (p) { for (var i = STAGES.length - 1; i >= 0; i--) if (p >= STAGES[i].t0) return STAGES[i]; return STAGES[0]; };

  // deterministic RNG (so a house always looks the same)
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

  // Facing-brick palettes (sRGB hex); each brick picks one with a small jitter
  var BRICKS = H.BRICKS = {
    red:      [0x9c4a33, 0xa4553a, 0x8f402c, 0xb0603f, 0x95473a, 0x7f3a2a, 0xa95c45],
    london:   [0xc9b07a, 0xbfa36a, 0xd2bb86, 0xb69a61, 0xa88d5c, 0xc4a874, 0x9f8656], // London yellow stock
    buff:     [0xc8a57a, 0xd1b089, 0xbd986b, 0xc59f74, 0xb48d62],
    brown:    [0x6e4a36, 0x7b5340, 0x664231, 0x84604a, 0x5f3d2e],
    blend:    [0xa0583c, 0x8e4c35, 0xb46c4a, 0x7d4330, 0xa9765a, 0x92523e]
  };

  function Kit(opts) {
    opts = opts || {};
    this.rand = rng(opts.seed || 7);
    this.items = [];          // all primitives
    this.anchors = {};
    this.envelope = [];       // boxes describing the finished silhouette (for blueprint edges)
    this.counts = { bricks: 0, blocks: 0, tiles: 0 };
    this.cur = 'masonry';
    this.ghostDepth = 0;
    this.brickPalette = opts.palette || 'red';
  }
  H.Kit = Kit;
  var KP = Kit.prototype;

  // ── stage / ghost control ──
  KP.stage = function (key) { if (!STAGE_BY[key]) throw new Error('unknown stage ' + key); this.cur = key; return this; };
  KP.ghost = function (fn) { this.ghostDepth++; try { fn.call(this, this); } finally { this.ghostDepth--; } return this; };
  KP.anchor = function (name, x, y, z) { this.anchors[name] = [x, y, z]; return this; };
  KP.env = function (x0, y0, z0, x1, y1, z1) { this.envelope.push([Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)]); return this; };

  // ── primitives ──
  // o: { rx, ry, rz (radians, applied Y then X then Z), stage, color (hex), hideAfter (p after which it disappears),
  //      kind ('brick'|'block'|'tile' counters), lightsOn (glow at completion) }
  KP._push = function (shape, mat, x, y, z, sx, sy, sz, o) {
    o = o || {};
    if (!(sx > 0 && sy > 0 && sz > 0)) return null;
    var it = { s: shape, m: mat, x: x, y: y, z: z, sx: sx, sy: sy, sz: sz,
      rx: o.rx || 0, ry: o.ry || 0, rz: o.rz || 0, st: o.stage || this.cur, c: o.color == null ? -1 : o.color,
      h: o.hideAfter == null ? 2 : o.hideAfter, g: this.ghostDepth > 0 ? 1 : 0, k: o.kind || '', seq: this.items.length };
    this.items.push(it);
    if (!it.g && it.k) this.counts[it.k + 's'] = (this.counts[it.k + 's'] || 0) + 1;
    return it;
  };
  KP.box = function (mat, x, y, z, sx, sy, sz, o) { return this._push('box', mat, x, y, z, sx, sy, sz, o); };       // centre-based
  KP.cyl = function (mat, x, y, z, r, h, o) { return this._push('cyl', mat, x, y, z, 2 * r, h, 2 * r, o); };        // centre-based, axis Y
  KP.sph = function (mat, x, y, z, rx, ry, rz, o) { return this._push('sph', mat, x, y, z, 2 * rx, 2 * (ry || rx), 2 * (rz || rx), o); };
  // a box between two points (beam/rafter/tube): centre, length along the segment
  KP.beam = function (mat, a, b, w, d, o) {
    var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 1e-6) return null;
    var ry = Math.atan2(-dz, dx);                            // yaw so local +X points along the horizontal projection
    var hl = Math.sqrt(dx * dx + dz * dz), rz = Math.atan2(dy, hl);  // pitch up
    o = Object.assign({}, o || {}, { ry: ry, rz: rz, rx: 0 });
    return this.box(mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, L, w, d, o);
  };
  KP.tube = function (mat, a, b, r, o) {   // cylinder between two points (scaffold tubes, downpipes)
    var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 1e-6) return null;
    // orient cylinder (axis Y) along the segment: yaw about Y, then tilt about Z
    var hl = Math.sqrt(dx * dx + dz * dz), ry = Math.atan2(-dz, dx), rz = -Math.atan2(hl, dy);
    if (hl < 1e-6) { ry = 0; rz = dy >= 0 ? 0 : Math.PI; }
    o = Object.assign({}, o || {}, { ry: ry, rz: rz });
    return this._push('cyl', mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 2 * r, L, 2 * r, o);
  };

  KP._brickColor = function (pal, dark) {
    var p = BRICKS[pal || this.brickPalette] || BRICKS.red, c = p[Math.floor(this.rand() * p.length)];
    var j = (this.rand() - 0.5) * 0.10 + (dark ? dark - 1 : 0);   // ±5% value jitter
    var r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    r = Math.max(0, Math.min(255, Math.round(r * (1 + j)))); g = Math.max(0, Math.min(255, Math.round(g * (1 + j)))); b = Math.max(0, Math.min(255, Math.round(b * (1 + j))));
    return (r << 16) | (g << 8) | b;
  };

  // ═══ MASONRY ═══
  // Lays one leaf along a straight run. Geometry: the run's OUTER face goes from (ax,az) to (bx,bz) (axis aligned);
  // `out` is the outward unit normal [nx,nz]; the leaf extends inwards by `thick`.
  // courses: [{y, h}] list (bottom of bed joint, course height); unit: 'brick' | 'block'
  // ranges per course are computed by the caller (corners, openings, gables) as [[u0,u1],...] measured from a along the face.
  KP._layRun = function (run, y, unitL, unitH, thick, segs, opt) {
    var J = UK.J, step = unitL + J, dirx = (run.bx - run.ax) / run.L, dirz = (run.bz - run.az) / run.L;
    var nx = run.out[0], nz = run.out[1], ry = Math.atan2(-dirz, dirx);
    var cy = y + J + unitH / 2;
    var self = this, uA = opt.uA, uB = opt.uB, mid = opt.mid;
    if (opt.bond === 'flemish') return this._layFlemish(run, y, thick, segs, opt);
    // bond grid: lay from both ends towards the middle (a closer is cut near the middle), as bricklayers do
    var bricks = [];
    var u = uA;
    while (u + unitL <= mid + 1e-6) { bricks.push([u, u + unitL]); u += step; }
    var leftEnd = u - J;                       // end of last full unit from the left
    var v = uB, right = [];
    while (v - unitL >= Math.max(leftEnd + J, mid) - 1e-6 && v - unitL >= uA - 1e-6) { right.push([v - unitL, v]); v -= step; }
    var rightStart = v + J;                    // start of first full unit from the right
    var gap = rightStart - J - (leftEnd + J);  // space for a closer (between joints)
    var cs = leftEnd + J;
    while (gap > unitL + J + 0.025) { bricks.push([cs, cs + unitL]); cs += step; gap -= step; }   // never stretch a closer past a whole unit
    var minCut = opt.unit === 'block' ? 0.10 : 0.025;
    if (gap > minCut * 0.25 && gap < minCut && opt.unit === 'block' && bricks.length) {   // no block slivers: take the cut from the neighbour
      var sh = minCut - gap; bricks[bricks.length - 1][1] -= sh; cs -= sh; gap = minCut;
    }
    if (gap > unitL) { var pad = (gap - unitL) / 2; bricks.push([cs + pad, cs + pad + unitL]); }   // whole unit, joints take the slack
    else if (gap > 0.025) bricks.push([cs, cs + gap]);
    for (var i = right.length - 1; i >= 0; i--) bricks.push(right[i]);
    // cut to the allowed segments (openings / gable rake)
    bricks.forEach(function (b) {
      segs.forEach(function (s) {
        var a = Math.max(b[0], s[0]), e = Math.min(b[1], s[1]);
        if (e - a < 0.03) return;                // too small to cut — left as a mortar joint
        var uc = (a + e) / 2, L = e - a;
        var px = run.ax + dirx * uc - nx * thick / 2, pz = run.az + dirz * uc - nz * thick / 2;
        if (opt.unit === 'brick') {
          self.box(opt.mat || 'brick', px, cy, pz, L, unitH, thick, { ry: ry, color: opt.color ? opt.color() : self._brickColor(opt.palette), kind: 'brick' });
        } else {
          self.box(opt.mat || 'block', px, cy, pz, L, unitH, thick, { ry: ry, color: blockColor(self.rand), kind: opt.unit === 'block' ? 'block' : '' });
        }
      });
    });
    // mortar bed + perpends behind the units (recessed 6 mm from the face so joints read as real joints)
    if (opt.mortar !== false) segs.forEach(function (s) {
      var L = s[1] - s[0]; if (L < 0.02) return;
      var uc = (s[0] + s[1]) / 2, rec = 0.006, dep = thick - rec - 0.004, mh = unitH + J - 0.004;   // no face shared with a brick (no flicker)
      var px = run.ax + dirx * uc - nx * (rec + dep / 2), pz = run.az + dirz * uc - nz * (rec + dep / 2);
      self.box(opt.mortarMat || 'mortar', px, y + mh / 2, pz, L - 0.004, mh, dep, { ry: ry });
    });
  };

  // Flemish bond, one brick (0.215) thick: alternate headers and stretcher pairs in every course,
  // headers centred over stretchers in the course below (quarter-brick lap with a queen closer at the start)
  KP._layFlemish = function (run, y, thick, segs, opt) {
    var self = this, J = UK.J, dirx = (run.bx - run.ax) / run.L, dirz = (run.bz - run.az) / run.L, nx = run.out[0], nz = run.out[1];
    var ry = Math.atan2(-dirz, dirx), cy = y + J + UK.BH / 2, units = [], u = opt.uA;
    var odd = opt.course % 2 === 1;
    if (odd) { units.push(['H', u, u + UK.BW]); u += UK.BW + J; units.push(['Q', u, u + 0.046]); u += 0.046 + J; }
    var next = 'S';
    while (u < opt.uB - 0.02) {
      var L = next === 'S' ? UK.BL : UK.BW;
      units.push([next, u, Math.min(u + L, opt.uB)]); u += L + J; next = next === 'S' ? 'H' : 'S';
    }
    units.forEach(function (b) {
      segs.forEach(function (sg) {
        var a = Math.max(b[1], sg[0]), e = Math.min(b[2], sg[1]);
        if (e - a < 0.03) return;
        var uc = (a + e) / 2, L = e - a, P = function (d) { return [run.ax + dirx * uc - nx * d, run.az + dirz * uc - nz * d]; };
        if (b[0] === 'S') {      // stretcher pair (face + back), 10 mm collar joint
          var f = P(UK.BW / 2), k = P(thick - UK.BW / 2);
          self.box('brick', f[0], cy, f[1], L, UK.BH, UK.BW, { ry: ry, color: self._brickColor(opt.palette), kind: 'brick' });
          self.box('brick', k[0], cy, k[1], L, UK.BH, UK.BW, { ry: ry, color: self._brickColor(opt.palette), kind: 'brick' });
        } else {                 // header (or queen closer) through the wall: its short end shows on the face
          var h = P(thick / 2);
          self.box('brick', h[0], cy, h[1], L, UK.BH, thick, { ry: ry, color: self._brickColor(opt.palette, b[0] === 'H' ? 0.92 : 1), kind: 'brick' });
        }
      });
    });
    segs.forEach(function (sg) {
      var L = sg[1] - sg[0]; if (L < 0.02) return;
      var uc = (sg[0] + sg[1]) / 2, rec = 0.006, dep = thick - rec - 0.004, mh = UK.BH + J - 0.004;   // no face shared with a brick (no flicker)
      var px = run.ax + dirx * uc - nx * (rec + dep / 2), pz = run.az + dirz * uc - nz * (rec + dep / 2);
      self.box(opt.mortarMat || 'mortar', px, y + mh / 2, pz, L - 0.004, mh, dep, { ry: ry });
    });
  };
  function blockColor(r) { var v = 0x8a + Math.floor(r() * 18); return (v << 16) | (v << 8) | (v - 4); }

  // Normalise a closed perimeter of OUTER-FACE corner points (axis-aligned edges, either orientation).
  function loopRuns(pts) {
    var n = pts.length, area = 0, i;
    for (i = 0; i < n; i++) { var a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    var ccw = area > 0;   // in (x,z) with z "up" on paper
    var runs = [];
    for (i = 0; i < n; i++) {
      var p = pts[i], q = pts[(i + 1) % n], dx = q[0] - p[0], dz = q[1] - p[1], L = Math.sqrt(dx * dx + dz * dz);
      if (L < 1e-6) continue;
      var tx = dx / L, tz = dz / L;
      var out = ccw ? [tz, -tx] : [-tz, tx];   // outward normal
      runs.push({ ax: p[0], az: p[1], bx: q[0], bz: q[1], L: L, out: out, idx: runs.length });
    }
    // corner convexity: external (convex) corners interlock; internal (re-entrant) corners just butt
    runs.forEach(function (r, k) {
      var prev = runs[(k - 1 + runs.length) % runs.length];
      var cross = (prev.bx - prev.ax) * (r.bz - r.az) - (prev.bz - prev.az) * (r.bx - r.ax);
      r.straightStart = Math.abs(cross) < 1e-9;            // collinear joint (one wall split into two runs)
      r.convexStart = !r.straightStart && (ccw ? cross > 0 : cross < 0);
    });
    runs.forEach(function (r, k) { var nx = runs[(k + 1) % runs.length]; r.convexEnd = nx.convexStart; r.straightEnd = nx.straightStart; });
    return runs;
  }
  H._loopRuns = loopRuns;

  // Allowed u-ranges on a course after removing openings (and clipping to a gable rake)
  function courseSegments(u0, u1, yb, yt, openings, gable) {
    var segs = [[u0, u1]];
    if (gable) {   // keep the part of the course under the roof line: y(u) = ridgeY - (ridgeY-eaveY)*|u-ridgeU|/half
      var k = (gable.ridgeY - yt) / (gable.ridgeY - gable.eaveY);
      if (yt <= gable.eaveY + 1e-6) k = 1;
      if (k <= 0) return [];
      var half = gable.half * Math.min(1, k);
      segs = [[Math.max(u0, gable.ridgeU - half), Math.min(u1, gable.ridgeU + half)]];
      if (segs[0][1] - segs[0][0] < 0.03) return [];
    }
    (openings || []).forEach(function (o) {
      if (yt <= o.v0 + 1e-6 || yb >= o.v1 - 1e-6) return;   // course entirely below/above the opening
      var next = [];
      segs.forEach(function (s) {
        if (o.u1 <= s[0] || o.u0 >= s[1]) { next.push(s); return; }
        if (o.u0 > s[0]) next.push([s[0], o.u0]);
        if (o.u1 < s[1]) next.push([o.u1, s[1]]);
      });
      segs = next;
    });
    return segs;
  }
  H._courseSegments = courseSegments;

  // ── cavity wall loop ──
  // pts: OUTER face corners of the outer leaf (closed, axis aligned). opts:
  //  y0 (bottom of brickwork, default −0.15 = two courses below DPC), y1 (wall-plate level), leaves 'cavity'|'single'|'solid'
  //  openings: { runIndex: [ {u0,u1,v0,v1,type,style,...} ] } — u from the run's start corner along the outer face, v absolute y
  //  gables: { runIndex: {ridgeU, ridgeY, half} } — raking top for that run
  //  runY1: { runIndex: y } per-run top override (e.g. parapets)
  //  facing: { runIndex: 'render'|'pebbledash'|'brick' } — render covers the brick above y=renderFrom
  //  party: [runIndex...] — party walls: built in blockwork both leaves (neighbour side), no facing brick
  //  palette, soldier (bool, soldier course over openings), sills ('stone'|'brick'|'concrete'), lintels ('stone'|'soldier'|'steel')
  KP.wallLoop = function (pts, opts) {
    opts = opts || {};
    var self = this, runs = loopRuns(pts), y0 = opts.y0 == null ? -0.15 : opts.y0, y1 = opts.y1;
    var leaves = opts.leaves || 'cavity', CH = UK.CH, openings = opts.openings || {}, gables = opts.gables || {};
    var party = opts.party || [];
    var nC = Math.round((y1 - y0) / CH);
    var ownerParity = function (runIdx, corner, k) { return (corner + k) % 2 === 0; };
    // record openings for later fit-out
    var fit = [];
    runs.forEach(function (r) {
      (openings[r.idx] || []).forEach(function (o) { fit.push({ run: r, o: o }); });
    });
    var innerOff = UK.BW + UK.CAV;  // inner leaf outer face offset from the outer face
    var maxY = y1; Object.keys(gables).forEach(function (k) { maxY = Math.max(maxY, gables[k].ridgeY); });
    var runTop = function (r) { return (opts.runY1 && opts.runY1[r.idx] != null) ? opts.runY1[r.idx] : y1; };
    var nAll = Math.ceil((maxY - y0) / CH);
    this.stage('masonry');
    var hooks = (opts.hooks || []).slice().sort(function (a, b) { return a.y - b.y; }), hk = 0;
    for (var k = 0; k < nAll; k++) {
      var yb = y0 + k * CH, yt = yb + CH;
      while (hk < hooks.length && hooks[hk].y <= yb + 1e-6) { hooks[hk].fn.call(self, self); hk++; }
      runs.forEach(function (r) {
        var g = gables[r.idx];
        var top = g ? g.ridgeY : runTop(r);
        self.stage(g && yb >= runTop(r) - 1e-6 && opts.gablesAfterRoof !== false ? 'roofframe' : 'masonry');
        if (yb >= top - 1e-6 || (!g && yt > runTop(r) + 1e-6)) return;
        var isParty = party.indexOf(r.idx) >= 0;
        // corner ownership: run owns its start corner when (idx + k) even; external corners only
        var ownS = !r.convexStart || ownerParity(r.idx, r.idx, k) ? (r.convexStart ? true : false) : false;
        var ownE = !r.convexEnd || ownerParity(r.idx, r.idx + 1, k) ? (r.convexEnd ? false : false) : false;
        // owner rule: at corner c (between run c-1 and run c), run c owns on even (c+k), run c-1 owns on odd
        var cS = r.idx, cE = (r.idx + 1) % runs.length;
        ownS = r.convexStart ? ((cS + k) % 2 === 0) : false;
        ownE = r.convexEnd ? ((cE + k) % 2 === 1) : false;
        var uA = r.convexStart ? (ownS ? 0 : UK.CW) : (leaves === 'single' ? UK.BW + UK.J : innerOff + UK.KW); // re-entrant: butt past the other wall
        var uB = r.convexEnd ? (ownE ? r.L : r.L - UK.CW) : r.L - (leaves === 'single' ? UK.BW + UK.J : innerOff + UK.KW);
        // re-entrant (internal) corners: the two leaves bond by alternately running one brick past the corner
        if (!r.convexStart) uA = r.straightStart ? 0 : ((k % 2 === 0) ? -UK.CW : 0);
        if (!r.convexEnd) uB = r.straightEnd ? r.L : ((k % 2 === 1) ? r.L + UK.CW : r.L);
        var segs = courseSegments(uA, uB, yb, yt, openings[r.idx], g ? { ridgeU: g.ridgeU, ridgeY: g.ridgeY, eaveY: g.eaveY == null ? runTop(r) : g.eaveY, half: g.half } : null);
        if (!segs.length) return;
        var mid = (uA + uB) / 2;
        if (isParty && opts.partyBond === 'flemish') {
          var pA = r.convexStart ? (ownS ? 0 : UK.CL) : (r.straightStart ? 0 : (k % 2 === 0 ? -UK.CL : 0)), pB = r.convexEnd ? (ownE ? r.L : r.L - UK.CL) : (r.straightEnd ? r.L : (k % 2 === 1 ? r.L + UK.CL : r.L));
          var psegs = courseSegments(pA, pB, yb, yt, openings[r.idx], g ? { ridgeU: g.ridgeU, ridgeY: g.ridgeY, eaveY: g.eaveY == null ? runTop(r) : g.eaveY, half: g.half } : null);
          if (psegs.length) self._layRun(r, yb, UK.BL, UK.BH, UK.BL, psegs, { uA: pA, uB: pB, mid: (pA + pB) / 2, unit: 'brick', palette: opts.partyPalette || 'brown', bond: 'flemish', course: k, mortarMat: opts.mortar });
          return;
        }
        if (isParty) {
          // party wall: blockwork leaf on our side only (neighbour builds theirs); drawn as block courses every 3 brick courses
          if (k % 3 === 0) {
            var ksegs = courseSegments(uA, uB, yb, yb + UK.KCH, openings[r.idx], g ? { ridgeU: g.ridgeU, ridgeY: g.ridgeY, eaveY: g.eaveY == null ? runTop(r) : g.eaveY, half: g.half } : null);
            if (ksegs.length) self._layRun(r, yb, UK.KL, UK.KH, UK.KW, ksegs, { uA: uA + (Math.floor(k / 3) % 2 ? UK.KCL / 2 : 0), uB: uB, mid: mid, unit: 'block', mat: 'block' });
          }
          return;
        }
        var face = (opts.facing && opts.facing[r.idx]) || 'brick';
        var pal = opts.palette;
        (opts.bands || []).forEach(function (bd) { if (yb >= bd.y0 - 1e-6 && yb < bd.y1 - 1e-6 && (!bd.runs || bd.runs.indexOf(r.idx) >= 0)) pal = bd.palette; });
        if (opts.bond === 'flemish') {
          // one-brick solid wall: the non-owning run butts the owner's full 0.215 thickness
          var fA = r.convexStart ? (ownS ? 0 : UK.CL) : (r.straightStart ? 0 : (k % 2 === 0 ? -UK.CL : 0)), fB = r.convexEnd ? (ownE ? r.L : r.L - UK.CL) : (r.straightEnd ? r.L : (k % 2 === 1 ? r.L + UK.CL : r.L));
          var fsegs = courseSegments(fA, fB, yb, yt, openings[r.idx], g ? { ridgeU: g.ridgeU, ridgeY: g.ridgeY, eaveY: g.eaveY == null ? runTop(r) : g.eaveY, half: g.half } : null);
          if (fsegs.length) self._layRun(r, yb, UK.BL, UK.BH, UK.BL, fsegs, { uA: fA, uB: fB, mid: (fA + fB) / 2, unit: 'brick', palette: pal, bond: 'flemish', course: k, mortarMat: opts.mortar });
          return;
        }
        self._layRun(r, yb, UK.BL, UK.BH, UK.BW, segs, { uA: uA, uB: uB, mid: mid, unit: 'brick', palette: pal, mat: face === 'brick' ? 'brick' : 'brickHidden', mortarMat: opts.mortar });
        if (leaves === 'cavity' && k % 3 === 0 && yb >= -0.001) {
          // inner leaf: blocks one block-course (3 brick courses) high, behind a 100 mm insulated cavity
          var ir = { ax: r.ax - r.out[0] * innerOff, az: r.az - r.out[1] * innerOff, bx: r.bx - r.out[0] * innerOff, bz: r.bz - r.out[1] * innerOff, L: r.L, out: r.out };
          var iu0 = r.convexStart ? innerOff : -innerOff, iu1 = r.convexEnd ? r.L - innerOff : r.L + innerOff;
          if (!r.convexStart) iu0 = 0; if (!r.convexEnd) iu1 = r.L;
          var bt = Math.min(yb + UK.KCH, (g ? g.ridgeY : runTop(r)));
          var bsegs = courseSegments(iu0, iu1, yb, bt, (openings[r.idx] || []).map(function (o) { return { u0: o.u0, u1: o.u1, v0: o.v0, v1: o.v1 }; }),
            g ? { ridgeU: g.ridgeU, ridgeY: g.ridgeY - innerOff * 0.8, eaveY: g.eaveY == null ? runTop(r) : g.eaveY, half: g.half } : null);
          if (bsegs.length) {
            var bk = Math.floor(k / 3);
            self._layRun(ir, yb, UK.KL, Math.min(UK.KH, bt - yb - UK.J), UK.KW, bsegs, { uA: iu0 + (bk % 2 ? UK.KCL / 2 : 0), uB: iu1, mid: (iu0 + iu1) / 2, unit: 'block', mat: 'block', mortar: false });
            // insulation boards in the cavity (cream PIR / mineral wool batts)
            bsegs.forEach(function (s) {
              var L = s[1] - s[0]; if (L < 0.05) return;
              var uc = (s[0] + s[1]) / 2, off = UK.BW + UK.CAV / 2;
              self.box('insulation', r.ax + (r.bx - r.ax) / r.L * uc - r.out[0] * off, yb + Math.min(UK.KCH, bt - yb) / 2, r.az + (r.bz - r.az) / r.L * uc - r.out[1] * off,
                L, Math.min(UK.KCH, bt - yb) - 0.004, UK.CAV - 0.012, { ry: Math.atan2(-(r.bz - r.az), r.bx - r.ax) });
            });
          }
        }
        // render / pebbledash finish over the brick (applied later, during the external stage)
        if (face !== 'brick' && k === 0) self._pendingRender = (self._pendingRender || []).concat([{ r: r, y0: (opts.renderFrom && opts.renderFrom[r.idx]) || y0, y1: top, face: face, openings: openings[r.idx] || [] }]);
      });
    }
    this.stage('masonry');
    while (hk < hooks.length) { hooks[hk].fn.call(self, self); hk++; }
    // lintels + sills go in as the brickwork reaches them; frames & glass in the fit-out stage
    fit.forEach(function (f) { self._openingStructure(f.run, f.o, opts); });
    this.stage('fitout');
    fit.forEach(function (f) { self._openingFit(f.run, f.o, opts); });
    (this._pendingRender || []).forEach(function (pr) { self._render(pr); });
    this._pendingRender = [];
    this.stage('masonry');
    return runs;
  };

  KP._runPoint = function (r, u, depth) {   // point on run at u along the face, depth inward from the outer face
    var dx = (r.bx - r.ax) / r.L, dz = (r.bz - r.az) / r.L;
    return [r.ax + dx * u - r.out[0] * depth, r.az + dz * u - r.out[1] * depth];
  };
  KP._ry = function (r) { return Math.atan2(-(r.bz - r.az), r.bx - r.ax); };

  // lintel above + sill below an opening (masonry stage, timed with the courses they sit in)
  KP._openingStructure = function (r, o, opts) {
    var ry = this._ry(r), w = o.u1 - o.u0, uc = (o.u0 + o.u1) / 2, lint = o.lintel || opts.lintels || 'steel';
    this.stage('masonry');
    if (o.type !== 'void') {
      if (lint === 'stone') {
        var p = this._runPoint(r, uc, UK.BW / 2);
        this.box('stone', p[0], o.v1 + 0.075, p[1], w + 0.30, 0.150, UK.BW + 0.004, { ry: ry });
      } else if (lint === 'soldier') {
        var n = Math.max(1, Math.round((w + 0.02) / UK.CH)), pitch = (w + 0.02) / n;
        for (var i = 0; i < n; i++) {
          var up = o.u0 - 0.01 + pitch * (i + 0.5), pp = this._runPoint(r, up, UK.BW / 2);
          this.box('brick', pp[0], o.v1 + UK.J + UK.BL / 2, pp[1], Math.min(UK.BH, pitch - UK.J), UK.BL, UK.BW, { ry: ry, color: this._brickColor(opts.palette), kind: 'brick' });   // real 65 mm brick on end; joints take up the slack
        }
      }
      // steel cavity lintel (visible from inside / during the build): inverted-T profile over both leaves
      var lp = this._runPoint(r, uc, UK.BW + UK.CAV / 2);
      this.box('steel', lp[0], o.v1 + 0.004, lp[1], w + 0.30, 0.008, UK.WALL - 0.02, { ry: ry });
      var lp2 = this._runPoint(r, uc, UK.BW + UK.CAV / 2);
      this.box('steel', lp2[0], o.v1 + 0.08, lp2[1], w + 0.30, 0.15, 0.006, { ry: ry, rx: 0.5 });
    }
    // sills
    if (o.type === 'window' && o.sill !== false) {
      var sill = o.sill || opts.sills || 'stone';
      var sp = this._runPoint(r, uc, UK.BW / 2 - 0.045 / 2);
      var mat = sill === 'brick' ? 'brick' : (sill === 'concrete' ? 'concrete' : 'stone');
      this.box(mat, sp[0], o.v0 - 0.035, sp[1], w + (sill === 'brick' ? 0 : 0.10), 0.070, UK.BW + 0.045, { ry: ry, rx: 0, color: sill === 'brick' ? this._brickColor(opts.palette) : undefined });
    }
  };

  // frames, glazing, doors (fit-out)
  KP._openingFit = function (r, o, opts) {
    var ry = this._ry(r), uc = (o.u0 + o.u1) / 2, w = o.u1 - o.u0, h = o.v1 - o.v0, set = o.setback != null ? o.setback : (opts.setback != null ? opts.setback : 0.095);
    var frameMat = o.frame || opts.frame || 'upvc';
    var depth = 0.070, d0 = set + depth / 2;
    var self = this;
    var P = function (u, d) { return self._runPoint(r, u, d); };
    // cavity closers + plasterboard reveal returns (inside face of the opening)
    var rc1 = P(o.u0 + 0.01, UK.BW + UK.CAV / 2), rc2 = P(o.u1 - 0.01, UK.BW + UK.CAV / 2);
    this.box('closer', rc1[0], (o.v0 + o.v1) / 2, rc1[1], 0.02, h, UK.CAV, { ry: ry, stage: 'masonry' });
    this.box('closer', rc2[0], (o.v0 + o.v1) / 2, rc2[1], 0.02, h, UK.CAV, { ry: ry, stage: 'masonry' });
    if (o.type === 'void') return;
    var fw = 0.068, yc = (o.v0 + o.v1) / 2;
    var frameBox = function (u, y, sw, sh) { var p = P(u, d0); self.box(frameMat, p[0], y, p[1], sw, sh, depth, { ry: ry }); };
    if (o.type === 'garage') {
      frameBox(uc, o.v1 - 0.03, w, 0.06); frameBox(o.u0 + 0.03, yc, 0.06, h); frameBox(o.u1 - 0.03, yc, 0.06, h);
      var gp = P(uc, set + 0.02), np = Math.max(4, Math.round(h / 0.27));
      for (var gi = 0; gi < np; gi++) self.box(o.color || 'garageDoor', gp[0], o.v0 + (gi + 0.5) * h / np, gp[1], w - 0.10, h / np - 0.012, 0.03, { ry: ry });
      self.box('metal', P(uc, set)[0], o.v0 + 0.45, P(uc, set)[1], 0.18, 0.03, 0.03, { ry: ry });
      return;
    }
    // outer frame
    frameBox(uc, o.v1 - fw / 2, w, fw); frameBox(uc, o.v0 + fw / 2, w, fw);
    frameBox(o.u0 + fw / 2, yc, fw, h); frameBox(o.u1 - fw / 2, yc, fw, h);
    if (o.type === 'door') {
      var fan = o.fanlight ? Math.min(0.40, h - UK.DOOR_H - 0.06) : 0;
      if (fan > 0.08) {   // transom + fanlight glass
        var ty = o.v1 - fw - fan; frameBox(uc, ty, w - 2 * fw, 0.05);
        var gp2 = P(uc, d0); self.box('glass', gp2[0], ty + fan / 2 + 0.025, gp2[1], w - 2 * fw, fan - 0.03, 0.024, { ry: ry, lightsOn: 1 });
      }
      var lh = h - fw - (fan > 0.08 ? fan + 0.05 : 0), lw = w - 2 * fw - 0.006, ly = o.v0 + lh / 2;
      var dp = P(uc, set + 0.045);
      var leafMat = o.color || 'doorRed';
      self.box(leafMat, dp[0], ly, dp[1], lw, lh - 0.004, 0.044, { ry: ry });
      // panels (4-panel / composite) — raised mouldings on the leaf face
      var pr = P(uc, set + 0.020), panels = o.style === 'composite' ? [[0.5, 0.80, 0.18], [0.5, 0.30, 0.25]] : [[0.27, 0.78, 0.30], [0.73, 0.78, 0.30], [0.27, 0.30, 0.34], [0.73, 0.30, 0.34]];
      panels.forEach(function (pn) {
        var pu = o.u0 + fw + lw * pn[0], pp = P(pu, set + 0.020);
        if (o.style === 'composite' && pn[1] > 0.7) self.box('glass', pp[0], o.v0 + lh * pn[1], pp[1], lw * 0.42, lh * pn[2], 0.012, { ry: ry, lightsOn: 1 });
        else self.box(leafMat, pp[0], o.v0 + lh * pn[1], pp[1], o.style === 'composite' ? lw * 0.62 : lw * 0.34, lh * pn[2], 0.012, { ry: ry });
      });
      // ironmongery: letter plate, knocker, handle
      var lp = P(uc, set + 0.012); self.box('brass', lp[0], o.v0 + lh * 0.55, lp[1], 0.26, 0.06, 0.01, { ry: ry });
      var hp = P(o.u1 - fw - 0.09, set + 0.01); self.box('brass', hp[0], o.v0 + 1.0, hp[1], 0.02, 0.18, 0.03, { ry: ry });
      if (o.number) { var np2 = P(uc, set + 0.012); self.box('brass', np2[0], o.v0 + lh * 0.68, np2[1], 0.08, 0.10, 0.008, { ry: ry }); }
      // step / threshold
      var st = P(uc, -0.12); self.box(o.step || 'stone', st[0], 0.075, st[1], w + 0.10, 0.15, 0.30, { ry: ry, stage: 'external' });
      return;
    }
    // windows
    var style = o.style || 'casement';
    var gl = function (u0, u1, v0, v1) { var p = P((u0 + u1) / 2, d0); self.box('glass', p[0], (v0 + v1) / 2, p[1], u1 - u0, v1 - v0, 0.024, { ry: ry, lightsOn: 1 }); };
    var iu0 = o.u0 + fw, iu1 = o.u1 - fw, iv0 = o.v0 + fw, iv1 = o.v1 - fw;
    if (style === 'sash' || style === 'sash22' || style === 'sash66') {
      var mid = (iv0 + iv1) / 2; frameBox(uc, mid, iu1 - iu0, 0.045);              // meeting rails
      var ps = P(uc, d0 + 0.03); self.box(frameMat, ps[0], mid + (iv1 - mid) / 2, ps[1], iu1 - iu0, iv1 - mid, 0.01, { ry: ry, color: 0xffffff, opacity: 0 }).m = 'glass';
      gl(iu0, iu1, iv0, mid - 0.02); gl(iu0, iu1, mid + 0.02, iv1);
      var cols = style === 'sash66' ? 3 : (style === 'sash22' ? 2 : 1), rows = style === 'sash66' ? 2 : 1;
      for (var ci = 1; ci < cols; ci++) frameBox(iu0 + (iu1 - iu0) * ci / cols, (iv0 + iv1) / 2, 0.025, iv1 - iv0);
      for (var ri = 1; ri < rows; ri++) { frameBox(uc, iv0 + (mid - iv0) * ri / rows, iu1 - iu0, 0.025); frameBox(uc, mid + (iv1 - mid) * ri / rows, iu1 - iu0, 0.025); }
      // horns on the upper sash
      frameBox(iu0 + 0.02, mid - 0.05, 0.04, 0.06); frameBox(iu1 - 0.02, mid - 0.05, 0.04, 0.06);
    } else {
      // casement: mullions every ~0.55 m, top-hung fanlight above a transom on tall windows
      var nm = Math.max(1, Math.round(w / 0.6));
      for (var mi = 1; mi < nm; mi++) frameBox(o.u0 + w * mi / nm, yc, 0.060, h - 2 * fw);
      var tr = h > 0.95 ? iv1 - 0.32 : null;
      if (tr) frameBox(uc, tr, iu1 - iu0, 0.055);
      for (var mj = 0; mj < nm; mj++) {
        var a = o.u0 + w * mj / nm + (mj ? 0.03 : fw), b = o.u0 + w * (mj + 1) / nm - (mj < nm - 1 ? 0.03 : fw);
        if (tr) { gl(a, b, iv0, tr - 0.028); gl(a, b, tr + 0.028, iv1); } else gl(a, b, iv0, iv1);
      }
      if (o.glazingBars) { for (var gb = 1; gb < 3; gb++) frameBox(uc, iv0 + (iv1 - iv0) * gb / 3, iu1 - iu0, 0.018); }
    }
    // internal window board
    var wb = P(uc, UK.WALL + 0.01); this.box('timberWhite', wb[0], o.v0 + 0.01, wb[1], w + 0.06, 0.025, 0.14, { ry: ry });
  };

  // render / pebbledash skin over brickwork
  KP._render = function (pr) {
    var r = pr.r, ry = this._ry(r), self = this;
    var segsAt = function (yb, yt) { return courseSegments(0, r.L, yb, yt, pr.openings, null); };
    var step = 0.30;
    this.stage('external');
    for (var y = pr.y0; y < pr.y1 - 1e-6; y += step) {
      var yt = Math.min(pr.y1, y + step);
      segsAt(y, yt).forEach(function (s) {
        var L = s[1] - s[0], uc = (s[0] + s[1]) / 2, p = self._runPoint(r, uc, -0.008);
        if (L > 0.02) self.box(pr.face, p[0], (y + yt) / 2, p[1], L, yt - y, 0.016, { ry: ry });
      });
    }
    this.stage('masonry');
  };

  // ── straight wall run (not a closed loop): garden walls, parapets, chimneys use the same layer ──
  KP.wallRun = function (ax, az, bx, bz, out, y0, y1, opts) {
    opts = opts || {};
    var L = Math.sqrt((bx - ax) * (bx - ax) + (bz - az) * (bz - az)), r = { ax: ax, az: az, bx: bx, bz: bz, L: L, out: out };
    var thick = opts.thick || UK.BW, n = Math.round((y1 - y0) / UK.CH);
    for (var k = 0; k < n; k++) {
      var yb = y0 + k * UK.CH, uA = (k % 2) ? UK.CW : 0;
      var segs = courseSegments(0, L, yb, yb + UK.CH, opts.openings, opts.gable || null);
      if (!segs.length) continue;
      if (opts.bond === 'flemish') { this._layRun(r, yb, UK.BL, UK.BH, UK.BL, segs, { uA: 0, uB: L, mid: L / 2, unit: 'brick', palette: opts.palette, bond: 'flemish', course: k }); continue; }
      this._layRun(r, yb, UK.BL, UK.BH, thick, segs, { uA: opts.endsFlush ? 0 : uA, uB: L, mid: L / 2, unit: 'brick', palette: opts.palette, mat: opts.mat });
    }
    if (opts.coping) {   // stone / brick-on-edge coping
      var c = this._runPoint(r, L / 2, thick / 2);
      this.box(opts.coping === 'brick' ? 'brick' : 'stone', c[0], y0 + n * UK.CH + 0.04, c[1], L + 0.04, 0.075, thick + 0.05, { ry: this._ry(r), color: opts.coping === 'brick' ? this._brickColor(opts.palette) : undefined });
    }
    return r;
  };

  // ── foundations, slab, DPC ──
  // pts: outer-face perimeter; creates trench, concrete strip (0.6 × 0.225) and the oversite slab
  KP.foundation = function (pts, opts) {
    opts = opts || {}; var self = this, runs = loopRuns(pts);
    this.stage('setout');
    var bb = bounds2(pts);
    // pegs + string lines at the corners (removed once the foundations are in)
    pts.forEach(function (p) { self.box('timber', p[0], 0.15, p[1], 0.05, 0.40, 0.05, { hideAfter: 0.12 }); });
    runs.forEach(function (r) { var c = self._runPoint(r, r.L / 2, -0.02); self.box('string', c[0], 0.30, c[1], r.L + 0.6, 0.004, 0.004, { ry: self._ry(r), hideAfter: 0.12 }); });
    this.stage('found');
    runs.forEach(function (r) {
      var c = self._runPoint(r, r.L / 2, UK.WALL / 2), ry = self._ry(r);
      var sp = self._runPoint(r, r.L / 2, -0.55);
      self.box('soil', sp[0], 0.18, sp[1], r.L + 0.6, 0.36, 0.55, { ry: ry, hideAfter: 0.10 });        // spoil heap beside the trench
      self.box('concrete', c[0], -0.6125, c[1], r.L + 0.60, 0.775, 0.60, { ry: ry });                   // trench-fill concrete, formation at −1.000
    });
    // footing brickwork below DPC: blockwork to −0.15 (two courses below ground, faced in brick from −0.15)
    runs.forEach(function (r) {
      var c = self._runPoint(r, r.L / 2, UK.WALL / 2), ry = self._ry(r);
      self.box('block', c[0], -0.1875, c[1], r.L, 0.075, UK.WALL, { ry: ry, color: 0x7d7d79 });       // trench blocks up to the first facing course
    });
    this.stage('slab');
    var inset = UK.WALL;
    self.box('concrete', (bb.x0 + bb.x1) / 2, 0.10, (bb.z0 + bb.z1) / 2, bb.x1 - bb.x0 - 2 * inset, 0.15, bb.z1 - bb.z0 - 2 * inset, {});
    runs.forEach(function (r) {   // DPC strip (black)
      var c = self._runPoint(r, r.L / 2, UK.WALL / 2);
      self.box('dpc', c[0], UK.DPC + 0.001, c[1], r.L, 0.004, UK.WALL + 0.004, { ry: self._ry(r) });
    });
    this.stage('masonry');
  };
  function bounds2(pts) { var b = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }; pts.forEach(function (p) { b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]); b.z0 = Math.min(b.z0, p[1]); b.z1 = Math.max(b.z1, p[1]); }); return b; }
  H._bounds2 = bounds2;

  // ── floors: joists at 400 c/c spanning the short way, chipboard deck, plasterboard ceiling below (fit-out) ──
  KP.floor = function (x0, z0, x1, z1, y, opts) {
    opts = opts || {}; var self = this;
    var spanX = (x1 - x0) < (z1 - z0) || opts.dir === 'x';
    var len = spanX ? x1 - x0 : z1 - z0, run0 = spanX ? z0 : x0, run1 = spanX ? z1 : x1;
    for (var s = run0 + 0.05; s <= run1 - 0.02; s += UK.JOIST_C) {
      if (spanX) self.box('timber', (x0 + x1) / 2, y - UK.JOIST_D / 2, s, len, UK.JOIST_D, UK.JOIST_W, {});
      else self.box('timber', s, y - UK.JOIST_D / 2, (z0 + z1) / 2, UK.JOIST_W, UK.JOIST_D, len, {});
    }
    if (opts.deck !== false) self.box('chipboard', (x0 + x1) / 2, y + 0.011, (z0 + z1) / 2, x1 - x0, 0.022, z1 - z0, {});
  };

  // ── concrete floor slab (flats / apartments) ──
  KP.slab = function (x0, z0, x1, z1, y, th, opts) {
    this.box((opts && opts.mat) || 'concrete', (x0 + x1) / 2, y - th / 2, (z0 + z1) / 2, x1 - x0, th, z1 - z0, opts || {});
  };

  // ═══ ROOFS ═══
  // Gable roof over a rectangle (outer faces of walls). ridge: 'x' (ridge parallel to the frontage) or 'z'.
  // opts: eaveY (top of wall plate), pitch (deg), tile ('slate'|'plain'|'concrete'), overhang (eaves), verge, trusses (true) or cut
  KP.roofGable = function (o) {
    var self = this, T = UK.TILES[o.tile || 'concrete'], pitch = (o.pitch || 38) * Math.PI / 180;
    var ov = o.overhang == null ? 0.30 : o.overhang, vg = o.verge == null ? 0.05 : o.verge;
    var alongX = (o.ridge || 'x') === 'x';
    var a0 = alongX ? o.x0 : o.z0, a1 = alongX ? o.x1 : o.z1;     // along the ridge
    var s0 = alongX ? o.z0 : o.x0, s1 = alongX ? o.z1 : o.x1;     // across the span
    var span = s1 - s0, half = span / 2, rise = half * Math.tan(pitch), eY = o.eaveY, ridgeY = eY + rise;
    var sm = (s0 + s1) / 2;
    var P = function (a, s, y) { return alongX ? [a, y, s] : [s, y, a]; };
    this.anchor('ridge', alongX ? (a0 + a1) / 2 : sm, ridgeY, alongX ? sm : (a0 + a1) / 2);
    this.env(alongX ? a0 : s0, eY, alongX ? s0 : a0, alongX ? a1 : s1, ridgeY, alongX ? s1 : a1);
    this.stage('roofframe');
    // wall plates
    [s0 + UK.WALL / 2, s1 - UK.WALL / 2].forEach(function (s) { var p = P((a0 + a1) / 2, s, eY + 0.025); self.box('timber', p[0], p[1], p[2], alongX ? a1 - a0 : 0.1, 0.05, alongX ? 0.1 : a1 - a0, {}); });
    // fink trusses at 600 c/c (or rafters for a cut roof)
    var gableIn = o.gableEnds === false ? 0 : UK.WALL;
    for (var a = a0 + gableIn + 0.05; a <= a1 - gableIn - 0.02; a += o.cut ? 0.40 : UK.TRUSS_C) {
      var e0 = P(a, s0 - 0.0, eY + 0.05), e1 = P(a, s1, eY + 0.05), rp = P(a, sm, ridgeY - 0.05);
      self.beam('timber', e0, rp, 0.097, 0.035, {}); self.beam('timber', e1, rp, 0.097, 0.035, {});
      if (!o.cut) {
        self.beam('timber', P(a, s0 + 0.05, eY + 0.05), P(a, s1 - 0.05, eY + 0.05), 0.097, 0.035, {});    // ceiling tie
        var q1 = P(a, s0 + span / 3, eY + 0.05), q2 = P(a, s1 - span / 3, eY + 0.05);
        var m1 = P(a, s0 + span / 4, eY + 0.05 + rise / 2), m2 = P(a, s1 - span / 4, eY + 0.05 + rise / 2);
        self.beam('timber', q1, m1, 0.072, 0.035, {}); self.beam('timber', q1, rp, 0.072, 0.035, {});
        self.beam('timber', q2, m2, 0.072, 0.035, {}); self.beam('timber', q2, rp, 0.072, 0.035, {});
      }
    }
    var rb = P((a0 + a1) / 2, sm, ridgeY - 0.02); self.box('timber', rb[0], rb[1], rb[2], alongX ? a1 - a0 : 0.032, 0.175, alongX ? 0.032 : a1 - a0, {});
    if (o.cut) {   // cut roof: purlins 75 × 200 mid-slope (party wall to party wall) + ceiling joists at 400 c/c
      [s0 + span / 4, s1 - span / 4].forEach(function (s) {
        var pp = P((a0 + a1) / 2, s, eY + rise / 2 - 0.05);
        self.box('timber', pp[0], pp[1], pp[2], alongX ? a1 - a0 - 2 * gableIn : 0.075, 0.20, alongX ? 0.075 : a1 - a0 - 2 * gableIn, {});
      });
      for (var cj = a0 + gableIn + 0.25; cj <= a1 - gableIn - 0.05; cj += 0.40) self.beam('timber', P(cj, s0 + 0.05, eY + 0.06), P(cj, s1 - 0.05, eY + 0.06), 0.10, 0.05, {});
    }
    this.stage('roofcover');
    this._slopes(o, T, pitch, a0 - vg, a1 + vg, s0, s1, eY, ridgeY, ov, alongX, P);
    // ridge tiles
    for (var ra = a0 - vg; ra < a1 + vg - 0.01; ra += 0.45) {
      var rl = Math.min(0.45, a1 + vg - ra), rp2 = P(ra + rl / 2, sm, ridgeY + 0.06);
      self.box(o.ridgeMat || (o.tile === 'plain' ? 'tileClay' : 'ridge'), rp2[0], rp2[1], rp2[2], alongX ? rl - 0.004 : 0.24, 0.10, alongX ? 0.24 : rl - 0.004, { rx: alongX ? 0 : 0, ry: 0, kind: 'tile' });
    }
    this._eaves(o, a0 - vg, a1 + vg, s0, s1, eY, ov, alongX, P);
    // barge boards / verge on gable ends
    if (o.barge !== false) [a0 - vg, a1 + vg].forEach(function (a) {
      [[s0 - ov, eY - 0.10, sm, ridgeY + 0.02], [s1 + ov, eY - 0.10, sm, ridgeY + 0.02]].forEach(function (L) {
        self.stage('fitout');
        self.beam(o.bargeMat || 'upvcBlack', P(a, L[0], L[1]), P(a, L[2], L[3]), 0.20, 0.025, {});
      });
    });
    this.stage('masonry');
    return { ridgeY: ridgeY, rise: rise, eaveY: eY };
  };

  // tiles laid row by row from the eaves on both slopes (or one, for a lean-to)
  KP._slopes = function (o, T, pitch, a0, a1, s0, s1, eY, ridgeY, ov, alongX, P, oneSided) {
    var self = this, sm = (s0 + s1) / 2, cos = Math.cos(pitch), sin = Math.sin(pitch);
    var slopeLen = ((s1 - s0) / 2 + ov) / cos;
    // build-up above the rafter centre-line (rafters sit 0.05 above the wall plate line, 0.097 deep):
    var rTop = 0.05 + 0.0485 / cos, yFelt = rTop + 0.003 / cos, yBat = rTop + 0.0125 / cos, yTile = rTop + (0.025 + T.th / 2 + 0.006) / cos;
    var rows = Math.ceil((slopeLen - (T.l - T.gauge)) / T.gauge);
    var sides = oneSided ? [-1] : [-1, 1];
    sides.forEach(function (sd) {
      // underlay + battens first (fast), then tiles row by row
      var u0 = sd < 0 ? s0 - ov : s1 + ov;
      var midS = (u0 + sm) / 2, midY = (eY - ov * Math.tan(pitch) + ridgeY) / 2;
      var ul = P((a0 + a1) / 2, midS, midY + yFelt);
      var tilt = sd < 0 ? -pitch : pitch;   // rotate about the ridge axis
      self.box('felt', ul[0], ul[1], ul[2], alongX ? a1 - a0 : slopeLen, 0.004, alongX ? slopeLen : a1 - a0, alongX ? { rx: tilt } : { rz: -tilt });
      for (var b = 0; b < rows; b++) {
        var d = (b + 0.5) * T.gauge, s = u0 - sd * d * cos, y = eY - ov * Math.tan(pitch) + d * sin + yBat;
        var bp = P((a0 + a1) / 2, s, y);
        self.box('timber', bp[0], bp[1], bp[2], alongX ? a1 - a0 : (o.cut ? 0.038 : 0.050), 0.025, alongX ? (o.cut ? 0.038 : 0.050) : a1 - a0, {});
      }
      var cols = Math.ceil((a1 - a0) / T.cover);
      for (var row = 0; row < rows; row++) {
        var dd = row * T.gauge + T.l / 2, ss = u0 - sd * dd * cos, yy = eY - ov * Math.tan(pitch) + dd * sin + yTile + (T.l / 2 - T.gauge / 2) * 0 + (row % 2) * 0.0005;
        if (dd - T.l / 2 > slopeLen - 0.05) break;
        var shift = T.bond === 'broken' && row % 2 ? T.cover / 2 : 0;
        for (var c = -1; c < cols + 1; c++) {
          var a = a0 + shift + c * T.cover, aL = Math.max(a0, a), aR = Math.min(a1, a + T.cover);
          if (aR - aL < 0.03) continue;
          var tp = P((aL + aR) / 2, ss, yy);
          self.box(T.mat, tp[0], tp[1], tp[2], alongX ? aR - aL - 0.004 : T.l, T.th, alongX ? T.l : aR - aL - 0.004,
            Object.assign(alongX ? { rx: tilt + (sd < 0 ? -0.035 : 0.035) } : { rz: -tilt + (sd < 0 ? 0.035 : -0.035) }, { kind: 'tile', color: tileJitter(self.rand, T) }));
        }
      }
    });
  };
  function tileJitter(r, T) { var base = T.mat === 'slate' ? 0x40464f : (T.mat === 'tileClay' ? 0x9a4e36 : 0x4e4844); var j = 1 + (r() - 0.5) * 0.12; var R = Math.min(255, ((base >> 16) & 255) * j), G = Math.min(255, ((base >> 8) & 255) * j), B = Math.min(255, (base & 255) * j); return ((R & 255) << 16) | ((G & 255) << 8) | (B & 255); }

  // fascia, soffit, half-round gutter and downpipes along both eaves
  KP._eaves = function (o, a0, a1, s0, s1, eY, ov, alongX, P, oneSided) {
    var self = this; this.stage('roofcover');
    var sides = oneSided ? [[s0 - ov, -1]] : [[s0 - ov, -1], [s1 + ov, 1]];
    sides.forEach(function (sv) {
      var s = sv[0], dir = sv[1], fy = eY - ov * Math.tan((o.pitch || 38) * Math.PI / 180) - 0.06;
      var f = P((a0 + a1) / 2, s, fy); self.box(o.fascia || 'upvc', f[0], f[1], f[2], alongX ? a1 - a0 : 0.022, 0.20, alongX ? 0.022 : a1 - a0, {});
      var so = P((a0 + a1) / 2, s - dir * ov / 2, fy - 0.09); self.box(o.fascia || 'upvc', so[0], so[1], so[2], alongX ? a1 - a0 : ov, 0.012, alongX ? ov : a1 - a0, {});
      var g = P((a0 + a1) / 2, s + dir * 0.07, fy + 0.02);
      var gr = self.tube('gutter', alongX ? [a0, g[1], g[2]] : [g[0], g[1], a0], alongX ? [a1, g[1], g[2]] : [g[0], g[1], a1], 0.056, {});
      if (o.downpipes !== false) [a0 + 0.25, a1 - 0.25].slice(0, o.downpipes === 1 ? 1 : 2).forEach(function (a) {
        var dp = P(a, s - dir * (ov - 0.08), 0);
        var top = fy, wallOff = P(a, s - dir * (ov - 0.02), 0);
        self.tube('gutter', [dp[0], top, dp[2]], [dp[0], 0.05, dp[2]], 0.034, {});
        self.box('gutter', dp[0], 0.08, dp[2], 0.12, 0.05, 0.12, {});   // shoe / gully
      });
    });
  };

  // Hipped roof (cut roof: common rafters, hip rafters, ridge board) — tiles trimmed to each slope
  KP.roofHip = function (o) {
    var self = this, T = UK.TILES[o.tile || 'plain'], pitch = (o.pitch || 40) * Math.PI / 180;
    var ov = o.overhang == null ? 0.30 : o.overhang, x0 = o.x0 - ov, x1 = o.x1 + ov, z0 = o.z0 - ov, z1 = o.z1 + ov;
    var eY = o.eaveY, ex = o.eaveY - ov * Math.tan(pitch);
    var W = x1 - x0, D = z1 - z0, half = Math.min(W, D) / 2, rise = half * Math.tan(pitch), ridgeY = ex + rise;
    var alongX = W >= D;   // ridge runs along the longer side
    var rx0 = alongX ? x0 + half : (x0 + x1) / 2, rx1 = alongX ? x1 - half : (x0 + x1) / 2;
    var rz0 = alongX ? (z0 + z1) / 2 : z0 + half, rz1 = alongX ? (z0 + z1) / 2 : z1 - half;
    this.anchor('ridge', (rx0 + rx1) / 2, ridgeY, (rz0 + rz1) / 2);
    this.env(o.x0, eY, o.z0, o.x1, ridgeY, o.z1);
    this.stage('roofframe');
    // ridge board + hip rafters + commons at 400 c/c
    if (alongX) this.box('timber', (rx0 + rx1) / 2, ridgeY - 0.03, rz0, Math.max(0.05, rx1 - rx0), 0.15, 0.035, {});
    else this.box('timber', rx0, ridgeY - 0.03, (rz0 + rz1) / 2, 0.035, 0.15, Math.max(0.05, rz1 - rz0), {});
    [[x0, z0, rx0, rz0], [x1, z0, rx1, rz0], [x0, z1, rx0, rz1], [x1, z1, rx1, rz1]].forEach(function (h) { self.beam('timber', [h[0], ex, h[1]], [h[2], ridgeY, h[3]], 0.15, 0.047, {}); });
    for (var a = x0 + 0.2; a < x1 - 0.1; a += 0.40) {
      var zTop0 = alongX ? rz0 : Math.min(rz0, z0 + Math.min(a - x0, x1 - a)), zTop1 = alongX ? rz1 : Math.max(rz1, z1 - Math.min(a - x0, x1 - a));
      var lim = Math.min(a - x0, x1 - a);   // hip limits
      var yTop = ex + Math.min(lim, half) * Math.tan(pitch);
      var zc0 = z0 + Math.min(lim, half), zc1 = z1 - Math.min(lim, half);
      self.beam('timber', [a, ex, z0], [a, yTop, Math.min(zc0, (z0 + z1) / 2)], 0.12, 0.038, {});
      self.beam('timber', [a, ex, z1], [a, yTop, Math.max(zc1, (z0 + z1) / 2)], 0.12, 0.038, {});
    }
    this.stage('roofcover');
    // four slopes: tiles row by row; each row trimmed to the hip lines
    var cos = Math.cos(pitch), sin = Math.sin(pitch), slope = half / cos, rows = Math.ceil(slope / T.gauge);
    var faces = [
      { n: [0, 1], len: function (d) { return [x0 + d * cos, x1 - d * cos]; }, at: function (a, d) { return [a, z1 - d * cos]; }, rot: { rx: pitch } },
      { n: [0, -1], len: function (d) { return [x0 + d * cos, x1 - d * cos]; }, at: function (a, d) { return [a, z0 + d * cos]; }, rot: { rx: -pitch } },
      { n: [1, 0], len: function (d) { return [z0 + d * cos, z1 - d * cos]; }, at: function (a, d) { return [x1 - d * cos, a]; }, rot: { rz: -pitch } },
      { n: [-1, 0], len: function (d) { return [z0 + d * cos, z1 - d * cos]; }, at: function (a, d) { return [x0 + d * cos, a]; }, rot: { rz: pitch } }
    ];
    faces.forEach(function (f, fi) {
      var horiz = fi < 2;
      for (var row = 0; row < rows; row++) {
        var d = row * T.gauge * cos + T.l / 2 * cos, y = ex + (row * T.gauge + T.l / 2) * sin + (0.06 + 0.025 + T.th / 2 + 0.006) / cos;
        var lim = f.len(d), shift = T.bond === 'broken' && row % 2 ? T.cover / 2 : 0;
        if (lim[1] - lim[0] < 0.03) break;
        for (var a = lim[0] - T.cover + shift; a < lim[1]; a += T.cover) {
          var aL = Math.max(lim[0], a), aR = Math.min(lim[1], a + T.cover);
          if (aR - aL < 0.03) continue;
          var p = f.at((aL + aR) / 2, d);
          self.box(T.mat, p[0], y, p[1], horiz ? aR - aL - 0.004 : T.l, T.th, horiz ? T.l : aR - aL - 0.004, Object.assign({}, f.rot, { kind: 'tile', color: tileJitter(self.rand, T) }));
        }
      }
    });
    // hip + ridge tiles
    [[x0, z0, rx0, rz0], [x1, z0, rx1, rz0], [x0, z1, rx0, rz1], [x1, z1, rx1, rz1]].forEach(function (h) {
      var n = Math.ceil(Math.sqrt(Math.pow(h[2] - h[0], 2) + Math.pow(h[3] - h[1], 2) + rise * rise) / 0.40);
      for (var i = 0; i < n; i++) {
        var t0 = i / n, t1 = (i + 1) / n;
        self.beam(T.mat === 'slate' ? 'ridge' : 'tileClay', [h[0] + (h[2] - h[0]) * t0, ex + rise * t0 + 0.08, h[1] + (h[3] - h[1]) * t0], [h[0] + (h[2] - h[0]) * t1, ex + rise * t1 + 0.08, h[1] + (h[3] - h[1]) * t1], 0.09, 0.20, { kind: 'tile' });
      }
    });
    if (alongX) for (var rr = rx0; rr < rx1 - 0.01; rr += 0.45) this.box(T.mat === 'slate' ? 'ridge' : 'tileClay', Math.min(rr + 0.225, rx1 - 0.01), ridgeY + 0.07, rz0, Math.min(0.45, rx1 - rr) - 0.004, 0.10, 0.22, { kind: 'tile' });
    else for (var rz = rz0; rz < rz1 - 0.01; rz += 0.45) this.box(T.mat === 'slate' ? 'ridge' : 'tileClay', rx0, ridgeY + 0.07, Math.min(rz + 0.225, rz1 - 0.01), 0.22, 0.10, Math.min(0.45, rz1 - rz) - 0.004, { kind: 'tile' });
    // eaves all round
    this.stage('fitout');
    var fy = ex - 0.06;
    [[(x0 + x1) / 2, z1, W, 0.022], [(x0 + x1) / 2, z0, W, 0.022], [x1, (z0 + z1) / 2, 0.022, D], [x0, (z0 + z1) / 2, 0.022, D]].forEach(function (f) { self.box(o.fascia || 'upvc', f[0], fy, f[1], f[2], 0.20, f[3], {}); });
    self.tube('gutter', [x0, fy + 0.02, z1 + 0.07], [x1, fy + 0.02, z1 + 0.07], 0.056, {});
    self.tube('gutter', [x0, fy + 0.02, z0 - 0.07], [x1, fy + 0.02, z0 - 0.07], 0.056, {});
    self.tube('gutter', [x1 + 0.07, fy + 0.02, z0], [x1 + 0.07, fy + 0.02, z1], 0.056, {});
    self.tube('gutter', [x0 - 0.07, fy + 0.02, z0], [x0 - 0.07, fy + 0.02, z1], 0.056, {});
    if (o.downpipes !== false) [[x1 - 0.1, z1 - 0.02 + 0.0], [x0 + 0.1, z0 + 0.02]].forEach(function (d) { self.tube('gutter', [d[0], fy, d[1] + (d[1] > 0 ? 0 : 0)], [d[0], 0.05, d[1]], 0.034, {}); });
    this.stage('masonry');
    return { ridgeY: ridgeY, rise: rise, eaveY: eY };
  };

  // Flat roof: deck, insulation, membrane, outlets; parapet built by the caller with wallRun
  KP.roofFlat = function (o) {
    this.stage('roofframe');
    var th = o.th || 0.22;
    this.box(o.deck || 'concrete', (o.x0 + o.x1) / 2, o.y - th / 2, (o.z0 + o.z1) / 2, o.x1 - o.x0, th, o.z1 - o.z0, {});
    this.stage('roofcover');
    this.box('insulation', (o.x0 + o.x1) / 2, o.y + 0.06, (o.z0 + o.z1) / 2, o.x1 - o.x0 - 0.05, 0.12, o.z1 - o.z0 - 0.05, {});
    this.box('membrane', (o.x0 + o.x1) / 2, o.y + 0.125, (o.z0 + o.z1) / 2, o.x1 - o.x0 - 0.04, 0.006, o.z1 - o.z0 - 0.04, {});
    this.env(o.x0, o.y - th, o.z0, o.x1, o.y + 0.13, o.z1);
    this.stage('masonry');
  };

  // ── chimney stack: brick courses round a flue, oversailing course, flaunching, pots, lead flashing ──
  KP.chimney = function (o) {
    var self = this, w = o.w || 0.90, d = o.d || 0.45, x = o.x, z = o.z, y0 = o.y0, y1 = o.y1;
    this.stage('roofcover');
    var pts = [[x - w / 2, z + d / 2], [x + w / 2, z + d / 2], [x + w / 2, z - d / 2], [x - w / 2, z - d / 2]];
    var runs = loopRuns(pts), n = Math.round((y1 - y0) / UK.CH);
    for (var k = 0; k < n; k++) {
      var yb = y0 + k * UK.CH;
      runs.forEach(function (r, i) {
        var own = (i + k) % 2 === 0, uA = own ? 0 : UK.CW, uB = own ? r.L : r.L - UK.CW;
        var oversail = k >= n - 2 ? 0.03 : 0;
        var rr = oversail ? { ax: r.ax + r.out[0] * oversail, az: r.az + r.out[1] * oversail, bx: r.bx + r.out[0] * oversail, bz: r.bz + r.out[1] * oversail, L: r.L, out: r.out } : r;
        self._layRun(rr, yb, UK.BL, UK.BH, UK.BW, [[uA, uB]], { uA: uA, uB: uB, mid: (uA + uB) / 2, unit: 'brick', palette: o.palette });
      });
    }
    var top = y0 + n * UK.CH;
    this.box('mortarDark', x, top + 0.04, z, w - 0.08, 0.08, d - 0.08, {});                         // flaunching
    var pots = o.pots == null ? 2 : o.pots;
    for (var pi = 0; pi < pots; pi++) {
      var px = x - w / 2 + w * (pi + 0.5) / pots;
      this.cyl('terracotta', px, top + 0.08 + 0.30, z, 0.115, 0.60, {});
      this.cyl('terracotta', px, top + 0.08 + 0.62, z, 0.13, 0.05, {});
    }
    // lead flashing apron where the stack leaves the roof
    if (o.roofY != null) this.box('lead', x, o.roofY + 0.10, z, w + 0.10, 0.20, d + 0.10, {});
    this.env(x - w / 2, y0, z - d / 2, x + w / 2, top + 0.7, z + d / 2);
    this.stage('masonry');
    return top;
  };

  // ── scaffold: standards, ledgers, transoms and boards around a perimeter, one lift per 2.0 m,
  //    each lift appears as the brickwork reaches it, all struck at the external stage ──
  KP.scaffoldLift = function (pts, y, opts) {
    opts = opts || {}; var self = this, off = opts.off || 1.15, b = bounds2(pts);
    var x0 = b.x0 - off, x1 = b.x1 + off, z0 = b.z0 - off, z1 = b.z1 + off, hide = { hideAfter: 0.80 };
    var edges = [[x0, z1, x1, z1], [x1, z1, x1, z0], [x1, z0, x0, z0], [x0, z0, x0, z1]];
    edges.forEach(function (e) {
      var L = Math.hypot(e[2] - e[0], e[3] - e[1]), n = Math.max(1, Math.round(L / 2.0));
      for (var i = 0; i <= n; i++) {
        var px = e[0] + (e[2] - e[0]) * i / n, pz = e[1] + (e[3] - e[1]) * i / n;
        self.tube('scaffold', [px, y - 2.0, pz], [px, y + 1.0, pz], 0.024, hide);
      }
      self.tube('scaffold', [e[0], y, e[1]], [e[2], y, e[3]], 0.024, hide);                    // ledger
      self.tube('scaffold', [e[0], y + 1.0, e[1]], [e[2], y + 1.0, e[3]], 0.024, hide);        // guard rail
      // boards (5 × 225 mm) between the face and the outer ledger
      var cx = (e[0] + e[2]) / 2, cz = (e[1] + e[3]) / 2, horiz = Math.abs(e[3] - e[1]) < 1e-6;
      var inward = horiz ? (e[1] === z1 ? -1 : 1) : (e[0] === x1 ? -1 : 1);
      for (var bi = 0; bi < 4; bi++) {
        var oo = 0.15 + bi * 0.23;
        self.box('scaffoldBoard', horiz ? cx : cx + inward * oo, y + 0.03, horiz ? cz + inward * oo : cz, horiz ? L : 0.225, 0.038, horiz ? 0.225 : L, hide);
      }
    });
  };

  // ── landscaping ──
  KP.lawn = function (x0, z0, x1, z1, o) { this.stage('external'); this.box('grass', (x0 + x1) / 2, 0.01, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, o || {}); this.stage('masonry'); };
  KP.paving = function (x0, z0, x1, z1, o) {   // 600 × 600 slabs (or block paving 200 × 100 when o.block)
    o = o || {}; this.stage('external');
    var sw = o.block ? 0.20 : 0.60, sd = o.block ? 0.10 : 0.60, mat = o.mat || (o.block ? 'blockPaving' : 'paving');
    for (var x = x0; x < x1 - 0.01; x += sw) for (var z = z0, r = 0; z < z1 - 0.01; z += sd, r++) {
      var xa = x + (o.block && r % 2 ? sw / 2 : 0), w = Math.min(sw, x1 - xa), d = Math.min(sd, z1 - z);
      if (w > 0.03 && d > 0.03) this.box(mat, xa + w / 2, 0.03, z + d / 2, w - 0.006, 0.04, d - 0.006, { color: o.block ? blockPaveColor(this.rand) : undefined });
    }
    this.stage('masonry');
  };
  function blockPaveColor(r) { var c = [0x7d6a5a, 0x6b5a4c, 0x8a7766, 0x5d4f45][Math.floor(r() * 4)]; return c; }
  KP.fence = function (pts, h, o) {   // close-board panels 1.83 wide between 100 mm posts, concrete gravel boards
    o = o || {}; var self = this; this.stage('external'); h = h || 1.80;
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 1.93)), ry = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      for (var k = 0; k <= n; k++) { var px = a[0] + (b[0] - a[0]) * k / n, pz = a[1] + (b[1] - a[1]) * k / n; self.box('fencePost', px, (h + 0.05) / 2, pz, 0.10, h + 0.05, 0.10, {}); }
      for (var j = 0; j < n; j++) {
        var cx = a[0] + (b[0] - a[0]) * (j + 0.5) / n, cz = a[1] + (b[1] - a[1]) * (j + 0.5) / n, pw = L / n - 0.10;
        self.box('concrete', cx, 0.075, cz, pw, 0.15, 0.05, { ry: ry });
        self.box('fence', cx, 0.15 + (h - 0.15) / 2, cz, pw, h - 0.15, 0.03, { ry: ry });
        var nb = Math.floor(pw / 0.10);
        for (var q = 0; q < nb; q += 3) { var u = -pw / 2 + (q + 0.5) * 0.10; self.box('fence', cx + Math.cos(ry) * u, 0.15 + (h - 0.15) / 2, cz - Math.sin(ry) * u, 0.095, h - 0.16, 0.035, { ry: ry, color: 0x5e4029 }); }
      }
    }
    this.stage('masonry');
  };
  KP.shrub = function (x, z, r, o) { this.stage('external'); this.sph('plant', x, r * 0.8, z, r, r * 0.8, r, Object.assign({ color: [0x3c6b35, 0x2f5a2c, 0x4b7a3c][Math.floor(this.rand() * 3)] }, o || {})); this.stage('masonry'); };
  KP.tree = function (x, z, h) {
    this.stage('external'); h = h || 5;
    this.cyl('bark', x, h * 0.3, z, 0.12, h * 0.6, {});
    for (var i = 0; i < 4; i++) this.sph('plant', x + (this.rand() - 0.5) * 1.2, h * 0.65 + this.rand() * h * 0.2, z + (this.rand() - 0.5) * 1.2, h * 0.22, h * 0.2, h * 0.22, { color: [0x3c6b35, 0x2f5a2c, 0x4b7a3c][i % 3] });
    this.stage('masonry');
  };
  KP.bin = function (x, z, ry, color) {
    this.stage('external');
    this.box(color || 'binBlack', x, 0.53, z, 0.58, 1.0, 0.74, { ry: ry || 0 });
    this.box(color || 'binBlack', x, 1.05, z - 0.02, 0.60, 0.04, 0.78, { ry: ry || 0 });
    this.cyl('rubber', x - 0.25, 0.10, z + 0.32, 0.10, 0.05, { rz: Math.PI / 2 });
    this.cyl('rubber', x + 0.25, 0.10, z + 0.32, 0.10, 0.05, { rz: Math.PI / 2 });
    this.stage('masonry');
  };

  // rotation matrix for Euler order 'YZX' (R = Ry · Rz · Rx), matching the viewer
  function rotM(rx, ry, rz) {
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // Rz·Rx
    var a = [[cz, -sz * cx, sz * sx], [sz, cz * cx, -cz * sx], [0, sx, cx]];
    // Ry·(Rz·Rx)
    return [[cy * a[0][0] + sy * a[2][0], cy * a[0][1] + sy * a[2][1], cy * a[0][2] + sy * a[2][2]], a[1], [-sy * a[0][0] + cy * a[2][0], -sy * a[0][1] + cy * a[2][1], -sy * a[0][2] + cy * a[2][2]]];
  }
  H._rotM = rotM;
  function extents(it) {
    var hx = it.sx / 2, hy = it.sy / 2, hz = it.sz / 2;
    if (!it.rx && !it.ry && !it.rz) return [hx, hy, hz];
    var R = rotM(it.rx, it.ry, it.rz);
    return [0, 1, 2].map(function (i) { return Math.abs(R[i][0]) * hx + Math.abs(R[i][1]) * hy + Math.abs(R[i][2]) * hz; });
  }
  H._extents = extents;


  // triangular prism (unit: triangle from (−.5,−.5) to (.5,−.5) apex (0,.5) in XY, extruded along Z) — pediments, dormer cheeks
  KP.tri = function (mat, x, y, z, sx, sy, sz, o) { return this._push('tri', mat, x, y, z, sx, sy, sz, o); };

  // ── ghost neighbour house (blueprint only): walls + gable roof as thin panels ──
  KP.ghostHouse = function (x0, x1, z0, z1, eaveY, ridgeY, ridge) {
    var self = this;
    this.ghost(function () {
      var t = 0.10;
      self.box('brick', (x0 + x1) / 2, eaveY / 2, z1 - t / 2, x1 - x0, eaveY, t);
      self.box('brick', (x0 + x1) / 2, eaveY / 2, z0 + t / 2, x1 - x0, eaveY, t);
      self.box('brick', x0 + t / 2, eaveY / 2, (z0 + z1) / 2, t, eaveY, z1 - z0);
      self.box('brick', x1 - t / 2, eaveY / 2, (z0 + z1) / 2, t, eaveY, z1 - z0);
      var alongX = (ridge || 'x') === 'x', span = alongX ? z1 - z0 : x1 - x0, rise = ridgeY - eaveY, sl = Math.sqrt(span * span / 4 + rise * rise), ang = Math.atan2(rise, span / 2);
      if (alongX) {
        self.box('slate', (x0 + x1) / 2, eaveY + rise / 2, z1 - span / 4, x1 - x0, 0.03, sl, { rx: ang });
        self.box('slate', (x0 + x1) / 2, eaveY + rise / 2, z0 + span / 4, x1 - x0, 0.03, sl, { rx: -ang });
        self.tri('brick', x0 + t / 2, eaveY + rise / 2, (z0 + z1) / 2, t, rise, span, { ry: Math.PI / 2 });
        self.tri('brick', x1 - t / 2, eaveY + rise / 2, (z0 + z1) / 2, t, rise, span, { ry: Math.PI / 2 });
      } else {
        self.box('slate', x1 - span / 4, eaveY + rise / 2, (z0 + z1) / 2, sl, 0.03, z1 - z0, { rz: -ang });
        self.box('slate', x0 + span / 4, eaveY + rise / 2, (z0 + z1) / 2, sl, 0.03, z1 - z0, { rz: ang });
      }
    });
  };

  // ── canted (splayed) bay window on a front wall facing +Z at z = zf: three faces at 45°, brick stall riser,
  //    sash/casement windows, stone/brick mullion piers, lead-flashed slate roof ──
  // o: { x0, x1 (width at the wall), d (projection), zf, y0 (bottom), sill, head, top, style, palette, roofTile }
  KP.bayWindow = function (o) {
    var self = this, d = o.d || 0.60, zf = o.zf || 0, w = o.x1 - o.x0, inset = d;           // 45° splays
    var A = [o.x0, zf], B = [o.x0 + inset, zf + d], C = [o.x1 - inset, zf + d], Dp = [o.x1, zf];
    var faces = [[A, B], [B, C], [C, Dp]], sill = o.sill || 0.75, head = o.head || 2.10, top = o.top || (head + 0.30);
    var style = o.style || 'sash';
    faces.forEach(function (f, i) {
      var ax = f[0][0], az = f[0][1], bx = f[1][0], bz = f[1][1], L = Math.hypot(bx - ax, bz - az);
      var tx = (bx - ax) / L, tz = (bz - az) / L, out = [tz, -tx];   // outward for a run going clockwise round the bay (seen from above)
      if (out[1] < 0 && i === 1) out = [-out[0], -out[1]];
      if (i === 0) out = [-Math.SQRT1_2, Math.SQRT1_2]; if (i === 2) out = [Math.SQRT1_2, Math.SQRT1_2]; if (i === 1) out = [0, 1];
      var run = { ax: ax, az: az, bx: bx, bz: bz, L: L, out: out };
      self.stage('masonry');
      // stall riser up to the sill, piers either side, brickwork above the head to the bay roof
      self.wallRun(ax, az, bx, bz, out, -0.15, sill - 0.075, { palette: o.palette, endsFlush: true });
      var pier = 0.12, op = { u0: pier, u1: L - pier, v0: sill, v1: head, type: 'window', style: style, sill: o.sillType || 'stone', lintel: 'none' };
      [[0, pier], [L - pier, L]].forEach(function (pr) {
        var c = self._runPoint(run, (pr[0] + pr[1]) / 2, 0.10);
        self.box(o.pierMat || 'stone', c[0], (sill + head) / 2, c[1], pr[1] - pr[0], head - sill, 0.20, { ry: self._ry(run) });
      });
      var hc = self._runPoint(run, L / 2, 0.10);
      self.box(o.pierMat || 'stone', hc[0], head + 0.075, hc[1], L, 0.15, 0.22, { ry: self._ry(run) });     // carved stone head
      if (top > head + 0.16) self.wallRun(ax, az, bx, bz, out, head + 0.15, top, { palette: o.palette, endsFlush: true });
      self._openingStructure(run, op, { sills: 'stone', palette: o.palette });
      self.stage('fitout'); self._openingFit(run, op, { frame: o.frame || 'timberPaint' }); self.stage('masonry');
    });
    // floor + ceiling of the bay
    self.stage('slab'); self.box('concrete', (o.x0 + o.x1) / 2, 0.10, zf + d / 2, w - 0.2, 0.15, d - 0.05, {});
    // lead-capped slate roof over the bay (three hipped slopes)
    self.stage('roofcover');
    var rt = top, rise = 0.45, mat = o.roofTile || 'slate';
    self.box(mat, (o.x0 + o.x1) / 2, rt + rise / 2, zf + d / 2 + 0.05, w - 2 * inset + 0.1, 0.03, Math.hypot(d, rise) + 0.12, { rx: Math.atan2(rise, d), kind: 'tile' });
    [[o.x0 + inset / 2, -1], [o.x1 - inset / 2, 1]].forEach(function (sd) {
      self.box(mat, sd[0], rt + rise / 2, zf + d / 2, inset * 1.25, 0.03, Math.hypot(d, rise) * 1.05, { ry: -sd[1] * Math.PI / 4, rx: Math.atan2(rise, d * 1.2), kind: 'tile' });
    });
    self.box('lead', (o.x0 + o.x1) / 2, rt + rise + 0.02, zf + 0.06, w, 0.05, 0.14, {});
    self.stage('fitout');
    self.box('timberPaint', (o.x0 + o.x1) / 2, rt - 0.02, zf + d + 0.03, w - 2 * inset + 0.1, 0.12, 0.05, {});
    self.stage('masonry');
    this.env(o.x0, 0, zf, o.x1, rt + rise, zf + d);
  };

  // ── column (classical): plinth, base, fluted-look shaft, capital ──
  KP.column = function (x, z, y0, h, r, o) {
    o = o || {}; var mat = o.mat || 'column';
    this.box(mat, x, y0 + 0.08, z, r * 2.6, 0.16, r * 2.6, {});
    this.cyl(mat, x, y0 + 0.16 + 0.06, z, r * 1.25, 0.12, {});
    this.cyl(mat, x, y0 + 0.28 + (h - 0.62) / 2, z, r, h - 0.62, { segments: 16 });
    this.cyl(mat, x, y0 + h - 0.27, z, r * 1.15, 0.08, {});
    this.box(mat, x, y0 + h - 0.12, z, r * 2.8, 0.22, r * 2.8, {});
  };

  // ── portico: columns + entablature + triangular pediment over a front door (front wall on z = zf) ──
  KP.portico = function (o) {
    var self = this, zf = o.zf || 0, n = o.columns || 4, x0 = o.x0, x1 = o.x1, d = o.d || 1.6, h = o.h || 3.6, r = o.r || 0.17;
    this.stage('external');
    // steps
    for (var i = 0; i < (o.steps || 3); i++) self.box('stone', (x0 + x1) / 2, 0.075 + i * 0.15, zf + d + 0.6 - i * 0.30, x1 - x0 + 0.6 - i * 0.2, 0.15, 1.2 - i * 0.0 + 0.0, {});
    self.box('stone', (x0 + x1) / 2, 0.45 + 0.075, zf + d / 2, x1 - x0 + 0.4, 0.15, d + 0.2, {});
    for (var c = 0; c < n; c++) { var cx = x0 + 0.25 + (x1 - x0 - 0.5) * c / (n - 1); self.column(cx, zf + d - 0.25, 0.60, h, r, { mat: 'column' }); }
    var ey = 0.60 + h;
    self.box('column', (x0 + x1) / 2, ey + 0.30, zf + d / 2, x1 - x0 + 0.3, 0.60, d + 0.15, {});                 // entablature
    self.box('column', (x0 + x1) / 2, ey + 0.63, zf + d / 2, x1 - x0 + 0.45, 0.08, d + 0.30, {});                // cornice
    var ph = (x1 - x0) * 0.22;
    self.tri('column', (x0 + x1) / 2, ey + 0.67 + ph / 2, zf + d / 2, x1 - x0 + 0.45, ph, d + 0.30, {});      // pediment
    self.tri('slate', (x0 + x1) / 2, ey + 0.69 + ph / 2, zf + d / 2, x1 - x0 + 0.55, ph + 0.04, d + 0.20, {});
    self.stage('masonry');
    this.env(x0, 0, zf, x1, ey + 0.7 + ph, zf + d);
  };

  // ── porch canopy (bracketed, tiled lean-to) above a door at x on a wall z = zf ──
  KP.canopy = function (x, zf, y, w, d, o) {
    o = o || {}; var self = this, rise = 0.30, mat = o.tile ? UK.TILES[o.tile].mat : 'tileConcrete';
    this.stage('fitout');
    [x - w / 2 + 0.08, x + w / 2 - 0.08].forEach(function (bx) { self.beam('timberPaint', [bx, y - 0.45, zf + 0.01], [bx, y, zf + d - 0.1], 0.09, 0.07, {}); });
    self.box('timberPaint', x, y + 0.02, zf + d / 2, w, 0.05, d, {});
    self.box(mat, x, y + rise / 2 + 0.06, zf + d / 2, w + 0.1, 0.03, Math.hypot(d, rise) + 0.1, { rx: Math.atan2(rise, d), kind: 'tile' });
    self.box('lead', x, y + rise + 0.07, zf + 0.04, w + 0.1, 0.03, 0.10, {});
    this.stage('masonry');
  };

  // ── dormer (pitched): cheeks, front with window, small gable roof — sits on a roof slope facing +Z ──
  KP.dormer = function (o) {
    var self = this, w = o.w || 1.3, h = o.h || 1.3, d = o.d || 1.6, x = o.x, z = o.z, y = o.y;
    this.stage('roofcover');
    self.box(o.cheek || 'lead', x - w / 2, y + h / 2, z - d / 2, 0.05, h, d, {});
    self.box(o.cheek || 'lead', x + w / 2, y + h / 2, z - d / 2, 0.05, h, d, {});
    self.box('timberPaint', x, y + h - 0.04, z - 0.03, w, 0.10, 0.06, {});
    self.tri(o.tile || 'slate', x, y + h + 0.30, z - d / 2, w + 0.25, 0.60, d + 0.15, { ry: 0 });
    this.stage('fitout');
    var run = { ax: x - w / 2, az: z, bx: x + w / 2, bz: z, L: w, out: [0, 1] };
    self._openingFit(run, { u0: 0.06, u1: w - 0.06, v0: y + 0.10, v1: y + h - 0.12, type: 'window', style: o.style || 'sash' }, { frame: o.frame || 'timberPaint' });
    this.stage('masonry');
  };

  // ── balcony: slab with edge, glass or railing balustrade, on a front face z = zf ──
  KP.balcony = function (x0, x1, zf, y, d, o) {
    o = o || {}; var self = this;
    this.stage(o.stage || 'fitout');
    self.box(o.slab || 'concrete', (x0 + x1) / 2, y - 0.10, zf + d / 2, x1 - x0, 0.20, d, {});
    if (o.glass) {
      self.box('glass', (x0 + x1) / 2, y + 0.55, zf + d - 0.03, x1 - x0, 1.0, 0.02, {});
      self.box('balcony', (x0 + x1) / 2, y + 1.08, zf + d - 0.03, x1 - x0, 0.05, 0.06, {});
      [x0, x1].forEach(function (xx) { self.box('glass', xx, y + 0.55, zf + d / 2, 0.02, 1.0, d - 0.06, {}); });
    } else {
      self.box('balcony', (x0 + x1) / 2, y + 1.06, zf + d - 0.03, x1 - x0, 0.04, 0.05, {});
      for (var xx = x0 + 0.06; xx < x1; xx += 0.12) self.box('balcony', xx, y + 0.53, zf + d - 0.03, 0.018, 1.06, 0.018, {});
      [x0 + 0.02, x1 - 0.02].forEach(function (sx) { self.box('balcony', sx, y + 1.06, zf + d / 2, 0.04, 0.04, d, {}); });
    }
    this.stage('masonry');
  };

  // ── garden wall with piers, coping, optional gate opening ──
  KP.gardenWall = function (pts, h, o) {
    o = o || {}; var self = this;
    this.stage('external');
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
      var out = [tz, -tx], gaps = (o.gates || []).filter(function (g) { return g.seg === i; });
      var ops = gaps.map(function (g) { return { u0: g.u0, u1: g.u1, v0: -1, v1: 9 }; });
      self.wallRun(a[0], a[1], b[0], b[1], out, 0, h, { palette: o.palette, openings: ops, coping: o.coping || 'stone', mat: 'brick' });
      gaps.forEach(function (g) {
        [g.u0, g.u1].forEach(function (u, j) {
          var px = a[0] + tx * (u + (j ? 0.165 : -0.165)), pz = a[1] + tz * (u + (j ? 0.165 : -0.165));
          self.box('brick', px, (h + 0.15) / 2, pz - out[1] * 0.05, 0.33, h + 0.15, 0.33, { color: self._brickColor(o.palette) });
          self.box('stone', px, h + 0.20, pz - out[1] * 0.05, 0.40, 0.08, 0.40, {});
        });
        if (o.gateMat !== false) {
          var gc = (g.u0 + g.u1) / 2, gx = a[0] + tx * gc, gz = a[1] + tz * gc;
          for (var q = -3; q <= 3; q++) self.box(o.gateMat || 'gutter', gx + tx * q * 0.12, h * 0.45, gz + tz * q * 0.12, 0.02, h * 0.85, 0.02, {});
          self.box(o.gateMat || 'gutter', gx, h * 0.85, gz, (g.u1 - g.u0) - 0.1, 0.04, 0.03, { ry: Math.atan2(-tz, tx) });
          self.box(o.gateMat || 'gutter', gx, h * 0.1, gz, (g.u1 - g.u0) - 0.1, 0.04, 0.03, { ry: Math.atan2(-tz, tx) });
        }
      });
    }
    this.stage('masonry');
  };

  // ── Victorian encaustic tiled path (black & white chequer) ──
  KP.tiledPath = function (x0, z0, x1, z1) {
    this.stage('external');
    var s = 0.15;
    for (var x = x0, i = 0; x < x1 - 0.01; x += s, i++) for (var z = z0, j = 0; z < z1 - 0.01; z += s, j++)
      this.box('paving', x + s / 2, 0.025, z + s / 2, s - 0.004, 0.03, s - 0.004, { color: (i + j) % 2 ? 0x1c1c1e : 0xe9e4d6 });
    this.stage('masonry');
  };

  // ── compile: group items into batches keyed by (shape, material, ghost, hideAfter), assign build time t ──
  KP.compile = function (meta) {
    meta = meta || {};
    var self = this, byStage = {};
    this.items.forEach(function (it) { (byStage[it.st] = byStage[it.st] || []).push(it); });
    Object.keys(byStage).forEach(function (k) {
      var S = STAGE_BY[k], arr = byStage[k], n = arr.length;
      arr.forEach(function (it, i) { it.t = it.g ? 0 : S.t0 + (S.t1 - S.t0) * (n > 1 ? i / (n - 1) : 1) * 0.999 + 1e-6; });
    });
    // Flats / apartments: meta.focus = {y0, y1} is the user's own floor. Its permanent parts are what the deposit builds
    // (re-timed across the whole 0–1 timeline in build order); everything else is context, shown as a faint hologram.
    var F = meta.focus || null;
    if (F) {
      var FST = { slab: 1, masonry: 1, roofframe: 1, roofcover: 1, fitout: 1, snag: 1 };
      this.items.forEach(function (it) { it.f = (!it.g && it.h >= 2 && FST[it.st] && it.y >= F.y0 && it.y <= F.y1) ? 1 : 0; });
      var fi = this.items.filter(function (it) { return it.f; }).sort(function (a, c) { return a.t - c.t || a.seq - c.seq; });
      fi.forEach(function (it, i) { it.t = 0.02 + 0.979 * (fi.length > 1 ? i / (fi.length - 1) : 1); });
    }
    var batches = {}, order = [];
    this.items.forEach(function (it) {
      var key = it.s + '|' + it.m + '|' + it.g + '|' + it.h + '|' + (it.f ? 1 : 0);
      if (!batches[key]) { batches[key] = { shape: it.s, mat: it.m, ghost: !!it.g, hideAfter: it.h, focus: !!it.f, items: [] }; order.push(key); }
      batches[key].items.push(it);
    });
    var out = order.map(function (k) {
      var b = batches[k];
      b.items.sort(function (a, c) { return a.t - c.t || a.seq - c.seq; });
      var n = b.items.length, f = new Float32Array(n * 10), t = new Float32Array(n), col = new Int32Array(n);
      b.items.forEach(function (it, i) {
        var o = i * 10;
        f[o] = it.x; f[o + 1] = it.y; f[o + 2] = it.z; f[o + 3] = it.sx; f[o + 4] = it.sy; f[o + 5] = it.sz; f[o + 6] = it.rx; f[o + 7] = it.ry; f[o + 8] = it.rz; f[o + 9] = 0;
        t[i] = it.t; col[i] = it.c;
      });
      var kinds = {}; b.items.forEach(function (it) { if (it.k) kinds[it.k] = (kinds[it.k] || 0) + 1; });
      return { shape: b.shape, mat: b.mat, ghost: b.ghost, hideAfter: b.hideAfter, focus: b.focus, count: n, xf: f, t: t, color: col, kinds: kinds,
        // t values of counted units for stats (flats: the user's own floor only)
        unitT: b.items.filter(function (it) { return it.k && !it.g && (!F || it.f); }).map(function (it) { return [it.k, it.t]; }) };
    });
    // global bounds of the real (non-ghost) building
    var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    this.items.forEach(function (it) {
      if (it.g || it.h < 2 || it.st === 'external' || it.st === 'setout' || (it.y < -0.05 && it.m !== 'brick')) return;
      var e = extents(it);
      mn[0] = Math.min(mn[0], it.x - e[0]); mn[1] = Math.min(mn[1], it.y - e[1]); mn[2] = Math.min(mn[2], it.z - e[2]);
      mx[0] = Math.max(mx[0], it.x + e[0]); mx[1] = Math.max(mx[1], it.y + e[1]); mx[2] = Math.max(mx[2], it.z + e[2]);
    });
    mn[1] = Math.max(mn[1], -0.5);
    // camera frame: the building plus its permanent garden/street works (paths, walls, gates)
    var fmn = mn.slice(), fmx = mx.slice();
    this.items.forEach(function (it) {
      if (it.g || it.h < 2 || it.st !== 'external' || it.y < -0.05) return;
      var e = extents(it);
      fmn[0] = Math.min(fmn[0], it.x - e[0]); fmn[2] = Math.min(fmn[2], it.z - e[2]);
      fmx[0] = Math.max(fmx[0], it.x + e[0]); fmx[2] = Math.max(fmx[2], it.z + e[2]);
    });
    // keep the frame sensible: never more than 8 m beyond the building on any side
    for (var a = 0; a < 3; a += 2) { fmn[a] = Math.max(fmn[a], mn[a] - 8); fmx[a] = Math.min(fmx[a], mx[a] + 8); }
    var unitTs = { brick: [], block: [], tile: [] };
    out.forEach(function (b) { b.unitT.forEach(function (u) { if (unitTs[u[0]]) unitTs[u[0]].push(u[1]); }); delete b.unitT; });
    Object.keys(unitTs).forEach(function (k) { unitTs[k].sort(function (a, c) { return a - c; }); });
    var model = {
      type: meta.type || '', name: meta.name || '', batches: out, anchors: this.anchors, envelope: this.envelope, focus: F ? { y0: F.y0, y1: F.y1 } : null,
      bounds: { min: mn, max: mx }, frame: { min: fmn, max: fmx }, height: mx[1], counts: { bricks: unitTs.brick.length, blocks: unitTs.block.length, tiles: unitTs.tile.length },
      instances: this.items.length, info: meta.info || {},
      stats: function (p) {
        var cnt = function (arr) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] <= p) lo = m + 1; else hi = m; } return lo; };
        var st = H.stageAt(p);
        return { bricksLaid: cnt(unitTs.brick), bricksTotal: unitTs.brick.length, blocksLaid: cnt(unitTs.block), tilesLaid: cnt(unitTs.tile), tilesTotal: unitTs.tile.length, stage: st.name, stageKey: st.key };
      },
      // p at which the n-th brick is laid (for HUD maths)
      brickT: function (i) { var a = unitTs.brick; return a.length ? a[Math.max(0, Math.min(a.length - 1, i))] : 0; }
    };
    return model;
  };

  // ── model registry ──
  H.models = H.models || {};
  H.build = function (type, opts) {
    opts = opts || {};
    var fn = H.models[type] || H.models.terraced;
    var K = new Kit({ seed: opts.seed || 11, palette: opts.palette });
    var meta = fn(K, opts) || {};
    var m = K.compile(Object.assign({ type: type }, meta));
    return m;
  };
})(HB3D);
if (typeof module !== 'undefined') module.exports = HB3D;
