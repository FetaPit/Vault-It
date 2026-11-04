// Tier prices, names, links and icons on every plan surface (owner, 4 Nov 2026, v0.9.1 round 2 chunk I):
//   "Initial offering to users onboarded for testing is Vaulter 3.99 (normal price £5.99) Pioneer (Pro) billed yearly 49.99
//    ( will be £59.99) Founding Memeber £99 will be £149."
//   1. VI_PLANS is the single source (monthly 5.99/3.99, annual 59.99/49.99, founder 149/99); the £39.99 yearly link is gone from
//      the app and the £59.99 yearly link is an empty, named slot
//   2. every plan button on every surface (Settings, paywall, plans pop-up, crowdfund) shows the VI_PLANS price for this account
//      and opens the matching Stripe link; testers see the later price as "£X after the beta", never struck through or "was"
//   3. names: Vaulter = monthly, Pioneer = yearly (Pro), Founding Member; the after-trial state is plain read-only, no tier name
//   4. each tier card carries its icon (svg.vi-tier-ic[data-tier]); the read-only column has none
//   5. beta closed: full prices alone; the yearly buttons say "coming soon" and open nothing (no £59.99 link yet)
// Run: node tests/test_tier_prices.js
const { chromium } = require('playwright');
const fs = require('fs');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
// the owner's figures, written out by hand so a slip in VI_PLANS cannot hide itself
const X = {
  monthly: { now: '£3.99', after: '£5.99', link: 'monthly_tester', full: 'monthly', name: 'Vaulter', tier: 'vaulter' },
  annual: { now: '£49.99', after: '£59.99', link: 'annual', full: 'annual_after_beta', name: 'Pioneer', tier: 'pioneer' },
  founder: { now: '£99', after: '£149', link: 'founder_tester', full: 'founder', name: 'Founding Member', tier: 'founder' }
};
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
    'VI_PLANS: monthly 5.99/3.99, annual 59.99/49.99, founder 149/99 (' + (plans ? plans[1].slice(0, 160) : 'not found') + ')');
  ok(!/3cI8wJ0qO9337GZa102VG06/.test(src) && !/annual_tester/.test(src), 'the £39.99 tester yearly link is no longer in the app');
  ok(/annual_after_beta:\s*''/.test(src), 'the £59.99 yearly link is an empty, named slot (annual_after_beta)');
  ok(!/Pioneer monthly|you are a Vaulter|read-only \(Vaulter\)|VAULTER · READ-ONLY/.test(src), 'no "Pioneer monthly" and no tier name on the read-only state');
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
  const read = (ROOT) => p.evaluate((ROOT) => {
    const out = {};
    for (const [k, sel] of Object.entries(ROOT)) {
      const r = document.querySelector(sel);
      out[k] = {
        buttons: [...r.querySelectorAll('[data-plan]')].map(el => ({ plan: el.dataset.plan, text: el.textContent.trim(), disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true' })),
        prices: [...r.querySelectorAll('[data-plan-price]')].map(el => ({ plan: el.dataset.planPrice, text: el.textContent.replace(/\s+/g, ' ').trim(), html: el.innerHTML })),
        icons: [...r.querySelectorAll('svg.vi-tier-ic')].map(el => el.dataset.tier),
        names: [...r.querySelectorAll('[data-tier-name]')].map(el => el.textContent.trim())
      };
    }
    return out;
  }, ROOT);
  const clickAll = (ROOT) => p.evaluate((ROOT) => {
    const out = [];
    for (const [k, sel] of Object.entries(ROOT)) for (const el of document.querySelectorAll(sel + ' [data-plan]')) {
      window.__opened = []; window.__toast = ''; const t = window.showToast; window.showToast = (m) => { window.__toast = m; };
      el.click(); window.showToast = t; out.push({ surf: k, plan: el.dataset.plan, url: window.__opened[0] || '', toast: window.__toast });
    }
    return out;
  }, ROOT);
  const price = (s) => s.replace('.', '\\.');

  // ── 2 to 4. beta tester (every account while the beta is open) ──
  await openAll(); await p.waitForTimeout(300);
  const links = await p.evaluate(() => VI_STRIPE_LINKS);
  let R = await read(ROOT);
  for (const [k, want] of Object.entries(SURF)) {
    const r = R[k];
    ok(want.every(pl => r.buttons.some(x => x.plan === pl)), k + ': a button for each of ' + want.join(', ') + ' (' + r.buttons.map(x => x.plan).join(',') + ')');
    for (const pl of want) {
      const pr = r.prices.filter(x => x.plan === pl);
      ok(pr.length > 0 && pr.every(x => new RegExp(price(X[pl].now) + '(?![\\d])').test(x.text) && new RegExp(price(X[pl].after) + '(?![\\d])[^£]*after the beta').test(x.text) && !/<s>|was £/i.test(x.html)),
        k + ' ' + pl + ': shows ' + X[pl].now + ' with "' + X[pl].after + ' after the beta" (' + pr.map(x => x.text).join(' / ') + ')');
      ok(r.icons.includes(X[pl].tier), k + ' ' + pl + ': carries the ' + X[pl].tier + ' icon');
    }
  }
  ok(R.offer.names.join('|') === 'Read-only|Vaulter|Pioneer|Founding Member', 'plans pop-up columns: Read-only, Vaulter, Pioneer, Founding Member (' + R.offer.names.join('|') + ')');
  ok(R.camp.names.join('|') === 'Vaulter|Pioneer|Founding Member', 'crowdfund cards: Vaulter, Pioneer, Founding Member (' + R.camp.names.join('|') + ')');
  ok(R.paywall.names.join('|') === 'Vaulter|Pioneer' && R.settings.names.join('|') === 'Vaulter|Pioneer|Founding Member', 'paywall and Settings name the tiers (' + R.paywall.names.join('|') + ' / ' + R.settings.names.join('|') + ')');
  ok(R.offer.icons.length === 3, 'the read-only column has no tier icon (' + R.offer.icons.join(',') + ')');
  let C = await clickAll(ROOT);
  ok(C.length >= 11 && C.every(c => c.url.startsWith(links[X[c.plan].link] + '?') && links[X[c.plan].link]), 'every tester button opens its link: monthly £3.99, yearly the live £49.99, Founding £99 (' + C.filter(c => !c.url.startsWith((links[X[c.plan].link] || '-') + '?')).map(c => c.surf + ' ' + c.plan + ' ' + c.url).join(' | ') + ')');
  ok(links.annual === 'https://buy.stripe.com/dRm3cp6Pccff2mFa102VG02', 'the tester yearly link is the live £49.99 link');

  // ── read-only after the 30 days: no tier name ──
  const RO = await p.evaluate(() => { const d = viTrialDaysLeft; viTrialDaysLeft = () => 0; _refreshPioneerSettingsUI(); const o = { badge: document.getElementById('set-pioneer-badge').textContent, txt: document.getElementById('set-pioneer-inactive').textContent }; viTrialDaysLeft = d; _refreshPioneerSettingsUI(); return o; });
  ok(/READ-ONLY/.test(RO.badge) && !/VAULTER/i.test(RO.badge) && !/Vaulter:|a Vaulter|\(Vaulter\)/.test(RO.txt) && /read-only/.test(RO.txt) && /Vaulter at £3\.99 a month/.test(RO.txt), 'read-only state has no tier name; the Vaulter plan is offered by name (' + RO.badge + ' / ' + RO.txt + ')');

  // ── 5. beta closed ──
  await p.evaluate(() => { VI_BETA_OPEN = false; localStorage.removeItem('vi_beta'); });
  await openAll(); await p.waitForTimeout(300);
  R = await read(ROOT);
  for (const [k, want] of Object.entries(SURF)) for (const pl of want) {
    const pr = R[k].prices.filter(x => x.plan === pl);
    ok(pr.length > 0 && pr.every(x => new RegExp(price(X[pl].after) + '(?![\\d])').test(x.text) && !/after the beta/.test(x.text) && !new RegExp(price(X[pl].now) + '(?![\\d])').test(x.text)), k + ' ' + pl + ' (beta closed): ' + X[pl].after + ' alone (' + pr.map(x => x.text).join(' / ') + ')');
    if (pl === 'annual') { const bt = R[k].buttons.filter(x => x.plan === pl); ok(bt.length && bt.every(x => x.disabled && /coming soon/i.test(x.text)), k + ' yearly (beta closed): button disabled and says coming soon (' + bt.map(x => x.text).join(' / ') + ')'); }
  }
  C = await clickAll(ROOT);
  ok(C.filter(c => c.plan === 'annual').every(c => !c.url), 'beta closed: no yearly button opens a link');
  ok(C.filter(c => c.plan !== 'annual').every(c => c.url.startsWith(links[X[c.plan].full] + '?')), 'beta closed: monthly and Founding open the full-price links');
  const S = await p.evaluate(() => { const o = []; window.open = (u) => { o.push(u); }; const t = window.showToast; let msg = ''; window.showToast = (m) => { msg = m; }; showUpgrade('annual'); window.showToast = t; return { o, msg }; });
  ok(S.o.length === 0 && /coming soon/i.test(S.msg), 'showUpgrade("annual") with no link opens nothing and says so (' + S.msg + ')');

  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
