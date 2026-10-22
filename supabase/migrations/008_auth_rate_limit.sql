-- Vault·It — abuse protection for sign-in e-mails and PIN guessing, plus a one-call account eraser.
-- Not reachable by clients: RLS on, grants revoked, functions callable by the service role only
-- (the `send-auth-email` and `pin-auth` edge functions).

-- 1) Fixed-window rate limiter. Keys are hashed by the edge functions (never a raw e-mail or IP).
CREATE TABLE IF NOT EXISTS public.auth_rate (
  key          TEXT PRIMARY KEY,
  n            INTEGER NOT NULL,
  window_start TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.auth_rate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_rate FROM anon, authenticated;

-- One atomic round trip: counts this call and says whether it is still inside the allowance.
-- allowed = false → retry_after is the number of seconds until the window resets.
CREATE OR REPLACE FUNCTION public.rate_hit(p_key TEXT, p_limit INTEGER, p_window_secs INTEGER)
RETURNS TABLE(allowed BOOLEAN, retry_after INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cnt   INTEGER;
  began TIMESTAMPTZ;
BEGIN
  INSERT INTO public.auth_rate AS a (key, n, window_start) VALUES (p_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
     SET n            = CASE WHEN a.window_start < NOW() - make_interval(secs => p_window_secs) THEN 1 ELSE a.n + 1 END,
         window_start = CASE WHEN a.window_start < NOW() - make_interval(secs => p_window_secs) THEN NOW() ELSE a.window_start END
  RETURNING a.n, a.window_start INTO cnt, began;

  -- housekeeping: about 1 call in 50 sweeps counters whose window ended more than a day ago
  IF random() < 0.02 THEN
    DELETE FROM public.auth_rate WHERE window_start < NOW() - INTERVAL '1 day';
  END IF;

  RETURN QUERY SELECT cnt <= p_limit,
    CASE WHEN cnt <= p_limit THEN 0
         ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (began + make_interval(secs => p_window_secs) - NOW())))::INTEGER) END;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_hit(TEXT, INTEGER, INTEGER) TO service_role;

-- 2) Erase everything held about one person, in the one order that works.
--    vault_data has a BEFORE DELETE trigger that archives each row into vault_data_history, so the
--    history must be removed AFTER vault_data (and before the auth user goes) or it would be re-filled.
--    The edge function deletes the auth user afterwards (that cascades to anything left).
CREATE OR REPLACE FUNCTION public.erase_user_data(p_user UUID, p_email TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.vault_data         WHERE user_id = p_user;
  DELETE FROM public.vault_data_history WHERE user_id = p_user;
  DELETE FROM public.nw_history         WHERE user_id = p_user;
  DELETE FROM public.vision_usage       WHERE user_id = p_user;
  DELETE FROM public.user_pins          WHERE user_id = p_user;
  DELETE FROM public.waitlist           WHERE lower(email) = lower(p_email);
  DELETE FROM public.profiles           WHERE id = p_user;
END;
$$;
REVOKE ALL ON FUNCTION public.erase_user_data(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_user_data(UUID, TEXT) TO service_role;
