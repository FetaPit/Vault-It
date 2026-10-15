-- Vault·It — security & performance hardening found by the Supabase advisors (2026-10-15).
-- 1) Trigger/event-trigger helper functions must not be callable through the public API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
-- waitlist_count() stays public on purpose (the landing page shows spots left); signed-in users don't need it.
REVOKE ALL ON FUNCTION public.waitlist_count() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.waitlist_count() TO anon;

-- 2) Row-level-security policies: evaluate auth.uid() once per query instead of once per row (same rule, faster).
ALTER POLICY "own vault data" ON public.vault_data USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "own profile"    ON public.profiles   USING ((SELECT auth.uid()) = id)      WITH CHECK ((SELECT auth.uid()) = id);
ALTER POLICY "own nw history" ON public.nw_history USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
