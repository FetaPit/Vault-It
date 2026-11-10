// Shots of an item 3D model tile (a red pyramid on a wealth item): Night and Daylight, 390 and 1100 px; the phone shot is taken after a tap (live view).
const { chromium } = require('playwright'); const routeThree = require('../tests/three_route'); const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../tests/test_i3d_live.js', 'utf8');
const GLB = eval('(' + src.slice(src.indexOf('function glb()'), src.indexOf('const GLB')).replace(/^function glb\(\)/, 'function()') .trim() + ')')();
const seed = theme => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Red pyramid', value: 2200 }], liabilities: [{ id: 21, name: 'Car', value: 4000, rate: 0, depRate: 0, runningCost: 0, addedDate: new Date().toISOString() }] }));
};
// CDP capture: Playwright's own screenshot waits for web fonts, which the offline test route never delivers
async function snap(p, ctx, sel, path) {
  const r = await p.evaluate(s => { const e = document.querySelector(s).getBoundingClientRect(); return { x: e.left + scrollX, y: e.top + scrollY, width: e.width, height: e.height, scale: 1 }; }, sel);
  const c = await ctx.newCDPSession(p); const d = await c.send('Page.captureScreenshot', { format: 'png', clip: r, captureBeyondViewport: true });
  fs.writeFileSync(path, Buffer.from(d.data, 'base64'));
}
(async () => {
  const b = await chromium.launch(); fs.mkdirSync('shots/qc', { recursive: true });
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const ph = w < 700, ctx = await b.newContext({ viewport: { width: w, height: ph ? 844 : 900 }, deviceScaleFactor: ph ? 2 : 1, isMobile: ph, hasTouch: ph }); await routeThree(ctx); await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' })); const p = await ctx.newPage();
    await p.addInitScript(seed, theme); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => { showTab('assets'); const b = [...document.querySelectorAll('#assets-page .subtab-btn')].find(x => /'other'/.test(x.getAttribute('onclick') || '')); showSubtab('assets', 'other', b); }); await p.waitForTimeout(500);
    await p.evaluate(() => i3dPick('wi', 11)); await p.waitForTimeout(300);
    await p.setInputFiles('#i3d-modal input[type=file]', { name: 'pyramid.glb', mimeType: 'model/gltf-binary', buffer: GLB });
    await p.waitForFunction(() => window._i3dView && _i3dView.ctl, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(800);
    await snap(p, ctx, '#i3d-modal', `shots/qc/b-viewer_${theme}_${w}.png`);
    await p.evaluate(() => i3dClose()); await p.waitForTimeout(500);
    const th = await p.$('#other-assets-list img.i3d-thumb'); await th.scrollIntoViewIfNeeded(); const bx = await th.boundingBox();
    if (ph) await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); else await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
    await p.waitForTimeout(1800); await snap(p, ctx, '#other-assets-list .wi-tile', `shots/qc/b-tile_${theme}_${w}.png`);
    console.log('b-tile_' + theme + '_' + w); await ctx.close();
  } await b.close();
})();
