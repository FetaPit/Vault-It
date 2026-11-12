// ── STRIPE CONFIG ─────────────────────────────────────────
// Replace placeholder IDs with live ones from your Stripe dashboard.
// buy.stripe.com links: Product → Share → Buy link
// Stripe Payment Link slugs (live, PT Live Design account). Prices in the app must match what each link charges.
// Stripe Payment Links (live, created 31 Oct 2026 through the Stripe connector; price ids in docs/OFFER_AND_PRICING.md).
// Every link sends the buyer back to the app with ?upgraded=1 or ?founded=1. The Lifetime licence links stop after 100 payments (Stripe's own cap).
// Links as of 4 Nov 2026 evening (owner: "card now charge later for 30 day free trial sign up for Alpha testers specifically ... Lifetime licence
// charge at checkout"). Every link carries Stripe metadata plan = monthly / yearly / founder, which the stripe-webhook maps; it counts a trial as paid.
var VI_STRIPE_LINKS = {
  monthly_trial:     'https://buy.stripe.com/8x2fZbgpMdjjgdv5KK2VG08',   // Pioneer £3.99 a month, alpha testers: 30-day free trial, card taken now, first charge on day 31
  monthly_tester:    'https://buy.stripe.com/aFacMZa1odjj1iB3CC2VG09',   // Pioneer £3.99 a month, charged at checkout (beta price, not on the alpha trial)
  monthly:           'https://buy.stripe.com/4gM9AN3D0gvv5yR7SS2VG00',   // Pioneer £5.99 a month after the beta (the existing £5.99 monthly link)
  annual_trial:      'https://buy.stripe.com/3cI14hc9w1ABe5na102VG0a',   // Pioneer £49.99 a year, alpha testers: 30-day free trial, card taken now, first charge on day 31
  annual:            'https://buy.stripe.com/dRm3cp6Pccff2mFa102VG02',   // Pioneer £49.99 a year, charged at checkout (beta price, not on the alpha trial)
  annual_after_beta: 'https://buy.stripe.com/cNidR3b5s3IJ0ex2yy2VG0c',   // Pioneer £59.99 a year after the beta (price_1TdPyB9mgKf6HntyvjViAMQg, recurring; checked in Stripe 5 Nov 2026), back to ?upgraded=1&plan=yearly
  founder_tester:    'https://buy.stripe.com/4gM6oB5L87YZ5yRflk2VG0b',   // Lifetime licence £99 once, charged at checkout, 100 places
  founder:           'https://buy.stripe.com/eVq28l0qO6UV3qJc982VG05'    // Lifetime licence £149 once after the beta, 100 places
};
// The one source for every plan surface (owner, 4 Nov 2026; monthly renamed Founder -> Pioneer 5 Nov): Pioneer £3.99 a month (£5.99 after the beta) or £49.99 a year (£59.99 after),
// Lifetime licence £99 once (£149 after). Keys stay monthly / annual / founder: the server and saved plans use them (founder = the Lifetime licence).
// price = after the beta, tester = beta price; link / testerLink / trialLink = the VI_STRIPE_LINKS key that charges it; tier = the icon.
var VI_PLANS = { monthly: { price: 5.99, tester: 3.99, per: ' a month', short: '/mo', link: 'monthly', testerLink: 'monthly_tester', trialLink: 'monthly_trial', trialDays: 30, name: 'Pioneer', tier: 'founder' }, annual: { price: 59.99, tester: 49.99, per: ' a year', short: '/yr', link: 'annual_after_beta', testerLink: 'annual', trialLink: 'annual_trial', trialDays: 30, name: 'Pioneer', tier: 'pioneer' }, founder: { price: 149, tester: 99, per: ' once', short: ' once', link: 'founder', testerLink: 'founder_tester', name: 'Lifetime licence', tier: 'lifetime' } };
var VI_CANCEL_EMAIL = 'hello@vault-it.co';   // no self-serve cancel in the app yet: subscribers email to cancel
// The app is in beta, so every account counts as an alpha tester until the profile carries a tester flag (secure paid gateway, queued);
// a device can also be marked with vi_beta ('false' = not on the alpha trial, still on beta prices while the beta is open).
var VI_BETA_OPEN = true;
function viBetaTester() { try { if (localStorage.getItem('vi_beta') === 'false') return false; return VI_BETA_OPEN || localStorage.getItem('vi_beta') === 'true'; } catch (e) { return VI_BETA_OPEN; } }
function viMoney(v) { return '£' + v.toFixed(2).replace(/\.00$/, ''); }   // £5.99, but £99 and £149, not £99.00
function viPlanTester(plan) { return !!((VI_BETA_OPEN || viBetaTester()) && VI_PLANS[plan].tester); }   // beta prices: while the beta is open, or a marked tester
function viPlanTrial(plan) { var P = VI_PLANS[plan]; return !!(P && P.trialLink && viPlanTester(plan) && viBetaTester() && VI_STRIPE_LINKS[P.trialLink]); }   // alpha testers: the 30-day trial
function viPlanPrice(plan) { var P = VI_PLANS[plan]; return viMoney(viPlanTester(plan) ? P.tester : P.price); }
function viPlanLink(plan) { var P = VI_PLANS[plan]; if (!P) return ''; return VI_STRIPE_LINKS[viPlanTrial(plan) ? P.trialLink : viPlanTester(plan) ? P.testerLink : P.link] || ''; }
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
// paints every plan price ([data-plan-price]), terms line ([data-plan-terms]) and button ([data-plan]) on every surface: the price this
// account pays now, for beta prices the later price as "£X after the beta" (never struck through), and the trial or checkout terms.
// A plan with no link yet is disabled and says so.
function viPricePaint() {
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
  var user = {};
  try { user = JSON.parse(localStorage.getItem('vi_user') || '{}'); } catch(e) {}
  var q = [];
  if (user.email) q.push('prefilled_email=' + encodeURIComponent(user.email));   // Payment Links read prefilled_email from the query
  // the account id rides along as client_reference_id, so the payment can be matched to this account on the server (secure paid gateway, queued)
  // (_viPlanUid: the signed-in account, also when supabase-js is not answering and the plan was read with the saved sign-in)
  try { var acct = typeof _viPlanUid === 'function' ? _viPlanUid() : (typeof _supaUser !== 'undefined' && _supaUser && _supaUser.id); if (acct) q.push('client_reference_id=' + encodeURIComponent(acct)); } catch (e) {}
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


