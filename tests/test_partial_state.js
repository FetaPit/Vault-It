// A saved state with a metal missing (older build, partial sync) must not blank the totals: 30 Oct 2026 it turned
// alTotalMetals into null, so total assets, net worth, the KPIs and the 3D tag all read £0. Run: node tests/test_partial_state.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { if (localStorage.getItem('pos_al1')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
    localStorage.setItem('pos_al1', JSON.stringify({ metals: { gold: 1 }, metalPrices: { gold: 2000 }, cashAccounts: [{ id: 1, name: 'Savings', type: 'Savings', balance: 6420 }] })); });
  await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2200);
  const r = await p.evaluate(() => ({ nw: computeNetWorth(), assets: alTotalAssets(), metals: alTotalMetals(), m: alState.metals, kpi: document.getElementById('kpi-nw').textContent, tag: document.getElementById('nw3d-hero-cv') ? +document.getElementById('nw3d-hero-cv').dataset.net : null }));
  ok(r.metals === 2000 && r.m.silver === 0 && r.m.platinum === 0 && r.m.palladium === 0, 'missing metals are filled with 0 (' + JSON.stringify(r.m) + ')');
  ok(isFinite(r.nw) && r.nw === 8420 && r.assets === 8420, 'net worth and total assets are numbers: £8,420 (' + r.nw + ')');
  ok(/8\.4k|8,420/.test(r.kpi), 'the KPI shows it (' + r.kpi + ')');
  ok(r.tag === null || r.tag === 8420, 'the 3D tag agrees (' + r.tag + ')');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
