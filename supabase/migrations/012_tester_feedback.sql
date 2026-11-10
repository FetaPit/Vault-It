-- Vault-It: tester feedback and activity log (owner, 31 Oct 2026: "an optimal low effort and maximal utility method for each tester
-- to send their feedback to us ... giving us back end and user session activity"). Spec: docs/TESTER_FEEDBACK.md.
--   tester_feedback  : what a tester sends from the in-app sheet (text, optional rating, optional screenshot with figures hidden,
--                      app context with no money figures) plus the AI triage stored by the tester-feedback function.
--                      Also one targeted question (question + choice) and short surveys (survey + answers, day 3 / 14 / 25 ...)
--                      (owner, 31 Oct: "way more specific separate questions to identify honest feedback").
--   tester_events    : the activity log (screens opened, features used, errors). No values, no free text typed by the user.
--   feedback_reports : the daily and weekly digests written by the feedback-digest function.
-- RLS is on with NO client policies: only the edge functions (service role) read or write these tables, through the functions below.
-- Retention (run by the daily digest through tester_retention): events after 120 days, screenshots after 180 days.
-- Run order: apply this migration, then deploy tester-feedback and feedback-digest, then the pg_cron schedule (docs/TESTER_FEEDBACK_DEPLOY.sql).
-- Safe to run twice.

-- 1) Tables
create table if not exists public.tester_feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  text       text not null default '',
  rating     smallint,
  moment     text,
  question   text,                        -- id of a single targeted question answered from a contextual prompt
  choice     text,                        -- the option picked, with or without text / rating
  survey     text,                        -- survey id (day3, day14, day25 ...) when the row is a survey response
  answers    jsonb,                       -- [{q, choice?, text?, score?}, ...] 1 to 8 answers
  screenshot text,                        -- data:image/jpeg;base64,... (figures hidden on the device), cleared after 180 days
  context    jsonb not null default '{}'::jsonb,
  triage     jsonb,                       -- {type, severity, area, summary, steps, model}
  triaged_at timestamptz,
  status     text not null default 'new',
  constraint tester_feedback_text_chk       check (char_length(text) <= 4000),
  constraint tester_feedback_said_chk       check (char_length(btrim(text)) >= 1 or rating is not null or choice is not null or answers is not null),
  constraint tester_feedback_rating_chk     check (rating is null or rating between 1 and 5),
  constraint tester_feedback_moment_chk     check (moment is null or moment ~ '^[A-Za-z0-9_.:-]{1,40}$'),
  constraint tester_feedback_question_chk   check (question is null or question ~ '^[a-z0-9_]{1,40}$'),
  constraint tester_feedback_choice_chk     check (choice is null or char_length(choice) between 1 and 60),
  constraint tester_feedback_survey_chk     check (survey is null or survey ~ '^[a-z0-9_]{1,20}$'),
  constraint tester_feedback_answers_chk    check (answers is null or (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) between 1 and 8
                                                   and octet_length(answers::text) <= 16384)),
  constraint tester_feedback_survey_answers_chk check ((survey is null) = (answers is null)),
  constraint tester_feedback_shot_chk       check (screenshot is null or (length(screenshot) <= 716800 and left(screenshot, 23) = 'data:image/jpeg;base64,')),
  constraint tester_feedback_context_chk    check (jsonb_typeof(context) = 'object' and octet_length(context::text) <= 49152),
  constraint tester_feedback_triage_chk     check (triage is null or jsonb_typeof(triage) = 'object'),
  constraint tester_feedback_status_chk     check (status in ('new', 'seen', 'queued', 'done', 'wontfix'))
);
create index if not exists tester_feedback_created_idx   on public.tester_feedback (created_at);
create index if not exists tester_feedback_user_idx      on public.tester_feedback (user_id, created_at);
create index if not exists tester_feedback_untriaged_idx on public.tester_feedback (created_at) where triaged_at is null;
create index if not exists tester_feedback_survey_idx    on public.tester_feedback (survey, created_at) where survey is not null;

create table if not exists public.tester_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null,
  at          timestamptz not null default now(),       -- the device's time for the event (clamped by the function)
  received_at timestamptz not null default now(),       -- one value per batch: counts batches for the rate limit
  ev          text not null,
  tab         text,
  el          text,
  ms          integer,
  constraint tester_events_ev_chk  check (ev in ('session_start', 'session_end', 'tab', 'feature', 'error')),
  constraint tester_events_tab_chk check (tab is null or char_length(tab) <= 60),
  constraint tester_events_el_chk  check (el is null or (char_length(el) <= 40 and el !~ '[0-9£$€]')),
  constraint tester_events_ms_chk  check (ms is null or ms between 0 and 604800000)
);
create index if not exists tester_events_received_idx on public.tester_events (received_at);
create index if not exists tester_events_user_idx     on public.tester_events (user_id, received_at);

create table if not exists public.feedback_reports (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  period     text not null,
  body       jsonb not null,
  constraint feedback_reports_period_chk check (period in ('daily', 'weekly')),
  constraint feedback_reports_body_chk   check (jsonb_typeof(body) = 'object')
);
create index if not exists feedback_reports_created_idx on public.feedback_reports (period, created_at);

alter table public.tester_feedback  enable row level security;
alter table public.tester_events    enable row level security;
alter table public.feedback_reports enable row level security;
revoke all on public.tester_feedback, public.tester_events, public.feedback_reports from anon, authenticated;

-- 2) Store one feedback or survey response, at most p_max a day per tester (surveys share the limit). Returns the new id, or null
--    when the tester is over the limit. The per-tester advisory lock makes the count and the insert one step, so parallel requests
--    cannot slip past the limit.
create or replace function public.tester_feedback_add(
  p_user uuid, p_text text, p_rating integer, p_moment text, p_screenshot text, p_context jsonb, p_max integer default 20,
  p_question text default null, p_choice text default null, p_survey text default null, p_answers jsonb default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare n integer; new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('tester_feedback:' || p_user::text));
  select count(*) into n from public.tester_feedback where user_id = p_user and created_at > now() - interval '24 hours';
  if n >= p_max then return null; end if;
  insert into public.tester_feedback(user_id, text, rating, moment, screenshot, context, question, choice, survey, answers)
       values (p_user, coalesce(p_text, ''), p_rating, p_moment, p_screenshot, coalesce(p_context, '{}'::jsonb),
               p_question, p_choice, p_survey, p_answers)
    returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.tester_feedback_add(uuid, text, integer, text, text, jsonb, integer, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.tester_feedback_add(uuid, text, integer, text, text, jsonb, integer, text, text, text, jsonb) to service_role;

-- 3) Store one batch of activity events, at most p_max batches an hour per tester. Returns the number stored, or -1 when limited.
--    p_events: [{at, ev, tab, el, ms}, ...] already checked by the function (the table checks hold the line as well).
create or replace function public.tester_events_add(p_user uuid, p_session uuid, p_events jsonb, p_max integer default 60)
returns integer language plpgsql security definer set search_path = public as $$
declare batches integer; stamp timestamptz; n integer;
begin
  if jsonb_typeof(p_events) <> 'array' then raise exception 'events must be an array'; end if;
  perform pg_advisory_xact_lock(hashtext('tester_events:' || p_user::text));
  select count(distinct received_at) into batches from public.tester_events
   where user_id = p_user and received_at > now() - interval '1 hour';
  if batches >= p_max then return -1; end if;
  stamp := clock_timestamp();
  insert into public.tester_events(user_id, session_id, at, received_at, ev, tab, el, ms)
  select p_user, p_session, coalesce(x.at, stamp), stamp, x.ev, x.tab, x.el, x.ms
    from jsonb_to_recordset(p_events) as x(at timestamptz, ev text, tab text, el text, ms integer);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.tester_events_add(uuid, uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.tester_events_add(uuid, uuid, jsonb, integer) to service_role;

-- 4) Activity totals for a window (the digests): active testers, sessions, median session length, screens by use, features, errors.
create or replace function public.tester_activity(p_since timestamptz, p_until timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  with e as (select * from public.tester_events where received_at >= p_since and received_at < p_until)
  select jsonb_build_object(
    'testers',           (select count(distinct user_id) from e),
    'sessions',          (select count(distinct session_id) from e),
    'events',            (select count(*) from e),
    'median_session_ms', (select round(percentile_cont(0.5) within group (order by ms))::bigint from e where ev = 'session_end' and ms is not null),
    'errors',            (select count(*) from e where ev = 'error'),
    'screens',           coalesce((select jsonb_agg(jsonb_build_object('tab', tab, 'n', n) order by n desc, tab)
                                     from (select tab, count(*) n from e where ev = 'tab' and tab is not null group by tab) s), '[]'::jsonb),
    'features',          coalesce((select jsonb_agg(jsonb_build_object('name', el, 'n', n) order by n desc, el)
                                     from (select el, count(*) n from e where ev = 'feature' and el is not null group by el) f), '[]'::jsonb)
  );
$$;
revoke all on function public.tester_activity(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.tester_activity(timestamptz, timestamptz) to service_role;

-- 5) Retention, run by the daily digest: events older than 120 days are deleted; screenshots older than 180 days are removed
--    (the written feedback and its triage are kept).
create or replace function public.tester_retention()
returns jsonb language plpgsql security definer set search_path = public as $$
declare ev integer; sh integer;
begin
  delete from public.tester_events where received_at < now() - interval '120 days';
  get diagnostics ev = row_count;
  update public.tester_feedback set screenshot = null where screenshot is not null and created_at < now() - interval '180 days';
  get diagnostics sh = row_count;
  return jsonb_build_object('events_deleted', ev, 'screenshots_removed', sh);
end;
$$;
revoke all on function public.tester_retention() from public, anon, authenticated;
grant execute on function public.tester_retention() to service_role;

-- 6) Erasing an account also removes its feedback and activity (the auth user's ON DELETE CASCADE covers a dashboard delete too).
create or replace function public.erase_user_data(p_user UUID, p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.vault_data         WHERE user_id = p_user;
  DELETE FROM public.vault_data_history WHERE user_id = p_user;
  DELETE FROM public.nw_history         WHERE user_id = p_user;
  DELETE FROM public.vision_usage       WHERE user_id = p_user;
  DELETE FROM public.user_pins          WHERE user_id = p_user;
  DELETE FROM public.tester_feedback    WHERE user_id = p_user;
  DELETE FROM public.tester_events      WHERE user_id = p_user;
  DELETE FROM public.waitlist           WHERE lower(email) = lower(p_email);
  UPDATE public.stripe_events SET user_id = NULL, email = NULL WHERE user_id = p_user OR lower(email) = lower(p_email);
  DELETE FROM public.profiles           WHERE id = p_user;
END;
$$;
REVOKE ALL ON FUNCTION public.erase_user_data(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_user_data(UUID, TEXT) TO service_role;
