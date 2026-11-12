// Onboarding friction (owner, 10 Nov 2026: "Give the the steps users need to do to onboard. Can we make it less friction for them",
// then on the proposal "Do all but 5"; open questions answered: "Onboarding first", dream home price on "Step 1, with home type").
//   1. signed in, the wizard never asks for the email again (the session's email is used) and the first name is optional;
//      a user who finished without a name is still recognised as onboarded on the next load
//   2. Google first: with the Google provider on, "Continue with Google" is the main option and email the second (its Continue
//      button turns secondary); the Google button keeps its own white branded look; with Google off the card is unchanged
//   3. the PIN is offered later, not at sign-up: after the email code a new user goes straight in; a dismissible "set a PIN" card
//      shows on the second visit (Set a PIN proves the email with a code first, as pin-auth needs a fresh sign-in) or straight
//      after the first sign-in on a new device for an account that already exists (straight to the PIN pad); "Not now" is remembered
//   4. the wizard is 3 screens (goal + home type + price, money + deposit pot, plan), "Step n of 3", Back works; check-in day, view
//      and phone take today's defaults and live in Settings; what finishing saves matches the 6-screen wizard exactly
//      (tests/fixtures/onboarding_saved_golden.json, captured from the old wizard before the change)
//   5. phone and Daylight: no sideways scroll, no page errors
// Run: node tests/test_onboarding_friction.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const { dump } = require('./lib/onboarding_saved');
const GOLD = require('./fixtures/onboarding_saved_golden.json');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const BLOCK = /open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/;
const HIDE = '#sync-banner,#trial-banner,#pro-offer-modal,#tester-welcome{display:none!important}';
// the pin-auth / Supabase stand-in (as tests/test_pin_client.js)
const MOCK = `
  window._srv = window._srv || { pins: {}, log: [], otpMail: 0, session: null };
  const srv = window._srv;
  const fnErr = (status, body) => ({ data: null, error: { context: { json: async () => body, status } } });
  _supaClient = {
    functions: { invoke: async (name, { body }) => {
      srv.log.push(name + ':' + (body.action || ''));
      if (name === 'send-auth-email') { srv.otpMail++; return { data: { success: true }, error: null }; }
      const e = (body.email || '').toLowerCase();
      if (body.action === 'status') return { data: { pin: !!srv.pins[e] }, error: null };
      if (body.action === 'set') { if (!srv.session) return fnErr(401, { error: 'auth' }); if (!srv.fresh) return fnErr(403, { error: 'recent_login' }); srv.pins[srv.session.email] = body.pin; return { data: { ok: true }, error: null }; }
      if (body.action === 'login') { if (srv.pins[e] === body.pin) return { data: { ok: true, token: 'PINTOKEN' }, error: null }; return fnErr(401, { error: 'invalid', remaining: 4 }); }
      return fnErr(400, { error: 'bad' });
    } },
    auth: {
      verifyOtp: async ({ email, token }) => { if (token === '123456' || token === 'PINTOKEN') { srv.session = { email, id: 'u-' + email }; srv.fresh = true; return { data: { user: { id: 'u-' + email, email } }, error: null }; } return { data: null, error: { message: 'bad' } }; },
      getSession: async () => ({ data: { session: srv.session && { user: { id: srv.session.id, email: srv.session.email } } } }),
      onAuthStateChange: () => {}, signOut: async () => { srv.session = null; return {}; }
    },
    from: () => { const q = { select: () => q, eq: () => Promise.resolve({ data: [] }), upsert: () => Promise.resolve({}), single: () => Promise.resolve({ data: null }), then: (r) => r({ data: [] }) }; return q; }
  };`;
async function ctxFor(b, w, theme) {
  const mob = w < 700;
  const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
  await ctx.route(BLOCK, r => r.abort());
  await ctx.addInitScript((t) => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); }, theme || 'dark');
  return ctx;
}
async function page(ctx, errs) {
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP); await p.waitForTimeout(1500); await p.addStyleTag({ content: HIDE }); return p;
}
const step = (p) => p.evaluate(() => (document.querySelector('.auth-step.active') || {}).id || '');
const overlay = (p) => p.evaluate(() => getComputedStyle(document.getElementById('login-overlay')).display);
const offer = (p) => p.evaluate(() => { const o = document.getElementById('vi-pin-offer'); return !!o && !o.hidden && o.getClientRects().length > 0; });   // fixed: offsetParent is always null
const scr = (p) => p.evaluate(() => { const v = [...document.querySelectorAll('#welcome-overlay .wz-screen')].filter(s => s.offsetParent !== null);
  return { n: v.length, at: v[0] ? v[0].dataset.s : '', count: (document.getElementById('wz-count') || {}).textContent || '', side: document.documentElement.scrollWidth - innerWidth }; });
const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);
async function wizard(p, user) {   // signed in, the welcome wizard on screen
  await p.addStyleTag({ content: '#login-overlay{display:none!important}' });
  await p.evaluate((u) => { _supaUser = u; viWelcomePrefill(); const o = document.getElementById('welcome-overlay'); o.style.display = 'flex'; wGo(1); }, user);
}

(async () => {
  const b = await chromium.launch(); const errs = [];

  // ── 2. Google first ──
  for (const [w, theme] of [[390, 'dark'], [1100, 'light']]) {
    const T = w + ' ' + theme + ': '; const ctx = await ctxFor(b, w, theme); const p = await page(ctx, errs);
    const card = () => p.evaluate(() => {
      const g = document.getElementById('auth-google'), e = document.getElementById('auth-email'), c = document.querySelector('#auth-email-step .auth-btn');
      const gs = getComputedStyle(g), cs = getComputedStyle(c);
      return { gShown: g.offsetParent !== null, gTop: g.getBoundingClientRect().top, eTop: e.getBoundingClientRect().top, gBg: gs.backgroundColor, gH: g.getBoundingClientRect().height,
        cSecondary: c.classList.contains('secondary') || cs.backgroundImage === 'none', steps: (document.querySelector('#auth-email-step .auth-steps') || {}).textContent || '', side: document.documentElement.scrollWidth - innerWidth };
    });
    await p.evaluate(() => { window.__vi_google_force = false; window.fetch = () => Promise.reject(new Error('off')); return viGoogleCheck(); });
    let c = await card();
    ok(!c.gShown && !c.cSecondary, T + '2 Google off: no Google button, the email Continue stays the main button (' + JSON.stringify(c) + ')');
    ok(!/choose a .*PIN/i.test(c.steps) && /code/i.test(c.steps) && /PIN later/.test(c.steps), T + '3 the sign-in steps no longer ask for a PIN at sign-up, only mention it for later ("' + c.steps.trim() + '")');
    await p.evaluate(() => { window.__vi_google_force = true; return viGoogleCheck(); });
    c = await card();
    ok(c.gShown && c.gTop < c.eTop, T + '2 Google on: "Continue with Google" comes first, above the email box');
    ok(c.cSecondary, T + '2 Google on: email is the second option (its Continue button is secondary)');
    ok(c.gBg === 'rgb(255, 255, 255)' && c.gH >= 44, T + '2 the Google button keeps its white branded look (' + c.gBg + ', ' + c.gH + 'px)');
    ok(c.side <= 0, T + '5 no sideways scroll on the sign-in card');
    await ctx.close();
  }

  // ── 3. PIN offered later: brand-new account ──
  {
    const T = '390 new account: '; const ctx = await ctxFor(b, 390); let p = await page(ctx, errs);
    await p.evaluate(MOCK);
    await p.fill('#auth-email', 'new@example.com'); await p.click('#auth-email-step .auth-btn'); await p.waitForTimeout(700);
    ok(await step(p) === 'auth-otp-step', T + '3 email code sent');
    await p.fill('#auth-otp-inp', '123456'); await p.click('#auth-otp-step .auth-btn'); await p.waitForTimeout(1200);
    ok(await step(p) !== 'auth-setpin-step' && await overlay(p) === 'none', T + '3 after the code the user goes straight in, no PIN step (' + await step(p) + ', ' + await overlay(p) + ')');
    ok(await p.evaluate(() => /^due:\d+$/.test(localStorage.getItem('vi_pin_offer') || '')), T + '3 a PIN offer is due for the next visit (' + await p.evaluate(() => localStorage.getItem('vi_pin_offer')) + ')');
    await p.waitForTimeout(3500);
    ok(!(await offer(p)), T + '3 no PIN card on the sign-up visit itself');
    // second visit: same device, session still live, sign-in not fresh any more
    const srv = await p.evaluate(() => JSON.stringify(_srv)); await p.close();
    p = await page(ctx, errs);
    await p.evaluate((s) => { window._srv = JSON.parse(s); window._srv.fresh = false; }, srv); await p.evaluate(MOCK);
    await p.evaluate(() => { localStorage.setItem('vi_user', JSON.stringify({ name: '', email: 'new@example.com', goal: '2' })); document.getElementById('welcome-overlay').style.display = 'none'; _initSupabaseSession(); });
    await p.waitForTimeout(4000);
    ok(await offer(p), T + '3 second visit: the "set a PIN" card shows');
    const txt = await p.evaluate(() => document.getElementById('vi-pin-offer').innerText);
    ok(/PIN/.test(txt) && /Not now/i.test(txt) && !/—/.test(txt), T + '3 the card offers a PIN and a Not now ("' + txt.replace(/\s+/g, ' ') + '")');
    // Set a PIN, sign-in not fresh: the email is proved with a code first, then the PIN pad
    await p.click('#vi-pin-offer [data-pin-offer="set"]'); await p.waitForTimeout(500);
    ok(await overlay(p) !== 'none' && await step(p) === 'auth-email-step' && await vis(p, '#auth-pinlater-note'), T + '3 Set a PIN asks to confirm the email with a code first (' + await step(p) + ')');
    ok(await p.evaluate(() => document.getElementById('auth-email').value) === 'new@example.com' && await vis(p, '#auth-pinlater-cancel'), T + '3 the email is filled in and there is a way out');
    await p.click('#auth-email-step .auth-btn'); await p.waitForTimeout(700);
    await p.fill('#auth-otp-inp', '123456'); await p.click('#auth-otp-step .auth-btn'); await p.waitForTimeout(1200);
    ok(await step(p) === 'auth-setpin-step' && await overlay(p) !== 'none', T + '3 after the code the PIN pad opens');
    for (const d of '482915482915') { await p.evaluate(d => _setPinKey(d), d); await p.waitForTimeout(220); }
    await p.waitForTimeout(600);
    ok(await p.evaluate(() => _srv.pins['new@example.com']) === '482915' && await overlay(p) === 'none', T + '3 the PIN is set on the server and the app is back');
    ok(await p.evaluate(() => localStorage.getItem('vi_pin_offer')) === 'off' && !(await offer(p)), T + '3 the offer is done and the card gone');
    await ctx.close();
  }
  // ── 3. "Not now" is remembered; the way out of the code step ──
  {
    const T = '1100 Not now: '; const ctx = await ctxFor(b, 1100, 'light'); let p = await page(ctx, errs);
    await p.evaluate(() => { localStorage.setItem('vi_pin_offer', 'due:1'); localStorage.setItem('vi_user', JSON.stringify({ name: 'Ann', email: 'ann@example.com', goal: '1' })); localStorage.setItem('vi_session', JSON.stringify({ email: 'ann@example.com', expiry: Date.now() + 1e9 })); });
    await p.reload(); await p.waitForTimeout(1500); await p.addStyleTag({ content: HIDE });
    await p.evaluate(() => { window._srv = { pins: {}, log: [], otpMail: 0, session: { email: 'ann@example.com', id: 'u-ann' } }; }); await p.evaluate(MOCK);
    await p.evaluate(() => { document.getElementById('welcome-overlay').style.display = 'none'; _initSupabaseSession(); }); await p.waitForTimeout(4000);
    ok(await offer(p), T + '3 the card shows on a later visit');
    await p.click('#vi-pin-offer [data-pin-offer="set"]'); await p.waitForTimeout(400);
    await p.click('#auth-pinlater-cancel'); await p.waitForTimeout(300);
    ok(await overlay(p) === 'none' && !(await p.evaluate(() => _pinLater)), T + '3 Not now on the code step closes it and leaves the user signed in');
    await p.evaluate(() => { localStorage.setItem('vi_pin_offer', 'due:1'); viPinOfferMaybe(true); }); await p.waitForTimeout(1500);
    ok(await offer(p), T + '3 card back');
    await p.click('#vi-pin-offer [data-pin-offer="later"]'); await p.waitForTimeout(300);
    ok(!(await offer(p)) && await p.evaluate(() => localStorage.getItem('vi_pin_offer')) === 'off', T + '3 Not now hides the card and is remembered');
    await p.evaluate(() => viPinOfferMaybe(true)); await p.waitForTimeout(1500);
    ok(!(await offer(p)), T + '3 once dismissed it does not come back');
    await ctx.close();
  }
  // ── 3. existing account, new device: offered straight after sign-in, straight to the PIN pad ──
  {
    const T = '390 new device: '; const ctx = await ctxFor(b, 390); const p = await page(ctx, errs);
    await p.evaluate(MOCK);
    await p.evaluate(() => { const h = _hydrateFromSupabase; _hydrateFromSupabase = async () => { localStorage.setItem('vi_user', JSON.stringify({ name: 'Bo', email: 'bo@example.com', goal: '2' })); return true; }; });
    await p.fill('#auth-email', 'bo@example.com'); await p.click('#auth-email-step .auth-btn'); await p.waitForTimeout(700);
    await p.fill('#auth-otp-inp', '123456'); await p.click('#auth-otp-step .auth-btn'); await p.waitForTimeout(1200);
    ok(await step(p) !== 'auth-setpin-step' && await overlay(p) === 'none', T + '3 signs straight in');
    await p.waitForTimeout(2500);
    ok(await offer(p), T + '3 the "set a PIN" card shows on the first open on this device');
    await p.click('#vi-pin-offer [data-pin-offer="set"]'); await p.waitForTimeout(600);
    ok(await step(p) === 'auth-setpin-step' && await p.evaluate(() => _srv.otpMail) === 1, T + '3 just signed in, so Set a PIN goes straight to the pad (no second code)');
    await ctx.close();
  }
  // ── 3. a user with a PIN signs in exactly as before; Forgot PIN still asks for a new one ──
  {
    const T = '390 has PIN: '; const ctx = await ctxFor(b, 390); const p = await page(ctx, errs);
    await p.evaluate(() => { window._srv = { pins: { 'pin@example.com': '482915' }, log: [], otpMail: 0, session: null }; }); await p.evaluate(MOCK);
    await p.fill('#auth-email', 'pin@example.com'); await p.click('#auth-email-step .auth-btn'); await p.waitForTimeout(700);
    ok(await step(p) === 'auth-pin-step', T + '3 email + PIN, as before');
    for (const d of '482915') { await p.evaluate(d => _enterPinKey(d), d); await p.waitForTimeout(150); }
    await p.waitForTimeout(1500);
    ok(await overlay(p) === 'none' && !(await offer(p)) && await p.evaluate(() => _srv.otpMail) === 0, T + '3 signed in, no code and no PIN card');
    await ctx.close();
  }

  // ── 1 and 4. the wizard ──
  for (const [w, theme] of [[390, 'dark'], [1100, 'light']]) {
    const T = w + ' ' + theme + ': '; const ctx = await ctxFor(b, w, theme); const p = await page(ctx, errs);
    await wizard(p, { id: 'u1', email: 't@t.com', user_metadata: {} });
    let s = await scr(p);
    ok(s.n === 1 && s.at === '1' && /Step 1 of 3/.test(s.count), T + '4 three screens, Step 1 of 3 (' + JSON.stringify(s) + ')');
    ok(!(await vis(p, '#w-email')) && await vis(p, '#wz-signed'), T + '1 signed in: no email box, "Signed in as" instead');
    ok(await vis(p, '#w-opts') && await vis(p, '#w-htypes') && await vis(p, '#w-house'), T + '4 screen 1: your goal, home type and price');
    await p.click('#w-opts .welcome-opt[data-val="2"]'); await p.click('#w-htypes .w-ht[data-type="terraced"]');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
    s = await scr(p);
    ok(s.at === '2' && /Step 2 of 3/.test(s.count), T + '1 no first name typed: Next still goes on (' + JSON.stringify(s) + ')');
    ok(await vis(p, '#w-income') && await vis(p, '#w-expenses') && !(await p.$('#welcome-overlay .w-curr-btn')) && await vis(p, '#w-pot-opts') && await vis(p, '#wz-s2 .wz-skip'), T + '4 screen 2: take-home, spending and deposit pot, with add later; no currency choice (tester 1, pounds only)');
    await p.click('#wz-back'); await p.waitForTimeout(150);
    ok((await scr(p)).at === '1', T + '4 Back goes to screen 1');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(150);
    await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(200);
    s = await scr(p);
    ok(s.at === '3' && /Step 3 of 3/.test(s.count) && await vis(p, '#wz-plan') && await vis(p, '#w-finish'), T + '4 add later goes to screen 3: the plan and Start');
    ok(!(await vis(p, '#wz-days')) && !(await vis(p, '#w-phone-s1')) && !(await vis(p, '.w-view-opts')), T + '4 no check-in day, view or phone in the wizard');
    ok(s.side <= 0, T + '5 no sideways scroll');
    await p.click('#w-finish'); await p.waitForTimeout(1500);
    const u = await p.evaluate(() => ({ u: JSON.parse(localStorage.getItem('vi_user')), view: (JSON.parse(localStorage.getItem('vi_settings') || '{}')).view, today: new Date().getDay(), ov: getComputedStyle(document.getElementById('welcome-overlay')).display }));
    ok(u.u.checkin && u.u.checkin.day === u.today && u.view === 'simple' && u.u.phone === '' && u.u.email === 't@t.com', T + '4 defaults: check-in today, Simplified view, no phone; email from the session (' + JSON.stringify(u.u) + ')');
    ok(await p.evaluate(() => { _vaultItUser = null; initWelcome(); return viMarkOnboardedUI() && !!_vaultItUser; }), T + '1 a user with no first name counts as onboarded on the next load');
    // Settings: check-in day and phone
    await p.evaluate(() => showSettings()); await p.waitForTimeout(300);
    ok(await vis(p, '#set-checkin') && await vis(p, '#set-phone') && await vis(p, '#set-view'), T + '4 Settings has the check-in day, phone and view');
    const pick = (u.today + 3) % 7;
    await p.click('#set-checkin-days button[data-d="' + pick + '"]'); await p.fill('#set-phone', '+44 7700 900123'); await p.locator('#set-phone').blur(); await p.waitForTimeout(200);
    const u2 = await p.evaluate(() => JSON.parse(localStorage.getItem('vi_user')));
    ok(u2.checkin.day === pick && u2.checkin.step === u.u.checkin.step && u2.phone === '+44 7700 900123', T + '4 Settings changes the check-in day and phone in the same saved fields (' + JSON.stringify(u2.checkin) + ')');
    ok(await p.evaluate(() => document.querySelector('#set-checkin-days button[aria-pressed="true"]').dataset.d) === String(pick), T + '4 the picked day is shown as chosen');
    await ctx.close();
  }

  // ── 4. saved data matches the 6-screen wizard exactly ──
  {
    const T = 'saved data: '; let ctx = await ctxFor(b, 390); let p = await page(ctx, errs);
    await wizard(p, { id: 'u1', email: 't@t.com', user_metadata: { full_name: 'Tess Test' } });
    ok(await p.evaluate(() => document.getElementById('w-name').value) === 'Tess', T + '1 Google gives the first name');
    await p.click('#w-opts .welcome-opt[data-val="2"]'); await p.click('#w-htypes .w-ht[data-type="terraced"]'); await p.fill('#w-house', '200000');
    await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
    await p.fill('#w-income', '2000'); await p.fill('#w-expenses', '1500');
    await p.click('#w-pot-opts .welcome-opt[data-pot="lisa_cash"]'); await p.waitForTimeout(500); await p.fill('#w-pot-value', '6000'); await p.fill('#w-pot-rate', '4.5');
    await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(200);
    await p.click('#w-finish'); await p.waitForTimeout(1500);
    let d = await dump(p);
    ok(JSON.stringify(d) === JSON.stringify(GOLD.full), T + '4 every answer: the same keys and values as the old wizard' + (JSON.stringify(d) === JSON.stringify(GOLD.full) ? '' : '\n' + JSON.stringify(d) + '\n' + JSON.stringify(GOLD.full)));
    await ctx.close();
    ctx = await ctxFor(b, 390); p = await page(ctx, errs);
    await wizard(p, { id: 'u1', email: 't@t.com', user_metadata: { full_name: 'Tess Test' } });
    await p.click('#w-opts .welcome-opt[data-val="0"]'); await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
    // a Yes with no amount still stops on Next, as before
    await p.click('#w-pot-opts .welcome-opt[data-pot="savings"]'); await p.waitForTimeout(500); await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(200);
    ok((await scr(p)).at === '2' && await vis(p, '#w-pot-hint'), T + '4 a Yes on the pot with no amount still stops and says so');
    await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(200);
    await p.click('#w-finish'); await p.waitForTimeout(1500);
    d = await dump(p);
    ok(JSON.stringify(d) === JSON.stringify(GOLD.skipped), T + '4 goal only, the rest added later: the same as the old wizard' + (JSON.stringify(d) === JSON.stringify(GOLD.skipped) ? '' : '\n' + JSON.stringify(d) + '\n' + JSON.stringify(GOLD.skipped)));
    await ctx.close();
  }
  // ── a device that finished the old wizard loads unchanged ──
  {
    const ctx = await ctxFor(b, 390); await ctx.addInitScript((g) => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); for (const k in g) localStorage.setItem(k, g[k].replace(/"ISO"/g, '"2026-11-01T10:00:00.000Z"').replace(/"day":"TODAY"/, '"day":4').replace(/\bNOW\b/g, '1762000000000').replace(/"DATE"/g, '"01/11/2026"')); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e9 })); } }, GOLD.full);
    const p = await page(ctx, errs);
    const r = await p.evaluate(() => ({ wel: getComputedStyle(document.getElementById('welcome-overlay')).display, u: JSON.parse(localStorage.getItem('vi_user')), saved: (JSON.parse(localStorage.getItem('ht3')) || {}).saved }));
    ok(r.wel === 'none' && r.u.checkin.day === 4 && r.u.name === 'Tess' && r.saved === 6000, 'old device: no wizard again, its check-in day, name and deposit kept (' + JSON.stringify({ wel: r.wel, day: r.u.checkin.day, saved: r.saved }) + ')');
    await p.evaluate(() => showSettings()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('#set-checkin-days button[aria-pressed="true"]').dataset.d) === '4', 'old device: Settings shows the check-in day it chose in the old wizard');
    await ctx.close();
  }

  const real = errs.filter(e => !/three|WebGL|supabase|fetch|Failed to fetch|NetworkError|net::/i.test(e));
  ok(real.length === 0, '5 no page errors (' + real.slice(0, 3).join(' | ') + ')');
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
