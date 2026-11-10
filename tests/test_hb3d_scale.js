// Node unit test: every House Builder 3D model is built from true-scale UK components.
// Checks per model: no NaN transforms, every counted brick is a real 215 × 102.5 × 65 mm brick (or a cut of one),
// blocks are 440 × 215 × 100 mm, every stage present in order, sane footprint/height, instance budget, build time.
// Usage: node tests/test_hb3d_scale.js [type …]
var path = require('path');
var H = require(path.join(__dirname, '../src/hb3d/kit.js'));
global.HB3D = H;
var TYPES = process.argv.slice(2).length ? process.argv.slice(2) : ['terraced', 'semi', 'detached', 'mansion', 'flat', 'apartment'];
TYPES.forEach(function (t) { try { require(path.join(__dirname, '../src/hb3d/models/' + t + '.js')); } catch (e) { console.log('FAIL: cannot load ' + t + ': ' + e.message); process.exitCode = 1; } });
var UK = H.UK, fails = 0;
function ok(c, msg) { console.log((c ? 'ok  : ' : 'FAIL: ') + msg); if (!c) { fails++; process.exitCode = 1; } }
var near = function (a, b, tol) { return Math.abs(a - b) <= (tol || 0.0015); };
// Budgets (instances drive GPU cost on phones): high-rise uses brick-slip cladding above the podium
var BUDGET = { terraced: 60000, semi: 80000, detached: 90000, mansion: 160000, flat: 120000, apartment: 140000 };
// [min,max] plausible eaves/ridge height (m) and footprint (m²)
var HEIGHT = { terraced: [7, 13], semi: [7, 13], detached: [7, 13], mansion: [9, 20], flat: [9, 40], apartment: [30, 120] };

TYPES.forEach(function (type) {
  if (!H.models[type]) { ok(false, type + ': model registered'); return; }
  var opts = (type === 'flat' || type === 'apartment') ? { floor: type === 'flat' ? 2 : 5 } : {};
  var K = new H.Kit({ seed: 11 });
  var t0 = Date.now(), meta;
  try { meta = H.models[type](K, opts) || {}; } catch (e) { ok(false, type + ': builds without throwing (' + e.message + ')'); return; }
  var m = K.compile(Object.assign({ type: type }, meta)), ms = Date.now() - t0;
  console.log('— ' + type + ': ' + m.counts.bricks + ' bricks, ' + m.counts.blocks + ' blocks, ' + m.counts.tiles + ' tiles, ' + m.instances + ' instances, ' + ms + ' ms');
  ok(!!(meta.name && meta.info), type + ': returns name + info');

  // finite transforms
  var bad = K.items.filter(function (it) { return ['x', 'y', 'z', 'sx', 'sy', 'sz', 'rx', 'ry', 'rz'].some(function (k) { return !isFinite(it[k]); }); });
  ok(bad.length === 0, type + ': all transforms finite (' + bad.length + ' bad)');
  var neg = K.items.filter(function (it) { return it.sx <= 0 || it.sy <= 0 || it.sz <= 0; });
  ok(neg.length === 0, type + ': all sizes positive (' + neg.length + ' bad)');

  // bricks to UK scale: sorted dims ≈ [65, ≤102.5, ≤215] (half-bats/closers/cut bricks allowed), most are full stretchers/headers
  var bricks = K.items.filter(function (it) { return it.k === 'brick'; }), offBrick = [], full = 0;
  bricks.forEach(function (it) {
    var d = [it.sx, it.sy, it.sz].sort(function (a, b) { return a - b; });
    // fits inside a whole brick (closers, bats, raking cuts) and keeps at least one uncut face dimension
    var good = d[0] >= 0.02 && d[0] <= UK.BH + 0.002 && d[1] <= UK.BW + 0.002 && d[2] <= UK.BL + 0.002 &&
               [UK.BH, UK.BW, UK.BL].some(function (s) { return d.some(function (v) { return near(v, s, 0.002); }); });
    if (good) { if (near(d[0], UK.BH) && (near(d[1], UK.BW, 0.003) && near(d[2], UK.BL))) full++; } else offBrick.push(d.map(function (v) { return v.toFixed(3); }).join('×'));
  });
  ok(bricks.length > 2000 || type === 'apartment', type + ': has real brickwork (' + bricks.length + ')');
  ok(offBrick.length === 0, type + ': every brick is UK size or a cut of one' + (offBrick.length ? ' — e.g. ' + offBrick.slice(0, 4).join(', ') + ' (' + offBrick.length + ')' : ''));
  ok(!bricks.length || full / bricks.length > 0.6, type + ': mostly whole bricks (' + (bricks.length ? Math.round(100 * full / bricks.length) : 0) + '%)');

  // brick courses are on the 75 mm gauge (bed-course centres at y0 + n·CH + BH/2), allowing a handful of special courses
  var y0s = {}; bricks.forEach(function (it) { if (near(it.sy, UK.BH, 0.002)) { var r = ((it.y - UK.BH / 2) % UK.CH + UK.CH) % UK.CH; y0s[Math.round(r * 1000)] = (y0s[Math.round(r * 1000)] || 0) + 1; } });
  var top = Object.keys(y0s).sort(function (a, b) { return y0s[b] - y0s[a]; })[0], onGauge = top == null ? 0 : y0s[top];
  var nCourse = bricks.filter(function (it) { return near(it.sy, UK.BH, 0.002); }).length;
  ok(!nCourse || onGauge / nCourse > 0.85, type + ': brick courses on 75 mm gauge (' + (nCourse ? Math.round(100 * onGauge / nCourse) : 0) + '%)');

  // blocks
  var blocks = K.items.filter(function (it) { return it.k === 'block'; }), offBlock = 0;
  blocks.forEach(function (it) { var d = [it.sx, it.sy, it.sz].sort(function (a, b) { return a - b; }); if (!(near(d[0], UK.KW, 0.003) && d[1] <= UK.KH + 0.003 && d[2] <= UK.KL + 0.003)) offBlock++; });
  ok(offBlock === 0, type + ': blocks are 440 × 215 × 100 or cuts (' + offBlock + ' off)');

  // tiles exist and roof is not empty (high-rise may be flat-roofed)
  ok(m.counts.tiles > 100 || type === 'apartment' || type === 'flat', type + ': roof tiles laid (' + m.counts.tiles + ')');

  // stage order: every core stage represented
  var st = {}; K.items.forEach(function (it) { if (!it.g) st[it.st] = (st[it.st] || 0) + 1; });
  ['found', 'masonry', 'roofframe', 'roofcover', 'fitout', 'external'].forEach(function (s) { ok(st[s] > 0, type + ': stage ' + s + ' has components (' + (st[s] || 0) + ')'); });
  var stats = m.stats(0.5), stats1 = m.stats(1);
  ok(stats.bricksLaid > 0.3 * stats.bricksTotal && stats.bricksLaid <= stats.bricksTotal, type + ': ~most bricks laid by 50% (' + stats.bricksLaid + '/' + stats.bricksTotal + ')');
  ok(stats1.bricksLaid === stats1.bricksTotal, type + ': all bricks laid at 100%');
  if (m.focus) {   // flats: the user's own floor is what the deposit builds, so bricks laid track the deposit
    var q = m.stats(0.5).bricksLaid / Math.max(1, stats.bricksTotal);
    ok(q > 0.3 && q < 0.7, type + ': user floor ~half laid at 50% deposit (' + Math.round(q * 100) + '%)');
    ok(m.stats(0.01).bricksLaid === 0, type + ': nothing laid before the first deposit');
  } else ok(m.stats(0.11).bricksLaid < 0.1 * Math.max(1, stats.bricksTotal), type + ': almost no bricks before masonry stage');

  // geometry sanity
  var b = m.bounds, w = b.max[0] - b.min[0], d = b.max[2] - b.min[2], hgt = b.max[1];
  console.log('      bounds ' + w.toFixed(2) + ' × ' + d.toFixed(2) + ' m, height ' + hgt.toFixed(2) + ' m');
  var hr = HEIGHT[type] || [3, 200];
  ok(hgt >= hr[0] && hgt <= hr[1], type + ': overall height plausible ' + hr.join('–') + ' m (' + hgt.toFixed(2) + ')');
  ok(w > 4 && w < 60 && d > 4 && d < 60, type + ': footprint plausible');
  ok(m.instances <= (BUDGET[type] || 120000), type + ': instances within budget ' + m.instances + ' ≤ ' + (BUDGET[type] || 120000));
  ok(ms < 2500, type + ': builds in < 2.5 s in Node (' + ms + ' ms)');
  // floors option changes flat/apartment geometry deterministically
  if (type === 'flat' || type === 'apartment') {
    var m2 = H.build(type, { floor: 1 }), m3 = H.build(type, opts);
    ok(m3.instances === m.instances, type + ': deterministic for same floor');
    ok(!!m2 && m2.instances > 0, type + ': builds for floor 1');
  }
});
// ── clean shell (what the app shows): same UK-size bricks, far fewer parts, built by height, no scaffolding / ghosts / landscaping ──
var CLEAN_BUDGET = { terraced: 26000, semi: 16000, detached: 20000, mansion: 70000, flat: 14000, apartment: 14000 };
TYPES.forEach(function (type) {
  if (!H.models[type]) return;
  var opts = (type === 'flat' || type === 'apartment') ? { floor: type === 'flat' ? 2 : 5 } : {};
  var KC = new H.Kit({ seed: 11, detail: 'clean' }), meta = H.models[type](KC, opts) || {};
  var t0 = Date.now(), mc = KC.compile(Object.assign({ type: type }, meta)), ms = Date.now() - t0;
  console.log('— ' + type + ' (clean): ' + mc.counts.bricks + ' bricks, ' + mc.counts.tiles + ' tiles, ' + mc.instances + ' instances, ' + (mc.rows ? mc.rows.n + ' rows' : 'no rows'));
  ok(mc.clean && !!mc.rows && mc.rows.n >= 20 && mc.rows.n < 400, type + ' clean: has brick rows (' + (mc.rows && mc.rows.n) + ')');
  ok(mc.instances <= (CLEAN_BUDGET[type] || 60000), type + ' clean: instances within budget ' + mc.instances + ' ≤ ' + (CLEAN_BUDGET[type] || 60000));
  ok(KC.items.every(function (it) { return !it.g && it.h >= 2 && it.st !== 'external' && it.st !== 'setout'; }), type + ' clean: no scaffolding, ghost neighbours or landscaping');
  ok(!KC.items.some(function (it) { return it.m === 'scaffold' || it.m === 'scaffoldBoard' || it.m === 'fence' || it.m === 'paving' || it.m === 'grass' || it.m === 'plant'; }), type + ' clean: nothing from the dropped materials');
  var offB = KC.items.filter(function (it) { if (it.k !== 'brick') return false; var d = [it.sx, it.sy, it.sz].sort(function (a, b) { return a - b; }); return !(d[0] >= 0.02 && d[0] <= UK.BH + 0.002 && d[1] <= UK.BW + 0.002 && d[2] <= UK.BL + 0.002); }).length;
  ok(offB === 0, type + ' clean: every brick is UK size or a cut (' + offB + ' off)');
  ok(mc.stats(0).bricksLaid === 0 && mc.stats(1).bricksLaid === mc.counts.bricks, type + ' clean: nothing laid at 0%, everything at 100%');
  // build % == deposit %: an item is laid exactly when the build height reaches its top, so bricks laid never run ahead of the height
  var H1 = mc.rows.y1 - mc.rows.y0, bad = 0;
  KC.items.forEach(function (it) { if (it.k !== 'brick' || (mc.focus && !it.f)) return; var top = it.y + H._extents(it)[1], tt = Math.max(0, Math.min(1, (top - mc.rows.y0) / H1)); if (Math.abs(it.t - tt * 0.9999) > 1e-6) bad++; });
  ok(bad === 0, type + ' clean: every brick is laid when the build height reaches its top (' + bad + ' off)');
  var s25 = mc.stats(0.25), s50 = mc.stats(0.5), s75 = mc.stats(0.75);
  ok(s25.bricksLaid <= s50.bricksLaid && s50.bricksLaid <= s75.bricksLaid && s25.bricksLaid > 0, type + ' clean: bricks laid rise with the deposit (' + s25.bricksLaid + ' → ' + s50.bricksLaid + ' → ' + s75.bricksLaid + ')');
  ok(ms < 2000, type + ' clean: compiles in < 2 s (' + ms + ' ms)');
});
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
