// v0.9.2 polish 2 (owner's yes, 5 Nov): the house type slate prices read in full (£200,000, not £200.0k), and the small square dot beside a crypto
// ticker follows the coin's own colour (it followed the allocation palette: BTC teal, ETH gold).
// Run: node tests/test_v092_polish2.js
require('./lib/vi');   // serves file:// app URLs over http and maps /home/user/Vault-It onto this checkout (tests/lib/vi.js)
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1100]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'P', email: 't@t.com' }));
      if (localStorage.getItem('pos_al1')) return;
      const live = (id, sym, amount, price) => ({ id, sym, amount, price, priceSrc: 'live', priceAt: new Date().toISOString(), change24h: 1.78 });
      localStorage.setItem('pos_al1', JSON.stringify({ crypto: [live(1, 'BTC', 0.5, 40000), live(2, 'ETH', 1, 1717.16), live(3, 'XLM', 100, 0.1)], stocks: [], stockPies: [], cashAccounts: [], otherAssets: [], liabilities: [], metals: { gold: 0, silver: 0, platinum: 0, palladium: 0 } }));
    });
    await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html')); await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    const T = w + ' px: ';
    // slate prices
    const pr = await page.evaluate(() => { updatePriceLabels(); return Object.entries(state.prices).map(([t, p]) => ({ t, p, txt: (document.getElementById('pr-' + t) || {}).textContent })); });
    for (const r of pr) ok(r.txt === '£' + Math.round(r.p).toLocaleString('en-GB'), T + r.t + ' slate price in full (' + r.txt + ' for ' + r.p + ')');
    ok(pr.length >= 6, T + 'all six house types have a price label');
    // ticker dots
    await page.evaluate(() => { try { _crBusy = true; } catch (e) {} showTab('assets'); showSubtab('assets', 'crypto', null); }); await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelectorAll('#crypto-table .stk-gh').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); })); await page.waitForTimeout(300);
    const dots = await page.evaluate(() => [...document.querySelectorAll('#crypto-table .cr-tile')].map(t => { const dot = t.querySelector('.stk-tk i'), coin = t.querySelector('.cr-coin'); const probe = document.createElement('i'); probe.style.color = getComputedStyle(coin).getPropertyValue('--coin').trim(); document.body.appendChild(probe); const want = getComputedStyle(probe).color; probe.remove(); return { sym: t.querySelector('.stk-tk').textContent.trim(), dot: getComputedStyle(dot).backgroundColor, want }; }));
    ok(dots.length === 3, T + 'three crypto tiles');
    for (const d of dots) ok(d.dot === d.want, T + d.sym + ' ticker dot is the coin colour (' + d.dot + ' vs ' + d.want + ')');
    ok(!errs.length, T + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
