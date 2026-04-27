# Wave 3 Kickoff Prompt — New Session

**Generated:** 2026-04-27 (Sprint 3 Wave 2 fechada, Supabase CLI online)
**Master HEAD:** `daf78303`
**Open PRs:** 0 (Sprint 3 fully merged + DB in parity)

---

## Uso

Copia o bloco entre os 2 separadores `---` abaixo e cola como primeira mensagem em uma nova janela do Claude Code no repo `c:\Projetos Daniel\projeto-rpg`. Sessão nova assume o estado consolidado em 2026-04-27 fim do dia (Sprint 3 Wave 2 entregue + DB sincronizado + Supabase CLI funcional).

---

## Prompt (copiar tudo abaixo deste separador)

---

Você está assumindo a sessão de **Wave 3 do projeto Grimório (Player HQ Redesign V2)** no projeto **Pocket DM** (Next.js / TypeScript / Supabase / Tailwind / Playwright). Mestre-target: 25-35 anos, presencial, estilo Curse of Strahd, 60/40 combat/RP.

A Sprint 3 (Wave 2) foi entregue 100% em 2026-04-27 — 4 tabs Herói/Arsenal/Diário/Mapa funcionando com flag-gate. Wave 3 abre 3 frentes paralelas com a maior complexidade do redesign até agora.

## Contexto da missão

**Wave 3 = 3 sub-waves paralelizáveis** per [13-epics-waves.md §5 Wave 3](_bmad-output/party-mode-2026-04-22/13-epics-waves.md):

- **3a** (EP-3 Ribbon Vivo + Modo Combate Auto): C1+C2+C3+C4+C5 — ~5 PRs
- **3b** (EP-3 AbilityChip Roller): C7 — ~1 PR maior
- **3c** (EP-4 Diário + mini-wiki + cross-nav): D1+D2+D4+D5 — ~5 PRs

Total esperado: **~11 PRs**, novamente o sprint mais pesado do redesign. Adversarial 3-reviewer review é default.

**⚠️ DECISÃO QUE PRECISA DE CONFIRMAÇÃO DO DANI ANTES DE COMEÇAR:**

Wave 3a + 3b tocam surface de combate (RibbonVivo lê HP em tempo real, AbilityChip faz broadcast pro Mestre, useCampaignCombatState assina canal `combat:*`). A Sprint Estabilidade Combate Sprint 1 já mergeou (commit `66579ab0`), mas pode haver Sprint 2+ planejada que conflita. **Pergunta obrigatória antes de dispatchar 3a/3b**: "Estabilidade Combate tem sprint em andamento? Se sim, devo começar só por 3c (Diário) que é zero-combat-touch?"

## Estado de master @ `daf78303` (2026-04-27)

```
daf78303  chore(grimório): Sprint 3 prod-deploy bundle + CLI docs + permissions (#79)
2fd65f98  feat(grimório): WINSTON_REVIEW_REQUIRED migration 185 hit_dice backfill (#69)
de2fbacc  fix(supabase): rename 184 → 186 to resolve version collision (#80)
66579ab0  feat(realtime): Estabilidade Combate Sprint 1 — connection resilience hardening
56ce1d98  feat(grimório): B2b/B2c/B2d wrappers consolidated (#78)
2a45c637  feat(grimório): B2a HeroiTab wraps the 8 sections (#74)
bf3bf7d6  test(grimório): B6 E2E suite — Gate Fase B (#67)
e939ac9e  chore(grimório): tech debt sweep (#64)
bf8e8279  feat(grimório): A4 fill HD + CD chips from migration #58 (#68)
c6fbd9ee  feat(grimório): B5 keyboard shortcuts (#66)
1271abae  feat(grimório): B3 deep-link redirects (#63)
2caf7df3  feat(grimório): B1 PlayerHqShell V2 4-tab spine (#62)
ae1687d5  feat(grimório): B4 usePlayerHqTabState hook (#65)
8e70fed4  docs(grimório): Sprint 3 (Wave 2) kickoff prompt (#61)
```

**Migrations no DB (verificado via `supabase migration list --linked`):** 184 (combat_events), 185 (hit_dice backfill), 186 (player_characters DDL) — todas registered + applied. `hit_dice` + `class_resources` columns existem com 11 personagens backfilled.

**Vercel envs:** `NEXT_PUBLIC_PLAYER_HQ_V2=true` em Preview/Dev, `false` em Production. Mexe quando Wave 4 estabilizar.

## ⭐ Mudança grande desde Sprint 3 — Supabase CLI funcional

**Não precisa mais pedir pro Dani aplicar SQL via Dashboard.** A CLI está instalada + linkada + autenticada com PAT que vive no keychain do user `dani_` (todo agente herda):

```bash
supabase migration list --linked        # vê pending
supabase db push --linked --dry-run     # preview
supabase db push --linked               # aplica
supabase db push --linked --include-all # se chegou migration out-of-order
```

**Wave 3 cria UMA migration nova:** D1 `player_notes` table (com RLS dual-auth user_id XOR session_token_id). Ao terminar de implementar, o agente do Track 3c roda `supabase db push --linked` e a migration aplica direto. **Nunca ficar com PR mergeado + migration não aplicada** — foi o P0 da Sprint 3.

Doc canônico: `docs/supabase-migration-runner.md`. Memory persistida: `project_supabase_cli_setup.md`.

## Docs OBRIGATÓRIOS pra ler ANTES de qualquer ação (nesta ordem)

1. `_bmad-output/party-mode-2026-04-22/14-sprint-plan.md` §Sprint 5 + §Sprint 6 (Wave 3 escopo dividido em 2 sprints originais — vamos comprimir em 1 conforme padrão estabelecido)
2. `_bmad-output/party-mode-2026-04-22/13-epics-waves.md` §EP-3 (Ribbon + AbilityChip + Combat Auto) + §EP-4 (Diário)
3. `_bmad-output/party-mode-2026-04-22/09-implementation-plan.md` §C1-C7 + §D1-D5 (acceptance criteria detalhados)
4. `_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md` §2 (modo combate) + §3 (ribbon anatomy)
5. `_bmad-output/party-mode-2026-04-22/05-wireframe-diario.md` (Minhas Notas + sub-nav)
6. `_bmad-output/party-mode-2026-04-22/02-topologia-navegacao.md` §⚔ Modo Combate Auto (regras definitivas)
7. `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md` §Gate Fase C + §Gate Fase D (12 specs P0)
8. `_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md` decisões #31, #33, #37, #39, #44, #45, #46 (ribbon + abilities + dot inversion + concentration)
9. `_bmad-output/party-mode-2026-04-22/12-reuse-matrix.md` §7 (consolidations já feitas — SpellSlotGrid + Dot primitive + Drawer)
10. `CLAUDE.md` (regras imutáveis, especialmente Combat Parity Rule + Resilient Reconnection)

## Itens dormant da Sprint 3 que Wave 3 endereça

### Wire-ups que ficaram pendentes (alta prioridade pro 3a)

1. **A6 PostCombatBanner mount em HeroiTab** — component já existe em `components/player-hq/v2/PostCombatBanner.tsx`, hook em `lib/hooks/usePostCombatState.ts`. Foi deferido na Sprint 3 porque combat-adjacent. Wave 3 monta no HeroiTab com `useCampaignCombatState` (C4) detectando `combat:ended` → mostra banner full-screen.
   - **TODO comment já existe** em `components/player-hq/v2/HeroiTab.tsx` perto do return — procurar `TODO(post-combat)`.

2. **Anon nav wire** — `components/player/PlayerJoinClient.tsx#handleAuthModalSuccess` precisa ler `redirectTo` prop e fazer `router.push(redirectTo)`. Sprint 3 deixou a prop como DOM contract — Wave 3 wires real navigation.

### Tech debt menor (médio)

3. **CharacterAttributeGrid deletion** — foi marcado pra deletar quando AbilityChip (C7) shippar. Verificar via grep antes de deletar.

4. **Dot inversion** (decision #37) já foi tratado em Sprint 4 do plano original via "C-side chores" — confirmar via grep que SpellSlotsHq + ResourceDots usam o `<Dot semantic="transient" inverted />` primitive. Se não, é PR rápido aqui.

5. **Concentration color** (decision #45) — `--concentration` token #7DD3FC. Verificar `ActiveEffectsPanel.tsx` + `ActiveEffectCard.tsx` + `SpellCard.tsx`. Se ainda usam `--warning`, swap.

## Stories Wave 3 (do plan §C + §D)

Ler `09-implementation-plan.md` para AC completos. Highlights:

### EP-3 Ribbon + Combat Auto (3a)
- **C1**: `<RibbonVivo />` sticky 2-line, 56px desktop / 48px mobile. HP bar + AC/Init/Speed/Insp/CD + slots + condições + active effects compact.
- **C2**: `<SlotSummary />` sub-component (usa `<SpellSlotGrid variant="ribbon" />` do EP-0).
- **C3**: HeroiTab 2-col desktop layout (CSS Grid `grid-template-areas`, CLS <0.1).
- **C4**: `useCampaignCombatState` hook — subscribe ao canal `campaign:${id}` (consolidado, NÃO criar canal novo per R3 mitigation), 10s polling fallback. Channel-leak assertion no test.
- **C5**: `<CombatBanner />` + Modo Combate Auto reorg — quando `active=true`, banner slide-from-top 300ms + Col A/B swap + FAB 📝.

### EP-3 AbilityChip Roller (3b)
- **C7**: AbilityChip (CHECK + SAVE zones) + dice-roller utility + `useAbilityRoll` hook + `<RollResultToast />`. Long-press menu (Advantage/Disadvantage). Broadcast pro Mestre via mesmo canal `campaign:${id}` em <500ms. Roll history em `roll_history` table (verificar se existe; se não, é uma 2a migration).

### EP-4 Diário + mini-wiki (3c)
- **D1**: `supabase/migrations/187_player_notes.sql` — table com dual-auth (user_id XOR session_token_id), tags array + GIN index, RLS deny-all + own-rows-only policy. **Aplicar via `supabase db push --linked` no fim do PR.**
- **D2**: `MinhasNotas.tsx` + `MarkdownEditor.tsx` — textarea + preview MVP, auto-save 30s, search local (text + tags).
- **D4**: Cross-nav Diário ↔ Mapa — NpcCard ganha "Ver no Mapa" link, drawer do Mapa ganha tab "Notas" linkando pro Diário.
- **D5**: `usePlayerNotifications` hook + badge na Diário tab — subscribe `note:received` / `quest:assigned` / `quest:updated` events.

## Decisões travadas (NÃO reabrir sem novo party-mode)

| Item | Decisão | Doc |
|---|---|---|
| Ribbon altura | 56px desktop, 48px mobile compacto + expand button | wireframe-heroi §1 |
| Modo Combate Auto | Detect via `combat:started`/`combat:ended` broadcast no canal `campaign:${id}` consolidado | topologia §⚔ |
| Layout 2-col | Só desktop ≥1280px. <1280 = single-col | topologia §📱 |
| AbilityChip CHECK vs SAVE | Two zones por chip — CHECK = 1d20+mod, SAVE = 1d20+mod+PB se prof | PRD #44 |
| Dot semantics | `permanente`: ●=tenho, ○=não / `transitório`: ●=usado, ○=disponível | PRD #37 |
| Concentração color | `--concentration` (#7DD3FC sky), nunca `--warning` | PRD #45 |
| Save destacado | Gold accent quando proficient | PRD #46 |
| Combat reorg "não força troca de tab" | Banner aparece em Herói mas se jogador estiver em Diário, fica em Diário | topologia §⚔ |
| Channel consolidation | C4 reusa canal existente — NUNCA criar `combat:${id}` separado (R3 quota mitigation) | reuse-matrix §8 |
| Diário sub-nav state | Local state em DiarioTab (já implementado em #76) — NÃO persistir cross-session no MVP | spec |
| RLS player_notes | Dual-auth user_id XOR session_token_id (anon player precisa criar conta pra persistir) | PRD #24 |

## Regras absolutas (violação = rollback)

- **"Mestre", nunca "DM"** em UI/i18n/comentários user-facing
- **HP tiers EN** nos 2 locales
- **Combat Parity Rule STRICT pra C1, C2, C5** — Anon (`/join`) DEVE ter ribbon funcional + receber broadcasts. C7 ability roller é Auth-only (documentar com `<!-- parity-intent guest:n/a anon:n/a -->`)
- **Resilient Reconnection Rule** — C4 hook subscription deve passar [adversarial-visibility-sleep](e2e/combat/adversarial-visibility-sleep.spec.ts) + [adversarial-wifi-bounce](e2e/combat/adversarial-wifi-bounce.spec.ts)
- **rtk em TODOS comandos** (inclusive em chains com `&&`)
- **NÃO merge autônomo** sem confirmação do Dani (exceção: docs-only PRs, infra clean)
- **NÃO force push em master**
- **NÃO bypass hooks** (`--no-verify`)
- **NÃO usar `supabase db reset --linked`** — destrutivo, dropa tudo no remote
- **`--include-all` ao push** se migration chegar out-of-order
- **Toda PR com migration roda `supabase db push --linked` ANTES de mergear** — não deixar acumular pending. Sprint 3 pagou caro por isso.

## Workflow esperado (replicar Sprint 3)

1. **Pre-flight**:
   ```bash
   cd "c:/Projetos Daniel/projeto-rpg"
   rtk git checkout master && rtk git pull
   supabase migration list --linked  # confirmar paridade
   ```

2. **Confirmar com Dani**: combat-adjacent OK pra começar 3a/3b? Ou só 3c primeiro?

3. **Criar 3 worktrees pra paralelizar**:
   ```bash
   rtk git worktree add .claude/worktrees/wave-3-track-3a -b feat/ep-3-wave-3-ribbon master
   rtk git worktree add .claude/worktrees/wave-3-track-3b -b feat/ep-3-wave-3-ability master
   rtk git worktree add .claude/worktrees/wave-3-track-3c -b feat/ep-4-wave-3-diario master
   ```

4. **Dispatch 3 agents em background** (1 por sub-wave, scope bem definido):
   - **3a**: C1 RibbonVivo → C2 SlotSummary → C3 2-col layout → C4 useCampaignCombatState → C5 CombatBanner+Modo Auto + A6 mount
   - **3b**: C7 AbilityChip + dice-roller + useAbilityRoll + RollResultToast
   - **3c**: D1 migration → D2 MinhasNotas+MarkdownEditor → D4 cross-nav → D5 notifications

5. **Coordination rules**:
   - 3a + 3b tocam `CharacterCoreStats.tsx` (3a no layout reorg, 3b no chip swap). C7 rebases on C3 quando C3 mergear.
   - 3a + 3b assinam o mesmo canal `campaign:${id}` — NÃO criar canal novo (R3 mitigation crítica per memória `project_realtime_rate_limit_root_cause`)
   - 3c independente — zero conflito com 3a/3b
   - HpDisplay variant change (3a usa) é additive, não breaking

6. **Adversarial code review** quando PR abre — 3-reviewer pattern (Blind Hunter + Edge Case Hunter + Acceptance Auditor) per `feedback_adversarial_review_default.md`. Modelo: 1 Agent por PR em paralelo, prompts ~500-800 palavras.

7. **Apply fixes** identificados antes do merge.

8. **Merge ordem** com `rtk gh pr merge <#> --squash --admin` (admin OK porque você é o único collab):
   - Migration D1 PRIMEIRO + roda `supabase db push --linked` antes de mergear
   - 3a internal order: C4 → C1 → C2 → C3 → C5 (cada um depende do anterior)
   - 3b: C7 sozinho mas rebase em C3 antes de mergear
   - 3c: D1 já aplicado → D2 → D4 → D5 (D2 → D5 ordem flexível)

9. **Cleanup**: ao fim, `rtk git worktree remove .claude/worktrees/wave-3-*` + delete branches local + remoto.

## Memória persistente (carregada automaticamente)

Pontos-chave pra esta sessão (ver `c:\Users\dani_\.claude\projects\c--Projetos-Daniel-projeto-rpg\memory\MEMORY.md`):

- `project_supabase_cli_setup.md` — CLI funcional, comandos canônicos, gotchas (collision + --include-all)
- `feedback_executar_sem_pedir_permissao.md` — pular "quer que eu faça X?" no fim
- `feedback_adversarial_review_default.md` — 3-reviewer adversarial é default
- `feedback_combate_so_visual_logica_intocada.md` — combat changes preservam lógica intocada
- `feedback_combate_densidade_sem_esconder.md` — density via spacing, NUNCA hover-to-reveal
- `feedback_dots_pattern.md` — dots permanente vs transitório
- `feedback_concentration_color.md` — sky #7DD3FC, nunca warning
- `project_realtime_rate_limit_root_cause.md` — Supabase capacity (channel cap 200 + CDC pool); CRÍTICO pra C4
- `feedback_mestre_broadcast_obrigatorio.md` — toda mutação Mestre faz broadcast
- `project_recharge_state_dm_only.md` — recharge_state Mestre-only por design
- `feedback_pocket_dm_presencial_nao_vtt.md` — app rastreia DADOS, nunca adiciona Atacar/Mover/Reação UI
- `feedback_levelup_mestre_libera.md` — Wave 4 (Level Up Wizard) será disparado pelo Mestre

## Ação imediata (começa por aqui)

```bash
# 1. Verificar estado
cd "c:/Projetos Daniel/projeto-rpg"
rtk git status
rtk git log master --oneline -5
supabase migration list --linked
rtk gh pr list --state open --base master

# 2. Reportar pra Dani:
#    - "Estado confirmado: master @ daf78303, 0 PRs abertos, DB em paridade (184/185/186)."
#    - "Wave 3 escopo absorvido: 3a Ribbon+Combat Auto (5 PRs), 3b AbilityChip (1 PR), 3c Diário (5 PRs)."
#    - "PERGUNTA: 3a + 3b tocam combat surface (RibbonVivo lê HP, AbilityChip broadcasta). Estabilidade Combate
#      tem sprint em andamento? OK começar 3a/3b ou só 3c por enquanto?"
```

Após Dani confirmar:
- Se "OK 3a/3b": criar 3 worktrees + dispatchar 3 agents background com prompts story-específicos
- Se "só 3c": criar 1 worktree pra `wave-3-track-3c` + dispatchar 1 agent + reservar 3a/3b pra sprint posterior

Quando PRs abrirem, rodar adversarial review 3-reviewer em paralelo. Aplicar fixes. **Migration D1: aplicar via `supabase db push --linked` ANTES de mergear PR**. Merge ordenado. Cleanup ao fim.

## Riscos conhecidos (do plan §EP-3)

| Risco | Mitigation |
|---|---|
| **R1**: Dot inversion parity quebra (já foi parcialmente tratado em Sprint 4 plan original) | Verificar SpellSlotsHq + ResourceDots + SpellSlotTracker antes de C7. Se ainda não inverteram, é trabalho extra. |
| **R3**: Realtime quota — criar canal novo `combat:*` separado do `campaign:*` consolidado quebra a 200-channel cap | C4 hook DEVE reusar canal `campaign:${id}` existente. Test asserta que useSupabase.channel não é chamado pra novo canal. |
| **R4**: CLS >0.1 quando Combat Auto reorganiza Col A/B | Usar CSS Grid `grid-template-areas` com fixed regions. Se CLS exceder, fallback pra `opacity` transitions. Lighthouse CI mede. |
| **R5**: AbilityChip roller broadcast race com Mestre HP edits | C7 broadcast usa fire-and-forget; UI atualiza local imediato; reconciliation via channel é bonus. NÃO fazer await blocking. |
| **R6**: D1 RLS dual-auth (user_id XOR session_token_id) — fácil errar | E2E `player-notes-rls-negative.spec.ts` testa: anon não vê notas de auth, auth1 não vê notas de auth2, anon1 não vê notas de anon2. Esse spec é P0 gate. |

## Wave 4 (informativo, NÃO escopo desta sessão)

Após Wave 3 mergear, Wave 4 = Level Up Wizard (EP-5):
- Mestre libera level up via broadcast `levelup:offered`
- Player vê chip "🎉 Subir de Nível →" no ribbon (E3, depende de C1)
- Wizard 6 passos (Class → HP → ASI/Feat → Spells → Features → Subclass → Review)
- Tabela `level_up_invitations` (nova migration 188 ou similar)
- Sprint 7 owns; também owns migration 186 follow-up (sync trigger `is_primary` em character_resource_trackers per Winston #69 review)

---

## Fim do prompt (copiar até aqui)

---

## Notas de uso (Dani-only, não copiar)

- Esta handoff assume que Estabilidade Combate Sprint 1 é a única em flight do lado combat. Se você abriu Sprint 2 enquanto eu estava na Sprint 3, o agent novo precisa saber pra ajustar 3a/3b scope.
- Se você quer que Wave 3 seja apenas 3c (defer 3a/3b), avisa o agent no início — ele já tem a flag de pergunta.
- Se quer comprimir Wave 3 + Wave 4 em uma sessão (ambicioso), também avisa — o plan original separava.
- Migration D1 (player_notes) será 187 ou 188 dependendo se Wave 4 também ship. Agent decide na hora.
- **Lembre-se**: Vercel `NEXT_PUBLIC_PLAYER_HQ_V2=true` em Preview/Dev mas `false` em Production. Dani decide quando flip prod (decisão futura, provavelmente pós-Wave 4 + QA pass).
