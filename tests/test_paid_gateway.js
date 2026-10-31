// Secure paid gateway, the app's side (migration 011 + stripe-webhook). With a stand-in Supabase:
//   live server (the profile has the Stripe columns): the Stripe return URL alone unlocks nothing; the plan appears when the profile
//   says paid (the webhook arrived); the device mirrors the profile up AND down; a typed checkout e-mail proves nothing; the sign-in
//   upsert no longer sends is_pioneer; tester and founder flags come from the profile; old synced copies of paid status are ignored.
//   older server (columns missing): everything works as before (the return URL unlocks this device), so the app can ship first.
// Run: node tests/test_paid_gateway.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const MOCK = (mode, prof, extra) => `
  window.__mode = ${JSON.stringify(mode)}; window.__prof = ${JSON.stringify(prof)}; window.__upserts = []; window.__reads = [];
  ${extra || ''}
  const answer = (t, cols) => {
    window.__reads.push(t + ':' + cols);
    if (t === 'profiles') {
      const wantsNew = /stripe_synced_at|is_beta|paid_until/.test(cols);
      if (wantsNew && window.__mode === 'old') return { data: null, error: { code: '42703', message: 'column profiles.stripe_synced_at does not exist' } };
      if (cols === 'stripe_synced_at') return { data: [], error: null };
      if (cols === 'is_pioneer') return { data: { is_pioneer: false }, error: null };
      return { data: window.__prof, error: null };
    }
    if (t === 'vault_data') return { data: window.__vault || [], error: null };
    return { data: [], error: null };
  };
  const qb = (t) => { const q = { cols: '', select(c) { this.cols = c || ''; return this; }, eq() { return this; }, limit() { return this; }, order() { return this; }, single() { return this; }, maybeSingle() { return this; },
    upsert(row) { window.__upserts.push({ t, row }); return Promise.resolve({ error: null }); }, delete() { return this; },
    then(res, rej) { return Promise.resolve(answer(t, this.cols)).then(res, rej); } }; return q; };
  Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => ({
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getSession: async () => ({ data: { session: null } }), signOut: async () => ({}), verifyOtp: async () => ({ error: { message: 'x' } }) },
    functions: { invoke: async () => ({ data: null, error: { message: 'n/a' } }) },
    from: qb }) }; }, set() {} });`;
const seed = (o) => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi-flag-house', '0'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3, pro: !!o.paid }));
  localStorage.setItem('vi_tester_note', '1');
  if (o.paid) localStorage.setItem('vi_pioneer', 'true');
  if (o.plan) localStorage.setItem('vi_plan', o.plan);
  if (o.founder) localStorage.setItem('vi_founder', 'true');
};
const UNPAID = { is_pioneer: false, is_founder: false, plan: null, paid_until: null, is_beta: false, stripe_synced_at: null };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (mode, prof, o, query, extra) => {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    await ctx.route(/supabase-js|supabase\.co/, (r) => r.abort());   // never the real service
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(MOCK(mode, prof, extra)); await p.addInitScript(seed, o || {});
    await p.goto(APP + (query || '')); await p.waitForTimeout(1200);
    return p;
  };
  const state = (p) => p.evaluate(() => ({ paid: viPaid(), pioneer: localStorage.getItem('vi_pioneer'), founder: localStorage.getItem('vi_founder'), plan: viPlan(), tier: viTier(),
    pro: JSON.parse(localStorage.getItem('vi_user') || '{}').pro, pending: localStorage.getItem('vi_pay_pending'), toast: document.getElementById('toast').textContent, gw: _viGateway, url: location.search }));

  // ── live server: the return URL alone is not proof ──
  let p = await open('live', UNPAID, {}, '?upgraded=1&plan=yearly');
  ok(await p.evaluate(() => !!_supaClient), 'the stand-in Supabase client is in use');
  await p.evaluate(() => { _supaUser = { id: '11111111-1111-1111-1111-111111111111', email: 't@t.com' }; });
  await p.waitForTimeout(3600);
  let s = await state(p);
  ok(s.gw === true && s.url === '', 'the app sees the server keeps paid status, and cleans the URL');
  ok(!s.paid && s.pioneer === null && !s.pro && s.plan === null, 'typing ?upgraded=1 unlocks nothing while the profile says unpaid (' + JSON.stringify(s) + ')');
  ok(!!s.pending, 'the return is remembered while Stripe confirms');
  await p.evaluate(() => { window.__prof = { is_pioneer: true, is_founder: false, plan: 'yearly', paid_until: '2027-11-04T00:00:00Z', is_beta: true, stripe_synced_at: '2026-11-01T12:00:00Z' }; });
  await p.waitForTimeout(3600);
  s = await state(p);
  ok(s.paid && s.pioneer === 'true' && s.plan === 'yearly' && s.tier === 'yearly' && s.pro === true, 'once the webhook marks the profile paid, the plan appears on its own');
  ok(s.pending === null && /Welcome, Pioneer/.test(s.toast), 'with a welcome, and nothing left pending');
  ok(await p.evaluate(() => viBetaTester() && localStorage.getItem('vi_beta') === 'true'), 'the tester flag comes from the profile');
  await p.context().close();

  // ── live server: the profile wins over a device flag, both ways ──
  p = await open('live', UNPAID, { paid: true, plan: 'founder', founder: true });
  ok((await state(p)).paid === true, 'before sign-in the device flag shows');
  await p.evaluate(async () => { _supaUser = { id: 'u1', email: 't@t.com' }; await _syncPioneerFromProfile('u1'); });
  s = await state(p);
  ok(!s.paid && s.pioneer === null && s.founder === null && s.plan === null && s.pro === false && s.tier !== 'founder', 'a device that claims Founding Member is set back to the profile (unpaid) (' + JSON.stringify(s) + ')');
  await p.evaluate(async () => { window.__prof = { is_pioneer: true, is_founder: true, plan: 'founder', paid_until: null, is_beta: false, stripe_synced_at: '2026-11-01T12:00:00Z' }; await _syncPioneerFromProfile('u1'); });
  s = await state(p);
  ok(s.paid && s.founder === 'true' && s.tier === 'founder' && /^10 /.test(await p.evaluate(() => viShotAllowance())), 'a founder profile makes the device a Founding Member (allowance 10)');
  await p.evaluate(async () => { window.__prof = Object.assign({}, window.__prof, { is_pioneer: false, is_founder: false, plan: null }); await _syncPioneerFromProfile('u1'); });
  ok(!(await state(p)).paid, 'and a profile cleared by Pete (reconciled) clears the device too');

  // a typed e-mail proves nothing
  await p.evaluate(async () => { document.getElementById('pw-verify-email').value = 't@t.com'; await verifyPioneerPurchase(); });
  s = await state(p);
  ok(!s.paid && /No payment found/.test(await p.evaluate(() => document.getElementById('pw-verify-msg').textContent)), '"Verify your purchase" asks the server; a matching e-mail alone no longer unlocks');
  // the sign-in profile upsert no longer claims paid status
  await p.evaluate(() => { localStorage.setItem('vi_pioneer', 'true'); window.__upserts = []; try { _completeAuth('t@t.com'); } catch (e) {} });
  await p.waitForTimeout(300);
  const ups = await p.evaluate(() => window.__upserts.filter((u) => u.t === 'profiles').map((u) => u.row));
  ok(ups.length > 0 && ups.every((r) => !('is_pioneer' in r)), 'the sign-in profile update does not send is_pioneer (' + JSON.stringify(ups.map((r) => Object.keys(r))) + ')');
  ok(await p.evaluate(() => _VAULT_KEYS.indexOf('vi_pioneer') < 0 && _VAULT_KEYS.indexOf('vi_founder') < 0 && _VAULT_KEYS.indexOf('vi_plan') < 0), 'paid status is no longer synced through the vault');
  await p.context().close();

  // an old synced copy of paid status in the vault is ignored on sign-in
  p = await open('live', UNPAID, {}, '', `window.__vault = [{ key: 'vi_pioneer', value: 'true', updated_at: new Date().toISOString() }, { key: 'vi_plan', value: 'founder', updated_at: new Date().toISOString() }];`);
  await p.evaluate(async () => { _supaUser = { id: 'u1', email: 't@t.com' }; await _hydrateFromSupabase('u1'); });
  s = await state(p);
  ok(!s.paid && s.pioneer === null && s.plan === null, 'a vault row saying vi_pioneer = true does not make the device paid');
  await p.context().close();

  // ── older server: as before ──
  p = await open('old', null, {}, '?upgraded=1&plan=yearly');
  await p.waitForTimeout(800);
  s = await state(p);
  ok(s.gw === false && s.paid && s.plan === 'yearly' && s.tier === 'yearly' && s.url === '', 'older server (no migration 011): the Stripe return unlocks this device as before (' + JSON.stringify(s) + ')');
  await p.context().close();
  p = await open('old', null, {}, '?founded=1');
  await p.waitForTimeout(800);
  s = await state(p);
  ok(s.paid && s.tier === 'founder', 'older server: ?founded=1 records the Founding plan as before');
  await p.context().close();

  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? '\nFAILURES ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
