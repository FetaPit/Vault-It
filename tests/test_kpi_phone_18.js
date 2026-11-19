// Phone Overview KPI values are 18 px or more (owner, 16 Nov 2026, brand book: figures at 18 px and up use Chakra Petch Figures),
// and still fit their tiles with no sideways scroll at 390 px, in Night and Daylight.
const { chromium } = require('playwright'); const path = require('path');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(2500);
    const q = await p.evaluate(() => {
      const v = [...document.querySelectorAll('.ov-kpi-val')].filter((e) => e.offsetParent);
      return { n: v.length, min: Math.min(...v.map((e) => parseFloat(getComputedStyle(e).fontSize))),
        clipped: v.filter((e) => e.scrollWidth > e.parentElement.clientWidth + 1).map((e) => e.textContent.trim()),
        fam: v.every((e) => /^"?Chakra Petch Figures/.test(getComputedStyle(e).fontFamily)),
        sideways: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    ok(q.n > 0, theme + ': KPI values are on screen (' + q.n + ')');
    ok(q.min >= 18, theme + ': every phone KPI value is 18 px or more (smallest ' + q.min + ')');
    ok(q.fam, theme + ': KPI values use Chakra Petch Figures');
    ok(q.clipped.length === 0, theme + ': no KPI value overflows its tile ' + q.clipped.join(','));
    ok(!q.sideways, theme + ': no sideways scroll');
    ok(errs.length === 0, theme + ': no page errors ' + errs.join('; '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
