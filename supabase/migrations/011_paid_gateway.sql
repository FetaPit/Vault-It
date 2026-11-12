-- Vault-It: secure paid gateway (owner, 31 Oct 2026: "yes we need to set up the paid gateway securely").
-- Paid status is written only by the stripe-webhook edge function (service role, through stripe_apply below), never by the browser.
--   profiles gains plan / paid_at / paid_until / stripe ids / stripe_synced_at / is_beta.
--   A BEFORE INSERT/UPDATE guard keeps the browser's hands off every paid column, silently: the app's own profile upsert
--   (name, goal, currency …) keeps working, a claimed is_pioneer = true is simply ignored.
--   is_beta: every address confirmed on the waitlist is a beta tester (owner, 31 Oct). Set on sign-up and when the address confirms.
--   stripe_events: each Stripe event is applied once (idempotent), out-of-date subscription events are skipped.
-- Existing rows are NOT cleared: Pete reconciles self-declared paid rows against Stripe first (owner, 31 Oct).
-- Run order: apply this migration, then deploy stripe-webhook, then set STRIPE_WEBHOOK_SECRET and add the endpoint in Stripe.
-- Safe to run twice.

alter table public.profiles
  add column if not exists plan                   text,
  add column if not exists paid_at                timestamptz,
  add column if not exists paid_until             timestamptz,
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_synced_at       timestamptz,
  add column if not exists is_beta                boolean not null default false;

do $$ begin
  alter table public.profiles add constraint profiles_plan_chk check (plan is null or plan in ('monthly', 'yearly', 'founder'));
exception when duplicate_object then null; end $$;
create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
create index if not exists profiles_stripe_sub_idx      on public.profiles (stripe_subscription_id) where stripe_subscription_id is not null;

-- 1) The guard. SECURITY INVOKER on purpose: current_user is the caller's role, so the browser roles (anon, authenticated)
--    are told apart from the service role, the owner's SQL editor and the SECURITY DEFINER functions below.
create or replace function public.profiles_paid_guard() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'INSERT' then
    new.is_pioneer := false; new.is_founder := false; new.plan := null; new.paid_at := null; new.paid_until := null;
    new.stripe_customer_id := null; new.stripe_subscription_id := null; new.stripe_synced_at := null; new.is_beta := false;
  else
    new.is_pioneer := old.is_pioneer; new.is_founder := old.is_founder; new.plan := old.plan; new.paid_at := old.paid_at;
    new.paid_until := old.paid_until; new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id; new.stripe_synced_at := old.stripe_synced_at; new.is_beta := old.is_beta;
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_paid_guard() from public, anon, authenticated;
drop trigger if exists profiles_paid_guard on public.profiles;
create trigger profiles_paid_guard before insert or update on public.profiles
  for each row execute function public.profiles_paid_guard();

-- 2) Beta testers: an address confirmed on the waitlist (confirmed_at set; leaving the marketing list later does not undo it).
create or replace function public.profiles_mark_beta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set is_beta = true
   where p.id = new.id and not p.is_beta
     and exists (select 1 from auth.users u join public.waitlist w on lower(w.email) = lower(u.email)
                  where u.id = new.id and w.confirmed_at is not null);
  return null;
end;
$$;
revoke all on function public.profiles_mark_beta() from public, anon, authenticated;
drop trigger if exists profiles_mark_beta on public.profiles;
create trigger profiles_mark_beta after insert on public.profiles
  for each row execute function public.profiles_mark_beta();

create or replace function public.waitlist_mark_beta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.confirmed_at is not null and (tg_op = 'INSERT' or old.confirmed_at is null) then
    update public.profiles p set is_beta = true
     where not p.is_beta and p.id in (select u.id from auth.users u where lower(u.email) = lower(new.email));
  end if;
  return null;
end;
$$;
revoke all on function public.waitlist_mark_beta() from public, anon, authenticated;
drop trigger if exists waitlist_mark_beta on public.waitlist;
create trigger waitlist_mark_beta after insert or update of confirmed_at on public.waitlist
  for each row execute function public.waitlist_mark_beta();

-- testers who already have an account
update public.profiles p set is_beta = true
 where not p.is_beta and exists (select 1 from auth.users u join public.waitlist w on lower(w.email) = lower(u.email)
                                  where u.id = p.id and w.confirmed_at is not null);

-- 3) Stripe events, each applied once. No policies: the browser can neither read nor write it.
create table if not exists public.stripe_events (
  id          text primary key,             -- evt_…
  kind        text not null,
  created     timestamptz not null,
  user_id     uuid,
  email       text,                         -- kept only when no account matched, so Pete can reconcile by hand
  result      text,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

-- 4) Apply one Stripe event. Called only by the stripe-webhook function (service role) after it has checked the signature.
--    p_kind 'checkout'     : a completed payment (client_reference_id = account id; else the Stripe customer; else the checkout e-mail)
--    p_kind 'subscription' : a subscription changed or ended (matched by subscription id, then customer id)
--    Returns 'applied' | 'duplicate' | 'no_user' | 'stale' | 'other_subscription'.
create or replace function public.stripe_apply(
  p_event text, p_created timestamptz, p_kind text, p_user uuid, p_email text, p_customer text, p_sub text,
  p_plan text, p_status text, p_paid_until timestamptz)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid; pr public.profiles%rowtype; live boolean; res text := 'applied';
begin
  if p_kind not in ('checkout', 'subscription') then raise exception 'unknown kind %', p_kind; end if;
  if p_plan is not null and p_plan not in ('monthly', 'yearly', 'founder') then p_plan := null; end if;
  insert into public.stripe_events(id, kind, created) values (p_event, p_kind, p_created) on conflict (id) do nothing;
  if not found then return 'duplicate'; end if;

  if p_user is not null then select id into uid from public.profiles where id = p_user; end if;
  if uid is null and p_sub is not null then select id into uid from public.profiles where stripe_subscription_id = p_sub limit 1; end if;
  if uid is null and p_customer is not null then select id into uid from public.profiles where stripe_customer_id = p_customer limit 1; end if;
  if uid is null and p_kind = 'checkout' and p_email is not null then
    select p.id into uid from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = lower(p_email) limit 1;
  end if;
  if uid is null then
    update public.stripe_events set result = 'no_user', email = lower(p_email) where id = p_event;
    return 'no_user';
  end if;

  select * into pr from public.profiles where id = uid for update;

  if p_kind = 'checkout' then
    if pr.stripe_synced_at is not null and p_created < pr.stripe_synced_at then
      -- an older payment arriving late: link the ids if missing, change nothing else
      update public.profiles set stripe_customer_id = coalesce(stripe_customer_id, p_customer),
                                 stripe_subscription_id = coalesce(stripe_subscription_id, p_sub) where id = uid;
      res := 'stale';
    else
      update public.profiles set
        is_pioneer             = true,
        is_founder             = is_founder or p_plan = 'founder',
        plan                   = case when is_founder or p_plan = 'founder' then 'founder' else coalesce(p_plan, plan) end,
        paid_at                = coalesce(paid_at, p_created),
        paid_until             = case when is_founder or p_plan = 'founder' then null else p_paid_until end,
        stripe_customer_id     = coalesce(p_customer, stripe_customer_id),
        stripe_subscription_id = coalesce(p_sub, stripe_subscription_id),
        stripe_synced_at       = p_created
      where id = uid;
    end if;
  else
    if pr.stripe_subscription_id is not null and p_sub is distinct from pr.stripe_subscription_id then
      res := 'other_subscription';                       -- an old subscription ending must not cancel the current one
    elsif pr.stripe_synced_at is not null and p_created < pr.stripe_synced_at then
      res := 'stale';                                    -- Stripe can deliver events out of order
    else
      -- paying (past_due = Stripe is retrying a card) / ended / anything else (incomplete: the first payment is still going through) leaves it as it is
      live := case when p_status in ('active', 'trialing', 'past_due') then true
                   when p_status in ('canceled', 'unpaid', 'incomplete_expired', 'paused') then false end;
      update public.profiles set
        is_pioneer             = is_founder or coalesce(live, is_pioneer),
        paid_until             = case when is_founder then null else coalesce(p_paid_until, paid_until) end,
        plan                   = case when is_founder then 'founder' else coalesce(p_plan, plan) end,
        stripe_customer_id     = coalesce(stripe_customer_id, p_customer),
        stripe_subscription_id = coalesce(stripe_subscription_id, p_sub),
        stripe_synced_at       = p_created
      where id = uid;
    end if;
  end if;
  update public.stripe_events set user_id = uid, result = res where id = p_event;
  return res;
end;
$$;
revoke all on function public.stripe_apply(text, timestamptz, text, uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.stripe_apply(text, timestamptz, text, uuid, text, text, text, text, text, timestamptz) to service_role;

-- 5) Erasing an account also unlinks its Stripe events (kept without the person, so a replayed event is still a duplicate).
create or replace function public.erase_user_data(p_user UUID, p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.vault_data         WHERE user_id = p_user;
  DELETE FROM public.vault_data_history WHERE user_id = p_user;
  DELETE FROM public.nw_history         WHERE user_id = p_user;
  DELETE FROM public.vision_usage       WHERE user_id = p_user;
  DELETE FROM public.user_pins          WHERE user_id = p_user;
  DELETE FROM public.waitlist           WHERE lower(email) = lower(p_email);
  UPDATE public.stripe_events SET user_id = NULL, email = NULL WHERE user_id = p_user OR lower(email) = lower(p_email);
  DELETE FROM public.profiles           WHERE id = p_user;
END;
$$;
REVOKE ALL ON FUNCTION public.erase_user_data(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_user_data(UUID, TEXT) TO service_role;
