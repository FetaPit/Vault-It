// Renders a standard review set for one House Builder 3D model (one browser session, many shots).
// usage: node tests/hb3d_review_shots.js <type> <outdir> [floor]
// Shots: finished views from 4 sides, build stages, equity, site, and close-ups (door, eaves/roof, corner bonding).
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const [type, outdir, floorArg] = process.argv.slice(2);
  const floor = floorArg ? +floorArg : 5;
  fs.mkdirSync(outdir, { recursive: true });
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + path.join(__dirname, 'hb3d_harness.html')); await pg.waitForTimeout(300);
  // f = fraction of model height for the camera target (close-ups); x = 'front'|'corner'|'mid'
  const SHOTS = [
    { n: '01_complete_front', p: 1, mode: 'complete' },
    { n: '02_complete_rear', p: 1, mode: 'complete', az: 205 },
    { n: '03_complete_left', p: 1, mode: 'complete', az: -62, el: 14 },
    { n: '04_complete_high', p: 1, mode: 'complete', az: 40, el: 52 },
    { n: '05_build_08_foundations', p: 0.08, mode: 'build' },
    { n: '06_build_20_walls', p: 0.20, mode: 'build' },
    { n: '07_build_35_walls', p: 0.35, mode: 'build' },
    { n: '08_build_48_wallplate', p: 0.48, mode: 'build' },
    { n: '09_build_58_roofframe', p: 0.58, mode: 'build', el: 34 },
    { n: '10_build_68_tiling', p: 0.68, mode: 'build', el: 34 },
    { n: '11_build_85_external', p: 0.85, mode: 'build' },
    { n: '12_equity_45', p: 1, mode: 'equity', eq: 0.45 },
    { n: '13_site', p: 0, mode: 'site' },
    { n: '14_close_entrance', p: 1, mode: 'complete', az: 14, el: 6, zoom: 3.2, f: 0.16, x: 'front' },
    { n: '15_close_eaves_roof', p: 1, mode: 'complete', az: 28, el: 16, zoom: 3.4, f: 0.86, x: 'corner' },
    { n: '16_close_corner_bond', p: 1, mode: 'complete', az: 45, el: 8, zoom: 5.5, f: 0.12, x: 'corner' },
    { n: '17_close_build_40', p: 0.40, mode: 'build', az: 30, el: 12, zoom: 3.0, f: 0.25, x: 'corner' }
  ];
  const results = [];
  for (const s of SHOTS) {
    const r = await pg.evaluate(([type, floor, s]) => {
      const res = show(type, s.p, s.mode, { floor: floor, eq: s.eq || 0 });
      const c = V.controls, bb = M.bounds;
      if (s.f != null) {
        const cx = s.x === 'corner' ? bb.max[0] - 0.3 : (bb.min[0] + bb.max[0]) / 2;
        c.target.set(cx, Math.max(0.6, bb.max[1] * s.f), s.x === 'mid' ? (bb.min[2] + bb.max[2]) / 2 : 0.0);
      }
      const d = V.distance(), az = (s.az == null ? 32 : s.az) * Math.PI / 180, el = (s.el == null ? 20 : s.el) * Math.PI / 180;
      V.camera.position.set(c.target.x + d * Math.sin(az) * Math.cos(el), c.target.y + d * Math.sin(el), c.target.z + d * Math.cos(az) * Math.cos(el));
      if (s.zoom) V.setZoom(s.zoom);
      c.update(); V.render();
      return { build: res.build, render: res.render, inst: res.inst, counts: res.counts, height: res.height, stats: res.stats };
    }, [type, floor, s]);
    await pg.waitForTimeout(120);
    const out = path.join(outdir, type + '_' + s.n + '.png');
    await pg.screenshot({ path: out });
    results.push({ shot: out, p: s.p, mode: s.mode, stage: r.stats && r.stats.stage, bricksLaid: r.stats && r.stats.bricksLaid });
    if (s.n === '01_complete_front') console.log(JSON.stringify({ type, floor, build_ms: r.build, render_ms: r.render, instances: r.inst, counts: r.counts, height: r.height }));
  }
  results.forEach(x => console.log(x.shot + '  p=' + x.p + ' ' + x.mode + (x.stage ? ' · ' + x.stage : '') + (x.bricksLaid != null ? ' · bricks laid ' + x.bricksLaid : '')));
  if (errs.length) console.log('ERRORS', errs.slice(0, 5).join(' | '));
  await b.close();
})();
