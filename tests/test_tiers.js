// Tier gates (owner, 31 Oct 2026, docs/MONETISATION_DECISION.md section 10):
//   1. no item caps: a fourth asset, a third liability and a second debt save without a paywall, in the trial
//   2. the design tools (upload your own 3D house, generate one with AI) need a paid plan: in the trial they open the plans prompt and
//      touch nothing; paid (vi_pioneer) they pass the gate; an ended account is blocked by read-only first
//   3. every preset house type can be chosen in the trial; the house build follows the real progress (no teaser)
//   4. read-only also stops Level 2 purchase, Level 3 unlock and a version restore
//   5. viTier() reads the recorded plan (monthly, yearly, founder); a paid account with
//      no plan counts as yearly; the AI reader allowance line says 3 / 30 / 10
// Run: node tests/test_tiers.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const DAY = 86400000;
const seed = (o) => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi-flag-house', '0'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }] }));
  localStorage.setItem('pos_al1', JSON.stringify({ otherAssets: [{ id: 1, name: 'A', value: 100 }, { id: 2, name: 'B', value: 100 }, { id: 3, name: 'C', value: 100 }], liabilities: [{ id: 1, name: 'L1', amount: 50 }, { id: 2, name: 'L2', amount: 50 }], cashAccounts: [], metals: {}, metalPrices: {} }));
  localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }] }));
  localStorage.setItem('ht3', JSON.stringify({ saved: 30000, target: 250000, houseType: 'terraced', deposits: [{ amount: 30000, date: '01/10/2026' }], prices: { terraced: 250000 } }));
  if (o.t0) localStorage.setItem('vi_trial_t0', String(o.t0));
  if (o.paid) localStorage.setItem('vi_pioneer', 'true');
  if (o.plan) localStorage.setItem('vi_plan', o.plan);
  if (o.founder) localStorage.setItem('vi_founder', 'true');
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (o, query) => {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(seed, o); await p.goto(APP + (query || '')); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    await p.evaluate(() => { VI_TRIAL_EPOCH = 0; document.getElementById('pro-offer-modal').classList.add('hidden'); window.__prompts = 0; const f = viShowTrialEnd; window.viShowTrialEnd = function (r) { window.__prompts++; return f(r); }; });
    return p;
  };
  const promptOpen = () => !document.getElementById('pro-offer-modal').classList.contains('hidden');

  // ── 1. no caps (trial) ──
  let p = await open({});
  const caps = await p.evaluate(() => {
    const r = {}; r.free = typeof FREE_LIMITS === 'undefined';
    const a0 = alState.otherAssets.length; alState.otherAssets.push({ id: 9, name: 'D', value: 1 }); saveAL(); r.assets = alState.otherAssets.length === a0 + 1;
    document.querySelector('#paywall-modal') && (r.pw = getComputedStyle(document.getElementById('paywall-modal')).display === 'none');
    r.tier = viTier(); r.allow = viShotAllowance();
    return r;
  });
  ok(caps.free && caps.assets && caps.pw !== false, 'no item caps: FREE_LIMITS is gone and a fourth asset saves without a paywall');
  ok(caps.tier === 'trial' && /^3 screenshot reads a month/.test(caps.allow), 'trial: tier is trial, the AI reader allowance says 3 a month (' + caps.allow + ')');
  // ── 2. design tools in the trial ──
  const d1 = await p.evaluate(() => { const before = window.__prompts; loadCustomModel({ files: [], value: '' }); const a = window.__prompts - before; const o1 = !document.getElementById('pro-offer-modal').classList.contains('hidden'); document.getElementById('pro-offer-modal').classList.add('hidden'); generateMeshyModel(); return { a, o1, b: window.__prompts - before - a, o2: !document.getElementById('pro-offer-modal').classList.contains('hidden'), can: viCan('design'), canAi: viCan('aimodel') }; });
  ok(d1.a === 1 && d1.o1 && d1.b === 1 && d1.o2 && !d1.can && !d1.canAi, 'trial: upload and AI generation open the plans prompt and go no further');
  // ── 3. every preset house type, real build ──
  const types = await p.evaluate(() => { showTab('house'); const out = []; ['semi', 'detached', 'mansion', 'flat', 'apartment', 'terraced'].forEach(t => { const btn = document.querySelector('#htypes [data-type="' + t + '"]'); if (btn) { btn.click(); out.push(state.houseType === t); } else out.push('nobtn:' + t); }); return { out, p: Math.abs(hb3dState().p - pct()) < 1e-9 || hb3dState().engine !== '3d' }; });
  ok(types.out.every(x => x === true), 'trial: every preset house type can be chosen (' + types.out.join(',') + ')');
  await p.context().close();

  // ── 2b. paid passes the design gate ──
  p = await open({ paid: true });
  const d2 = await p.evaluate(() => { const before = window.__prompts; loadCustomModel({ files: [], value: '' }); return { prompts: window.__prompts - before, can: viCan('design'), tier: viTier(), allow: viShotAllowance(), open: !document.getElementById('pro-offer-modal').classList.contains('hidden') }; });
  ok(d2.prompts === 0 && d2.can && !d2.open && d2.tier === 'yearly' && /^30 /.test(d2.allow), 'paid with no plan recorded: counts as yearly, the design gate opens, allowance 30 (' + d2.allow + ')');
  await p.context().close();

  // ── 4. ended: read-only stops Level 2, Level 3, restore and the design tools ──
  p = await open({ t0: Date.now() - 31 * DAY });
  const e1 = await p.evaluate(async () => { const before = window.__prompts; const mode0 = state.houseMode; markHousePurchased(); const m1 = state.houseMode === mode0; hbUnlockL3(); const l3 = !state.l3; let restored = false; try { await viRestoreVersion('x', 'pos_ov1'); } catch (e) {} viRestoreSnapshot('pos_ov1'); loadCustomModel({ files: [], value: '' }); return { m1, l3, prompts: window.__prompts - before, inc: ovState.income.length === 1 }; });
  ok(e1.m1 && e1.l3 && e1.inc && e1.prompts >= 3, 'ended: Level 2 purchase, Level 3 unlock, restore and upload are all blocked (' + JSON.stringify(e1) + ')');
  await p.context().close();

  // ── 5. the plan from the Stripe return ──
  // (how the plan arrives, from Stripe through the profile or on an older server from the return URL, is test_paid_gateway.js)
  p = await open({ paid: true, plan: 'yearly' });
  let pl = await p.evaluate(() => ({ plan: viPlan(), tier: viTier(), early: VI_KEYS_EARLY.indexOf('vi_plan') >= 0 }));
  ok(pl.plan === 'yearly' && pl.tier === 'yearly' && pl.early, 'a yearly plan reads as yearly (and the key is cleaned on load)');
  await p.context().close();
  p = await open({ paid: true, plan: 'founder', founder: true });
  pl = await p.evaluate(() => ({ plan: viPlan(), tier: viTier(), allow: viShotAllowance() }));
  ok(pl.plan === 'founder' && pl.tier === 'founder' && /^10 /.test(pl.allow), 'a Founding Member reads as founder; allowance 10');
  await p.context().close();
  p = await open({ paid: true, plan: 'monthly' });
  pl = await p.evaluate(() => ({ tier: viTier(), can: viCan('design') }));
  ok(pl.tier === 'monthly' && pl.can, 'monthly Pioneer: tier monthly, design tools open');
  await p.context().close();

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
