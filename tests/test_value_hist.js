// Round 3 (8): the value of each wealth item over time. One reading a day at most, with its source (the live price
// when linked, otherwise "your figure"), newest 120 kept on the item. The link pop-up suggests a live source from the
// item's name and stays on the user's own figure when none fits (no guessed figures).
// Run: node tests/test_value_hist.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[1100, 'dark'], [390, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => {
      if (localStorage.getItem('pos_al1')) return;
      localStorage.setItem('vi_theme', t); localStorage.setItem('vi_declined_demo', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      const old = Array.from({ length: 130 }, (_, k) => ({ d: '2025-0' + (1 + (k % 9)) + '-' + String(1 + (k % 28)).padStart(2, '0'), v: 100 + k, src: 'your figure' }));
      localStorage.setItem('pos_al1', JSON.stringify({ otherAssets: [
        { id: 1, name: 'Gold sovereign', value: 400, valHist: [{ d: '2026-09-01', v: 350, src: 'your figure' }, { d: '2026-10-01', v: 380, src: 'your figure' }] },
        { id: 2, name: 'Oil painting', value: 900 },
        { id: 3, name: 'VWRL in old ISA', value: 1000 },
        { id: 4, name: 'Old watch', value: 500, valHist: old }],
        metalPrices: { gold: 2000, silver: 25, platinum: 800, palladium: 900, lastUpdated: new Date().toISOString() },
        stocks: [{ id: 7, sym: 'VWRL', name: 'Vanguard FTSE All-World', units: 1, avgCost: 90, price: 100, updated: new Date().toISOString() }] }));
    }, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(t => { if ((document.documentElement.dataset.theme || 'dark') !== t && window.viToggleTheme) viToggleTheme(); showTab('assets'); showSubtab('assets', 'other', null); }, theme);
    await p.waitForSelector('#other-assets-list .wi-link-btn', { timeout: 20000 }); await p.waitForTimeout(300);
    const today = await p.evaluate(() => wiDay());
    const item = id => p.evaluate(id => alState.otherAssets.find(a => a.id === id), id);
    const tileOf = n => p.evaluate(n => { const t = [...document.querySelectorAll('#other-assets-list .wi-tile')][n]; const h = t.querySelector('.wi-hist'); return { val: t.querySelector('.wi-val').textContent, hist: h ? h.textContent : '', title: h ? h.title : '', pts: h ? h.querySelector('polyline').getAttribute('points').split(' ').length : 0 }; }, n);

    let a = await item(1);
    ok(a.valHist.length === 3 && a.valHist[2].d === today && a.valHist[2].v === 400 && a.valHist[2].src === 'your figure', w + ': opening the tab adds today\'s reading with its source');
    let t = await tileOf(0);
    ok(t.pts === 3 && /^\+£50 since 1 Sept$/.test(t.hist) && /£350 on 1 Sept 2026, £400 now \(\+£50\), 3 readings/.test(t.title), w + ': the tile shows a line of the readings and the change (' + t.hist + ')');
    ok((await tileOf(1)).hist === '', w + ': one reading draws no line yet');
    await p.evaluate(() => { renderAlTab(); renderAlTab(); });
    ok((await item(1)).valHist.length === 3, w + ': one reading a day at most');
    a = await item(4); ok(a.valHist.length === 120 && a.valHist[119].d === today, w + ': only the newest 120 readings are kept');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('pos_al1')).otherAssets[0].valHist.length === 3), w + ': the history is saved with the item');

    // source suggestion from the name
    const open = async n => { await p.locator('#other-assets-list .wi-link-btn').nth(n).click(); await p.waitForTimeout(120); return p.evaluate(() => ({ k: document.querySelector('input[name="wi-lk"]:checked').value, metal: document.getElementById('wl-metal').value, stock: document.getElementById('wl-stock').value, why: document.getElementById('wi-link-guess').textContent })); };
    let g = await open(0);
    ok(g.k === 'metal' && g.metal === 'gold' && /looks like gold/.test(g.why), w + ': a sovereign suggests gold by weight (' + g.why + ')');
    ok(await p.evaluate(() => document.getElementById('wl-weight').value === ''), w + ': no weight is filled in for the user');
    await p.evaluate(() => wiLinkClose());
    g = await open(2); ok(g.k === 'holding' && g.stock === '7' && /matches VWRL/.test(g.why), w + ': a name with a held ticker suggests that holding');
    await p.evaluate(() => wiLinkClose());
    g = await open(1); ok(g.k === 'manual' && /No live price source found for "Oil painting"\. Your own figure is used/.test(g.why), w + ': no source found: stays on the own figure and says so');

    // a change to the own figure is kept
    await p.fill('#wl-own', '950'); await p.click('#wi-link-card button[onclick="wiLinkSave()"]'); await p.waitForTimeout(200);
    a = await item(2); ok(a.value === 950 && a.valHist.length === 1 && a.valHist[0].v === 950, w + ': editing the own figure updates today\'s reading');
    ok((await tileOf(1)).val === '£950', w + ': the tile shows the new figure');
    await p.locator('#other-assets-list .wi-link-btn').nth(1).click(); await p.fill('#wl-own', ''); await p.click('#wi-link-card button[onclick="wiLinkSave()"]');
    ok(/Enter your figure/.test(await p.textContent('#wi-link-msg')), w + ': an empty figure is refused');
    await p.evaluate(() => wiLinkClose());

    // a linked reading names its live source
    await p.evaluate(() => { const a = alState.otherAssets[0]; a.link = { type: 'metal', metal: 'gold', grams: 7.98, purity: 0.9167, label: '22ct', unit: 'g' }; renderAlTab(); });
    a = await item(1); const last = a.valHist[a.valHist.length - 1];
    ok(a.valHist.length === 3 && /Gold spot price/.test(last.src) && Math.abs(last.v - 7.98 * 0.9167 / 31.1034768 * 2000) < 0.01, w + ': linked: today\'s reading is the live value, source named (' + JSON.stringify(last) + ')');
    ok(await p.evaluate(() => /Latest from Gold spot price/.test(document.querySelector('#other-assets-list .wi-hist').title)), w + ': the line says where the latest reading came from');
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, w + ': no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
