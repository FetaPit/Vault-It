const { chromium } = require('C:/Users/Asus ZenBook Duo/Vault-It/node_modules/playwright');
const fs = require('fs');
const WT = process.argv[2], OUT = process.argv[3], THEME = process.argv[4] || 'dark';
const routeThree = require(WT + '/tests/three_route');
const TABS = ['overview','budget','house','assets','debt','biz','achievements'];
const probe = require('./probe.js');
(async () => {
  const b = await chromium.launch();
  const all = [];
  for (const w of [390, 1100]) {
    const phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: THEME === 'light' ? 'light' : 'dark' });
    await routeThree(ctx);
    const page = await ctx.newPage();
    await page.addInitScript(t => { try { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} }, THEME);
    await page.goto('file:///' + WT + '/'+(process.env.IDX||'index.html')+'?bypass=websummit'); await page.waitForTimeout(2500);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    const scenes = [];
    for (const t of TABS) {
      scenes.push([t, '']);
      await page.evaluate(t => showTab(t), t); await page.waitForTimeout(500);
      const subs = await page.evaluate(t => [...document.querySelectorAll('#tab-' + t + ' .subtab-btn')].map(b => b.dataset.sub).filter(Boolean), t);
      for (const s of subs) scenes.push([t, s]);
    }
    for (const [t, s] of scenes) {
      await page.evaluate(([t, s]) => { showTab(t); if (s) { const btn = [...document.querySelectorAll('#tab-' + t + ' .subtab-btn')].find(b => (b.dataset.sub || '') === s); try { showSubtab(t, s, btn); } catch (e) {} } }, [t, s]);
      await page.waitForTimeout(700);
      const res = await page.evaluate(probe);
      res.forEach(r => all.push({ ...r, vw: w, scene: t + (s ? '/' + s : '') }));
    }
    await page.evaluate(() => { showTab('overview'); toggleSidebar(); }); await page.waitForTimeout(800);
    (await page.evaluate(probe)).forEach(r => all.push({ ...r, vw: w, scene: 'sidebar' }));
    await page.evaluate(() => { try { toggleSidebar(); } catch (e) {} showSettings(); }); await page.waitForTimeout(800);
    (await page.evaluate(probe)).forEach(r => all.push({ ...r, vw: w, scene: 'settings' }));
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  console.log('rows', all.length);
})();
