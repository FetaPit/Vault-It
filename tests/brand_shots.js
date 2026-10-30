// Brand rollout screenshots: every main tab in Night and Daylight at 390px and 1100px.
//   node tests/brand_shots.js [tab ...]      → shots/brand/<tab>-<theme>-<width>.png
//   FULL=1 node tests/brand_shots.js house  → whole page instead of the first screen
// Uses the same seed as test_overview plus a house in progress. Prints page errors and sideways scroll.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname + '/../shots/brand'; fs.mkdirSync(OUT, { recursive: true });
const TABS = process.argv.slice(2).length ? process.argv.slice(2) : ['overview', 'budget', 'house', 'assets', 'debt', 'achievements'];
const seed = (theme) => {
  localStorage.setItem('vi-theme', theme);
  if (localStorage.getItem('pos_debt1')) return;
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Food', amount: 300, type: 've' }, { id: 6, name: 'Phone', amount: 30, type: 'ce' }, { id: 9, name: 'Petrol', amount: 70, type: 'vn' }] }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }, { id: 2, name: 'Car loan', original: 6000, balance: 3600, rate: 8, min: 180, type: 'loan' }] }));
  localStorage.setItem('ht3', JSON.stringify({ saved: 8500, target: 120000, houseType: 'terraced', depositPct: 20, deposits: [{ amount: 8000, date: '01/09/2026' }, { amount: 500, date: '01/10/2026' }] }));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const mob = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(theme + w + ': ' + e.message));
    await p.addInitScript(seed, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(2000);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    for (const t of TABS) {
      await p.evaluate(t => showTab(t), t); await p.waitForTimeout(t === 'house' ? 2500 : 900);
      await p.evaluate(() => window.scrollTo(0, 0));
      const sx = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (sx > 1) console.log('SIDEWAYS SCROLL', t, theme, w, sx + 'px');
      await p.screenshot({ path: `${OUT}/${t}-${theme === 'dark' ? 'night' : 'daylight'}-${w}.png`, fullPage: !!process.env.FULL });
    }
    await ctx.close();
  }
  await b.close();
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.join('\n') : 'no page errors');
})();
