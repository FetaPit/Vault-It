// Cash and precious metals in 3D, on the Net worth in 3D stage with its gold tags (owner, 30 and 31 Oct). Cash: 1 coin = 1 unit
// of the chosen currency at its real size, stacks of 10, 10 by 10 per block of 1,000. Metals: standard bars from
// the weight held, sized by each metal's density, valued at the live price. Run: node tests/test_vault3d.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); if (localStorage.getItem('pos_al1')) return; localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
      localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [{ id: 5, name: 'Savings', type: 'Savings', balance: 2000 }], physicalCash: [{ id: 1, where: 'Safe', amount: 347, date: '2026-10-01' }], metals: { gold: 40, silver: 20, platinum: 0, palladium: 0 }, metalPrices: { gold: 2000, silver: 25, platinum: 800, palladium: 900 } })); }, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner{display:none!important}' });
    await p.evaluate(() => showTab('assets')); await p.waitForTimeout(1200);
    const c = await p.evaluate(() => { const V = V3.cash; return { canvas: !!document.querySelector('#cashSceneCard canvas.v3-canvas'), svg: getComputedStyle(document.getElementById('cashSvg')).display, st: V.stats, bg: V.sc.background ? V.sc.background.getHexString() : 'none', alpha: V.r.getClearAlpha(), hostBg: getComputedStyle(document.querySelector('#cashSceneCard .v3-host')).backgroundColor, fog: V.sc.fog.color.getHexString(), grid: !!V.grid, deco: !!V.deco, tags: (() => { const t = []; V.root.traverse(o => { if (o.userData && o.userData.v3Tag) t.push(o.userData.v3Tag); }); return t; })(), cap: document.getElementById('cashCap').textContent }; });
    ok(c.canvas && c.svg === 'none', theme + ': cash is a 3D scene (the old drawing is hidden)');
    ok(c.bg === 'none' && c.alpha === 0 && c.hostBg === 'rgb(8, 8, 8)' && c.fog === '080808' && c.grid && c.deco, theme + ': the Net worth in 3D stage: black stage through a clear canvas, glowing grid, gold-edged plinth (owner, 31 Oct)');
    ok(c.tags.length === 1 && c.tags[0][0] === 'Cash · £1 coins' && c.tags[0][1] === '£2,347', theme + ': the cash tag is the gold dashboard tag on a post (' + JSON.stringify(c.tags) + ')');
    ok(c.st.units === 2347 && c.st.fullStacks === 234 && c.st.rest === 7 && c.st.fullBlocks === 2 && Math.abs(c.st.stackHeight - 2.8) < 1e-9, theme + ': £2,347 = 2,347 £1 coins: 234 stacks of 10 + 7, 2 full blocks, stacks 28 mm high (' + JSON.stringify(c.st) + ')');
    ok(/23\.43 mm across, 2\.8 mm thick/.test(c.cap) && /2 full blocks of 1,000 \+ 347 coins/.test(c.cap), theme + ': caption gives the real coin size and the blocks');
    if (theme === 'dark') {
      await p.evaluate(() => { window.VI_CURRENCY = 'USD'; _applyCurrency(); renderCashISO(); }); await p.waitForTimeout(300);
      const u = await p.evaluate(() => V3.cash.stats); ok(u.coin === '$1' && u.units === Math.floor(2347 * 1.27), 'in dollars: $1 coins, 1 coin per dollar (' + u.units + ')');
      await p.evaluate(() => { window.VI_CURRENCY = 'GBP'; _applyCurrency(); renderCashISO(); });
    }
    await p.evaluate(() => showSubtab('assets', 'metals', null)); await p.waitForTimeout(1200);
    const m = await p.evaluate(() => { const V = V3.metals; const pos = V.cam.position.clone(); V.zoom(0.85); const closer = V.cam.position.distanceTo(V.ctl.target) < pos.distanceTo(V.ctl.target); resetMetalsView(); return { st: V.stats, bg: V.sc.background ? V.sc.background.getHexString() : 'none', tags: (() => { const t = []; V.root.traverse(o => { if (o.userData && o.userData.v3Tag) t.push(o.userData.v3Tag[0] + '|' + o.userData.v3Tag[1]); }); return t; })(), closer, back: V.cam.position.distanceTo(V.home.p) < 1e-6, on: window._v3MetalsOn, cap: document.getElementById('metalsCap').textContent }; });
    const g = m.st.gold;
    ok(m.bg === 'none' && m.on, theme + ': metals in the same environment');
    ok(m.tags.join() === 'Gold · 40.00 oz|£80,000,Silver · 20.00 oz|£500', theme + ': gold and silver tags in the dashboard style (' + m.tags.join(', ') + ')');
    ok(g['1 kg'].n === 1 && g['100 g'].n === 2 && g['1 oz'].n === 1 && Math.abs(g.rest_g - (40 * 31.1035 - 1000 - 200 - 31.1035)) < 0.05, theme + ': 40 oz gold = 1 kg bar + 2 x 100 g + 1 oz + ' + g.rest_g + ' g');
    ok(Math.abs(g['1 kg'].h - 1000 / 19.32 / (11.6 * 5.2)) < 0.002 && !m.st.silver['1 kg'] && m.st.silver['100 g'].n === 6, theme + ': bar thickness from the metal\'s density (gold kilo ' + g['1 kg'].h + ' cm); 20 oz silver = 6 x 100 g + rest');
    ok(m.closer && m.back, theme + ': zoom and reset buttons drive the 3D view');
    ok(/1\.24 kg/.test(m.cap) && /live price/.test(m.cap), theme + ': caption gives the weight and says the value is at the live price');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
