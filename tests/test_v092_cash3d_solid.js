// v0.9.2 cash 3D solid stacks (owner via CoS, 4 Nov ~16:25: "Cash 3D view (Monzo coin grid) is wrong and looks hollow from the side:
// the stacks show as one slab with empty curved gaps underneath. Each stack must be its own solid model once stacked, not the grid as a whole.").
// Every coin shape on the stage is closed (each edge shared by exactly two triangles: top, side and bottom, no holes), a block of
// 1,000 is 100 closed stacks, and from a low side camera a ray through the middle height of every stack hits coins (no empty gaps).
// Served over http://127.0.0.1 from the folder that holds VI_INDEX. Run: node tests/test_v092_cash3d_solid.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
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

// every coin shape: closed? each edge (by rounded positions) must belong to exactly two triangles
const SOLID = () => { const out = [];
  V3.cash.root.traverse(o => { if (!o.isMesh || !o.userData.v3Intro) return; const pos = o.geometry.attributes.position, idx = o.geometry.index, key = i => [pos.getX(i), pos.getY(i), pos.getZ(i)].map(v => v.toFixed(4)).join(','), E = new Map();
    const n = idx ? idx.count : pos.count; for (let t = 0; t < n; t += 3) { const v = [0, 1, 2].map(k => key(idx ? idx.getX(t + k) : t + k)); for (let k = 0; k < 3; k++) { const a = v[k], b = v[(k + 1) % 3]; if (a === b) continue; const e = a < b ? a + '|' + b : b + '|' + a; E.set(e, (E.get(e) || 0) + 1); } }
    let open = 0; E.forEach(c => { if (c !== 2) open++; }); out.push({ kind: o.isInstancedMesh ? 'batch of ' + (o.userData.v3Full || o.count) : 'stack', tris: n / 3, openEdges: open, stacks: o.userData.v3Stacks ? o.userData.v3Stacks.length : null }); });
  return out; };
// from a low side camera: a ray to the middle height of every stack must hit coins no further than that stack's far side
const LOWSIDE = (phi) => { const V = V3.cash, o = V.cam.position.clone().sub(V.ctl.target), s = new THREE.Spherical().setFromVector3(o); s.phi = phi; o.setFromSpherical(s); V.cam.position.copy(V.ctl.target).add(o); V.cam.updateMatrixWorld(); V.root.updateMatrixWorld(true);
  const coins = [], centres = []; V.root.traverse(m => { if (!m.isMesh || !m.userData.v3Intro) return; coins.push(m); const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox, mid = (bb.min.y + bb.max.y) / 2, n = m.isInstancedMesh ? (m.userData.v3Full || m.count) : 1, M = new THREE.Matrix4();
    const local = m.userData.v3Stacks || [[(bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2]];
    for (let i = 0; i < n; i++) { if (m.isInstancedMesh) m.getMatrixAt(i, M); else M.identity(); local.forEach(c => centres.push(new THREE.Vector3(c[0], mid, c[1]).applyMatrix4(M).applyMatrix4(m.matrixWorld))); } });
  // each ray starts in the 1.2 mm gap just outside the stack, on the camera's side, and aims at the stack's middle: it must meet that
  // stack's own wall, whatever the stacks in front of it hide
  const sp = V3_COINS[(window.VI_CURRENCY || 'GBP').toUpperCase()] || V3_COINS.GBP, r = sp.d / 2, rc = new THREE.Raycaster(); let miss = 0, first = null;
  centres.forEach(c => { const d = c.clone().sub(V.cam.position).setY(0).normalize(), o = c.clone().addScaledVector(d, -(r + 0.05)); rc.set(o, d); rc.near = 0; rc.far = 0.2; const h = rc.intersectObjects(coins, false); if (!h.length) { miss++; if (!first) first = c.toArray().map(v => +v.toFixed(2)); } });
  return { stacks: centres.length, miss, first }; };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const URL = 'http://127.0.0.1:' + server.address().port + '/' + PAGE;
  const b = await chromium.launch({ args: GPU_ARGS }); const errs = [];
  for (const [w, h, mobile, cur] of [[390, 844, true, 'GBP'], [1280, 900, false, 'GBP'], [390, 844, true, 'USD']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' }); await routeThree(ctx);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED); await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(1400);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.waitForFunction(() => !!window.THREE && !!THREE.OrbitControls, null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(c => { window.VI_CURRENCY = c; _applyCurrency(); showTab('assets'); showSubtab('assets', 'cash', null); }, cur);
    await p.waitForFunction(() => window.V3 && V3.cash && V3.cash.root.children.length, null, { timeout: 60000 }).catch(() => {});
    await p.evaluate(() => document.getElementById('cashSceneCard').scrollIntoView({ block: 'center' })); await p.waitForTimeout(2500);
    const tag = w + ' ' + cur;
    const S = await p.evaluate(SOLID);
    ok(S.length > 0 && S.every(x => x.openEdges === 0), tag + ': every coin shape is closed, top, side and bottom (' + S.map(x => x.kind + ' ' + x.tris + ' tris, ' + x.openEdges + ' open edges').join('; ') + ')');
    const blocks = S.filter(x => x.stacks === 100);
    ok(blocks.length > 0, tag + ': a block of 1,000 is 100 stacks, each its own closed shape (' + blocks.length + ' block batches)');
    for (const phi of [1.45, 1.3]) {   // about 83 and 74 degrees from straight down: low side views
      const L = await p.evaluate(LOWSIDE, phi);
      ok(L.stacks > 300 && L.miss === 0, tag + ': from a low side camera (' + Math.round(phi * 57.3) + ' deg) every stack is solid at its middle height (' + L.miss + ' of ' + L.stacks + ' rays found no coin' + (L.first ? ', first at ' + L.first.join(',') : '') + ')');
    }
    await ctx.close();
  }
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); server.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
