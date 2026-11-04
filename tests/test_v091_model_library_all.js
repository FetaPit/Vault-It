// v0.9.1 E30: every model in models/catalog.json can be attached to an item: the real file is fetched, read, styled and previewed with no page error.
// (A textured model once failed on pick because three r128 textures have no userData; only a real-file sweep finds that kind of fault.)
// The page is served over local http from the repo, so models/ is the real library. Run: node tests/test_v091_model_library_all.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const http = require('http'), fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const ROOT = path.join(__dirname, '..'), INDEX = process.env.VI_INDEX || path.join(ROOT, 'index.html');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.md': 'text/markdown' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = u === '/index.html' ? INDEX : path.join(ROOT, decodeURIComponent(u));
  if (!f.startsWith(ROOT) && f !== INDEX || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
const seed = () => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Test item', value: 100 }], liabilities: [] }));
};
(async () => {
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 900, height: 800 }, serviceWorkers: 'block' }); await routeThree(ctx);
  const errs = []; const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed); await p.goto('http://127.0.0.1:' + srv.address().port + '/index.html');
  await p.waitForFunction(() => typeof i3dPick === 'function' && window.alState && typeof renderAlTab === 'function', null, { timeout: 15000 });
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => { showTab('assets'); renderAlTab(); });
  const cat = await p.evaluate(() => i3dCatalog().then(c => c.map(m => ({ uid: m.uid, file: m.file, title: m.title }))));
  ok(cat.length >= 233, 'the catalogue lists ' + cat.length + ' models');
  ok(new Set(cat.map(m => m.uid)).size === cat.length, 'every catalogue entry has its own uid (the model id repeats across sets)');
  const bad = [];
  for (const m of cat) {
    const r = await p.evaluate(async uid => { try { const x = _i3dCat.find(y => y.uid === uid); const buf = await i3dFetchLib(x.file); const meta = await i3dSave('wi', 11, buf, i3dMeta(x)); return { ok: !!(meta && meta.cid === uid && /^data:image/.test(meta.thumb || '')) }; } catch (e) { return { err: String(e && e.message || e).slice(0, 120) }; } }, m.uid);
    if (!r.ok) bad.push(m.uid + ': ' + (r.err || 'no model or preview'));
  }
  ok(bad.length === 0, 'all ' + cat.length + ' models attach with a preview' + (bad.length ? ' (failed: ' + bad.slice(0, 8).join('; ') + ')' : ''));
  ok(errs.length === 0, 'no page errors across the sweep ' + errs.slice(0, 3).join('|'));
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
