# Wave 4 Kickoff Prompt — New Session

**Generated:** 2026-04-27 (Wave 3 fully merged + DB sync at mig 187)
**Master HEAD:** `95fe8d22`
**Open PRs:** 0
**Open Wave 3 follow-up issues:** 4 (#84, #88, #89, #90 — all P1/P2/P3, not blockers for Wave 4)

---

## Uso

Copia o bloco entre os 2 separadores `---` abaixo e cola como primeira mensagem em uma nova janela do Claude Code no repo `c:\Projetos Daniel\projeto-rpg`. Sessão nova assume o estado consolidado em 2026-04-27 fim do dia (Wave 3 closed + retrospective em [25-wave-3-retrospective-and-state.md](25-wave-3-retrospective-and-state.md)).

---

## Prompt (copiar tudo abaixo deste separador)

---

Você está assumindo a sessão de **Wave 4 do projeto Grimório (Player HQ Redesign V2) — EP-5 Level Up Wizard** no projeto **Pocket DM** (Next.js 16 / TypeScript / Supabase / Tailwind / Playwright). Mestre-target: 25-35 anos, presencial, estilo Curse of Strahd, 60/40 combat/RP.

A Wave 3 foi entregue em 2026-04-27 — 4 PRs squash-merged em master (Sub-zero #83 / 3a #86 / 3b #85 / 3c #87), 1 migration aplicada (187 player_notes), 4 follow-up issues criadas (#84, #88, #89, #90). Master @ `95fe8d22`.

## ⚠️ ETAPA 0 OBRIGATÓRIA — REVIEW COMPLETO DA WAVE 3 ANTES DE ESCREVER QUALQUER CÓDIGO

Antes de tocar QUALQUER coisa de Wave 4, você DEVE fazer um audit independente do trabalho da Wave 3. Não confie cegamente no retrospective — verifique a verdade no código.

### Por que esse passo existe

A sessão anterior entregou a Wave 3 em multi-agent paralelo (4 agents background simultâneos), aplicou 4 adversarial reviews, fez fixes inline em 1 PR e resolveu 1 merge conflict. Tem MUITA superfície que pode ter regredido sem alarme. Os check de CI pegam só o óbvio (TS, lint, e os Playwright — que estão GATED OFF, ver issue #84 P1-2). Eu (sessão anterior) **declarei DONE** mas nem todo P1 foi corrigido — alguns viraram followup issues. Você precisa confirmar:

1. Que o que **eu disse que entreguei** está realmente em master
2. Que o que **eu disse que adiei pra followup** está mesmo em followup (e não esqueci de algum)
3. Que o que **eu disse que NÃO toquei** realmente não foi tocado (ex: V1 paths, combat lógica, SRD content compliance)
4. Que **as regras absolutas do CLAUDE.md** não foram violadas em nenhum dos 4 squash commits (Mestre/HP tiers/Combat Parity/Resilient Reconnection/SRD compliance/SEO canonical)

### O review tem 4 passes — CADA UM DEVE TER OUTPUT VERIFICÁVEL

#### Pass A — Smoke build + checks
```bash
cd "c:/Projetos Daniel/projeto-rpg"
rtk git status                          # confirme master limpo
rtk git log --oneline -8                # confirme HEAD = 95fe8d22 e os 4 squash commits
rtk gh pr list --state open --base master   # confirme 0 open PRs
supabase migration list --linked        # confirme 187 applied (Local=187, Remote=187)
rtk tsc --noEmit                        # **DEVE** estar limpo. Se não, é regressão grave.
rtk lint                                # erros pre-existing são OK; novos não.
rtk vitest run --run                    # 67+ player-hq tests verdes; 151 pre-existing failures (SRD loader, fetch-orchestrator, scripts/) ignoráveis
```

Outputs esperados: HEAD `95fe8d22`, 0 PRs, mig 187 aplicado, TS clean, lint sem novos erros, vitest com pre-existing-only.

#### Pass B — Consume os 4 follow-up issues + decida quais consumir AGORA vs Sprint 9

Cada issue tem findings reais que NÃO bloqueiam Wave 4 mas DEVEM virar code antes de Sprint 10 flag flip. Sua decisão: consumir agora (boa hora porque Wave 4 não toca esses arquivos) OU defer para Sprint 9. Eu **recomendo consumir agora** porque:
- São fixes pequenos (~5-30 LOC cada)
- Independentes da Wave 4 (Wave 4 é wizard novo + ribbon chip; não toca SpellSlotGrid/SlotSummary/Diário/RibbonVivo internals)
- Você pode fazer em paralelo enquanto monta a infra do Wizard (E1 migration + E2 Mestre UI)
- Cada um vale 1 PR pequeno com 1 adversarial review rápido

Issues:
- [#84](https://github.com/danielroscoe-97/projeto-rpg/issues/84) — Sub-zero followup (selectors + CI + a11y)
- [#88](https://github.com/danielroscoe-97/projeto-rpg/issues/88) — Wave 3b followup (i18n toast + menu position + Dot reuse + manual modifier gap)
- [#89](https://github.com/danielroscoe-97/projeto-rpg/issues/89) — Wave 3c followup (anon entrypoint + NPC ambiguity + dedup)
- [#90](https://github.com/danielroscoe-97/projeto-rpg/issues/90) — Wave 3a followup (E2E selector gap + Anon parity + minor refinements)

**Pergunta o Dani**: "Consumir os 4 followup issues agora antes de começar Wave 4 (~6-10h, 4 PRs pequenos), OU empurrar pra Sprint 9 e começar Wave 4 já?" — espere resposta dele.

Se ele disser "consumir agora": abra 4 worktrees + 4 background agents (mesmo padrão Wave 3) + adversarial review + merge ordenado. Cada PR é pequeno, vai bem rápido.

Se ele disser "Sprint 9": pula pra Pass C.

#### Pass C — Audit os 4 squash commits da Wave 3 contra as ACs do plano

Para cada um, verifique:
- Sub-zero `57d99f4d` (PR #83) → contra [25-wave-3-retrospective-and-state.md §3.1](25-wave-3-retrospective-and-state.md#31-sub-zero--pr-83-3-commits-676--27-12-files)
- Wave 3b `4b58701` (PR #85) → contra [§3.2](25-wave-3-retrospective-and-state.md#32-wave-3b--pr-85-8-commits-2356--15-12-files)
- Wave 3c `dc53098b` (PR #87) → contra [§3.3](25-wave-3-retrospective-and-state.md#33-wave-3c--pr-87-8-commits-2509--29-21-files--migration-187)
- Wave 3a `95fe8d22` (PR #86) → contra [§3.4](25-wave-3-retrospective-and-state.md#34-wave-3a--pr-86-10-commits--1-fix-commit--1-merge-commit-2092--126--2109--134-15-files-at-first-push-24-files-after-merge-resolution)

Audit checklist (não enviar pro Dani, é seu controle interno):

**Sub-zero `57d99f4d`:**
- [ ] `components/ui/SpellSlotGrid.tsx` tem prop `inverted?: boolean` (linha 99) com default false
- [ ] `components/player-hq/ResourceDots.tsx` importa `isPlayerHqV2Enabled` e flipa `isFilled = i < usedCount` quando V2 ON
- [ ] `components/player-hq/SpellSlotsHq.tsx` passa `inverted={v2}` ao `<SpellSlotGrid>`
- [ ] `components/player/SpellSlotTracker.tsx` (combat) passa `inverted={v2}` + faz mirror do índice (`max - 1 - i`) antes de chamar `onToggleSlot` quando V2 ON. **Crítico**: walk 4 boundary cases (max=4 used=1, max=4 used=2, max=4 used=4, max=1 used=0) e confirmar matemática.
- [ ] `app/globals.css` tem `--concentration: 197 92% 74%;` + `--concentration-foreground: 0 0% 100%;`
- [ ] `tailwind.config.ts` tem `concentration: 'hsl(var(--concentration))'`
- [ ] `components/player-hq/ActiveEffectCard.tsx` + `components/player-hq/SpellCard.tsx` + `components/player/ActiveEffectsBadges.tsx` swap warning→concentration **APENAS** em código relacionado a `is_concentration` (não em status warnings genéricos)
- [ ] `e2e/features/spell-slot-dots-inverted.spec.ts` existe (sabendo que o selector `[data-variant="transient"]` está broken — issue #84 P1-1)
- [ ] `e2e/features/concentration-badge-sky.spec.ts` existe

**Wave 3b `4b58701`:**
- [ ] `lib/utils/dice-roller.ts` exporta `rollAbilityCheck`, `rollAbilitySave`, `rollD20WithMod`
- [ ] `lib/hooks/useAbilityRoll.ts` faz fire-and-forget broadcast em `campaign:{id}` (NÃO `combat:{id}` ou `ability:{id}`)
- [ ] `components/player-hq/v2/AbilityChip.tsx` tem 2 zonas (CHK + SAVE) com `min-h-[44px]` cada (WCAG SC 2.5.5)
- [ ] `components/player-hq/v2/RollResultToast.tsx` usa sonner
- [ ] `components/player-hq/CharacterCoreStats.tsx` branches em `isPlayerHqV2Enabled()` — V1 markup intocado
- [ ] **NÃO existe** `roll_history` table criada (out of scope por design)
- [ ] **NÃO existe** new realtime channel criado
- [ ] `<!-- parity-intent guest:n/a anon:n/a auth:full -->` block presente em algum lugar visível
- [ ] **Spec gap conhecido**: "+manual modifier" no menu não foi entregue (issue #88) — confirme não há código órfão tentando fazer isso

**Wave 3c `dc53098b`:**
- [ ] `supabase/migrations/187_player_notes.sql` em master (vinda via squash)
- [ ] DB tem `player_notes` table (verificar via `supabase migration list --linked` mostrando 187 Local=Remote)
- [ ] RLS pattern usa `auth.uid()` (NÃO `request.jwt.claims`) — confirmar lendo o SQL
- [ ] CHECK constraint `((user_id IS NULL) <> (session_token_id IS NULL))` presente
- [ ] GIN index em `tags`
- [ ] `lib/hooks/useMinhasNotas.ts` existe (separado do legacy `usePlayerNotes.ts` que continua usando `player_journal_entries`)
- [ ] `components/ui/MarkdownEditor.tsx` + `components/ui/markdown-editor-utils.ts` existem
- [ ] `components/player-hq/v2/diario/MinhasNotas.tsx` existe e está mounted em `DiarioTab.tsx` (placeholder substituído)
- [ ] `lib/hooks/usePlayerNotifications.ts` subscreve `campaign:{id}` (NÃO criou canal novo)
- [ ] 3 novos event types em `lib/types/realtime.ts`: `note:received`, `quest:assigned`, `quest:updated`
- [ ] `lib/realtime/sanitize.ts` pass-through dos 3 — payloads contêm apenas IDs + títulos públicos (sem PII / DM private)
- [ ] **NÃO tocou** `lib/hooks/usePlayerNotes.ts` (continua pra quick notes)
- [ ] **NÃO renomeou** `player_journal_entries`

**Wave 3a `95fe8d22`:**
- [ ] `components/player-hq/HpDisplay.tsx` tem prop `variant?: "default" | "inline" | "ribbon"` aditivo (default = "default")
- [ ] `components/player-hq/v2/RibbonVivo.tsx` existe com prop signature: `characterId, characterName, currentHp, maxHp, hpTemp, ac, initiativeBonus, speed, inspiration, spellSaveDc, conditions, spellSlots, combatActive, combatHref, readOnly, onHpChange, onTempHpChange, onToggleCondition, onSetConditions, onToggleInspiration`
- [ ] `components/player-hq/v2/SlotSummary.tsx` passa `inverted={isPlayerHqV2Enabled()}` ao SpellSlotGrid (P1-1 fix aplicado inline)
- [ ] `components/player-hq/v2/HeroiTab.tsx` tem grid 2-col `xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]` quando V2
- [ ] `lib/hooks/useCampaignCombatState.ts` linha 105: `onCombatEnded?: (snapshot: PostCombatSnapshot | undefined) => void` (P0-1 fix aplicado)
- [ ] `useCampaignCombatState.ts` linha ~205: callback fires **sem** gate em `payload.snapshot` (P0-1 fix)
- [ ] `useCampaignCombatState.ts` subscreve `campaign:${id}` consolidado (NÃO `combat:${id}`)
- [ ] `lib/realtime/campaign-combat-broadcast.ts` existe + `broadcastCombatStarted/Ended/TurnAdvance` exports
- [ ] `components/combat-session/CombatSessionClient.tsx` emite os 3 eventos quando combate inicia/termina/avança turno
- [ ] `components/player-hq/v2/CombatBanner.tsx` existe — slide-from-top 300ms
- [ ] `components/player-hq/v2/HeroiTab.tsx` mounta `<PostCombatBanner />` quando `postCombat.visible && postCombat.snapshot`
- [ ] `handleCombatEnded` callback em HeroiTab constrói snapshot do `characterRef.current` (NÃO usa `_payloadSnapshot`)
- [ ] 4 E2E specs em `e2e/features/`: `ribbon-vivo-sticky`, `two-col-desktop-layout`, `player-hq-combat-auto`, `ribbon-combat-parity-anon`

**Se algum item falha**: produza lista, decida se é regressão crítica (rollback?) ou bug docado em followup. Se é regressão crítica e não está em followup: **PARE** e reporte pro Dani imediatamente — pode precisar revert ou hotfix antes de Wave 4 começar.

#### Pass D — Audit das regras absolutas do CLAUDE.md

Esta é a parte que o adversarial review pode ter perdido (porque foi por PR, não por commit final). Precisamos verificar agora que o estado FINAL de master cumpre todas as regras travadas:

**Vocabulário Ubíquo:**
```bash
# Buscar "DM" em código user-facing recente. Aceitar só dmOnly/isDm/role='dm'/Pocket DM.
rtk grep -ni "\\bDM\\b" components/player-hq/v2/ --glob "**/*.tsx"
rtk grep -ni "\\bDM\\b" messages/ --glob "**/*.json"
```
Outputs aceitáveis: nada user-facing. Falsos positivos OK em comentários técnicos referenciando `role='dm'` ou contrato Supabase.

**HP Tiers em EN:**
```bash
# Garantir que HP tier labels não foram traduzidos em pt-BR
rtk grep -i "Cheio\\|Levemente\\|Gravemente\\|Crítico" messages/pt-BR.json
```
Output esperado: nada. Tier labels FULL/LIGHT/MODERATE/HEAVY/CRITICAL ficam em EN nos 2 locales.

**Combat Parity Rule:**
- Sub-zero: dot inversion afeta SpellSlotsHq (Auth /sheet) + SpellSlotTracker (Auth /combat + Anon /join). Guest /try não tem caster — coberto via 5 unit tests no primitive (não E2E). ✅
- Wave 3a: RibbonVivo é V2-shell-only; Anon /join hits PlayerJoinClient (não V2). Documentado como "regression net" mas STRICT rule não cumprida — issue #90 P3-2.
- Wave 3b: AbilityChip é Auth-only por design (parity-intent block presente). Anon vê chip estático (clickable=false). ✅
- Wave 3c: Diário é Auth-primário; anon empty state existe mas nunca é alcançado em prod (sheet route força login) — issue #89 P1-1.

**Resilient Reconnection Rule:**
- Wave 3a `useCampaignCombatState` cleanup OK (verificado pelo adversarial review)
- Não introduziu pagehide/visibilitychange handlers conflitantes
- Tests de regressão `adversarial-visibility-sleep` + `adversarial-wifi-bounce` parsam (mas CI Playwright skip — issue #84 P1-2)

**SRD Content Compliance:**
- Nenhum dado SRD em /public foi tocado por Wave 3
- Não ouve mexida em `data/srd/` ou `public/srd/`
- ✅ por exclusão

**SEO Canonical:**
- Wave 3 não tocou `lib/seo/`, `app/**/page.tsx` (auth-gated), nem `app/sitemap.ts`
- ✅ por exclusão

**Migration ordering:**
- Mig 187 aplicada e em sync ✅
- Próxima mig esperada: 188 (Wave 4 E1 — `level_up_invitations`)

### Output esperado da Etapa 0

Antes de começar QUALQUER trabalho de Wave 4, reporte ao Dani UMA mensagem com:

1. **Estado verificado** — checklist Pass A/C/D com ✅ ou ⚠️ (com link pro arquivo:linha se ⚠️)
2. **Findings novos** (se houver) — qualquer regressão grave que o adversarial review missed
3. **Decisão sobre followup issues** — sua recomendação (consumir agora vs defer Sprint 9) + pergunta direta pro Dani escolher
4. **Confirmação Wave 4 OK pra prosseguir** OU **lista de blockers** que ele precisa resolver antes

Se a Etapa 0 levar mais de 1h, ainda assim FAÇA. É barato comparado ao custo de continuar em cima de uma fundação podre.

---

## Contexto da missão (após Etapa 0)

**Wave 4 = EP-5 Level Up Wizard**, escopo definido em [13-epics-waves.md §EP-5](13-epics-waves.md) + [09-implementation-plan.md §E1-E7](09-implementation-plan.md) + [PRD-EPICO-CONSOLIDADO.md decisão #41](PRD-EPICO-CONSOLIDADO.md).

### Outcome alvo

Mestre libera level up via UI; jogador vê chip "🎉 Subir de Nível →" no ribbon (RibbonVivo já tem ponto de extensão); clicar abre wizard 6 passos (Class → HP → ASI/Feat → Spells → Features → Subclass → Final Review); confirm UPDATE character + broadcast `levelup:completed`; auto-expire após 7 dias via cron/trigger.

### Stories (E1-E7)

| ID | Story | Effort | Risk |
|---|---|---|---|
| **E1** | Migration `level_up_invitations` + RLS | M (4-6h) | Med |
| **E2** | UI Mestre — botão "Liberar Level Up" | L (8-10h) | Med |
| **E3** | Chip dourado no ribbon + `useLevelUpInvitation` | S (3-4h) | Low |
| **E4** | Wizard esqueleto + Steps 1-2 (Class + HP) | L (8-12h) | Med |
| **E5** | Steps 3-4 (ASI/Feat + Spells) | L (10-14h) | **High** (5e rule combinatorics) |
| **E6** | Steps 5-6 (Features + Subclass + Final Review) | M (6-8h) | Med |
| **E7** | UI Mestre completion feedback + cancel + auto-expire | S (3-4h) | Low |

**Total estimate:** ~42-58h. Wave 4 é mostly serial (a wizard internal) — paralelismo limitado a 2 tracks máx.

### Parallelization

**Track A (Mestre side + Player chip):** E1 (migration) → E2 (Mestre release UI) → E3 (ribbon chip) → E7 (completion feedback). Linear-ish.
**Track B (Wizard body):** E4 (shell + Steps 1-2) → E5 (Steps 3-4) → E6 (Steps 5-6 + Final Review). **Strictly serial** — each step depends on `choices jsonb` contract from previous.

**Sprint plan original prevê 2 sprints (S7+S8) pra Wave 4.** Você pode comprimir em 1 wave seguindo o padrão Wave 3, mas E5+E6 (5e rule validation) podem encostar em scope creep — esteja preparado pra defer alguma sub-story (ex: subclass validation per class) pra Sprint 9.

### Risk register (do plan §EP-5)

| # | Risk | Mitigation |
|---|---|---|
| **R5** | 5e rule validation (ASI cap 20, half-feats, multiclass prereqs, spells-known per class/level) é combinatória enorme. Splitting between agents risca divergent validation. | Sprint 6 plan said "unit-test 5e validation FIRST" — `lib/levelup/validate-level-up-choices.ts` skeleton + exhaustive unit tests per class × level × decision branch BEFORE E4 starts. Freezes contract. |
| | `level_up_invitations` migration em prod — RLS dual-auth + TTL trigger + auto-expire cron | Mestre full CRUD; Player read/update próprio; auto-expire cron diário OR trigger Postgres on read with `expires_at < now()` |
| | Wizard shell + 6 steps `choices jsonb` schema drift | Frozen contract via Sprint 6 unit tests (citado acima). Step N só pode ler / escrever campos predefinidos no jsonb schema. |

## Docs OBRIGATÓRIOS pra ler ANTES de qualquer ação

1. [25-wave-3-retrospective-and-state.md](25-wave-3-retrospective-and-state.md) — estado completo do que acabou de ser entregue
2. [13-epics-waves.md §EP-5](13-epics-waves.md) — Level Up Wizard outcome + parallelization
3. [09-implementation-plan.md §E1-E7](09-implementation-plan.md) — acceptance criteria detalhados por story
4. [PRD-EPICO-CONSOLIDADO.md decisão #41](PRD-EPICO-CONSOLIDADO.md) — UX + behavior decisions (Mestre libera, Player roda, fallback CharacterEditSheet preserved)
5. [12-reuse-matrix.md §2.7](12-reuse-matrix.md) — Level Up Wizard component breakdown + REUSE table (CharacterEditSheet preserved como fallback)
6. [15-e2e-matrix.md §3 Fase E + §4 Gate Fase E + §6 rows 42-48](15-e2e-matrix.md) — 7 P0 specs Gate E
7. [14-sprint-plan.md §Sprint 7 + Sprint 8](14-sprint-plan.md) — sprint breakdown that you may compress into 1 wave
8. [docs/supabase-migration-runner.md](../../docs/supabase-migration-runner.md) — migration cadence (canonical pattern: aplicar via `supabase db push --linked` ANTES de mergear)
9. `CLAUDE.md` (regras imutáveis — Mestre/HP tiers/Combat Parity/Resilient/SRD/SEO)
10. Memory files (carregadas auto): `feedback_levelup_mestre_libera`, `feedback_adversarial_review_default`, `feedback_multi_agent_commits`, `feedback_executar_sem_pedir_permissao`, `project_supabase_cli_setup`, `feedback_pocket_dm_presencial_nao_vtt`

## Decisões já travadas (NÃO reabrir sem novo party-mode)

| Item | Decisão | Doc |
|---|---|---|
| Quem libera level up | **Mestre libera, Player roda wizard** | PRD #41 + memory `feedback_levelup_mestre_libera` |
| Fallback `✎ Editar` | **CharacterEditSheet preserved** — Mestre override quando wizard inappropriate | PRD #41 |
| Wizard steps | **6 passos: Class → HP → ASI/Feat → Spells → Features → Subclass → Final Review** | plan §E4-E6 |
| Auto-skip Step 1 | **Single-class auto-skip Class step** | plan §E4 |
| HP roll vs média | **Both options offered Step 2**; HP min validated (1 + CON mod) | plan §E4 |
| ASI cap | **20** | 5e RAW |
| ASI canonical levels | **4, 8, 12, 16, 19** (per class — varies for some) | 5e RAW |
| Half-feat support | **Yes** (1 pt + meio-feat) | plan §E5 |
| Migration | **`level_up_invitations` table NOVA** em mig 188 | plan §E1 |
| TTL | **7 dias default** | plan §E1 |
| RLS | **Mestre full CRUD; Player read/update próprio** | plan §E1 |
| Auto-expire | **Cron diário OR trigger Postgres** (Sprint 9 alternative) | plan §E7 |
| Ribbon chip | **"🎉 Subir de Nível →"** quando invitation pending — pulse gold | plan §E3 |
| Channel | **Reuse `campaign:${id}` consolidated** — broadcast events `levelup:offered/completed/cancelled` | R3 mitigation |
| Wizard state persist | **`choices jsonb` em `level_up_invitations`** — resume mid-wizard se fecha | plan §E4 |
| Audit trail | **`choices jsonb` é o audit trail** — frozen post-completion | plan §E6 |
| Confirm completion | **UPDATE character + status='completed' + broadcast** atomicamente | plan §E6 |
| Cancel | **Mestre pode cancelar pending** — broadcast `levelup:cancelled` | plan §E7 |

## Regras absolutas (violação = rollback)

- **"Mestre", nunca "DM"** em UI/i18n/comentários user-facing
- **HP tier labels EN** nos 2 locales
- **Combat Parity Rule**: Wizard Level Up é **Auth-only por design** (precisa personagem persistente). Documente com `<!-- parity-intent guest:n/a anon:n/a auth:full -->`. Não tente fazer Wizard rodar pra Anon.
- **Resilient Reconnection Rule**: `useLevelUpInvitation` polling fallback (similar ao useCampaignCombatState do Wave 3a)
- **rtk em TODOS comandos** (inclusive em chains com `&&`)
- **NÃO merge autônomo** sem confirmação do Dani (exceção: docs-only PRs)
- **NÃO force push em master**
- **NÃO bypass hooks** (`--no-verify`)
- **NÃO usar `supabase db reset --linked`** — destrutivo
- **`--include-all` ao push** se migration chegar out-of-order
- **Toda PR com migration roda `supabase db push --linked` ANTES de mergear** — sprint 3 pagou caro por isso
- **Pocket DM rastreia DADOS, não é VTT** — Wizard só altera dados de personagem (level, HP max, ASIs, spells learned, slot pools, features, subclass). NÃO adicionar UI de "Atacar/Mover" — não faz sentido no contexto.
- **Wave 3 follow-up issues NÃO são desta wave** (exceto se Dani decidir consumir antes — Etapa 0 Pass B)

## Workflow esperado

1. **Etapa 0 obrigatória** (descrita acima) — review completo da Wave 3 + decisão sobre follow-ups
2. Após confirmar Wave 4 OK pra prosseguir:
   - Pre-flight verifications (já feito na Etapa 0)
   - **Sprint 6 prep work**: extrair `lib/levelup/validate-level-up-choices.ts` skeleton + exhaustive unit tests por class × level × decision. **CONTRATO FROZEN antes do E4 começar** — R5 mitigation crítica.
   - 2 worktrees em paralelo:
     - **Track A**: `feat/wave-4-track-a` — E1 + E2 + E3 + E7 (Mestre side + Player chip)
     - **Track B**: `feat/wave-4-track-b` — E4 + E5 + E6 (Wizard shell + steps, strictly serial)
   - Migration 188 deve ser criada por Track A E1 + aplicada via `supabase db push --linked` ANTES de mergear PR Track A
3. Adversarial 3-reviewer review por PR (default per `feedback_adversarial_review_default.md`). Reviews podem encontrar P0/P1 — aplicar fixes inline, não delegate pra Sprint 9 quando é blocker real (foi como Wave 3a fluiu)
4. Merge ordem:
   - Sprint 6 prep (validation helpers PR, opcional separado) primeiro
   - Track A E1 (migration 188 + Mestre release) → aplicar mig → mergear
   - Track A E2/E3/E7 podem mergear conforme prontos
   - Track B E4 → E5 → E6 strictly serial; cada um requer review + merge antes do próximo começar
5. Cleanup ao fim: worktrees + branches + final retrospective doc + Wave 4 kickoff prompt for next session

## Memória persistente (carregada automaticamente)

Pontos-chave pra esta sessão (ver `c:\Users\dani_\.claude\projects\c--Projetos-Daniel-projeto-rpg\memory\MEMORY.md`):

- `feedback_levelup_mestre_libera.md` — vocabulary travado: Mestre libera, Player roda wizard
- `feedback_adversarial_review_default.md` — 3-reviewer adversarial é default
- `feedback_executar_sem_pedir_permissao.md` — pular "quer que eu faça X?" no fim
- `feedback_combate_so_visual_logica_intocada.md` — combat changes preservam lógica intocada (relevant: Wizard altera dados de personagem mas NÃO altera lógica de combate)
- `feedback_pocket_dm_presencial_nao_vtt.md` — app rastreia DADOS, não adiciona Atacar/Mover/Reação UI
- `project_supabase_cli_setup.md` — CLI funcional, comandos canônicos
- `project_realtime_rate_limit_root_cause.md` — Supabase capacity (channel cap 200 + CDC pool); Wave 4 usa `campaign:${id}` consolidado (não criar canal novo)
- `feedback_multi_agent_commits.md` — commit+push a cada batch (<15min)
- `feedback_worktree_cleanup.md` — cleanup seguro com patches preservados; Windows requer PowerShell `Remove-Item -Recurse -Force`
- `feedback_mestre_broadcast_obrigatorio.md` — toda mutação Mestre faz broadcast (Mestre libera level up = broadcast `levelup:offered`)
- `project_recharge_state_dm_only.md` — recharge_state Mestre-only por design (relevant pra Wizard pq E5 spell slots recalc afeta state que jogador NÃO controla diretamente — Mestre confirma)

## Ação imediata (começa por aqui)

```bash
# 1. ETAPA 0 — verificações de saúde
cd "c:/Projetos Daniel/projeto-rpg"
rtk git status
rtk git log --oneline -8
rtk gh pr list --state open --base master
supabase migration list --linked
rtk tsc --noEmit
rtk lint
rtk vitest run --run

# 2. ler retrospective
cat _bmad-output/party-mode-2026-04-22/25-wave-3-retrospective-and-state.md
# OU mais elegante: Read tool
```

Após verificações verdes, faça o audit Pass C/D contra os 4 squash commits (cada checkbox da Etapa 0). Reporte tudo ao Dani em UMA mensagem conforme spec acima.

**Pergunta pro Dani**: "OK pra começar Wave 4? E quanto aos 4 follow-up issues — consumir agora (recomendado) ou Sprint 9?"

Após resposta dele:
- Se "Sprint 9": pula direto pra Sprint 6 prep work (validation helpers) + 2 worktrees Wave 4
- Se "consumir agora": abra 4 worktrees pequenos pros 4 issues + 4 background agents + adversarial review + merge ordenado, DEPOIS Wave 4

## Riscos conhecidos (do plan §EP-5)

| Risco | Mitigation |
|---|---|
| **R5 5e rule combinatorics** | Validation helpers EXAUSTIVOS unit-tested ANTES de E4 começar. NÃO entrar no wizard antes do contrato `choices jsonb` estar frozen. |
| **Multiclass prereqs** (DEX 13 pra rogue, INT 13 pra wizard, etc) | Tabular validation per class — não inline ad-hoc. Reuse RAW tables se já existem no codebase. |
| **Spells-known recalc per class/level** | Pega de table 5e canônica (ex: bard knows 4 cantrips at lv1, 5 cantrips at lv4, etc). NÃO inventar. |
| **`choices jsonb` schema drift entre steps** | Schema TypeScript type per step (Step1Class, Step2Hp, ...) — Step N só lê campos que Step <N escreveu. |
| **Cancel mid-wizard** | Step state persisted em `choices jsonb`; reopen no ribbon chip retoma do último step salvo. NÃO reset ao Step 1. |
| **Mestre cancel + Player completed simultâneo** | Race UPDATE: usar conditional update `WHERE status = 'pending'` — primeiro a chegar wins, segundo pega 0 rows + UI graceful refresh. |
| **CharacterEditSheet fallback regrede** | E2E spec preserva o flow `✎ Editar` manual mesmo com Wave 4 ativo. Não quebrar isso. |
| **Auto-expire cron** | Decisão pendente: Postgres trigger on read (cheap, idempotent) OU cron diário (complexity tradeoff). Decidir em E7. |

## Wave 5 (informativo, NÃO escopo desta sessão)

Após Wave 4 mergear, próximas frentes:
- **Sprint 9 — QA polish**: consumir os 4 follow-up issues #84/#88/#89/#90 se não foram consumidos no início desta wave + a11y axe extension to /sheet?tab=* + Lighthouse + visual regression baselines
- **Sprint 10 — Flag flip**: `NEXT_PUBLIC_PLAYER_HQ_V2=true` em prod, V1 path retire (delete `components/player-hq/v2/*` directory shim, delete legacy 7-tab shell, delete `lib/flags/player-hq-v2.ts`)
- **v1.5 backlog**: D3 backlinks `@` parser (deferred per MVP cut), D6-D9 Biblioteca + favorites + Ctrl+K (deferred)

---

## Fim do prompt (copiar até aqui)

---

## Notas de uso (Dani-only, não copiar)

- Esta handoff assume que NADA do Wave 3 será revertido. Se algum follow-up issue revelar bug grave, faça PR de revert antes de Wave 4 começar.
- Etapa 0 é OBRIGATÓRIA — não pule. O custo de pular é potencialmente shipping V2 com bugs em Sprint 10 (cara de te pegar de surpresa).
- Se o agente reportar findings na Etapa 0 que parecem críticos, considere abrir uma sessão BMAD party-mode para deliberar (Winston + Amelia + Quinn) antes de Wave 4 começar.
- Mig 188 (`level_up_invitations`) sequence assume nada chega out-of-order. Verifique antes via `supabase migration list --linked`.
- Se Track A (E1 migration) atrasar, Track B (Wizard body) pode começar em paralelo SEM o broadcast (mock o `useLevelUpInvitation` pra retornar invitation hardcoded). Mas idealmente E1 mergea primeiro.
