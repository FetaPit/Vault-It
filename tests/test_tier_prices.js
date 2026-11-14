// Tier prices, names, links, trial copy and icons on every plan surface.
// Owner, 4 Nov 2026 ~11:05 (chunk I): Vaulter 3.99 (later £5.99), Pioneer yearly 49.99 (later £59.99), Founding £99 (later £149).
// Owner, 4 Nov ~20:45 (I2): "card now charge later for 30 day free trial sign up for Alpha testers specifically, Have the link for founder,
//   pioneer (includes family mode as a feature, not a separate tier) and Lifetime licence charge at checkout with recurring monthly for
//   founder, yearly for pioneer." Confirmed: Founder £3.99 a month (£5.99 later), Pioneer £49.99 a year (£59.99 later), Lifetime licence
//   £99 once (£149 later); the alpha trial on monthly and yearly; family mode on Pioneer as "Family mode (coming soon)"; Lifetime always
//   charged at checkout.
//   1. VI_PLANS is the single source; the old £3.99, £39.99 and £99 links are gone; the £59.99 slot is named and (since 5 Nov) holds the live link
//   2. alpha testers (every account while VI_BETA_OPEN): Founder and Pioneer open the 30-day trial links (card now, first charge on day 31)
//      with the trial terms and how to cancel next to the button; Lifetime opens the £99 link, charged at checkout
//   3. not an alpha tester while the beta is open: the same beta prices, charged at checkout, no trial wording
//   4. beta closed: full prices; Founder £5.99 and Lifetime £149 open their links; Pioneer yearly opens the £59.99 link (5 Nov; it said "coming soon" before)
//   5. names: Vaulter (monthly), Pioneer (yearly), Lifetime licence, each painted from VI_PLANS; icons on every card
// Owner, 12 Nov 2026 (card wall, docs/briefs/CARD_WALL.md point 4): "the monthly plan is Vaulter, the yearly plan is Pioneer, the one-off stays
//   Lifetime licence, everywhere in the app, help and e-mails (VI_PLANS ... is the one source)". This replaces the 5 Nov naming below.
// Owner, 5 Nov 2026 (answers to the parent session): "Pioneer" now names both the monthly and the yearly plan (Stripe's product has
//   always been "Vault·It Pioneer" for both); the tier key and icon stay 'founder' for the monthly card. The £59.99 yearly link exists
//   in Stripe (cNidR3b5s3IJ0ex2yy2VG0c, price_1TdPyB9mgKf6HntyvjViAMQg, £59.99 a year recurring), so once the beta closes Pioneer yearly
//   opens it instead of saying "coming soon". Hand-worked: beta closed, not a tester, showUpgrade('annual') -> VI_PLANS.annual.link =
//   'annual_after_beta' -> that URL; the card shows £59.99/yr alone. The "coming soon" guard is still checked with a link blanked in the page.
// Run: node tests/test_tier_prices.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
const fs = require('fs');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// the owner's figures and the Stripe links created 4 Nov evening, written out by hand so a slip in the app cannot hide itself
const L = {
  monthly_trial: 'https://buy.stripe.com/8x2fZbgpMdjjgdv5KK2VG08', monthly_tester: 'https://buy.stripe.com/aFacMZa1odjj1iB3CC2VG09', monthly: 'https://buy.stripe.com/4gM9AN3D0gvv5yR7SS2VG00',
  annual_trial: 'https://buy.stripe.com/3cI14hc9w1ABe5na102VG0a', annual: 'https://buy.stripe.com/dRm3cp6Pccff2mFa102VG02', annual_after_beta: 'https://buy.stripe.com/cNidR3b5s3IJ0ex2yy2VG0c',
  vaulter_year_beta: 'https://buy.stripe.com/aFa3cpddAa774uN5KK2VG0d', vaulter_year: 'https://buy.stripe.com/fZu8wJ0qOcff9P7flk2VG0e', vaulter_month_after: 'https://buy.stripe.com/eVq7sF2yWdjje5n4GG2VG0f', pioneer_month_beta: 'https://buy.stripe.com/8x2cMZflI3IJ0ex1uu2VG0g', pioneer_month: 'https://buy.stripe.com/cNi28l4H46UV7GZa102VG0h', pioneer_year_after: 'https://buy.stripe.com/cNi00da1o1AB0ex0qq2VG0i', founder_after_beta: 'https://buy.stripe.com/4gM7sF7Tg5QR8L3c982VG0j',
  founder_tester: 'https://buy.stripe.com/4gM6oB5L87YZ5yRflk2VG0b', founder: 'https://buy.stripe.com/eVq28l0qO6UV3qJc982VG05'
};
const X = {
  monthly: { now: '£3.99', after: '£5.99', per: 'a month', trial: 'monthly_trial', checkout: 'monthly_tester', full: 'vaulter_month_after', name: 'Vaulter', tier: 'founder' },
  annual: { now: '£49.99', after: '£79.99', per: 'a year', trial: 'annual_trial', checkout: 'annual', full: 'pioneer_year_after', name: 'Pioneer', tier: 'pioneer' },
  founder: { now: '£99', after: '£199', trial: null, checkout: 'founder_tester', full: 'founder_after_beta', name: 'Lifetime licence', tier: 'lifetime' }
};
const TRIAL = (pl) => 'Free for 30 days, then ' + X[pl].now + ' ' + X[pl].per + '. Your card is taken now and first charged on day 31. Cancel before then and you pay nothing.';
const CANCEL = 'To cancel, email hello@vault-it.co.';
// (the plans pop-up went with the in-app trial, 12 Nov 2026; the wall's own plan cards are checked in test_card_wall.js)
const SURF = { settings: ['monthly', 'annual', 'founder'], paywall: ['monthly', 'annual'], camp: ['monthly', 'annual', 'founder'] };
const ROOT = { settings: '#settings-modal', paywall: '#paywall-modal', camp: '#vi-campaign-modal' };
const seed = () => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 }));
};
(async () => {
  const src = fs.readFileSync(require('./lib/vi').INDEX, 'utf8');
  // ── 1. the single source ──
  const plans = src.match(/var VI_PLANS = (\{[\s\S]*?\n\});/);
  let P = null; try { P = Function('return ' + plans[1])(); P.monthly = P.vaulter_month; P.annual = P.pioneer_year; } catch (e) {}
  ok(P && P.monthly.price === 5.99 && P.monthly.tester === 3.99 && P.annual.price === 79.99 && P.annual.tester === 49.99 && P.founder.price === 199 && P.founder.tester === 99,
    'VI_PLANS: monthly 5.99/3.99, annual (Pioneer yearly) 79.99/49.99, founder (Lifetime) 199/99 (' + (plans ? plans[1].slice(0, 120) : 'not found') + ')');
  ok(P && P.monthly.name === 'Vaulter' && P.monthly.tier === 'founder' && P.annual.name === 'Pioneer' && P.founder.name === 'Lifetime licence', 'VI_PLANS names: Vaulter (monthly, founder icon), Pioneer (yearly), Lifetime licence');
  ok(!/data-tier-name>Founder<|data-cta="Become a Founder|name: 'Founder'|\? ?'Founder'|Founder at |Founder \(monthly\)|Founder monthly|Everything in Founder|on Founder|plan: Founder|for Founder,|<b>Founder:/.test(src), 'the monthly plan is never shown as "Founder" any more (owner, 5 Nov)');
  ok(!/6oUeV7b5sbbb7GZ6OO2VG03|3cI8wJ0qO9337GZa102VG06|bJe3cpc9w4MN8L31uu2VG07|annual_tester/.test(src), 'the old £3.99, £39.99 and £99 links are no longer in the app');
  ok(/pioneer_year_after:\s*'https:\/\/buy\.stripe\.com\/cNi00da1o1AB0ex0qq2VG0i'/.test(src), 'the £79.99 yearly Pioneer slot (pioneer_year_after) holds the 13 Nov Stripe link');
  ok(!/Founding Member|FOUNDING MEMBER/.test(src), 'no "Founding Member" left in the app, in any case');
  // nothing in the built app calls the monthly plan Pioneer any more (comments that tell the history say "both subscriptions were called Pioneer")
  const stale = src.match(/Pioneer at £3\.99|Pioneer £3\.99 a month|Become a Pioneer →" data-cta-trial="Start 30 days free →" onclick="showUpgrade\('monthly'\)/g) || [];
  ok(stale.length === 0, 'no sentence, label or button in the app calls the monthly plan Pioneer (' + stale.slice(0, 4).join(' | ') + ')');
  ok(/Vaulter is the whole app and Pioneer is Pro/.test(src) && /takes payments for Vaulter and Pioneer \(each monthly or yearly\) and the Lifetime licence/.test(src), 'the help answer and the privacy notice name the plans the same way');
  ok(!/<s>£|\(was £|was £/.test(src), 'no struck-through or "was" prices in the markup');

  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed); await p.goto(APP); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
  const openAll = () => p.evaluate(() => {
    window.__opened = []; window.open = function (u) { window.__opened.push(u); return null; };
    _supaUser = { id: '11111111-1111-4111-8111-111111111111', email: 't@t.com' };   // every checkout belongs to an account
    showSettings(); showPaywall('assets');
    document.getElementById('vi-campaign-modal').classList.remove('hidden'); try { viCampaignPrices(); } catch (e) {}
  });
  const read = () => p.evaluate((ROOT) => {
    const out = {}, vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).display !== 'none';
    for (const [k, sel] of Object.entries(ROOT)) {
      const r = document.querySelector(sel);
      out[k] = {
        buttons: [...r.querySelectorAll('[data-plan]')].map(el => ({ plan: el.dataset.plan, text: el.textContent.trim(), disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true' })),
        prices: [...r.querySelectorAll('[data-plan-price]')].map(el => ({ plan: el.dataset.planPrice, text: el.textContent.replace(/\s+/g, ' ').trim(), html: el.innerHTML })),
        terms: [...r.querySelectorAll('[data-plan-terms]')].map(el => ({ plan: el.dataset.planTerms, text: vis(el) ? el.textContent.replace(/\s+/g, ' ').trim() : '' })),
        icons: [...r.querySelectorAll('svg.vi-tier-ic')].map(el => el.dataset.tier),
        names: [...r.querySelectorAll('[data-tier-name]')].map(el => el.textContent.trim()),
        pioneer: ((r.querySelector('[data-tier-card="annual"]') || {}).textContent || '').replace(/\s+/g, ' ')
      };
    }
    return out;
  }, ROOT);
  const clickAll = () => p.evaluate((ROOT) => {
    const out = [];
    for (const [k, sel] of Object.entries(ROOT)) for (const el of document.querySelectorAll(sel + ' [data-plan]')) {
      window.__opened = []; window.__toast = ''; const t = window.showToast; window.showToast = (m) => { window.__toast = m; };
      el.click(); window.showToast = t; out.push({ surf: k, plan: el.dataset.plan, url: window.__opened[0] || '', toast: window.__toast });
    }
    return out;
  }, ROOT);
  const re = (s) => new RegExp(s.replace(/[.£]/g, '\\$&') + '(?![\\d])');
  const opens = (C, key) => C.filter(c => !c.url.startsWith(L[key(c.plan)] + '?') || !L[key(c.plan)]).map(c => c.surf + ' ' + c.plan + ' ' + c.url);

  // ── 2. alpha tester (every account while the beta is open) ──
  await openAll(); await p.waitForTimeout(300);
  const links = await p.evaluate(() => VI_STRIPE_LINKS);
  ok(Object.keys(L).every(k => links[k] === L[k]), 'VI_STRIPE_LINKS holds the 4 Nov links (' + Object.keys(L).filter(k => links[k] !== L[k]).join(', ') + ')');
  let R = await read();
  for (const [k, want] of Object.entries(SURF)) {
    const r = R[k];
    ok(want.every(pl => r.buttons.some(x => x.plan === pl)), k + ': a button for each of ' + want.join(', ') + ' (' + r.buttons.map(x => x.plan).join(',') + ')');
    for (const pl of want) {
      const pr = r.prices.filter(x => x.plan === pl);
      ok(pr.length > 0 && pr.every(x => re(X[pl].now).test(x.text) && new RegExp(X[pl].after.replace(/[.£]/g, '\\$&') + '(?![\\d])[^£]*after the beta').test(x.text) && !/<s>|was £/i.test(x.html)),
        k + ' ' + pl + ': shows ' + X[pl].now + ' with "' + X[pl].after + ' after the beta" (' + pr.map(x => x.text).join(' / ') + ')');
      const tm = r.terms.filter(x => x.plan === pl);
      if (X[pl].trial) ok(tm.length > 0 && tm.every(x => x.text.includes(TRIAL(pl)) && x.text.includes(CANCEL)), k + ' ' + pl + ': trial terms and how to cancel next to the button (' + tm.map(x => x.text).join(' / ') + ')');
      else ok(tm.length > 0 && tm.every(x => /charged at checkout/i.test(x.text) && !/Free for 30 days/.test(x.text)), k + ' ' + pl + ': Lifetime says it is charged at checkout, no trial (' + tm.map(x => x.text).join(' / ') + ')');
      ok(r.icons.includes(X[pl].tier), k + ' ' + pl + ': carries the ' + X[pl].tier + ' icon');
    }
  }
  ok(R.camp.names.join('|') === 'Vaulter|Pioneer|Lifetime licence', 'crowdfund cards: Vaulter (monthly), Pioneer (yearly), Lifetime licence (' + R.camp.names.join('|') + ')');
  ok(R.paywall.names.join('|') === 'Vaulter|Pioneer' && R.settings.names.join('|') === 'Vaulter|Pioneer|Lifetime licence', 'paywall and Settings name the tiers (' + R.paywall.names.join('|') + ' / ' + R.settings.names.join('|') + ')');
  // one source: change a name in VI_PLANS and every surface follows, the confirmation and the allowance line too
  const ONE = await p.evaluate(() => { const keep = VI_PLANS.monthly.name; VI_PLANS.monthly.name = 'Zzz'; viPricePaint(); try { viWallPaint(); } catch (e) {} _refreshPioneerSettingsUI();
    const o = { cards: [...document.querySelectorAll('[data-plan-name="monthly"]')].map(e => e.textContent), n: document.querySelectorAll('[data-plan-name="monthly"]').length, tierNames: [...document.querySelectorAll('[data-tier-name]')].every(e => e.hasAttribute('data-plan-name')), inactive: document.getElementById('set-pioneer-inactive').textContent, allow: viShotAllowance() };
    VI_PLANS.monthly.name = keep; viPricePaint(); _refreshPioneerSettingsUI(); return o; });
  ok(ONE.n >= 4 && ONE.cards.every(t => t === 'Zzz') && ONE.tierNames && /Zzz at £3\.99/.test(ONE.inactive) && /30 on Zzz or Pioneer/.test(ONE.allow), 'VI_PLANS is the one source of every plan name: the wall, Settings, the paywall, the crowdfund, the status line and the allowance line follow it (' + ONE.n + ' places)');
  ok(/House builder Level 3 \(coming\)/.test(R.camp.pioneer) && /Your own 3D house design and AI house model/.test(R.camp.pioneer) && !/Family mode/.test(R.camp.pioneer), 'Pioneer lists the Pro features, with Level 3 as coming, on the crowdfund (family mode is Household now)');
  let C = await clickAll();
  const trialKey = (pl) => X[pl].trial || X[pl].checkout;
  ok(C.length >= 8 && opens(C, trialKey).length === 0, 'alpha: Vaulter and Pioneer open the 30-day trial links, Lifetime the £99 link (' + opens(C, trialKey).join(' | ') + ')');

  // ── no plan on the device: Settings names the plans, with no trial or read-only wording; on a plan it says so and hides the buy buttons ──
  const RO = await p.evaluate(() => { _refreshPioneerSettingsUI(); const o = { badge: document.getElementById('set-pioneer-badge').textContent, txt: document.getElementById('set-pioneer-inactive').textContent };
    localStorage.setItem('vi_pioneer', 'true'); localStorage.setItem('vi_plan', 'monthly'); _refreshPioneerSettingsUI();
    o.paidBadge = document.getElementById('set-pioneer-badge').textContent; o.line = document.getElementById('set-plan-line').textContent; o.buy = getComputedStyle(document.querySelector('#settings-modal .set-tiers')).display;
    localStorage.setItem('vi_plan', 'yearly'); _refreshPioneerSettingsUI(); o.yearLine = document.getElementById('set-plan-line').textContent;
    localStorage.removeItem('vi_pioneer'); localStorage.removeItem('vi_plan'); _refreshPioneerSettingsUI(); return o; });
  ok(/NO PLAN/.test(RO.badge) && !/read-only|TRIAL|days/i.test(RO.badge + RO.txt) && /Vaulter at £3\.99 a month/.test(RO.txt) && /Pioneer at £49\.99 a year/.test(RO.txt) && !/Founder/.test(RO.txt) && /Lifetime licence/.test(RO.txt), 'no plan: no trial or read-only wording; the plans are offered by name (' + RO.badge + ' / ' + RO.txt + ')');
  ok(/ACTIVE/.test(RO.paidBadge) && /You are on Vaulter \(monthly\)/.test(RO.line) && /You are on Pioneer \(yearly\)/.test(RO.yearLine) && RO.buy === 'none', 'on a plan: Settings says which, and the buy buttons are hidden (' + RO.paidBadge + ' / ' + RO.line + ')');

  // ── 3. not an alpha tester, beta still open: beta prices charged at checkout, no trial wording ──
  await p.evaluate(() => { localStorage.setItem('vi_beta', 'false'); });
  await openAll(); await p.waitForTimeout(300);
  R = await read();
  for (const [k, want] of Object.entries(SURF)) for (const pl of want) {
    const pr = R[k].prices.filter(x => x.plan === pl), tm = R[k].terms.filter(x => x.plan === pl);
    ok(pr.every(x => re(X[pl].now).test(x.text)) && tm.every(x => !/Free for 30 days/.test(x.text)), k + ' ' + pl + ' (not alpha): ' + X[pl].now + ', no trial wording (' + tm.map(x => x.text).join(' / ') + ')');
  }
  C = await clickAll();
  ok(opens(C, pl => X[pl].checkout).length === 0, 'not alpha: every button opens the charge-at-checkout link (' + opens(C, pl => X[pl].checkout).join(' | ') + ')');

  // ── 4. beta closed ──
  await p.evaluate(() => { VI_BETA_OPEN = false; localStorage.removeItem('vi_beta'); });
  await openAll(); await p.waitForTimeout(300);
  R = await read();
  for (const [k, want] of Object.entries(SURF)) for (const pl of want) {
    const pr = R[k].prices.filter(x => x.plan === pl);
    ok(pr.length > 0 && pr.every(x => re(X[pl].after).test(x.text) && !/after the beta/.test(x.text) && !re(X[pl].now).test(x.text)), k + ' ' + pl + ' (beta closed): ' + X[pl].after + ' alone (' + pr.map(x => x.text).join(' / ') + ')');
    if (pl === 'annual') { const bt = R[k].buttons.filter(x => x.plan === pl); ok(bt.length && bt.every(x => !x.disabled && !/coming soon/i.test(x.text)), k + ' Pioneer yearly (beta closed): button enabled, no "coming soon" (' + bt.map(x => x.text).join(' / ') + ')'); }
  }
  C = await clickAll();
  ok(C.filter(c => c.plan === 'annual').length >= 3 && opens(C, pl => X[pl].full).length === 0, 'beta closed: Vaulter opens £5.99, Pioneer £79.99 and Lifetime £199 (' + opens(C, pl => X[pl].full).join(' | ') + ')');
  // the "never a dead link" guard still holds for a plan whose link is blanked: nothing opens, the button says so
  const S = await p.evaluate(() => { const keep = VI_STRIPE_LINKS.pioneer_year_after; VI_STRIPE_LINKS.pioneer_year_after = ''; viPricePaint(); const b = document.getElementById('camp-cta-pioneer'); const o = []; window.open = (u) => { o.push(u); }; const t = window.showToast; let msg = ''; window.showToast = (m) => { msg = m; }; showUpgrade('annual'); window.showToast = t; const r = { o, msg, dis: b.disabled, txt: b.textContent.trim() }; VI_STRIPE_LINKS.pioneer_year_after = keep; viPricePaint(); return r; });
  ok(S.o.length === 0 && /coming soon/i.test(S.msg) && S.dis && /coming soon/i.test(S.txt), 'a plan with its link blanked opens nothing and says coming soon (' + S.msg + ' / ' + S.txt + ')');

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
