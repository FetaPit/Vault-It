// Screenshots of the item 3D viewer: wealth inventory tile and viewer, liabilities tile, the library picker.
//   node tests/item3d_shots.js  → shots/brand/item3d-*.png (Night and Daylight, 390px and 1100px)
// The model is built from three.js shapes in the page (no model files needed).
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const fs = require('fs'); const OUT = __dirname + '/../shots/brand'; fs.mkdirSync(OUT, { recursive: true });
const seed = theme => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-flag-models', '1');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Gibson Les Paul Standard', value: 2200 }, { id: 12, name: 'Rolex Submariner', value: 7400 }], liabilities: [{ id: 21, name: 'Car', value: 4000, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z' }] }));
};
const guitar = () => { const g = new THREE.Group(), M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .1 });
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .22, 40), M(0x8a1c12)); b1.rotation.x = Math.PI / 2; b1.position.y = .7; g.add(b1);
  const b2 = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .22, 40), M(0x8a1c12)); b2.rotation.x = Math.PI / 2; b2.position.y = 1.35; g.add(b2);
  const n = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.5, .1), M(0x3b2414)); n.position.set(0, 2.3, .06); g.add(n);
  const h = new THREE.Mesh(new THREE.BoxGeometry(.3, .4, .08), M(0x1b1b1b)); h.position.set(0, 3.2, .05); g.add(h);
  [0.75, 1.0].forEach(y => { const p = new THREE.Mesh(new THREE.BoxGeometry(.5, .08, .06), M(0xd9d4c8)); p.position.set(0, y, .14); g.add(p); }); g.rotation.z = -.35; return g; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(theme + w + ': ' + e.message));
    await p.addInitScript(seed, theme); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2000);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => new Promise(r => viThree(r))); await p.evaluate(g => { const mk = eval('(' + g + ')'); showTab('assets'); const it = i3dItem('wi', 11); it.model = { src: 'file', t: 'guitar', thumb: i3dThumb(mk()) }; i3dItem('li', 21).model = { src: 'pp', k: 'car', t: 'Car Hatchback', by: 'Kay Lousberg', lic: 'CC0', thumb: i3dThumb(new THREE.Mesh(new THREE.BoxGeometry(2, .7, 1), new THREE.MeshStandardMaterial({ color: 0x2255aa }))) }; renderAlTab();
      showSubtab('assets', 'other', document.querySelector('[onclick*="\'other\'"]')); }, guitar.toString());
    await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('other-assets-list').scrollIntoView({ block: 'start' }));
    await p.screenshot({ path: `${OUT}/item3d-tiles-${theme}-${w}.png` });
    await p.evaluate(g => { const mk = eval('(' + g + ')'); const body = i3dShell('Gibson Les Paul Standard', '£2,200 · 3D model (your file)');
      body.innerHTML = '<div class="inv-stage i3d-stage" id="i3d-stage"><div class="inv-ctl"><button id="i3d-auto">⟳</button><button>＋</button><button>－</button><button>⌂</button></div></div><div class="inv-hint">Drag to rotate · pinch or scroll to zoom · two fingers or right-drag to move.</div>';
      _i3dView = new I3DView(document.getElementById('i3d-stage'), mk(), { auto: false }); }, guitar.toString());
    await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/item3d-viewer-${theme}-${w}.png` });
    await p.evaluate(() => i3dPick('li', 21)); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/item3d-picker-${theme}-${w}.png` });
    await p.evaluate(() => { i3dClose(); showSubtab('assets', 'liabilities', document.querySelector('[onclick*="\'liabilities\'"]')); document.getElementById('liabilities-list').scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/item3d-liab-${theme}-${w}.png` });
    const side = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (side > 0) errs.push(theme + w + ' sideways ' + side);
    await ctx.close();
  }
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'shots ok'); await b.close();
})();
