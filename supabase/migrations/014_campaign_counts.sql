-- 014: real backer counts for the crowdfund modal (v0.9.1, E25).
-- campaign_counts() returns one row per paid plan with how many accounts hold it right now: monthly, yearly, founder.
-- Aggregate counts only: no ids, names or e-mail addresses leave the database. Anyone may call it (the modal is shown before sign-in).
-- A plan counts while it is live: a founder never lapses; monthly and yearly count until paid_until passes (null paid_until counts).
-- Without this migration the app shows 0 backers and invents nothing. Safe to run twice. Apply after 011.

create or replace function public.campaign_counts()
returns table (plan text, backers integer)
language sql stable security definer set search_path = public as $$
  select p.plan, count(*)::integer
    from public.profiles p
   where p.plan in ('monthly', 'yearly', 'founder')
     and (p.plan = 'founder' or p.paid_until is null or p.paid_until > now())
   group by p.plan
$$;

revoke all on function public.campaign_counts() from public;
grant execute on function public.campaign_counts() to anon, authenticated, service_role;
