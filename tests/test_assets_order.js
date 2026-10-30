// Assets sub-tab order (owner, 30 Oct): Cash and savings, Stocks and shares, Precious metals, Wealth inventory, Crypto,
// Liabilities; Cash opens first. Physical cash has its own log (put in / take out, where it is kept) and counts in cash
// and net worth. Run: node tests/test_assets_order.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 390]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { if (localStorage.getItem('pos_al1')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
      localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 1000 }] })); });
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => showTab('assets')); await p.waitForTimeout(600);
    const o = await p.evaluate(() => ({ order: [...document.querySelectorAll('#assets-page .subtab-btn')].map(b => b.dataset.sub), active: document.querySelector('#assets-page .subtab-btn.active').dataset.sub, panel: document.querySelector('#assets-page .subtab-panel.active').id, card: !!document.getElementById('pc-card').offsetParent }));
    ok(o.order.join() === 'cash,stocks,metals,other,crypto,liabilities', w + ': sub-tabs in the new order (' + o.order.join() + ')');
    ok(o.active === 'cash' && o.panel === 'assets-cash' && o.card, w + ': Cash and savings opens first, with the physical cash log');
    if (w === 390) { await p.context().close(); continue; }
    const before = await p.evaluate(() => ({ cash: alTotalCash() }));
    await p.selectOption('#pc-where', 'Safe'); await p.fill('#pc-amt', '250'); await p.fill('#pc-date', '2026-10-01'); await p.evaluate(() => pcAdd(1));
    await p.selectOption('#pc-where', 'Wallet'); await p.fill('#pc-amt', '40'); await p.evaluate(() => pcAdd(1));
    await p.selectOption('#pc-where', 'Safe'); await p.fill('#pc-amt', '50'); await p.evaluate(() => pcAdd(-1));
    let r = await p.evaluate(() => ({ cash: alTotalCash(), phys: alTotalPhysical(), lines: document.querySelectorAll('#pc-log .pc-line').length, total: document.getElementById('pc-total').textContent, saved: JSON.parse(localStorage.getItem('pos_al1')).physicalCash.length, kpi: document.getElementById('kpi-assets').textContent }));
    ok(r.phys === 240 && r.cash === before.cash + 240 && r.lines === 3 && r.total === '£240' && r.saved === 3, 'put in £250 (safe) and £40 (wallet), took out £50: £240 logged, counted in cash and saved (' + JSON.stringify(r) + ')');
    await p.selectOption('#pc-where', 'Wallet'); await p.fill('#pc-amt', '100'); await p.evaluate(() => pcAdd(-1));
    ok(/Only £40/.test(await p.textContent('#pc-msg')) && await p.evaluate(() => alTotalPhysical() === 240), 'cannot take out more than is logged in that place');
    await p.evaluate(() => pcDel(alState.physicalCash[0].id));
    ok(await p.evaluate(() => alState.physicalCash.length === 3 && /take-out lines/.test(document.getElementById('pc-msg').textContent)), 'removing a put-in line that would leave the safe below zero is refused');
    await p.evaluate(() => pcDel(alState.physicalCash[2].id));
    ok(await p.evaluate(() => alState.physicalCash.length === 2 && alTotalPhysical() === 290), 'removing the take-out line works (£290 logged)');
    // sync must never treat a device with only physical cash as empty
    ok(await p.evaluate(() => { const src = document.documentElement.innerHTML; return /n\(o\.physicalCash\)/.test(src); }), 'a device holding only physical cash is not "empty" to sync');
    await p.context().close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
