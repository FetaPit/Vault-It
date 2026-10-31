// Like tools/shot.js but with the nw3d test seed (cash, debts, a car), so the 3D scenes have blocks. Usage: node tools/shot_seeded.js --name x --sel "#nw3d-hero-stage" [--tab overview] [--js "..."]
const { chromium } = require('playwright'); const fs = require('fs');
const a = {}; for (let i = 2; i < process.argv.length; i += 2) a[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const src = fs.readFileSync(__dirname + '/../tests/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  fs.mkdirSync('shots/qc', { recursive: true }); const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const phone = w < 700, ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
    await require('../tests/three_route')(ctx); await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' })); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, { theme, flag: true }); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate(t => { showTab(t || 'overview'); }, a.tab); if (a.js) await p.evaluate(a.js); await p.waitForTimeout(1800);
    if (a.view) { await p.evaluate(() => { const s = document.querySelector(window.__sel); s && s.scrollIntoView({ block: 'center' }); }); }
    await p.evaluate(s => { const e = document.querySelector(s); e && e.scrollIntoView({ block: 'center' }); if (window.viFbDodge) viFbDodge(); }, a.sel); await p.waitForTimeout(900);
    const out = `shots/qc/${a.name}_${theme}_${w}`;
    await p.screenshot({ path: out + '_view.png' }); await p.locator(a.sel).first().screenshot({ path: out + '.png' });
    console.log(out + '.png errors=' + errs.length + (errs[0] ? ' ' + errs[0].slice(0, 100) : '')); await ctx.close();
  } await b.close();
})();
