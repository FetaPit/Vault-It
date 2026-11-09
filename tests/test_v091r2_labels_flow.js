// v0.9.1 round 2, chunk B (owner, 4 Nov 2026), edits R2, R9, R10, R11:
//   R2  "Add small relevant icons to the left of text on labels in networth 3d"
//   R9  "Cash flow add icons to labels same style as before"
//   R10 "Across all views make the income flow chart more compact across the Y Axis"
//   R11 "Make the dotted line the same line thickness and solid as in the flow chart above"
// Run: node tests/test_v091r2_labels_flow.js   (VI_APP=file:///path/to/index.html to test another copy)
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
const ssrc = require('fs').readFileSync(__dirname + '/test_sankey_fit.js', 'utf8');
const sankeySeed = eval(ssrc.slice(ssrc.indexOf('const seed=') + 11, ssrc.indexOf('(async')).trim().replace(/;$/, ''));
const EXP = [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Council tax', amount: 140, type: 'ce' }, { id: 5, name: 'Groceries', amount: 260, type: 've' }, { id: 6, name: 'Gym', amount: 35, type: 'cn' }, { id: 7, name: 'Takeaways', amount: 90, type: 'vn' }, { id: 8, name: 'House deposit', amount: 500, type: 'sv' }, { id: 9, name: 'ISA', amount: 150, type: 'iv' }];
const HIDE = '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}';
// the app's own category icons, by the name a label carries
const NW_ICON = { cash: 'vi-cash', deposit: 'vi-house-builder', stocks: 'vi-candles', crypto: 'vi-crypto', inv: 'vi-cube', metals: 'vi-metals', liabval: 'vi-liabilities', running: 'vi-repeat', 'debt:credit': 'vi-card', 'debt:personal': 'vi-loan' };
const CF_ICON = { ce: 'vi-b-ce', ve: 'vi-b-ve', cn: 'vi-b-cn', vn: 'vi-b-vn', sv: 'vi-piggy', iv: 'vi-trend-base' };
const SPY = () => {   // every icon the canvases draw (an SVG image), every label plate (rgba(8,8,8,.72)), per animation frame
  window.__ic = { frame: 0, img: [], plate: [] }; let pend = false; const tick = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; window.__ic.frame++; }); } };
  const di = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (im, x, y, w, h) {
    try { if (im && im.src && /^data:image\/svg\+xml/.test(im.src)) { tick(); window.__ic.img.push({ f: window.__ic.frame, cv: this.canvas.id, x, y, w, h }); } } catch (e) {}
    return di.apply(this, arguments);
  };
  const fr = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
    try { if (/rgba\(8, 8, 8, 0\.72\)/.test(this.fillStyle)) { tick(); window.__ic.plate.push({ f: window.__ic.frame, cv: this.canvas.id, x, y, w, h }); } } catch (e) {}
    return fr.apply(this, arguments);
  };
};
const lastFrame = (arr, cv) => { const a = arr.filter(c => c.cv === cv); const f = a.length ? Math.max(...a.map(c => c.f)) : -1; return a.filter(c => c.f === f); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  // ── R2 + R9: icons on the canvas labels ──
  for (const [w, h] of [[390, 844], [1100, 900]]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob }); await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.addInitScript(SPY); await p.addInitScript(seed, { theme: 'dark', flag: true }); await p.addInitScript((e) => { const o = JSON.parse(localStorage.getItem('pos_ov1')); if (o.expenses.length < 3) { o.expenses = e; localStorage.setItem('pos_ov1', JSON.stringify(o)); } }, EXP); await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: HIDE });
    const T = w + 'px: ';
    // R2: Net worth in 3D
    await p.evaluate(() => { showTab('overview'); updateKPIs(); }); await p.waitForTimeout(800);
    await p.evaluate(() => { window.__ic.img.length = 0; window.__ic.plate.length = 0; nw3d.hero.kick(); }); await p.waitForTimeout(900);
    const nw = await p.evaluate(() => { const L = (a, cv) => { const x = a.filter(c => c.cv === cv); const f = x.length ? Math.max(...x.map(c => c.f)) : -1; return x.filter(c => c.f === f); };
      const cv = document.getElementById('nw3d-hero-cv');
      return { plates: L(window.__ic.plate, 'nw3d-hero-cv'), imgs: L(window.__ic.img, 'nw3d-hero-cv'), cw: cv.clientWidth, ch: cv.clientHeight,
        keys: nw3d.sceneData().cols.filter(c => c.v >= .5).map(c => c.key), iconFor: typeof nw3d.iconFor === 'function' ? nw3d.sceneData().cols.map(c => [c.key, nw3d.iconFor(c.key)]) : null,
        have: id => !!document.getElementById(id) }; });
    ok(nw.plates.length >= 3, T + 'Net worth 3D draws its floor names (' + nw.plates.length + ' plates)');
    ok(nw.imgs.length >= nw.plates.length, T + 'every Net worth 3D name carries an icon (' + nw.imgs.length + ' icons for ' + nw.plates.length + ' names)');
    ok(nw.plates.every(pl => nw.imgs.some(im => im.x >= pl.x - 0.5 && im.x + im.w <= pl.x + pl.w + 0.5 && im.y >= pl.y - 0.5 && im.y + im.h <= pl.y + pl.h + 0.5 && im.x < pl.x + pl.w / 2)), T + 'each icon sits inside its name plate, on the left of the text');
    ok(nw.plates.every(pl => pl.x >= -1 && pl.x + pl.w <= nw.cw + 1 && pl.y + pl.h <= nw.ch + 1), T + 'every name plate, icon included, stays on the stage');
    const map = Object.fromEntries(nw.iconFor || []);
    const bad = Object.keys(NW_ICON).filter(k => map[k] !== undefined && map[k] !== NW_ICON[k]);
    ok(nw.iconFor && bad.length === 0, T + 'the Net worth labels use the app\'s own category icons (' + (nw.iconFor ? JSON.stringify(map) : 'no nw3d.iconFor hook') + ')');
    ok(nw.iconFor && nw.iconFor.every(([k, id]) => id && id.indexOf('vi-') === 0) && nw.iconFor.some(([k]) => /^debt:/.test(k)) , T + 'every column, debts too, has an icon id');
    // R9: Cash flow 3D (Overview) and the Budget tree map
    await p.evaluate(() => { document.getElementById('cf3d-cv').scrollIntoView({ block: 'center' }); });
    await p.waitForFunction(() => { const e = bd3d.dashEngine(); return e && e.flags().length >= 4 && e.flags().every(f => f.alpha >= 1 && f.chip); }, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(500);
    await p.evaluate(() => { window.__ic.img.length = 0; bd3d.dashEngine().kick(); }); await p.waitForTimeout(900);
    const cf = await p.evaluate(() => { const L = (a, cv) => { const x = a.filter(c => c.cv === cv); const f = x.length ? Math.max(...x.map(c => c.f)) : -1; return x.filter(c => c.f === f); };
      return { imgs: L(window.__ic.img, 'cf3d-cv'), all: window.__ic.img.filter(c => c.cv === 'cf3d-cv').length, groups: typeof CF_GROUP_ORDER !== 'undefined' ? CF_GROUP_ORDER.length : 0, iconFor: typeof bd3d !== 'undefined' && typeof bd3d.iconFor === 'function' ? CF_GROUP_ORDER.map(k => [k, bd3d.iconFor(k)]) : null }; });
    ok(cf.all >= 1, T + 'Cash flow 3D draws icons on its labels (' + cf.all + ' icon draws)');
    const cmap = Object.fromEntries(cf.iconFor || []);
    ok(cf.iconFor && Object.keys(CF_ICON).every(k => cmap[k] === CF_ICON[k]), T + 'the six Cash flow labels use the budget groups\' own icons (' + JSON.stringify(cmap) + ')');
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(700);
    await p.click('#bd-view button[data-v="3d"]'); await p.evaluate(() => document.getElementById('bd3d-cv').scrollIntoView({ block: 'center' }));
    await p.waitForFunction(() => { const e = bd3d.engine(); return e && e.flags && e.flags().length && e.flags().every(f => f.alpha >= 1 && f.chip); }, null, { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(500);
    const bd = await p.evaluate(() => { const e = bd3d.engine(); return { flags: e.flags(), cw: document.getElementById('bd3d-cv').clientWidth, n: window.__ic.img.filter(c => c.cv === 'bd3d-cv').length }; });
    const chips = bd.flags.filter(f => f.chip);
    ok(chips.length >= 3 && chips.every(f => f.icon && /^vi-/.test(f.icon)), T + 'every Budget 3D chip names its icon (' + chips.map(f => f.icon).join(', ') + ')');
    ok(bd.n >= chips.length, T + 'and the canvas draws them (' + bd.n + ' draws for ' + chips.length + ' chips)');
    ok(chips.every(f => f.chip.x >= 0 && f.chip.x + f.chip.w <= bd.cw + .5), T + 'chips with icons still stay on the stage');
    await ctx.close();
  }
  // ── R10: the income flow chart is more compact on the Y axis (baseline before this change: 390 → 1344 px; 1100x900 → 750; 1366x768 → 618; 1600x900 → 750; 1630x1206 → 1056) ──
  for (const [w, h, base] of [[390, 844, 1344], [1100, 900, 750], [1366, 768, 618], [1600, 900, 750], [1630, 1206, 1056]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.addInitScript(sankeySeed); await p.goto(APP); await p.waitForTimeout(2200); await p.addStyleTag({ content: HIDE });
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(1000);
    const r = await p.evaluate(() => { const s = document.querySelector('#bd-sankey svg'), r = s.getBoundingClientRect(), vb = s.viewBox.baseVal; return { h: r.height, w: r.width, vw: vb.width, vh: vb.height }; });
    ok(r.h <= base * 0.85, w + 'x' + h + ': the income flow chart is at least 15% shorter than before (' + Math.round(r.h) + ' px, was ' + base + ')');
    if (w >= 1100) ok(r.w / r.vw >= 0.5, w + 'x' + h + ': and its text did not shrink to get there (scale ' + (r.w / r.vw).toFixed(2) + ')');
    else ok(r.w / r.vw >= 0.99, w + 'x' + h + ': phones still draw it 1:1, so the chips keep their real size');
    // R11: the divider under it is solid and as thick as the flow lines
    if (w >= 1100) {
      const d = await p.evaluate(() => { const a = getComputedStyle(document.querySelector('.bd-sankey-card'), '::after'), s = getComputedStyle(document.querySelector('.bd-split'), '::before'), ln = getComputedStyle(document.querySelector('#bd-sankey .cf-ln'));
        const solid = x => ({ w: parseFloat(x.width), dashed: x.borderLeftStyle === 'dashed' || x.borderLeftStyle === 'dotted', bg: x.backgroundColor }); return { a: solid(a), s: solid(s), ln: parseFloat(ln.strokeWidth) }; });
      ok(!d.a.dashed && d.a.bg !== 'rgba(0, 0, 0, 0)' && Math.abs(d.a.w - d.ln) < .01, w + 'x' + h + ': the divider over the chart is solid and ' + d.ln + ' px, like the flow lines (' + JSON.stringify(d.a) + ')');
      ok(!d.s.dashed && d.s.bg !== 'rgba(0, 0, 0, 0)' && Math.abs(d.s.w - d.ln) < .01, w + 'x' + h + ': so is the divider between Income and Spending below it (' + JSON.stringify(d.s) + ')');
    }
    await ctx.close();
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
