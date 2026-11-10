// v0.9.2 (Pete via David, 5 Nov): the sign-in email step opens with a two-line product intro and the three steps (email, 6-digit code, 6-digit PIN),
// still compact on phones (email field and Continue above the fold at 390x664, no scrolling), and on a wide desktop window (>= 900 px) the card is
// bigger: about 520 to 560 px wide, text one step larger, inputs and buttons at least 48 px.
// Run: node tests/test_v092_login_intro.js
const VI = require('./lib/vi');
const { chromium, devices } = require('playwright'); const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SIZES = { 'iPhone 390x664': { viewport: { width: 390, height: 664 }, userAgent: devices['iPhone 13'].userAgent, isMobile: true, hasTouch: true }, 'Android 412x800': { viewport: { width: 412, height: 800 }, userAgent: devices['Pixel 7'].userAgent, isMobile: true, hasTouch: true }, 'desktop 1440x900': { viewport: { width: 1440, height: 900 } } };
(async () => {
  const b = await chromium.launch(); const probe = {};
  for (const [name, d] of Object.entries(SIZES)) {
    const ctx = await b.newContext({ ...d, deviceScaleFactor: 1 }); await routeThree(ctx); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(VI.FILE_URL); await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const q = s => document.querySelector(s); const rc = e => e.getBoundingClientRect(); const email = q('#auth-email'), btn = q('#auth-email-step .auth-btn'), intro = q('#auth-email-step .auth-intro'), steps = q('#auth-email-step .auth-steps'), card = q('.auth-card'), lab = q('#auth-email-step .auth-label');
      const t = (intro ? intro.textContent : '') + ' ' + (steps ? steps.textContent : '');
      return { has: !!intro && !!steps, order: !!intro && !!steps && rc(intro).bottom <= rc(steps).top + 1 && rc(steps).bottom <= rc(email).top + 1, text: t.replace(/\s+/g, ' ').trim(),
        emailIn: rc(email).top >= 0 && rc(email).bottom <= innerHeight, btnIn: rc(btn).top >= 0 && rc(btn).bottom <= innerHeight, scrollY: document.getElementById('login-overlay').scrollTop,
        cardW: Math.round(rc(card).width), inpH: Math.round(rc(email).height), btnH: Math.round(rc(btn).height), labFs: parseFloat(getComputedStyle(lab).fontSize), introFs: intro ? parseFloat(getComputedStyle(intro).fontSize) : 0, inpFs: parseFloat(getComputedStyle(email).fontSize) };
    });
    probe[name] = r;
    ok(r.has && r.order, name + ': the intro and the steps sit above the email field');
    ok(/private vault/.test(r.text) && /1\. Enter your email/.test(r.text) && /6-digit code/.test(r.text) && /6-digit PIN/.test(r.text) && /email \+ PIN signs you in on any device/.test(r.text), name + ': the copy names the email, the 6-digit code and the 6-digit PIN (' + r.text.slice(0, 70) + '...)');
    ok(!/[—–]/.test(r.text), name + ': no dashes in the copy');
    ok(r.scrollY === 0 && r.emailIn && r.btnIn, name + ': the email field and Continue are in the first screen with no scrolling (' + JSON.stringify({ emailIn: r.emailIn, btnIn: r.btnIn }) + ')');
    ok(!errs.length, name + ': no page errors ' + errs.join('|'));
    await ctx.close();
  }
  // the code step says each thing once, and the intro and steps belong to the email step only
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true }); await routeThree(ctx); const page = await ctx.newPage();
    await page.goto(VI.FILE_URL); await page.waitForTimeout(1200);
    const o = await page.evaluate(() => {
      _authOTP = { email: 'tester@example.com' }; document.getElementById('auth-otp-email').textContent = 'tester@example.com'; _showAuthStep('otp');
      const st = document.getElementById('auth-otp-step'), vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
      const btns = [...st.querySelectorAll('button')].map(x => x.textContent.trim());
      const res = { text: st.innerText.replace(/\s+/g, ' ').trim(), btns, goBack: [...st.querySelectorAll('button')].filter(x => /authGoBack/.test(x.getAttribute('onclick') || '')).length, introShown: vis(document.querySelector('.auth-intro')) || vis(document.querySelector('.auth-steps')), emailShown: vis(document.getElementById('auth-otp-email')) };
      _pinEnterLen = PIN_LEN; _showAuthStep('pin'); res.introShownPin = vis(document.querySelector('.auth-intro')) || vis(document.querySelector('.auth-steps'));
      _showAuthStep('email'); res.introShownEmail = vis(document.querySelector('.auth-intro')) && vis(document.querySelector('.auth-steps'));
      return res;
    });
    ok(/^Check your inbox/.test(o.text) && o.emailShown && o.text.includes('tester@example.com'), 'code step: one heading "Check your inbox" with the email shown (' + o.text.slice(0, 60) + ')');
    ok(!/CODE SENT/i.test(o.text) && !/\u{1F4E7}/u.test(o.text), 'code step: no "CODE SENT" label and no envelope');
    ok(o.text.includes('Enter the 6-digit code. Not seeing it? Check spam.') && !/from your email below/.test(o.text) && (o.text.match(/inbox/gi) || []).length === 1, 'code step: one hint line, nothing said twice (' + o.text + ')');
    ok(o.goBack === 1 && o.btns.some(t => /Resend code/.test(t)) && o.btns.some(t => /Verify/.test(t)), 'code step: one "Use a different email" button, plus Verify and Resend (' + o.btns.join(' | ') + ')');
    ok(!o.introShown && !o.introShownPin && o.introShownEmail, 'the intro and the steps show on the email step only (code ' + o.introShown + ', PIN ' + o.introShownPin + ', email ' + o.introShownEmail + ')');
    await ctx.close();
  }
  const ph = probe['iPhone 390x664'], dk = probe['desktop 1440x900'];
  ok(dk.cardW >= 520 && dk.cardW <= 560, 'desktop: the card is 520 to 560 px wide (' + dk.cardW + ')');
  ok(dk.inpH >= 48 && dk.btnH >= 48, 'desktop: the email field and Continue are at least 48 px tall (' + dk.inpH + ', ' + dk.btnH + ')');
  ok(dk.labFs > ph.labFs && dk.introFs > ph.introFs && dk.inpFs > ph.inpFs, 'desktop: label, intro and input text are one step larger than on a phone (' + [dk.labFs, ph.labFs, dk.introFs, ph.introFs, dk.inpFs, ph.inpFs].join('/') + ')');
  ok(ph.cardW <= 360, 'phone: the card stays at most 360 px wide (' + ph.cardW + ')');
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
