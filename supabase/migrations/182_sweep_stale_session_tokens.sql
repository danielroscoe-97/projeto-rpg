-- 182_sweep_stale_session_tokens.sql
-- Postmortem 2026-04-24, R6 — housekeeping sweep de session_tokens ociosos.
--
-- Context: a incidente documentada em
-- `docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md` registrou
-- 13 session_tokens ativos em uma única sessão (6 nomeados + 7 "sombras
-- anon de reconnect"). As sombras resultam do padrão comum em que o
-- player limpa cookies, troca device, reabre em incognito ou similar —
-- cada vez gerando um `signInAnonymously()` que cria uma auth.users row
-- nova e, via /api/player-identity/claim, uma session_tokens row nova.
--
-- Sem cleanup, o crescimento de session_tokens é monotônico e cada row
-- inflaciona o custo das queries na rota /api/combat/[id]/state (Causa #2
-- do postmortem, mitigada em PR #44 mas ainda amplificada por cardinalidade).
--
-- Variant A (default, conservadora):
--   - Forward-looking apenas
--   - `is_active = false` filter obrigatório — NÃO deleta tokens ativos
--   - Threshold: 21 dias (acordado com o Dani; TTL do
--     spec-resilient-reconnection.md é 24h, 21d é folgadíssimo)
--
-- Auditoria: se algo for deletado, escreve info-level row em error_logs.
-- Idempotente e safe pra invocar manualmente ou via Vercel Cron.

CREATE OR REPLACE FUNCTION public.sweep_stale_session_tokens(
  older_than interval DEFAULT interval '21 days'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM session_tokens
    WHERE is_active = false
      AND last_seen_at IS NOT NULL
      AND last_seen_at < now() - older_than
    RETURNING id
  )
  SELECT count(*)::int INTO deleted_count FROM deleted;

  IF COALESCE(deleted_count, 0) > 0 THEN
    INSERT INTO public.error_logs (level, message, component, action, category, metadata)
    VALUES (
      'info',
      format('Swept %s stale session_token(s) (older_than=%s)', deleted_count, older_than),
      'sweep_stale_session_tokens',
      'sweep',
      'housekeeping',
      jsonb_build_object(
        'deleted_count', deleted_count,
        'older_than', older_than::text
      )
    );
  END IF;

  RETURN COALESCE(deleted_count, 0);
END;
$$;

COMMENT ON FUNCTION public.sweep_stale_session_tokens(interval) IS
  'Postmortem 2026-04-24 R6 — deletes inactive session_tokens whose last_seen_at is older than `older_than`. Writes an info-level audit row to error_logs when rows are deleted. Returns the number of rows deleted.';

REVOKE ALL ON FUNCTION public.sweep_stale_session_tokens(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sweep_stale_session_tokens(interval) TO service_role;

-- Dry-run preview (rodar no SQL editor antes do primeiro invocation em prod):
--   SELECT count(*), min(last_seen_at), max(last_seen_at)
--   FROM session_tokens
--   WHERE is_active = false
--     AND last_seen_at IS NOT NULL
--     AND last_seen_at < now() - interval '21 days';
--
-- Execução manual:
--   SELECT public.sweep_stale_session_tokens();
--   SELECT public.sweep_stale_session_tokens(interval '14 days'); -- custom window
--
-- Scheduling: via Vercel Cron (app/api/cron/sweep-session-tokens/route.ts)
-- porque pg_cron não está habilitado no plano atual (postmortem 2026-04-24
-- upgrade foi um stopgap de capacity, não ligou pg_cron).
