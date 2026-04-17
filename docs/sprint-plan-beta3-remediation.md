# Sprint Plan — Beta 3 Remediation

**Data:** 2026-04-17
**Owner:** Bob (Scrum Master / BMAD)
**Status:** Proposal — aguarda aprovação antes do handoff para dev agents
**Horizonte:** Sprints 1-4 (~12 dev-days ativos) + Sprint 5 (roadmap opcional) + ação imediata (votação do Lucas)

---

## Contexto

Beta test 3 (DM Lucas Galupo, 2026-04-16, 2 encounters reais + 1 smoke-test + 1 no dia 17/04) expôs 3 show-stoppers em combat (recap perdido pós-combate, race ao adicionar criaturas mid-combat, storm de reconnects) e 14 hotfixes de UX. Dois artefatos detalhados já foram produzidos e revisados adversarialmente:

- Spike de arquitetura (Winston, v2) com 9 findings (3 P0, 2 P1, 4 P2) — [docs/spike-beta-test-3-2026-04-17.md](spike-beta-test-3-2026-04-17.md)
- UX spec (Sally, v2) com 14 hotfixes reorganizados em 4 sprints — [docs/epic-2-combat-ux-hotfixes.md](epic-2-combat-ux-hotfixes.md)

Este plano unifica os dois artefatos + a votação retroativa (~3h20) num cronograma executável em paralelo por múltiplos dev agents em worktrees, respeitando as 3 regras imutáveis do [CLAUDE.md](../CLAUDE.md) (Combat Parity, Resilient Reconnection, SRD Compliance).

## Visão geral dos artefatos

| Artefato | Versão | Autor | Status | Link |
|---|---|---|---|---|
| Spike beta 3 (arquitetura) | v2 | Winston | Pronto p/ dev após edits 1-11 | [docs/spike-beta-test-3-2026-04-17.md](spike-beta-test-3-2026-04-17.md) |
| Spike review (adversarial) | v1 | Reviewer | Consumido — findings aplicados na v2 do spike | [docs/spike-review-findings.md](spike-review-findings.md) |
| UX spec (hotfixes) | v2 | Sally | Pronto p/ dev — 4 sprints internos | [docs/epic-2-combat-ux-hotfixes.md](epic-2-combat-ux-hotfixes.md) |
| UX spec review (adversarial) | v1 | Reviewer | Consumido — findings aplicados na v2 do UX spec | [docs/ux-spec-review-findings.md](ux-spec-review-findings.md) |
| Votação retroativa (spec) | v1 | Product | Pronto p/ dev — escopo pequeno | [docs/spec-feedback-retroactive-voting.md](spec-feedback-retroactive-voting.md) |
| Feedback bruto da sessão 3 | — | Lucas | Fonte primária | [docs/beta-test-session-3-2026-04-16.md](beta-test-session-3-2026-04-16.md) |
| Rules imutáveis | — | Equipe | Sempre válido | [CLAUDE.md](../CLAUDE.md) |

## Resumo executivo

- **Total estimado ativo:** ~12 dev-days (honest, derivado direto das estimativas v2: spike P0+P1 ~4.5d + UX spec ~55h ÷ 8h = ~7d + votação ~0.5d + 20% buffer). Isso **ignora** v1 rosy numbers (18.5h UX, 2d spike) — eles foram explicitamente rejeitados pelos reviews adversariais.
- **Caminho crítico:** Sprint 1 (P0 reliability: recap + combatant add + telemetria + whitelist) bloqueia beta 4. Sprint 3 depende do Sprint 1 (H8 precisa do guard fix do Finding 5; H9 precisa do shape de dados do Finding 3).
- **Paralelismo possível:** Sprints 1 e 2 rodam em paralelo (arquivos disjuntos). Dentro do Sprint 1, 3 tracks independentes (recap, combatant add, telemetria+whitelist+findings rápidos). Sprint 2 comporta 2 tracks (dialogs/statblock vs CSS tokens/animations).
- **Data de soft-launch beta 4 (proposta):** **+7 dias úteis** após aprovação (Sprints 1-3 completos + QA). Sprint 4 pode ir pós-beta-4 se apertar.
- **Ação imediata (hoje):** disparar link de votação pro grupo do Lucas via WhatsApp — Google Form como fallback se o endpoint `/feedback/[token]` não estiver pronto em 24h. Seção [Votação do Lucas](#votacao-do-lucas-acao-imediata) tem SQL e template.

## Princípios de execução

Regras não-negociáveis. Qualquer PR que violar precisa justificativa explícita.

1. **Combat Parity Rule ([CLAUDE.md](../CLAUDE.md))** — toda story de UI tem a matriz Guest/Anon/Auth preenchida e validada. Parity matrix consolidada em [Matriz de paridade](#matriz-de-paridade-combat-parity-consolidada).
2. **Resilient Reconnection ([CLAUDE.md](../CLAUDE.md) + [docs/spec-resilient-reconnection.md](spec-resilient-reconnection.md))** — nenhuma story pode quebrar o cadeia de fallbacks de reconnect. Stories que mexem em realtime/broadcast (S1.2, S1.3) têm gate extra de validação.
3. **SRD Content Compliance ([CLAUDE.md](../CLAUDE.md))** — zero conteúdo não-SRD em páginas públicas. S1.4 (whitelist) **não** cria trigger. H7 (edition badge) só destaca quando `monster.is_srd === true`.
4. **Feature flags para mudanças arriscadas** — `ff_hp_thresholds_v2` (H5), `ff_custom_conditions_v1` (H11), `ff_combatant_add_reorder` (Finding 2). Defaults off, rollout staging → Lucas → general.
5. **Test-before-ship** — cada story tem test strategy (unit + e2e + manual) definida antes de começar. QA manual do DM (Lucas) é obrigatório em S1 e S3 antes de considerar DoD.
6. **Gates de handoff** — Sprint N+1 só começa após gate de Sprint N passar. Ver [Gates de handoff](#gates-de-handoff).
7. **Deploy ordering** — stories que tocam broadcast types (S1.2 / Finding 2) têm deploy sequenciado: player client primeiro → 24h de soak → DM client com flag on. Ver [Caminho crítico](#caminho-critico).
8. **i18n first** — as ~32 chaves novas do UX spec são criadas em `messages/pt-BR.json` e `messages/en.json` ANTES de tocar componentes (next-intl strict quebra em runtime).
9. **Zero emojis em UI funcional** — lucide-react para ícones (renderização cross-OS garantida).
10. **`rtk tsc` e `rtk lint` limpos antes de abrir PR** — convenção do projeto.

---

## Sprints

### Sprint 1 — P0 Critical Reliability (blocker de beta 4)

**Objetivo:** eliminar os 3 show-stoppers do beta 3 (recap perdido, race combatant-add, telemetria poluída) + backfillar whitelist do Lucas. Sem isto, beta 4 repete os mesmos bugs.

**Duração estimada:** 3.5-4 dev-days (spike P0s: ~3.5d + buffer).

**Paralelismo possível:** 3 tracks independentes por worktree (detalhe em [Execução paralela em worktrees](#execucao-paralela-em-worktrees)):
- Track A (recap persistence) — worktree `feat/beta3-recap-persistence`
- Track B (combatant add atomic) — worktree `feat/beta3-combatant-add-reorder`
- Track C (telemetria + whitelist + quick wins arquiteturais) — worktree `feat/beta3-telemetry-whitelist`

**Dependências de entrada:**
- Spike v2 e UX spec v2 mergeadas nas docs (ambas já estão no branch `master` como untracked).
- Zero — pode começar imediatamente após aprovação do sprint plan.

#### Stories

---

#### S1.1 — Persistir recap pós-combate (Finding 1)

- **Source:** [spike v2 Finding 1 (CRITICAL-1 corrigido)](spike-beta-test-3-2026-04-17.md#finding-1--recap-pós-combate-perdido)
- **Why it matters:** 5 players reconectaram entre 00:53:00-00:53:18 após Lucas encerrar combate e perderam o Wrapped permanentemente. Broadcast fire-and-forget é best-effort; sem persistência, beta 4 repete.
- **ACs:**
  1. Migration `137_combat_reports_unique_encounter.sql` adiciona partial unique index `encounter_id` em `combat_reports` (NULL permitido).
  2. `POST /api/encounters/[id]/recap` persiste `playerSafeReport` em `combat_reports` com `encounter_id`, short_code aleatório, ownership check via `sessions.owner_id = auth.uid()` (SEM service client no browser); idempotente via `ON CONFLICT (encounter_id) DO NOTHING`; retorna 200 com recap existente em 2ª chamada; 403 se não-owner; 413 se payload > `MAX_PAYLOAD_SIZE` (100KB); 400 se contém NULL bytes.
  3. `GET /api/session/[id]/latest-recap` retorna último `combat_reports` da sessão com `encounters.ended_at > now() - 24h`; valida `session_tokens` ativo; `{ data: null }` se nada; sanitized via `sanitizeCombatantsForPlayer`.
  4. DM client ([components/session/CombatSessionClient.tsx:295-322](../components/session/CombatSessionClient.tsx#L295-L322)) chama POST via `void (async() => { fetch ... retry 1× em 2s })()` ANTES do broadcast existente (não bloqueia UX); broadcast continua como caminho feliz.
  5. Player client ([components/player/PlayerJoinClient.tsx:886-933](../components/player/PlayerJoinClient.tsx#L886-L933)) dentro de `fetchFullState` branch `!encounter` chama GET `/latest-recap`; se retornar `recap`, `setCombatRecapReport(recap)` + `sessionStorage.setItem("recap-session-encounter", encounter_id)`.
  6. `sessionStorage.setItem("recap-seen-${sessionId}", "1")` quando user fecha o modal; fetch condicional no mount respeita isso.
- **Files:**
  - CRIAR: `supabase/migrations/137_combat_reports_unique_encounter.sql`
  - CRIAR: `app/api/encounters/[id]/recap/route.ts` (POST)
  - CRIAR: `app/api/session/[id]/latest-recap/route.ts` (GET)
  - MODIFICAR: `components/session/CombatSessionClient.tsx:295-322` (DM trigger)
  - MODIFICAR: `components/player/PlayerJoinClient.tsx:886-933` (player hydrate)
  - MODIFICAR: `components/combat/CombatRecap.tsx:42` (chave `recap-seen-${sessionId}`)
  - CRIAR: `e2e/features/recap-persistence.spec.ts`
- **Test strategy:**
  - Integration: POST endpoint ownership OK/403/413/400/idempotência. GET endpoint TTL 24h, null se nenhum, 403 sem session_token.
  - E2E: DM encerra combate com 2 players; player 1 tab hidden + network throttle + reabrir em 3s vê recap via endpoint; player 2 tab visible vê via broadcast (mesma UX); player 1 fecha → refresh → não reabre.
  - Unit: `CombatRecap.tsx` com prop `report` hidratado vs null.
- **Rollout:** direct deploy, additive. Ordem: migration 137 → endpoint POST → DM client → endpoint GET → player client.
- **Parity:** Guest N/A (Finding 9 é bucket P2, ver S5.2) / Anônimo ✅ / Autenticado ✅.
- **DoD:** migration aplicada; ambos endpoints com testes verdes; e2e player reconnect-post-end passa; DM manual smoke test com Lucas; observability `recap.persisted_success_count` + `recap.served_from_db` + `recap.delivered_via_broadcast` tracked; alerta de falha > 5% configurado.
- **Estimate:** **12h** (spike estimou 1-1.5 dia; +20% buffer).
- **Depends on:** nada (pode começar imediatamente).
- **Worktree:** `feat/beta3-recap-persistence`.

---

#### S1.2 — Combatant add atomic (Finding 2)

- **Source:** [spike v2 Finding 2](spike-beta-test-3-2026-04-17.md#finding-2--adicionar-criatura-em-combate-bagunça-turno)
- **Why it matters:** Lucas adicionou 3 Velociraptors em 6s (02:34:20-26 confirmado em `01_events_raw.json`) e players viram ordem de turno inconsistente. Root cause (v2): `state_sync` pode sobrescrever lista local com snapshot obsoleto + `broadcastViaServer` quebra FIFO (2 senders).
- **ACs:**
  1. Novo tipo `combat:combatant_add_reorder` em [lib/types/realtime.ts](../lib/types/realtime.ts) com `{ combatant, initiative_map, current_turn_index, round_number, encounter_id }`.
  2. DM [useCombatActions.ts:402-442](../lib/hooks/useCombatActions.ts#L402) sequencia persists (`await persistNewCombatant` depois `await persistInitiativeOrder`) e emite 1 evento `combatant_add_reorder` em vez de `combatant_add` + `state_sync` separados.
  3. `broadcastViaServer` ([lib/realtime/broadcast.ts:401-412](../lib/realtime/broadcast.ts#L401)) opt-out para `combat:combatant_add_reorder` via check de event type; combatant payload já é sanitized no DM client.
  4. Player handler novo em [PlayerJoinClient.tsx:1201](../components/player/PlayerJoinClient.tsx#L1201) faz insert + reorder + update turn_index atomicamente; dedup por ID (mirror do handler antigo).
  5. Fallback defensivo: se `initiative_map` contém ID não presente localmente, agenda `fetchFullState({ priority: "emergency" })` com 500ms debounce.
  6. Feature flag `ff_combatant_add_reorder` no DM client — default `false` para soak do player handler.
  7. Handler antigo `combat:combatant_add` permanece vivo por 1 release (coexistência durante transição).
- **Files:**
  - MODIFICAR: `lib/types/realtime.ts` (novo type)
  - MODIFICAR: `lib/realtime/broadcast.ts:401-412` (opt-out)
  - MODIFICAR: `lib/hooks/useCombatActions.ts:402-442` (sequenciar + novo broadcast)
  - MODIFICAR: `components/player/PlayerJoinClient.tsx:1201-1247` (handler novo, manter antigo)
  - CRIAR: `e2e/combat/rapid-add.spec.ts`
  - CRIAR: `lib/flags.ts` (se não existir) com helper `isFeatureFlagEnabled`
- **Test strategy:**
  - Unit: reducer do novo handler com payload válido/inválido/dup.
  - Integration: mock channel envia 3 eventos A-B-C → lista final correta.
  - E2E: DM+2 players; DM adiciona 3 monstros em <6s; Player A tab visible vê ordem correta em <3s; Player B tab hidden 2s entre adds vê correto após visible.
  - Chaos manual: wi-fi off entre add 1 e 2, recovery via fetchFullState emergency.
- **Rollout (OBRIGATÓRIO — NÃO NEGOCIÁVEL):**
  - Deploy 1 (Sprint 1 end): player client com handler novo + antigo coexistindo. Flag DM off.
  - Soak 24h (PWA cache update).
  - Deploy 2 (Sprint 1 end +24h): DM client emite novo tipo com flag **on em staging** para Lucas. Flag prod off por 3 dias.
  - Deploy 3 (Sprint 2 mid): flag prod on.
  - Cleanup D+7: remover handler antigo.
- **Parity:** Guest N/A (localStorage monolítico, sem broadcast) / Anônimo ✅ / Autenticado ✅.
- **DoD:** tipo novo definido; broadcast pathway com opt-out verificado; e2e rapid-add verde; flag framework pronto; métrica `combatant_add.desync_detected` instrumentada; rollout doc com timeline escrito no PR.
- **Estimate:** **12h** (spike estimou 1d; +50% buffer por toque em broadcast pathway + feature flag + rollout doc).
- **Depends on:** nada (worktree independente).
- **Worktree:** `feat/beta3-combatant-add-reorder`.

---

#### S1.3 — Telemetria de reconnect em 3 tiers + throttle com priority (Finding 4 A+B+C)

- **Source:** [spike v2 Finding 4 A/B/C](spike-beta-test-3-2026-04-17.md#finding-4--storm-de-reconexões-107-para-8-players)
- **Why it matters:** 107 `player:reconnected` para 8 players em 3h30 (~86% ruído visibility_change, mas 14% sinal real) + 132 `401 AbortError` separados + picos 200+ req/min no `/api/session/[id]/state`. Dashboard de reconexão está inutilizável; sinal real some no ruído.
- **ACs:**
  1. [PlayerJoinClient.tsx:1816-1831](../components/player/PlayerJoinClient.tsx#L1816) classifica em 3 tiers: `channel_recovery` (high confidence: `wasDisconnected || channelState !== "joined"`), `long_background` (medium: `hiddenMs > 30000`), `resumed` (tier 1, evento separado `player:resumed`).
  2. `fetchFullState` aceita `opts: { priority?: "emergency" | "throttled" }` (default `throttled`); throttle 5s aplica só a throttled; emergency bypass.
  3. Callers auditados para passar priority:
     - `visibilitychange → visible` → `emergency`
     - polling lobby/turn-poll/dm-presence → `throttled`
     - `combat:combatant_add_reorder` fallback → `emergency`
     - Late-join CAT-1 ([PlayerJoinClient.tsx:1243](../components/player/PlayerJoinClient.tsx#L1243)) → `emergency`
     - Auto-join detection → `emergency`
  4. `/api/broadcast` 401 catches disparam novo evento `player:broadcast_auth_drop { reason }`.
  5. Adicionar `player:resumed` ao [lib/types/realtime.ts](../lib/types/realtime.ts) (analytics only, não é broadcast pra channel).
- **Files:**
  - MODIFICAR: `components/player/PlayerJoinClient.tsx:1816-1831` (3 tiers)
  - MODIFICAR: `components/player/PlayerJoinClient.tsx:856-972` (throttle com priority)
  - MODIFICAR: `components/player/PlayerJoinClient.tsx:1864-1875` (mesmo guard network_recovery)
  - MODIFICAR: callers de `fetchFullState` (auditar todos)
  - MODIFICAR: `lib/types/realtime.ts` (evento `player:resumed`)
- **Test strategy:**
  - Unit: mock visibilityState + disconnectedAtRef + channelState; forçar cada combinação; verificar `trackEvent` com `method` correto.
  - Unit: `fetchFullState` com 2 throttled <5s → 2ª rejeitada; throttled + emergency → ambas rodam.
  - E2E observacional: aceitar que auto não automatiza bem; baseline target em beta 4 é `player:reconnected` (channel_recovery + long_background) ≤ 3/player/hora.
- **Rollout:** direct deploy. Comunicar time que dashboard de reconexão muda (baseline cai de 107/sessão → 15-25/sessão estimado).
- **Parity:** Guest N/A (sem reconnection flow) / Anônimo ✅ / Autenticado ✅.
- **DoD:** 3 tiers instrumentados; throttle respeitado por callers auditados; `player:broadcast_auth_drop` tracked; alerta dashboard configurado (> 5/player/hora em `channel_recovery`); doc de breaking change do funil publicado.
- **Estimate:** **6h** (spike estimou 0.5d; +50% buffer por auditar todos os callers).
- **Depends on:** nada.
- **Worktree:** `feat/beta3-telemetry-whitelist` (track C, shared com S1.4 e S1.5).

---

#### S1.4 — Whitelist backfill idempotente (Finding 6)

- **Source:** [spike v2 Finding 6 (CRITICAL-2 corrigido)](spike-beta-test-3-2026-04-17.md#finding-6--compêndio-travado-no-srd--whitelist)
- **Why it matters:** Lucas criou conta depois da migration 114 → compêndio travado no SRD-only. Quer acesso a itens completos (Rod of Pact Keeper, Bracers of Illusionist) durante combate. **Proibido criar trigger** — fere SRD Compliance ([CLAUDE.md](../CLAUDE.md)).
- **ACs:**
  1. Migration `136_backfill_whitelist_post_114.sql` idempotente: `INSERT ... ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL, notes = EXCLUDED.notes`, excluindo `daniel@awsales.io` e anon users.
  2. NÃO cria trigger `AFTER INSERT ON auth.users`.
  3. Documentação `docs/beta-whitelist-policy.md` cria processo: admin cria migration curada pra novos testers; sempre idempotente; review explícito antes de beta público.
  4. Lucas aparece em `content_whitelist` após run em staging; `isBetaTester = true` no SSR do layout; compêndio full renderiza pra ele.
- **Files:**
  - CRIAR: `supabase/migrations/136_backfill_whitelist_post_114.sql`
  - CRIAR: `docs/beta-whitelist-policy.md`
- **Test strategy:**
  - Migration: rodar em staging snapshot → count `content_whitelist` aumenta de N → N + post-114 users com email.
  - Idempotência: rodar 2× → 2ª run 0 novas rows.
  - Manual: login Lucas em staging → compêndio full.
- **Rollout:** staging → validar → prod fora de horário de pico (Supabase lock em auth.users).
- **Parity:** Auth-only (data layer).
- **DoD:** migration aplicada em staging; count validado; Lucas smoke test; policy doc publicado.
- **Estimate:** **2.5h** (spike estimou 0.25d; +25% buffer).
- **Depends on:** nada.
- **Worktree:** `feat/beta3-telemetry-whitelist` (track C).

---

#### S1.5 — Quick wins arquiteturais (Findings 3, 5, 7)

- **Source:**
  - [spike v2 Finding 3](spike-beta-test-3-2026-04-17.md#finding-3--vida-do-grupo-somada) — group HP data layer
  - [spike v2 Finding 5](spike-beta-test-3-2026-04-17.md#finding-5--dm-sem-auto-scroll) — auto-scroll guard fix (supersede UX H8)
  - [spike v2 Finding 7](spike-beta-test-3-2026-04-17.md#finding-7--monster-card-reorder-resistências--hp-crítico-legível) — resistances reorder + HP crítico cor
- **Why it matters:** 3 fixes arquiteturais pequenos que desbloqueiam Sprint 2 e 3 (H8 depende de Finding 5; H9 depende do shape de dados do Finding 3).
- **ACs:**
  1. **Finding 3 (data):** [MonsterGroupHeader.tsx:47-51](../components/combat/MonsterGroupHeader.tsx#L47-L51) remove soma; expõe `groupHealth = { members: [{ id, current_hp, max_hp, is_defeated, pct, tier }], minHp, maxHp, criticalCount, totalMembers }`. Render simplificado — UX (H9) consome em Sprint 3.
  2. **Finding 5 (guard):** [CombatSessionClient.tsx:1879-1890](../components/session/CombatSessionClient.tsx#L1879-L1890) refina guard: só aborta scroll se `data-panel-open` está na row do `currentTurnIndex`. `CombatantRow` escuta `window.dispatchEvent('combat:turn-advanced')` e fecha panels de rows ≠ atual. `useCombatActions.handleAdvanceTurn` dispara o CustomEvent.
  3. **Finding 7 QW1 (resistances):** [MonsterStatBlock.tsx:444-455](../components/oracle/MonsterStatBlock.tsx#L444-L455) move bloco de damage vulnerabilities/resistances/immunities/condition immunities para ANTES do divider da ability table (linha ~410). Nota: UX H4 é superset; se H4 chegar primeiro no Sprint 2, esse AC é no-op.
  4. **Finding 7 QW2 (HP crítico cor):** [CombatantRow.tsx:459-468](../components/combat/CombatantRow.tsx#L459-L468) aplica `text-red-400 font-bold` no `current_hp` quando `isCritical`, mantém `text-muted-foreground` para separador + `max_hp`.
- **Files:**
  - MODIFICAR: `components/combat/MonsterGroupHeader.tsx:47-51, 165-178` (data layer)
  - MODIFICAR: `components/session/CombatSessionClient.tsx:1879-1890` (guard refine)
  - MODIFICAR: `components/combat/CombatantRow.tsx` (listener CustomEvent + HP color)
  - MODIFICAR: `lib/hooks/useCombatActions.ts` (handleAdvanceTurn dispatchEvent)
  - MODIFICAR: `components/oracle/MonsterStatBlock.tsx:370-458` (resistances reorder — se H4 não chegou)
- **Test strategy:**
  - Unit: `MonsterGroupHeader` com 3 membros variando HP → `groupHealth` output correto.
  - E2E `e2e/combat/dm-autoscroll.spec.ts`: 5 combatants, abre painel de combat 3, advance turn → scrolla pra 2 e fecha painel 3.
  - Visual regression: stat block before/after; CombatantRow 1/42 vs 41/42.
  - Manual: inspecionar HP crítico a ~50cm de distância.
- **Rollout:** direct deploy. Zero breaking changes.
- **Parity:**
  - Finding 3: 3 modos (UI-ish, data shape muda) — Guest ✅ / Anônimo ✅ / Autenticado ✅.
  - Finding 5: DM-only (guest+auth). Player não tem auto-scroll.
  - Finding 7: 3 modos — Guest ✅ / Anônimo ✅ / Autenticado ✅.
- **DoD:** 3 findings mergeados; e2e auto-scroll verde; visual regressions aprovadas; H8 da UX spec marcado como "SUPERSEDED by Finding 5" no PR do Sprint 2.
- **Estimate:** **6h** (spike estimou 0.75d combined; +25% buffer).
- **Depends on:** nada.
- **Worktree:** `feat/beta3-telemetry-whitelist` (track C).

---

### Sprint 2 — P0 UX Quick Wins (paralelo a Sprint 1)

**Objetivo:** aterrisar os hotfixes de UX independentes dos findings do spike. Maximiza deploy de valor visível pro Lucas sem conflito com arquivos do Sprint 1.

**Duração estimada:** 2-2.5 dev-days (UX Sprint 1 ~7h + parte do Sprint 2 do UX spec).

**Paralelismo possível:** dois tracks por arquivos disjuntos:
- Track D (dialogs + statblock) — worktree `feat/beta3-ux-dialogs-statblock`
- Track E (CSS tokens + i18n + animations) — worktree `feat/beta3-ux-tokens-i18n`

**Dependências de entrada:**
- S1.5 (Finding 7 QW1 resistances) idealmente mergeado antes de S2.3 (H4) para evitar merge conflict em `MonsterStatBlock.tsx`. Se conflito surgir, H4 wins (superset).
- i18n infrastructure: criar ~32 chaves em `messages/pt-BR.json` + `messages/en.json` ANTES de qualquer componente ser tocado.

#### Stories

---

#### S2.1 — X do compêndio 44×44 (H1)

- **Source:** [UX spec v2 H1](epic-2-combat-ux-hotfixes.md) — "Hotfix 1 — X de fechar do compêndio muito pequeno"
- **Why it matters:** dialog global usado por todos os modais; WCAG 2.5.5 AA pede 44×44.
- **ACs:**
  1. [components/ui/dialog.tsx:43-46](../components/ui/dialog.tsx#L43) → botão close `w-11 h-11 rounded-md`, ícone `X w-5 h-5`, `hover:bg-white/[0.08]`, `focus:ring-gold/50`, `aria-label={t("close")}`.
  2. Remover `<span className="sr-only">Close</span>` (aria-label basta).
  3. Spot-check visual em 5-10 dialogs custom (login, onboarding, settings, compendium, etc.) — sem regressão de densidade em modais pequenos.
- **Files:**
  - MODIFICAR: `components/ui/dialog.tsx:43-46`
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json` (chave `common.close` se não existir)
- **Test strategy:** suite playwright existente passa; visual spot-check mobile 375px + desktop 1280px.
- **Rollout:** direct deploy.
- **Parity:** 3 modos (dialog compartilhado) — Guest ✅ / Anônimo ✅ / Autenticado ✅.
- **DoD:** WCAG touch target 44×44 verificado via DevTools; suite playwright verde; PR review aprovado visualmente.
- **Estimate:** **1.5h** (UX v2 1h + buffer).
- **Depends on:** i18n inventory setup.
- **Worktree:** `feat/beta3-ux-dialogs-statblock` (track D).

---

#### S2.2 — X do monster card + toolbar AAA (H2)

- **Source:** [UX spec v2 H2](epic-2-combat-ux-hotfixes.md) — "Hotfix 2 — X de sair da ficha do monstro difícil de clicar"
- **Why it matters:** MonsterStatBlock pin card tem 4 botões no toolbar em 24×24; close é o mais usado, touch target ruim mobile.
- **ACs:**
  1. [styles/stat-card-5e.css:64-82](../styles/stat-card-5e.css#L64) → toolbar buttons 36×36 (todos os 4), close 44×44 com `bg-red-950/50 text-red-200`; gap 6px; mobile <768px todos 44×44.
  2. [components/oracle/MonsterStatBlock.tsx:297-308](../components/oracle/MonsterStatBlock.tsx#L297-L308) → `data-action="popout|popin|minimize|close"` nos 4 botões; `aria-label` via `useTranslations("combat")`.
  3. 5 chaves i18n: `combat.stat_card_close/minimize/lock/focus/popout/popin`.
- **Files:**
  - MODIFICAR: `styles/stat-card-5e.css:64-82`
  - MODIFICAR: `components/oracle/MonsterStatBlock.tsx:297-308`
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json` (5-6 chaves)
- **Test strategy:** visual before/after mobile + desktop; suite playwright existente passa.
- **Rollout:** direct deploy.
- **Parity:** 3 modos — Guest ✅ / Anônimo ✅ / Autenticado ✅ / DM ✅.
- **DoD:** WCAG AAA close verificado; visual aprovado 2 breakpoints; `rtk tsc` limpo.
- **Estimate:** **2h** (UX v2 1.5h + buffer).
- **Depends on:** i18n inventory.
- **Worktree:** `feat/beta3-ux-dialogs-statblock` (track D).

---

#### S2.3 — Defesas no topo do stat block (H4)

- **Source:** [UX spec v2 H4](epic-2-combat-ux-hotfixes.md) — "Hotfix 4 — Resistências movidas pro topo"
- **Why it matters:** resistências são informação tática #1; convenção 5e.tools/DDB coloca antes da ability table.
- **ACs:**
  1. [components/oracle/MonsterStatBlock.tsx:374-458](../components/oracle/MonsterStatBlock.tsx#L374-L458) refatorado para ordem: Core → **Defesas (novo)** → AbilityTable → Properties restantes. Seção Defesas suprimida se nenhuma propriedade presente.
  2. Ícones lucide-react: `ShieldAlert` (vuln, `text-amber-400`), `Shield` (res, `text-cool`), `ShieldX` (imm/cond-imm, `text-red-400`). ZERO emojis.
  3. `PropLine` estendido com prop `icon?: ReactNode`.
  4. 1 chave i18n: `combat.sheet.defenses_header` + `L.defenses` em [lib/i18n/stat-labels.ts](../lib/i18n/stat-labels.ts).
  5. Supersede S1.5 Finding 7 QW1 — se S1.5 foi mergeada primeiro, este é rewrite; se não, aplica direto.
- **Files:**
  - MODIFICAR: `components/oracle/MonsterStatBlock.tsx:374-458`
  - MODIFICAR: `lib/i18n/stat-labels.ts` (L.defenses)
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json`
- **Test strategy:** 3 screenshots (Rakshasa completa, Rat sem defesas, Goblin só condition imm); unit `PropLine` com/sem icon.
- **Rollout:** direct deploy.
- **Parity:** 3 modos — Guest ✅ / Anônimo ✅ / Autenticado ✅ / DM ✅.
- **DoD:** 3 visuais aprovados; emojis zerados; `rtk tsc` limpo.
- **Estimate:** **2.5h** (UX v2 2h + buffer).
- **Depends on:** S1.5 Finding 7 QW1 idealmente mergeado primeiro (evita conflict). i18n inventory.
- **Worktree:** `feat/beta3-ux-dialogs-statblock` (track D).

---

#### S2.4 — HP CRITICAL legível (H3)

- **Source:** [UX spec v2 H3](epic-2-combat-ux-hotfixes.md) — "Hotfix 3 — HP em estado CRITICAL ilegível"
- **Why it matters:** badge CRITICAL do player hoje é red-200 sobre red-950/50 — invisível em OLED.
- **ACs:**
  1. [lib/utils/hp-status.ts:31](../lib/utils/hp-status.ts#L31) CRITICAL: `colorClass: "text-white"`, `bgClass: "bg-red-700"`, `barClass: "bg-red-600"`.
  2. [components/player/PlayerInitiativeBoard.tsx:79-100](../components/player/PlayerInitiativeBoard.tsx#L79-L100) aplica `animate-pulse-critical` + `shadow-[0_0_12px_rgba(220,38,38,0.5)]` apenas no badge quando `isCriticalStatus`; remove text-shadow duplo antigo.
  3. [app/globals.css](../app/globals.css) adiciona `@keyframes pulse-critical { 0,100% opacity 1; 50% 0.85 }` + `.animate-pulse-critical { animation: pulse-critical 1.2s ease-in-out infinite }` + `@media (prefers-reduced-motion: reduce) { .animate-pulse-critical { animation: none; opacity: 1 } }`.
  4. Decisão visual Row glow: default é **Opção B** (manter `animate-critical-glow` 5s + novo pulse 1.2s); Opção A fallback (remover critical-glow na row) se estroboscópico.
- **Files:**
  - MODIFICAR: `lib/utils/hp-status.ts:31`
  - MODIFICAR: `components/player/PlayerInitiativeBoard.tsx:79-100`
  - MODIFICAR: `app/globals.css` (keyframes novo após linha 515)
- **Test strategy:** screenshot mobile+desktop CRITICAL (6/34 HP); axe-core no badge; `e2e/combat/hp-status.spec.ts` cria/atualiza.
- **Rollout:** direct deploy.
- **Parity:** 3 modos — Guest ✅ / Anônimo ✅ / Autenticado ✅ (DM HP number é S1.5 Finding 7 QW2, já feito).
- **DoD:** contraste AAA verificado; reduced-motion respeitado; dev sinaliza Opção A/B no PR.
- **Estimate:** **2h** (UX v2 1.5h + buffer).
- **Depends on:** nada.
- **Worktree:** `feat/beta3-ux-tokens-i18n` (track E).

---

#### S2.5 — Edition badge 2014/2024 (H7)

- **Source:** [UX spec v2 H7](epic-2-combat-ux-hotfixes.md) — "Hotfix 7 — Badge de edição"
- **Why it matters:** DM não sabe qual edição (2014 vs 2024) está ativa; ambiguidade regra.
- **ACs:**
  1. [components/session/RulesetSelector.tsx:50-59](../components/session/RulesetSelector.tsx#L50-L59) `VersionBadge` recebe prop `isSrd?: boolean` (default false); destaca `bg-gold/20 text-gold border border-gold/40` só quando `version === "2024" && isSrd === true`; neutro `bg-white/[0.06] text-muted-foreground` para todo o resto.
  2. Callers passam `isSrd={monster.is_srd ?? false}`: `MonsterStatBlock.tsx:349-368` (header), `CombatantRow.tsx:542-543`, `MonsterSearchPanel.tsx`.
  3. Remove span `(2024)` pequeno em [MonsterStatBlock.tsx:474-478](../components/oracle/MonsterStatBlock.tsx#L474-L478) (redundante com badge do header).
  4. SRD Compliance: em rotas públicas `/try` e `/srd/*`, badge suprime destaque se `is_srd = false`.
- **Files:**
  - MODIFICAR: `components/session/RulesetSelector.tsx:50-59`
  - MODIFICAR: `components/oracle/MonsterStatBlock.tsx:349-368, 474-478`
  - MODIFICAR: `components/combat/CombatantRow.tsx:542-543`
  - MODIFICAR: `components/combat/MonsterSearchPanel.tsx`
- **Test strategy:** unit 4 combinações (2014/2024 × SRD/non-SRD); 4 screenshots.
- **Rollout:** direct deploy.
- **Parity:** 3 modos — Guest ✅ / Anônimo ✅ / Autenticado ✅ / DM ✅.
- **DoD:** SRD Compliance validado manualmente (monster não-SRD em `/try` → badge neutro); visuais aprovados.
- **Estimate:** **2h** (UX v2 1.5h + buffer).
- **Depends on:** nada.
- **Worktree:** `feat/beta3-ux-tokens-i18n` (track E).

---

#### S2.6 — i18n inventory setup

- **Source:** [UX spec v2 "Design tokens & i18n inventory"](epic-2-combat-ux-hotfixes.md)
- **Why it matters:** next-intl é strict; missing keys crasham em runtime. Criar as 32 chaves ANTES de tocar componentes.
- **ACs:** todas as chaves listadas no UX spec inventory existem em `messages/pt-BR.json` e `messages/en.json` nos namespaces corretos (`common`, `combat`, `combat.sheet`, `player`, `compendium`).
- **Files:**
  - MODIFICAR: `messages/pt-BR.json`
  - MODIFICAR: `messages/en.json`
- **Test strategy:** `rtk tsc` + rodar app localmente em ambos os locales; navegar compendium + combat sem erros `MISSING_MESSAGE`.
- **Rollout:** direct deploy. Additive — zero risco.
- **Parity:** 3 modos (i18n global).
- **DoD:** 32 chaves em ambos locales; app roda limpo em PT-BR e EN.
- **Estimate:** **2h** (não estava no UX spec; extraindo do inventory).
- **Depends on:** nada. **Primeira story do Sprint 2.**
- **Worktree:** `feat/beta3-ux-tokens-i18n` (track E) — DEVE rodar antes das demais stories de UX.

---

### Sprint 3 — P1 UX Heavier + Data Layer (depende de Sprints 1-2)

**Objetivo:** entregar os hotfixes estruturais de HP (H5, H9) que dependem dos findings do spike e do setup do Sprint 2, mais H6 (busca) e H10 (remover grupo).

**Duração estimada:** 3-3.5 dev-days (UX Sprint 2 + 3 do spec Sally = ~14h + 16h = ~30h ÷ 8 = ~4d; aplicar paralelismo).

**Paralelismo possível:** dois tracks:
- Track F (HP estrutural: H5, H9) — worktree `feat/beta3-hp-structural`
- Track G (busca + grupo: H6, H10) — worktree `feat/beta3-search-group`

**Dependências de entrada:**
- S1.1 (recap) e S1.2 (combatant add) mergeados e soak 24h — garantia de que HP refactors não brigam com race conditions.
- S1.5 Finding 3 mergeado — H9 consome o shape `groupHealth.members`.
- S1.5 Finding 5 mergeado — H8 só é visível após guard fix.
- S2.6 i18n inventory mergeado — chaves de HP tier (`combat.hp_*_short`) existem.
- `lib/flags.ts` (criado em S1.2) existe — H5 usa `ff_hp_thresholds_v2`.

#### Stories

---

#### S3.1 — HP numérico + barra + DEFEATED derivado (H5)

- **Source:** [UX spec v2 H5](epic-2-combat-ux-hotfixes.md) — "Hotfix 5 — HP numérico com barra visual"
- **Why it matters:** player vê HP monstro como label qualitativo (LIGHT/MODERATE). Tactical combat exige precisão. Thresholds mudam 70/40/10 → 75/50/25 sob feature flag.
- **ACs:**
  1. `lib/utils/hp-status.ts` adiciona `HpDisplayState = HpStatus | "DEFEATED"` (NÃO no union `HpStatus` — broadcasts seguem 5 valores). Helper `deriveDisplayState(current, max, is_defeated, hp_status?)`. `HP_DISPLAY_STYLES` com DEFEATED (`text-zinc-400 bg-zinc-800 bar-zinc-700`).
  2. `getHpStatus()` aceita flag `ff_hp_thresholds_v2`; v1 preserva 70/40/10, v2 aplica 75/50/25.
  3. Novo componente `components/combat/HpDisplay.tsx` com `role="progressbar"` + `aria-valuenow/min/max`; prop `revealExact` (default true); mobile stack `flex-col sm:flex-row`.
  4. [PlayerInitiativeBoard.tsx:1153](../components/player/PlayerInitiativeBoard.tsx#L1153) branch nova ANTES de `else if (hp_status)`: se `current_hp != null && max_hp != null && max_hp > 0` → `<HpDisplay ...>`; `revealExact={!hideHpForThisCombatant}`.
  5. `app/globals.css`: `.hp-bar-fill { transition: width 300ms ease-out }` + reduced-motion override.
  6. Flag `ff_hp_thresholds_v2` default off; rollout: Lucas staging 1 sprint → general beta → default on → remove.
- **Files:**
  - MODIFICAR: `lib/utils/hp-status.ts` (append, não substituir)
  - CRIAR: `components/combat/HpDisplay.tsx`
  - MODIFICAR: `components/player/PlayerInitiativeBoard.tsx:1153`
  - MODIFICAR: `app/globals.css` (hp-bar-fill transition)
  - MODIFICAR: `lib/flags.ts` (add flag)
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json` (`hp_defeated`, `hp_aria_exact`, `hp_aria_tier`)
- **Test strategy:**
  - Unit: `deriveDisplayState` 6 casos + null max; `getHpStatus` com flag v1/v2 no 75/50/25 boundary.
  - Visual: 6 tiers mobile stack + desktop inline.
  - E2E: combat com goblin dano gradual → transição visual.
- **Rollout:** deploy com flag off → Lucas staging → 1 sprint soak → default on → remove flag.
- **Parity:** 3 modos player — Guest ✅ / Anônimo ✅ / Autenticado ✅. DM N/A (números já).
- **DoD:** 6 tiers visuais aprovados; `role="progressbar"` verificado; flag framework funcional; Lucas testa em staging.
- **Estimate:** **6h** (UX v2 5h + buffer).
- **Depends on:** S2.6 i18n, S1.2 feature flag framework.
- **Worktree:** `feat/beta3-hp-structural` (track F).

---

#### S3.2 — HP individual no grupo (H9)

- **Source:** [UX spec v2 H9](epic-2-combat-ux-hotfixes.md) — "Hotfix 9 — HP individual por membro do grupo"
- **Why it matters:** grupo de 4 goblins com 1 crítico some na média somada. Player não vê "matável em 1 hit".
- **ACs:**
  1. [MonsterGroupHeader.tsx](../components/combat/MonsterGroupHeader.tsx) consome `groupHealth.members` do Finding 3 (S1.5). Renderiza dots 10px com cor do tier + status line `"3× HEAVY · 1× CRIT"`.
  2. Dots truncados em grupos >20 com `[●×10 +N]`.
  3. Auto-expand se `members.length === 1` (se complexo, deferir).
  4. Player view ([PlayerInitiativeBoard.tsx:104-123](../components/player/PlayerInitiativeBoard.tsx#L104)) `computeGroupAgg` remove `avgStatus`; mantém `worstStatus + activeCount`; render `"3 de 4 — HEAVY"`.
  5. 7 chaves i18n novas: `combat.group_members_hp`, `combat.hp_{tier}_short` × 6.
- **Files:**
  - MODIFICAR: `components/combat/MonsterGroupHeader.tsx:47-51, 165-178`
  - MODIFICAR: `components/player/PlayerInitiativeBoard.tsx:104-123`
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json`
- **Test strategy:**
  - Unit: `deriveDisplayState` (já testado em S3.1).
  - Visual: 4 screenshots (misto, grupo-1, grupo-20 truncation, todos defeated).
  - E2E: dano em 1 goblin → dot muda cor.
- **Rollout:** direct deploy.
- **Parity:** 3 modos — Guest ✅ (dots), Anônimo ✅ (worst+count), Autenticado ✅, DM ✅ (dots).
- **DoD:** 4 visuais aprovados; a11y `role="list"` verificado; player anti-metagaming preservado.
- **Estimate:** **4h** (UX v2 3h + buffer).
- **Depends on:** S1.5 Finding 3 (shape de dados) + S2.6 i18n + S3.1 (`HP_DISPLAY_STYLES` com DEFEATED).
- **Worktree:** `feat/beta3-hp-structural` (track F).

---

#### S3.3 — Busca do compêndio com acentos + PT-BR (H6)

- **Source:** [UX spec v2 H6](epic-2-combat-ux-hotfixes.md) — "Hotfix 6 — Busca do compêndio com acentos"
- **Why it matters:** "Velociraptor" → nada. "remora" → não acha "Rêmora". Busca quebrada = compêndio inútil.
- **ACs:**
  1. CRIAR `lib/srd/normalize-query.ts` com `normalizeForSearch(text)` (NFD + strip diacritics + remove pontuação, preserva letras unicode) + `createNormalizingGetFn` opcional.
  2. [lib/srd/srd-search.ts:53-64](../lib/srd/srd-search.ts#L53) MONSTER_OPTIONS adiciona `ignoreDiacritics: true` (Fuse v7); threshold recalibrado 0.35 → 0.4; `name_pt` weight 0.30.
  3. Aplicar `ignoreDiacritics: true` em `SPELL_OPTIONS`, `ITEM_OPTIONS`, `FEAT_OPTIONS`, `BACKGROUND_OPTIONS`.
  4. [MonsterSearchPanel.tsx:250-260](../components/combat/MonsterSearchPanel.tsx#L250) Fuse local adiciona `ignoreDiacritics: true` + key `name_pt`.
  5. [PlayerCompendiumBrowser.tsx](../components/player/PlayerCompendiumBrowser.tsx) 6 filtros locais (monsters 211-218, spells 200-208, items, conditions, feats, races, backgrounds) usam `normalizeForSearch` em `needle` + `m.name` + `m.name_pt`.
  6. Testes de aceitação obrigatórios: `velociraptor`, `Velociraptor`, `remora`, `Owlbear`, `owl bear`, `drag`, `polvo` (se `name_pt` populado).
- **Files:**
  - CRIAR: `lib/srd/normalize-query.ts`
  - MODIFICAR: `lib/srd/srd-search.ts:53-64`
  - MODIFICAR: `components/combat/MonsterSearchPanel.tsx:250-260`
  - MODIFICAR: `components/player/PlayerCompendiumBrowser.tsx:200-280` (6 filtros + global)
  - CRIAR: `e2e/compendium/search.spec.ts`
- **Test strategy:**
  - Unit: `normalizeForSearch` 10+ casos (vazio, null, acentos, hífens, unicode CJK, emoji).
  - Unit: `searchMonsters` 7 casos de aceitação com dataset mock.
  - E2E: teclar "Velociraptor" + assert + "remora" + assert.
- **Rollout:** direct deploy. Instrumentar `compendium:search_empty_result` para monitorar cobertura PT-BR.
- **Parity:** 3 modos — Guest ✅ / Anônimo ✅ / Autenticado ✅ / DM ✅.
- **DoD:** todos os 7 testes de aceitação passam; telemetria configurada; `rtk tsc` limpo.
- **Estimate:** **4h** (UX v2 3h + buffer).
- **Depends on:** nada.
- **Worktree:** `feat/beta3-search-group` (track G).

---

#### S3.4 — Limpar/deletar grupo (H10)

- **Source:** [UX spec v2 H10](epic-2-combat-ux-hotfixes.md) — "Hotfix 10 — Botões Limpar e Deletar grupo"
- **Why it matters:** DM mata grupo de 6 bandits; sem atalho para remover todos; clica Remove em cada um.
- **ACs:**
  1. Novo hook `handleRemoveGroup(groupId, mode: "defeated" | "all")` em `lib/hooks/useCombatActions.ts` — mirror completo do `handleRemoveCombatant` em loop: adjust turn_index, reorder initiative, broadcast `combat:combatant_remove` × N, persist × N, state_sync final.
  2. Guest store `lib/stores/guest-combat-store.ts` adiciona `removeCombatantsByGroup(groupId, mode)` — mesma lógica SEM broadcast/persist.
  3. [MonsterGroupHeader.tsx](../components/combat/MonsterGroupHeader.tsx) adiciona 2 botões no header:
     - **Limpar derrotados** (amber, aparece se `activeMembers.length < totalMembers && > 0`).
     - **Deletar grupo** (red, sempre visível quando DM).
     - Touch targets 32×32 desktop, 44×44 mobile.
  4. 2 modais `AlertDialog` com copy em i18n (8 chaves novas).
  5. Telemetria `combat:group_removed { group_id, mode, count }`.
- **Files:**
  - MODIFICAR: `lib/hooks/useCombatActions.ts` (novo hook)
  - MODIFICAR: `lib/stores/guest-combat-store.ts` (novo método)
  - MODIFICAR: `components/combat/MonsterGroupHeader.tsx` (2 botões + 2 dialogs)
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json` (8 chaves)
  - CRIAR: `e2e/combat/group-cleanup.spec.ts`
- **Test strategy:**
  - Unit: `removeCombatantsByGroup` (guest) + `handleRemoveGroup` (DM) — remove all defeated; remove all; turn adjust; empty result.
  - E2E: criar grupo 4, matar 2, clicar Limpar, assert 2 removidos + state_sync broadcast.
  - Persistence: refresh após delete → grupo ausente.
- **Rollout:** direct deploy.
- **Parity:** Guest ✅ (DM solo) / Anônimo N/A (player não remove) / Autenticado N/A (player) / DM ✅.
- **DoD:** e2e verde; persist via refresh validado; 3 turn-adjust cases testados.
- **Estimate:** **6h** (UX v2 5h + buffer).
- **Depends on:** S2.6 i18n.
- **Worktree:** `feat/beta3-search-group` (track G).

---

### Sprint 4 — P2 Features & Enhancements

**Objetivo:** features que agregam mas não bloqueiam beta 4 (auto-scroll pulse visual, custom conditions, quick actions, HP crítico DM via Finding 7 QW2 já feito em S1.5, monster card reorder via H4/S2.3 já feito, votação retroativa).

**Duração estimada:** 2-2.5 dev-days.

**Paralelismo possível:** dois tracks:
- Track H (conditions: H11, H12) — worktree `feat/beta3-conditions-actions`
- Track I (pulse + nudge + voting: H8 visual, H14, voting spec) — worktree `feat/beta3-pulse-nudge-voting`

**Dependências de entrada:**
- S1.5 Finding 5 mergeado (guard fix) — H8 pulse só é visível com scroll funcionando.
- S2.6 i18n inventory.
- S3.4 `handleAdvanceTurn` em `useCombatActions.ts` — H12 auto-cleanup precisa encaixar.

#### Stories

---

#### S4.1 — Auto-scroll pulse visual (H8)

- **Source:** [UX spec v2 H8](epic-2-combat-ux-hotfixes.md) — "Hotfix 8 — Auto-scroll suave + pulse highlight"
- **Why it matters:** DM scrolla pra combatente atual (guard fix em S1.5) mas sem pulse não há reforço visual. UX spec H8 explicitamente SUPERSEDED by Finding 5 na camada de guard; aqui é só visual.
- **ACs:**
  1. Padronizar seletor `data-combatant-index` em 3 clients: DM (já existe), Guest ([GuestCombatClient.tsx:1095-1106](../components/guest/GuestCombatClient.tsx#L1095-L1106) migrar de `aria-current`), Player ([PlayerInitiativeBoard.tsx:467-472](../components/player/PlayerInitiativeBoard.tsx#L467-L472) migrar de `turnRef`).
  2. `app/globals.css`: `@keyframes turn-pulse` (1s one-shot, box-shadow brand gold `#D4A853`) + `.animate-turn-pulse` + reduced-motion fallback (ring estático).
  3. [CombatSessionClient.tsx:1878-1890](../components/session/CombatSessionClient.tsx#L1878-L1890) state `pulseTurnId`, `setTimeout 1100ms` cleanup, ref cleanup no unmount; replica em Guest + Player.
  4. useEffect deps `[currentTurnIndex]` (NÃO incluir combatants).
  5. Brand gold (`--tw-gold` / `#D4A853`), NÃO oracle-gold.
- **Files:**
  - MODIFICAR: `app/globals.css` (keyframe + animate-turn-pulse)
  - MODIFICAR: `components/session/CombatSessionClient.tsx:1878-1890`
  - MODIFICAR: `components/guest/GuestCombatClient.tsx:1095-1106`
  - MODIFICAR: `components/player/PlayerInitiativeBoard.tsx:467-472`
- **Test strategy:**
  - Unit: cleanup timer ao unmount.
  - E2E: advance turn + assert `data-combatant-index="{N+1}"` tem `animate-turn-pulse` 1s.
  - Visual: screenshot mid-animation.
- **Rollout:** direct deploy.
- **Parity:** 3 modos — Guest ✅ / Anônimo ✅ / Autenticado ✅ / DM ✅.
- **DoD:** seletor padronizado; cleanup verificado; reduced-motion respeitado.
- **Estimate:** **4h** (UX v2 3h + buffer).
- **Depends on:** S1.5 Finding 5 (guard fix).
- **Worktree:** `feat/beta3-pulse-nudge-voting` (track I).

---

#### S4.2 — Condições custom (H11)

- **Source:** [UX spec v2 H11](epic-2-combat-ux-hotfixes.md) — "Hotfix 11 — Condições custom do DM"
- **Why it matters:** DM quer "Bênção", "Maldição Histérica" etc. Homebrew é core; sem UI o DM volta pro papel.
- **ACs:**
  1. CRIAR `lib/combat/custom-conditions.ts` com `CUSTOM_CONDITION_PREFIX = "custom:"`, helpers `isCustomCondition`, `parseCustomCondition`, `formatCustomCondition` (sanitize pipe separator).
  2. **Cross-parser audit obrigatório** antes de merge: grep `includes(":")`, `split(":")`, `startsWith(".*:.*")` em `components/` + `lib/`. Se parser genérico existir, adicionar early return para `custom:`.
  3. [ConditionSelector.tsx](../components/combat/ConditionSelector.tsx) adiciona bloco custom input após linha 184 com `gold/30` border, 2 inputs (name ≤32 chars, desc ≤200 chars), botão Apply; só renderiza se `ff_custom_conditions_v1` on.
  4. [ConditionBadge.tsx](../components/oracle/ConditionBadge.tsx) detecta `isCustomCondition` ANTES de `isConcentration` (linha ~71); renderiza `bg-gold/10 text-gold` com `<Sparkles>` icon.
  5. Persist via `persistConditions` em [lib/supabase/session.ts](../lib/supabase/session.ts); limite soft 10 conditions/combatant documentado.
  6. Flag `ff_custom_conditions_v1` default off; rollout Lucas staging → general.
  7. 5 chaves i18n novas.
- **Files:**
  - CRIAR: `lib/combat/custom-conditions.ts`
  - MODIFICAR: `components/combat/ConditionSelector.tsx`
  - MODIFICAR: `components/oracle/ConditionBadge.tsx`
  - MODIFICAR: `lib/flags.ts`
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json`
- **Test strategy:**
  - Unit: round-trip format/parse, pipe in name, empty desc, overlong.
  - Unit: `concentrating:Bless` NÃO é interpretado como custom.
  - E2E: criar "Bênção" → aparece no badge + persist via refresh.
- **Rollout:** direct deploy com flag off. Cross-parser audit em PR body.
- **Parity:** Guest ✅ (DM solo) / Anônimo read-only (badge renderiza, NÃO cria) / Autenticado read-only / DM ✅.
- **DoD:** cross-parser audit documentado; flag funcional; unit round-trip verde; e2e persist verde.
- **Estimate:** **6h** (UX v2 5h + buffer).
- **Depends on:** S1.2 feature flag framework + S2.6 i18n.
- **Worktree:** `feat/beta3-conditions-actions` (track H).

---

#### S4.3 — Quick actions (Dodge, Dash, Help, Disengage, Hide, Ready) (H12)

- **Source:** [UX spec v2 H12](epic-2-combat-ux-hotfixes.md) — "Hotfix 12 — Quick-actions na ficha"
- **Why it matters:** estados 5e (Dodge etc) são informação relevante; sem UI, some na cabeça do DM.
- **ACs:**
  1. CRIAR `lib/combat/quick-actions.ts` com `QUICK_ACTIONS`, `ACTION_PREFIX = "action:"`, helpers `isQuickAction`, `getQuickActionKind`, `stripQuickActions`, `QUICK_ACTION_META`.
  2. Ícones lucide (Shield, Zap, Users, ArrowLeft, EyeOff, Timer). ZERO emojis.
  3. [ConditionSelector.tsx](../components/combat/ConditionSelector.tsx) bloco quick-actions antes da linha 132; touch target 44/32.
  4. [ConditionBadge.tsx](../components/oracle/ConditionBadge.tsx) detecta `isQuickAction` após `isCustomCondition`; renderiza `bg-cool/10 text-cool` + ícone.
  5. Auto-cleanup no `handleAdvanceTurn`: ao avançar para next combatant, `stripQuickActions(nextCombatant.conditions)`, update local + broadcast `combat:condition_change` + persist.
  6. Player self-apply via `onSelfConditionToggle` (anon + auth) aceita quick actions; rejeita custom prefix.
  7. Telemetria `combat:quick_action_applied { kind, mode }`.
  8. 12 chaves i18n (6 labels + 6 desc).
- **Files:**
  - CRIAR: `lib/combat/quick-actions.ts`
  - MODIFICAR: `components/combat/ConditionSelector.tsx`
  - MODIFICAR: `components/oracle/ConditionBadge.tsx`
  - MODIFICAR: `lib/hooks/useCombatActions.ts` (handleAdvanceTurn auto-cleanup)
  - MODIFICAR: `components/player/PlayerInitiativeBoard.tsx:218` (onSelfConditionToggle validation)
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json`
- **Test strategy:**
  - Unit: `isQuickAction`, `getQuickActionKind`, `stripQuickActions`.
  - Unit: advance turn com combatant com Dodge → conditions limpas.
  - E2E: player aplica Dodge; DM avança; Dodge some DM + player.
  - Cross-broadcast: `combat:condition_change` disparado.
- **Rollout:** direct deploy.
- **Parity:** Guest ✅ / Anônimo ✅ (self-apply) / Autenticado ✅ (self-apply) / DM ✅.
- **DoD:** cleanup broadcast verificado; player self-apply não leak custom; e2e cross-client verde.
- **Estimate:** **6h** (UX v2 5h + buffer).
- **Depends on:** S2.6 i18n + S4.2 (detectar custom antes de quick action no Badge).
- **Worktree:** `feat/beta3-conditions-actions` (track H).

---

#### S4.4 — Login nudge no compêndio (H14)

- **Source:** [UX spec v2 H14](epic-2-combat-ux-hotfixes.md) — "Hotfix 14 — Compêndio: login nudge"
- **Why it matters:** guest/anon abre compêndio sem saber que login desbloqueia homebrew + traduções persistentes. Perda de conversão.
- **ACs:**
  1. CRIAR `components/player/CompendiumLoginNudge.tsx` com props `mode: "guest" | "anonymous" | "authenticated"`, `returnUrl?`.
  2. Banner `bg-gold/10 border-gold/30`; Sparkles icon; CTA `bg-gold text-surface-primary` (AAA contrast); X dismiss 44×44.
  3. `sanitizeReturnUrl` whitelist de paths internos (`/try`, `/join/`, `/invite/`, `/campaign/`, `/session/`).
  4. `getDismissTs` / `setDismissTs` com localStorage + sessionStorage fallback (try/catch).
  5. TTL 3 dias; banner esconde se `mode === "authenticated"` OU dismissal < 3d.
  6. Analytics via `trackEvent` (3 eventos: shown/clicked/dismissed).
  7. [PlayerCompendiumBrowser.tsx](../components/player/PlayerCompendiumBrowser.tsx) recebe prop `mode`; renderiza banner após `<VisuallyHidden.Root>`.
  8. Callers: `GuestCombatClient` → `mode="guest"` returnUrl `/try`; `PlayerJoinClient` → derivado de `!user.is_anonymous` (ref [PlayerJoinClient.tsx:415](../components/player/PlayerJoinClient.tsx#L415)); `CombatSessionClient` → `"authenticated"`.
  9. 5 chaves i18n em `compendium.*`.
- **Files:**
  - CRIAR: `components/player/CompendiumLoginNudge.tsx`
  - MODIFICAR: `components/player/PlayerCompendiumBrowser.tsx`
  - MODIFICAR: `components/guest/GuestCombatClient.tsx:~1373`
  - MODIFICAR: `components/player/PlayerJoinClient.tsx` (passar mode pra Browser)
  - MODIFICAR: `components/session/CombatSessionClient.tsx:~1956`
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json`
- **Test strategy:**
  - Unit: `sanitizeReturnUrl` casos (//evil, http://evil, /try, /try/foo, empty, null).
  - Unit: `getDismissTs`/`setDismissTs` com mock throws.
  - E2E: `/try` abre compêndio → banner visible; dismiss → sumir; refresh → sumido. `/invite/[token]` auth → sem banner.
- **Rollout:** direct deploy. Analytics em staging primeiro; Lucas valida CTA.
- **Parity:** Guest ✅ / Anônimo ✅ / Autenticado N/A (banner hidden) / DM N/A.
- **DoD:** detection bug `!user.is_anonymous` validado; 4 unit tests verdes; e2e cross-mode verde.
- **Estimate:** **4h** (UX v2 3.5h + buffer).
- **Depends on:** S2.6 i18n.
- **Worktree:** `feat/beta3-pulse-nudge-voting` (track I).

---

#### S4.5 — Votação retroativa `/feedback/[token]` (voting spec completa)

- **Source:** [spec voting](spec-feedback-retroactive-voting.md)
- **Why it matters:** Lucas e players da sessão de 16/04 não votaram dificuldade pós-combate (o recap sumiu, ver S1.1). Precisam votar retroativamente via link do WhatsApp. Solução permanente para todas as futuras sessões.
- **ACs:**
  1. Migration nova `supabase/migrations/138_late_vote_via_session_token.sql`: coluna `encounter_votes.session_token_id UUID REFERENCES session_tokens(id)`, `user_id` nullable, 2 partial unique indexes, check constraint `has_voter`, RPC `cast_late_vote_via_token(p_token, p_encounter_id, p_vote)` SECURITY DEFINER.
  2. Rota `app/feedback/[token]/page.tsx` (server) valida token, busca último encounter encerrado da sessão (ou seletor top 3).
  3. `app/feedback/[token]/FeedbackClient.tsx` usa [DifficultyRatingStrip.tsx](../components/combat/DifficultyRatingStrip.tsx) existente + textarea opcional (280 chars); tela de thanks.
  4. `app/api/feedback/route.ts` POST valida Zod, chama RPC, rate-limit 10 req/min por token.
  5. 7 chaves i18n em `feedback.*`.
  6. Botão "Copiar link de feedback" em [components/combat/RecapActions.tsx](../components/combat/RecapActions.tsx) (opcional v1).
  7. Telemetria `feedback.page_viewed`, `feedback.vote_submitted`, `feedback.error_token_invalid`, `feedback.error_no_encounters`.
- **Files:**
  - CRIAR: `supabase/migrations/138_late_vote_via_session_token.sql`
  - CRIAR: `app/feedback/[token]/page.tsx`
  - CRIAR: `app/feedback/[token]/FeedbackClient.tsx`
  - CRIAR: `app/api/feedback/route.ts`
  - MODIFICAR: `components/combat/RecapActions.tsx` (botão copy link)
  - MODIFICAR: `messages/pt-BR.json`, `messages/en.json`
  - CRIAR: `e2e/features/feedback-retroactive.spec.ts`
- **Test strategy:**
  - Unit: RPC `cast_late_vote_via_token` token inválido / encounter outra session / vote fora 1-5.
  - Unit: upsert duplicado atualiza.
  - E2E: anon flow completo `/feedback/[token]` → star → submit → thanks. Token inválido → erro amigável. Sessão sem encounters → mensagem.
- **Rollout:** direct deploy. Migration em staging primeiro.
- **Parity:** Guest N/A (guest vota local in-session, sem persistir) / Anônimo ✅ (RPC nova) / Autenticado ✅ (pode usar ambas RPCs; preferir original).
- **DoD:** migration aplicada; e2e anon verde; link testado no mobile real; Lucas recebe link no WhatsApp (após deploy).
- **Estimate:** **4h** (voting spec estimou 3h20; +20% buffer).
- **Depends on:** S2.6 i18n.
- **Worktree:** `feat/beta3-pulse-nudge-voting` (track I).

---

### Sprint 5 (opcional, pós beta 4) — Roadmap features

**Objetivo:** itens out-of-scope do spike/UX spec que não bloqueiam beta 4 mas estão no backlog do feedback do Lucas.

**Duração estimada:** 3-5 dev-days (não compromissado).

#### Stories (backlog)

- **S5.1 — H13 Richard clicável** — BLOCKED pending DM clarification. Ver [UX spec H13](epic-2-combat-ux-hotfixes.md). Reabrir como quick spec após Lucas esclarecer ("Richard" é PC/NPC/monster? qual dado? qual UI?).
- **S5.2 — Finding 9 Guest recap localStorage** — [spike v2 Finding 9](spike-beta-test-3-2026-04-17.md#finding-9). Guest perde recap no close. ~2h.
- **S5.3 — Finding 8 encounter duration fix** — [spike v2 Finding 8](spike-beta-test-3-2026-04-17.md#finding-8). Auditar `started_at` paths; DB trigger; backfill. ~4h.
- **S5.4 — Finding 4D fetch orchestrator único** — [spike v2 Finding 4D](spike-beta-test-3-2026-04-17.md#finding-4). 4 loops concorrentes; refactor. 2-3d, precisa repro instrumental primeiro.
- **S5.5 — Polymorph / transformação de personagem** — feedback Lucas, roadmap Epic 4.
- **S5.6 — Favoritar fichas** — feedback Lucas, roadmap Epic 4.
- **S5.7 — Content additions** — Rod of Pact Keeper, Bracers of Illusionist, Astral Shards (verificar `data/srd/items.json` + whitelist).
- **S5.8 — Tela inicial Full/Light/Moderate com números** — UX Epic 2.
- **S5.9 — Edit group vs delete group UX review** — feedback Lucas indireto, bucket UX.

---

## Execução paralela em worktrees

Guidance explícita para múltiplos dev agents rodarem em paralelo sem stomp. Mapa de arquivos tocados por story + sugestão de worktree.

### Matriz arquivo × story (conflitos potenciais)

| Arquivo / Área | S1.1 | S1.2 | S1.3 | S1.4 | S1.5 | S2.1-6 | S3.1 | S3.2 | S3.3 | S3.4 | S4.1 | S4.2 | S4.3 | S4.4 | S4.5 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `CombatSessionClient.tsx` | ✓ | | | | ✓ | | | | | | ✓ | | | | |
| `PlayerJoinClient.tsx` | ✓ | ✓ | ✓ | | | | | | | | | | | ✓ | |
| `PlayerInitiativeBoard.tsx` | | | | | | | ✓ | ✓ | | | ✓ | | ✓ | | |
| `CombatantRow.tsx` | | | | | ✓ | ✓ | | | | | | | | | |
| `MonsterStatBlock.tsx` | | | | | ✓ | ✓ | | | | | | | | | |
| `MonsterGroupHeader.tsx` | | | | | ✓ | | | ✓ | | ✓ | | | | | |
| `ConditionSelector.tsx` | | | | | | | | | | | | ✓ | ✓ | | |
| `ConditionBadge.tsx` | | | | | | | | | | | | ✓ | ✓ | | |
| `useCombatActions.ts` | | ✓ | | | ✓ | | | | | ✓ | | | ✓ | | |
| `broadcast.ts` | | ✓ | | | | | | | | | | | | | |
| `hp-status.ts` | | | | | | | ✓ | ✓ | | | | | | | |
| `srd-search.ts` | | | | | | | | | ✓ | | | | | | |
| `PlayerCompendiumBrowser.tsx` | | | | | | | | | ✓ | | | | | ✓ | |
| `dialog.tsx` (shared) | | | | | | ✓ | | | | | | | | | |
| `globals.css` | | | | | | | ✓ | | | | ✓ | | | | |
| `messages/*.json` | | | | | | ✓ | ✓ | ✓ | | ✓ | | ✓ | ✓ | ✓ | ✓ |
| Novos endpoints API | ✓ | | | | | | | | | | | | | | ✓ |
| Novas migrations SQL | ✓ | | | ✓ | | | | | | | | | | | ✓ |

### Worktrees sugeridos (9 paralelos máximo)

| Worktree | Stories | Arquivos críticos exclusivos | Pode rodar em paralelo com |
|---|---|---|---|
| `feat/beta3-recap-persistence` | S1.1 | novos endpoints, migration 137, CombatSessionClient:295-322, PlayerJoinClient:886-933 | todos exceto outros que tocam PlayerJoinClient |
| `feat/beta3-combatant-add-reorder` | S1.2 | broadcast.ts, useCombatActions:402-442, PlayerJoinClient:1201, realtime.ts | **conflita com S1.3 e S1.5** em PlayerJoinClient — fazer merge serialmente |
| `feat/beta3-telemetry-whitelist` | S1.3 + S1.4 + S1.5 | PlayerJoinClient:1816-1831 (S1.3), migration 136 (S1.4), CombatSessionClient:1879-1890 + MonsterGroupHeader + CombatantRow + useCombatActions (S1.5) | **coordenar com S1.2 em PlayerJoinClient** |
| `feat/beta3-ux-tokens-i18n` | S2.4 + S2.5 + S2.6 (i18n first) | globals.css, hp-status.ts, RulesetSelector, messages/*.json | paralelo total com outros |
| `feat/beta3-ux-dialogs-statblock` | S2.1 + S2.2 + S2.3 | dialog.tsx, MonsterStatBlock.tsx, stat-card-5e.css | **conflita com S1.5 Finding 7 QW1 em MonsterStatBlock** — coordenar merge |
| `feat/beta3-hp-structural` | S3.1 + S3.2 | HpDisplay.tsx (novo), hp-status.ts, PlayerInitiativeBoard:1153+104-123, MonsterGroupHeader | depende de S1.5 (Finding 3), S2.6 (i18n), S1.2 (flag framework) |
| `feat/beta3-search-group` | S3.3 + S3.4 | normalize-query.ts (novo), srd-search.ts, PlayerCompendiumBrowser, useCombatActions (novo hook), guest-combat-store, MonsterGroupHeader | paralelo total após S2.6 |
| `feat/beta3-conditions-actions` | S4.2 + S4.3 | custom-conditions.ts (novo), quick-actions.ts (novo), ConditionSelector, ConditionBadge, useCombatActions (handleAdvanceTurn auto-cleanup) | S4.3 depende de S4.2 (Badge order) |
| `feat/beta3-pulse-nudge-voting` | S4.1 + S4.4 + S4.5 | globals.css (pulse), CompendiumLoginNudge (novo), PlayerCompendiumBrowser, migration 138, app/feedback/*, app/api/feedback/* | depende de S1.5 (Finding 5 guard), S2.6 (i18n) |

### Regra de merge order (obrigatório)

Quando 2+ worktrees tocam o mesmo arquivo, merge serial com esta prioridade:

1. **Sprint 1 always first** dentro do mesmo arquivo (reliability > UX).
2. S1.2 (combatant add) → S1.3 (telemetria) → S1.5 (quick wins) → S1.1 (recap) em `PlayerJoinClient.tsx`.
3. S1.5 Finding 7 QW1 → S2.3 (H4) em `MonsterStatBlock.tsx` (H4 é superset).
4. S4.2 (H11 custom) → S4.3 (H12 quick actions) em `ConditionBadge.tsx` (H12 checa `isCustomCondition` antes).
5. S3.1 (H5) → S3.2 (H9) em `hp-status.ts` (H9 usa `HP_DISPLAY_STYLES`).

---

## Caminho crítico

Gantt-style em ordem de dev-days corridos (worktrees podem comprimir):

```
Day 1 ━━ S1.1 start ━━━━━━━━━━━━━━━━━━━━ S1.1 end (12h)
Day 1 ━━ S1.2 start ━━━━━━━━━━━━━━━━━━━━ S1.2 end (12h, player client)
Day 1 ━━ S1.3 start ━━━━━━━ S1.3 end (6h)
Day 1 ━━ S1.4 start ━ S1.4 end (2.5h) ━━ S1.5 start ━━━━━━━━ S1.5 end (6h)
Day 1 ━━ S2.6 i18n inventory (must-first, 2h)
Day 1.5 ━━ [GATE 1 — Sprint 1 DoD + soak 24h do S1.2 player client]
Day 2 ━━ S2.1-S2.5 paralelo (7h) ━━ S2.6 complete
Day 2.5 ━━ S1.2 DM flag on staging ━━ [GATE 2 — Sprint 2 DoD]
Day 3 ━━ S3.1 (6h) ━━━━━━━━━━━━━━━ S3.1 end
Day 3 ━━ S3.3 + S3.4 paralelo (10h)
Day 4 ━━ S3.2 (4h, depende S3.1)
Day 4.5 ━━ [GATE 3 — Sprint 3 DoD + Lucas valida em staging]
Day 5 ━━ S4.1 + S4.2 + S4.5 paralelo
Day 5.5 ━━ S4.3 start (depende S4.2)
Day 6 ━━ S4.3 + S4.4 end
Day 6.5 ━━ [GATE 4 — Sprint 4 DoD]
Day 7 ━━ QA final + Lucas demo beta 4 readiness ━━ [GATE 5 — beta 4 go/no-go]
```

**Bloqueios críticos (não pode pular):**
- S1.2 DM client **NÃO** pode fazer deploy antes do player client ter 24h de soak (PWA cache).
- S3.2 (H9) **NÃO** pode começar antes de S1.5 (Finding 3) mergeado.
- S4.1 (H8 pulse visual) **NÃO** aparece sem S1.5 (Finding 5 guard fix) mergeado.
- S3.1 (H5) + S4.2 (H11) **precisam** de `lib/flags.ts` criado em S1.2.
- Todas as stories de UI **precisam** de S2.6 (i18n inventory) antes — next-intl strict.

---

## Gates de handoff

Cada gate é checklist testável. Sprint N+1 só começa com gate N verde.

### Gate 1 — Sprint 1 DoD (P0 reliability)

- [ ] S1.1: migration 137 aplicada em prod; endpoint POST `/recap` e GET `/latest-recap` testados; DM smoke com Lucas em staging; e2e `recap-persistence.spec.ts` verde
- [ ] S1.2: player client com novo + antigo handler deployed; PWA soak 24h (≥48h ideal); `ff_combatant_add_reorder` false em prod, true em staging; e2e `rapid-add.spec.ts` verde em staging
- [ ] S1.3: 3 tiers instrumentados; throttle com priority funcional; dashboard atualizado
- [ ] S1.4: migration 136 aplicada em prod; Lucas confirma compêndio full
- [ ] S1.5: 3 findings merged; e2e `dm-autoscroll` verde; UX spec H8 marcado como SUPERSEDED
- [ ] CI verde em todos os PRs; `rtk tsc` + `rtk lint` limpos
- [ ] Zero review comments abertos

### Gate 2 — Sprint 2 DoD (UX quick wins)

- [ ] 32 chaves i18n existentes em PT-BR e EN; app roda em ambos locales sem `MISSING_MESSAGE`
- [ ] S2.1-2.5: visuais aprovados em mobile (375px) + desktop (1280px); WCAG touch targets verificados
- [ ] Lucas demo em staging (compêndio, stat block, HP crítico) — feedback positivo
- [ ] S1.2 flag DM agora on em prod (24h+ desde deploy de player client)

### Gate 3 — Sprint 3 DoD (HP estrutural + busca + grupo)

- [ ] S3.1: `ff_hp_thresholds_v2` on em staging para Lucas; `role="progressbar"` verificado; 6 tiers visuais
- [ ] S3.2: 4 visuais aprovados; anti-metagaming preservado no player (worst+count, não exato)
- [ ] S3.3: 7 testes de aceitação de busca passam (Velociraptor, remora, Owlbear etc)
- [ ] S3.4: e2e `group-cleanup` verde; persist via refresh validado
- [ ] Lucas valida HP estrutural em staging — aprovação explícita antes de prod

### Gate 4 — Sprint 4 DoD (features)

- [ ] S4.1: pulse visível; reduced-motion respeitado; 3 clients com seletor `data-combatant-index`
- [ ] S4.2: cross-parser audit documentado em PR; `ff_custom_conditions_v1` staging on; e2e persist
- [ ] S4.3: auto-cleanup broadcast verificado; player self-apply não leak custom
- [ ] S4.4: detection bug `!user.is_anonymous` validado; e2e cross-mode
- [ ] S4.5: migration 138 aplicada; Lucas recebe link real no WhatsApp; link funciona em mobile

### Gate 5 — Beta 4 readiness

- [ ] Todos os P0 em prod por ≥48h sem regressão
- [ ] Observability dashboards mostram: `recap.served_from_db` > 95%, `player:reconnected channel_recovery` < 5/player/hora, `combatant_add.desync_detected` < 2%
- [ ] Lucas confirma que pode fazer sessão nova sem ansiedade dos 3 show-stoppers
- [ ] Votação retroativa do grupo antigo coletada (link enviado)

---

## Matriz de paridade (Combat Parity consolidada)

Verificar se cada story honra Combat Parity Rule (CLAUDE.md).

| Story | Guest (`/try`) | Anônimo (`/join`) | Autenticado (`/invite`) | DM |
|---|:-:|:-:|:-:|:-:|
| S1.1 Recap persistence | N/A (Finding 9 = S5.2) | ✅ | ✅ | ✅ (DM trigger) |
| S1.2 Combatant add reorder | N/A (monolithic) | ✅ | ✅ | ✅ (emitter) |
| S1.3 Telemetria reconnect | N/A (sem reconnect) | ✅ | ✅ | N/A |
| S1.4 Whitelist backfill | N/A | N/A | ✅ (data) | ✅ |
| S1.5 Finding 3 group HP data | ✅ | ✅ | ✅ | ✅ |
| S1.5 Finding 5 auto-scroll guard | ✅ (DM=guest) | N/A | N/A | ✅ |
| S1.5 Finding 7 resistances+HP color | ✅ | ✅ | ✅ | ✅ |
| S2.1 Dialog X 44×44 | ✅ | ✅ | ✅ | ✅ |
| S2.2 Stat card toolbar AAA | ✅ | ✅ | ✅ | ✅ |
| S2.3 Defesas no topo (H4) | ✅ | ✅ | ✅ | ✅ |
| S2.4 HP CRITICAL legível (H3) | ✅ | ✅ | ✅ | (QW2 em S1.5) |
| S2.5 Edition badge (H7) | ✅ | ✅ | ✅ | ✅ |
| S2.6 i18n inventory | ✅ | ✅ | ✅ | ✅ |
| S3.1 HP numérico + barra (H5) | ✅ | ✅ | ✅ | N/A (DM tem números) |
| S3.2 HP individual grupo (H9) | ✅ (dots DM) | ✅ (worst+count) | ✅ (worst+count) | ✅ (dots) |
| S3.3 Busca acentos (H6) | ✅ | ✅ | ✅ | ✅ |
| S3.4 Limpar/deletar grupo (H10) | ✅ (guest DM) | N/A (read-only) | N/A (read-only) | ✅ |
| S4.1 Auto-scroll pulse (H8) | ✅ | ✅ | ✅ | ✅ |
| S4.2 Condições custom (H11) | ✅ (DM solo) | read-only | read-only | ✅ |
| S4.3 Quick actions (H12) | ✅ | ✅ (self-apply) | ✅ (self-apply) | ✅ |
| S4.4 Login nudge (H14) | ✅ | ✅ | N/A (hidden) | N/A (hidden) |
| S4.5 Voting /feedback/[token] | N/A (local in-session) | ✅ (RPC nova) | ✅ (RPC original ou nova) | ✅ (como player se aplica) |

**Stories com N/A justificadas** (verificadas caso a caso contra a CLAUDE.md Combat Parity section):
- S1.1 guest: bucket P2 (Finding 9 em S5.2) por scope reduzido (single-device localStorage).
- S1.2 guest: sem broadcast; monolítico localmente.
- S1.3 guest: sem reconnection flow.
- S3.1 DM: HP já exibe números no DM (via S1.5 Finding 7 QW2).
- S3.4 players: remover grupo é DM action, players não veem botão.
- S4.4 auth+DM: banner não faz sentido pra usuário logado.
- S4.5 guest: guest mode persiste localmente já — não precisa de rota retroativa.

---

## Riscos e mitigações

Consolidados dos 2 reviews + sprint planning. Riscos por sprint:

### Sprint 1

| Risco | Severidade | Mitigação |
|---|---|---|
| PWA cache breaking clients antes do soak 24h de S1.2 | HIGH | Flag `ff_combatant_add_reorder` default off até 24h+48h de soak |
| S1.1 DM antigo + player novo retorna `null` em `/latest-recap` | LOW | Aceitável; player vê "combate encerrado" normal |
| S1.1 DM em background durante encerrar: fetch + broadcast ambos falham | MEDIUM | Bucket: `sessionStorage.lastUnsavedRecap` no DM client + retry no mount. Elevar de bucket se >5% encounters |
| S1.2 `broadcastViaServer` opt-out perde sanitização server-side | MEDIUM | Auditar que combatant payload já é `sanitizeCombatantForPlayer` no DM client antes de deploy |
| S1.3 tier 1 (`resumed`) oculta reconnects iOS legítimos de 5-30s | MEDIUM | Guard extra: `channelState === "joined"` obrigatório pra tier 1 |
| S1.4 migration 136 lock em auth.users | LOW | Rodar fora de horário de pico; Supabase lock é rápido em whitelist simples |
| S1.5 Finding 3 data shape quebra H9 futura | LOW | Spike explicita props (`minHp`, `criticalCount`); UX spec já alinhado |

### Sprint 2

| Risco | Severidade | Mitigação |
|---|---|---|
| S2.1 dialog.tsx quebra modais custom (login, settings) com densidade apertada | MEDIUM | Spot-check 5-10 callers antes de merge; ajustar `right-3 top-3` se colidir |
| S2.6 32 chaves i18n faltando causa runtime error | HIGH | First story do Sprint 2; `rtk tsc` + rodar app em PT-BR e EN |
| S2.3 H4 conflita com S1.5 Finding 7 QW1 no MonsterStatBlock | MEDIUM | Merge S1.5 primeiro; H4 é superset (absorve QW1) |
| S2.4 `animate-pulse-critical` + `animate-critical-glow` estroboscópico | LOW | Opção A/B doc em PR; dev sinaliza no visual test |

### Sprint 3

| Risco | Severidade | Mitigação |
|---|---|---|
| S3.1 thresholds v2 em combates ativos = transição surpresa | HIGH | Feature flag `ff_hp_thresholds_v2` default off; Lucas staging 1 sprint |
| S3.1 `revealExact={true}` default leak HP de monstro com `hidden HP` | MEDIUM | Caller passa `revealExact={!hideHpForThisCombatant}` — validar em S3.1 |
| S3.3 threshold 0.4 gera noise (matches fracos) | LOW | Testes de aceitação + monitorar `compendium:search_empty_result` |
| S3.4 race: limpar grupo + advance turn simultâneo | LOW | `state_sync` é authoritative (já existe no player) |

### Sprint 4

| Risco | Severidade | Mitigação |
|---|---|---|
| S4.2 custom prefix colide com `concentrating:X` ou `exhaustion:N` | MEDIUM | Cross-parser audit OBRIGATÓRIO antes de merge; flag `ff_custom_conditions_v1` |
| S4.5 `session_tokens.is_active` flipado pra false após sessão do Lucas | MEDIUM | Checar no Supabase antes de confiar; reabrir temporariamente se necessário |
| S4.4 open redirect via `returnUrl` | HIGH | `sanitizeReturnUrl` whitelist interna obrigatória |
| S4.1 pulse + glow estroboscópico (2 frequências) | LOW | Opção A/B doc já no UX spec |

### Transversais (todos sprints)

| Risco | Severidade | Mitigação |
|---|---|---|
| Deploy parcial DM/player cria estado inconsistente | HIGH | Rollout orders documentados nas stories críticas (S1.1, S1.2) |
| CLAUDE.md Combat Parity violada acidentalmente | HIGH | Matriz consolidada; PR checklist obriga |
| SRD Compliance violada em H7 ou S1.4 | HIGH | H7 gate `is_srd`; S1.4 sem trigger (migração idempotente) |
| Feature flag framework não existe antes de S3.1/S4.2 | HIGH | `lib/flags.ts` criado em S1.2 como dep compartilhada |

---

## Observabilidade pós-deploy

Métricas a monitorar por sprint. Dashboard único consolidado.

### Sprint 1

- **`recap.persisted_success_count`** (S1.1) — alerta se `failure_count / encounters_ended > 5%` em 24h
- **`recap.served_from_db`** vs **`recap.delivered_via_broadcast`** (S1.1) — target > 95% de encounters com ≥1 hit
- **`combatant_add.desync_detected`** (S1.2) — alerta se > 2% dos adds
- **`combatant_add.recovery_fetch_count`** (S1.2) — baseline
- **`player:reconnected`** com breakdown `method` (S1.3) — alerta se `channel_recovery > 5/player/hora`
- **`player:broadcast_auth_drop`** (S1.3) — alerta se > 10/sessão
- **429 rate `/api/session/[id]/state`** (S1.3) — alerta se > 1% em rolling 5min
- **`content_whitelist` count** (S1.4) — spot-check antes/depois da migration

### Sprint 2-3

- **`combat:hp_threshold_transition`** (S3.1) — opcional, monitorar rollout do flag v2
- **`compendium:search_empty_result`** (S3.3) — cobertura PT-BR; > 20% indica gap no dataset

### Sprint 4

- **`combat:group_removed`** (S3.4) — ação mais usada (deletar vs limpar)
- **`combat:custom_condition_created`** (S4.2) — adoção homebrew
- **`combat:quick_action_applied`** (S4.3) — ranking de quick actions mais usados
- **`compendium:login_nudge_shown/clicked/dismissed`** (S4.4) — CTR conversão
- **`feedback.page_viewed/vote_submitted/error_*`** (S4.5) — engagement voting

### Dashboard geral (atualizar)

- `09_encounters_ended` fields (existente): `delivery_rate`, `started_at NULL ratio`
- `14_error_logs` (existente): `CHANNEL_ERROR`, `401 AbortError`, `PGRST116`

---

## Política de rollback

Por sprint, como reverter sem destruir dados.

### Sprint 1

- **S1.1 recap:** revert commit do DM client + drop endpoint GET. Dados em `combat_reports` ficam (sem efeito colateral). Migration 137 (unique index) pode ficar — não quebra clients antigos.
- **S1.2 combatant add:** flag `ff_combatant_add_reorder` → false. Clients continuam emitindo/aceitando o tipo antigo. Handler antigo não removido.
- **S1.3 telemetria:** revert commit de PlayerJoinClient. Dashboards voltam ao formato antigo.
- **S1.4 whitelist:** não rollback (aditivo). Se algum user errado entrou, `UPDATE content_whitelist SET revoked_at = now() WHERE user_id = ...`.
- **S1.5 findings:** revert commits individuais (são independentes).

### Sprint 2

- Cada story é UI-only/additive — revert commit puro. i18n keys ficam (não quebram).

### Sprint 3

- **S3.1 HP numérico:** flag `ff_hp_thresholds_v2` → false (threshold volta v1). Componente `HpDisplay` permanece; branch `PlayerInitiativeBoard:1153` pode ser revertida se visual quebrar.
- **S3.2 H9:** revert `MonsterGroupHeader` — dots voltam pra soma. Aceitável como fallback temporário.
- **S3.3 H6:** revert Fuse configs + `normalize-query.ts`. Busca volta ao estado atual.
- **S3.4 H10:** revert do novo hook + UI. Store guest mantém método (no-op sem UI). Dados não perdidos.

### Sprint 4

- **S4.1 pulse:** revert CSS + JSX. Scroll continua via S1.5.
- **S4.2 custom:** flag → false. UI some. Conditions `custom:*` já persistidas ficam; Badge renderiza fallback (concentrating-like).
- **S4.3 quick actions:** flag (se implementado) ou revert. Auto-cleanup no `handleAdvanceTurn` revert opcional.
- **S4.4 nudge:** revert do componente; `PlayerCompendiumBrowser` volta sem prop `mode`.
- **S4.5 voting:** drop endpoint POST + rota `/feedback/[token]`. Migration 138 pode ficar (aditiva).

### Princípio geral

- **Migrations NUNCA revertem em prod** — todas são aditivas (nova coluna nullable, nova RPC, nova row, novo index). Se alguma quebrar, corrigir forward via nova migration.
- **Feature flags são o rollback primário** para S1.2, S3.1, S4.2 — evita revert de código.
- **Dados não se perdem** — rollback de UI não deleta rows persistidas.

---

## <a name="votacao-do-lucas-acao-imediata"></a>Votação do Lucas (ação imediata)

**NÃO ESPERAR SPRINT 4.** Link precisa sair pro grupo do Lucas hoje ou amanhã enquanto a memória da sessão ainda está fresca.

### Plano A — Solução permanente (se S4.5 pronta em 24-48h)

Se o dev agent consegue fazer o spec completo em 1-2 dias, isso vira a solução permanente pra todas as sessões futuras.

### Plano B — Fallback imediato (se S4.5 demora >48h)

Google Form temporário + manual join para coletar votos. Não bloqueia beta 4.

### Query SQL para achar o token ativo da sessão do Lucas

Executar no Supabase SQL Editor (o executor precisa de acesso de service role; idealmente o dev agent de Track I faz):

```sql
-- Achar token + encounters encerrados da sessão do Lucas em 2026-04-16
SELECT
  t.token,
  t.is_active,
  s.id AS session_id,
  s.name AS session_name,
  s.created_at AS session_started,
  e.id AS encounter_id,
  e.name AS encounter_name,
  e.ended_at,
  e.difficulty_rating,
  e.difficulty_votes
FROM session_tokens t
JOIN sessions s ON s.id = t.session_id
JOIN encounters e ON e.session_id = s.id
WHERE s.owner_id = '414dd199-8c0e-4c39-9c28-c5eeaf5a2a5e'  -- Lucas Galupo (owner_id confirmado em 11_sessions_involved.json)
  AND e.ended_at >= '2026-04-16T00:00:00Z'
  AND e.ended_at < '2026-04-18T00:00:00Z'
ORDER BY e.ended_at DESC;
```

**Sanity checks antes de enviar link:**
1. `t.is_active = true` — se `false`, flippar temporariamente ou gerar novo token.
2. Preferir o encounter `484114e7` "Djinni & Air Elementals" (combate real, 00:52:58 encerrado) ou `1a2ceed2` "Dao & Earth Elemental Myrmidons" (17/04).
3. `e.difficulty_votes` ≤ 1 (confirma que ninguém votou ainda).

### Template de URL

```
https://pocketdm.com.br/feedback/<token>
```

Substituir `<token>` pelo valor retornado da query (coluna `t.token`).

### Template WhatsApp (PT-BR)

```
Pessoal! Ontem (16/04) o combate contra os Djinni & Air Elementals foi intenso.

A gente precisa do feedback de vocês sobre a dificuldade — isso ajuda a calibrar
os próximos combates e melhora o app pros próximos testes.

Vota aí (leva 15 segundos):
https://pocketdm.com.br/feedback/<token>

☕ 😊 ⚔️ 🔥 💀
Tranquilo · Desafiador · Duro · Perigoso · Quase TPK

Obrigado! 🎲
```

### Checklist de dispatch

- [ ] Query rodada; token válido extraído
- [ ] Link testado em browser desktop (abre página sem 404)
- [ ] Link testado em browser mobile (layout responsivo OK)
- [ ] Voto teste submetido (depois deletar: `DELETE FROM encounter_votes WHERE encounter_id = ... AND session_token_id = ...`)
- [ ] Mensagem WhatsApp enviada para grupo
- [ ] Monitorar `encounter_votes` na próxima 1h — se zero votos, investigar

### Fallback Google Form (Plano B)

Se S4.5 ainda está em dev:

1. Criar Google Form com 5 opções (Coffee/Smile/Swords/Flame/Skull) + campo de comentário opcional.
2. Enviar link do Form + contextualização do combate no WhatsApp.
3. Coletar respostas manualmente → inserir em `encounter_votes` via script admin quando S4.5 estiver pronto.

---

## Apêndice: mapeamento de stories → findings/hotfixes

Rastreabilidade completa. Qualquer dev agent pode seguir story → fonte primária → review finding (se aplicável).

| Story | Source primário | Review finding aplicável | Status do edit |
|---|---|---|---|
| S1.1 Recap persistence | [Spike Finding 1](spike-beta-test-3-2026-04-17.md#finding-1--recap-pós-combate-perdido) | Spike review CRITICAL-1 + CRITICAL-3 | Corrigido na v2 do spike |
| S1.2 Combatant add reorder | [Spike Finding 2](spike-beta-test-3-2026-04-17.md#finding-2--adicionar-criatura-em-combate-bagunça-turno) | Spike review HIGH-1 + HIGH-2 | Root cause reescrito na v2 |
| S1.3 Telemetria 3 tiers | [Spike Finding 4 A+B+C](spike-beta-test-3-2026-04-17.md#finding-4--storm-de-reconexões-107-para-8-players) | Spike review HIGH-3 + HIGH-4 | Reclassificação em v2 |
| S1.4 Whitelist backfill | [Spike Finding 6](spike-beta-test-3-2026-04-17.md#finding-6--compêndio-travado-no-srd--whitelist) | Spike review CRITICAL-2 | Trigger removido em v2 |
| S1.5 Finding 3 group HP data | [Spike Finding 3](spike-beta-test-3-2026-04-17.md#finding-3--vida-do-grupo-somada) | — | v2 separou data/display |
| S1.5 Finding 5 auto-scroll guard | [Spike Finding 5](spike-beta-test-3-2026-04-17.md#finding-5--dm-sem-auto-scroll) | — | v2 supersede UX H8 |
| S1.5 Finding 7 resistances+HP | [Spike Finding 7](spike-beta-test-3-2026-04-17.md#finding-7--monster-card-reorder-resistências--hp-crítico-legível) | — | Ok direto |
| S2.1 Dialog X (H1) | [UX H1](epic-2-combat-ux-hotfixes.md) | UX review H1 HIGH + MEDIUM | Corrigido em v2 |
| S2.2 Stat card toolbar (H2) | [UX H2](epic-2-combat-ux-hotfixes.md) | UX review H2 CRITICAL | Corrigido em v2 |
| S2.3 Defesas topo (H4) | [UX H4](epic-2-combat-ux-hotfixes.md) | UX review H4 HIGH + MEDIUM | Corrigido em v2 |
| S2.4 HP CRITICAL (H3) | [UX H3](epic-2-combat-ux-hotfixes.md) | UX review H3 CRITICAL + HIGH | Corrigido em v2 |
| S2.5 Edition badge (H7) | [UX H7](epic-2-combat-ux-hotfixes.md) | UX review H7 (SRD compliance) | Gated `is_srd` em v2 |
| S2.6 i18n inventory | [UX v2 new section](epic-2-combat-ux-hotfixes.md) | UX review i18n scatter | Sistematizado em v2 |
| S3.1 HP numérico (H5) | [UX H5](epic-2-combat-ux-hotfixes.md) | UX review H5 CRITICAL + HIGH | DEFEATED client-side em v2; flag threshold em v2 |
| S3.2 HP individual grupo (H9) | [UX H9](epic-2-combat-ux-hotfixes.md) + [Spike Finding 3](spike-beta-test-3-2026-04-17.md#finding-3--vida-do-grupo-somada) | UX review H9 | Defer a spike em v2 |
| S3.3 Busca H6 | [UX H6](epic-2-combat-ux-hotfixes.md) | UX review H6 CRITICAL (Fuse API) | `ignoreDiacritics` em v2 |
| S3.4 Limpar/deletar grupo (H10) | [UX H10](epic-2-combat-ux-hotfixes.md) | UX review H10 CRITICAL (no persist) | Persist + broadcast em v2 |
| S4.1 Auto-scroll pulse (H8) | [UX H8](epic-2-combat-ux-hotfixes.md) + [Spike Finding 5](spike-beta-test-3-2026-04-17.md#finding-5--dm-sem-auto-scroll) | UX review H8 | Guard defer a spike em v2 |
| S4.2 Condições custom (H11) | [UX H11](epic-2-combat-ux-hotfixes.md) | UX review H11 (parser collision) | Cross-audit + flag em v2 |
| S4.3 Quick actions (H12) | [UX H12](epic-2-combat-ux-hotfixes.md) | UX review H12 (parity anon) | Parity corrigida em v2 |
| S4.4 Login nudge (H14) | [UX H14](epic-2-combat-ux-hotfixes.md) | UX review H14 CRITICAL (detection bug) + HIGH (returnUrl) | Corrigido em v2 |
| S4.5 Voting `/feedback/[token]` | [Voting spec](spec-feedback-retroactive-voting.md) | — | Spec standalone pronta |
| S5.1 H13 Richard | [UX H13](epic-2-combat-ux-hotfixes.md) | — | BLOCKED pending DM |
| S5.2 Guest recap | [Spike Finding 9](spike-beta-test-3-2026-04-17.md#finding-9--parity-bug-do-recap-no-guest-novo-baseado-no-review-high-5) | Spike review HIGH-5 | Criado em v2 como bucket |
| S5.3 Encounter duration | [Spike Finding 8](spike-beta-test-3-2026-04-17.md#finding-8--observabilidade-duração-de-combate-não-medida-bucket) | — | Bucket |
| S5.4 Fetch orchestrator | [Spike Finding 4D](spike-beta-test-3-2026-04-17.md#finding-4--storm-de-reconexões-107-para-8-players) | — | Bucket 2-3d |

---

**Fim do sprint plan.** Aprovar → handoff para dev agents em worktrees conforme mapa de [Execução paralela em worktrees](#execucao-paralela-em-worktrees). Dúvidas ou contradições entre este plano e os artefatos-fonte, o spike v2 + UX spec v2 prevalecem (eles têm a análise detalhada); este plano é o cronograma.

— Bob (SM)
