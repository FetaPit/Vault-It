// Round 3, items 9 to 11 (owner, 31 Oct 2026): crypto prices are pulled automatically and linked to the holdings (CoinGecko, already
// named in the privacy notice; only coin names are sent); each tile shows the tokens held, the price and where it came from; coin
// icons are bigger. A failed fetch keeps the last price and says how old it is; a coin CoinGecko does not list keeps the user's price.
// CoinGecko is mocked here. Run: node tests/test_crypto_live.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [theme, w] of [['dark', 1100], ['light', 390]]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    const calls = []; let mode = 'ok';
    await ctx.route(/api\.coingecko\.com/, r => { calls.push(r.request().url()); if (mode === 'fail') return r.fulfill({ status: 503, body: '' });
      r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ bitcoin: { gbp: 52000.5, gbp_24h_change: 1.25 }, ethereum: { gbp: 2600, gbp_24h_change: -0.5 } }) }); });
    await ctx.route(/^https?:\/\/(?!api\.coingecko\.com)/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(theme + ' ' + e.message));
    await p.addInitScript(seed, { theme, flag: true });
    await p.addInitScript(() => { const al = JSON.parse(localStorage.getItem('pos_al1')); if (!al.crypto || al.crypto.length !== 3) { al.crypto = [{ id: 1, sym: 'BTC', amount: 0.25, price: 40000 }, { id: 2, sym: 'ETH', amount: 1.5, price: 2000 }, { id: 3, sym: 'ZZZQ', amount: 100, price: 0.5 }]; localStorage.setItem('pos_al1', JSON.stringify(al)); } });
    await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    const T = theme + ' ' + w + ': ';
    await p.evaluate(() => { showTab('assets'); const b = [...document.querySelectorAll('#assets-page .subtab-btn')].find(x => /crypto/i.test(x.textContent)); showSubtab('assets', 'crypto', b); });
    await p.waitForTimeout(1500);
    let r = await p.evaluate(() => ({ c: alState.crypto.map(c => ({ s: c.sym, p: c.price, src: c.priceSrc })), total: alTotalCrypto(),
      tiles: [...document.querySelectorAll('#crypto-table .wi-tile')].map(t => ({ held: (t.querySelector('.cr-held') || {}).textContent, src: (t.querySelector('.cr-src') || {}).textContent, logo: Math.max(...[...t.querySelectorAll('.cr-logo')].map(e => e.getBoundingClientRect().width), 0), priceIn: !!t.querySelector('[onchange^="updateCryptoPrice"]') })) }));
    ok(calls.length >= 1 && /ids=bitcoin%2Cethereum%2Czzzq&vs_currencies=gbp/.test(calls[0]) && !/0\.25|amount/.test(calls[0]), T + 'opening Crypto fetches the prices by itself, sending only coin names (' + (calls[0] || 'no call').replace(/^.*\?/, '?') + ')');
    ok(r.c[0].p === 52000.5 && r.c[0].src === 'live' && r.c[1].p === 2600 && Math.abs(r.total - (0.25 * 52000.5 + 1.5 * 2600 + 100 * 0.5)) < 0.01, T + 'the live prices are linked to the holdings: total ' + r.total);
    ok(r.c[2].p === 0.5 && r.c[2].src === 'manual' && /Your price · no live price found for ZZZQ/.test(r.tiles[2].src) && r.tiles[2].priceIn && !r.tiles[0].priceIn, T + 'a coin CoinGecko does not list keeps the typed price and says so; live coins have no price box');
    ok(/^0\.25 BTC held$/.test(r.tiles[0].held) && /^1\.5 ETH held$/.test(r.tiles[1].held), T + 'each tile shows the tokens held (' + r.tiles[0].held + ', ' + r.tiles[1].held + ')');
    ok(/Live price · CoinGecko · just now · indicative/.test(r.tiles[0].src), T + 'and where the price comes from (' + r.tiles[0].src + ')');
    ok(r.tiles[0].logo >= (mob ? 50 : 62), T + 'bigger coin icons (' + r.tiles[0].logo + ' px)');
    // a failed refresh keeps the last price and says it could not refresh
    mode = 'fail'; await p.evaluate(() => fetchCryptoPrices(true)); await p.waitForTimeout(800);
    r = await p.evaluate(() => ({ p: alState.crypto[0].price, src: document.querySelector('#crypto-table .wi-tile .cr-src').textContent }));
    ok(r.p === 52000.5 && /Last live price · just now · could not refresh/.test(r.src), T + 'a failed refresh keeps the last price and says so (' + r.src + ')');
    // a new coin gets its live price straight away
    mode = 'ok'; const n0 = calls.length;
    await p.fill('#cr-sym', 'btc'); await p.fill('#cr-amt', '0.1'); await p.click('#assets-crypto button[onclick="addCrypto()"]'); await p.waitForTimeout(900);
    r = await p.evaluate(() => { const c = alState.crypto[alState.crypto.length - 1]; return { p: c.price, src: c.priceSrc }; });
    ok(calls.length > n0 && r.p === 52000.5 && r.src === 'live', T + 'a coin added without a price gets its live price straight away');
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, T + 'no sideways scroll');
    await ctx.close();
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
