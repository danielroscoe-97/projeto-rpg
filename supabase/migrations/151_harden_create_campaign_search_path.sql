-- Harden create_campaign_with_settings against search_path hijack + PUBLIC EXECUTE.
--
-- Context: create_campaign_with_settings is SECURITY DEFINER (migration 122).
-- Two hardening actions, both idempotent and replay-safe:
--
-- 1. SET search_path: without an explicit config, a malicious caller can
--    shadow unqualified identifiers (`json_build_object`, `campaigns`,
--    `campaign_settings`) via pg_temp or a custom search_path and pivot
--    the definer's privileges. We set `pg_catalog, public, pg_temp` so
--    system functions resolve first, app schema second, and session-scoped
--    last. This matters doubly when the function is called in a chained
--    SECURITY DEFINER context (e.g. clone_campaign_from_template in the
--    Player-as-DM epic).
--
-- 2. REVOKE EXECUTE FROM PUBLIC + GRANT to authenticated: 122 never
--    revoked PUBLIC EXECUTE. SECURITY DEFINER functions with PUBLIC
--    EXECUTE are the canonical privilege-escalation shape — any role
--    (including unauthenticated PUBLIC) could call the definer. We
--    restrict to `authenticated` only.

ALTER FUNCTION create_campaign_with_settings(
  UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN
) SET search_path = pg_catalog, public, pg_temp;

REVOKE EXECUTE ON FUNCTION create_campaign_with_settings(
  UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_campaign_with_settings(
  UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN
) TO authenticated;
