-- Vault·It — waitlist_count() helper (run if not already created)
-- Supabase SQL Editor → New query → paste → Run

CREATE OR REPLACE FUNCTION public.waitlist_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM public.waitlist;
$$;

GRANT EXECUTE ON FUNCTION public.waitlist_count() TO anon;
