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
    gold:         { color: 0xe8c56a, rough: 0.4, metal: 0.5, emissive: 0x3a2a00, keep: true }
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

  // procedural UK brick-slip texture (stretcher bond at true scale: 1 texture tile = 1.8 m × 1.2 m = 8 bricks × 16 courses;
  // each brick gets its own seeded colour + value jitter so the repeat doesn't read as stripes)
  var BRICK_TILE = [1.8, 1.2];
  var _brickTex = null;
  function brickTexture() {
    if (_brickTex) return _brickTex;
    var S = 1024, c = document.createElement('canvas'); c.width = S; c.height = S;
    var g = c.getContext('2d'), cw = S / 8, ch = S / 16;   // 225 mm × 75 mm coordinating module
    g.fillStyle = '#b4ab9b'; g.fillRect(0, 0, S, S);
    var pal = H.BRICKS.red, seed = 1234567;
    var rnd = function () { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
    for (var r = 0; r < 16; r++) {
      var row = [];
      for (var i = 0; i < 8; i++) row.push(rnd());
      for (var k = -1; k < 9; k++) {                       // wrap the half-bond overhang so the tile repeats seamlessly
        var x = k * cw + (r % 2 ? cw / 2 : 0), v = row[((k % 8) + 8) % 8], c2 = pal[Math.floor(v * pal.length)];
        var j = 1 + (rnd() - 0.5) * 0.14;
        var cr = Math.min(255, Math.round(((c2 >> 16) & 255) * j)), cg = Math.min(255, Math.round(((c2 >> 8) & 255) * j)), cb = Math.min(255, Math.round((c2 & 255) * j));
        g.fillStyle = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
        g.fillRect(x + cw * 0.022, r * ch + ch * 0.067, cw * 0.956, ch * 0.866);   // 215 × 65 brick inside a 10 mm joint
      }
    }
    _brickTex = new THREE.CanvasTexture(c);
    _brickTex.wrapS = _brickTex.wrapT = THREE.RepeatWrapping;
    _brickTex.encoding = THREE.sRGBEncoding;
    _brickTex.anisotropy = 8;
    return _brickTex;
  }

  function col(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  // ── Vault-It look: the deposit-stage house is a translucent teal hologram; the owned (mortgage) house is full colour
  //    with a green-blue grade so it sits in the app's palette rather than looking purely photographic ──
  var GRADE = H.GRADE = { amount: 0.62 };          // 0 = photographic, 1 = fully graded
  var BRICKSLIP_UV = '#include <uv_vertex>\n  vec4 hbWp = vec4(position,1.0);\n  #ifdef USE_INSTANCING\n  hbWp = instanceMatrix * hbWp;\n  #endif\n  hbWp = modelMatrix * hbWp;\n  vec3 hbNo = normal;\n  #ifdef USE_INSTANCING\n  hbNo = mat3(instanceMatrix) * hbNo;\n  #endif\n  vec3 hbN = abs(normalize(mat3(modelMatrix) * hbNo));\n  vUv = (hbN.y > max(hbN.x, hbN.z) ? hbWp.xz : (hbN.x > hbN.z ? hbWp.zy : hbWp.xy)) / vec2(' + BRICK_TILE[0].toFixed(2) + ', ' + BRICK_TILE[1].toFixed(2) + ');';
  // full colour, graded: cool the palette towards the app's teal, lift the shadows with teal, keep highlights clean
  function gradeChunk(a) {
    return '{ float hbL = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));\n' +
      '  vec3 hbG = mix(gl_FragColor.rgb, hbL * vec3(0.70, 1.08, 1.14), 0.45) * vec3(0.92, 1.0, 1.02) + vec3(0.006, 0.050, 0.056) * (1.0 - smoothstep(0.0, 0.40, hbL));\n' +
      '  gl_FragColor.rgb = mix(gl_FragColor.rgb, hbG, ' + a.toFixed(3) + '); }\n#include <tonemapping_fragment>';
  }
  // hologram: every surface is re-coloured on a teal ramp by its own lightness (bricks dark, joints light, glass glows)
  var HOLO_LO = 'vec3(0.012, 0.085, 0.090)', HOLO_HI = 'vec3(0.300, 0.880, 0.800)';
  var HOLO_CHUNK = '#include <color_fragment>\n  { float hbL = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) * 1.25, 0.0, 1.0);\n    diffuseColor.rgb = mix(' + HOLO_LO + ', ' + HOLO_HI + ', 0.18 + 0.82 * hbL); }';
  // material post-processing (also used for uploaded / AI-generated designs)
  function styleMaterial(m, kind, opts) {
    opts = opts || {};
    var slip = !!opts.brickslip, a = GRADE.amount;
    m.onBeforeCompile = function (sh) {   // replaces (never chains) so styling twice can't double-apply
      if (slip) sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', BRICKSLIP_UV);
      if (kind === 'solid') sh.fragmentShader = sh.fragmentShader.replace('#include <tonemapping_fragment>', gradeChunk(a));
      if (kind === 'holo') sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', HOLO_CHUNK);
      if (kind === 'flat') sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '');
    };
    m.customProgramCacheKey = function () { return 'hb3d:' + kind + ':' + (slip ? 1 : 0) + ':' + a.toFixed(3); };
    if (slip) m.defines = Object.assign({}, m.defines || {}, { USE_UV: '' });
    return m;
  }
  H.styleMaterial = styleMaterial;
  // hologram material from any base colour/map (opacity: built 0.55, context 0.20)
  function holoMaterial(colorLin, opacity, glass, map, worldUV) {
    var g = new THREE.MeshLambertMaterial({ color: colorLin, emissive: col(0x0b3b38), transparent: true, opacity: glass ? opacity * 0.6 : opacity, depthWrite: !glass, side: THREE.FrontSide });
    g.emissiveIntensity = 0.55;
    if (map) g.map = map;
    return styleMaterial(g, 'holo', { brickslip: !!(map && worldUV) });
  }
  H._holoMaterial = holoMaterial;

  // material variants per key: solid (graded full colour), ghost (hologram, built part), ctx (faint hologram: other floors),
  // blue (blueprint of what is still to come), nb (neighbours)
  function makeMaterials(key, tint) {
    var d = MATS[key] || MATS.concrete;
    var base = col(tint ? 0xffffff : d.color);
    var params = { color: base, roughness: d.rough == null ? 0.8 : d.rough, metalness: d.metal || 0 };
    if (d.emissive) params.emissive = col(d.emissive);
    var lambert = !d.glass && !(d.metal > 0.25) && (d.rough == null || d.rough >= 0.6);   // matt surfaces: Lambert is ~20% cheaper per vertex
    var solid = lambert ? new THREE.MeshLambertMaterial({ color: params.color, emissive: params.emissive || col(0x000000) }) : new THREE.MeshStandardMaterial(params);
    if (d.glass) { solid.transparent = true; solid.opacity = d.opacity; solid.depthWrite = false; solid.envMapIntensity = 1; }
    if (d.brickslip) solid.map = brickTexture();
    styleMaterial(solid, 'solid', { brickslip: d.brickslip });
    var ghost, ctx;
    if (d.keep) {   // gold highlight bands stay gold in every mode (they mark the user's floor)
      ghost = solid.clone(); ghost.onBeforeCompile = solid.onBeforeCompile; ghost.customProgramCacheKey = solid.customProgramCacheKey;
      ghost.transparent = true; ghost.opacity = 0.9;
      ctx = ghost.clone(); ctx.onBeforeCompile = solid.onBeforeCompile; ctx.customProgramCacheKey = solid.customProgramCacheKey; ctx.opacity = 0.5;
    } else {
      ghost = holoMaterial(base.clone(), 0.55, d.glass, d.brickslip ? brickTexture() : null, true);
      ctx = holoMaterial(base.clone(), 0.16, d.glass, d.brickslip ? brickTexture() : null, true);
    }
    var blue = new THREE.MeshLambertMaterial({ color: col(0x2a8f8a), emissive: col(0x0f4a47), transparent: true, opacity: 0.11, depthWrite: true });   // blueprint ghost: only the nearest surface shows, no additive glare
    var nb = blue.clone(); nb.opacity = 0.06;   // neighbours: fainter still
    styleMaterial(blue, 'flat'); styleMaterial(nb, 'flat');
    [solid, ghost, ctx, blue, nb].forEach(function (m) { m.clippingPlanes = [IDLE_PLANE]; m.clipShadows = true; });
    return { solid: solid, ghost: ghost, ctx: ctx, blue: blue, nb: nb, def: d };
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
  // one-time: give every mesh a graded-colour, a hologram and a blueprint twin
  function prepareCustom(model) {
    if (model._cust) return model._cust;
    var C = { solid: [], holo: [], blue: [], solidMats: [], holoMats: [], blueMats: [] }, list = [];
    model.custom.traverse(function (o) { if (o.isMesh) list.push(o); });
    list.forEach(function (mesh) {
      var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      var solid = mats.map(function (m) { var c = m.clone(); styleMaterial(c, 'solid'); c.clippingPlanes = [IDLE_PLANE]; c.clipShadows = true; C.solidMats.push(c); return c; });
      var holo = mats.map(function (m) { var c = holoMaterial((m.color || col(0xcccccc)).clone(), 0.55, m.transparent && m.opacity < 0.6, m.map || null, false); c.clippingPlanes = [IDLE_PLANE]; c.side = THREE.DoubleSide; C.holoMats.push(c); return c; });
      var blue = new THREE.MeshLambertMaterial({ color: col(0x2a8f8a), emissive: col(0x0f4a47), transparent: true, opacity: 0.11, depthWrite: true, side: THREE.DoubleSide });
      styleMaterial(blue, 'flat'); blue.clippingPlanes = [IDLE_PLANE]; C.blueMats.push(blue);
      mesh.material = solid.length > 1 ? solid : solid[0]; mesh.castShadow = true; mesh.receiveShadow = true;
      var hm = mesh.clone(); hm.material = holo.length > 1 ? holo : holo[0]; hm.castShadow = true;
      var bm = mesh.clone(); bm.material = blue; bm.castShadow = false; bm.renderOrder = 5;
      mesh.parent.add(hm); mesh.parent.add(bm);
      C.solid.push(mesh); C.holo.push(hm); C.blue.push(bm);
    });
    model._cust = C;
    return C;
  }

  var IDLE_PLANE = H._IDLE_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);   // keeps every material on one clipping plane at all times
  var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(0, 0, 0, 'YZX'), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpC = new THREE.Color();

  function Viewer(container, opts) {
    opts = opts || {};
    this.el = container;
    this.opts = opts;
    var w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    var r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
    var me = this;   // brand look (house flag): pixel ratio capped at 1.5 below 700 px wide, 2 above (brand handover 6.10)
    this._dprFor = function (w, h) { var budget = opts.mobile ? 2.2e6 : 4e6; return Math.max(1, Math.min(window.devicePixelRatio || 1, opts.maxDpr || 2, me.brand ? (me._bLite ? 1 : w < 700 ? 1.5 : 2) : 9, Math.sqrt(budget / Math.max(1, w * h)))); };
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
      if (self._fly) moving = self._stepFly() || moving;
      if (self._brandTick) moving = self._brandTick() || moving;   // brand look: smoothing, brick drops, pulse, sweep, ring (only while on screen)
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
  VP.settled = function () { if (this._brandActive && this._brandActive()) return this._brandSettled(); return !this._anim && this._idle > 2; };
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
    if (this._brandClear) this._brandClear();
    this.batches.forEach(function (b) { self.root.remove(b.main); self.root.remove(b.rev); b.main.dispose && b.main.dispose(); b.rev.dispose && b.rev.dispose(); });
    this.batches = [];
    if (this.edges) { this.root.remove(this.edges); this.edges.geometry.dispose(); this.edges = null; }
    if (this.water) { this.root.remove(this.water); this.water = null; }
    if (this.focusBox) { this.root.remove(this.focusBox); this.focusBox.geometry.dispose(); this.focusBox = null; }
    if (this.rowBand) { this.root.remove(this.rowBand); this.rowBand = null; }
    if (this.site) { this.root.remove(this.site); this.site = null; }
    if (this.model && this.model.custom) this.root.remove(this.model.custom);   // kept intact: the app caches the model
  };

  // Build the instanced meshes for a compiled model
  VP.show = function (model, keepCamera) {
    var self = this, G = geoms();
    this._clear();
    this.model = model;
    if (!model) { this.dirty = true; return; }
    this._cust = null;
    if (model.custom) { this._cust = prepareCustom(model); this.root.add(model.custom); }
    this._mats = this._mats || {};
    model.batches.forEach(function (b) {
      var n = b.count, geo = G[b.shape] || G.box, hasCol = false, def = MATS[b.mat] || MATS.concrete;
      for (var q = 0; q < n; q++) if (b.color[q] >= 0) { hasCol = true; break; }
      // explicit colours on a plain material: base colour goes white and uncoloured instances carry the material colour,
      // so every instance shows exactly its own colour (never black, never double-tinted)
      var tint = hasCol && !def.inst, mk = b.mat + (tint ? '#tint' : '');
      var mats = self._mats[mk] || (self._mats[mk] = makeMaterials(b.mat, tint));
      var main = new THREE.InstancedMesh(geo, mats.solid, n), rev = new THREE.InstancedMesh(geo, mats.blue, n);
      for (var i = 0; i < n; i++) {
        var o = i * 10, xf = b.xf;
        tmpP.set(xf[o], xf[o + 1], xf[o + 2]); tmpS.set(xf[o + 3], xf[o + 4], xf[o + 5]);
        tmpE.set(xf[o + 6], xf[o + 7], xf[o + 8], 'YZX'); tmpQ.setFromEuler(tmpE);
        tmpM.compose(tmpP, tmpQ, tmpS);
        main.setMatrixAt(i, tmpM); rev.setMatrixAt(n - 1 - i, tmpM);
        if (b.color[i] >= 0) { tmpC.setHex(b.color[i]).convertSRGBToLinear(); main.setColorAt(i, tmpC); rev.setColorAt(n - 1 - i, tmpC); }
        else if (hasCol) { if (tint) tmpC.setHex(def.color).convertSRGBToLinear(); else tmpC.setHex(0xffffff); main.setColorAt(i, tmpC); rev.setColorAt(n - 1 - i, tmpC); }
      }
      if (!hasCol && main.instanceColor) main.instanceColor = null;
      main.instanceMatrix.needsUpdate = true; rev.instanceMatrix.needsUpdate = true;
      if (main.instanceColor) main.instanceColor.needsUpdate = true;
      if (!hasCol && rev.instanceColor) rev.instanceColor = null;
      if (rev.instanceColor) rev.instanceColor.needsUpdate = true;
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
    // gold waterline ring (equity mode)
    var bb = model.bounds, wx = bb.max[0] - bb.min[0] + 0.6, wz = bb.max[2] - bb.min[2] + 0.6;
    var wg = new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(wx - 0.44, 0.001, wz - 0.44));   // hugs the walls (8 cm out)
    this.water = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: col(0xe8c56a), transparent: true, opacity: 0.95 }));
    this.water.position.set((bb.min[0] + bb.max[0]) / 2, 0, (bb.min[2] + bb.max[2]) / 2);
    this.water.visible = false; this.root.add(this.water);
    // the current row: a gold band (outline + glassy plane) at the exact height the deposit has built to
    this.rowBand = null;
    if (model.rows) {
      var bx = bb.min[0] - 0.35, bX = bb.max[0] + 0.35, bz = bb.min[2] - 0.35, bZ = bb.max[2] + 0.35;
      var rg = new THREE.Group(), pts = [bx, 0, bz, bX, 0, bz, bX, 0, bz, bX, 0, bZ, bX, 0, bZ, bx, 0, bZ, bx, 0, bZ, bx, 0, bz];
      var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      var ln = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: col(0xf3d27a), transparent: true, opacity: 1, depthTest: false, depthWrite: false }));
      var pl = new THREE.Mesh(new THREE.PlaneBufferGeometry(bX - bx, bZ - bz), new THREE.MeshBasicMaterial({ color: col(0xe8c56a), transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      pl.rotation.x = -Math.PI / 2; pl.position.set((bx + bX) / 2, 0, (bz + bZ) / 2);
      ln.renderOrder = 9; pl.renderOrder = 8; rg.add(pl); rg.add(ln); rg.visible = false; this.root.add(rg); this.rowBand = rg;
    }
    // the user's own floor (flats / apartments): a gold frame that marks it in every mode
    if (model.focus) {
      var F = model.focus, fh = Math.max(0.2, F.y1 - F.y0);
      var fg = new THREE.EdgesGeometry(new THREE.BoxBufferGeometry(wx - 0.3, fh, wz - 0.3));
      this.focusBox = new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ color: col(0xe8c56a), transparent: true, opacity: 0.9, depthWrite: false }));
      this.focusBox.position.set((bb.min[0] + bb.max[0]) / 2, F.y0 + fh / 2, (bb.min[2] + bb.max[2]) / 2);
      this.focusBox.renderOrder = 6; this.root.add(this.focusBox);
    }
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
    var m = this.model, bb = m ? (m.frame || m.bounds) : { min: [-4, 0, -6], max: [4, 4, 2] };   // frame: house + front garden
    var cx = (bb.min[0] + bb.max[0]) / 2, cz = (bb.min[2] + bb.max[2]) / 2, H = Math.max(2, bb.max[1]);
    var rad = Math.sqrt(Math.pow(bb.max[0] - bb.min[0], 2) + Math.pow(bb.max[2] - bb.min[2], 2) + H * H) / 2;
    this._radius = rad;
    var fov = this.camera.fov * Math.PI / 180, aspect = Math.max(0.5, this.camera.aspect || 1.6), aspF = aspect < 1 ? 1.15 / aspect : 1.02;
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

  // progress / mode → instance counts + materials + clipping
  // mode: 'build'    deposit stage: the built part is a translucent teal hologram, the rest a faint blueprint;
  //                  at 100% of the deposit the whole house stands as a hologram
  //       'equity'   mortgage stage: full-colour (graded) bricks below the owned-share waterline, hologram above
  //       'complete' mortgage free: all full colour
  //       'site'     nothing built yet: blueprint only
  // Flats / apartments (model.focus): only the user's own floor builds and turns to colour; the rest of the block
  // stays a faint hologram for context.
  VP.setState = function (s) {
    if (s.p != null) { this.p = Math.max(0, Math.min(1, s.p)); this._bTarget = this.p; }
    if (s.mode) this.mode = s.mode;
    if (s.eq != null) this.eq = Math.max(0, Math.min(1, s.eq));
    if (s.lights != null) this.lights = !!s.lights;
    this.apply();
  };
  VP.animateTo = function (p1, ms) {
    if (this._brandActive && this._brandActive()) { this._bTarget = Math.max(0, Math.min(1, p1)); this.dirty = true; this.wake(); return; }   // brand: eased by the frame loop
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
    if (this._brandActive && this._brandActive()) { this._brandApplyAll(); return; }   // brand look for the Level 1 build (house flag)
    if (this._bOn) this._brandEnv(false);
    var mode = this.mode, p = mode === 'build' ? this.p : (mode === 'site' ? 0 : 1), F = m.focus;
    var y0 = F ? F.y0 : (m.rows ? m.rows.y0 : 0), y1 = F ? F.y1 : (m.rows ? m.rows.y1 : Math.max(0.5, m.height)), clipY = y0 + this.eq * (y1 - y0);
    var below = new THREE.Plane(new THREE.Vector3(0, -1, 0), clipY), above = new THREE.Plane(new THREE.Vector3(0, 1, 0), -clipY);
    if (this._cust) {   // uploaded / AI design: the hologram rises with the deposit; colour fills up to the owned share
      var C = this._cust, hb = (mode === 'build' ? p : 0) * y1 + (mode === 'build' && p >= 1 ? 1 : 0);
      var bBelow = new THREE.Plane(new THREE.Vector3(0, -1, 0), hb), bAbove = new THREE.Plane(new THREE.Vector3(0, 1, 0), -hb);
      var vis = function (arr, on) { arr.forEach(function (o) { o.visible = on; }); };
      var clip = function (arr, pl) { arr.forEach(function (mm) { mm.clippingPlanes = [pl]; }); };
      if (mode === 'equity') { vis(C.solid, true); vis(C.holo, true); vis(C.blue, false); clip(C.solidMats, below); clip(C.holoMats, above); }
      else if (mode === 'complete') { vis(C.solid, true); vis(C.holo, false); vis(C.blue, false); clip(C.solidMats, IDLE_PLANE); }
      else if (mode === 'site') { vis(C.solid, false); vis(C.holo, false); vis(C.blue, false); }
      else { vis(C.solid, false); vis(C.holo, true); vis(C.blue, false); clip(C.holoMats, bBelow); }   // hologram up to the current row; the rest is just the outline
      this.edges && (this.edges.visible = mode === 'build' || mode === 'site');
    }
    this.batches.forEach(function (B) {
      var b = B.b, n = B.n, k = mode === 'site' ? 0 : upper(b.t, p), mats = B.mats, temp = b.hideAfter < 2, hidden = temp && (mode !== 'build' || p >= b.hideAfter);
      if (b.ghost) {   // neighbours: always faint blueprint
        B.main.count = 0; B.rev.count = n; B.rev.material = mats.nb; B.rev.visible = true; B.main.visible = false; return;
      }
      if (F && !b.focus) {   // the rest of the block: constant faint hologram (no site temporaries)
        B.rev.visible = false; B.main.visible = !temp; B.main.count = n; B.main.castShadow = false; B.main.receiveShadow = false;   // faint silhouette: no shadows on it
        B.main.material = m.clean ? mats.blue : mats.ctx;   // clean shell: the rest of the block is a plain faint silhouette, so only your floor stands out
        mats.ctx.clippingPlanes = [IDLE_PLANE]; mats.blue.clippingPlanes = [IDLE_PLANE];
        return;
      }
      var shadows = !b.ghost && !mats.def.glass && b.mat !== 'string' && b.mat !== 'felt' && b.shape !== 'sph';
      if (m.clean) {   // clean shell: everything is built by height, so the waterline and the build height both just move through the sorted instances
        var kq = mode === 'equity' ? upper(b.t, F ? self.eq : (clipY - y0) / Math.max(1e-6, y1 - y0)) : k;
        if (mode === 'equity') {
          B.main.visible = !temp && kq > 0; B.rev.visible = !temp && n - kq > 0; B.main.count = kq; B.rev.count = n - kq;
          B.main.material = mats.solid; B.rev.material = mats.ghost; mats.solid.clippingPlanes = [IDLE_PLANE]; mats.ghost.clippingPlanes = [IDLE_PLANE];
        } else if (mode === 'complete') {
          B.main.visible = !temp; B.rev.visible = false; B.main.count = n; B.main.material = mats.solid; mats.solid.clippingPlanes = [IDLE_PLANE];
        } else {         // build (deposit) / site: hologram up to the current row; the rest is just the outline
          B.main.visible = k > 0 && !temp; B.rev.visible = false; B.main.count = k; B.main.material = mats.ghost; mats.ghost.clippingPlanes = [IDLE_PLANE];
        }
        B.main.castShadow = shadows && (mode === 'complete' || mode === 'equity');
        if (mats.def.glass) { var on0 = self.lights; [mats.solid, mats.ghost].forEach(function (mm) { mm.emissive = col(on0 ? 0xffb35c : (mm === mats.ghost ? 0x0b3b38 : 0x000000)); mm.emissiveIntensity = on0 ? 0.55 : (mm === mats.ghost ? 0.55 : 0); }); }
        return;
      }
      if (mode === 'equity') {
        B.main.visible = !temp; B.rev.visible = !temp;
        B.main.count = n; B.rev.count = n;
        B.main.material = mats.solid; B.rev.material = mats.ghost;
        mats.solid.clippingPlanes = [below]; mats.ghost.clippingPlanes = [above];
      } else if (mode === 'complete') {
        B.main.visible = !temp; B.rev.visible = false; B.main.count = n;
        B.main.material = mats.solid; mats.solid.clippingPlanes = [IDLE_PLANE];
      } else {   // build (deposit) / site
        B.main.visible = !hidden && k > 0; B.rev.visible = !temp && n - k > 0;
        B.main.count = k; B.rev.count = n - k;
        B.main.material = mats.ghost; B.rev.material = mats.blue;
        mats.blue.clippingPlanes = [IDLE_PLANE]; mats.ghost.clippingPlanes = [IDLE_PLANE];
      }
      // lights on: warm glow behind the glass once the house is finished / owned
      if (mats.def.glass) {
        var on = self.lights;
        [mats.solid, mats.ghost].forEach(function (mm) { mm.emissive = col(on ? 0xffb35c : (mm === mats.ghost ? 0x0b3b38 : 0x000000)); mm.emissiveIntensity = on ? 0.55 : (mm === mats.ghost ? 0.55 : 0); });
      }
    });
    if (this.edges) {   // outline of the finished house: only above the current row once the walls are going up
      var hb = m.rows ? m.rows.y0 + (mode === 'build' ? p : 0) * (m.rows.y1 - m.rows.y0) : 0, above2 = new THREE.Plane(new THREE.Vector3(0, 1, 0), -hb);
      this.edges.visible = !F && ((mode === 'build' && p < 1) || mode === 'site');
      this.edges.material.clippingPlanes = m.clean && mode === 'build' ? [above2] : [IDLE_PLANE];
      this.edges.material.opacity = m.clean ? 0.55 : 0.14 + 0.22 * (1 - p);
    }
    if (this.rowBand) {
      this.rowBand.visible = mode === 'build' && p > 0 && p < 0.9999;
      this.rowBand.position.y = m.rows.y0 + p * (m.rows.y1 - m.rows.y0);
    }
    if (this.water) { this.water.visible = mode === 'equity'; this.water.position.y = clipY; }
    if (this.focusBox) this.focusBox.visible = true;
    this.dirty = true; if (mode !== 'build' || this._lastMode !== 'build') this._shadowDirty = true; this._lastMode = mode; this.wake();   // no shadows while building: the hologram casts none (one refresh clears any old shadow)
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
    var p = this.mode === 'build' ? this.p : (this.mode === 'site' ? 0 : 1), R = m.rows;
    return { y: R.y0 + p * (R.y1 - R.y0), row: p <= 0 ? 0 : Math.min(R.n, Math.floor(p * R.n - 1e-9) + 1), rows: R.n, p: p };
  };
  // glide the camera to look at the current row (and in a little)
  VP.flyToRow = function (ms) {
    var ri = this.rowInfo(); if (!ri) return;
    var bb = this.model.bounds, tgt = new THREE.Vector3((bb.min[0] + bb.max[0]) / 2, Math.max(0.3, ri.y), (bb.min[2] + bb.max[2]) / 2);
    this._fly = { t0: performance.now(), ms: ms || 650, from: this.controls.target.clone(), to: tgt, z0: this.zoom(), z1: Math.max(this.zoom(), 1.9) };
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
    this.controls.dispose(); this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  };
})(HB3D);
