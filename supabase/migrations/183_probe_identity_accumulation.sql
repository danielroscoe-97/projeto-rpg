-- 183_probe_identity_accumulation.sql
-- Postmortem 2026-04-24 — observability probe pros vetores de crescimento
-- que o bug de isAnonPlayer (fix #43) estava acelerando silenciosamente.
--
-- Context: cada /join/[token] chama signInAnonymously() que cria uma row
-- em auth.users. Com CTA de conversão quebrado entre 2026-04-20 e
-- 2026-04-24, zero jogadores anon viraram auth real — toda entrada de
-- beta tester é uma row nova cumulativa. session_tokens idem (uma por
-- token/claim). Essa função serve de probe diário pra baselinar o
-- crescimento e detectar se o fix do PR #43 + cleanup do PR #45 estão
-- contendo o vetor.
--
-- NÃO alerta — só loga em error_logs pra criar série histórica. A
-- decisão de threshold fica pra daqui 21 dias depois que temos baseline.

CREATE OR REPLACE FUNCTION public.probe_identity_accumulation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  anon_user_count integer;
  session_tokens_total integer;
  session_tokens_stale_candidates integer;
  session_tokens_active integer;
  result jsonb;
BEGIN
  -- auth.users é acessível por SECURITY DEFINER (função roda como owner).
  SELECT count(*) INTO anon_user_count FROM auth.users WHERE is_anonymous = true;

  SELECT count(*) INTO session_tokens_total FROM public.session_tokens;

  SELECT count(*) INTO session_tokens_active
  FROM public.session_tokens WHERE is_active = true;

  -- Candidatos pro sweep do migration 182. Ajudar a validar se o sweep
  -- está efetivamente limpando após ligar.
  SELECT count(*) INTO session_tokens_stale_candidates
  FROM public.session_tokens
  WHERE is_active = false
    AND last_seen_at IS NOT NULL
    AND last_seen_at < now() - interval '21 days';

  result := jsonb_build_object(
    'anon_user_count', anon_user_count,
    'session_tokens_total', session_tokens_total,
    'session_tokens_active', session_tokens_active,
    'session_tokens_stale_candidates', session_tokens_stale_candidates,
    'probed_at', now()
  );

  -- Audit row — cria série histórica consultável por admin dashboard.
  INSERT INTO public.error_logs (level, message, component, action, category, metadata)
  VALUES (
    'info',
    format(
      'identity probe: anon_users=%s, session_tokens_total=%s, stale_candidates=%s',
      anon_user_count,
      session_tokens_total,
      session_tokens_stale_candidates
    ),
    'probe_identity_accumulation',
    'probe',
    'database',
    result
  );

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.probe_identity_accumulation() IS
  'Postmortem 2026-04-24 — daily identity-accumulation probe. Counts anon auth.users + session_tokens, writes audit row to error_logs, returns jsonb. Read-only; safe to run manually.';

REVOKE ALL ON FUNCTION public.probe_identity_accumulation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.probe_identity_accumulation() TO service_role;
