// Tester welcome note (wording agreed with Pete, 31 Oct 2026): after a beta account finishes the welcome flow, Pete's note shows once.
//   1. the welcome flow (skip or submit) shows the note with the agreed wording, the 30-day first sentence, signed Pete
//   2. it shows once per device; Let's go, Esc and tapping outside close it; the mail link goes to hello@vault-it.co
//   3. an account that is not a beta tester (beta closed) does not see it; a returning account never sees it on load
//   4. phone, Daylight: fits the screen, no sideways scroll
// Run: node tests/test_tester_welcome.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (w, theme, returning) => {
    const mob = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.addInitScript((o) => { localStorage.setItem('vi-theme', o.theme); localStorage.setItem('vi_declined_demo', 'true'); if (o.returning) { localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 })); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); } }, { theme, returning });
    await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    return p;
  };
  const vis = () => !document.getElementById('tester-welcome').classList.contains('hidden');

  // ── 1 + 2 ──
  let p = await open(1100, 'dark', false);
  await p.evaluate(() => wStep2Skip()); await p.waitForTimeout(1000);
  const t = await p.evaluate(() => ({ on: !document.getElementById('tester-welcome').classList.contains('hidden'), msg: document.getElementById('tw-msg').textContent, sign: document.querySelector('.tw-sign').textContent, mail: document.querySelector('.tw-mail').getAttribute('href'), stamp: !!localStorage.getItem('vi_tester_note') }));
  ok(t.on && t.stamp, 'after the welcome flow the tester note shows, and is marked as seen');
  ok(t.msg === 'Welcome to the Vault-It beta. Your first 30 days are free, no card needed. Type your numbers in, made-up ones are fine, and watch your deposit build your house. Anything confusing or broken, tell me. Your feedback decides what gets built next.' && t.sign === 'Pete', 'the agreed wording, 30-day first sentence, signed Pete');
  ok(/^mailto:hello@vault-it\.co/.test(t.mail), 'the mail link goes to hello@vault-it.co');
  ok(!/—/.test(t.msg), 'no em dashes');
  await p.keyboard.press('Escape'); ok(!(await p.evaluate(vis)), 'Esc closes it');
  const again = await p.evaluate(() => viTesterWelcome()); ok(again === false && !(await p.evaluate(vis)), 'it shows once per device');
  await p.evaluate(() => { localStorage.removeItem('vi_tester_note'); viTesterWelcome(); }); await p.mouse.click(5, 300); ok(!(await p.evaluate(vis)), 'tapping outside closes it');
  await p.evaluate(() => { localStorage.removeItem('vi_tester_note'); viTesterWelcome(); document.querySelector('.tw-go').click(); }); ok(!(await p.evaluate(vis)), "Let's go closes it");
  // ── 3. beta closed: no note ──
  const nb = await p.evaluate(() => { localStorage.removeItem('vi_tester_note'); VI_BETA_OPEN = false; localStorage.removeItem('vi_beta'); return viTesterWelcome(); });
  ok(nb === false && !(await p.evaluate(vis)), 'an account that is not a beta tester does not see it');
  await p.context().close();
  p = await open(1100, 'dark', true); await p.waitForTimeout(1200);
  ok(!(await p.evaluate(vis)), 'a returning account does not see it on load');
  await p.context().close();
  // ── 4. phone ──
  p = await open(390, 'light', false);
  await p.evaluate(() => wStep2Skip()); await p.waitForTimeout(1000);
  const ph = await p.evaluate(() => { const r = document.querySelector('#tester-welcome .tw-box').getBoundingClientRect(); return { on: !document.getElementById('tester-welcome').classList.contains('hidden'), fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, sx: document.documentElement.scrollWidth - innerWidth }; });
  ok(ph.on && ph.fits && ph.sx <= 1, 'phone, Daylight: the note fits the screen, no sideways scroll (' + JSON.stringify(ph) + ')');
  await p.screenshot({ path: '/home/user/Vault-It/shots/brand/tester-welcome-daylight-390.png' });
  await p.context().close();

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
