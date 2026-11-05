// v0.9.2 Night AA contrast pass (Pedro's brief, docs/creative/night-aa): placeholders, white-on-teal buttons, faded-label opacity floors,
// the Roadmap carousel (only the art fades, the words stay full) and the footer separators reach WCAG AA at Night; Daylight stays as it was.
// Run: node tests/test_v092_night_aa.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const MEASURE = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgb = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  window.__ratio = (a, b) => { const l1 = lum(rgb(a)), l2 = lum(rgb(b)); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
};
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' }); await routeThree(ctx);
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(t => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); }, theme);
    await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html') + '?bypass=websummit'); await page.waitForTimeout(1800);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important} *{animation:none!important;transition:none!important}' });
    await page.evaluate(MEASURE);
    const T = theme + ': ';
    const night = theme === 'dark';
    // G1 placeholders
    await page.evaluate(() => { showTab('assets'); showSubtab('assets', 'cash', null); }); await page.waitForTimeout(500);
    const ph = await page.evaluate(() => { const i = document.querySelector('#ca-name'); const c = getComputedStyle(i, '::placeholder').color, bg = getComputedStyle(i).backgroundColor; return { c, bg, r: window.__ratio(c, bg === 'rgba(0, 0, 0, 0)' ? 'rgb(8,13,20)' : bg) }; });
    if (night) ok(ph.r >= 4.5, T + 'placeholder text reaches 4.5:1 (' + ph.c + ' on ' + ph.bg + ' = ' + ph.r.toFixed(2) + ')');
    // G2 buttons
    await page.evaluate(() => showTab('overview')); await page.waitForTimeout(400);
    const bt = await page.evaluate(() => { const e = document.querySelector('.btn-add-data'); const s = getComputedStyle(e); return { c: s.color, bg: s.backgroundColor, r: window.__ratio(s.color, s.backgroundColor) }; });
    if (night) ok(bt.r >= 4.5, T + 'white text on the teal .btn-add-data button reaches 4.5:1 (' + bt.c + ' on ' + bt.bg + ' = ' + bt.r.toFixed(2) + ')');
    else ok(bt.c === 'rgb(255, 255, 255)' || bt.r >= 4.5, T + 'Daylight .btn-add-data stays readable (' + bt.r.toFixed(2) + ')');
    await page.evaluate(() => showTab('house')); await page.waitForTimeout(500);
    const ba = await page.evaluate(() => { const s = getComputedStyle(document.getElementById('btnAdd')); const m = s.backgroundImage.match(/rgb\([^)]*\)/g) || [s.backgroundColor]; return { c: s.color, rs: m.map(x => window.__ratio(s.color, x)) }; });
    if (night) ok(ba.rs.length && ba.rs.every(r => r >= 4.5), T + '"Lay the bricks" label reaches 4.5:1 over its whole gradient (' + ba.rs.map(r => r.toFixed(2)) + ')');
    // G3 opacity floors
    const fl = await page.evaluate(() => { const f = {}; [['.card-lbl', .8], ['.ov-chart-title', .95], ['.scene-cap', .65], ['.price-edit-row label', .7], ['.hb-lv.lock', .8]].forEach(([s, min]) => { const e = document.querySelector(s); if (e) f[s] = { op: +getComputedStyle(e).opacity, min }; }); return f; });
    if (night) for (const [s, v] of Object.entries(fl)) ok(v.op >= v.min - 1e-6, T + s + ' opacity floor ' + v.min + ' (' + v.op + ')');
    else for (const [s, v] of Object.entries(fl)) ok(v.op >= 0.99, T + 'Daylight ' + s + ' is not faded (' + v.op + ')');
    // G4 roadmap: Night fades the art, not the words
    await page.evaluate(() => showTab('overview')); await page.waitForTimeout(800);
    const rm = await page.evaluate(() => { const gs = [...document.querySelectorAll('#fire-roadmap-svg .fire-coin')]; return { n: gs.length, wordsFaded: gs.filter(g => g.style.opacity !== '' && +g.style.opacity < 1).length, artFaded: gs.filter(g => { const c = g.querySelector('.fire-card'); return c && c.style.opacity !== '' && +c.style.opacity < 1; }).length }; });
    if (night) ok(rm.n > 1 && rm.wordsFaded === 0 && rm.artFaded > 0, T + 'roadmap: only the slate art fades (' + JSON.stringify(rm) + ')');
    else ok(rm.n > 1 && rm.artFaded === 0, T + 'roadmap in Daylight keeps the old whole-stage fade (' + JSON.stringify(rm) + ')');
    ok(!errs.length, T + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
