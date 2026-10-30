// Live market value, step 1 (owner, 30 Oct; docs/LIVE_MARKET_VALUE.md). A wealth item can be valued from its metal
// weight and purity at the price in Precious metals, or from a holding's price in Stocks and shares. The user's own
// figure is kept and used whenever a link cannot be priced; every linked value shows its working.
// Run: node tests/test_live_value.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[1100, 'dark'], [390, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => { if (localStorage.getItem('pos_al1')) return; localStorage.setItem('vi_theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
      localStorage.setItem('pos_al1', JSON.stringify({ otherAssets: [{ id: 1, name: 'Wedding ring', value: 300 }], metalPrices: { gold: 2000, silver: 25, platinum: 800, palladium: 900, lastUpdated: new Date().toISOString() }, stocks: [{ id: 7, sym: 'VWRL', name: 'Vanguard FTSE All-World', units: 10, price: 100, updated: Date.now() }] })); }, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(t => { if ((document.documentElement.dataset.theme || 'dark') !== t && window.viToggleTheme) viToggleTheme(); showTab('assets'); showSubtab('assets', 'other', null); }, theme); await p.waitForSelector('#other-assets-list .wi-link-btn', { timeout: 20000 }); await p.waitForTimeout(200);
    const tile = () => p.evaluate(() => { const t = document.querySelector('#other-assets-list .wi-tile'); return { val: t.querySelector('.wi-val').textContent, btn: t.querySelector('.wi-link-btn').textContent, work: (t.querySelector('.wi-work') || {}).textContent || '', total: alTotalOther() }; });
    let t = await tile();
    ok(t.val === '£300' && t.btn === 'Link to market value' && !t.work && t.total === 300, w + ': unlinked item shows its own figure and offers the link');
    await p.click('#other-assets-list .wi-link-btn'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !document.getElementById('wi-link-modal').hidden && document.activeElement.name === 'wi-lk'), w + ': the link opens as a pop-up, focus inside');
    await p.check('input[name="wi-lk"][value="metal"]'); await p.click('#wi-link-card button[onclick="wiLinkSave()"]');
    ok(/Enter the weight/.test(await p.textContent('#wi-link-msg')), w + ': saving without a weight says why');
    ok(await p.evaluate(() => document.getElementById('wl-weight').offsetParent && !document.getElementById('wl-units').offsetParent), w + ': only the metal fields show for a metal');
    await p.selectOption('#wl-metal', 'gold'); await p.fill('#wl-weight', '10'); await p.selectOption('#wl-purity', '0.75');
    ok(/10 g × 18ct \(750\) purity = 0\.241 troy oz of fine gold × £2,000\.00\/oz = £482/.test(await p.textContent('#wi-link-prev')), w + ': preview shows the working before saving');
    await p.click('#wi-link-card button[onclick="wiLinkSave()"]'); await p.waitForTimeout(200);
    t = await tile();
    ok(t.val === '£482' && t.btn === 'Linked' && Math.abs(t.total - 10 * 0.75 / 31.1034768 * 2000) < 0.01, w + ': 10 g of 18ct gold at £2,000/oz = £482, counted in the total (' + JSON.stringify(t) + ')');
    ok(/Show working/.test(t.work) && /Gold spot price, checked/.test(t.work) && /Your own figure: £300/.test(t.work) && /Not financial advice/.test(t.work), w + ': show working names the source, the time, the own figure and the guard rail');
    ok(await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('pos_al1')).otherAssets[0]; return a.link.type === 'metal' && a.value === 300; }), w + ': link saved; own figure kept');
    await p.reload(); await p.waitForFunction(() => typeof wiValue === 'function' && typeof showTab === 'function', null, { timeout: 20000 }); await p.waitForTimeout(600); await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'other', null); }); await p.waitForSelector('#other-assets-list .wi-link-btn', { timeout: 20000 }); await p.waitForTimeout(200);
    t = await tile(); ok(t.val === '£482' && errs.length === 0, w + ': after a reload the linked value is still worked out (startup order)');
    await p.evaluate(() => updateMetalPrice('gold', 2200)); await p.evaluate(() => renderAlTab());
    t = await tile(); ok(t.val === '£530' && /your price in Precious metals/.test(t.work), w + ': a typed metal price is used and named as yours');
    await p.evaluate(() => { delete alState.metalPrices.lastUpdated; delete alState.metalPrices.manualAt; renderAlTab(); });
    t = await tile(); ok(t.val === '£300' && t.btn === 'Link paused' && /No gold price yet/.test(t.work), w + ': with no price checked, the own figure is shown and the tile says why');
    await p.evaluate(() => { alState.metalPrices.lastUpdated = new Date().toISOString(); alState.otherAssets[0].linkSnap = { v: 400, at: Date.now() - 3 * 864e5 }; renderAlTab(); });
    t = await tile(); ok(/\+£130 since/.test(t.work), w + ': the change since the last reading is shown (' + t.work.slice(0, 160) + ')');
    // holding
    await p.click('#other-assets-list .wi-link-btn'); await p.check('input[name="wi-lk"][value="holding"]'); await p.fill('#wl-units', '5');
    await p.click('#wi-link-card button[onclick="wiLinkSave()"]'); await p.waitForTimeout(200);
    t = await tile(); ok(t.val === '£500' && /5 × £100\.00 \(VWRL\) = £500/.test(t.work) && /VWRL live price/.test(t.work), w + ': 5 units of VWRL at £100 = £500');
    await p.evaluate(() => { alState.stocks = []; renderAlTab(); });
    t = await tile(); ok(t.val === '£300' && /no longer in Stocks and shares/.test(t.work), w + ': a removed holding falls back to the own figure');
    // unlink
    await p.click('#other-assets-list .wi-link-btn'); await p.check('input[name="wi-lk"][value="manual"]'); await p.click('#wi-link-card button[onclick="wiLinkSave()"]'); await p.waitForTimeout(200);
    t = await tile(); ok(t.val === '£300' && t.btn === 'Link to market value' && await p.evaluate(() => !JSON.parse(localStorage.getItem('pos_al1')).otherAssets[0].link), w + ': back to my own figure removes the link');
    // contrast of the new text
    await p.evaluate(() => { alState.otherAssets[0].link = { type: 'metal', metal: 'gold', grams: 10, purity: 0.75, label: '18ct (750)', unit: 'g' }; renderAlTab(); document.querySelector('.wi-work').open = true; });
    const cr = await p.evaluate(() => { const bg = e => { while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && !/, 0\.\d+\)$/.test(c)) return c; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; };
      return ['.wi-link-btn', '.wi-work summary', '.wi-src', '.wi-work>div'].map(s => { const e = document.querySelector('#other-assets-list ' + s); return [s, getComputedStyle(e).color, bg(e)]; }); });
    const low = cr.filter(([s, c, g]) => ratio(c, g) < 4.5); ok(low.length === 0, w + ' ' + theme + ': new text passes AA ' + JSON.stringify(low));
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, w + ': no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
