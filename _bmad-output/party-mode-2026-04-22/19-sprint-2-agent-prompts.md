# Sprint 2 — Agent Dispatch Prompts (Wave 1 · EP-1 Density + Post-Combate)

**Data:** 2026-04-23
**Sprint 1 status:** ✅ Entregue (8 PRs · 57+ unit tests · 100% verde)
**Sprint goal:** ~30% density improvement no Player HQ 7-tab + post-combate redirect pra Herói nos 3 modos
**Waves:** Wave 1 (EP-1 A1–A6)
**Feature flag:** `NEXT_PUBLIC_PLAYER_HQ_V2` (flag OFF em prod, ON em staging/preview)

## Pré-requisitos satisfeitos (Sprint 1 landed)

- ✅ EP-0 primitives: `SpellSlotGrid`, `Dot` (incl. `size="base"`), `Drawer`, `getHpFraction`
- ✅ `lib/flags/player-hq-v2.ts` + `isPlayerHqV2Enabled()`
- ✅ CI gate `.github/workflows/parity-check.yml` — bloqueia PR de combate sem cobertura 3-mode
- ✅ E2E baseline `/sheet` em `e2e/player-hq/` + `_constants.ts` com `TAB_KEYS`
- ✅ `sprint-2-prep-e2e-fixes.md` com file+line precision pros fixes E2E do A6

## ⚠️ Mudança importante vs Sprint 1

**Wave 1+ tem UX review bloqueante.** Todo PR que muda pixels visíveis passa por:
`Dev → Sally (UX) → Piper (Mestre target) → Dani → Merge`

Label `ux-review-required` em TODO PR desta sprint (é density work, 100% visual). Linkar wireframe relevante na PR description é **obrigatório**:
- `_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md`
- `08-design-tokens-delta.md` (spacing tokens canonical)

## Antes de lançar (pre-flight)

### 1. Worktrees + branches (Dani executa)

```bash
cd "c:/Projetos Daniel/projeto-rpg"
rtk git checkout master && rtk git pull
rtk git worktree add .claude/worktrees/sprint-2-track-a -b feat/ep-1-sprint-2-track-a master
rtk git worktree add .claude/worktrees/sprint-2-track-b -b feat/ep-1-sprint-2-track-b master
```

### 2. Vercel env vars (confirmar no dashboard)

Mesmos da Sprint 1:
- `NEXT_PUBLIC_PLAYER_HQ_V2=false` → Production
- `NEXT_PUBLIC_PLAYER_HQ_V2=true` → Preview + Development

### 3. Capturar baselines visuais pre-density (Track B item 0 — OBRIGATÓRIO antes de Track A começar)

Track B **DEVE** ser dispatchado primeiro e fazer isso antes de qualquer código:

```bash
cd "c:/Projetos Daniel/projeto-rpg/.claude/worktrees/sprint-2-track-b"

# Rodar E2E baseline em desktop + mobile com flag OFF (prod behavior atual):
NEXT_PUBLIC_PLAYER_HQ_V2=false rtk playwright test e2e/player-hq/ \
  --project=desktop-chrome --update-snapshots

NEXT_PUBLIC_PLAYER_HQ_V2=false rtk playwright test e2e/player-hq/ \
  --project=mobile-safari --update-snapshots

# Commit os baselines:
rtk git add e2e/player-hq/__snapshots__/ e2e/results/
rtk git commit -m "test(grimório): capture pre-Sprint 2 visual baselines for A1-A5 diffs"
rtk git push -u origin feat/ep-1-sprint-2-track-b

# Abrir PR standalone: "test(grimório): pre-Sprint 2 baselines" (pode mergear direto, não precisa UX review)
```

**Importante:**
- Baselines FLAG OFF (estado prod atual). Density diffs depois serão evidência concreta do delta.
- Track A **NÃO pode começar** até Track B publicar este commit de baselines em master (evita capturar post-density como "baseline").
- Se auth seed (PLAYER_WARRIOR) não disponível localmente, baseline da Auth spec fica skipped — tudo bem, mobile Guest/Anon cobre a densidade que importa.

---

## 🅰️ PROMPT TRACK A — Density quick wins (4 stories, 9 pts)

```
Você é o Track A da Sprint 2 do Grimório (Campaign + Player Redesign) do Pocket DM.

## Ambiente

- **Repo principal:** c:\Projetos Daniel\projeto-rpg
- **SEU worktree (cwd OBRIGATÓRIO):** c:\Projetos Daniel\projeto-rpg\.claude\worktrees\sprint-2-track-a
- **Branch base:** feat/ep-1-sprint-2-track-a (master @ commit mais recente, Sprint 1 mergeada)
- **Capacity:** 4 stories A1, A4, A2, A5 (9 pts total) — density quick wins em arquivos independentes

## Docs obrigatórios (ler ANTES de código)

1. `_bmad-output/party-mode-2026-04-22/14-sprint-plan.md` §Sprint 2 Track A (linhas 206-217)
2. `_bmad-output/party-mode-2026-04-22/13-epics-waves.md` §EP-1 (linhas 117-130)
3. `_bmad-output/party-mode-2026-04-22/09-implementation-plan.md` (stories A1-A6 detalhes)
4. `_bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md` (destination visual)
5. `_bmad-output/party-mode-2026-04-22/08-design-tokens-delta.md` (spacing tokens canônicos)
6. `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md` §4 (Gate Fase A requirements)
7. `CLAUDE.md` — regras imutáveis (Mestre≠DM, HP tiers EN, Combat Parity, Resilient Reconnection)
8. `.github/pull_request_template.md` — gate `ux-review-required` + checkbox

## O que entregar

Stories em ordem serial (A1 merge primeiro, A4 rebase depois — ambos tocam PlayerHqShell):

### PR 1 — A1 Spacing tokens sweep (2 pts)
- Scope: `space-y-4 → space-y-3`, `p-4 → p-3` em cards
- Files: `components/player-hq/PlayerHqShell.tsx`, `components/player-hq/CharacterStatusPanel.tsx`
- Branch: `feat/ep-1-a1-density-tokens`
- Wireframe ref: `03-wireframe-heroi.md` §densidade alvo
- Tokens: conferir `08-design-tokens-delta.md` para regras de spacing canônicas
- Validação: viewport 390 NÃO causa text overflow; se causar, adicionar `@media (max-width: 640px)` override
- Visual regression: capturar baseline mobile 390 + desktop 1440 com `rtk playwright test --update-snapshots`

### PR 2 — A4 Header 4-line → 2-line (2 pts)
- Scope: condensar header do Player HQ de 4 linhas para 2 linhas
- File: `components/player-hq/PlayerHqShell.tsx:175-231` (seção header)
- Branch: `feat/ep-1-a4-header-2lines`
- **REBASE:** branchar DEPOIS de A1 merger (mesma file, sequencial)
- **Spec canônico:** `08-design-tokens-delta.md` §13 (Header linha 2 — Recursos rápidos)
- Linha 1 = identidade (Campanha · Nome · Raça/Classe · Nível)
- Linha 2 = `HD x/y · CD x/y · Insp x · [✨ Slots X/Y →]` (chip clickable pra scroll/popover spell slots)
- Preservar todos os dados existentes — reorganizar + condensar
- Data sources: HD vem de `character.hit_dice`; CD vem de `class.resources.primary`; Insp de `character.inspiration`; Slots totals somam `character.spell_slots` per level

### PR 3 — A2 Kill accordion on ability scores (2 pts)
- Scope: remover accordion wrapping — ability scores sempre visíveis
- File: `components/player-hq/CharacterCoreStats.tsx:131` (accordion kill target)
- Branch: `feat/ep-1-a2-accordion-kill`
- Independente de A1/A4 — arquivo diferente, pode paralelizar
- Preservar grid layout atual até Sprint 5 (quando AbilityChip substitui)

### PR 4 — A5 HP interaction pattern (3 pts · +1-2 pts pra Combat Parity STRICT)
- Scope: **REMOVER** botões `[−5][−1][+1][+5]` do HpDisplay. Adotar pattern canônico do `CombatantRow.tsx:540-587` (click HP → inline number input → delta calc).
- File principal: `components/player-hq/HpDisplay.tsx`
- Branch: `feat/ep-1-a5-hp-ribbon-consistency`
- **Spec canônico:** `08-design-tokens-delta.md` §14 (HP interaction pattern — copiar pattern do CombatantRow)
- Adicionar `variant="ribbon"` prop em HpDisplay; comportamento = igual CombatantRow linha 540-587
- **Combat Parity STRICT** (decidido 2026-04-23): aplicar MESMO pattern nos 3 modos
  - `/sheet` (Auth) — via HpDisplay variant ribbon
  - `/combat` (via /join Anon + /invite Auth) — já usa pattern em CombatantRow; garantir variant ribbon também consistente se ribbon aparece em player view
  - `/try` (Guest) — portar pattern pro GuestCombatClient HP display se divergente
- Tap target: `min-h-[44px] sm:min-h-[28px]` (mobile 44px = atende a11y ≥40px)
- Visual regression: mobile 390 + desktop 1440
- **E2E obrigatórios (3 specs, Gate Fase A):**
  - `sheet-hp-controls-inline.spec.ts` (Auth)
  - `combat-hp-edit-ribbon-anon.spec.ts` (Anon, via /join)
  - `guest-hp-edit-consistency.spec.ts` (Guest, via /try)

## Regras absolutas (CLAUDE.md)

- **"Mestre", nunca "DM"** em UI/i18n/comentários user-facing
- **HP tiers em EN nos 2 locales** (FULL/LIGHT/MODERATE/HEAVY/CRITICAL)
- **Combat Parity**: A5 pode tocar combate — verificar 3 modos
- **rtk em todos comandos** (inclusive em chains com &&)
- **ux-review-required label** em TODO PR (Wave 1 visual)
- **Link wireframe** na PR description OBRIGATÓRIO
- NÃO merge autônomo (Dani aprova)
- NÃO force push

## Definition of Done (por PR)

- [ ] `rtk tsc --noEmit` passa
- [ ] `rtk lint` sem regressão
- [ ] Unit tests passam onde aplicável
- [ ] E2E baseline smoke (`e2e/player-hq/sheet-smoke.spec.ts`) continua verde
- [ ] Visual baselines atualizados em mobile 390 + desktop 1440
- [ ] PR template preenchido com:
  - Wireframe ref linkado
  - Checkbox `ux-review-required` (sim) + label `ux-review-required`
  - Combat Parity section preenchida (A1/A2/A4 = N/A density; A5 = verificar)
  - "closes EP-1 AX"
- [ ] **Aguardar Sally (UX) + Piper (Mestre) aprovarem antes de pedir merge**

## Workflow

1. cd no worktree sprint-2-track-a
2. Confirmar branch `feat/ep-1-sprint-2-track-a`
3. Ler os 8 docs obrigatórios
4. Executar PRs em ordem: A1 → A4 → A2 → A5 (A4 rebase em A1, A2+A5 paralelos após)
5. Para cada PR:
   - Branchar do worktree base
   - Implementar
   - Commit `feat(grimório): <descrição>` + Co-Authored-By
   - Push + `rtk gh pr create --base master --title "..." --body "..."` (template preenchido)
   - Label `ux-review-required`
   - Comentar no PR: `@ux-designer ready for UX review` (ou equivalente pra Sally)
   - Aguardar feedback — NÃO merge autônomo

## Reportar

Ao fim: lista de SHAs + PR numbers + status de cada review (Sally ✅/pending, Piper ✅/pending, Dani ✅/pending).

Começar agora: cd no worktree, ler docs, executar PR 1.
```

---

## 🅱️ PROMPT TRACK B — Perícias grid + Post-combat + E2E P0 suite (3 items, 13 pts)

```
Você é o Track B da Sprint 2 do Grimório (Campaign + Player Redesign) do Pocket DM.

## Ambiente

- **Repo principal:** c:\Projetos Daniel\projeto-rpg
- **SEU worktree (cwd OBRIGATÓRIO):** c:\Projetos Daniel\projeto-rpg\.claude\worktrees\sprint-2-track-b
- **Branch base:** feat/ep-1-sprint-2-track-b (master @ commit mais recente, Sprint 1 mergeada)
- **Capacity:** 3 items A3, A6, 7 E2Es (13 pts total) — maior item é A6 post-combat (5 pts, 3-mode parity)

## Docs obrigatórios (ler ANTES de código)

1. `_bmad-output/party-mode-2026-04-22/14-sprint-plan.md` §Sprint 2 Track B (linhas 219-227)
2. `_bmad-output/party-mode-2026-04-22/13-epics-waves.md` §EP-1 (linhas 117-130)
3. `_bmad-output/party-mode-2026-04-22/09-implementation-plan.md` (A3, A6 detalhes)
4. **`_bmad-output/party-mode-2026-04-22/sprint-2-prep-e2e-fixes.md`** — file+line precision pros 2 recap specs
5. `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md` §6 rows 1-7 (7 P0 specs Gate Fase A)
6. `_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md` §decision #43 (post-combate redirect)
7. `lib/flags/player-hq-v2.ts` (criada em Sprint 1 PR #35 — use `isPlayerHqV2Enabled()`)
8. `CLAUDE.md` — Combat Parity Rule (A6 é 3-mode STRICT)

## O que entregar

### PR 1 — A3 Perícias 3-col grid desktop (3 pts)
- Scope: layout 3-col de perícias em desktop (1-col em mobile 390)
- File: `components/player-hq/ProficienciesSection.tsx`
- Branch: `feat/ep-1-a3-pericias-grid`
- Wireframe: `03-wireframe-heroi.md` §perícias grid
- Responsive: CSS Grid com `grid-template-columns: repeat(auto-fit, minmax(X, 1fr))` OU media queries explícitos
- Preservar todas as interações (click pra rolar, highlight de proficiencies etc.)

### PR 2 — A6 Post-Combat Screen (5 pts) ⚠️ CRÍTICO 3-MODE · SPEC AMPLIADO
- Scope: após fim de combate, **tela nova / modal full-screen** (NÃO toast) — sem auto-dismiss. Player clica pra prosseguir.
- **Spec canônico completo:** `20-post-combat-screen-spec.md` (ler ANTES de código)
- Files:
  - REFACTOR: `components/conversion/RecapCtaCard.tsx`, `components/conversion/GuestRecapFlow.tsx`, `components/guest/GuestUpsellModal.tsx`
  - NEW: `components/player-hq/v2/PostCombatBanner.tsx` (nome no plan; é uma tela/modal, não banner), `lib/hooks/usePostCombatState.ts`
- Branch: `feat/ep-1-a6-post-combat-screen`
- **Sequência travada:** Combat → **Post-Combat Screen (novo)** → Recap → Herói
- **Tela mostra:** HP/slots/conditions finais + CTAs (Descanso curto / Ver recap / Voltar pra ficha)
- **Mestre adicional:** Descanso longo pro grupo / Encerrar sessão
- **Tom visual:** gold + neutral (matches brand)
- **NO auto-dismiss:** fica na tela até click
- Flag behavior:
  - OFF (prod today): redirect pra `/app/dashboard` (legacy)
  - ON (staging/preview): mostra Post-Combat Screen
- **Decision #43 (unchanged):** Guest MANTÉM `/app/dashboard` mesmo com flag ON (sem campaign_id seeded) — Post-Combat Screen NÃO renderiza pra Guest
- **Combat Parity STRICT**: E2E test em Guest + Anon + Auth obrigatório (ver spec §E2E specs)
- PostCombatBanner só monta quando flag ON em HeroiTab (HeroiTab lands Sprint 4 — por ora fica dormant/importável)

### PR 3 — 9 P0 E2E specs Gate Fase A (6 pts — ajustado pra Combat Parity A5)
- Scope: authoring de 9 specs P0 pra Gate Fase A (2 extras pra A5 strict parity)
- Branch: `feat/ep-1-a-e2e-p0-suite`
- 9 specs:
  1. `e2e/player-hq/sheet-visual-baseline.spec.ts` (density validation)
  2. `e2e/player-hq/sheet-ability-chips-always-visible.spec.ts` (A2 accordion kill)
  3. `e2e/player-hq/sheet-hp-controls-inline.spec.ts` (A5 Auth /sheet)
  4. `e2e/combat/combat-hp-edit-ribbon-anon.spec.ts` (A5 Anon /join)
  5. `e2e/guest/guest-hp-edit-consistency.spec.ts` (A5 Guest /try)
  6. `e2e/conversion/post-combat-redirect-heroi-auth.spec.ts` (A6 Auth path)
  7. `e2e/conversion/post-combat-redirect-heroi-anon.spec.ts` (A6 Anon path)
  8. `e2e/conversion/post-combat-redirect-heroi-guest.spec.ts` (A6 Guest path — keeps dashboard)
  9. `e2e/player-hq/sheet-header-density.spec.ts` (A4 header 2-line + `[✨ Slots X/Y →]` chip click behavior)
- **Post-Combat spec ampliado**: adicionar `post-combat-screen-no-auto-dismiss.spec.ts` e `post-combat-screen-state-preserved.spec.ts` conforme `20-post-combat-screen-spec.md`
- Flag env: `NEXT_PUBLIC_PLAYER_HQ_V2=true` em playwright.config.ts webServer OR gh actions
- Usar helpers existentes em `e2e/helpers/` (auth setup) + `e2e/player-hq/_constants.ts` (TAB_KEYS)

### Adicional — Fix 2 specs afetados por decision #43
Referência: `sprint-2-prep-e2e-fixes.md` tem file+line precision dos fixes
- `e2e/conversion/recap-anon-signup.spec.ts:196-212` — dual-target `waitForURL` regex + branched assertions
- `e2e/conversion/recap-guest-signup-migrate.spec.ts` — comment-only lock-in da decision #43
- Pode ir no MESMO PR do A6 OU numa PR separada (decida)

### Gotchas — testar ANTES de finalizar

- **A6 timing flakiness**: usar `DEBUG_POST_COMBAT_REDIRECT_MS=500` env em test runs (reduz o 5s pra 0.5s)
- **Flag inline em build**: `NEXT_PUBLIC_*` é inlineada em BUILD time — test reflete a config do build, não do runtime
- **Guest não tem campaign_id seeded**: A6 Guest path MUST keep `/app/dashboard` — não force `/sheet`

## Regras absolutas (CLAUDE.md)

- **"Mestre", nunca "DM"** em UI/i18n/comentários
- **HP tiers em EN** nos 2 locales
- **Combat Parity STRICT** pra A6 — E2E Guest+Anon+Auth
- **rtk em todos comandos**
- **ux-review-required label** em A3 e A6 (visual); E2E suite é code-only, opcional
- **Link wireframe** na PR description
- NÃO merge autônomo
- NÃO force push

## Definition of Done

- [ ] `rtk tsc --noEmit` passa
- [ ] `rtk lint` sem regressão
- [ ] Unit tests novos passam
- [ ] E2E novos passam (7 specs Gate Fase A)
- [ ] E2E existentes não regridem
- [ ] CI Combat Parity Gate verde (STRICT para A6)
- [ ] Visual baselines atualizados onde aplicável
- [ ] PR template preenchido
- [ ] Sally + Piper aprovaram (A3, A6); E2E suite só Dani

## Workflow

1. cd no worktree sprint-2-track-b
2. Confirmar branch `feat/ep-1-sprint-2-track-b`
3. Ler os 8 docs + `sprint-2-prep-e2e-fixes.md`
4. Ordem serial: A3 (isolado) → A6 (maior, 3-mode STRICT) → 7 E2Es (depende de A2/A3/A5 merged pra snapshot; A4/A6 merge antes pra testar)
5. A6 é o item de risco — tempo extra pra:
   - Configurar Playwright webServer env `NEXT_PUBLIC_PLAYER_HQ_V2=true`
   - Testar os 3 modos manualmente antes de abrir PR
   - Se flakey, usar `DEBUG_POST_COMBAT_REDIRECT_MS`

## Reportar

Ao fim: SHAs + PR numbers + status de review por mode (Guest/Anon/Auth).

Começar agora: cd no worktree, ler os 8 docs + sprint-2-prep, executar A3 primeiro.
```

---

## Integração checkpoints (Dani monitora)

| Dia | Checkpoint | Ação se atraso |
|---|---|---|
| End-day Wed | Track A A1+A4 merged, Track B rebase | Se A1 flakey (density overflow) → rollback mobile-only, proceguir |
| End-sprint Fri | 6 stories + 7 E2Es merged; ambos tracks sync no master | Se A6 slip: Sprint 3 absorve (Sprint 2 goal ainda cumprido via Track A) |

## Riscos + mitigações

| # | Risco | Mitigação | Owner |
|---|---|---|---|
| 1 | A5 HP inline quebra tap target 390 | Spec pinned ≥40px + Playwright mobile viewport test | Track A |
| 2 | A6 timing flakey E2E | `DEBUG_POST_COMBAT_REDIRECT_MS=500` + waitForURL regex dual-target | Track B |
| 3 | Density revela overflow @390 | A1 PR inclui screenshot 390; rollback mobile-only CSS se necessário | Track A |
| 4 | UX review (Sally+Piper) trava velocidade | Calibrar critérios NO Sprint 2 kickoff (antes do código) — fazer ANTES de lançar agents | Dani |

## ⚠️ Action items pra Dani ANTES de lançar os agents

1. **Calibrar UX review com Sally + Piper** — ✅ FEITO 2026-04-23 party-mode. Decisões travadas:
   - Header A4 linha 2 = Recursos rápidos + chip spell slots (ver `08-design-tokens-delta.md` §13)
   - HP A5 pattern = copiar `CombatantRow.tsx:540-587` canônico (ver §14); botões `[-5/-1/+1/+5]` REMOVIDOS
   - Post-Combat A6 = tela nova / modal, sem auto-dismiss, gold+neutral (ver `20-post-combat-screen-spec.md`)
   - A5 passa a ser **Combat Parity STRICT** (3-mode E2E)
2. **Ping Winston async** — Sprint 2 não requer review dele, mas Sprint 5 exige (migrations combinadas). Avisar agora pra ele blocar janela.
3. **Vercel env vars** — confirmar que `NEXT_PUBLIC_PLAYER_HQ_V2=true` em Preview/Dev ainda tá ativo (setado no kickoff Sprint 1)
4. **Criar worktrees + branches base** — comando no pre-flight §1
5. **Dispatch Track B PRIMEIRO pra capturar baselines** (§3 pre-flight) antes de Track A começar. Track A aguarda PR de baselines mergear.

## Handoff pra Sprint 3

- Master com V1 shell densificada; Sprint 3 forka V2 shell dela
- `usePostCombatState` + `PostCombatBanner` aguardam HeroiTab wrapper (Sprint 3 entrega isso)
- Se A6 slip: Sprint 3 absorve como primeira coisa (antes do B1 shell refactor)

## Sucesso = critérios mensuráveis

- **Densidade**: ≥20% height reduction em visual diff no mobile 390 + desktop 1440
- **Combat Parity**: Gate verde nos 3 modos em A6
- **Velocity**: 22 pts em 5 dias úteis (4.4 pts/dia · 2 tracks paralelos)
- **Zero regressão**: Gate Fase A E2E (7 specs) + baseline (`/sheet` smoke) verde
