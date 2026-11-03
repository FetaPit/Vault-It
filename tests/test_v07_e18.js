// v0.7 E18 (owner, 1 Nov: "Build your dream home buttons: smaller, on brand, moved to the bottom of the viewport"; ASK 1 answer: the camera buttons).
// Pedro A3: #hud-bar-house bottom centre, 12 px up, one row; pill (--rail-bg, 1 px teal border, pill radius); buttons drawn 36 px in a 44 px hit area;
// 18 px sprite icons in teal (vi-zoom-out, vi-zoom-in, vi-orbit, vi-reset, vi-fullscreen); no emoji fallbacks; orbit on = teal border + glow;
// nothing over the caption. Run: node tests/test_v07_e18.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 768, 1100]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' }); await routeThree(ctx); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); });
    await p.goto(APP + '?bypass=websummit'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p.evaluate(() => showTab('house')); await p.waitForFunction(() => window.HB3D && HB3D.viewer && HB3D.viewer.model, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const sc = document.getElementById('house-scene'), bar = document.getElementById('hud-bar-house'); sc.scrollIntoView(); window.dispatchEvent(new Event('resize'));
      const s = sc.getBoundingClientRect(), br = bar.getBoundingClientRect(), bs = getComputedStyle(bar), bt = [...bar.querySelectorAll('.hud-btn')];
      const rects = bt.map(x => x.getBoundingClientRect()), before = bt.map(x => getComputedStyle(x, '::before'));
      const icons = bt.map(x => { const u = x.querySelector('svg use'); return u ? u.getAttribute('href') : ''; });
      const cap = document.getElementById('hb3d-cap'), cr = cap && cap.offsetParent ? cap.getBoundingClientRect() : null;
      const ob = document.getElementById('hud-orbit-toggle'); ob.classList.add('orbit-active'); const ab = getComputedStyle(ob, '::before');
      return { engine: sc.getAttribute('data-engine'), shown: br.width > 0, cx: Math.abs((br.left + br.width / 2) - (s.left + s.width / 2)), gap: Math.round(s.bottom - br.bottom), h: Math.round(br.height),
        radius: bs.borderRadius, border: bs.borderTopColor, text: bar.textContent.replace(/\s+/g, ''), icons, n: bt.length, tops: [...new Set(rects.map(x => Math.round(x.top)))].length,
        hit: rects.every(x => Math.round(x.width) >= 44 && Math.round(x.height) >= 44), draw: before.every(x => x.width === '36px' && x.height === '36px'),
        ico: bt.every(x => { const v = x.querySelector('svg'); return v && v.getBoundingClientRect().width === 18; }), orbBorder: ab.borderTopColor, orbShadow: ab.boxShadow,
        capClear: !cr || cr.bottom <= br.top + 1 || cr.right <= br.left || cr.left >= br.right, side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
    });
    const t = w + 'px: ';
    ok(r.shown, t + 'camera bar is visible (engine ' + r.engine + ')');
    ok(r.cx <= 3, t + 'bar centred at the bottom (off by ' + Math.round(r.cx) + ')');
    ok(r.gap >= 11 && r.gap <= 13, t + 'bar sits 12 px up (gap ' + r.gap + ')');
    ok(r.n === 5 && r.tops === 1, t + 'one row of five buttons (the locate button was removed, owner 3 Nov) (' + r.n + ' buttons, ' + r.tops + ' rows)');
    ok(parseFloat(r.radius) >= 20, t + 'pill radius (' + r.radius + ')');
    ok(/68, ?192, ?185/.test(r.border), t + '1 px teal border (' + r.border + ')');
    ok(r.hit && r.draw, t + 'buttons 44 px hit area, 36 px drawn');
    ok(r.ico, t + 'icons 18 px');
    ok(['#vi-zoom-out', '#vi-zoom-in', '#vi-orbit', '#vi-reset', '#vi-fullscreen'].every(h => r.icons.includes(h)), t + 'sprite icons ' + r.icons.join(','));
    ok(!/[\u{1F300}-\u{1FAFF}✳-➿↺⟳⛶⊕✕✵+−]/u.test(r.text) && r.text === '', t + 'no emoji or glyph fallbacks (text "' + r.text + '")');
    ok(/68, ?192, ?185/.test(r.orbBorder) && r.orbShadow !== 'none', t + 'orbit on: teal border and glow');
    ok(r.capClear, t + 'caption clear of the bar');
    ok(!r.side && errs.length === 0, t + 'no sideways scroll, no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
