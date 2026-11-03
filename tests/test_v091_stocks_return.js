// v0.9.1 E17: Stocks tiles judged from the point of entry (owner: "judge them at the point of the user inputting ...
// current value and then amount initially invested"; Q8: "Invested" means the price at the time the holding was added).
// Hand-worked cases:
//   GOOD  5 units, avg cost £30, price £38      -> invested £150.00, value £190.00, change +£40.00
//   OLD   10 units, avg cost £4,200, price £300 -> cost is 14x the price: "Check your average cost", left out of the tiles
//   NEWCO 10 units added with no cost at £5     -> invested £50.00, change £0.00; at £5.50 -> value £55.00, change +£5.00
//   AMTCO £100 held at £4                       -> 25 units, invested £100.00, change £0.00
//   COSTCO 2 units, typed cost £10, price £12   -> invested £20.00 (typed cost wins), change +£4.00
//   NOPX  3 units, no live price at add         -> not counted until a price arrives at £7, then invested £21.00
//   NEWCO +10 units at £6 (entry was £5)       -> entry price (10x5 + 10x6)/20 = £5.50, avgCost untouched
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const money = s => { const m = String(s).replace(/,/g, '').match(/([+\-−]?)£(\d+(?:\.\d+)?)/); return m ? (m[1] === '-' || m[1] === '−' ? -1 : 1) * parseFloat(m[2]) : NaN; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1100, height: 1100 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.addInitScript(() => {
    if (localStorage.getItem('pos_al1')) return;
    localStorage.setItem('vi_declined_demo', 'true');
    localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
    localStorage.setItem('vi_user', JSON.stringify({ name: 'P', email: 't@t.com' }));
    localStorage.setItem('pos_al1', JSON.stringify({ stocks: [
      { id: 1, pie: 1, sym: 'GOOD', units: 5, avgCost: 30, price: 38, updated: Date.now() },
      { id: 2, pie: 1, sym: 'OLD', units: 10, avgCost: 4200, price: 300, updated: Date.now() },
      { id: 3, pie: 1, sym: 'BARE', units: 2, price: 0 }   // an old save: no cost, no price, no new fields
    ], stockPies: [{ id: 1, name: 'ISA' }, { id: 2, name: 'New pie' }], activePie: 1, cashAccounts: [], otherAssets: [], crypto: [], liabilities: [], metals: { gold: 0, silver: 0, platinum: 0, palladium: 0 } }));
  });
  await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html')); await page.waitForTimeout(1200);
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  // wait for the app, not the clock: the tiles have text, no price fetch is running, and the panel has stopped changing
  // (the same text on 4 checks in a row, each on its own animation frame plus 60 ms), so a fetch that has only just started is seen
  const settle = async () => { await page.waitForFunction(() => { const v = document.querySelector('#stk-main .stk-stat .v'); if (!(v && v.textContent.trim()) || window._stkBusy) { window.__same = 0; return false; }
      const now = document.getElementById('stk-main').innerText + '|' + document.getElementById('stk-holdings').innerText; if (now === window.__prev) window.__same = (window.__same || 0) + 1; else { window.__prev = now; window.__same = 0; }
      return window.__same >= 4; }, null, { timeout: 20000, polling: 'raf' }); };
  await page.evaluate(() => {
    window.__px = { GOOD: 38, OLD: 300 };
    _supaClient = { auth: {}, functions: { invoke: async (n, o) => {
      const q = {}; ((o && o.body && o.body.symbols) || []).forEach(s => { if (window.__px[s] > 0) q[s] = { price: window.__px[s], currency: 'GBP', changePct: 0 }; });
      return { data: { quotes: q, misses: {} }, error: null }; } } };
    showTab('assets'); showSubtab('assets', 'stocks', null);
  });
  await settle();
  const tiles = async () => page.evaluate(() => {
    const o = {}; document.querySelectorAll('#stk-main .stk-stat').forEach(t => { o[t.querySelector('.l').textContent.trim()] = { v: t.querySelector('.v').textContent.trim(), s: (t.querySelector('.s') || {}).textContent || '' }; }); return o; });
  const INV = 'Invested (at the time you added it)', CHG = 'Change since you added it', VAL = 'Current value';
  const stock = id => page.evaluate(i => JSON.parse(JSON.stringify(alState.stocks.find(x => x.id === i || x.sym === i) || null)), id);

  // 1. Labels in the owner's words
  let t = await tiles();
  ok(t[VAL] && t[INV] && t[CHG], 'tiles read "Current value", "' + INV + '", "' + CHG + '" (' + Object.keys(t).join(' | ') + ')');
  ok(!!t['Today'], 'the Today tile is kept');
  ok(!Object.keys(t).some(k => /total return/i.test(k)), 'no "Total return" tile any more');

  // 2. The bad stored average cost: a nudge on its row, not a headline loss; left out of the tiles
  const oldRow = await page.evaluate(() => { const r = [...document.querySelectorAll('#stk-holdings .stk-row')].find(x => /OLD/.test(x.querySelector('.stk-tk') ? x.querySelector('.stk-tk').textContent : '')); return r ? r.innerText : ''; });
  if (!oldRow) await page.evaluate(() => { document.querySelectorAll('#stk-holdings .stk-gh').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); }); });
  await settle();
  const oldRow2 = await page.evaluate(() => { const r = [...document.querySelectorAll('#stk-holdings .stk-row')].find(x => x.querySelector('.stk-tk') && /\bOLD\b/.test(x.querySelector('.stk-tk').textContent)); return r ? r.innerText : ''; });
  ok(/Check your average cost/.test(oldRow2), 'the holding whose average cost is 14x its price shows "Check your average cost" (' + oldRow2.replace(/\n/g, ' ').slice(0, 80) + ')');
  ok(!/-?9[0-9]\.\d%/.test(oldRow2.replace(/Check your average cost/, '')), 'that row shows no -93% loss');
  t = await tiles();
  ok(money(t[INV].v) === 150, 'pie Invested is £150.00 (GOOD only; OLD left out): ' + t[INV].v);
  ok(money(t[CHG].v) === 40 && /^\+/.test(t[CHG].v), 'pie Change is +£40.00: ' + t[CHG].v);
  ok(!/39,|41,|4,1|42,0/.test(t[INV].v + t[CHG].v), 'no headline -£39,000 / £42,000');
  ok(/check (its|their) average cost/i.test(t[INV].s + t[CHG].s), 'the tile says a holding was left out to check its average cost (' + (t[INV].s + ' / ' + t[CHG].s) + ')');
  ok(money(t[VAL].v) === 3190, 'Current value still counts every holding (5x38 + 10x300 + BARE at £0 = £3,190.00): ' + t[VAL].v);

  // 3. Add with no cost at £5: invested at the price when added
  await page.evaluate(async () => { window.__px.NEWCO = 5; const r = await stkAddCore({ sym: 'NEWCO', units: 10, pieId: 2 }); await stkAddFinish(r, false); });
  await settle();
  await page.evaluate(() => stkSelectPie(2)); await settle();
  let n = await stock('NEWCO');
  ok(n && n.addPx === 5 && !(n.avgCost > 0), 'NEWCO keeps its entry price £5 in a new field, average cost left empty (addPx ' + (n && n.addPx) + ', avgCost ' + (n && n.avgCost) + ')');
  t = await tiles();
  ok(t[VAL].v === '£50.00' && t[INV].v === '£50.00' && t[CHG].v === '£0.00', '10 at £5: value £50.00, invested £50.00, change £0.00 (' + [t[VAL].v, t[INV].v, t[CHG].v].join(', ') + ')');

  // 4. Refresh at £5.50
  await page.evaluate(async () => { window.__px.NEWCO = 5.5; await stkRefresh(true); }); await settle();
  t = await tiles();
  ok(t[VAL].v === '£55.00' && t[INV].v === '£50.00' && t[CHG].v === '+£5.00', 'after a refresh at £5.50: value £55.00, invested £50.00, change +£5.00 (' + [t[VAL].v, t[INV].v, t[CHG].v].join(', ') + ')');
  n = await stock('NEWCO'); ok(n.addPx === 5, 'the entry price does not move with the live price');

  // 5. £ held path, typed cost path, no-price path
  await page.evaluate(async () => {
    window.__px.AMTCO = 4; window.__px.COSTCO = 12;
    let r = await stkAddCore({ sym: 'AMTCO', amt: 100, pieId: 2 }); await stkAddFinish(r, true);
    r = await stkAddCore({ sym: 'COSTCO', units: 2, cost: 10, pieId: 2 }); await stkAddFinish(r, false);
    r = await stkAddCore({ sym: 'NOPX', units: 3, pieId: 2 }); await stkAddFinish(r, false);
    stkSelectPie(2);
  });
  await settle();
  const amt = await stock('AMTCO'), cst = await stock('COSTCO'); let nop = await stock('NOPX');
  ok(Math.abs(amt.units - 25) < 1e-6 && amt.addPx === 4, '£100 held at £4: 25 units, entry £4');
  ok(cst.avgCost === 10, 'a typed average cost is kept as typed (£10)');
  ok(!(nop.addPx > 0) && !(nop.avgCost > 0), 'no live price yet: no entry price invented');
  t = await tiles();
  // counted: NEWCO 50 -> 55, AMTCO 100 -> 100, COSTCO 20 -> 24. invested 170, value counted 179, change +9
  ok(t[INV].v === '£170.00' && t[CHG].v === '+£9.00', 'pie 2: invested £170.00, change +£9.00 (' + t[INV].v + ', ' + t[CHG].v + ')');
  ok(/no (entry|live) price/i.test(t[INV].s + t[CHG].s), 'the holding with no price yet is named as left out (' + t[INV].s + ' / ' + t[CHG].s + ')');
  await page.evaluate(async () => { window.__px.NOPX = 7; await stkRefresh(true); }); await settle();
  nop = await stock('NOPX');
  ok(nop.addPx === 7, 'the first price seen after adding becomes the entry price (£7): ' + nop.addPx);
  t = await tiles();
  ok(t[INV].v === '£191.00' && t[CHG].v === '+£9.00', 'pie 2 now: invested £191.00, change +£9.00 (' + t[INV].v + ', ' + t[CHG].v + ')');

  // 6. Adding more of the same share with no cost: the entry price blends by units (never touches avgCost)
  await page.evaluate(async () => { window.__px.NEWCO = 6; const r = await stkAddCore({ sym: 'NEWCO', units: 10, pieId: 2 }); await stkAddFinish(r, false); });
  await settle();
  n = await stock('NEWCO');
  ok(n.units === 20 && Math.abs(n.addPx - 5.5) < 1e-9 && !(n.avgCost > 0), 'NEWCO +10 at £6: 20 units, entry (10x5 + 10x6)/20 = £5.50 (' + n.addPx + ')');

  // 6b. Topping up an entry-price holding with a typed cost blends: 10 at £5, then +10 at a typed £6 -> avg cost £5.50, invested £110.00
  await page.evaluate(async () => { let r = await stkAddCore({ sym: 'TOPUP', units: 10, pieId: 2, manualPrice: 5 }); r = await stkAddCore({ sym: 'TOPUP', units: 10, cost: 6, pieId: 2 }); });
  await settle();
  const tu = await stock('TOPUP');
  ok(tu.units === 20 && Math.abs(tu.avgCost * tu.units - 110) < 1e-9, 'TOPUP: 10 at £5 then +10 with a typed £6 = invested £110.00 (' + (tu.avgCost * tu.units) + ')');
  await page.evaluate(() => { alState.stocks = alState.stocks.filter(h => h.sym !== 'TOPUP'); stkSave(); });

  // 7. All investments: reconciles, as displayed
  await page.evaluate(() => stkSelectPie('all')); await settle();
  t = await tiles();
  const counted = await page.evaluate(() => stkReturns(alState.stocks));
  ok(Math.abs(money(t[INV].v) + money(t[CHG].v) - Math.round(counted.value * 100) / 100) < 0.005, 'All: invested + change = value of the holdings counted (' + t[INV].v + ' + ' + t[CHG].v + ' = ' + counted.value.toFixed(2) + ')');
  ok(counted.left.some(h => h.sym === 'OLD') && counted.left.some(h => h.sym === 'BARE'), 'OLD (check cost) and BARE (no price) are the ones left out');

  // 8. The stored average costs are untouched, and the new field survives a reload
  const o = await stock('OLD'), g = await stock('GOOD');
  ok(o.avgCost === 4200 && g.avgCost === 30, 'stored average costs never rewritten (OLD 4200, GOOD 30)');
  // carry what the page saved through Node, not the browser: file:// storage (even sessionStorage) can lose writes across a reload
  const snap = await page.evaluate(() => Object.entries(localStorage));
  await page.addInitScript(entries => { localStorage.clear(); entries.forEach(([k, v]) => localStorage.setItem(k, v)); }, snap);
  await page.reload(); await page.waitForFunction(() => typeof alState !== 'undefined' && alState.stocks && alState.stocks.some(h => h.sym === 'GOOD') && typeof showSubtab === 'function', null, { timeout: 15000 });
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await page.evaluate(() => { showTab('assets'); showSubtab('assets', 'stocks', null); }); await settle();
  const n2 = await stock('NEWCO');
  ok(n2 && Math.abs(n2.addPx - 5.5) < 1e-9 && (await stock('OLD')).avgCost === 4200, 'after a reload the entry price is still there and OLD still 4200 (NEWCO ' + JSON.stringify(n2 && { addPx: n2.addPx, units: n2.units }) + ', OLD avgCost ' + (await stock('OLD')).avgCost + ', holdings ' + (await page.evaluate(() => alState.stocks.map(h => h.sym).join(','))) + ')');

  // 9. Typing a sensible average cost clears the nudge
  await page.evaluate(() => { stkSet(2, 'avgCost', '420'); stkSelectPie(1); }); await settle();
  const t9 = await page.evaluate(() => stkReturns(alState.stocks.filter(h => h.pie === 1)));
  ok(!t9.left.some(h => h.sym === 'OLD'), 'once the user types £420 the holding counts again');

  // 10. Narrow phone: no sideways scroll on the Stocks tab
  await page.setViewportSize({ width: 320, height: 900 }); await settle();
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(sw <= 0, 'no sideways scroll at 320 px (' + sw + ')');
  const small = await page.evaluate(() => [...document.querySelectorAll('#stk-main .stk-stat *, .stk-chk')].filter(e => e.offsetParent && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 10.5).map(e => e.className + ':' + getComputedStyle(e).fontSize));
  ok(small.length === 0, 'no tile or nudge text under 10.5 px (' + small.join(',') + ')');

  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
