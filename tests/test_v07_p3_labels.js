// v0.7 final round, round 1 item 2 (owner, 2 Nov, fold test): the Net worth in 3D floor labels are colour-coded to their column's block colour.
// Each label is drawn in a legible tint of its own column's colour (the colour itself, lightened only as far as the dark label plate needs
// for AA contrast), never one gold or red for all. Run: node tests/test_v07_p3_labels.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h, theme] of [[390, 844, 'dark'], [1100, 900, 'dark'], [390, 844, 'light'], [1100, 900, 'light']]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob }); await ctx.route(/^https?:/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.addInitScript(() => {
      window.__lab = { calls: [] };
      const orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t, x, y) {
        try { if (this.canvas.id === 'nw3d-hero-cv' && /Share Tech Mono/.test(this.font)) window.__lab.calls.push({ t: String(t), fill: String(this.fillStyle), px: parseFloat(this.font) }); } catch (e) {}
        return orig.apply(this, arguments);
      };
    });
    await p.addInitScript(seed, { theme, flag: true }); await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate(() => { showTab('overview'); updateKPIs(); }); await p.waitForTimeout(800);
    await p.evaluate(() => { window.__lab.calls.length = 0; nw3d.hero.kick(); }); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const cols = nw3d.sceneData().cols.filter(c => c.v >= .5), last = {}, minpx = {}; window.__lab.calls.forEach(c => { last[c.t] = c.fill; minpx[c.t] = c.px; });
      return { minpx: Math.min(...cols.map(c => minpx[c.short]).filter(Boolean)), cols: cols.map(c => ({ short: c.short, col: c.col, fill: last[c.short] || null })) };
    });
    const T = w + 'px ' + theme + ': ';
    const rgb = (s) => (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
    const contrast = (a, bb) => { const A = lum(a), B = lum(bb); return (Math.max(A, B) + .05) / (Math.min(A, B) + .05); };
    ok(r.cols.length >= 4 && r.cols.every(c => c.fill), T + 'every column has a label drawn (' + r.cols.map(c => c.short).join(', ') + ')');
    // the label colour is the column colour, mixed toward white in 10% steps (one amount t) in 10% steps
    const tint = (c) => { const L = rgb(c.fill); let best = 1e9; for (let t = 0; t <= .95; t += .1) { const m = c.col.map(v => v + (255 - v) * t); best = Math.min(best, Math.max(...m.map((v, i) => Math.abs(v - L[i])))); } return best; };
    const bad = r.cols.filter(c => c.fill && tint(c) > 8);
    ok(bad.length === 0, T + 'each label is its own column\'s colour, lightened only (' + (bad.map(c => c.short + ' ' + c.fill + ' vs ' + c.col).join('; ') || 'all match') + ')');
    ok(r.cols.every(c => !c.fill || contrast(rgb(c.fill), [8, 8, 8]) >= 4.5), T + 'every label reads on the dark label plate (AA 4.5:1)');
    ok(r.minpx >= 10, T + 'label text is at least 10 px (' + r.minpx + ')');
    ok(new Set(r.cols.map(c => c.fill)).size >= 3, T + 'the labels are not all one colour');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
