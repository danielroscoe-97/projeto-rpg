# Code Review — Sprint 1 Track B (Combatant Add Reorder)
Branch: `worktree-agent-a43c8ebe` (commits em `feat/beta3-combatant-add-reorder`)
Commits: 7 (b3547cb → 77cbdb6)
Revisor: adversarial, três lentes (Blind Hunter / Edge Case Hunter / Acceptance Auditor)

## Veredicto

**APROVADO COM RESSALVAS** (não mergear como está).

A arquitetura do fix está correta e fecha a race condition do spike v2 Finding 2 no caminho "happy path" (DM-new + player-new, sem hidden combatants). DoD funcional bate: tipo novo, flag env-driven, opt-out do `broadcastViaServer`, persists sequenciados, testes unitários verdes (35/35), TSC verde, E2E escrito (não executado).

Porém há **2 bugs sérios latentes** que comprometem a promessa de zero-desync em cenários comuns:

1. **B-1 (HIGH)** — `inconsistencyDetected` é lido ANTES do updater de `setCombatants` necessariamente rodar (React schedules updaters; não garante execução síncrona dentro de callback de `supabase.channel.on("broadcast")`). Resultado: o fallback `fetchFullState` **pode não disparar** quando deveria. O spec posiciona essa recovery como "last line of defense"; silenciá-la é pior do que não tê-la.
2. **B-2 (HIGH)** — `initiative_map` inclui IDs de hidden combatants (nunca filtrado no sanitize). O handler do player marca esses IDs como inconsistência. Qualquer encontro com ≥1 hidden combatant dispara `fetchFullState` em **todo** `combatant_add_reorder`, produzindo (a) flood de telemetria `desync_detected` (falso positivo constante, degrada a métrica em `docs/sprint-plan-beta3-remediation.md:965`), (b) possível race com o persist DB (ver B-3).

Dois bugs adicionais MEDIUM e alguns LOWs listados abaixo. Nenhum é arquitetural, todos podem ser corrigidos em ~1h e re-auditados.

## Severity Summary

| Severidade | Count | IDs |
|---|---|---|
| HIGH   | 2 | B-1, B-2 |
| MEDIUM | 3 | B-3, B-4, B-5 |
| LOW    | 4 | B-6, B-7, B-8, B-9 |

## New flag framework justification

Checado `lib/flags.ts:1-89` contra `lib/feature-flags.ts:1-75`:

- `lib/feature-flags.ts` — sistema de **subscription/plan-tied** flags, lê de tabela Supabase `feature_flags`, tem cache de 5 min, TTL, stale-while-revalidate. Flags são do tipo `persistent_campaigns`, `saved_presets`, `homebrew` — amarradas a planos (`free` / `pro`). Requer auth. Client-side only ("use client"). Não serve para toggle de arquitetura per-deploy.
- `lib/flags.ts` — sistema **env-driven** (`NEXT_PUBLIC_FF_*` → `process.env` + `window.__RPG_FLAGS__` runtime override). Stateless, síncrono, server+client, sem Supabase. Usado para risky rollouts (S1.2, S3.1, S4.2).

São **propósitos ortogonais**. Reutilizar `feature-flags.ts` para rollout gating exigiria: adicionar rows no DB antes de cada deploy, quebrar cache TTL de 5min, expor flags anônimas (guest não tem plano). O spec explicitamente pede o novo framework em `docs/sprint-plan-beta3-remediation.md:953`: *"`lib/flags.ts` criado em S1.2 como dep compartilhada"*. Portanto **NÃO é scope creep** — é dep explícita de S3.1 e S4.2, criada aqui pela primeira story que precisa dela.

Nomes estão confusos (`flags.ts` vs `feature-flags.ts`), mas a docstring em `lib/flags.ts:1-18` explica a distinção. Aceitável.

## Findings

### Broadcast layer

#### B-2 (HIGH) — `initiative_map` vaza IDs de hidden combatants e dispara falso-positivo de desync no player

`lib/realtime/broadcast.ts:189` e `lib/realtime/sanitize.ts:96`:

```ts
initiative_map: event.initiative_map,
// comentário: "initiative_map carries only IDs + numeric orders — already safe. Pass through."
```

Dois problemas:

1. **Info leak** — a lista inclui IDs de hidden combatants que o player nunca deveria ver. Um player malicioso pode inferir "há N monstros escondidos, com iniciativa X, Y, Z". Não vaza nome/HP mas vaza presença + slot de iniciativa.
2. **Falso-positivo de desync** — o handler em `components/player/PlayerJoinClient.tsx:1293-1299` marca `inconsistencyDetected=true` para qualquer ID da map que o player não conhece. Hidden combatants SEMPRE caem nesse caso. Qualquer DM que use a feature "Hide" em qualquer combatant vai disparar o fallback `fetchFullState` em **cada** add, em cada player, em cada sessão. Flood de telemetria + request.

Comentário em `PlayerJoinClient.tsx:1291` reconhece o problema mas resolve com "conservatively trigger recovery". A escolha conservadora aqui é a errada — o caso comum (DM tem pelo menos 1 monstro hidden) é tratado como desync.

**Correção**: Filtrar `initiative_map` server/client antes do envio para conter apenas IDs de combatants visíveis (mesma lista usada por `SanitizedStateSync`). Lookup do `_combatantsLookup` já existe em `broadcast.ts:334`.

#### B-6 (LOW) — Server-broadcast endpoint aceita `combat:combatant_add_reorder` (bypass possível)

`app/api/broadcast/route.ts:60-140` não tem check para `combat:combatant_add_reorder`. A dedup da race acontece só no path `broadcastEvent() → shouldSkipServerBroadcast()` (client-side). Se um DM modificado (ou um bug futuro que chame `broadcastViaServer` direto) emitir o evento pela API, ele passa pelo `sanitizePayloadServer` e chega aos players — defeating the opt-out.

Superfície de ataque: zero (só o DM owner da session passa o auth check, e o DM é o único afetado). Superfície de bug: a próxima pessoa que tocar `broadcast.ts` pode adicionar `broadcastViaServer(...)` sem perceber que quebra a garantia.

**Correção sugerida**: espelhar a lista no route handler — adicionar early-return 422 para `combat:combatant_add_reorder` em `app/api/broadcast/route.ts` (ou melhor, aceitar, mas skipar a rebroadcast e só retornar ok). Alternativa barata: comentário `FIXME` documentando a premissa.

#### B-8 (LOW) — `shouldSkipServerBroadcast` é linear (`=== "combat:combatant_add_reorder"`)

`lib/realtime/broadcast.ts:456`. Quando S3.1 / S4.2 forem implementadas usando o mesmo padrão de atomic broadcast, vão colidir. Sugestão: promover para `Set<RealtimeEventType>` desde já. Não bloqueia merge — é ergonomia.

### DM handler

#### B-3 (MEDIUM) — Broadcast emitido ANTES de DB persist completar; fetchFullState pode pegar DB stale

`lib/hooks/useCombatActions.ts:440-479`. A ordem executada é:

```
1. broadcastEvent(add_reorder)   // síncrono, fire-and-forget
2. void (async () => {
     await persistNewCombatant(...)      // ~50-150ms
     await persistInitiativeOrder(...)   // ~50-150ms
   })()
```

Se o broadcast chegar ao player, o handler detectar inconsistência (ver B-2), e o `setTimeout(500)` disparar o `fetchFullState` ANTES do persist terminar (possível se persists somarem >500ms — latência Supabase via Vercel pode chegar a 600ms P90), o player vai GET `/api/session/.../state` e receber uma snapshot **sem** o novo combatant. O player então reconcilia e pode remover o combatant recém-adicionado.

O broadcast é autoritativo (carrega o combatant completo); o DB é eventually-consistent. O fetchFullState, quando dispara, é não-autoritativo relativo ao broadcast mais recente, e não há `updated_at`/version compare para descartar reconciliações stale.

**Mitigação**: (a) persist ANTES do broadcast (aceita custo de latência), ou (b) passar `encounter.updated_at` no payload e comparar no fetchFullState, ou (c) só fazer fetchFullState se passou >N segundos desde o último broadcast. A abordagem (a) é a mais simples e segura.

**Nota:** o comment do commit f9dc8fc diz *"o await sequencial adiciona ~50-150ms latency no DM side — acceptable trade for consistency"* — mas a consistência DB que isso consegue é neutralizada pelo fato de broadcast já ter saído antes.

#### B-7 (LOW) — `snap.encounter_id!` em fire-and-forget IIFE

`lib/hooks/useCombatActions.ts:472`. Já havia null-check na linha 423 (`if (added && snap.encounter_id)`) então é safe. Mas o `!` em async closure aumenta fragilidade se alguém remover o guard acima depois. Substituir por variável local capturada (`const eid = snap.encounter_id; ... await persistNewCombatant(eid, ...)`).

### Player handler

#### B-1 (HIGH) — `inconsistencyDetected` é lido antes do `setState` updater rodar

`components/player/PlayerJoinClient.tsx:1265-1340`:

```ts
let inconsistencyDetected = false;

updateCombatants((prev) => {
  ...
  for (const entry of payload.initiative_map) {
    if (!next.some((c) => c.id === entry.id)) {
      if (entry.id !== incoming.id) {
        inconsistencyDetected = true;   // ← set dentro do updater
      }
    }
  }
  ...
});

// ... código síncrono entre updateCombatants e o check abaixo ...

if (inconsistencyDetected) {            // ← lido ANTES do updater rodar
  trackEvent(...);
  setTimeout(() => fetchFullState(eid), 500);
}
```

React's `setState(updater)` schedules work. O updater roda durante a próxima fase de render/commit, NÃO necessariamente síncrono dentro da chamada. Isso é pior em callback de `supabase.channel.on("broadcast")`, que é externa ao event system do React, então não há batching síncrono garantido.

Possíveis resultados em produção:
- React bailout / lazy update: updater roda **depois** da linha 1340 → `inconsistencyDetected` = `false` → fetch nunca dispara → player fica desync **permanentemente**.
- React strict mode (não ligado aqui): updater roda duas vezes, ambos idempotentes, `inconsistencyDetected = true` — OK mas não testado.

O teste unitário `lib/combatant-add-reorder-handler.test.ts:145+` não cobre isso porque extrai o reducer como função pura e o chama sincronamente. A assertion em `inconsistencyDetected` dentro do teste passa no puro, mas a invocação dentro de `setCombatants` é onde o bug vive.

**Correção**: mover o cálculo de `inconsistencyDetected` para fora do updater. Usar uma função pura `computeNext(prev, payload)` chamada pelo updater E inspecionada fora. Ou calcular só da `payload.initiative_map` comparando contra `combatantsRef.current` (que é síncrono).

```ts
// SAFER:
const currentList = combatantsRef.current;
const currentIds = new Set(currentList.map(c => c.id));
const inconsistencyDetected = payload.initiative_map.some(
  e => e.id !== incoming.id && !currentIds.has(e.id)
);
updateCombatants((prev) => { ... reducer puro ... });
```

#### B-4 (MEDIUM) — Claim de "debounce 500ms via fetchInFlightRef" é incorreto

`components/player/PlayerJoinClient.tsx:1338-1339`:

```
// Debounced by fetchInFlightRef (already set inside fetchFullState)
// so rapid adds don't storm the endpoint.
```

`fetchInFlightRef` (linha 218, usado em 859-860) é um **in-flight guard**, não debounce. Se 3 adds dispararem 3 `setTimeout(500)` e o primeiro fetch completar em <500ms (acontece em rede rápida), o segundo ainda dispara, o terceiro ainda dispara. Não há coalescing.

Impacto: baixo em adds raros, mas combinado com B-2 (falso-positivo constante em sessões com hidden combatants), pode produzir 3-5 fetches por segundo em adicionado rápido — storm real. Spec em `docs/sprint-plan-beta3-remediation.md:157` lista `combatant_add_reorder fallback → emergency` como um fluxo de recovery controlado.

**Correção**: adicionar `pendingDesyncFetchRef` (NodeJS.Timeout | null). Ao detectar inconsistência, `clearTimeout(pendingDesyncFetchRef.current)` e reagendar. Ou: rate-limit explícito (`Date.now() - lastDesyncFetchAt < 2000`).

### Tests

#### B-5 (MEDIUM) — E2E não exercita a race condition real; só verifica contagem após quiesce

`e2e/combat/rapid-add.spec.ts:117-134` faz 3 adds, espera 5 segundos (`waitForTimeout(5_000)`), e verifica ordem final. Isso é **teste de funcionalidade** (os 3 combatants aparecem + ordenados por iniciativa), não **teste da race condition** que o Finding 2 descreve.

O bug original era ordem observada DURANTE os adds, não depois de quiesce de 5s. A versão flag-ON deveria passar facilmente mesmo SEM o fix (porque após 5s a legacy state_sync também converge). O teste não falhará no código pré-fix, então não é regressão válida.

**Sugestão**: (a) reduzir o wait para 200-500ms e verificar ordem sob condição transiente, ou (b) usar `waitForEvent('broadcast')` e assertar que apenas 1 evento por add chegou (zero `state_sync`). A opção (b) é o teste que falha no código legado e passa no novo — é o teste correto para "race fix".

Testes unitários (`combatant-add-reorder-handler.test.ts`, 9 tests) estão bons para semântica do reducer, mas não testam:
- que `updateCombatants` + `updateTurnIndex` + `setRound` batcham (bug B-1 acima)
- que `initiative_map` com hidden IDs não dispara falso-positivo (B-2)
- que persist serial não é sobrescrito por fetch prematuro (B-3)

#### Teste flags — Lens 2 checkpoint: cobertura de precedência

`lib/flags.test.ts:26-45` — cobre env=truthy, env=false, runtime beats env, undefined clears. **Falta**: cobrir `window.__RPG_FLAGS__` em ambiente server-side (hoje: `typeof window === "undefined"` early-returns; nenhum teste afirma isso). Baixa prioridade porque é SSR-only edge, mas se a flag for lida em Server Component, resultado silencioso é má surpresa.

7 tests em `flags.test.ts` — spec disse 35 total entre as 3 suites, confirmado via `jest` run: **Tests: 35 passed, 35 total**.

#### `window.__RPG_FLAGS__` em prod — Lens 2 checkpoint

Pode ser setado via DevTools em qualquer ambiente. Em prod, um usuário final acessando `/` pode rodar `window.__RPG_FLAGS__ = { ff_combatant_add_reorder: true }` no console e ativar a flag localmente no próprio browser. Player isolado → se nenhum DM tiver a flag ON, player recebe só eventos legacy e o override não faz nada. Ou seja, risk = 0 no estado atual.

Porém: se um **player malicioso** setar `ff_combatant_add_reorder = false` enquanto o DM emite novos eventos, o handler novo no player é gated? **Não** — o handler em `PlayerJoinClient.tsx:1249` é registrado incondicionalmente, não lê a flag. Então player sempre processa o novo evento se chegar. A flag é só gate do emissor (DM). OK.

Lens 2 risk: ao expandir essa flag framework (S3.1, S4.2) para gatear handlers do player também, o runtime override vira vetor. Documentar.

### .env.example

Presente e documentado (`.env.example:50-61`). Defaults vazios (aceito como falsy), comentário aponta para spec de rollout. OK.

## Backwards compat audit

Spec requer coexistência durante soak period. Cenários:

| Cenário | DM | Player | Resultado |
|---|---|---|---|
| Happy path atual | flag OFF | novo client | Legacy pair emitido, player processa via handlers legados (`combat:combatant_add` + `session:state_sync`). Handler novo nunca dispara. OK. |
| Rollout alvo | flag ON | novo client | Evento novo emitido, handler novo processa. OK (modulo B-1, B-2, B-3). |
| **Mixed — novo DM, old player PWA cache** | flag ON | old client | Old player não tem handler para `combat:combatant_add_reorder`. Event é ignorado. DM não emite legacy pair (flag ON exclusivo). **Player vê NADA quando DM adiciona combatant.** |
| Old DM, new player | flag OFF (ou client antigo) | novo client | Legacy pair emitido, novo player processa via handlers legados. OK. |

O cenário problemático (linha 3 da tabela) é explicitamente a razão da "Deploy 1: player client first, soak 24h" no spec (sprint-plan:790). Porém:
- Service worker em `public/sw.js:17-24` **NÃO** faz `skipWaiting()` automático. Há um banner de "Update" para o usuário clicar.
- Usuários que rejeitam o banner mantêm PWA cache antigo indefinidamente.
- 24h de soak não garante 100% de adoção.

**Risco**: quando `ff_combatant_add_reorder=1` for ativado em prod, players com PWA antigo vão ter breakage silencioso em adds. Não é bloqueador pra merge, mas **bloqueador pra flip do flag em prod**. Sugestão: adicionar bump de `CACHE_VERSION` em `sw.js` junto com o deploy do client novo, para forçar invalidação de cache no ciclo de update.

## Race condition coverage — o core da review

A race original (Finding 2, `spike-beta-test-3-2026-04-17.md`):

```
Cause: broadcastViaServer (server rebroadcast) + client-direct broadcast =
2 senders. 3 rapid adds × 2 broadcasts × 2 senders = 12 msgs com FIFO
parcial. State_sync podia chegar antes do combatant_add, ou intercalar,
causando turn-order quebrado no player.
```

O fix:
1. **Eliminou state_sync como broadcast separado** → substituído por `initiative_map` no mesmo payload do add. ✅ Certo.
2. **Eliminou o segundo sender** → `shouldSkipServerBroadcast` bloqueia `broadcastViaServer` pra esse tipo. ✅ Certo (assumindo B-6 não vire bug).
3. **Tornou o update atomic no player** → single `updateCombatants` + `updateTurnIndex` + `setRound` batchados. ✅ Certo em teoria para React 19 auto-batching em handlers. Empirical: não testado. Sem strict mode, batching é best-effort.

**Race FECHOU?** No happy path, sim. Mas **novas races foram abertas**:

- **Race Novo 1 (B-3)**: broadcast-first / DB-persist-second + fetchFullState fallback → player pode reconciliar com DB stale e descartar o add ótico.
- **Race Novo 2 (B-2 + B-1)**: hidden combatants em `initiative_map` disparam falso-positivo de desync. Se B-1 for corrigido, cada hidden combatant vai gerar fetchFullState. Ver B-2 para motivação da correção (filtrar map).
- **Race Novo 3 (B-1 sozinho)**: `inconsistencyDetected` pode não ser lido pela ordem de setState vs read síncrono; fetchFullState pode silenciosamente NÃO disparar em desync real.

Resumindo: **o fix resolve a race de Lucas (Finding 2) mas move dois cantos do problema**. Resolver B-1, B-2, B-3 fecha todos.

## DoD verification

| Item | Status | Ref |
|---|---|---|
| Tipo `combat:combatant_add_reorder` em `lib/types/realtime.ts` com shape correto | ✅ | `lib/types/realtime.ts:90-105` (combatant, initiative_map, current_turn_index, round_number, encounter_id — match com spec:114) |
| Sanitized counterpart (`SanitizedCombatantAddReorder`) | ✅ | `lib/types/realtime.ts:407-414` |
| DM handler gated por `ff_combatant_add_reorder` | ✅ | `lib/hooks/useCombatActions.ts:435-465` |
| Flag default false | ✅ | `lib/flags.ts:33` (`ff_combatant_add_reorder: false`) |
| Legacy pair preservada quando flag OFF | ✅ | `lib/hooks/useCombatActions.ts:451-465` + teste `broadcast.test.ts:321-331` |
| Opt-out do `broadcastViaServer` | ✅ | `lib/realtime/broadcast.ts:437-438` + teste `broadcast.test.ts:309-319` |
| Sanitização: monster HP hidden, dm_notes stripped, display_name applied | ✅ | `sanitize.ts:95`, teste `broadcast.test.ts:285-289` |
| `is_hidden` combatant suprime broadcast inteiro | ✅ | `broadcast.ts:182-184` + `sanitize.ts:92`, teste `broadcast.test.ts:300-307` |
| Player handler atomic (batch updateCombatants + turn + round) | ⚠️ | `PlayerJoinClient.tsx:1267-1329` — sintaxe OK; B-1 é bug sutil |
| Fallback fetchFullState via debounce 500ms | ⚠️ | `PlayerJoinClient.tsx:1340-1351` — B-4 (não é debounce real) + B-1 (pode não disparar) |
| Telemetry event | ✅ | `PlayerJoinClient.tsx:1341` — emite `combat:combatant_add_desync_detected`. **Nota**: spec em `sprint-plan:965` usa nome `combatant_add.desync_detected` — drift de `:` vs `.`. Alinhar antes de instrumentar dashboards. |
| `.env.example` atualizado | ✅ | `.env.example:50-61` |
| Unit tests (35+) | ✅ | 35 passed via `npx jest lib/flags.test lib/combatant-add-reorder-handler.test lib/realtime/broadcast.test` |
| rtk tsc verde | ✅ | "TypeScript compilation completed" |
| rtk lint verde nos arquivos tocados | ⚠️ | 4 errors, **todos pré-existentes em master** (verificado via `git stash`). Não introduzido por Track B, mas nota pra QA: a branch não piora o estado. |
| E2E `rapid-add.spec.ts` escrito | ✅ | `e2e/combat/rapid-add.spec.ts` (flag-ON + flag-OFF) — ver B-5 sobre validade |
| E2E executado | ❌ | Requer dev server. **Manual QA item** — Lucas em staging. |
| Parity matrix documentado | ✅ | `sprint-plan:870` — Guest N/A (sem broadcast), Anon + Auth ✅ |
| 7 commits coesos | ✅ | cada commit = 1 camada (types+flag / broadcast+sanitize / DM emit / player handle / tests / e2e / env). Nenhum commit megalomaníaco. |

## Recomendações antes do merge

**Bloqueadores (corrigir antes de merge):**
1. **B-1** — mover `inconsistencyDetected` para fora do `setCombatants` updater. Usar `combatantsRef.current` para checar IDs presentes síncronamente.
2. **B-2** — filtrar `initiative_map` em `sanitizePayload` (`broadcast.ts:189`) e `sanitizePayloadServer` (`sanitize.ts:96`) para remover entries cujo `id` pertence a combatant com `is_hidden=true`. Usa o mesmo `_combatantsLookup` já disponível.
3. **B-3** — inverter a ordem em `useCombatActions.ts:437-479`: `await persistNewCombatant → await persistInitiativeOrder → broadcastEvent`. Aceita ~150ms de latência extra pra garantir que fetchFullState sempre veja o novo combatant.

**Antes do flip do flag em prod (pós-merge):**
4. **Mixed fleet** — bump `CACHE_VERSION` em `public/sw.js:3` no mesmo deploy que ativa a flag, para invalidar PWAs antigos com `ff_combatant_add_reorder=1`.
5. **B-5** — refazer o e2e de race usando snapshots durante os adds (ex: após cada add, capturar names) em vez de espera de 5s. O teste atual passa no código legado.

**Nice-to-have (pode virar issue de follow-up):**
6. **B-4** — reescrever o "debounce" do fetchFullState para coalescing real.
7. **B-6** — espelhar o opt-out do `shouldSkipServerBroadcast` em `app/api/broadcast/route.ts`.
8. **B-7** — capturar `snap.encounter_id` em variável local antes do IIFE.
9. **B-8** — promover `shouldSkipServerBroadcast` para lookup em `Set`.
10. Alinhar nome de telemetria: `combatant_add.desync_detected` (spec) vs `combat:combatant_add_desync_detected` (código) — pick one.
11. Documentar risk do `window.__RPG_FLAGS__` em `lib/flags.ts:74-89` caso a framework evolua pra gatear handlers do player.

**Sanity:** 35/35 unit tests pass, TSC zero erros, lint idêntico a master, scope dos commits coeso. O fix arquitetural é bom; falta polir 3 arestas antes de confiar no flip pra prod.
