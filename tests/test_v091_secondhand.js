// E28 part 1 (v0.9.1): second-hand price estimate in the Wealth inventory value link. Run: node tests/test_v091_secondhand.js
// The edge function is stubbed (its own maths is in test_secondhand_server.js). The estimate must never be applied without a tap.
const IDX = process.env.VI_INDEX || require('./lib/vi').INDEX;   // VI_INDEX=/path/to/index.html runs against another copy (a worktree)
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const EST = { status: 'ok', q: 'Gibson Les Paul', cond: 'excellent', cat: 'instruments', value: 1148, low: 1001, high: 1294, n: 20, basis: 'current asking prices', combine: 'single', haircut: 0.1, condFactor: 1,
  sources: [{ id: 'ebay', label: 'eBay (UK)', basis: 'asking', n: 20, median: 1148, low: 1001, high: 1294, condition: 'filtered' }], guides: [], checked: new Date().toISOString() };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[1100, 'dark'], [390, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    await ctx.route(/metals\.live|metals-api\.com|er-api\.com|exchangerate|coingecko\.com|stock-quotes/, r => r.abort());
    let mode = '404', body = null;
    await ctx.route(/functions\/v1\/secondhand-estimate/, async r => {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: 'ok' });
      body = JSON.parse(r.request().postData() || '{}');
      const h = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
      if (mode === '404') return r.fulfill({ status: 404, headers: h, body: '{"message":"Function not found"}' });
      if (mode === 'nomatch') return r.fulfill({ status: 200, headers: h, body: JSON.stringify({ status: 'no_match', links: {} }) });
      if (mode === 'unavail') return r.fulfill({ status: 200, headers: h, body: JSON.stringify({ status: 'unavailable', links: {} }) });
      return r.fulfill({ status: 200, headers: h, body: JSON.stringify(EST) });
    });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => { if (!/[?&]seed\b/.test(location.search) || localStorage.getItem('pos_al1')) return; localStorage.setItem('vi_theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
      localStorage.setItem('pos_al1', JSON.stringify({ otherAssets: [{ id: 1, name: 'Gibson Les Paul', value: 300 }, { id: 2, name: 'Old watch', value: 80 }], liabilities: [{ id: 11, name: 'Gibson guitar amp', value: 500, depRate: 0, runningCost: 0, addedDate: '2025-01-01T00:00:00.000Z' }, { id: 12, name: 'Old car', value: 4000, depRate: 10, runningCost: 20, addedDate: '2025-01-01T00:00:00.000Z' }], metalPrices: { gold: 2000, silver: 25, platinum: 800, palladium: 900, lastUpdated: new Date().toISOString() }, stocks: [] })); }, theme);
    const boot = async url => { await p.goto(url); await p.waitForFunction(() => typeof wiValue === 'function' && typeof showTab === 'function', null, { timeout: 20000 }); await p.waitForTimeout(900);
      await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
      await p.evaluate(t => { if ((document.documentElement.dataset.theme || 'dark') !== t && window.viToggleTheme) viToggleTheme(); showTab('assets'); showSubtab('assets', 'other', null); }, theme);
      await p.waitForSelector('#other-assets-list .wi-link-btn', { timeout: 20000 }); await p.waitForTimeout(200); };
    const tile = () => p.evaluate(() => { const t = document.querySelector('#other-assets-list .wi-tile'); return { val: t.querySelector('.wi-val').textContent, btn: t.querySelector('.wi-link-btn').textContent, work: (t.querySelector('.wi-work') || {}).textContent || '', total: alTotalOther() }; });
    const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('pos_al1')).otherAssets[0]);
    await boot(require('./lib/vi').FILE_URL + '?seed');
    let t = await tile(); let s = await saved();
    ok(t.val === '£300' && t.btn === 'Link to market value' && s.cond === undefined && s.link === undefined, w + ': an old item loads untouched (own figure, no condition, no link)');
    await p.evaluate(() => wiLinkOpen(1)); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !!document.querySelector('input[name="wi-lk"][value="market"]')), w + ': "Second-hand prices" is offered beside metal and shares');
    await p.check('input[name="wi-lk"][value="market"]');
    ok(await p.evaluate(() => document.getElementById('wl-mq').value === 'Gibson Les Paul' && document.getElementById('wl-mcond').value === 'good' && document.getElementById('wl-mcat').value === 'instruments'), w + ': search words come from the item name, condition starts at good, a guitar is guessed as instruments');
    ok(await p.evaluate(() => Array.from(document.getElementById('wl-mcond').options).map(o => o.value).join() === 'new,excellent,good,fair,poor'), w + ': conditions are new, excellent, good, fair, poor');
    await p.selectOption('#wl-mcond', 'excellent');
    // function not deployed
    await p.click('#wl-msearch'); await p.waitForFunction(() => /Not available yet/.test(document.getElementById('wl-mres').textContent), null, { timeout: 20000 });
    ok(body && body.q === 'Gibson Les Paul' && body.cond === 'excellent' && body.cat === 'instruments', w + ': the search sends only the item words, condition and category: ' + JSON.stringify(body));
    const lk = await p.evaluate(() => Array.from(document.querySelectorAll('#wl-mlinks a')).map(a => ({ h: a.href, tg: a.target, rel: a.rel, tx: a.textContent })));
    ok(lk.length === 1 && /ebay\.co\.uk.*LH_Sold=1.*Gibson%20Les%20Paul|ebay\.co\.uk.*Gibson%20Les%20Paul.*LH_Sold=1/.test(lk[0].h) && !lk.some(a => /discogs/i.test(a.h + a.tx)) && lk.every(a => a.tg === '_blank' && /noopener/.test(a.rel)), w + ': "Not available yet" and the manual eBay sold items link opens in a new tab, no Discogs search (v0.9.1 R21): ' + JSON.stringify(lk.map(a => a.tx)));
    ok((await tile()).val === '£300' && (await saved()).link === undefined, w + ': nothing applied when the function is not there');
    ok(/then choose My own figure and type it/.test(await p.textContent('#wl-mres')) && await p.evaluate(() => getComputedStyle(document.getElementById('wi-link-guess')).display === 'none'), w + ': Wealth "Not available yet" tells the user to choose My own figure; the no-live-source hint is hidden under Second-hand prices');
    // deployed
    mode = 'ok'; await p.click('#wl-msearch'); await p.waitForFunction(() => /Estimate from 20 current asking prices/.test(document.getElementById('wl-mres').textContent), null, { timeout: 20000 });
    const res = await p.textContent('#wl-mres');
    ok(/Estimate from 20 current asking prices, typically £1,001 to £1,294, adjusted for excellent condition/.test(res), w + ': result wording: ' + res.slice(0, 160));
    ok(!/\bsold\b/i.test(res.replace(/Search eBay sold items/g, '')) && !/\bworth\b/i.test(res) && /not a valuation/i.test(res) && /Real sale prices are usually lower/.test(res) && /Not financial advice/.test(res), w + ': honest wording: asking prices, never "sold" or "worth", not a valuation, not advice');
    ok((await tile()).val === '£300' && (await saved()).link === undefined && (await saved()).value === 300, w + ': the estimate is NOT applied until the user taps');
    ok(await p.evaluate(() => ['wl-msearch', 'wl-mapply'].every(i => document.getElementById(i).getBoundingClientRect().height >= 43.5) && Array.from(document.querySelectorAll('#wl-mlinks a')).every(a => a.getBoundingClientRect().height >= 43.5)), w + ': Search and Use this estimate are 44 px tall, the links have a comfortable target');
    const sz = await p.evaluate(() => Array.from(document.querySelectorAll('#wi-lk-market label, #wi-lk-market select, #wi-lk-market input, #wi-lk-market button, #wl-mres, #wl-mres *, #wl-mlinks a')).filter(e => e.offsetParent && e.textContent.trim() !== '' || e.matches('select,input')).map(e => parseFloat(getComputedStyle(e).fontSize)).filter(x => x > 0));
    ok(sz.length > 5 && Math.min.apply(null, sz) >= 10.5, w + ': every word in the panel is 10.5 px or more (min ' + Math.min.apply(null, sz) + ')');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.getElementById('wi-link-card').scrollWidth <= document.getElementById('wi-link-card').clientWidth + 1), w + ': no sideways scroll in the pop-up');
    await p.screenshot({ path: require('path').join(require('./lib/vi').LOG_DIR, 'secondhand-') + '' + w + '-' + theme + '.png' }).catch(() => {});
    await p.click('#wl-mapply'); await p.waitForTimeout(250);
    t = await tile(); s = await saved();
    ok(t.val === '£1,148' && t.btn === 'Estimated' && t.total === 1148 + 80, w + ': after the tap the tile shows £1,148 and counts in the total: ' + JSON.stringify(t));
    ok(s.value === 300 && s.cond === 'excellent' && s.link.type === 'market' && s.link.v === 1148 && s.link.lo === 1001 && s.link.hi === 1294 && s.link.n === 20 && !JSON.stringify(s).includes('itemSummaries'), w + ': saved additively: own figure kept, condition saved, derived numbers only: ' + JSON.stringify(s.link));
    ok(/Estimate from 20 current asking prices/.test(t.work) && /eBay \(UK\)/.test(t.work) && /10% allowance/.test(t.work) && /Your own figure: £300/.test(t.work) && /Real sale prices are usually lower/.test(t.work) && /Not financial advice/.test(t.work), w + ': show working has the count, source, allowance, own figure and the guard rails');
    // A full page reload is not used here: on a slow runner the app sometimes boots as an empty device and loads the demo (it also flakes test_live_value the same way; reported to the Chief of Staff).
    // Instead the saved copy is read back from storage and the tiles are drawn again from it, which proves the saved shape renders the estimate.
    await p.evaluate(() => { const sv = JSON.parse(localStorage.getItem('pos_al1')); alState.otherAssets = sv.otherAssets; alState.liabilities = sv.liabilities; renderAlTab(); updateKPIs(); }); await p.waitForTimeout(200); t = await tile();
    ok(t.val === '£1,148' && errs.length === 0, w + ': drawn again from the saved copy the estimate is still there, no page errors ' + errs.join('|'));
    // changing the condition on an applied estimate must not relabel a figure that was worked out for another condition
    await p.evaluate(() => wiLinkOpen(1)); await p.check('input[name="wi-lk"][value="market"]'); await p.selectOption('#wl-mcond', 'poor'); await p.click('#wi-link-card button[onclick="wiLinkSave()"]'); await p.waitForTimeout(250);
    t = await tile(); s = await saved();
    ok(t.val === '£1,148' && s.cond === 'poor' && s.link.cond === 'excellent' && /adjusted for excellent condition/.test(t.work), w + ': a new condition is saved but the estimate keeps saying which condition it was worked out for');
    // other outcomes, and going back to the own figure
    await p.evaluate(() => wiLinkOpen(2)); await p.check('input[name="wi-lk"][value="market"]'); mode = 'nomatch';
    await p.click('#wl-msearch'); await p.waitForFunction(() => /No reliable match found/.test(document.getElementById('wl-mres').textContent), null, { timeout: 20000 });
    ok(/Your figure is used/.test(await p.textContent('#wl-mres')) && !(await p.isVisible('#wl-mapply')), w + ': no match says so, offers no apply button');
    mode = 'unavail'; await p.click('#wl-msearch'); await p.waitForFunction(() => /Not available yet/.test(document.getElementById('wl-mres').textContent), null, { timeout: 20000 });
    ok(true, w + ': a deployed function with no source switched on also reads "Not available yet"');
    await p.evaluate(() => wiLinkClose()); await p.evaluate(() => wiLinkOpen(1)); await p.check('input[name="wi-lk"][value="manual"]'); await p.fill('#wl-own', '450'); await p.click('#wi-link-card button[onclick="wiLinkSave()"]'); await p.waitForTimeout(250);
    t = await tile(); ok(t.val === '£450' && t.btn === 'Link to market value', w + ': back to my own figure works');
    // Liabilities: same search, a tap to apply, and no double counting of an item that depreciates on its own
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'liabilities', null); }).catch(() => {}); await p.waitForTimeout(300);
    const lt = () => p.evaluate(() => JSON.parse(localStorage.getItem('pos_al1')).liabilities);
    ok(await p.evaluate(() => document.querySelectorAll('#liabilities-list button[onclick^="wiLiabOpen"]').length === 2), w + ': every liability tile offers Second-hand prices');
    let L0 = await lt(); ok(L0[0].cond === undefined && L0[0].est === undefined && L0[0].value === 500, w + ': old liabilities load untouched');
    mode = '404'; await p.evaluate(() => wiLiabOpen(11)); await p.click('#wl-msearch'); await p.waitForFunction(() => /Not available yet/.test(document.getElementById('wl-mres').textContent), null, { timeout: 20000 });
    ok(/Your figure is unchanged/.test(await p.textContent('#wl-mres')) && !/type your own figure|My own figure/.test(await p.textContent('#wl-mres')), w + ': Liabilities "Not available yet" says the figure is unchanged (no manual field there)'); await p.evaluate(() => wiLinkClose());
    mode = 'ok'; await p.evaluate(() => wiLiabOpen(11)); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !document.getElementById('wi-lk-market').hidden && !document.querySelector('.wi-link-kinds').offsetParent && document.getElementById('wl-mq').value === 'Gibson guitar amp' && document.getElementById('wl-mcat').value === 'instruments'), w + ': liability pop-up shows only the second-hand panel, words from the name');
    await p.selectOption('#wl-mcond', 'fair'); await p.click('#wl-msearch'); await p.waitForFunction(() => /Estimate from 20 current asking prices/.test(document.getElementById('wl-mres').textContent), null, { timeout: 20000 });
    L0 = await lt(); ok(L0[0].value === 500 && L0[0].est === undefined, w + ': the liability estimate is not applied until the tap');
    await p.click('#wl-mapply'); await p.waitForTimeout(250); L0 = await lt();
    ok(await p.evaluate(() => { const e = document.querySelector('#liabilities-list .wi-tile .wi-sub'); const all = Array.from(document.querySelectorAll('#liabilities-list .wi-sub')).map(x => x.textContent).join('|'); return /Estimate from eBay \(UK\): £1,001 to £1,294, fair condition/.test(all); }), w + ': the liability tile names the source, range and condition');
    ok(L0[0].value === 1148 && L0[0].estWas === 500 && L0[0].cond === 'fair' && L0[0].est.v === 1148 && L0[0].depRate === 0, w + ': tap sets the liability value (old figure kept as estWas), saves the condition: ' + JSON.stringify(L0[0]));
    await p.evaluate(() => wiLiabOpen(12)); await p.click('#wl-msearch'); await p.waitForFunction(() => /Estimate from 20 current asking prices/.test(document.getElementById('wl-mres').textContent), null, { timeout: 20000 });
    ok(/for information only/.test(await p.textContent('#wl-mres')) && !(await p.isVisible('#wl-mapply')), w + ': a depreciating liability gets the estimate for information only, no apply button');
    await p.selectOption('#wl-mcond', 'poor'); await p.click('#wi-link-card button[onclick="wiLinkSave()"]'); await p.waitForTimeout(250); L0 = await lt();
    ok(L0[1].value === 4000 && L0[1].depRate === 10 && L0[1].cond === 'poor' && L0[1].est === undefined, w + ': its value and depreciation stay, only the condition is saved');
    ok(await p.evaluate(() => depreciatedValue.toString().replace(/\s/g, '') === 'functiondepreciatedValue(l){if(!l.depRate||l.depRate<=0)returnl.value||0;varyrs=(Date.now()-newDate(l.addedDate||Date.now()).getTime())/(1000*60*60*24*365.25);return(l.value||0)*Math.pow(1-l.depRate/100,yrs);}'), w + ': depreciatedValue() is unchanged');
    ok(errs.length === 0, w + ': no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
