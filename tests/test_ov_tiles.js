// Round 3, items 1 to 4 (owner, 31 Oct 2026): the dashboard forecast says what it rests on (small text, bottom right of the tile);
// the assets and liabilities tiles draw each value on one proportional scale; the debt tile shows what is left in a soft red
// from the left and what is paid off in green from the right, both amounts underneath.
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
    const m = (r.txt.match(/last (\d+) months/) || [])[1];
    ok(!r.hid && +m === Math.min(6, r.real) && /straight line/.test(r.txt) && /no investment growth, no inflation/.test(r.txt) && /not a prediction/.test(r.txt) && r.align === 'right', T + 'the forecast note names the months it uses (' + m + ' of ' + r.real + ' logged), what it assumes and that it is not a prediction');
    ok(r.t3 === r.txt, T + 'the 3D progress card carries the same note');
    ok(!/—/.test(r.txt), T + 'no em dashes in the note');
    r = await p.evaluate(() => { chartState.metrics.proj = false; drawChart(); const h = document.getElementById('nw-fc-note').hidden; chartState.metrics.proj = true; drawChart(); return h; });
    ok(r === true, T + 'Forecast off: no note');
    // fewer than two real months: no line, the note says why
    r = await p.evaluate(() => { const keep = JSON.stringify(ovState.snapshots || []); ovState.snapshots = []; drawChart();
      const out = { txt: document.getElementById('nw-fc-note').textContent, proj: document.getElementById('nwChart')._proj.length, real: (document.getElementById('nwChart')._points || []).filter(x => !x.synth).length };
      ovState.snapshots = JSON.parse(keep); drawChart(); return out; });
    ok(r.real === 1 && r.proj === 0 && /starts once you have two months of net worth logged \(1 so far\)/.test(r.txt), T + 'with only this month known there is no forecast line, and the note says it starts at two months (' + r.real + ' logged)');
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
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
