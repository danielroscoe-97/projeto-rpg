-- Harden create_campaign_with_settings against search_path hijack.
--
-- Context: create_campaign_with_settings is SECURITY DEFINER (migration 122).
-- Without an explicit SET search_path, a malicious caller can shadow
-- pg_catalog-qualified identifiers via a custom search_path and pivot the
-- definer's privileges. This matters even more when the function is called
-- in a chained SECURITY DEFINER context (e.g. clone_campaign_from_template
-- in the Player-as-DM epic).
--
-- ALTER FUNCTION ... SET is idempotent and replay-safe.

ALTER FUNCTION create_campaign_with_settings(
  UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, BOOLEAN
) SET search_path = public, pg_temp;
