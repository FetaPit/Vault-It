-- Vault·It — Waitlist table for landing page sign-ups
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run

CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL,
  source     TEXT DEFAULT 'landing',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can add themselves
CREATE POLICY "public_insert" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- Secure count function: anon can call this to get the spot count
-- without being able to read any email addresses
CREATE OR REPLACE FUNCTION public.waitlist_count()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM public.waitlist;
$$;

GRANT EXECUTE ON FUNCTION public.waitlist_count() TO anon;
