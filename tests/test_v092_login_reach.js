// v0.9.2 (urgent, tester bug: "cannot enter the email address and tap Continue because the option is not available now").
// Every way into the sign-in screen must let a tester reach an enabled email field and Continue, at phone sizes (iPhone, Android, keyboard open,
// landscape). The match found: a repeat visit with a PIN set shows the PIN pad; its "← Use a different email" was a faint (opacity .55) button at the
// very bottom of a card taller than the screen, and the overlay did not scroll (the card was centred and clipped), so there was no way back to the email.
// Scenarios: a fresh visit, b repeat visit with a PIN (stubbed), c valid session (no login; Sign out in Settings), d looking around (demo mode),
// e the welcome overlay present, f slow or failed PIN status and the security-check "please wait" path (Continue never stays disabled).
// Run: node tests/test_v092_login_reach.js
const { chromium, devices } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const DEV = {
  iPhone: { viewport: { width: 390, height: 664 }, userAgent: devices['iPhone 13'].userAgent, isMobile: true, hasTouch: true },
  Android: { viewport: { width: 412, height: 800 }, userAgent: devices['Pixel 7'].userAgent, isMobile: true, hasTouch: true },
  'keyboard open': { viewport: { width: 390, height: 330 }, userAgent: devices['iPhone 13'].userAgent, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 664, height: 340 }, userAgent: devices['iPhone 13'].userAgent, isMobile: true, hasTouch: true },
};
const SESSION = { vi_session: JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }), vi_user: JSON.stringify({ name: 'T', email: 't@t.com' }) };
const SC = { a: {}, b: { ls: { vi_last_email: 'tester@example.com' }, pin: true }, c: { ls: SESSION }, d: { ls: { vi_demo_mode: 'true' } }, e: { ls: { vi_declined_demo: 'true' } }, f: { ls: { vi_last_email: 'tester@example.com' }, slow: true } };
// can a finger reach it: scroll it into view, then it is inside the screen and the top element at its centre is itself
const REACH = (sel) => async (page) => page.evaluate((sel) => {
  const e = document.querySelector(sel); if (!e) return { found: false };
  const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return { found: true, shown: false };
  e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { found: true, shown: true, inView: r.top >= 0 && r.bottom <= innerHeight, hit: !!top && (top === e || e.contains(top) || top.contains(e)), disabled: !!e.disabled, h: Math.round(r.height), op: +cs.opacity };
}, sel);
(async () => {
  const b = await chromium.launch();
  for (const [dn, d] of Object.entries(DEV)) for (const [sn, s] of Object.entries(SC)) {
    const ctx = await b.newContext({ ...d, deviceScaleFactor: 1 }); await routeThree(ctx); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(ls => { try { for (const k in ls) localStorage.setItem(k, ls[k]); } catch (e) {} }, s.ls || {});
    await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html')); await page.waitForTimeout(1200);
    const T = dn + ' ' + sn + ': ';
    if (s.pin) { await page.evaluate(async () => { window._pinCall = async () => ({ pin: true }); await initQuickLogin(); }); await page.waitForTimeout(400); }
    if (s.slow) await page.evaluate(() => { window._pinStatus = () => new Promise(() => {}); });   // never answers
    if (sn === 'c') {
      ok(await page.evaluate(() => getComputedStyle(document.getElementById('login-overlay')).display === 'none'), T + 'a valid session shows the app, not the sign-in screen');
      await page.evaluate(() => { try { showSettings(); } catch (e) {} }); await page.waitForTimeout(500);
      const so = await REACH('#settings-modal [data-signout]')(page);
      ok(so.shown && so.inView && so.hit && !so.disabled, T + 'Settings has a visible Sign out you can tap (' + JSON.stringify(so) + ')');
      await ctx.close(); continue;
    }
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('login-overlay')).display !== 'none'), T + 'the sign-in screen is showing');
    if (sn === 'b') {
      ok(await page.evaluate(() => document.getElementById('auth-pin-step').classList.contains('active')), T + 'a repeat visit with a PIN shows the PIN pad (the case behind the tester report)');
      const sw = await REACH('#auth-pin-step button[onclick="authGoBack()"]')(page);
      ok(sw.shown && sw.inView && sw.hit && sw.h >= 40 && sw.op === 1, T + '"← Use a different email" is a full-size, full-strength button you can reach (' + JSON.stringify(sw) + ')');
      await page.evaluate(() => document.querySelector('#auth-pin-step button[onclick="authGoBack()"]').click()); await page.waitForTimeout(200);
    }
    if (sn === 'f') {   // PIN status never answers: the email field and Continue are there and enabled meanwhile
      ok(await page.evaluate(() => document.getElementById('auth-email-step').classList.contains('active')), T + 'while the PIN check is slow the email step stays up');
    }
    // with the security check showing (it takes space under the button), Continue must still be reachable
    await page.evaluate(() => { const c = document.getElementById('auth-captcha'); c.style.display = 'block'; c.style.minHeight = '65px'; });
    const em = await REACH('#auth-email')(page), co = await REACH('#auth-email-step .auth-btn')(page);
    ok(em.shown && em.inView && em.hit && !em.disabled, T + 'the email field can be reached and typed in (' + JSON.stringify(em) + ')');
    ok(co.shown && co.inView && co.hit && !co.disabled, T + 'Continue can be reached and is enabled (' + JSON.stringify(co) + ')');
    if (sn === 'f') {   // the security-check "please wait" path and a failed send never leave Continue disabled
      await page.evaluate(() => { window.viCaptchaOn = () => true; window.viCaptchaEnsure = () => {}; document.getElementById('auth-email').value = 'tester@example.com'; });
      await page.evaluate(() => { window._pinStatus = async () => ({ pin: null }); });
      await page.evaluate(() => authSubmitEmail()); await page.waitForTimeout(500);
      const after = await page.evaluate(() => { const b = document.querySelector('#auth-email-step .auth-btn'); return { dis: b.disabled, txt: b.textContent, err: document.getElementById('auth-err').textContent.slice(0, 60), step: document.querySelector('.auth-step.active').id }; });
      ok(!after.dis && /Continue/.test(after.txt) && after.step === 'auth-email-step', T + 'after the "please wait for the security check" note Continue is enabled again (' + JSON.stringify(after) + ')');
    }
    ok(!errs.length, T + 'no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
