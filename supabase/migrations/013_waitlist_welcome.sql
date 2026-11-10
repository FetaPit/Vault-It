-- 013: welcome e-mail on confirmation (owner, 1 Nov 2026: "start sending with sign ups").
-- Only people who ticked the marketing box (and then confirmed by e-mail) get it: waitlist_confirm now also returns that choice.
-- welcome_sent_at records the send; waitlist_confirm returns welcome_due (never sent yet), so re-joining and confirming again never sends it twice,
-- and a failed send stays null so it can be found and retried.
-- Apply BEFORE deploying the waitlist-join function that calls waitlist_mark_welcome (it fails open to "no welcome sent" without it).

alter table public.waitlist add column if not exists welcome_sent_at timestamptz;

drop function if exists public.waitlist_confirm(text);
create function public.waitlist_confirm(p_confirm_hash text)
returns table (id uuid, email text, wants_testing boolean, marketing_consent boolean, welcome_due boolean) language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.waitlist w set
    status            = 'confirmed',
    confirmed_at      = coalesce(w.confirmed_at, now()),
    unsubscribed_at   = null,
    wants_testing     = coalesce(w.req_testing, false),
    marketing_consent = coalesce(w.req_marketing, false),
    consent_version   = case when coalesce(w.req_marketing, false) then w.req_consent_version else null end,
    consent_at        = case when coalesce(w.req_marketing, false) then w.req_at else null end,
    req_testing = null, req_marketing = null, req_consent_version = null, req_at = null,
    confirm_hash = null, confirm_expires = null, updated_at = now()
  where w.confirm_hash = p_confirm_hash and w.confirm_expires > now()
  returning w.id, w.email, w.wants_testing, w.marketing_consent, (w.welcome_sent_at is null);
end $$;

-- Marks the welcome as sent. True only the first time, and only while the person is still confirmed with marketing consent.
create or replace function public.waitlist_mark_welcome(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.waitlist set welcome_sent_at = now()
   where id = p_id and welcome_sent_at is null and status = 'confirmed' and marketing_consent = true;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.waitlist_confirm(text) from public, anon, authenticated;
revoke all on function public.waitlist_mark_welcome(uuid) from public, anon, authenticated;
grant execute on function public.waitlist_confirm(text) to service_role;
grant execute on function public.waitlist_mark_welcome(uuid) to service_role;
