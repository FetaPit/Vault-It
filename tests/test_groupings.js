// Brand phase 8: cards that affect each other are grouped (brand/AUDIT_AND_PLAN.md section 4). Nothing is removed:
// every control keeps its id and still works. Overview O1 and O2 are checked in test_overview.js.
// Run: node tests/test_groupings.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = () => {
  if (localStorage.getItem('pos_debt1')) return;
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }, { id: 2, name: 'Car loan', original: 6000, balance: 3600, rate: 8, min: 180, type: 'loan' }] }));
  localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], metals: { gold: 2, silver: 20, platinum: 0, palladium: 0 }, metalPrices: { gold: 2000, silver: 25, platinum: 800, palladium: 900 } }));
  localStorage.setItem('ht3', JSON.stringify({ saved: 8500, target: 200000, houseType: 'terraced', depositPct: 20, deposits: [{ amount: 8000, date: '01/09/2026' }, { amount: 500, date: '01/10/2026' }] }));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    // House
    await p.evaluate(() => showTab('house')); await p.waitForTimeout(2500);
    const h = await p.evaluate(() => {
      const plan = document.getElementById('hb-plan'), prog = document.getElementById('hb-prog'), hist = document.getElementById('hb-hist'), own = document.getElementById('hb-own-design');
      const inn = (c, ids) => ids.every(id => c && c.contains(document.getElementById(id)));
      return { h1: inn(plan, ['htypes', 'priceInput', 'depositPctInput', 'floor-selector-card']), lay: inn(document.getElementById('houseSceneCard'), ['savingsInput', 'btnAdd']) && document.getElementById('hb-lay').compareDocumentPosition(document.getElementById('sceneCap')) & 4, brick: /Each brick is worth about £\d/.test((document.getElementById('hb-plan-brick') || {}).textContent || ''),
        h2: inn(prog, ['savedAmt', 'pbarFill', 'stBricks', 'stRemain', 'ms1', 'ms100']),
        h3: inn(hist, ['habit-circles', 'logList', 'btnReset']) && hist.querySelector('#habit-circles').compareDocumentPosition(hist.querySelector('#logList')) & 4 && hist.querySelector('#logList').compareDocumentPosition(hist.querySelector('#btnReset')) & 4,
        h4: own && own.tagName === 'DETAILS' && !own.open && inn(own, ['model-file-input', 'meshy-prompt', 'meshy-go']),
        cards: document.querySelectorAll('#house-tab-inner .panel > .card').length, side: document.documentElement.scrollWidth - innerWidth };
    });
    ok(h.h1 && h.brick, w + ': H1 one "Your house plan" card (type, price, deposit, floor, brick value)');
    ok(h.lay, w + ': Lay the bricks sits right under the viewport (owner, 30 Oct)');
    ok(h.h2, w + ': H2 one "Progress" card (bar, stats, milestones)');
    ok(h.h3, w + ': H3 one "History" card: streak, then log, then reset');
    ok(h.h4, w + ': H4 "Your own design" is one collapsed card');
    ok(h.cards === 3, w + ': house panel has 3 cards (HUD, plan, progress), was 7 (' + h.cards + ')');
    await p.fill('#savingsInput', '100'); await p.click('#btnAdd'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('ht3')).saved === 8600), w + ': laying bricks from the plan card still saves');
    // Debt
    await p.evaluate(() => showTab('debt')); await p.waitForTimeout(1000);
    const d = await p.evaluate(() => { const st = document.querySelector('.debt-strip'), card = document.getElementById('debt-charts'), plan = document.getElementById('debt-list-el').closest('.ov-chart-card');
      const vis = id => { const e = document.getElementById(id); return !!e && e.getBoundingClientRect().height > 0; };
      return { d1: !!st && st.querySelectorAll('.ov-kpi').length === 4 && getComputedStyle(st.querySelector('.ov-kpi')).borderTopWidth === '0px', hist: vis('debt-bar-chart'), donut: vis('debt-donut-chart'),
        d3: plan.contains(document.getElementById('debt-interest-panel')) && vis('debt-interest-panel'), lbl: document.getElementById('debt-plan-lbl').textContent, cards: document.querySelectorAll('#debt-side-creditors .ov-chart-card').length };
    });
    ok(d.d1, w + ': D1 the four debt figures are one strip');
    const brass = await p.evaluate(() => { const v = n => { const e = document.createElement('i'); e.style.color = 'var(--' + n + ')'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; };
      const bar = document.querySelector('.debt-bar-fill'); return { mins: getComputedStyle(document.getElementById('debt-mins')).color === v('gold'), bar: !bar || /linear-gradient/.test(getComputedStyle(bar).backgroundImage) && getComputedStyle(bar).backgroundImage.includes(v('green').replace('rgb(', '').split(',')[0]) }; });
    ok(brass.mins && brass.bar, w + ': brass only means achievement: monthly minimums gold, debt bar red to green (owner, 30 Oct)');
    ok(d.hist && !d.donut, w + ': D2 one chart card, Histogram first');
    ok(d.d3 && d.lbl === 'Avalanche method', w + ': D3 strategy and its interest cost in one card');
    await p.evaluate(() => setDebtChart('break')); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.getElementById('debt-donut-chart').getBoundingClientRect().height > 0 && document.getElementById('debt-bar-chart').getBoundingClientRect().height === 0 && localStorage.getItem('vi_debt_chart') === 'break'), w + ': Breakdown shows the donut, choice remembered');
    await p.evaluate(() => setDebtChart('hist')); await p.evaluate(() => setDebtMethod('snowball')); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.getElementById('debt-plan-lbl').textContent === 'Snowball method' && /Snowball|Minimum/.test(document.getElementById('debt-interest-saving').textContent)), w + ': picking Snowball shows what Snowball costs');
    await p.evaluate(() => setDebtMethod('avalanche'));
    // + Add Debt opens a pop-up in view (owner: it used to open at the foot of the page, out of sight)
    await p.evaluate(() => window.scrollTo(0, 0)); await p.click('button[onclick="showDebtForm()"]'); await p.waitForTimeout(200);
    const pop = await p.evaluate(() => { const c = document.getElementById('debt-form-card').getBoundingClientRect(); return { inView: c.top >= 0 && c.bottom <= innerHeight && c.height > 100, focus: document.activeElement.id, top: document.getElementById('debt-form-modal').parentNode === document.body }; });
    ok(pop.inView && pop.focus === 'df-name' && pop.top, w + ': + Add Debt opens a pop-up in view, name field focused');
    await p.click('#debt-form-card button[onclick="saveDebt()"]'); ok(/Give the debt a name/.test(await p.textContent('#debt-form-msg')), w + ': saving without a name says why');
    await p.keyboard.press('Escape'); ok(await p.evaluate(() => document.getElementById('debt-form-modal').hidden), w + ': Escape closes it');
    await p.evaluate(() => { window.isPioneer = () => true; }); await p.click('button[onclick="showDebtForm()"]'); await p.fill('#df-name', 'Test card'); await p.fill('#df-balance', '300'); await p.press('#df-name', 'Enter'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => debtState.debts.some(d => d.name === 'Test card' && d.balance === 300) && document.getElementById('debt-form-modal').hidden), w + ': saving adds the debt and closes the pop-up');
    await p.evaluate(() => { debtState.debts = debtState.debts.filter(d => d.name !== 'Test card'); saveDebtState(); renderDebtTab(); });
    ok(d.cards === 2, w + ': debt tab is 2 cards plus the strip, was 5 (' + d.cards + ')');
    // Assets: metals
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'metals', null); }); await p.waitForTimeout(600);
    const a = await p.evaluate(() => { const rows = [...document.querySelectorAll('#metals-inputs .mh-row')]; return { n: rows.length, ins: rows.map(r => r.querySelectorAll('input').length), gold: document.getElementById('metal-val-gold').textContent, price: !!document.getElementById('price-inputs') }; });
    ok(a.n === 4 && a.ins.every(n => n === 2) && !a.price, w + ': A1 one card, holdings with the price beside each metal');
    ok(a.gold === '£4,000', w + ': value shown per metal (' + a.gold + ')');
    await p.fill('#metals-inputs .mh-row:first-child input >> nth=0', '3'); await p.dispatchEvent('#metals-inputs .mh-row:first-child input >> nth=0', 'change');
    ok(await p.evaluate(() => document.getElementById('metal-val-gold').textContent === '£6,000' && alState.metals.gold === 3), w + ': editing holdings updates the value and saves');
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && h.side <= 0, w + ': no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
