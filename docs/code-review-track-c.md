# Code Review — Sprint 1 Track C
Branch: worktree-agent-a2a4c2f8
Commits: 6881f9c, 689f67f, 39ef480, ba611b7, 740fc3d

## Veredicto
**BLOCK** — o commit 6881f9c tem um bug crítico que anula a classificação de 3 tiers (o campo `hiddenMs` é sempre `0`), e o Sprint Plan exige QW2 do Finding 7 em S1.5 que não foi entregue. Restante está sólido.

## Severity Summary
- [CRITICAL] 1 — `hiddenAtRef` é zerado antes de ler `hiddenMs`, tier 2 (`long_background`) nunca dispara
- [HIGH] 2 — QW2 (HP crítico cor) do Finding 7 ausente; `fetchInFlightRef` atualiza `lastFetchAtRef` mesmo se retorna por in-flight
- [MEDIUM] 4 — `combat:turn-advancing` é dead dispatch; migração 136 silenciosamente des-revoga usuários; public SEO stat block fora de parity; `channelRef.state` depende de API privada
- [LOW] 4 — subquery `granted_by` quebra migration se admin ausente; `activeMembers` duplica filtro do `buildGroupHealth`; telemetria `player:resumed` sem `confidence`; test importa `.tsx` via `.test.ts` (ok mas inconsistente)

## Findings por commit

### Commit 6881f9c — Telemetria 3-tier + throttle com priority

#### [CRITICAL] `hiddenMs` é sempre 0 no handler de visibilitychange
[components/player/PlayerJoinClient.tsx:1807](components/player/PlayerJoinClient.tsx#L1807) zera `hiddenAtRef.current = null` logo ao entrar no branch "VISIBLE". Em seguida [components/player/PlayerJoinClient.tsx:1851](components/player/PlayerJoinClient.tsx#L1851) tenta ler `hiddenAtRef.current` para calcular `hiddenMs`. Como já está `null`, `hiddenMs` resolve para `0` em todas as execuções.

Consequência: o branch Tier 2 (`hiddenMs > 30_000` → `method: "long_background"`) em [components/player/PlayerJoinClient.tsx:1863](components/player/PlayerJoinClient.tsx#L1863) **nunca dispara**. Todo reconnect sem `wasDisconnected` e com `channelState === "joined"` cai em Tier 1 (`player:resumed`). Isso **destrói o propósito do commit** — classificação de 3 tiers vira 2 (channel_recovery vs player:resumed), e o sinal intermediário que o spike Finding 4 queria isolar está perdido.

Correção: capturar `hiddenMs` em uma `const` logo na entrada do branch VISIBLE (antes de zerar o ref), ou deixar para zerar só após `emitReconnectTelemetry()`.

```ts
// Correção sugerida:
const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
hiddenAtRef.current = null;  // zerar SÓ depois
```

#### [HIGH] `fetchFullState` atualiza `lastFetchAtRef` antes do guard de in-flight
[components/player/PlayerJoinClient.tsx:883-886](components/player/PlayerJoinClient.tsx#L883-L886): a checagem de throttle é em 879-882, depois vem o guard `fetchInFlightRef.current` em 884, e só então `lastFetchAtRef.current = Date.now()` em 886. Isso está OK quando a throttle passa e não há in-flight. Porém: se duas chamadas emergency + throttled rodarem simultaneamente, a throttled passa pelo guard de throttle (prioridade emergency não checa), mas é rejeitada pelo in-flight. Nesse caso `lastFetchAtRef` não é atualizado — comportamento aceitável. **Não é bug, mas vale documentar.**

Real problema mais sutil: a emergency call atualiza `lastFetchAtRef` em 886 mesmo que o fetch subsequente falhe (401 sem refresh, 500, network error). A throttled subsequente nos próximos 5s é bloqueada por conta de uma emergency que já falhou. Isso pode retardar reconciliação no cenário: emergency-on-visibilitychange falha → player fica sem dados por 5s mesmo com turnPoll tentando. Mitigar: só atualizar `lastFetchAtRef` em success.

#### [MEDIUM] `channelRef.current.state` acessa API privada do Supabase
[components/player/PlayerJoinClient.tsx:1852](components/player/PlayerJoinClient.tsx#L1852) usa `(channelRef.current as unknown as { state?: string }).state`. O campo `state` não é parte da API pública do `RealtimeChannel`. Se o Supabase renomear/remover, a clausula `channelState !== "joined"` silenciosamente vira `undefined !== "joined"` → `true` → tier 3 para tudo, inflacionando `channel_recovery`. Adicionar teste ou usar o handshake event (`SUBSCRIBED`) para setar um ref próprio seria mais resiliente.

#### [LOW] `player:resumed` não carrega `confidence`
[components/player/PlayerJoinClient.tsx:1874-1877](components/player/PlayerJoinClient.tsx#L1874-L1877): Tier 1 emite `player:resumed` sem campo `confidence`. Os dois outros eventos têm. Para consistência de dashboards, incluir `confidence: "noise"` ou similar. Não bloqueia, mas cria assimetria no schema de eventos.

### Commit 689f67f — Migration 136 + policy doc

#### [MEDIUM] Migration re-ativa silenciosamente usuários revogados
[supabase/migrations/136_backfill_whitelist_post_114.sql:30-32](supabase/migrations/136_backfill_whitelist_post_114.sql#L30-L32) usa `ON CONFLICT DO UPDATE SET revoked_at = NULL`. Isso é intencional e documentado em [docs/beta-whitelist-policy.md:30-32](docs/beta-whitelist-policy.md#L30-L32), mas o comentário da migração diz apenas "re-runnable safely" sem destacar o side-effect de des-revogar. Em produção, se algum usuário foi revogado entre 114 e 136, essa migração o re-ativa. Adicionar aviso explícito no header:

```sql
-- WARNING: ON CONFLICT DO UPDATE clears revoked_at. If a user was intentionally
-- revoked between 114 and this migration, they will be re-granted access. Audit
-- content_whitelist WHERE revoked_at IS NOT NULL before shipping.
```

#### [LOW] Subquery de `granted_by` falha silenciosamente se admin ausente
[supabase/migrations/136_backfill_whitelist_post_114.sql:25](supabase/migrations/136_backfill_whitelist_post_114.sql#L25) faz `(SELECT id FROM auth.users WHERE email = 'danielroscoe97@gmail.com')`. Se o email não existir no ambiente alvo (staging com seed diferente, prod com rename), o resultado é `NULL`. `granted_by UUID NOT NULL` gera erro em runtime da migration (fail-loud, bom!) mas a mensagem não é óbvia para quem não conhece o schema. Documentar ou adicionar CHECK explícito. Minor, migration 114 tem a mesma pegadinha.

#### [POSITIVO] Política doc é sólida
[docs/beta-whitelist-policy.md](docs/beta-whitelist-policy.md) cobre bem os 3 cenários (ad-hoc, broad, revoke), explicita a regra imutável contra trigger em `auth.users`, e alinha com a regra SRD Content Compliance do CLAUDE.md. Bem-vinda.

### Commit 39ef480 — Auto-scroll guard

#### [MEDIUM] `combat:turn-advancing` é dispatch sem listener (dead code)
[lib/hooks/useCombatActions.ts:81-93](lib/hooks/useCombatActions.ts#L81-L93) dispara `combat:turn-advancing` antes de `advanceTurn()`, mas [components/combat/CombatantRow.tsx:165](components/combat/CombatantRow.tsx#L165) só ouve `combat:turn-advanced`. O commit message menciona "Dispatch `combat:turn-advancing` + `combat:turn-advanced`", então parece intencional para futura extensão — mas como está, é dispatch gratuito que só polui DevTools. Remover ou documentar como "reservado para Track D" no comentário.

#### [POSITIVO] Guard refinado é correto
[components/session/CombatSessionClient.tsx:1893-1898](components/session/CombatSessionClient.tsx#L1893-L1898) lê `data-combatant-index` do painel aberto e compara com `currentTurnIndex`. `parseInt(openIdx, 10) === currentTurnIndex` está protegido contra `null` e `NaN`. Ordem do `requestAnimationFrame` garante que o listener do CombatantRow já executou `setOpenPanel(null)` antes do próximo render.

#### [POSITIVO] Parity corretamente documentado como DM-only
GuestCombatClient tem auto-scroll próprio em [components/guest/GuestCombatClient.tsx:1094-1106](components/guest/GuestCombatClient.tsx#L1094-L1106) usando `[aria-current="true"]` — sem guard de panel, logo sem o bug. Player não tem auto-scroll. Acertado.

### Commit ba611b7 — groupHealth

#### [POSITIVO] Implementação limpa e bem testada
[components/combat/MonsterGroupHeader.tsx:53-87](components/combat/MonsterGroupHeader.tsx#L53-L87) implementa `buildGroupHealth` como função pura, exportada. 8 testes cobrem empty, defeated exclusion, min/max/median (odd+even), tier boundaries, NaN guard (`max_hp = 0`), e regression guard contra re-adição do `sum`. `Math.min(...[])` / `Math.max(...[])` retornariam `Infinity` / `-Infinity` mas o guard `if (hps.length > 0)` protege — teste `empty member list` valida isso.

#### [LOW] `activeMembers` duplica filtro do `buildGroupHealth`
[components/combat/MonsterGroupHeader.tsx:127](components/combat/MonsterGroupHeader.tsx#L127): `const activeMembers = members.filter((m) => !m.is_defeated)` é mantido separado do `groupHealth.members`. Poderia usar `groupHealth.members` direto e economizar um filter + evitar risco de divergir se as definições de "alive" mudarem. Nitpick.

#### [POSITIVO] data-attributes expõem shape sem re-compute
[components/combat/MonsterGroupHeader.tsx:251-256](components/combat/MonsterGroupHeader.tsx#L251-L256) emite `data-group-health-*` atributos. Track D/UX spec H9 consome sem re-rodar `buildGroupHealth`. Boa antecipação.

#### [NOTA] Edge case HP negativo
`min` pode ser negativo se algum monster tiver `current_hp < 0` (raro mas possível). O display mostraria `-5–30 HP`. UX estranho mas não bug. Vale mencionar no handoff pra Track D.

### Commit 740fc3d — Resistances reorder

#### [HIGH] QW2 do Finding 7 não foi entregue
O sprint plan explicitamente inclui Finding 7 QW2 em S1.5: [docs/sprint-plan-beta3-remediation.md:217](docs/sprint-plan-beta3-remediation.md#L217) — "aplica `text-red-400 font-bold` no `current_hp` quando `isCritical`". O commit message diz que "HP critical, token colors belongs to Track D" — isso contradiz o plano. S4.x depende de S1.5 (linha 534: "HP crítico DM via Finding 7 QW2 já feito em S1.5").

Se o agent tem um acordo com PM pra mover QW2, documentar; senão, isso é escopo faltando. CombatantRow.tsx não tem patch nesta trilha pra QW2.

#### [MEDIUM] Parity gap: `PublicMonsterStatBlock.tsx` não foi reordenado
[components/public/PublicMonsterStatBlock.tsx:277-300](components/public/PublicMonsterStatBlock.tsx#L277-L300) ainda tem damage vulnerabilities/resistances DEPOIS de saves/skills, DEPOIS do divider da ability table. A parity rule do CLAUDE.md é "UI-only changes → SEMPRE aplicar nos 3 modos". Apesar da Public não estar listada como um dos 3 modos combat (Guest/Anônimo/Autenticado), ela é a versão SEO da mesma informação. O commit diz "Parity: shared across DM (auth + guest) and player views" — acurado pra combat, mas deixa SEO inconsistente.

Escalar: se Finding 7 só cobre o combat view, ok; se é consistência de stat block end-to-end (5e Tools ordering), Public deveria seguir. Dado que é quick win estrutural, refletir em Public custa ~20 linhas — vale reforçar.

#### [POSITIVO] Reorder em si é seguro
Todos os 4 blocos continuam condicionais (`damageVuln && ...`). Monster sem resistências continua renderizando sem gap. Sem quebra.

## Cross-cutting issues

### Parity Matrix (CLAUDE.md Combat Parity)

| Finding | Guest | Anônimo | Autenticado | Observação |
|---------|-------|---------|-------------|------------|
| F3 groupHealth (data) | ✅ (via CombatantRow) | ✅ | ✅ | shared component |
| F4 telemetria tiers | N/A | ✅ (com bug crítico) | ✅ (com bug crítico) | PlayerJoinClient |
| F5 auto-scroll guard | ✅ (auto-scroll próprio, sem bug) | N/A | ✅ | DM-only + guest-DM fire sem propagar (guest não usa useCombatActions) |
| F6 whitelist | N/A | N/A | ✅ | auth-only, migration |
| F7 resistances reorder | ✅ | ✅ | ✅ | combat view sim; **public SEO view NÃO** |
| F7 QW2 HP cor | ❌ | ❌ | ❌ | **não entregue** |

### Observabilidade
- ✅ `player:reconnected` com `method` e `confidence` props. Dashboard pode filtrar por confidence.
- ✅ `player:resumed` evento novo para noise — separação está certa.
- ⚠️ `hiddenMs` sempre 0 (ver CRITICAL) — bucket de dashboards fica enviesado.
- ❌ Nenhum evento novo para throttle drops. Se throttled calls forem descartadas, não temos visibilidade. Considerar `fetchState:throttle_dropped` debug event.

### Immutable Rules
- ✅ SRD Compliance: migração 136 NÃO instala trigger em `auth.users`. Política doc reforça. OK.
- ✅ Resilient Reconnection: todos os paths de recovery agora usam `priority: "emergency"` — throttle não bloqueia reconexão. OK.
- ⚠️ Combat Parity: F7 QW1 escopado pra combat combat views (3 modos ok), mas public SEO fora.

### Breaking changes / rollout
- `buildGroupHealth` é new export — seguro.
- `combat:turn-advanced` CustomEvent é novo — outros listeners podem adicionar-se sem break.
- Migration 136 roda uma vez em cada env — re-ativação de revoked_at precisa ser auditada antes do deploy.

## DoD verification

- [x] `rtk tsc` → "TypeScript compilation completed" (0 erros)
- [x] `rtk lint` → 455 problemas, mas **nenhum novo** introduzido pelos 5 commits (erros nos arquivos tocados são todos pré-existentes: line 305/798 de PlayerJoinClient, etc.)
- [x] `npx jest components/combat/__tests__/MonsterGroupHeader.test.ts` → **8/8 PASSED**
- [x] Jest completo em `components/combat` → 2 failures pré-existentes (CombatantRow.test.tsx com erro de import de `getCrossVersionMonsterId`; EncounterSetup.test.tsx com falta de env Supabase). Confirmado **sem regressão nova**.
- [⚠️] Parity documented per sub-task: yes, mas F7 public view fora do escopo declarado é gap não reconhecido
- [✅] Immutable rules: SRD (sem trigger) + Resilient (emergency bypass)
- [⚠️] Observability added: `player:reconnected` + `player:resumed` adicionados, mas CRITICAL bug invalida a Tier 2

## Recomendações antes do merge

1. **[BLOCKER]** Corrigir `hiddenMs` no commit 6881f9c. Capturar `hiddenMs` ANTES de zerar `hiddenAtRef.current = null`. Mover a linha 1807 (`hiddenAtRef.current = null`) para depois de `emitReconnectTelemetry()`, OU reordenar assim:
   ```ts
   const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
   hiddenAtRef.current = null;
   ```
   Adicionar teste unitário mockando `document.visibilityState` para validar que `hidden_ms` é >0 quando retornando após >30s.

2. **[BLOCKER se S1.5 é DoD]** Confirmar com PM se QW2 do Finding 7 foi movida pra Track D conscientemente. Se não, implementar em CombatantRow linhas 459-468 (`text-red-400 font-bold` em `current_hp` quando `isCritical`). Commit message diz Track D, mas sprint plan diz S1.5.

3. **[HIGH]** Em `fetchFullState`, mover `lastFetchAtRef.current = Date.now()` para dentro do `try` após a primeira chamada bem-sucedida (ou antes do `return` de erro) — evita que emergency-falha bloqueie throttled por 5s.

4. **[MEDIUM]** Remover ou documentar o dispatch `combat:turn-advancing` (dead listener) em useCombatActions linhas 81-93.

5. **[MEDIUM]** Adicionar warning no header da migration 136 sobre re-ativação de `revoked_at`. Opcionalmente adicionar `SELECT count(*) FROM content_whitelist WHERE revoked_at IS NOT NULL` como assertion comentada.

6. **[MEDIUM]** Decidir escopo do Finding 7 QW1: se é consistência com 5e Tools/DnD Beyond, replicar ordem em `PublicMonsterStatBlock.tsx:265-310`. Se é só combat-view, documentar o limite.

7. **[LOW]** Adicionar `confidence: "noise"` ao `player:resumed` para schema consistente.

8. **[LOW]** Considerar trocar `(channelRef.current as unknown as { state?: string }).state` por um ref próprio atualizado via `channel.subscribe((status) => ...)`.

9. **[NICE]** Usar `groupHealth.members` no lugar do `activeMembers` duplicado (linha 127 de MonsterGroupHeader).
