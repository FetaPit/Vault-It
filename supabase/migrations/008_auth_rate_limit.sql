-- Vault·It — abuse protection for sign-in e-mails and PIN guessing, plus a one-call account eraser.
-- Not reachable by clients: RLS on, grants revoked, functions callable by the service role only
-- (the `send-auth-email` and `pin-auth` edge functions).

-- 1) Fixed-window rate limiter. Keys are hashed by the edge functions (never a raw e-mail or IP).
CREATE TABLE IF NOT EXISTS public.auth_rate (
  key          TEXT PRIMARY KEY,
  n            INTEGER NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.auth_rate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_rate FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS auth_rate_expires_idx ON public.auth_rate (expires_at);

-- One atomic round trip: counts this call and says whether it is still inside the allowance.
-- allowed = false → retry_after is the number of seconds until the window resets.
CREATE OR REPLACE FUNCTION public.rate_hit(p_key TEXT, p_limit INTEGER, p_window_secs INTEGER)
RETURNS TABLE(allowed BOOLEAN, retry_after INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cnt  INTEGER;
  ends TIMESTAMPTZ;
BEGIN
  -- housekeeping BEFORE taking any row lock: about 1 call in 20 clears a bounded batch of counters that expired
  -- more than 5 minutes ago (SKIP LOCKED: never waits on, or deadlocks with, a concurrent call)
  IF random() < 0.05 THEN
    DELETE FROM public.auth_rate WHERE ctid IN (
      SELECT ctid FROM public.auth_rate WHERE expires_at < NOW() - INTERVAL '5 minutes' LIMIT 500 FOR UPDATE SKIP LOCKED);
  END IF;

  -- retention housekeeping, same idea: rarely, a bounded batch. Saved versions older than 180 days (the privacy notice's promise;
  -- the archive trigger only prunes a key when that same key is archived again) and per-day usage counters older than 30 days.
  IF random() < 0.01 THEN
    DELETE FROM public.vault_data_history WHERE id IN (
      SELECT id FROM public.vault_data_history WHERE archived_at < NOW() - INTERVAL '180 days' LIMIT 500);
    DELETE FROM public.vision_usage WHERE ctid IN (
      SELECT ctid FROM public.vision_usage WHERE day < CURRENT_DATE - 30 LIMIT 500 FOR UPDATE SKIP LOCKED);
  END IF;

  INSERT INTO public.auth_rate AS a (key, n, window_start, expires_at)
       VALUES (p_key, 1, NOW(), NOW() + make_interval(secs => p_window_secs))
  ON CONFLICT (key) DO UPDATE
     SET n            = CASE WHEN a.expires_at < NOW() THEN 1 ELSE a.n + 1 END,
         window_start = CASE WHEN a.expires_at < NOW() THEN NOW() ELSE a.window_start END,
         expires_at   = CASE WHEN a.expires_at < NOW() THEN NOW() + make_interval(secs => p_window_secs) ELSE a.expires_at END
  RETURNING a.n, a.expires_at INTO cnt, ends;

  RETURN QUERY SELECT cnt <= p_limit,
    CASE WHEN cnt <= p_limit THEN 0 ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (ends - NOW())))::INTEGER) END;
END;
$$;
CREATE INDEX IF NOT EXISTS vault_data_history_age_idx ON public.vault_data_history (archived_at);
REVOKE ALL ON FUNCTION public.rate_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_hit(TEXT, INTEGER, INTEGER) TO service_role;

-- 2) Erase everything held about one person, in the one order that works.
--    vault_data has a BEFORE DELETE trigger that archives each row into vault_data_history, so the
--    history must be removed AFTER vault_data (and before the auth user goes) or it would be re-filled.
--    The edge function deletes the auth user afterwards and then calls this once more (idempotent) as a sweep.
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

-- 3) Deleting an auth user from anywhere (dashboard "Delete user", a race with the eraser) cascades
--    auth.users → profiles → vault_data, and the archive trigger from 006 would re-file every row into
--    vault_data_history for good. When the owner's profile is already gone there is nobody to archive for.
--    (A user deleting their own vault_data row while their profile exists is still archived, as before.)
CREATE OR REPLACE FUNCTION public.vault_data_archive() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE why TEXT;
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = OLD.user_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.value IS NOT DISTINCT FROM OLD.value THEN RETURN NEW; END IF;
  IF TG_OP = 'DELETE' THEN why := 'deleted';
  ELSIF length(coalesce(NEW.value::text, '')) < length(coalesce(OLD.value::text, '')) / 2 THEN why := 'shrunk';
  ELSIF NOT EXISTS (SELECT 1 FROM public.vault_data_history h
                     WHERE h.user_id = OLD.user_id AND h.key = OLD.key AND h.archived_at > NOW() - INTERVAL '5 minutes') THEN why := 'edited';
  END IF;
  IF why IS NOT NULL THEN
    INSERT INTO public.vault_data_history(user_id, key, value, row_updated, reason) VALUES (OLD.user_id, OLD.key, OLD.value, OLD.updated_at, why);
    DELETE FROM public.vault_data_history h WHERE h.user_id = OLD.user_id AND h.key = OLD.key AND h.archived_at < NOW() - INTERVAL '180 days';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.vault_data_archive() FROM PUBLIC, anon, authenticated;

-- 4) The version list must honour the same 180 days even before the housekeeping above has reached an old row.
CREATE OR REPLACE FUNCTION public.vault_history_list(p_limit INTEGER DEFAULT 60)
RETURNS TABLE(id BIGINT, key TEXT, value JSONB, row_updated TIMESTAMPTZ, archived_at TIMESTAMPTZ, reason TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.key, h.value, h.row_updated, h.archived_at, h.reason
    FROM public.vault_data_history h
   WHERE h.user_id = auth.uid() AND h.archived_at > NOW() - INTERVAL '180 days'
   ORDER BY h.archived_at DESC
   LIMIT LEAST(GREATEST(p_limit, 1), 200);
$$;
REVOKE ALL ON FUNCTION public.vault_history_list(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vault_history_list(INTEGER) TO authenticated;
