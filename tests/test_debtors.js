// Debt Tracker: Creditors (you owe) and Debtors (owed to you) sub-tabs (owner, 30 Oct). Money you expect back counts
// in total assets and net worth; doubtful money is shown but left out; repayments reduce it; the choice of side is
// remembered; sync never treats a device holding only debtors as empty. Run: node tests/test_debtors.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { if (localStorage.getItem('pos_debt1')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
      localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Card', original: 1000, balance: 800, rate: 20, min: 30, type: 'credit' }] })); localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 2000 }] })); });
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => showTab('debt')); await p.waitForTimeout(600);
    const t = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.debt-sides [role=tab]')].map(b => b.textContent.trim()), cred: !document.getElementById('debt-side-creditors').hidden, debt: document.getElementById('debt-side-debtors').hidden }));
    ok(t.tabs.length === 2 && /Creditors/.test(t.tabs[0]) && /Debtors/.test(t.tabs[1]) && t.cred && t.debt, w + ': Creditors and Debtors sub-tabs, Creditors first');
    await p.click('#debt-side-btn-debtors'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('debt-side-creditors').hidden && !document.getElementById('debt-side-debtors').hidden && localStorage.getItem('vi_debt_side') === 'debtors'), w + ': Debtors opens and the choice is remembered');
    if (w === 390) { ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, '390: no sideways scroll'); await ctx.close(); continue; }
    const nw0 = await p.evaluate(() => computeNetWorth());
    await p.click('button[onclick="showOweForm()"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.activeElement.id === 'of-who' && !document.getElementById('owe-form-modal').hidden), 'the add form is a pop-up with the name focused');
    await p.click('#owe-form-modal button[onclick="saveOwe()"]'); ok(/A name is enough/.test(await p.textContent('#owe-form-msg')), 'a missing name is explained');
    await p.fill('#of-who', 'Sam'); await p.fill('#of-what', 'Festival tickets'); await p.fill('#of-amt', '300'); await p.fill('#of-date', '2026-12-01'); await p.click('#owe-form-modal button[onclick="saveOwe()"]'); await p.waitForTimeout(150);
    await p.evaluate(() => showOweForm()); await p.fill('#of-who', 'Old flatmate'); await p.fill('#of-amt', '500'); await p.selectOption('#of-sure', 'doubtful'); await p.press('#of-who', 'Enter'); await p.waitForTimeout(150);
    let r = await p.evaluate(() => ({ n: debtState.owedToMe.length, counted: alTotalOwedToMe(), nw: computeNetWorth(), total: document.getElementById('owe-total').textContent, cnt: document.getElementById('owe-counted').textContent, doubt: document.getElementById('owe-doubt').textContent, rows: document.querySelectorAll('#owe-list .owe-row').length, saved: JSON.parse(localStorage.getItem('pos_debt1')).owedToMe.length }));
    ok(r.n === 2 && r.rows === 2 && r.saved === 2, 'two debtors added, listed and saved');
    ok(r.counted === 300 && Math.abs(r.nw - nw0 - 300) < 0.01 && r.total === '£800' && r.cnt === '£300' && r.doubt === '£500', 'expected £300 counts in net worth, doubtful £500 is shown but left out (' + JSON.stringify(r) + ')');
    const sam = await p.evaluate(() => debtState.owedToMe.find(o => o.who === 'Sam').id);
    await p.fill('#owe-pay-' + sam, '120'); await p.press('#owe-pay-' + sam, 'Enter'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => alTotalOwedToMe() === 180 && /£180/.test(document.querySelector('#owe-list').textContent)), 'a £120 repayment leaves £180');
    await p.evaluate(id => oweSure(id, 'doubtful'), sam); ok(await p.evaluate(() => alTotalOwedToMe() === 0), 'marking it doubtful takes it out of net worth');
    await p.evaluate(id => oweSure(id, 'expected'), sam);
    await p.evaluate(() => showTab('overview')); await p.waitForTimeout(500);
    ok(/Owed to you/.test(await p.textContent('#ov-assets-summary')), 'Overview "Own and owe" lists Owed to you');
    ok(await p.evaluate(() => /n\(o\.owedToMe\)/.test(document.documentElement.innerHTML)), 'a device holding only debtors is not "empty" to sync');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
