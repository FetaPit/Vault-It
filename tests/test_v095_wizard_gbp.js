// v0.95, tester 1 (9 Nov 2026): "Dream Home Target showed ₹ not £". The welcome screens offered GBP, USD, EUR and INR; one tap on
// INR turned every money label to ₹ and the figures typed were divided by the rupee rate when saved. Vault-It is built for UK
// homebuying (owner, 10 Nov 06:40: "₹ to £ on Dream Home Target"), so the welcome screens work in pounds only. Currency stays
// in Settings for anyone who wants another display.
//   1. no currency choice on the welcome screens
//   2. every money label on the money, home and deposit pot screens says £, and nothing shows ₹, $ or €,
//      even on a device whose saved currency is INR
//      (the example figure in the Dream Home Target field too: it was 21,200,000 on an INR device)
//   3. the figures typed are saved as pounds: home £250,000 and a £6,000 pot land in the House Builder as £250,000 and £6,000
// Run: node tests/test_v095_wizard_gbp.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2/, r => r.abort());
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP); await p.waitForTimeout(3000);
  // a signed-in new user on a device whose saved currency is INR (the sample is dropped by the sign-in, as d2a368a does)
  await p.evaluate(async () => { _hydrateFromSupabase = async () => false; _guardAccountSwitch = async () => true; await _afterVerified({ id: 'u-g', email: 'g@example.com' }, 'g@example.com'); });
  await p.waitForTimeout(3500);
  await p.evaluate(() => { _lsOrig.call(localStorage, 'vi_settings', JSON.stringify({ theme: 'dark', currency: 'INR', density: 'default' })); });
  await p.reload(); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
  ok(await p.evaluate(() => window.VI_CURRENCY_SYMBOL === '₹'), 'setup: the device displays in rupees');
  const s1 = await p.evaluate(() => getComputedStyle(document.getElementById('welcome-overlay')).display);
  ok(s1 !== 'none', 'setup: the welcome screens show');

  ok(await p.evaluate(() => document.querySelectorAll('#welcome-overlay .w-curr-btn, #welcome-overlay [onclick*="wSetCurrency"]').length === 0), '1 no currency choice on the welcome screens');

  await p.fill('#w-name', 'Gita'); if (await p.isVisible('#w-email')) await p.fill('#w-email', 'g@example.com');
  // the onboarding is two screens since onboarding/less-friction (10 Nov): name, goal and home on screen 1; money and pot on screen 2; then the plan
  const money = (id) => p.evaluate((id) => { const sc = document.getElementById(id);
    const labels = [...sc.querySelectorAll('label')].filter(l => /\(.\)/.test(l.textContent)).map(l => l.textContent.replace(/\s+/g, ' ').trim());
    return { labels, foreign: /[₹$€]/.test(sc.innerText) }; }, id);
  await p.click('#w-opts .welcome-opt[data-val="2"]');
  let m4 = await money('wz-s1');
  ok(m4.labels.some(l => /^Dream Home Target \(£\)/i.test(l)) && m4.labels.every(l => /\(£\)/.test(l)) && !m4.foreign, '2 home: Dream Home Target (£), nothing in ₹, $ or € (' + m4.labels.join(' | ') + ')');
  await p.click('#w-htypes .w-ht[data-type="terraced"]');
  const ph = await p.evaluate(() => ({ ph: document.getElementById('w-house').placeholder, price: Math.round(state.prices.terraced) }));
  ok(ph.ph === 'e.g. ' + ph.price.toLocaleString('en-GB') && ph.price < 1e7, '2 home: the example under "Dream Home Target (£)" is the £ price, not a rupee figure (' + ph.ph + ')');
  await p.fill('#w-house', '250000'); await p.click('#wz-s1 .welcome-cta'); await p.waitForTimeout(200);
  let m3 = await money('wz-s2');
  ok(m3.labels.length >= 2 && m3.labels.every(l => /\(£\)/.test(l)) && !m3.foreign, '2 money screen: every money label says £ (' + m3.labels.join(' | ') + ')');
  await p.fill('#w-income', '2000'); await p.fill('#w-expenses', '1500');
  await p.click('#w-pot-opts .welcome-opt[data-pot="savings"]'); await p.waitForTimeout(150);
  let m5 = await money('wz-s2');
  ok(m5.labels.length >= 1 && m5.labels.every(l => /\(£\)/.test(l)) && !m5.foreign, '2 deposit pot: every money label says £ (' + m5.labels.join(' | ') + ')');
  await p.fill('#w-pot-value', '6000'); await p.click('#wz-s2 .welcome-cta'); await p.waitForTimeout(300);
  const m6 = await p.evaluate(() => { const t = (document.getElementById('wz-plan') || {}).innerText || ''; return { foreign: /[₹$€]/.test(t), pound: /£2,000/.test(t) }; });
  ok(!m6.foreign && m6.pound, '2 plan screen: the figures typed read back in £ (' + JSON.stringify(m6) + ')');
  await p.click('#w-finish'); await p.waitForTimeout(1500);
  const h = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('ht3') || '{}'); return { price: s.prices && s.prices.terraced, target: s.target, saved: s.saved, dep: (s.deposits || []).map(d => d.amount) }; });
  ok(h.price === 250000 && h.target === 250000, '3 the home typed as £250,000 is saved as £250,000, not divided by the rupee rate (' + JSON.stringify(h) + ')');
  ok(Math.abs(h.saved - 6000) < 0.005 && h.dep.length === 1 && Math.abs(h.dep[0] - 6000) < 0.005, '3 the £6,000 pot lands in the House Builder as £6,000 (' + JSON.stringify(h) + ')');
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
