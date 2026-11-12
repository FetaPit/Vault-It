// Subscription pop-up and Settings copy (owner, 30 and 31 Oct 2026; docs/MONETISATION_DECISION.md sections 8 and 9):
//   1. the pop-up has four columns in order: Read-only (£0 after the 30 days, no tier name), Pioneer (monthly), Pioneer (yearly, Pro,
//      the extras named), Lifetime licence (100 places, testers first); no "free tier" wording anywhere (names: owner, 4 Nov evening; monthly renamed Founder -> Pioneer, 5 Nov)
//   2. beta testers see £3.99 a month, £49.99 a year and £99 Lifetime, each with "£5.99 / £59.99 / £149 after the beta" (owner, 4 Nov);
//      without tester status the full prices stand alone
//   3. showUpgrade opens the right Stripe link: the 30-day trial links for alpha testers, full-price links otherwise, Lifetime always the capped link;
//      the account id rides along as client_reference_id and the e-mail is prefilled
//   4. Settings "Your plan" shows the three buttons with the tester prices and the yearly extras
//   5. the old prices (£4.99, £39.99, £21.99) appear nowhere in the app; phone: the columns stack, no sideways scroll, ✕ on screen
// Run: node tests/test_plans.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const fs = require('fs');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => {
  localStorage.setItem('vi-theme', o.theme); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }] }));
};
(async () => {
  const src = fs.readFileSync(require('./lib/vi').INDEX, 'utf8');
  ok(!/£4\.99|£39\.99|£21\.99/.test(src), 'the old prices (£4.99, £39.99, £21.99) are gone from the app');
  ok(!/Continue on free tier|Always free\. Core tools forever|free lifetime/i.test(src), 'no free-tier or free-lifetime promise is left in the app');
  const links = src.match(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g) || [];
  ok(new Set(links).size === 8, 'eight distinct Stripe links in the app (trial, checkout and full for Pioneer monthly and for Pioneer yearly; Lifetime £99 and £149) (' + new Set(links).size + ')');

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
  ok(m.visible && m.names.join('|') === 'Read-only|Pioneer|Pioneer|Lifetime licence', 'four columns: Read-only, Pioneer (monthly), Pioneer (yearly), Lifetime licence (' + m.names.join('|') + ')');
  ok(/^£0$/.test(m.prices[0]) && /Read-only/.test(m.notes[0]) && /After your 30 days/.test(m.eyebrows[0]) && /Adding and editing/.test(m.vaulterFeat), 'read-only column: £0, after the 30 days, adding and editing crossed off');
  ok(/^£3\.99/.test(m.monthlyHtml) && /£5\.99 after the beta/.test(m.monthlyHtml) && !/<s>/.test(m.monthlyHtml), 'Pioneer monthly shows £3.99 for beta testers and "£5.99 after the beta", nothing struck through');
  ok(/^£49\.99/.test(m.annualHtml) && /£59\.99 after the beta/.test(m.annualHtml) && !/<s>/.test(m.annualHtml), 'Pioneer shows £49.99 for beta testers and "£59.99 after the beta"');
  ok(/Early access/.test(m.yearlyExtras) && /Roadmap voting/.test(m.yearlyExtras) && /Everything in the monthly plan/.test(m.yearlyExtras) && !/Founder/.test(m.yearlyExtras) && /Family mode \(coming soon\)/.test(m.yearlyExtras), 'Pioneer names its extras (early access, roadmap voting, family mode coming soon)');
  const monthlyFeat = await p.evaluate(() => document.querySelectorAll('#pro-offer-modal .vi-tier-table > .vi-tier-col')[1].querySelector('.vi-tier-features').textContent);
  ok(/own 3D house design/.test(monthlyFeat) && /AI house model/.test(monthlyFeat) && /All six house types/.test(monthlyFeat), 'monthly includes the design tools and all six house types (decision 10)');
  ok(/^£99 once£149 after the beta$/.test(m.prices[3]) && /100 places/.test(m.eyebrows[3]) && /testers first/.test(m.eyebrows[3]) && /life of the service/.test(m.notes[3]), 'Lifetime licence: £99 once for testers, £149 after the beta, 100 places, testers first, for the life of the service (' + m.prices[3] + ')');
  ok(m.ctas[1] === 'Start 30 days free' && m.ctas[2] === 'Start 30 days free' && m.ctas[3] === 'Take a place' && /No card, no cost/.test(m.ctas[0]), 'buttons for alpha testers: Start 30 days free (Pioneer monthly and yearly), Take a place; read-only needs no card (' + m.ctas.join(' / ') + ')');

  // ── 3. links ──
  const L = await p.evaluate(() => { window._supaUser = { id: 'uid-123', email: 't@t.com' }; showUpgrade('monthly'); showUpgrade('annual'); showUpgrade('founder'); return { opened: window.__opened, links: VI_STRIPE_LINKS }; });
  ok(L.opened[0].startsWith(L.links.monthly_trial + '?') && /prefilled_email=t%40t\.com/.test(L.opened[0]) && /client_reference_id=uid-123/.test(L.opened[0]), 'alpha Pioneer monthly opens the £3.99 trial link with the e-mail and account id (' + L.opened[0] + ')');
  ok(L.opened[1].startsWith(L.links.annual_trial + '?'), 'alpha Pioneer opens the £49.99 trial link');
  ok(L.opened[2].startsWith(L.links.founder_tester + '?') && L.links.founder_tester !== L.links.founder, 'Lifetime opens the capped £99 link');
  const set = Object.values(L.links).filter(Boolean);
  ok(set.every(u => /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/.test(u)) && new Set(set).size === 8 && L.links.annual_after_beta === 'https://buy.stripe.com/cNidR3b5s3IJ0ex2yy2VG0c', 'eight links set and distinct; the £59.99 yearly slot holds the live link (owner, 5 Nov)');
  // not a tester: full prices and links
  const F = await p.evaluate(() => { VI_BETA_OPEN = false; localStorage.removeItem('vi_beta'); window.__opened = []; viPricePaint(); showUpgrade('monthly'); showUpgrade('annual'); return { m: document.getElementById('offer-price-monthly').innerHTML, a: document.getElementById('offer-price-annual').innerHTML, opened: window.__opened, links: VI_STRIPE_LINKS }; });
  ok(!/<s>|after/.test(F.m) && /^£5\.99/.test(F.m) && !/<s>|after/.test(F.a) && /^£59\.99/.test(F.a), 'without tester status the full prices stand alone');
  ok(F.opened.length === 2 && F.opened[0].startsWith(F.links.monthly + '?') && F.opened[1].startsWith(F.links.annual_after_beta + '?') && F.links.annual_after_beta !== F.links.annual, 'and the full-price links open: £5.99 monthly, £59.99 yearly (' + F.opened.join(' | ') + ')');

  // ── 4. Settings ──
  const S = await p.evaluate(() => { VI_BETA_OPEN = true; _refreshPioneerSettingsUI(); return { m: document.getElementById('set-plan-monthly').textContent, a: document.getElementById('set-plan-annual').textContent, f: document.getElementById('set-plan-founder').textContent, extras: document.getElementById('set-plan-extras').textContent, txt: document.getElementById('set-pioneer-inactive').textContent, badge: document.getElementById('set-pioneer-badge').textContent }; });
  ok(S.m === 'Pioneer£3.99/mo£5.99 after the beta' && S.a === 'Pioneer£49.99/yr£59.99 after the beta' && S.f === 'Lifetime licence£99 once£149 after the beta', 'Settings buttons carry the tester prices (' + S.m + ' / ' + S.a + ' / ' + S.f + ')');
  ok(/own 3D house design/.test(S.extras) && /early access/.test(S.extras) && /six preset houses/.test(S.extras) && /Lifetime licence \(one payment, 100 places, beta testers first\)/.test(S.extras) && /family mode \(coming soon\)/.test(S.extras), 'Settings names the design tools, the Pioneer extras and the Lifetime terms');
  ok(/TRIAL/.test(S.badge) && /Pioneer at £3\.99 a month while in beta, £5\.99 after/.test(S.txt) && !/Founder/.test(S.txt + S.extras), 'Settings status line uses the tester price (' + S.badge + ')');
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
