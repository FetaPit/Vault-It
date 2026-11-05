// v0.7 E9 (owner, 1 Nov): "Spending and saving per month" is collapsed by default; the user expands it. Pedro D5: every group starts folded for everyone;
// a saved vi_bd_fold choice still wins. Run: node tests/test_v07_e9.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (fold) => {
  localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }, { id: 4, name: 'Food', amount: 300, type: 've' }] }));
  if (fold) localStorage.setItem('vi_bd_fold', fold);
};
const state = p => p.evaluate(() => [...document.querySelectorAll('.bd-tile')].map(t => ({ g: t.dataset.g, folded: t.classList.contains('folded'), h: Math.round(t.querySelector('.bd-tile-body').getBoundingClientRect().height), exp: t.querySelector('.bd-tile-hd').getAttribute('aria-expanded') })));
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1100]) {
    const open = async (fold) => { const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 600, hasTouch: w < 600 }); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
      await p.addInitScript(seed, fold); await p.goto(APP); await p.waitForTimeout(1800); await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
      await p.evaluate(() => showTab('budget')); await p.waitForTimeout(800); return p; };
    let p = await open(null); let s = await state(p); const t = w + 'px: ';
    ok(s.length >= 6, t + 'the spending groups are drawn (' + s.length + ')');
    ok(s.every(x => x.folded && x.h === 0 && x.exp === 'false'), t + 'fresh load: every group is folded (' + s.map(x => x.g + ':' + x.folded).join(' ') + ')');
    await p.click('.bd-tile[data-g="ce"] .bd-tile-hd'); await p.waitForTimeout(300); s = await state(p);
    ok(!s.find(x => x.g === 'ce').folded && s.find(x => x.g === 'ce').h > 0, t + 'tapping a group expands it');
    ok(p.errs.length === 0, t + 'no page errors ' + p.errs.slice(0, 1)); await p.context().close();
    p = await open('{"ce":false}'); s = await state(p);
    ok(!s.find(x => x.g === 'ce').folded && s.filter(x => x.g !== 'ce').every(x => x.folded), t + 'a saved choice still wins (ce open, the rest folded)'); await p.context().close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
