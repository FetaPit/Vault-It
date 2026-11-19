// Welcome card 1 and the e-mail ask (owner, 19 Nov 2026: the first onboarding card asked for an e-mail address
// "despite already requesting it so it should auto populate as I used sign in with Google email").
//   1. a stored Google session (sb-*-auth-token, as supabase-js writes it) on a fresh page load: card 1 shows "Signed in as <address>",
//      the e-mail box stays hidden, Next does not ask, and the address is saved to vi_user
//   2. an expired stored session still names the address (the cloud copy restores on sign-in; the welcome must not ask)
//   3. no session at all: the box shows (the only case that may ask)
// Run: node tests/test_welcome_known_email.js
require('./lib/vi');
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const jwt = (exp) => 'x.' + Buffer.from(JSON.stringify({ exp, amr: [{ method: 'oauth', timestamp: 1 }] })).toString('base64').replace(/=+$/, '') + '.y';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const run = async (label, session) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.route(/supabase\.co|open\.er-api\.com|challenges\.cloudflare\.com/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(label + ': ' + e.message));
    await p.addInitScript((s) => { localStorage.setItem('vi_declined_demo', 'true'); if (s) localStorage.setItem('sb-legpubblzgknxdtvsant-auth-token', JSON.stringify(s)); }, session);
    await p.goto(APP); await p.waitForTimeout(2500);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    await p.evaluate(() => { try { if (typeof showWelcome === 'function') showWelcome(); } catch (e) {} });
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const f = document.getElementById('w-email-field'), si = document.getElementById('wz-signed'), ov = document.getElementById('welcome-overlay');
      return { welcome: !!ov && getComputedStyle(ov).display !== 'none', boxShown: !!f && f.offsetParent !== null, signed: si && si.offsetParent !== null ? si.textContent.trim() : '', val: document.getElementById('w-email').value }; });
    await p.context().close(); return r;
  };
  const good = (exp) => ({ access_token: jwt(exp), refresh_token: 'r', expires_at: exp, user: { id: 'u1', email: 'tess@gmail.com', app_metadata: { provider: 'google' }, user_metadata: { full_name: 'Tess Test' } } });
  let r = await run('live', good(Math.floor(Date.now() / 1000) + 3600));
  ok(r.welcome && !r.boxShown && /tess@gmail\.com/.test(r.signed) && r.val === 'tess@gmail.com', '1 live Google session: "Signed in as", no e-mail box (' + JSON.stringify(r) + ')');
  r = await run('expired', good(Math.floor(Date.now() / 1000) - 3600));
  ok(r.welcome && !r.boxShown && /tess@gmail\.com/.test(r.signed), '2 expired Google session: still named, not asked (' + JSON.stringify(r) + ')');
  r = await run('none', null);
  ok(r.welcome && r.boxShown && !r.signed, '3 no session: the box shows (' + JSON.stringify(r) + ')');
  ok(!errs.length, 'no page errors ' + errs.join('; '));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
