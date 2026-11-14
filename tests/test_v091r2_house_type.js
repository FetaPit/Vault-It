// v0.9.1 round 2, chunk D (owner, 4 Nov): the house type.
//  R12 the six house types are drawn as Wealth Roadmap slates (the achievement token, house drawing in the medal).
//  R13 the chosen type sits top right of the viewport; tapping it opens a panel with the build status, a stats snapshot
//      and the six slates to change type.
//  R14 the panel's stats are compressed copies of the stat tiles below the viewport (same values, same colour roles).
//  R15 no house type tiles in the House builder tab cards; the choice moves to the welcome profile step.
//  Saved data: type, price, deposit and bricks unchanged for an existing user; brick value = depositTarget * 0.77 / bricksTotal.
// Run: node tests/test_v091r2_house_type.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const KEYS = 'terraced,semi,detached,mansion,flat,apartment';
const SEED = (theme) => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  if (localStorage.getItem('v091r2d')) return; localStorage.setItem('v091r2d', '1');
  localStorage.setItem('ht3', JSON.stringify({ saved: 16000, target: 320000, houseType: 'semi', depositPct: 20,
    prices: { terraced: 200000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, deposits: [{ amount: 16000, date: '30/10/2026' }] }));
};
const FRESH = (theme) => {
  localStorage.setItem('vi-theme', theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 'n@t.com', expiry: Date.now() + 1e10 }));
};
const HIDE = '#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}';
const OVL = '#welcome-overlay{display:none!important}';
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const mob = w < 700, t = theme + ' ' + w + 'px: ';
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob, colorScheme: theme });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(SEED, theme); await p.goto(APP); await p.waitForTimeout(1800); await p.addStyleTag({ content: HIDE + OVL });
    await p.evaluate(() => { setSetting && setSetting('view', 'adv'); showTab('house'); }); await p.waitForTimeout(800);
    await p.waitForFunction(() => /Each brick ≈/.test((document.getElementById('hb-hud') || {}).innerText || ''), null, { timeout: 30000 }).catch(() => {});

    // existing user keeps their house, price, deposit and brick value
    const keep = await p.evaluate(() => { const bi = hbBrickInfo(); return { type: state.houseType, target: state.target, saved: state.saved, pct: state.depositPct,
      brick: bi ? Math.abs(bi.perBrick - depositTarget() * 0.77 / bi.total) < 1e-9 : false }; });
    ok(keep.type === 'semi' && keep.target === 320000 && keep.saved === 16000 && keep.pct === 20, t + 'saved type, price, deposit kept (' + JSON.stringify(keep) + ')');
    ok(keep.brick, t + 'brick value = depositTarget * 0.77 / bricksTotal');

    // R15: no house type tiles in the tab cards
    const tab = await p.evaluate(() => ({ inCards: document.querySelectorAll('#house-tab-inner .panel .hbtn, #house-tab-inner .panel #htypes').length,
      plan: !!document.querySelector('#hb-plan #priceInput') && !!document.querySelector('#hb-plan #depositPctInput') && !!document.querySelector('#hb-plan #floor-selector-card') }));
    ok(tab.inCards === 0, t + 'R15 no house type tiles in the House builder cards (' + tab.inCards + ')');
    ok(tab.plan, t + 'R15 "Your house plan" keeps price, deposit and floor');

    // R13: the chip, top right of the viewport
    const chip = await p.evaluate(() => {
      const c = document.getElementById('hbt-chip'), s = document.getElementById('house-scene'), bar = document.getElementById('hud-bar-house'), g = document.querySelector('#vp-guide-house');
      if (!c) return null; const R = e => e.getBoundingClientRect(), cr = R(c), sr = R(s), br = R(bar), gr = g ? R(g) : null;
      const hit = (a, b2) => b2 && !(a.right <= b2.left || a.left >= b2.right || a.bottom <= b2.top || a.top >= b2.bottom);
      const small = []; c.querySelectorAll('*').forEach(e => { if (!e.children.length && e.textContent.trim() && getComputedStyle(e).display !== 'none') { const f = parseFloat(getComputedStyle(e).fontSize); if (f < 11.5) small.push(f); } });
      return { inScene: s.contains(c), vis: cr.width > 0 && cr.height > 0 && getComputedStyle(c).visibility !== 'hidden', dr: sr.right - cr.right, dt: cr.top - sr.top,
        txt: c.textContent.replace(/\s+/g, ' ').trim(), slate: !!c.querySelector('svg.wt-svg'), bar: hit(cr, br), guide: hit(cr, gr), tag: c.tagName,
        expanded: c.getAttribute('aria-expanded'), h: cr.height, small };
    });
    ok(chip && chip.inScene && chip.vis && chip.tag === 'BUTTON', t + 'R13 a chip button sits in the viewport');
    ok(chip && chip.dr >= 0 && chip.dr <= 24 && chip.dt >= 0 && chip.dt <= 24, t + 'R13 chip is top right (' + (chip && chip.dr) + ',' + (chip && chip.dt) + ')');
    ok(chip && /Semi-detached/i.test(chip.txt) && chip.slate, t + 'R13 chip shows the chosen type as a slate (' + (chip && chip.txt) + ')');
    ok(chip && !chip.bar && !chip.guide && chip.h >= 44, t + 'R13 chip clear of camera bar and guide, 44 px tap target (' + (chip && chip.h) + ')');
    ok(chip && chip.expanded === 'false' && chip.small.length === 0, t + 'R13 chip aria-expanded false, no text under 11.5 px (' + (chip && chip.small) + ')');

    // R13 + R14: tap opens the panel
    await p.click('#hbt-chip').catch(() => {}); await p.waitForTimeout(400);
    const pan = await p.evaluate(() => {
      const d = document.getElementById('hbt-pan'); if (!d) return null; const R = e => e.getBoundingClientRect(), cs = e => getComputedStyle(e);
      const hudV = [...document.querySelectorAll('#hb-hud .hb-stx6 > div b')].map(x => x.textContent.trim());
      const panT = [...d.querySelectorAll('.hb-stx6 > div')], panV = panT.map(x => (x.querySelector('b') || {}).textContent.trim());
      const hudC = [...document.querySelectorAll('#hb-hud .hb-stx6 > div')].map(x => x.className), panC = panT.map(x => x.className);
      const ids = [...d.querySelectorAll('[id]')].map(x => x.id).filter(id => document.querySelectorAll('#' + CSS.escape(id)).length > 1);
      const types = [...d.querySelectorAll('#htypes .hbtn')];
      const small = []; d.querySelectorAll('*').forEach(e => { if (!e.children.length && e.textContent.trim() && cs(e).display !== 'none' && R(e).width) { const f = parseFloat(cs(e).fontSize); if (f < 11.5) small.push(f + ':' + e.textContent.trim().slice(0, 16)); } });
      const st = d.querySelector('#hbt-status');
      return { vis: R(d).width > 0 && cs(d).display !== 'none', role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), label: !!d.getAttribute('aria-labelledby'),
        expanded: document.getElementById('hbt-chip').getAttribute('aria-expanded'),
        status: st ? st.textContent.replace(/\s+/g, ' ').trim() : '', hudV, panV, hudC, panC, maxH: Math.max(0, ...panT.map(x => R(x).height)), dup: ids,
        tN: types.length, tKeys: types.map(x => x.dataset.type).join(','), tSlate: types.every(x => x.querySelector('svg.wt-svg') && x.querySelector('svg.wt-svg use[href^="#vi-ht-"]')),
        tActive: types.filter(x => x.classList.contains('active')).map(x => x.dataset.type).join(','), tPress: types.filter(x => x.getAttribute('aria-pressed') === 'true').length,
        tNm: types.map(x => (x.querySelector('.nm') || {}).textContent).join('|'), tPr: types.every(x => /£[\d,.]+/.test((x.querySelector('.pr') || {}).textContent || '')),
        fit: R(d.querySelector('.hbt-box') || d).right <= innerWidth + 1 && R(d.querySelector('.hbt-box') || d).left >= -1, small, side: document.documentElement.scrollWidth - innerWidth };
    });
    ok(pan && pan.vis && pan.role === 'dialog' && pan.modal === 'true' && pan.label && pan.expanded === 'true', t + 'R13 tapping the chip opens a labelled dialog');
    ok(pan && /Level 1/i.test(pan.status) && /Row \d+ of \d+/i.test(pan.status) && /% of/.test(pan.status), t + 'R13 build status: level, row, % of deposit (' + (pan && pan.status) + ')');
    ok(pan && pan.panV.length === 6 && pan.panV.join('|') === pan.hudV.join('|'), t + 'R14 six stats, same values as the tiles below (' + (pan && pan.panV.join('|')) + ')');
    ok(pan && pan.panC.join('|') === pan.hudC.join('|'), t + 'R14 same colour roles as the tiles below');
    ok(pan && pan.maxH > 0 && pan.maxH <= 64, t + 'R14 compressed: each tile at most 64 px tall (' + (pan && pan.maxH) + ')');
    ok(pan && pan.dup.length === 0, t + 'no duplicate ids in the panel (' + (pan && pan.dup) + ')');
    ok(pan && pan.tN === 6 && pan.tKeys === KEYS, t + 'R12 six types, keys kept (' + (pan && pan.tKeys) + ')');
    ok(pan && pan.tSlate, t + 'R12 each type is a roadmap slate with its house drawing');
    ok(pan && pan.tActive === 'semi' && pan.tPress === 1, t + 'R12 one selected, aria-pressed (' + (pan && pan.tActive) + ')');
    ok(pan && /Terraced/.test(pan.tNm) && /Manor house/.test(pan.tNm) && pan.tPr, t + 'R12 name and price under each, sentence case (' + (pan && pan.tNm) + ')');
    ok(pan && pan.fit && pan.side <= 0 && pan.small.length === 0, t + 'panel fits, no sideways scroll, no text under 11.5 px (' + (pan && pan.small.slice(0, 4)) + ')');

    // change type from the panel: same effect as the old tiles
    await p.click('#hbt-pan #htypes .hbtn[data-type="detached"]').catch(() => {}); await p.waitForTimeout(600);
    const ch = await p.evaluate(() => ({ type: state.houseType, target: state.target, saved: JSON.parse(localStorage.getItem('ht3') || '{}').houseType,
      chip: document.getElementById('hbt-chip').textContent, prices: JSON.stringify(state.prices), open: getComputedStyle(document.getElementById('hbt-pan')).display !== 'none' }));
    ok(ch.type === 'detached' && ch.target === 500000 && ch.saved === 'detached', t + 'picking a slate changes the house like the old tiles (' + ch.type + ' ' + ch.target + ')');
    ok(/Detached/.test(ch.chip) && /"semi":320000/.test(ch.prices), t + 'chip follows; prices untouched');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const shut = await p.evaluate(() => ({ open: getComputedStyle(document.getElementById('hbt-pan')).display !== 'none', focus: document.activeElement && document.activeElement.id }));
    ok(!shut.open && shut.focus === 'hbt-chip', t + 'Escape closes the panel and returns focus to the chip (' + shut.focus + ')');
    ok(errs.length === 0, t + 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
    await ctx.close();
  }

  // R15: the welcome profile step asks for the house type with the same slates
  for (const w of [390, 1100]) {
    const t = 'onboarding ' + w + 'px: ', mob = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob }); await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(FRESH, 'dark'); await p.goto(APP); await p.waitForTimeout(1800); await p.addStyleTag({ content: HIDE });
    await p.evaluate(() => { const o = document.getElementById('welcome-overlay'); o.style.display = 'flex'; document.querySelectorAll('[id^="w-step-"]').forEach(s => s.style.display = 'none'); document.getElementById('w-step-1').style.display = ''; if (typeof wGo === 'function') wGo(1); });   // 3 screens since 10 Nov 2026: home type is on screen 1   // the home screen of the onboarding (5 Nov 2026)
    await p.waitForTimeout(300);
    const ob = await p.evaluate(() => { const g = document.getElementById('w-htypes'), ts = g ? [...g.querySelectorAll('.w-ht')] : [], R = e => e.getBoundingClientRect();
      return { n: ts.length, keys: ts.map(x => x.dataset.type).join(','), slate: ts.every(x => x.querySelector('svg.wt-svg use[href^="#vi-ht-"]')), q: g ? g.getAttribute('aria-label') || '' : '',
        inStep: !!document.querySelector('#w-step-1 #w-htypes'), pressed: ts.filter(x => x.getAttribute('aria-pressed') === 'true').length, side: document.documentElement.scrollWidth - innerWidth,
        fit: ts.every(x => R(x).right <= innerWidth && R(x).left >= 0), hbtn: ts.filter(x => x.classList.contains('hbtn')).length }; });
    ok(ob.inStep && ob.n === 6 && ob.keys === KEYS && ob.slate, t + 'R15 six house type slates in the profile step (' + ob.keys + ')');
    ok(ob.pressed === 0 && ob.hbtn === 0 && /home/i.test(ob.q), t + 'R15 nothing picked until the user picks; a labelled group');
    ok(ob.fit && ob.side <= 0, t + 'R15 slates fit, no sideways scroll');
    // skip the picker: today's behaviour, type and prices untouched
    const before = await p.evaluate(() => ({ type: state.houseType, prices: JSON.stringify(state.prices) }));
    await p.click('#w-htypes .w-ht[data-type="detached"]').catch(() => {}); await p.waitForTimeout(150);
    const pk = await p.evaluate(() => ({ pressed: [...document.querySelectorAll('#w-htypes .w-ht')].filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.dataset.type).join(','),
      ph: document.getElementById('w-house').placeholder, type: state.houseType }));
    ok(pk.pressed === 'detached' && /500,000/.test(pk.ph) && pk.type === before.type, t + 'R15 picking marks it and shows its price as the hint; nothing saved yet (' + pk.ph + ')');
    await p.fill('#w-house', '450000');
    await p.evaluate(() => wStep2Submit()); await p.waitForTimeout(800);
    const sv = await p.evaluate(() => { const h = JSON.parse(localStorage.getItem('ht3') || '{}'); return { type: state.houseType, target: state.target, price: state.prices.detached, st: h.houseType, sp: (h.prices || {}).detached,
      other: JSON.stringify(Object.assign({}, state.prices, { detached: 0 })) }; });
    ok(sv.type === 'detached' && sv.target === 450000 && sv.price === 450000 && sv.st === 'detached' && sv.sp === 450000, t + 'R15 the pick and target are saved as that type and its price (' + JSON.stringify(sv) + ')');
    ok(sv.other === JSON.stringify(Object.assign({}, JSON.parse(before.prices), { detached: 0 })), t + 'other prices untouched');
    ok(errs.length === 0, t + 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
    await ctx.close();
  }
  // skip path: no pick keeps the type; the typed value becomes that type's price, as Set price does, so it survives a reload
  // (owner, 12 Nov 2026 session A: before, only the target changed and shell/init.js reset it from the price on the next load)
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 900 } }); await routeThree(ctx); await ctx.route(/open\.er-api\.com/, r => r.abort());
    const p = await ctx.newPage(); await p.addInitScript(FRESH, 'dark'); await p.goto(APP); await p.waitForTimeout(1800); await p.addStyleTag({ content: HIDE });
    const before = await p.evaluate(() => ({ type: state.houseType, prices: Object.assign({}, state.prices) }));
    await p.evaluate(() => { document.getElementById('w-house').value = '250000'; wStep2Submit(); }); await p.waitForTimeout(600);
    const af = await p.evaluate(() => ({ type: state.houseType, prices: Object.assign({}, state.prices), target: state.target }));
    const others = Object.keys(before.prices).filter(k => k !== before.type).every(k => af.prices[k] === before.prices[k]);
    ok(af.type === before.type && af.prices[af.type] === 250000 && others && af.target === 250000, 'onboarding skip: no pick keeps the type, its price and the target become the £250,000 typed, other prices unchanged (' + af.type + ' ' + af.target + ')');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
