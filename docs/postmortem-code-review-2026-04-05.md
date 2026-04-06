# Post-Mortem: Code Review & Journey Audit — 2026-04-05

**Autor:** Dani_ + Claude
**Data:** 2026-04-05
**Escopo:** Todas as jornadas UC-01 a UC-11, ~60 arquivos analisados
**Status:** Spec aprovada, correções em andamento

---

## Contexto

Code review abrangente cobrindo todas as jornadas do player e DM no Pocket DM. Análise focada em:
- Salvamento e persistência (Supabase, localStorage, sessionStorage)
- Edição de campanhas e convites
- Dados de combate compartilhados entre mestre e jogador
- Fluxos de autenticação e onboarding
- Segurança (open redirect, hijack de invite, state leak)

---

## Resumo de Achados

| Severidade | Qtd | Exemplos |
|---|---|---|
| CRITICAL | 7 | Open redirect, invite hijack, LP OAuth bypass, login ignora ?next=, persistence gaps |
| HIGH | 11 | Email failure silent, logout state leak, turn index bug, guest parity |
| MEDIUM | 16 | SSR hydration, stale closures, i18n hardcoded, cache issues |
| LOW | 13 | UX minor, code duplication, performance |
| **Total** | **47** | — |

---

## Grupo A — Auth Flow Fixes (Segurança + Correção)

### A1. Open Redirect em `/auth/confirm` [CRITICAL/SECURITY]

**Arquivo:** `app/auth/confirm/route.ts:24`
**Problema:** `next` param usado direto em `redirect()` sem validação. Attacker pode craftar `?next=https://evil.com`.
**Fix:** Validar que `next` começa com `/` e não com `//`.

### A2. Login ignora `?next=` param [CRITICAL]

**Arquivo:** `components/login-form.tsx:51`
**Problema:** Middleware seta `?next=/app/campaigns/abc`, mas login sempre faz `router.push("/app/dashboard")`.
**Fix:** Ler `searchParams.get("next")` e usar como destino pós-login. Mesmo para GoogleOAuthButton na página de login.

### A3. Landing Google OAuth bypassa `/auth/confirm` [CRITICAL]

**Arquivo:** `components/marketing/LandingGoogleButton.tsx:31`
**Problema:** Redirect vai direto para `/app/dashboard`, pulando role save, locale sync, onboarding source, invite token.
**Fix:** Mudar redirect para `${origin}/auth/confirm`.

### A4. Middleware perde params de invite ao redirecionar user autenticado [HIGH]

**Arquivo:** `lib/supabase/proxy.ts:76-80`
**Problema:** User logado clica `/auth/sign-up?invite=xxx` → middleware manda pra `/app/dashboard` sem preservar params.
**Fix:** Quando redirecionar authed user de auth pages, checar `invite`/`join_code` e redirecionar para destino correto.

### A5. Resend email no sign-up-success perde `join_code` [HIGH]

**Arquivo:** `app/auth/sign-up-success/page.tsx:22-33`
**Problema:** Página lê `invite` e `campaign` mas ignora `join_code` e `context`.
**Fix:** Ler e preservar `join_code` e `context` no redirect URL do resend.

### A6. SSR hydration mismatch em sign-up-form [HIGH]

**Arquivo:** `components/sign-up-form.tsx:40`
**Problema:** `window.location.search` lido durante render (não em useEffect). SSR=null, client=params.
**Fix:** Usar `useSearchParams()` do Next.js ou mover para useEffect/useState.

### A7. Logout não reseta subscription store [HIGH]

**Arquivo:** `components/logout-button.tsx:12-17`
**Problema:** User A (pro) → logout → User B (free) login = vê features pro temporariamente.
**Fix:** Chamar `useSubscriptionStore.getState().reset()` no logout.

### A8. UUID regex lowercase-only em `/auth/confirm` [MEDIUM]

**Arquivo:** `app/auth/confirm/route.ts:69`
**Problema:** `/^[a-f0-9-]{36}$/` rejeita UUIDs uppercase (válidos por RFC 4122).
**Fix:** Adicionar flag `i` ou incluir `A-F`.

---

## Grupo B — Invite Security Fixes

### B1. Invite aceita por qualquer user autenticado [CRITICAL/SECURITY]

**Arquivo:** `app/invite/actions.ts:34-44`
**Problema:** `acceptInviteAction` valida token mas nunca verifica se email do user logado = email do invite. O RPC `accept_campaign_invite` faz, mas esse path não.
**Fix:** Adicionar verificação: se invite tem email, checar que `user.email === invite.email`. Se não match, throw error.

### B2. Sem max_players check em invite por email [HIGH]

**Arquivo:** `app/invite/actions.ts:49-56`
**Problema:** `acceptJoinCodeAction` checa max_players, `acceptInviteAction` não.
**Fix:** Contar membros ativos antes de inserir. Se >= max_players, throw error.

---

## Grupo C — Combat Persistence Fixes

### C1. `reaction_used` e `condition_durations` nunca persistem [CRITICAL]

**Arquivos:** `lib/supabase/session.ts`, `lib/supabase/encounter.ts`, `lib/supabase/combat-sync.ts`
**Problema:** Campos existem no tipo Combatant e no store, mas nenhuma função de save os inclui. DM refresh = perde tracking.
**Fix:** Adicionar esses campos em `persistNewCombatant`, `createEncounterWithCombatants`, `reconcileFullState`. NOTA: verificar se colunas existem no DB primeiro.

### C2. `reconcileFullState` não persiste `legendary_actions_total/used` [HIGH]

**Arquivo:** `lib/supabase/combat-sync.ts:31-54`
**Problema:** DM reconecta → legendary actions resetam.
**Fix:** Incluir `legendary_actions_total`, `legendary_actions_used` no mapping de reconcile.

### C3. `handleRemoveCombatant` não ajusta turn index — auth mode [HIGH]

**Arquivo:** `lib/hooks/useCombatActions.ts:349-373`
**Problema:** Remover combatant antes do turno atual não decrementa index. Guest mode faz certo (3 cases), auth mode só 1.
**Fix:** Adicionar lógica para caso `wasBeforeCurrent` como no guest mode.

### C4. Guest `setInitiative` re-ordena durante combate ativo [HIGH]

**Arquivo:** `lib/stores/guest-combat-store.ts:210-219`
**Problema:** Auth store trava sort durante combate. Guest não.
**Fix:** Adicionar guard `if (state.is_active) return { combatants: updated }` sem re-sort.

---

## Grupo D — Realtime/Storage Fixes

### D1. Stale closure em `onToggleReaction` [CRITICAL]

**Arquivo:** `components/player/PlayerJoinClient.tsx:2298-2319`
**Problema:** Broadcast lê `combatants` da closure após optimistic update. Dois toggles rápidos = desync.
**Fix:** Usar `combatantsRef.current` ou computar valor do payload antes do optimistic update.

### D2. Offline queue dedup falso positivo em HP [HIGH]

**Arquivo:** `lib/realtime/offline-queue.ts:54-55`
**Problema:** Key baseada em `current_hp` final. Dano→heal→dano idêntico = 3ª ação dedupada.
**Fix:** Adicionar timestamp ou sequence number na key de idempotência.

### D3. Email de invite falha silenciosamente pro DM [HIGH]

**Arquivo:** `app/api/campaign/[id]/invites/route.ts:82-88`
**Problema:** `sendCampaignInviteEmail` retorna false em falha, return value nunca checado.
**Fix:** Checar retorno e incluir `email_sent: boolean` na resposta. Frontend mostra fallback "copie este link".

### D4. Companion HP matching por nome em vez de ID [HIGH]

**Arquivo:** `components/campaign/PlayerCampaignView.tsx:402-404`
**Problema:** `companions.find(c => c.name === member.character_name)` — nomes iguais = HP bar trocado.
**Fix:** Usar ID-based matching se disponível.

### D5. PlayersOnlinePanel stale detection por nome [MEDIUM]

**Arquivo:** `components/session/PlayersOnlinePanel.tsx:143-167`
**Problema:** Status mapping por `player_name`. Nomes iguais = status errado.
**Fix:** Usar token_id ou user_id como key.

---

## Grupo E — Dashboard/Cache

### E1. `unstable_cache` captura Supabase client stale [CRITICAL]

**Arquivo:** `app/app/dashboard/layout.tsx:44-77`
**Problema:** Callback cached fecha sobre o `supabase` client do request original. Após 60s, re-execução usa cookies stale.
**Fix:** Criar Supabase client DENTRO da cached function ou remover o cache e usar query direta.

---

## Ordem de Execução

1. **Grupo A** (auth) — maior impacto na jornada do player, inclui fix de segurança
2. **Grupo B** (invite security) — segurança, correção rápida
3. **Grupo C** (combat persistence) — dados perdidos em refresh, requer verificar DB schema
4. **Grupo D** (realtime) — desync e UX
5. **Grupo E** (cache) — correção pontual

---

## Verificação

Após todas as correções:
- [ ] `tsc --noEmit` passando
- [ ] Flows de invite testados manualmente (email + Google OAuth)
- [ ] Login com `?next=` redireciona corretamente
- [ ] Guest combat: editar initiative mid-combat não reordena
- [ ] DM refresh: reaction_used e legendary_actions preservados
- [ ] Logout → login como outro user: subscription store limpo
