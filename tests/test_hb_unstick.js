// Owner, 30 Oct: the house builder was stuck in Level 2 (finished house, "You own 90%") with only 31% of the deposit saved,
// and Reset Tracker did not take it back. Reset now returns to Level 1, and Level 2 has "Not bought yet? Back to Level 1",
// which keeps the savings log. Run: node tests/test_hb_unstick.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const STUCK = { saved: 20000, target: 320000, houseType: 'semi', depositPct: 20, prices: { terraced: 120000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 },
  deposits: [{ amount: 20000, date: '30/10/2026' }], houseMode: 'purchased', mortgageActive: true, mortgageBalance: 288000, valuation: 320000, purchase: { price: 320000, deposit: 20000, date: '2026-10-30' } };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.addInitScript(s => { if (localStorage.getItem('ht3')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' })); localStorage.setItem('ht3', JSON.stringify(s)); }, STUCK);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(() => showTab('house')); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => hbLevel() === 2 && !!document.querySelector('.hb-undo-btn')), w + ': a bought house shows Level 2 with "Not bought yet? Back to Level 1"');
    await p.click('.hb-undo-btn'); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('ht3')); return { lv: hbLevel(), mode: st.houseMode || null, saved: st.saved, log: (st.deposits || []).length, type: st.houseType, price: st.target, pct: Math.round(pct() * 1000) / 10, hud: document.getElementById('hb-hud').textContent, undo: !!document.querySelector('.hb-undo-btn') }; });
    ok(r.lv === 1 && r.mode === null && r.saved === 20000 && r.log === 1 && r.type === 'semi' && r.price === 320000 && !r.undo, w + ': back to Level 1, savings log, type and price kept (' + JSON.stringify(Object.assign({}, r, { hud: undefined })) + ')');
    ok(r.pct === 31.3 && !/Every row is built/.test(r.hud) && /31\.3% of/.test(r.hud), w + ': Level 1 shows 31.3% and no "every row is built"');
    const m = r.hud.match(/ROW\s*(\d+)\s*of\s*(\d+)/); ok(m && +m[1] < +m[2], w + ': row label is part way up (' + (m && m[0]) + ')');
    // Reset from a bought house goes all the way back
    await p.evaluate(s => { Object.assign(state, JSON.parse(JSON.stringify(s))); save(); updateUI(); }, STUCK); await p.waitForTimeout(500);
    ok(await p.evaluate(() => hbLevel() === 2), w + ': bought again');
    await p.click('#btnReset'); await p.waitForTimeout(800);
    ok(await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('ht3')); return hbLevel() === 1 && !st.houseMode && st.saved === 0 && !(st.deposits || []).length && st.houseType === 'semi' && st.target === 320000 && !st.mortgageBalance; }), w + ': Reset Tracker clears savings and the purchase, keeps type and price');
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, w + ': no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
