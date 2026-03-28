# Prompt: Fix Cat.1 — Player Join Late-Join Broadcast Failure

Cole este prompt numa nova janela do Claude Code:

---

## Contexto

Leia `docs/postmortem-e2e-failures-2026-03-27.md` para contexto completo. Resumo:

20 testes E2E falham porque o helper `playerJoinCombat()` em `e2e/helpers/session.ts` não consegue completar o fluxo de late-join. O problema **NÃO é de selectors** (já foram corrigidos). O problema é um **bug de produção** no broadcast Supabase Realtime.

## O Bug

Quando um player pede pra entrar num combate ativo (late-join), o fluxo é:

1. ✅ Player envia `combat:late_join_request` via broadcast → **DM recebe**
2. ✅ DM vê toast Sonner com "Aceitar/Rejeitar" → **DM clica Aceitar**
3. ✅ DM chama `handleAddCombatant()` (adiciona combatant no DB) + `broadcastEvent("combat:late_join_response", { accepted: true })`
4. ❌ **Player NUNCA recebe `combat:late_join_response`** — fica preso em "Aguardando aprovação..." por 60s → auto-rejeitado

O broadcast funciona player→DM mas NÃO funciona DM→player. Confirmado via console logs:
- Player log: `[Player] Sending late-join request {channelState: joined}`
- DM log: `[DM] Late-join request received {request_id: matches}`
- Player: nenhum log de recebimento do response

## Arquivos Relevantes

### Produção (onde o fix precisa acontecer):
- `components/player/PlayerJoinClient.tsx` — linhas 383-412: listener de `combat:late_join_response` + `registerPlayerCombatant` call
- `components/session/CombatSessionClient.tsx` — linhas 458-510: toast handler que chama `handleAddCombatant` + `broadcastEvent`
- `lib/realtime/broadcast.ts` — `broadcastEvent()` e `getDmChannel()`: canal singleton `session:${sessionId}`
- `lib/supabase/player-registration.ts` — server action `registerPlayerCombatant()`

### E2E (já corrigido, mas bloqueado pelo bug):
- `e2e/helpers/session.ts` — `playerJoinCombat()` com selectors corretos (data-testid)

## Solução Recomendada: Polling Fallback

Adicionar um polling fallback no `PlayerJoinClient` quando `lateJoinStatus === "waiting"`:

1. Após enviar o late-join request, iniciar um poll a cada 5s
2. O poll faz fetch no servidor verificando se o DM já adicionou o combatante
3. Se o combatante com `is_player=true` e o nome do player existe no encounter, registrar e ir pro player-view
4. Parar o poll quando `lateJoinStatus` muda para "accepted", "rejected", ou "idle"

### Opção de implementação (endpoint):

Criar um endpoint ou server action `checkLateJoinStatus(sessionId, requestId)` que:
- Verifica se existe um combatant com `is_player=true` e `name === playerName` no encounter ativo
- Retorna `{ accepted: true, combatantId }` se encontrar, `{ accepted: false }` se não

OU mais simples: no listener de `combat:combatant_add` que já existe (linha 344), verificar se o combatant adicionado tem o nome do player que está aguardando:

```typescript
.on("broadcast", { event: "combat:combatant_add" }, ({ payload }) => {
  if (payload.combatant) {
    updateCombatants((prev) => [...prev, payload.combatant]);
    // If we're waiting for late-join acceptance and this is our player, register
    if (lateJoinStatus === "waiting" && payload.combatant.is_player &&
        payload.combatant.name === lateJoinDataRef.current?.name) {
      setLateJoinStatus("accepted");
      setIsRegistered(true);
      setRegisteredName(payload.combatant.name);
    }
  }
})
```

**⚠️ Nota:** `combat:combatant_add` É broadcast pelo DM via `broadcastEvent` (confirmado funcionar DM→player para outros eventos como `session:state_sync`). Mas precisa verificar se este broadcast específico também não chega. Se não chegar, a solução de polling é necessária.

## Como Validar

```bash
# Rodar os testes afetados:
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" npx playwright test e2e/journeys/j2-player-join.spec.ts --project=chromium --reporter=list

# Se J2.3 e J2.4 passarem, rodar a suite completa de player-join:
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" npx playwright test e2e/journeys/j5-share-link.spec.ts e2e/journeys/j9-dm-vs-player-visibility.spec.ts e2e/journeys/j11-player-view-complete.spec.ts --project=chromium --reporter=list
```

## Regras

- Env vars: `E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*"`
- Testes rodam contra produção: https://www.pocketdm.com.br
- Não mude testes que já passam (Cat.2-4 estão green)
- Use `expect(locator).toBeVisible({ timeout })` — NUNCA `.isVisible({ timeout })`
- `playerJoinCombat()` em `e2e/helpers/session.ts` já tem selectors corretos (data-testid)
- O `test.setTimeout(90_000)` já está nos describe blocks dos specs afetados
- O fix principal é no **código de produção**, não nos testes E2E

## Testes Afetados (20)

- J2.3, J2.4 — Player join + realtime updates
- J5.3, J5.4 — Share link multi-player
- J9.1–J9.5 — DM vs Player visibility (5 testes)
- J11.1–J11.3, J11.5–J11.6 — Player view completa (5 testes)
- J12.3, J12.4 — Player resilience
- J13.4 — Mobile player view
- P1 Player Join — Auth player join
- P2 Soundboard — Player view (3 testes)
