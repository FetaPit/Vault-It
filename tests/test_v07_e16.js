// v0.7 E16 (owner, 1 Nov): remove "Add to your savings" from the house builder ("Lay your bricks" already says it).
// The button says "Lay the bricks" with the brick-wall line icon (no ⊕); the input is labelled "Amount to add to your deposit".
// Run: node tests/test_v07_e16.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); });
  await p.goto(APP + '?bypass=websummit'); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await p.evaluate(() => showTab('house')); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const lay = document.getElementById('hb-lay'), btn = document.getElementById('btnAdd'), inp = document.getElementById('savingsInput');
    return { lbl: !!document.getElementById('hb-add-lbl'), text: lay ? lay.textContent : '', btn: btn.textContent.replace(/\s+/g, ' ').trim(), use: !!btn.querySelector('use[href="#vi-brick-wall"]'),
      aria: inp.getAttribute('aria-label'), lblFor: !!document.querySelector('label[for="savingsInput"]'), page: document.body.innerText.includes('Add to your savings'),
      faq: (window.VI_FAQ || []).concat([]).length };
  });
  ok(!r.lbl && !/Add to your savings/i.test(r.text), '"Add to your savings" is gone from the lay box');
  ok(!r.page, '"Add to your savings" is nowhere on the house page');
  ok(r.btn === 'Lay the bricks', 'button says "Lay the bricks" (got "' + r.btn + '")');
  ok(r.use, 'button carries the vi-brick-wall icon');
  ok(!/⊕/.test(r.btn), 'no ⊕ glyph on the button');
  ok(r.aria === 'Amount to add to your deposit' || r.lblFor, 'input is labelled');
  ok(r.aria === 'Amount to add to your deposit', 'input aria-label is "Amount to add to your deposit"');
  const src = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  ok(!/Add to your savings/.test(src), 'no "Add to your savings" anywhere in index.html (help FAQ renamed)');
  ok(/Pay off the mortgage/.test(src), 'Level 2 wording "Pay off the mortgage" kept');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
