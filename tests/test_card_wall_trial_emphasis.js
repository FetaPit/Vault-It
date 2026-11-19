// The plans page makes the free trial obvious (owner, 19 Nov 2026: "highlight the 30-day free trial in the paragraph in gold ...
// for the yearly plans, have the tab button as gold with a gold border ... the monthly plans teal ... make it more obvious that they
// aren't going to be charged immediately, and they can cancel at any time before the 30 days expires"). Night and Daylight, 390 and 1100 px:
//   1  the lead paragraph: "free for 30 days" in gold, then nothing is charged today, first charged on day 31, cancel before then
//   2  every trial card's terms line has "Free for 30 days" in gold (the sentence itself is unchanged)
//   3  Yearly tab: gold border and gold text, filled gold when chosen; Monthly tab: teal border and teal text, filled teal when chosen
//   4  no sideways scroll, no page errors
// Run: node tests/test_card_wall_trial_emphasis.js
const vi = require('./lib/vi'); vi.planStub(null);
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const UNPAID = { is_pioneer: false, is_founder: false, plan: null, paid_until: null, is_beta: false, stripe_synced_at: null };
const MOCK = (sess) => `
  window.__sess = ${JSON.stringify(sess)};
  const answer = (t, cols) => { if (t === 'profiles' && cols !== 'stripe_synced_at') return { data: ${JSON.stringify(UNPAID)}, error: null }; return { data: [], error: null }; };
  const qb = (t) => { const q = { cols: '', select(c) { this.cols = c || ''; return this; }, eq() { return this; }, limit() { return this; }, order() { return this; }, single() { return this; }, maybeSingle() { return this; }, upsert() { return Promise.resolve({ error: null }); }, delete() { return this; }, then(res, rej) { return Promise.resolve(answer(t, this.cols)).then(res, rej); } }; return q; };
  Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => ({ auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), getSession: async () => ({ data: { session: window.__sess } }), signOut: async () => ({}), refreshSession: async () => ({ data: { session: window.__sess } }) }, functions: { invoke: async () => ({ data: null, error: { message: 'n/a' } }) }, rpc: async () => ({ data: [], error: null }), from: qb }) }; }, set() {} });`;
(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const T = theme + ' ' + w + 'px: ', phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, isMobile: phone, hasTouch: phone });
    await ctx.route(/supabase-js|supabase\.co/, (r) => r.abort());
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(MOCK({ user: { id: '11111111-1111-4111-8111-111111111111', email: 'tester@example.com' } }));
    await p.addInitScript((t) => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_tester_note', '1');
      localStorage.setItem('vi_session', JSON.stringify({ email: 'tester@example.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_last_email', 'tester@example.com');
      localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 'tester@example.com', goal: '2' })); }, theme);
    await p.goto(vi.FILE_URL); await p.waitForFunction(() => document.getElementById('plan-wall') && document.getElementById('plan-wall').getAttribute('data-state') === 'plans', null, { timeout: 15000 });
    const grab = () => p.evaluate(() => {
      const col = (v) => { const e = document.createElement('i'); e.style.color = 'var(' + v + ')'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; };
      const lead = document.getElementById('wall-lead'), hot = lead.querySelector('.vi-trial');
      const terms = [].map.call(document.querySelectorAll('#plan-wall .wall-plan-terms[data-plan-terms]'), (t) => { const h = t.querySelector('.vi-trial'); return { key: t.getAttribute('data-plan-terms'), text: t.textContent, hot: h ? h.textContent : '', col: h ? getComputedStyle(h).color : '' }; });
      const tab = (k) => { const e = document.querySelector('.wall-bill-btn[data-bill="' + k + '"]'), s = getComputedStyle(e); return { pressed: e.getAttribute('aria-pressed'), border: s.borderTopColor, bw: s.borderTopWidth, color: s.color, bg: s.backgroundColor }; };
      return { gold: col('--gold'), teal: col('--teal'), ongold: col('--on-gold'), ontealc: col('--on-teal'), lead: lead.textContent.replace(/\s+/g, ' ').trim(), hot: hot ? hot.textContent : '', hotCol: hot ? getComputedStyle(hot).color : '', terms, year: tab('year'), month: tab('month'), sideways: document.documentElement.scrollWidth > innerWidth };
    });
    const A = await grab();
    ok(A.hot === 'free for 30 days' && A.hotCol === A.gold, T + '1 the lead paragraph has "free for 30 days" in gold (' + A.hot + ' / ' + A.hotCol + ')');
    ok(/not charged today/i.test(A.lead) && /first charged on day 31/.test(A.lead) && /Cancel (any time )?before then and you pay nothing/i.test(A.lead), T + '1 and says nothing is charged today, first charge on day 31, cancel before then and pay nothing (' + A.lead.slice(0, 120) + ')');
    const tr = A.terms.filter((t) => /^Free for 30 days, then/.test(t.text));
    ok(tr.length >= 2 && tr.every((t) => t.hot === 'Free for 30 days' && t.col === A.gold), T + '2 every trial card has "Free for 30 days" in gold in its terms (' + tr.length + ' cards)');
    ok(A.year.pressed === 'true' && A.year.border === A.gold && parseFloat(A.year.bw) >= 1 && A.year.bg === A.gold, T + '3 Yearly (chosen): gold border, filled gold (' + A.year.border + ' / ' + A.year.bg + ')');
    ok(A.month.pressed === 'false' && A.month.border === A.teal && A.month.color === A.teal && parseFloat(A.month.bw) >= 1, T + '3 Monthly (not chosen): teal border and teal text (' + A.month.border + ' / ' + A.month.color + ')');
    await p.click('.wall-bill-btn[data-bill="month"]'); await p.waitForTimeout(200);
    const B = await grab();
    ok(B.month.pressed === 'true' && B.month.border === B.teal && B.month.bg === B.teal, T + '3 Monthly (chosen): teal border, filled teal');
    ok(B.year.pressed === 'false' && B.year.border === B.gold && B.year.color === B.gold, T + '3 Yearly (not chosen): gold border and gold text (' + B.year.border + ' / ' + B.year.color + ')');
    ok(B.hot === 'free for 30 days' && B.terms.filter((t) => /^Free for 30 days, then/.test(t.text)).every((t) => t.col === B.gold), T + '2 the gold stays when the monthly cards show');
    ok(!A.sideways && !B.sideways && errs.length === 0, T + '4 no sideways scroll, no page errors' + (errs.length ? ' (' + errs[0].slice(0, 90) + ')' : ''));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
