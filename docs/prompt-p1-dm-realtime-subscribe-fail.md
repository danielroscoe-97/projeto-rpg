# Prompt — Fix P1: DM Realtime Channel Nunca Fica SUBSCRIBED (Late-Join Broadcast Perdido)

**Missão:** Destravar os 2 specs E2E de Wave 3 que falham em `anonJoinCombat → player-view timeout` E os 3 specs de `features/audio-broadcast` que falham pelo mesmo motivo, TODOS caindo no mesmo ponto: o DM não recebe o broadcast `combat:late_join_request` do player porque o canal realtime do DM **nunca entra em estado `SUBSCRIBED`** — sempre retorna `CLOSED` ou `TIMED_OUT` no subscribe callback.

## Contexto completo

A sessão anterior (2026-04-21) **destravou helper drift** com 3 causas concorrentes corrigidas (ver `docs/postmortem-e2e-helper-drift-2026-04-21.md`). Durante a investigação do P1 residual ("JoinRequestBanner não renderiza no DM"), foi feito diagnóstico profundo mas o fix arquitetural não resolveu — problema é camada mais baixa (Supabase Realtime / WebSocket).

### Evidência concreta coletada (instrumentação já revertida, findings no post-mortem)

Instrumentação via `console.log` em 3 pontos:
1. **`lib/realtime/broadcast.ts` — subscribe callback** loggou status real
2. **`components/combat-session/CombatSessionClient.tsx` — handleLateJoin** loggou se handler dispara
3. **`components/player/PlayerJoinClient.tsx` — channel.send()** loggou result do broadcast

Resultados em 4 test runs:
- **Player side**: canal em `state: joined`, broadcast enviado, `send() result: ok` (server Supabase aceitou)
- **DM side**: 
  - `handleLateJoin FIRED` count = **0** (handler nunca dispara)
  - Subscribe callback status: `CLOSED`, `CLOSED`, `TIMED_OUT`, `TIMED_OUT` — **nunca `SUBSCRIBED`**

### Fix já aplicado (commit da sessão anterior)

`EncounterSetup` deixou de criar canal próprio com mesmo topic `session:${sid}` e agora usa `getDmChannel` singleton. **Arquiteturalmente correto** (elimina duplicação), mas **NÃO resolveu o subscribe fail do DM**. Sintoma persiste — o problema é mais fundo que a duplicação de canal.

### Specs afetados (reproduzem o bug)

Todos falham no mesmo ponto: `player-view` timeout após o player submeter late-join e DM deveria aceitar via JoinRequestBanner — que nunca aparece porque o canal do DM não subscribe.

| Spec | Helper que falha | Linha aproximada |
|------|-----------------|------------------|
| `e2e/conversion/turn-safety.spec.ts` | `anonJoinCombat` | fixtures/identity-upgrade-helpers.ts:86 |
| `e2e/conversion/waiting-room-signup-race.spec.ts:233` | `anonRegisterInLobby` + `dmAcceptPlayer` | spec inline |
| `e2e/features/audio-broadcast.spec.ts` (3 tests) | `playerJoinCombat` | helpers/session.ts:295 |

## Pré-requisitos

Confirme estado do código antes de começar:

```bash
rtk git log --oneline -5
# Deve mostrar commits recentes:
#   fix(realtime): consolidate DM channel — EncounterSetup uses getDmChannel singleton
#   docs(postmortem): P1 investigation deep dive — root cause narrowed
```

Se esses 2 commits existem, o fix arquitetural está aplicado. Pode começar a investigação mais profunda.

## Leitura obrigatória (na ordem)

1. `docs/postmortem-e2e-helper-drift-2026-04-21.md` — seção **Real issue investigado — anon auto-accept é DUPLA camada** (findings completos)
2. `lib/realtime/broadcast.ts` — `getDmChannel` (linha 41-85), `resetDmChannel` (linha 87-97), `broadcastEvent` (buscar no arquivo)
3. `lib/realtime/broadcast-server.ts` — existe um path alternativo via server route que pode bypassar o issue do client
4. `components/combat-session/CombatSessionClient.tsx:1138` — useEffect do late_join listener (ponto que deveria receber broadcast)
5. `components/player/PlayerJoinClient.tsx:2912` — `handleLateJoinRequest` (player broadcast)

## Plano de ataque — 4 caminhos, do mais pragmático ao mais profundo

### Caminho 1 (RECOMENDADO) — Usar `broadcastViaServer` no player side

**Hipótese:** O path client-player → Supabase Realtime direto sofre de algum issue de WS/auth. O path client-player → API route → server broadcast pode ser mais robusto.

Já existe em `lib/realtime/broadcast-server.ts` a função `broadcastViaServer` que faz POST pra um endpoint Next.js que então broadcasta via server-side Supabase client.

**Ação:**
1. Abrir `lib/realtime/broadcast-server.ts` e entender o contract
2. Modificar `handleLateJoinRequest` em `PlayerJoinClient.tsx:2912` pra usar `broadcastViaServer` em vez de `channelRef.current.send()`
3. Rodar o spec canônico: `npx playwright test e2e/conversion/turn-safety.spec.ts --project=desktop-chrome --reporter=list`
4. Se passar — fix encontrado; se não — passar pro Caminho 2

**Por que é o mais pragmático:** não requer entender WHY o DM subscribe falha. Apenas bypassa. Se funciona, resolve todos os 5 tests afetados de uma vez.

### Caminho 2 — Instrumentar lib/supabase/client.ts + verificar WS state

**Hipótese:** Auth token do DM não está propagando pro WS realtime connection. Sem auth token, subscribe em canal (mesmo público) pode estar bloqueado.

**Ação:**
1. Adicionar `realtime.setAuth(token)` explícito quando o DM client é criado, pegando o access_token da session
2. Logar WS state (`supabase.realtime.socket.readyState`) em vários pontos
3. Ver se difere entre DM e player

### Caminho 3 — Testar com Supabase local

**Hipótese:** Algum issue específico do ambiente Supabase de produção (rate limit, network hop, etc).

**Ação:**
1. `supabase start` (local)
2. Apontar `NEXT_PUBLIC_SUPABASE_URL` pro local
3. Seed DM account no local DB
4. Rodar spec — se passar local, é issue de prod

### Caminho 4 — Inspecionar Supabase Realtime server logs

**Hipótese:** Server tá rejeitando o subscribe por alguma razão (rate limit, auth, topic malformed). Precisaria acesso aos logs.

**Ação:**
1. Login no dashboard Supabase
2. Realtime logs durante um test run
3. Ver o que o server diz sobre o subscribe do DM

## Instrumentação recomendada pra re-diagnosticar

Se reabrir a instrumentação removida, basta reativar os 3 pontos (NÃO usar `process.env.NEXT_PUBLIC_E2E_MODE` gate — Next.js dev com turbopack às vezes ignora env vars, usar console.log direto):

```ts
// lib/realtime/broadcast.ts:64 — no subscribe callback
channel!.subscribe((status, err) => {
  console.log("[DIAG] DM subscribe status:", status, "err:", err?.message, "sid:", sessionId);
  // ...
});

// components/combat-session/CombatSessionClient.tsx:1144
const handleLateJoin = ({ payload }) => {
  console.log("[DIAG] handleLateJoin FIRED", payload);
  // ...
};

// components/player/PlayerJoinClient.tsx:2926
const sendResult = await channelRef.current.send({ type: "broadcast", event: "combat:late_join_request", payload: {...} });
console.log("[DIAG] player send result:", sendResult);
```

Ver trace com:
```bash
cd "e2e/results/<test-dir>" && unzip -o trace.zip -d trace-extracted/
grep -o "\[DIAG\][^\"]\{0,200\}" trace-extracted/1-trace.trace  # DM (page index 1)
grep -o "\[DIAG\][^\"]\{0,200\}" trace-extracted/0-trace.trace  # player (page index 0)
```

## Critério de sucesso

Spec canônico passa:
```bash
npx playwright test e2e/conversion/turn-safety.spec.ts --project=desktop-chrome --reporter=list
# Expected: 1 passed
```

Bonus — todos os 5 specs afetados passam isolados:
```bash
npx playwright test e2e/conversion/turn-safety.spec.ts e2e/conversion/waiting-room-signup-race.spec.ts e2e/features/audio-broadcast.spec.ts --project=desktop-chrome --reporter=list
```

## Riscos

- **Se modificar `PlayerJoinClient` ou `CombatSessionClient`**: essas são componentes core de produção. Qualquer mudança deve passar smoke test manual (DM cria combate, player entra via /join, DM aceita) antes de push.
- **Se mexer em `lib/realtime/broadcast.ts`**: há `cleanupDmChannel` chamado em unmount de combate — cuidado pra não quebrar presença.
- **Test data órfã em Supabase**: cada run cria session em `danielroscoe97@gmail.com`. Cleanup via `/api/e2e/cleanup` é opt-in nos specs mas o afterEach nem sempre dispara.

## Memory persistente com a lição

Já salva em `feedback_e2e_audit_before_hypothesis.md` — audit sistemático antes de hipótese, se sintoma não muda após fix não concluir "fix não funcionou" mas "instrumenta".

## Commit convention

Se Caminho 1 funcionar:
```bash
rtk git commit --only -m "fix(realtime): route player late-join broadcast via server — bypasses client WS subscribe fail" \
  components/player/PlayerJoinClient.tsx
```

Se Caminho 2 funcionar:
```bash
rtk git commit --only -m "fix(realtime): propagate auth token to realtime WS — fixes DM channel CLOSED status" \
  lib/supabase/client.ts
```

## Estimativa

- Caminho 1: 30-90min (implementação + test)
- Caminho 2: 1-2h (instrumentação + ajuste auth + test)
- Caminho 3: 2-3h (setup Supabase local + seed + rerun)
- Caminho 4: variable (depende de acesso)

## Kickoff message pra próxima sessão

```
Li docs/prompt-p1-dm-realtime-subscribe-fail.md + docs/postmortem-e2e-helper-drift-2026-04-21.md.
Confirmei via `rtk git log --oneline -5` que o fix arquitetural
(EncounterSetup usa getDmChannel singleton) está deployed.

Plano: vou tentar o Caminho 1 primeiro (broadcastViaServer) — 30-90min,
não requer entender por que o DM subscribe falha, só bypassa.

Se falhar, parto pro Caminho 2 (auth token no WS).

Começando pela leitura de lib/realtime/broadcast-server.ts.
```
