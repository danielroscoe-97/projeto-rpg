# Code Review — Trilha A (Combat Core Bugs)

> Cole este prompt inteiro em uma nova janela de contexto e rode `/bmad-code-review`.

---

## ESCOPO DO REVIEW

Implementacao completa da **Trilha A — Combat Core** do backlog do beta test. Sao 8 stories implementadas em sequencia, todas no branch `master` (unstaged changes).

**Specs de referencia obrigatoria** (ler ANTES de revisar o codigo):
- `docs/backlog-beta-test-2026-04-02.md` — visao geral, mapa de dependencias, regra de parity
- `CLAUDE.md` — Combat Parity Rule (Guest vs Auth)
- Cada story individual em `docs/stories/A*.md`

---

## STORIES IMPLEMENTADAS (ordem de implementacao)

### A.2 — Dedup combatant_add (2 SP)
- **Spec:** `docs/stories/A2-dedup-combatant-add.md`
- **Arquivo:** `components/player/PlayerJoinClient.tsx` (~linha 548)
- **O que foi feito:** Blind append `[...prev, payload.combatant]` substituido por upsert com dedup por ID. Duplicatas fazem merge (`{ ...c, ...payload.combatant }`) em vez de append. Console.warn em dev mode.
- **Verificar:** Auditoria dos outros 11 usos de `updateCombatants` — spec confirma que so linha 548 precisa de fix.

### A.3 — Session ended broadcast (3 SP)
- **Spec:** `docs/stories/A3-session-ended-broadcast.md`
- **Arquivos:** `lib/types/realtime.ts`, `lib/realtime/broadcast.ts`, `lib/hooks/useCombatActions.ts`, `components/player/PlayerJoinClient.tsx`, `messages/en.json`, `messages/pt-BR.json`
- **O que foi feito:**
  - Novo tipo `session:ended` + interface `RealtimeSessionEnded` no union de tipos
  - Passthrough em `sanitizePayload` no broadcast.ts
  - Broadcast `session:ended` em `handleEndEncounter` APOS state_sync, ANTES de expireSessionTokens
  - Handler no PlayerJoinClient: seta `sessionEnded`, limpa timers via `clearAllTimers()`, unsubscribe com delay
  - `clearAllTimers()` centralizada (10 refs limpas), tambem usada no cleanup do useEffect
  - UI overlay "Sessao encerrada" com mensagem diferenciada para late-join interrompido
  - Chaves i18n: `session_ended_before_join`, `back_to_home`
- **Verificar:** Ordem dos broadcasts (state_sync -> ended -> expireTokens). Guest/DM nao afetados (spec confirma). Timer cleanup completo.

### A.4 — Late-join recovery (2 SP)
- **Spec:** `docs/stories/A4-late-join-recovery.md`
- **Arquivos:** `components/player/PlayerJoinClient.tsx`, `components/player/PlayerLobby.tsx`, `messages/en.json`, `messages/pt-BR.json`
- **O que foi feito:**
  - `lateJoinFinalStatusRef` — guard contra race condition nos timers de 15s/120s
  - Guard adicionado nos 3 locais de `setLateJoinStatus("accepted")` + nos 2 callbacks de timer
  - `resetLateJoinState()` — retry sem reload de pagina (incrementa retry count)
  - `lateJoinDeadline` — timestamp para countdown no PlayerLobby
  - Countdown visual em tempo real (text-red nos ultimos 10s)
  - Limite de 3 retries com mensagem final "Peca ao mestre para adicionar voce manualmente"
  - `window.location.reload()` removido nos estados timeout e rejected
  - Props novas no PlayerLobby: `onLateJoinRetry`, `lateJoinDeadline`, `lateJoinRetryCount`
- **Verificar:** Race condition guard — timer de timeout nao sobrescreve "accepted". Cleanup no lateJoinTimeoutRef (spec menciona que nao era limpo no useEffect original).

### A.1 — Polling/Realtime State Machine (8 SP)
- **Spec:** `docs/stories/A1-polling-realtime-state-machine.md`
- **Arquivo:** `components/player/PlayerJoinClient.tsx`
- **O que foi feito:**
  - State machine: `connStateRef` com estados CONNECTED / RECONNECTING / POLLING_FALLBACK
  - `transitionTo()` com side effects (stop polling, reset backoff, start polling com backoff)
  - `startPollingWithBackoff()` — backoff exponencial 2s -> 4s -> 8s -> ... -> 30s cap
  - `fetchFullStateRef` — ref para quebrar dependencia circular (fetchFullState definido apos startPollingWithBackoff)
  - Subscribe callback usa `transitionTo("CONNECTED")` e `transitionTo("RECONNECTING")`
  - Polling fallback apos 3s usa `transitionTo("POLLING_FALLBACK")` em vez de `startPolling()` direto
  - `startPolling()` antigo removido
  - Turn-sync polling: intervalo de 15s quando CONNECTED (era 3s), skip quando RECONNECTING, desabilitado durante late-join "waiting"
  - Visibility handler: `await fetchFullState()` ANTES de reconectar canal
  - Logs `[PocketDM:conn]` em todas as transicoes
- **Verificar:** A ref `fetchFullStateRef` esta sincronizada apos definicao de `fetchFullState`. Turn-sync nao causa regression. Backoff reseta ao voltar pra CONNECTED. Late-join polling continua independente.

### A.6 — Auto-join via invite link (3 SP)
- **Spec:** `docs/stories/A6-auto-join-invite-link.md`
- **Arquivo:** `components/player/PlayerJoinClient.tsx`
- **O que foi feito:**
  - `pendingRegistrationRef` — guarda dados do form apos `handleRegister`
  - `isRegisteredRef` + `autoJoinInProgressRef` — refs para leitura segura em callbacks
  - Handler `session:state_sync`: se `isRegistered && !alreadyInCombatants && encounter_id && combatants.length > 0` → auto-registra via `registerPlayerCombatant`
  - Guard: nao dispara no encerramento (combatants vazio)
  - Mesmo fallback no `fetchFullState` (polling)
- **Verificar:** Guard contra encerramento funciona. Nao duplica combatant. `effectiveTokenId` esta disponivel no escopo do callback.

### A.5 — Session persistence on refresh (5 SP)
- **Spec:** `docs/stories/A5-session-persistence-refresh.md`
- **Arquivos:** `lib/supabase/player-registration.ts`, `components/player/PlayerJoinClient.tsx`, `components/player/PlayerLobby.tsx`, `messages/en.json`, `messages/pt-BR.json`
- **O que foi feito:**
  - `rejoinAsPlayer()` — `.select("id, anon_user_id")` no UPDATE + validacao de ownership
  - Heartbeat de 30s — useEffect com `last_seen_at` update (guard `.eq("anon_user_id", userId)`)
  - Retry de `combat:rejoin_request` — 3 tentativas x 15s, com `rejoinRetryTimerRef`
  - Novo estado `rejoinStatus = "timeout"` + UI no PlayerLobby
  - Cleanup do retry timer em `clearAllTimers` e no handler de `combat:rejoin_response`
- **Verificar:** Heartbeat so roda quando `isRegistered && active && effectiveTokenId`. Retry timer limpo corretamente. `rejoinAsPlayer` validacao atomica (SELECT embutido no UPDATE).

### A.7 — Group rename durante combate (3 SP)
- **Spec:** `docs/stories/A7-group-rename-combat-phase.md`
- **Arquivos:** `lib/utils/group-rename.ts` (novo), `components/guest/GuestCombatClient.tsx`, `lib/hooks/useCombatActions.ts`, `lib/supabase/session.ts`
- **O que foi feito:**
  - `applyGroupRename()` — funcao pura com deteccao de intencao por posicao no array (nao `group_order` raw)
  - `handleUpdateStats` no GuestCombatClient — aceita `display_name`, usa `applyGroupRename`, functional state update (evita race condition)
  - `handleDisplayNameChange` no setup refatorado para usar mesma funcao
  - `handleUpdateStats` no useCombatActions (session flow) — propaga rename de grupo com persist+broadcast por membro
  - `persistCombatantStats` — type signature atualizada para aceitar `display_name`
- **Verificar:** Deteccao de intencao baseada em posicao vs group_order. Functional state update vs hydrateCombatants. Session flow faz persist+broadcast por cada membro do grupo.

### A.8 — Group ficha click + event propagation (3 SP)
- **Spec:** `docs/stories/A8-group-ficha-click-manual-monsters.md`
- **Arquivos:** `components/combat/CombatantRow.tsx`, `components/combat/MonsterGroupHeader.tsx`
- **O que foi feito:**
  - `canShowPartialStats` + `isClickable` — manual monsters (no SRD) sao clicaveis
  - Inline expand com HP/AC/DC/conditions para monstros manuais (nao usa pinCard)
  - `stopPropagation` no click do nome — previne colapso do grupo
  - `stopPropagation` + debounce (200ms) no header do MonsterGroupHeader
  - Cursor pointer e hover gold para todos os clicaveis
  - `handleToggle` atualizado para usar `isClickable`
- **Verificar:** Monstros SRD continuam usando pinCard (nao regressao). ConditionBadge renderiza sem prop `size`. Debounce via timestamp ref (sem dependencia externa).

---

## CRITERIOS DE REVIEW

1. **Cada AC numerado** de cada story foi implementado?
2. **Parity Rule** (CLAUDE.md): Guest / Anonimo / Autenticado — cada change foi verificado?
3. **Race conditions** — guards adequados nos timers e callbacks assincronos?
4. **Cleanup** — todos os timers/intervals sao limpos no unmount e no session:ended?
5. **Tipagem** — sem `any` implitos, union types corretos em realtime.ts?
6. **i18n** — todas as strings user-facing tem chave em pt-BR e en?
7. **Erros de TS** — os 4 erros pre-existentes (PlayerDrawer, PlayerInitiativeBoard, sanitize.ts, api/session route) NAO sao da Trilha A
8. **Sem over-engineering** — solucoes cirurgicas conforme specs, sem abstraccoes desnecessarias?

---

## COMO RODAR

```bash
# Ver os arquivos modificados
git diff --stat HEAD

# Ver o diff completo dos arquivos da Trilha A
git diff HEAD -- components/player/PlayerJoinClient.tsx components/player/PlayerLobby.tsx components/combat/CombatantRow.tsx components/combat/MonsterGroupHeader.tsx components/guest/GuestCombatClient.tsx lib/hooks/useCombatActions.ts lib/realtime/broadcast.ts lib/types/realtime.ts lib/supabase/player-registration.ts lib/supabase/session.ts lib/utils/group-rename.ts messages/en.json messages/pt-BR.json

# Type-check
npx tsc --noEmit
```
