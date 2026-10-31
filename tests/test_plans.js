// Subscription pop-up and Settings copy (owner, 30 and 31 Oct 2026; docs/MONETISATION_DECISION.md sections 8 and 9):
//   1. the pop-up has four columns in order: Vaulter (£0, read-only after the 30 days), Pioneer monthly, Pioneer yearly (the
//      yearly extras named), Founding Member (£149 once, 100 places, testers first); no "free tier" wording anywhere
//   2. beta testers see the discount: £5.99 struck through, £3.99 (£2 off); £49.99 struck through, £21.99 (£28 off); without tester
//      status the full prices stand alone
//   3. showUpgrade opens the right Stripe link: tester links for testers, full-price links otherwise, Founding always the capped link;
//      the account id rides along as client_reference_id and the e-mail is prefilled
//   4. Settings "Your plan" shows the three buttons with the tester prices and the yearly extras
//   5. the old prices (£4.99, £39.99, £59.99) appear nowhere in the app; phone: the columns stack, no sideways scroll, ✕ on screen
// Run: node tests/test_plans.js
const { chromium } = require('playwright');
const fs = require('fs');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => {
  localStorage.setItem('vi-theme', o.theme); localStorage.setItem('vi-flag-house', '0'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }] }));
};
(async () => {
  const src = fs.readFileSync('/home/user/Vault-It/index.html', 'utf8');
  ok(!/£4\.99|£39\.99|£59\.99/.test(src), 'the old prices (£4.99, £39.99, £59.99) are gone from the app');
  ok(!/Continue on free tier|Always free\. Core tools forever|free lifetime/i.test(src), 'no free-tier or free-lifetime promise is left in the app');
  const links = src.match(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g) || [];
  ok(new Set(links).size === 5, 'five distinct Stripe links in the app (' + new Set(links).size + ')');

  const b = await chromium.launch(); const errs = [];
  const open = async (o) => {
    const mob = o.w < 700;
    const ctx = await b.newContext({ viewport: { width: o.w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob, colorScheme: o.theme === 'dark' ? 'dark' : 'light' });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(o.w + ' ' + o.theme + ': ' + e.message));
    await p.addInitScript(seed, o); await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    await p.evaluate(() => { window.__opened = []; window.open = function (u) { window.__opened.push(u); return null; }; });
    return p;
  };

  // ── 1 + 2. the pop-up, tester view ──
  let p = await open({ w: 1100, theme: 'dark' });
  await p.evaluate(() => viShowTrialEnd('banner')); await p.waitForTimeout(300);
  let m = await p.evaluate(() => {
    const cols = [...document.querySelectorAll('#pro-offer-modal .vi-tier-table > .vi-tier-col')];
    const txt = (c, sel) => (c.querySelector(sel) || {}).textContent || '';
    return { names: cols.map(c => txt(c, '.vi-tier-name')), prices: cols.map(c => txt(c, '.vi-tier-price')), notes: cols.map(c => txt(c, '.vi-tier-saving')), eyebrows: cols.map(c => txt(c, '.vi-tier-popular')),
      monthlyHtml: document.getElementById('offer-price-monthly').innerHTML, annualHtml: document.getElementById('offer-price-annual').innerHTML,
      yearlyExtras: txt(cols[2], '.vi-tier-features'), founderFeat: txt(cols[3], '.vi-tier-features'), vaulterFeat: txt(cols[0], '.vi-tier-features'),
      ctas: cols.map(c => txt(c, '.vi-tier-cta')), ghost: document.getElementById('offer-ghost').textContent, visible: !document.getElementById('pro-offer-modal').classList.contains('hidden') };
  });
  ok(m.visible && m.names.join('|') === 'Vaulter|Monthly|Yearly|Founding Member', 'four columns: Vaulter, Monthly, Yearly, Founding Member');
  ok(/^£0$/.test(m.prices[0]) && /Read-only/.test(m.notes[0]) && /After your 30 days/.test(m.eyebrows[0]) && /Adding and editing/.test(m.vaulterFeat), 'Vaulter: £0, after the 30 days, read-only, adding and editing crossed off');
  ok(/<s>£5\.99<\/s>£3\.99/.test(m.monthlyHtml) && /£2 off/.test(m.monthlyHtml), 'monthly shows £5.99 struck through and £3.99 for beta testers (£2 off)');
  ok(/<s>£49\.99<\/s>£21\.99/.test(m.annualHtml) && /£28 off/.test(m.annualHtml), 'yearly shows £49.99 struck through and £21.99 for beta testers (£28 off)');
  ok(/own 3D house design/.test(m.yearlyExtras) && /AI house model/.test(m.yearlyExtras) && /Early access and roadmap voting/.test(m.yearlyExtras) && /Extra house types/.test(m.yearlyExtras), 'yearly names its extras');
  ok(/£149/.test(m.prices[3]) && /once/.test(m.prices[3]) && /100 places/.test(m.eyebrows[3]) && /testers first/.test(m.eyebrows[3]) && /life of the service/.test(m.notes[3]), 'Founding Member: £149 once, 100 places, testers first, for the life of the service');
  ok(m.ctas[1] === 'Go monthly' && m.ctas[2] === 'Go yearly' && m.ctas[3] === 'Take a place' && /No card, no cost/.test(m.ctas[0]), 'buttons: Go monthly, Go yearly, Take a place; Vaulter needs no card');

  // ── 3. links ──
  const L = await p.evaluate(() => { window._supaUser = { id: 'uid-123', email: 't@t.com' }; showUpgrade('monthly'); showUpgrade('annual'); showUpgrade('founder'); return { opened: window.__opened, links: VI_STRIPE_LINKS }; });
  ok(L.opened[0].startsWith(L.links.monthly_tester + '?') && /prefilled_email=t%40t\.com/.test(L.opened[0]) && /client_reference_id=uid-123/.test(L.opened[0]), 'tester monthly opens the £3.99 link with the e-mail and account id (' + L.opened[0] + ')');
  ok(L.opened[1].startsWith(L.links.annual_tester + '?'), 'tester yearly opens the £21.99 link');
  ok(L.opened[2].startsWith(L.links.founder + '?'), 'Founding opens the capped £149 link');
  ok(Object.values(L.links).every(u => /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/.test(u)) && new Set(Object.values(L.links)).size === 5, 'all five links are set and distinct');
  // not a tester: full prices and links
  const F = await p.evaluate(() => { VI_BETA_OPEN = false; localStorage.removeItem('vi_beta'); window.__opened = []; viPricePaint(); showUpgrade('monthly'); showUpgrade('annual'); return { m: document.getElementById('offer-price-monthly').innerHTML, a: document.getElementById('offer-price-annual').innerHTML, opened: window.__opened, links: VI_STRIPE_LINKS }; });
  ok(!/<s>/.test(F.m) && /^£5\.99/.test(F.m) && !/<s>/.test(F.a) && /^£49\.99/.test(F.a), 'without tester status the full prices stand alone');
  ok(F.opened[0].startsWith(F.links.monthly + '?') && F.opened[1].startsWith(F.links.annual + '?'), 'and the full-price links open');

  // ── 4. Settings ──
  const S = await p.evaluate(() => { VI_BETA_OPEN = true; _refreshPioneerSettingsUI(); return { m: document.getElementById('set-plan-monthly').textContent, a: document.getElementById('set-plan-annual').textContent, f: document.getElementById('set-plan-founder').textContent, extras: document.getElementById('set-plan-extras').textContent, txt: document.getElementById('set-pioneer-inactive').textContent, badge: document.getElementById('set-pioneer-badge').textContent }; });
  ok(S.m === 'Monthly £3.99 (was £5.99)' && S.a === 'Yearly £21.99 (was £49.99)' && S.f === 'Founding £149', 'Settings buttons carry the tester prices (' + S.m + ' / ' + S.a + ' / ' + S.f + ')');
  ok(/own 3D house design/.test(S.extras) && /Founding Member \(£149 once, 100 places, beta testers first\)/.test(S.extras), 'Settings names the yearly extras and the Founding terms');
  ok(/TRIAL/.test(S.badge) && /beta tester price, £2 off/.test(S.txt), 'Settings status line uses the tester price (' + S.badge + ')');
  await p.context().close();

  // ── 5. phone, Daylight ──
  p = await open({ w: 390, theme: 'light' });
  await p.evaluate(() => viShowTrialEnd('banner')); await p.waitForTimeout(400);
  const ph = await p.evaluate(() => { const cols = [...document.querySelectorAll('#pro-offer-modal .vi-tier-table > .vi-tier-col')].map(c => c.getBoundingClientRect()); const x = document.querySelector('#pro-offer-modal .vi-modal-close').getBoundingClientRect(); return { stacked: cols.every((r, i) => i === 0 || r.top >= cols[i - 1].bottom - 1), sx: document.documentElement.scrollWidth - innerWidth, close: x.top >= 0 && x.bottom <= innerHeight, w: cols[0].width }; });
  ok(ph.stacked && ph.sx <= 1 && ph.close, 'phone: the four columns stack, no sideways scroll, ✕ on screen');
  await p.context().close();

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
