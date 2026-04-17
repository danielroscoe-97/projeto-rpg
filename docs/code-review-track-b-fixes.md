# Fix Review — Track B (Commits pós-review)
Branch: `feat/beta3-combatant-add-reorder`
Commits revisados: `f5e1db8`, `35c540e`, `65e4af2`, `834b741`, `ae2ee07`
Revisor: adversarial, foco em verificar que cada fix fecha a vulnerabilidade original sem introduzir nova.

## Veredicto

**MERGE-READY COM 2 OBSERVAÇÕES NÃO-BLOQUEADORAS.**

Todos os 3 blockers HIGH/MEDIUM (B-1, B-2, B-3) foram endereçados com correções que fecham a vulnerabilidade raiz. Os fixes de B-5 (poll determinístico) e SW cache bump estão corretos. TSC verde, 39/39 tests passando, lint sem novos erros (os 4 pré-existentes continuam os mesmos, confirmados como não-introduzidos pelos fixes).

As 2 observações são: (a) uma **race residual em adds concorrentes** no B-3 que é significativamente mais leve que o bug original mas ainda existe, e (b) **gaps de teste** (hidden-only e transição hidden→visível não cobertos). Nenhuma bloqueia o flip da flag em prod.

## Severity Summary

| Severidade | Count | IDs |
|---|---|---|
| HIGH   | 0 | — |
| MEDIUM | 0 | — |
| LOW    | 2 | F-1 (race residual em adds concorrentes), F-2 (gap de teste em hidden transitions) |
| NOTE   | 2 | N-1 (B-6 server route permanece não-fixado), N-2 (sanitize.ts fallback quando `allCombatants` ausente) |

## Findings por commit

### f5e1db8 — B-1 race fix (HIGH → RESOLVED)

**Correção verificada em** `components/player/PlayerJoinClient.tsx:1265-1279`:

```ts
const currentIds = new Set(combatantsRef.current.map((c) => c.id));
const inconsistencyDetected = payload.initiative_map.some((entry) => {
  if (entry.id === incoming.id) return false;
  if (entry.id.startsWith("hidden:")) return false;
  return !currentIds.has(entry.id);
});
updateCombatants((prev) => { ... });  // reducer puro, sem side-channel
```

- **Leitura síncrona**: sim. `combatantsRef.current` é lido ANTES de `updateCombatants` ser chamado. O resultado é uma `const` fixa no closure do handler, não mais um `let` mutado dentro do updater.
- **Race com segundo broadcast mid-flight?** Residual (ver F-1), mas **muito mais leve** que o bug original. O ref é atualizado em commit-time (linha 706 do mesmo arquivo — `combatantsRef.current = next` está dentro do updater de `setCombatants`). Dois broadcasts em <1 commit window lerão o mesmo ref stale. Na prática, broadcasts estão separados por latência de rede (~50-150ms), suficiente para commit React. Consequência possível: `inconsistencyDetected=true` falso positivo em rajada apertada → fetchFullState acionado indevidamente. Isso não é o bug original (silêncio de recovery); é o oposto (recovery zelosa demais). Aceitável.
- **B-2 integração**: o skip de `"hidden:"` prefixado está no mesmo check. Correto.

**Veredicto B-1: FECHADO.** A race de React-setState-async está efetivamente eliminada. F-1 é consequência independente e aceitável.

### 35c540e — B-2 hidden ID masking (HIGH → RESOLVED)

**Correção verificada** em:
- `lib/realtime/broadcast.ts:336-363` (cliente, usa `_hiddenLookup` registrado)
- `lib/realtime/sanitize.ts:221-253` (servidor, usa `allCombatants` param)
- `lib/types/realtime.ts:411` (`is_hidden?: true` no shape de initiative_map)
- Reducer em `PlayerJoinClient.tsx:1277` e `combatant-add-reorder-handler.test.ts:51` honram `"hidden:"` prefix.

**FNV-1a 32-bit — reversibilidade**:
- Combatant IDs são UUIDs v4 (`crypto.randomUUID()`, confirmado em `lib/stores/combat-store.ts:131,487`).
- Espaço UUID = 2^122 (~5.3×10^36). Brute-force para encontrar preimage de um hash observado requer iterar UUID space. Infeasível. ✅
- **Caveat real**: FNV-1a não é criptograficamente seguro; preimage resistance NÃO é garantida pelo algoritmo. A segurança aqui vem do espaço de entrada (UUIDs), não do hash. Se IDs passassem a ser slugs curtos ou sequenciais, o masking viraria trivialmente reversível. Vale documentar o invariante "combatant IDs são UUIDs" em `maskHiddenId` (nice-to-have, não-bloqueador).
- Colisões (birthday): para 1000 combatants em uma sessão, P(colisão) ≈ 1.16×10^-4 no espaço de 2^32. Negligível.

**Downstream breakage**:
- Sort: `orderById.get(c.id)` (line 1301) usa IDs do map. Placeholders "hidden:*" são injetados como chaves mas **nenhum combatant local tem essa chave**, então não interferem com o sort de combatants visíveis. ✅
- Turn index: `adjustTurnIndexForPlayers` (broadcast.ts:367) não toca no map — ajusta só o índice. ✅
- Dedup: mesmo ID escondido → mesmo hash → reducer idempotente. ✅

**Handler do player skip de `hidden:*`**: confirmado em `PlayerJoinClient.tsx:1277` (o check `.startsWith("hidden:")` está no computation de `inconsistencyDetected`). Placeholders **não** disparam desync. ✅

**Hash estável entre eventos com mesmo ID escondido**: coberto por teste em `broadcast.test.ts:334` ("masked placeholder is STABLE across broadcasts"). ✅

**Gaps de teste** (F-2):
- (a) **Hidden-only initiative**: não coberto. Se um encounter tem só hidden combatants + o incoming, o map do player tem N placeholders + incoming. Logicamente funciona (reducer ignora placeholders), mas nenhum teste garante.
- (b) **Mixed hidden+visible**: coberto (test B-2 principal).
- (c) **Transição hidden→visible**: não coberto. Se o DM revela um hidden, novos broadcasts usam ID real; broadcasts antigos continuam com hash. State do player ainda tem o placeholder como entry órfão do map — mas como o reducer só aplica ordens de combatants que EXISTEM localmente, o placeholder é ignorado. Lógica correta; teste ausente.

**Veredicto B-2: FECHADO.** Gaps de teste são dívida, não regressão.

### 65e4af2 — B-3 broadcast order (MEDIUM → RESOLVED com race residual)

**Correção verificada** em `lib/hooks/useCombatActions.ts:454-497`. Nova ordem:

```
snap.addCombatant(...) [local Zustand, instant DM UX]
  ↓
await persistNewCombatant(encounterId, added)
  ↓
await persistInitiativeOrder(initiativeSnapshot)
  ↓
broadcastEvent(...)  [flag-ON ou legacy pair]
```

**Persist antes de broadcast**: confirmado, sequencial com `await`. ✅

**Tratamento de falha de persist**: `catch` → `setError(...)` → `return` antes do broadcast. Se persist falhar, players ficam sincronizados com DB (sem phantom combatant). DM vê erro e pode retry. ✅

**B-7 micro-fix incluído**: `const encounterId = snap.encounter_id` capturado fora do IIFE, `snap.encounter_id!` removido. TypeScript narrowing funciona porque linha 423 já faz `if (added && snap.encounter_id)`. ✅

**F-1 — Race residual em adds concorrentes** (LOW):
- Cenário: `handleAddCombatant(A)` e `handleAddCombatant(B)` chamados em sucessão rápida (<100ms, antes do IIFE-A completar persist).
- IIFE-A: await persist-A (50-150ms), broadcast-A. Dentro do broadcast-A, `useCombatStore.getState().combatants` (line 469) já contém A **e** B (porque `snap.addCombatant` de B rodou síncronamente no main thread).
- O broadcast-A para player carrega `added=A` mas `initiative_map` inclui B (que ainda não foi broadcast).
- Player recebe evento-A: combatant=A, map inclui `{id: B}`. Player checa `combatantsRef.current` — não tem B. `inconsistencyDetected=true`. Agenda fetchFullState em 500ms.
- Se IIFE-B's persist+broadcast completar em <500ms, o fetchFullState é cancelado (bem, não — `fetchInFlightRef` não debounce; ver B-4 não fixado) ou vê DB com A+B. OK.
- Se IIFE-B's persist > 500ms, fetchFullState vê DB só com A. Player remove B do map (porque não existe localmente e não está mais no fetched snapshot). Broadcast-B chega depois e recoloca. **Oscilação visual possível.**

Isso é residual, significativamente mais leve que o bug B-3 original (um único add podia sumir), e é mitigável pela UX raramente atingida (DMs não clicam 2x em 100ms). Não-bloqueador; documentar como known limitation.

**Veredicto B-3: FECHADO** para o single-add case. F-1 é variante concorrente, baixa frequência.

**Nota**: o comentário do commit diz "DB is now consistent" — verdade para o add atual; mas `initiativeSnapshot` capturado em line 452 pode divergir de `useCombatStore.getState().combatants` em line 474 se outro add rolou no intervalo. Micro-inconsistência entre map persistido e map broadcastado. Converge.

### 834b741 — B-5 e2e timing (MEDIUM → RESOLVED)

**Correção verificada** em `e2e/combat/rapid-add.spec.ts:124-146` e 200-214.

- `waitForTimeout(5_000)` removido. `expect.poll(...)` com `timeout: 2_000`, `intervals: [100, 150, 250]`.
- 2s é suficiente: broadcast latency P50 ~50-150ms × 3 adds + persist 50-150ms × 3 + React reconcile ~50ms ≈ 400-600ms. 2s tem folga ~3x.
- Condição do poll checa o end-state correto: os 3 Velociraptors presentes E ordenados por iniciativa (`vA < vB && vB < vC`). ✅
- Regressão da legacy path: o state_sync legado converge em ~3-5s. 2s está abaixo, então se o código quebrar (regressão para o path legado racey), o poll falha. ✅
- Flag-OFF spec também recebeu o mesmo tratamento (linhas 200-214). ✅
- Mantém warning soft para elapsed >8s (observabilidade em CI lento). ✅

**Veredicto B-5: FECHADO.** Teste agora é regressão válida.

### ae2ee07 — SW cache bump (RESOLVED)

**Correção verificada** em `public/sw.js:7`. `CACHE_VERSION = "v3"` (era v2).
- `APP_SHELL_CACHE`, `SRD_CACHE`, `AUDIO_CACHE`, `STATIC_CACHE` todos derivam de `CACHE_VERSION` via template string (lines 8-11). ✅
- `activate` handler em lines 32-63 já tem cleanup de caches obsoletos: `keys.filter(key => !validCaches.includes(key)).map(key => caches.delete(key))`. Caches v2 antigos serão deletados automaticamente no próximo activate. ✅
- `skipWaiting` permanece manual via `SKIP_WAITING` message (line 27) — intencional para UX do banner. ✅
- Comentário no topo (lines 3-6) documenta o motivo do bump. ✅

**Veredicto: FECHADO.** Nada mais precisa ser atualizado.

## New risks introduzidos

Nenhum **novo risco HIGH** introduzido pelos fixes. Os residuais identificados:

1. **F-1 (LOW)** — adds concorrentes no DM podem produzir oscilação visual no player (combatant aparece→some→reaparece). Frequência realista: baixa. Impacto: cosmético (estado final converge). Não regressão do B-3 (bug original era mais grave).
2. **F-2 (LOW)** — gaps de teste em hidden-only e transição hidden→visible. Lógica está correta por inspeção, mas sem regression test.

**Riscos antigos que permanecem não-fixados** (explicitamente diferidos como nice-to-have na review original):
- **N-1** — B-6: `app/api/broadcast/route.ts:60-140` continua sem opt-out de `combat:combatant_add_reorder`. Superfície de ataque = zero pelo client (shouldSkipServerBroadcast bloqueia), mas **se** alguém chamar `broadcastViaServer` diretamente, o map passaria sem sanitize de hidden (ver N-2).
- **N-2** — `sanitize.ts:237` tem fallback: se `allCombatants` não for fornecido, passa o map raw. Hoje o route.ts não chama com allCombatants para `combatant_add_reorder` (não está em `NEEDS_COMBATANT_CONTEXT` linhas 71-80), então se N-1 virar problema, N-2 amplifica (leak de hidden IDs via server path). Fix trivial: adicionar `combat:combatant_add_reorder` ao `NEEDS_COMBATANT_CONTEXT` E ao 422-reject list.
- **B-4** — "debounce" de fetchFullState ainda é in-flight guard, não coalescing. Baixa prioridade porque B-2 reduziu drasticamente a taxa de disparo.
- **B-8** — `shouldSkipServerBroadcast` linear em vez de Set. Ergonomia.
- **Drift telemetria** — `combat:combatant_add_desync_detected` (código) vs `combatant_add.desync_detected` (spec). Decidir antes do dashboard.

## DoD

- [x] B-1 race actually closed — `combatantsRef.current` lido síncrono antes de setState (`PlayerJoinClient.tsx:1271-1279`)
- [x] B-2 hidden ID non-reversible + no downstream breakage — UUIDs via FNV-1a, brute-force infeasível no espaço 2^122; sort/turn/dedup preservados
- [x] B-3 persist-before-broadcast enforced — `useCombatActions.ts:454-497` com `await persistNewCombatant → await persistInitiativeOrder → broadcastEvent`, early-return em falha
- [x] B-5 poll reliable — 2s timeout com intervals 100/150/250ms, condição checa ordem correta dos 3 combatants
- [x] SW cache bumped — v2 → v3 em `public/sw.js:7`, activate handler já tem cleanup
- [x] tsc green — "TypeScript compilation completed"
- [x] Lint green — 4 erros pré-existentes em master (handleApplyDamage, cancelAckTimer, effectiveTokenId, t hook); nenhum novo
- [x] Tests passing — **39/39** em `lib/flags.test` + `lib/combatant-add-reorder-handler.test` + `lib/realtime/broadcast.test`

## Recomendações

**Para este PR (nada bloqueador, pode mergear):**
1. Adicionar JSDoc em `maskHiddenId` documentando o invariante "combatant IDs são UUIDs v4" (mitigação F-2 caso convenção mude).
2. Considerar cobertura de teste para (a) hidden-only initiative e (c) transição hidden→visible — pode virar issue de follow-up.

**Antes do flip de `ff_combatant_add_reorder=1` em prod:**
3. Decidir telemetria: `combat:combatant_add_desync_detected` vs `combatant_add.desync_detected`. Alinhar dashboards.
4. Considerar endereçar B-6 + N-1/N-2 (server route opt-out) como defense-in-depth — trabalho ~15min.
5. Se rapid-add concorrente (F-1) for cenário real em prod (DMs com atalhos), considerar serializar `handleAddCombatant` com um lock ou mutex local para eliminar overlap entre IIFEs.

**Nice-to-have (follow-up sprint):**
6. B-4 (coalescing real de fetchFullState).
7. B-8 (Set em vez de equality check).
8. Teste de React integration (não só reducer puro) que valide o batching de `updateCombatants + updateTurnIndex + setRound`.

**Sanity final**: 5/5 fix commits endereçam seus targets corretamente; nenhum fix introduziu regressão observável; 39/39 tests passam; tsc verde; lint inalterado relativo a master. Fixes prontos para merge.
