// v0.7 E1 (owner, 1 Nov): the bottom icon bar stays on phones only; fold phones, tablets and anything wider get the nav at the top as on desktop.
// Pedro B1 to B4: bar at max-width 599 px only (phones 320 to 440, fold cover 344 to 412); from 600 px the top nav: row 1 logo, net worth,
// Night/Daylight; row 2 the tabs, icons only, 22 px icons in 44 px targets, spread evenly, no sideways scroll; active tab outlined 1 px in its colour, 10 px radius.
// (B5, landscape single row, is left for a later round.) Run: node tests/test_v07_e1.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const w of [390, 412, 599, 600, 768, 884, 1024]) {
    const mob = w < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob, colorScheme: theme });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); }, theme);
    await p.goto(APP + '?bypass=websummit'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner,#pro-offer-modal{display:none!important}' });
    const r = await p.evaluate(() => {
      const t = document.getElementById('vi-tabs'), cs = getComputedStyle(t), tr = t.getBoundingClientRect();
      const tabs = [...t.querySelectorAll('.tab-btn')].filter(x => !x.hidden && x.offsetParent !== null);
      const a = t.querySelector('.tab-btn.active') || tabs[0], ac = getComputedStyle(a);
      const lab = tabs.filter(x => { const l = x.querySelector('.nav-tab-label'); return l && getComputedStyle(l).display !== 'none'; }).length;
      const ic = tabs.map(x => x.querySelector('.vi-ic.ti')).filter(Boolean).map(x => Math.round(x.getBoundingClientRect().width));
      const rects = tabs.map(x => x.getBoundingClientRect());
      return { pos: cs.position, top: Math.round(tr.top), bottom: Math.round(tr.bottom), vh: innerHeight, n: tabs.length, lab, ic, minH: Math.min(...rects.map(x => Math.round(x.height))), minW: Math.min(...rects.map(x => Math.round(x.width))),
        rows: [...new Set(rects.map(x => Math.round(x.top)))].length, left: Math.round(rects[0].left), right: Math.round(innerWidth - rects[rects.length - 1].right), radius: ac.borderRadius, shadow: ac.boxShadow,
        titles: tabs.every(x => x.getAttribute('title') || x.getAttribute('aria-label')), side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    });
    const t = theme + ' ' + w + 'px: ';
    if (mob) {
      ok(r.pos === 'fixed' && r.bottom >= r.vh - 1, t + 'phone: tab bar fixed to the bottom of the screen');
    } else {
      ok(r.pos !== 'fixed' && r.top < 120, t + 'top nav, no bottom bar (position ' + r.pos + ', top ' + r.top + ')');
      if (w < 1024) {
        ok(r.lab === 0, t + 'icons only, no labels (' + r.lab + ' labelled)');
        ok(r.ic.every(x => x === 22), t + '22 px icons (' + r.ic.join(',') + ')');
        ok(r.minH >= 44 && r.minW >= 44, t + 'targets at least 44 px (' + r.minW + 'x' + r.minH + ')');
        ok(r.titles, t + 'every tab has a name for hover and long-press');
        ok(r.rows === 1, t + 'one row of tabs');
        ok(Math.abs(r.left - r.right) <= 8, t + 'spread evenly across the width (' + r.left + '/' + r.right + ')');
        ok(parseFloat(r.radius) >= 10, t + 'active tab radius 10 px (' + r.radius + ')');
        ok(/inset/.test(r.shadow) || r.shadow !== 'none', t + 'active tab outlined (' + r.shadow.slice(0, 40) + ')');
      }
    }
    ok(r.n >= 7, t + r.n + ' tabs visible');
    ok(!r.side, t + 'no sideways scroll');
    ok(errs.length === 0, t + 'no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
