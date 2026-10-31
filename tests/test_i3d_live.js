// Round 3, item 19 (owner, 31 Oct 2026): on a desktop, an item's 3D model can be orbited in its own tile by clicking and dragging.
// Hovering a model tile swaps its picture for a live view (one at a time); a drag turns the camera round the item; a click without
// a drag opens the full viewer; the wheel stays with the page. Touch screens keep the picture. Item 14: the model keeps its colours.
// Run: node tests/test_i3d_live.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
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
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed, 'dark'); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => { showTab('assets'); const b = [...document.querySelectorAll('#assets-page .subtab-btn')].find(x => /'other'/.test(x.getAttribute('onclick') || '')); showSubtab('assets', 'other', b); }); await p.waitForTimeout(500);
  // put a model on the item through the normal upload
  await p.evaluate(() => i3dPick('wi', 11)); await p.waitForTimeout(300);
  await p.setInputFiles('#i3d-modal input[type=file]', { name: 'guitar.glb', mimeType: 'model/gltf-binary', buffer: GLB });
  await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 15000 }).catch(() => {});
  await p.evaluate(() => i3dClose()); await p.waitForTimeout(400);
  const th = await p.$('#other-assets-list img.i3d-thumb'); ok(!!th, 'the tile shows the model picture');
  await th.scrollIntoViewIfNeeded(); const box = await th.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(1500);
  let r = await p.evaluate(() => ({ live: !!(window._i3dLive && _i3dLive.view), canvas: !!document.querySelector('#other-assets-list .i3d-live canvas'), hid: document.querySelector('#other-assets-list img.i3d-thumb').style.visibility, zoom: _i3dLive && _i3dLive.view.ctl.enableZoom }));
  ok(r.live && r.canvas && r.hid === 'hidden' && r.zoom === false, 'hovering the tile starts a live 3D view in it (page wheel untouched)');
  const cam0 = await p.evaluate(() => _i3dLive.view.cam.position.toArray());
  await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(box.x + box.width / 2 + i * 15, box.y + box.height / 2 + 2); await p.mouse.up(); await p.waitForTimeout(600);
  const cam1 = await p.evaluate(() => _i3dLive.view.cam.position.toArray());
  const moved = Math.hypot(cam1[0] - cam0[0], cam1[2] - cam0[2]);
  ok(moved > 0.3 && !(await p.$('#i3d-modal')), 'click and drag orbits round the item, and does not open the viewer (camera moved ' + moved.toFixed(2) + ')');
  await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(800);
  ok(!!(await p.$('#i3d-modal')) && await p.evaluate(() => !window._i3dLive), 'a click without a drag opens the full viewer (and the tile\'s live view stops)');
  ok(await p.evaluate(() => document.querySelectorAll('canvas.i3d-canvas').length === 1), 'only one 3D view is open at a time');
  await ctx.close();
  // touch screen: no live view, the picture opens the viewer
  const t = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await routeThree(t); const q = await t.newPage(); q.on('pageerror', e => errs.push('touch ' + e.message));
  await q.addInitScript(seed, 'dark'); await q.goto('file:///home/user/Vault-It/index.html'); await q.waitForTimeout(1500);
  ok(await q.evaluate(() => { i3dLive('wi', 11, document.createElement('img')); return !window._i3dLive; }), 'touch screens keep the picture (no live view)');
  await t.close(); await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
