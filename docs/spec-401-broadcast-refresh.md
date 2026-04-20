# Spec — Silent 401 Refresh em `/api/broadcast`

**Data:** 2026-04-19
**Autor:** Claude (Plan agent)
**Status:** PRONTO PARA IMPLEMENTAÇÃO
**Tracks:** Beta 4 fix C1 (bloqueador de beta test)

---

## Contexto & Problema

Log de produção `projeto-rpg-log-export-2026-04-17T03-18-19.json` (beta test 3) reporta **132 × HTTP 401 em `/api/broadcast`** clusterizados em 2 janelas: 02:34 (~54 em 1 min) e 02:49 (~19 em 1 min), mais **8 × 401 em `/api/session/[id]/dm-presence`** nos mesmos intervalos.

O padrão em rajada aponta JWT do DM expirando mid-session: quando o access_token vence, toda ação do DM (`turn_advance`, `hp_update`, `initiative_reorder`, `condition_change`, custom condition applied) dispara `broadcastViaServer` → `/api/broadcast` responde 401 em [app/api/broadcast/route.ts:36](../app/api/broadcast/route.ts#L36) → o payload é silenciosamente dropped (`broadcastViaServer` é fire-and-forget via `.catch(() => {})` em [lib/realtime/broadcast.ts:478](../lib/realtime/broadcast.ts#L478)).

Os players ficam com estado stale até o próximo `state_sync` ou reconexão — **viola explicitamente a Zero-Drop Reconnection Rule (CLAUDE.md).**

**Causa raiz:** não existe nenhum listener `onAuthStateChange` nem refresh proativo no DM client. A única refresh ativa no app está em [PlayerJoinClient.tsx:998-1011](../components/player/PlayerJoinClient.tsx#L998-L1011) (player anon). O middleware ([middleware.ts:49](../middleware.ts#L49) → [lib/supabase/proxy.ts:124](../lib/supabase/proxy.ts#L124)) chama `getClaims()` mas não força refresh sob expiração, e SSR navegação durante combate ativo é inexistente (DM fica no mesmo client component por horas).

## Arquivos envolvidos

- [app/api/broadcast/route.ts](../app/api/broadcast/route.ts) — server route; retorna 401 em `:32-36` via `supabase.auth.getUser()`.
- [lib/realtime/broadcast-server.ts](../lib/realtime/broadcast-server.ts) — client wrapper que chama `/api/broadcast` (`:21`); trata só 429 e retorno boolean; swallow de erros de rede em `:36-39`.
- [lib/realtime/broadcast.ts:478](../lib/realtime/broadcast.ts#L478) — invoca `broadcastViaServer(...).catch(() => {})`; 401 nunca propaga.
- [lib/realtime/fetch-orchestrator.ts:67-68,108-131,203-217](../lib/realtime/fetch-orchestrator.ts#L67-L68) — **referência canônica** da solução: `onUnauthorized` hook + single-flight retry 1×.
- [components/player/PlayerJoinClient.tsx:998-1011](../components/player/PlayerJoinClient.tsx#L998-L1011) — padrão já aprovado para plumbar `refreshSession()` (deve ser replicado no DM, porém centralizado).
- [components/session/CombatSessionClient.tsx](../components/session/CombatSessionClient.tsx) — DM client que origina broadcasts; precisa registrar o hook de refresh simétrico ao player.
- [lib/supabase/client.ts](../lib/supabase/client.ts) — singleton do browser client (BUG-004) que já dedupa lock do storage.
- [middleware.ts](../middleware.ts) + [lib/supabase/proxy.ts:118-133](../lib/supabase/proxy.ts#L118-L133) — contexto SSR; **não** é o fix porque fluxo realtime não faz navegação.
- [app/api/track/route.ts:7-122](../app/api/track/route.ts#L7-L122) — allowlist para novos eventos de telemetry.

## Design proposto

### Opção A — Intercept 401 em `broadcastViaServer` + retry 1× após `refreshSession()`
Modificar `broadcast-server.ts` para, ao receber `res.status === 401`, chamar um hook `onUnauthorized` idêntico ao de `fetch-orchestrator.ts:212-217`, refazer a chamada 1× se o refresh sucedeu, e só então retornar `false`. Single-flight global (um refresh concorrente no máximo) via promise compartilhada.

**Prós:** escopo cirúrgico; espelha padrão testado em produção (player).
**Contras:** só cobre broadcasts; outros endpoints 401 (ex.: `dm-presence`) continuam vulneráveis.

### Opção B — Proactive refresh a cada N min
Timer (ex.: 45 min) chamando `supabase.auth.refreshSession()` independente de chamadas.

**Prós:** previne vs reage.
**Contras:** gasta refresh tokens, não elimina race (refresh pode falhar entre ticks), extra complexidade em `visibilitychange` (pausar em hidden, CLAUDE.md).

### Opção C — Listener `onAuthStateChange` que renova access_token
Registrar listener no bootstrap do DM; em `TOKEN_REFRESHED` atualiza referência local (não muito relevante porque `createClient()` é singleton e o próximo `getSession()` já lê o novo token).

**Prós:** útil para logs/telemetry e SIGNED_OUT → bubble-up de tela de re-auth.
**Contras:** por si só não cura os 401 que já aconteceram; é complemento, não solução.

**Recomendação: A + C (híbrido).** A é a correção causal com menor superfície de risco e mirrored do padrão player (fetch-orchestrator) — já validado em produção. C é leve (~15 linhas) e dá observability + cobre o edge-case de `SIGNED_OUT` (refresh_token expirado). B é postergado (anotar em bucket) porque não elimina a race e colide com heartbeat pausing.

## Implementação passo-a-passo

1. **`lib/realtime/broadcast-server.ts`** — refatorar para:
   - Extrair a chamada `fetch` em helper interno.
   - Se `res.status === 401`: chamar `onBroadcastUnauthorized()` (default `supabase.auth.refreshSession()`); se retornar `true`, retry 1× com o novo access_token obtido via `getSession()` fresh; se false/erro, retornar false.
   - Single-flight module-level: `let refreshInFlight: Promise<boolean> | null`; se já existe, aguarda o mesmo promise (cura race de 2 broadcasts simultâneos disparando 2 refresh).
   - Emitir telemetry: `auth:silent_refresh_success`, `auth:silent_refresh_failed`, `broadcast:401_retry_success`, `broadcast:401_retry_failed`.
   - Permitir override via `setBroadcastUnauthorizedHandler()` para testes (padrão de `fetchOrchestrator.setUnauthorizedHandler`).

2. **`app/api/broadcast/route.ts`** — adicionar header `X-Auth-Reason: token_expired` quando `getUser()` falha por JWT inválido/expirado (distinguir de não-autenticado), para logging server-side mais preciso. Não muda status code.

3. **`components/session/CombatSessionClient.tsx`** — no bootstrap do DM, registrar `onAuthStateChange` listener:
   - `TOKEN_REFRESHED`: `trackEvent("auth:silent_refresh_success", { actor: "dm" })`.
   - `SIGNED_OUT`: mostrar modal "Sessão expirada, re-logue para continuar" (hard-fallback).
   - Cleanup do listener no unmount.

4. **`app/api/track/route.ts:122`** — adicionar à `ALLOWED_EVENTS`:
   - `auth:silent_refresh_success`
   - `auth:silent_refresh_failed`
   - `broadcast:401_retry_success`
   - `broadcast:401_retry_failed`

5. **`lib/realtime/__tests__/broadcast-server.test.ts`** (novo arquivo) — cobrir unit + race.

6. Documentar em `docs/spec-beta4-features.md` (C1 fix) e cross-linkar no `code-review-consolidated-beta3-2026-04-17.md`.

## Parity check (Combat Parity Rule)

- **Guest (`/try`)**: N/A — guest não usa broadcast nem Supabase auth (`GuestCombatClient.tsx` roda em Zustand + localStorage).
- **Anon (`/join`)**: **cobertura já existe** em `fetch-orchestrator.ts:212-217` + wiring em `PlayerJoinClient.tsx:998-1011`. Confirmar que o mesmo módulo `broadcast-server.ts` é chamado se o player algum dia emitir via `/api/broadcast` (hoje só DM emite) — **aplica sim** para consistência.
- **Auth (`/invite`)**: **aplicar** — DM sempre autenticado; este é o caminho primário do fix.

## Telemetry

Eventos novos (em `app/api/track/route.ts` allowlist):

- `auth:silent_refresh_success` — `{ actor: "dm" | "player", trigger: "401_intercept" | "auth_state_change" }`
- `auth:silent_refresh_failed` — `{ actor, reason: "network" | "refresh_token_expired" | "unknown" }`
- `broadcast:401_retry_success` — `{ event_type, session_id }`
- `broadcast:401_retry_failed` — `{ event_type, session_id, reason }`

**KPI de sucesso pós-fix:**
- `count(broadcast:401_retry_success) / count(auth:silent_refresh_success) > 0.95`
- zero rajadas `401 storm` no log export beta 4
- Sentry alarm se 401 em `/api/broadcast` por sessão > 3 em 60s.

## Edge cases

- **Refresh token também expirou (72h)**: `refreshSession()` retorna erro → emitir `auth:silent_refresh_failed` com `reason: "refresh_token_expired"` → disparar modal "Re-logue para continuar" em `CombatSessionClient.tsx` via `onAuthStateChange` SIGNED_OUT. Não tentar refresh novamente.
- **Race de 2 broadcasts simultâneos**: single-flight via `refreshInFlight` module-level promise. Segundo caller aguarda o mesmo promise. Unit test explícito.
- **Network offline durante refresh**: `refreshSession()` rejeita → retorna false → `broadcastViaServer` retorna false → `broadcastEvent` já trata fallback via `enqueueAction` (`broadcast.ts:450`). Zero-drop preservado via offline queue.
- **Tab hidden por 10min + volta com JWT expirado**: Primeiro broadcast após retomada dispara 401 → intercept → refresh → retry. Combinado com heartbeat pausing (CLAUDE.md) cobre o cenário.
- **StrictMode double-mount**: `setUnauthorizedHandler` é idempotente (last-wins); sem null-cleanup como já documentado em `PlayerJoinClient.tsx:1008-1010`.

## Testes

**Unit (`lib/realtime/__tests__/broadcast-server.test.ts`, novo):**
- `mock 401 + handler sucede → refaz fetch + retorna true`
- `mock 401 + handler falha → retorna false, não refaz fetch`
- `mock 401 + handler success mas 2o fetch também 401 → retorna false (no retry loop)`
- `race: 2 chamadas simultâneas com 401 → handler chamado 1× apenas (single-flight)`
- `mock 200 → handler nunca invocado`
- `mock 429 → path atual preservado, handler não invocado`

**Unit (existentes):** atualizar `broadcast.test.ts:33` mock para incluir nova assinatura.

**E2E (`e2e/combat/dm-silent-refresh.spec.ts`, novo):** forçar JWT expirado via cookie manipulation antes de `turn_advance`; verificar que player recebe o evento normalmente (zero drop visível na UI).

## Feature flag?

**Direto sem flag.** Justificativa:
- (a) é fix de bug crítico de produção, não feature nova;
- (b) padrão espelhado do `fetch-orchestrator` já em prod sem flag;
- (c) falha aberta é seguro (fallback = comportamento atual pré-fix + offline queue).

Flag adicionaria complexidade sem reduzir risco. Se quiser cautela extra, usar `NEXT_PUBLIC_BROADCAST_401_RETRY=true` default ON, rollback via env var — no code change.

## Rollback plan

1. Reverter commit do `broadcast-server.ts` (helper + 401 path) — arquivo isolado, diff pequeno (~40 linhas).
2. Reverter allowlist em `app/api/track/route.ts` (4 entradas novas).
3. Remover listener `onAuthStateChange` em `CombatSessionClient.tsx` (~15 linhas).
4. Comportamento volta ao atual: 401s continuam silent-drop, mas offline queue ainda amortece parcialmente.
5. SLA de rollback: < 5 min (single revert + redeploy).

---

## Critical Files for Implementation

- `c:/Projetos Daniel/projeto-rpg/lib/realtime/broadcast-server.ts`
- `c:/Projetos Daniel/projeto-rpg/lib/realtime/fetch-orchestrator.ts` (referência do padrão)
- `c:/Projetos Daniel/projeto-rpg/components/session/CombatSessionClient.tsx`
- `c:/Projetos Daniel/projeto-rpg/app/api/track/route.ts`
- `c:/Projetos Daniel/projeto-rpg/app/api/broadcast/route.ts`

## Estimativa

~3h dev + 1h testes + 30min review/deploy.
