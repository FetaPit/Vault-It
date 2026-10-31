// Icons (owner, 31 Oct evening): "We need to pull the actual icons for each crypto like before. Remove the childish icons from the
// liabilities and wealth inventory. Leave blank until user decides. Improve our icon library for these by aligning with brand book.
// I like the blocks as a base though."
// Coin logos for the common coins are embedded (CC0 set), so they show with no network; other coins still try jsDelivr; no emoji
// fallback. Inventory and liabilities items show the brand block, blank until the user picks a brand icon; old emoji choices show
// as the matching brand icon (saved data untouched). Run: node tests/test_icons.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const EMOJI = /\p{Extended_Pictographic}/u;
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[1100, 'dark'], [390, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await ctx.route(/cdn\.jsdelivr\.net\/gh\/|coingecko/, r => r.abort());   // no network for logos or prices: embedded logos must still show
    await p.addInitScript(t => {
      if (localStorage.getItem('pos_al1')) return;
      localStorage.setItem('vi_theme', t); localStorage.setItem('vi_declined_demo', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('pos_al1', JSON.stringify({
        crypto: [{ id: 1, sym: 'BTC', amount: 0.1, price: 50000 }, { id: 2, sym: 'ETH', amount: 1, price: 2000 }, { id: 3, sym: 'ZZQ', amount: 5, price: 1 }],
        otherAssets: [{ id: 11, name: 'Rolex watch', value: 5000 }, { id: 12, name: 'Old car', value: 3000, svgIcon: '🚗' }, { id: 13, name: 'Guitar', value: 800, svgIcon: 'guitar' }, { id: 14, name: 'Lamp', value: 50, svgIcon: '🔦' }],
        liabilities: [{ id: 21, name: 'Car on finance', value: 9000, rate: 0, depRate: 10, runningCost: 120, addedDate: new Date().toISOString() }],
        metalPrices: { gold: 2000 }, stocks: [] }));
    }, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(t => { if ((document.documentElement.dataset.theme || 'dark') !== t && window.viToggleTheme) viToggleTheme(); showTab('assets'); showSubtab('assets', 'crypto', null); }, theme);
    await p.waitForTimeout(800);
    const T = w + ' ' + theme + ': ';
    // crypto
    const cr = await p.evaluate(() => [...document.querySelectorAll('#crypto-table .wi-tile')].map(t => { const im = t.querySelector('img.cr-logo'); const area = t.querySelector('.wi-img-area');
      return { src: im ? im.getAttribute('src').slice(0, 26) : '', w: im ? im.naturalWidth : 0, vis: im ? getComputedStyle(im).display !== 'none' : false, text: area.textContent, fb: (t.querySelector('.cr-glyph:not([style*="none"])') || {}).textContent || '' }; }));
    ok(cr.length === 3 && cr.slice(0, 2).every(c => /^data:image\/svg\+xml/.test(c.src) && c.w > 0 && c.vis), T + 'BTC and ETH show their own logos with no network (' + cr.slice(0, 2).map(c => c.src + ' ' + c.w).join(', ') + ')');
    ok(cr.every(c => !EMOJI.test(c.text)) && /ZZQ/.test(cr[2].fb), T + 'no emoji on any coin; a coin with no logo shows its ticker in a ring (' + JSON.stringify(cr[2].fb) + ')');
    // wealth inventory
    await p.evaluate(() => showSubtab('assets', 'other', null)); await p.waitForTimeout(500);
    const inv = () => p.evaluate(() => [...document.querySelectorAll('#other-assets-list .wi-tile')].map(t => ({ text: t.querySelector('.wi-img-area').textContent + [...t.querySelectorAll('button,label')].map(x => x.textContent).join(''), cube: !!t.querySelector('.wi-img-area svg polygon'), use: ((t.querySelector('.wi-img-area > svg use') || { getAttribute: () => '' }).getAttribute('href')) })));
    let it = await inv();
    ok(it.every(x => !EMOJI.test(x.text)), T + 'no emoji on wealth inventory tiles or their buttons');
    ok(it[0].cube && !it[0].use, T + 'an item with no icon chosen is the brand block, blank (no guess from its name)');
    ok(it[1].use === '#vi-car' && it[3].cube && !it[3].use, T + 'an old emoji choice shows the matching brand icon; one with no match is blank (' + it[1].use + ', ' + it[3].use + ')');
    ok(it[2].use === '#vi-guitar' && await p.evaluate(() => !!document.querySelector('symbol#vi-guitar') && !!document.querySelector('symbol#vi-watch')), T + 'a chosen brand icon sits on the block; new icons are in the brand sprite');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('pos_al1')).otherAssets[1].svgIcon === '🚗'), T + 'saved data is not rewritten');
    // picker
    await p.evaluate(() => wiIcon(11)); await p.waitForTimeout(200);
    const pk = await p.evaluate(() => { const m = document.querySelector('.wi-icon-picker'); return { emoji: EMOJI_TEST(m.textContent), opts: m.querySelectorAll('.wi-icon-opt use').length, blank: !!m.querySelector('.wi-icon-opt[data-k=""]') };
      function EMOJI_TEST(s) { return /\p{Extended_Pictographic}/u.test(s); } });
    ok(!pk.emoji && pk.opts >= 30 && pk.blank, T + 'the picker offers brand icons only (' + pk.opts + ') plus "no icon"');
    await p.fill('.wi-icon-picker input', 'watch'); await p.waitForTimeout(100);
    const vis = await p.evaluate(() => [...document.querySelectorAll('.wi-icon-picker .wi-icon-opt')].filter(o => o.offsetParent).map(o => o.dataset.k).join()); ok(vis === 'watch', T + 'filtering by name finds the watch (' + vis + ')');
    await p.click('.wi-icon-picker .wi-icon-opt[data-k="watch"]'); await p.waitForTimeout(200);
    it = await inv(); ok(it[0].use === '#vi-watch' && await p.evaluate(() => alState.otherAssets[0].svgIcon === 'watch' && !document.querySelector('.wi-icon-picker')), T + 'picking an icon puts it on the block and closes the picker');
    await p.evaluate(() => wiIcon(11)); await p.click('.wi-icon-picker .wi-icon-opt[data-k=""]'); await p.waitForTimeout(200);
    it = await inv(); ok(!it[0].use && await p.evaluate(() => alState.otherAssets[0].svgIcon === null), T + '"No icon" leaves the block blank again');
    // liabilities
    await p.evaluate(() => showSubtab('assets', 'liabilities', null)); await p.waitForTimeout(500);
    const li = await p.evaluate(() => { const t = document.querySelector('#liabilities-list .wi-tile'); return t ? { text: t.textContent, cube: !!t.querySelector('.wi-img-area svg polygon'), use: !!t.querySelector('.wi-img-area > svg use'), amber: (t.querySelector('.wi-img-area svg polygon') || { getAttribute: () => '' }).getAttribute('stroke') } : null; });
    ok(li && li.cube && !li.use && !EMOJI.test(li.text), T + 'a liability is the brand block, blank, with no emoji on the tile or its buttons');
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, T + 'no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
