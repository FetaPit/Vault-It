-- Vault·It — beta list with double opt-in and a consent record (vault-it.co/sign-up).
-- Only the waitlist-join edge function (service role) reads or writes the list: the public insert policy goes, and
-- the browser can no longer add rows (or someone else's address) directly.
--   join        → waitlist_request(): row is 'pending' until the address owner clicks the e-mailed link; the choices
--                 they made (testing, marketing) are held as req_* and only take effect on confirmation
--   confirm     → waitlist_confirm(): 'confirmed', choices applied, consent wording + time recorded
--   unsubscribe → waitlist_unsubscribe(): 'unsubscribed'; the address is kept only so it is never e-mailed again
-- Rows from the old landing page (no consent record) become 'legacy': they were collected to send a beta invite, not marketing.
-- Unconfirmed requests are deleted after 30 days (housekeeping inside waitlist_request).

alter table public.waitlist
  add column if not exists status              text        not null default 'legacy',
  add column if not exists wants_testing       boolean     not null default false,
  add column if not exists marketing_consent   boolean     not null default false,
  add column if not exists consent_version     text,
  add column if not exists consent_at          timestamptz,
  add column if not exists confirmed_at        timestamptz,
  add column if not exists unsubscribed_at     timestamptz,
  add column if not exists req_testing         boolean,
  add column if not exists req_marketing       boolean,
  add column if not exists req_consent_version text,
  add column if not exists req_at              timestamptz,
  add column if not exists confirm_hash        text,
  add column if not exists confirm_expires     timestamptz,
  add column if not exists utm_source          text,
  add column if not exists utm_medium          text,
  add column if not exists utm_campaign        text,
  add column if not exists utm_content         text,
  add column if not exists referrer            text,
  add column if not exists updated_at          timestamptz not null default now();

do $$ begin
  alter table public.waitlist add constraint waitlist_status_chk check (status in ('legacy', 'pending', 'confirmed', 'unsubscribed'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.waitlist add constraint waitlist_lengths_chk check (
    length(email) <= 254 and coalesce(length(source), 0) <= 40 and coalesce(length(utm_source), 0) <= 100 and coalesce(length(utm_medium), 0) <= 100
    and coalesce(length(utm_campaign), 0) <= 100 and coalesce(length(utm_content), 0) <= 100 and coalesce(length(referrer), 0) <= 200
    and coalesce(length(consent_version), 0) <= 40 and coalesce(length(req_consent_version), 0) <= 40);
exception when duplicate_object then null; end $$;

create unique index if not exists waitlist_confirm_hash_idx on public.waitlist (confirm_hash) where confirm_hash is not null;
create index if not exists waitlist_pending_idx on public.waitlist (updated_at) where status = 'pending';

-- Nobody but the server touches the table or the count any more.
drop policy if exists "public_insert" on public.waitlist;
revoke all on table public.waitlist from public, anon, authenticated;
revoke all on function public.waitlist_count() from public, anon, authenticated;

-- A join request. Returns the row id (used for the unsubscribe link). First-touch attribution is kept: a later visit
-- from another campaign does not overwrite where the person first came from.
create or replace function public.waitlist_request(
  p_email text, p_testing boolean, p_marketing boolean, p_consent_version text, p_confirm_hash text,
  p_source text, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text, p_referrer text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_email is null or length(p_email) > 254 or position('@' in p_email) < 2 then raise exception 'bad email'; end if;
  if p_confirm_hash is null or length(p_confirm_hash) <> 64 then raise exception 'bad token'; end if;
  insert into public.waitlist as w (email, source, status, req_testing, req_marketing, req_consent_version, req_at, confirm_hash, confirm_expires,
                                    utm_source, utm_medium, utm_campaign, utm_content, referrer, updated_at)
  values (lower(p_email), left(coalesce(nullif(p_source, ''), 'sign-up'), 40), 'pending', coalesce(p_testing, false), coalesce(p_marketing, false),
          left(p_consent_version, 40), now(), p_confirm_hash, now() + interval '7 days',
          left(nullif(p_utm_source, ''), 100), left(nullif(p_utm_medium, ''), 100), left(nullif(p_utm_campaign, ''), 100), left(nullif(p_utm_content, ''), 100),
          left(nullif(p_referrer, ''), 200), now())
  on conflict (email) do update set
    status              = case when w.status = 'confirmed' then 'confirmed' else 'pending' end,   -- a new request never downgrades a confirmed address
    req_testing         = excluded.req_testing,
    req_marketing       = excluded.req_marketing,
    req_consent_version = excluded.req_consent_version,
    req_at              = excluded.req_at,
    confirm_hash        = excluded.confirm_hash,
    confirm_expires     = excluded.confirm_expires,
    utm_source          = coalesce(w.utm_source, excluded.utm_source),
    utm_medium          = coalesce(w.utm_medium, excluded.utm_medium),
    utm_campaign        = coalesce(w.utm_campaign, excluded.utm_campaign),
    utm_content         = coalesce(w.utm_content, excluded.utm_content),
    referrer            = coalesce(w.referrer, excluded.referrer),
    updated_at          = now()
  returning id into v_id;

  -- housekeeping: requests nobody confirmed within 30 days are removed (bounded, so a join never does unbounded work)
  delete from public.waitlist where id in (
    select id from public.waitlist where status = 'pending' and confirmed_at is null and updated_at < now() - interval '30 days' limit 200);
  return v_id;
end $$;

-- The address owner clicked the link. Their choices from the request take effect now, and the consent record is written.
create or replace function public.waitlist_confirm(p_confirm_hash text)
returns table (id uuid, email text, wants_testing boolean) language plpgsql security definer set search_path = public as $$
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
  returning w.id, w.email, w.wants_testing;
end $$;

-- Leave the list (and any marketing). The address stays as a suppression record so it is never e-mailed again.
create or replace function public.waitlist_unsubscribe(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.waitlist set status = 'unsubscribed', marketing_consent = false, wants_testing = false, unsubscribed_at = now(),
         consent_version = null, consent_at = null, req_testing = null, req_marketing = null, req_consent_version = null, req_at = null,
         confirm_hash = null, confirm_expires = null, updated_at = now()
   where id = p_id;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.waitlist_request(text, boolean, boolean, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.waitlist_confirm(text) from public, anon, authenticated;
revoke all on function public.waitlist_unsubscribe(uuid) from public, anon, authenticated;
grant execute on function public.waitlist_request(text, boolean, boolean, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.waitlist_confirm(text) to service_role;
grant execute on function public.waitlist_unsubscribe(uuid) to service_role;
grant execute on function public.waitlist_count() to service_role;
