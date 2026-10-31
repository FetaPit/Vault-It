-- Tester feedback: the digest schedule. Run ONCE in the Supabase SQL editor, with the owner's yes, AFTER
--   1) supabase/migrations/012_tester_feedback.sql is applied, and
--   2) tester-feedback and feedback-digest are deployed with their secrets (supabase/functions/README.md, "Tester feedback").
-- Not run by any test. Safe to re-run: each schedule is replaced by name.
--
-- pg_cron runs in UTC, so each job is scheduled at 06:xx and 07:xx UTC and only calls the digest when it is 07:xx in London.
-- That gives 07:41 UK time daily and 07:47 on Mondays all year round, across the clock changes.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The digest key lives in Vault (same value as the FEEDBACK_DIGEST_KEY function secret). Make one with: openssl rand -hex 32
-- Replace <the key> below, run this statement once, then clear it from the editor. To rotate: vault.update_secret(id, '<new key>').
-- select vault.create_secret('<the key>', 'feedback_digest_key', 'x-digest-key for the feedback-digest edge function');

select cron.schedule('feedback-digest-daily', '41 6,7 * * *', $job$
  select net.http_post(
    url     := 'https://legpubblzgknxdtvsant.supabase.co/functions/v1/feedback-digest',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-digest-key', (select decrypted_secret from vault.decrypted_secrets where name = 'feedback_digest_key')),
    body    := '{"mode":"daily"}'::jsonb,
    timeout_milliseconds := 120000)
  where extract(hour from now() at time zone 'Europe/London') = 7;
$job$);

select cron.schedule('feedback-digest-weekly', '47 6,7 * * 1', $job$
  select net.http_post(
    url     := 'https://legpubblzgknxdtvsant.supabase.co/functions/v1/feedback-digest',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-digest-key', (select decrypted_secret from vault.decrypted_secrets where name = 'feedback_digest_key')),
    body    := '{"mode":"weekly"}'::jsonb,
    timeout_milliseconds := 180000)
  where extract(hour from now() at time zone 'Europe/London') = 7
    and extract(isodow from now() at time zone 'Europe/London') = 1;
$job$);

-- Checks
-- select jobid, jobname, schedule, active from cron.job where jobname like 'feedback-digest%';
-- select * from cron.job_run_details where jobid in (select jobid from cron.job where jobname like 'feedback-digest%') order by start_time desc limit 10;
-- select id, status_code, left(content::text, 200), created from net._http_response order by created desc limit 5;
-- Run one now (the same call the schedule makes):
-- select net.http_post(url := 'https://legpubblzgknxdtvsant.supabase.co/functions/v1/feedback-digest',
--   headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-key', (select decrypted_secret from vault.decrypted_secrets where name = 'feedback_digest_key')),
--   body := '{"mode":"daily"}'::jsonb, timeout_milliseconds := 120000);
-- Stop: select cron.unschedule('feedback-digest-daily'); select cron.unschedule('feedback-digest-weekly');
