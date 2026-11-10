-- Vault·It — screenshot reads become a MONTHLY allowance per plan (owner's decision 2026-10-29): free 3, Pioneer 30, Founding Member 10.
-- The daily rows in vision_usage stay; the month's total is their sum. Today's row is locked first, so two reads at once cannot both pass the cap.
-- profiles.is_founder marks Founding Members (set by the owner when a £149 payment arrives; it only ever LOWERS the allowance, so a user
-- setting it on their own row gains nothing).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.vision_take_month(p_user UUID, p_cost INTEGER DEFAULT 1, p_max INTEGER DEFAULT 3)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE used INTEGER;
BEGIN
  INSERT INTO public.vision_usage(user_id, day, n) VALUES (p_user, CURRENT_DATE, 0) ON CONFLICT (user_id, day) DO NOTHING;
  PERFORM 1 FROM public.vision_usage WHERE user_id = p_user AND day = CURRENT_DATE FOR UPDATE;
  SELECT COALESCE(SUM(n), 0) INTO used FROM public.vision_usage
   WHERE user_id = p_user AND day >= date_trunc('month', CURRENT_DATE)::date;
  IF p_cost > 0 AND used + p_cost > p_max THEN RETURN FALSE; END IF;
  UPDATE public.vision_usage SET n = GREATEST(0, n + p_cost) WHERE user_id = p_user AND day = CURRENT_DATE;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.vision_take_month(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vision_take_month(UUID, INTEGER, INTEGER) TO service_role;
