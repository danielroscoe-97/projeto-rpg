# Grimório (Player HQ Redesign V2) — Progress + Remaining Roadmap

**Status snapshot:** 2026-04-27, fim do dia
**Master HEAD:** `0824b967`
**MVP progress:** ~45% (21 de 47 stories)
**Open PRs:** 0
**DB migrations applied:** 184/185/186 (in parity)

---

## Sumário executivo

A frente Grimório é um redesign completo do Player HQ — passando de 7 tabs com scroll infinito em algumas pra 4 tabs (Herói/Arsenal/Diário/Mapa) com Ribbon Vivo sticky, Modo Combate Auto, AbilityChip rolável, mini-wiki de notas e wizard de level up.

Foi planejada em **5 epics** ([13-epics-waves.md](13-epics-waves.md)), entregue em **5 waves**, ao longo de ~10 sprints. Estamos no fim do **Sprint 3** (Wave 2 fechada) — passamos da virada do meio. A maior parte do refactor estrutural arriscado já passou; o que resta é mais sobre features novas (Ribbon, Wizard) do que sobre re-arquitetura.

**Cadência observada:** Sprints 1-3 entregaram em ~3-4 dias cada com 2-3 agents paralelos. Wave 3 e 4 são ~2x maiores em LOC, mas paralelizáveis. **Estimativa:** 3-6 semanas restantes até `NEXT_PUBLIC_PLAYER_HQ_V2=true` em produção, dependendo de capacidade e do gate combat-adjacent (Estabilidade Combate em paralelo).

---

## ✅ Done — Sprints 1, 2, 3 (Waves 0-2)

### Sprint 1 — Wave 0 Consolidation (EP-0)

Tech debt: extract shared primitives antes de duplicar em features.

| Story | PR | O que fez |
|---|---|---|
| C0.1 | #42 | HP status calc dedupe → `lib/utils/hp-status.ts` único |
| C0.2 | #36 | `<SpellSlotGrid variant="hq\|combat\|ribbon" />` em `components/shared/` |
| C0.3 | #38 | `<Dot semantic="permanent\|transient" state="on\|off" />` primitive |
| C0.4 | #41 | `<Drawer />` em `components/ui/` (movido de `DrawerShell`) |

### Sprint 2 — Wave 1 Density + Post-Combat Redirect (EP-1)

Player HQ atual densificado ~30%, sem mexer em topologia.

| Story | PR | O que fez |
|---|---|---|
| A1 | #49 | Spacing tokens (`space-y-3` entre cards, `p-3` em cards) |
| A2 | #53 | Ability scores sem accordion (sempre visíveis) |
| A3 | #50 | Perícias 3-col grid desktop (era 1-col vertical) |
| A4 | #52, #58, #68 | Header 2 linhas + schema migration `hit_dice`+`class_resources` + valores reais |
| A5 | #54 | HP controls inline `[-5][-1][+1][+5]` mesma linha do HP bar |
| A6 | #55 | `PostCombatBanner` + `usePostCombatState` (component shipped, **mount dormant**) |
| — | #57 | HP tier labels EN nos 2 locales (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) |
| — | #60 | CSP fix webkit `blob:` em `script-src` (Supabase realtime worker) |

### Sprint 3 — Wave 2 Topology 7→4 (EP-2)

Shell V2 com 4 tabs flag-gated atrás de `NEXT_PUBLIC_PLAYER_HQ_V2`.

| Story | PR | O que fez |
|---|---|---|
| B1 | #62 | PlayerHqShellV2 com 4 tabs (Herói/Arsenal/Diário/Mapa, ícones gold Lucide) |
| B2a | #74 | HeroiTab wrapper compõe 8 sections existentes |
| B2b/c/d | #78 | ArsenalTab + DiarioTab (5 sub-tabs) + MapaTab — consolidados em 1 PR |
| B3 | #63 | Deep-link back-compat (7 mappings) + extracted `lib/navigation/legacy-tab-redirects.ts` + 22 unit tests + parity-intent block |
| B4 | #65 | `usePlayerHqTabState` hook (24h TTL localStorage, 12 unit tests) |
| B5 | #66 | Atalhos teclado 1/2/3/4 + ? + IME guard + role=dialog suppression + focus restore |
| B6 | #67 | E2E Gate Fase B suite (6 specs novos: topology + deep-links + keyboard + persistence + a11y + mobile-390) |
| Tech debt | #64 | Substring traps tightened, `e2e/guest/`→`e2e/guest-qa/`, `no_party` i18n removida |
| Migration | #69, #80 | Migration 185 backfill + 184→186 rename pra resolver collision |
| Infra | #79, #81 | Prod-deploy bundle + `docs/supabase-migration-runner.md` + memory + Wave 3 kickoff |

### Bônus paralelo (não-Grimório, mas em master agora)

- **Estabilidade Combate Sprint 1** mergeado via `66579ab0` — connection resilience hardening + migration 184_combat_events_journal aplicada
- **Supabase CLI infra**: instalada em `C:\Users\dani_\bin\supabase.exe`, linkada ao projeto, autenticada via PAT em keychain. Memory `project_supabase_cli_setup.md` persistida.
- **Permissions liberadas** em `.claude/settings.local.json` (~70 allows pra rtk/git/gh/npm/etc + 7 deny destrutivos)

---

## ⏳ Wave 3 — EP-3 Ribbon + Combat Auto + AbilityChip + EP-4 Diário (Sprints 4-5)

**Kickoff doc:** [24-wave-3-kickoff-prompt.md](24-wave-3-kickoff-prompt.md)
**Total estimado:** ~11 PRs em 3 sub-waves paralelizáveis

### 3a — Ribbon Vivo + Modo Combate Auto (combat-adjacent — gate antes de começar)

| Story | Estim. LOC | O que faz |
|---|---|---|
| C1 | ~400 | `<RibbonVivo />` sticky 2-line. HP bar full-width + AC/Init/Speed/Insp/CD + slots + condições + active effects compact. Pulse gold em mudança de HP. |
| C2 | ~80 | `<SlotSummary />` sub-component (usa `<SpellSlotGrid variant="ribbon" />` já extraído em EP-0) |
| C3 | ~150 | HeroiTab 2-col desktop layout (CSS Grid `grid-template-areas`, CLS<0.1) |
| C4 | ~150 | `useCampaignCombatState` hook — subscribe canal `campaign:${id}` consolidado, polling 10s fallback |
| C5 | ~250 | `<CombatBanner />` slide-from-top + Modo Combate Auto reorg (Col A/B swap, FAB 📝) |
| **A6 wire-up** | ~30 | Mount PostCombatBanner em HeroiTab quando `useCampaignCombatState` detecta `combat:ended` |
| **Anon nav wire** | ~10 | `PlayerJoinClient.handleAuthModalSuccess` → `router.push(redirectTo)` |

**Combat Parity STRICT pra C1, C2, C5** — Anon (`/join`) DEVE ter ribbon funcional + receber broadcasts. C7 é Auth-only (documentado via `<!-- parity-intent guest:n/a anon:n/a -->`).

### 3b — AbilityChip Roller (Auth-only, isolado)

| Story | Estim. LOC | O que faz |
|---|---|---|
| C7 | ~300 | `<AbilityChip />` (CHECK + SAVE zones) + `lib/utils/dice-roller.ts` + `useAbilityRoll` + `<RollResultToast />`. Long-press menu (Advantage/Disadvantage). Broadcast pro Mestre <500ms via canal consolidado. |

Pode precisar nova migration `roll_history` (verificar se já existe). Se não, é uma 2a migration nesta sprint.

### 3c — Diário + mini-wiki + cross-nav (zero-combat-touch, paralelo total)

| Story | Estim. LOC | O que faz |
|---|---|---|
| D1 | Migration + 80 LOC hook | Migration `player_notes` table (RLS dual-auth user_id XOR session_token_id, tags array + GIN index) + `usePlayerNotes` CRUD hook |
| D2 | ~250 | `<MinhasNotas />` + `<MarkdownEditor />` (textarea + preview MVP, auto-save 30s, search local text+tags) |
| D4 | ~80 | Cross-nav Diário ↔ Mapa (NpcCard "Ver no Mapa", drawer Mapa "Notas" tab linka pro Diário) |
| D5 | ~120 | `usePlayerNotifications` hook + badge na tab Diário (subscribe `note:received`/`quest:assigned`/`quest:updated`) |

### Riscos da Wave 3

| Risco | Mitigation |
|---|---|
| **R1** Dot inversion parity quebra (decision #37 já parcialmente tratada em Sprint 4 plan original) | Verificar SpellSlotsHq + ResourceDots + SpellSlotTracker antes de C7. Se ainda não inverteram, é trabalho extra. |
| **R3** Realtime quota — criar canal novo `combat:*` quebra a 200-channel cap | C4 DEVE reusar canal `campaign:${id}` consolidado. Test asserta. Memória `project_realtime_rate_limit_root_cause` é leitura obrigatória. |
| **R4** CLS >0.1 quando Combat Auto reorganiza Col A/B | CSS Grid `grid-template-areas` com fixed regions. Fallback pra opacity transitions. Lighthouse CI mede. |
| **R5** AbilityChip roller broadcast race com Mestre HP edits | C7 broadcast fire-and-forget, UI atualiza local imediato. NÃO blocking await. |
| **R6** D1 RLS dual-auth (user_id XOR session_token_id) — fácil errar | E2E `player-notes-rls-negative.spec.ts` testa: anon não vê notas auth, auth1 não vê auth2, anon1 não vê anon2. P0 gate. |

---

## ⏳ Wave 4 — EP-5 Level Up Wizard (Sprints 7-8)

**Maior epic do MVP** (~1500 LOC, 7 stories, mais complexo em lógica que em LOC). Mestre libera level up via broadcast; Player vê chip no ribbon, abre wizard 6 passos, completa, persiste.

| Story | Owner Track | O que faz |
|---|---|---|
| **E1** | A | Migration `level_up_invitations` table + RLS + cron auto-expire 7d |
| **E2** | A | `<LevelUpRelease />` Mestre UI (multi-select chars + target level + opt msg + INSERT batch + broadcast `levelup:offered`) |
| **E3** | C | Ribbon chip "🎉 Subir de Nível →" + `useLevelUpInvitation` hook (additive prop em RibbonVivo) |
| **E4** | B | Wizard shell + stepper + `useLevelUpWizard` hook + Step1ChooseClass + Step2Hp |
| **E5** | B | Step3 ASI/Feat + Step4 Spells (filter by class, slots recalc auto) |
| **E6** | B | Step5Features + Step6Subclass + StepFinalReview + commit (UPDATE character + broadcast `levelup:completed`) |
| **E7** | A | Mestre completion toast + Cancel button + auto-expire verification |

### Track B (E4→E5→E6) é serial bottleneck

`choices jsonb` contract cresce a cada step. Step N depende de Step N-1. **Sprint 6 obrigatoriamente unit-testa `lib/levelup/validate-level-up-choices.ts`** com cobertura exaustiva (5e rules: ASI cap 20, half-feats, multiclass prereqs, spells-known per class/level, canonical levels 4/8/12/16/19) ANTES de E4 começar.

### Decisões travadas

- **Decisão #41**: Mestre libera via broadcast (sempre Mestre disparando, nunca Player auto). Wizard 6 passos. Tabela `level_up_invitations`. Ver `feedback_levelup_mestre_libera.md`.
- **Fallback**: `<CharacterEditSheet />` `✎ Editar` continua funcional (regression test obrigatória per [13-epics-waves.md §7 R5](13-epics-waves.md))
- **Sub-flag**: `NEXT_PUBLIC_LEVELUP_WIZARD=true` separado do main flag, permite rollout 10%→50%→100% staggered

### Riscos da Wave 4

- **R7** 5e rule validation combinatorics divergem entre Step 3 (ASI/Feat) e Step 4 (Spells) — se 2 devs trabalham steps em paralelo antes do contract estabilizar, conflito no jsonb shape
- **R8** Step3 → Step4 acúmulo: char com 5 feats já escolhidos consegue burlar ASI cap se validação só rodar no Final Review. Validar a CADA step.
- **R9** Cron auto-expire failing silently — Sprint 5 deploy do cron (junto com migration) deve incluir health-check log

---

## ⏳ Migration 187 Follow-up — sync trigger

**Owner:** Sprint 7 (alinhado com Wave 4 quando wizard precisa atualizar `class_resources`)
**Severity:** Não bloqueia Wave 3, bloqueia Wave 4 wizard funcionar 100% certo
**Source:** [Winston review do PR #69](https://github.com/danielroscoe-97/projeto-rpg/pull/69)

### Problema

`class_resources` (JSONB em `player_characters`) é mirror header-otimizado de `character_resource_trackers` (table normalizada de Sprint 1 migration 057). Atualmente os dois ficam sincronizados via app-level escrita dupla — não há trigger DB. Drift = displayed numbers errados em mid-combat.

### 3 opções consideradas (PR #69 body)

| Opção | Trade-off | Winston pick |
|---|---|---|
| **(a)** `is_primary BOOLEAN DEFAULT false` em `character_resource_trackers` + partial unique index per character + AFTER UPDATE/INSERT trigger que mirror pra `class_resources.primary` | Mais robusto. Esquema explícito. Cost: 1 migration + app refactor pra setar `is_primary=true` no resource principal | ✅ |
| **(b)** Usar `display_order = 0` como primary (app-level discipline) | Zero schema change. Cost: cada novo tracker app code precisa setar display_order = 0 quando primary | ❌ frágil |
| **(c)** Manter app-level mirror only (escrita dupla explícita) | Status quo. Cost: drift risk forever | ❌ status quo é o problema |

### Spec pra migration 187

```sql
-- 187_character_resource_trackers_is_primary.sql
BEGIN;

ALTER TABLE character_resource_trackers
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Partial unique index: at most ONE primary per character
CREATE UNIQUE INDEX IF NOT EXISTS character_resource_trackers_one_primary_per_char
  ON character_resource_trackers (character_id)
  WHERE is_primary = true;

-- Backfill: mark first tracker per character (by created_at) as primary
UPDATE character_resource_trackers t
   SET is_primary = true
  FROM (
    SELECT DISTINCT ON (character_id) id, character_id
      FROM character_resource_trackers
     ORDER BY character_id, created_at ASC, id ASC
  ) first
 WHERE t.id = first.id;

-- Sync trigger: when primary tracker changes, mirror to player_characters.class_resources.primary
CREATE OR REPLACE FUNCTION sync_primary_resource_to_character() RETURNS trigger AS $$
DECLARE
  v_payload jsonb;
BEGIN
  IF NEW.is_primary = true THEN
    v_payload := jsonb_build_object(
      'name', NEW.name,
      'max', NEW.max,
      'used', NEW.current
    );
    UPDATE player_characters
       SET class_resources = jsonb_set(
         COALESCE(class_resources, '{}'::jsonb),
         '{primary}',
         v_payload
       )
     WHERE id = NEW.character_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_primary_resource_after_change
  AFTER INSERT OR UPDATE OF is_primary, name, max, current
  ON character_resource_trackers
  FOR EACH ROW
  EXECUTE FUNCTION sync_primary_resource_to_character();

COMMIT;
```

### App-level changes paireadas

- `lib/hooks/useResourceTrackers.ts` — quando criar tracker, se for o 1º do char, setar `is_primary: true`
- `setRechargeState` etc. — não precisa mais escrever em `class_resources`; trigger faz
- E2E: `class-resources-mirror.spec.ts` — testa que update em tracker via app reflete em header em <2s

---

## ⏳ Sprint 9 — QA Phase (~5-7 dias dedicados)

Não estava no plan original mas é inevitável antes de flip prod. **Owner:** 1 dev focado + Dani validation.

### Visual regression baseline

- Capturar screenshots em 3 viewports: mobile 390 / tablet 1024 / desktop 1440
- 4 tabs × ribbon states (idle / combat-active / post-combat) × 3 modes (Auth / Anon / Guest where applicable)
- Total: ~36 baselines. Commit em `e2e/visual/__snapshots__/`
- Workflow `.github/workflows/update-visual-baselines.yml` já existe (Sprint 2 #51) mas pulou gracefully sem Supabase secrets — Sprint 9 popula secrets pra ele rodar de verdade
- Threshold: 0.1% pixel diff. Falhar PR se exceder. Rebaseline manual com `--update-snapshots` flag.

### a11y audit estendido

- Axe rodando em `/sheet?tab=heroi` + `?tab=arsenal` + `?tab=diario` + `?tab=mapa` (já em #67)
- **Adicionar**: ribbon a11y, combat banner a11y, post-combat banner a11y, level up wizard a11y (todos os 6 steps)
- Threshold: 0 critical/serious violations. Moderate/minor anotados em test artifacts pra triage.
- Manual keyboard nav audit: tab/arrow keys/Esc/Enter cobrindo cada surface. Documentar em `docs/a11y-keyboard-audit-2026-XX-XX.md`.

### Mobile 390 sweep final

- Toda tab + ribbon + combat banner + wizard step em viewport 390×844
- Verificar: zero horizontal scroll, tap targets ≥40px, ribbon não sobrepõe content, FAB não cobre conteúdo crítico
- Spec novo: `e2e/journeys/sheet-mobile-390-comprehensive.spec.ts`

### Performance audit

- Lighthouse CI rodando em `/sheet?tab=heroi` (Auth + Anon)
- Métricas: LCP < 2.5s, CLS < 0.1, TBT < 300ms, TTI < 3.8s
- Bundle size: dashboard + sheet routes em separate chunks. Combat surfaces em route group sem prefetch eager.
- Comparar com baseline Sprint 1 (pre-redesign).

### Bug bash

- 1 dia dedicado, Dani + Mestre-target persona (Lucas Galuppo se disponível) explorando free-form
- Output: lista priorizada (P0/P1/P2). P0 fix antes de Sprint 10. P1/P2 backlog v1.5.

### Resilient Reconnection regression

- [j22-player-resilience.spec.ts](e2e/journeys/j22-player-resilience.spec.ts) deve passar com ribbon mounted
- [adversarial-visibility-sleep.spec.ts](e2e/combat/adversarial-visibility-sleep.spec.ts) + [adversarial-wifi-bounce.spec.ts](e2e/combat/adversarial-wifi-bounce.spec.ts) — ribbon + Combat Auto não podem quebrar a cadeia de fallbacks (per `CLAUDE.md Resilient Reconnection Rule`)

### Sprint 9 DoD

- [ ] Visual baselines committed em todos os viewports
- [ ] 0 critical/serious axe violations
- [ ] Lighthouse green em Auth + Anon
- [ ] Mobile 390 zero horizontal scroll em todas as surfaces
- [ ] j22 + adversarial-* specs verde com flag ON
- [ ] Bug bash report committed em `_bmad-output/qa/sprint-9-bug-bash-2026-XX-XX.md`
- [ ] P0 bugs todos fixed; P1/P2 triados em backlog

---

## ⏳ Sprint 10 — Rollout (`NEXT_PUBLIC_PLAYER_HQ_V2=true` em prod)

**Hoje:** flag ON em Preview/Dev, OFF em Production
**Plano:** staggered 10% → 50% → 100% ao longo de ~2 semanas

### Mecanismo de rollout

Vercel não tem percentage-based feature flags nativamente. 3 opções:

| Mecanismo | Custo | Fit |
|---|---|---|
| **Edge middleware com cookie sticky** | Zero ($0) | ✅ Recomendado pra MVP |
| **Statsig / GrowthBook** integration | $0-50/mo | ✅ Mais robusto, longer-term |
| **Hard cut-over** (flip 0% → 100%) | Zero | ⚠️ Mais arriscado, sem rollback gradual |

**Recomendação:** edge middleware com cookie. Pseudocódigo:

```ts
// middleware.ts (edge runtime)
import { NextRequest, NextResponse } from "next/server";

const ROLLOUT_PERCENTAGE = parseInt(process.env.PLAYER_HQ_V2_ROLLOUT_PCT ?? "0", 10);

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const existingFlag = req.cookies.get("pdm_v2");
  if (!existingFlag) {
    const inRollout = Math.random() * 100 < ROLLOUT_PERCENTAGE;
    res.cookies.set("pdm_v2", inRollout ? "1" : "0", {
      maxAge: 60 * 60 * 24 * 30, // 30d sticky
      path: "/",
    });
  }
  return res;
}
```

Then `isPlayerHqV2Enabled()` reads from cookie OR env var (env wins for QA).

### Cadência de flip

| Dia | % | Action |
|---|---|---|
| D0 | 0% | Sprint 9 done, flag OFF in prod |
| D1 | 10% | Set `PLAYER_HQ_V2_ROLLOUT_PCT=10`. Monitor Sentry/error rate por 48h |
| D3 | 50% | If error rate flat, bump to 50%. Monitor por 5 dias |
| D8 | 100% | If error rate ainda flat, bump to 100% |
| D14 | Cleanup | Delete V1 shell + flag check + middleware. PR "remove V1 dead code" |

### Rollback plan

Se Sentry error rate >2x baseline em qualquer step:
1. Imediato: bump `PLAYER_HQ_V2_ROLLOUT_PCT` back to anterior
2. Se crítico: Vercel rollback pra deploy anterior (1 click)
3. Investigar via Sentry breadcrumbs + Supabase logs
4. Fix forward em PR + merge + retry rollout

### Métricas de sucesso pós-100%

Comparar 30 dias pré vs pós-flip:
- **Engajamento**: time per session, sessions per week, feature adoption (% players abrindo Diário)
- **Retenção**: 7-day, 30-day return rate
- **Performance**: Lighthouse score em prod (RUM via Sentry Performance)
- **Bug rate**: Sentry issues per 1000 sessions
- **Feedback qualitativo**: pesquisa pós-uso (Survey Monkey link no Diário > Configurações)

### Sprint 10 DoD

- [ ] Edge middleware committed + tested
- [ ] Vercel env `PLAYER_HQ_V2_ROLLOUT_PCT` configurada
- [ ] Sentry alert thresholds setadas
- [ ] Rollout doc em `docs/grimorio-rollout-2026-XX-XX.md`
- [ ] Flag em 100% por 7 dias sem rollback
- [ ] PR "remove V1 dead code" mergeado

---

## 🚫 Out of scope MVP — v1.5

Cortado em [MVP-CUT.md](MVP-CUT.md). Backlog pra próxima fase:

| Item | Estim. | Por quê fora MVP |
|---|---|---|
| **D3** Backlinks `@` parser | L | Complexity vs adoption; nice-to-have |
| **D6** Favorites store (`player_favorites`) | M | Requires schema + cross-context UI |
| **D7** Biblioteca tab dentro de Diário | L | Major new surface (favoritos do compêndio) |
| **D8** Ctrl+K command palette | M | Convenience; outros features mais críticos |
| **D9** Cross-context favorites (Herói > Spells > [⭐ Favoritas]) | S | Depende de D6 |
| Mestre Notes inbox push notifications | M | D5 já cobre in-app; push é polish |
| Ribbon real-time party HP (ver vidas dos outros players no ribbon) | M | Requested em beta tests; future |
| Loot summary em PostCombatBanner | S | Seria feature da PostCombatBanner v2 |
| Auto-generate recap template | L | AI feature; sprint dedicado |

---

## 📊 Estimativa final + cronograma

Assumindo cadência de 3-4 dias por sprint com 2-3 agents paralelos:

| Sprint | Conteúdo | Estim. dias | Cumulative |
|---|---|---|---|
| ~~1~~ | ~~Wave 0 (EP-0)~~ | ~~3d~~ | ✅ |
| ~~2~~ | ~~Wave 1 (EP-1)~~ | ~~3d~~ | ✅ |
| ~~3~~ | ~~Wave 2 (EP-2)~~ | ~~4d~~ | ✅ Done |
| 4 | Wave 3a (Ribbon+Combat Auto) | 4d | T+4d |
| 5 | Wave 3b (AbilityChip) + 3c (Diário) paralelos | 4d | T+8d |
| 6 | Wave 4 prep (validation unit tests) + bug bash Wave 0-3 | 3d | T+11d |
| 7 | Wave 4a (E1+E2+E3+E4 wizard front half) + Migration 187 | 4d | T+15d |
| 8 | Wave 4b (E5+E6+E7) | 4d | T+19d |
| 9 | QA dedicada (visual + a11y + mobile + perf + bug bash) | 5d | T+24d |
| 10 | Rollout (10→50→100% over 2 weeks) | 14d | T+38d |

**Total estimado:** ~5-6 semanas até flag em 100% prod. Comprimível pra ~4 semanas se Wave 4 paralelizar Track A + B + C agressivamente, ou alongável pra 8 semanas se QA encontrar problemas significativos.

### Caminho crítico

1. **Wave 3a** depende de gate combat-adjacent (Estabilidade Combate Sprint 2 status)
2. **Wave 4 Track B** (wizard) é serial — não comprime
3. **Migration 187** bloqueia Wave 4 wizard 100% correto — Sprint 7 owns
4. **Sprint 9 QA** descobertas podem expandir backlog — buffer 1-2 semanas

---

## ❓ Open questions que precisam decisão do Dani

1. **Estabilidade Combate Sprint 2** está em flight ou planejada? Se sim, Wave 3a/3b precisam coordenar (ribbon lê HP, AbilityChip broadcasta — ambos tocam realtime que Estabilidade pode estar refatorando)
2. **Mecanismo de rollout staggered**: edge middleware caseiro ou ferramenta tipo Statsig/GrowthBook? Decisão pode ser deferida pra Sprint 10 mas afeta arquitetura
3. **Sprint 6 prep work**: quem owns os unit tests de `validate-level-up-choices.ts`? Se Dani, Sprint 7 pode start E4 imediatamente. Se agent, precisa allocar Sprint 6 dia.
4. **D6-D9 v1.5 scope**: ship junto com MVP (delay flip prod) ou release separadamente após 100% rollout? Recomendação: separadamente, mas é decisão de produto.
5. **Migration 187 timing**: Sprint 7 (alinhado com Wave 4 wizard) ou antes (em standalone)? Wave 4 tecnicamente pode começar sem 187 — drift só aparece quando wizard atualiza class_resources. Mas é mais limpo aplicar antes pra evitar dead-code app-level escrita dupla persistir.
6. **Combat Parity STRICT em Wave 3**: confirmar que C1/C2/C5 ribbon precisa funcionar em Anon (`/join`). Se sim, Anon precisa receber broadcasts de HP do Mestre — testar via Tab 2 obrigatório (per `feedback_qa_sempre_player_view`).

---

## 🔗 Referências cruzadas

- [00-INDEX.md](00-INDEX.md) — índice de todos os docs do projeto
- [13-epics-waves.md](13-epics-waves.md) — definição canônica de epics + waves + parallelization
- [09-implementation-plan.md](09-implementation-plan.md) — 35 stories com AC detalhados
- [14-sprint-plan.md](14-sprint-plan.md) — sprint cadence original (capacity-aware)
- [15-e2e-matrix.md](15-e2e-matrix.md) — 48 specs com priority + ownership
- [PRD-EPICO-CONSOLIDADO.md](PRD-EPICO-CONSOLIDADO.md) — 47 decisões travadas
- [MVP-CUT.md](MVP-CUT.md) — 19 🟢 decisões in-scope vs v1.5 deferrals
- [22-sprint-3-kickoff-prompt.md](22-sprint-3-kickoff-prompt.md) — Sprint 3 kickoff (histórico)
- [23-sprint-3-handoff-and-followup.md](23-sprint-3-handoff-and-followup.md) — Sprint 3 handoff (histórico)
- [24-wave-3-kickoff-prompt.md](24-wave-3-kickoff-prompt.md) — Wave 3 kickoff (próximo)
- `docs/supabase-migration-runner.md` — pattern oficial de migrations (CLI primary)
- Memory: `~/.claude/projects/c--Projetos-Daniel-projeto-rpg/memory/MEMORY.md` (auto-loaded)
