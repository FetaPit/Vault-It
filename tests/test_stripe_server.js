// stripe-webhook: nothing is read before the Stripe signature checks out; plans come from our own links and prices;
// unpaid, unknown and test-mode events change nothing; a database failure asks Stripe to retry.
// The database side (stripe_apply: once only, stale events, founders, testers) is tested on a real Postgres in test_011.mjs.
const fs = require('fs'); const esbuild = require('esbuild'); const crypto = require('crypto');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
let src = fs.readFileSync('/home/user/Vault-It/supabase/functions/stripe-webhook/index.ts', 'utf8');
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
  ok(a.p_plan === 'monthly' && a.p_customer === 'cus_1' && a.p_sub === 'sub_1' && a.p_email === 'pete@example.com', 'the tester monthly link means Pioneer monthly; ids and e-mail (lower case) passed on');
  const days = (new Date(a.p_paid_until) - NOW * 1000) / 864e5; ok(days > 33 && days < 35, 'paid until about a month ahead until the subscription event brings the real date (' + days.toFixed(1) + ' days)');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWamF9mgKf6Hnty4WkoKDk4' })), sign(JSON.stringify(evt('x', {})), SECRET2));
  ok(r.s === 400, 'the signature must be of this exact body');
  const e2 = evt('checkout.session.completed', session({ payment_link: 'plink_1UWamF9mgKf6Hnty4WkoKDk4' }));
  r = await post(e2, sign(JSON.stringify(e2), SECRET2)); ok(r.s === 200 && last()[1].p_plan === 'yearly', 'a second secret works while rotating; the tester yearly link means yearly');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWamU9mgKf6HntyFvzfNyKe', mode: 'payment', subscription: null, amount_total: 14900 })));
  a = last()[1]; ok(a.p_plan === 'founder' && a.p_paid_until === null && a.p_sub === null, 'the Founding Member link: founder, no end date');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWeLX9mgKf6Hnty371EuOTR', mode: 'payment', subscription: null, amount_total: 9900 })));
  ok(last()[1].p_plan === 'founder' && last()[1].p_paid_until === null, 'the £99 tester Founding link: founder (31 Oct)');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1UWeLV9mgKf6HntypWOAliQr' })));
  ok(last()[1].p_plan === 'yearly', 'the £39.99 tester yearly link: yearly (31 Oct)');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_new', metadata: { plan: 'pioneer_yearly' } })));
  ok(last()[1].p_plan === 'yearly', 'a new link is understood from its metadata.plan');
  c0 = calls.length;
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_someone_else', metadata: {} })));
  ok(r.s === 200 && calls.length === c0, 'a payment for something that is not one of our plans changes nothing');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd', payment_status: 'unpaid' })));
  ok(r.s === 200 && calls.length === c0, 'an unpaid session (bank transfer still pending) changes nothing yet');
  r = await post(evt('checkout.session.async_payment_succeeded', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd' })));
  ok(calls.length === c0 + 1 && last()[1].p_plan === 'monthly', 'it applies when the delayed payment succeeds');
  r = await post(evt('checkout.session.completed', session({ payment_link: 'plink_1TdPyE9mgKf6HntyJ3h5SAhd', client_reference_id: "x' or 1=1--", customer_details: { email: 'Signed.Out@Example.com' } })));
  ok(last()[1].p_user === null && last()[1].p_email === 'signed.out@example.com', 'a client_reference_id that is not an account id is dropped; the checkout e-mail is used instead');

  // subscriptions
  r = await post(evt('customer.subscription.updated', { id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'active', items: { data: [{ current_period_end: NOW + 30 * 86400, price: { id: 'price_1UWalr9mgKf6Hntyo8fCeWYH', recurring: { interval: 'month' } } }] } }));
  a = last()[1]; ok(a.p_kind === 'subscription' && a.p_sub === 'sub_1' && a.p_customer === 'cus_1' && a.p_status === 'active' && a.p_plan === 'monthly' && +new Date(a.p_paid_until) === (NOW + 30 * 86400) * 1000, 'a renewal passes the status, plan and real period end (newer API: on the item)');
  r = await post(evt('customer.subscription.updated', { id: 'sub_1', customer: { id: 'cus_1' }, status: 'past_due', current_period_end: NOW + 5, items: { data: [{ price: { id: 'price_other', recurring: { interval: 'year' } } }] } }));
  a = last()[1]; ok(a.p_status === 'past_due' && a.p_customer === 'cus_1' && a.p_plan === 'yearly' && +new Date(a.p_paid_until) === (NOW + 5) * 1000, 'older API shape (period end on the subscription, expanded customer) also works');
  r = await post(evt('customer.subscription.deleted', { id: 'sub_1', customer: 'cus_1', status: 'canceled', ended_at: NOW - 10, items: { data: [{ current_period_end: NOW + 99 }] } }));
  a = last()[1]; ok(a.p_status === 'canceled' && +new Date(a.p_paid_until) === (NOW - 10) * 1000, 'a deleted subscription ends at its end date');

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
