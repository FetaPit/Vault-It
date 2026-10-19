// usage: node flatshots.js '<json array of shots>'
// shot: {out, type:'flat', p, mode, floor, az, el, zoom, tx, ty, tz, dist, w, h}
const { chromium } = require('playwright');
(async () => {
  const shots = JSON.parse(process.argv[2]);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + __dirname + '/hb3d_harness.html'); await pg.waitForTimeout(300);
  for (const s of shots) {
    const r = await pg.evaluate((s) => {
      const res = show(s.type || 'flat', s.p == null ? 1 : s.p, s.mode || 'complete', { floor: s.floor, eq: s.eq }); if (s.lights != null) V.setState({ lights: s.lights });
      const c = V.controls;
      if (s.tx != null) c.target.set(s.tx, s.ty, s.tz);
      const d = s.dist || V.distance(), az = (s.az == null ? 30 : s.az) * Math.PI / 180, el = (s.el == null ? 20 : s.el) * Math.PI / 180;
      V.camera.position.set(c.target.x + d * Math.sin(az) * Math.cos(el), c.target.y + d * Math.sin(el), c.target.z + d * Math.cos(az) * Math.cos(el));
      if (s.zoom) V.setZoom(s.zoom);
      c.update(); V.render();
      return res;
    }, s);
    await pg.waitForTimeout(150);
    await pg.screenshot({ path: s.out });
    console.log(s.out, JSON.stringify({ build: r.build, render: r.render, inst: r.inst, counts: r.counts, stats: r.stats && { b: r.stats.bricksLaid, st: r.stats.stageKey } }));
  }
  if (errs.length) console.log('ERRORS', errs.slice(0, 5).join(' | '));
  await b.close();
})();
