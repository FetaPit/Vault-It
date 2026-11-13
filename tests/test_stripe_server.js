// stripe-webhook: nothing is read before the Stripe signature checks out; plans come from our own links and prices;
// unpaid, unknown and test-mode events change nothing; a database failure asks Stripe to retry.
// Tier and billing period (migration 015, owner 13 Nov 2026): a payment is read as Vaulter / Pioneer / founder and month / year / once from our own
// link and price ids, then metadata.tier + metadata.interval, then the old plan names; the interval alone never makes a tier.
// The database side (stripe_apply: once only, stale events, founders, testers) is tested on a real Postgres in test_011.mjs.
const fs = require('fs'); const esbuild = require('esbuild'); const crypto = require('crypto');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
let src = fs.readFileSync(require('path').join(require('./lib/vi').ROOT, 'supabase/functions/stripe-webhook/index.ts'), 'utf8');
src = src.replace(/import \{ createClient \} from [^\n]+\n/, 'const createClient=globalThis.__createClient;\n');
const js = esbuild.transformSync(src, { loader: 'ts', format: 'cjs' }).code;

const calls = []; let dbFail = false;
globalThis.__createClient = () => ({ rpc: async (fn, a) => { calls.push([fn, a]); return dbFail ? { data: null, error: { message: 'down' } } : { data: 'applied', error: null }; } });
const SECRET = 'whsec_test_one', SECRET2 = 'whsec_test_two';
const BASE = { SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'svc', STRIPE_WEBHOOK_SECRET: SECRET + ', ' + SECRET2 };
let mod;
const load = (env) => { globalThis.Deno = { env: { get: (k) => ({ ...BASE, ...env })[k] }, serve: (h) => { globalThis.__h = h; } }; const m = { exports: {} }; new Function('require', 'module', 'exports', js)(require, m, m.exports); mod = m.exports; };
load({});
const sign = (body, secret = SECRET, t = Math.floor(Date.now() / 1000)) => 't=' + t + ',v1=' + crypto.createHmac('sha256', secret).update(t + '.' + body).digest('hex');
const post = async (ev, sig, method = 'POST') => {
  const body = typeof ev === 'string' ? ev : JSON.stringify(ev);
  const r = await globalThis.__h(new Request('http://x/stripe-webhook', { method, headers: method === 'POST' ? { 'stripe-signature': sig === undefined ? sign(body) : sig } : {}, body: method === 'POST' ? body : undefined }));
  return { s: r.status, b: await r.json() };
};
const U = '11111111-2222-3333-4444-555555555555';
const NOW = Math.floor(Date.now() / 1000);
let n = 0;
const evt = (type, object, extra = {}) => ({ id: 'evt_T' + (++n), type, created: NOW, livemode: true, data: { object }, ...extra });
const session = (o) => ({ object: 'checkout.session', payment_status: 'paid', mode: 'subscription', currency: 'gbp', client_reference_id: U, customer: 'cus_1', subscription: 'sub_1', customer_details: { email: 'Pete@Example.com' }, ...o });
const last = () => calls[calls.length - 1];
const tb = (a) => a.p_tier + '/' + a.p_billing;

(async () => {
  // signatures
  const e1 = evt('checkout.session.completed', session({ payment_link: 'plink_1UWamD9mgKf6HntyUntyzIXi' }));
  let c0 = calls.length, r;
  r = await post(e1, ''); ok(r.s === 400 && calls.length === c0, 'no signature: refused, database untouched');
  r = await post(e1, 'garbage'); ok(r.s === 400 && calls.length === c0, 'a malformed signature is refused');
  r = await post(e1, sign(JSON.stringify(e1), 'whsec_wrong')); ok(r.s === 400 && calls.length === c0, 'a signature made with another secret is refused');
  r = await post(e1, sign(JSON.stringify(e1), SECRET, NOW - 600)); ok(r.s === 400 && calls.length === c0, 'a replayed request older than five minutes is refused');
  r = await post(e1, sign(JSON.stringify(e1) + ' ')); ok(r.s === 400 && calls.length === c0, 'a body changed after signing is refused');
  ok(await mod.verifySignature('{}', sign('{}'), [SECRET]) === true && await mod.verifySignature('{}', sign('{}'), []) === false, 'verifySignature: right secret passes, no secret fails');

  // checkout
  r = await post(e1);
  let a = last()[1];
  ok(r.s === 200 && last()[0] === 'stripe_apply' && a.p_event === e1.id && a.p_kind === 'checkout' && a.p_user === U, 'a signed, paid checkout is applied to the account in client_reference_id');
  ok(tb(a) === 'vaulter/month' && a.p_customer === 'cus_1' && a.p_sub === 'sub_1' && a.p_email === 'pete@example.com', 'the tester monthly link means Pioneer monthly; ids and e-mail (lower case) passed on');
  const days = (new Date(a.p_paid_until) - NOW * 1000) / 864e5; ok(days > 33 && days < 35, 'paid until about a month ahead until the subscription event brings the real date (' + days.toFixed(1) + ' days)');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWamF9mgKf6Hnty4WkoKDk4' })), sign(JSON.stringify(evt('x', {})), SECRET2));
  ok(r.s === 400, 'the signature must be of this exact body');
  const e2 = evt('checkout.session.completed', session({ payment_link: 'plink_1UWamF9mgKf6Hnty4WkoKDk4' }));
  r = await post(e2, sign(JSON.stringify(e2), SECRET2)); ok(r.s === 200 && tb(last()[1]) === 'pioneer/year', 'a second secret works while rotating; the tester yearly link means yearly');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWamU9mgKf6HntyFvzfNyKe', mode: 'payment', subscription: null, amount_total: 14900 })));
  a = last()[1]; ok(tb(a) === 'founder/once' && a.p_paid_until === null && a.p_sub === null, 'the Founding Member link: founder, no end date');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWeLX9mgKf6Hnty371EuOTR', mode: 'payment', subscription: null, amount_total: 9900 })));
  ok(tb(last()[1]) === 'founder/once' && last()[1].p_paid_until === null, 'the £99 tester Founding link: founder (31 Oct)');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWeLV9mgKf6HntypWOAliQr' })));
  ok(tb(last()[1]) === 'pioneer/year', 'the £39.99 tester yearly link: yearly (31 Oct)');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_new', metadata: { plan: 'pioneer_yearly' } })));
  ok(tb(last()[1]) === 'pioneer/year', 'a new link is understood from its metadata.plan');
  c0 = calls.length;
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_someone_else', metadata: {} })));
  ok(r.s === 200 && calls.length === c0, 'a payment for something that is not one of our plans changes nothing');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd', payment_status: 'unpaid' })));
  ok(r.s === 200 && calls.length === c0, 'an unpaid session (bank transfer still pending) changes nothing yet');
  r = await post(evt('checkout.session.async_payment_succeeded', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd' })));
  ok(calls.length === c0 + 1 && tb(last()[1]) === 'vaulter/month', 'it applies when the delayed payment succeeds');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd', client_reference_id: "x' or 1=1--", customer_details: { email: 'Signed.Out@Example.com' } })));
  ok(last()[1].p_user === null && last()[1].p_email === 'signed.out@example.com', 'a client_reference_id that is not an account id is dropped; the checkout e-mail is used instead');

  // subscriptions
  r = await post(evt('customer.subscription.updated', { id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'active', items: { data: [{ current_period_end: NOW + 30 * 86400, price: { id: 'price_1UWalr9mgKf6Hntyo8fCeWYH', recurring: { interval: 'month' } } }] } }));
  a = last()[1]; ok(a.p_kind === 'subscription' && a.p_sub === 'sub_1' && a.p_customer === 'cus_1' && a.p_status === 'active' && tb(a) === 'vaulter/month' && +new Date(a.p_paid_until) === (NOW + 30 * 86400) * 1000, 'a renewal passes the status, plan and real period end (newer API: on the item)');
  r = await post(evt('customer.subscription.updated', { id: 'sub_1', customer: { id: 'cus_1' }, status: 'past_due', current_period_end: NOW + 5, items: { data: [{ price: { id: 'price_other', recurring: { interval: 'year' } } }] } }));
  a = last()[1]; ok(a.p_status === 'past_due' && a.p_customer === 'cus_1' && a.p_tier === null && a.p_billing === null && +new Date(a.p_paid_until) === (NOW + 5) * 1000, 'older API shape (period end on the subscription, expanded customer) also works, and an unknown price with only an interval is not guessed into a tier');
  r = await post(evt('customer.subscription.deleted', { id: 'sub_1', customer: 'cus_1', status: 'canceled', ended_at: NOW - 10, items: { data: [{ current_period_end: NOW + 99 }] } }));
  a = last()[1]; ok(a.p_status === 'canceled' && +new Date(a.p_paid_until) === (NOW - 10) * 1000, 'a deleted subscription ends at its end date');

  // the 30-day trial links (card taken at checkout, nothing charged until day 31): as they are in Stripe, read 12 Nov 2026
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UYB4b9mgKf6HntyI7G9b61g', payment_status: 'no_payment_required', amount_total: 0, subscription: 'sub_trial', metadata: { plan: 'monthly', variant: 'founder_monthly_alpha_trial' } })));
  a = last()[1]; ok(r.s === 200 && a.p_kind === 'checkout' && tb(a) === 'vaulter/month' && a.p_user === U && a.p_sub === 'sub_trial', 'a monthly trial checkout (no payment yet) is applied to the account: a trial counts as on a plan');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UYB4d9mgKf6HntyxEOhC5nM', payment_status: 'no_payment_required', amount_total: 0, metadata: { plan: 'yearly', variant: 'pioneer_yearly_alpha_trial' } })));
  ok(r.s === 200 && tb(last()[1]) === 'pioneer/year', 'a yearly trial checkout is applied as yearly');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UYB4f9mgKf6HntyrxjivlM7', mode: 'payment', subscription: null, amount_total: 9900, metadata: { plan: 'founder', variant: 'lifetime_licence_tester' } })));
  ok(r.s === 200 && tb(last()[1]) === 'founder/once' && last()[1].p_paid_until === null, 'the Lifetime licence link in use today is applied as founder, no end date');
  r = await post(evt('customer.subscription.created', { id: 'sub_trial', customer: 'cus_1', status: 'trialing', metadata: { plan: 'monthly' }, items: { data: [{ current_period_end: NOW + 30 * 86400, price: { id: 'price_trial_unlisted', recurring: { interval: 'month' } } }] } }));
  a = last()[1]; ok(a.p_status === 'trialing' && tb(a) === 'vaulter/month' && +new Date(a.p_paid_until) === (NOW + 30 * 86400) * 1000, 'a trialing subscription passes its status, plan and the day the trial ends');

  // 13 Nov 2026: the new tiers and links (all still switched off in Stripe), read from our own ids, then from metadata
  const NEW = [
    ['plink_1UbPcb9mgKf6HntypiCAPDqz', 'vaulter/year', 'Vaulter yearly, beta'], ['plink_1UbPcd9mgKf6Hntyr33CGVez', 'vaulter/year', 'Vaulter yearly'],
    ['plink_1UbPce9mgKf6HntyylLXRFg6', 'vaulter/month', 'Vaulter monthly'], ['plink_1UbPcf9mgKf6HntyGNqI1QJ3', 'pioneer/month', 'Pioneer monthly, beta'],
    ['plink_1UbPcg9mgKf6HntyYjN02YOU', 'pioneer/month', 'Pioneer monthly'], ['plink_1UbPch9mgKf6Hnty5BRJAvVP', 'pioneer/year', 'Pioneer yearly'],
  ];
  for (const [link, want, name] of NEW) {
    r = await post(evt('checkout.session.completed', session({ payment_link: link, metadata: {} })));
    a = last()[1]; const days2 = (new Date(a.p_paid_until) - NOW * 1000) / 864e5;
    ok(r.s === 200 && tb(a) === want && a.p_plan === null && (want.endsWith('year') ? days2 > 367 && days2 < 369 : days2 > 33 && days2 < 35), 'new link, ' + name + ': ' + want + (want.endsWith('year') ? ', paid until a year and three days' : ', paid until a month and three days'));
  }
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UbPci9mgKf6HntyJ3SnYk84', mode: 'payment', subscription: null, amount_total: 19900, metadata: {} })));
  a = last()[1]; ok(tb(a) === 'founder/once' && a.p_paid_until === null && a.p_sub === null, 'new link, Founding Member £199: founder, once, no end date');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_unlisted_new', mode: 'payment', subscription: null, amount_total: 19900, currency: 'gbp', metadata: {} })));
  ok(tb(last()[1]) === 'founder/once', 'a one-off £199 payment is a Founding Member even from a link we did not list');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_unlisted_new', metadata: { tier: 'vaulter', interval: 'year', stage: 'beta' } })));
  ok(tb(last()[1]) === 'vaulter/year', 'a link we did not list is read from its metadata.tier and metadata.interval (a yearly Vaulter is not a Pioneer)');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_unlisted_new', metadata: { tier: 'pioneer', interval: 'month', stage: 'after_beta' } })));
  ok(tb(last()[1]) === 'pioneer/month', 'and a monthly Pioneer is not a Vaulter');
  c0 = calls.length;
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_unlisted_new', metadata: { tier: 'gold', interval: 'week' } })));
  ok(r.s === 200 && calls.length === c0, 'a tier or interval we do not sell changes nothing');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_unlisted_new', metadata: { tier: 'pioneer' } })));
  ok(r.s === 200 && calls.length === c0, 'a tier with no billing period changes nothing (half a pair is not trusted)');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_unlisted_new', metadata: { tier: 'pioneer', interval: 'once' } })));
  ok(r.s === 200 && calls.length === c0, 'nor does a Pioneer or Vaulter billed "once"');
  // our own id table wins over metadata
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWamA9mgKf6HntyEUGFyoUl', metadata: { tier: 'vaulter', interval: 'year' } })));
  ok(tb(last()[1]) === 'pioneer/year', 'a link we know is read by our own table before any metadata');
  // subscriptions: price id, subscription metadata, price metadata
  const subEv = (o) => evt('customer.subscription.updated', { id: 'sub_n', object: 'subscription', customer: 'cus_1', status: 'active', current_period_end: NOW + 30 * 86400, ...o });
  r = await post(subEv({ items: { data: [{ price: { id: 'price_1UbPba9mgKf6HntyQlYl332s', recurring: { interval: 'year' } } }] } }));
  a = last()[1]; ok(tb(a) === 'vaulter/year' && a.p_status === 'active', 'subscription: the Vaulter yearly beta price id means Vaulter, yearly');
  r = await post(subEv({ items: { data: [{ price: { id: 'price_1UbPbu9mgKf6HntyyTMlEK8Y', recurring: { interval: 'month' } } }] } }));
  ok(tb(last()[1]) === 'pioneer/month', 'subscription: the Pioneer monthly beta price id means Pioneer, monthly');
  r = await post(subEv({ metadata: { tier: 'vaulter', interval: 'year', stage: 'beta' }, items: { data: [{ price: { id: 'price_unlisted', recurring: { interval: 'year' } } }] } }));
  ok(tb(last()[1]) === 'vaulter/year', 'subscription: an unlisted price is read from the subscription’s metadata');
  r = await post(subEv({ items: { data: [{ price: { id: 'price_unlisted', recurring: { interval: 'month' }, metadata: { tier: 'pioneer', interval: 'month' } } }] } }));
  ok(tb(last()[1]) === 'pioneer/month', 'subscription: or from the price’s metadata');
  r = await post(subEv({ items: { data: [{ price: { id: 'price_unlisted', recurring: { interval: 'year' } } }] } }));
  a = last()[1]; ok(r.s === 200 && a.p_tier === null && a.p_billing === null && a.p_status === 'active', 'subscription: with no tier information the status and dates still go through and no tier is guessed');
  for (const [pid, want] of [['price_1UbPba9mgKf6HntyQlYl332s', 'vaulter/year'], ['price_1UbPbs9mgKf6HntyDoAyhjYq', 'vaulter/year'], ['price_1UbPbt9mgKf6HntyB1fL72qQ', 'vaulter/month'], ['price_1UbPbu9mgKf6HntyyTMlEK8Y', 'pioneer/month'], ['price_1UbPbv9mgKf6HntyGcpvBozA', 'pioneer/month'], ['price_1UbPbw9mgKf6HntyJ3es3svT', 'pioneer/year']]) {
    r = await post(subEv({ items: { data: [{ price: { id: pid, recurring: { interval: want.endsWith('year') ? 'year' : 'month' } } }] } }));
    ok(tb(last()[1]) === want, 'subscription: price id ' + pid.slice(-6) + ' means ' + want);
  }
  r = await post(subEv({ items: { data: [{ price: { id: 'price_1UbPbx9mgKf6HntyjUxaM42U', recurring: null } }] } }));
  ok(last()[1].p_tier === null, 'a subscription event never makes anyone a founder');
  r = await post(subEv({ metadata: { plan: 'yearly' }, items: { data: [{ price: { id: 'price_unlisted' } }] } }));
  ok(tb(last()[1]) === 'pioneer/year', 'subscription: the old metadata.plan names still read as before (yearly = Pioneer yearly)');

  // everything else
  c0 = calls.length;
  r = await post(evt('invoice.created', { id: 'in_1' })); ok(r.s === 200 && calls.length === c0, 'other event types are acknowledged and ignored');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd' }), { livemode: false })); ok(r.s === 200 && calls.length === c0, 'test-mode events are ignored on the live endpoint');
  r = await post('{"id":"nope"}'); ok(r.s === 400 && calls.length === c0, 'a signed body that is not an event is refused');
  r = await post({ ok: 1 }, undefined, 'GET'); ok(r.s === 405, 'only POST');
  dbFail = true; r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd' }))); dbFail = false;
  ok(r.s === 500, 'if the database is down Stripe is told to retry (500)');
  load({ STRIPE_ALLOW_TEST: '1' });
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd' }), { livemode: false })); ok(r.s === 200 && calls.length === c0 + 2, 'test-mode events apply only when STRIPE_ALLOW_TEST = 1 (for a test project)');
  load({ STRIPE_WEBHOOK_SECRET: '' });
  r = await post(evt('checkout.session.completed', session({}))); ok(r.s === 500 && calls.length === c0 + 2, 'with no secret set it refuses everything rather than trusting unsigned calls');
  console.log(fails ? '\nFAILURES ' + fails : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
