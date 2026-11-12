// The in-app 30-day no-card trial is gone (the card wall, chunk 3; docs/briefs/CARD_WALL.md point 3: "viTrialState, the day
// counter, the banner and the read-only state are replaced by: on a plan (open) or not (wall). A subscription that has ended or
// failed to renew goes back to the wall; the person's figures stay safe and downloadable."). With a stand-in Supabase:
//   1  the trial code and its screens are out of the app: no trial clock, countdown banner, read-only state or plans pop-up
//   2  an old account whose 30 days would have run out, on a plan: open, editable, no banner, no pop-up; Settings says the plan
//   3  not on a plan: the wall, and nothing can be added, changed or deleted behind it (the edit lock follows the wall)
//   4  a plan that ends: back to the wall; the figures are still on the device and Download my data hands them over
//   5  one plan per account, and every checkout belongs to an account: on a plan the plan buttons open no second checkout;
//      on the sample (no account) they open none either
//   6  the sample stays open and editable with no account
//   7  a remembered Stripe return with no time on it is forgotten; one from another account, or left behind at sign-out, is not shown
// Run: node tests/test_card_wall_no_trial.js
const vi = require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
vi.planStub(null);                // this test answers for the server itself
const fs = require('fs');
const { chromium } = require('playwright');
const APP = process.env.VI_APP || vi.FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const UID = '11111111-1111-4111-8111-111111111111';
const UNPAID = { is_pioneer: false, is_founder: false, plan: null, paid_until: null, is_beta: false, stripe_synced_at: null };
const MONTHLY = { is_pioneer: true, is_founder: false, plan: 'monthly', paid_until: new Date(Date.now() + 20 * 864e5).toISOString(), is_beta: true, stripe_synced_at: new Date().toISOString() };
const MOCK = (o) => `
  window.__prof = ${JSON.stringify(o.prof || null)}; window.__sess = ${JSON.stringify(o.sess === undefined ? { user: { id: UID, email: 't@t.com', created_at: new Date(Date.now() - 60 * 864e5).toISOString() } } : o.sess)};
  window.__opened = []; window.open = function (u) { window.__opened.push(String(u)); return null; };
  const answer = (t, cols) => {
    if (t === 'profiles' && cols !== 'stripe_synced_at' && cols !== '*') return window.__prof ? { data: window.__prof, error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    if (t === 'profiles') return { data: cols === '*' ? window.__prof : [], error: null };
    return { data: [], error: null };
  };
  const qb = (t) => { const q = { cols: '', select(c) { this.cols = c || ''; return this; }, eq() { return this; }, limit() { return this; }, order() { return this; }, single() { return this; }, maybeSingle() { return this; },
    upsert() { return Promise.resolve({ error: null }); }, delete() { return this; },
    then(res, rej) { return Promise.resolve(answer(t, this.cols)).then(res, rej); } }; return q; };
  Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => ({
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getSession: async () => ({ data: { session: window.__sess } }), signOut: async () => ({}), refreshSession: async () => ({ data: { session: window.__sess } }), verifyOtp: async () => ({ error: { message: 'x' } }) },
    functions: { invoke: async () => ({ data: null, error: { message: 'n/a' } }) },
    rpc: async () => ({ data: [], error: null }),
    from: qb }) }; }, set() {} });`;
const FIGS = { pos_ov1: { income: [{ id: 1, name: 'Wages', amount: 1900 }, { id: 2, name: 'Side job', amount: 300 }], expenses: [{ id: 3, name: 'Rent', amount: 800 }] } };
const seed = (o) => {
  if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_tester_note', '1'); localStorage.setItem('vi_tour_done', '1');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_last_email', 't@t.com');
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', goal: '2', logins: 9 }));
  localStorage.setItem('vi_trial_t0', String(Date.now() - 60 * 864e5));   // an account from 60 days ago: its 30 free days would be long over
  Object.keys(o.figs || {}).forEach((k) => localStorage.setItem(k, JSON.stringify(o.figs[k])));
  if (o.pending) localStorage.setItem('vi_pay_pending', JSON.stringify(o.pending));
};
const look = (p) => p.evaluate(() => {
  const shown = (sel) => { const e = document.querySelector(sel); if (!e) return false; const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && e.getClientRects().length > 0; };
  const wall = document.getElementById('plan-wall');
  return { wall: shown('#plan-wall'), state: wall ? wall.getAttribute('data-state') : null, nav: shown('#topnav'), tab: shown('.tab-panel.active'),
    banner: !!document.getElementById('trial-banner'), popup: !!document.getElementById('pro-offer-modal'),
    income: ((JSON.parse(localStorage.getItem('pos_ov1') || '{}') || {}).income || []).map((r) => r.name).join(), toast: (document.getElementById('toast') || {}).textContent || '', pending: localStorage.getItem('vi_pay_pending') };
});
const open_ = (s) => !s.wall && s.nav && s.tab, shut = (s) => s.wall && !s.nav && !s.tab;

(async () => {
  // ── 1  out of the app ──
  const src = fs.readFileSync(vi.INDEX, 'utf8');
  for (const gone of ['viTrialState', 'viTrialDaysLeft', 'viTrialBanner', 'viTrialBoot', 'viShowTrialEnd', 'viCanEdit', 'VI_TRIAL_DAYS', 'trial-banner', 'id="pro-offer-modal"', 'vi_trial_prompt', 'vi_trial_nudge'])
    ok(src.indexOf(gone) < 0, '1 ' + gone + ' is gone from the app');
  ok(!/READ-ONLY|(becomes|turns|is) read-only|read-only until|Keep reading only|>Read-only</.test(src), '1 no "read-only vault" wording is left in the app');
  ok(!/Your 30 days are up|days left of your free|of your free 30|DAYS LEFT|30 free days|free 30 days end|countdown shows/i.test(src), '1 no trial countdown wording is left in the app');

  const b = await chromium.launch(); const errs = [];
  const open = async (o, query) => {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true });
    await ctx.route(/supabase-js|supabase\.co|googleapis|gstatic|cloudflare|jsdelivr|unpkg/, (r) => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(MOCK(o)); if (!o.noSeed) await p.addInitScript(seed, o);
    try { await p.goto(APP + (query || '')); } catch (e) { if (!/interrupted|ERR_ABORTED/.test(e.message)) throw e; }
    await p.waitForTimeout(o.wait || 2000);
    return p;
  };

  // ── 2  an account 60 days old, on a plan ──
  let p = await open({ prof: MONTHLY, figs: FIGS, wait: 7500 });   // past the old banner's timers (1.2 s and 6 s)
  let s = await look(p);
  ok(open_(s) && !s.banner && !s.popup, '2 an account 60 days old on a plan: the app is open, no trial banner, no plans pop-up (' + JSON.stringify({ wall: s.wall, banner: s.banner, popup: s.popup }) + ')');
  const fns = await p.evaluate(() => ({ trial: typeof viTrialState, day: typeof viTrialDay, end: typeof viShowTrialEnd, block: viBlockEdit(), tier: viTier(), paid: viPaid(), acct: viAccountDay() }));
  ok(fns.trial === 'undefined' && fns.day === 'undefined' && fns.end === 'undefined', '2 there is no trial clock in the page (' + JSON.stringify(fns) + ')');
  ok(fns.block === false && fns.tier === 'monthly' && fns.paid === true, '2 on a plan nothing is locked; the tier is the plan (' + fns.tier + ')');
  await p.evaluate(() => delIncome(2)); await p.waitForTimeout(200);
  ok((await look(p)).income === 'Wages', '2 editing works: a row can be deleted');
  const set = await p.evaluate(() => { showSettings(); const vis = (id) => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; };
    return { badge: document.getElementById('set-pioneer-badge').textContent, active: vis('set-pioneer-active'), line: document.getElementById('set-pioneer-active').textContent, inactive: vis('set-pioneer-inactive'), buy: vis('set-plan-monthly') || vis('set-plan-annual') || vis('set-plan-founder'), manage: !!document.querySelector('#settings-modal [data-manage-sub]') }; });
  ok(/ACTIVE/.test(set.badge) && set.active && !set.inactive && !/TRIAL|DAYS LEFT|READ-ONLY/i.test(set.badge + set.line), '2 Settings says the plan is active, with no trial or read-only wording (' + set.badge + ' / ' + set.line.trim() + ')');
  ok(!set.buy && set.manage, '2 on a plan Settings shows no buy buttons, and keeps "Manage or cancel my plan"');
  // ── 5  one plan per account ──
  const up = await p.evaluate(() => { closeSettings(); window.__opened = []; showUpgrade('monthly'); showUpgrade('annual'); showUpgrade('founder'); return { opened: window.__opened.length, toast: document.getElementById('toast').textContent }; });
  ok(up.opened === 0 && /already on a plan/i.test(up.toast) && /hello@vault-it\.co/.test(up.toast), '5 on a plan the plan buttons open no second checkout and say how to change it (' + up.toast + ')');

  // ── 4  the plan ends ──
  await p.evaluate(async (row) => { window.__prof = row; await viPlanCheck(); }, UNPAID); await p.waitForTimeout(300);
  s = await look(p);
  ok(shut(s) && s.state === 'plans', '4 the plan ends (or fails to renew): back to the wall, not a read-only vault (' + s.state + ')');
  ok(s.income === 'Wages', '4 the figures are still on the device');
  // ── 3  nothing changes behind the wall ──
  const lock = await p.evaluate(() => { const before = localStorage.getItem('pos_ov1'); const blocked = viBlockEdit(); delIncome(1); return { blocked, same: localStorage.getItem('pos_ov1') === before, tier: viTier(), paid: viPaid() }; });
  ok(lock.blocked && lock.same, '3 behind the wall an edit handler does nothing: the row is still there');
  ok(lock.tier === 'none' && lock.paid === false, '3 the device no longer calls itself on a plan (' + lock.tier + ')');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#wall-export')]);
  const bundle = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok(bundle.onThisDevice && bundle.onThisDevice.pos_ov1 && bundle.onThisDevice.pos_ov1.income[0].name === 'Wages', '4 Download my data hands the figures over from the wall');
  const up2 = await p.evaluate(() => { window.__opened = []; showUpgrade('monthly'); return window.__opened.length; });
  ok(up2 === 1, '5 with no plan the monthly button opens the checkout again');
  const up2b = await p.evaluate(() => { localStorage.setItem('vi_pioneer', 'true'); window.__opened = []; showUpgrade('monthly'); const n = window.__opened.length, walled = viWallUp(); localStorage.removeItem('vi_pioneer'); return { n, walled }; });
  ok(up2b.n === 1 && up2b.walled, '5 a paid flag left on the device opens nothing and cannot keep an account with no plan from the checkout (' + JSON.stringify(up2b) + ')');
  await p.context().close();

  // ── 3  a fresh visit with no plan ──
  p = await open({ prof: UNPAID, figs: FIGS, wait: 7500 });
  s = await look(p);
  ok(shut(s) && s.state === 'plans' && !s.banner, '3 an account 60 days old with no plan: the wall (not a read-only app with a banner)');
  ok(await p.evaluate(() => { delIncome(1); return viBlockEdit(); }) && (await look(p)).income === 'Wages,Side job', '3 and nothing can be deleted behind it');
  await p.context().close();

  // ── 6 and 5  the sample ──
  p = await open({ prof: null, sess: null, noSeed: true, wait: 400 }, '?demo=alex');
  await p.waitForFunction(() => !/demo=alex/.test(location.search) && typeof initDemoMode === 'function', null, { timeout: 60000 }); await p.waitForTimeout(2500);
  s = await look(p);
  ok(open_(s) && !s.banner, '6 the sample opens with no account, no wall and no banner');
  ok(await p.evaluate(() => viBlockEdit() === false), '6 and it can be edited');
  const up3 = await p.evaluate(() => { window.__opened = []; showUpgrade('monthly'); return { opened: window.__opened.length, toast: document.getElementById('toast').textContent }; });
  ok(up3.opened === 0 && /sign in|account/i.test(up3.toast), '5 on the sample (no account) a plan button opens no checkout and asks for an account first (' + up3.toast + ')');
  await p.context().close();

  // ── 7  the remembered return ──
  p = await open({ prof: UNPAID, pending: { plan: 'monthly' } });
  s = await look(p);
  ok(shut(s) && s.state === 'plans' && s.pending === null, '7 a remembered return with no time on it is forgotten: the plans (' + s.state + ')');
  await p.context().close();
  p = await open({ prof: UNPAID, pending: { plan: 'monthly', t: Date.now(), u: '99999999-9999-4999-8999-999999999999' } });
  s = await look(p);
  ok(shut(s) && s.state === 'plans' && s.pending === null, '7 a return remembered for another account is not shown to this one (' + s.state + ')');
  await p.context().close();
  p = await open({ prof: UNPAID }, '?upgraded=1&plan=monthly');
  ok(JSON.parse((await look(p)).pending || '{}').u === UID, '7 the return is remembered for the account that was signed in');
  await p.evaluate(() => { window.confirm = () => true; window.__reloaded = false; signOut(); }); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => localStorage.getItem('vi_pay_pending') === null), '7 Sign out forgets it, so the next person on this device is not told their payment is being checked');
  await p.context().close();

  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? '\nFAILURES ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
