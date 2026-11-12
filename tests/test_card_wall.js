// The card wall (owner, 12 Nov 2026: "Card required", "Card wall for everyone", "After the questions"; docs/briefs/CARD_WALL.md).
// Nobody uses the app on an account without a plan. With a stand-in Supabase that answers the profile read:
//   1  a new sign-up, after the questions, sees the three plans with prices and terms and cannot reach any tab
//   2  choosing the monthly plan opens the Stripe link with the 30-day trial, the account id and the e-mail
//   3  the server's answer decides: on a plan (a trial counts) opens the app on any device; not on a plan shows the wall
//   4  the device's own paid flags, set by hand, open nothing; nor does the app show before the server has answered
//   5  an existing account with no plan meets the wall at its next visit; its figures are untouched; Download my data works
//   6  the server cannot be reached, or the sign-in has run out: the app stays closed and says why (never the plans)
//   7  a plan that ends closes the app again; the wall has no way out but a plan, Sign out, Download my data and Help
//   8  the test stand-in (window.__viPlanStub) is ignored on a deployed address
//   8b only the sample has no wall: the demo flag set by hand, or the old ?bypass=websummit link, on a device that holds an account opens nothing
//   9  the demo link opens with no account and no wall
// Run: node tests/test_card_wall.js
const vi = require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
vi.planStub(null);                // this test answers for the server itself
const fs = require('fs');
const { chromium } = require('playwright');
const APP = process.env.VI_APP || vi.FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const UID = '11111111-1111-4111-8111-111111111111';
const MONTHLY_TRIAL = 'https://buy.stripe.com/8x2fZbgpMdjjgdv5KK2VG08';   // src/app/paywall/stripe-config.js, monthly_trial
const UNPAID = { is_pioneer: false, is_founder: false, plan: null, paid_until: null, is_beta: false, stripe_synced_at: null };
const TRIAL = { is_pioneer: true, is_founder: false, plan: 'monthly', paid_until: new Date(Date.now() + 34 * 864e5).toISOString(), is_beta: true, stripe_synced_at: new Date().toISOString() };   // what stripe_apply writes for a trial checkout
const LIFETIME = { is_pioneer: true, is_founder: true, plan: 'founder', paid_until: null, is_beta: false, stripe_synced_at: new Date().toISOString() };
// a stand-in Supabase: one signed-in account (or none), and a profile read that answers, fails or hangs
const MOCK = (o) => `
  window.__prof = ${JSON.stringify(o.prof || null)}; window.__sess = ${JSON.stringify(o.sess === undefined ? { user: { id: UID, email: 't@t.com' } } : o.sess)};
  window.__mode = ${JSON.stringify(o.mode || 'ok')}; window.__reads = 0; window.__opened = [];
  window.open = function (u) { window.__opened.push(String(u)); return null; };
  const answer = (t, cols) => {
    if (t === 'profiles' && cols !== 'stripe_synced_at' && cols !== '*') {
      window.__reads++;
      if (window.__mode === 'hang') return new Promise(() => {});
      if (window.__mode === 'net') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      return window.__prof ? { data: window.__prof, error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    }
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
const FIGS = { pos_ov1: { income: [{ id: 1, name: 'Wages', amount: 1900 }], expenses: [{ id: 2, name: 'Rent', amount: 800 }] }, pos_al1: { otherAssets: [{ id: 1, name: 'Bike', value: 420 }] }, pos_debt1: { debts: [{ id: 1, name: 'Card', balance: 1200, rate: 24, min: 50 }] } };
const seed = (o) => {
  localStorage.setItem('vi-theme', o.theme || 'dark'); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_tester_note', '1');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_last_email', 't@t.com');
  localStorage.setItem('vi_user', JSON.stringify(o.fresh ? { email: 't@t.com' } : { name: 'T', email: 't@t.com', goal: '2', logins: 3, pro: !!o.flags }));
  if (o.flags) { localStorage.setItem('vi_pioneer', 'true'); localStorage.setItem('vi_founder', 'true'); localStorage.setItem('vi_plan', 'founder'); }
  if (o.figs) Object.keys(o.figs).forEach((k) => localStorage.setItem(k, JSON.stringify(o.figs[k])));
};
// what a person can see and reach
const look = (p) => p.evaluate(() => {
  const cs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e) : null; };
  const shown = (sel) => { const e = document.querySelector(sel), c = cs(sel); return !!e && c.display !== 'none' && c.visibility !== 'hidden' && e.getClientRects().length > 0; };
  const wall = document.getElementById('plan-wall');
  const at = (x, y) => { const e = document.elementFromPoint(x, y); return !!(e && wall && wall.contains(e)); };
  const w = innerWidth, h = innerHeight;
  return {
    wall: shown('#plan-wall'), state: wall ? wall.getAttribute('data-state') : null,
    nav: shown('#topnav'), tab: shown('.tab-panel.active'), side: shown('#left-sidebar') || shown('#sidebar-toggle'), footer: shown('#app-footer'),
    covered: !!wall && at(8, 8) && at(w / 2, h / 2) && at(w - 8, h - 8) && at(w / 2, 20),
    plans: [].filter.call(document.querySelectorAll('#plan-wall [data-plan]'), (b) => b.getClientRects().length > 0 && getComputedStyle(b).visibility !== 'hidden').map((b) => b.getAttribute('data-plan')),
    buttons: [].filter.call(document.querySelectorAll('#plan-wall button, #plan-wall a[href]'), (b) => b.getClientRects().length > 0 && getComputedStyle(b).visibility !== 'hidden').map((b) => b.id || b.getAttribute('data-plan') || b.textContent.trim()),
    text: wall ? wall.innerText : '', sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    login: (() => { const lo = document.getElementById('login-overlay'), e = document.elementFromPoint(w / 2, h / 2); return !!lo && getComputedStyle(lo).display !== 'none' && !!e && lo.contains(e); })(),   // the sign-in screen is up and on top
    paidFlags: { pioneer: localStorage.getItem('vi_pioneer'), founder: localStorage.getItem('vi_founder'), plan: localStorage.getItem('vi_plan') },
  };
});
// every figure in `want` is in `got` with the same value (the app's own loader adds default fields to a saved row, as it always has)
const has = (got, want) => want === null || typeof want !== 'object' ? got === want : !!got && typeof got === 'object' && Object.keys(want).every((k) => has(got[k], want[k]));
const open_ = (s) => !s.wall && s.nav && s.tab;                                             // the app is open
const shut = (s) => s.wall && s.covered && !s.nav && !s.tab && !s.side && !s.footer;        // nothing of the app can be seen or reached

(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (o, w, url) => {
    const ctx = await b.newContext({ viewport: { width: w || 1100, height: (w || 1100) < 700 ? 844 : 900 }, acceptDownloads: true });
    await ctx.route(/supabase-js|supabase\.co|googleapis|gstatic|cloudflare|jsdelivr|unpkg/, (r) => r.abort());   // never the real services
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(MOCK(o)); if (!o.noSeed) await p.addInitScript(seed, o);
    if (o.init) await p.addInitScript(o.init);
    try { await p.goto(url || APP); } catch (e) { if (!/interrupted|ERR_ABORTED/.test(e.message)) throw e; }
    await p.waitForTimeout(o.wait || 1800);
    return p;
  };

  // ── 1  a new sign-up: the questions first, then the plans, and no way into the app ──
  for (const w of [1100, 390]) {
    const T = w + ': ';
    let p = await open({ prof: UNPAID, fresh: true }, w);
    let s = await look(p);
    ok(await p.evaluate(() => getComputedStyle(document.getElementById('welcome-overlay')).display !== 'none') && !s.wall, T + '1 a new sign-up meets the questions first, not the plans (' + s.state + ')');
    await p.click('#w-opts .welcome-opt[data-val="2"]'); await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(250);
    await p.click('#wz-s2 .wz-skip'); await p.waitForTimeout(250); await p.click('#w-finish'); await p.waitForTimeout(1600);
    s = await look(p);
    ok(shut(s) && s.state === 'plans', T + '1 after the questions the plans screen covers the app: no tab, no menu, no footer (' + JSON.stringify({ wall: s.wall, state: s.state, covered: s.covered, nav: s.nav, tab: s.tab, side: s.side, footer: s.footer }) + ')');
    ok(s.plans.join() === 'monthly,annual,founder', T + '1 the three plans are offered (' + s.plans.join() + ')');
    const cards = await p.evaluate(() => ['monthly', 'annual', 'founder'].map((k) => ({ name: (document.querySelector('#plan-wall [data-plan-name="' + k + '"]') || {}).textContent, price: (document.querySelector('#plan-wall [data-plan-price="' + k + '"]') || {}).textContent,
      terms: (document.querySelector('#plan-wall [data-plan-terms="' + k + '"]') || {}).textContent, want: { name: VI_PLANS[k].name, price: viPlanPrice(k), terms: viPlanTerms(k) } })));
    ok(cards.every((c) => c.name === c.want.name && c.price.indexOf(c.want.price) === 0 && c.terms === c.want.terms), T + '1 each plan shows its name, price and terms from the one source (' + JSON.stringify(cards.map((c) => [c.name, c.price])) + ')');
    ok(/£3\.99/.test(cards[0].price) && /£49\.99/.test(cards[1].price) && /£99/.test(cards[2].price), T + '1 prices are the Stripe links\' prices: £3.99 a month, £49.99 a year, £99 once');
    ok(/^Free for 30 days, then £3\.99 a month\. Your card is taken now and first charged on day 31\. Cancel before then and you pay nothing\. To cancel, email hello@vault-it\.co\.$/.test(cards[0].terms), T + '1 the monthly terms say it plainly: free for 30 days, card taken now, charged on day 31, how to cancel (' + cards[0].terms + ')');
    ok(/One payment, charged at checkout/.test(cards[2].terms), T + '1 the Lifetime licence is charged at checkout');
    ok(/Not regulated by the FCA\. Not financial advice\./.test(s.text), T + '1 "Not regulated by the FCA. Not financial advice." is on the wall');
    ok(!s.sideways, T + '1 no sideways scroll');
    const allowed = ['monthly', 'annual', 'founder', 'wall-check', 'wall-signout', 'wall-export', 'wall-help'];
    ok(s.buttons.length === allowed.length && s.buttons.every((x) => allowed.indexOf(x) > -1), T + '1 the only ways on are a plan, Check again, Sign out, Download my data and Help (' + s.buttons.join() + ')');
    // nothing gets past it
    await p.keyboard.press('Escape'); await p.mouse.click(4, 4); await p.waitForTimeout(200);
    await p.evaluate(() => { try { showTab('budget'); } catch (e) {} try { showSettings(); } catch (e) {} try { document.getElementById('pro-offer-modal').classList.remove('hidden'); } catch (e) {} });
    for (let i = 0; i < 40; i++) await p.keyboard.press('Tab');
    const focus = await p.evaluate(() => { const a = document.activeElement, w = document.getElementById('plan-wall'); return !a || a === document.body || w.contains(a); });
    s = await look(p);
    ok(shut(s) && s.state === 'plans' && focus, T + '1 Esc, a tap outside, the Tab key and a tab switch behind it all leave the wall up and the app out of reach (focus inside: ' + focus + ')');
    ok(await p.evaluate(() => ['settings-modal', 'pro-offer-modal', 'tab-budget'].every((id) => getComputedStyle(document.getElementById(id)).visibility === 'hidden')), T + '1 anything opened behind the wall stays hidden');

    // ── 2  the monthly plan goes to Stripe with the trial link, the account and the e-mail ──
    await p.click('#plan-wall [data-plan="monthly"]'); await p.waitForTimeout(200);
    const url = await p.evaluate(() => window.__opened[0] || '');
    ok(url.indexOf(MONTHLY_TRIAL + '?') === 0, T + '2 the monthly plan opens the Stripe link with the 30-day trial (' + url.slice(0, 60) + ')');
    ok(url.indexOf('client_reference_id=' + UID) > 0 && url.indexOf('prefilled_email=' + encodeURIComponent('t@t.com')) > 0, T + '2 with the account id and the e-mail');
    ok(shut(await look(p)), T + '2 opening the checkout unlocks nothing');
    // ── 3  the server marks the account (a trial counts): the app opens ──
    await p.evaluate((row) => { window.__prof = row; }, TRIAL);
    await p.click('#wall-check'); await p.waitForTimeout(900);
    s = await look(p);
    ok(open_(s), T + '3 once the server says the account is on a plan (trialing), Check again opens the app (' + JSON.stringify({ wall: s.wall, nav: s.nav, tab: s.tab }) + ')');
    await p.context().close();
  }

  // ── 3  on every device: a browser with no flags opens when the server says so, and stays shut when it does not ──
  let p = await open({ prof: TRIAL });
  let s = await look(p);
  ok(open_(s), '3 an account on a plan opens the app on a device that holds no paid flag');
  await p.context().close();
  p = await open({ prof: LIFETIME });
  ok(open_(await look(p)), '3 a Lifetime licence opens the app');
  await p.context().close();

  // ── 4  the device's own flags open nothing ──
  p = await open({ prof: UNPAID, flags: true });
  s = await look(p);
  ok(shut(s) && s.state === 'plans', '4 vi_pioneer, vi_founder, vi_plan and vi_user.pro set by hand: the wall stays (' + JSON.stringify({ wall: s.wall, state: s.state, nav: s.nav }) + ')');
  await p.evaluate(() => { localStorage.setItem('vi_pioneer', 'true'); localStorage.setItem('vi_founder', 'true'); var u = JSON.parse(localStorage.getItem('vi_user')); u.pro = true; localStorage.setItem('vi_user', JSON.stringify(u)); try { applyPaywall(); } catch (e) {} try { viPlanGate(); } catch (e) {} });
  await p.click('#wall-check'); await p.waitForTimeout(700);
  ok(shut(await look(p)), '4 set again while the wall is up, then Check again: still shut');
  await p.context().close();
  p = await open({ prof: TRIAL, mode: 'hang', flags: true, wait: 900 });
  s = await look(p);
  ok(shut(s) && s.state === 'checking' && s.plans.length === 0, '4 before the server has answered the app is not shown, flags or not: "checking your plan" (' + s.state + ')');
  await p.context().close();

  // ── 5  an existing account with no plan: the wall at its next visit, figures untouched, Download my data works ──
  p = await open({ prof: UNPAID, figs: FIGS });
  s = await look(p);
  ok(shut(s) && s.state === 'plans', '5 an existing account with no plan meets the wall at its next visit');
  const kept = await p.evaluate((f) => { const o = {}; Object.keys(f).forEach((k) => { try { o[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { o[k] = null; } }); return o; }, FIGS);
  ok(Object.keys(FIGS).every((k) => has(kept[k], FIGS[k])), '5 its figures on the device are untouched (' + JSON.stringify(kept).slice(0, 160) + ')');
  ok(/safe/i.test(s.text) && /t@t\.com/.test(s.text), '5 the wall says the figures are safe and which account is signed in');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#wall-export')]);
  const file = await dl.path(); const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(/^vault-it-my-data-/.test(dl.suggestedFilename()) && bundle.onThisDevice && Object.keys(FIGS).every((k) => has(bundle.onThisDevice[k], FIGS[k])), '5 Download my data hands over the figures from behind the wall');
  await p.waitForTimeout(400);
  ok(shut(await look(p)), '5 and the wall is still up afterwards');
  // Help opens over the wall; the app stays shut
  await p.click('#wall-help'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const h = document.getElementById('vi-help'); return !!h && h.classList.contains('open') && getComputedStyle(h).visibility !== 'hidden'; }), '5 Help opens from the wall');
  s = await look(p);
  ok(s.wall && !s.nav && !s.tab, '5 with Help open the app is still out of reach');
  await p.context().close();

  // ── 6  no answer from the server: closed, and never the plans (nobody is asked to pay twice) ──
  p = await open({ prof: TRIAL, mode: 'net' });
  s = await look(p);
  ok(shut(s) && s.state === 'offline' && s.plans.length === 0 && /could not check/i.test(s.text), '6 the server cannot be reached: the app stays closed and says so, with no plan buttons (' + s.state + ')');
  await p.evaluate(() => { window.__mode = 'ok'; });
  await p.click('#wall-retry'); await p.waitForTimeout(900);
  ok(open_(await look(p)), '6 Try again opens it once the server answers');
  await p.context().close();
  p = await open({ prof: TRIAL, sess: null, wait: 2500 });
  s = await look(p);
  ok(shut(s) && s.state === 'signin' && s.plans.length === 0 && /sign in again/i.test(s.text), '6 the sign-in has run out: closed, asks to sign in again, no plan buttons (' + s.state + ')');
  await p.context().close();

  // ── 7  a plan that ends closes the app again ──
  p = await open({ prof: TRIAL });
  ok(open_(await look(p)), '7 on a plan: open');
  await p.evaluate(async (row) => { window.__prof = row; await viPlanCheck(); }, UNPAID);
  await p.waitForTimeout(300);
  s = await look(p);
  ok(shut(s) && s.state === 'plans', '7 the server says the plan has ended: back to the wall (' + s.state + ')');
  ok(s.paidFlags.pioneer === null, '7 and the device no longer calls itself paid');
  // a failed check while the app is open does not throw a paying person out
  await p.evaluate(async (row) => { window.__prof = row; await viPlanCheck(); }, TRIAL);
  await p.evaluate(async () => { window.__mode = 'net'; await viPlanCheck(); });
  ok(open_(await look(p)), '7 a check that fails while the app is open leaves it open (only a "no" from the server closes it)');
  await p.context().close();

  // ── 8  the test stand-in is dead on a deployed address ──
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    const origin = await vi.serve();
    await ctx.route(/supabase-js|supabase\.co|googleapis|gstatic|cloudflare|jsdelivr|unpkg/, (r) => r.abort());
    await ctx.route('http://app.vault-it.example/**', async (r) => { const u = new URL(r.request().url()); const resp = await ctx.request.get(origin + u.pathname + u.search); await r.fulfill({ response: resp }); });
    const q = await ctx.newPage(); q.on('pageerror', (e) => errs.push(e.message));
    await q.addInitScript(MOCK({ prof: UNPAID })); await q.addInitScript(seed, {}); await q.addInitScript(() => { window.__viPlanStub = 'on'; });
    await q.goto('http://app.vault-it.example/index.html'); await q.waitForTimeout(1800);
    s = await look(q);
    ok(shut(s) && s.state === 'plans', '8 window.__viPlanStub = "on" on a deployed address opens nothing (' + JSON.stringify({ wall: s.wall, state: s.state }) + ')');
    await ctx.close();
    p = await open({ prof: UNPAID, init: 'window.__viPlanStub = "on";' });
    ok(open_(await look(p)), '8 on a loopback address the stand-in answers for the server (how the rest of the suite runs)');
    await p.context().close();
  }

  // ── 8b  the sample is the only thing with no wall: a demo flag or the old demo link on an account's device opens nothing ──
  {
    const origin = await vi.serve();
    const deployed = async (o, pathAndQuery, after) => {
      const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
      await ctx.route(/supabase-js|supabase\.co|googleapis|gstatic|cloudflare|jsdelivr|unpkg/, (r) => r.abort());
      await ctx.route('http://app.vault-it.example/**', async (r) => { const u = new URL(r.request().url()); const resp = await ctx.request.get(origin + u.pathname + u.search); await r.fulfill({ response: resp }); });
      const q = await ctx.newPage(); q.on('pageerror', (e) => errs.push(e.message));
      await q.addInitScript(MOCK(o));
      await q.addInitScript((x) => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');   // once: later loads keep what the page did
        localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_tester_note', '1'); localStorage.setItem('vi_last_email', 't@t.com');
        if (x.session) localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
        if (x.user) localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', goal: '2', logins: 3 }));
        Object.keys(x.figs).forEach((k) => localStorage.setItem(k, JSON.stringify(x.figs[k])));
        (x.extra || []).forEach((kv) => localStorage.setItem(kv[0], kv[1])); }, Object.assign({ figs: FIGS }, o.dev));
      try { await q.goto('http://app.vault-it.example/index.html' + (pathAndQuery || '')); } catch (e) { if (!/interrupted|ERR_ABORTED/.test(e.message)) throw e; }
      await q.waitForTimeout(2200);
      if (after) await after(q);
      return q;
    };
    const through = async (q) => {   // answer the questions if they are up
      if (await q.evaluate(() => getComputedStyle(document.getElementById('welcome-overlay')).display !== 'none' && getComputedStyle(document.getElementById('login-overlay')).display === 'none')) {
        try { await q.click('#w-opts .welcome-opt[data-val="2"]', { timeout: 3000 }); await q.click('#wz-s1 .welcome-cta', { timeout: 3000 }); await q.waitForTimeout(250); await q.click('#wz-s2 .wz-skip', { timeout: 3000 }); await q.waitForTimeout(250); await q.click('#w-finish', { timeout: 3000 }); } catch (e) {}
        await q.waitForTimeout(1500);
      }
    };
    const figsOf = (q) => q.evaluate((f) => { const o = {}; Object.keys(f).forEach((k) => { try { o[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { o[k] = null; } }); return o; }, FIGS);
    const appUp = (x) => !x.login && (x.nav || x.tab);   // any of the app on screen and reachable (behind the sign-in screen it is not)
    // signed out (Sign out keeps the figures, the profile and the last e-mail on the device), then the old demo link
    let q = await deployed({ prof: UNPAID, sess: null, dev: { user: true } }, '?bypass=websummit', through);
    s = await look(q);
    ok(!appUp(s) && await q.evaluate(() => localStorage.getItem('vi_demo_mode') !== 'true'), '8b signed out, then ?bypass=websummit on a device that holds an account: the sign-in screen stays, the app does not open and the device is not put on the sample (' + JSON.stringify({ login: s.login, wall: s.wall, state: s.state }) + ')');
    const fg = await figsOf(q); ok(Object.keys(FIGS).every((k) => has(fg[k], FIGS[k])), '8b and its figures are untouched');
    await q.context().close();
    // ?reset first (it drops the profile and the session, not the figures or the last e-mail), then the demo link
    q = await deployed({ prof: UNPAID, sess: null, dev: { user: true, session: true } }, '?reset', async (x) => { try { await x.goto('http://app.vault-it.example/index.html?bypass=websummit'); } catch (e) {} await x.waitForTimeout(2200); await through(x); });
    s = await look(q);
    ok(!appUp(s) && await q.evaluate(() => localStorage.getItem('vi_demo_mode') !== 'true'), '8b ?reset then ?bypass=websummit: still no way in (' + JSON.stringify({ login: s.login, wall: s.wall, state: s.state }) + ')');
    await q.context().close();
    // the demo flags set by hand on an account's device, no Supabase sign-in
    q = await deployed({ prof: UNPAID, sess: null, dev: { user: true, session: true, extra: [['vi_demo_mode', 'true'], ['vi_demo_variant', 'a']] } }, '', through);
    s = await look(q);
    ok(shut(s) && s.state === 'signin', '8b vi_demo_mode and vi_demo_variant set by hand on an account\'s device: shut, asks to sign in again (' + JSON.stringify({ wall: s.wall, state: s.state, nav: s.nav, tab: s.tab }) + ')');
    await q.context().close();
    // and with the sample's session forged too, the account's own profile still gives it away
    q = await deployed({ prof: UNPAID, sess: null, dev: { user: true, extra: [['vi_demo_mode', 'true'], ['vi_demo_variant', 'a'], ['vi_session', JSON.stringify({ email: 'demo@vault-it.app', expiry: Date.now() + 1e10 })]] } }, '', through);
    s = await look(q);
    ok(!appUp(s), '8b the sample\'s session forged as well: an account\'s profile or last e-mail on the device keeps it shut (' + JSON.stringify({ wall: s.wall, state: s.state, nav: s.nav, tab: s.tab }) + ')');
    await q.context().close();
    // an empty browser still gets the sample from the old link (screenshots and live demos use it)
    q = await deployed({ prof: null, sess: null, dev: { figs: {}, extra: [['vi_last_email', '']] } }, '?bypass=websummit');
    s = await look(q);
    ok(!s.wall && await q.evaluate(() => localStorage.getItem('vi_demo_mode') === 'true' && getComputedStyle(document.getElementById('login-overlay')).display === 'none'), '8b an empty browser still opens the sample from ?bypass=websummit, with no wall');
    await q.context().close();
  }

  // ── 9  the demo link: no account, no wall ──
  p = await open({ prof: null, sess: null, noSeed: true, wait: 400 }, 1100, APP + '?demo=alex');
  await p.waitForFunction(() => !/demo=alex/.test(location.search) && typeof initDemoMode === 'function', null, { timeout: 60000 }); await p.waitForTimeout(2000);
  s = await look(p);
  ok(await p.evaluate(() => localStorage.getItem('vi_demo_mode') === 'true' && getComputedStyle(document.getElementById('login-overlay')).display === 'none'), '9 vault-it.co/demo-a opens the sample with no sign-in');
  ok(open_(s), '9 and no wall: the demo is open with no account and no card (' + JSON.stringify({ wall: s.wall, nav: s.nav, tab: s.tab }) + ')');
  await p.context().close();

  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? '\nFAILURES ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
