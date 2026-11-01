// ═══════════════════════════════════════════════════════════════
// HB3D VIEWER — renders an HB3D model with Three.js r128 (global THREE + THREE.OrbitControls).
// One renderer per container, reused for every model / progress / mode change (no context churn).
// ═══════════════════════════════════════════════════════════════
(function (H) {
  'use strict';
  // three.js is loaded on first need (index.html viThree): until it arrives the viewer is not supported, and H._boot() builds it
  // once THREE exists. Everything below runs inside boot() for that reason.
  function boot() {
  var _sup = null;
  H.supported = function () {
    if (_sup !== null) return _sup;
    try {
      if (!THREE.WebGLRenderer || !THREE.OrbitControls) return (_sup = false);
      var c = document.createElement('canvas');
      _sup = !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { _sup = false; }
    return _sup;
  };


  var GEOM = null;
  H._geoms = function () { return geoms(); };
  function geoms() {
    if (GEOM) return GEOM;
    GEOM = {
      box: new THREE.BoxBufferGeometry(1, 1, 1),
      cyl: new THREE.CylinderBufferGeometry(0.5, 0.5, 1, 12, 1),
      sph: new THREE.IcosahedronBufferGeometry(0.5, 1),
      tri: (function () {   // triangular prism: base (−.5,−.5)…(.5,−.5), apex (0,.5), depth ±.5
        var sh = new THREE.Shape(); sh.moveTo(-0.5, -0.5); sh.lineTo(0.5, -0.5); sh.lineTo(0, 0.5); sh.lineTo(-0.5, -0.5);
        var g = new THREE.ExtrudeBufferGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g;
      })()
    };
    return GEOM;
  }

  function col(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  // The brand build draws the house with its own shaders (brand.js). The only standard material left is the faint blueprint
  // silhouette of the rest of a block of flats around your floor.
  function makeMaterials() {
    var blue = new THREE.MeshLambertMaterial({ color: col(0x2a8f8a), emissive: col(0x0f4a47), transparent: true, opacity: 0.11, depthWrite: true });
    blue.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', ''); };
    blue.customProgramCacheKey = function () { return 'hb3d:flat'; };
    blue.clippingPlanes = [IDLE_PLANE];
    return { blue: blue };
  }

  // ── Uploaded / AI-generated designs (GLB) ──
  // Normalises the scene to metres (ground at y 0, front face on z 0, centred on x) and wraps it as a model the viewer
  // and the app treat like the built-in houses: hologram build during the deposit, graded colour once owned.
  // meta: { name, realSize (Meshy auto_size output is already in metres), source }
  var UK_CH = 0.075;
  H.customModel = function (root, meta) {
    meta = meta || {};
    root.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
    var h0 = Math.max(1e-3, size.y), fp0 = Math.max(1e-3, size.x, size.z), sc = 1;
    // already metres? (Meshy's auto-size output, or anything house-sized: ≥ 3.5 m to the ridge, ≥ 4 m on plan)
    var metres = (meta.realSize && h0 > 2.5 && h0 < 160) || (h0 >= 3.5 && h0 < 160 && fp0 >= 4 && fp0 < 200);
    if (!metres) { sc = 8.5 / h0; if (fp0 * sc > 30) sc = 30 / fp0; }   // unknown units (cm, inches, unit cube…): a two-storey house ≈ 8.5 m
    var wrap = new THREE.Group();
    root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -box.max.z);
    wrap.add(root); wrap.scale.setScalar(sc); wrap.updateMatrixWorld(true);
    var W = size.x * sc, D = size.z * sc, Hh = size.y * sc, meshes = 0;
    wrap.traverse(function (o) { if (o.isMesh) meshes++; });
    // Brick estimate for the HUD: external wall area (≈ 72% of the height is wall, 18% openings) × 60 UK bricks per m²
    var wallH = Hh * 0.72, bricks = Math.max(1000, Math.round(2 * (W + D) * wallH * 0.82 * 60)), tiles = Math.round(W * D * 1.25 * 10);
    var rows = { y0: 0, y1: Hh, n: Math.max(1, Math.round(Hh / UK_CH)), ch: UK_CH };
    var stats = function (p) {
      var k = Math.max(0, Math.min(1, p)), r = k <= 0 ? 0 : Math.min(rows.n, Math.floor(k * rows.n - 1e-9) + 1);
      return { bricksLaid: Math.round(bricks * k), bricksTotal: bricks, blocksLaid: 0, tilesLaid: Math.round(tiles * k), tilesTotal: tiles, stage: 'Row ' + r + ' of ' + rows.n, stageKey: 'rows' };
    };
    return {
      type: 'custom', custom: wrap, clean: true, rows: rows, name: meta.name || 'Your design', source: meta.source || 'upload', batches: [], anchors: {}, focus: null,
      envelope: [[-W / 2, 0, -D, W / 2, Hh, 0]], bounds: { min: [-W / 2, 0, -D], max: [W / 2, Hh, 0] }, height: Hh,
      counts: { bricks: bricks, blocks: 0, tiles: tiles }, instances: meshes, info: { width: W, depth: D, height: Hh, scale: sc, estimated: true },
      stats: stats, brickT: function (i) { return Math.max(0, Math.min(1, i / bricks)); }
    };
  };
  var IDLE_PLANE = H._IDLE_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);   // keeps every material on one clipping plane at all times
  var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(0, 0, 0, 'YZX'), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();

  function Viewer(container, opts) {
    opts = opts || {};
    this.el = container;
    this.opts = opts;
    var w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    var r = this.renderer = new THREE.WebGLRenderer({ antialias: !opts.mobile, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });   // touch devices: no MSAA (the pixel ratio covers it; MSAA on a big phone canvas is what loses the context)
    var me = this;   // brand look (house flag): pixel ratio capped at 1.5 below 700 px wide, 2 above (brand handover 6.10)
    this._dprFor = function (w, h) { var budget = opts.mobile ? 2.2e6 : 4e6; return Math.max(1, Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2, me.brand ? (me._bLite ? 1 : w < 700 ? 1.25 : 1.5) : 9, Math.sqrt(budget / Math.max(1, w * h)))); };
    r.setPixelRatio(this._dprFor(w, h));
    r.setSize(w, h, false);
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.localClippingEnabled = true;
    this.mobile = !!opts.mobile;
    r.shadowMap.enabled = !this.mobile; r.shadowMap.type = THREE.PCFSoftShadowMap; r.shadowMap.autoUpdate = false;
    var cv = r.domElement; cv.className = 'hb3d-canvas'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', '3D house model');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;touch-action:none';
    container.insertBefore(cv, container.firstChild);

    var sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color(0x05101b);
    sc.fog = new THREE.Fog(0x05101b, 60, 160);
    var cam = this.camera = new THREE.PerspectiveCamera(36, w / h, 0.05, 600);
    // lights: cool sky + warm key light (late-afternoon sun) with soft shadows
    sc.add(new THREE.HemisphereLight(col(0xa8dcd6), col(0x10302e), 0.66));
    var sun = this.sun = new THREE.DirectionalLight(col(0xfff0de), 1.2);
    sun.position.set(18, 26, 22); sun.castShadow = !this.mobile;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    sc.add(sun); sc.add(sun.target);
    var fill = new THREE.DirectionalLight(col(0x6fb8d8), 0.35); fill.position.set(-20, 12, -10); sc.add(fill);
    // ground: dark plot surface + teal survey grid (the app's look)
    var ground = this.ground = new THREE.Mesh(new THREE.CircleBufferGeometry(900, 64), new THREE.MeshStandardMaterial({ color: col(0x0c1a20), roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true; sc.add(ground);
    var g1 = new THREE.GridHelper(240, 240, col(0x1f5e5a), col(0x123734)); g1.material.transparent = true; g1.material.opacity = 0.35; g1.position.y = 0.001; sc.add(g1);
    this.grid = g1;
    this.root = new THREE.Group(); sc.add(this.root);
    this.edges = null;

    var ctl = this.controls = new THREE.OrbitControls(cam, cv);
    ctl.enableDamping = true; ctl.dampingFactor = 0.09; ctl.rotateSpeed = 0.8; ctl.zoomSpeed = 1.0; ctl.panSpeed = 0.8;
    ctl.maxPolarAngle = Math.PI / 2 - 0.04; ctl.screenSpacePanning = true;
    ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    ctl.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    var self = this;
    ctl.addEventListener('change', function () { self.dirty = true; self.wake(); if (self.onView) self.onView(self); });

    this.mode = 'build'; this.p = 1; this.eq = 0; this.model = null; this.batches = [];
    this.lights = false; this.dirty = true; this.active = true; this._raf = 0;
    this.fitDist = 20;
    this._idle = 0;
    this._loop = function () {
      self._raf = 0;
      if (!self.active || self.offscreen || document.hidden) { self._lastT = 0; return; }   // off screen or in a background tab: sleep (woken when seen again)
      // brand: what a drawn frame really cost is the gap until the browser gives us the next frame (the GPU work lands after render() returns)
      if (self.brand && self._bDrewAt) { var fc = performance.now() - self._bDrewAt; self._bCost = self._bCost == null ? fc : self._bCost * 0.6 + fc * 0.4; self._bDrewAt = 0; self._bGap = Math.max(80, Math.min(1500, self._bCost * 2.2)); }
      var moving = self.controls.update();
      if (self._fly) moving = self._stepFly() || moving;
      if (self._brandTick) moving = self._brandTick() || moving;   // brand look: smoothing, brick drops, pulse, sweep, ring (only while on screen)
      // brand lite (slow or software-drawn GPU, owner 31 Oct): frames are spaced at about 2.5x their own cost, so the page always has time
      // to answer taps and scrolls between them ("Page unresponsive" otherwise); a skipped frame keeps the loop alive without drawing
      if (self.brand && self._bLite && (self.dirty || moving) && performance.now() - (self._bLastDraw || 0) < (self._bGap || 120)) { self._raf = requestAnimationFrame(self._loop); return; }
      if (self.brand && self._bCalm && !self._bLite && performance.now() - (self._bLastDraw || 0) < 32) { self._raf = requestAnimationFrame(self._loop); return; }   // brand at rest: 30 frames a second
      if (self.dirty || moving) {
        var t = performance.now();
        self.render(); self.dirty = false; self._idle = 0;
        if (self.brand) { self._bLastDraw = self._bDrewAt = performance.now(); self._bDraws = (self._bDraws || 0) + 1; }
        // adaptive quality: the gap between moving frames, averaged after a warm-up, tells whether this device keeps up; a slow
        // one (under ~14 frames a second over 40 frames) drops to lite (no shadows, pixel ratio 1) rather than stuttering
        self._lastT = moving ? t : 0;
      } else { self._idle++; self._lastT = 0; }
      if (self._idle > 45) return;                         // nothing moving for ~0.75 s: sleep until woken
      self._raf = requestAnimationFrame(self._loop);
    };
    ctl.addEventListener('start', function () { self.wake(); });
    ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { cv.addEventListener(ev, function () { self.wake(); }, { passive: true }); });
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self.resize(); });
      this._ro.observe(container);
    }
    // only draw while the stage can be seen: another tab, a scrolled-away stage or a hidden page costs nothing
    this.offscreen = false;
    if (typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver(function (es) { var vis = es[es.length - 1].isIntersecting; if (vis === !self.offscreen) return; self.offscreen = !vis; if (vis) { self.dirty = true; self.wake(); } }, { threshold: 0.01 });
      this._io.observe(container);
    }
    this._onVis = function () { if (!document.hidden) { self.dirty = true; self.wake(); } };
    document.addEventListener('visibilitychange', this._onVis);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; self.stop(); if (self.onLost) self.onLost(); });
    cv.addEventListener('webglcontextrestored', function () { self.lost = false; self._shadowDirty = true; if (self.model) self.show(self.model, true); self.start(); if (self.onRestored) self.onRestored(); });
    this.start();
  }
  H.Viewer = Viewer;
  var VP = Viewer.prototype;

  VP.start = function () { this.active = true; this.dirty = true; this.wake(); };
  VP.wake = function () { this._idle = 0; if (this.active && !this._raf) this._raf = requestAnimationFrame(this._loop); };
  VP.settled = function () { if (this._brandActive && this._brandActive()) return this._brandSettled(); return this._idle > 2; };
  VP.stop = function () { this.active = false; if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; } };
  // lite quality for a device that cannot keep up: shadows off, pixel ratio 1 (nothing else changes; the brand look has its own lite stage)
  VP.goLite = function () {
    if (this._lite) return; this._lite = true;
    this.renderer.shadowMap.enabled = false; this.sun.castShadow = false; this.opts.maxDpr = 1;
    this.scene.traverse(function (o) { var m = o.material; if (!m) return; (Array.isArray(m) ? m : [m]).forEach(function (x) { x.needsUpdate = true; }); });
    var w = this.el.clientWidth, h = this.el.clientHeight;
    if (w > 2 && h > 2) { this.renderer.setPixelRatio(this._dprFor(w, h)); this.renderer.setSize(w, h, false); }
    this.dirty = true; this._shadowDirty = true; this.wake();
  };
  VP.resize = function () {
    var w = this.el.clientWidth, h = this.el.clientHeight;
    if (!(w > 2 && h > 2)) return false;
    var cur = this.renderer.getSize(new THREE.Vector2());
    if (Math.abs(cur.x - w) < 1 && Math.abs(cur.y - h) < 1) return true;
    this.renderer.setPixelRatio(this._dprFor(w, h));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.dirty = true; this._shadowDirty = true;
    return true;
  };
  VP.render = function () {
    if (this.lost) return;
    if (!this.resize()) return;
    var d = this.distance(), rad = this._radius || 20, cam = this.camera;   // depth precision: keep near/far tight round the model
    var nn = Math.max(0.05, Math.min(10, 0.05 * d)), ff = d + 3 * rad + 50;
    if (Math.abs(cam.near - nn) > 1e-3 || Math.abs(cam.far - ff) > 1e-2) { cam.near = nn; cam.far = ff; cam.updateProjectionMatrix(); }
    if (this._shadowDirty) { this.renderer.shadowMap.needsUpdate = true; this._shadowDirty = false; }
    this.renderer.render(this.scene, this.camera);
    if (this.onRender) this.onRender(this);
  };

  VP._clear = function () {
    var self = this;
    if (this._brandClear) this._brandClear();
    this.batches.forEach(function (b) { if (b.main) { self.root.remove(b.main); b.main.dispose && b.main.dispose(); } });
    this.batches = [];
    if (this.edges) { this.root.remove(this.edges); this.edges.geometry.dispose(); this.edges = null; }
    if (this.focusBox) { this.root.remove(this.focusBox); this.focusBox.geometry.dispose(); this.focusBox = null; }
    if (this.site) { this.root.remove(this.site); this.site = null; }
  };

  // Build the instanced meshes for a compiled model
  VP.show = function (model, keepCamera) {
    var self = this, G = geoms();
    this._clear();
    this.model = model;
    if (!model) { this.dirty = true; return; }
    var mats = this._mats || (this._mats = makeMaterials());
    model.batches.forEach(function (b) {   // the house itself is drawn by the brand build; only the rest of a block of flats needs a mesh here
      var ctx = !!(model.focus && !b.focus && !b.ghost && b.hideAfter >= 2), n = b.count, main = null;
      if (ctx) {
        main = new THREE.InstancedMesh(G[b.shape] || G.box, mats.blue, n);
        for (var i = 0; i < n; i++) {
          var o = i * 10, xf = b.xf;
          tmpP.set(xf[o], xf[o + 1], xf[o + 2]); tmpS.set(xf[o + 3], xf[o + 4], xf[o + 5]);
          tmpE.set(xf[o + 6], xf[o + 7], xf[o + 8], 'YZX'); tmpQ.setFromEuler(tmpE);
          main.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
        }
        main.instanceMatrix.needsUpdate = true; main.frustumCulled = false; main.visible = false; self.root.add(main);
      }
      self.batches.push({ b: b, main: main, mats: mats, n: n });
    });
    // blueprint edges of the finished envelope (silhouette of the final house)
    var pos = [];
    (model.envelope || []).forEach(function (e) {
      var x0 = e[0], y0 = e[1], z0 = e[2], x1 = e[3], y1 = e[4], z1 = e[5], sh = e[6], seg = function (a, b) { pos.push(a[0], a[1], a[2], b[0], b[1], b[2]); };
      if (sh && (sh.k === 'gable' || sh.k === 'hip')) {   // pitched roof outline: eaves rectangle, ridge, and the gable / hip lines
        var X = sh.axis === 'x', zm = (z0 + z1) / 2, xm = (x0 + x1) / 2, hh = Math.min(x1 - x0, z1 - z0) / 2;
        var h0 = sh.k === 'hip' && (!sh.hips || sh.hips[0]) ? hh : 0, h1 = sh.k === 'hip' && (!sh.hips || sh.hips[1]) ? hh : 0;   // hipped ends shorten the ridge
        var r0 = X ? [x0 + h0, y1, zm] : [xm, y1, z0 + h0], r1 = X ? [x1 - h1, y1, zm] : [xm, y1, z1 - h1];
        var c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
        for (var q = 0; q < 4; q++) seg(c[q], c[(q + 1) % 4]);
        seg(r0, r1);
        if (X) { seg(c[0], r0); seg(c[3], r0); seg(c[1], r1); seg(c[2], r1); } else { seg(c[0], r0); seg(c[1], r0); seg(c[3], r1); seg(c[2], r1); }
        return;
      }
      var c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (s) { pos.push.apply(pos, c[s[0]]); pos.push.apply(pos, c[s[1]]); });
    });
    if (pos.length) {
      var eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      this.edges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: col(0x44c0b9), transparent: true, opacity: 0.35, depthWrite: false }));
      this.root.add(this.edges);
    }
    var bb = model.bounds, wx = bb.max[0] - bb.min[0] + 0.6, wz = bb.max[2] - bb.min[2] + 0.6;
    // the user's own floor (flats / apartments): a gold frame that marks it in every mode
    if (model.focus) {
      var F = model.focus, fh = Math.max(0.2, F.y1 - F.y0);
      var fg = new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(wx - 0.3, fh, wz - 0.3));
      this.focusBox = new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ color: col(0xe8c56a), transparent: true, opacity: 0.9, depthWrite: false }));
      this.focusBox.position.set((bb.min[0] + bb.max[0]) / 2, F.y0 + fh / 2, (bb.min[2] + bb.max[2]) / 2);
      this.focusBox.renderOrder = 6; this.root.add(this.focusBox);
    }
    if (!keepCamera) this.fit();
    this.apply();
  };

  // camera framing: front-right, elevated, auto distance
  VP.fit = function () {
    var m = this.model, bb = m ? (m.frame || m.bounds) : { min: [-4, 0, -6], max: [4, 4, 2] };   // frame: house + front garden
    var cx = (bb.min[0] + bb.max[0]) / 2, cz = (bb.min[2] + bb.max[2]) / 2, H = Math.max(2, bb.max[1]);
    var rad = Math.sqrt(Math.pow(bb.max[0] - bb.min[0], 2) + Math.pow(bb.max[2] - bb.min[2], 2) + H * H) / 2;
    this._radius = rad;
    var fov = this.camera.fov * Math.PI / 180, aspect = Math.max(0.5, this.camera.aspect || 1.6);
    var aspF = this.brand ? (aspect < 1 ? 0.98 / aspect : 0.9) : (aspect < 1 ? 1.15 / aspect : 1.02);   // brand build: the house fills the frame like the brand book, closer still on phones (owner, 30 Oct 2026)
    var F = m && m.focus, fRad = F ? Math.max(6, Math.hypot(bb.max[0] - bb.min[0], bb.max[2] - bb.min[2]) / 2 * 1.05) : rad;   // flats: frame YOUR floor, with the block above and below as context
    var d = fRad / Math.sin(fov / 2) * aspF, dAll = rad / Math.sin(fov / 2) * aspF;
    this.fitDist = d;
    var az = (this.opts.azimuth == null ? 32 : this.opts.azimuth) * Math.PI / 180, el = 20 * Math.PI / 180;
    var target = new THREE.Vector3(cx, F ? (F.y0 + F.y1) / 2 : H * (H > 20 ? 0.5 : 0.42), cz + 0.2);   // towers: aim at mid-height so the crown stays in frame
    this.controls.target.copy(target);
    this.camera.position.set(target.x + d * Math.sin(az) * Math.cos(el), target.y + d * Math.sin(el), target.z + d * Math.cos(az) * Math.cos(el));
    this.controls.minDistance = Math.max(1.0, fRad * 0.12);
    this.controls.maxDistance = Math.max(d * 5, dAll * 1.7);    // always able to pull back to the whole building
    this.camera.near = 0.05; this.camera.far = Math.max(300, dAll * 8); this.camera.updateProjectionMatrix();
    this.scene.fog.near = Math.max(d, dAll) * 1.6; this.scene.fog.far = Math.max(d, dAll) * 4.5;
    this.controls.update();
    this.dirty = true;
  };
  VP.distance = function () { return this.camera.position.distanceTo(this.controls.target); };
  VP.zoom = function () { return this.fitDist / Math.max(1e-6, this.distance()); };     // 1 = framed
  VP.setZoom = function (z) {
    z = Math.max(this.fitDist / this.controls.maxDistance, Math.min(this.fitDist / this.controls.minDistance, z));
    var dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    this.camera.position.copy(this.controls.target).addScaledVector(dir, this.fitDist / z);
    this.controls.update(); this.dirty = true; this.wake();
  };
  VP.setPanMode = function (pan) {
    this.controls.mouseButtons.LEFT = pan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    this.controls.touches.ONE = pan ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  };

  VP.setState = function (s) {
    if (s.p != null) { this.p = Math.max(0, Math.min(1, s.p)); this._bTarget = this.p; }
    if (s.mode) this.mode = s.mode;
    if (s.eq != null) this.eq = Math.max(0, Math.min(1, s.eq));
    if (s.lights != null) this.lights = !!s.lights;
    this.apply();
  };
  VP.animateTo = function (p1) {
    if (this._brandActive && this._brandActive()) { this._bTarget = Math.max(0, Math.min(1, p1)); this.dirty = true; this.wake(); return; }   // eased by the frame loop
    this.setState({ p: p1 });
  };
  // modes (all drawn by the brand build, brand.js): 'site' nothing built yet; 'build' Level 1, the deposit lays the bricks;
  // 'equity' Level 2, the paid share solid below a gold line and the rest a faint hologram; 'complete' mortgage free.
  // Flats / apartments (model.focus): only the user's own floor builds; the rest of the block stays a faint silhouette.
  VP.apply = function () {
    var m = this.model; if (!m) { this.dirty = true; return; }
    if (this._brandActive && this._brandActive()) { this._brandApplyAll(); return; }
    if (this._bOn) this._brandEnv(false);   // nothing the brand build can draw (no laying plan): an empty stage
    this.batches.forEach(function (B) { if (B.main) B.main.visible = false; });
    if (this.edges) this.edges.visible = false;
    this.dirty = true; this.wake();
  };

  // project a world point to container pixels (for DOM overlays)
  VP.project = function (x, y, z) {
    var v = new THREE.Vector3(x, y, z).project(this.camera), w = this.el.clientWidth, h = this.el.clientHeight;
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, behind: v.z > 1 };
  };
  // the row the deposit has built to: { y, row, rows, p, ratio }  (build mode; p = deposit % funded)
  VP.rowInfo = function () {
    var m = this.model; if (!m || !m.rows) return null;
    if (this._brandActive && this._brandActive() && this._bInfo) { var bi = this._bInfo; return { y: bi.y, row: bi.row, rows: bi.rows, p: bi.p, brand: bi }; }
    return null;
  };
  // glide the camera to look at the current row (and in a little)
  VP.flyToRow = function (ms) {
    var ri = this.rowInfo(); if (!ri) return;
    var bb = this.model.bounds, tgt = new THREE.Vector3((bb.min[0] + bb.max[0]) / 2, Math.max(0.3, ri.y), (bb.min[2] + bb.max[2]) / 2);
    this._fly = { t0: performance.now(), ms: ms || 650, from: this.controls.target.clone(), to: tgt, z0: this.zoom(), z1: Math.max(this.zoom(), this.brand ? 1.3 : 1.9) };   // brand build: stay far enough out that the whole house keeps its context (owner saw a wall-only view, 30 Oct)
    this.dirty = true; this.wake();
  };
  VP._stepFly = function () {
    var f = this._fly, k = Math.min(1, (performance.now() - f.t0) / f.ms), e = 1 - Math.pow(1 - k, 3);
    var tgt = new THREE.Vector3().lerpVectors(f.from, f.to, e), d = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    this.controls.target.copy(tgt); this.camera.position.copy(tgt).add(d); this.setZoom(f.z0 + (f.z1 - f.z0) * e);
    if (k >= 1) this._fly = null;
    return true;
  };
  VP.waterline = function () { var m = this.model; if (!m) return 0; var F = m.focus; return F ? F.y0 + this.eq * (F.y1 - F.y0) : (m.rows ? m.rows.y0 + this.eq * (m.rows.y1 - m.rows.y0) : this.eq * Math.max(0.5, m.height)); };
  VP.dispose = function () {
    this.stop(); this._clear();
    if (this._ro) this._ro.disconnect();
    if (this._io) this._io.disconnect();
    if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
    if (this._bIO) this._bIO.disconnect();
    this.controls.dispose(); this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  };
  }   // end boot()
  if (typeof THREE !== 'undefined') boot();
  else {
    H.supported = function () { return false; };
    H._boot = function () { if (typeof THREE === 'undefined') return false; delete H._boot; boot(); if (H._bootBrand) { var b = H._bootBrand; delete H._bootBrand; b(); } return true; };
  }
})(HB3D);
