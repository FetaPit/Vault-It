// Round 3, items 1 to 4 (owner, 31 Oct 2026): the dashboard forecast says what it rests on (v0.7 UI round 2: from the Budget, full width);
// the assets and liabilities tiles draw each value on one proportional scale; the debt tile shows what is left in a soft red
// from the left and what is paid off in green from the right, both amounts underneath.
// v0.8: the graph's zoom hint under the axis, goal labels on plates that never overlap, no emoji on the History heading.
// Run: node tests/test_ov_tiles.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [theme, w] of [['dark', 1100], ['light', 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' }); await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(theme + ' ' + e.message));
    await p.addInitScript(seed, { theme, flag: true }); await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    const T = theme + ' ' + w + ': ';
    // 1. the forecast note
    let r = await p.evaluate(() => { if (window.nw3d && nw3d.setMain) nw3d.setMain('graph'); chartState.metrics.proj = true; drawChart();
      const pts = document.getElementById('nwChart')._points || [], real = pts.filter(x => !x.synth).length, el = document.getElementById('nw-fc-note'), e3 = document.getElementById('nw3d-fc-note');
      const cs = getComputedStyle(el); return { real, txt: el.textContent, hid: el.hidden, t3: e3 && e3.textContent, align: cs.textAlign, proj: document.getElementById('nwChart')._proj.length }; });
    // v0.7 UI round 2 (owner, 2 Nov): the forecast comes from the Budget, the note runs the full width, the 3D card carries none
    ok(!r.hid && /^6-month estimate, not a prediction\. Your Budget/.test(r.txt) && /not a prediction/.test(r.txt) && r.align === 'left' && r.proj === 6, T + 'the forecast note says it comes from the Budget, and that it is not a prediction (' + r.proj + ' months)');
    ok(r.t3 == null, T + 'the 3D progress card carries no forecast note');
    ok(!/—/.test(r.txt), T + 'no em dashes in the note');
    r = await p.evaluate(() => { chartState.metrics.proj = false; drawChart(); const h = document.getElementById('nw-fc-note').hidden; chartState.metrics.proj = true; drawChart(); return h; });
    ok(r === true, T + 'Forecast off: no note');
    // only this month known: the budget still gives a forecast (no trend needed)
    r = await p.evaluate(() => { const keep = JSON.stringify(ovState.snapshots || []); ovState.snapshots = []; drawChart();
      const out = { txt: document.getElementById('nw-fc-note').textContent, proj: document.getElementById('nwChart')._proj.length, real: (document.getElementById('nwChart')._points || []).filter(x => !x.synth).length };
      ovState.snapshots = JSON.parse(keep); drawChart(); return out; });
    ok(r.real === 1 && r.proj === 6 && /^6-month estimate, not a prediction\. Your Budget/.test(r.txt), T + 'with only this month known the forecast still comes from the budget (' + r.proj + ' months)');
    // 2. assets and liabilities: one proportional scale per card
    r = await p.evaluate(() => { renderSummaryCards(); const card = (id) => { const el = document.getElementById(id);
        const rows = [...el.querySelectorAll('.ov-sum-drow')].map(d => ({ v: d.querySelector('.ov-sum-v').textContent, w: d.querySelector('.ov-sum-sbar span').getBoundingClientRect().width, tw: d.querySelector('.ov-sum-sbar').getBoundingClientRect().width }));
        const ax = [...el.querySelectorAll('.ov-sum-axis span')].map(s => s.textContent); return { rows, ax }; };
      return { a: card('ov-assets-summary'), l: card('ov-liab-summary'), vals: { cash: alTotalCash(), dep: state.saved, metals: alTotalMetals(), inv: alTotalOther(), liab: alState.liabilities.map(l => depreciatedValue(l)) } }; });
    const num = (s) => +String(s).replace(/[£,k]/g, (c) => c === 'k' ? '' : '') * (/k$/.test(s) ? 1000 : 1);
    const maxA = num(r.a.ax[2] || '0'), big = r.a.rows.reduce((x, y) => (y.w > x.w ? y : x), { w: 0 });
    ok(r.a.rows.length >= 3 && r.a.ax.length === 3 && r.a.ax[0] === '£0' && r.a.rows.every(x => x.w <= x.tw + 0.5) && big.w > big.tw * 0.39, T + 'assets: a bar per row on one scale, £0 to ' + r.a.ax[2] + ' underneath (' + r.a.rows.map(x => x.v + ':' + Math.round(x.w / x.tw * 100) + '%').join(' ') + ')');
    const ratio = (x) => x.w / x.tw; const ord = r.a.rows.slice().sort((x, y) => ratio(y) - ratio(x));
    ok(ord.length < 2 || ratio(ord[0]) >= ratio(ord[ord.length - 1]), T + 'assets: a bigger value draws a longer bar');
    ok(r.l.rows.length === 1 && r.l.ax.length === 3 && r.l.rows[0].w > 0, T + 'liabilities: the same scale (' + r.l.ax.join(' | ') + ')');
    // 3 and 4. debt: left soft red, paid off green from the right, amounts underneath
    r = await p.evaluate(() => [...document.querySelectorAll('#ov-debt-summary .ov-sum-drow')].map(d => { const bar = d.querySelector('.ov-sum-dbar').getBoundingClientRect(), rem = d.querySelector('.ov-dbar-rem'), paid = d.querySelector('.ov-dbar-paid');
      const R = rem.getBoundingClientRect(), P = paid.getBoundingClientRect(); return { remW: R.width, paidW: P.width, barW: bar.width, paidRight: Math.abs(P.right - bar.right), remLeft: Math.abs(R.left - bar.left), paidBg: getComputedStyle(paid).backgroundColor, remBg: getComputedStyle(rem).backgroundColor,
        labRem: d.querySelector('.ov-dlab-rem').textContent, labPaid: (d.querySelector('.ov-dlab-paid') || {}).textContent, want: [gbpFmt(2000) + ' to pay', gbpFmt(2350) + ' paid off'] }; }));
    const bc = r[0], car = r[1];
    ok(r.length === 2 && bc.labRem === bc.want[0], T + 'Barclaycard: what is left is printed under the bar (' + (bc && bc.labRem) + ')');
    ok(bc && Math.abs(bc.paidW / bc.barW - 0.2) < 0.02 && bc.paidRight < 1 && bc.remLeft < 1, T + 'Barclaycard (£2,500 to £2,000): 20% paid off in green from the right, 80% left from the left (' + (bc && (bc.paidW / bc.barW).toFixed(3)) + ')');
    ok(car && Math.abs(car.paidW / car.barW - 2350 / 6000) < 0.02 && car.labPaid === car.want[1], T + 'Car loan: £2,350 of £6,000 paid off, labelled (' + (car && car.labPaid) + ')');
    ok(bc && /rgba?\(/.test(bc.remBg) && /, 0\.2\d\)|\/ 0\.2\d\)/.test(bc.remBg) && /to pay/.test(bc.labRem), T + 'what is left is a soft red (' + (bc && bc.remBg) + ') with "to pay"');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, T + 'no sideways scroll');
    await ctx.close();
  }
  // v0.8: the labels along the top of the graph (TODAY and the quarters) never touch, at phone and tablet widths, every range
  for (const w of [360, 390, 768]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce', isMobile: w < 700, hasTouch: w < 700 }); await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('top ' + w + ' ' + e.message));
    await p.addInitScript(seed, { theme: 'dark', flag: true }); await p.goto(APP); await p.waitForTimeout(1800);
    const r = await p.evaluate(() => { nw3d.setMain('graph'); const out = [];
      for (const range of ['all', '12', '6', '3']) for (const proj of [true, false]) { chartState.range = range; chartState.metrics.proj = proj; drawChart();
        const L = (document.getElementById('nwChart')._topLabels || []).slice().sort((a, b) => a.x0 - b.x0);
        out.push({ range, proj, n: L.length, today: L.some(l => l.t === 'TODAY'), touch: L.some((l, i) => i && l.x0 < L[i - 1].x1 + 2), names: L.map(l => l.t).join(' ') }); }
      chartState.range = 'all'; chartState.metrics.proj = true; drawChart(); return out; });
    const bad = r.filter(x => x.touch || !x.today);
    ok(!bad.length && r.every(x => x.n >= 2), 'top labels ' + w + ': TODAY always shows and no two labels touch, every range, Forecast on and off (all: ' + r[0].names + ')' + (bad.length ? ' BAD ' + JSON.stringify(bad[0]) : ''));
    await ctx.close();
  }
  // v0.8 (owner un-parked, 2 Nov evening): the net worth graph's text never collides. The zoom hint has its own row under the axis,
  // goal labels sit at the right end of their line on a dark plate and never overlap, and the History heading carries no emoji.
  for (const [theme, w] of [['dark', 390], ['light', 390], ['dark', 768], ['light', 768], ['dark', 1440], ['light', 1440]]) {
    const T = 'graph ' + theme + ' ' + w + ': ';
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce', isMobile: w < 700, hasTouch: w < 700 }); await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(T + e.message));
    await p.addInitScript(seed, { theme, flag: true }); await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    let r = await p.evaluate(() => { nw3d.setMain('graph'); drawChart();
      const cv = document.getElementById('nwChart'), h = document.getElementById('nw-zoom-hint'), cb = cv.getBoundingClientRect(), hb = h.getBoundingClientRect();
      const ax = cb.top + cv._axisBottom; return { inside: hb.top < ax, gap: hb.top - ax, below: hb.top >= ax, fs: getComputedStyle(h).fontSize, shown: h.offsetParent !== null };
    });
    ok(r.shown && !r.inside && r.below && r.gap >= 2 && r.gap <= 8 && r.fs === '10.5px', T + 'the zoom hint is on its own row just under the month labels, not on the plot (' + r.gap.toFixed(1) + ' px gap, ' + r.fs + ')');
    ok(await p.evaluate(() => { nw3d.setMain('3d'); const v = document.getElementById('nw-zoom-hint').offsetParent === null; nw3d.setMain('graph'); return v; }), T + 'the hint leaves with the graph in the 3D view');
    // goal labels: the seeded goals, then two goals 1% apart (their lines a few px apart)
    const labs = (extra) => p.evaluate((extra) => { if (extra) { ovState.customGoals = (ovState.customGoals || []).concat(extra); } drawChart();
      const cv = document.getElementById('nwChart'), L = cv._msLabels || [], W = cv._W || cv.clientWidth, PAD = cv._PAD;
      const ov = L.some((a, i) => L.some((b, j) => j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
      return { n: L.length, ov, right: L.every(l => Math.abs(l.x + l.w - (W - PAD.r)) < 1), inCv: L.every(l => l.y >= 0 && l.y + l.h <= cv.clientHeight && l.x >= 0), L }; }, extra);
    r = await labs(null);
    ok(r.n >= 1 && !r.ov && r.right && r.inCv, T + r.n + ' goal labels at the right end of their lines, none overlapping');
    r = await labs([{ id: 901, name: 'Near A', amount: 30000 }, { id: 902, name: 'Near B', amount: 30300 }]);
    const a = r.L.find(l => l.label === 'Near A'), bb = r.L.find(l => l.label === 'Near B');
    ok(a && bb && !r.ov && Math.abs(a.line - bb.line) < 14 && a.below && !bb.below, T + 'two goals ' + (a && bb ? Math.round(Math.abs(a.line - bb.line)) : '?') + ' px apart: the lower label moves below its line, no overlap');
    // the plate is dark (#080808 at .72) in both themes: sample a pixel inside a plate, away from the text
    r = await p.evaluate(() => { const cv = document.getElementById('nwChart'), l = cv._msLabels[0], dpr = cv.width / cv.clientWidth;
      const d = cv.getContext('2d').getImageData(Math.round((l.x + 1) * dpr), Math.round((l.y + 1) * dpr), 1, 1).data; return [d[0], d[1], d[2]]; });
    ok(theme === 'dark' ? r.every(v => v < 90) : r.every(v => v > 150), T + (theme === 'dark' ? 'Night: labels sit on a dark plate' : 'Daylight: labels sit on a light card-coloured plate, not a black box') + ' (pixel ' + r.join(',') + ')');
    r = await p.evaluate(() => document.getElementById('ov-nwh-card').textContent);
    ok(/Net Worth History/.test(r) && !/\p{Extended_Pictographic}/u.test(r), T + 'the Net Worth History heading has no emoji');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, T + 'no sideways scroll');
    await ctx.close();
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
