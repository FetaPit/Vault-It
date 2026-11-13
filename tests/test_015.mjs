// Migration 015 on a real Postgres (pglite): a payment records its tier (Vaulter, Pioneer, Lifetime) and billing period (month, year,
// once) separately (owner, 13 Nov 2026: Vaulter is the standard tier and Pioneer the Pro tier, each monthly or yearly), the old plan
// column stays as a mirror for older app builds, existing accounts keep their meaning, accounts already on Vaulter when the migration
// is applied keep the Pro features while they stay subscribed ("Gate, testers keep"), and the browser still cannot write any of it.
// Run: node tests/test_015.mjs   (needs @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite'; import fs from 'fs'; import { fileURLToPath } from 'url';
const dir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const db = new PGlite();
const U = '11111111-1111-1111-1111-111111111111', V = '22222222-2222-2222-2222-222222222222', W = '33333333-3333-3333-3333-333333333333',
  X = '44444444-4444-4444-4444-444444444444', Y = '55555555-5555-5555-5555-555555555555', Z = '66666666-6666-6666-6666-666666666666', Q = '77777777-7777-7777-7777-777777777777';
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select '${U}'::uuid $$;
grant usage on schema public to anon, authenticated, service_role;`);
const run = async (f) => { try { await db.exec(fs.readFileSync(dir + f, 'utf8')); return true; } catch (e) { fails++; console.log('FAIL: ' + f + ' — ' + e.message); return false; } };
for (const f of ['001_vault_schema.sql', '002_waitlist.sql', '003_waitlist_count_fn.sql', '004_user_pins.sql', '005_vision_usage.sql', '006_vault_history.sql', '008_auth_rate_limit.sql', '009_waitlist_optin.sql', '010_vision_monthly.sql', '011_paid_gateway.sql']) await run(f);
await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role; revoke all on public.stripe_events from anon, authenticated;`);
const q = async (s, p) => (await db.query(s, p)).rows;
const prof = async (id) => (await q('select * from public.profiles where id = $1', [id]))[0];

// the database as it is today (migration 011 applied, one plan value): U Vaulter monthly and paid, V Pioneer yearly and paid,
// W Lifetime, X a plain account, Y a Vaulter monthly who has cancelled, Z paid with no plan recorded (an earlier buyer)
await db.exec(`insert into auth.users values ('${U}','u@example.com'), ('${V}','v@example.com'), ('${W}','w@example.com'), ('${X}','x@example.com'), ('${Y}','y@example.com'), ('${Z}','z@example.com'), ('${Q}','q@example.com');
  update public.profiles set is_pioneer = true, plan = 'monthly', stripe_subscription_id = 'sub_U', stripe_customer_id = 'cus_U' where id = '${U}';
  update public.profiles set is_pioneer = true, plan = 'yearly',  stripe_subscription_id = 'sub_V', stripe_customer_id = 'cus_V' where id = '${V}';
  update public.profiles set is_pioneer = true, is_founder = true, plan = 'founder' where id = '${W}';
  update public.profiles set is_pioneer = false, plan = 'monthly', stripe_subscription_id = 'sub_Y_old', stripe_customer_id = 'cus_Y' where id = '${Y}';
  update public.profiles set is_pioneer = true, plan = null where id = '${Z}';
  update public.profiles set is_pioneer = true, is_founder = true, plan = 'monthly' where id = '${Q}';`);   // a Lifetime holder marked by hand, plan left as monthly
ok(await run('015_plan_tier.sql'), 'migration 015 runs');
ok(await run('015_plan_tier.sql'), 'the migration can be run twice');
await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role; revoke all on public.stripe_events from anon, authenticated;`);

// existing accounts keep their meaning
let p = await prof(U);
ok(p.tier === 'vaulter' && p.billing === 'month' && p.plan === 'monthly', 'an account on the monthly plan reads as Vaulter, monthly (plan unchanged)');
p = await prof(V);
ok(p.tier === 'pioneer' && p.billing === 'year' && p.plan === 'yearly', 'an account on the yearly plan reads as Pioneer, yearly');
p = await prof(W);
ok(p.tier === 'founder' && p.billing === 'once' && p.plan === 'founder', 'a Lifetime licence reads as founder, once');
p = await prof(X);
ok(p.tier === null && p.billing === null && p.plan === null && p.pro_kept === false, 'an unpaid account has no tier');
p = await prof(Z);
ok(p.is_pioneer === true && p.tier === null, 'a paid account with no plan recorded is left alone (the app counts it as before)');
p = await prof(Q);
ok(p.tier === 'founder' && p.billing === 'once' && p.pro_kept === false, 'a Lifetime holder is a founder whatever plan was recorded by hand, and needs no flag');
// who keeps the Pro features: accounts on Vaulter, paid, when 015 is applied
ok((await prof(U)).pro_kept === true, 'an account already on Vaulter when 015 is applied keeps the Pro features (the testers keep)');
ok((await prof(V)).pro_kept === false && (await prof(W)).pro_kept === false && (await prof(X)).pro_kept === false, 'Pioneer, Lifetime and unpaid accounts do not need the flag');
ok((await prof(Y)).tier === 'vaulter' && (await prof(Y)).pro_kept === false, 'a Vaulter who had already cancelled does not keep it (nothing to keep while not subscribed)');
await db.exec(`update public.profiles set pro_kept = false where id = '${U}'`); await run('015_plan_tier.sql');
ok((await prof(U)).pro_kept === false, 'running the migration again does not hand the flag out again');
await db.exec(`update public.profiles set pro_kept = true where id = '${U}'`);

// constraints
let bad = 0;
for (const s of [`update public.profiles set tier = 'gold' where id = '${X}'`, `update public.profiles set billing = 'weekly' where id = '${X}'`]) { try { await db.exec(s); } catch (e) { bad++; } }
ok(bad === 2, 'a tier or billing value we do not sell is refused (' + bad + '/2)');

// the browser cannot write any of it
await db.exec(`set role authenticated; update public.profiles set name = 'Xena', tier = 'pioneer', billing = 'year', pro_kept = true where id = '${U}'; reset role;`);
p = await prof(U);
ok(p.tier === 'vaulter' && p.billing === 'month' && p.pro_kept === true, 'the browser cannot change tier or billing (left as they were)');
// (the browser in this test is U: auth.uid() answers U, so row security lets U touch only U)
await db.exec(`update public.profiles set tier = null, billing = null, pro_kept = false, is_pioneer = false, plan = null where id = '${U}'`);   // U, unpaid for a moment
await db.exec(`set role authenticated; update public.profiles set tier = 'pioneer', billing = 'month', pro_kept = true where id = '${U}'; reset role;`);
p = await prof(U);
ok(p.tier === null && p.billing === null && p.pro_kept === false, 'nor give an unpaid account a tier or the flag');
await db.exec(`set role authenticated; delete from public.profiles where id = '${U}'; insert into public.profiles(id, is_pioneer, tier, billing, pro_kept) values ('${U}', true, 'pioneer', 'year', true); reset role;`);
p = await prof(U);
ok(p && p.is_pioneer === false && p.tier === null && p.billing === null && p.pro_kept === false, 'a fresh row inserted by the browser starts with no tier whatever it claims');
await db.exec(`update public.profiles set is_pioneer = true, plan = 'monthly', tier = 'vaulter', billing = 'month', pro_kept = true, stripe_subscription_id = 'sub_U', stripe_customer_id = 'cus_U' where id = '${U}'`);   // back to a paying tester
let denied = 0;
for (const role of ['anon', 'authenticated']) { try { await db.exec(`set role ${role}; select public.stripe_apply('evt_x', now(), 'checkout', '${U}', null, null, null, null, null, null, 'pioneer', 'year');`); } catch (e) { denied++; } await db.exec('reset role'); }
ok(denied === 2, 'the browser roles still cannot call stripe_apply (' + denied + '/2 refused)');

// Stripe, through the service role
const apply = async (a) => { await db.exec('set role service_role'); try { return (await q('select public.stripe_apply($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) r', [a.ev, a.at, a.kind, a.user || null, a.email || null, a.cus || null, a.sub || null, a.plan || null, a.status || null, a.until || null, a.tier || null, a.billing || null]))[0].r; } finally { await db.exec('reset role'); } };
const t = (s) => new Date(Date.UTC(2026, 10, 14, 12, 0, s)).toISOString();
const U1 = '2027-01-01T12:00:00Z';

// the four paid combinations of the 13 Nov model, and what an older app build reads in plan
const combos = [
  { who: X, tier: 'vaulter', billing: 'month', mirror: 'monthly' },
  { who: X, tier: 'vaulter', billing: 'year', mirror: 'monthly' },
  { who: X, tier: 'pioneer', billing: 'month', mirror: 'yearly' },
  { who: X, tier: 'pioneer', billing: 'year', mirror: 'yearly' },
];
let sec = 100, k = 0;
for (const c of combos) {
  const sub = 'sub_X' + (++k);
  ok(await apply({ ev: 'evt_c' + k, at: t(sec += 10), kind: 'checkout', user: c.who, cus: 'cus_X', sub, tier: c.tier, billing: c.billing, until: U1 }) === 'applied', 'checkout: ' + c.tier + ' ' + c.billing + ' is applied');
  p = await prof(c.who);
  ok(p.is_pioneer === true && p.tier === c.tier && p.billing === c.billing && p.plan === c.mirror, '  tier and billing are recorded as sold, and plan mirrors for an older build as ' + c.mirror + ' (' + p.tier + ' / ' + p.billing + ' / ' + p.plan + ')');
  ok(p.pro_kept === false, '  a new Vaulter or Pioneer does not get the testers’ flag');
}
// Vaulter yearly is not Pioneer: the very mistake the interval guess would make
await apply({ ev: 'evt_vy', at: t(sec += 10), kind: 'checkout', user: X, cus: 'cus_X', sub: 'sub_XV', tier: 'vaulter', billing: 'year', until: U1 });
ok((await prof(X)).tier === 'vaulter' && (await prof(X)).plan === 'monthly', 'a yearly Vaulter is Vaulter, not Pioneer (the old yearly = Pioneer reading is gone)');

// subscription events: status and dates follow, tier follows when given and is kept when not
ok(await apply({ ev: 'evt_s1', at: t(sec += 10), kind: 'subscription', sub: 'sub_XV', cus: 'cus_X', status: 'trialing', until: '2026-12-14T12:00:00Z' }) === 'applied', 'a subscription event with no tier information applies');
p = await prof(X);
ok(p.tier === 'vaulter' && p.billing === 'year' && +new Date(p.paid_until) === +new Date('2026-12-14T12:00:00Z') && p.is_pioneer === true, 'and leaves the tier alone, never guessing it from the interval');
ok(await apply({ ev: 'evt_s2', at: t(sec += 10), kind: 'subscription', sub: 'sub_XV', cus: 'cus_X', status: 'active', tier: 'pioneer', billing: 'year', until: U1 }) === 'applied' && (await prof(X)).tier === 'pioneer' && (await prof(X)).plan === 'yearly', 'a plan change (Vaulter to Pioneer) arrives with its tier and is recorded');
ok(await apply({ ev: 'evt_s3', at: t(sec += 10), kind: 'subscription', sub: 'sub_XV', cus: 'cus_X', status: 'canceled', until: t(sec) }) === 'applied' && (await prof(X)).is_pioneer === false && (await prof(X)).tier === 'pioneer', 'a cancelled subscription ends paid status and keeps the record of what it was');

// the testers keep, while they stay subscribed
ok(await apply({ ev: 'evt_u1', at: t(sec += 10), kind: 'subscription', sub: 'sub_U', cus: 'cus_U', status: 'active', until: U1 }) === 'applied' && (await prof(U)).pro_kept === true, 'a renewal of an existing Vaulter keeps the flag');
ok(await apply({ ev: 'evt_u2', at: t(sec += 10), kind: 'checkout', user: U, cus: 'cus_U', sub: 'sub_U', tier: 'vaulter', billing: 'month', until: U1 }) === 'applied' && (await prof(U)).pro_kept === true, 'the same subscription’s checkout event replayed with another id keeps it too');
ok(await apply({ ev: 'evt_u3', at: t(sec += 10), kind: 'subscription', sub: 'sub_U', cus: 'cus_U', status: 'canceled', until: t(sec) }) === 'applied' && (await prof(U)).is_pioneer === false, 'cancelling ends the plan');
ok(await apply({ ev: 'evt_u4', at: t(sec += 10), kind: 'checkout', user: U, cus: 'cus_U', sub: 'sub_U_new', tier: 'vaulter', billing: 'month', until: U1 }) === 'applied' && (await prof(U)).pro_kept === false, 'choosing Vaulter again after cancelling is a new subscription: the flag is gone (they keep it only while they stay subscribed)');

// the old callers: ten arguments, plan names only (tests, an old deploy of the webhook)
await db.exec('set role service_role');
const old = (await q(`select public.stripe_apply('evt_old1', $1, 'checkout', '${V}', null, null, 'sub_V', 'monthly', null, null) r`, [t(sec += 10)]))[0].r; await db.exec('reset role');
p = await prof(V);
ok(old === 'applied' && p.plan === 'monthly' && p.tier === 'vaulter' && p.billing === 'month', 'a call with the old ten arguments still works and fills tier and billing from plan');
await db.exec('set role service_role');
await q(`select public.stripe_apply('evt_old2', $1, 'checkout', '${W}', null, null, null, 'founder', null, null) r`, [t(sec += 10)]); await db.exec('reset role');
p = await prof(W);
ok(p.tier === 'founder' && p.billing === 'once' && p.is_founder === true && p.paid_until === null, 'Lifetime through the old call: founder, once, no end date');
// Lifetime through the new call, and Lifetime stays whatever later subscriptions do
ok(await apply({ ev: 'evt_f1', at: t(sec += 10), kind: 'checkout', user: Z, cus: 'cus_Z', tier: 'founder', billing: 'once' }) === 'applied', 'a Founding Member payment is applied');
p = await prof(Z);
ok(p.is_founder === true && p.tier === 'founder' && p.billing === 'once' && p.plan === 'founder' && p.paid_until === null, 'founder, once, no end date');
ok(await apply({ ev: 'evt_f2', at: t(sec += 10), kind: 'subscription', cus: 'cus_Z', sub: 'sub_Z', status: 'canceled', tier: 'vaulter', billing: 'month' }) === 'applied' && (await prof(Z)).tier === 'founder' && (await prof(Z)).is_pioneer === true, 'a founder stays a founder whatever later subscriptions do');
// values we do not sell are ignored, as an unknown plan name always was
ok(await apply({ ev: 'evt_g1', at: t(sec += 10), kind: 'checkout', user: Y, cus: 'cus_Y', sub: 'sub_Y', tier: 'gold', billing: 'weekly', plan: 'monthly', until: U1 }) === 'applied' && (await prof(Y)).tier === 'vaulter' && (await prof(Y)).billing === 'month', 'an unknown tier or billing value is ignored (the old plan name still counts)');

// a checkout with no usable tier does not crash (the whole call used to roll back on a null founder flag)
const before = await prof(X);
await db.exec('set role service_role');
let nt; try { nt = (await q(`select public.stripe_apply('evt_nt1', $1, 'checkout', '${X}', null, 'cus_X', 'sub_X', null, null, null, null, null) r`, [t(sec += 10)]))[0].r; } catch (e) { nt = 'ERROR ' + e.message; }
await db.exec('reset role');
ok(nt === 'applied' && (await prof(X)).tier === before.tier && (await prof(X)).billing === before.billing && (await prof(X)).is_founder === false, 'a checkout with no usable tier is applied without touching the tier, and does not error (' + nt + ')');

console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
