// 3D asset tab and nav icons (owner, 12 Nov 2026, with screenshots of the Assets sub-tab row and the phone bottom nav):
// "we need to update these icons by making them more 3D and refined"
//  1. every Assets sub-tab icon and every tab bar icon uses a 3D symbol (vi3-*) that exists in the sprite
//  2. each 3D symbol is drawn in layers: a soft contact shadow, a darker side or thickness, a lit face in the tier colour
//     (currentColor) and a highlight; the same object per slot as before
//  3. each icon renders with a real size (not empty) at 390 and 1100, and the colour code still comes from the button
//  4. the active tile has the bevel; reduced motion still stops the active glow
//  5. no sideways scroll, no page errors
require('./lib/vi');
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SUB = { cash: 'cash', stocks: 'candles', metals: 'metals', other: 'cube', crypto: 'crypto', liabilities: 'liabilities' };
const TAB = { overview: 'overview', budget: 'budget', house: 'house-builder', assets: 'assets', debt: 'debt-tracker', biz: 'entrepreneur', achievements: 'trophy', connections: 'connections', network: 'network' };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [1100, 390]) {
    const phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: phone ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto(require('./lib/vi').FILE_URL + '?bypass=websummit'); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#tester-welcome{display:none!important}' });
    await p.evaluate(() => { try { localStorage.setItem('vi_view', 'advanced'); } catch (e) {} showTab('assets'); }); await p.waitForTimeout(700);

    const r = await p.evaluate(([SUB, TAB]) => {
      const out = { slots: [], syms: {} };
      const look = (sel, key, want) => {
        const btn = document.querySelector(sel); if (!btn) return out.slots.push({ key, missing: true });
        const svg = btn.querySelector('svg.vi-ic'), use = svg && svg.querySelector('use');
        const href = use ? (use.getAttribute('href') || use.getAttribute('xlink:href') || '') : '';
        const bb = svg && btn.offsetParent !== null ? svg.getBoundingClientRect() : null;
        out.slots.push({ key, href, want: '#vi3-' + want, w: bb ? Math.round(bb.width) : 0, colour: svg ? getComputedStyle(svg).color : '', btnColour: getComputedStyle(btn).getPropertyValue('--sa') || getComputedStyle(btn).getPropertyValue('--tc') });
        const id = href.slice(1), sym = id && document.getElementById(id);
        if (sym && !out.syms[id]) out.syms[id] = {
          tag: sym.tagName.toLowerCase(), vb: sym.getAttribute('viewBox'),
          shadow: !!sym.querySelector('.v3-sh'), side: !!sym.querySelector('.v3-sd'), face: !!sym.querySelector('.v3-fc'), hi: !!sym.querySelector('.v3-hi'),
          current: /currentColor/.test(sym.innerHTML), n: sym.querySelectorAll('path,rect,circle,ellipse,polygon,polyline,line').length };
      };
      Object.keys(SUB).forEach(k => look('#assets-page .subtab-btn[data-sub="' + k + '"]', 'sub:' + k, SUB[k]));
      Object.keys(TAB).forEach(k => look('#topnav .tab-btn[data-tab="' + k + '"]', 'tab:' + k, TAB[k]));
      out.sw = document.documentElement.scrollWidth > window.innerWidth + 1;
      const act = document.querySelector('#topnav .tab-btn.active .vi-ic.ti');
      out.anim = act ? getComputedStyle(act).animationName : '';
      const sa = document.querySelector('#assets-page .subtab-btn.active');
      out.bevel = sa ? getComputedStyle(sa).boxShadow : '';
      return out;
    }, [SUB, TAB]);

    // 1. every slot points at its 3D symbol, and the symbol exists
    const wrong = r.slots.filter(s => s.missing || s.href !== s.want).map(s => s.key + '=' + (s.href || 'none'));
    ok(!wrong.length, w + ': every sub-tab and tab bar icon uses its vi3 symbol (' + (wrong.join(', ') || 'all 15') + ')');
    const missing = r.slots.filter(s => !s.missing && s.href === s.want && !r.syms[s.href.slice(1)]).map(s => s.href);
    ok(!missing.length, w + ': each vi3 symbol exists in the sprite (' + (missing.join(', ') || 'ok') + ')');
    // 2. layers
    const flat = Object.keys(r.syms).filter(id => { const s = r.syms[id]; return !(s.tag === 'symbol' && s.vb === '0 0 24 24' && s.shadow && s.side && s.face && s.hi && s.current && s.n >= 5); });
    ok(Object.keys(r.syms).length >= 15 && !flat.length, w + ': each symbol has shadow, side, lit face and highlight in the tier colour (' + Object.keys(r.syms).length + ' symbols' + (flat.length ? '; flat: ' + flat.join(', ') : '') + ')');
    // 3. drawn with a real size where visible, colour from the button
    const vis = r.slots.filter(s => s.w > 0);
    ok(vis.length >= (phone ? 11 : 10) && vis.every(s => s.w >= 18), w + ': visible icons draw at 18 px or more (' + vis.map(s => s.key + ':' + s.w).join(' ') + ')');
    ok(r.slots.filter(s => s.colour).every(s => s.colour !== 'rgb(0, 0, 0)'), w + ': icons take their colour from the button');
    // 4. active tile bevel, reduced motion
    ok(/inset/.test(r.bevel) && (r.bevel.match(/inset/g) || []).length >= 2, w + ': the active sub-tab has the bevel (' + r.bevel.slice(0, 120) + ')');
    if (phone) ok(r.anim === 'none' || r.anim === '', w + ': reduced motion stops the active glow (' + r.anim + ')');
    // 5.
    ok(!r.sw, w + ': no sideways scroll');
    await ctx.close();
  }
  ok(!errs.length, 'no page errors (' + errs.slice(0, 3).join(' | ') + ')');
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
