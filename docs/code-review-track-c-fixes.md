# Code Review — Sprint 1 Track C (fixes)
Branch: `feat/beta3-telemetry-whitelist-archfixes` (worktree `agent-a2a4c2f8`)
Fix commits: `75c8d58`, `10a4c70`, `aee1023`, `841ddd8`, `4c1e148`, `c708841`
Review anterior: `docs/code-review-track-c.md`

## Veredicto
**APPROVE** — os 6 commits de fix resolvem tanto o CRITICAL (`hiddenMs = 0`) quanto o HIGH (QW2 do Finding 7), e endereçam todas as 4 MEDIUM levantadas. Nenhuma regressão introduzida; tsc limpo; 15 novos testes unitários pinam o classificador; lint do diff restrito a warnings pré-existentes. Um nitpick LOW sobre desvio de styling do QW2 em relação ao sprint plan literal (justificado e documentado no commit).

## Severity Summary (pós-fixes)
- [CRITICAL] 0 — resolvido em `75c8d58`
- [HIGH] 0 — QW2 resolvido em `10a4c70`; `lastFetchAtRef` success-only resolvido em `75c8d58`
- [MEDIUM] 0 — dead listener, migration warning, public stat block parity, `channelRef.state` TODO: todos atendidos
- [LOW] 1 — QW2 usa `text-white font-semibold` em vez de `text-red-400 font-bold` do sprint plan (justificado: red-on-red-frame teria contraste ruim; commit message explica)

## Findings por commit

### Commit `75c8d58` — Captura de `hiddenMs` antes do reset + refactor classifier
**Objetivo:** corrigir o bug CRITICAL que colapsava todos reconnects em Tier 1 porque `hiddenAtRef` era nulado antes da leitura.

#### [POSITIVO] Fix do CRITICAL confirmado
[components/player/PlayerJoinClient.tsx:1820-1821](components/player/PlayerJoinClient.tsx#L1820-L1821) agora captura:
```ts
const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
hiddenAtRef.current = null;
```
A segunda leitura (anteriormente em ~1851) foi removida — grep em `hiddenAtRef` mostra apenas 1 capture + 1 reset dentro do branch VISIBLE (linha 1820 captura, 1821 reset; sem re-leitura posterior). O bug está definitivamente corrigido.

#### [POSITIVO] Helper extraído é puro e bem-testado
[lib/realtime/reconnect-classifier.ts](lib/realtime/reconnect-classifier.ts) expõe `classifyReconnect({ hiddenMs, wasDisconnected, channelState })` como função pura (discriminated union de retorno, sem side effects, sem refs, sem `Date.now()` internamente). Threshold `LONG_BACKGROUND_MS = 30_000` exportado — usável em testes e asserts.

Os 3 tiers ficam claros:
- **Tier 3** (high) — `wasDisconnected || (channelState !== undefined && channelState !== "joined")`
- **Tier 2** (medium) — `hiddenMs > LONG_BACKGROUND_MS`
- **Tier 1** (noise) — fallback

Ordem correta: `wasDisconnected` cortocircuita antes de comparar `channelState`, e o guard `channelState !== undefined` evita inflação de Tier 3 quando o private-API do Supabase retorna `undefined` (caso isolado no teste "does NOT fire when channelState is undefined and no disconnect").

#### [POSITIVO] Bateria de 15 testes — passaram 15/15
[lib/realtime/__tests__/reconnect-classifier.test.ts](lib/realtime/__tests__/reconnect-classifier.test.ts) cobre:
- Tier 3: `wasDisconnected=true` com channel "joined", `channelState="closed"`, e explicitamente `channelState=undefined` NÃO disparando tier 3 (pin contra bug de inflação)
- Tier 2: `hiddenMs=31_000`, `LONG_BACKGROUND_MS+1`, **boundary strict `>`** em `30_000` → `noise` (pin importante), `channelState=undefined` com `hiddenMs > 30s` ainda classifica long_background
- Tier 1: tab-switch curto, `hiddenMs=0`
- Regression pin (`it.each`): echo de `hiddenMs` em todos os tiers + **cenário 45s-hidden / channel-joined** que o bug antigo mis-classificava como noise — hoje é `long_background` com `confidence="medium"`.

Execução: `npx jest lib/realtime/__tests__/reconnect-classifier.test.ts` → **15/15 PASSED em 0.744s**.

#### [POSITIVO] `lastFetchAtRef` só é atualizado em success (HIGH resolvido)
[components/player/PlayerJoinClient.tsx:886-920](components/player/PlayerJoinClient.tsx#L886-L920):
- Linha 886: `fetchInFlightRef.current = true` (sem update de `lastFetchAtRef` aqui, como sugerido)
- Linha 911-913: failure path — comentário explícito "Do NOT update lastFetchAtRef"
- Linha 920: success path — `lastFetchAtRef.current = Date.now()` depois do reset do circuit breaker

Resultado: emergency que falha não bloqueia throttled nos próximos 5s, exatamente o comportamento requisitado. OK.

#### [POSITIVO] `player:resumed` agora tem `confidence: "noise"` (LOW #7 resolvido)
[components/player/PlayerJoinClient.tsx:1879-1883](components/player/PlayerJoinClient.tsx#L1879-L1883). Schema simétrico com `player:reconnected`. Dashboards podem filtrar por `confidence` uniformemente.

#### [POSITIVO] TODO documentado sobre `channelRef.state` (MEDIUM #7 atendido)
[components/player/PlayerJoinClient.tsx:1866-1868](components/player/PlayerJoinClient.tsx#L1866-L1868):
```ts
// TODO: `state` is not part of the public `RealtimeChannel` API — replace
// with an event-driven ref updated via `channel.subscribe((status) => ...)`
// once we settle on a stable handshake signal.
```
O classifier já está preparado pra `channelState: undefined` (teste cobre). Se o Supabase renomear, caímos em Tier 1/2 conforme `hiddenMs` — não há mais o risco de inflar Tier 3 porque o código exige `channelState !== undefined && channelState !== "joined"`.

### Commit `10a4c70` — HP CRITICAL em texto branco (QW2 do Finding 7)
**Objetivo:** entregar o QW2 do Finding 7 que havia sido apontado como faltando.

#### [POSITIVO] Aplicado no lugar certo com o isCritical correto
[components/combat/CombatantRow.tsx:478-488](components/combat/CombatantRow.tsx#L478-L488) envolve o `<button>` do current HP. Quando `isCritical`, aplica `text-white font-semibold`; caso contrário, mantém `text-muted-foreground`. A lógica de `isCritical` permanece em [componentes/combat/CombatantRow.tsx:260](components/combat/CombatantRow.tsx#L260):
```ts
const isCritical = combatant.max_hp > 0 && !combatant.is_defeated && combatant.current_hp / combatant.max_hp <= 0.1;
```
Semântica é **≤10%** (não <25% como o review original supôs). OK — é um threshold mais agressivo (CRITICAL no sentido "prestes a cair"), consistente com o critical frame já existente em linhas 266-267.

#### [POSITIVO] Não toca `hp-status.ts` — sem conflito com Track E
Grep em `hp-status` no diff: zero hits. Apenas `CombatantRow.tsx` mudou. OK para merge paralelo.

#### [POSITIVO] Parity check honrado
Commit message explicita: DM view apenas, Guest CombatantRow herda o fix automaticamente (mesmo componente), player views (PlayerInitiativeBoard) out of scope pro QW2 do Finding 7. Alinhado com Combat Parity Rule do CLAUDE.md.

#### [LOW] Desvio de styling do sprint plan literal
O sprint plan S1.5 (referenciado no review original, linha 217) especificava `text-red-400 font-bold`. O fix entrega `text-white font-semibold`. Justificativa do commit: "reads poorly against the red critical frame" — o frame já é `border-red-500/60 + animate-critical-glow`, então red-on-red teria péssimo contraste. **Escolha defensável e documentada**, mas se o PM quiser o vermelho literal é 1 linha.

### Commit `aee1023` — Listener para `combat:turn-advancing` (MEDIUM #4 resolvido)
**Objetivo:** deixar de ser dead code o dispatch introduzido em `39ef480`.

#### [POSITIVO] Listener implementado com semântica correta
[components/combat/CombatantRow.tsx:168-185](components/combat/CombatantRow.tsx#L168-L185):
- `handleAdvancing` lê `prev_turn_index` do detail, fecha painel APENAS se `index === prevIdx` (a outgoing row)
- `handleAdvanced` lê `next_turn_index`, fecha painel em rows que NÃO são a incoming (`index !== nextIdx`) — comportamento original preservado
- Ambos registrados com cleanup simétrico

A diferença é importante: no advancing, fechamos só o saindo; no advanced, fechamos todos exceto o entrando. Isso preserva edits em qualquer row intermediária durante a transição (exceto onde o cursor está saindo) e só faz cleanup agressivo após o store avançar.

#### [POSITIVO] Order-of-events audit
`useCombatActions.handleAdvanceTurn` em [lib/hooks/useCombatActions.ts:77-112](lib/hooks/useCombatActions.ts#L77-L112):
1. Dispatch `combat:turn-advancing` com `{ prev_turn_index: prevIdx }` (linha 83-87)
2. `advanceTurn()` no store (linha 93)
3. Dispatch `combat:turn-advanced` com `{ prev_turn_index, next_turn_index }` (linha 105-107)

No CombatSessionClient [linha 1892-1900](components/session/CombatSessionClient.tsx#L1892-L1900), o scroll roda num `useEffect` de `[currentTurnIndex]` → `requestAnimationFrame`. O RAF garante que a pintura ocorra após o flush do `setOpenPanel(null)` do listener advancing. DOM attribute `data-panel-open="true"` na row é reavaliado; se o open panel vive na current-turn row → abort (intended), senão scroll segue.

**Único caveat teórico**: `setOpenPanel(null)` do listener é React setState assíncrono; se o browser tiver uma RAF excepcionalmente rápida, o DOM pode ainda refletir `data-panel-open="true"` na outgoing row. Nesse caso o guard `openIdx === currentTurnIndex` retorna `false` (outgoing !== current), scroll prossegue. Safe failure.

#### [POSITIVO] Commit message corrige a confusão original
O commit explica a arquitetura "two-phase coordination" e deixa claro por que os dois listeners coexistem. Documentação inline acima do useEffect também é clara.

### Commit `841ddd8` — Warning sobre `revoked_at` reset (MEDIUM #5 resolvido)
**Objetivo:** documentar o side-effect de des-revogar usuários.

#### [POSITIVO] Header atualizado com warning explícito
[supabase/migrations/137_backfill_whitelist_post_114.sql:16-26](supabase/migrations/137_backfill_whitelist_post_114.sql#L16-L26) (após renumeração):
- Seção "IDEMPOTENCY" separada de "WARNING"
- Warning flagrante com `⚠`
- Audit query sugerida: `SELECT user_id, revoked_at FROM content_whitelist WHERE revoked_at IS NOT NULL;`

**Verificação SQL:** a query é sintática e semanticamente correta. `content_whitelist` tem coluna `revoked_at` (inferido do `ON CONFLICT ... SET revoked_at = NULL`). Sem `;` missing, sem quote issues, pode rodar direto no psql/Supabase SQL editor.

- Link para `docs/beta-whitelist-policy.md` mantido
- Instrução "manually re-revoke any user that should stay off the list" torna o runbook actionable

### Commit `4c1e148` — PublicMonsterStatBlock parity (MEDIUM #6 resolvido)
**Objetivo:** aplicar o reorder do 740fc3d também na variante pública.

#### [POSITIVO] Reorder idêntico ao MonsterStatBlock
[components/public/PublicMonsterStatBlock.tsx:238-265](components/public/PublicMonsterStatBlock.tsx#L238-L265) agora tem os 4 blocos condicionais (`damageVuln`, `damageRes`, `damageImm`, `conditionImm`) ANTES do `<hr className="card-divider" />` e do grid de abilities. A posição antiga (linhas 304-305) ficou com um comentário apontando pra nova localização.

Ordem resultante: AC → HP → Speed → Initiative → **Vulnerabilities → Resistances → Immunities → Condition Immunities** → Abilities → Saves/Skills → Senses/Languages/CR. Match 1:1 com MonsterStatBlock gated, match com 5e Tools / D&D Beyond.

#### [POSITIVO] Risco SEO/SRD nulo
Nenhum dado novo é exposto. Apenas 4 `<p>` foram movidos verticalmente. `LinkedTerms`/`DAMAGE_TYPES`/`CONDITIONS` imports permanecem. Whitelist de conteúdo SRD não é tocado. Regra imutável SRD Content Compliance preservada.

#### [POSITIVO] Blocos permanecem condicionais
Todos os 4 mantêm o `{damageVuln && ...}` etc. Monster sem resistências não cria gap vazio. Sem quebra visual.

### Commit `c708841` — Renumeração 136 → 137
**Objetivo:** coordenar slots de migration entre Tracks A (136), C (137), F (138).

#### [POSITIVO] `git mv` usado (rename detected)
`git show c708841` mostra `similarity index 84%` e `rename from supabase/migrations/136_... rename to supabase/migrations/137_...`. History preservado.

#### [POSITIVO] Conteúdo atualizado sem quebrar semântica
- Linha 1: header atualizado pra "Migration 137"
- Linhas 2-4: novo parágrafo explicando a renumeração (Track A=136, C=137, F=138)
- Linha 37: `notes` string atualizada pra "via migration 137 (backfill post-114)"
- `docs/beta-whitelist-policy.md`: duas referências atualizadas (seção "Option C" e "Referências")

#### [POSITIVO] Nenhuma ref stale a "136_backfill"
Grep `"136_backfill_whitelist_post_114|136_backfill"` em todo o worktree → **No matches found**. Cleanup completo.

#### [POSITIVO] `ls supabase/migrations/` confirma
Última migration listada: `137_backfill_whitelist_post_114.sql`. Sem arquivo 136 órfão.

#### [NOTA] SQL body inalterado
`INSERT INTO content_whitelist ... ON CONFLICT (user_id) DO UPDATE ...` igual. Nenhuma dependência em nome de arquivo (migrations do Supabase são indexadas pelo prefix numérico, que é o que importa pra ordem de execução). OK.

## Cross-cutting (revisitado)

### Parity Matrix pós-fixes

| Finding | Guest | Anônimo | Autenticado | Observação |
|---------|-------|---------|-------------|------------|
| F4 telemetria tiers | N/A | ✅ | ✅ | **bug crítico corrigido**, 15 testes pinam |
| F5 auto-scroll guard | ✅ próprio | N/A | ✅ | `combat:turn-advancing` agora não é mais dead code |
| F6 whitelist | N/A | N/A | ✅ | migration 137 + warning |
| F7 resistances reorder | ✅ | ✅ | ✅ | + **public SEO agora também** |
| F7 QW2 HP cor | ✅ (herdado via CombatantRow) | ❌ (player view fora de scope) | ✅ | entregue |

### Observabilidade (revisitada)
- ✅ `player:resumed` agora com `confidence: "noise"` — schema simétrico
- ✅ `hiddenMs` efetivamente populado — Tier 2 agora pode disparar
- ✅ Regression pin no teste "45s-hidden / channel-joined" garante que o bug não volta
- ⚠ (não endereçado, LOW no review original #8) — ainda não há evento para throttle drops; fora do scope destes fixes

### Immutable Rules
- ✅ SRD Compliance — migration 137 idempotente, sem trigger, warning explícito sobre revoked_at; PublicMonsterStatBlock só reordena, não expõe novo conteúdo
- ✅ Resilient Reconnection — fixes aprimoram observabilidade sem alterar cadeia de fallbacks
- ✅ Combat Parity — QW2 aplicado em DM (auth + guest-DM), F7 reorder em todas as variantes (gated + public)

## DoD verification

- [x] `rtk tsc` → "TypeScript compilation completed" (0 erros) ✅
- [x] `npx jest lib/realtime/__tests__/reconnect-classifier.test.ts` → **15/15 PASSED** ✅
- [x] `npx jest components/combat/__tests__/MonsterGroupHeader.test.ts` → **8/8 PASSED** (sem regressão do fix anterior) ✅
- [x] `npx jest components/combat` → 2 suites fail pré-existentes (`CombatantRow.test.tsx` com `TypeError: getCrossVersionMonsterId is not a function`; `EncounterSetup.test.tsx` com falta de env Supabase). **Mesmos failures do baseline**, não introduzidos pelos fixes
- [x] Lint nos arquivos tocados (`npx eslint components/combat/CombatantRow.tsx components/player/PlayerJoinClient.tsx lib/realtime/reconnect-classifier.ts components/public/PublicMonsterStatBlock.tsx`) → 5 erros + 1 warning, **todos pré-existentes** (306/308/799 do PlayerJoinClient, 85 do CombatantRow, 44 do PublicMonsterStatBlock, 462 warning)
- [x] `reconnect-classifier.ts` é novo — sem erros de lint no próprio arquivo
- [x] Parity documentado: 10a4c70 commit message explicita DM-only; 4c1e148 explicita "SEO parity with combat"
- [x] Immutable rules: SRD (trigger-less, whitelist audit) + Resilient (emergency bypass preservado) + Combat Parity (QW2 + F7 cobrem os modos aplicáveis)

## Verificação específica dos dois CRITICAL/HIGH originais

### 75c8d58 corrigiu o CRITICAL?
**SIM, de forma robusta:**
1. `hiddenMs` capturado na linha 1820, antes do reset na 1821 ✅
2. Grep confirma que `hiddenAtRef` é lido UMA vez e resetado na sequência, sem re-leitura posterior ✅
3. Helper puro `classifyReconnect` facilita regression testing ✅
4. Teste específico `"after >30s hidden + visible with channel joined, tier is long_background"` **pina exatamente o cenário** que o bug antigo quebrava ✅
5. Boundary test strict-`>` em `LONG_BACKGROUND_MS = 30_000` impede silent drift ✅

### 10a4c70 fechou a QW2 do Finding 7?
**SIM, com um desvio de styling justificado:**
1. HP number agora tem estado visual distinto no CRITICAL ✅
2. Aplicado no DM view via CombatantRow (Guest-DM herda automaticamente) ✅
3. `isCritical` já existia com threshold ≤10% — semântica preservada ✅
4. Não toca Track E territory (`hp-status.ts`), merge-safe ✅
5. Desvio: usou `text-white font-semibold` em vez de `text-red-400 font-bold` — commit explica razão de contraste contra o frame vermelho. **Se o PM preferir o literal, é trivial ajustar**; caso contrário o desvio é defensável.

## Recomendações

Nenhum BLOCKER. Nenhum HIGH aberto. Pode merge-ar.

**Opcional / nice-to-have pós-merge** (não bloqueantes):
1. **[LOW]** Confirmar com PM se `text-white font-semibold` é aceitável (ou rodar 1-linha ajuste pra `text-red-400 font-bold` se quiser fidelidade literal ao sprint plan)
2. **[LOW]** Adicionar evento `fetchState:throttle_dropped` para visibilidade de drops (escopo original do review, não endereçado aqui — pode ser backlog)
3. **[NICE]** Usar `groupHealth.members` no lugar do `activeMembers` duplicado em MonsterGroupHeader (LOW do review original, não endereçado — nitpick)
4. **[FUTURO]** Trocar `(channelRef.current as unknown as { state?: string }).state` por ref atualizado via `channel.subscribe((status) => ...)` conforme TODO já colocado no código
