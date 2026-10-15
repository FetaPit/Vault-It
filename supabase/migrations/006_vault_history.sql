-- Vault·It — version history for every vault_data change, so any overwrite can be undone.
-- A trigger copies the OLD value into vault_data_history before every update/delete:
--   • deletes and big shrinks (e.g. a list being emptied) are ALWAYS archived;
--   • ordinary edits are archived at most once per 5 minutes per area (keeps the pre-edit state of each burst);
--   • kept for 180 days.
-- Users can list and restore ONLY their own versions, through the two functions at the bottom.

CREATE TABLE IF NOT EXISTS public.vault_data_history (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,
  key         TEXT NOT NULL,
  value       JSONB,
  row_updated TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason      TEXT
);
CREATE INDEX IF NOT EXISTS vault_data_history_lookup ON public.vault_data_history (user_id, key, archived_at DESC);
ALTER TABLE public.vault_data_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_data_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.vault_data_archive() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE why TEXT;
BEGIN
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

DROP TRIGGER IF EXISTS vault_data_archive_trg ON public.vault_data;
CREATE TRIGGER vault_data_archive_trg BEFORE UPDATE OR DELETE ON public.vault_data
  FOR EACH ROW EXECUTE FUNCTION public.vault_data_archive();

-- The signed-in user's own versions (newest first)
CREATE OR REPLACE FUNCTION public.vault_history_list(p_limit INTEGER DEFAULT 60)
RETURNS TABLE(id BIGINT, key TEXT, value JSONB, row_updated TIMESTAMPTZ, archived_at TIMESTAMPTZ, reason TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.key, h.value, h.row_updated, h.archived_at, h.reason
    FROM public.vault_data_history h
   WHERE h.user_id = auth.uid()
   ORDER BY h.archived_at DESC
   LIMIT LEAST(GREATEST(p_limit, 1), 200);
$$;

-- Put one of the user's own versions back (the current value is archived first by the trigger)
CREATE OR REPLACE FUNCTION public.vault_history_restore(p_id BIGINT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h public.vault_data_history%ROWTYPE;
BEGIN
  SELECT * INTO h FROM public.vault_data_history WHERE id = p_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.vault_data(user_id, key, value, updated_at) VALUES (h.user_id, h.key, h.value, NOW())
    ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  RETURN h.key;
END;
$$;
REVOKE ALL ON FUNCTION public.vault_history_list(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vault_history_restore(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vault_history_list(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vault_history_restore(BIGINT) TO authenticated;
