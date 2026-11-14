-- Vault-It: tier and billing period recorded separately (owner, 13 Nov 2026: "Vaulter is always going to be the tier without
-- additional pro features, with a yearly discount, Pioneer is the Pro subscription and with a yearly option"; plan cards, queue
-- line "Plan cards for the 13 Nov 2026 prices and tier model"). Until now one value, profiles.plan, said both:
-- monthly = Vaulter, yearly = Pioneer, founder = Lifetime licence / Founding Member. A Vaulter yearly or a Pioneer monthly payment
-- could not be told apart from the other tier by its interval, so the new Payment Links stay switched off until this is applied
-- and the webhook that reads their metadata is deployed.
--   profiles.tier     'vaulter' | 'pioneer' | 'founder'
--   profiles.billing  'month' | 'year' | 'once'
--   profiles.pro_kept the testers keep (owner, 13 Nov: "Gate, testers keep"): true for an account already on Vaulter when this
--                     migration is applied. They keep the Pro features while they stay subscribed; a new subscription (a
--                     different Stripe subscription id) starts without it, like the first movers' price.
--   profiles.plan     stays as a mirror for older app builds: vaulter -> monthly, pioneer -> yearly, founder -> founder.
-- Existing accounts keep their meaning (monthly -> vaulter/month, yearly -> pioneer/year, founder -> founder/once); nothing is cleared.
-- The browser still cannot write any of it (profiles_paid_guard). stripe_apply gains two optional arguments, p_tier and p_billing;
-- a caller that sends only p_plan (an older webhook, the tests) still works.
-- Run order: apply this migration, then deploy stripe-webhook, then release the app, then switch the new Payment Links on.
-- Safe to run twice. Do not run 011 again once this is applied: it would bring back the ten-argument function and the older guard.

alter table public.profiles
  add column if not exists tier     text,
  add column if not exists billing  text,
  add column if not exists pro_kept boolean not null default false;

do $$ begin
  alter table public.profiles add constraint profiles_tier_chk check (tier is null or tier in ('vaulter', 'pioneer', 'founder'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_billing_chk check (billing is null or billing in ('month', 'year', 'once'));
exception when duplicate_object then null; end $$;

-- 1) Existing accounts keep their meaning. Only rows with no tier yet are touched, so a second run changes nothing.
--    pro_kept: an account on Vaulter and paid right now. One that had cancelled has nothing to keep.
update public.profiles set tier = 'founder', billing = 'once' where tier is null and is_founder;   -- a Lifetime holder, however plan was recorded (010: set by hand)
update public.profiles set tier = 'vaulter', billing = 'month', pro_kept = coalesce(is_pioneer, false) and not is_founder
 where tier is null and plan = 'monthly';
update public.profiles set tier = 'pioneer', billing = 'year'  where tier is null and plan = 'yearly';
update public.profiles set tier = 'founder', billing = 'once'  where tier is null and plan = 'founder';

-- 2) The guard (replaces 011's): the browser's hands off the new columns too, silently, as for the paid columns.
create or replace function public.profiles_paid_guard() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'INSERT' then
    new.is_pioneer := false; new.is_founder := false; new.plan := null; new.paid_at := null; new.paid_until := null;
    new.stripe_customer_id := null; new.stripe_subscription_id := null; new.stripe_synced_at := null; new.is_beta := false;
    new.tier := null; new.billing := null; new.pro_kept := false;
  else
    new.is_pioneer := old.is_pioneer; new.is_founder := old.is_founder; new.plan := old.plan; new.paid_at := old.paid_at;
    new.paid_until := old.paid_until; new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id; new.stripe_synced_at := old.stripe_synced_at; new.is_beta := old.is_beta;
    new.tier := old.tier; new.billing := old.billing; new.pro_kept := old.pro_kept;
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_paid_guard() from public, anon, authenticated;

-- 3) Apply one Stripe event (replaces 011's: the old ten-argument function is dropped so a call cannot be ambiguous).
--    p_tier / p_billing: what the webhook read from our own link, price or subscription metadata. A pair we do not sell, or one that
--    does not belong together (a Lifetime licence is always 'once'; Vaulter and Pioneer are 'month' or 'year'), is ignored.
--    p_plan alone (an older caller) is read as before: monthly = Vaulter month, yearly = Pioneer year, founder = founder once.
--    A subscription event with no tier information changes the status and dates and leaves the tier as it was: the tier is never
--    guessed from the interval.
drop function if exists public.stripe_apply(text, timestamptz, text, uuid, text, text, text, text, text, timestamptz);
create or replace function public.stripe_apply(
  p_event text, p_created timestamptz, p_kind text, p_user uuid, p_email text, p_customer text, p_sub text,
  p_plan text, p_status text, p_paid_until timestamptz, p_tier text default null, p_billing text default null)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid; pr public.profiles%rowtype; live boolean; res text := 'applied'; v_plan text;
begin
  if p_kind not in ('checkout', 'subscription') then raise exception 'unknown kind %', p_kind; end if;
  if p_plan is not null and p_plan not in ('monthly', 'yearly', 'founder') then p_plan := null; end if;
  if p_tier is not null and p_tier not in ('vaulter', 'pioneer', 'founder') then p_tier := null; end if;
  if p_billing is not null and p_billing not in ('month', 'year', 'once') then p_billing := null; end if;
  if p_tier = 'founder' then p_billing := 'once'; end if;
  if (p_tier in ('vaulter', 'pioneer') and p_billing is distinct from 'month' and p_billing is distinct from 'year') or (p_tier is null and p_billing is not null) then
    p_tier := null; p_billing := null;                  -- half a pair tells us nothing we can trust
  end if;
  if p_tier is null and p_billing is null and p_plan is not null then   -- an older caller: the plan name only
    p_tier    := case p_plan when 'monthly' then 'vaulter' when 'yearly' then 'pioneer' else 'founder' end;
    p_billing := case p_plan when 'monthly' then 'month'   when 'yearly' then 'year'    else 'once'    end;
  end if;
  v_plan := case p_tier when 'founder' then 'founder' when 'pioneer' then 'yearly' when 'vaulter' then 'monthly' else null end;
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
        is_founder             = is_founder or coalesce(p_tier, '') = 'founder',
        plan                   = case when is_founder or coalesce(p_tier, '') = 'founder' then 'founder' else coalesce(v_plan, plan) end,
        tier                   = case when is_founder or coalesce(p_tier, '') = 'founder' then 'founder' else coalesce(p_tier, tier) end,
        billing                = case when is_founder or coalesce(p_tier, '') = 'founder' then 'once' else coalesce(p_billing, billing) end,
        -- the testers keep the Pro features only while they stay on the subscription they had: a new one starts without the flag
        pro_kept               = case when p_tier is not null and p_sub is not null and p_sub is distinct from stripe_subscription_id then false else pro_kept end,
        paid_at                = coalesce(paid_at, p_created),
        paid_until             = case when is_founder or coalesce(p_tier, '') = 'founder' then null else p_paid_until end,
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
        plan                   = case when is_founder then 'founder' else coalesce(v_plan, plan) end,
        tier                   = case when is_founder then 'founder' else coalesce(p_tier, tier) end,
        billing                = case when is_founder then 'once' else coalesce(p_billing, billing) end,
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
revoke all on function public.stripe_apply(text, timestamptz, text, uuid, text, text, text, text, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.stripe_apply(text, timestamptz, text, uuid, text, text, text, text, text, timestamptz, text, text) to service_role;
