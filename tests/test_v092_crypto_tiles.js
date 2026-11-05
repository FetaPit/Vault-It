// v0.9.2 polish, Pedro's nits on round 2 chunk G (crypto tiles): the Remove button is a quiet centred button with the app's own icon (no emoji),
// not a full-width bar; at 1100 px the tiles fill the row (no empty right half); the live price line breaks into even lines with the 24 h change on its own line.
// Run: node tests/test_v092_crypto_tiles.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const [w, theme] of [[390, 'dark'], [390, 'light'], [1100, 'dark'], [1100, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, colorScheme: theme });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => {
      if (localStorage.getItem('pos_al1')) return;
      localStorage.setItem('vi_declined_demo', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('vi_user', JSON.stringify({ name: 'P', email: 't@t.com' }));
      const live = (id, sym, amount, price, addPx) => ({ id, sym, amount, price, addPx, priceSrc: 'live', priceAt: new Date().toISOString(), change24h: 1.78 });
      localStorage.setItem('pos_al1', JSON.stringify({ crypto: [live(1, 'BTC', 0.5, 40000, 30000), live(2, 'ETH', 1, 1717.16, 1500)],
        stocks: [], stockPies: [], cashAccounts: [], otherAssets: [], liabilities: [], metals: { gold: 0, silver: 0, platinum: 0, palladium: 0 } }));
    });
    await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html')); await page.waitForTimeout(1200);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await page.evaluate(() => { try { _crBusy = true; } catch (e) {} showTab('assets'); showSubtab('assets', 'crypto', null); });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelectorAll('#crypto-table .stk-gh').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); }));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('#crypto-table .cr-tile')].filter(e => e.offsetParent);
      const t = tiles[0], x = t.querySelector('.c-x'), tb = t.getBoundingClientRect(), xb = x.getBoundingClientRect(), g = t.parentElement.getBoundingClientRect();
      const last = tiles[tiles.length - 1].getBoundingClientRect(), src = t.querySelector('.cr-src'), ch = src.querySelector('.cr-ch');
      return { n: tiles.length, emoji: /🗑/.test(x.textContent), icon: !!x.querySelector('svg'), label: x.textContent.trim(), xw: xb.width, tw: tb.width, cx: Math.abs((xb.left + xb.right) / 2 - (tb.left + tb.right) / 2),
        gapRight: g.right - Math.max(...tiles.map(q => q.getBoundingClientRect().right)), chBlock: ch ? getComputedStyle(ch).display === 'block' : false, h: xb.height };
    });
    const T = w + ' ' + theme + ': ';
    ok(r.n >= 2, T + 'two coin tiles drawn');
    ok(!r.emoji && r.icon && r.label === 'Remove', T + 'Remove uses the app icon, no emoji (' + r.label + ')');
    ok(r.xw < r.tw * 0.7 && r.cx < 2, T + 'Remove is a quiet centred button, not a full-width bar (' + Math.round(r.xw) + ' of ' + Math.round(r.tw) + ')');
    ok(r.h >= 36, T + 'Remove is still a comfortable target (' + Math.round(r.h) + ' px)');
    if (w >= 900) ok(r.gapRight < 4, T + 'the tiles fill the row, no empty right half (gap ' + Math.round(r.gapRight) + ' px)');
    ok(r.chBlock, T + 'the 24 h change sits on its own line under the price source');
    ok(!errs.length, T + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
