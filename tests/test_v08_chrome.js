// v0.8 chrome (stream E2, owner's 2 Nov fold test): Message the Dev at the foot of every tab, the Feedback button fixed bottom right,
// the fixed footer collapsing to a slim FCA strip once scrolling stops, compact category pills (below the Cash flow chart),
// and big synced scroll rails above and below the flow charts. 390 / 690 / 1100 / 1440 px, Night and Daylight.
// Run: node tests/test_v08_chrome.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const TABS = ['overview', 'budget', 'house', 'assets', 'debt', 'biz', 'achievements', 'network'];
const FCA = 'Not regulated by the FCA. Not financial advice.';
const seed = t => {
  localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-tour-done', '1');
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 3200, cat: 'salary' }, { id: 9, name: 'Side', amount: 400, cat: 'side' }],
    expenses: [{ id: 2, name: 'Rent', amount: 1100, type: 'ce' }, { id: 3, name: 'Food', amount: 400, type: 've' }, { id: 4, name: 'Gym', amount: 40, type: 'cn' },
      { id: 5, name: 'Takeaways', amount: 120, type: 'vn' }, { id: 6, name: 'House deposit', amount: 500, type: 'sv' }, { id: 7, name: 'ISA', amount: 300, type: 'iv' }] }));
};
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const [w, h] of [[390, 844], [690, 820], [1100, 900], [1440, 900]]) {
    const phone = w < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone, colorScheme: theme === 'light' ? 'light' : 'dark', reducedMotion: 'no-preference' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1600);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal,#trial-banner,#tester-welcome,#vi-fb-nudge,#demo-chip,#pwa-install-banner{display:none!important}' });
    const T = w + ' ' + theme + ': ';

    // 1 + 2: Message the Dev last on every tab; Feedback bottom right at the top, middle and end of every tab
    const devBad = [], fbBad = [];
    for (const tab of TABS) {
      await p.evaluate(t => { showTab(t); scrollTo(0, 0); }, tab); await p.waitForTimeout(250);
      const d = await p.evaluate(() => {
        const cards = document.querySelectorAll('#vi-devcard'); const c = cards[0]; if (cards.length !== 1) return 'cards ' + cards.length;
        const panel = document.querySelector('.tab-panel.active'); if (!panel.contains(c)) return 'not in the open tab';
        const host = c.parentElement, kids = [...host.children].filter(k => !/^(SCRIPT|STYLE)$/.test(k.tagName) && getComputedStyle(k).display !== 'none' && getComputedStyle(k).position !== 'fixed' && getComputedStyle(k).position !== 'absolute');
        if (kids[kids.length - 1] !== c) return 'not last (' + kids.slice(-2).map(k => k.id || k.className).join('|') + ')';
        const r = c.getBoundingClientRect(); if (r.width < 200) return 'too narrow ' + r.width;
        return '';
      });
      if (d) devBad.push(tab + ': ' + d);
      for (const at of ['top', 'mid', 'end']) {
        await p.evaluate(a => { const m = document.documentElement.scrollHeight - innerHeight; scrollTo(0, a === 'top' ? 0 : a === 'mid' ? m / 2 : m); }, at);
        await p.waitForTimeout(450);
        const read = () => p.evaluate(() => {
          const e = document.getElementById('vi-fb-btn'); const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
          const nav = innerWidth < 600 ? document.querySelector('#topnav .vi-tabs').getBoundingClientRect().top : innerHeight;
          const hud = e.classList.contains('vi-fb-fade') && [...document.querySelectorAll('.nw3d-hud,.inv-ctl,.hud-bar')].some(h => { const t = h.getBoundingClientRect(); return t.width > 0 && !(r.right <= t.left || r.left >= t.right || r.bottom <= t.top || r.top >= t.bottom); });
          return { o: cs.opacity, vz: cs.visibility, hud, h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom), w: r.width, nav: Math.round(nav), vis: cs.visibility !== 'hidden' && (cs.opacity !== '0' || hud) && cs.display !== 'none', cls: e.className.replace('vi-fb-fade', '').trim(), top: e.style.top };
        });
        let f = await read(); if (!f.vis) { await p.waitForTimeout(900); f = await read(); }
        if (!(f.vis && f.w > 0 && (phone ? f.w === 40 : f.h === 32) && f.r <= w && f.r >= w - 30 && f.b <= f.nav - 6 && f.l > w / 2 && !f.cls && !f.top)) fbBad.push(tab + '@' + at + ' ' + JSON.stringify(f));
      }
    }
    ok(!devBad.length, T + 'one Message the Dev card, the last thing on every tab ' + devBad.join('; '));
    ok(!fbBad.length, T + 'Feedback stays bottom right, clear of the nav, on every tab at top, middle and end ' + fbBad.slice(0, 3).join('; '));
    // over a 3D viewer's controls it fades out in place, and comes back once clear (Pedro's review)
    await p.evaluate(() => { showTab('overview'); scrollTo(0, 0); }); await p.waitForTimeout(300);
    const fd = await p.evaluate(async () => { const b = document.getElementById('vi-fb-btn'), r0 = b.getBoundingClientRect(), h = document.createElement('div');
      h.className = window.__hudCls || 'nw3d-hud'; h.style.cssText = 'position:fixed;z-index:1;left:' + (r0.left + 4) + 'px;top:' + (r0.top + 2) + 'px;width:30px;height:28px'; document.body.appendChild(h);
      const until = async f => { for (let i = 0; i < 30 && !f(); i++) { window.dispatchEvent(new Event('scroll')); await new Promise(r => setTimeout(r, 100)); } return f(); };
      const over = await until(() => getComputedStyle(b).opacity === '0' && getComputedStyle(b).pointerEvents === 'none');
      const r1 = b.getBoundingClientRect(); h.remove(); const back = await until(() => getComputedStyle(b).opacity === '1');
      return { over, back, still: Math.abs(r1.right - r0.right) < 1 && Math.abs(r1.top - r0.top) < 1 }; });
    ok(fd.over && fd.back && fd.still, T + 'over 3D controls the button fades out without moving, and returns when clear ' + JSON.stringify(fd));
    await p.evaluate(() => { window.__hudCls = 'hud-bar'; });
    const fd2 = await p.evaluate(async () => { const b = document.getElementById('vi-fb-btn'), r0 = b.getBoundingClientRect(), h = document.createElement('div');
      h.className = window.__hudCls || 'nw3d-hud'; h.style.cssText = 'position:fixed;z-index:1;left:' + (r0.left + 4) + 'px;top:' + (r0.top + 2) + 'px;width:30px;height:28px'; document.body.appendChild(h);
      const until = async f => { for (let i = 0; i < 30 && !f(); i++) { window.dispatchEvent(new Event('scroll')); await new Promise(r => setTimeout(r, 100)); } return f(); };
      const over = await until(() => getComputedStyle(b).opacity === '0' && getComputedStyle(b).pointerEvents === 'none');
      const r1 = b.getBoundingClientRect(); h.remove(); const back = await until(() => getComputedStyle(b).opacity === '1');
      return { over, back, still: Math.abs(r1.right - r0.right) < 1 && Math.abs(r1.top - r0.top) < 1 }; });
    ok(fd2.over && fd2.back && fd2.still, T + 'over a viewer zoom bar (.hud-bar) the button fades out without moving, and returns when clear ' + JSON.stringify(fd2));
    await p.evaluate(() => { window.__hudCls = ''; });

    // 3: the footer collapses after scrolling stops, comes back on scroll up and at the page end
    await p.evaluate(() => { showTab('overview'); scrollTo(0, 0); }); await p.waitForTimeout(1700);
    const fixed = await p.evaluate(() => getComputedStyle(document.getElementById('app-footer')).position === 'fixed');
    ok(fixed === !phone, T + (phone ? 'phones keep the footer at the page end' : 'the footer is fixed'));
    if (fixed) {
      const vis = () => p.evaluate(F => { const f = document.getElementById('app-footer'), r = f.getBoundingClientRect(), q = f.querySelector('.vi-fca').getBoundingClientRect();
        return { shown: Math.round(innerHeight - r.top), full: f.offsetHeight, fcaIn: q.top >= 0 && q.bottom <= innerHeight + 0.5 && q.height > 0, txt: f.querySelector('.vi-fca').textContent.trim() === F, sh: document.documentElement.scrollHeight, tr: getComputedStyle(f).transitionProperty }; }, FCA);
      // every state read waits (bounded, up to about 2.4 s) for the 240 ms slide to settle: under load it can land late; the expectations are unchanged
      const settle = async want => { let v = await vis(); for (let i = 0; i < 12 && !want(v); i++) { await p.waitForTimeout(200); v = await vis(); } return v; };
      const a = await settle(v => v.shown <= 30);
      ok(a.shown <= 30 && a.fcaIn && a.txt, T + 'at rest (and on load) the footer folds to one line with the FCA statement (' + a.shown + '/' + a.full + ')');
      ok(/transform/.test(a.tr), T + 'the footer moves by transform (' + a.tr + ')');
      await p.mouse.move(w / 2, h / 3); await p.mouse.wheel(0, 400); await p.waitForTimeout(1900);
      const c = await settle(v => v.shown <= 30);
      ok(c.shown <= 30 && c.shown < c.full && c.fcaIn && c.txt, T + 'after scrolling down stops it collapses to a slim strip with the FCA line (' + c.shown + ' px of ' + c.full + ')');
      ok(c.sh === a.sh, T + 'collapsing does not change the page height (' + a.sh + ' vs ' + c.sh + ')');
      // the footer opens on a scroll and folds again 1.2 s after it stops, so the page itself records the most it showed (every 50 ms, 3 s)
      await p.evaluate(() => { const f = document.getElementById('app-footer'); window.__ftMax = 0; const t0 = performance.now();
        const id = setInterval(() => { window.__ftMax = Math.max(window.__ftMax, Math.round(innerHeight - f.getBoundingClientRect().top)); if (performance.now() - t0 > 3000) clearInterval(id); }, 50); });
      await p.evaluate(() => { const y = scrollY; scrollBy(0, -120); window.__ftMoved = scrollY !== y; }); await p.waitForTimeout(3200);   // the page itself scrolls (a wheel over a 3D view zooms it instead)
      const u = await p.evaluate(() => ({ moved: window.__ftMoved, shown: window.__ftMax, full: document.getElementById('app-footer').offsetHeight }));
      ok(u.moved && u.shown >= u.full - 1, T + 'scrolling shows it in full (' + u.shown + ' of ' + u.full + ')');
      await p.waitForTimeout(1500);
      await p.click('#app-footer .ft-more'); await p.waitForTimeout(500);
      const m = await settle(v => v.shown >= v.full - 1); const ex = await p.evaluate(() => document.querySelector('#app-footer .ft-more').getAttribute('aria-expanded'));
      ok(m.shown >= m.full - 1 && ex === 'true', T + 'More opens the full footer (' + m.shown + ', aria-expanded ' + ex + ')');
      await p.waitForTimeout(1500); ok((await vis()).shown >= m.full - 1, T + 'after More it stays open until the next scroll');
      await p.mouse.wheel(0, 300); await p.waitForTimeout(1900);
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1900);
      const e = await settle(v => v.shown >= v.full - 1); ok(e.shown >= e.full - 1, T + 'at the page end it shows in full (' + e.shown + ')');
    }

    // 4: compact pills, below the chart on Cash flow, same style on Budget
    for (const [tab, lg, sk] of [['overview', 'cf-legend', 'cf-sankey'], ['budget', 'bd-legend', 'bd-sankey']]) {
      await p.evaluate(t => { showTab(t); }, tab); await p.waitForTimeout(500);
      const L = await p.evaluate(([lg, sk]) => {
        const l = document.getElementById(lg), s = document.getElementById(sk), sp = [...l.children];
        const tops = new Set(sp.map(x => Math.round(x.getBoundingClientRect().top)));
        const probe = document.createElement('i'); document.body.appendChild(probe);
        const same = sp.every((x, i) => { probe.style.color = CF_GROUPS[CF_GROUP_ORDER[i]].tx; return !x.querySelector('i') && getComputedStyle(probe).color === getComputedStyle(x.querySelector('s')).color; }); probe.remove();
        const fsz = Math.max(...sp.map(x => parseFloat(getComputedStyle(x).fontSize))), hh = Math.max(...sp.map(x => x.getBoundingClientRect().height));
        const ic = Math.max(...sp.map(x => { const v = x.querySelector('svg'); return v ? v.getBoundingClientRect().width : 0; }));
        const alpha = c => { const m = String(c).match(/\/\s*([\d.]+)\)|rgba\([^)]*,\s*([\d.]+)\)/); return m ? +(m[1] || m[2]) : 1; };
        const strong = sp.every(x => { const cs = getComputedStyle(x); return alpha(cs.borderTopColor) >= 0.55 && alpha(cs.backgroundColor) >= 0.08; });
        return { strong, n: sp.length, rows: tops.size, fsz, hh, ic, same, below: l.getBoundingClientRect().top >= s.getBoundingClientRect().bottom, lh: Math.round(l.getBoundingClientRect().height) };
      }, [lg, sk]);
      ok(L.n === 6 && L.fsz <= 11.5 && L.hh <= 22 && L.ic <= 14 && L.same, T + tab + ' pills are compact, colours unchanged (font ' + L.fsz + ', height ' + L.hh + ', icon ' + L.ic + ')');
      ok(L.rows <= (w < 600 ? 3 : w < 1000 ? 2 : 1), T + tab + ' six pills fit in ' + L.rows + ' rows (' + L.lh + ' px)');
      ok(L.strong, T + tab + ' each pill carries its colour: 60% border and a 10% fill (Pedro, review 1)');
      if (tab === 'overview') ok(L.below, T + 'on Cash flow the key sits below the chart');
    }

    // 5: rails above and below the flow chart, synced both ways, draggable
    for (const tab of ['overview', 'budget']) {
      const sk = tab === 'overview' ? 'cf-sankey' : 'bd-sankey';
      await p.evaluate(t => { showTab(t); }, tab); await p.waitForTimeout(600);
      await p.evaluate(s => document.getElementById(s).scrollIntoView({ block: 'center' }), sk); await p.waitForTimeout(300);
      const R = await p.evaluate(s => {
        const el = document.getElementById(s), max = el.scrollWidth - el.clientWidth;
        const rails = [...document.querySelectorAll('.cf-rail[data-for="' + s + '"]')];
        const shown = rails.filter(r => getComputedStyle(r).display !== 'none' && r.getBoundingClientRect().height > 0);
        return { max, n: rails.length, shown: shown.length, hb: shown.length ? shown.map(r => Math.round(r.querySelector('.cf-thumb').getBoundingClientRect().height)) : [],
          order: rails.length === 2 ? [rails[0].getBoundingClientRect().bottom <= el.getBoundingClientRect().top + 1, rails[1].getBoundingClientRect().top >= el.getBoundingClientRect().bottom - 1] : [] };
      }, sk);
      if (R.max > 6) {
        ok(R.n === 2 && R.shown === 2 && R.order.every(Boolean) && R.hb.every(x => x >= 6), T + tab + ' chart overflows: a rail above and a big rail below (thumbs ' + R.hb + ')');
        const s1 = await p.evaluate(s => { const el = document.getElementById(s); el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2; el.dispatchEvent(new Event('scroll')); return 1; }, sk);
        await p.waitForTimeout(200);
        const pos = await p.evaluate(s => [...document.querySelectorAll('.cf-rail[data-for="' + s + '"]')].map(r => { const a = r.getBoundingClientRect(), t = r.querySelector('.cf-thumb').getBoundingClientRect(); return ((t.left + t.width / 2) - a.left) / a.width; }), sk);
        ok(pos.every(x => x > 0.35 && x < 0.65) && Math.abs(pos[0] - pos[1]) < 0.02, T + tab + ' scrolling the chart moves both thumbs together (' + pos.map(x => x.toFixed(2)) + ')');
        // drag the top thumb to the left end with the mouse
        const tb = await p.evaluate(s => { const t = document.querySelector('.cf-rail[data-for="' + s + '"] .cf-thumb').getBoundingClientRect(); return [t.left + t.width / 2, t.top + t.height / 2]; }, sk);
        await p.mouse.move(tb[0], tb[1]); await p.mouse.down(); await p.mouse.move(tb[0] - 400, tb[1], { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(150);
        const x1 = await p.evaluate(s => document.getElementById(s).scrollLeft, sk);
        ok(x1 < 3, T + tab + ' dragging the top rail scrolls the chart (scrollLeft ' + x1 + ')');
        // touch on the bottom rail (pointer events with pointerType touch): tap near the right end jumps there
        const x2 = await p.evaluate(s => { const r = document.querySelectorAll('.cf-rail[data-for="' + s + '"]')[1], a = r.getBoundingClientRect(), el = document.getElementById(s);
          const o = { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: a.right - 3, clientY: a.top + a.height / 2 };
          r.dispatchEvent(new PointerEvent('pointerdown', o)); r.dispatchEvent(new PointerEvent('pointerup', o)); return [el.scrollLeft, el.scrollWidth - el.clientWidth]; }, sk);
        ok(x2[0] >= x2[1] - 3, T + tab + ' a touch at the end of the bottom rail scrolls to the end (' + x2.map(Math.round) + ')');
      } else ok(R.shown === 0, T + tab + ' chart fits: no rails (' + R.shown + ')');
    }

    const side = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    ok(!side, T + 'no sideways page scroll');
    ok(!errs.length, T + 'no page errors ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // reduced motion: the footer still collapses, with no transition
  { const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.addInitScript(seed, 'dark'); await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    const d = await p.evaluate(() => getComputedStyle(document.getElementById('app-footer')).transitionDuration);
    ok(d.split(',').every(x => parseFloat(x) === 0), '1100 reduced motion: the footer moves without a transition (' + d + ')');
    await ctx.close(); }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
