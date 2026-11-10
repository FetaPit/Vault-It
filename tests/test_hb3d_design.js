// Your own design in House Builder (upload a GLB or describe one for Meshy AI) is locked for everyone (owner, 1 Nov 2026: Pro, after
// the MVP). The card only says "Coming later as part of Pro" (no file input, no Meshy prompt), hbDesignOn() is false even with a saved
// design, loadCustomModel / generateMeshyModel only toast and change nothing, the relay is never called, and the house stays the brand build.
// (The GLB fixture tests/fixtures/sample_house.glb is kept for when the feature returns.)
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const path = require('path');
const routeThree = require('./three_route');
const GLB = path.join(__dirname, 'fixtures', 'sample_house.glb');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('vi_hb_design',JSON.stringify({id:'d1',active:true,name:'My design',source:'upload'}));localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})();`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }); await routeThree(ctx);
  let calls = 0; await ctx.route(/functions\/v1\/house-3d/, r => { calls++; r.abort(); });
  const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|net::/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(seed({ saved: 20000, target: 250000, houseType: 'terraced', deposits: [{ amount: 20000, date: '01/10/2026' }], prices: { terraced: 250000 } }));
  await p.goto(require('./lib/vi').FILE_URL); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => showTab('house'));
  await p.waitForFunction(() => window.HB3D && HB3D.viewer && HB3D.viewer.brandInfo && HB3D.viewer.brandInfo() && HB3D.viewer.settled(), null, { timeout: 60000 }).catch(() => {});

  // the card: locked, Pro, no upload or prompt
  let r = await p.evaluate(() => { const c = document.getElementById('hb-own-design'); return { txt: c ? c.innerText + ' ' + c.textContent : '', file: !!document.getElementById('model-file-input'), inputs: c ? c.querySelectorAll('input,textarea,button').length : -1 }; });
  ok(/Coming later as part of Pro/.test(r.txt) && /PRO/.test(r.txt), 'the Your own design card says "Coming later as part of Pro"');
  ok(!r.file && r.inputs === 0, 'no file input (#model-file-input) and no Meshy prompt or buttons on the card');

  // a saved design does not take over the house
  const ST = () => p.evaluate(() => { const v = HB3D.viewer; return { on: hbDesignOn(), type: HB3DAPP.want && HB3DAPP.want.type, mode: HB3DAPP.want && HB3DAPP.want.mode, custom: !!(v.model && v.model.custom), brand: !!v.brandInfo(), engine: document.getElementById('house-scene').getAttribute('data-engine'), meta: localStorage.getItem('vi_hb_design'), model: v.model && v.model.type }; });
  const s0 = await ST();
  ok(!s0.on, 'hbDesignOn() is false even with a saved design');
  ok(s0.engine === '3d' && s0.type === 'terraced' && s0.mode === 'build' && !s0.custom && s0.brand, 'the house is still the brand build of the chosen type (' + s0.type + ')');

  // loadCustomModel with a real GLB only toasts; nothing changes
  await p.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = 'tmp-glb'; i.style.display = 'none'; document.body.appendChild(i); });
  await p.setInputFiles('#tmp-glb', GLB);
  await p.evaluate(() => loadCustomModel(document.getElementById('tmp-glb')));
  await p.waitForTimeout(1500);
  r = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, shown: document.getElementById('toast').classList.contains('show') }));
  ok(r.shown && r.toast === 'Your own design: coming later as part of Pro', 'loadCustomModel only toasts "' + r.toast + '"');
  let s1 = await ST();
  ok(!s1.on && !s1.custom && s1.brand && s1.type === 'terraced' && s1.meta === s0.meta, 'nothing changes: same house, saved design left as it was');

  // generateMeshyModel only toasts and never calls the relay
  await p.evaluate(() => { document.getElementById('toast').textContent = ''; return generateMeshyModel(); });
  await p.waitForTimeout(800);
  r = await p.evaluate(() => document.getElementById('toast').textContent);
  ok(r === 'Your own design: coming later as part of Pro' && calls === 0, 'generateMeshyModel only toasts; the house-3d relay is never called');
  s1 = await ST();
  ok(!s1.on && !s1.custom && s1.brand, 'the house is still the brand build');

  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
