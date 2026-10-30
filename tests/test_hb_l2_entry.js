// Level 2 onboarding: on purchase day the mortgage is entered in about a minute (lender, balance, rate, fix end, term), every figure the person's own;
// the Level 2 panel shows it, runs its what-ifs on those figures and carries the trade-off line. Runs the classic viewer. Run: node tests/test_hb_l2_entry.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' }); await routeThree(ctx);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-flag-house', '0'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', pro: true })); localStorage.setItem('vi_pioneer', 'true');
    localStorage.setItem('ht3', JSON.stringify({ saved: 64000, target: 320000, houseType: 'semi', depositPct: 20, deposits: [{ amount: 64000, date: '01/10/2026' }], prices: { semi: 320000 } }));
    localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 3000, cat: 'salary' }], expenses: [{ id: 2, name: 'Rent', amount: 900, type: 'ce', cat: 'housing' }, { id: 3, name: 'ISA', amount: 200, type: 'sv', cat: 'savings' }] })); });
  await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500); await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal{display:none!important}' });
  await p.evaluate(() => showTab('house')); await p.waitForTimeout(800);
  ok(await p.evaluate(() => !document.getElementById('hbm-ov') && hbLevel() === 1), 'Level 1: no mortgage dialog');
  // purchase day
  await p.evaluate(() => markHousePurchased()); await p.waitForTimeout(500);
  let r = await p.evaluate(() => ({ dlg: !!document.getElementById('hbm-ov'), bal: document.getElementById('hbm-bal').value, lender: document.getElementById('hbm-lender').value, rate: document.getElementById('hbm-rate').value, term: document.getElementById('hbm-term').value, later: (document.getElementById('hbm-later') || {}).textContent, fca: /Not regulated by the FCA\. Not financial advice\./.test(document.getElementById('hbm-ov').textContent), left: document.getElementById('hbm-ov').textContent }));
  ok(r.dlg && r.bal === '256000', 'buying opens the mortgage entry with the balance from their own price and deposit (£' + r.bal + ')');
  ok(r.lender === '' && r.rate === '' && r.term === '', 'lender, rate and term start blank (no guessed figures)');
  ok(r.later === 'Later' && r.fca && /£256,000/.test(r.left), 'it can wait; the FCA line and the Level 2 amount are shown');
  await p.click('#hbm-later'); await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ dlg: !!document.getElementById('hbm-ov'), btn: (document.querySelector('#hb-panel button[onclick^="hbOpenMortgageEntry"]') || document.querySelector('button[onclick^="hbOpenMortgageEntry"]') || {}).textContent || '', line: (document.querySelector('.hb-mline') || {}).textContent, prompt: /Enter your mortgage/.test(document.body.textContent) }));
  ok(!r.dlg && /Enter your mortgage/.test(r.btn) && r.prompt, 'Later closes it; the Level 2 panel offers "Enter your mortgage" until it is done');
  // enter it
  await p.evaluate(() => hbOpenMortgageEntry(false)); await p.waitForTimeout(200);
  await p.fill('#hbm-lender', 'Test Building Society'); await p.fill('#hbm-bal', '257500'); await p.fill('#hbm-rate', '4.5'); await p.fill('#hbm-fix', '2028-06'); await p.fill('#hbm-term', '25');
  await p.click('#hbm-save'); await p.waitForTimeout(600);
  r = await p.evaluate(() => ({ m: state.mortgage, bal: state.mortgageBalance, calc: { bal: state.calc.bal, rate: state.calc.p1rate, termY: state.calc.termY, p1months: state.calc.p1months, set: state.calc._set }, line: (document.querySelector('.hb-mline') || {}).textContent, toast: document.getElementById('toast').textContent, prog: hbL2Progress(), base: hbL2Base(), stored: JSON.parse(localStorage.getItem('ht3')).mortgage, trade: /Money overpaid is not invested or saved/.test(document.body.textContent), rows: document.querySelectorAll('.hb-tip table tr').length, edit: /Your mortgage/.test((document.querySelector('button[onclick^="hbOpenMortgageEntry"]') || {}).textContent || '') }));
  ok(r.m && r.m.lender === 'Test Building Society' && r.m.rate === 4.5 && r.m.fixEnd === '2028-06' && r.m.termYears === 25 && r.bal === 257500 && r.stored && r.stored.lender === 'Test Building Society', 'the mortgage is saved with the person\'s figures: ' + JSON.stringify(r.m));
  ok(r.calc.bal === 257500 && r.calc.rate === 4.5 && r.calc.termY === 25 && r.calc.p1months >= 1 && r.calc.set, 'the calculator and what-ifs now run on the same figures: ' + JSON.stringify(r.calc));
  ok(/Test Building Society · 4.5% fixed until Jun 2028 · 25 years left/.test(r.line), 'the Level 2 panel states it: ' + r.line);
  ok(/Level 2 is the £256,000 left to pay/.test(r.toast), 'the toast frames Level 2 as what is left to pay: ' + r.toast);
  ok(Math.abs(r.prog - (256000 - 257500 + 0) / 256000) < 1e-9 || r.prog === 0, 'a balance above price minus deposit target means nothing built yet (progress ' + r.prog.toFixed(3) + ')');
  ok(r.trade && r.rows === 3 && r.edit, 'three what-ifs from their Budget, the trade-off and FCA line, and an edit button');
  // undo the purchase clears it
  await p.evaluate(() => hbUndoPurchase()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => hbLevel() === 1 && !state.mortgage && !JSON.parse(localStorage.getItem('ht3')).mortgage), 'Not bought yet clears the mortgage with the purchase');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
