// v0.95, tester 1 (9 Nov 2026): text too small and too much of it on the Pioneer welcome, profile set-up and tour. Owner, 10 Nov
// 06:40: "small text and long copy on welcome and tour". The tester's shorter lines are used as written
// (docs/feedback/TESTER_01_2026-11-09.md, points 1 and 2); no other copy changes. Type:
//   1. the Pioneer line and the tour's opening offer are the tester's wording
//   2. on every welcome screen and the tour card, at 390 and 1100 px: no visible text under 12 px (was 10 px on the field labels,
//      the Pioneer badge and the phone field); field labels at least 12 px; notes and option text at least 13 px
//   3. the tour text matches the welcome sub-lines: body at least 14 px on a phone and 16 px on desktop, title at least 17 px,
//      buttons at least 14 px; the card still fits on screen
//   4. nothing scrolls sideways
// Run: node tests/test_v095_welcome_tour_type.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const PIONEER = "You're among the first to vault, and shaping what this becomes.";
const TOUR = 'Want a 60-second tour? You can skip it now and access it later under ? Help.';

(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const w of [390, 1100]) {
    const phone = w < 700, T = w + ': ';
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 } });
    await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto(APP); await p.waitForTimeout(3000);
    await p.evaluate(async () => { _hydrateFromSupabase = async () => false; _guardAccountSwitch = async () => true; await _afterVerified({ id: 'u-w', email: 'w@example.com' }, 'w@example.com'); });
    await p.waitForTimeout(3500);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    const lead = await p.evaluate(() => (document.querySelector('#welcome-overlay .welcome-lead') || {}).textContent.trim());
    if (phone) ok(lead === PIONEER, '1 the Pioneer line is the tester\'s (' + lead + ')');
    // every piece of visible text and its size; field labels and notes by class
    const scan = (root) => p.evaluate((root) => { const out = []; document.querySelectorAll(root + ' *').forEach(el => {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) return;
      const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!own) return; out.push({ t: own.slice(0, 50), fs: parseFloat(cs.fontSize), lab: el.closest('.welcome-field label') ? 1 : 0 }); });
      return { out, sideways: document.documentElement.scrollWidth > innerWidth + 1 }; }, root);
    let worst = [], labels = [], side = false;
    for (let n = 1; n <= 6; n++) {
      await p.evaluate((n) => { wGo(n); if (n === 5) { const o = document.querySelector('#w-pot-opts .welcome-opt[data-pot="savings"]'); o && wPickPot(o); }
        if (n === 6) { const d = document.querySelector('#welcome-overlay details'); if (d) d.open = true; } }, n);
      await p.waitForTimeout(200);
      const r = await scan('#welcome-overlay'); side = side || r.sideways;
      worst = worst.concat(r.out.filter(x => x.fs < 12).map(x => 's' + n + ' ' + x.fs + ' ' + x.t));
      labels = labels.concat(r.out.filter(x => x.lab).map(x => x.fs));
    }
    ok(worst.length === 0, T + '2 no welcome text under 12 px' + (worst.length ? ': ' + worst.slice(0, 8).join(' | ') : ''));
    ok(labels.length >= 5 && Math.min(...labels) >= 12, T + '2 field labels at least 12 px (smallest ' + Math.min(...labels) + ')');
    const notes = await p.evaluate(() => { wGo(6); const q = s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length).map(e => parseFloat(getComputedStyle(e).fontSize));
      return q('#welcome-overlay .wz-note, #welcome-overlay .wz-skip, #welcome-overlay .welcome-opt span, #welcome-overlay .wz-phase-d, #welcome-overlay .wz-week'); });
    ok(notes.length >= 3 && Math.min(...notes) >= 13, T + '2 notes and option text at least 13 px (' + notes.join(',') + ')');
    // the tour
    await p.evaluate(() => { document.getElementById('welcome-overlay').style.display = 'none'; viTourStart(); });
    await p.waitForTimeout(1200);
    const t = await p.evaluate(() => { const f = id => parseFloat(getComputedStyle(document.getElementById(id)).fontSize); const c = document.getElementById('vt-card').getBoundingClientRect();
      return { body: document.getElementById('vt-body').textContent, b: f('vt-body'), title: f('vt-title'), skip: f('vt-skip'), next: f('vt-next'), fits: c.left >= 0 && c.right <= innerWidth && c.top >= 0 && c.bottom <= innerHeight }; });
    ok(t.body === TOUR, T + '1 the tour opens with the tester\'s offer (' + t.body + ')');
    ok(t.b >= (phone ? 14 : 16) && t.title >= 17 && t.skip >= 14 && t.next >= 14, T + '3 tour type: body ' + t.b + ', title ' + t.title + ', buttons ' + t.skip + '/' + t.next);
    ok(t.fits, T + '3 the tour card fits on screen');
    const tr = await scan('#vt-card'); const small = tr.out.filter(x => x.fs < 12);
    ok(small.length === 0, T + '2 no tour text under 12 px' + (small.length ? ': ' + small.map(x => x.fs + ' ' + x.t).join(' | ') : ''));
    await p.evaluate(() => { try { viTourMove(1); } catch (e) {} }); await p.waitForTimeout(1500);
    const t2 = await p.evaluate(() => { const c = document.getElementById('vt-card').getBoundingClientRect(); return { b: parseFloat(getComputedStyle(document.getElementById('vt-body')).fontSize), fits: c.left >= 0 && c.right <= innerWidth && c.top >= 0 && c.bottom <= innerHeight }; });
    ok(t2.b >= (phone ? 14 : 16) && t2.fits, T + '3 the next tour step: body ' + t2.b + ' px, card on screen');
    ok(!side && !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), T + '4 nothing scrolls sideways');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
