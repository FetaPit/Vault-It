// Google sign-in and the first-run onboarding (owner, 5 Nov 2026: "sign up and sign in ... with google accounts",
// "redesign initial onboarding from the Help Bnk feedback": a few questions, then a plan in phases with one easy step,
// and a clear weekly cadence, so nobody is left feeling lost).
//   A. Google
//   1. the Google button is hidden while the Supabase Google provider is off, and shows (above the email field) when it is on
//   2. tapping it starts Supabase's Google sign-in, back to this page, and remembers that Google was chosen
//   3. a Google sign-in that comes back with an error says so on the sign-in card and cleans the address bar
//   4. a session that came from Google skips the PIN prompt; an emailed-code session does not
//   B. Onboarding
//   5. three screens, "Step n of 3" (owner, 10 Nov 2026: less friction; was 6), Back works
//   6. signed in: the email is never asked again and the first name comes from Google
//   7. the plan screen: three phases from where you are, one step for this week, your own sums, the check-in day (today; Settings changes it)
//   8. finishing saves the check-in day and opens the step's tab; on check-in day the app says the next step, once
//   9. phone and Daylight: no sideways scroll; no em dashes; privacy notice names Google sign-in; no page errors
// Run: node tests/test_google_onboarding.js
require('./lib/vi');
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SETTINGS = /legpubblzgknxdtvsant\.supabase\.co\/auth\/v1\/settings/;
// a JWT-shaped token whose payload has the given sign-in methods (only the payload is read by the app)
const tok = (methods) => 'x.' + Buffer.from(JSON.stringify({ amr: methods.map(m => ({ method: m, timestamp: 1 })) })).toString('base64').replace(/=+$/, '') + '.y';

(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (w, theme, google, extra) => {
    const mob = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    await ctx.route(SETTINGS, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external: { google: !!google, email: true } }) }));
    await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.addInitScript((o) => { localStorage.setItem('vi-theme', o.theme); localStorage.setItem('vi_declined_demo', 'true'); if (o.extra) o.extra.forEach(([k, v]) => localStorage.setItem(k, v)); }, { theme, extra: extra || null });
    await p.goto(APP + (extra && extra.hash ? extra.hash : '')); await p.waitForTimeout(1500);
    return p;
  };
  const gbtn = (p) => p.evaluate(() => { const g = document.getElementById('auth-google'), e = document.getElementById('auth-email'); if (!g) return { has: false };
    const r = g.getBoundingClientRect(); return { has: true, vis: !g.hidden && r.height >= 44, above: r.bottom <= e.getBoundingClientRect().top, txt: g.textContent.trim(), fit: r.left >= 0 && r.right <= innerWidth }; });

  // ── A1: hidden while off, shown when on ──
  let p = await open(390, 'dark', false);
  let g = await gbtn(p);
  ok(g.has && !g.vis, 'A1 Google provider off: no Google button');
  await p.context().close();
  p = await open(390, 'dark', true);
  g = await gbtn(p);
  ok(g.vis && g.above && /Continue with Google/.test(g.txt) && g.fit, 'A1 Google provider on: "Continue with Google" shows above the email field (' + JSON.stringify(g) + ')');
  ok(await p.evaluate(() => { const o = document.getElementById('auth-google-or'); return !!o && !o.hidden && /email/i.test(o.textContent); }), 'A1 an "or use your email" line separates the two ways in');

  // ── A2: tapping starts the Google sign-in ──
  const call = await p.evaluate(async () => { let got = null; if (!_supaClient) _supaClient = { auth: {} }; _supaClient.auth.signInWithOAuth = async (a) => { got = a; return { data: {}, error: null }; };
    await authGoogle(); return { got, via: localStorage.getItem('vi_auth_via'), here: location.origin + location.pathname }; });
  ok(call.got && call.got.provider === 'google' && call.got.options && call.got.options.redirectTo === call.here, 'A2 starts Supabase Google sign-in and comes back to this page (' + JSON.stringify(call.got) + ')');
  ok(call.via === 'google', 'A2 remembers that Google was chosen');
  const bad = await p.evaluate(async () => { _supaClient.auth.signInWithOAuth = async () => ({ data: null, error: { message: 'Unsupported provider' } }); await authGoogle();
    const e = document.getElementById('auth-err'); return e.style.display !== 'none' && /Google/.test(e.textContent); });
  ok(bad, 'A2 a refused Google start says so on the card');
  await p.context().close();

  // ── A3: an error coming back from Google ──
  const ex = [['vi_auth_via', 'google']]; ex.hash = '#error=access_denied&error_code=403&error_description=The+user+cancelled';
  p = await open(390, 'dark', true, ex);
  const back = await p.evaluate(() => ({ err: document.getElementById('auth-err').textContent, shown: document.getElementById('auth-err').style.display !== 'none', hash: location.hash, login: getComputedStyle(document.getElementById('login-overlay')).display }));
  ok(back.shown && /Google/.test(back.err) && /email/i.test(back.err), 'A3 a Google error shows on the sign-in card with the email way out (' + back.err + ')');
  ok(back.hash === '' && back.login !== 'none', 'A3 the address bar is cleaned and the sign-in card stays');

  // ── A4: PIN prompt skipped for Google sessions only ──
  const pin = await p.evaluate((t) => ({ g: _viViaGoogle({ access_token: t.g, user: { app_metadata: { provider: 'email' } } }), e: _viViaGoogle({ access_token: t.e, user: { app_metadata: { provider: 'email' } } }),
    none: _viViaGoogle(null) }), { g: tok(['oauth']), e: tok(['otp']) });
  ok(pin.g === true && pin.e === false && pin.none === false, 'A4 a Google session skips the PIN prompt, an emailed-code session does not (' + JSON.stringify(pin) + ')');
  await p.context().close();

  // ── B: onboarding ──
  for (const [w, theme] of [[390, 'dark'], [1100, 'light'], [390, 'light']]) {
    const T = 'B ' + w + ' ' + theme + ': ';
    p = await open(w, theme, false);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    const scr = () => p.evaluate(() => { const v = [...document.querySelectorAll('#welcome-overlay .wz-screen')].filter(s => s.offsetParent !== null);
      return { n: v.length, at: v[0] ? v[0].dataset.s : '', count: (document.getElementById('wz-count') || {}).textContent || '', side: document.documentElement.scrollWidth - innerWidth }; });
    let s = await scr();
    ok(s.n === 1 && s.at === '1' && /Step 1 of 3/.test(s.count), T + 'B5 one screen at a time, Step 1 of 3 (' + JSON.stringify(s) + ')');
    // B6: signed in with Google: name filled, email not asked
    const pre = await p.evaluate(() => { _supaUser = { id: 'u1', email: 't@t.com', user_metadata: { full_name: 'Tess Test' } }; viWelcomePrefill();
      const f = document.getElementById('w-email-field'), si = document.getElementById('wz-signed');
      return { name: document.getElementById('w-name').value, email: document.getElementById('w-email').value, fHidden: !f || f.offsetParent === null, signed: si && si.offsetParent !== null ? si.textContent : '' }; });
    ok(pre.name === 'Tess' && pre.email === 't@t.com' && pre.fHidden && /t@t\.com/.test(pre.signed), T + 'B6 signed in: first name from Google, email not asked again (' + JSON.stringify(pre) + ')');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => { const h = document.getElementById('wz-goal-hint'); return !!h && h.offsetParent !== null && document.querySelector('#wz-s1').offsetParent !== null; }), T + 'Pedro 3: Next with nothing picked shows a cue on the screen, and stays');
    await p.click('#w-opts .welcome-opt[data-val="0"]');
    ok(await p.evaluate(() => document.getElementById('wz-goal-hint').hidden), T + 'Pedro 3: picking clears the cue');
    await p.click('#w-htypes .w-ht[data-type="terraced"]');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(150);
    s = await scr(); ok(s.at === '2' && /Step 2 of 3/.test(s.count), T + 'B5 where you are and your home, then your money and deposit pot (Step 2 of 3)');
    await p.click('#wz-back'); await p.waitForTimeout(150);
    s = await scr(); ok(s.at === '1', T + 'B5 Back returns to step 1');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(150);
    await p.fill('#w-income', '2000'); await p.fill('#w-expenses', '1500');
    await p.click('#w-pot-opts .welcome-opt[data-pot="none"]'); await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(250);
    s = await scr();
    const plan = await p.evaluate(() => { const el = document.getElementById('wz-plan');
      return { ph: [...el.querySelectorAll('.wz-phase-name')].map(x => x.textContent.trim()), now: (el.querySelector('.wz-phase.now .wz-phase-name') || {}).textContent || '',
        step: (el.querySelector('.wz-week') || {}).textContent || '', sums: (el.querySelector('.wz-sums') || {}).textContent || '', day: (document.getElementById('wz-day-name') || {}).textContent || '',
        cta: (document.getElementById('w-finish') || {}).textContent || '', text: document.getElementById('welcome-overlay').innerText }; });
    ok(s.at === '3' && /Step 3 of 3/.test(s.count), T + 'B7 the last screen is your plan');
    ok(plan.ph.join(',') === 'Survival,Stabilise,Save' && plan.now === 'Survival', T + 'B7 three phases from where you are, the first marked now (' + plan.ph.join(',') + ')');
    ok(/Debt tracker/.test(plan.step) && /this week/i.test(plan.step), T + 'B7 one step for this week, in the app (' + plan.step.slice(0, 90) + ')');
    ok(/£2,000/.test(plan.sums) && /£1,500/.test(plan.sums) && /£500/.test(plan.sums), T + 'B7 your own sums: £2,000 in, £1,500 out, about £500 left (' + plan.sums + ')');
    ok(plan.day === ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()] && /Settings/.test(plan.text), T + 'B7 the weekly check-in day is today, changed in Settings (' + plan.day + ')');
    ok(!/—/.test(plan.text), T + 'B9 no em dashes on the onboarding screens');
    const look = await p.evaluate(() => { const f = document.getElementById('w-finish').getBoundingClientRect(); return { ctaSeen: f.top >= 0 && f.bottom <= innerHeight + 1 }; });
    ok(look.ctaSeen, T + "Pedro 1: Start this week's step is on screen without scrolling (" + JSON.stringify(look) + ')');
    s = await scr(); ok(s.side <= 1, T + 'B9 no sideways scroll (' + s.side + ')');
    if (w === 390 && theme === 'dark') await p.screenshot({ path: require('path').join(require('./lib/vi').REPO, 'shots/brand/onboarding-plan-dark-390.png') });
    // B8: finish
    await p.click('#w-finish'); await p.waitForTimeout(900);
    const fin = await p.evaluate(() => { const u = JSON.parse(localStorage.getItem('vi_user') || '{}'), act = document.querySelector('.tab-panel.active');
      return { day: u.checkin && u.checkin.day, step: u.checkin && u.checkin.step, hidden: getComputedStyle(document.getElementById('welcome-overlay')).display === 'none', tab: act ? act.id : '' }; });
    ok(fin.day === new Date().getDay() && fin.step === 'debt' && fin.hidden, T + 'B8 finishing saves the check-in day (today) and closes the onboarding (' + JSON.stringify(fin) + ')');
    ok(fin.tab === 'tab-debt', T + "B8 and opens this week's step (" + fin.tab + ')');
    await p.context().close();
  }

  // ── B8: check-in day nudge, once a day ──
  const today = new Date().getDay();
  p = await open(1100, 'dark', false, [['vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3, checkin: { day: today, step: 'debt' } })], ['vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 864e5 })]]);
  const nudge = await p.evaluate(() => { localStorage.removeItem('vi_checkin_seen'); const a = viCheckinNudge(); const t1 = document.getElementById('toast').textContent; const b2 = viCheckinNudge(); return { a, t1, b2 }; });
  ok(nudge.a === true && /check-in/i.test(nudge.t1) && /next step/i.test(nudge.t1), 'B8 on check-in day the app says the next step (' + nudge.t1 + ')');
  ok(nudge.b2 === false, 'B8 only once that day');
  const other = await p.evaluate((d) => { const u = JSON.parse(localStorage.getItem('vi_user')); u.checkin.day = (d + 1) % 7; localStorage.setItem('vi_user', JSON.stringify(u)); localStorage.removeItem('vi_checkin_seen'); return viCheckinNudge(); }, today);
  ok(other === false, 'B8 not on other days');
  // B9: privacy notice
  const priv = await p.evaluate(() => { showPrivacy(); const t = document.body.innerText; return /Google/.test(t) && /Continue with Google/.test(t); });
  ok(priv, 'B9 the privacy notice says what Google sign-in shares');
  await p.context().close();

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
