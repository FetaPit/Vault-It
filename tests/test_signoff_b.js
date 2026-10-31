// Phone sign-off group B (owner, 31 Oct): item 3D models. (1) a picture saved with the old green tint is redrawn in the model's own colours;
// (2) on a touch screen, tapping a model tile turns it into a live 3D view with orbit (a second tap opens the full viewer).
// Run: node tests/test_signoff_b.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_i3d_live.js', 'utf8');
const GLB = eval('(' + src.slice(src.indexOf('function glb()'), src.indexOf('const GLB')).replace(/^function glb\(\)/, 'function()') .trim() + ')')();
const seed = theme => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Red pyramid', value: 2200 }], liabilities: [{ id: 21, name: 'Car', value: 4000, rate: 0, depRate: 0, runningCost: 0, addedDate: new Date().toISOString() }] }));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const t = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await routeThree(t); const q = await t.newPage(); q.on('pageerror', e => errs.push(e.message));
  await q.addInitScript(seed, 'dark'); await q.goto('file:///home/user/Vault-It/index.html'); await q.waitForTimeout(1800);
  await q.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await q.evaluate(() => { showTab('assets'); const b = [...document.querySelectorAll('#assets-page .subtab-btn')].find(x => /'other'/.test(x.getAttribute('onclick') || '')); showSubtab('assets', 'other', b); }); await q.waitForTimeout(500);
  await q.evaluate(() => i3dPick('wi', 11)); await q.waitForTimeout(300);
  await q.setInputFiles('#i3d-modal input[type=file]', { name: 'pyramid.glb', mimeType: 'model/gltf-binary', buffer: GLB });
  await q.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 15000 }).catch(() => {});
  await q.evaluate(() => i3dClose()); await q.waitForTimeout(400);
  // an old picture: plain green, no version mark (what the earlier tinted build saved)
  await q.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#1f8f5a'; g.fillRect(0, 0, 64, 64);
    const it = alState.otherAssets.find(x => x.id === 11); it.model.thumb = c.toDataURL('image/jpeg'); delete it.model.tv; window.__old = it.model.thumb; saveAL(); renderAlTab(); });
  await q.waitForFunction(() => { const m = alState.otherAssets.find(x => x.id === 11).model; return m.thumb !== window.__old && m.tv; }, null, { timeout: 15000 }).catch(() => {});
  const px = await q.evaluate(() => new Promise(res => { const m = alState.otherAssets.find(x => x.id === 11).model, im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let r = 0, gg = 0, n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 90 && d[i] > d[i + 1] * 1.8) { r += d[i]; gg += d[i + 1]; n++; } res({ n, tv: m.tv, same: m.thumb === window.__old }); }; im.src = m.thumb; }));
  ok(!px.same && px.tv >= 2 && px.n > 200, 'an old green picture is redrawn from the saved model: its own red shows (' + px.n + ' red pixels)');
  const imgOk = await q.evaluate(() => document.querySelector('#other-assets-list img.i3d-thumb').src === alState.otherAssets.find(x => x.id === 11).model.thumb);
  ok(imgOk, 'the tile shows the redrawn picture');
  const th = await q.$('#other-assets-list img.i3d-thumb'); await th.scrollIntoViewIfNeeded(); const box = await th.boundingBox();
  await q.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await q.waitForTimeout(1800);
  const r = await q.evaluate(() => ({ live: !!(window._i3dLive && _i3dLive.view), canvas: !!document.querySelector('#other-assets-list .i3d-live canvas'), modal: !!document.getElementById('i3d-modal') }));
  ok(r.live && r.canvas && !r.modal, 'tapping the tile on a phone turns it into a live 3D view (not the viewer yet)');
  const cam0 = await q.evaluate(() => (window._i3dLive && _i3dLive.view ? _i3dLive.view.cam.position.toArray() : [0, 0, 0]));
  const cdp = await t.newCDPSession(q); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 10, y: cy + 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await q.waitForTimeout(600);
  const cam1 = await q.evaluate(() => (window._i3dLive && _i3dLive.view ? _i3dLive.view.cam.position.toArray() : [0, 0, 0]));
  const moved = Math.hypot(cam1[0] - cam0[0], cam1[2] - cam0[2]);
  ok(moved > 0.2 && !(await q.$('#i3d-modal')), 'a drag orbits the model in the tile (camera moved ' + moved.toFixed(2) + ')');
  await q.touchscreen.tap(cx, cy); await q.waitForTimeout(900);
  ok(!!(await q.$('#i3d-modal')), 'a tap without a drag opens the full viewer');
  await t.close(); await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
