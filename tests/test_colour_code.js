// Brand phase 5: the colour code. Liabilities amber, Budget ramp on tokens, debt charts on a red ramp,
// chart colours follow Night and Daylight. Run: node tests/test_colour_code.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (theme) => {
  localStorage.setItem('vi-theme', theme);
  if (localStorage.getItem('pos_debt1')) return;
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Food', amount: 300, type: 've' }, { id: 5, name: 'Gym', amount: 30, type: 'cn' }, { id: 6, name: 'Cinema', amount: 20, type: 'vn' }, { id: 7, name: 'Pot', amount: 100, type: 'sv' }, { id: 8, name: 'ISA', amount: 50, type: 'iv' }] }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }, { id: 2, name: 'Car loan', original: 6000, balance: 3600, rate: 8, min: 180, type: 'loan' }, { id: 3, name: 'Klarna', original: 300, balance: 200, rate: 0, min: 50, type: 'bnpl' }] }));
  localStorage.setItem('pos_al1', JSON.stringify({ liabilities: [{ id: 9, name: 'Car', value: 4000, rate: 0, depRate: 0, runningCost: 80, addedDate: new Date().toISOString() }] }));
};
// What each check reads, in the current theme
const probe = () => {
  const tok = n => { const d = document.createElement('i'); d.style.color = 'var(--' + n + ')'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
  const col = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop || 'color'] : null; };
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  showTab('assets'); const lb = document.querySelector('.subtab-btn[onclick*="liabilities"]'); showSubtab('assets', 'liabilities', lb);
  const cp = (e, n) => getComputedStyle(e).getPropertyValue(n).trim().toUpperCase(), root = n => cp(document.documentElement, '--' + n);
  const liabTab = cp(lb, '--sa') === root('amber');
  showTab('overview');
  const ov = { kpiBorder: col('.ov-kpi-li', 'borderTopColor'), kpiVal: col('#kpi-liab'), card: col('#ov-liab-summary-card', 'borderLeftColor'), total: col('#ov-liab-summary .ov-sum-total') };
  // every asset class wears its sub-tab colour: sub-tab --sa, side panel label
  const cls = { metals: ['metals', 'gold'], crypto: ['crypto', 'teal'], cash: ['cash', 'green'], other: ['other', 'purple'], stocks: ['stocks', 'green2'], liabilities: [null, 'amber'] };
  const side = { metals: 'sb-metals', crypto: 'sb-crypto', cash: 'sb-cash', stocks: 'sb-stocks', other: 'sb-other' };
  const align = Object.keys(cls).map(k => { const b = document.querySelector('#assets-page .subtab-btn[data-sub="' + k + '"]'); const want = root(cls[k][1]);
    const sb = side[k] && document.getElementById(side[k]); const lbl = sb && sb.previousElementSibling;
    return { k, tab: b && cp(b, '--sa') === want, side: !lbl || getComputedStyle(lbl).color === tok(cls[k][1]) }; });
  showTab('budget');
  const tiles = {}; document.querySelectorAll('.bd-tile').forEach(t => { tiles[t.dataset.g] = cp(t, '--c'); });
  const sk = [...document.querySelectorAll('#bd-sankey svg rect')].map(r => getComputedStyle(r).fill);
  const amt = document.querySelector('.bd-tile .bd-amt'), panel = getComputedStyle(document.querySelector('.bd-tile')).backgroundColor;
  const ramp = debtChartRamp(debtState.debts);
  return {
    tok: { amber: tok('amber'), red: tok('red'), teal: tok('teal'), coral: tok('coral'), salmon: tok('salmon'), yellow: tok('yellow'), green: tok('green'), green2: tok('green2'), text: tok('text'), panel: tok('panel') },
    liabTab, ov, tiles, align, rootTok: { coral: root('coral'), salmon: root('salmon'), amber: root('amber'), yellow: root('yellow'), green: root('green'), green2: root('green2') }, sk, amtColor: amt && getComputedStyle(amt).color, amtContrast: amt ? cr(getComputedStyle(amt).color, tok('panel')) : 0,
    hexLeft: Object.values(CF_GROUPS).some(g => /#/.test(g.col + g.tx)), ramp: [2, 1, 3].map(id => ramp[id].k), viC: viRgba('gold', 1), theme: viTheme()
  };
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    const r = await p.evaluate(probe); const T = r.tok, nm = theme === 'dark' ? 'Night' : 'Daylight';
    ok(r.theme === theme, nm + ': theme is applied');
    ok(r.liabTab, nm + ': liabilities sub-tab is amber');
    ok(r.ov.kpiBorder === T.amber && r.ov.kpiVal === T.amber, nm + ': liabilities KPI is amber');
    ok(r.ov.card === T.amber && r.ov.total === T.amber, nm + ': liabilities summary card is amber (' + r.ov.card + ' / ' + r.ov.total + ' vs ' + T.amber + ')');
    ok(r.align.every(a => a.tab && a.side), nm + ': each asset class wears its sub-tab colour (stocks green 2) ' + JSON.stringify(r.align.filter(a => !a.tab || !a.side)));
    ok(!r.hexLeft, nm + ': Budget groups use tokens, no hex');
    const R = r.rootTok, want = { ce: R.coral, ve: R.salmon, cn: R.amber, vn: R.yellow, sv: R.green, iv: R.green2 };
    ok(Object.keys(want).every(g => r.tiles[g] === want[g]), nm + ': each Budget tile carries its ramp colour (' + JSON.stringify(r.tiles) + ')');
    ok(r.sk.includes(T.teal) && r.sk.includes(T.coral) && r.sk.includes(T.green2), nm + ': Sankey fills resolve to the tokens (income teal)');
    ok(r.ramp[0] === 1 && r.ramp[0] > r.ramp[1] && r.ramp[1] > r.ramp[2], nm + ': debt ramp is strongest for the largest debt (' + r.ramp.join(',') + ')');
    ok(r.amtContrast >= 4.5, nm + ': Budget amounts are readable (' + r.amtContrast.toFixed(2) + ':1)');
    // switching theme re-resolves everything
    const before = r.viC; await p.evaluate(() => viToggleTheme()); await p.waitForTimeout(300);
    const r2 = await p.evaluate(probe);
    ok(r2.viC !== before && r2.sk.includes(r2.tok.teal) && r2.tiles.ce === r2.rootTok.coral && r2.rootTok.coral !== R.coral, nm + ': after the switch, charts and Budget follow the new theme');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
