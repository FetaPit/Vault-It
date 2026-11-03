// v0.9.1 E33 (owner, 3 Nov): "overdrafts belong in debt tracker. The other types of debts should behave like the 3d credit cards
// with company icon etc like overdraft or personal load etc. but without the credit card chip or *** and should pay down exactly
// like the credit cards cutting down from right to left / I have just tested personal loan and it doesnt work as described yet."
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const OLD_LOAN = { id: 3, name: 'Old car loan', original: 6000, balance: 4200, rate: 9, min: 180, type: 'car' };
const seed = (old) => {
  if (localStorage.getItem('pos_debt1')) return;
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ email: 't@t.com', name: 'T' }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [
    { id: 1, name: 'Barclaycard Platinum', original: 2000, balance: 1100, rate: 21.9, min: 40, type: 'credit' },
    { id: 2, name: 'Zopa loan', original: 1000, balance: 1000, rate: 8.9, min: 60, type: 'personal' },
    old] }));
};
(async () => {
  const b = await chromium.launch();
  for (const motion of ['reduce', 'no-preference']) {
    const ctx = await b.newContext({ viewport: { width: 900, height: 1000 }, reducedMotion: motion }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERR', e.message.slice(0, 200)); });
    await page.addInitScript(seed, OLD_LOAN);
    await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await page.evaluate(() => { window.isPioneer = () => true; showTab('debt'); }); await page.waitForTimeout(900);
    const M = motion === 'reduce' ? 'reduced motion' : 'motion';
    const sel = '.cc3[data-id="2"]';
    const clip = () => page.evaluate(s => { const c = document.querySelector(s); return c && { base: getComputedStyle(c.querySelector('.cc3-base')).clipPath, piece: getComputedStyle(c.querySelector('.cc3-piece')).clipPath }; }, sel);
    if (motion === 'reduce') {
      // every debt type draws the 3D tile
      ok(await page.locator('.cc3').count() === 3, M + ': every debt (card, personal loan, car finance) is a 3D tile (' + await page.locator('.cc3').count() + ')');
      const loan = await page.evaluate(s => { const c = document.querySelector(s); if (!c) return null; return {
        chip: !!c.querySelector('.cc3-chip'), nfc: !!c.querySelector('.cc3-nfc'), num: !!c.querySelector('.cc3-num'), net: !!c.querySelector('.cc3-net'),
        stars: /•••|\*\*\*/.test(c.textContent), type: (c.querySelector('.cc3-type') || {}).textContent || '', logo: !!c.querySelector('.cc3-logo img'),
        aria: c.getAttribute('aria-label'), ratio: c.getBoundingClientRect().width / c.getBoundingClientRect().height }; }, sel);
      console.log('loan', JSON.stringify(loan));
      ok(loan && !loan.chip && !loan.nfc && !loan.num && !loan.net && !loan.stars, 'personal loan: no chip, no contactless mark, no masked number, no network');
      ok(loan && /Personal loan/.test(loan.type), 'personal loan: the type label is on the tile');
      ok(loan && /Personal loan/.test(loan.aria) && !/credit card/.test(loan.aria), 'personal loan: read out as a personal loan, not a credit card');
      ok(loan && Math.abs(loan.ratio - 85.6 / 53.98) < 0.02, 'personal loan tile keeps the card proportion');
      const card = await page.evaluate(() => { const c = document.querySelector('.cc3[data-id="1"]'); return { chip: !!c.querySelector('.cc3-chip'), num: !!c.querySelector('.cc3-num') }; });
      ok(card.chip && card.num, 'credit card still has its chip and number');
      ok(await page.locator('#debt-list-el [data-did="2"] input[id="debt-pay-inp-2"]').count() === 1, 'loan tile has the pay box');
      ok(await page.evaluate(() => /Personal loan/.test(document.querySelector('#debt-list-el [data-did="2"]').textContent)), 'loan tile footer names the type');
    }
    // pay £100 of £1,000: cut 10% from the right; undo joins it back
    let c0 = await clip(); ok(c0 && /inset\(0px 0%|inset\(0px\)|^none$|inset\(0px 0px/.test(c0.base) || (c0 && !/[1-9]\d*%/.test(c0.base)), M + ': unpaid loan is whole (' + (c0 && c0.base) + ')');
    await page.fill('#debt-pay-inp-2', '100'); await page.evaluate(() => makePayment(2));
    await page.waitForTimeout(motion === 'reduce' ? 500 : 6500);
    let d = await page.evaluate(() => debtState.debts.find(x => x.id === 2));
    ok(d.balance === 900 && d.payments && d.payments.length === 1 && d.payments[0].amt === 100, M + ': £100 payment recorded, £900 left');
    let c1 = await clip(); console.log('after pay', JSON.stringify(c1));
    ok(c1 && /inset\(0px 10%/.test(c1.base) && /inset\(0px 0px 0px 90%/.test(c1.piece), M + ': 10% cut from the right, 90% in colour');
    if (motion !== 'reduce') ok(await page.evaluate(() => _ccPct[2] === 10), M + ': shares the card cut memory (_ccPct)');
    if (motion === 'reduce') await page.locator(sel).screenshot({ path: 'shots/v091_loan_cut.png' });
    await page.evaluate(() => undoPayment(2)); await page.waitForTimeout(motion === 'reduce' ? 500 : 4000);
    d = await page.evaluate(() => debtState.debts.find(x => x.id === 2));
    ok(d.balance === 1000 && !d.payments, M + ': undo restores £1,000');
    const c2 = await clip(); ok(c2 && !/[1-9]\d*%/.test(c2.base), M + ': undo joins the tile back up (' + c2.base + ')');
    if (motion === 'reduce') {
      // the add form has a provider field; an overdraft shows its bank's icon
      await page.click('button[onclick="showDebtForm()"]'); await page.waitForTimeout(200);
      ok(await page.locator('#df-provider').count() === 1, 'add form has a provider field');
      await page.fill('#df-name', 'Overdraft'); await page.fill('#df-balance', '650'); await page.fill('#df-rate', '39.9'); await page.fill('#df-min', '25');
      await page.selectOption('#di-type', 'overdraft'); await page.fill('#df-provider', 'Santander');
      await page.click('#debt-form-card button[onclick="saveDebt()"]'); await page.waitForTimeout(500);
      const od = await page.evaluate(() => debtState.debts.find(x => x.type === 'overdraft'));
      ok(od && od.card && od.card.issuer === 'Santander' && od.balance === 650 && od.original === 650, 'overdraft saved with its provider (' + JSON.stringify(od && od.card) + ')');
      const oi = await page.evaluate(id => { const c = document.querySelector('.cc3[data-id="' + id + '"]'); if (!c) return null; const im = c.querySelector('.cc3-logo img');
        return { src: im && im.getAttribute('src'), bg: c.querySelector('.cc3-base').getAttribute('style'), type: (c.querySelector('.cc3-type') || {}).textContent, chip: !!c.querySelector('.cc3-chip') }; }, od && od.id);
      console.log('overdraft', JSON.stringify(oi));
      ok(oi && /santander\.co\.uk/.test(oi.src || '') && /#f02b2b/i.test(oi.bg || ''), 'overdraft shows its bank icon and colours');
      ok(oi && /Overdraft/.test(oi.type || '') && !oi.chip, 'overdraft tile is labelled and has no chip');
      // a debt with no provider typed keeps the old shape (no card field added)
      await page.click('button[onclick="showDebtForm()"]'); await page.fill('#df-name', 'Student loan'); await page.fill('#df-balance', '20000'); await page.selectOption('#di-type', 'student');
      await page.click('#debt-form-card button[onclick="saveDebt()"]'); await page.waitForTimeout(400);
      ok(await page.evaluate(() => { const s = debtState.debts.find(x => x.type === 'student'); return s && !('card' in s); }), 'no provider typed: nothing extra saved');
      ok(await page.evaluate(() => document.getElementById('df-provider').value === ''), 'provider field is cleared after saving');
      // design editor on a loan: no network, no last four, no card photo
      await page.evaluate(() => ccOpenEdit(2)); await page.waitForTimeout(200);
      const ed = await page.evaluate(() => ({ net: !!document.getElementById('cc-net'), l4: !!document.getElementById('cc-last4'), photo: /Imprint a photo/.test(document.getElementById('cc-ov').textContent), iss: !!document.getElementById('cc-issuer') }));
      ok(ed.iss && !ed.net && !ed.l4 && !ed.photo, 'loan design editor: provider and logo only ' + JSON.stringify(ed));
      await page.fill('#cc-issuer', 'Zopa'); await page.evaluate(() => ccSaveEdit()); await page.waitForTimeout(300);
      ok(await page.evaluate(() => { const c = debtState.debts.find(x => x.id === 2).card; return c && c.issuer === 'Zopa' && !c.last4 && !c.art; }), 'loan provider saved from the editor');
      // an old saved loan loads untouched
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pos_debt1')).debts.find(x => x.id === 3));
      const canon = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
      ok(canon(stored) === canon(OLD_LOAN), 'old saved loan loads untouched ' + JSON.stringify(stored));
      ok(await page.locator('.cc3[data-id="3"]').count() === 1 && await page.evaluate(() => /30% paid/.test(document.querySelector('#debt-list-el [data-did="3"]').textContent)), 'old car loan shows as a tile at 30% paid');
      // Pedro's nits: no name line when it repeats the type; no teal or green on the generic tile
      await page.evaluate(() => { debtState.debts.push({ id: 9, name: 'Sofa loan', original: 500, balance: 500, rate: 0, min: 20, type: 'other' }); renderDebtTab(); }); await page.waitForTimeout(300);
      ok(await page.evaluate(() => { const c = document.querySelector('.cc3[data-id="9"]'); return c && !c.querySelector('.cc3-name') && /Loan/.test(c.querySelector('.cc3-type').textContent); }), 'name line hidden when it contains the type ("Sofa loan" / "Loan")');
      ok(await page.evaluate(() => /#3a3f47/i.test(document.querySelector('.cc3[data-id="9"] .cc3-base').getAttribute('style'))), 'no-lender tile uses the neutral slate, not teal');
      ok(await page.evaluate(() => CC_BRANDS.every(b => !b.acc || !/^#(3cd3ad|0b8a63)$/i.test(b.acc))), 'no lender accent in brand teal or green');
      await page.evaluate(() => { debtState.debts = debtState.debts.filter(x => x.id !== 9); saveDebtState(); renderDebtTab(); });
      // 390 and 320: no sideways scroll
      for (const w of [390, 320]) { await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(300);
        const sx = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(sx <= 0, w + ' px: no sideways scroll (' + sx + ')'); }
    }
    ok(errs.length === 0, M + ': no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
