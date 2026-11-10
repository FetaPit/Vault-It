// Migration 012 on a real Postgres (pglite): tester feedback, activity events and reports. Applies cleanly on top of 001..011,
// the browser roles can neither read nor write any of it (RLS on, no client policies), the checks refuse bad rows,
// the per-tester limits hold, activity totals add up, retention and account erasure remove what they should.
// Run: node tests/test_012.mjs   (needs @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite'; import fs from 'fs';
const dir = new URL('../supabase/migrations/', import.meta.url).pathname;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const db = new PGlite();
const U = '11111111-1111-1111-1111-111111111111', V = '22222222-2222-2222-2222-222222222222';
const S1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', S2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select '${U}'::uuid $$;
grant usage on schema public to anon, authenticated, service_role;
-- as on Supabase: new tables in public are granted to the API roles by default, so the migration has to take that away
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`);
const run = async (f) => { try { await db.exec(fs.readFileSync(dir + f, 'utf8')); return true; } catch (e) { fails++; console.log('FAIL: ' + f + ': ' + e.message); return false; } };
for (const f of ['001_vault_schema.sql', '002_waitlist.sql', '003_waitlist_count_fn.sql', '004_user_pins.sql', '005_vision_usage.sql', '006_vault_history.sql', '008_auth_rate_limit.sql', '009_waitlist_optin.sql', '010_vision_monthly.sql', '011_paid_gateway.sql']) await run(f);
await db.exec(`insert into auth.users values ('${U}','pete@example.com'), ('${V}','vee@example.com')`);
ok(await run('012_tester_feedback.sql'), 'migration 012 runs on top of 001..011');
ok(await run('012_tester_feedback.sql'), 'the migration can be run twice');
const q = async (s, p) => (await db.query(s, p)).rows;
const svc = async (s, p) => { await db.exec('set role service_role'); try { return await q(s, p); } finally { await db.exec('reset role'); } };
const throws = async (s, p) => { try { await q(s, p); return false; } catch (e) { return true; } };

// RLS on, no client policies, no client grants
const rls = await q(`select relname, relrowsecurity from pg_class where relname in ('tester_feedback','tester_events','feedback_reports') order by relname`);
ok(rls.length === 3 && rls.every((r) => r.relrowsecurity), 'row level security is on for all three tables');
ok((await q(`select count(*)::int n from pg_policies where tablename in ('tester_feedback','tester_events','feedback_reports')`))[0].n === 0, 'and there are no policies (only the service role reads or writes)');

const fb = (over = {}) => ({ text: 'The bills tab froze', rating: null, moment: null, shot: null, ctx: '{"screen":"budget"}', max: 20, ...over });
const add = async (user, o = {}) => { const a = fb(o); return (await svc('select public.tester_feedback_add($1,$2,$3,$4,$5,$6::jsonb,$7) id', [user, a.text, a.rating, a.moment, a.shot, a.ctx, a.max]))[0].id; };
const firstId = await add(U, { text: 'First note' });
ok(firstId !== null && firstId !== undefined, 'the service role stores feedback through tester_feedback_add');

let denied = 0, tried = 0;
const browserSql = [
  `select * from public.tester_feedback`, `select * from public.tester_events`, `select * from public.feedback_reports`,
  `insert into public.tester_feedback(user_id, text) values ('${U}', 'hi')`,
  `insert into public.tester_events(user_id, session_id, ev) values ('${U}', '${S1}', 'tab')`,
  `insert into public.feedback_reports(period, body) values ('weekly', '{}')`,
  `update public.tester_feedback set status = 'done'`, `delete from public.tester_feedback`,
  `select public.tester_feedback_add('${U}', 'x', null, null, null, '{}'::jsonb, 20)`,
  `select public.tester_events_add('${U}', '${S1}', '[{"ev":"tab"}]'::jsonb, 60)`,
  `select public.tester_activity(now() - interval '1 day', now())`, `select public.tester_retention()`,
];
for (const sql of browserSql) for (const role of ['anon', 'authenticated']) {
  tried++; try { await db.exec(`set role ${role}; ${sql};`); } catch (e) { denied++; } await db.exec('reset role');
}
ok(denied === tried, `anon and authenticated cannot read, write or call anything (${denied}/${tried} refused)`);
// even with table grants (a mistake later), RLS with no policies still shows and accepts nothing
await db.exec(`grant select, insert, update, delete on public.tester_feedback to authenticated`);
await db.exec(`set role authenticated`);
const seen = (await q(`select count(*)::int n from public.tester_feedback`))[0].n;
const ins = await throws(`insert into public.tester_feedback(user_id, text) values ('${U}', 'hi')`);
await db.exec(`reset role; revoke all on public.tester_feedback from authenticated`);
ok(seen === 0 && ins, 'with a stray grant, RLS still hides every row and refuses inserts');
ok((await q(`select count(*)::int n from public.tester_feedback`))[0].n === 1, 'so nothing changed');

// checks
const bad = async (o, m) => ok(await throws(`insert into public.tester_feedback(user_id, text, rating, moment, screenshot, context) values ($1,$2,$3,$4,$5,$6::jsonb)`,
  [U, o.text ?? 'x', o.rating ?? null, o.moment ?? null, o.shot ?? null, o.ctx ?? '{}']), m);
await bad({ rating: 0 }, 'rating 0 refused'); await bad({ rating: 6 }, 'rating 6 refused');
await bad({ text: 'x'.repeat(4001) }, 'text over 4,000 characters refused');
await bad({ text: '   ' }, 'empty text with no rating refused');
await bad({ shot: 'data:image/png;base64,AAAA' }, 'a screenshot that is not a JPEG data URL refused');
await bad({ shot: 'data:image/jpeg;base64,' + 'A'.repeat(716800) }, 'a screenshot over 700 KB refused');
await bad({ moment: 'has spaces and <b>' }, 'a moment name with odd characters refused');
await bad({ ctx: '[1,2]' }, 'context must be an object');
await bad({ ctx: JSON.stringify({ big: 'x'.repeat(50000) }) }, 'context over the size cap refused');
ok(!(await throws(`insert into public.tester_feedback(user_id, text, rating, moment) values ($1, '', 4, 'first_budget')`, [U])), 'a rating alone for a moment prompt is accepted');
ok(await throws(`update public.tester_feedback set status = 'whatever'`), 'unknown status refused');
// targeted questions and surveys (owner, 31 Oct)
const ins2 = (cols, vals) => throws(`insert into public.tester_feedback(user_id, ${cols}) values ('${U}', ${vals})`);
ok(!(await ins2('text, question, choice', `'', 'trust_numbers', 'Not sure'`)), 'a choice alone for a targeted question is accepted');
ok(await ins2('text, question, choice', `'', 'Bad Id!', 'x'`), 'a question id with odd characters refused');
ok(await ins2('text, choice', `'', '${'x'.repeat(61)}'`), 'a choice over 60 characters refused');
ok(await ins2('text, survey', `'', 'day14'`), 'a survey with no answers refused');
ok(await ins2('text, answers', `'', '[{"q":"a"}]'`), 'answers without a survey id refused');
ok(await ins2('text, survey, answers', `'', 'day14', '{"q":"a"}'`), 'answers must be an array');
ok(await ins2('text, survey, answers', `'', 'day14', '${JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ q: 'q' + i })))}'`), 'more than 8 answers refused');
ok(await ins2('text, survey, answers', `'', 'day 14!', '[{"q":"a"}]'`), 'a survey id with odd characters refused');
const sid = (await svc(`select public.tester_feedback_add($1, 'disappointed: Very disappointed', null, null, null, '{}'::jsonb, 20, null, null, 'day14', $2::jsonb) id`,
  [U, JSON.stringify([{ q: 'disappointed', choice: 'Very disappointed' }, { q: 'recommend', score: 8 }])]))[0].id;
const srow = (await q(`select survey, answers, question, choice from public.tester_feedback where id = $1`, [sid]))[0];
ok(srow.survey === 'day14' && srow.answers.length === 2 && srow.answers[1].score === 8, 'a survey response is stored as one row through tester_feedback_add');
const qid = (await svc(`select public.tester_feedback_add($1, '', null, null, null, '{}'::jsonb, 20, 'trust_numbers', 'Mostly') id`, [U]))[0].id;
ok((await q(`select question, choice from public.tester_feedback where id = $1`, [qid]))[0].choice === 'Mostly', 'a targeted question and its choice are stored');
const badEv = async (cols, vals, m) => ok(await throws(`insert into public.tester_events(user_id, session_id, ${cols}) values ('${U}', '${S1}', ${vals})`), m);
await badEv('ev', `'clicked_secret'`, 'unknown event type refused');
await badEv('ev, el', `'feature', '£1,200 saved'`, 'an el with a pound amount or digits refused');
await badEv('ev, el', `'feature', '${'x'.repeat(41)}'`, 'an el over 40 characters refused');
await badEv('ev, ms', `'session_end', -5`, 'negative duration refused');
ok(await throws(`insert into public.feedback_reports(period, body) values ('monthly', '{}')`), 'unknown report period refused');

// feedback limit: 20 a day per tester
await db.exec(`delete from public.tester_feedback`);
let got = []; for (let i = 0; i < 21; i++) got.push(await add(U, { text: 'note ' + i }));
ok(got.slice(0, 20).every((x) => x !== null) && got[20] === null, 'the 21st feedback in a day returns null (limited)');
ok((await svc(`select public.tester_feedback_add($1, 's', null, null, null, '{}'::jsonb, 20, null, null, 'day3', '[{"q":"a","choice":"b"}]'::jsonb) id`, [U]))[0].id === null, 'surveys share the same daily limit');
ok((await add(V, { text: 'other tester' })) !== null, 'another tester is not affected');
await db.exec(`update public.tester_feedback set created_at = now() - interval '25 hours' where user_id = '${U}'`);
ok((await add(U, { text: 'next day' })) !== null, 'the limit is a rolling 24 hours');

// events: batches, limit, defaults
const evAdd = async (user, session, events, max = 60) => (await svc('select public.tester_events_add($1,$2,$3::jsonb,$4) n', [user, session, JSON.stringify(events), max]))[0].n;
ok(await evAdd(U, S1, [{ ev: 'session_start' }, { ev: 'tab', tab: 'budget' }, { ev: 'tab', tab: 'house', ms: 4000 }, { ev: 'feature', el: 'budget saved' }]) === 4, 'a batch of events is stored and counted');
const r1 = await q(`select count(distinct received_at)::int b, bool_and(at is not null) a from public.tester_events where user_id = '${U}'`);
ok(r1[0].b === 1 && r1[0].a, 'one batch shares one received_at; a missing time defaults to now');
ok(await evAdd(U, S1, [{ ev: 'tab', tab: 'budget', at: '2026-10-30T10:00:00Z' }]) === 1 && (await q(`select count(*)::int n from public.tester_events where at = '2026-10-30T10:00:00Z'`))[0].n === 1, 'the event time given is kept');
for (let i = 0; i < 3; i++) await evAdd(V, S2, [{ ev: 'tab', tab: 'overview' }], 3);
ok(await evAdd(V, S2, [{ ev: 'tab', tab: 'overview' }], 3) === -1, 'over the batch limit returns -1 and stores nothing');
ok(await throws(`select public.tester_events_add('${U}', '${S1}', '[{"ev":"nope"}]'::jsonb, 60)`), 'a bad event in a batch fails the whole batch');

// activity totals
await evAdd(U, S1, [{ ev: 'session_end', ms: 60000 }, { ev: 'error', el: 'TypeError' }]);
await evAdd(V, S2, [{ ev: 'session_end', ms: 120000 }], 99);
await evAdd(U, S2, [{ ev: 'session_end', ms: 300000 }]);
const act = (await svc(`select public.tester_activity(now() - interval '1 day', now() + interval '1 minute') a`))[0].a;
ok(act.testers === 2 && act.sessions === 2 && act.errors === 1, 'activity: testers, sessions and errors counted: ' + JSON.stringify({ t: act.testers, s: act.sessions, e: act.errors }));
ok(Number(act.median_session_ms) === 120000, 'median session length from session_end events');
ok(act.screens[0].tab === 'overview' && act.screens[0].n === 3 && act.screens.some((s) => s.tab === 'house'), 'screens ranked by use (most first)');
ok(act.features[0].name === 'budget saved', 'features listed');

// retention
await db.exec(`update public.tester_events set received_at = now() - interval '121 days' where tab = 'house';
  update public.tester_feedback set screenshot = 'data:image/jpeg;base64,QUJD', created_at = now() - interval '181 days' where text = 'note 0';
  update public.tester_feedback set screenshot = 'data:image/jpeg;base64,QUJD' where text = 'next day';`);
const ret = (await svc(`select public.tester_retention() r`))[0].r;
ok(ret.events_deleted === 1 && ret.screenshots_removed === 1, 'retention: old events deleted, old screenshots removed: ' + JSON.stringify(ret));
ok((await q(`select count(*)::int n from public.tester_feedback where text = 'note 0'`))[0].n === 1, 'the old feedback text itself is kept');
ok((await q(`select screenshot from public.tester_feedback where text = 'next day'`))[0].screenshot !== null, 'a recent screenshot is kept');

// erase
await db.exec(`select public.erase_user_data('${U}', 'pete@example.com')`);
const left = await q(`select (select count(*)::int from public.tester_feedback where user_id = '${U}') f, (select count(*)::int from public.tester_events where user_id = '${U}') e,
  (select count(*)::int from public.tester_feedback where user_id = '${V}') vf`);
ok(left[0].f === 0 && left[0].e === 0 && left[0].vf === 1, 'erasing an account removes its feedback and activity, nobody else’s');
await db.exec(`delete from auth.users where id = '${V}'`);
ok((await q(`select count(*)::int n from public.tester_events where user_id = '${V}'`))[0].n === 0, 'deleting the auth user cascades');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
