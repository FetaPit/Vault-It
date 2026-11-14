// Plan cards, part B1 (owner, 13 Nov 2026: "Go with plan cards"; Pro features "Gate, testers keep"): the app side of migration 015.
//   1. the profile's tier, billing and pro_kept are mirrored on the device (viPaidApply), up and down, and an older server (no such columns) is read with the old columns
//   2. viTierId / viBilling / viPro: Pioneer and Lifetime have Pro, a Vaulter has it only with pro_kept (the testers keep), no plan has none, and a server that cannot say
//      which tier an account is on takes nothing away
//   3. the Pro features follow viPro: the own-design upload and the AI house model (viCan), and the Entrepreneur tab (gate + nothing under it)
//   4. the config: five plans, the seven new Payment Links, the beta prices and links while the beta is open, the after-beta ones when it has closed (by the clock),
//      the trial on every link that takes a card, savings only where true (16 / 30 beta, 30 / 33 after), yearly shown as a monthly figure
//   5. the return address accepts the four new plan values
// Run: node tests/test_plan_tiers.js
require('./lib/vi');
const { chromium } = require('playwright');
const fs = require('fs');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = () => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_tester_note', '1');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 }));
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(seed); await p.goto(APP); await p.waitForTimeout(1500);
  const apply = (row) => p.evaluate((r) => { viPaidApply(Object.assign({ is_pioneer: false, is_founder: false, plan: null, is_beta: false }, r)); return { paid: viPaid(), tier: viTierId(), billing: viBilling(), pro: viPro(), kept: localStorage.getItem('vi_pro_kept'), vt: localStorage.getItem('vi_tier'), vb: localStorage.getItem('vi_billing'), design: viCan('design'), ai: viCan('aimodel') }; }, row);

  // ── 1 and 2. the mirror and the Pro check ──
  let s = await apply({ is_pioneer: true, plan: 'monthly', tier: 'vaulter', billing: 'month', pro_kept: false });
  ok(s.paid && s.tier === 'vaulter' && s.billing === 'month' && s.vt === 'vaulter' && s.vb === 'month' && s.kept === 'false', 'a new Vaulter is mirrored: vaulter, month, no Pro flag');
  ok(s.pro === false && s.design === false && s.ai === false, 'a new Vaulter has no Pro features (own design and AI house model are closed)');
  s = await apply({ is_pioneer: true, plan: 'monthly', tier: 'vaulter', billing: 'month', pro_kept: true });
  ok(s.pro === true && s.design === true && s.ai === true && s.kept === 'true', 'a tester on Vaulter who keeps Pro has the Pro features');
  s = await apply({ is_pioneer: true, plan: 'monthly', tier: 'vaulter', billing: 'year', pro_kept: false });
  ok(s.tier === 'vaulter' && s.billing === 'year' && s.pro === false, 'a Vaulter on the yearly plan is Vaulter (not Pioneer) and has no Pro features');
  s = await apply({ is_pioneer: true, plan: 'yearly', tier: 'pioneer', billing: 'year', pro_kept: false });
  ok(s.tier === 'pioneer' && s.billing === 'year' && s.pro === true && s.design === true, 'Pioneer yearly has the Pro features');
  s = await apply({ is_pioneer: true, plan: 'yearly', tier: 'pioneer', billing: 'month', pro_kept: false });
  ok(s.tier === 'pioneer' && s.billing === 'month' && s.pro === true, 'Pioneer monthly is Pioneer, and has the Pro features');
  s = await apply({ is_pioneer: true, is_founder: true, plan: 'founder', tier: 'founder', billing: 'once', pro_kept: false });
  ok(s.tier === 'founder' && s.billing === 'once' && s.pro === true, 'a Lifetime licence has the Pro features');
  s = await apply({ is_pioneer: false, plan: 'monthly', tier: 'vaulter', billing: 'month', pro_kept: true });
  ok(!s.paid && s.tier === 'none' && s.pro === false && s.design === false, 'an account whose plan has ended has no tier and no Pro features, whatever the flag says');
  // an older server: no tier columns come back
  s = await apply({ is_pioneer: true, plan: 'monthly' });
  ok(s.vt === null && s.vb === null && s.kept === null && s.tier === 'vaulter' && s.billing === 'month' && s.pro === true, 'a server with no tier columns: the tier is read from the old plan name and Pro stays open (nothing is taken away)');
  s = await apply({ is_pioneer: true, plan: 'yearly' });
  ok(s.tier === 'pioneer' && s.billing === 'year' && s.pro === true, 'old server, yearly plan: Pioneer, year');
  s = await apply({ is_pioneer: true, plan: null });
  ok(s.tier === 'pioneer' && s.pro === true, 'a paid account with no plan recorded still counts as Pioneer, as before');
  await apply({ is_pioneer: true, plan: 'monthly', tier: 'vaulter', billing: 'month', pro_kept: false });
  s = await apply({ is_pioneer: true, plan: 'monthly' });
  ok(s.vt === null && s.pro === true, 'the tier mirror goes down as well as up (columns absent: removed, Pro open)');

  // the profile read asks for the new columns, and repeats with the old ones on a server without them
  const cols = await p.evaluate(() => ({ now: VI_PAID_COLS, old: VI_PAID_COLS_OLD }));
  ok(/,tier,billing,pro_kept$/.test(cols.now) && cols.now.startsWith(cols.old) && !/tier/.test(cols.old), 'the profile read asks for tier, billing and pro_kept on top of the old columns');
  ok(await p.evaluate(() => VI_SERVER_KEYS.indexOf('vi_tier') > -1 && VI_SERVER_KEYS.indexOf('vi_billing') > -1 && VI_SERVER_KEYS.indexOf('vi_pro_kept') > -1), 'a synced copy of tier, billing or the Pro flag is never taken from the vault (the profile decides)');
  const fb = await p.evaluate(async () => {
    const asked = []; _supaClient = { from() { return { select(c) { asked.push(c); const old = c.indexOf('tier') > -1;
      const res = old ? { data: null, error: { code: '42703', message: 'column profiles.tier does not exist' } } : { data: { is_pioneer: true, is_founder: false, plan: 'monthly' }, error: null };
      const q = { eq() { return q; }, single() { return q; }, then(a, b2) { return Promise.resolve(res).then(a, b2); } }; return q; } }; } };
    _sjsStalled = false; _viPaidCols = VI_PAID_COLS; const r = await _viProfileRead('uid-1'); return { asked, row: r.row || null, old: !!r.old, now: _viPaidCols === VI_PAID_COLS_OLD };
  });
  ok(fb.asked.length === 2 && /tier/.test(fb.asked[0]) && !/tier/.test(fb.asked[1]) && fb.row && fb.row.plan === 'monthly' && !fb.old, 'on a server without migration 015 the read is repeated with the old columns and the account is read as before (' + fb.asked.length + ' reads)');

  // ── 3. the Entrepreneur tab ──
  await apply({ is_pioneer: true, plan: 'monthly', tier: 'vaulter', billing: 'month', pro_kept: false });
  let g = await p.evaluate(() => { viBizGate(); const gate = document.getElementById('pro-gate-biz'), tab = document.getElementById('tab-biz'); return { gate: gate.style.display, locked: tab.classList.contains('vi-biz-locked'), txt: gate.textContent, accounts: getComputedStyle(document.getElementById('biz-accounts')).display }; });
  ok(g.gate === '' && g.locked && /Part of Pioneer/.test(g.txt) && g.accounts === 'none', 'a Vaulter sees the Entrepreneur gate, "Part of Pioneer", and nothing under it');
  for (const row of [{ is_pioneer: true, plan: 'monthly', tier: 'vaulter', billing: 'month', pro_kept: true }, { is_pioneer: true, plan: 'yearly', tier: 'pioneer', billing: 'year', pro_kept: false }, { is_pioneer: true, is_founder: true, plan: 'founder', tier: 'founder', billing: 'once', pro_kept: false }, { is_pioneer: true, plan: 'monthly' }]) {
    await apply(row);
    g = await p.evaluate(() => ({ gate: document.getElementById('pro-gate-biz').style.display, locked: document.getElementById('tab-biz').classList.contains('vi-biz-locked') }));
    ok(g.gate === 'none' && !g.locked, 'the Entrepreneur tab is open for ' + (row.tier ? row.tier + (row.pro_kept ? ' with the Pro flag' : '') : 'an older server\'s ' + row.plan + ' plan'));
  }
  // Settings says which plan and billing period the account is on, from tier and billing
  for (const [row, want] of [[{ tier: 'vaulter', billing: 'year', plan: 'monthly' }, 'You are on Vaulter (yearly)'], [{ tier: 'pioneer', billing: 'month', plan: 'yearly' }, 'You are on Pioneer (monthly)'], [{ tier: 'vaulter', billing: 'month', plan: 'monthly' }, 'You are on Vaulter (monthly)'], [{ tier: 'pioneer', billing: 'year', plan: 'yearly' }, 'You are on Pioneer (yearly)']]) {
    await apply(Object.assign({ is_pioneer: true, pro_kept: false }, row));
    const ln = await p.evaluate(() => { _refreshPioneerSettingsUI(); return document.getElementById('set-plan-line').textContent; });
    ok(ln.indexOf(want + '.') === 0, 'Settings: ' + want + ' (' + ln + ')');
  }
  await apply({ is_pioneer: true, plan: 'monthly', tier: 'vaulter', billing: 'month', pro_kept: false });
  // the toast for the design tools
  await apply({ is_pioneer: true, plan: 'monthly', tier: 'vaulter', billing: 'month', pro_kept: false });
  const t = await p.evaluate(() => { const r = viGateDesign('design'); return { r, toast: document.getElementById('toast').textContent }; });
  ok(t.r === true && /part of Pioneer or a Lifetime licence/.test(t.toast) && !/needs a plan/.test(t.toast), 'the own-design upload says it is part of Pioneer or a Lifetime licence (' + t.toast + ')');

  // ── 4. the config ──
  const C = await p.evaluate(() => {
    const L = VI_STRIPE_LINKS, out = { keys: Object.keys(VI_PLANS), links: {}, now: {}, link: {}, trial: {}, save: {}, per: {} };
    VI_PLAN_KEYS.forEach((k) => { out.now[k] = viPlanPrice(k); out.link[k] = viPlanLink(k); out.trial[k] = viPlanTrial(k); out.save[k] = viPlanSave(k); out.per[k] = viPlanPerMonth(k); });
    out.L = L; out.open = VI_BETA_OPEN; out.ends = VI_BETA_ENDS_ON;
    // the beta has closed
    VI_BETA_OPEN = false; out.after = {}; out.afterLink = {}; out.afterTrial = {}; out.afterSave = {}; out.afterPer = {};
    VI_PLAN_KEYS.forEach((k) => { out.after[k] = viPlanPrice(k); out.afterLink[k] = viPlanLink(k); out.afterTrial[k] = viPlanTrial(k); out.afterSave[k] = viPlanSave(k); out.afterPer[k] = viPlanPerMonth(k); });
    VI_BETA_OPEN = true; return out;
  });
  ok(['vaulter_month', 'vaulter_year', 'pioneer_month', 'pioneer_year', 'founder'].every((k) => C.keys.indexOf(k) > -1) && C.ends === '31 December 2026', 'five plans in the config, and the beta end date is 31 December 2026');
  ok(C.open === (Date.now() < Date.parse('2027-01-01T00:00:00Z')), 'the beta is open or closed by the clock (it closes at the end of 31 December 2026)');
  ok(C.now.vaulter_month === '£3.99' && C.now.vaulter_year === '£39.99' && C.now.pioneer_month === '£5.99' && C.now.pioneer_year === '£49.99' && C.now.founder === '£99', 'beta prices: Vaulter £3.99 or £39.99, Pioneer £5.99 or £49.99, Lifetime £99 (' + JSON.stringify(C.now) + ')');
  ok(C.after.vaulter_month === '£5.99' && C.after.vaulter_year === '£49.99' && C.after.pioneer_month === '£9.99' && C.after.pioneer_year === '£79.99' && C.after.founder === '£199', 'after the beta: Vaulter £5.99 or £49.99, Pioneer £9.99 or £79.99, Lifetime £199');
  const H = (k) => 'https://buy.stripe.com/' + k;
  ok(C.link.vaulter_month === H('8x2fZbgpMdjjgdv5KK2VG08') && C.link.vaulter_year === H('aFa3cpddAa774uN5KK2VG0d') && C.link.pioneer_month === H('8x2cMZflI3IJ0ex1uu2VG0g') && C.link.pioneer_year === H('3cI14hc9w1ABe5na102VG0a') && C.link.founder === H('4gM6oB5L87YZ5yRflk2VG0b'),
    'the beta buys: Vaulter monthly …VG08, Vaulter yearly …VG0d, Pioneer monthly …VG0g, Pioneer yearly …VG0a, Lifetime …VG0b');
  ok(C.afterLink.vaulter_month === H('eVq7sF2yWdjje5n4GG2VG0f') && C.afterLink.vaulter_year === H('fZu8wJ0qOcff9P7flk2VG0e') && C.afterLink.pioneer_month === H('cNi28l4H46UV7GZa102VG0h') && C.afterLink.pioneer_year === H('cNi00da1o1AB0ex0qq2VG0i') && C.afterLink.founder === H('4gM7sF7Tg5QR8L3c982VG0j'),
    'after the beta: …VG0f, …VG0e, …VG0h, …VG0i, …VG0j (and never …VG00 for Vaulter)');
  ok(!Object.values(C.afterLink).concat(Object.values(C.link)).some((u) => /VG00$|VG0c$|VG05$/.test(u)), 'no plan uses the retired links …VG00, …VG0c or …VG05');
  ok(VI_PLAN_KEYS_OK(C), 'the trial: every plan but Lifetime takes the card now with 30 days free, in the beta and after it; Lifetime has none');
  function VI_PLAN_KEYS_OK(c) { return ['vaulter_month', 'vaulter_year', 'pioneer_month', 'pioneer_year'].every((k) => c.trial[k] && c.afterTrial[k]) && !c.trial.founder && !c.afterTrial.founder; }
  ok(C.save.vaulter_year === 16 && C.save.pioneer_year === 30 && C.afterSave.vaulter_year === 30 && C.afterSave.pioneer_year === 33 && C.save.vaulter_month === 0 && C.save.pioneer_month === 0 && C.save.founder === 0,
    'savings only where true: beta Vaulter yearly 16%, Pioneer yearly 30%; after the beta 30% and 33%; none on monthly or Lifetime (' + JSON.stringify(C.save) + ' / ' + JSON.stringify(C.afterSave) + ')');
  ok(C.per.vaulter_year === '£3.33' && C.per.pioneer_year === '£4.17' && C.afterPer.vaulter_year === '£4.17' && C.afterPer.pioneer_year === '£6.67' && C.per.vaulter_month === '', 'a yearly price as a monthly figure: £3.33, £4.17 (beta), £4.17, £6.67 (after)');
  ok(await p.evaluate(() => VI_PLANS.monthly === VI_PLANS.vaulter_month && VI_PLANS.annual === VI_PLANS.pioneer_year), 'the older keys monthly and annual still resolve (Vaulter monthly, Pioneer yearly) for the surfaces not yet moved');
  const src = fs.readFileSync(require('./lib/vi').INDEX, 'utf8');
  const links = new Set(src.match(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g) || []);
  ok(links.size === 15, 'fifteen Stripe links in config: the eight from before and the seven new (' + links.size + ')');

  // ── 5. the return address ──
  const R = await p.evaluate(() => { const seen = []; window.viPaymentReturn = (pl) => seen.push(pl);
    ['vaulter_monthly', 'vaulter_yearly', 'pioneer_monthly', 'pioneer_yearly', 'monthly', 'yearly', 'gold'].forEach((v) => { history.replaceState({}, '', '/?upgraded=1&plan=' + v); handleOAuthCallback(); });
    history.replaceState({}, '', '/?founded=1'); handleOAuthCallback(); return seen; });
  ok(JSON.stringify(R) === JSON.stringify(['vaulter_monthly', 'vaulter_yearly', 'pioneer_monthly', 'pioneer_yearly', 'monthly', 'yearly', null, 'founder']), 'the return address accepts the four new plan values and the old ones; an unknown one is dropped (' + JSON.stringify(R) + ')');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails ? '\nFAILURES ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
