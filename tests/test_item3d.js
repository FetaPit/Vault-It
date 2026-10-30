// Item 3D models for the wealth inventory and liabilities: upload a .glb, the Night viewer (orbit, zoom, reset),
// the same green tint on every model, the preview on the tile, the Poly Pizza library test path (?modeltest=1)
// with the CDN mocked (ok and bot-check refusal), remove, and clean-up when an item is deleted.
// Run: node tests/test_item3d.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
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
    await p.route('https://static.poly.pizza/**', r => r.request().url().endsWith('.glb')
      ? (cdn === 'ok' ? r.fulfill({ status: 200, contentType: 'model/gltf-binary', body: GLB, headers: { 'access-control-allow-origin': '*' } }) : r.fulfill({ status: 403, contentType: 'text/html', body: '<title>Just a moment...</title>' }))
      : r.fulfill({ status: 404, body: '' }));
    await p.addInitScript(seed, theme); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => { showTab('assets'); renderAlTab(); }); await p.waitForTimeout(500);
    if (theme === 'light') {
      const m = await p.evaluate(() => ['Gibson Les Paul Standard', 'Rolex Submariner', 'BMW 3 Series', 'Harley-Davidson motorbike', 'Brompton bike', 'Gold bullion 1oz', 'Sofa'].map(i3dMatch));
      ok(JSON.stringify(m) === JSON.stringify(['guitar', 'watch', 'car', 'motorbike', 'bicycle', 'gold', 'sofa']), 'item names map to the right model ' + JSON.stringify(m));
      ok(await p.evaluate(() => !!document.querySelector('#other-assets-list .i3d-btn') && !!document.querySelector('#liabilities-list .i3d-btn')), 'both lists have a 3D button on every tile');
    }
    // 1. upload a .glb on the wealth item
    await p.evaluate(() => i3dPick('wi', 11));
    ok(await p.evaluate(() => !document.querySelector('.i3d-lib')), theme + ': library is hidden without the test flag');
    await p.setInputFiles('#i3d-modal input[type=file]', { name: 'guitar.glb', mimeType: 'model/gltf-binary', buffer: GLB });
    await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 15000 }).catch(() => {});
    const v = await p.evaluate(() => { const V = _i3dView, it = i3dItem('wi', 11); let mat = null; V.obj.traverse(o => { if (o.isMesh) mat = o.material; });
      const st = document.getElementById('i3d-stage'), cs = getComputedStyle(st);
      return { ctl: !!(V.ctl && V.ctl.enableDamping), bg: V.sc.background.getHexString(), g: mat.color.g, r: mat.color.r, tinted: !!mat.userData.i3dTint, em: mat.emissive.getHexString() === i3dCol(0x3ECF8E).getHexString(),
        thumb: (it.model.thumb || '').slice(0, 22), src: it.model.src, stageBg: cs.getPropertyValue('--bg').trim(), canvas: !!st.querySelector('canvas.i3d-canvas'), auto: V.ctl.autoRotate }; });
    ok(v.canvas && v.ctl, theme + ': viewer opens with orbit controls');
    ok(v.bg === '05101b' && v.stageBg.toUpperCase() === '#080808', theme + ': viewer keeps the Night stage (' + v.bg + ', ' + v.stageBg + ')');
    ok(v.tinted && v.g > 0.05 && v.r > 0.6 && v.em, theme + ': model gets the subtle green tint (r ' + v.r.toFixed(2) + ' g ' + v.g.toFixed(2) + ')');
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
    await p.evaluate(() => { localStorage.setItem('vi-flag-models', '1'); i3dPick('li', 21); });
    const lib = await p.evaluate(() => { const l = [...document.querySelectorAll('.i3d-li')]; return { n: l.length, first: l[0] && l[0].dataset.k, best: l[0] && l[0].classList.contains('best') }; });
    ok(lib.n === 17 && lib.first === 'car' && lib.best, theme + ': library shows 17 models, best match (car) first');
    cdn = 'blocked'; await p.evaluate(() => i3dPickLib('li', 21, 'car')); await p.waitForTimeout(800);
    ok(await p.evaluate(() => /bot/.test(document.getElementById('i3d-msg').textContent) && !i3dItem('li', 21).model), theme + ': a bot-check refusal is explained and nothing is saved');
    cdn = 'ok'; await p.evaluate(() => i3dPickLib('li', 21, 'bicycle')); await p.waitForFunction(() => window._i3dView, null, { timeout: 15000 }).catch(() => {});
    const li = await p.evaluate(() => { const m = i3dItem('li', 21).model; return { src: m.src, lic: m.lic, credit: (document.querySelector('.i3d-credit') || {}).textContent || '', tile: !!document.querySelector('#liabilities-list img.i3d-thumb') }; });
    ok(li.src === 'pp' && li.lic === 'CC-BY' && /by Poly by Google, https:\/\/poly\.pizza\/m\//.test(li.credit) && li.tile, theme + ': library model saved on the liability with its CC-BY credit');
    // 3. remove, and delete clean-up
    await p.evaluate(() => i3dRemove('li', 21)); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !i3dItem('li', 21).model && !document.querySelector('#liabilities-list img.i3d-thumb')) && !(await idbHas(p, 'm:li:21')), theme + ': remove model clears the item and the device copy');
    await p.evaluate(() => delOtherAsset(11)); await p.waitForTimeout(150);
    ok(!(await idbHas(p, 'm:wi:11')), theme + ': deleting the item deletes its 3D file');
    await ctx.close();
  }
  // phone width, reduced motion: no sideways scroll, no auto-spin
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed, 'dark'); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
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
