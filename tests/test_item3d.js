// Item 3D models for the wealth inventory and liabilities: upload a .glb, the Night viewer (orbit, zoom, reset),
// each model in its own colours (no tint, owner 31 Oct), the preview on the tile, the model library (models/catalog.json, answered here because fetch cannot read file:// pages)
// with a refusal, a CC-BY pick on a liability, remove, and clean-up when an item is deleted.
// Run: node tests/test_item3d.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX_URL = require('./lib/vi').FILE_URL;   // VI_INDEX: test another copy of index.html
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// a tiny red pyramid as a .glb (built here so the test needs no model files)
function glb() {
  const pos = new Float32Array([0, 1, 0, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]);
  const idx = new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 3, 2, 1, 4, 3]);
  const bin = Buffer.concat([Buffer.from(pos.buffer), Buffer.from(idx.buffer), Buffer.alloc((4 - (pos.byteLength + idx.byteLength) % 4) % 4)]);
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0, 0, 1], metallicFactor: 0, roughnessFactor: 0.8 } }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 }, { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength, target: 34963 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 5, type: 'VEC3', min: [-1, 0, -1], max: [1, 1, 1] }, { bufferView: 1, componentType: 5123, count: idx.length, type: 'SCALAR' }] };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (b, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, b]); };
  return Buffer.concat([head, ch(js, 0x4E4F534A), ch(bin, 0x004E4942)]);
}
const GLB = glb();
const seed = theme => {
  localStorage.setItem('vi-theme', theme);
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  if (!localStorage.getItem('pos_al1')) localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Gibson Les Paul Standard', value: 2200 }], liabilities: [{ id: 21, name: 'Car', value: 4000, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z' }] }));
};
const idbHas = (p, key) => p.evaluate(k => invTx('readonly', s => s.get(k)).then(v => !!(v && v.glb)), key);
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    let cdn = 'ok';
    const CATJ = { models: [
      { id: 'CAR1', set: 'cars', item: 'Ford Fiesta', title: 'Car Hatchback', tags: ['car'], standin: true, standinFor: 'Ford Fiesta', licence: 'CC0 1.0', creator: 'Kay Lousberg', source: 'https://poly.pizza/m/CAR1', attribution: '', file: 'glb/car1.glb', thumb: 'thumb/car1.webp' },
      { id: 'BIK1', set: 'top100', item: 'Bicycle', title: 'Bicycle', tags: ['bike'], licence: 'CC-BY 3.0', creator: 'Poly by Google', source: 'https://poly.pizza/m/BIK1', attribution: '"Bicycle" by Poly by Google, https://poly.pizza/m/BIK1. Licence at https://creativecommons.org/licenses/by/3.0', file: 'glb/bik1.glb', thumb: 'thumb/bik1.webp' }] };
    await ctx.exposeFunction('__models', (url) => /catalog\.json$/.test(url) ? { s: 200, type: 'application/json', b64: Buffer.from(JSON.stringify(CATJ)).toString('base64') }
      : /\.glb$/.test(url) ? (cdn === 'ok' ? { s: 200, type: 'model/gltf-binary', b64: GLB.toString('base64') } : { s: 403, type: 'text/html', b64: Buffer.from('<title>no</title>').toString('base64') }) : { s: 404, type: 'text/plain', b64: '' });
    await ctx.addInitScript(() => { const of = window.fetch; window.fetch = function (u) { const url = String(u && u.url || u); if (!/(^|\/)models\//.test(url)) return of.apply(this, arguments);
      return window.__models(url).then(r => { const bin = atob(r.b64), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Response(r.s === 404 ? null : a, { status: r.s, headers: { 'content-type': r.type } }); }); }; });
    await p.addInitScript(seed, theme); await p.goto(INDEX_URL); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => { showTab('assets'); renderAlTab(); }); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !!document.querySelector('#other-assets-list .i3d-btn') && !!document.querySelector('#liabilities-list .i3d-btn')), theme + ': both lists have a 3D button on every tile');
    // 1. upload a .glb on the wealth item
    await p.evaluate(() => i3dPick('wi', 11));
    ok(await p.evaluate(() => !!document.querySelector('#i3d-q') && !!document.querySelector('.i3d-lib')), theme + ': the picker shows the search and the library grid');
    await p.setInputFiles('#i3d-modal input[type=file]', { name: 'guitar.glb', mimeType: 'model/gltf-binary', buffer: GLB });
    await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 15000 }).catch(() => {});
    const v = await p.evaluate(() => { const V = _i3dView, it = i3dItem('wi', 11); let mat = null; V.obj.traverse(o => { if (o.isMesh) mat = o.material; });
      const st = document.getElementById('i3d-stage'), cs = getComputedStyle(st);
      return { ctl: !!(V.ctl && V.ctl.enableDamping), bg: V.sc.background.getHexString(), g: mat.color.g, r: mat.color.r, b: mat.color.b, tinted: !!mat.userData.i3dTint, em: mat.emissive.getHexString(), tm: V.r.toneMapping === THREE.NoToneMapping,
        thumb: (it.model.thumb || '').slice(0, 22), src: it.model.src, stageBg: cs.getPropertyValue('--bg').trim(), canvas: !!st.querySelector('canvas.i3d-canvas'), auto: V.ctl.autoRotate }; });
    ok(v.canvas && v.ctl, theme + ': viewer opens with orbit controls');
    ok(v.bg === '02070c' && v.stageBg.toUpperCase() === '#080808', theme + ': viewer keeps the Night stage, near-black sky over a teal horizon since v0.9.1 R17 (' + v.bg + ', ' + v.stageBg + ')');
    ok(!v.tinted && v.r === 1 && v.g === 0 && v.b === 0 && v.em === '000000' && v.tm, theme + ': the model keeps its own colour, no green tint or glow, no film curve (owner, 31 Oct) (r ' + v.r + ' g ' + v.g + ' b ' + v.b + ', emissive ' + v.em + ')');
    ok(v.thumb === 'data:image/jpeg;base64' && v.src === 'file', theme + ': tile preview picture saved with the item');
    ok(await idbHas(p, 'm:wi:11'), theme + ': the .glb is kept on the device');
    const z = await p.evaluate(() => { const V = _i3dView, d0 = V.cam.position.distanceTo(V.ctl.target); V.zoom(0.8); const d1 = V.cam.position.distanceTo(V.ctl.target); V.reset(); const d2 = V.cam.position.distanceTo(V.ctl.target); return { d0, d1, d2 }; });
    ok(z.d1 < z.d0 && Math.abs(z.d2 - z.d0) < 1e-6, theme + ': zoom in and reset view work');
    await p.evaluate(() => i3dAuto()); ok(await p.evaluate(() => _i3dView.ctl.autoRotate === false && document.getElementById('i3d-auto').getAttribute('aria-pressed') === 'false'), theme + ': auto-rotate toggles off');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !document.getElementById('i3d-modal') && !window._i3dView), theme + ': Escape closes and frees the viewer');
    ok(await p.evaluate(() => { const i = document.querySelector('#other-assets-list img.i3d-thumb'); return !!i && /^data:image\/jpeg/.test(i.src); }), theme + ': wealth tile shows the model preview');
    await p.evaluate(() => document.querySelector('#other-assets-list img.i3d-thumb').click()); await p.waitForFunction(() => window._i3dView, null, { timeout: 15000 }).catch(() => {});
    ok(await p.evaluate(() => !!window._i3dView), theme + ': tapping the preview opens the viewer'); await p.evaluate(() => i3dClose());
    // 2. library test path on the liability (?modeltest=1 sets the flag for this browser)
    await p.evaluate(() => i3dPick('li', 21)); await p.waitForSelector('.i3d-li', { timeout: 8000 }).catch(() => {});
    const lib = await p.evaluate(() => { const l = [...document.querySelectorAll('.i3d-li')]; return { n: l.length, first: l[0] && l[0].dataset.cid }; });
    ok(lib.n === 2 && lib.first === 'cars:ford-fiesta', theme + ': library shows the catalogue, best match (car) first');
    cdn = 'blocked'; await p.evaluate(() => i3dPickLib('li', 21, 'cars:ford-fiesta')); await p.waitForTimeout(800);
    ok(await p.evaluate(() => /library answered 403/.test(document.getElementById('i3d-msg').textContent) && !i3dItem('li', 21).model), theme + ': a refusal is explained and nothing is saved');
    cdn = 'ok'; await p.evaluate(() => i3dPickLib('li', 21, 'top100:bicycle')); await p.waitForFunction(() => window._i3dView, null, { timeout: 15000 }).catch(() => {});
    const li = await p.evaluate(() => { const m = i3dItem('li', 21).model; return { src: m.src, lic: m.lic, credit: (document.querySelector('#i3d-modal .i3d-credit') || {}).textContent || '', tile: !!document.querySelector('#liabilities-list img.i3d-thumb') }; });
    ok(li.src === 'lib' && li.lic === 'CC-BY' && /by Poly by Google, https:\/\/poly\.pizza\/m\//.test(li.credit) && li.tile, theme + ': library model saved on the liability with its CC-BY credit');
    // 3. remove, and delete clean-up
    await p.evaluate(() => i3dRemove('li', 21)); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !i3dItem('li', 21).model && !document.querySelector('#liabilities-list img.i3d-thumb')) && !(await idbHas(p, 'm:li:21')), theme + ': remove model clears the item and the device copy');
    await p.evaluate(() => delOtherAsset(11)); await p.waitForTimeout(150);
    ok(!(await idbHas(p, 'm:wi:11')), theme + ': deleting the item deletes its 3D file');
    await ctx.close();
  }
  // phone width, reduced motion: no sideways scroll, no auto-spin
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed, 'dark'); await p.goto(INDEX_URL); await p.waitForTimeout(1800);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => { showTab('assets'); i3dPick('wi', 11); });
  await p.setInputFiles('#i3d-modal input[type=file]', { name: 'x.glb', mimeType: 'model/gltf-binary', buffer: GLB });
  await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 15000 }).catch(() => {});
  const ph = await p.evaluate(() => ({ auto: _i3dView.ctl.autoRotate, side: document.documentElement.scrollWidth - innerWidth }));
  ok(ph.auto === false, 'reduced motion: the model does not spin by itself');
  ok(ph.side <= 0, 'phone: no sideways scroll with the viewer open (' + ph.side + ')');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
