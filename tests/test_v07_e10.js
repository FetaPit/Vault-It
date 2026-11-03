// v0.7 E10 (owner, 1 Nov): the expand arrow on each expense bar (e.g. Committed essentials) is larger and points down.
// Pedro D6: the ▾ glyph becomes vi-chevron 20 px, stroke 2, in a 44 px target; down when folded, turns up over 240 ms when open; the -90 degree rule is gone.
// Run: node tests/test_v07_e10.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const [theme, w] of [['dark', 390], ['light', 390], ['dark', 1100]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600, colorScheme: theme }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }] })); }, theme);
    await p.goto(APP); await p.waitForTimeout(1800); await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(800);
    const info = () => p.evaluate(() => { const c = document.querySelector('.bd-tile[data-g="ce"] .bd-chev'), r = c.getBoundingClientRect(), sv = c.querySelector('svg'), sr = sv ? sv.getBoundingClientRect() : { width: 0 };
      return { text: c.textContent.trim(), use: sv && sv.querySelector('use') ? sv.querySelector('use').getAttribute('href') : '', w: Math.round(r.width), h: Math.round(r.height), sw: Math.round(sr.width), sdw: sv ? getComputedStyle(sv).getPropertyValue('--vi-sw').trim() : '', tr: getComputedStyle(c).transform, dur: getComputedStyle(c).transitionDuration, side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
    let r = await info(); const t = theme + ' ' + w + 'px: ';
    ok(r.text === '' && r.use === '#vi-chevron', t + 'the glyph is gone; vi-chevron sprite icon (' + r.use + ')');
    ok(r.sw === 20 && r.sdw === '2', t + '20 px icon, stroke 2 (' + r.sw + ', ' + r.sdw + ')');
    const hit = await p.evaluate(() => { const c = document.querySelector('.bd-tile[data-g="ce"] .bd-chev'), b = getComputedStyle(c, '::before'); return { w: Math.round(c.getBoundingClientRect().width), hit: parseFloat(b.width) || 0, hh: parseFloat(b.height) || 0, title: Math.round(document.querySelector('.bd-tile[data-g="ce"] .bd-tile-tt b').getBoundingClientRect().height), lh: parseFloat(getComputedStyle(document.querySelector('.bd-tile[data-g="ce"] .bd-tile-tt b')).lineHeight) || 16 }; });
    ok(hit.w <= 24 && hit.hit >= 44 && hit.hh >= 44, t + 'arrow drawn 24 px with a 44 px hit area (' + hit.w + ', ' + hit.hit + 'x' + hit.hh + ')');
    ok(Math.round(hit.title / hit.lh) <= 2, t + 'the title column keeps two lines at most (' + Math.round(hit.title / hit.lh) + ')');
    const rot = m => { const n = m.match(/matrix\(([^)]+)\)/); if (!n) return 0; const v = n[1].split(',').map(Number); return Math.round(Math.atan2(v[1], v[0]) * 180 / Math.PI); };
    ok(rot(r.tr) === 0, t + 'folded: the arrow points down, as drawn (' + rot(r.tr) + ' deg)');
    ok(/0\.24s/.test(r.dur), t + 'turns over 240 ms (' + r.dur + ')');
    await p.click('.bd-tile[data-g="ce"] .bd-tile-hd'); await p.waitForTimeout(500); r = await info();
    ok(Math.abs(rot(r.tr)) === 180, t + 'open: the arrow turns up (' + rot(r.tr) + ' deg)');
    ok(!r.side && errs.length === 0, t + 'no sideways scroll, no page errors ' + errs.slice(0, 1));
    await ctx.close();
  }
  // the app's own demo data at 1100 (two columns): no title runs under its amount, and every title keeps two lines at most
  { const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); const p = await ctx.newPage(); await p.addInitScript(() => localStorage.setItem('vi-theme', 'dark'));
    await p.goto(APP); await p.waitForFunction(() => localStorage.getItem('pos_ov1'), null, { timeout: 30000 }); await p.reload(); await p.waitForFunction(() => window.cfModel && cfModel().total > 0, null, { timeout: 30000 }); await p.waitForTimeout(500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' }); await p.evaluate(() => showTab('budget')); await p.waitForTimeout(800);
    const r = await p.evaluate(() => [...document.querySelectorAll('.bd-tile')].map(t => { const b = t.querySelector('.bd-tile-tt b'), s = t.querySelector('.bd-tile-sum'), br = b.getBoundingClientRect(), sr = s.getBoundingClientRect(), tt = t.querySelector('.bd-tile-tt').getBoundingClientRect();
      return { g: t.dataset.g, lines: Math.round(br.height / (parseFloat(getComputedStyle(b).lineHeight) || parseFloat(getComputedStyle(b).fontSize) * 1.3)), clash: tt.right > sr.left + 1 }; }));
    ok(r.length === 6 && r.every(x => !x.clash), '1100 demo: no title runs under its amount (' + r.filter(x => x.clash).map(x => x.g).join(',') + ')');
    ok(r.every(x => x.lines <= 2), '1100 demo: every title keeps two lines at most (' + r.map(x => x.g + ':' + x.lines).join(' ') + ')');
    await ctx.close(); }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
