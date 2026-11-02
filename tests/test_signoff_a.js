// Phone sign-off group A (owner, 31 Oct): Net worth in 3D. The Feedback pill never covers the stage (corner, flags, zoom buttons) at Fold, phone and desktop widths;
// the floor names use the income flow's label plate (dark translucent box) and stay clear of the bottom edge.
// Run: node tests/test_signoff_a.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[280, 653], [390, 844], [1100, 900]]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob });
    await ctx.route(/^https?:/, r => r.abort());
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      window.__plates = 0; const o = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillRect = function () { try { if (/nw3d-hero/.test(this.canvas.id || '') && /rgba\(8, 8, 8, 0\.[5-9]/.test(String(this.fillStyle))) window.__plates++; } catch (e) {} return o.apply(this, arguments); };
    });
    await p.addInitScript(seed, { theme: 'dark', flag: true }); await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate(() => { showTab('overview'); updateKPIs(); }); await p.waitForTimeout(900);
    const T = w + 'px: ';
    // scroll so the stage sits across the bottom of the screen, where the pill lives, then let the dodge run
    for (const place of ['bottom', 'middle']) {
      await p.evaluate(pl => { const s = document.getElementById('nw3d-hero-stage'); const r = s.getBoundingClientRect(); const y = pl === 'bottom' ? r.bottom - innerHeight + 60 : r.top - 100; window.scrollBy(0, y); }, place);
      await p.waitForTimeout(300); await p.evaluate(() => window.viFbDodge && viFbDodge()); await p.waitForTimeout(400);
      const r = await p.evaluate(() => {
        const s = document.getElementById('nw3d-hero-stage').getBoundingClientRect(), f = document.getElementById('vi-fb-btn'), fr = f.getBoundingClientRect(), vis = getComputedStyle(f).visibility !== 'hidden' && getComputedStyle(f).display !== 'none' && getComputedStyle(f).opacity !== '0' && fr.width > 0;
        const hit = !(fr.right <= s.left || fr.left >= s.right || fr.bottom <= s.top || fr.top >= s.bottom);
        const onCtl = [...document.querySelectorAll('.nw3d-hud,.inv-ctl,.hud-bar')].some(h => { const t = h.getBoundingClientRect(); return t.width > 0 && !(fr.right <= t.left || fr.left >= t.right || fr.bottom <= t.top || fr.top >= t.bottom); });
        return { vis, hit, onCtl, sTop: Math.round(s.top), sBot: Math.round(s.bottom) };
      });
      // v0.8 (owner, 2 Nov): the Feedback button stays bottom right, so it may sit over the stage; it must stay shown there
      ok(r.onCtl ? !r.vis : r.vis, T + 'Feedback pill stays bottom right over the stage, fading only over its controls (' + (r.onCtl ? 'on the controls; ' : '') + place + '; stage ' + r.sTop + '-' + r.sBot + ', pill ' + (r.vis ? 'shown' : 'tucked away') + ')');
    }
    await p.evaluate(() => { document.getElementById('nw3d-hero-stage').scrollIntoView({ block: 'center' }); nw3d.hero.kick(); }); await p.waitForTimeout(900);
    const n = await p.evaluate(() => ({ plates: window.__plates, cols: (document.getElementById('nw3d-hero-cv').dataset.cols || '').split(',').filter(Boolean).length }));
    ok(n.cols >= 3 && n.plates >= n.cols, T + 'every floor name sits on a dark label plate like the income flow (' + n.plates + ' plates, ' + n.cols + ' names)');
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'all passed'); process.exit(fails ? 1 : 0);
})();
