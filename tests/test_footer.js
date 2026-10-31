// Footer disclaimer + privacy/terms links: exact approved wording in the app (#app-footer) and the landing footer, no em dashes,
// type floors (10 px, FCA line 11 px), the fixed footer's height drives --footer-h so the page and toasts clear it, no sideways scroll.
// Run: node tests/test_footer.js
const { chromium } = require('playwright');
const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const FCA = 'Not regulated by the FCA. Not financial advice.';
const DISC = 'Vault-It helps you track and plan your money. Forecasts, dates and values are estimates from what you enter and public prices, and may be wrong. Speak to a regulated adviser before big money decisions.';
const land = fs.readFileSync('/home/user/Vault-It/landing.html', 'utf8');
const lf = land.slice(land.indexOf('<footer>'), land.indexOf('</footer>'));
const lt = lf.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
ok(lt.includes(FCA) && lt.includes(DISC), 'landing footer carries the approved wording, exactly');
ok(/href="https:\/\/app\.vault-it\.co\/\?privacy=1">Privacy notice</.test(lf) && /href="https:\/\/app\.vault-it\.co\/\?terms=1">Beta terms</.test(lf), 'landing footer links Privacy notice and Beta terms');
ok(!/[—–]/.test(lt) && !/&mdash;|&ndash;/.test(lf), 'landing footer has no em or en dashes');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1100, 800]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); });
    await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const f = document.getElementById('app-footer'); const txt = f.textContent.replace(/\s+/g, ' ');
      const btn = t => [...f.querySelectorAll('button')].find(x => x.textContent.trim() === t);
      const fs_ = e => e ? parseFloat(getComputedStyle(e).fontSize) : 0;
      const calls = []; window.showPrivacy = () => calls.push('p'); window.showTerms = () => calls.push('t');
      const bp = btn('Privacy notice'), bt = btn('Beta terms'); if (bp) bp.click(); if (bt) bt.click();
      const fixed = getComputedStyle(f).position === 'fixed';
      const rect = f.getBoundingClientRect();
      const cs = getComputedStyle(document.documentElement).getPropertyValue('--footer-h').trim();
      return { txt, calls, fixed, h: rect.height, top: rect.top, vh: innerHeight, cs, fca: fs_(f.querySelector('.vi-fca')), disc: fs_(f.querySelector('.vi-disc')), bp: fs_(bp), bt: fs_(bt),
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bsw: document.body.scrollWidth, pad: parseFloat(getComputedStyle(document.body).paddingBottom) };
    });
    const t = w + 'px: ';
    ok(r.txt.includes(FCA) && r.txt.includes(DISC), t + 'app footer carries the approved wording, exactly');
    ok(!/[—–]/.test(r.txt), t + 'app footer has no em or en dashes');
    ok(r.calls.join('') === 'pt', t + 'Privacy notice calls showPrivacy(), Beta terms calls showTerms()');
    ok(r.fca >= 11 && r.disc >= 10 && r.bp >= 10 && r.bt >= 10, t + 'type floors hold (FCA ' + r.fca + ', disclaimer ' + r.disc + ', links ' + r.bp + '/' + r.bt + ')');
    ok(r.sw <= r.cw && r.bsw <= r.cw, t + 'no sideways scroll');
    if (r.fixed) { const v = parseFloat(r.cs); ok(Math.abs(v - r.h) <= 1 && r.pad >= r.h - 1, t + 'fixed footer height drives --footer-h (' + r.cs + ' vs ' + r.h + ') and the page clears it'); }
    ok(errs.length === 0, t + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
