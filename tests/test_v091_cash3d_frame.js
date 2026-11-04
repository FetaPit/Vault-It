// v0.9.1 cash 3D phone framing (owner approved via CoS, 4 Nov: "at 390 px wide the cash 3D flags cover the coins").
// At phone width the coins show clearly beneath the flags: no coin's top corner, projected through the camera, falls inside a
// flag box. Desktop framing does not change. The 10.5 px flag floor and the 56 px clamp still hold.
// Served over http://127.0.0.1 from the folder that holds VI_INDEX (file:// can lose localStorage in headless Chrome).
// Run: node tests/test_v091_cash3d_frame.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const routeThree = require('./three_route');
const FILE = process.env.VI_INDEX || path.join(__dirname, '..', 'index.html');
const ROOT = path.dirname(FILE), PAGE = path.basename(FILE);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const GPU_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-compositing', '--enable-gpu-rasterization'];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ACCTS = [
  { id: 5, name: 'Barclays Savings', type: 'Savings', balance: 2000, rate: 4.5 },
  { id: 6, name: 'Monzo', type: 'Current', balance: 340 },
  { id: 7, name: 'Nationwide ISA', type: 'ISA', balance: 1200, rate: 3.2 }
];
const SEED = `(function(){if(localStorage.getItem('pos_al1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true,plan:'annual'}));localStorage.setItem('pos_al1',JSON.stringify({cashAccounts:${JSON.stringify(ACCTS)},physicalCash:[{id:1,where:'Safe',amount:300,date:'2026-10-01'}],metals:{},metalPrices:{gold:2000,silver:25,platinum:900,palladium:1000}}));})()`;

// every flag box and every coin's top corners, in CSS px of the stage, as drawn now
const MEASURE = () => {
  const V = V3.cash, cam = V.cam, W = V.r.domElement.clientWidth, H = V.r.domElement.clientHeight;
  V.root.updateMatrixWorld(true); cam.updateMatrixWorld();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion), rt = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const px = v => { const q = v.clone().project(cam); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H]; };
  const flags = [], pts = [], p = new THREE.Vector3();
  V.root.traverse(o => {
    const F = o.userData && o.userData.v3Font;
    if (F && o.tag) { const sp = o.tag; sp.getWorldPosition(p); const c = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(k => px(p.clone().addScaledVector(rt, k[0] * sp.scale.x / 2).addScaledVector(up, k[1] * sp.scale.y / 2)));
      flags.push({ tag: o.userData.v3Tag[0], x0: Math.min(...c.map(z => z[0])), x1: Math.max(...c.map(z => z[0])), y0: Math.min(...c.map(z => z[1])), y1: Math.max(...c.map(z => z[1])), lines: F.f.filter(Boolean).map(f => f / F.h * (Math.max(...c.map(z => z[1])) - Math.min(...c.map(z => z[1])))) }); }
    if (o.isInstancedMesh && o.userData.v3Intro) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox, m = new THREE.Matrix4(), n = o.userData.v3Full || o.count;
      const top = [[bb.min.x, bb.min.z], [bb.max.x, bb.min.z], [bb.min.x, bb.max.z], [bb.max.x, bb.max.z], [(bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2]];
      for (let i = 0; i < n; i++) { o.getMatrixAt(i, m); top.forEach(t => pts.push(px(new THREE.Vector3(t[0], bb.max.y, t[1]).applyMatrix4(m).applyMatrix4(o.matrixWorld)))); }
    }
  });
  const under = pts.filter(q => flags.some(f => q[0] > f.x0 && q[0] < f.x1 && q[1] > f.y0 && q[1] < f.y1)).length;
  return { W, H, flags, pts: pts.length, under, cam: cam.position.toArray().map(v => +v.toFixed(2)), target: V.ctl.target.toArray().map(v => +v.toFixed(2)) };
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const URL = 'http://127.0.0.1:' + server.address().port + '/' + PAGE;
  const b = await chromium.launch({ args: GPU_ARGS }); const errs = [];
  const measure = async (w, h, mobile) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' }); await routeThree(ctx);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED); await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1400);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'cash', null); });
    await p.waitForFunction(() => window.V3 && V3.cash && V3.cash.root.children.length, null, { timeout: 60000 }).catch(() => {});
    await p.evaluate(() => document.getElementById('cashSceneCard').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2500);
    const r = await p.evaluate(MEASURE); await ctx.close(); return r;
  };

  // ── phone: the coins show beneath the flags ──
  const m = await measure(390, 844, true);
  ok(m.pts > 0 && m.flags.length === 5, '390: the stage draws the coins and five flags (' + m.pts + ' coin points, ' + m.flags.length + ' flags)');
  ok(m.under === 0, '390: no coin sits under a flag (' + m.under + ' of ' + m.pts + ' coin points covered)');
  ok(m.flags.every(f => Math.min(...f.lines) >= 10.5), '390: every flag line is still 10.5 px or more (' + m.flags.map(f => Math.min(...f.lines).toFixed(1)).join(', ') + ')');
  ok(m.flags.every(f => f.x1 <= m.W - 55 && f.x0 >= 0), '390: every flag is still clear of the zoom controls (' + m.flags.map(f => Math.round(f.x0) + '-' + Math.round(f.x1)).join(', ') + ' of ' + m.W + ')');

  // ── desktop: the framing does not change ──
  const d = await measure(1280, 800, false);
  const DESK = { cam: [169.13, 170.82, 207.45], target: [39.29, 13.99, 28.14] };   // candidate 248e7e4, before this change
  const same = (a, z) => a.every((v, i) => Math.abs(v - z[i]) < 0.05);
  ok(same(d.cam, DESK.cam) && same(d.target, DESK.target), '1280: desktop framing unchanged (camera ' + d.cam.join(',') + ', target ' + d.target.join(',') + ')');
  ok(d.flags.every(f => Math.min(...f.lines) >= 10.5) && d.flags.every(f => f.x1 <= d.W - 55 && f.x0 >= 0), '1280: flags keep the floor and the clamp');
  console.log('info: 1280 coin points under a flag: ' + d.under + ' of ' + d.pts);

  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); server.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
