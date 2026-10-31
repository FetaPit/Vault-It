// Element screenshots for a finished item, Night and Daylight at 390 and 1100 px, plus the checks the owner's rules need.
// Usage: node tools/shot.js --name r3-8 --tab assets [--sub stocks] [--sel "#al-card"] [--widths 390,1100] [--themes dark,light] [--js "toggleSidebar()"] [--url file:///home/user/Vault-It/index.html]
// Writes shots/qc/<name>_<theme>_<width>.png (git-ignored) and prints one line per shot: path, page errors, sideways scroll.
// Data: the app's own sample data (?bypass=websummit), so no account and no network are needed.
const { chromium } = require('playwright');
const fs = require('fs');

const a = {}; for (let i = 2; i < process.argv.length; i += 2) a[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const name = a.name || 'shot', tab = a.tab || 'overview', sub = a.sub || '', sel = a.sel || '', js = a.js || '';
const widths = (a.widths || '390,1100').split(',').map(Number), themes = (a.themes || 'dark,light').split(',');
const base = a.url || 'file:///home/user/Vault-It/index.html';
const url = base + (base.includes('?') ? '&' : '?') + 'bypass=websummit';

(async () => {
  fs.mkdirSync('shots/qc', { recursive: true });
  const b = await chromium.launch();
  let bad = 0;
  for (const theme of themes) for (const w of widths) {
    const phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone, colorScheme: theme === 'light' ? 'light' : 'dark' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(t => { try { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} }, theme);
    await page.goto(url); await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await page.evaluate(([t, s]) => {
      try { showTab(t); } catch (e) {}
      if (s) try { showSubtab(t, s, document.querySelector('.subtab-btn[onclick*="' + s + '"]')); } catch (e) {}
    }, [tab, sub]);
    if (js) { try { await page.evaluate(js); } catch (e) { errs.push('js: ' + e.message); } }
    await page.waitForTimeout(1200);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const path = `shots/qc/${name}_${theme}_${w}.png`;
    const el = sel ? page.locator(sel).first() : null;
    if (el && await el.count()) await el.screenshot({ path });
    else { await page.screenshot({ path }); if (sel) errs.push('selector not found: ' + sel); }
    if (errs.length || sideways) bad++;
    console.log(`${path}  errors=${errs.length}${errs.length ? ' (' + errs[0].slice(0, 120) + ')' : ''}  sideways=${sideways ? 'YES' : 'no'}`);
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `PROBLEMS in ${bad} shot(s)` : 'shots ok');
  process.exit(bad ? 1 : 0);
})();
