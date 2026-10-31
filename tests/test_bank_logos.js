// Bank and platform logos (owner, 31 Oct evening): "auto adding logos for all major banks and investment platforms which will
// auto apply looking at each account's name". Cash accounts show their bank's logo from the account name (the same logo service
// the investment platforms already use, named in the privacy notice); an unknown name shows the brand bank icon; offline, the
// logo falls back to the brand's initials. Investment pies named after a platform get its logo, with more platforms known.
// Run: node tests/test_bank_logos.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[1100, 'dark'], [390, 'light']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await ctx.route(/^https?:\/\//, r => r.abort());   // offline: logos must fall back cleanly
    await p.addInitScript(t => {
      if (localStorage.getItem('pos_al1')) return;
      localStorage.setItem('vi_theme', t); localStorage.setItem('vi_declined_demo', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [
        { id: 1, name: 'Monzo pot', type: 'Current', balance: 100 }, { id: 2, name: 'Barclays Everyday Saver', type: 'Savings', balance: 200 },
        { id: 3, name: 'Chase saver', type: 'Savings', balance: 300 }, { id: 4, name: 'Nationwide FlexDirect', type: 'Current', balance: 400 },
        { id: 5, name: 'Purchase fund', type: 'Savings', balance: 50 }, { id: 6, name: 'Rainy day', type: 'Savings', balance: 60 },
        { id: 7, name: 'NS&I Premium Bonds', type: 'Savings', balance: 70 }, { id: 8, name: '<img src=x onerror=alert(1)>', type: 'Savings', balance: 1 }],
        stockPies: [{ id: 1, name: 'InvestEngine ISA', holdings: [] }, { id: 2, name: 'PensionBee', holdings: [] }], metalPrices: {}, crypto: [] }));
    }, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    await p.evaluate(t => { if ((document.documentElement.dataset.theme || 'dark') !== t && window.viToggleTheme) viToggleTheme(); showTab('assets'); showSubtab('assets', 'cash', null); }, theme);
    await p.waitForTimeout(900);
    const T = w + ' ' + theme + ': ';
    const rows = await p.evaluate(() => [...document.querySelectorAll('#cash-table tbody tr')].map(r => { const c = r.querySelector('td'), im = c.querySelector('img'), mono = c.querySelector('.stk-mono'), ic = c.querySelector('svg use');
      return { name: c.textContent.trim(), dom: im ? (im.getAttribute('src').match(/domain=([^&]+)/) || [])[1] : '', imgShown: im ? getComputedStyle(im).display !== 'none' : false, mono: mono ? getComputedStyle(mono).display !== 'none' && mono.textContent : '', icon: ic ? ic.getAttribute('href') : '' }; }));
    const d = n => (rows.find(r => r.name.indexOf(n) >= 0) || {});
    ok(d('Monzo').dom === 'monzo.com' && d('Barclays').dom === 'barclays.co.uk' && d('Chase').dom === 'chase.co.uk' && d('Nationwide').dom === 'nationwide.co.uk' && d('NS&I').dom === 'nsandi.com', T + 'each account gets its bank\'s logo from its name (' + rows.slice(0, 4).map(r => r.dom).join(', ') + ', ' + d('NS&I').dom + ')');
    ok(!d('Purchase').dom && d('Purchase').icon === '#vi-bank' && !d('Rainy').dom && d('Rainy').icon === '#vi-bank', T + 'no false match ("Purchase" is not Chase); an unknown name shows the brand bank icon');
    ok(d('Monzo').mono && !d('Monzo').imgShown, T + 'offline the logo falls back to the bank\'s initials (' + d('Monzo').mono + ')');
    ok(await p.evaluate(() => !document.querySelector('#cash-table img[src="x"]') && /img src=x/.test(document.querySelector('#cash-table tbody tr:last-child td').textContent)), T + 'account names are shown as text, never as markup');
    // brands that are also everyday words only match as a bank name (QC, 31 Oct)
    const fm = await p.evaluate(() => ['Be wise', 'Wise investments', 'Learning curve', 'Yield curve ISA', 'Marcus pocket money', 'Tandem savings plan with Sam', 'Tesco shopping', 'Sainsbury shop', 'Nest egg']
      .map(n => [n, (stkPlatformMatch(n) || {}).n || ''])), tm = await p.evaluate(() => ['Wise', 'Wise GBP', 'Curve card', 'Marcus savings', 'Marcus by Goldman Sachs', 'Tandem', 'Tesco Bank saver', "Sainsbury's Bank ISA", 'Nest pension', 'Barclaycard'].map(n => [n, (stkPlatformMatch(n) || {}).n || '']));
    ok(fm.every(x => !x[1]), T + 'everyday words get no logo (' + fm.filter(x => x[1]).map(x => x.join(' -> ')).join(', ') + ')');
    ok(tm.every(x => x[1]) && tm[9][1] === 'Barclaycard', T + 'the real names still match (' + tm.map(x => x[1]).join(', ') + ')');
    // investment pies: more platforms known
    ok(await p.evaluate(() => { stkPlatformAuto(); const pp = alState.stockPies; return pp[0].platform && pp[0].platform.name === 'InvestEngine' && pp[1].platform && pp[1].platform.name === 'PensionBee'; }), T + 'pies named after a platform (InvestEngine, PensionBee) get it automatically');
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, T + 'no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
