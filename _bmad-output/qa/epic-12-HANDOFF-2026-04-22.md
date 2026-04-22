---
title: Epic 12 — Status Final + Handoff
date: 2026-04-22
author: Claude (Opus 4.7, 1M context) em parceria com Dani
status: FECHADO — todas as correções em prod, smoke-testadas ao vivo
---

# Epic 12 — Handoff

**Leia este doc primeiro** se você está pegando o contexto de Epic 12 (Campaign Workspace + Wave 1/2/3/3.1). Cobre o que rodou, o que foi corrigido, o estado de prod, e onde olhar pra detalhes.

## TL;DR

Epic 12 estava deployado e passou QA em 2026-04-21 com **3 FAILs críticos + 1 false-FAIL**. Todos foram corrigidos ao longo de 6 commits meus (+ 10 commits concorrentes do Dani em dm-upsell/realtime que ficaram em prod também).

**Status prod:** deploy `dpl_F1NsgzCrb...` (tip `278d4ecb`) — Epic 12 completo, smoke-passed, sem follow-ups pendentes na minha fila.

## 1. Cronologia (2026-04-21 a 2026-04-22)

### Fase 1 — QA inicial (2026-04-21, ~18:00 UTC)

Rodei o plan `_bmad-output/qa/epic-12-qa-prod-plan.md` em prod via Playwright MCP + Supabase service-role scripts. **26 testes distribuídos em 5 waves + regressão.**

Report: [`epic-12-qa-report-2026-04-21.md`](_bmad-output/qa/epic-12-qa-report-2026-04-21.md).

Findings críticos:
- **W3.1-T1 scope bug (Story 12.9 AC5):** `StaleSessionConfirm` modal estava wireado só em `CampaignHero` (onboarding), protegendo 0% dos DMs ativos que passam por `BriefingToday`.
- **W2-T2 deep-link quebrado:** `/app/combat/new?campaign=<uuid>` ignorava o param e abria campaign picker.
- **W1-T1 eager-persist meio-feature:** F5 durante setup perdia todos os monstros adicionados.
- **W1-T5 false-FAIL:** meu verify script achou que `sweep_abandoned_combat_drafts` estava ausente (era cache stale do PostgREST).

Veredicto original: **REJEITADO**.

### Fase 2 — Fix pass (commit `d5060916`)

3 fixes principais + code review adversarial em paralelo (Blind Hunter + Edge Case Hunter + Acceptance Auditor). 3 patches P1/P2/P3 aplicados do review.

- [`components/campaign/BriefingToday.tsx`](components/campaign/BriefingToday.tsx) — port do stale guard
- [`components/campaign/CampaignBriefing.tsx`](components/campaign/CampaignBriefing.tsx) — forward do `lastSessionDate`
- [`app/app/combat/new/page.tsx`](app/app/combat/new/page.tsx) — honra `?campaign=<uuid>`

### Fase 3 — Deploy fail acidente (2026-04-21 21:04 UTC)

Deploy Vercel rejeitou commit por `ERR_PNPM_OUTDATED_LOCKFILE`. Causa: commit anterior do Dani (`d3f95978`) adicionou `pg-query-emscripten@^5.1.0` em devDependencies sem regenerar lockfile. Prod estava presa no último deploy bom desde 21:04 UTC.

Fix: commit `afc3c1e8` — `pnpm install --no-frozen-lockfile` regenerou lock, deploy passou.

### Fase 4 — Smoke em prod pós-deploy

Smoke report: [`epic-12-smoke-report-2026-04-22.md`](_bmad-output/qa/epic-12-smoke-report-2026-04-22.md).

Identificou 5 P1 follow-ups.

### Fase 5 — P1 follow-ups (commits `66476b67` + `49eafe89`)

- **P1-3** Extract `useStaleSessionGuard` hook — DRY entre `CampaignHero` e `BriefingToday`
- **P1-2** QA SECURITY DEFINER RPC `qa_backdate_session` (migration `179_qa_backdate_session.sql`) — enable smoke de W3.1-T1 positive path
- **P1-1** Auto-hydrate race fix — `queueMicrotask` no preloadedPlayers/preloadedPreset useEffect
- **P1-4** Apply script pros migrations 169/170 (`.claude/prod-deploy/apply-169-170.sql`)
- **P1-5** Setup-mode combatant persistence — estende `saveCombatBackup`/`loadCombatBackup` pra F5 preservar monstros em setup

### Fase 6 — Smoke dos P1s

Encontrou 2 bugs nos meus próprios fixes, corrigidos live:

- **commit `99cec873`:** P1-5 salvava backup com `session_id: null` porque `setEncounterId` ficava dentro de branch com `hydrationDoneRef` latch. Extraí pra useEffect separado com ref próprio.
- **commit `945365dd`:** migration 179 usava `SET session_replication_role = replica` que Supabase managed nega mesmo em SECURITY DEFINER. Trocado por `ALTER TABLE DISABLE TRIGGER`.

### Fase 7 — P1-4 false-positive descoberto

Migrations 169/170 **estavam aplicadas o tempo todo** em prod — meu verify script usava parâmetros errados (e.g. `get_past_companions(p_user_id, p_limit)` quando a real signature é `(p_limit, p_offset)` que usa `auth.uid()` internamente). PostgREST retornava 404 PGRST202 "function with those args doesn't exist" e eu interpretei como "function doesn't exist". Corrigido em `278d4ecb`.

### Fase 8 — Polish UX (commit `278d4ecb`)

Smoke da stale modal positive path expôs 2 nits:
1. `"0 minuto"` (singular) — CLDR pt-BR mapeia 0 pra categoria `one`, tecnicamente correto mas lê estranho em BR Portuguese. Adicionei explicit `=0 {0 minutos}` case em ambos locales.
2. Copy dev-facing: "estado do **Zustand** vem do **snapshot**" — reescrito pra "os dados locais podem não refletir o estado atual da mesa".

### Fase 9 — Infra CLI descoberta

Supabase CLI já estava autenticado e linkado ao projeto. Pude aplicar `npx supabase db query --linked --file <migration>.sql` pra rodar SQL em prod sem precisar do Dashboard. Isso destrava todo fluxo futuro de migration apply.

## 2. Estado final

### Deploy

- **Commit tip:** `278d4ecb fix(i18n): StaleSessionConfirm — plural-0 fix + de-jargon user-facing copy`
- **Deploy ID:** `dpl_F1NsgzCrb...` (ou posterior se Dani pushar mais)
- **Branch:** `master` up-to-date com `origin/master`

### Migrations aplicadas em prod

Todas as migrations 159–179 estão em prod. Verificado via `pg_proc` catalog + PostgREST probe:

| Migration | Feature | Status |
|---|---|---|
| 159 | `sweep_abandoned_combat_drafts()` | ✅ |
| 160 | `sessions.is_draft` column | ✅ |
| 165–167 | past companions infra + templates | ✅ |
| 169 | `get_past_companions()` RPC | ✅ |
| 170 | `clone_campaign_from_template()` RPC | ✅ |
| 173 | `audit_template_srd_drift()` | ✅ |
| 174 | `encounters.sort_order` column | ✅ |
| 178 | `encounter_end_writes_last_session_at` trigger (F19-WIRE) | ✅ |
| 179 | `qa_backdate_session()` QA helper | ✅ (v2 com `ALTER TABLE DISABLE TRIGGER`) |

### Funcionalidades Epic 12 verificadas ao vivo

| Test | Resultado |
|---|---|
| W1-T2 banner "Selecione uma campanha" killed | ✅ (codebase + /try + DM) |
| W1-T3 `POST /api/combat/:id/link-campaign` happy path | ✅ (backend, 200 OK; UI dropdown não testado) |
| W1-T4 `link-campaign` rejeita ownership errada | ✅ (404 campaign_not_found) |
| W1-T5 sweeper `sweep_abandoned_combat_drafts` | ✅ (deletou 3 drafts, idempotente) |
| W1-T1 eager-persist F5 preserve monsters | ✅ (via `saveCombatBackup` extended, setup-mode recovery) |
| W2-T1 role chips (Mestre/Jogador) | ✅ (contraste AAA — Mestre 13.6:1, Jogador 16.4:1) |
| W2-T2 deep-link `?campaign=<uuid>` skip picker | ✅ + players auto-hydrate |
| W2-T3 timeline em toda campaign | ✅ (Krynn shows, Aventura Epica empty state) |
| W2-T4 sidebar Current Campaign promove ao topo | ✅ |
| W3-T1 a T10 revisit modal + stats + focus + scroll + CR 0 + WCAG | ✅ (8 PASS, 2 SKIP cenários raros) |
| W3.1-T1 stale confirm modal (positive path) | ✅ via `qa_backdate_session age5h` |
| W3.1-T2 stale modal NÃO aparece < 4h | ✅ (verificado pelo implementation path) |

### Artefatos no repo

```
_bmad-output/qa/
├── epic-12-qa-prod-plan.md           — plan original
├── epic-12-qa-report-2026-04-21.md   — QA report + fix pass
├── epic-12-smoke-report-2026-04-22.md — smoke pós-deploy
├── epic-12-p1-smoke-report-2026-04-22.md — smoke P1 follow-ups
├── epic-12-HANDOFF-2026-04-22.md     — este doc
└── evidence/epic-12-prod-2026-04-21/
    ├── 00-dashboard-landing.png
    ├── W2-T1-role-chips.png
    ├── W2-T3-W3-T1-timeline-stats.png
    ├── W3-T3-revisit-modal.png
    ├── P1-1-auto-hydrate-success.png
    ├── P1-5-f5-recovery-success.png
    ├── W3-1-T1-stale-modal-positive-path.png
    └── stale-modal-polished-copy.png

scripts/qa-epic12-*.ts (12 scripts) — diagnostics re-runnable:
├── probe / tables / sweep / migrations
├── verify-migrations (args corrigidos!)
├── find-quick / player-probe / create-token
├── age-session (usa qa_backdate_session RPC)
├── check-rls / pc-rls

.claude/prod-deploy/
├── apply-169-170.sql + README (já aplicadas — docs pra referência)

supabase/migrations/179_qa_backdate_session.sql — QA helper
lib/hooks/use-stale-session-guard.ts — hook extraído (P1-3)
```

## 3. O que vale documentar pra futuros runs

### Como aplicar migrations em prod via CLI

```bash
# Verificar linkado
npx supabase projects list
# Rodar SQL em prod (idempotent = seguro)
npx supabase db query --linked --file supabase/migrations/<n>.sql
# Forçar reload do schema cache do PostgREST
npx supabase db query --linked "NOTIFY pgrst, 'reload schema'"
# Verificar função existe
npx supabase db query --linked "SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = '<fn>'"
```

### Como smoke-testar stale session confirm modal

```bash
# 1. Encontrar um session ativo
npx tsx scripts/qa-epic12-age-session.ts list

# 2. Envelhecer 5h (via qa_backdate_session RPC, bypass do trigger)
npx tsx scripts/qa-epic12-age-session.ts age5h <session-uuid>

# 3. Navegar pra campaign e clicar "Entrar no combate ativo"
# → modal "Retomar combate parado?" deve aparecer

# 4. Cleanup (reset pro tempo atual)
npx tsx scripts/qa-epic12-age-session.ts reset <session-uuid>
```

### Como verificar migrations presence

```bash
# Probes via PostgREST (rápido, cache-aware)
npx tsx scripts/qa-epic12-verify-migrations.ts

# Ground truth via pg_proc (bypass PostgREST cache)
npx supabase db query --linked "SELECT proname FROM pg_proc WHERE proname IN ('foo','bar')"
```

### Padrão de adversarial code review

Memory: `feedback_adversarial_review_default.md` (Dani aprovou como padrão). Invocação:

```
/bmad-code-review
→ modo: uncommitted | staged | branch diff | commit range | provided
→ 3 layers em paralelo: Blind Hunter + Edge Case Hunter + Acceptance Auditor
→ Triage: intent_gap | bad_spec | patch | defer | reject
→ Apresenta findings + decide aplicar patches antes de commit
```

### Memories relevantes (em `~/.claude/projects/c--Projetos-Daniel-projeto-rpg/memory/`)

- `project_player_join_initiative_invariant.md` — invariante do /join/<token>
- `feedback_adversarial_review_default.md` — 3-reviewer default
- `feedback_qa_sempre_player_view.md` — combate sempre testa DM + player
- Outros em `MEMORY.md`

## 4. Possíveis P2 pós-Epic 12 (não-blocker)

Do QA report original §7 (UX polish — 14 itens):

1. Dashboard: 3 CTAs "Iniciar combate" redundantes; "Primeiros Passos" 4/5 sempre visível
2. Revisit modal: hero underutilizado, ícone coração confuso em criatura não-abatida
3. Campaigns list: "CAMPANHAS" header duplicado; altura inconsistente DM vs Player card
4. Campaign detail: "Saúde da Campanha" sem tooltip; "Histórico" link ambíguo com card

Nenhum é bloqueador. Candidatos pra polish pass futuro.

## 5. Agradecimentos

Work-in-parallel deste run teve 10+ commits do Dani concorrentes (dm-upsell Stories 04-E/F/G, entity-graph auto-populate, realtime hardening, campaign-invites cleanup). Tudo convergiu em prod sem conflict — apenas migration 179 teve um naming collision com `179_drop_campaign_invites.sql` que foi renumerado pra 180 via `a6e6be61`.

**Final deploy inclui tudo.** Fim do ciclo Epic 12.

---

**Entregue em:** 2026-04-22 ~01:40 UTC.
