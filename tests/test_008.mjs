// Migration 008 on a real Postgres (pglite): the rate limiter's window logic, that clients cannot reach it,
// and that erase_user_data leaves NOTHING behind even though vault_data's delete trigger re-archives rows.
// Run: node tests/test_008.mjs   (needs @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite'; import fs from 'fs';
const dir = new URL('../supabase/migrations/', import.meta.url).pathname;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select '11111111-1111-1111-1111-111111111111'::uuid $$;`);
for (const f of ['001_vault_schema.sql', '002_waitlist.sql', '004_user_pins.sql', '005_vision_usage.sql', '006_vault_history.sql', '008_auth_rate_limit.sql']) {
  try { await db.exec(fs.readFileSync(dir + f, 'utf8')); console.log('ran', f); } catch (e) { fails++; console.log('FAIL: ' + f + ' — ' + e.message); }
}
const q = async (s, p) => (await db.query(s, p)).rows;
const hit = async (k, lim, win) => (await q('select * from public.rate_hit($1,$2,$3)', [k, lim, win]))[0];

// ── rate limiter
let r; const seen = [];
for (let i = 0; i < 5; i++) seen.push((await hit('a', 3, 60)).allowed);
ok(seen.join() === 'true,true,true,false,false', 'allows exactly the limit, then refuses: ' + seen.join());
r = await hit('a', 3, 60); ok(r.retry_after >= 1 && r.retry_after <= 60, 'refusal says when to retry (' + r.retry_after + 's)');
ok((await hit('b', 3, 60)).allowed === true, 'other keys are independent');
await db.exec(`update public.auth_rate set window_start = now() - interval '2 minutes', expires_at = now() - interval '1 minute' where key = 'a'`);
r = await hit('a', 3, 60); ok(r.allowed === true && r.retry_after === 0, 'a new window starts after the old one ends');
ok((await q(`select n from public.auth_rate where key='a'`))[0].n === 1, 'counter restarted at 1');
// concurrent hits are serialised by the row lock: never more than `limit` allowed
const burst = await Promise.all(Array.from({ length: 30 }, () => hit('c', 10, 60)));
ok(burst.filter(x => x.allowed).length === 10, '30 parallel hits against a limit of 10 → exactly 10 allowed (' + burst.filter(x => x.allowed).length + ')');

// ── housekeeping: bounded, only expired rows, never touches live counters
await db.exec(`insert into public.auth_rate(key,n,window_start,expires_at) select 'old'||g, 1, now() - interval '3 hours', now() - interval '2 hours' from generate_series(1,1200) g`);
await hit('live-1', 5, 3600);
const before = (await q(`select count(*)::int n from public.auth_rate where key like 'old%'`))[0].n;
for (let i = 0; i < 300; i++) await hit('sweeper', 1000000, 60);
const after = (await q(`select count(*)::int n from public.auth_rate where key like 'old%'`))[0].n;
ok(after < before && after >= before - 500 * 40, 'expired counters are swept in bounded batches (' + before + ' → ' + after + ')');
ok((await q(`select count(*)::int n from public.auth_rate where key in ('live-1','sweeper','c','b')`))[0].n === 4, 'live counters are never swept');
ok((await q(`select count(*)::int n from pg_indexes where tablename='auth_rate' and indexname='auth_rate_expires_idx'`))[0].n === 1, 'expiry index exists (sweeps are not full scans)');

// ── retention: saved versions older than 180 days and old usage counters are cleared, newer ones are not
const R = '55555555-5555-5555-5555-555555555555';
await db.exec(`insert into auth.users values ('${R}','ret@example.com');
  insert into public.vault_data_history(user_id,key,value,archived_at,reason) select '${R}','pos_ov1','{}', now() - interval '200 days', 'edited' from generate_series(1,700);
  insert into public.vault_data_history(user_id,key,value,archived_at,reason) values ('${R}','pos_ov1','{"new":1}', now() - interval '10 days', 'edited');
  insert into public.vision_usage(user_id,day,n) values ('${R}', current_date - 40, 3), ('${R}', current_date - 1, 2);`);
for (let i = 0; i < 1500; i++) await hit('housekeeping', 1000000, 60);
const oldLeft = (await q(`select count(*)::int n from public.vault_data_history where user_id='${R}' and archived_at < now() - interval '180 days'`))[0].n;
ok(oldLeft === 0, 'versions older than 180 days are purged by the housekeeping (' + oldLeft + ' left of 700)');
ok((await q(`select count(*)::int n from public.vault_data_history where user_id='${R}' and archived_at > now() - interval '180 days'`))[0].n === 1, 'recent versions are kept');
ok((await q(`select count(*)::int n from public.vision_usage where user_id='${R}'`))[0].n === 1, 'usage counters older than 30 days are cleared, recent ones kept');
await db.exec(`insert into public.vault_data_history(user_id,key,value,archived_at,reason) values ('11111111-1111-1111-1111-111111111111','old_key','{}', now() - interval '300 days', 'edited'), ('11111111-1111-1111-1111-111111111111','new_key','{}', now() - interval '3 days', 'edited')`);
await db.exec('set role authenticated');
const listed = (await db.query(`select key from public.vault_history_list(200)`)).rows.map(r => r.key);
await db.exec('reset role');
ok(listed.includes('new_key') && !listed.includes('old_key'), "the version list never shows (or restores) anything older than 180 days, even before it is purged");

// ── clients cannot touch any of it
await db.exec('set role authenticated');
for (const [what, sql] of [['read auth_rate', 'select * from public.auth_rate'], ['call rate_hit', "select * from public.rate_hit('x',1,1)"], ['call erase_user_data', "select public.erase_user_data('11111111-1111-1111-1111-111111111111','a@b.c')"]]) {
  let denied = false; try { await db.exec(sql); } catch (e) { denied = /permission denied/.test(e.message); }
  ok(denied, 'signed-in client cannot ' + what);
}
await db.exec('reset role'); await db.exec('set role anon');
{ let denied = false; try { await db.exec("select * from public.rate_hit('x',1,1)"); } catch (e) { denied = /permission denied/.test(e.message); } ok(denied, 'anonymous client cannot call rate_hit'); }
await db.exec('reset role');

// ── erasing an account
const U = '11111111-1111-1111-1111-111111111111', V = '22222222-2222-2222-2222-222222222222';
await db.exec(`insert into auth.users values ('${U}','alice@example.com'),('${V}','bob@example.com');
  update public.profiles set name='Alice' where id='${U}'; update public.profiles set name='Bob' where id='${V}';
  insert into public.vault_data(user_id,key,value) values ('${U}','pos_ov1','{"a":1}'),('${U}','pos_debt1','{"d":[1]}'),('${V}','pos_ov1','{"b":2}');
  insert into public.nw_history(user_id,value) values ('${U}',100),('${V}',200);
  insert into public.vision_usage(user_id,n) values ('${U}',3);
  insert into public.user_pins(user_id,email,pin_hash,salt) values ('${U}','alice@example.com','h','s');
  insert into public.waitlist(email) values ('Alice@Example.com'),('bob@example.com');`);
await db.exec(`update public.vault_data set value='{"a":2}' where user_id='${U}' and key='pos_ov1'`);   // creates a history row
ok((await q(`select count(*)::int n from public.vault_data_history where user_id='${U}'`))[0].n >= 1, 'setup: Alice has archived history');
await db.exec(`select public.erase_user_data('${U}','alice@example.com')`);
for (const t of ['vault_data', 'vault_data_history', 'nw_history', 'vision_usage', 'user_pins']) {
  ok((await q(`select count(*)::int n from public.${t} where user_id='${U}'`))[0].n === 0, 'erased: ' + t + ' (incl. rows the delete trigger just archived)');
}
ok((await q(`select count(*)::int n from public.profiles where id='${U}'`))[0].n === 0, 'erased: profiles');
ok((await q(`select count(*)::int n from public.waitlist where lower(email)='alice@example.com'`))[0].n === 0, 'erased: waitlist entry (matched case-insensitively)');
ok((await q(`select count(*)::int n from public.vault_data where user_id='${V}'`))[0].n === 1 && (await q(`select count(*)::int n from public.nw_history where user_id='${V}'`))[0].n === 1 && (await q(`select count(*)::int n from public.waitlist`))[0].n === 1, "another user's data is untouched");
await db.exec(`delete from auth.users where id='${U}'`);   // what the edge function does next
ok((await q(`select count(*)::int n from public.vault_data_history where user_id='${U}'`))[0].n === 0, 'deleting the auth user afterwards leaves no history behind');

// ── an auth user deleted from ANYWHERE (dashboard "Delete user", a race with the eraser) must not leave history behind
const W = '33333333-3333-3333-3333-333333333333';
await db.exec(`insert into auth.users values ('${W}','wendy@example.com'); update public.profiles set name='Wendy' where id='${W}';
  insert into public.vault_data(user_id,key,value) values ('${W}','pos_ov1','{"x":1}'),('${W}','pos_debt1','{"d":[1,2,3]}');
  update public.vault_data set value='{"x":2}' where user_id='${W}' and key='pos_ov1';`);
const histBefore = (await q(`select count(*)::int n from public.vault_data_history where user_id='${W}'`))[0].n;
ok(histBefore >= 1, 'setup: Wendy has saved versions');
await db.exec(`delete from auth.users where id='${W}'`);   // no erase_user_data first
ok((await q(`select count(*)::int n from public.vault_data_history where user_id='${W}'`))[0].n === histBefore, 'deleting the auth user directly adds nothing to history (the trigger sees the profile is already gone)');
// …and the eraser still clears the older versions afterwards
await db.exec(`select public.erase_user_data('${W}','wendy@example.com')`);
ok((await q(`select count(*)::int n from public.vault_data_history where user_id='${W}'`))[0].n === 0, 'the follow-up erase_user_data sweeps what history there was');
// a signed-in user deleting one of THEIR rows is still archived
const X = '44444444-4444-4444-4444-444444444444';
await db.exec(`insert into auth.users values ('${X}','xavier@example.com'); insert into public.vault_data(user_id,key,value) values ('${X}','pos_ov1','{"keep":"me"}'); delete from public.vault_data where user_id='${X}' and key='pos_ov1';`);
ok((await q(`select count(*)::int n from public.vault_data_history where user_id='${X}' and reason='deleted'`))[0].n === 1, "a user's own delete is still archived (restore keeps working)");
// running the whole migration again changes nothing
try { await db.exec(fs.readFileSync(dir + '008_auth_rate_limit.sql', 'utf8')); ok(true, '008 can be applied twice'); } catch (e) { ok(false, '008 not idempotent: ' + e.message); }
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
