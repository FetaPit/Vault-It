// v0.95 (owner, 8 Nov 2026: "Prepopulated dated present in the house deposit", "replicated with a tester and new user device and
// email"): a fresh device loads the Alex Morgan sample first (House Builder £18,500, seven dated deposits). When the tester then
// signs in with the emailed code, the sample must not become their data. Before the fix the wipe removed the sample from storage
// but the page did not reload, so every tab still held Alex in memory and the next save (the onboarding's own) wrote it back as
// the new user's, marked for sync. Now the page reloads straight after the wipe, and nothing can re-save sample keys before it.
//   1. fresh device: the sample is on, the login overlay is up
//   2. the code is verified (_afterVerified): the page reloads; after it the sample is gone from storage and from memory,
//      the session stands, no sample key is marked dirty, the welcome screens show for the new user
//   3. onboarding then the House Builder: £0 saved, no deposits, row 0
//   4. the same for a session found at start (_initSupabaseSession, a magic link or Google return)
//   5. a returning user on a sample device: their cloud rows are pulled before the restart, so the page opens on their own
//      figures with no welcome screens, nothing of the sample is left, and saving works again afterwards
//   6. the restarted page finishes the sign-in: a new account is offered to set a PIN, the marker is used once
//   7. the auth-state path (SIGNED_IN from supabase-js, the one a magic link or Google return fires) restarts the same way
//   8. a second tab still on the sample when the first tab signs in: it cannot write the sample back, and SIGNED_IN restarts it
// Run: node tests/test_v095_demo_signup.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const EMAIL = 'newtester@example.com';
async function fresh(b) {   // a brand-new device: no storage at all, so the sample loads
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p._navs = 0; p.on('pageerror', e => p._errs.push(e.message)); p.on('framenavigated', f => { if (f === p.mainFrame()) p._navs++; });
  await p.goto(APP); await p.waitForTimeout(3000);
  return p;
}
const dump = (p) => p.evaluate(() => { let h = null; try { h = JSON.parse(localStorage.getItem('ht3') || 'null'); } catch (e) {}
  const vis = id => { const e = document.getElementById(id); return e ? getComputedStyle(e).display : 'n/a'; };
  let u = null; try { u = JSON.parse(localStorage.getItem('vi_user') || 'null'); } catch (e) {}
  return { demo: localStorage.getItem('vi_demo_mode'), user: u, session: !!localStorage.getItem('vi_session'), ht3: h && { saved: h.saved, n: (h.deposits || []).length },
    al: localStorage.getItem('pos_al1'), ach: localStorage.getItem('pos_ach1'), ov: localStorage.getItem('pos_ov1'),
    achSample: (function () { try { var v = localStorage.getItem('pos_ach1'); return v ? _isDemoSample('pos_ach1', JSON.parse(v)) : false; } catch (e) { return 'err'; } })(),
    achXp: (function () { try { var v = JSON.parse(localStorage.getItem('pos_ach1') || 'null'); return v && (v.xp || (v.wr && v.wr.h) || null); } catch (e) { return 'err'; } })(),
    mem: (typeof state !== 'undefined' && state) ? { saved: state.saved, n: (state.deposits || []).length } : null,
    dirty: JSON.parse(localStorage.getItem('vi_dirty') || '[]'), login: vis('login-overlay'), welcome: vis('welcome-overlay') }; });
const DEMO_KEYS = ['ht3', 'pos_ov1', 'pos_al1', 'pos_debt1', 'pos_ach1', 'pos_journey'];
// a stand-in for supabase-js: a session for the given user (or none), and the auth-state callback captured on window._authCb
const fake = (p, email, withSession) => p.evaluate(([e, ws]) => { window._fakeClient = { auth: { getSession: async () => ({ data: { session: ws ? { user: { id: 'u-' + e, email: e } } : null } }),
    onAuthStateChange: (cb) => { window._authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; }, signOut: async () => ({}) },
  from: () => ({ upsert: async () => ({}), select: () => ({ eq: async () => ({ data: [] }) }) }), functions: { invoke: async () => ({ data: null }) } };
  window.supabase = { createClient: () => window._fakeClient }; return true; }, [email, !!withSession]);
async function onboard(p) {
  await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
  await p.fill('#w-name', 'Tess'); if (await p.isVisible('#w-email')) await p.fill('#w-email', EMAIL);
  await p.click('#w-opts .welcome-opt[data-val="2"]'); await p.click('#w-htypes .w-ht[data-type="terraced"]'); await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
  await p.fill('#w-income', '2000'); await p.fill('#w-expenses', '1500');
  await p.click('#w-pot-opts .welcome-opt[data-pot="none"]'); await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(300);
  await p.click('#w-finish'); await p.waitForTimeout(1500);
}

(async () => {
  const b = await chromium.launch();
  // ── 1 and 2: the emailed code path ──
  let p = await fresh(b);
  let d = await dump(p);
  ok(d.demo === 'true' && d.ht3 && d.ht3.saved === 18500 && d.ht3.n === 7 && d.login === 'flex', '1 a fresh device shows the sample: £18,500, seven deposits, login overlay up (' + JSON.stringify({ demo: d.demo, ht3: d.ht3, login: d.login }) + ')');
  const n0 = p._navs;
  // hydration and the account-switch guard need the network; here the new account has nothing in the cloud
  await p.evaluate(async (e) => { _hydrateFromSupabase = async () => false; _guardAccountSwitch = async () => true; await _afterVerified({ id: 'u-new', email: e }, e); }, EMAIL);
  await p.waitForTimeout(3500);
  ok(p._navs > n0, '2 verifying the code on a sample device reloads the page (' + (p._navs - n0) + ' navigation)');
  d = await dump(p);
  ok(d.demo === null && d.ht3 === null && d.al === null && d.ov === null && !d.achSample, '2 after the reload the sample is gone from storage; any achievements key is a fresh default, not Alex\'s (' + JSON.stringify({ ht3: d.ht3, al: !!d.al, ov: !!d.ov, ach: !!d.ach, achSample: d.achSample, achXp: d.achXp }) + ')');
  ok(d.mem && d.mem.saved === 0 && d.mem.n === 0, '2 and from memory: the House Builder holds £0 and no deposits (' + JSON.stringify(d.mem) + ')');
  ok(d.session && d.user && d.user.email === EMAIL && !d.user.name, '2 the new sign-in stands, the profile is the email only (' + JSON.stringify(d.user) + ')');
  ok(!d.dirty.some(k => DEMO_KEYS.indexOf(k) >= 0), '2 no sample key is marked for upload (' + JSON.stringify(d.dirty) + ')');
  ok(d.welcome !== 'none', '2 the welcome screens show for the new user');
  // ── 6: the restarted page finds the session and finishes the sign-in ──
  await fake(p, EMAIL, true);
  const fin2 = await p.evaluate(async () => { const before = sessionStorage.getItem('vi_after_wipe'); _hydrateFromSupabase = async () => false; _supaClient = window._fakeClient;
    await _initSupabaseSession(); await new Promise(r => setTimeout(r, 300));
    const ov = document.getElementById('login-overlay'), st = document.getElementById('auth-setpin-step');
    return { before, after: sessionStorage.getItem('vi_after_wipe'), login: getComputedStyle(ov).display, setpin: !!(st && st.classList.contains('active')), toast: (document.getElementById('toast') || {}).textContent || '', welcome: getComputedStyle(document.getElementById('welcome-overlay')).display }; });
  ok(fin2.before && /"pin":true/.test(fin2.before) && fin2.after === null, '6 the restart marker carries the PIN decision and is used once (' + fin2.before + ')');
  const due = await p.evaluate(() => localStorage.getItem('vi_pin_offer'));
  ok(fin2.login === 'none' && !fin2.setpin && /^due:\d+$/.test(due || ''), '6 the new account goes straight in; a PIN is offered on the next visit, as after the code check (' + JSON.stringify({ login: fin2.login, setpin: fin2.setpin, due }) + ')');
  ok(/ready/i.test(fin2.toast) && fin2.welcome !== 'none', '6 Vault ready, and the welcome screens show (' + fin2.toast + ')');
  // ── 3: onboarding, then the House Builder ──
  await onboard(p);
  d = await dump(p);
  ok(d.ht3 && d.ht3.saved === 0 && d.ht3.n === 0 && d.mem.saved === 0, '3 after onboarding the house deposit is the user\'s own: £0, no deposits (' + JSON.stringify(d.ht3) + ')');
  await p.evaluate(() => { try { setSetting('view', 'adv'); } catch (e) {} showTab('house'); }); await p.waitForTimeout(2500);
  const hud = await p.evaluate(() => (document.getElementById('tab-house') || {}).innerText.replace(/\s+/g, ' '));
  ok(/£0 saved/.test(hud) && /ROW 0 of 154/.test(hud) && !/18,5|18\.5k/.test(hud), '3 the House Builder shows £0 saved, row 0, nothing of Alex (' + hud.slice(0, 160) + ')');
  ok(p._errs.length === 0, '3 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  // ── 4: a session found at start (magic link or Google return) ──
  p = await fresh(b);
  d = await dump(p); ok(d.demo === 'true' && d.ht3 && d.ht3.saved === 18500, '4 fresh device, sample on');
  const n1 = p._navs;
  await p.evaluate(async (e) => { _hydrateFromSupabase = async () => false; _supaClient = { auth: { getSession: async () => ({ data: { session: { user: { id: 'u-link', email: e } } } }) }, from: () => ({ upsert: async () => ({}), select: () => ({ eq: async () => ({ data: [] }) }) }), functions: { invoke: async () => ({ data: null }) } }; await _initSupabaseSession(); }, EMAIL);
  await p.waitForTimeout(3500);
  ok(p._navs > n1, '4 a session found at start on a sample device reloads the page (' + (p._navs - n1) + ' navigation)');
  d = await dump(p);
  ok(d.demo === null && d.ht3 === null && d.mem && d.mem.saved === 0 && d.session && !d.dirty.some(k => DEMO_KEYS.indexOf(k) >= 0), '4 after it the sample is gone from storage and memory, nothing marked for upload (' + JSON.stringify({ ht3: d.ht3, mem: d.mem, dirty: d.dirty }) + ')');
  ok(p._errs.length === 0, '4 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  // ── 5: a returning user (cloud rows: name One B, House Builder £250) signs in on a sample device ──
  p = await fresh(b);
  d = await dump(p); ok(d.demo === 'true' && d.ht3 && d.ht3.saved === 18500, '5 fresh device, sample on');
  const n2 = p._navs;
  await p.evaluate(async (e) => {
    _hydrateFromSupabase = async () => {   // the account's rows land in storage the way hydration writes them (through the original setItem)
      _lsOrig.call(localStorage, 'vi_user', JSON.stringify({ name: 'One B', email: e, logins: 4 }));
      _lsOrig.call(localStorage, 'ht3', JSON.stringify({ saved: 250, target: 250000, houseType: 'terraced', depositPct: 20, deposits: [{ amount: 250, date: '02/11/2026' }], prices: { terraced: 250000 } }));
      return true; };
    _guardAccountSwitch = async () => true;
    await _afterVerified({ id: 'u-ret', email: e }, e); }, EMAIL);
  await p.waitForLoadState('load').catch(() => {}); await p.waitForTimeout(400);
  ok(p._navs > n2, '5 the page restarts after the wipe (' + (p._navs - n2) + ' navigation)');
  await p.waitForSelector('#welcome-overlay', { state: 'attached', timeout: 15000 });   // the restarted page may still be parsing on a busy runner (CI, 12 Nov: getComputedStyle on a missing element)
  const early = await p.evaluate(() => getComputedStyle(document.getElementById('welcome-overlay')).display);
  await p.waitForTimeout(2500);
  d = await dump(p);
  ok(early === 'none' && d.welcome === 'none', '5 no welcome screens for a returning user, from the first paint (' + early + ')');
  ok(d.user && d.user.name === 'One B' && d.mem && d.mem.saved === 250 && d.mem.n === 1 && d.ht3 && d.ht3.saved === 250, '5 their own figures: One B, £250, one deposit (' + JSON.stringify({ user: d.user, mem: d.mem }) + ')');
  ok(d.demo === null && d.al === null && d.ov === null && !d.achSample, '5 nothing of the sample is left (' + JSON.stringify({ al: !!d.al, ov: !!d.ov, achSample: d.achSample }) + ')');
  // the restarted page finds the session and finishes the sign-in: the marker is used once, the user stays marked onboarded
  const fin = await p.evaluate(async (e) => { const before = sessionStorage.getItem('vi_after_wipe'); _hydrateFromSupabase = async () => true;
    _supaClient = { auth: { getSession: async () => ({ data: { session: { user: { id: 'u-ret', email: e } } } }) }, from: () => ({ upsert: async () => ({}), select: () => ({ eq: async () => ({ data: [] }) }) }), functions: { invoke: async () => ({ data: null }) } };
    await _initSupabaseSession(); await new Promise(r => setTimeout(r, 300));
    return { before, after: sessionStorage.getItem('vi_after_wipe'), toast: (document.getElementById('toast') || {}).textContent || '', welcome: getComputedStyle(document.getElementById('welcome-overlay')).display, navsLater: performance.navigation.type }; }, EMAIL);
  ok(fin.before && /"r":"restored"/.test(fin.before) && fin.after === null && /restored/i.test(fin.toast) && fin.welcome === 'none', '5 the restarted page finishes the sign-in once: Vault restored, no welcome screens (' + JSON.stringify(fin) + ')');
  const later = await p.evaluate(() => { state.saved = 300; save(); return JSON.parse(localStorage.getItem('ht3')).saved; });
  ok(later === 300, '5 saving works again on the restarted page (' + later + ')');
  ok(p._errs.length === 0, '5 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  // ── 7: the auth-state path (SIGNED_IN) restarts the same way ──
  p = await fresh(b);
  d = await dump(p); ok(d.demo === 'true' && d.ht3 && d.ht3.saved === 18500, '7 fresh device, sample on');
  await fake(p, EMAIL, false);
  const n3 = p._navs;
  await p.evaluate(async (e) => { _initSupabase(); _hydrateFromSupabase = async () => false; await window._authCb('SIGNED_IN', { user: { id: 'u-si', email: e } }); }, EMAIL);
  await p.waitForTimeout(3500);
  ok(p._navs > n3, '7 SIGNED_IN on a sample device restarts the page (' + (p._navs - n3) + ' navigation)');
  d = await dump(p);
  ok(d.demo === null && d.ht3 === null && d.mem && d.mem.saved === 0 && d.session && !d.dirty.some(k => DEMO_KEYS.indexOf(k) >= 0), '7 after it the sample is gone from storage and memory (' + JSON.stringify({ ht3: d.ht3, mem: d.mem, dirty: d.dirty }) + ')');
  ok(p._errs.length === 0, '7 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  // ── 8: two tabs on the sample; the first signs in ──
  const A = await fresh(b); const ctx2 = A.context();
  const B = await ctx2.newPage(); B._errs = []; B._navs = 0; B.on('pageerror', e => B._errs.push(e.message)); B.on('framenavigated', f => { if (f === B.mainFrame()) B._navs++; });
  await B.goto(APP); await B.waitForTimeout(2500);
  d = await dump(B); ok(d.demo === 'true' && d.mem && d.mem.saved === 18500, '8 the second tab is on the sample too');
  await fake(B, EMAIL, false); await B.evaluate(() => { _initSupabase(); });
  await A.evaluate(async (e) => { _hydrateFromSupabase = async () => false; _guardAccountSwitch = async () => true; await _afterVerified({ id: 'u-new', email: e }, e); }, EMAIL);
  await A.waitForTimeout(3000);
  const bNow = await B.evaluate(() => { state.saved = 18500; save(); try { saveState(); } catch (e) {} return { demo: localStorage.getItem('vi_demo_mode'), ht3: localStorage.getItem('ht3'), ov: localStorage.getItem('pos_ov1'), mem: state.saved, dirty: JSON.parse(localStorage.getItem('vi_dirty') || '[]') }; });
  ok(bNow.demo === null && bNow.ht3 === null && bNow.ov === null && !bNow.dirty.some(k => DEMO_KEYS.indexOf(k) >= 0), '8 the second tab still holds the sample in memory but cannot write it back (' + JSON.stringify(bNow) + ')');
  const n4 = B._navs;
  await B.evaluate(async (e) => { _hydrateFromSupabase = async () => false; await window._authCb('SIGNED_IN', { user: { id: 'u-new', email: e } }); }, EMAIL);
  await B.waitForTimeout(3500);
  ok(B._navs > n4, '8 SIGNED_IN reaches the second tab and restarts it (' + (B._navs - n4) + ' navigation)');
  d = await dump(B);
  ok(d.demo === null && d.ht3 === null && d.mem && d.mem.saved === 0, '8 the second tab is clean after the restart (' + JSON.stringify({ ht3: d.ht3, mem: d.mem }) + ')');
  ok(A._errs.length === 0 && B._errs.length === 0, '8 no page errors' + (A._errs.length + B._errs.length ? ': ' + A._errs.concat(B._errs).join(' | ') : ''));
  await ctx2.close();
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: script ' + (e && e.message)); process.exit(1); });
