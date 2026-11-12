// v0.95 (owner, 8 Nov 2026): "Ensure we ask a question onboarding if they have a lifetime isa or a savings account only for a
// house deposit and its value and interest rate. Then populate that in the housebuiliding tab. With a ground up slow entry animation".
//   1. the onboarding has a deposit pot on the money screen (Step 2 of 3 since 10 Nov 2026): Lifetime ISA / savings account / Not yet; a Yes shows value and rate;
//      Next on a Yes with no amount says so and stays; Skip and Not yet go on to the plan; Back works
//   2. finishing with a pot records it like Lay the bricks: saved, one dated deposit with its account note, state.depAcct type and
//      rate, the brick value unchanged; Not yet records nothing
//   3. the House Builder shows the pot: saved total, the Deposit account card with the type and rate, FCA line kept
//   4. the first House Builder open after onboarding lays every brick from the ground over about 5 s (house_gl stamps), once;
//      the next open lays only what is new; reduced motion shows the finished state at once
//   5. a demo device that signs up keeps no sample deposits (ht3 is in the demo wipe list)
//   6. phone and Daylight: no sideways scroll, no em dashes, no page errors
// Run: node tests/test_v095_onboarding_pot.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const HIDE = '#login-overlay,#sync-banner,#trial-banner,#pro-offer-modal,#tester-welcome{display:none!important}';
const POT = { saved: 6000, target: 200000, houseType: 'terraced', depositPct: 20, deposits: [{ amount: 6000, date: '08/11/2026', acct: { t: 'lisa_cash', n: '', r: 4.5 } }], depAcct: { type: 'lisa_cash', name: '', rate: 4.5 } };

async function open(b, w, theme, o) {   // o.ls: localStorage pairs; o.reduce: prefers-reduced-motion
  const mob = w < 700;
  const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, reducedMotion: o && o.reduce ? 'reduce' : 'no-preference' });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.addInitScript((a) => { localStorage.setItem('vi-theme', a.theme); localStorage.setItem('vi_declined_demo', 'true'); (a.ls || []).forEach(([k, v]) => localStorage.setItem(k, v)); }, { theme, ls: o && o.ls });
  await p.goto(APP); await p.waitForTimeout(1500); await p.addStyleTag({ content: HIDE });
  return p;
}
const scr = (p) => p.evaluate(() => { const v = [...document.querySelectorAll('#welcome-overlay .wz-screen')].filter(s => s.offsetParent !== null);
  return { n: v.length, at: v[0] ? v[0].dataset.s : '', count: (document.getElementById('wz-count') || {}).textContent || '', side: document.documentElement.scrollWidth - innerWidth }; });
async function toPot(p) {   // signed in (name from Google), where you are, money, home: lands on the deposit pot screen
  await p.evaluate(() => { _supaUser = { id: 'u1', email: 't@t.com', user_metadata: { full_name: 'Tess Test' } }; viWelcomePrefill(); });
  await p.click('#w-opts .welcome-opt[data-val="2"]'); await p.click('#w-htypes .w-ht[data-type="terraced"]'); await p.fill('#w-house', '200000');
  await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(150);
  await p.fill('#w-income', '2000'); await p.fill('#w-expenses', '1500'); await p.waitForTimeout(100);
}
const USER = [['vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })], ['vi_user', JSON.stringify({ name: 'Tess', email: 't@t.com', logins: 2 })]];
async function houseStats(p) {   // open the House Builder and read the renderer's opening figures
  await p.evaluate(() => { try { setSetting('view', 'adv'); } catch (e) {} showTab('house'); }); await p.waitForTimeout(600);
  await p.evaluate(() => { const el = document.getElementById('house-scene'); if (el) el.scrollIntoView({ block: 'center' }); });
  await p.waitForFunction(() => /Each brick ≈/.test((document.getElementById('hb-hud') || {}).innerText || ''), null, { timeout: 30000 }).catch(() => {});
  await p.waitForFunction(() => { const v = window.HB3DAPP && HB3DAPP.viewer; return !!(v && v._stats && (v._stats.openAdd != null || v._stats.settledAtOpen > 0) && v._bDraws); }, null, { timeout: 20000 }).catch(() => {});
  return p.evaluate(() => { const v = HB3DAPP.viewer, S = (v && v._stats) || {}; return { engine: v && v.engine, settled: S.settledAtOpen, add: S.openAdd, units: S.openUnits, gap: S.openGapMs, slow: S.openSlow, entry: localStorage.getItem('vi_hb_entry'), p: v && v.p,
    hud: (document.getElementById('hb-hud') || {}).innerText || '', card: (document.getElementById('hb-dacct') || {}).innerText || '' }; });
}

(async () => {
  const b = await chromium.launch(); const errs = [];
  // ── 1 and 6: the screen, phone Night and desktop Daylight ──
  for (const [w, theme] of [[390, 'dark'], [1100, 'light']]) {
    const T = w + ' ' + theme + ': ';
    const p = await open(b, w, theme);
    let s = await scr(p); ok(/Step 1 of 3/.test(s.count), T + '1 three steps now (' + s.count + ')');
    await toPot(p); s = await scr(p);
    ok(s.n === 1 && s.at === '2' && /Step 2 of 3/.test(s.count), T + '1 after the home comes your money and the deposit pot, Step 2 of 3 (' + JSON.stringify(s) + ')');
    const q = await p.evaluate(() => ({ q: document.getElementById('w-pot-lbl').textContent, opts: [...document.querySelectorAll('#w-pot-opts .welcome-opt')].map(x => x.dataset.pot), fields: document.getElementById('w-pot-fields').hidden, text: document.getElementById('wz-s2').innerText,
      cta: (() => { const r = document.querySelector('#wz-s2 .welcome-cta').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; })() }));
    ok(/Lifetime ISA/.test(q.q) && /savings account/.test(q.q) && /house deposit/.test(q.q), T + '1 the question names a Lifetime ISA or a savings account kept only for the house deposit (' + q.q + ')');
    ok(q.opts.join(',') === 'lisa_cash,savings,none' && q.fields, T + '1 three answers; value and rate hidden until a Yes');
    ok(q.cta, T + '1 Next is on screen without scrolling');
    ok(!/—/.test(q.text), T + '6 no em dashes on the pot screen');
    ok(s.side <= 1, T + '6 no sideways scroll (' + s.side + ')');
    await p.click('#w-pot-opts .welcome-opt[data-pot="lisa_cash"]'); await p.waitForTimeout(120);
    const shown = await p.evaluate(() => ({ f: !document.getElementById('w-pot-fields').hidden, pressed: document.querySelector('#w-pot-opts .welcome-opt[data-pot="lisa_cash"]').getAttribute('aria-pressed'),
      labels: [...document.querySelectorAll('#w-pot-fields label')].map(l => l.textContent), side: document.documentElement.scrollWidth - innerWidth }));
    ok(shown.f && shown.pressed === 'true' && /How much/.test(shown.labels[0]) && /Interest rate/.test(shown.labels[1]) && shown.side <= 1, T + '1 a Yes reveals how much is in it and its interest rate (' + shown.labels.join(' | ') + ')');
    const lab = await p.evaluate(() => Math.min(...[...document.querySelectorAll('#w-pot-fields label')].map(l => parseFloat(getComputedStyle(l).fontSize))));
    ok(lab >= 10.5, T + '1 the field labels sit on the type floor (Pedro: ' + lab + ' px, floor 10.5)');
    await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(150); s = await scr(p);
    ok(s.at === '2' && (await p.evaluate(() => !document.getElementById('w-pot-hint').hidden)), T + '1 Next with no amount stays and says what is missing');
    await p.fill('#w-pot-value', '50'); await p.waitForTimeout(60);
    ok(await p.evaluate(() => document.getElementById('w-pot-value').style.borderColor === ''), T + '1 typing an amount clears the red border (Pedro)');
    await p.fill('#w-pot-value', '');
    await p.click('#wz-back'); await p.waitForTimeout(150); s = await scr(p); ok(s.at === '1', T + '1 Back returns to the home screen');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(150);
    await p.click('#w-pot-opts .welcome-opt[data-pot="none"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.getElementById('w-pot-fields').hidden && document.getElementById('w-pot-hint').hidden), T + '1 Not yet hides the fields and the hint');
    await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(300); s = await scr(p);
    ok(s.at === '3' && /Step 3 of 3/.test(s.count) && (await p.evaluate(() => !!document.querySelector('#wz-s3 #wz-plan .wz-phase'))), T + '1 Skip goes on to the plan, Step 3 of 3');
    if (p._errs.length) errs.push(T + p._errs.join(' | '));
    await p.context().close();
  }

  // ── 2, 3 and 4: a Lifetime ISA pot of £6,000 at 4.5%, then the House Builder ──
  let p = await open(b, 1100, 'dark'); await toPot(p);
  await p.click('#w-pot-opts .welcome-opt[data-pot="lisa_cash"]'); await p.waitForTimeout(500); await p.fill('#w-pot-value', '6000'); await p.fill('#w-pot-rate', '4.5');
  await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(250);
  ok((await scr(p)).at === '3', '2 a filled Yes goes on to the plan');
  await p.click('#w-finish');
  const entry0 = await p.evaluate(() => localStorage.getItem('vi_hb_entry'));   // read at once: the plan's step opens the House Builder 250 ms later, which uses the note
  await p.waitForTimeout(900);
  const saved = await p.evaluate((e0) => { const h = JSON.parse(localStorage.getItem('ht3') || '{}'); return { saved: h.saved, n: (h.deposits || []).length, d: (h.deposits || [])[0], acct: h.depAcct, target: h.target, type: h.houseType, entry: e0, habit: (h.habitLog || []).length }; }, entry0);
  ok(saved.saved === 6000 && saved.n === 1 && saved.d && saved.d.amount === 6000 && /^\d{2}\/\d{2}\/\d{4}$/.test(saved.d.date), '2 the pot is one dated deposit of £6,000 and saved is £6,000 (' + JSON.stringify(saved.d) + ')');
  ok(saved.d && saved.d.acct && saved.d.acct.t === 'lisa_cash' && saved.d.acct.r === 4.5 && saved.acct && saved.acct.type === 'lisa_cash' && saved.acct.rate === 4.5, '2 the deposit note and state.depAcct carry the Lifetime ISA and its 4.5% rate (' + JSON.stringify(saved.acct) + ')');
  ok(saved.target === 200000 && saved.type === 'terraced' && saved.entry === '1', '2 the typed £200,000 terraced target stands and the ground-up entry was noted for the House Builder');
  ok(saved.habit === 0, '2 the pot is money already put aside: no habit contribution is logged for this week (Pedro) (' + saved.habit + ')');
  const st = await houseStats(p);
  ok(/£6,000 saved|£6\.0k saved/.test(st.hud) && /Each brick ≈ £1\.47/.test(st.hud), '3 the HUD shows £6,000 saved and the brick value unchanged (' + st.hud.replace(/\s+/g, ' ').slice(0, 140) + ')');
  ok(/Lifetime ISA \(cash\)/.test(st.card) && /4\.5% AER/.test(st.card) && /Not regulated by the FCA/.test(st.card), '3 the Deposit account card names the Lifetime ISA, 4.5% AER, FCA line kept (' + st.card.replace(/\s+/g, ' ').slice(0, 120) + ')');
  ok((st.card.match(/Lifetime ISA \(cash\)/g) || []).length === 1, '3 with no provider named, the card says the account type once (Pedro)');
  ok(st.engine === 'house_gl', '4 the brand renderer draws the house (' + st.engine + ')');
  ok(st.settled === 0 && st.add > 0 && st.slow === true, '4 nothing stood at open: every brick of the pot lays from the ground (' + JSON.stringify({ settled: st.settled, bricks: st.add, units: st.units, slow: st.slow }) + ')');
  ok(st.units > 0 && Math.abs(st.gap - Math.min(120, 5000 / st.units)) < 0.01, '4 spread over about 5 s, 120 ms a brick at most (' + (st.gap || 0).toFixed(1) + ' ms x ' + st.units + ' = ' + Math.round((st.gap || 0) * (st.units || 0)) + ' ms)');
  ok(st.entry === null, '4 the entry note is used once');
  if (p._errs.length) errs.push('pot: ' + p._errs.join(' | '));
  await p.context().close();

  // 4b the next open lays only what is new (no entry note): the shell stands at once
  p = await open(b, 1100, 'dark', { ls: USER.concat([['ht3', JSON.stringify(POT)]]) });
  const again = await houseStats(p);
  ok(again.engine === 'house_gl' && again.settled > 0 && !again.slow, '4 a later open: the shell stands at once, only the top course lays (' + JSON.stringify({ settled: again.settled, slow: again.slow }) + ')');
  if (p._errs.length) errs.push('again: ' + p._errs.join(' | ')); await p.context().close();
  // 4c reduced motion with the entry note: the finished pot at once
  p = await open(b, 1100, 'dark', { reduce: true, ls: USER.concat([['ht3', JSON.stringify(POT)], ['vi_hb_entry', '1']]) });
  const red = await houseStats(p);
  ok(red.engine === 'house_gl' && red.settled > 0 && !(red.add > 0) && red.entry === null, '4 reduced motion: the pot stands at once, nothing animates, the note is used (' + JSON.stringify({ settled: red.settled, add: red.add }) + ')');
  if (p._errs.length) errs.push('reduced: ' + p._errs.join(' | ')); await p.context().close();

  // ── 2b: Not yet records nothing ──
  p = await open(b, 390, 'dark'); await toPot(p);
  await p.click('#w-pot-opts .welcome-opt[data-pot="none"]'); await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(250);
  await p.click('#w-finish'); await p.waitForTimeout(900);
  const none = await p.evaluate(() => { const h = JSON.parse(localStorage.getItem('ht3') || '{}'); return { saved: h.saved, n: (h.deposits || []).length, acct: h.depAcct, entry: localStorage.getItem('vi_hb_entry') }; });
  ok(none.saved === 0 && none.n === 0 && !none.acct && none.entry === null, '2 Not yet: no deposit, no account note, no entry (' + JSON.stringify(none) + ')');
  // ── 5: a demo device that signs up keeps no sample deposits ──
  const demo = await p.evaluate(() => { const inList = _DEMO_DATA_KEYS.indexOf('ht3') >= 0; localStorage.setItem('ht3', JSON.stringify({ saved: 18500, deposits: [{ amount: 18500, date: '01/10/2026' }] })); localStorage.setItem('vi_demo_mode', 'true');
    _wipeDemoData('t@t.com'); return { inList, ht3: localStorage.getItem('ht3'), demo: localStorage.getItem('vi_demo_mode') }; });
  ok(demo.inList && demo.ht3 === null && demo.demo === null, '5 the demo wipe at sign-up drops the sample house deposits (' + JSON.stringify(demo) + ')');
  if (p._errs.length) errs.push('none: ' + p._errs.join(' | ')); await p.context().close();

  ok(errs.length === 0, '6 no page errors' + (errs.length ? ': ' + errs.join(' ; ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: script ' + (e && e.message)); process.exit(1); });
