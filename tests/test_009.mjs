// Migration 009 on a real Postgres (pglite): the browser can no longer write the list, choices only count after confirmation,
// a repeat request never downgrades a confirmed address, first-touch attribution is kept, unsubscribe sticks, old pending rows are swept.
// Run: node tests/test_009.mjs   (needs @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite'; import fs from 'fs';
const dir = new URL('../supabase/migrations/', import.meta.url).pathname;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;`);
for (const f of ['002_waitlist.sql', '003_waitlist_count_fn.sql']) await db.exec(fs.readFileSync(dir + f, 'utf8'));
await db.exec(`insert into public.waitlist(email) values ('old@example.com')`);   // a row from the old landing page
try { await db.exec(fs.readFileSync(dir + '009_waitlist_optin.sql', 'utf8')); console.log('ran 009'); } catch (e) { fails++; console.log('FAIL: 009 — ' + e.message); }
try { await db.exec(fs.readFileSync(dir + '009_waitlist_optin.sql', 'utf8')); ok(true, 'the migration can be run twice'); } catch (e) { ok(false, 'second run: ' + e.message); }
const q = async (s, p) => (await db.query(s, p)).rows;
const H = (c) => c.repeat(64);
const req = (email, testing, marketing, hash, utm = 'meta') => q(`select public.waitlist_request($1,$2,$3,'signup-2026-10-27',$4,'sign-up',$5,'paid','beta','ad1','https://l.instagram.com') id`, [email, testing, marketing, hash, utm]);

ok((await q(`select status, marketing_consent from public.waitlist where email='old@example.com'`))[0].status === 'legacy', 'rows from the old page become legacy (no consent record, not on the marketing list)');

// the browser roles cannot touch the list
for (const role of ['anon', 'authenticated']) {
  let denied = 0;
  for (const sql of [`insert into public.waitlist(email) values ('x@y.co')`, `select * from public.waitlist`, `select public.waitlist_count()`,
                     `select public.waitlist_request('a@b.co',true,true,'v','${H('a')}','s','','','','','')`, `select * from public.waitlist_confirm('${H('a')}')`,
                     `select public.waitlist_unsubscribe(gen_random_uuid())`]) {
    try { await db.exec(`set role ${role}; ${sql}; reset role;`); } catch (e) { denied++; await db.exec('reset role'); }
  }
  ok(denied === 6, role + ' cannot insert, read, count, or call the list functions (' + denied + '/6 refused)');
}

// request → pending, choices held back
const id = (await req('Pete@Example.com', true, true, H('1')))[0].id;
let r = (await q(`select * from public.waitlist where id=$1`, [id]))[0];
ok(r.email === 'pete@example.com' && r.status === 'pending' && r.marketing_consent === false && r.wants_testing === false && r.req_marketing === true, 'a request is pending; marketing consent is NOT recorded until the link is clicked');
ok(r.utm_source === 'meta' && r.referrer === 'https://l.instagram.com' && r.confirm_expires > new Date(), 'attribution and a 7-day link expiry are stored');

// confirm applies the choices and records consent
let c = await q(`select * from public.waitlist_confirm($1)`, [H('1')]);
r = (await q(`select * from public.waitlist where id=$1`, [id]))[0];
ok(c.length === 1 && c[0].wants_testing === true && r.status === 'confirmed' && r.marketing_consent === true && r.consent_version === 'signup-2026-10-27' && r.consent_at && r.confirmed_at && !r.confirm_hash, 'confirmation applies the choices and writes the consent record (what, when)');
ok((await q(`select * from public.waitlist_confirm($1)`, [H('1')])).length === 0, 'a link works once');

// a later request (anyone can type an address) never downgrades or changes a confirmed row until that link is clicked too
await req('pete@example.com', false, false, H('2'), 'tiktok');
r = (await q(`select * from public.waitlist where id=$1`, [id]))[0];
ok(r.status === 'confirmed' && r.marketing_consent === true && r.wants_testing === true, 'someone re-submitting a confirmed address cannot change its choices without the new link');
ok(r.utm_source === 'meta', 'first-touch attribution is kept');
await q(`select * from public.waitlist_confirm($1)`, [H('2')]);
r = (await q(`select * from public.waitlist where id=$1`, [id]))[0];
ok(r.marketing_consent === false && r.consent_at === null && r.wants_testing === false, 'the owner confirming new choices withdraws consent they no longer give');

// expired links do nothing
await req('late@example.com', true, true, H('3'));
await db.exec(`update public.waitlist set confirm_expires = now() - interval '1 minute' where email='late@example.com'`);
ok((await q(`select * from public.waitlist_confirm($1)`, [H('3')])).length === 0 && (await q(`select status from public.waitlist where email='late@example.com'`))[0].status === 'pending', 'an expired link confirms nothing');

// unsubscribe sticks, and a new sign-up starts again as pending
const lid = (await q(`select id from public.waitlist where email='pete@example.com'`))[0].id;
ok((await q(`select public.waitlist_unsubscribe($1) ok`, [lid]))[0].ok === true, 'unsubscribe reports success');
r = (await q(`select * from public.waitlist where id=$1`, [lid]))[0];
ok(r.status === 'unsubscribed' && !r.marketing_consent && !r.wants_testing && r.unsubscribed_at, 'unsubscribed: no testing, no marketing, address kept only as a do-not-email record');
await req('pete@example.com', true, false, H('4'));
ok((await q(`select status from public.waitlist where id=$1`, [lid]))[0].status === 'pending', 'signing up again after leaving needs a fresh confirmation');

// legacy row re-joins
await req('old@example.com', true, true, H('5'));
ok((await q(`select status from public.waitlist where email='old@example.com'`))[0].status === 'pending', 'an old-page address that signs up again goes through confirmation like anyone else');

// input checks
for (const [e, h] of [['nope', H('6')], ['a@b.co', 'short']]) { try { await req(e, true, true, h); ok(false, 'accepted ' + e + '/' + h); } catch (err) { /* refused */ } }
ok(true, 'malformed address or token is refused by the database too');
try { await req('x@y.co', true, true, H('7'), 'u'.repeat(500)); ok((await q(`select length(utm_source) n from public.waitlist where email='x@y.co'`))[0].n === 100, 'over-long tags are cut to 100'); } catch (e) { ok(false, 'long tag: ' + e.message); }

// housekeeping: unconfirmed requests older than 30 days go, others stay
await db.exec(`insert into public.waitlist(email,status,updated_at) select 'stale'||g||'@x.co','pending', now() - interval '31 days' from generate_series(1,50) g`);
await db.exec(`update public.waitlist set updated_at = now() - interval '40 days' where email in ('old@example.com')`);   // pending now, but... see below
await db.exec(`insert into public.waitlist(email,status,confirmed_at,updated_at) values ('kept@x.co','confirmed',now(),now() - interval '400 days')`);
await req('trigger@example.com', true, false, H('8'));
ok((await q(`select count(*)::int n from public.waitlist where email like 'stale%'`))[0].n === 0, 'unconfirmed requests older than 30 days are deleted');
ok((await q(`select count(*)::int n from public.waitlist where email='kept@x.co'`))[0].n === 1, 'confirmed rows are never swept, however old');

console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
