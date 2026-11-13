// Plans: links, prices and Settings copy (owner, 30 and 31 Oct 2026; docs/MONETISATION_DECISION.md sections 8 and 9).
// The plans pop-up with its read-only column went with the in-app trial (card wall, 12 Nov 2026); the plans screen a person
// chooses from is the wall, tested in test_card_wall.js.
//   2. beta testers see £3.99 a month, £49.99 a year and £99 Lifetime, each with "£5.99 / £79.99 / £199 after the beta" (owner, 4 Nov, prices of 13 Nov);
//      without tester status the full prices stand alone
//   3. showUpgrade opens the right Stripe link: the 30-day trial links for alpha testers, full-price links otherwise, Lifetime always the capped link;
//      the account id rides along as client_reference_id and the e-mail is prefilled
//   4. Settings "Your plan", for an account with no plan recorded on the device, shows the three buttons with the tester prices and the yearly extras
//   5. the old prices (£4.99, £21.99) appear nowhere in the app; no "free tier" wording
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
  ok(!/£4\.99|£21\.99/.test(src), 'the old prices (£4.99, £21.99) are gone from the app (£39.99 is the Vaulter yearly beta price since 13 Nov)');
  ok(!/Continue on free tier|Always free\. Core tools forever|free lifetime/i.test(src), 'no free-tier or free-lifetime promise is left in the app');
  const links = src.match(/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/g) || [];
  ok(new Set(links).size === 15, 'fifteen distinct Stripe links in the app (the eight from before and the seven of 13 Nov) (' + new Set(links).size + ')');

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

  // ── 2. prices, tester view (Settings) ──
  let p = await open({ w: 1100, theme: 'dark' });
  const m = await p.evaluate(() => { showSettings(); return { monthlyHtml: document.querySelector('#settings-modal [data-plan-price="monthly"]').innerHTML, annualHtml: document.querySelector('#settings-modal [data-plan-price="annual"]').innerHTML, founderTxt: document.querySelector('#settings-modal [data-plan-price="founder"]').textContent }; });
  ok(/^£3\.99/.test(m.monthlyHtml) && /£5\.99 after the beta/.test(m.monthlyHtml) && !/<s>/.test(m.monthlyHtml), 'Vaulter (monthly) shows £3.99 for beta testers and "£5.99 after the beta", nothing struck through');
  ok(/^£49\.99/.test(m.annualHtml) && /£79\.99 after the beta/.test(m.annualHtml) && !/<s>/.test(m.annualHtml), 'Pioneer shows £49.99 for beta testers and "£79.99 after the beta"');
  ok(/^£99 once£199 after the beta$/.test(m.founderTxt), 'Lifetime licence: £99 once for testers, £199 after the beta (' + m.founderTxt + ')');

  // ── 3. links ──
  const L = await p.evaluate(() => { window._supaUser = { id: 'uid-123', email: 't@t.com' }; showUpgrade('monthly'); showUpgrade('annual'); showUpgrade('founder'); return { opened: window.__opened, links: VI_STRIPE_LINKS }; });
  ok(L.opened[0].startsWith(L.links.monthly_trial + '?') && /prefilled_email=t%40t\.com/.test(L.opened[0]) && /client_reference_id=uid-123/.test(L.opened[0]), 'alpha Pioneer monthly opens the £3.99 trial link with the e-mail and account id (' + L.opened[0] + ')');
  ok(L.opened[1].startsWith(L.links.annual_trial + '?'), 'alpha Pioneer opens the £49.99 trial link');
  ok(L.opened[2].startsWith(L.links.founder_tester + '?') && L.links.founder_tester !== L.links.founder, 'Lifetime opens the capped £99 link');
  const set = Object.values(L.links).filter(Boolean);
  ok(set.every(u => /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+$/.test(u)) && new Set(set).size === 15 && L.links.pioneer_year_after === 'https://buy.stripe.com/cNi00da1o1AB0ex0qq2VG0i', 'fifteen links set and distinct; the £79.99 yearly Pioneer slot holds the 13 Nov link');
  // not a tester: full prices and links
  const F = await p.evaluate(() => { VI_BETA_OPEN = false; localStorage.removeItem('vi_beta'); window.__opened = []; viPricePaint(); showUpgrade('monthly'); showUpgrade('annual'); return { m: document.querySelector('#settings-modal [data-plan-price="monthly"]').innerHTML, a: document.querySelector('#settings-modal [data-plan-price="annual"]').innerHTML, opened: window.__opened, links: VI_STRIPE_LINKS }; });
  ok(!/<s>|after/.test(F.m) && /^£5\.99/.test(F.m) && !/<s>|after/.test(F.a) && /^£79\.99/.test(F.a), 'without tester status the full prices stand alone');
  ok(F.opened.length === 2 && F.opened[0].startsWith(F.links.vaulter_month_after + '?') && F.opened[1].startsWith(F.links.pioneer_year_after + '?') && F.links.pioneer_year_after !== F.links.annual, 'and the full-price links open: £5.99 monthly, £79.99 yearly (' + F.opened.join(' | ') + ')');

  // ── 4. Settings ──
  const S = await p.evaluate(() => { VI_BETA_OPEN = true; _refreshPioneerSettingsUI(); return { m: document.getElementById('set-plan-monthly').textContent, a: document.getElementById('set-plan-annual').textContent, f: document.getElementById('set-plan-founder').textContent, extras: document.getElementById('set-plan-extras').textContent, txt: document.getElementById('set-pioneer-inactive').textContent, badge: document.getElementById('set-pioneer-badge').textContent }; });
  ok(S.m === 'Vaulter£3.99/mo£5.99 after the beta' && S.a === 'Pioneer£49.99/yr£79.99 after the beta' && S.f === 'Lifetime licence£99 once£199 after the beta', 'Settings buttons carry the tester prices (' + S.m + ' / ' + S.a + ' / ' + S.f + ')');
  ok(/own 3D house design/.test(S.extras) && /early access/.test(S.extras) && /six preset houses/.test(S.extras) && /Lifetime licence \(one payment, 100 places, beta testers first\)/.test(S.extras) && /Household, for up to 8 people, is coming soon/.test(S.extras), 'Settings names the design tools, the Pioneer extras and the Lifetime terms');
  ok(/NO PLAN/.test(S.badge) && !/TRIAL|READ-ONLY|DAYS LEFT/.test(S.badge + S.txt) && /Vaulter at £3\.99 a month while in beta, £5\.99 after; Pioneer at £49\.99 a year while in beta, £79\.99 after/.test(S.txt) && !/Founder/.test(S.txt + S.extras), 'Settings status line (no plan on the device) has no trial wording and uses the tester price (' + S.badge + ')');
  await p.context().close();

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
