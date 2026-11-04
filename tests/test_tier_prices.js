// Tier prices, names, links, trial copy and icons on every plan surface.
// Owner, 4 Nov 2026 ~11:05 (chunk I): Vaulter 3.99 (later £5.99), Pioneer yearly 49.99 (later £59.99), Founding £99 (later £149).
// Owner, 4 Nov ~20:45 (I2): "card now charge later for 30 day free trial sign up for Alpha testers specifically, Have the link for founder,
//   pioneer (includes family mode as a feature, not a separate tier) and Lifetime licence charge at checkout with recurring monthly for
//   founder, yearly for pioneer." Confirmed: Founder £3.99 a month (£5.99 later), Pioneer £49.99 a year (£59.99 later), Lifetime licence
//   £99 once (£149 later); the alpha trial on monthly and yearly; family mode on Pioneer as "Family mode (coming soon)"; Lifetime always
//   charged at checkout.
//   1. VI_PLANS is the single source; the old £3.99, £39.99 and £99 links are gone; the £59.99 slot is empty and named
//   2. alpha testers (every account while VI_BETA_OPEN): Founder and Pioneer open the 30-day trial links (card now, first charge on day 31)
//      with the trial terms and how to cancel next to the button; Lifetime opens the £99 link, charged at checkout
//   3. not an alpha tester while the beta is open: the same beta prices, charged at checkout, no trial wording
//   4. beta closed: full prices; Founder £5.99 and Lifetime £149 open their links; Pioneer at £59.99 says "coming soon" and opens nothing
//   5. names: Founder, Pioneer, Lifetime licence (read-only after the trial has no tier name); icons on every card
// Run: node tests/test_tier_prices.js
const { chromium } = require('playwright');
const fs = require('fs');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// the owner's figures and the Stripe links created 4 Nov evening, written out by hand so a slip in the app cannot hide itself
const L = {
  monthly_trial: 'https://buy.stripe.com/8x2fZbgpMdjjgdv5KK2VG08', monthly_tester: 'https://buy.stripe.com/aFacMZa1odjj1iB3CC2VG09', monthly: 'https://buy.stripe.com/4gM9AN3D0gvv5yR7SS2VG00',
  annual_trial: 'https://buy.stripe.com/3cI14hc9w1ABe5na102VG0a', annual: 'https://buy.stripe.com/dRm3cp6Pccff2mFa102VG02', annual_after_beta: '',
  founder_tester: 'https://buy.stripe.com/4gM6oB5L87YZ5yRflk2VG0b', founder: 'https://buy.stripe.com/eVq28l0qO6UV3qJc982VG05'
};
const X = {
  monthly: { now: '£3.99', after: '£5.99', per: 'a month', trial: 'monthly_trial', checkout: 'monthly_tester', full: 'monthly', name: 'Founder', tier: 'founder' },
  annual: { now: '£49.99', after: '£59.99', per: 'a year', trial: 'annual_trial', checkout: 'annual', full: 'annual_after_beta', name: 'Pioneer', tier: 'pioneer' },
  founder: { now: '£99', after: '£149', trial: null, checkout: 'founder_tester', full: 'founder', name: 'Lifetime licence', tier: 'lifetime' }
};
const TRIAL = (pl) => 'Free for 30 days, then ' + X[pl].now + ' ' + X[pl].per + '. Your card is taken now and first charged on day 31. Cancel before then and you pay nothing.';
const CANCEL = 'To cancel, email hello@vault-it.co.';
const SURF = { settings: ['monthly', 'annual', 'founder'], paywall: ['monthly', 'annual'], offer: ['monthly', 'annual', 'founder'], camp: ['monthly', 'annual', 'founder'] };
const ROOT = { settings: '#settings-modal', paywall: '#paywall-modal', offer: '#pro-offer-modal', camp: '#vi-campaign-modal' };
const seed = () => {
  localStorage.setItem('vi-theme', 'dark'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 }));
};
(async () => {
  const src = fs.readFileSync('/home/user/Vault-It/index.html', 'utf8');
  // ── 1. the single source ──
  const plans = src.match(/var VI_PLANS = (\{.*\});/);
  let P = null; try { P = Function('return ' + plans[1])(); } catch (e) {}
  ok(P && P.monthly.price === 5.99 && P.monthly.tester === 3.99 && P.annual.price === 59.99 && P.annual.tester === 49.99 && P.founder.price === 149 && P.founder.tester === 99,
    'VI_PLANS: monthly 5.99/3.99, annual 59.99/49.99, founder (Lifetime) 149/99 (' + (plans ? plans[1].slice(0, 120) : 'not found') + ')');
  ok(P && P.monthly.name === 'Founder' && P.annual.name === 'Pioneer' && P.founder.name === 'Lifetime licence', 'VI_PLANS names: Founder, Pioneer, Lifetime licence');
  ok(!/6oUeV7b5sbbb7GZ6OO2VG03|3cI8wJ0qO9337GZa102VG06|bJe3cpc9w4MN8L31uu2VG07|annual_tester/.test(src), 'the old £3.99, £39.99 and £99 links are no longer in the app');
  ok(/annual_after_beta:\s*''/.test(src), 'the £59.99 yearly link is an empty, named slot (annual_after_beta)');
  ok(!/Vaulter|VAULTER|Founding Member|FOUNDING MEMBER|Pioneer monthly/.test(src), 'no "Vaulter" or "Founding Member" left in the app, in any case');
  ok(!/<s>£|\(was £|was £/.test(src), 'no struck-through or "was" prices in the markup');

  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: 'dark' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed); await p.goto(APP); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
  const openAll = () => p.evaluate(() => {
    window.__opened = []; window.open = function (u) { window.__opened.push(u); return null; };
    showSettings(); viShowTrialEnd('banner'); showPaywall('assets');
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
  ok(R.offer.names.join('|') === 'Read-only|Founder|Pioneer|Lifetime licence', 'plans pop-up columns: Read-only, Founder, Pioneer, Lifetime licence (' + R.offer.names.join('|') + ')');
  ok(R.camp.names.join('|') === 'Founder|Pioneer|Lifetime licence', 'crowdfund cards: Founder, Pioneer, Lifetime licence (' + R.camp.names.join('|') + ')');
  ok(R.paywall.names.join('|') === 'Founder|Pioneer' && R.settings.names.join('|') === 'Founder|Pioneer|Lifetime licence', 'paywall and Settings name the tiers (' + R.paywall.names.join('|') + ' / ' + R.settings.names.join('|') + ')');
  ok(/Family mode \(coming soon\)/.test(R.offer.pioneer) && /Family mode \(coming soon\)/.test(R.camp.pioneer), 'Pioneer lists "Family mode (coming soon)" in the plans pop-up and the crowdfund');
  ok(R.offer.icons.length === 3, 'the read-only column has no tier icon (' + R.offer.icons.join(',') + ')');
  let C = await clickAll();
  const trialKey = (pl) => X[pl].trial || X[pl].checkout;
  ok(C.length >= 11 && opens(C, trialKey).length === 0, 'alpha: Founder and Pioneer open the 30-day trial links, Lifetime the £99 link (' + opens(C, trialKey).join(' | ') + ')');

  // ── read-only after the 30 days: no tier name ──
  const RO = await p.evaluate(() => { const d = viTrialDaysLeft; viTrialDaysLeft = () => 0; _refreshPioneerSettingsUI(); const o = { badge: document.getElementById('set-pioneer-badge').textContent, txt: document.getElementById('set-pioneer-inactive').textContent }; viTrialDaysLeft = d; _refreshPioneerSettingsUI(); return o; });
  ok(/READ-ONLY/.test(RO.badge) && /read-only/.test(RO.txt) && /Founder at £3\.99 a month/.test(RO.txt) && /Lifetime licence/.test(RO.txt), 'read-only state has no tier name; the plans are offered by name (' + RO.badge + ' / ' + RO.txt + ')');

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
    if (pl === 'annual') { const bt = R[k].buttons.filter(x => x.plan === pl); ok(bt.length && bt.every(x => x.disabled && /coming soon/i.test(x.text)), k + ' Pioneer (beta closed): button disabled and says coming soon (' + bt.map(x => x.text).join(' / ') + ')'); }
  }
  C = await clickAll();
  ok(C.filter(c => c.plan === 'annual').every(c => !c.url), 'beta closed: no Pioneer button opens a link');
  ok(opens(C.filter(c => c.plan !== 'annual'), pl => X[pl].full).length === 0, 'beta closed: Founder opens £5.99 and Lifetime £149');
  const S = await p.evaluate(() => { const o = []; window.open = (u) => { o.push(u); }; const t = window.showToast; let msg = ''; window.showToast = (m) => { msg = m; }; showUpgrade('annual'); window.showToast = t; return { o, msg }; });
  ok(S.o.length === 0 && /coming soon/i.test(S.msg), 'showUpgrade("annual") with no link opens nothing and says so (' + S.msg + ')');

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
