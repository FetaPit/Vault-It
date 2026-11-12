// Coming back from Stripe (the card wall, chunk 2; docs/briefs/CARD_WALL.md point 2: "?upgraded=1 / ?founded=1 shows 'checking
// your payment' and waits for the server record; if it has not arrived after a minute, say so plainly and give the support
// address. Never unlock on the query string alone."). With a stand-in Supabase that answers the profile read:
//   1  ?upgraded=1 and ?founded=1 show "Checking your payment", clean the address and open nothing by themselves
//   2  the app opens by itself when the server marks the account, with a welcome, and nothing is left pending
//   3  after a minute with no word from the server the page says so plainly, gives hello@vault-it.co, says not to pay again,
//      keeps checking, and still opens when the record arrives; "Back to the plans" is there for someone who did not pay
//   4  the return is remembered across a reload, and forgotten after half an hour
//   5  an older server (no paid columns) or a signed-out browser: the address unlocks nothing
//   6  an account already on a plan that lands on the return address just opens
// Run: node tests/test_card_wall_return.js
const vi = require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
vi.planStub(null);                // this test answers for the server itself
const { chromium } = require('playwright');
const APP = process.env.VI_APP || vi.FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const UID = '11111111-1111-4111-8111-111111111111';
const UNPAID = { is_pioneer: false, is_founder: false, plan: null, paid_until: null, is_beta: false, stripe_synced_at: null };
const TRIAL = { is_pioneer: true, is_founder: false, plan: 'monthly', paid_until: new Date(Date.now() + 34 * 864e5).toISOString(), is_beta: true, stripe_synced_at: new Date().toISOString() };
const LIFETIME = { is_pioneer: true, is_founder: true, plan: 'founder', paid_until: null, is_beta: false, stripe_synced_at: new Date().toISOString() };
const MOCK = (o) => `
  window.__prof = ${JSON.stringify(o.prof || null)}; window.__sess = ${JSON.stringify(o.sess === undefined ? { user: { id: UID, email: 't@t.com' } } : o.sess)};
  window.__mode = ${JSON.stringify(o.mode || 'ok')}; window.__reads = 0; window.__upserts = [];
  const answer = (t, cols) => {
    if (t === 'profiles') {
      const paidCols = /stripe_synced_at|is_beta|paid_until/.test(cols);
      if (paidCols && window.__mode === 'old') return { data: null, error: { code: '42703', message: 'column profiles.stripe_synced_at does not exist' } };
      if (cols === 'stripe_synced_at') return { data: [], error: null };
      if (cols === 'is_pioneer') return { data: { is_pioneer: true }, error: null };   // an older server's self-declared flag
      window.__reads++;
      return window.__prof ? { data: window.__prof, error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    }
    return { data: [], error: null };
  };
  const qb = (t) => { const q = { cols: '', select(c) { this.cols = c || ''; return this; }, eq() { return this; }, limit() { return this; }, order() { return this; }, single() { return this; }, maybeSingle() { return this; },
    upsert(row) { window.__upserts.push({ t, row }); return Promise.resolve({ error: null }); }, delete() { return this; },
    then(res, rej) { return Promise.resolve(answer(t, this.cols)).then(res, rej); } }; return q; };
  Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => ({
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getSession: async () => ({ data: { session: window.__sess } }), signOut: async () => ({}), refreshSession: async () => ({ data: { session: window.__sess } }), verifyOtp: async () => ({ error: { message: 'x' } }) },
    functions: { invoke: async () => ({ data: null, error: { message: 'n/a' } }) },
    rpc: async () => ({ data: [], error: null }),
    from: qb }) }; }, set() {} });`;
const seed = (o) => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_tester_note', '1'); localStorage.setItem('vi_tour_done', '1');
  if (!o.signedOut) { localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); }
  localStorage.setItem('vi_last_email', 't@t.com');
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', goal: '2', logins: 3 }));
  if (o.pending) localStorage.setItem('vi_pay_pending', JSON.stringify(o.pending));
};
const look = (p) => p.evaluate(() => {
  const shown = (sel) => { const e = document.querySelector(sel); if (!e) return false; const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && e.getClientRects().length > 0; };
  const wall = document.getElementById('plan-wall');
  return { wall: shown('#plan-wall'), state: wall ? wall.getAttribute('data-state') : null, nav: shown('#topnav'), tab: shown('.tab-panel.active'),
    plans: [].filter.call(document.querySelectorAll('#plan-wall [data-plan]'), (b) => b.getClientRects().length > 0).length,
    text: wall ? wall.innerText : '', url: location.search, pending: localStorage.getItem('vi_pay_pending'), toast: (document.getElementById('toast') || {}).textContent || '',
    flags: [localStorage.getItem('vi_pioneer'), localStorage.getItem('vi_founder'), localStorage.getItem('vi_plan'), (JSON.parse(localStorage.getItem('vi_user') || '{}') || {}).pro ? 'pro' : null].filter(Boolean).join(),
    login: shown('#login-overlay'), mail: !!document.querySelector('#plan-wall .wall-view[data-view="late"] a[href="mailto:hello@vault-it.co"]') };
});
const open_ = (s) => !s.wall && s.nav && s.tab, shut = (s) => s.wall && !s.nav && !s.tab;

(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (o, query) => {
    const ctx = await b.newContext({ viewport: { width: o.w || 1100, height: 900 } });
    await ctx.route(/supabase-js|supabase\.co|googleapis|gstatic|cloudflare|jsdelivr|unpkg/, (r) => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(MOCK(o)); await p.addInitScript(seed, o);
    await p.goto(APP + (query || '')); await p.waitForTimeout(o.wait || 1800);
    return p;
  };

  // ── 1 and 2  the return address alone opens nothing; the server's word does ──
  for (const [query, plan, row, word] of [['?upgraded=1&plan=monthly', 'monthly', TRIAL, /Welcome, Vaulter\. Your plan is confirmed/], ['?founded=1', 'founder', LIFETIME, /Lifetime licence is confirmed/i]]) {
    let p = await open({ prof: UNPAID }, query);
    let s = await look(p);
    ok(shut(s) && s.state === 'paying' && /Checking your payment/.test(s.text) && s.plans === 0, query + ' 1 back from Stripe: "Checking your payment", the app stays shut, no plan buttons (' + JSON.stringify({ wall: s.wall, state: s.state, nav: s.nav }) + ')');
    ok(s.url === '' && !!s.pending && JSON.parse(s.pending).plan === plan, query + ' 1 the address is cleaned and the return is remembered (' + s.pending + ')');
    ok(s.flags === '', query + ' 1 the address sets no paid flag on the device (' + s.flags + ')');
    ok(await p.evaluate(() => VI_PAY_WAIT_MS === 60000 && VI_PAY_POLL_MS <= 5000), query + ' 1 it waits a minute, asking the server every few seconds');
    const before = await p.evaluate(() => window.__reads);
    await p.waitForTimeout(4200);
    ok((await p.evaluate(() => window.__reads)) > before && shut(await look(p)), query + ' 1 it keeps asking the server and stays shut while the answer is no');
    await p.evaluate((r) => { window.__prof = r; }, row);
    await p.waitForFunction(() => !document.documentElement.classList.contains('vi-walled'), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(300);
    s = await look(p);
    ok(open_(s), query + ' 2 the server marks the account: the app opens by itself (' + JSON.stringify({ wall: s.wall, state: s.state }) + ')');
    ok(s.pending === null && word.test(s.toast), query + ' 2 with a welcome, and nothing left pending (' + s.toast + ')');
    await p.context().close();
  }

  // ── 3  a minute with no word: say so plainly, give the support address, keep checking ──
  let p = await open({ prof: UNPAID, pending: { plan: 'monthly', t: Date.now() - 61000 } });
  let s = await look(p);
  ok(shut(s) && s.state === 'late', '3 a return more than a minute old with no plan on the account: the "not reached us yet" screen (' + s.state + ')');
  ok(/has not reached us/i.test(s.text) && /hello@vault-it\.co/.test(s.text) && s.mail, '3 it says so plainly and gives hello@vault-it.co (as a link too)');
  ok(/do not need to pay again|do not pay again/i.test(s.text), '3 it tells the person not to pay again');
  ok(s.plans === 0 && await p.evaluate(() => ['wall-late-check', 'wall-late-plans'].every((id) => { const e = document.getElementById(id); return !!e && e.getClientRects().length > 0; })), '3 no plan buttons here; Check again and Back to the plans are offered');
  ok(/Not regulated by the FCA\. Not financial advice\./.test(s.text), '3 the FCA line is on it');
  await p.evaluate((r) => { window.__prof = r; }, TRIAL);
  await p.waitForFunction(() => !document.documentElement.classList.contains('vi-walled'), null, { timeout: 20000 }).catch(() => {});   // after the minute it asks every fourth tick (12 s)
  ok(open_(await look(p)), '3 it keeps checking: the app still opens by itself when the record arrives late');
  await p.context().close();
  // the minute passing on an open page
  p = await open({ prof: UNPAID }, '?upgraded=1&plan=yearly');
  ok((await look(p)).state === 'paying', '3 (on the page) first "Checking your payment"');
  await p.evaluate(() => { var q = JSON.parse(localStorage.getItem('vi_pay_pending')); q.t = Date.now() - 59000; localStorage.setItem('vi_pay_pending', JSON.stringify(q)); });
  await p.waitForFunction(() => document.getElementById('plan-wall').getAttribute('data-state') === 'late', null, { timeout: 9000 }).catch(() => {});
  s = await look(p);
  ok(shut(s) && s.state === 'late', '3 (on the page) when the minute is up it changes to the "not reached us yet" screen by itself (' + s.state + ')');
  await p.click('#wall-late-plans'); await p.waitForTimeout(300);
  s = await look(p);
  ok(shut(s) && s.state === 'plans' && s.plans === 3 && s.pending === null, '3 Back to the plans shows the three plans again and forgets the return (' + s.state + ')');
  await p.context().close();

  // ── 4  remembered across a reload; forgotten after half an hour ──
  p = await open({ prof: UNPAID }, '?upgraded=1&plan=monthly');
  await p.reload(); await p.waitForTimeout(1800);
  s = await look(p);
  ok(shut(s) && s.state === 'paying' && !!s.pending, '4 a reload while waiting still says "Checking your payment" (' + s.state + ')');
  await p.context().close();
  p = await open({ prof: UNPAID, pending: { plan: 'monthly', t: Date.now() - 31 * 60000 } });
  s = await look(p);
  ok(shut(s) && s.state === 'plans' && s.pending === null, '4 a return from more than half an hour ago is forgotten: the plans (' + s.state + ')');
  await p.context().close();

  // ── 5  nothing else opens it either ──
  p = await open({ prof: null, mode: 'old' }, '?upgraded=1&plan=yearly');
  await p.waitForTimeout(1500);
  s = await look(p);
  ok(shut(s) && s.flags === '' && s.url === '', '5 a server without the paid columns: the return address unlocks nothing and sets no flag (' + JSON.stringify({ state: s.state, flags: s.flags }) + ')');
  ok(await p.evaluate(() => window.__upserts.every((u) => !(u.t === 'profiles' && 'is_pioneer' in u.row))), '5 and the browser never writes a paid flag to the profile');
  ok(await p.evaluate(() => typeof viPaymentLegacy === 'undefined' && typeof verifyPioneerPurchaseLegacy === 'undefined'), '5 the old device-side unlocks are gone from the app');
  await p.context().close();
  p = await open({ prof: TRIAL, sess: null, signedOut: true }, '?upgraded=1&plan=monthly');
  s = await look(p);
  ok(s.login, '5 signed out on the return page: the sign-in screen');
  ok(s.flags === '' && !!s.pending && s.url === '', '5 nothing is unlocked; the return is remembered for after sign-in (' + s.flags + ')');
  await p.context().close();

  // ── 6  already on a plan ──
  p = await open({ prof: TRIAL }, '?upgraded=1&plan=monthly');
  s = await look(p);
  ok(open_(s) && s.pending === null && s.url === '', '6 an account the server already has on a plan just opens (' + JSON.stringify({ wall: s.wall, state: s.state, pending: s.pending }) + ')');
  await p.context().close();

  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? '\nFAILURES ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
