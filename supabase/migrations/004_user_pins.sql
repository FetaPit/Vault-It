-- Vault·It — PIN login (email + PIN on any device)
-- The PIN is verified ONLY by the `pin-auth` edge function using the service role.
-- Clients can never read or write this table (RLS on, no policies, grants revoked).

CREATE TABLE IF NOT EXISTS public.user_pins (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  pin_hash        TEXT NOT NULL,            -- PBKDF2-SHA256(pin | server secret, salt)
  salt            TEXT NOT NULL,
  iterations      INTEGER NOT NULL DEFAULT 120000,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_pins FROM anon, authenticated;

-- Reserve one PIN attempt atomically BEFORE the PIN is checked, so firing many guesses in
-- parallel cannot get past the lockout. 5 attempts, then locked 15 min; every further 5 doubles
-- the lock (30 min, 1 h … capped at 24 h). Counter decays after 24 h without attempts.
CREATE OR REPLACE FUNCTION public.pin_begin_attempt(p_email TEXT, p_max INTEGER DEFAULT 5)
RETURNS TABLE(user_id UUID, pin_hash TEXT, salt TEXT, iterations INTEGER, attempts INTEGER, locked_secs INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r   public.user_pins%ROWTYPE;
  n   INTEGER;
  lk  TIMESTAMPTZ;
BEGIN
  SELECT * INTO r FROM public.user_pins WHERE email = lower(p_email) FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF r.locked_until IS NOT NULL AND r.locked_until > NOW() THEN
    RETURN QUERY SELECT r.user_id, NULL::TEXT, NULL::TEXT, 0, r.failed_attempts,
      CEIL(EXTRACT(EPOCH FROM (r.locked_until - NOW())))::INTEGER;
    RETURN;
  END IF;

  n := r.failed_attempts;
  IF r.last_attempt_at IS NOT NULL AND r.last_attempt_at < NOW() - INTERVAL '24 hours' THEN n := 0; END IF;
  n := n + 1;
  lk := NULL;
  IF n % p_max = 0 THEN
    lk := NOW() + make_interval(mins => LEAST(1440, 15 * power(2, (n / p_max) - 1)::INTEGER));
  END IF;

  UPDATE public.user_pins
     SET failed_attempts = n, locked_until = lk, last_attempt_at = NOW()
   WHERE public.user_pins.user_id = r.user_id;

  RETURN QUERY SELECT r.user_id, r.pin_hash, r.salt, r.iterations, n, 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_reset_attempts(p_user UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_pins SET failed_attempts = 0, locked_until = NULL WHERE user_id = p_user;
$$;

REVOKE ALL ON FUNCTION public.pin_begin_attempt(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_reset_attempts(UUID)         FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pin_begin_attempt(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.pin_reset_attempts(UUID)         TO service_role;
