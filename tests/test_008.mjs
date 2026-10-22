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
await db.exec(`update public.auth_rate set window_start = now() - interval '2 minutes' where key = 'a'`);
r = await hit('a', 3, 60); ok(r.allowed === true && r.retry_after === 0, 'a new window starts after the old one ends');
ok((await q(`select n from public.auth_rate where key='a'`))[0].n === 1, 'counter restarted at 1');
// concurrent hits are serialised by the row lock: never more than `limit` allowed
const burst = await Promise.all(Array.from({ length: 30 }, () => hit('c', 10, 60)));
ok(burst.filter(x => x.allowed).length === 10, '30 parallel hits against a limit of 10 → exactly 10 allowed (' + burst.filter(x => x.allowed).length + ')');

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
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
