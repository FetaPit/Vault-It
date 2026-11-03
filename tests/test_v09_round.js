// v0.9 round (owner, 3 Nov 2026): KPI colours, 3D cash flow on the dashboard, income-flow zoom, no locate icon, grouped holdings + tree map,
// left-aligned Assets sub-tabs, Liabilities expand. Run: node tests/test_v09_round.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = () => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  if (localStorage.getItem('pos_al1')) return;
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 3200, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 1100, type: 'ce' }, { id: 4, name: 'ISA', amount: 300, type: 'sv' }], snapshots: [] }));
  localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [], liabilities: [{ id: 9, name: 'Car', value: 4000, rate: 0, depRate: 0, runningCost: 80, image: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', addedDate: new Date().toISOString() }],
    stockPies: [{ id: 1, name: 'My Portfolio' }, { id: 2, name: 'Trading 212 ISA' }], activePie: 'all',
    stocks: [{ id: 1, pie: 1, sym: 'AAPL', name: 'Apple', units: 10, price: 150 }, { id: 2, pie: 2, sym: 'VUSA', name: 'S&P 500', units: 40, price: 70 }, { id: 3, pie: 2, sym: 'TSLA', name: 'Tesla', units: 3, price: 200 }] }));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [390, 1100]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal{display:none!important}' });
    const col = id => p.evaluate(i => { const e = document.getElementById(i), s = getComputedStyle(e).color, t = document.createElement('i'); t.style.color = 'var(--' + ({ 'kpi-nw': 'teal', 'kpi-assets': 'green', 'kpi-debt': 'blue' })[i] + ')'; document.body.appendChild(t); const w = getComputedStyle(t).color; t.remove(); return s === w; }, id);
    ok(await col('kpi-nw'), w + ': net worth is teal'); ok(await col('kpi-assets'), w + ': total assets is green'); ok(await col('kpi-debt'), w + ': monthly surplus is blue');
    ok(await p.evaluate(() => !!document.querySelector('#ov-cf-card #cf3d-cv') && document.getElementById('cf-sankey').hidden), w + ': the dashboard Cash Flow tile is the 3D income flow');
    ok(await p.evaluate(() => !!(window.bd3d && bd3d.dashEngine())), w + ': the dashboard 3D engine is running');
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(800);
    ok(await p.evaluate(() => document.querySelectorAll('#bd-fz button').length === 3), w + ': flow view has zoom out, fit and in');
    const hs = async () => p.evaluate(() => document.querySelector('#bd-sankey svg').getBoundingClientRect().width);
    const w0 = await hs(); await p.click('#bd-fz [data-fz="out"]'); const w1 = await hs(); await p.click('#bd-fz [data-fz="in"]'); await p.click('#bd-fz [data-fz="in"]'); const w2 = await hs();
    ok(w1 < w0 && w2 > w1, w + ': zoom out shrinks and zoom in grows the flow (' + [w0, w1, w2].map(Math.round) + ')');
    ok(await p.evaluate(() => document.querySelectorAll('#bd3d-stage .nw3d-hud button, #cf3d-stage .nw3d-hud button').length === 6), w + ': both 3D income-flow viewports have zoom controls');
    await p.evaluate(() => showTab('house')); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !document.getElementById('hud-row')), w + ': no locate icon in the house viewport');
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'stocks', document.querySelector('.subtab-btn[data-sub="stocks"]')); }); await p.waitForTimeout(500);
    const g = await p.evaluate(() => [...document.querySelectorAll('#stk-holdings .stk-grp')].map(x => ({ open: x.classList.contains('open'), body: x.querySelector('.stk-gb').hidden })));
    ok(g.length === 2 && g.every(x => !x.open && x.body), w + ': holdings are grouped by pie and collapsed by default');
    await p.click('#stk-holdings .stk-gh'); ok(await p.evaluate(() => { const x = document.querySelector('#stk-holdings .stk-grp'); return x.classList.contains('open') && !x.querySelector('.stk-gb').hidden && x.querySelectorAll('.stk-row').length > 0; }), w + ': the arrow opens a group');
    await p.evaluate(() => stkSetAlloc('tree')); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.querySelectorAll('#stk-treemap .dtm-cell').length === 3), w + ': allocation tree map has a tile per holding');
    const al = await p.evaluate(() => [...document.querySelectorAll('#assets-page .subtab-btn')].map(x => { const r = x.getBoundingClientRect(), i = x.querySelector('.sti').getBoundingClientRect(); return Math.round(i.left - r.left); }));
    ok(Math.max(...al) - Math.min(...al) <= 1, w + ': every Assets sub-tab icon sits at the same left offset ' + al);
    await p.evaluate(() => showSubtab('assets', 'liabilities', document.querySelector('.subtab-btn[data-sub="liabilities"]'))); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !!document.querySelector('#liab-list .inv-exp, .wi-tile .inv-exp')), w + ': a liability tile can be expanded');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2)); await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
