// Your own design in House Builder: upload a GLB → it becomes the house (hologram while saving the deposit, colour as you
// own it), survives a reload (IndexedDB), can be hidden/removed; Meshy AI generation through the house-3d relay (mocked).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const routeThree = require('./three_route');
const GLB = path.join(__dirname, 'fixtures', 'sample_house.glb');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
const ST = () => { const v = HB3D.viewer, C = v && v._cust; return { engine: document.getElementById('house-scene').getAttribute('data-engine'), type: HB3DAPP.want && HB3DAPP.want.type, mode: HB3DAPP.want && HB3DAPP.want.mode,
  custom: !!(v && v.model && v.model.custom), holo: C ? C.holo.some(o => o.visible) : null, solid: C ? C.solid.some(o => o.visible) : null, blue: C ? C.blue.some(o => o.visible) : null,
  card: (document.getElementById('hb-design-status') || {}).innerText || '', hud: (document.getElementById('hb-hud') || {}).innerText || '', cap: (document.getElementById('hb3d-cap') || {}).textContent || '',
  h: v && v.model ? v.model.height : 0, info: v && v.model && v.model.info, meta: JSON.parse(localStorage.getItem('vi_hb_design') || 'null') }; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await routeThree(ctx);
  // mocked relay for Meshy (create → status → refine → status → download)
  let calls = [];
  await ctx.route(/functions\/v1\/house-3d/, async route => {
    const body = JSON.parse(route.request().postData() || '{}'); calls.push(body.action);
    const j = (o, s) => route.fulfill({ status: s || 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (body.action === 'create') return j({ id: 'prev-12345678' });
    if (body.action === 'refine') return j({ id: 'ref-123456789' });
    if (body.action === 'status') return j({ status: 'SUCCEEDED', progress: 100, glb: 'https://assets.meshy.ai/x/' + body.id + '.glb' });
    if (body.action === 'download') return route.fulfill({ status: 200, contentType: 'model/gltf-binary', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(GLB) });
    return j({ error: 'unknown' }, 400);
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(seed({ saved: 25000, target: 250000, houseType: 'terraced', deposits: [{ amount: 25000, date: '01/10/2026' }], prices: { terraced: 250000 } }));
  await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => showTab('house')); await p.waitForTimeout(1200);
  let r = await p.evaluate(ST);
  ok(r.engine === '3d' && r.type === 'terraced' && !r.custom, 'starts with the standard terraced house');

  // ── upload
  await p.setInputFiles('#model-file-input', GLB);
  await p.waitForFunction(() => HB3D.viewer && HB3D.viewer.model && HB3D.viewer.model.custom, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(900);
  r = await p.evaluate(ST);
  console.log(JSON.stringify({ type: r.type, mode: r.mode, h: r.h, info: r.info, card: r.card.slice(0, 160) }));
  ok(r.type === 'custom' && r.custom, 'uploaded design becomes the House Builder house');
  ok(r.mode === 'build' && r.holo && !r.blue && !r.solid, 'deposit stage: design shown as a hologram rising to the current row (no full colour yet, remainder is an outline)');
  ok(r.h > 6 && r.h < 11, 'unknown units are sized as a real two-storey house (' + r.h.toFixed(2) + ' m)');
  ok(/Uploaded design/.test(r.card) && /hologram/i.test(r.card), 'design card shows the design and how it is used');
  ok(/UK bricks/i.test(r.hud), 'HUD counts (estimated) bricks for the design');
  const vp = await p.evaluate(() => { const v = HB3D.viewer, C = v._cust; return { p: v.p, clip: C.holoMats[0].clippingPlanes[0].constant, H: v.model.height }; });
  ok(Math.abs(vp.clip - vp.p * vp.H) < 0.05, 'hologram height follows the deposit (' + (vp.clip / vp.H * 100).toFixed(0) + '% of the house at ' + (vp.p * 100).toFixed(0) + '% saved)');
  const rb = await p.evaluate(() => { const v = HB3D.viewer; return { band: v.rowBand && v.rowBand.visible, y: v.rowBand && v.rowBand.position.y, H: v.model.height, ri: v.rowInfo(), label: document.getElementById('hb3d-rowlabel').innerText }; });
  ok(rb.band && Math.abs(rb.y - 0.5 * rb.H) < 0.05 && /ROW \d+ \/ \d+/.test(rb.label), 'the design also shows the current row (' + rb.label.replace(/\n/g, ' ') + ')');
  await p.screenshot({ path: 'shots/hb3d/design_upload_build.png' });

  // ── mortgage stage: colour below the owned share, hologram above
  await p.evaluate(() => { state.houseMode = 'purchased'; state.valuation = 250000; state.mortgageBalance = 150000; save(); updateUI(); });
  await p.waitForTimeout(900);
  r = await p.evaluate(ST);
  const eq = await p.evaluate(() => { const v = HB3D.viewer, C = v._cust; return { solidClip: C.solidMats[0].clippingPlanes[0].constant, holoClip: -C.holoMats[0].clippingPlanes[0].constant, H: v.model.height, eq: v.eq }; });
  ok(r.mode === 'equity' && r.solid && r.holo && !r.blue, 'mortgage stage: full colour + hologram');
  ok(Math.abs(eq.solidClip - 0.4 * eq.H) < 0.05 && Math.abs(eq.holoClip - 0.4 * eq.H) < 0.05, 'colour fills exactly the owned 40% of the design');
  await p.screenshot({ path: 'shots/hb3d/design_upload_equity.png' });
  await p.evaluate(() => { state.mortgageBalance = 0; save(); updateUI(); });
  await p.waitForTimeout(700);
  r = await p.evaluate(ST);
  ok(r.mode === 'complete' && r.solid && !r.holo && !r.blue, 'mortgage free: the whole design in colour');
  await p.screenshot({ path: 'shots/hb3d/design_upload_complete.png' });
  await p.evaluate(() => { state.houseMode = null; state.mortgageBalance = 0; save(); updateUI(); });

  // ── persists across a reload (IndexedDB)
  await p.reload(); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => showTab('house'));
  await p.waitForFunction(() => HB3D.viewer && HB3D.viewer.model && HB3D.viewer.model.custom, null, { timeout: 15000 }).catch(() => {});
  r = await p.evaluate(ST);
  ok(r.type === 'custom' && r.custom, 'design is restored after reloading the app');

  // ── hide / show / remove
  await p.evaluate(() => hbDesignToggle(false)); await p.waitForTimeout(700);
  r = await p.evaluate(ST);
  ok(r.type === 'terraced' && !r.custom && /Show my design/.test(r.card), '"Show standard house" switches back, design kept');
  await p.evaluate(() => hbDesignToggle(true)); await p.waitForTimeout(900);
  r = await p.evaluate(ST);
  ok(r.type === 'custom' && r.custom, '"Show my design" brings it back');
  await p.evaluate(() => hbDesignRemove()); await p.waitForTimeout(700);
  r = await p.evaluate(ST);
  ok(r.type === 'terraced' && !r.custom && !r.meta && r.card === '', 'remove deletes the design');

  // ── Meshy AI (relay mocked)
  await p.evaluate(() => { localStorage.setItem('meshy_api_key', 'msy_test_key_123456'); document.getElementById('meshy-prompt').value = 'modern detached house with a flat roof'; });
  await p.evaluate(() => generateMeshyModel());
  await p.waitForFunction(() => HB3D.viewer && HB3D.viewer.model && HB3D.viewer.model.custom, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(600);
  r = await p.evaluate(ST);
  const st = await p.evaluate(() => document.getElementById('meshy-status').textContent);
  ok(calls.join(',') === 'create,status,refine,status,download', 'AI flow: preview → texture → download via the relay (' + calls.join(',') + ')');
  ok(r.type === 'custom' && r.meta && r.meta.source === 'ai' && /AI design/.test(r.card), 'AI design becomes the House Builder house');
  ok(r.mode === 'build' && r.holo && !r.solid, 'AI design also builds as a hologram during the deposit');
  ok(/House Builder house/.test(st), 'AI status confirms (' + st + ')');
  ok(!(await p.evaluate(() => localStorage.getItem('vi_hb_meshy'))), 'no generation left pending');
  // relay error is shown to the user
  await ctx.unroute(/functions\/v1\/house-3d/);
  await ctx.route(/functions\/v1\/house-3d/, route => route.fulfill({ status: 402, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: 'Your Meshy account is out of credits.' }) }));
  await p.evaluate(() => generateMeshyModel()); await p.waitForTimeout(800);
  ok(/out of credits/.test(await p.evaluate(() => document.getElementById('meshy-status').textContent)), 'Meshy errors are explained');
  await p.evaluate(() => hbDesignRemove());

  // ── non-Pro users are offered the upgrade
  await p.evaluate(() => { var u = JSON.parse(localStorage.getItem('vi_user')); u.pro = false; localStorage.setItem('vi_user', JSON.stringify(u)); localStorage.removeItem('vi_pioneer'); });
  ok(errs.length === 0, 'no errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
