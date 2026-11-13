// ── STRIPE CONFIG ─────────────────────────────────────────
// Replace placeholder IDs with live ones from your Stripe dashboard.
// buy.stripe.com links: Product → Share → Buy link
// Stripe Payment Link slugs (live, PT Live Design account). Prices in the app must match what each link charges.
// Stripe Payment Links (live, created 31 Oct 2026 through the Stripe connector; price ids in docs/OFFER_AND_PRICING.md).
// Every link sends the buyer back to the app with ?upgraded=1 or ?founded=1. The Lifetime licence links stop after 100 payments (Stripe's own cap).
// Links as of 4 Nov 2026 evening (owner: "card now charge later for 30 day free trial sign up for Alpha testers specifically ... Lifetime licence
// charge at checkout"). Every link carries Stripe metadata plan = monthly / yearly / founder, which the stripe-webhook maps; it counts a trial as paid.
var VI_STRIPE_LINKS = {
  monthly_trial:     'https://buy.stripe.com/8x2fZbgpMdjjgdv5KK2VG08',   // Vaulter £3.99 a month, alpha testers: 30-day free trial, card taken now, first charge on day 31
  monthly_tester:    'https://buy.stripe.com/aFacMZa1odjj1iB3CC2VG09',   // Vaulter £3.99 a month, charged at checkout (beta price, not on the alpha trial)
  monthly:           'https://buy.stripe.com/4gM9AN3D0gvv5yR7SS2VG00',   // RETIRED, no plan uses it (13 Nov 2026): it sits on the Pioneer product. Vaulter after the beta is vaulter_month. Switched off 1 Jan 2027
  annual_trial:      'https://buy.stripe.com/3cI14hc9w1ABe5na102VG0a',   // Pioneer £49.99 a year, alpha testers: 30-day free trial, card taken now, first charge on day 31
  annual:            'https://buy.stripe.com/dRm3cp6Pccff2mFa102VG02',   // Pioneer £49.99 a year, charged at checkout (beta price, not on the alpha trial)
  annual_after_beta: 'https://buy.stripe.com/cNidR3b5s3IJ0ex2yy2VG0c',   // RETIRED, no plan uses it (13 Nov 2026): the £59.99 yearly Pioneer link. Pioneer yearly after the beta is pioneer_year (£79.99). Switched off 1 Jan 2027
  founder_tester:    'https://buy.stripe.com/4gM6oB5L87YZ5yRflk2VG0b',   // Lifetime licence £99 once, charged at checkout, 100 places
  founder:           'https://buy.stripe.com/eVq28l0qO6UV3qJc982VG05',   // RETIRED, no plan uses it (13 Nov 2026): the £149 Lifetime link. After the beta it is founder_after_beta (£199). Switched off 1 Jan 2027
  // 13 Nov 2026, the plan cards (owner: "Go with plan cards"; docs/OFFER_AND_PRICING.md "Stripe as set up on 13 Nov 2026"). All carry 30 days free, card taken now,
  // first charge on day 31 (Lifetime: no trial), metadata tier + interval for the stripe-webhook, and sit OFF in Stripe until the app that uses them is released.
  // Beta links are what the beta buys; the after-beta links are in config and are reached only when the beta has closed (31 Dec 2026, VI_BETA_OPEN).
  vaulter_year_beta:   'https://buy.stripe.com/aFa3cpddAa774uN5KK2VG0d',   // Vaulter £39.99 a year (beta)
  vaulter_year:        'https://buy.stripe.com/fZu8wJ0qOcff9P7flk2VG0e',   // Vaulter £49.99 a year (after the beta)
  vaulter_month_after: 'https://buy.stripe.com/eVq7sF2yWdjje5n4GG2VG0f',   // Vaulter £5.99 a month (after the beta)
  pioneer_month_beta:  'https://buy.stripe.com/8x2cMZflI3IJ0ex1uu2VG0g',   // Pioneer £5.99 a month (beta)
  pioneer_month:       'https://buy.stripe.com/cNi28l4H46UV7GZa102VG0h',   // Pioneer £9.99 a month (after the beta)
  pioneer_year_after:  'https://buy.stripe.com/cNi00da1o1AB0ex0qq2VG0i',   // Pioneer £79.99 a year (after the beta)
  founder_after_beta:  'https://buy.stripe.com/4gM7sF7Tg5QR8L3c982VG0j'    // Lifetime licence £199 once (after the beta), Stripe stops the link after 100 payments
};
// The one source for every plan surface and every plan name (owner, 13 Nov 2026: "Vaulter is always going to be the tier without additional pro features,
// with a yearly discount, Pioneer is the Pro subscription and with a yearly option"; the one-off stays Lifetime licence, owner 12 Nov). Prices from the
// pricing session's table of 13 Nov (docs/OFFER_AND_PRICING.md): price = after the beta, tester = beta price while the beta is open (it closes 31 Dec 2026).
// Five plans: vaulter_month, vaulter_year, pioneer_month, pioneer_year, founder. Household is shown as coming soon and has no plan here, so it has no button.
// link / testerLink / trialLink = the VI_STRIPE_LINKS key that charges it; trialAfter = the after-beta link also takes a card with 30 days free; tierId / billing =
// what the server records (profiles.tier, profiles.billing); tier = the icon. monthly and annual stay as aliases of vaulter_month and pioneer_year for the
// surfaces that still say them (Settings, the old paywall, the crowdfund cards, until the cards replace them).
var VI_PLANS = {
  vaulter_month: { tierId: 'vaulter', billing: 'month', price: 5.99,  tester: 3.99,  per: ' a month', short: '/mo', link: 'vaulter_month_after', testerLink: 'monthly_tester',    trialLink: 'monthly_trial',      trialDays: 30, trialAfter: true, name: 'Vaulter', tier: 'founder' },
  vaulter_year:  { tierId: 'vaulter', billing: 'year',  price: 49.99, tester: 39.99, per: ' a year',  short: '/yr', link: 'vaulter_year',        testerLink: 'vaulter_year_beta', trialLink: 'vaulter_year_beta',  trialDays: 30, trialAfter: true, name: 'Vaulter', tier: 'founder' },
  pioneer_month: { tierId: 'pioneer', billing: 'month', price: 9.99,  tester: 5.99,  per: ' a month', short: '/mo', link: 'pioneer_month',       testerLink: 'pioneer_month_beta', trialLink: 'pioneer_month_beta', trialDays: 30, trialAfter: true, name: 'Pioneer', tier: 'pioneer' },
  pioneer_year:  { tierId: 'pioneer', billing: 'year',  price: 79.99, tester: 49.99, per: ' a year',  short: '/yr', link: 'pioneer_year_after',  testerLink: 'annual',            trialLink: 'annual_trial',       trialDays: 30, trialAfter: true, name: 'Pioneer', tier: 'pioneer' },
  founder:       { tierId: 'founder', billing: 'once',  price: 199,   tester: 99,    per: ' once',    short: ' once', link: 'founder_after_beta', testerLink: 'founder_tester', name: 'Lifetime licence', tier: 'lifetime' }
};
VI_PLANS.monthly = VI_PLANS.vaulter_month; VI_PLANS.annual = VI_PLANS.pioneer_year;
// the order the cards show them in
var VI_PLAN_KEYS = ['vaulter_month', 'vaulter_year', 'pioneer_month', 'pioneer_year', 'founder'];
var VI_CANCEL_EMAIL = 'hello@vault-it.co';   // no self-serve cancel in the app yet: subscribers email to cancel
// The app is in beta, so every account counts as an alpha tester until the profile carries a tester flag (secure paid gateway, queued);
// a device can also be marked with vi_beta ('false' = not on the alpha trial, still on beta prices while the beta is open).
// The beta closes on 31 December 2026 (owner, 13 Nov 2026) and the beta links are switched off in Stripe on 1 January 2027, so the app switches to the
// after-beta prices and links at the same moment, by the clock (UTC midnight = UK midnight in winter). The date is shown beside every beta price.
var VI_BETA_ENDS_ON = '31 December 2026';
var VI_BETA_OPEN = Date.now() < Date.parse('2027-01-01T00:00:00Z');
function viBetaTester() { try { if (localStorage.getItem('vi_beta') === 'false') return false; return VI_BETA_OPEN || localStorage.getItem('vi_beta') === 'true'; } catch (e) { return VI_BETA_OPEN; } }
function viMoney(v) { return '£' + v.toFixed(2).replace(/\.00$/, ''); }   // £5.99, but £99 and £149, not £99.00
function viPlanTester(plan) { return !!(VI_BETA_OPEN && VI_PLANS[plan] && VI_PLANS[plan].tester); }   // beta prices: while the beta is open (it closes 31 Dec 2026; after that everyone sees the full price)
// the 30-day trial: alpha testers on the beta links, and every account on the after-beta links that take a card with 30 days free (trialAfter)
function viPlanTrial(plan) { var P = VI_PLANS[plan]; if (!P || !P.trialDays) return false; if (viPlanTester(plan)) return !!(P.trialLink && viBetaTester() && VI_STRIPE_LINKS[P.trialLink]); return !!(P.trialAfter && VI_STRIPE_LINKS[P.link]); }
function viPlanPrice(plan) { var P = VI_PLANS[plan]; return viMoney(viPlanTester(plan) ? P.tester : P.price); }
function viPlanLink(plan) { var P = VI_PLANS[plan]; if (!P) return ''; return VI_STRIPE_LINKS[viPlanTester(plan) ? (viPlanTrial(plan) ? P.trialLink : P.testerLink) : P.link] || ''; }
// the yearly price shown as a monthly figure, and the saving against twelve months of the same tier's monthly plan at the same stage (beta against beta, after against after).
// The saving is rounded DOWN to a whole per cent so it is never overstated (owner, 13 Nov: only where true; beta Vaulter 16%, Pioneer 30%; after the beta 30% and 33%).
function viPlanNow(plan) { var P = VI_PLANS[plan]; return P ? (viPlanTester(plan) ? P.tester : P.price) : 0; }
function viPlanPerMonth(plan) { var P = VI_PLANS[plan]; return P && P.billing === 'year' ? viMoney(Math.round(viPlanNow(plan) / 12 * 100) / 100) : ''; }
function viPlanSave(plan) {
  var P = VI_PLANS[plan]; if (!P || P.billing !== 'year') return 0;
  var M = VI_PLANS[P.tierId + '_month']; if (!M) return 0;
  var m12 = viPlanNow(plan.replace(/_year$/, '_month')) * 12, y = viPlanNow(plan);
  return m12 > y ? Math.floor((1 - y / m12) * 100 + 1e-9) : 0;
}
function viPlanLabel(plan) {   // for sentences: "£49.99 a year while in beta, £59.99 after"
  var P = VI_PLANS[plan];
  return viPlanTester(plan) ? viMoney(P.tester) + P.per + ' while in beta, ' + viMoney(P.price) + ' after' : viMoney(P.price) + P.per;
}
// the terms next to every plan button, plain and in full (UK rules for a free trial that takes a card)
function viPlanTerms(plan) {
  var P = VI_PLANS[plan], now = viPlanPrice(plan), cancel = 'To cancel, email ' + VI_CANCEL_EMAIL + '.';
  if (plan === 'founder') return 'One payment, charged at checkout.';
  if (viPlanTrial(plan)) return 'Free for ' + P.trialDays + ' days, then ' + now + P.per + '. Your card is taken now and first charged on day ' + (P.trialDays + 1) + '. Cancel before then and you pay nothing. ' + cancel;
  return now + P.per + ', charged at checkout. ' + cancel;
}
// paints every plan name ([data-plan-name]), price ([data-plan-price]), terms line ([data-plan-terms]) and button ([data-plan]) on every surface: the price this
// account pays now, for beta prices the later price as "£X after the beta" (never struck through), and the trial or checkout terms.
// A plan with no link yet is disabled and says so.
function viPricePaint() {
  [].forEach.call(document.querySelectorAll('[data-plan-name]'), function (el) { var P = VI_PLANS[el.getAttribute('data-plan-name')]; if (P) el.textContent = P.name; });
  [].forEach.call(document.querySelectorAll('[data-plan-price]'), function (el) {
    var plan = el.getAttribute('data-plan-price'), P = VI_PLANS[plan]; if (!P) return;
    el.innerHTML = viPlanPrice(plan) + '<span>' + P.short + '</span>' + (viPlanTester(plan) ? '<span class="vi-tier-after">' + viMoney(P.price) + ' after the beta</span>' : '');
  });
  [].forEach.call(document.querySelectorAll('[data-plan-terms]'), function (el) {
    var plan = el.getAttribute('data-plan-terms'); if (!VI_PLANS[plan]) return;
    el.textContent = viPlanLink(plan) ? viPlanTerms(plan) : '';
  });
  [].forEach.call(document.querySelectorAll('[data-plan]'), function (el) {
    var plan = el.getAttribute('data-plan'); if (!VI_PLANS[plan]) return;
    var soon = !viPlanLink(plan), cta = el.hasAttribute('data-cta') ? el : el.querySelector('[data-cta]');
    if ('disabled' in el && el.tagName === 'BUTTON') el.disabled = soon;
    el.setAttribute('aria-disabled', soon ? 'true' : 'false'); el.classList.toggle('vi-plan-off', soon);
    if (cta) cta.textContent = soon ? 'Coming soon' : (viPlanTrial(plan) && el.hasAttribute('data-cta-trial') ? el.getAttribute('data-cta-trial') : cta.getAttribute('data-cta'));
  });
}
function showUpgrade(plan) {
  var link = VI_PLANS[plan] ? viPlanLink(plan) : '';   // never a dead link: a plan with no Stripe link yet only says so
  if (!link) { showToast((VI_PLANS[plan] ? VI_PLANS[plan].name : 'That plan') + ' is coming soon.'); return; }
  // Every checkout belongs to an account, and an account has one plan (card wall, 12 Nov 2026). With no account (the sample) a
  // payment could not be matched to anyone; on a plan already, a second checkout would be a second subscription.
  var acct = null; try { acct = typeof _viPlanUid === 'function' ? _viPlanUid() : (typeof _supaUser !== 'undefined' && _supaUser && _supaUser.id); } catch (e) {}
  if (!acct) { showToast('Sign in or create your account first: a plan belongs to an account.', 6000); return; }
  // (the server's plain "no plan" beats a paid flag left on this device: the wall's own buttons always reach the checkout)
  var serverNo = false; try { serverNo = typeof _viPlanState !== 'undefined' && _viPlanState === 'off'; } catch (e) {}
  if (viPaid() && !serverNo) { showToast('This account is already on a plan. To change or cancel it, email ' + VI_CANCEL_EMAIL + '.', 7000); return; }
  var user = {};
  try { user = JSON.parse(localStorage.getItem('vi_user') || '{}'); } catch(e) {}
  var q = [];
  if (user.email) q.push('prefilled_email=' + encodeURIComponent(user.email));   // Payment Links read prefilled_email from the query
  // the account id rides along as client_reference_id, so the payment can be matched to this account on the server (secure paid gateway, queued)
  // (_viPlanUid: the signed-in account, also when supabase-js is not answering and the plan was read with the saved sign-in)
  q.push('client_reference_id=' + encodeURIComponent(acct));
  var checkoutUrl = link + (q.length ? '?' + q.join('&') : '');
  window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  showToast(plan === 'founder' ? 'Opening the Lifetime licence checkout…' : 'Opening secure checkout…');
}
// Founding Master Licence — £7.77 one-time (set via Settings or paste here)
var VI_FOUNDING_LINK = localStorage.getItem('vi_founding_link') || '';

// Shibarium mainnet config (EVM-compatible L2, Shiba Inu ecosystem)
var SHIBARIUM_MAINNET = {
  chainId:         '0x6D',   // 109 decimal
  chainName:       'Shibarium',
  nativeCurrency:  { name: 'BONE', symbol: 'BONE', decimals: 18 },
  rpcUrls:         ['https://www.shibrpc.com'],
  blockExplorerUrls: ['https://shibariumscan.io']
};
// Placeholder — replace with deployed ERC-721 contract address on Shibarium
var VAULT_NFT_CONTRACT = localStorage.getItem('vi_nft_contract') || '';

// ── CAMPAIGN CONFIG ────────────────────────────────────────
// Update these numbers manually after each Stripe dashboard check.
var VI_CAMPAIGN = {
  backers:      null,    // paying backers: filled from the server's campaign_counts() (migration 014); null (shown as a dash) until the server answers
  goal:         200,     // founding member target
  raisedGBP:    0,       // total £ raised
  goalGBP:      9980,    // funding target (200 × £49.90 avg)
  founderSlots: 100,     // max founding member places (enforced by the Stripe link's payment limit)
  founderTaken: null,    // paid founding members: from the server's campaign_counts() (migration 014); null until it answers, never seeded
  deadline:     ''       // an end date (YYYY-MM-DD) when the owner sets one; until then the modal says Open
};


