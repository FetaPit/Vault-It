// Trial then paid (owner, 31 Oct 2026; docs/MONETISATION_DECISION.md 7 and 8): 30 days of the full app, then a read-only vault until a
// plan is picked. Checks, in Night at 1100 px and Daylight at 390 px:
//   1. fresh device: day 1 of 30, editing allowed, the week-one nudge names the next core task, dismiss keeps it away for the day
//   2. day 25: the countdown line says 6 days left; "See plans" opens the prompt with trial wording, no free column, Founding first
//   3. day 31: read-only. Every add / edit / delete handler returns before touching data (sampled), the prompt opens, numbers still
//      show, every tab still opens, Settings says READ-ONLY, the prompt shows on open once a day
//   4. paid (vi_pioneer): no line, no prompt, Settings says ACTIVE
//   5. the trial anchor key is local only (not synced), the phone line fits above the tab bar, no sideways scroll, no page errors
// The clock never starts before VI_TRIAL_EPOCH; the test moves the epoch to 0 so a past anchor means a past start.
// Run: node tests/test_trial.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const DAY = 86400000;
const seed = (o) => {
  localStorage.setItem('vi-theme', o.theme); localStorage.setItem('vi-flag-house', '0'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', joined: new Date(Date.now() - 40 * 86400000).toISOString(), logins: 3 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }] }));
  if (!o.nodebt) localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 1, name: 'Card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }] }));
  if (o.t0) localStorage.setItem('vi_trial_t0', String(o.t0));
  if (o.paid) localStorage.setItem('vi_pioneer', 'true');
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (o) => {
    const mob = o.w < 700;
    const ctx = await b.newContext({ viewport: { width: o.w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, colorScheme: o.theme === 'dark' ? 'dark' : 'light' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(o.w + ' ' + o.theme + ': ' + e.message));
    await p.addInitScript(seed, o); await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner{display:none!important}' });
    await p.evaluate(() => { VI_TRIAL_EPOCH = 0; document.getElementById('pro-offer-modal').classList.add('hidden'); localStorage.removeItem('vi_trial_prompt'); viTrialRefresh(); }); await p.waitForTimeout(300);
    return p;
  };
  const banner = () => { const bn = document.getElementById('trial-banner'); if (!bn) return null; const r = bn.getBoundingClientRect(); return { txt: bn.textContent, kind: bn.dataset.kind, cls: bn.className, bottom: Math.round(r.bottom), inner: innerHeight, btn: (bn.querySelector('.btn-add-data') || {}).textContent }; };
  const modal = () => { const m = document.getElementById('pro-offer-modal'); const cols = [...m.querySelectorAll('.vi-tier-table > .vi-tier-col')]; return { open: !m.classList.contains('hidden'), badge: document.getElementById('offer-badge').textContent, head: document.getElementById('offer-headline').textContent, ghost: document.getElementById('offer-ghost').textContent, freeHidden: getComputedStyle(cols[0]).display === 'none', founderFirst: getComputedStyle(m.querySelector('.vi-tier-founder')).order === '-1', gate: getComputedStyle(document.getElementById('offer-task-gate')).display === 'none' }; };

  // ── 1. fresh device, day 1 ──
  let p = await open({ w: 1100, theme: 'dark', nodebt: true });   // one core task left undone (no debt yet), so the nudge has something to say
  let s = await p.evaluate(() => ({ st: viTrialState(), day: viTrialDay(), left: viTrialDaysLeft(), can: viCanEdit(), t0: +localStorage.getItem('vi_trial_t0'), synced: _VAULT_KEYS.indexOf('vi_trial_t0') >= 0, block: viBlockEdit() }));
  ok(s.st === 'trial' && s.day === 1 && s.left === 30 && s.can && !s.block, 'fresh device: day 1 of 30, editing allowed (' + s.st + ', day ' + s.day + ', ' + s.left + ' left)');
  ok(s.t0 > Date.now() - 60000 && !s.synced, 'the trial anchor is written on first run and is not a synced vault key');
  let bn = await p.evaluate(banner);
  const nextTask = await p.evaluate(() => { const t = getCoreTaskStatus().filter(x => !x.done)[0]; return t && { label: t.label.charAt(0).toLowerCase() + t.label.slice(1), tabEl: !!document.getElementById('tab-' + t.tab) }; });
  ok(bn && bn.kind === 'd1' && /Day 1 of your free 30/.test(bn.txt) && nextTask && bn.txt.indexOf('next: ' + nextTask.label) > 0 && nextTask.tabEl && bn.btn === 'Do it', 'day 1: the nudge names the next core task (' + (bn && bn.txt) + ')');
  await p.evaluate(() => viTrialDismiss()); await p.evaluate(() => viTrialBanner()); await p.waitForTimeout(200);
  ok((await p.evaluate(banner)) === null, 'dismissed: the nudge stays away for the day');
  const n0 = await p.evaluate(() => { const n = ovState.income.length; delIncome(1); return { before: n, after: ovState.income.length }; });
  ok(n0.after === n0.before - 1, 'in the trial a delete goes through (' + n0.before + ' -> ' + n0.after + ')');
  await p.context().close();

  // ── 2. day 25: countdown and the plans prompt ──
  p = await open({ w: 1100, theme: 'dark', t0: Date.now() - 24 * DAY });
  s = await p.evaluate(() => ({ st: viTrialState(), day: viTrialDay(), left: viTrialDaysLeft() }));
  bn = await p.evaluate(banner);
  ok(s.st === 'trial' && s.day === 25 && s.left === 6 && bn && bn.kind === 'd25' && /6 days left of your free 30/.test(bn.txt) && /trial-warn/.test(bn.cls) && bn.btn === 'See plans', 'day 25: the countdown line says 6 days left (' + (bn && bn.txt) + ')');
  await p.evaluate(() => document.querySelector('#trial-banner .btn-add-data').click()); await p.waitForTimeout(300);
  let m = await p.evaluate(modal);
  ok(m.open && m.badge === '6 DAYS LEFT' && /before your 30 days end/.test(m.head) && m.ghost === 'Not now' && m.freeHidden && m.founderFirst && m.gate, 'See plans opens the prompt: trial wording, no free column, Founding Member first, no task gate (' + JSON.stringify(m) + ')');
  await p.keyboard.press('Escape'); ok(await p.evaluate(() => document.getElementById('pro-offer-modal').classList.contains('hidden')), 'Esc closes it');
  await p.context().close();

  // ── 3. day 31: read-only ──
  p = await open({ w: 1100, theme: 'dark', t0: Date.now() - 30.5 * DAY });
  s = await p.evaluate(() => ({ st: viTrialState(), left: viTrialDaysLeft(), can: viCanEdit() }));
  ok(s.st === 'ended' && s.left === 0 && !s.can, 'day 31: the trial has ended and editing is off');
  const r = await p.evaluate(() => {
    const inc = ovState.income.length, exp = ovState.expenses.length, debts = debtState.debts.length;
    delIncome(1); delExpense(3); deleteDebt(1);
    const m = document.getElementById('pro-offer-modal');
    return { inc: ovState.income.length === inc, exp: ovState.expenses.length === exp, debts: debtState.debts.length === debts, prompt: !m.classList.contains('hidden'), badge: document.getElementById('offer-badge').textContent, ghost: document.getElementById('offer-ghost').textContent, kpi: document.getElementById('kpi-nw').textContent.trim() };
  });
  ok(r.inc && r.exp && r.debts, 'a delete on income, expenses and debts changes nothing');
  ok(r.prompt && r.badge === 'YOUR 30 DAYS ARE UP' && r.ghost === 'Keep reading only', 'the blocked edit opens the prompt with the read-only wording (' + r.badge + ' / ' + r.ghost + ')');
  ok(r.kpi.length > 0 && r.kpi !== '£0', 'the numbers still show (net worth ' + r.kpi + ')');
  const tabs = await p.evaluate(() => { document.getElementById('pro-offer-modal').classList.add('hidden'); return ['budget', 'house', 'assets', 'debt', 'achievements', 'overview'].map(t => { showTab(t); return document.getElementById('tab-' + t).classList.contains('active'); }); });
  ok(tabs.every(Boolean), 'every tab still opens');
  bn = await p.evaluate(banner);
  ok(bn && bn.kind === 'ended' && /read-only until you pick a plan/.test(bn.txt), 'the foot line says the vault is read-only (' + (bn && bn.txt) + ')');
  const st = await p.evaluate(() => { _refreshPioneerSettingsUI(); return { badge: document.getElementById('set-pioneer-badge').textContent, txt: document.getElementById('set-pioneer-inactive').textContent }; });
  ok(/READ-ONLY/.test(st.badge) && /30 days are up/.test(st.txt) && /£5\.99 a month or £49\.99 a year/.test(st.txt) && /£149 once/.test(st.txt), 'Settings says READ-ONLY with the prices (' + st.badge + ')');
  const once = await p.evaluate(async () => { localStorage.removeItem('vi_trial_prompt'); initProOffer(); await new Promise(r => setTimeout(r, 1800)); const m = document.getElementById('pro-offer-modal'); const first = !m.classList.contains('hidden'); m.classList.add('hidden'); initProOffer(); await new Promise(r => setTimeout(r, 1800)); return { first, second: !m.classList.contains('hidden'), stamp: localStorage.getItem('vi_trial_prompt') === new Date().toDateString() }; });
  ok(once.first && !once.second && once.stamp, 'on open the prompt shows once a day');
  await p.context().close();

  // ── 4. paid ──
  p = await open({ w: 1100, theme: 'dark', t0: Date.now() - 40 * DAY, paid: true });
  s = await p.evaluate(async () => { localStorage.removeItem('vi_trial_prompt'); initProOffer(); await new Promise(r => setTimeout(r, 1800)); _refreshPioneerSettingsUI(); return { st: viTrialState(), can: viCanEdit(), bn: !!document.getElementById('trial-banner'), prompt: !document.getElementById('pro-offer-modal').classList.contains('hidden'), badge: document.getElementById('set-pioneer-badge').textContent }; });
  ok(s.st === 'paid' && s.can && !s.bn && !s.prompt && /ACTIVE/.test(s.badge), 'paid: no line, no prompt, editing on, Settings ACTIVE');
  await p.context().close();

  // ── 5. phone, Daylight, read-only line ──
  p = await open({ w: 390, theme: 'light', t0: Date.now() - 31 * DAY });
  bn = await p.evaluate(banner);
  const fit = await p.evaluate(() => { const bar = document.getElementById('vi-tabs').getBoundingClientRect(), bn = document.getElementById('trial-banner').getBoundingClientRect(); return { above: bn.bottom <= bar.top + 1, sx: document.documentElement.scrollWidth - innerWidth, fca: !!document.querySelector('.vi-fca') }; });
  ok(bn && bn.kind === 'ended' && fit.above && fit.sx <= 1, 'phone, Daylight: the line sits above the tab bar, no sideways scroll (bottom ' + bn.bottom + ')');
  await p.context().close();

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
