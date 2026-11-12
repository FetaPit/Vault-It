// Owner, 12 Nov 2026: "There's an error when I sign up with a new email address that I've not used before. It automatically
// populates Pete's profile ... it all linked back to one profile instead of creating a new one with a new email address."
// The server made separate accounts. On the device, the account-switch question (_guardAccountSwitch) ran only on the e-mail
// code and PIN path; a Google or magic-link return arrives as SIGNED_IN on the auth-state handler, which skipped it, so the
// previous person's figures stayed on screen and were uploaded into the new account.
//   1. SIGNED_IN for a different e-mail on a device holding someone else's data: asks first, naming both addresses,
//      and nothing is read or written in the cloud before the answer
//   2. Cancel: the data stays, the newcomer is signed out again, nothing was uploaded
//   3. the same person (any capitalisation) by SIGNED_IN: not asked, data kept
//   4. Confirm: the page restarts; the previous person's data and keys are gone, the new sign-in stands,
//      and nothing of the previous person was ever uploaded under the new account
//   5. one question per sign-in when the auth-state handler and the e-mail code path both report it; a new attempt straight
//      after a Cancel is asked again
//   6. a session found when the page starts (what a Google return opens, _initSupabaseSession) asks the same question
// Run: node tests/test_switch_person_google.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };

const SB = 'sb-test-auth-token';   // any sb-… key is a sign-in token to the wipe; a made-up name, so a real supabase-js cannot tidy it away
const ALICE = { vi_user: JSON.stringify({ name: 'Alice', email: 'alice@example.com', phone: '07000' }), vi_last_email: 'alice@example.com',
  vi_session: JSON.stringify({ email: 'alice@example.com', expiry: 0 }),   // signed out: the session has run out, the data is still here
  pos_ov1: JSON.stringify({ income: [{ n: 'Pay', amount: 3000 }], expenses: [] }), meshy_api_key: 'msy_alice', vi_dirty: '["pos_ov1"]' };
ALICE[SB] = JSON.stringify({ access_token: 'bob.jwt' });   // what supabase-js has just stored for the newcomer

async function device(b, seed) {   // a device that already holds one person's data
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p._navs = 0; p.on('pageerror', e => p._errs.push(e.message)); p.on('framenavigated', f => { if (f === p.mainFrame()) p._navs++; });
  await p.addInitScript((seed) => { if (window.name === '__seeded') return; window.name = '__seeded'; localStorage.setItem('vi_declined_demo', 'true'); for (const k in seed) localStorage.setItem(k, seed[k]); }, seed);
  await p.goto(APP); await p.waitForTimeout(2500);
  return p;
}
// a stand-in for supabase-js: every cloud read and write is recorded on window._cloud, the auth-state callback is captured on window._authCb
const fake = (p) => p.evaluate(() => { window._cloud = { reads: 0, writes: [], signOuts: 0 };
  window._fakeClient = { auth: { getSession: async () => ({ data: { session: window._fakeSession || null } }),
      onAuthStateChange: (cb) => { window._authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; }, signOut: async () => { window._cloud.signOuts++; return {}; } },
    from: (t) => ({ upsert: async (rows) => { window._cloud.writes.push({ t: t, rows: JSON.stringify(rows) }); return {}; },
      select: () => { window._cloud.reads++; const r = Promise.resolve({ data: [] }); r.eq = () => { const q = Promise.resolve({ data: [] }); q.maybeSingle = async () => ({ data: null }); q.single = async () => ({ data: null }); q.eq = r.eq; return q; }; return r; } }),
    functions: { invoke: async () => ({ data: null }) } };
  window.supabase = { createClient: () => window._fakeClient }; _initSupabase(); return true; });
const state = (p) => p.evaluate((SB) => ({ ov: localStorage.getItem('pos_ov1'), user: localStorage.getItem('vi_user'), key: localStorage.getItem('meshy_api_key'), sb: !!localStorage.getItem(SB),
  last: localStorage.getItem('vi_last_email'), supa: (typeof _supaUser !== 'undefined' && _supaUser) ? _supaUser.email : null, cloud: window._cloud || null }), SB);
const bobAt = (t) => ({ user: { id: 'u-bob', email: 'bob@example.com', last_sign_in_at: t, app_metadata: { provider: 'google', providers: ['google'] } } });
const bob = bobAt('2026-11-12T09:53:00Z');   // one sign-in; bobAt(another time) is a new attempt by the same person

(async () => {
  const b = await chromium.launch();

  // ── 1 and 2: a different person returns from Google; they say Cancel ──
  let p = await device(b, ALICE); await fake(p);
  await p.evaluate(async (s) => { window.__asks = []; window.confirm = (m) => { window.__asks.push(m); window.__cloudAtAsk = JSON.stringify(window._cloud); return false; }; await window._authCb('SIGNED_IN', s); }, bob);
  await p.waitForTimeout(1200);
  let s = await state(p); const asks = await p.evaluate(() => window.__asks), atAsk = JSON.parse(await p.evaluate(() => window.__cloudAtAsk || 'null'));
  ok(asks.length === 1 && /alice@example\.com/.test(asks[0]) && /bob@example\.com/.test(asks[0]) && /never uploaded/.test(asks[0]), '1 SIGNED_IN as a different person asks first, naming both addresses and the un-uploaded changes (' + asks.length + ' question)');
  ok(atAsk && atAsk.reads === 0 && atAsk.writes.length === 0, '1 nothing was read from or written to the cloud before the answer (' + JSON.stringify(atAsk) + ')');
  ok(/"n":"Pay"/.test(s.ov || '') && /Alice/.test(s.user || '') && s.key === 'msy_alice' && s.last === 'alice@example.com', '2 Cancel keeps the previous person\'s data on the device');
  ok(s.supa === null && s.cloud.signOuts >= 1 && s.cloud.writes.length === 0, '2 Cancel signs the newcomer out again and uploads nothing (' + JSON.stringify({ supa: s.supa, signOuts: s.cloud.signOuts, writes: s.cloud.writes.length }) + ')');
  ok(p._errs.length === 0, '2 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));

  // ── 5: the handler and the e-mail code path report the same sign-in: one question, not two ──
  await p.evaluate(async (s) => { window.__asks = []; window.confirm = (m) => { window.__asks.push(m); return false; };
    const a = window._authCb('SIGNED_IN', s), c = _afterVerified(s.user, s.user.email); await a; await c; }, bobAt('2026-11-12T09:54:00Z'));
  await p.waitForTimeout(600);
  s = await state(p);
  ok((await p.evaluate(() => window.__asks.length)) === 1 && s.supa === null && /"n":"Pay"/.test(s.ov || '') && s.cloud.writes.length === 0, '5 both paths reporting one sign-in ask once; a Cancel leaves no one signed in and uploads nothing (' + (await p.evaluate(() => window.__asks.length)) + ' question)');
  await p.evaluate(async (s) => { window.__asks = []; await window._authCb('SIGNED_IN', s); }, bobAt('2026-11-12T09:54:05Z')); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__asks.length)) === 1, '5 a second try straight after a Cancel is a new sign-in and is asked again, not refused in silence');
  await p.evaluate(async () => { window.__asks = []; await _afterVerified({ id: 'u-bob', email: 'bob@example.com' }, 'bob@example.com'); await _afterVerified({ id: 'u-bob', email: 'bob@example.com' }, 'bob@example.com'); }); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.__asks.length)) === 2, '5 with nothing to tell two sign-ins apart, each one is asked (never let through or refused on a guess)');
  await p.context().close();

  // ── 6: the session is found when the page starts (the page a Google return opens) ──
  p = await device(b, ALICE); await fake(p);
  await p.evaluate(async (s) => { window.__asks = []; window.confirm = (m) => { window.__asks.push(m); window.__cloudAtAsk = JSON.stringify(window._cloud); return false; }; window._fakeSession = s; await _initSupabaseSession(); }, bob);
  await p.waitForTimeout(800);
  s = await state(p); const at6 = JSON.parse(await p.evaluate(() => window.__cloudAtAsk || 'null'));
  ok((await p.evaluate(() => window.__asks.length)) === 1 && at6 && at6.reads === 0 && at6.writes.length === 0, '6 a session found at start for a different person asks first, before any read or upload');
  ok(/"n":"Pay"/.test(s.ov || '') && s.last === 'alice@example.com' && s.supa === null && s.cloud.writes.length === 0, '6 Cancel keeps the data, signs the newcomer out, uploads nothing');
  ok(p._errs.length === 0, '6 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  // ── 3: the same person by Google: no question ──
  p = await device(b, ALICE); await fake(p);
  await p.evaluate(async () => { window.__asks = []; window.confirm = (m) => { window.__asks.push(m); return false; }; _hydrateFromSupabase = async () => false;
    await window._authCb('SIGNED_IN', { user: { id: 'u-alice', email: 'Alice@Example.com', app_metadata: { provider: 'google' } } }); });
  await p.waitForTimeout(800);
  s = await state(p);
  ok((await p.evaluate(() => window.__asks.length)) === 0 && /"n":"Pay"/.test(s.ov || '') && s.supa === 'Alice@Example.com', '3 the same person (any capitalisation) is not asked and keeps their data');
  await p.context().close();

  // ── 4: a different person returns from Google; they confirm ──
  p = await device(b, ALICE); await fake(p);
  const n0 = p._navs;
  await p.evaluate((s) => { window.confirm = () => true; window._authCb('SIGNED_IN', s); }, bob);
  await p.waitForTimeout(4500);   // the restart, and anything start-up does after it
  ok(p._navs > n0, '4 Confirm restarts the page (' + (p._navs - n0) + ' navigation)');
  s = await state(p);
  ok(!/"n":"Pay"/.test(s.ov || '') && s.key === null && !/Alice|07000/.test(s.user || '') && s.sb && s.last === 'bob@example.com', '4 the previous person\'s data and keys are gone, the new sign-in stands (' + JSON.stringify({ ov: s.ov, key: s.key, user: s.user, sb: s.sb, last: s.last }) + ')');
  // the restarted page finds the session and syncs: nothing of Alice may go up under Bob
  await fake(p);
  await p.evaluate(async (s) => { window.confirm = () => { throw new Error('should not ask again'); }; await window._authCb('SIGNED_IN', s); try { if (typeof _flushDirty === 'function') await _flushDirty(); } catch (e) {} }, bob);
  await p.waitForTimeout(1500);
  s = await state(p);
  ok(s.supa === 'bob@example.com' && !s.cloud.writes.some(w => /Pay|Alice|07000|msy_alice/.test(w.rows)), '4 on the restarted page the newcomer is signed in with no question, and nothing of the previous person is uploaded (' + s.cloud.writes.length + ' write(s))');
  ok(p._errs.length === 0, '4 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: script error', e.message); process.exit(1); });
