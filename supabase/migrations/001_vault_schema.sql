-- Vault·It Supabase Schema
-- Run this in the Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name         TEXT,
  phone        TEXT,
  job          TEXT,
  dream        TEXT,
  goal         INTEGER,
  save_arch    TEXT,
  spend_arch   TEXT,
  pioneer_num  INTEGER,
  is_pioneer   BOOLEAN DEFAULT FALSE,
  currency     TEXT DEFAULT 'GBP',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- 2. Vault data (key-value mirror of localStorage)
CREATE TABLE IF NOT EXISTS public.vault_data (
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);
ALTER TABLE public.vault_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vault data" ON public.vault_data FOR ALL USING (auth.uid() = user_id);

-- 3. Net worth history (time-series)
CREATE TABLE IF NOT EXISTS public.nw_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recorded_at DATE DEFAULT CURRENT_DATE,
  value       NUMERIC,
  UNIQUE(user_id, recorded_at)
);
ALTER TABLE public.nw_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nw history" ON public.nw_history FOR ALL USING (auth.uid() = user_id);

-- 4. Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
