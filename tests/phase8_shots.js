// Screenshots of the grouped cards (phase 8), Night and Daylight at 390px and 1100px → shots/brand/phase8-*.png
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const fs = require('fs'); const OUT = __dirname + '/../shots/brand'; fs.mkdirSync(OUT, { recursive: true });
const seed = theme => {
  localStorage.setItem('vi-theme', theme); if (localStorage.getItem('pos_debt1')) return;
  localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }] }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Virgin Money card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }, { id: 2, name: 'Car loan', original: 6000, balance: 3600, rate: 8, min: 180, type: 'loan' }] }));
  localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [{ id: 5, name: 'Savings', balance: 8500 }], metals: { gold: 2, silver: 20, platinum: 0, palladium: 0 }, metalPrices: { gold: 2000, silver: 25, platinum: 800, palladium: 900 }, liabilities: [{ id: 9, name: 'Car', value: 4000, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z' }] }));
  localStorage.setItem('ht3', JSON.stringify({ saved: 8500, target: 200000, houseType: 'terraced', depositPct: 20, deposits: [{ amount: 8000, date: '01/09/2026' }, { amount: 500, date: '01/10/2026' }] }));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, theme); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2000);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,.toast,[class*="sync-nudge"],#vi-sync-banner{display:none!important}' });
    const tag = (theme === 'dark' ? 'night' : 'daylight') + '-' + w;
    const shot = async (sel, name) => { const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await el.screenshot({ path: `${OUT}/phase8-${name}-${tag}.png` }); };
    await p.evaluate(() => showTab('house')); await p.waitForTimeout(2500);
    await shot('#house-tab-inner .grid > .panel', 'house-cards'); await shot('#hb-hist', 'house-history');
    await p.evaluate(() => showTab('overview')); await p.waitForTimeout(900);
    await shot('#ov-ms-card', 'overview-goals'); await shot('#ov-own-card', 'overview-own-owe');
    await p.evaluate(() => showTab('debt')); await p.waitForTimeout(900);
    await shot('#tab-debt > div', 'debt');
    await p.evaluate(() => { showTab('assets'); showSubtab('assets', 'metals', null); }); await p.waitForTimeout(700);
    await shot('.mh-card', 'metals');
    await ctx.close();
  }
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'shots ok'); await b.close();
})();
