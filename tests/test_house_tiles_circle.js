// House type tiles, circle only, and the selector lag (owner, 19 Nov 2026, phone check of 5b58a99: "the icons for each house are based on
// the old design, we need to make the circle the whole design remove the outer card"; 14 Nov, Change house type grid: "Remove the card
// from the outside and just focus on the circle, circle kind of medallion"; 19 Nov: "the house selector dialogue box also slows the tool down").
//   1. welcome picker (#w-htypes): no card round a tile (no border, no fill); the icon box is a circle (square box, 50% radius) holding the
//      3D house; the 3D canvas is masked to the circles; the name sits under the circle
//   2. House builder Change house type (#htypes): no card round a type (no border, no fill) and its icon is the round medallion only
//      (no token card shape); the picked one is marked on the circle; price and name under it
//   3. lag: while the welcome (house selector) or sign-in is in front, the Overview net worth scene behind it draws no frames; it draws
//      again once the overlay closes
//   4. no sideways scroll, no page errors, 390 Night and 1100 Daylight
// Run: node tests/test_house_tiles_circle.js
require('./lib/vi');
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const HIDE = '#sync-banner,#trial-banner,#pro-offer-modal,#tester-welcome{display:none!important}';
const noCard = (el) => { const s = getComputedStyle(el); const bw = ['Top', 'Right', 'Bottom', 'Left'].every(k => parseFloat(s['border' + k + 'Width']) === 0 || /rgba\(\d+, \d+, \d+, 0\)|transparent/.test(s['border' + k + 'Color']));
  return bw && (/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) && s.backgroundImage === 'none' && (s.boxShadow === 'none'); };

(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[390, 'dark'], [1100, 'light']]) {
    const T = w + ' ' + theme + ': ', mob = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(T + e.message));
    await p.addInitScript((a) => { const t = a.t;
      window.__viPlanStub = 'on'; window.VI_TILES3D = 1; window.__noCard = (new Function('return ' + a.nc))();
      window.__nwDraws = 0; const cr = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function () { if (this.canvas && /^nw3d/.test(this.canvas.id || '')) window.__nwDraws++; return cr.apply(this, arguments); };
      if (sessionStorage.getItem('__s')) return; sessionStorage.setItem('__s', '1'); localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true');
    }, { t: theme, nc: noCard.toString() });
    await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: HIDE + '#login-overlay{display:none!important}' });
    await p.evaluate(() => document.getElementById('w-htypes').scrollIntoView({ block: 'center' }));
    const t0 = Date.now(); while (Date.now() - t0 < 20000) { const n = await p.evaluate(() => viTiles3D.info().live.length); if (n >= 6) break; await p.waitForTimeout(300); }

    // 1 welcome picker
    const W = await p.evaluate(() => { const ts = [...document.querySelectorAll('#w-htypes .w-ht')], R = e => e.getBoundingClientRect();
      const cv = document.querySelector('#w-htypes canvas.w-ht-cv'), mk = cv ? getComputedStyle(cv).webkitMaskImage || getComputedStyle(cv).maskImage : '';
      return { n: ts.length, card: ts.map(x => window.__noCard(x)), circle: ts.every(x => { const i = x.querySelector('.ico'), r = R(i), s = getComputedStyle(i); return Math.abs(r.width - r.height) < 1.5 && r.width >= 64 && (s.borderTopLeftRadius === '50%' || parseFloat(s.borderTopLeftRadius) >= r.width / 2 - 1); }),
        name: ts.every(x => R(x.querySelector('.nm')).top >= R(x.querySelector('.ico')).bottom - 1), live: ts.filter(x => x.classList.contains('live')).length,
        mask: (mk.match(/radial-gradient/g) || []).length, w: Math.round(R(ts[0].querySelector('.ico')).width), dbg: ts.map(x => { const r = R(x.querySelector('.ico')); return Math.round(r.width) + 'x' + Math.round(r.height) + '/' + getComputedStyle(x.querySelector('.ico')).borderTopLeftRadius; }).join(' ') }; });
    ok(W.n === 6 && W.card.every(Boolean), T + '1 welcome: no card round any tile (no border, no fill, no shadow) ' + JSON.stringify(W.card));
    ok(W.circle, T + '1 welcome: each icon box is a circle (' + W.w + ' px) ' + W.dbg);
    ok(W.name, T + '1 welcome: the name sits under the circle');
    ok(W.live === 6 && W.mask === 6, T + '1 welcome: the 3D houses are live and the canvas is masked to the six circles (' + W.live + ' live, ' + W.mask + ' circles)');
    await p.click('#w-htypes .w-ht[data-type="semi"]'); await p.waitForTimeout(150);
    const pk = await p.evaluate(() => ({ h: _wHouse, ring: getComputedStyle(document.querySelector('#w-htypes .w-ht.on .ico')).boxShadow }));
    ok(pk.h === 'semi' && pk.ring !== 'none', T + '1 welcome: a tap picks (wPickHouse) and the picked circle is ringed');

    // 3 lag: the Overview scene behind the welcome holds still, and draws again after
    const behind = await p.evaluate(() => { const c = document.querySelector('canvas[id^="nw3d"]'); return c ? c.id : ''; });
    await p.evaluate(() => { window.__nwDraws = 0; }); await p.waitForTimeout(2000);
    const dOpen = await p.evaluate(() => window.__nwDraws);
    ok(dOpen <= 2, T + '3 the Overview net worth scene draws nothing while the house selector is open (' + dOpen + ' frames in 2 s, ' + behind + ')');

    // 2 House builder grid (closing the welcome)
    await p.evaluate(() => { document.getElementById('welcome-overlay').style.display = 'none'; });
    await p.evaluate(() => { window.__nwDraws = 0; }); const c0 = Date.now(); let dAfter = 0;
    while (Date.now() - c0 < 5000) { await p.waitForTimeout(250); dAfter = await p.evaluate(() => window.__nwDraws); if (dAfter >= 5) break; }   // under a loaded machine the first frames can be slow
    ok(dAfter >= 5, T + '3 once the welcome closes the Overview scene draws again (' + dAfter + ' frames in ' + ((Date.now() - c0) / 1000).toFixed(1) + ' s)');
    await p.evaluate(() => { try { setSetting('view', 'adv'); } catch (e) {} showTab('house'); }); await p.waitForTimeout(900);
    await p.click('#hbt-chip').catch(() => {}); await p.waitForTimeout(400);
    const H = await p.evaluate(() => { const ts = [...document.querySelectorAll('#hbt-pan #htypes .hbtn')], R = e => e.getBoundingClientRect();
      return { n: ts.length, card: ts.map(x => window.__noCard(x)), medal: ts.every(x => x.querySelector('.ico svg circle.wt-metal') && !x.querySelector('.ico svg .wt-card, .ico svg .wt-edge') && x.querySelector('.ico svg use[href^="#vi-ht-"]')),
        round: ts.every(x => { const r = R(x.querySelector('.ico svg')); return r.width > 40 && Math.abs(r.width - r.height) < 1.5; }),
        under: ts.every(x => R(x.querySelector('.nm')).top >= R(x.querySelector('.ico')).bottom - 1 && R(x.querySelector('.pr')).top >= R(x.querySelector('.nm')).top),
        act: (() => { const a = document.querySelector('#htypes .hbtn.active'); return a ? getComputedStyle(a.querySelector('.ico')).boxShadow : 'none'; })() }; });
    ok(H.n === 6 && H.card.every(Boolean), T + '2 house builder: no card round any type ' + JSON.stringify(H.card));
    ok(H.medal && H.round, T + '2 house builder: each icon is the round medallion only, no token card');
    ok(H.under, T + '2 house builder: name and price under the medallion');
    ok(H.act !== 'none', T + '2 house builder: the picked type is ringed on its circle');
    await p.click('#hbt-pan #htypes .hbtn[data-type="detached"]').catch(() => {}); await p.waitForTimeout(500);
    ok(await p.evaluate(() => state.houseType === 'detached'), T + '2 house builder: a tap still changes the house type');
    const side = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(side <= 0, T + '4 no sideways scroll (' + side + ')');
    await ctx.close();
  }
  ok(!errs.length, '4 no page errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: crashed', e); process.exit(1); });
