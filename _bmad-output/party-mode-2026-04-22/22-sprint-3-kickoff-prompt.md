# Sprint 3 Kickoff Prompt — New Session

**Uso:** Copiar o bloco entre os 2 separadores `---` abaixo e colar como primeira mensagem em uma nova janela do Claude Code no repo `c:\Projetos Daniel\projeto-rpg`. Sessão nova assume o estado consolidado em 2026-04-24 fim do dia (Sprint 2 Wave 1 entregue) e dispatcha Sprint 3 (Wave 2) com janela de contexto fresca.

---

## Prompt (copiar tudo abaixo deste separador)

---

Você está assumindo uma sessão de execução no projeto **Pocket DM** (Next.js / TypeScript / Supabase / Tailwind / Playwright). O produto é um app de ajuda ao Mestre de RPG de mesa.

## Contexto da missão

Estamos no projeto **Grimório (Campaign + Player Redesign)**. **Sprint 2 Wave 1 foi entregue em 2026-04-24** — 11 PRs merged em master. Hoje é **Sprint 3 dispatch day** (Wave 2).

Sprint 3 = **Wave 2 do redesign**. Objetivo macro: **shell V2 (4 tabs Herói/Arsenal/Diário/Mapa) + wire-up dos artefatos dormant da Wave 1** (PostCombatBanner mount, A4 schema flip, etc.). Esta é a primeira sprint que quebra o shell V1 — flag-gated atrás de `NEXT_PUBLIC_PLAYER_HQ_V2`.

## Estado de master (2026-04-24 fim Sprint 2)

```
39ee2d1d fix(csp): unblock Supabase realtime worker on webkit (#60)
a9fa115f feat(schema): A4 hit_dice + class_resources (184) (#58)
aea8007d feat(grimório): A5 HP inline pattern (#54)
9aad1efb feat(grimório): A4 header 2-line (#52)
695e8f6f test(grimório): Gate Fase A P0 E2E suite (#56)
8a828c63 feat(grimório): A3 perícias 3-col grid (#50)
340b365b feat(grimório): A1 density tokens (#49)
471955af feat(grimório): A6 Post-Combat Screen (dormant) (#55)
79e656e0 fix(i18n): HP tier EN nos 2 locales (#57)
6aaa4e42 feat(grimório): A2 accordion kill (#53)
4aa3a8a5 test(grimório): pre-Sprint 2 guest /try visual baseline (#46)
ff4ca9b0 ci(grimório): update-visual-baselines workflow (#51)
```

- Worktrees vazios. Branches feature deletadas. Sem PRs Sprint 2 abertos.
- Vercel env `NEXT_PUBLIC_PLAYER_HQ_V2=true` em Preview/Dev; `false` em Production.
- CLAUDE.md regras imutáveis ATIVAS: Mestre nunca DM, HP tiers EN, Combat Parity Rule, Resilient Reconnection, SRD compliance, SEO canonical, Densidade visual app-wide.

## Docs OBRIGATÓRIOS pra ler ANTES de qualquer ação (nesta ordem)

1. `_bmad-output/party-mode-2026-04-22/14-sprint-plan.md` §Sprint 3 (Wave 2 escopo)
2. `_bmad-output/party-mode-2026-04-22/13-epics-waves.md` §EP-2 (B-stories)
3. `_bmad-output/party-mode-2026-04-22/09-implementation-plan.md` §B1-B6 (acceptance criteria)
4. `_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md` (HeroiTab destination layout — V2)
5. `_bmad-output/party-mode-2026-04-22/04-wireframe-arsenal.md` + `05-wireframe-diario.md` + `06-wireframe-mapa.md` (3 outras tabs V2)
6. `_bmad-output/party-mode-2026-04-22/02-topologia-navegacao.md` (7→4 tabs migration)
7. `_bmad-output/party-mode-2026-04-22/20-post-combat-screen-spec.md` (PostCombatBanner mount spec)
8. `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md` §Gate Fase B (specs Sprint 3 obrigatórios)
9. `_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md` (decisões 47 — sobretudo as sobre 4-tab nomenclature)
10. `CLAUDE.md` (skim regras imutáveis — feedback_executar_sem_pedir_permissao + adversarial_review_default são default)

## Itens dormant/deferred da Sprint 2 que Sprint 3 endereça

### Wire-ups obrigatórios (alta prioridade)

1. **A6 PostCombatBanner mount em HeroiTab**
   - Component shipped em #55, dormant. `lib/hooks/usePostCombatState.ts` + `components/player-hq/v2/PostCombatBanner.tsx` prontos.
   - Sprint 3 monta: HeroiTab importa `PostCombatBanner` + usa `usePostCombatState()`. Quando `visible: true`, renderiza modal full-screen.
   - Skip guards de 2 specs `e2e/conversion/post-combat-screen-{no-auto-dismiss,state-preserved}.spec.ts` precisam virar `test.skip(process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== 'true', ...)` (1-line flip).
   - **Anon nav wire** — `components/player/PlayerJoinClient.tsx#handleAuthModalSuccess` precisa ler `redirectTo` prop e fazer `router.push(redirectTo)` quando `flagEnabled`. Atualmente o prop é só DOM contract — Sprint 3 wires real navigation.

2. **A4 em-dash → real values** (`PlayerHqShell.tsx` header)
   - PR #58 landou migration 184 com `hit_dice` + `class_resources` em `player_characters`. Schema disponível.
   - 1-line edit: substituir em-dash por `character.hit_dice.max > 0 ? \`${character.hit_dice.max - character.hit_dice.used}/${character.hit_dice.max}\` : placeholder` para HD; mesmo padrão pra CD via `character.class_resources.primary?.max`.

3. **A4 schema backfill** (one-shot)
   - Migration 184 deixou existing rows com `hit_dice = {0,0}` + `class_resources = {}`.
   - Backfill: `UPDATE player_characters SET hit_dice = jsonb_build_object('max', level, 'used', 0) WHERE hit_dice = '{"max":0,"used":0}' AND level IS NOT NULL;`
   - Nova migration `185_backfill_hit_dice_from_level.sql` ou app-level script `scripts/backfill-hit-dice.ts`.

4. **`character_resource_trackers` ↔ `class_resources` sync** (per #58 review note)
   - Migration 057 já tem tracker normalizado autoritativo. `class_resources` é mirror header-otimizado.
   - Sprint 3 short-rest UI: incrementa `character_resource_trackers.current` (autoritativo) + Postgres trigger OU hook mirror para `class_resources.primary`. **Evitar double-write**.

### B-stories Wave 2 (do plan §Sprint 3)

Ler `09-implementation-plan.md` para AC completos. Highlights esperados:
- **B1**: V2 shell scaffold com 4 tabs (Herói / Arsenal / Diário / Mapa). Flag-gated.
- **B2-B5**: Tabs individuais (cada uma é uma sub-story).
- **B6**: Migração de conteúdo (que vivia em V1 sheet/resources/abilities/inventory/notes/quests vai pra Herói/Arsenal/Diário/Mapa).

### Tech debt da Sprint 2 a limpar (médio)

5. **E2E specs tighten** (PR #56 review BH-3/4/5):
   - `sheet-ability-chips-always-visible.spec.ts` substring trap (`text=STR` matches "Strength")
   - `sheet-hp-controls-inline.spec.ts` `has-text("-5")` matches "-50"
   - `combat-hp-edit-ribbon-anon.spec.ts` mesma issue
   - Tighten via `text-is(...)` ou `getByTestId`.

6. **Diretório guest convention** (PR #56 review H4):
   - `e2e/guest/guest-hp-edit-consistency.spec.ts` deveria estar em `e2e/guest-qa/` (existing convention).
   - Mover + atualizar imports.

7. **`tick` dead state** (PR #55 review M1):
   - `lib/hooks/usePostCombatState.ts:170-216` tem `tick`/`setTick` que não fazem nada útil. Remover.

8. **PostCombatBanner spec drift** (PR #55 review M2):
   - Spec §Anatomia tem HP bar visual (`▓▓▓░░░`) + slot dots (`●●○○`). Component renderiza só texto numérico (`45/88 · MODERATE` + `I 2/4`).
   - Sprint 3 mount = momento ideal pra alinhar com spec antes do flag flip.
   - Reusar `formatHpPct()` + `HP_STATUS_STYLES` + `Dot` primitive (Sprint 1 #38).

9. **`no_party` i18n key dead** (PR #55 review M3):
   - `messages/{en,pt-BR}.json:1612` `recap_anon.no_party`. Não tem código que usa. Wire empty state OU remover.

10. **Visual baselines dormant** (infra):
    - `update-visual-baselines.yml` workflow committed mas Supabase secrets ausentes em GH Actions. Workflow pula gracefully.
    - Sprint 3 ou paralelo: configurar Supabase secrets em GH Actions environments (Preview, Production).
    - Alternativa local: usar Docker para regenerar PNGs Linux quando spec visual quebrar.

### Mobile-safari validation (#60 fix landed)

- PR #60 corrigiu CSP `script-src` adicionando `blob:` (root cause: webkit não honra `worker-src` corretamente, fallback pra `script-src`).
- **Validar pós-merge**: rodar `NEXT_PUBLIC_PLAYER_HQ_V2=false npm run e2e:ci` e confirmar mobile-safari recupera os 12 fails (login + combat + journeys).
- Se ainda tem fails: investigar separadamente. Não é Sprint 3 scope, mas vale checar baseline antes de empilhar mais código.

## Decisões travadas (NÃO reabrir sem novo party-mode)

| Item | Decisão | Doc |
|---|---|---|
| 4 tabs canônicas | Herói / Arsenal / Diário / Mapa | PRD #28-29 |
| Sequência post-combat | Combat → Post-Combat → Recap → Herói | spec 20 |
| HP tier labels | EN nos 2 locales (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) | CLAUDE.md |
| Densidade tokens | space-y-2 dentro de card / space-y-3 entre cards / p-3 cards | 08 §2 |
| HP A5 pattern | Inline number input (canonical CombatantRow:540-587) | 08 §14 |
| A4 header layout | `HD x/y · CD x/y · Insp x · [✨ Slots X/Y →]` | 08 §13 |
| Decision #43 redirect | Auth flag ON → /sheet?tab=heroi; Anon mesmo; Guest mantém /app/dashboard | PRD #43 |
| `class_resources` é mirror | `character_resource_trackers` é autoritativo, não double-write | #58 review |
| Combat Parity STRICT | A5 + A6 já marcados; aplicar a Wave 2 também por default | CLAUDE.md |

## Regras absolutas (violação = rollback)

- **"Mestre", nunca "DM"** em UI/i18n/comentários user-facing
- **HP tiers em EN** nos 2 locales (FULL/LIGHT/MODERATE/HEAVY/CRITICAL)
- **Combat Parity Rule**: features de combate batem 3 modos (Guest/Anon/Auth)
- **Resilient Reconnection Rule**: não quebrar pagehide/visibility/heartbeat/storage flow
- **SRD compliance**: nunca não-SRD em páginas públicas
- **SEO canonical**: apex domain, paths relativos em metadata, `siteUrl()` em JSON-LD
- **rtk em TODOS comandos** (inclusive em chains com `&&`); fallback `npx playwright`/`git push origin <branch>` se rtk filter quebrar
- **Label `ux-review-required`** em todo PR visual (Wave 2+)
- **Link wireframe** na PR description quando aplicável
- **NÃO merge autônomo** (exceção: docs-only PRs, infra clean)
- **NÃO force push em master**
- **NÃO bypass hooks** (`--no-verify`)

## Workflow esperado (replicar Sprint 2)

1. **Pre-flight**: cria 2 worktrees pra paralelizar Track A + Track B:
   ```bash
   cd "c:/Projetos Daniel/projeto-rpg"
   rtk git checkout master && rtk git pull
   rtk git worktree add .claude/worktrees/sprint-3-track-a -b feat/ep-2-sprint-3-track-a master
   rtk git worktree add .claude/worktrees/sprint-3-track-b -b feat/ep-2-sprint-3-track-b master
   ```

2. **Dispatch 2 agents em background**: cada um pega ~metade das B-stories (escolher partição que evite arquivos compartilhados).

3. **Adversarial code review** quando PR abre: 3-reviewer pattern (Blind Hunter + Edge Case Hunter + Acceptance Auditor) per `feedback_adversarial_review_default.md`. Modelo: launch 1 Agent por PR em paralelo, prompts em ~500-800 palavras.

4. **Apply fixes** identificados antes do merge.

5. **Merge ordem** com `rtk gh pr merge <#> --squash`. Use `--admin` se Combat Parity Gate falhar em casos N/A (schema/CSP/infra) com `parity-exempt` label + rationale no PR body.

6. **Cleanup**: ao fim, deletar worktrees e branches locais + remotas.

## Memória persistente (carregada automaticamente)

Pontos-chave pra esta sessão (ver `c:\Users\dani_\.claude\projects\c--Projetos-Daniel-projeto-rpg\memory\MEMORY.md`):
- `feedback_executar_sem_pedir_permissao.md` — pular "quer que eu faça X?", executar próximo passo óbvio
- `feedback_adversarial_review_default.md` — 3-reviewer adversarial é default
- `feedback_combate_so_visual_logica_intocada.md` — redesign visual, lógica intocada
- `feedback_combate_densidade_sem_esconder.md` — density via spacing, NUNCA hover-to-reveal
- `feedback_heroi_arsenal_diario_mapa.md` — 4 sub-tabs canônicas
- `feedback_dots_pattern.md` — Dots permanente vs transitório
- `project_hq_redesign_nomenclatura.md` — Grimório / hq-redesign / V2 flag
- `feedback_mestre_broadcast_obrigatorio.md` — toda mutação Mestre faz broadcast
- `project_recharge_state_dm_only.md` — recharge_state Mestre-only por design

## Ação imediata (começa por aqui)

```bash
# 1. Verificar estado
cd "c:/Projetos Daniel/projeto-rpg"
rtk git status
rtk git log origin/master --oneline -10
rtk git worktree list

# 2. Ler os 10 docs obrigatórios (na ordem)

# 3. Reportar pra Dani:
#    - "Estado confirmado: master @ 39ee2d1d, 0 worktrees, branches Sprint 2 limpas"
#    - "Sprint 3 escopo absorvido: B1-B6 + dormant wire-ups (A6 mount, A4 em-dash flip, schema backfill, sync trigger)"
#    - "Pronto pra criar worktrees + dispatchar Track A + Track B em paralelo. OK?"
```

Após Dani confirmar: criar worktrees + dispatchar 2 agents em background com prompts B-story específicos. Quando PRs abrirem, rodar adversarial review 3-reviewer em paralelo. Aplicar fixes. Merge ordenado. Cleanup ao fim.

---

## Fim do prompt (copiar até aqui)

---

## Notas de uso (Dani-only, não copiar)

- O prompt acima assume que o repo tem todos os docs `_bmad-output/party-mode-2026-04-22/*` no estado pós-Sprint 2.
- Memory carrega automático.
- Se Winston ainda não revisou #58 schema (no kickoff atual): manda ele revisar ANTES da Sprint 3 começar (Sprint 3 depende de schema válido).
- Se PR #59 (Estabilidade Combate) tiver pending — Dani decide se mergeia antes ou paralelo.
- Mobile-safari recovery: rodar `npm run e2e:ci` em master pós-#60 antes de iniciar Sprint 3 para confirmar baseline limpa.
- Se for autônomo (sem Dani presente): pular o "OK?" e ir direto pro pre-flight + dispatch.
