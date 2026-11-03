// v0.9.1 E32: Crypto gets the Stocks dashboard: three tiles, holdings grouped by wallet, donut, Bars | Tree map, coin badges.
// Hand-worked: BTC 0.5 @ 40,000 (added at 30,000), ETH 2 @ 2,000 (added at 2,500), SOL 100 @ 10 (added at 8) -> value 25,000, invested 20,800, change +4,200
//   DOGE 100 @ 0.1 and SHIB 1000 @ 0.00001 are old saves with no entry price: shown, counted in the total (10.01), left out of invested/change, never rewritten.
//   Total 25,010.01; BTC is 20,000 / 25,010.01 = 80.0%.
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const [w, theme] of [[390, 'dark'], [768, 'light'], [1100, 'dark'], [1440, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, colorScheme: theme });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => {
      if (localStorage.getItem('pos_al1')) return;
      localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-cr-alloc', 'tree');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('vi_user', JSON.stringify({ name: 'P', email: 't@t.com' }));
      const live = (id, sym, amount, price, addPx, wallet) => ({ id, sym, amount, price, addPx, wallet, priceSrc: 'live', priceAt: new Date().toISOString() });
      localStorage.setItem('pos_al1', JSON.stringify({ crypto: [
        live(1, 'BTC', 0.5, 40000, 30000, 'Coinbase'), live(2, 'ETH', 2, 2000, 2500, 'Coinbase'), live(3, 'SOL', 100, 10, 8, 'Ledger'),
        { id: 4, sym: 'DOGE', amount: 100, price: 0.1 }, { id: 5, sym: 'SHIB', qty: 1000, price: 0.00001, name: 'Shiba' }
      ], stocks: [], stockPies: [], cashAccounts: [], otherAssets: [], liabilities: [], metals: { gold: 0, silver: 0, platinum: 0, palladium: 0 } }));
    });
    await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html')); await page.waitForTimeout(1200);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await page.evaluate(() => { try { _crBusy = true; } catch (e) {} showTab('assets'); showSubtab('assets', 'crypto', null); });
    await page.waitForTimeout(800);
    const t = w + ' ' + theme + ': ';
    const r = await page.evaluate(() => {
      const tiles = {}; document.querySelectorAll('#cr-main .stk-stat').forEach(x => { tiles[x.querySelector('.l').textContent.trim()] = { v: x.querySelector('.v').textContent.trim(), s: (x.querySelector('.s') || {}).textContent }; });
      const el = document.getElementById('cr-treemap'), cells = el ? [...el.querySelectorAll('.dtm-cell')] : [];
      const bad = []; cells.forEach(c => { const cr = c.getBoundingClientRect(); c.querySelectorAll('.dtm-n,.dtm-v,.dtm-s').forEach(x => { const xr = x.getBoundingClientRect(); const fs = parseFloat(getComputedStyle(x).fontSize);
        if (x.scrollWidth > x.clientWidth + 1 || xr.right > cr.right + .5 || xr.bottom > cr.bottom + .5 || fs < 10.5) bad.push(x.textContent.slice(0, 12)); }); });
      return { tiles, groups: [...document.querySelectorAll('#crypto-table .stk-gh .stk-gn')].map(x => x.textContent.trim()), rows: [...document.querySelectorAll('#crypto-table .cr-row')].length,
        rowLogos: document.querySelectorAll('#crypto-table .cr-row .stk-hl').length, held: [...document.querySelectorAll('#crypto-table .cr-row .cr-held')].map(x => x.textContent),
        map: !!el, h: el ? el.offsetHeight : 0, W: el ? el.parentElement.clientWidth : 0, cellText: cells.map(c => [...c.querySelectorAll('.dtm-n,.dtm-v,.dtm-s')].map(x => x.textContent.trim()).join(' ')), bad, tileLogos: el ? el.querySelectorAll('.stk-hl').length : 0,
        emptyPies: [...document.querySelectorAll('#cr-treemap .stk-tm-pie')].filter(pi => { const a = pi.getBoundingClientRect(); return ![...document.querySelectorAll('#cr-treemap .dtm-cell')].some(c => { const b = c.getBoundingClientRect(); return b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1; }); }).length,
        legend: (document.getElementById('cr-tm-other') || {}).textContent || '', donut: !!document.querySelector('#cr-main svg[aria-label="Crypto allocation"]'),
        doge: JSON.parse(JSON.stringify(alState.crypto.find(c => c.sym === 'DOGE'))), total: (document.getElementById('subtab-total-crypto') || {}).textContent, scrollX: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    const VAL = 'Current value', INV = 'Invested (at the time you added it)', CHG = 'Change since you added it';
    ok(r.tiles[VAL] && r.tiles[INV] && r.tiles[CHG], t + 'the three Stocks tiles are there (' + Object.keys(r.tiles).join(' | ') + ')');
    ok(/25,010/.test((r.tiles[VAL] || {}).v), t + 'Current value is the 25,010 total: ' + (r.tiles[VAL] || {}).v);
    ok(/20,800/.test((r.tiles[INV] || {}).v), t + 'Invested is 20,800 (BTC, ETH, SOL only): ' + (r.tiles[INV] || {}).v);
    ok(/^\+/.test((r.tiles[CHG] || {}).v) && /4,200/.test(r.tiles[CHG].v), t + 'Change is +4,200: ' + (r.tiles[CHG] || {}).v);
    ok(/3 of 5/.test((r.tiles[CHG] || {}).s || ''), t + 'the tile says it counts 3 of 5 holdings: ' + (r.tiles[CHG] || {}).s);
    ok(r.donut, t + 'a donut shows the allocation');
    ok(r.groups.includes('Coinbase') && r.groups.includes('Ledger') && r.groups.includes('My crypto'), t + 'holdings are grouped by wallet, old saves under "My crypto": ' + r.groups.join('|'));
    await page.evaluate(() => document.querySelectorAll('#crypto-table .stk-gh').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); }));
    await page.waitForTimeout(300);
    const rr = await page.evaluate(() => ({ rows: document.querySelectorAll('#crypto-table .cr-row').length, logos: document.querySelectorAll('#crypto-table .cr-row .stk-hl').length, held: [...document.querySelectorAll('#crypto-table .cr-row .cr-held')].map(x => x.textContent.trim()) }));
    ok(rr.rows === 5 && rr.logos === 5, t + 'five coin rows, each with a badge (' + rr.rows + '/' + rr.logos + ')');
    ok(rr.held.some(x => /0\.5 BTC/.test(x)) && rr.held.some(x => /1,000 SHIB/.test(x)), t + 'amounts show, including the old {qty} shape (' + rr.held.join('|') + ')');
    ok(r.map && r.h >= 360, t + 'tree map is drawn and tall (' + r.h + ')');
    ok(r.cellText.some(x => /^BTC.*80\.0%/.test(x)), t + 'BTC tile reads 80.0% of the portfolio: ' + JSON.stringify(r.cellText.slice(0, 4)));
    ok(r.cellText.some(x => /^ETH/.test(x)) && (r.cellText.some(x => /^SOL/.test(x)) || /SOL/.test(r.legend)), t + 'ETH has a tile, and SOL has one or is listed under the map');
    ok(/DOGE/.test(r.legend) && /SHIB/.test(r.legend), t + 'and are listed under the map');
    ok(r.bad.length === 0, t + 'no label clipped or under 10.5px ' + JSON.stringify(r.bad));
    ok(r.tileLogos >= 2, t + 'tiles carry coin badges (' + r.tileLogos + ')');
    ok(JSON.stringify(r.doge) === JSON.stringify({ id: 4, sym: 'DOGE', amount: 100, price: 0.1 }), t + 'an old DOGE save is untouched: ' + JSON.stringify(r.doge));
    const ph = await page.evaluate(() => [...document.querySelectorAll('#assets-crypto .data-input-row input')].map(i => { const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(i).font; return { p: i.placeholder, fits: c.measureText(i.placeholder).width <= i.clientWidth - 14 }; }));
    ok(ph.length === 5 && ph.every(x => x.fits), t + 'no add-row placeholder is clipped ' + JSON.stringify(ph.filter(x => !x.fits)));
    ok(r.emptyPies === 0, t + 'no pie outline encloses nothing (' + r.emptyPies + ')');
    ok(!r.scrollX, t + 'no sideways scroll');
    if (w === 1100) {
      // add a coin with a cost and a wallet through the form
      await page.fill('#cr-sym', 'link'); await page.fill('#cr-amt', '10'); await page.fill('#cr-price', '15'); await page.fill('#cr-cost', '12'); await page.fill('#cr-wallet', 'Kraken');
      await page.click('#assets-crypto button[onclick="addCrypto()"]'); await page.waitForTimeout(500);
      const a = await page.evaluate(() => JSON.parse(JSON.stringify(alState.crypto.find(c => c.sym === 'LINK') || null)));
      ok(a && a.amount === 10 && a.avgCost === 12 && a.wallet === 'Kraken', t + 'a new coin keeps its amount, cost and wallet: ' + JSON.stringify(a));
      const a2 = await page.evaluate(() => { const c = alState.crypto.find(x => x.sym === 'LINK'); return c ? { addPx: c.addPx } : null; });
      ok(a2 && a2.addPx === 15, t + 'and the price it was added at (' + JSON.stringify(a2) + ')');
      const bars = await page.evaluate(() => { crSetAlloc('bars'); return document.querySelectorAll('#cr-alloc .stk-bar').length; });
      ok(bars >= 3, t + 'Bars view lists the coins (' + bars + ')');
    }
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 2).join('|'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
