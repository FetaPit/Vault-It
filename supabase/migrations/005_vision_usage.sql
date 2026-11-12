-- Vault·It — daily cap on screenshot reads (portfolio-vision edge function)
-- Each read costs real money, so every signed-in user gets a small daily allowance.
-- Only the edge function (service role) can touch this table.

CREATE TABLE IF NOT EXISTS public.vision_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day     DATE NOT NULL DEFAULT CURRENT_DATE,
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.vision_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vision_usage FROM anon, authenticated;

-- Atomically spend `p_cost` reads; returns false (and spends nothing) if that would pass the cap.
CREATE OR REPLACE FUNCTION public.vision_take(p_user UUID, p_cost INTEGER DEFAULT 1, p_max INTEGER DEFAULT 30)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE used INTEGER;
BEGIN
  INSERT INTO public.vision_usage(user_id, day, n) VALUES (p_user, CURRENT_DATE, 0)
    ON CONFLICT (user_id, day) DO NOTHING;
  SELECT n INTO used FROM public.vision_usage WHERE user_id = p_user AND day = CURRENT_DATE FOR UPDATE;
  IF used + p_cost > p_max THEN RETURN FALSE; END IF;
  UPDATE public.vision_usage SET n = n + p_cost WHERE user_id = p_user AND day = CURRENT_DATE;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.vision_take(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vision_take(UUID, INTEGER, INTEGER) TO service_role;
