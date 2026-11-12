// Owner, 12 Nov 2026: "Ensure that just because I'm accessing it from the same browser and device, it doesn't automatically
// log in to PTLiveD if I'm using a different email."
// Sign out asked supabase-js to sign out and reloaded the page in the same breath. supabase-js removes its stored session only
// after its network call returns (auth-js _signOut), so the reload cut it off and the session stayed in the browser. The next
// page found it and let the previous person back in: straight in when there was no PIN, and behind a PIN pad that the page
// after that skipped (the app's own session had already been written again).
//   1. signed in on this browser: the app opens on that person (the starting point)
//   2. Sign out: the stored session is gone, the app's own session is gone, the sign-in screen shows, nobody is signed in
//   3. opening the app again changes nothing: still signed out
//   4. the same with a PIN on the device: no way back in by reloading
//   5. sign-out with the network down still signs this browser out
//   6. the whole chain: sign out, a different person returns from Google, says yes: they get their own empty account,
//      nothing of the previous person is on the device, and they were asked exactly once
// Run: node tests/test_sign_out_session.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };

const KEY = 'sb-legpubblzgknxdtvsant-auth-token';
const tok = (id, email) => JSON.stringify({ access_token: id + '.jwt', user: { id: id, email: email, last_sign_in_at: '2026-11-12T10:00:00Z', app_metadata: { provider: 'google' } } });
const ALICE = { vi_declined_demo: 'true', vi_user: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }), vi_last_email: 'alice@example.com',
  vi_session: JSON.stringify({ email: 'alice@example.com', expiry: Date.now() + 864e5 }), pos_ov1: JSON.stringify({ income: [{ n: 'Pay', amount: 3000 }], expenses: [] }) };
ALICE[KEY] = tok('u-alice', 'alice@example.com');

// A stand-in for supabase-js that survives reloads (it is installed before the app's own scripts on every page). Like the real
// library it keeps the session in localStorage and, on signOut, removes it only after a (simulated) network round trip.
const STANDIN = (KEY) => {
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  window.confirm = (m) => { const a = JSON.parse(localStorage.getItem('sb-test-asks') || '[]'); a.push(String(m)); localStorage.setItem('sb-test-asks', JSON.stringify(a)); return localStorage.getItem('sb-test-confirm') !== 'no'; };
  const q = () => { const r = Promise.resolve({ data: [] }); r.eq = () => { const e = Promise.resolve({ data: [] }); e.eq = r.eq; e.maybeSingle = async () => ({ data: null }); e.single = async () => ({ data: null }); return e; }; return r; };
  const client = { auth: {
      getSession: async () => { const t = read(); return { data: { session: (t && t.user) ? { access_token: t.access_token, user: t.user } : null } }; },
      onAuthStateChange: (cb) => { window._authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: () => new Promise((res) => { const d = localStorage.getItem('sb-test-delay'); if (d === 'never') return;   // the network is down: never answers
        setTimeout(() => { localStorage.removeItem(KEY); res({ error: null }); }, Number(d || 400)); }) },
    from: () => ({ upsert: async () => ({}), select: q }), functions: { invoke: async () => ({ data: null }) } };
  window.supabase = { createClient: () => client };
};

async function browserWith(b, seed) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2|cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.addInitScript((seed) => { if (window.name === '__seeded') return; window.name = '__seeded'; for (const k in seed) localStorage.setItem(k, seed[k]); }, seed);
  await p.addInitScript(STANDIN, KEY);
  await p.goto(APP); await p.waitForTimeout(2500);
  return p;
}
const state = (p) => p.evaluate((KEY) => { const ov = document.getElementById('login-overlay');
  return { token: !!localStorage.getItem(KEY), session: !!localStorage.getItem('vi_session'), login: ov ? getComputedStyle(ov).display : 'n/a',
    supa: (typeof _supaUser !== 'undefined' && _supaUser) ? _supaUser.email : null, last: localStorage.getItem('vi_last_email'), ov1: localStorage.getItem('pos_ov1'), user: localStorage.getItem('vi_user'),
    asks: JSON.parse(localStorage.getItem('sb-test-asks') || '[]').filter(m => /still holds data/.test(m)).length }; }, KEY);
const signOutAndWait = async (p, ms) => { await Promise.all([p.waitForNavigation({ timeout: 15000 }), p.evaluate(() => { signOut(); })]); await p.waitForTimeout(ms || 2500); };
const signedOut = (s) => !s.token && !s.session && s.supa === null && s.login !== 'none';

(async () => {
  const b = await chromium.launch();

  // ── 1 to 3: no PIN on the device (a Google user) ──
  let p = await browserWith(b, ALICE);
  let s = await state(p);
  ok(s.supa === 'alice@example.com' && s.login === 'none' && s.token, '1 signed in on this browser: the app opens on that person (' + JSON.stringify({ supa: s.supa, login: s.login }) + ')');
  await signOutAndWait(p);
  s = await state(p);
  ok(signedOut(s), '2 Sign out: stored session gone, app session gone, sign-in screen up, nobody signed in (' + JSON.stringify({ token: s.token, session: s.session, supa: s.supa, login: s.login }) + ')');
  await p.reload(); await p.waitForTimeout(2500);
  s = await state(p);
  ok(signedOut(s), '3 opening the app again: still signed out (' + JSON.stringify({ token: s.token, session: s.session, supa: s.supa, login: s.login }) + ')');

  // ── 6: a different person returns from Google on this browser and says yes ──
  await p.evaluate(([KEY, t]) => { localStorage.setItem(KEY, t); }, [KEY, tok('u-bob', 'bob@example.com')]);   // what the Google return stores
  await p.reload(); await p.waitForTimeout(5000);   // the question, the clean-up, the restart
  s = await state(p);
  ok(s.asks === 1, '6 the newcomer is asked once before anything is shown (' + s.asks + ' question)');
  ok(s.supa === 'bob@example.com' && s.last === 'bob@example.com' && !/Pay/.test(s.ov1 || '') && !/Alice/.test(s.user || ''), '6 they are in their own account with nothing of the previous person on the device (' + JSON.stringify({ supa: s.supa, last: s.last, ov1: s.ov1, user: s.user }) + ')');
  ok(p._errs.length === 0, '6 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  // ── 4: a PIN on the device ──
  p = await browserWith(b, Object.assign({}, ALICE, { vi_pin_hash: 'srv', vi_pin_len: '6' }));
  await signOutAndWait(p);
  await p.reload(); await p.waitForTimeout(2500);
  s = await state(p);
  ok(signedOut(s), '4 with a PIN on the device: signed out, and reloading is no way back in (' + JSON.stringify({ token: s.token, session: s.session, supa: s.supa, login: s.login }) + ')');
  await p.context().close();

  // ── 5: the network is down when signing out ──
  p = await browserWith(b, Object.assign({}, ALICE, { 'sb-test-delay': 'never' }));
  await signOutAndWait(p, 3000);
  s = await state(p);
  ok(signedOut(s), '5 sign-out with the network down still signs this browser out (' + JSON.stringify({ token: s.token, session: s.session, supa: s.supa, login: s.login }) + ')');
  ok(p._errs.length === 0, '5 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: script error', e.message); process.exit(1); });
