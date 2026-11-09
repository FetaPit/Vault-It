// v0.9.1 chunk E (owner, 3 Nov 2026): E4 dashboard Cash Flow tile shows only the 3D version, E23 Net worth 3D window 20% taller on desktop,
// E5 Budget pills larger and full width on desktop, E6 Budget 3D text gone and viewport larger. Run: node tests/test_v091_overview_budget.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const INDEX = require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = theme => () => {
  localStorage.setItem('vi-theme', '%T%'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
  if (localStorage.getItem('pos_ov1')) return;
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 3200, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 1100, type: 'ce' }, { id: 4, name: 'ISA', amount: 300, type: 'sv' }], snapshots: [] }));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const [w, h] of [[320, 700], [390, 800], [606, 900], [620, 900], [768, 900], [1100, 800], [1440, 900]]) {
    const t = theme + ' ' + w + 'x' + h + ': ';
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); await routeThree(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript('(' + seed().toString().replace('%T%', theme) + ')()');
    await p.goto(INDEX); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal{display:none!important}' });
    const noSide = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    // E4: the dashboard Cash Flow tile shows only the 3D version
    const cf = await p.evaluate(() => { const c = document.getElementById('ov-cf-card'), s = document.getElementById('cf-sankey'), r = s.getBoundingClientRect();
      return { sankeyH: r.height, sankeyShown: getComputedStyle(s).display, svg: !!c.querySelector('svg.cf-1to1, #cf-sankey svg'), stage: !!c.querySelector('#cf3d-cv'), text: c.innerText }; });
    ok(cf.sankeyShown === 'none' && cf.sankeyH === 0, t + 'the old flow diagram takes no room in the Cash Flow tile (display ' + cf.sankeyShown + ', ' + cf.sankeyH + ' px)');
    ok(!cf.svg && cf.stage, t + 'no flow SVG is drawn into the tile; the 3D stage is');
    ok(!/swipe sideways/i.test(cf.text), t + 'no "swipe sideways" hint in the Cash Flow tile');
    ok(await p.evaluate(() => !document.querySelector('.cf-rail[data-for="cf-sankey"]')), t + 'no scroll rails for the hidden diagram');
    // E23: Net worth 3D window 20% taller on desktop only
    await p.evaluate(() => document.getElementById('nw3d-hero-stage').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    const nh = await p.evaluate(() => document.getElementById('nw3d-hero-stage').getBoundingClientRect().height);
    const old = Math.min(520, Math.max(300, 0.44 * h)), nw = Math.min(624, Math.max(360, 0.528 * h));
    if (w >= 1100) ok(Math.abs(nh - nw) <= 2 && Math.abs(nh / old - 1.2) < 0.02, t + 'Net worth window is 1.2 times today\'s (' + Math.round(nh) + ' vs ' + Math.round(old) + ')');
    else if (w > 600) ok(Math.abs(nh - old) <= 2, t + 'tablet Net worth window unchanged (' + Math.round(nh) + ' vs ' + Math.round(old) + ')');
    else ok(nh <= 340 + 1, t + 'phone Net worth window unchanged (' + Math.round(nh) + ')');
    ok(await noSide(), t + 'dashboard: no sideways scroll');
    // Budget
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(900);
    const lg = await p.evaluate(() => { const l = document.getElementById('bd-legend'), sp = [...l.children], card = document.querySelector('.bd-sankey-card').getBoundingClientRect(), lr = l.getBoundingClientRect();
      const tops = new Set(sp.map(x => Math.round(x.getBoundingClientRect().top))), first = sp[0].getBoundingClientRect(), last = sp[sp.length - 1].getBoundingClientRect(), cs = getComputedStyle(sp[0]);
      const clipped = sp.some(x => x.scrollWidth > x.clientWidth + 1);
      return { n: sp.length, rows: tops.size, left: Math.round(Math.min(...sp.map(x => x.getBoundingClientRect().left))), right: Math.round(Math.max(...sp.map(x => x.getBoundingClientRect().right))), cardL: Math.round(card.left), cardR: Math.round(card.right),
        hh: Math.round(first.height), fs: parseFloat(cs.fontSize), ic: Math.round(sp[0].querySelector('svg').getBoundingClientRect().width), clipped, wrap: sp.some(x => x.getBoundingClientRect().height > first.height + 2) }; });
    ok(lg.n === 6 && !lg.clipped && !lg.wrap, t + 'six pills, label never truncated or wrapped');
    if (w >= 1100) {
      ok(lg.rows === (w >= 1400 ? 1 : 2), t + 'pills in ' + lg.rows + ' row(s)');
      ok(Math.abs(lg.left - lg.cardL) <= 2 && Math.abs(lg.right - lg.cardR) <= 2, t + 'pills span the card width (' + lg.left + '-' + lg.right + ' vs ' + lg.cardL + '-' + lg.cardR + ')');
      ok(lg.hh >= 40 && lg.fs >= 13 && lg.ic >= 22, t + 'pills 40 px high, 13 px label, 22 px icon (' + lg.hh + ', ' + lg.fs + ', ' + lg.ic + ')');
    } else if (w >= 610) ok(lg.rows === 2 && lg.fs >= 12, t + 'tablet: three per row at 12 px (' + lg.rows + ' rows, ' + lg.fs + ')');
    else ok(lg.fs >= 10.5 && lg.hh <= 24, t + 'phone keeps the compact key (' + lg.fs + ' px, ' + lg.hh + ' high)');
    ok(await noSide(), t + 'budget: no sideways scroll');
    // E6: the paragraph is gone, the viewport larger
    await p.evaluate(() => { const bt = document.querySelector('#bd-view [data-v="3d"]'); bt.click(); }); await p.waitForTimeout(900);
    const b3 = await p.evaluate(() => { const s = document.getElementById('bd3d-stage'), d = document.getElementById('cf3d-stage'); return { sub: !!document.querySelector('.bd3d-sub'), txt: document.getElementById('bd-3d').innerText, h: s.getBoundingClientRect().height, dashH: d.getBoundingClientRect().height, aria: document.getElementById('bd3d-cv').getAttribute('aria-label') }; });
    ok(!b3.sub && !/A tree map of your monthly income/.test(b3.txt), t + 'the "tree map of your monthly income" line is gone');
    ok(/Tap or hover a block to read it, drag to turn it/.test(b3.txt), t + 'the how-to survives in the read line');
    ok(!!b3.aria, t + 'canvas aria-label kept');
    const want = w >= 1100 ? Math.min(720, Math.max(400, 0.64 * h)) : w > 600 ? Math.min(560, Math.max(360, 0.56 * h)) : Math.min(1.04 * w, 440);
    ok(Math.abs(b3.h - want) <= 2, t + 'Budget 3D window is ' + Math.round(b3.h) + ' high (want ' + Math.round(want) + ')');
    ok(await noSide(), t + 'budget 3D: no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
