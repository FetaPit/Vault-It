// v0.9.1 E15 + E16 (owner, 3 Nov): "add the percentage of interest on each account. So then that's calculated each time."
// and "if it's a current account, or savings account ... easily remove money and add money."
// Optional `rate` (AER %) and a `moves` list on each cash account; illustrative interest, never added to net worth;
// a take-out above the balance is refused (Q7: overdrafts belong in the Debt tracker); Undo restores exactly.
// Run: node tests/test_v091_cash_accounts.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[1100, 'dark'], [390, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await ctx.route(/^https?:\/\//, r => r.abort());
    await p.addInitScript(t => {
      if (localStorage.getItem('pos_al1')) return;
      localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [
        { id: 1, name: 'Marcus saver', type: 'Savings', balance: 10000, rate: 4.5 },
        { id: 2, name: 'Monzo pot', type: 'Current', balance: 1000 },
        { id: 3, name: 'Old pot', type: 'Savings', balance: 0.1 }], stockPies: [], metalPrices: {}, crypto: [] }));
    }, theme);
    await p.goto(require('./lib/vi').FILE_URL); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'cash', null); }); await p.waitForTimeout(700);
    const T = w + ' ' + theme + ': ';
    const row = id => `#cash-table tr[data-ca="${id}"]`;
    const txt = async id => (await p.textContent(row(id))).replace(/\s+/g, ' ');
    const st = id => p.evaluate(i => { const a = alState.cashAccounts.find(x => x.id === i); return JSON.parse(JSON.stringify(a)); }, id);
    // E15 interest
    let t1 = await txt(1);
    ok(/£450\b/.test(t1) && /£37\.50\b/.test(t1) && /year/.test(t1) && /month/.test(t1), T + '£10,000 at 4.5% shows £450 a year and £37.50 a month');
    ok(!/NaN|undefined|null/.test(await p.textContent('#cash-table')), T + 'no NaN or undefined on the tab');
    ok(!/a year/.test(await txt(2)) && !/NaN/.test(await txt(3)), T + 'an account with no rate shows no interest, and an old save loads untouched');
    ok((await st(2)).rate === undefined && (await st(2)).moves === undefined, T + 'old accounts get no new fields until used');
    ok((await p.textContent('#ca-int-total')).replace(/\s/g, '').indexOf('£450') >= 0, T + 'tab header shows total estimated yearly interest');
    // rate editable in place, recalculates in the same render
    await p.fill(row(1) + ' .ca-rate-in', '5'); await p.dispatchEvent(row(1) + ' .ca-rate-in', 'change'); await p.waitForTimeout(200);
    t1 = await txt(1);
    ok(/£500\b/.test(t1) && /£41\.67\b/.test(t1), T + 'changing the rate in place recalculates (£500 a year, £41.67 a month): ' + t1.slice(0, 120));
    ok((await st(1)).rate === 5 && /£500\b/.test(await p.textContent('#ca-int-total')), T + 'rate saved, header total follows');
    await p.fill(row(1) + ' .ca-rate-in', ''); await p.dispatchEvent(row(1) + ' .ca-rate-in', 'change'); await p.waitForTimeout(200);
    ok((await st(1)).rate === undefined && !/a year/.test(await txt(1)), T + 'blank rate removes the interest line');
    await p.fill(row(1) + ' .ca-rate-in', '4.5'); await p.dispatchEvent(row(1) + ' .ca-rate-in', 'change'); await p.waitForTimeout(200);
    const cashBefore = await p.evaluate(() => alTotalCash());
    ok(cashBefore === 11000.1, T + 'interest is never added to cash or net worth (' + cashBefore + ')');
    // chunk A hook: v3CashLand(delta, accountId) is called once per successful move, never for a refused one
    await p.evaluate(() => { window.__land = []; window.v3CashLand = (d, id) => window.__land.push([d, id]); });
    // E16 add 250 then undo
    await p.click(row(1) + ' .ca-add'); await p.waitForTimeout(150);
    ok(await p.isVisible(row(1) + ' .ca-mv'), T + 'Add opens an inline amount and date field');
    await p.fill(row(1) + ' .ca-mv-amt', '250'); await p.click(row(1) + ' .ca-mv-ok'); await p.waitForTimeout(300);
    let a1 = await st(1);
    ok(a1.balance === 10250 && a1.moves.length === 1 && a1.moves[0].amount === 250 && /^\d{4}-\d{2}-\d{2}$/.test(a1.moves[0].date), T + 'adding £250 gives £10,250 and one logged movement ' + JSON.stringify(a1.moves));
    ok(/£10,250/.test(await txt(1)) && /£461\.25\b/.test(await txt(1)), T + 'row balance and interest follow (£461.25 a year)');
    ok(await p.isVisible('#ca-undo') && /£250/.test(await p.textContent('#ca-undo')), T + 'a toast offers Undo');
    await p.click('#ca-undo .ca-undo-btn'); await p.waitForTimeout(300);
    a1 = await st(1);
    ok(a1.balance === 10000 && (a1.moves || []).length === 0, T + 'Undo restores exactly (balance ' + a1.balance + ', moves ' + (a1.moves || []).length + ')');
    ok(JSON.stringify(await p.evaluate(() => window.__land)) === '[[250,1]]', T + 'v3CashLand called once with +250 and the account id');
    // take out
    await p.click(row(2) + ' .ca-out'); await p.fill(row(2) + ' .ca-mv-amt', '300'); await p.click(row(2) + ' .ca-mv-ok'); await p.waitForTimeout(300);
    let a2 = await st(2);
    ok(a2.balance === 700 && a2.moves.length === 1 && a2.moves[0].amount === -300, T + 'taking out £300 gives £700 and a −£300 movement');
    // over-balance refused (current account too)
    await p.click(row(2) + ' .ca-out'); await p.fill(row(2) + ' .ca-mv-amt', '700.01'); await p.click(row(2) + ' .ca-mv-ok'); await p.waitForTimeout(300);
    a2 = await st(2); const msg = await p.textContent(row(2) + ' .ca-mv-msg');
    ok(a2.balance === 700 && a2.moves.length === 1 && /Debt tracker/.test(msg), T + 'a take-out above the balance is refused with the Debt tracker pointer: ' + msg.trim());
    ok(await p.isVisible(row(2) + ' .ca-mv-msg a, ' + row(2) + ' .ca-mv-msg button'), T + 'the message links to the Debt tracker');
    const lk = await p.evaluate(s => { const a = document.querySelector(s + ' .ca-mv-msg a'), m = document.querySelector(s + ' .ca-mv-msg'); return { h: Math.round(a.getBoundingClientRect().height), c: getComputedStyle(m).color, re: (() => { const d = document.createElement('i'); d.style.color = 'var(--re)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })() }; }, row(2));
    ok(lk.h >= 44 && lk.c !== lk.re, T + 'the refusal link target is 44 px and the message is calm text (' + lk.h + ' px, ' + lk.c + ')');
    await p.fill(row(2) + ' .ca-mv-amt', '700'); await p.click(row(2) + ' .ca-mv-ok'); await p.waitForTimeout(300);
    ok((await st(2)).balance === 0, T + 'taking out the whole balance is allowed and lands on exactly 0');
    ok(JSON.stringify(await p.evaluate(() => window.__land)) === '[[250,1],[-300,2],[-700,2]]', T + 'v3CashLand: take-out signed, refused take-out not called ' + JSON.stringify(await p.evaluate(() => window.__land)));
    // pence safety: 0.10 + 0.20 = 0.30 exactly
    await p.click(row(3) + ' .ca-add'); await p.fill(row(3) + ' .ca-mv-amt', '0.2'); await p.click(row(3) + ' .ca-mv-ok'); await p.waitForTimeout(300);
    ok((await st(3)).balance === 0.3, T + '£0.10 + £0.20 is exactly £0.30 (' + (await st(3)).balance + ')');
    // empty or zero amount refused
    await p.click(row(3) + ' .ca-add'); await p.click(row(3) + ' .ca-mv-ok');
    ok((await st(3)).balance === 0.3 && /above zero/.test(await p.textContent(row(3) + ' .ca-mv-msg')), T + 'an empty amount is refused');
    // the saved copy carries the new fields (this is what sync and a reload read back)
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('pos_al1')).cashAccounts);
    ok(saved.find(a => a.id === 1).rate === 4.5 && saved.find(a => a.id === 2).moves.length === 2 && saved.find(a => a.id === 3).moves.length === 1, T + 'rate and moves are saved to the device copy');
    ok(await p.evaluate(() => { const a = JSON.parse(JSON.stringify(alState.cashAccounts)); alState.cashAccounts = JSON.parse(localStorage.getItem('pos_al1')).cashAccounts; renderAlTab(); const ok2 = /£450/.test(document.getElementById('cash-table').textContent); alState.cashAccounts = a; renderAlTab(); return ok2; }), T + 'a saved copy renders with its rate');
    // targets and layout
    const bw = await p.evaluate(() => Math.max(...[...document.querySelectorAll('#cash-table .ca-add,#cash-table .ca-out')].map(e => Math.round(e.getBoundingClientRect().width))));
    ok(bw <= 150, T + 'Add and Take out buttons are capped in width (' + bw + ' px)');
    ok(/Interest rate \(AER\)/.test(await txt(1)) && /\(estimate\)/.test(await txt(1)) && !/\babout\b/.test(await txt(1)), T + 'rows say interest and estimate, the field says Interest rate (AER)');
    const hs = await p.evaluate(() => [...document.querySelectorAll('#cash-table .ca-add,#cash-table .ca-out')].map(e => Math.round(e.getBoundingClientRect().height)));
    ok(hs.length >= 4 && hs.every(h => h >= 44), T + 'Add and Take out targets are at least 44 px high (' + hs.join(',') + ')');
    const small = await p.evaluate(() => [...document.querySelectorAll('#cash-table .ca-sub, #cash-table .ca-sub *')].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 10.5).map(e => e.textContent.trim().slice(0, 20)));
    ok(small.length === 0, T + 'no text under 10.5 px in the new controls ' + small.join('|'));
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, T + 'no sideways scroll');
    ok(/Not regulated by the FCA/.test(await p.textContent('#assets-cash')), T + 'FCA line visible on the tab');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
