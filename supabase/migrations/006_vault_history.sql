-- Vault·It — history of every vault_data change, so an overwritten area can always be restored.
-- A trigger copies the OLD value into vault_data_history before any update/delete (at most one copy per
-- key per 10 minutes, kept 90 days). Only the service role / dashboard can read it; clients cannot.

CREATE TABLE IF NOT EXISTS public.vault_data_history (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,
  key         TEXT NOT NULL,
  value       JSONB,
  row_updated TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vault_data_history_lookup ON public.vault_data_history (user_id, key, archived_at DESC);
ALTER TABLE public.vault_data_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_data_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.vault_data_archive() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.value IS NOT DISTINCT FROM OLD.value THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vault_data_history h
                  WHERE h.user_id = OLD.user_id AND h.key = OLD.key AND h.archived_at > NOW() - INTERVAL '10 minutes') THEN
    INSERT INTO public.vault_data_history(user_id, key, value, row_updated) VALUES (OLD.user_id, OLD.key, OLD.value, OLD.updated_at);
    DELETE FROM public.vault_data_history h WHERE h.user_id = OLD.user_id AND h.key = OLD.key AND h.archived_at < NOW() - INTERVAL '90 days';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.vault_data_archive() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS vault_data_archive_trg ON public.vault_data;
CREATE TRIGGER vault_data_archive_trg BEFORE UPDATE OR DELETE ON public.vault_data
  FOR EACH ROW EXECUTE FUNCTION public.vault_data_archive();
