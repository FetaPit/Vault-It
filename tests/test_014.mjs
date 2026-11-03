// Migration 014 on a real Postgres (pglite): campaign_counts() gives aggregate counts per paid plan and no personal data.
// Run: node tests/test_014.mjs   (needs @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite'; import fs from 'fs';
const dir = new URL('../supabase/migrations/', import.meta.url).pathname;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`);
const run = async (f) => { try { await db.exec(fs.readFileSync(dir + f, 'utf8')); return true; } catch (e) { fails++; console.log('FAIL: ' + f + ': ' + e.message); return false; } };
for (const f of ['001_vault_schema.sql', '002_waitlist.sql', '003_waitlist_count_fn.sql', '004_user_pins.sql', '005_vision_usage.sql', '006_vault_history.sql', '008_auth_rate_limit.sql', '009_waitlist_optin.sql', '010_vision_monthly.sql', '011_paid_gateway.sql']) await run(f);
ok(await run('014_campaign_counts.sql'), 'migration 014 runs on top of 001..011');
ok(await run('014_campaign_counts.sql'), 'the migration can be run twice');
const q = async (s) => (await db.query(s)).rows;
const as = async (role, s) => { await db.exec('set role ' + role); try { return await q(s); } finally { await db.exec('reset role'); } };
const ids = Array.from({ length: 8 }, (_, i) => `00000000-0000-4000-8000-00000000000${i + 1}`);
for (const [i, id] of ids.entries()) await db.exec(`insert into auth.users values ('${id}', 'user${i}@example.com')`);
const set = (i, plan, until) => db.exec(`insert into public.profiles(id, plan, paid_until) values ('${ids[i]}', ${plan ? `'${plan}'` : 'null'}, ${until ? `'${until}'` : 'null'}) on conflict (id) do update set plan = excluded.plan, paid_until = excluded.paid_until`);

let r = await as('anon', 'select * from public.campaign_counts()');
ok(r.length === 0, 'no paid accounts: no rows (the app shows 0)');
await set(0, 'monthly', '2099-01-01'); await set(1, 'monthly', null); await set(2, 'yearly', '2099-01-01'); await set(3, 'founder', null);
await set(4, 'monthly', '2000-01-01'); await set(5, null, null); await set(6, 'founder', '2000-01-01');
r = await as('anon', 'select * from public.campaign_counts()');
const by = Object.fromEntries(r.map((x) => [x.plan, x.backers]));
ok(by.monthly === 2 && by.yearly === 1 && by.founder === 2, 'counts per plan: live monthly 2, yearly 1, founder 2 (an expired monthly and a free account are left out)');
ok(Object.keys(r[0]).sort().join() === 'backers,plan', 'the only columns are plan and backers: no ids, names or e-mail addresses');
ok(JSON.stringify(r).indexOf('example.com') < 0 && JSON.stringify(r).indexOf('0000-4000') < 0, 'nothing personal in the result');
r = await as('authenticated', 'select * from public.campaign_counts()'); ok(r.length === 3, 'signed-in users can call it too');
let denied = false; try { await as('anon', 'select * from public.profiles'); } catch (e) { denied = true; }
ok(denied || (await as('anon', 'select * from public.profiles')).length === 0, 'anon still cannot read profiles directly');
console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
