// Migration 011 on a real Postgres (pglite): the browser cannot make itself paid, Stripe events apply once and in order,
// confirmed waitlist addresses are beta testers, existing paid rows are kept, erasing an account unlinks its events.
// Run: node tests/test_011.mjs   (needs @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite'; import fs from 'fs';
const dir = new URL('../supabase/migrations/', import.meta.url).pathname;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const db = new PGlite();
const U = '11111111-1111-1111-1111-111111111111', V = '22222222-2222-2222-2222-222222222222', W = '33333333-3333-3333-3333-333333333333', X = '44444444-4444-4444-4444-444444444444';
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select '${U}'::uuid $$;
grant usage on schema public to anon, authenticated, service_role;`);
const run = async (f) => { try { await db.exec(fs.readFileSync(dir + f, 'utf8')); return true; } catch (e) { fails++; console.log('FAIL: ' + f + ' — ' + e.message); return false; } };
for (const f of ['001_vault_schema.sql', '002_waitlist.sql', '003_waitlist_count_fn.sql', '004_user_pins.sql', '005_vision_usage.sql', '006_vault_history.sql', '008_auth_rate_limit.sql', '009_waitlist_optin.sql', '010_vision_monthly.sql']) await run(f);
await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;`);
const q = async (s, p) => (await db.query(s, p)).rows;
const prof = async (id) => (await q('select * from public.profiles where id = $1', [id]))[0];

// before 011: U claimed Pioneer from the browser (the old way), V is a plain account, W confirmed on the waitlist
await db.exec(`insert into auth.users values ('${U}','pete@example.com'), ('${V}','vee@example.com');
  update public.profiles set is_pioneer = true where id = '${U}';
  insert into public.waitlist(email, status, confirmed_at) values ('wes@example.com', 'confirmed', now()), ('pend@example.com', 'pending', null);`);
ok(await run('011_paid_gateway.sql'), 'migration 011 runs');
ok(await run('011_paid_gateway.sql'), 'the migration can be run twice');
await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role; revoke all on public.stripe_events from anon, authenticated;`);
let p = await prof(U);
ok(p.is_pioneer === true && p.plan === null && p.is_beta === false, 'existing self-declared paid rows are kept for Pete to reconcile (nothing cleared)');

// the browser
await db.exec(`set role authenticated; update public.profiles set name = 'Pete', is_pioneer = false, is_founder = true, plan = 'founder', paid_until = now() + interval '9 years', is_beta = true, stripe_customer_id = 'cus_evil' where id = '${U}'; reset role;`);
p = await prof(U);
ok(p.name === 'Pete', 'the browser can still update its own profile (name)');
ok(p.is_pioneer === true && p.is_founder === false && p.plan === null && p.paid_until === null && p.is_beta === false && p.stripe_customer_id === null, 'but every paid and tester column is left as it was');
await db.exec(`set role authenticated; insert into public.profiles(id, name, is_pioneer, is_founder, plan) values ('${U}', 'Pete2', true, true, 'founder') on conflict (id) do update set name = excluded.name, is_pioneer = excluded.is_pioneer, is_founder = excluded.is_founder, plan = excluded.plan; reset role;`);
p = await prof(U);
ok(p.name === 'Pete2' && p.is_founder === false && p.plan === null, 'the app’s upsert (insert … on conflict update) cannot set paid columns either');
await db.exec(`update public.profiles set is_pioneer = false where id = '${U}'`);   // Pete reconciles: not a payer after all
await db.exec(`set role authenticated; delete from public.profiles where id = '${U}'; insert into public.profiles(id, is_pioneer, is_founder, plan, is_beta) values ('${U}', true, true, 'founder', true); reset role;`);
p = await prof(U);
ok(p && p.is_pioneer === false && p.is_founder === false && p.plan === null && p.is_beta === false, 'a fresh row inserted by the browser starts unpaid whatever it claims');
let denied = 0;
for (const sql of [`select public.stripe_apply('evt_x', now(), 'checkout', '${U}', null, null, null, 'founder', null, null)`, `select * from public.stripe_events`, `insert into public.stripe_events(id, kind, created) values ('evt_y','checkout',now())`]) {
  for (const role of ['anon', 'authenticated']) { try { await db.exec(`set role ${role}; ${sql};`); } catch (e) { denied++; } await db.exec('reset role'); }
}
ok(denied === 6, 'the browser roles cannot call stripe_apply or touch stripe_events (' + denied + '/6 refused)');
ok((await prof(U)).is_founder === false, 'so nothing changed');

// Stripe, through the service role
const apply = async (a) => { await db.exec('set role service_role'); try { return (await q('select public.stripe_apply($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) r', [a.ev, a.at, a.kind, a.user || null, a.email || null, a.cus || null, a.sub || null, a.plan || null, a.status || null, a.until || null]))[0].r; } finally { await db.exec('reset role'); } };
const t = (s) => new Date(Date.UTC(2026, 10, 1, 12, 0, s)).toISOString();
ok(await apply({ ev: 'evt_1', at: t(10), kind: 'checkout', user: U, cus: 'cus_U', sub: 'sub_U1', plan: 'monthly', until: '2026-12-04T12:00:00Z' }) === 'applied', 'checkout for the account in client_reference_id is applied');
p = await prof(U);
ok(p.is_pioneer === true && p.plan === 'monthly' && p.stripe_customer_id === 'cus_U' && p.stripe_subscription_id === 'sub_U1' && p.paid_at && +new Date(p.paid_until) === +new Date('2026-12-04T12:00:00Z'), 'Pioneer monthly, ids and dates recorded');
ok(await apply({ ev: 'evt_1', at: t(10), kind: 'checkout', user: U, plan: 'founder' }) === 'duplicate' && (await prof(U)).plan === 'monthly', 'the same event delivered twice is applied once');
ok(await apply({ ev: 'evt_0', at: t(5), kind: 'subscription', sub: 'sub_U1', cus: 'cus_U', status: 'incomplete' }) === 'stale' && (await prof(U)).is_pioneer === true, 'an older event arriving late is skipped');
ok(await apply({ ev: 'evt_1b', at: t(10), kind: 'subscription', sub: 'sub_U1', cus: 'cus_U', status: 'incomplete' }) === 'applied' && (await prof(U)).is_pioneer === true, 'a subscription still taking its first payment (incomplete, same second) does not take access away');
ok(await apply({ ev: 'evt_2', at: t(20), kind: 'subscription', sub: 'sub_U1', cus: 'cus_U', status: 'active', until: '2026-12-01T12:00:00Z' }) === 'applied' && +new Date((await prof(U)).paid_until) === +new Date('2026-12-01T12:00:00Z'), 'a subscription update sets the real period end');
ok(await apply({ ev: 'evt_3', at: t(30), kind: 'subscription', sub: 'sub_OLD', cus: 'cus_U', status: 'canceled' }) === 'other_subscription' && (await prof(U)).is_pioneer === true, 'an old subscription ending does not cancel the current one');
ok(await apply({ ev: 'evt_4', at: t(40), kind: 'subscription', sub: 'sub_U1', status: 'past_due' }) === 'applied' && (await prof(U)).is_pioneer === true, 'a late payment (past_due) keeps access while Stripe retries');
ok(await apply({ ev: 'evt_5', at: t(50), kind: 'subscription', sub: 'sub_U1', status: 'canceled', until: t(50) }) === 'applied' && (await prof(U)).is_pioneer === false, 'a cancelled subscription ends paid status');
ok((await q(`select user_id, result from public.stripe_events where id = 'evt_5'`))[0].user_id === U, 'events record which account they touched');

// Founding Member, matched by e-mail when the buyer was signed out
ok(await apply({ ev: 'evt_6', at: t(60), kind: 'checkout', email: 'VEE@example.com', cus: 'cus_V', plan: 'founder' }) === 'applied', 'a checkout without an account id matches the account by e-mail');
p = await prof(V);
ok(p.is_founder === true && p.is_pioneer === true && p.plan === 'founder' && p.paid_until === null, 'Founding Member: founder, Pioneer, no end date');
ok(await apply({ ev: 'evt_7', at: t(70), kind: 'subscription', cus: 'cus_V', sub: 'sub_V', status: 'canceled' }) === 'applied' && (await prof(V)).is_pioneer === true && (await prof(V)).plan === 'founder', 'a founder stays paid whatever later subscriptions do');
ok(await apply({ ev: 'evt_8', at: t(80), kind: 'checkout', email: 'nobody@example.com', plan: 'monthly' }) === 'no_user', 'a payment no account matches is recorded, not lost');
ok((await q(`select email, result from public.stripe_events where id = 'evt_8'`))[0].email === 'nobody@example.com', 'with the checkout e-mail kept so Pete can reconcile');
ok(await apply({ ev: 'evt_9', at: t(90), kind: 'checkout', user: V, plan: 'gold-plated' }) === 'applied' && (await prof(V)).plan === 'founder', 'an unknown plan name is ignored');
let threw = false; try { await apply({ ev: 'evt_10', at: t(95), kind: 'refund', user: V }); } catch (e) { threw = true; } ok(threw, 'unknown event kinds are refused');

// beta testers
await db.exec(`insert into auth.users values ('${W}','Wes@Example.com'), ('${X}','pend@example.com')`);
ok((await prof(W)).is_beta === true, 'an account whose address confirmed on the waitlist is a beta tester');
ok((await prof(X)).is_beta === false && (await prof(U)).is_beta === false, 'pending or absent addresses are not');
await db.exec(`update public.waitlist set status = 'confirmed', confirmed_at = now() where email = 'pend@example.com'`);
ok((await prof(X)).is_beta === true, 'confirming the address later makes the account a tester');
await db.exec(`update public.waitlist set status = 'unsubscribed' where email = 'pend@example.com'`);
ok((await prof(X)).is_beta === true, 'leaving the marketing list does not take the tester price away');

// the owner can still correct a row by hand (SQL editor / reconcile)
await db.exec(`update public.profiles set is_pioneer = true, plan = 'yearly' where id = '${X}'`);
ok((await prof(X)).plan === 'yearly', 'the owner can still set paid status by hand');

// erase
await db.exec(`select public.erase_user_data('${V}', 'vee@example.com'); select public.erase_user_data('${W}', 'nobody@example.com')`);
ok(!(await prof(V)), 'erasing removes the profile');
const ev = await q(`select id, user_id, email from public.stripe_events where id in ('evt_6','evt_7','evt_8','evt_9') order by id`);
ok(ev.every((r) => r.user_id === null && r.email === null), 'and unlinks the person from their Stripe events (by account and by e-mail)');
ok(await apply({ ev: 'evt_6', at: t(60), kind: 'checkout', email: 'vee@example.com', plan: 'founder' }) === 'duplicate', 'a replayed event after erasure is still a duplicate');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
