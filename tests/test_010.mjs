// Migration 010 on a real Postgres (pglite): screenshot reads are a monthly allowance, serialised per user, and the browser cannot touch them.
// Run: node tests/test_010.mjs
import { PGlite } from '@electric-sql/pglite'; import fs from 'fs';
const dir = new URL('../supabase/migrations/', import.meta.url).pathname;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select '11111111-1111-1111-1111-111111111111'::uuid $$;`);
for (const f of ['001_vault_schema.sql', '005_vision_usage.sql', '010_vision_monthly.sql', '010_vision_monthly.sql']) {
  try { await db.exec(fs.readFileSync(dir + f, 'utf8')); } catch (e) { fails++; console.log('FAIL: ' + f + ' — ' + e.message); }
}
const U = '11111111-1111-1111-1111-111111111111';
await db.exec(`insert into auth.users values ('${U}','a@b.co') on conflict do nothing; insert into public.profiles(id) values ('${U}') on conflict do nothing`);
const take = async (c, max) => (await db.query('select public.vision_take_month($1,$2,$3) ok', [U, c, max])).rows[0].ok;
ok((await db.query(`select is_founder from public.profiles where id='${U}'`)).rows[0].is_founder === false, 'profiles.is_founder exists, default false');
const seq = []; for (let i = 0; i < 4; i++) seq.push(await take(1, 3));
ok(seq.join() === 'true,true,true,false', 'free allowance of 3: the 4th is refused: ' + seq.join());
ok(await take(-1, 3) === true && await take(1, 3) === true && await take(1, 3) === false, 'a refund (same day, as the function does it) gives exactly one read back');
await db.exec(`update public.vision_usage set day = date_trunc('month', current_date)::date where user_id='${U}'`);
await db.exec(`insert into public.vision_usage(user_id, day, n) values ('${U}', (date_trunc('month', current_date) - interval '1 day')::date, 50) on conflict do nothing`);
ok(await take(1, 3) === false, 'reads earlier this month still count');
ok(await take(5, 30) === true && await take(30, 30) === false, 'last month’s reads do not count against this month');
let denied = 0;
for (const role of ['anon', 'authenticated']) { try { await db.exec(`set role ${role}; select public.vision_take_month('${U}', -100, 3); reset role;`); } catch (e) { denied++; await db.exec('reset role'); } }
ok(denied === 2, 'browser roles cannot call it (no self-refund)');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
