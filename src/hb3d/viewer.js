// ═══════════════════════════════════════════════════════════════
// HB3D VIEWER — renders an HB3D model with Three.js r128 (global THREE + THREE.OrbitControls).
// One renderer per container, reused for every model / progress / mode change (no context churn).
// ═══════════════════════════════════════════════════════════════
(function (H) {
  'use strict';
  if (typeof THREE === 'undefined') { H.supported = function () { return false; }; return; }

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

  // ── materials (sRGB colours; the renderer outputs sRGB) ──
  var MATS = H.MATS = {
    brick:        { color: 0xffffff, rough: 0.92, inst: true },
    brickHidden:  { color: 0xffffff, rough: 0.92, inst: true },
    block:        { color: 0xffffff, rough: 0.95, inst: true },
    mortar:       { color: 0xb9b2a5, rough: 1.0 },
    mortarDark:   { color: 0x8f8a80, rough: 1.0 },
    mortarLime:   { color: 0xd0c4a8, rough: 1.0 },
    insulation:   { color: 0xe6d9a2, rough: 0.9 },
    closer:       { color: 0xd8d2c0, rough: 0.9 },
    concrete:     { color: 0x9c9a94, rough: 0.95 },
    soil:         { color: 0x4a3a2c, rough: 1.0 },
    dpc:          { color: 0x16181b, rough: 0.6 },
    timber:       { color: 0xc8a06e, rough: 0.85 },
    timberWhite:  { color: 0xf1efe9, rough: 0.6 },
    chipboard:    { color: 0xb9955f, rough: 0.9 },
    steel:        { color: 0x6e7880, rough: 0.5, metal: 0.6 },
    metal:        { color: 0x9aa3ab, rough: 0.4, metal: 0.7 },
    felt:         { color: 0x2a2d33, rough: 0.9 },
    slate:        { color: 0xffffff, rough: 0.55, inst: true },
    tileClay:     { color: 0xffffff, rough: 0.85, inst: true },
    tileConcrete: { color: 0xffffff, rough: 0.9, inst: true },
    ridge:        { color: 0x4a4440, rough: 0.85 },
    lead:         { color: 0x6b7178, rough: 0.6, metal: 0.3 },
    stone:        { color: 0xd9cfb6, rough: 0.9 },
    render:       { color: 0xeae5d8, rough: 0.95 },
    pebbledash:   { color: 0xd3cbb5, rough: 1.0 },
    upvc:         { color: 0xf3f3ef, rough: 0.45 },
    upvcGrey:     { color: 0x3a3f45, rough: 0.5 },
    upvcBlack:    { color: 0x1d2024, rough: 0.5 },
    timberPaint:  { color: 0xf0ede4, rough: 0.55 },
    glass:        { color: 0x9fc4d6, rough: 0.05, metal: 0.2, opacity: 0.38, glass: true },
    doorRed:      { color: 0x7a1d22, rough: 0.45 },
    doorBlue:     { color: 0x1d2f55, rough: 0.45 },
    doorGreen:    { color: 0x1f4a35, rough: 0.45 },
    doorBlack:    { color: 0x15171a, rough: 0.4 },
    doorGrey:     { color: 0x464c53, rough: 0.45 },
    garageDoor:   { color: 0xe9e9e4, rough: 0.5 },
    brass:        { color: 0xc9a84c, rough: 0.3, metal: 0.9 },
    gutter:       { color: 0x1b1d20, rough: 0.5 },
    terracotta:   { color: 0xa65638, rough: 0.85 },
    grass:        { color: 0x2c4627, rough: 1.0 },
    plant:        { color: 0xffffff, rough: 0.95, inst: true },
    bark:         { color: 0x4a3626, rough: 1.0 },
    paving:       { color: 0x8f8c85, rough: 0.95 },
    blockPaving:  { color: 0xffffff, rough: 0.95, inst: true },
    gravel:       { color: 0xb3ab9c, rough: 1.0 },
    fence:        { color: 0x7a5434, rough: 0.95, inst: true },
    fencePost:    { color: 0x5a3f28, rough: 0.95 },
    scaffold:     { color: 0xa9b2ba, rough: 0.4, metal: 0.6 },
    scaffoldBoard:{ color: 0xb48c55, rough: 0.9 },
    string:       { color: 0xf0d24a, rough: 0.6, emissive: 0x3a2f00 },
    membrane:     { color: 0x2e3238, rough: 0.8 },
    binBlack:     { color: 0x22252a, rough: 0.6 },
    binGreen:     { color: 0x24502e, rough: 0.6 },
    binBlue:      { color: 0x1f3d6b, rough: 0.6 },
    rubber:       { color: 0x111111, rough: 0.9 },
    column:       { color: 0xece6d6, rough: 0.8 },
    balcony:      { color: 0x30363d, rough: 0.5, metal: 0.4 },
    cladding:     { color: 0xffffff, rough: 0.9, brickslip: true },
    curtain:      { color: 0x5d7a8c, rough: 0.15, metal: 0.4 },
    gold:         { color: 0xe8c56a, rough: 0.4, metal: 0.5, emissive: 0x3a2a00 }
  };

  var GEOM = null;
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

  // procedural UK brick-slip texture (stretcher bond at true scale: 1 texture tile = 0.9 m × 0.6 m = 4 × 8 bricks)
  var _brickTex = null;
  function brickTexture() {
    if (_brickTex) return _brickTex;
    var c = document.createElement('canvas'); c.width = 512; c.height = 512;
    var g = c.getContext('2d'), cw = 512 / 4, ch = 512 / 8;   // 4 bricks wide (0.9 m), 8 courses high (0.6 m)
    g.fillStyle = '#b4ab9b'; g.fillRect(0, 0, 512, 512);
    var pal = H.BRICKS.red;
    for (var r = 0; r < 8; r++) for (var i = -1; i < 5; i++) {
      var x = i * cw + (r % 2 ? cw / 2 : 0), c2 = pal[(r * 7 + i * 3 + 11) % pal.length];
      g.fillStyle = '#' + ('000000' + c2.toString(16)).slice(-6);
      g.fillRect(x + cw * 0.022, r * ch + ch * 0.067, cw * 0.956, ch * 0.866);
    }
    _brickTex = new THREE.CanvasTexture(c);
    _brickTex.wrapS = _brickTex.wrapT = THREE.RepeatWrapping;
    _brickTex.encoding = THREE.sRGBEncoding;
    _brickTex.anisotropy = 4;
    return _brickTex;
  }

  function col(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  // three material variants per key: solid, ghost-built (translucent real), blueprint (additive teal)
  function makeMaterials(key, clip) {
    var d = MATS[key] || MATS.concrete;
    var params = { color: col(d.color), roughness: d.rough == null ? 0.8 : d.rough, metalness: d.metal || 0 };
    if (d.emissive) params.emissive = col(d.emissive);
    var lambert = !d.glass && !(d.metal > 0.25) && (d.rough == null || d.rough >= 0.6);   // matt surfaces: Lambert is ~20% cheaper per vertex
    var solid = lambert ? new THREE.MeshLambertMaterial({ color: params.color, emissive: params.emissive || col(0x000000) }) : new THREE.MeshStandardMaterial(params);
    if (d.glass) { solid.transparent = true; solid.opacity = d.opacity; solid.depthWrite = false; solid.envMapIntensity = 1; }
    if (d.brickslip) {
      solid.map = brickTexture();
      solid.onBeforeCompile = function (sh) {   // world-space UVs so the texture stays at true brick scale on any panel size
        sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vec4 hbWp = vec4(position,1.0);\n  #ifdef USE_INSTANCING\n  hbWp = instanceMatrix * hbWp;\n  #endif\n  hbWp = modelMatrix * hbWp;\n  vec3 hbN = abs(normalize(mat3(modelMatrix) * normal));\n  vUv = (hbN.x > hbN.z ? hbWp.zy : hbWp.xy) / vec2(0.9, 0.6);');
      };
      solid.defines = { USE_UV: '' };
    }
    var ghost = solid.clone(); if (d.brickslip) ghost.onBeforeCompile = solid.onBeforeCompile;
    ghost.transparent = true; ghost.opacity = d.glass ? 0.25 : 0.80; ghost.depthWrite = !d.glass;
    ghost.emissive = col(0x0d3a38); ghost.emissiveIntensity = 0.35;
    var blue = new THREE.MeshLambertMaterial({ color: col(0x2a8f8a), emissive: col(0x0f4a47), transparent: true, opacity: 0.16, depthWrite: true });   // blueprint ghost: only the nearest surface shows, no additive glare
    var nb = blue.clone(); nb.opacity = 0.07;   // neighbours: fainter still
    [solid, ghost, blue, nb].forEach(function (m) { m.clippingPlanes = [IDLE_PLANE]; m.clipShadows = true; });
    return { solid: solid, ghost: ghost, blue: blue, nb: nb, def: d };
  }

  var IDLE_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);   // keeps every material on one clipping plane at all times
  var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(0, 0, 0, 'YZX'), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();

  function Viewer(container, opts) {
    opts = opts || {};
    this.el = container;
    this.opts = opts;
    var w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    var r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    this._dprFor = function (w, h) { var budget = opts.mobile ? 2.2e6 : 4e6; return Math.max(1, Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2, Math.sqrt(budget / Math.max(1, w * h)))); };
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
    sc.add(new THREE.HemisphereLight(col(0xbcd6ea), col(0x1d2a22), 0.62));
    var sun = this.sun = new THREE.DirectionalLight(col(0xffe3c4), 1.25);
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
    this.edges = null; this.water = null;

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
      if (!self.active) return;
      var moving = self.controls.update();
      if (self._anim) moving = self._stepAnim() || moving;
      if (self.dirty || moving) { self.render(); self.dirty = false; self._idle = 0; } else self._idle++;
      if (self._idle > 45) return;                         // nothing moving for ~0.75 s: sleep until woken
      self._raf = requestAnimationFrame(self._loop);
    };
    ctl.addEventListener('start', function () { self.wake(); });
    ['pointerdown', 'wheel', 'touchstart'].forEach(function (ev) { cv.addEventListener(ev, function () { self.wake(); }, { passive: true }); });
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self.resize(); });
      this._ro.observe(container);
    }
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; self.stop(); });
    cv.addEventListener('webglcontextrestored', function () { self.lost = false; self._shadowDirty = true; if (self.model) self.show(self.model, true); self.start(); });
    this.start();
  }
  H.Viewer = Viewer;
  var VP = Viewer.prototype;

  VP.start = function () { this.active = true; this.dirty = true; this.wake(); };
  VP.wake = function () { this._idle = 0; if (this.active && !this._raf) this._raf = requestAnimationFrame(this._loop); };
  VP.settled = function () { return !this._anim && this._idle > 2; };
  VP.stop = function () { this.active = false; if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; } };
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
    this.batches.forEach(function (b) { self.root.remove(b.main); self.root.remove(b.rev); b.main.dispose && b.main.dispose(); b.rev.dispose && b.rev.dispose(); });
    this.batches = [];
    if (this.edges) { this.root.remove(this.edges); this.edges.geometry.dispose(); this.edges = null; }
    if (this.water) { this.root.remove(this.water); this.water = null; }
    if (this.site) { this.root.remove(this.site); this.site = null; }
  };

  // Build the instanced meshes for a compiled model
  VP.show = function (model, keepCamera) {
    var self = this, G = geoms();
    this._clear();
    this.model = model;
    if (!model) { this.dirty = true; return; }
    this._mats = this._mats || {};
    model.batches.forEach(function (b) {
      var mats = self._mats[b.mat] || (self._mats[b.mat] = makeMaterials(b.mat));
      var n = b.count, geo = G[b.shape] || G.box;
      var main = new THREE.InstancedMesh(geo, mats.solid, n), rev = new THREE.InstancedMesh(geo, mats.blue, n);
      var hasCol = false;
      for (var i = 0; i < n; i++) {
        var o = i * 10, xf = b.xf;
        tmpP.set(xf[o], xf[o + 1], xf[o + 2]); tmpS.set(xf[o + 3], xf[o + 4], xf[o + 5]);
        tmpE.set(xf[o + 6], xf[o + 7], xf[o + 8], 'YZX'); tmpQ.setFromEuler(tmpE);
        tmpM.compose(tmpP, tmpQ, tmpS);
        main.setMatrixAt(i, tmpM); rev.setMatrixAt(n - 1 - i, tmpM);
        if (b.color[i] >= 0) { hasCol = true; tmpC.setHex(b.color[i]).convertSRGBToLinear(); main.setColorAt(i, tmpC); }
        else if (mats.def.inst) { tmpC.setHex(0xffffff); main.setColorAt(i, tmpC); }
      }
      if (!hasCol && main.instanceColor) main.instanceColor = null;
      main.instanceMatrix.needsUpdate = true; rev.instanceMatrix.needsUpdate = true;
      if (main.instanceColor) main.instanceColor.needsUpdate = true;
      var shadow = !b.ghost && !mats.def.glass && b.mat !== 'string' && b.mat !== 'felt';
      main.castShadow = shadow && b.shape !== 'sph'; main.receiveShadow = !mats.def.glass;
      main.frustumCulled = false; rev.frustumCulled = false;
      rev.renderOrder = 5;
      if (mats.def.glass) main.renderOrder = 4;
      self.root.add(main); self.root.add(rev);
      self.batches.push({ b: b, main: main, rev: rev, mats: mats, n: n });
    });
    // blueprint edges of the finished envelope (silhouette of the final house)
    var pos = [];
    (model.envelope || []).forEach(function (e) {
      var x0 = e[0], y0 = e[1], z0 = e[2], x1 = e[3], y1 = e[4], z1 = e[5];
      var c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (s) { pos.push.apply(pos, c[s[0]]); pos.push.apply(pos, c[s[1]]); });
    });
    if (pos.length) {
      var eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      this.edges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: col(0x44c0b9), transparent: true, opacity: 0.35, depthWrite: false }));
      this.root.add(this.edges);
    }
    // gold waterline ring (equity mode)
    var bb = model.bounds, wx = bb.max[0] - bb.min[0] + 0.6, wz = bb.max[2] - bb.min[2] + 0.6;
    var wg = new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(wx, 0.001, wz));
    this.water = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: col(0xe8c56a), transparent: true, opacity: 0.95 }));
    this.water.position.set((bb.min[0] + bb.max[0]) / 2, 0, (bb.min[2] + bb.max[2]) / 2);
    this.water.visible = false; this.root.add(this.water);
    // shadow camera fits the model
    var R = Math.max(wx, wz, bb.max[1]) * 0.75 + 4, sun = this.sun;
    sun.target.position.set((bb.min[0] + bb.max[0]) / 2, 0, (bb.min[2] + bb.max[2]) / 2);
    sun.position.set(sun.target.position.x + R * 0.8, R * 1.3, sun.target.position.z + R);
    var scam = sun.shadow.camera; scam.left = -R; scam.right = R; scam.top = R; scam.bottom = -R; scam.near = 0.5; scam.far = R * 4; scam.updateProjectionMatrix();
    if (!keepCamera) this.fit();
    this.apply();
  };

  // camera framing: front-right, elevated, auto distance
  VP.fit = function () {
    var m = this.model, bb = m ? m.bounds : { min: [-4, 0, -6], max: [4, 4, 2] };
    var cx = (bb.min[0] + bb.max[0]) / 2, cz = (bb.min[2] + bb.max[2]) / 2, H = Math.max(2, bb.max[1]);
    var rad = Math.sqrt(Math.pow(bb.max[0] - bb.min[0], 2) + Math.pow(bb.max[2] - bb.min[2], 2) + H * H) / 2;
    this._radius = rad;
    var fov = this.camera.fov * Math.PI / 180, aspect = Math.max(0.5, this.camera.aspect || 1.6);
    var d = rad / Math.sin(fov / 2) * (aspect < 1 ? 1.15 / aspect : 1.02);
    this.fitDist = d;
    var az = (this.opts.azimuth == null ? 32 : this.opts.azimuth) * Math.PI / 180, el = 20 * Math.PI / 180;
    var target = new THREE.Vector3(cx, Math.min(H * 0.42, 12), cz + 0.2);
    this.controls.target.copy(target);
    this.camera.position.set(target.x + d * Math.sin(az) * Math.cos(el), target.y + d * Math.sin(el), target.z + d * Math.cos(az) * Math.cos(el));
    this.controls.minDistance = Math.max(1.0, rad * 0.12);
    this.controls.maxDistance = d * 5;
    this.camera.near = 0.05; this.camera.far = Math.max(300, d * 8); this.camera.updateProjectionMatrix();
    this.scene.fog.near = d * 1.6; this.scene.fog.far = d * 4.5;
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

  // progress / mode → instance counts + materials + clipping
  // mode: 'build' (translucent built part + blueprint remainder), 'equity' (solid below waterline, blueprint above),
  //       'complete' (all solid), 'site' (nothing but set-out)
  VP.setState = function (s) {
    if (s.p != null) this.p = Math.max(0, Math.min(1, s.p));
    if (s.mode) this.mode = s.mode;
    if (s.eq != null) this.eq = Math.max(0, Math.min(1, s.eq));
    if (s.lights != null) this.lights = !!s.lights;
    this.apply();
  };
  VP.animateTo = function (p1, ms) {
    var reduce = (typeof document !== 'undefined' && document.body && document.body.classList.contains('reduced-motion')) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduce || !(ms > 0) || Math.abs(p1 - this.p) < 1e-4) { this.setState({ p: p1 }); return; }
    this._anim = { p0: this.p, p1: p1, t0: performance.now(), ms: ms };
    this.dirty = true; this.wake();
  };
  VP._stepAnim = function () {
    var a = this._anim, k = Math.min(1, (performance.now() - a.t0) / a.ms), e = 1 - Math.pow(1 - k, 3);
    this.p = a.p0 + (a.p1 - a.p0) * e; this.apply();
    if (k >= 1) this._anim = null;
    return true;
  };
  function upper(t, p) { var lo = 0, hi = t.length; while (lo < hi) { var m = (lo + hi) >> 1; if (t[m] <= p) lo = m + 1; else hi = m; } return lo; }
  VP.apply = function () {
    var self = this, m = this.model; if (!m) { this.dirty = true; return; }
    var mode = this.mode, p = mode === 'build' ? this.p : 1, H0 = Math.max(0.5, m.height), clipY = this.eq * H0;
    var below = new THREE.Plane(new THREE.Vector3(0, -1, 0), clipY), above = new THREE.Plane(new THREE.Vector3(0, 1, 0), -clipY);
    this.batches.forEach(function (B) {
      var b = B.b, n = B.n, k = mode === 'site' ? 0 : upper(b.t, p), mats = B.mats, hidden = b.hideAfter < 2 && p >= b.hideAfter && mode === 'build';
      if (b.ghost) {   // neighbours: always blueprint ghosts
        B.main.count = 0; B.rev.count = n; B.rev.material = mats.nb; B.rev.visible = true; B.main.visible = false; return;
      }
      if (mode === 'equity') {
        if (b.hideAfter < 2) { B.main.visible = false; B.rev.visible = false; return; }
        B.main.visible = true; B.rev.visible = true;
        B.main.count = n; B.rev.count = n;
        B.main.material = mats.solid; B.rev.material = mats.blue;
        mats.solid.clippingPlanes = [below]; mats.blue.clippingPlanes = [above]; mats.ghost.clippingPlanes = [IDLE_PLANE];
      } else if (mode === 'complete') {
        B.main.visible = b.hideAfter >= 2; B.rev.visible = false; B.main.count = n;
        B.main.material = mats.solid; mats.solid.clippingPlanes = [IDLE_PLANE];
      } else {   // build / site
        B.main.visible = !hidden; B.rev.visible = !hidden && b.hideAfter >= 2;
        B.main.count = k; B.rev.count = n - k;
        B.main.material = mode === 'site' ? mats.solid : mats.ghost; B.rev.material = mats.blue;
        mats.solid.clippingPlanes = [IDLE_PLANE]; mats.blue.clippingPlanes = [IDLE_PLANE]; mats.ghost.clippingPlanes = [IDLE_PLANE];
      }
      // lights on: warm glow behind the glass at completion
      if (mats.def.glass) {
        var on = self.lights;
        [mats.solid, mats.ghost].forEach(function (mm) { mm.emissive = col(on ? 0xffb35c : 0x000000); mm.emissiveIntensity = on ? 0.55 : 0; });
      }
    });
    if (this.edges) {
      this.edges.visible = mode === 'build' || mode === 'equity';
      this.edges.material.clippingPlanes = mode === 'equity' ? [above] : [IDLE_PLANE];
      this.edges.material.opacity = mode === 'build' ? 0.18 + 0.25 * (1 - p) : 0.30;
    }
    if (this.water) { this.water.visible = mode === 'equity'; this.water.position.y = clipY; }
    this.dirty = true; this._shadowDirty = true; this.wake();
  };

  // project a world point to container pixels (for DOM overlays)
  VP.project = function (x, y, z) {
    var v = new THREE.Vector3(x, y, z).project(this.camera), w = this.el.clientWidth, h = this.el.clientHeight;
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, behind: v.z > 1 };
  };
  VP.waterline = function () { var m = this.model; return m ? this.eq * Math.max(0.5, m.height) : 0; };
  VP.dispose = function () {
    this.stop(); this._clear();
    if (this._ro) this._ro.disconnect();
    this.controls.dispose(); this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  };
})(HB3D);
