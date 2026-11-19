// Owner, 19 Nov 2026 phone check:
//   A. Help has a clear "Send feedback" button that opens the same feedback sheet (viFbOpen), one tap, on every Help view
//   B. the app opens on Overview after the welcome (new sign-up), after the tour (finished or skipped at any step),
//      for a returning user and in the demo (?demo=alex)
// Run: node tests/test_help_feedback_overview.js
require('./lib/vi');
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => {
  localStorage.setItem('vi-theme', o.theme); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-flag-house', '0');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  if (o.returning) { localStorage.setItem('vi_user', JSON.stringify({ name: 'Tess Tester', email: 't@t.com', logins: 3 })); localStorage.setItem('vi_tester_note', '1'); localStorage.setItem('vi_tour_done', 'done'); }
};
const tab = (p) => p.evaluate(() => (document.querySelector('.tab-panel.active, [id^="tab-"].active') || {}).id);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (w, theme, o, url) => {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 } });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(seed, Object.assign({ theme }, o)); await p.goto(url || APP); await p.waitForTimeout(1600);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner,#pro-offer-modal{display:none!important}' });
    return p;
  };
  for (const w of [390, 1100]) {
    const T = w + ': ';
    // A. Help -> Send feedback on each view
    let p = await open(w, 'night', { returning: true });
    for (const v of ['ask', 'faq', 'tour']) {
      await p.evaluate(() => viHelpOpen()); await p.waitForTimeout(250); await p.evaluate((v) => viHelpView(v), v);
      const vis = await p.evaluate(() => { const e = document.getElementById('vh-fb'); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 100 && r.height >= 40 && r.right <= innerWidth && /Send feedback/.test(e.textContent); });
      ok(vis, T + 'Help (' + v + ') shows a Send feedback button');
      await p.click('#vh-fb'); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !document.getElementById('vi-fb').hidden && !document.getElementById('vi-help').classList.contains('open')), T + 'one tap opens the feedback sheet from ' + v);
      await p.evaluate(() => viFbClose()); await p.waitForTimeout(150);
    }
    // B. tour skipped at step 0 and at a later step -> Overview
    p = await open(w, 'night', { returning: true });
    await p.evaluate(() => { showTab('budget'); viTourStart(); }); await p.waitForTimeout(900);
    await p.evaluate(() => viTourMove(1)); await p.waitForTimeout(900);
    await p.evaluate(() => viTourEnd(true)); await p.waitForTimeout(300);
    ok(await tab(p) === 'tab-overview', T + 'tour skipped part-way lands on Overview (' + await tab(p) + ')');
    await p.evaluate(() => { showTab('debt'); viTourStart(); }); await p.waitForTimeout(900);
    await p.evaluate(() => viTourEnd(true)); await p.waitForTimeout(300);
    ok(await tab(p) === 'tab-overview', T + 'tour skipped at step 1 lands on Overview (' + await tab(p) + ')');
    // new sign-up welcome -> Overview
    p = await open(w, 'night', { returning: false });
    await p.evaluate(() => { document.getElementById('w-income').value = '2000'; wStep2Submit(); }); await p.waitForTimeout(1200);
    ok(await tab(p) === 'tab-overview', T + 'after the welcome a new sign-up is on Overview (' + await tab(p) + ')');
    p = await open(w, 'night', { returning: false });
    await p.evaluate(() => wStep2Skip()); await p.waitForTimeout(1200);
    ok(await tab(p) === 'tab-overview', T + 'welcome skipped lands on Overview (' + await tab(p) + ')');
    // returning and demo
    p = await open(w, 'night', { returning: true });
    ok(await tab(p) === 'tab-overview', T + 'a returning user opens on Overview (' + await tab(p) + ')');
    p = await open(w, 'night', { returning: false }, APP + (APP.includes('?') ? '&' : '?') + 'demo=alex'); await p.waitForTimeout(1500);
    ok(await tab(p) === 'tab-overview', T + 'demo opens on Overview (' + await tab(p) + ')');
  }
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? 'RESULT: ' + fails + ' problem(s)' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
