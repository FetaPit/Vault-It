// Onboarding form edits, session A (owner, 12 Nov 2026, with a screenshot of the first welcome screen): "Do not ask for email address
// as it should auto populate from registering before. For the Where are you right now, add up to date iconograpohy from brand book. ...
// add 30 days free in header font in teal with free in gold. ... Instead of dream home target, put Target Home Value. Add Target Deposit
// Value. Ensure all this data pulls through to the tool". With "Onboarding answers feed the tools" (owner, 8 and 10 Nov: income is the
// starting figure, then Budget splits it into separate income streams) and the owner's 12 Nov decisions: expenses pre-fill as one rough
// row that real expenses draw down; headings in var(--font-display); Target Deposit Value in exact pounds.
//   1. e-mail: anyone who reached the welcome signed in (a kept session, an e-mailed code or PIN sign-in on this page) sees no e-mail
//      field and "Signed in as"; the registered address is saved, typed text never wins; vi_last_email and the sample's address never count
//   2. "Where are you right now": pack icons (vi-debt-tracker red, vi-piggy green, vi-house-builder gold, vi-net-worth teal), no glyphs;
//      the icon colour does not change when picked
//   3. "Target Home Value (£)" replaces "Dream Home Target"; "Target Deposit Value (£)" is new
//   4. the deposit in exact pounds: £25,000 on £237,000 is a deposit target of £25,000.00 in the House builder (10.5% shown);
//      empty keeps the 20% default (the hint says so, with the figure); outside 1 to 60%, or no home value: a hint, nothing saved
//   5. a home value typed with no house type survives a reload
//   6. pre-fill and draw-down (hand-worked):
//        income £2,400 -> one take-home row £2,400. Add "Side job" £400 -> rough £2,000 + £400 = £2,400 (no double count).
//        Add "Main job" £2,500 -> rough had £2,000, so it goes: £400 + £2,500 = £2,900.
//        spending £1,500 -> one "Monthly spending (rough)" row £1,500. Add "Rent" £900 -> rough £600, out £1,500.
//        Quick add "Takeaways" £700 -> rough had £600, so it goes: out £900 + £700 = £1,600.
//      skipped questions: no rows at all, no sample figure
//   7. "30 days free": heading font, teal, "free" gold; headings in var(--font-display), sub text and options in DM Sans
//   8. 390 Night and 1100 Daylight: no sideways scroll, no em dashes, no page errors
// Run: node tests/test_onboarding_form_a.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const HIDE = '#sync-banner,#trial-banner,#pro-offer-modal,#tester-welcome{display:none!important}';
const SESSION = (e) => ['vi_session', JSON.stringify({ email: e, expiry: Date.now() + 1e10 })];

async function open(b, w, theme, o) {   // o.ls: localStorage pairs
  const mob = w < 700;
  const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.addInitScript((a) => { window.__viPlanStub = 'on'; if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('vi-theme', a.theme); localStorage.setItem('vi_declined_demo', 'true'); (a.ls || []).forEach(([k, v]) => localStorage.setItem(k, v)); }, { theme, ls: o && o.ls });
  await p.goto(APP); await p.waitForTimeout(1500); await p.addStyleTag({ content: HIDE + (o && o.keepLogin ? '' : '#login-overlay{display:none!important}') });
  return p;
}
const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!(e && e.offsetParent !== null && !e.closest('[hidden]')); }, sel);
const side = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
async function signedIn(p) { await p.evaluate(() => { _supaUser = { id: 'u1', email: 't@t.com', user_metadata: { full_name: 'Tess Test' } }; viWelcomePrefill(); }); }
const ht3 = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('ht3') || '{}'));

(async () => {
  const b = await chromium.launch(); const errs = [];

  // ── 1. the e-mail is never asked when it is known ──
  {
    let p = await open(b, 390, 'dark', { ls: [SESSION('reg@t.com')] });
    ok(!(await vis(p, '#w-email')) && await vis(p, '#wz-signed') && /reg@t\.com/.test(await p.textContent('#wz-signed-email')), '1 a kept sign-in on this device: no e-mail field, "Signed in as reg@t.com"');
    await p.evaluate(() => { document.getElementById('w-email').value = 'typed@x.com'; });
    await p.click('#w-opts .welcome-opt[data-val="0"]'); await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
    await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(200); await p.click('#w-finish'); await p.waitForTimeout(900);
    const u = await p.evaluate(() => JSON.parse(localStorage.getItem('vi_user') || '{}'));
    ok(u.email === 'reg@t.com', '1 the registered address is the one saved, text in the hidden box never wins (' + u.email + ')');
    if (p._errs.length) errs.push('e1: ' + p._errs.join(' | ')); await p.context().close();

    p = await open(b, 390, 'dark', { keepLogin: true });
    ok(await p.evaluate(() => typeof viKnownEmail === 'function' && viKnownEmail() === ''), '1 nobody signed in: no address is known');
    await p.evaluate(() => { _authOTP = { email: 'pin@t.com' }; localStorage.setItem('vi_session', JSON.stringify({ email: 'pin@t.com', expiry: Date.now() + 1e10 })); document.getElementById('login-overlay').style.display = 'none'; });
    await p.waitForTimeout(300);
    ok(!(await vis(p, '#w-email')) && /pin@t\.com/.test(await p.textContent('#wz-signed-email')), '1 signed in on this page by code or PIN: the field goes when the sign-in card closes');
    if (p._errs.length) errs.push('e2: ' + p._errs.join(' | ')); await p.context().close();

    p = await open(b, 390, 'dark', { ls: [['vi_last_email', 'last@t.com']] });
    ok(await vis(p, '#w-email') && await p.evaluate(() => viKnownEmail() === ''), '1 only a last e-mail on a shared device: not used, the field shows');
    const demo = await p.evaluate(() => { localStorage.setItem('vi_demo_mode', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 'demo@vault-it.app', expiry: Date.now() + 1e10 }));
      localStorage.setItem('vi_user', JSON.stringify({ name: 'Alex', email: 'demo@vault-it.app' })); const r = viKnownEmail(); localStorage.removeItem('vi_demo_mode'); return r; });
    ok(demo === '', '1 the sample\'s address is never taken as the user\'s (' + demo + ')');
    if (p._errs.length) errs.push('e3: ' + p._errs.join(' | ')); await p.context().close();
  }

  // ── 2, 3, 4 (hints), 7, 8: the screens, phone Night and desktop Daylight ──
  for (const [w, theme] of [[390, 'dark'], [1100, 'light']]) {
    const T = w + ' ' + theme + ': ';
    const p = await open(b, w, theme); await signedIn(p);
    const ic = await p.evaluate(() => [...document.querySelectorAll('#w-opts .welcome-opt')].map(o => { const i = o.querySelector('.welcome-opt-icon'), u = i && i.querySelector('use');
      return { id: u ? (u.getAttribute('href') || '').slice(1) : '', glyph: i ? i.textContent.trim() : '', col: u ? getComputedStyle(i.querySelector('svg')).color : '' }; }));
    const tok = await p.evaluate(() => { const d = document.createElement('i'); document.body.appendChild(d); const c = (v) => { d.style.color = 'var(' + v + ')'; return getComputedStyle(d).color; };
      const r = { red: c('--red'), green: c('--green'), gold: c('--gold'), teal: c('--teal') }; d.remove(); return r; });
    ok(ic.map(x => x.id).join(',') === 'vi-debt-tracker,vi-piggy,vi-house-builder,vi-net-worth', T + '2 the four stages use the pack icons the menu uses (' + ic.map(x => x.id).join(',') + ')');
    ok(ic.every(x => x.glyph === ''), T + '2 no emoji or text glyph left (' + ic.map(x => x.glyph).join('') + ')');
    ok(ic[0].col === tok.red && ic[1].col === tok.green && ic[2].col === tok.gold && ic[3].col === tok.teal, T + '2 one colour per icon from the code: red, green, gold, teal (' + ic.map(x => x.col).join(' ') + ')');
    await p.click('#w-opts .welcome-opt[data-val="0"]');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#w-opts .welcome-opt[data-val="0"] .welcome-opt-icon svg')).color) === tok.red, T + '2 the icon keeps its colour when picked');

    const labs = await p.evaluate(() => ({ house: (document.querySelector('label[for="w-house"]') || {}).textContent || '', dep: (document.querySelector('label[for="w-deposit"]') || {}).textContent || '',
      text: document.getElementById('welcome-overlay').innerText }));
    ok(/^Target Home Value \(£\)/.test(labs.house.trim()), T + '3 "Target Home Value (£)" (' + labs.house.trim() + ')');
    ok(/^Target Deposit Value \(£\)/.test(labs.dep.trim()) && await vis(p, '#w-deposit'), T + '3 "Target Deposit Value (£)" is on the screen (' + labs.dep.trim() + ')');
    ok(!/dream home target/i.test(labs.text), T + '3 "Dream Home Target" is gone');
    ok(!/free, no card|no card needed/i.test(labs.text) && !/—/.test(labs.text), T + '8 no "no card" promise and no em dashes');

    const hint = async () => p.evaluate(() => { const h = document.getElementById('w-dep-hint'); return h && !h.hidden ? h.textContent : ''; });
    await p.click('#w-htypes .w-ht[data-type="terraced"]'); await p.fill('#w-house', '237000'); await p.waitForTimeout(80);
    let h = await hint(); ok(/20%/.test(h) && /£47,400/.test(h), T + '4 empty: the hint says the 20% default and what it comes to (' + h + ')');
    await p.fill('#w-deposit', '25000'); await p.waitForTimeout(80); h = await hint();
    ok(/10\.5%/.test(h), T + '4 £25,000 of £237,000 is shown as 10.5% (' + h + ')');
    await p.fill('#w-deposit', '200000'); await p.waitForTimeout(80); h = await hint();
    ok(/1% and 60%/.test(h), T + '4 more than 60%: a plain hint (' + h + ')');
    await p.fill('#w-house', ''); await p.fill('#w-deposit', '10000'); await p.waitForTimeout(80); h = await hint();
    ok(/home value/i.test(h), T + '4 no home value: the hint asks for it (' + h + ')');

    const F = await p.evaluate(() => { const root = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim().replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
      const ff = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontFamily.replace(/['"]/g, '').split(',')[0].trim().toLowerCase() : 'missing'; };
      const o = document.querySelector('.wz-offer'), fr = o && o.querySelector('.wz-free');
      return { root, h2: ff('#wz-s1 .welcome-h2'), q: ff('#wz-s1 .wz-q'), sub: ff('#wz-s1 .welcome-sub'), opt: ff('#w-opts .welcome-opt'), offer: o ? o.textContent.trim() : '', oc: o ? getComputedStyle(o).color : '', fc: fr ? getComputedStyle(fr).color : '' }; });
    ok(F.h2 === F.root && F.q === F.root, T + '7 headings and questions in var(--font-display) (' + F.root + ': ' + F.h2 + ', ' + F.q + ')');
    ok(F.sub === 'dm sans' && F.opt === 'dm sans', T + '7 sub text and options in DM Sans (' + F.sub + ', ' + F.opt + ')');
    ok(F.offer === '30 days free' && F.oc === tok.teal && F.fc === tok.gold, T + '7 "30 days free" in the heading font, teal, "free" gold (' + F.offer + ' ' + F.oc + ' ' + F.fc + ')');
    ok((await side(p)) <= 1, T + '8 screen 1: no sideways scroll');
    await p.fill('#w-deposit', ''); await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
    ok((await side(p)) <= 1, T + '8 screen 2: no sideways scroll');
    await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(200);
    ok((await side(p)) <= 1, T + '8 screen 3: no sideways scroll');
    if (p._errs.length) errs.push(T + p._errs.join(' | ')); await p.context().close();
  }

  // ── 4 and 6: every answer, then the tools ──
  {
    const p = await open(b, 1100, 'dark'); await signedIn(p);
    await p.click('#w-opts .welcome-opt[data-val="2"]'); await p.click('#w-htypes .w-ht[data-type="terraced"]');
    await p.fill('#w-house', '237000'); await p.fill('#w-deposit', '25000');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
    await p.fill('#w-income', '2400'); await p.fill('#w-expenses', '1500');
    await p.click('#w-pot-opts .welcome-opt[data-pot="none"]'); await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(250);
    await p.click('#w-finish'); await p.waitForTimeout(1200);
    const h = await ht3(p);
    const dt = await p.evaluate(() => depositTarget());
    ok(h.houseType === 'terraced' && h.target === 237000 && h.prices.terraced === 237000, '4 house type and Target Home Value land in the House builder (' + h.houseType + ' ' + h.target + ')');
    ok(Math.abs(dt - 25000) < 0.005 && Math.abs(h.depositPct * 237000 / 100 - 25000) < 0.005, '4 the deposit target is the £25,000 typed, to the penny (' + dt + ', ' + h.depositPct + '%)');
    await p.evaluate(() => { try { setSetting('view', 'adv'); } catch (e) {} showTab('house'); try { updateUI(); } catch (e) {} }); await p.waitForTimeout(500);
    const hb = await p.evaluate(() => ({ pct: (document.getElementById('depositPctInput') || {}).value, amt: (document.getElementById('depositPctAmt') || {}).textContent || '', brick: (typeof bricksTotal !== 'undefined') }));
    ok(hb.pct === '10.5' && /£25,000|£25\.0k/.test(hb.amt), '4 the House builder shows 10.5% = £25,000 (gbpFmt may shorten it to £25.0k) (' + hb.pct + ' ' + hb.amt + ')');
    const ov = await p.evaluate(() => ({ inc: ovState.income.map(r => [r.name, r.amount, !!r._onboarding]), exp: ovState.expenses.map(r => [r.name, r.amount, !!r._onboarding]),
      u: JSON.parse(localStorage.getItem('vi_user') || '{}'), stage: journeyState.stageOverride }));
    ok(ov.inc.length === 1 && ov.inc[0][1] === 2400 && ov.inc[0][2], '6 income pre-fills one take-home row of £2,400 (' + JSON.stringify(ov.inc) + ')');
    ok(ov.exp.length === 1 && ov.exp[0][1] === 1500 && ov.exp[0][2] && /rough/i.test(ov.exp[0][0]), '6 spending pre-fills one rough row of £1,500 (' + JSON.stringify(ov.exp) + ')');
    ok(ov.u.name === 'Tess' && ov.u.email === 't@t.com' && ov.stage === 2, '6 first name, e-mail and the stage carry through (' + ov.u.name + ' ' + ov.u.email + ' ' + ov.stage + ')');

    await p.evaluate(() => showTab('budget')); await p.waitForTimeout(300);
    const nudge = await p.evaluate(() => (document.getElementById('bd-nudge') || {}).textContent || '');
    ok(/rough/i.test(nudge) && /income|take-home/i.test(nudge), '6 Budget says the rough figures come off as real lines go in (' + nudge.slice(0, 160) + ')');
    const tot = () => p.evaluate(() => ({ tin: Math.round(cfTotalIn() * 100) / 100, tout: Math.round(cfTotalOut() * 100) / 100, inc: ovState.income.map(r => r.amount), exp: ovState.expenses.map(r => r.amount),
      roughIn: (ovState.income.find(r => r._onboarding) || {}).amount, roughOut: (ovState.expenses.find(r => r._onboarding) || {}).amount }));
    await p.evaluate(() => { document.getElementById('cf-inc-name').value = 'Side job'; document.getElementById('cf-inc-amt').value = '400'; addIncome(); });
    let t = await tot(); ok(t.roughIn === 2000 && t.tin === 2400, '6 a £400 side job comes off the take-home: £2,000 + £400 = £2,400 (' + JSON.stringify(t.inc) + ')');
    await p.evaluate(() => { document.getElementById('cf-inc-name').value = 'Main job'; document.getElementById('cf-inc-amt').value = '2500'; addIncome(); });
    t = await tot(); ok(t.roughIn === undefined && t.tin === 2900, '6 a £2,500 main job uses up the £2,000 left: the rough row goes, £400 + £2,500 = £2,900 (' + JSON.stringify(t.inc) + ')');
    await p.evaluate(() => { document.getElementById('cf-exp-name').value = 'Rent'; document.getElementById('cf-exp-amt').value = '900'; addExpense(); });
    t = await tot(); ok(t.roughOut === 600 && t.tout === 1500, '6 £900 rent comes off the rough spending: £600 + £900 = £1,500 (' + JSON.stringify(t.exp) + ')');
    await p.evaluate(() => { bdFold('vn'); document.getElementById('bd-qa-n-vn').value = 'Takeaways'; document.getElementById('bd-qa-a-vn').value = '700'; bdQuickAdd('vn'); });
    t = await tot(); ok(t.roughOut === undefined && t.tout === 1600, '6 £700 takeaways use up the £600 left: the rough row goes, £900 + £700 = £1,600 (' + JSON.stringify(t.exp) + ')');
    if (p._errs.length) errs.push('full: ' + p._errs.join(' | ')); await p.context().close();
  }

  // ── 4 and 6: skipped answers and deposits that cannot be used save nothing ──
  {
    let p = await open(b, 390, 'dark'); await signedIn(p);
    await p.click('#w-opts .welcome-opt[data-val="0"]'); await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
    await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(200); await p.click('#w-finish'); await p.waitForTimeout(900);
    const sk = await p.evaluate(() => ({ inc: ovState.income.length, exp: ovState.expenses.length, pct: state.depositPct }));
    ok(sk.inc === 0 && sk.exp === 0 && sk.pct === 20, '6 skipped: no income row, no spending row, no sample figure; the deposit stays at the 20% default (' + JSON.stringify(sk) + ')');
    if (p._errs.length) errs.push('skip: ' + p._errs.join(' | ')); await p.context().close();

    for (const [house, dep, why] of [['237000', '200000', 'more than 60%'], ['', '10000', 'no home value']]) {
      p = await open(b, 390, 'dark'); await signedIn(p);
      await p.click('#w-opts .welcome-opt[data-val="2"]'); await p.click('#w-htypes .w-ht[data-type="semi"]'); if (house) await p.fill('#w-house', house); await p.fill('#w-deposit', dep);
      await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200); await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(200); await p.click('#w-finish'); await p.waitForTimeout(900);
      const d = await ht3(p); ok(d.depositPct === 20, '4 ' + why + ': nothing saved for the deposit, 20% stands (' + d.depositPct + ')');
      if (p._errs.length) errs.push(why + ': ' + p._errs.join(' | ')); await p.context().close();
    }
  }

  // ── 5. a home value with no house type survives a reload ──
  {
    const p = await open(b, 390, 'dark'); await signedIn(p);
    await p.click('#w-opts .welcome-opt[data-val="2"]'); await p.fill('#w-house', '180000');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200); await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(200); await p.click('#w-finish'); await p.waitForTimeout(900);
    const before = await ht3(p);
    await p.reload(); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => ({ t: state.target, ht: JSON.parse(localStorage.getItem('ht3') || '{}') }));
    ok(before.target === 180000 && after.t === 180000 && after.ht.prices[after.ht.houseType] === 180000, '5 £180,000 with no house type picked is still the target after a reload (' + before.target + ' -> ' + after.t + ')');
    if (p._errs.length) errs.push('reload: ' + p._errs.join(' | ')); await p.context().close();
  }

  ok(errs.length === 0, '8 no page errors' + (errs.length ? ': ' + errs.join(' ; ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: script ' + (e && e.message)); process.exit(1); });
