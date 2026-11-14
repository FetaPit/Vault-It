// Screenshots of the card wall for review (not a test): Night and Daylight at 390 and 1100 px, the plans screen in full and
// the five other states. Writes shots/qc/card-wall_<state>_<theme>_<width>.png (git-ignored) and prints page errors and
// sideways scroll per shot. Run: node tests/card_wall_shots.js [states, comma separated: plans,checking,offline,signin,paying,late]
const vi = require('./lib/vi'); vi.planStub(null);
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const UNPAID = { is_pioneer: false, is_founder: false, plan: null, paid_until: null, is_beta: false, stripe_synced_at: null };
const MOCK = (mode, sess) => `
  window.__mode = ${JSON.stringify(mode)}; window.__sess = ${JSON.stringify(sess)};
  const answer = (t, cols) => { if (t === 'profiles' && cols !== 'stripe_synced_at') { if (window.__mode === 'hang') return new Promise(() => {}); if (window.__mode === 'net') return { data: null, error: { message: 'Failed to fetch' } }; return { data: ${JSON.stringify(UNPAID)}, error: null }; } return { data: [], error: null }; };
  const qb = (t) => { const q = { cols: '', select(c) { this.cols = c || ''; return this; }, eq() { return this; }, limit() { return this; }, order() { return this; }, single() { return this; }, maybeSingle() { return this; }, upsert() { return Promise.resolve({ error: null }); }, delete() { return this; }, then(res, rej) { return Promise.resolve(answer(t, this.cols)).then(res, rej); } }; return q; };
  Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => ({ auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getSession: async () => ({ data: { session: window.__sess } }), signOut: async () => ({}), refreshSession: async () => ({ data: { session: window.__sess } }) }, functions: { invoke: async () => ({ data: null, error: { message: 'n/a' } }) }, rpc: async () => ({ data: [], error: null }), from: qb }) }; }, set() {} });`;
const STATES = { plans: ['ok', true], checking: ['hang', true], offline: ['net', true], signin: ['ok', false], paying: ['ok', true, 0], late: ['ok', true, 61000] };   // [profile read, signed in, age of the Stripe return in ms]
(async () => {
  const want = (process.argv[2] || 'plans,checking,offline,signin,paying,late').split(',');
  const out = path.join(vi.REPO, 'shots', 'qc'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); let bad = 0;
  for (const st of want) for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
    await ctx.route(/supabase-js|supabase\.co/, (r) => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(MOCK(STATES[st][0], STATES[st][1] ? { user: { id: '11111111-1111-4111-8111-111111111111', email: 'tester@example.com' } } : null));
    await p.addInitScript((t) => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_tester_note', '1');
      localStorage.setItem('vi_session', JSON.stringify({ email: 'tester@example.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_last_email', 'tester@example.com');
      localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 'tester@example.com', goal: '2' })); }, theme);
    if (STATES[st][2] !== undefined) await p.addInitScript((age) => { localStorage.setItem('vi_pay_pending', JSON.stringify({ plan: 'monthly', t: Date.now() - age })); }, STATES[st][2]);
    await p.goto(vi.FILE_URL); await p.waitForTimeout(st === 'signin' ? 2600 : 1800);
    const info = await p.evaluate(() => ({ state: document.getElementById('plan-wall').getAttribute('data-state'), walled: document.documentElement.classList.contains('vi-walled'), sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
    const file = path.join(out, `card-wall_${st}_${theme}_${w}.png`);
    const tall = await p.evaluate(() => document.getElementById('plan-wall').scrollHeight);   // the wall scrolls inside itself: grow the window to its full height for the picture
    await p.setViewportSize({ width: w, height: Math.max(tall, phone ? 844 : 900) }); await p.waitForTimeout(150);
    await p.locator('#plan-wall').screenshot({ path: file });
    if (errs.length || info.sideways || info.state !== st || !info.walled) bad++;
    console.log(`${path.relative(vi.REPO, file)}  state=${info.state}  errors=${errs.length}${errs.length ? ' (' + errs[0].slice(0, 100) + ')' : ''}  sideways=${info.sideways ? 'YES' : 'no'}`);
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `PROBLEMS in ${bad} shot(s)` : 'shots ok'); process.exit(bad ? 1 : 0);
})();
