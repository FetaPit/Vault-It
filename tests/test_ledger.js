// Round 3, item 20 (owner, 31 Oct 2026): the side bar is wider and is a ledger of every money figure in the app, each line with the
// icon of where it comes from. Every line must equal what its tab shows (same function, same formatter).
// Run: node tests/test_ledger.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [theme, w] of [['dark', 1100], ['light', 390]]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob }); await ctx.route(/^https?:/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(theme + ' ' + e.message));
    await p.addInitScript(seed, { theme, flag: true }); await p.goto(APP); await p.waitForTimeout(1600);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    const T = theme + ' ' + w + ': ';
    await p.evaluate(() => { showTab('overview'); updateKPIs(); renderSummaryCards(); if (!_sidebarOpen) toggleSidebar(); }); await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const t = (id) => (document.getElementById(id) || {}).textContent;
      const sb = document.getElementById('left-sidebar'), rows = [...document.querySelectorAll('#sb-ledger .sb-lg')];
      const dashOwn = [...document.querySelectorAll('#ov-assets-summary .ov-sum-row')].map(x => [x.querySelector('.ov-sum-l').textContent, x.querySelector('.ov-sum-v').textContent]);
      const led = {}; rows.forEach(x => { led[x.querySelector('.sb-lg-l').textContent] = x.querySelector('.sb-val').textContent; });
      const dashDebt = [...document.querySelectorAll('#ov-debt-summary .ov-sum-drow')].map(x => [x.querySelector('.ov-sum-l').textContent, x.querySelector('.ov-sum-v').textContent]);
      const dashLiab = [...document.querySelectorAll('#ov-liab-summary .ov-sum-row')].map(x => [x.querySelector('.ov-sum-l').textContent, x.querySelector('.ov-sum-v').textContent]);
      return { w: sb.getBoundingClientRect().width, left: sb.getBoundingClientRect().left, n: rows.length, icons: rows.every(x => x.querySelector('.ov-sum-ri svg')),
        nw: [t('sb-nw'), t('kpi-nw')], as: [t('sb-assets'), t('kpi-assets')], debt: [t('sb-debt'), t('kpi-debt-total')], liab: [t('sb-liab'), t('kpi-liab')], sur: [t('sb-surplus'), t('kpi-debt') + '/mo'],
        dashOwn, dashDebt, dashLiab, led, dep: [t('sb-house-deposit'), gbpFmt(depositTarget())], inc: [t('sb-income'), gbpFmt(cfTotalIn()) + '/mo'],
        sx: document.documentElement.scrollWidth - innerWidth };
    });
    ok(mob ? r.w <= w - 24 + 1 && r.w >= 300 : Math.round(r.w) === 320, T + 'the side bar is wider (' + Math.round(r.w) + ' px)');
    ok(r.n >= 18 && r.icons, T + 'every line has its icon (' + r.n + ' lines)');
    for (const k of ['nw', 'as', 'debt', 'liab', 'sur']) ok(r[k][0] === r[k][1], T + k + ': the ledger shows what the dashboard shows (' + r[k].join(' = ') + ')');
    ok(r.dashOwn.length >= 4 && r.dashOwn.every(([l, v]) => r.led[l] === v), T + 'each thing you own matches the dashboard line by line (' + r.dashOwn.map(x => x.join(' ')).join(', ') + ')');
    ok(r.dashDebt.length === 2 && r.dashDebt.every(([l, v]) => r.led[l] === v), T + 'each debt matches the debt tile');
    ok(r.dashLiab.length >= 1 && r.dashLiab.every(([l, v]) => r.led[l] === v), T + 'each liability matches the liabilities tile');
    ok(r.dep[0] === r.dep[1] && r.inc[0] === r.inc[1] && ['Committed essential', 'Income', 'Deposit target', 'House price'].every(k => k in r.led || Object.keys(r.led).some(x => x.indexOf(k) === 0)), T + 'house deposit target and the monthly budget are in it too');
    ok(r.sx <= 1, T + 'no sideways scroll with the ledger open');
    await ctx.close();
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
