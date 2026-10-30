// Mobile navigation (owner, 30 Oct 2026): on phones the tab icons sit in a bar fixed to the bottom of the screen and stay there while the
// page scrolls; the header keeps one row; the footer flows at the end of the page. The Connections tab has left the menu bar at every width
// and lives in Settings: showTab('connections') opens Settings at that section with the list rendered. Desktop keeps the two-row header.
// Run: node tests/test_mobile_nav.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (theme) => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi-flag-house', '0');
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }] }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }] }));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (w, theme) => {
    const mob = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, colorScheme: theme === 'dark' ? 'dark' : 'light' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + theme + ': ' + e.message));
    await p.addInitScript(seed, theme); await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal{display:none!important}' });
    return p;
  };
  const navInfo = () => {
    const t = document.getElementById('vi-tabs'), r = t.getBoundingClientRect(), n = document.getElementById('topnav').getBoundingClientRect(), f = document.getElementById('app-footer');
    const tabs = [...t.querySelectorAll('.tab-btn')].filter(x => !x.hidden && x.offsetParent !== null).map(x => ({ tab: x.dataset.tab, h: Math.round(x.getBoundingClientRect().height), w: Math.round(x.getBoundingClientRect().width) }));
    return { pos: getComputedStyle(t).position, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), navH: Math.round(n.height), tabs, footerPos: getComputedStyle(f).position,
      conn: !!t.querySelector('[data-tab="connections"]:not([hidden])'), sx: document.documentElement.scrollWidth - innerWidth, inner: innerHeight, padB: parseFloat(getComputedStyle(document.body).paddingBottom) };
  };

  for (const theme of ['dark', 'light']) {
    // ── phone ──
    let p = await open(390, theme);
    let m = await p.evaluate(navInfo);
    ok(m.pos === 'fixed' && m.bottom === m.inner && m.h >= 56, theme + ' 390: the tab bar is fixed to the bottom of the screen (' + m.pos + ', bottom ' + m.bottom + '/' + m.inner + ', ' + m.h + 'px)');
    ok(m.tabs.length === 7 && m.tabs.every(x => x.h >= 44 && x.w >= 44) && !m.conn, theme + ' 390: seven tabs, each at least 44px, Connections not among them (' + m.tabs.map(x => x.tab).join(',') + ')');
    ok(m.navH <= 50, theme + ' 390: the header keeps one row (' + m.navH + 'px)');
    ok(m.footerPos === 'static' && m.padB >= 56, theme + ' 390: the footer flows at the end of the page and the page clears the bar (' + m.footerPos + ', ' + m.padB + 'px)');
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(300);
    const m2 = await p.evaluate(navInfo);
    ok(m2.bottom === m2.inner && m2.pos === 'fixed', theme + ' 390: the bar is still there after scrolling to the end');
    ok(m2.sx <= 1, theme + ' 390: no sideways scroll (' + m2.sx + ')');
    const fca = await p.evaluate(() => { const e = document.querySelector('.vi-fca'); return !!(e && e.offsetParent && /Not regulated by the FCA\. Not financial advice\./.test(e.textContent)); });
    ok(fca, theme + ' 390: the FCA line is still on the page');
    // tabs work from the bar
    await p.evaluate(() => document.querySelector('#vi-tabs [data-tab="debt"]').click()); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.getElementById('tab-debt').classList.contains('active') && document.querySelector('#vi-tabs [data-tab="debt"]').classList.contains('active')), theme + ' 390: a bar tab opens its panel and lights up');
    // Connections lives in Settings
    await p.evaluate(() => showTab('connections')); await p.waitForTimeout(400);
    const c = await p.evaluate(() => { const sm = document.getElementById('settings-modal'), sec = document.getElementById('settings-connections'), list = document.getElementById('connections-list');
      return { open: getComputedStyle(sm).display !== 'none', inSettings: !!(sec && sm.contains(sec) && sec.contains(list)), items: list ? list.querySelectorAll('button,[onclick]').length : 0, panel: getComputedStyle(document.getElementById('tab-connections')).display, debtStill: document.getElementById('tab-debt').classList.contains('active') }; });
    ok(c.open && c.inSettings && c.items > 0 && c.panel === 'none' && c.debtStill, theme + ' 390: Connections opens Settings with the list rendered (' + c.items + ' controls), the old tab panel stays hidden');
    await p.evaluate(() => closeSettings());
    await p.context().close();

    // ── desktop ──
    p = await open(1100, theme);
    m = await p.evaluate(navInfo);
    ok(m.pos !== 'fixed' && m.top >= 40 && m.top <= 80 && m.navH >= 90, theme + ' 1100: the tabs stay in the header\'s second row (' + m.pos + ', top ' + m.top + ', header ' + m.navH + 'px)');
    ok(m.tabs.length === 7 && !m.conn && m.footerPos === 'fixed', theme + ' 1100: seven tabs, no Connections tab, footer fixed as before');
    await p.context().close();
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
