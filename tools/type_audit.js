// Type-scale sweep (v0.8 F2): every visible text element's computed font-size, per view, width and theme.
// Usage: node tools/type_audit.js [--widths 390,690,1100] [--themes dark,light] [--out /path.json] [--floor 10.5]
// Prints counts by size band and the worst offenders; writes the full list as JSON.
const { chromium } = require('playwright');
const fs = require('fs');
const routeThree = require('../tests/three_route');
const a = {}; for (let i = 2; i < process.argv.length; i += 2) a[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const widths = (a.widths || '390,690,1100').split(',').map(Number), themes = (a.themes || 'dark,light').split(',');
const floor = +(a.floor || 10.5), out = a.out || 'shots/type_audit.json';
const url = (a.url || 'file:///home/user/Vault-It/index.html') + '?bypass=websummit';
const VIEWS = [
  ['overview', "showTab('overview')"], ['budget', "showTab('budget')"], ['house', "showTab('house')"],
  ...['cash', 'stocks', 'crypto', 'metals', 'other', 'liabilities'].map(s => ['assets/' + s, `showTab('assets');showSubtab('assets','${s}',document.querySelector('.subtab-btn[onclick*="${s}"]'))`]),
  ['debt', "showTab('debt')"], ['biz', "showTab('biz')"], ['achievements', "showTab('achievements')"],
  ['m:settings', "showSettings()"], ['m:paywall', "showPaywall()"], ['m:help', "document.getElementById('vi-help-btn').click()"],
  ['m:mortgage', "showTab('house');hbOpenCalc()"], ['m:debtform', "showTab('debt');showDebtForm()"],
  ['m:feedback', "document.getElementById('vi-fb-btn').click()"],
  ['onboarding', null],
];
async function sweep(page) {
  return page.evaluate(() => {
    for (const an of document.getAnimations()) { try { an.pause(); an.currentTime = 0; } catch (e) {} }
    const vw = innerWidth, res = [];
    const sel = el => { const p = []; for (let e = el, i = 0; e && e.nodeType === 1 && i < 4; e = e.parentElement, i++) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } if (e.classList.length) s += '.' + [...e.classList].slice(0, 2).join('.'); p.unshift(s); } return p.join('>'); };
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      if (/^(SCRIPT|STYLE|SVG|PATH|USE|NOSCRIPT|CANVAS|OPTION)$/i.test(el.tagName)) continue;
      let txt = ''; for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent;
      txt = txt.trim(); if (!txt) continue;
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.right < 0 || r.left > vw) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      let hid = false; for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || +c.opacity === 0) { hid = true; break; } } if (hid) continue;
      let f = parseFloat(cs.fontSize), svg = false;
      if (el.ownerSVGElement && el.getScreenCTM) { const m = el.getScreenCTM(); if (m) { f *= Math.sqrt(m.a * m.a + m.b * m.b); svg = true; } }   // SVG text as drawn (viewBox scaling)
      res.push({ svg, fs: Math.round(f * 100) / 100, sel: sel(el), txt: txt.slice(0, 40), font: cs.fontFamily.split(',')[0].replace(/"/g, '') });
    }
    return { root: parseFloat(getComputedStyle(document.documentElement).fontSize), res, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  });
}
(async () => {
  const b = await chromium.launch(); const rows = []; const meta = [];
  for (const theme of themes) for (const w of widths) {
    const phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, colorScheme: theme === 'light' ? 'light' : 'dark' });
    await routeThree(ctx);
    for (const [name, js] of VIEWS) {
      const page = await ctx.newPage();
      await page.addInitScript(t => { try { localStorage.setItem('vi-theme', t); if (!location.hash.includes('onb')) localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} }, theme);
      if (name === 'onboarding') { await page.goto(url.replace('?bypass=websummit', '#onb')); await page.waitForTimeout(1500); }
      else {
        await page.goto(url); await page.waitForTimeout(1200);
        await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
        try { await page.evaluate(js); } catch (e) { meta.push(`${name} ${w}: js ${e.message.slice(0, 80)}`); }
        await page.waitForTimeout(700);
      }
      const s = await sweep(page);
      if (s.sideways) meta.push(`SIDEWAYS ${name} ${theme} ${w}`);
      for (const r of s.res) rows.push({ view: name, w, theme, root: s.root, ...r });
      await page.close();
    }
    await ctx.close();
  }
  await b.close();
  fs.mkdirSync(require('path').dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(rows));
  // summary: dark theme only (sizes are theme-independent), unique by view+sel+fs
  for (const w of widths) {
    const rs = rows.filter(r => r.w === w && r.theme === themes[0]);
    const band = { '<7': 0, '7-8': 0, '8-9': 0, '9-10': 0, '10-10.5': 0, '>=10.5': 0 };
    for (const r of rs) { const f = r.fs; band[f < 7 ? '<7' : f < 8 ? '7-8' : f < 9 ? '8-9' : f < 10 ? '9-10' : f < 10.5 ? '10-10.5' : '>=10.5']++; }
    console.log(`w=${w} root=${rs[0] && rs[0].root} elements=${rs.length} under${floor}=${rs.filter(r => r.fs < floor).length} under10=${rs.filter(r => r.fs < 10).length}`, JSON.stringify(band));
  }
  if (meta.length) console.log('notes:', meta.join(' | '));
})();
