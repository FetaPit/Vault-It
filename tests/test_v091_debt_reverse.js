// v0.9.1 E33b (owner, 3 Nov): "What do we have iconography for these debt types if so let's apply them to the space under the logo ...
// What could we include on the reverse to give the user a reason to rotate and just give the reverse a purpose so its not just a gimmick"
// Owner picked: type icon under the logo (left); the back shows the debt-free date, the cost of the debt and the payment history.
// Convention: nominal monthly rate = APR / 100 / 12, interest added monthly, the minimum paid at each month end (estimate).
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const near = (a, b, e) => Math.abs(a - b) <= (e || 0.005);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 900, height: 1000 }, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERR', e.message.slice(0, 200)); });
  await page.addInitScript(() => {
    if (localStorage.getItem('pos_debt1')) return;
    localStorage.setItem('vi_declined_demo', 'true');
    localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
    localStorage.setItem('vi_user', JSON.stringify({ email: 't@t.com', name: 'T' }));
    localStorage.setItem('pos_debt1', JSON.stringify({ debts: [
      { id: 1, name: 'Barclaycard', original: 1000, balance: 1000, rate: 24, min: 50, type: 'credit' },
      { id: 2, name: 'Zopa loan', original: 1200, balance: 1000, rate: 0, min: 60, type: 'personal', payments: [{ id: 1, amt: 100, date: '2026-09-01T10:00:00Z' }, { id: 2, amt: 50, date: '2026-10-01T10:00:00Z' }, { id: 3, amt: 25, date: '2026-10-15T10:00:00Z' }, { id: 4, amt: 25, date: '2026-11-01T10:00:00Z' }] },
      { id: 3, name: 'Overdraft', original: 800, balance: 800, rate: 39.9, min: 20, type: 'overdraft' },
      { id: 4, name: 'Student loan', original: 20000, balance: 20000, rate: 6.2, min: 0, type: 'student' },
      { id: 5, name: 'Car finance', original: 8000, balance: 5000, rate: 7, min: 200, type: 'car' },
      { id: 6, name: 'Home', original: 200000, balance: 150000, rate: 4.5, min: 900, type: 'mortgage' }] }));
  });
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await page.evaluate(() => { showTab('debt'); }); await page.waitForTimeout(900);

  // ── the maths (pure) ──
  const F = await page.evaluate(() => {
    const now = new Date(2026, 10, 3);   // 3 Nov 2026
    return {
      card: debtTileFacts({ balance: 1000, rate: 24, min: 50 }, now),
      zero: debtTileFacts({ balance: 1000, rate: 0, min: 60 }, now),
      never: debtTileFacts({ balance: 800, rate: 39.9, min: 20 }, now),
      equal: debtTileFacts({ balance: 1000, rate: 24, min: 20 }, now),
      nomin: debtTileFacts({ balance: 20000, rate: 6.2, min: 0 }, now),
      done: debtTileFacts({ balance: 0, rate: 20, min: 50 }, now),
      penny: debtTileFacts({ balance: 50.01, rate: 0, min: 50 }, now),
      str: debtTileFacts({ balance: '1000', rate: '24', minPay: '50' }, now),
    };
  });
  console.log(JSON.stringify(F));
  // £1,000 at 24% APR, £50 a month: month 1 interest £20.00 (1000 x 0.02), balance £970.00.
  // Closed form n = -ln(1 - rB/M) / ln(1 + r) = -ln(0.6) / ln(1.02) = 25.80, so 26 payments; 25 full x £50 + a final part payment.
  ok(near(F.card.monthInterest, 20) && near(F.card.yearInterest, 240), '£1,000 at 24%: £20.00 interest this month, £240 a year at today\'s balance');
  ok(F.card.months === 26, '£1,000 at 24% paying £50: clears in 26 months (' + F.card.months + ')');
  // independent check of the total interest: simulate here
  let B = 1000, I = 0, n = 0; while (B > 0.005 && n < 600) { const i = B * 0.02; I += i; B = B + i - Math.min(50, B + i); n++; }
  ok(near(F.card.interest, I, 0.01) && F.card.interest > 280 && F.card.interest < 300, 'total interest to go matches (' + F.card.interest.toFixed(2) + ' vs ' + I.toFixed(2) + ')');
  ok(F.card.date === 'Jan 2029', '26 months from Nov 2026 is Jan 2029 (' + F.card.date + ')');
  ok(F.zero.months === 17 && near(F.zero.interest, 0) && near(F.zero.monthInterest, 0), '0%: £1,000 at £60 clears in 17 months, no interest');
  ok(F.never.never === true && !F.never.months, 'overdraft £800 at 39.9% paying £20 (interest £26.60): never clears at this payment');
  ok(F.equal.never === true, 'payment exactly equal to the interest: never clears');
  ok(F.nomin.noMin === true, 'no minimum set: says so, no date');
  ok(F.done.cleared === true, 'zero balance: cleared');
  ok(F.penny.months === 2, 'one-penny final payment: £50.01 at £50 takes 2 months');
  ok(F.str.months === 26, 'figures saved as strings parse the same (minPay as well as min)');

  // ── the front: type icon under the logo, never on cards ──
  const icons = await page.evaluate(() => [1, 2, 3, 4, 5, 6].map(id => { const c = document.querySelector('.cc3[data-id="' + id + '"]'); const u = c && c.querySelector('.cc3-front .cc3-ticon use'); return u ? u.getAttribute('href') : null; }));
  console.log('icons', icons.join(' '));
  ok(icons[0] === null, 'credit card: no type icon (it has its chip)');
  ok(icons[1] === '#vi-loan' && icons[2] === '#vi-overdraft' && icons[3] === '#vi-book' && icons[4] === '#vi-car' && icons[5] === '#vi-mortgage', 'loan, overdraft, student, car and mortgage each show their icon');
  const pos = await page.evaluate(() => { const c = document.querySelector('.cc3[data-id="2"] .cc3-base'), l = c.querySelector('.cc3-logo').getBoundingClientRect(), i = c.querySelector('.cc3-ticon').getBoundingClientRect(), t = c.querySelector('.cc3-type').getBoundingClientRect();
    return { below: i.top >= l.bottom - 0.5, left: Math.abs(i.left - l.left) < 3, aboveType: i.bottom <= t.top + 0.5, w: i.width }; });
  ok(pos.below && pos.left && pos.aboveType && pos.w >= 16, 'icon sits under the logo, left-aligned, above the type label ' + JSON.stringify(pos));

  // ── the back ──
  const back = id => page.evaluate(id => { const c = document.querySelector('.cc3[data-id="' + id + '"] .cc3-bfacts'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; }, id);
  const zb = await back(2); console.log('back 2:', zb);
  ok(/Debt-free/i.test(zb) && /[A-Z][a-z]{2} 20\d\d/.test(zb), 'loan back: debt-free month and year');
  ok(/£25 · 1 Nov/.test(zb) && /£25 · 15 Oct/.test(zb) && /£50 · 1 Oct/.test(zb) && !/£100 · 1 Sept?/.test(zb), 'loan back: last three payments, newest first');
  ok(/Paid so far £200/.test(zb), 'loan back: paid so far = original minus balance (£1,200 - £1,000)');
  ok(/Interest this month £0 /.test(zb), 'loan back: 0% costs £0 this month');
  ok(await page.evaluate(() => { const f = document.querySelector('.cc3[data-id="2"] .cc3-bfacts'); return getComputedStyle(f).clipPath === 'none' && !document.querySelector('.cc3[data-id="2"] .cc3-bpiece .cc3-bk'); }), 'back figures sit above the cut, never split by it');
  ok(/estimate/i.test(zb), 'back says it is an estimate');
  const ob = await back(3); console.log('back 3:', ob);
  ok(/Debt-free Never at £20\/mo/i.test(ob) && /Interest this month £26\.60/.test(ob), 'overdraft back: never clears at £20/mo; £26.60 interest this month');
  const sb = await back(4); ok(/Add a minimum/i.test(sb), 'student loan back: asks for a minimum to show a date');
  ok(/Estimate: [\d.]+% APR \(÷ 12 a month\)/.test(sb) && !/uses your minimum|Add a minimum payment for a date/.test(sb), 'student loan note gives the rate convention, not the minimum again');
  ok(/Debt-free Never at £20\/mo: the interest is more/.test(ob), 'overdraft: headline is just "Never", the sub says why');
  // Pedro FIX 1 to 3: no truncated headline, figures above every cut line, readable note
  const zz = await page.evaluate(() => { const c = document.querySelector('.cc3[data-id="3"]'); const hb = c.querySelector('.cc3-bfacts .cc3-bk b');
    const f = +getComputedStyle(c.querySelector('.cc3-bfacts')).zIndex || 0, cuts = [...document.querySelectorAll('.cc3-cutline')].map(e => +getComputedStyle(e).zIndex || 0);
    const trunc = [...document.querySelectorAll('.cc3-bk b')].filter(b => getComputedStyle(b).textOverflow === 'ellipsis' || b.scrollWidth > b.clientWidth + 1).length;
    return { head: hb.textContent, f, maxCut: Math.max(0, ...cuts), op: +getComputedStyle(c.querySelector('.cc3-bk-note')).opacity, trunc }; });
  ok(zz.head === 'Never' && zz.trunc === 0, 'no back headline is cut short ' + JSON.stringify(zz));
  ok(zz.f > zz.maxCut, 'back figures sit above the cut line (z ' + zz.f + ' over ' + zz.maxCut + ')');
  ok(zz.op >= 0.75, 'back note is readable (opacity ' + zz.op + ')');
  // payment exactly equal to the interest: true wording
  ok(await page.evaluate(() => /it only covers the interest/.test(ccBackFacts({ balance: 1000, rate: 24, min: 20, original: 1000 }))), 'payment equal to the interest: "it only covers the interest"');
  const cb = await back(1); console.log('back 1:', cb);
  ok(/Jan 2029|Debt-free/.test(cb) && /Interest this month £20 /.test(cb) && /No payments yet/.test(cb), 'credit card back: date, cost, no payments yet');
  ok(await page.locator('.cc3[data-id="1"] .cc3-stripe').count() >= 1 && await page.locator('.cc3[data-id="2"] .cc3-stripe').count() === 0, 'card keeps its magnetic stripe; loans have none');
  // text floor and fit on the back at 390
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
  const fit = await page.evaluate(() => { let small = [], over = [];
    document.querySelectorAll('.cc3-bfacts').forEach(bk => { const R = bk.closest('.cc3-back').getBoundingClientRect();
      bk.querySelectorAll('*').forEach(e => { if (!e.childElementCount && e.textContent.trim()) { const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 10.5) small.push(e.textContent.trim() + ':' + fs);
        const r = e.getBoundingClientRect(); if (r.bottom > R.bottom + 1 || r.right > R.right + 1) over.push(e.textContent.trim()); } }); });
    return { small: small.slice(0, 5), over: over.slice(0, 5), sx: document.documentElement.scrollWidth - innerWidth }; });
  ok(!fit.small.length, '390: no back text under 10.5 px ' + JSON.stringify(fit.small));
  ok(!fit.over.length, '390: nothing spills off the back ' + JSON.stringify(fit.over));
  ok(fit.sx <= 0, '390: no sideways scroll');
  await page.evaluate(() => ccFlipId(2)); await page.waitForTimeout(400); await page.locator('.cc3[data-id="2"]').screenshot({ path: 'shots/v091_loan_back.png' });
  // a payment updates the back
  await page.evaluate(() => ccFlipId(2)); await page.fill('#debt-pay-inp-2', '40'); await page.evaluate(() => makePayment(2)); await page.waitForTimeout(400);
  ok(/£40 · \d+ [A-Z][a-z]{2}/.test(await back(2)) && /Paid so far £240/.test(await back(2)), 'a new payment shows first on the back and paid so far rises');
  // nothing new is saved
  ok(await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('pos_debt1')).debts.find(x => x.id === 5); return Object.keys(d).sort().join() === 'balance,id,min,name,original,rate,type'; }), 'no new saved fields');
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
