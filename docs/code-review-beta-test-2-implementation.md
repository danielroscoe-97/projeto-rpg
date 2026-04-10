# Code Review — Beta Test #2 Implementation

> **Revisao**: 2026-04-10
> **Escopo**: 27 commits, 89 arquivos, +20,698 linhas
> **Commits**: `34c3b94..b4155c0`
> **Revisores**: 5 agentes paralelos (A: Realtime, B: Token, C: UI, D+E: Reactions+Offline, Sec: Migrations)

---

## Resumo Executivo

A implementacao das 5 frentes do Beta Test #2 e **arquiteturalmente solida**. O sanitization pipeline, ownership validation, offline queue com IndexedDB, e o fallback chain de reconexao mostram design thoughtful. Porem, existem **4 bugs criticos** que podem causar regressao em producao e devem ser corrigidos antes do proximo playtest.

---

## CRITICOS — 4 Bugs (devem ser corrigidos AGORA)

### CRIT-1: `reconcile_combat_state` RPC nao persiste `session_token_id`
- **Frente**: B (Token Identity)
- **Arquivo**: `supabase/migrations/070_reconcile_combat_state.sql` (3 branches INSERT/UPSERT)
- **Impacto**: O link token<->combatant so vive na memoria Zustand. Se o DM da refresh, `session_token_id` volta pra NULL no DB. A feature inteira de reconexao por ID nao sobrevive a um reload.
- **Fix**: Adicionar `session_token_id` nas 3 clausulas INSERT + ON CONFLICT DO UPDATE do RPC.

### CRIT-2: Dual broadcast envia TODOS os eventos 2x para players
- **Frente**: A (Realtime Sync)
- **Arquivo**: `lib/realtime/broadcast.ts:363-392`
- **Impacto**: Cada acao do DM e broadcastada client-side E via server (`broadcastViaServer`). O dedup por `_seq` so protege `turn_advance` e `hp_update` — todos os outros eventos (conditions, add/remove, defeated, stats) sao processados 2x pelo player. Pode causar flicker no combat log e entries duplicadas.
- **Fix**: Estender `_seq` dedup para TODOS os event types no player side. Ou desligar client-side broadcast ja que server broadcast existe.

### CRIT-3: `channel.send()` nao e awaited — falhas sao silenciosas
- **Frente**: A (Realtime Sync)
- **Arquivo**: `lib/realtime/broadcast.ts:363-372`
- **Impacto**: `channel.send()` retorna `Promise<"ok"|"error"|"timed out">` mas nao e awaited. O catch so pega exceptions sincronas (raras). Falhas assincronas (websocket buffer full, disconnect) sao silenciosamente perdidas. DM pensa que mandou, player nunca recebeu.
- **Fix**: `await ch.send(...)` e tratar o status retornado. Enfileirar na offline queue se falhar.

### CRIT-4: Falta constraint UNIQUE em `session_token_id`
- **Frente**: B (Token Identity)
- **Arquivo**: `supabase/migrations/115_combatant_session_token_link.sql:7-9`
- **Impacto**: Multiplos combatants podem linkar ao mesmo token. Player reconecta e `.find()` retorna o primeiro match — pode ser um combatant de encounter anterior.
- **Fix**: `CREATE UNIQUE INDEX ... ON combatants(session_token_id) WHERE session_token_id IS NOT NULL;`

---

## WARNINGS — 10 Issues (corrigir em breve)

### WARN-1: String hardcoded em portugues no grupo expandido
- **Frente**: C (UI)
- **Arquivo**: `components/player/PlayerInitiativeBoard.tsx:920`
- **Impacto**: Users em EN veem "media MODERATE" em vez de "avg MODERATE" no header de grupo expandido.
- **Fix**: Trocar por `{t("group_avg_label", { status: avgStatus })}` (o collapsed ja usa isso).

### WARN-2: `effectiveTokenId` faltando no useEffect dependency array
- **Frente**: C (UI)
- **Arquivo**: `components/player/PlayerInitiativeBoard.tsx:336`
- **Impacto**: AC flash pode triggerar pro combatant errado apos reconexao.

### WARN-3: `session_token_id` vaza para todos os players nos combatants de player
- **Frente**: B (Token Identity)
- **Arquivo**: `lib/utils/sanitize-combatants.ts:44-46`
- **Impacto**: Cada player ve o `session_token_id` (UUID interno) de todos os outros players. Nao e diretamente exploravel mas vaza IDs internos.

### WARN-4: DB update do link token e fire-and-forget sem error handling
- **Frente**: B (Token Identity)
- **Arquivo**: `components/session/CombatSessionClient.tsx:942-948`
- **Impacto**: Se o update falha (rede, RLS), o link so existe em memoria. Agravado pelo CRIT-1.

### WARN-5: DM manualmente adicionando player NAO seta `session_token_id`
- **Frente**: B (Token Identity)
- **Arquivo**: `components/session/CombatSessionClient.tsx:677-680`
- **Impacto**: O cenario original do bug (DM cria "Kai", player registrou como "Kamuy") ainda nao faz link automatico no fluxo de add manual. So funciona via rejoin request.

### WARN-6: Offline queue para no primeiro erro — perde acoes restantes
- **Frente**: E (Offline)
- **Arquivo**: `lib/realtime/offline-queue.ts:207-212`
- **Impacto**: 10 acoes na queue, falha na 1a = perde as 9 restantes pra sempre. Nao ha retry.

### WARN-7: `getQueueSize()` le so memoria, nao IndexedDB
- **Frente**: E (Offline)
- **Arquivo**: `lib/realtime/offline-queue.ts:130-132`
- **Impacto**: DM banner mostra "0 queued" apos refresh mesmo com acoes pendentes no IndexedDB. Replay funciona, mas UI mente.

### WARN-8: Server broadcast cria canal novo por request (latencia)
- **Frente**: A (Realtime)
- **Arquivo**: `app/api/broadcast/route.ts:147-172`
- **Impacto**: ~100-300ms overhead por broadcast. A 60 req/min e toleravel, mas nao escala.

### WARN-9: `dm_plan` exposto na state API — verificar conteudo
- **Frente**: Security
- **Arquivo**: `app/api/session/[id]/state/route.ts:124`
- **Impacto**: Se `dm_plan` contem notas/taticas do DM, e leak para players. Se e tier de plano (free/pro), ok.

### WARN-10: `combat_log` JSONB sem limite de tamanho
- **Frente**: Security
- **Arquivo**: `supabase/migrations/116_combat_log_persistence.sql:7`
- **Impacto**: Combate longo (100+ rounds) pode gerar MB de JSONB. Sem cap ou truncation.

---

## SUGESTOES — 11 Items (nice-to-have)

| ID | Frente | Descricao |
|----|--------|-----------|
| SUG-1 | A | Periodic state_sync a cada 60s como safety net contra desync |
| SUG-2 | A | Consolidar `sanitizeCombatant` duplicado entre `broadcast.ts` e `sanitize.ts` |
| SUG-3 | A | Debounce HP broadcasts (100ms por combatant) contra rapid-click |
| SUG-4 | A | Metricas de broadcast failure rate via analytics |
| SUG-5 | A | Lobby refresh e polling-only (5s) — considerar broadcast `player:joined` |
| SUG-6 | A | `PlayerJoinClient.tsx` tem ~1800 linhas — extrair hooks customizados |
| SUG-7 | B | Verificar `is_active` no token durante reconexao (token revogado ainda faz match) |
| SUG-8 | B | Case-insensitive `.trim()` no fallback de nome |
| SUG-9 | C | "(you)" vs "Your character" — consistencia com lobby |
| SUG-10 | D | Rate limit server-side no reaction toggle (hoje so client-side) |
| SUG-11 | E | Player offline banner poderia informar "acoes podem estar atrasadas" |

---

## Pontos Fortes da Implementacao

1. **Sanitization pipeline robusto**: Monster stats, DM notes, hidden combatants corretamente filtrados. Anti-metagaming alias funciona.
2. **Ownership validation multicamada**: Token ID + nome normalizado unicode + case-insensitive. Nao da pra spoof reacao de outro player.
3. **Offline queue production-grade**: IndexedDB + memory fallback, idempotency keys, FIFO eviction, 500 max.
4. **Reaction lifecycle correto**: Auto-reset no `advanceTurn` tanto no Zustand quanto no handler do player. Ephemeral (nao persiste no DB).
5. **DM presence multi-layer**: `pagehide` + `sendBeacon` + `visibilitychange` + heartbeat + stale detection timer.
6. **Backward compatibility**: Sessions sem token link continuam funcionando via nome. Migration nullable.
7. **Guest parity respeitada**: Todas as mudancas verificaram os 3 modos conforme CLAUDE.md.

---

## Prioridade de Correcao

```
IMEDIATO (antes do proximo playtest):
  1. CRIT-1: session_token_id no RPC ───── [migration + SQL]
  2. CRIT-3: await channel.send() ──────── [1 arquivo, ~10 linhas]
  3. CRIT-4: UNIQUE constraint ─────────── [migration, 2 linhas]
  4. WARN-1: string hardcoded PT ────────── [1 linha]

PROXIMO SPRINT:
  5. CRIT-2: dedup _seq em todos events ── [PlayerJoinClient, ~20 linhas por handler]
  6. WARN-5: manual add sem token link ─── [UX decision + implementation]
  7. WARN-6: offline queue retry ────────── [offline-queue.ts]
  8. WARN-7: getQueueSize from IDB ──────── [offline-queue.ts]

BACKLOG:
  9-14: WARN-2,3,4,8,9,10 ──────────────── [various]
  15-25: SUG-1 a SUG-11 ────────────────── [various]
```

---

## Veredicto Final

**APROVADO COM RESSALVAS.** A arquitetura e solida, as decisoes de design sao corretas, e 80% da implementacao esta production-ready. Os 4 criticos sao bugs de integracao (RPC nao atualizado, broadcast nao awaited, falta de constraint) — nao sao falhas de design. Fix estimado: ~2h para os 4 criticos.
