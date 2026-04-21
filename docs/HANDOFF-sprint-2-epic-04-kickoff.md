# Sprint 2 Kickoff — Epic 04 Player-as-DM Upsell

Você está iniciando a **Sprint 2** do Epic 04 (Player-as-DM Upsell) no
PocketDM (Next.js 15 + Supabase). Sprint 1 foi shipada e aplicada em
prod em 2026-04-21. Este doc é a fonte única — leia tudo antes de agir.

## Estado atual (início Sprint 2)

### ✅ Sprint 1 completa em PROD

**Migrations aplicadas (165-177):**
- 165 `v_player_sessions_played` matview + wrapper view + pg_cron refresh
- 166 `user_onboarding` DM columns + `users.share_past_companions`
- 167 `srd_monster_slugs` (419 slugs) + `campaign_templates` + trigger SRD
- 168 3 seed templates (placeholder + conteúdo SRD real)
- 169 `get_past_companions()` SECURITY DEFINER
- 170 `clone_campaign_from_template()` RPC
- 171 seeds monsters_payload (SRD-only)
- 172 corretiva (H6 sort_order loop precursor + M5 tiebreaker)
- 173 H3 privacy INNER JOIN + `audit_template_srd_drift()`
- 174 H6 REAL fix (`encounters.sort_order` column) + audit service_role GRANT
- 175 FK `player_characters.campaign_id` CASCADE → SET NULL
- 176 `get_past_companions` pagination tiebreaker
- 177 COMMENT ON FUNCTION create_campaign_with_settings (join_code charset contract)

Próxima migration livre: **178**.

**TS types atualizados** em `lib/types/database.ts`:
- `users.share_past_companions`
- `user_onboarding.{dm_tour_completed, dm_tour_step, first_campaign_created_at}`
- Tables: `campaign_templates`, `campaign_template_encounters`, `srd_monster_slugs`, `user_onboarding` (full Row/Insert/Update)
- Views: `my_sessions_played`
- Functions: `get_past_companions`
- Interfaces: `CampaignTemplateMonsterEntry`, `PastCompanion`, `MySessionsPlayed`

**Libs/APIs shipados:**
- `lib/upsell/get-sessions-played.ts` (server action — F19 fallback documentado como dormant)
- `lib/upsell/should-show-dm-cta.ts` (6 cenários AC Test 4 + self-heal M12)
- `lib/upsell/clone-template.ts` (wrapper com discriminated union: ok/forbidden/not_found/missing_monsters/retry/unknown)
- `lib/upsell/past-companions.ts` (wrapper + captureError)
- `app/api/upsell/should-show-dm-cta/route.ts` (GET, Cache-Control no-store)
- `app/api/campaign/[id]/invites/bulk/route.ts` (POST bulk invite — maxDuration 60, Promise.allSettled, withRateLimit, parallel send)

**Tests shipados:**
- Jest: 59/59 em `tests/upsell/` (6 arquivos)
- pgTap: 18 asserts em `supabase/tests/upsell/` (4 arquivos, Docker required)
- Baseline total: **486 pass + 5 skip em 44 suites, zero fail**

**Scripts utilitários:**
- `scripts/smoke-sprint1-migrations.ts` (parse-level via pg-query-emscripten, glob-based)
- `scripts/validate-srd-monster-whitelist-sync.ts` (419/419 check)

**Adversarial review history:**
- 3 rounds completos (9 agent runs totais)
- 8 🔴 + 14 🟠 + ~20 🟡 findings endereçados
- Report completo em commits: `f64efae3`, `957b7266`, `d3f95978`, `cdcf72e4`, `c1686b9d`, `ff5402d9`, `6c5b51c9`, `126cd09f`, `751a8e01`

### 🎯 Sprint 2 Stories

Spec: `docs/epics/player-identity/epic-04-player-as-dm-upsell.md` (~1200 linhas,
inclui 40+ F-items + D1-D15 decisions).

**DAG Sprint 2:**

```
04-E BecomeDmCta + dashboard integration (Área 1) ← depende de 04-B (shipado)
  └─ Componente component/upsell/BecomeDmCta.tsx
  └─ Injeção em app/app/dashboard/page.tsx player view
  └─ Dismissal store (reusa Epic 03 Área 6)
  └─ Analytics: dm_upsell:cta_shown / dismissed / clicked

04-F BecomeDmWizard + role flip + DmTourProvider (Área 3) ← depende de 04-E
  └─ component/upsell/BecomeDmWizard.tsx (5 steps)
  └─ component/tour/DmTourProvider.tsx
  └─ component/tour/dm-tour-steps.ts
  └─ updateRole() broadcast em user:{userId} (D9)
  └─ Consome 04-C templates (shipados)
  └─ Analytics: dm_upsell:role_upgraded_to_dm / first_campaign_created / tour_completed

04-G TemplateGallery + TemplateDetailModal (Área 4 UI) ← depende de 04-C, 04-F
  └─ component/upsell/TemplateGallery.tsx
  └─ component/upsell/TemplateDetailModal.tsx
  └─ Consome clone-template.ts wrapper (shipado)
  └─ Handle {ok:false, code:'missing_monsters'} com retry UX

04-H InvitePastCompanions tab em InvitePlayerDialog (Área 5 UI) ← depende de 04-D, 04-F
  └─ component/upsell/InvitePastCompanions.tsx
  └─ Tab nova em components/campaign/InvitePlayerDialog.tsx (aditivo, NÃO refactor)
  └─ Consome past-companions.ts wrapper (shipado)
  └─ POST /api/campaign/[id]/invites/bulk (shipado — new response shape: sent, skipped_no_email, skipped_duplicate, skipped_budget, email_failed, insert_failed)

04-I Analytics + MetricsDashboard section + admin route (Área 6) ← depende de 04-E-H
  └─ app/admin/dm-upsell-funnel/page.tsx (rota real /app/admin/)
  └─ SECTION em components/admin/MetricsDashboard.tsx (F7 escolha b — NÃO tab)
  └─ app/api/admin/metrics/route.ts extend com dm_upsell_funnel
  └─ D14: dm_upsell:first_campaign_created emitido de lib/supabase/campaign-settings.ts

04-J E2E Playwright suite ← depende de 04-E-I
  └─ e2e/upsell/player-becomes-dm-full-flow.spec.ts
  └─ e2e/upsell/template-clone-first-session.spec.ts
  └─ e2e/upsell/past-companions-invite.spec.ts

04-K i18n dmUpsell namespace + Paige copy review ← paralelo a E-J
  └─ messages/en.json + messages/pt-BR.json namespace "dmUpsell"
  └─ t.rich() para marcações <em>
  └─ Paige aprova copy antes de merge
```

**Estimativa:** 10-15 dias úteis (menor que Sprint 1 porque fundação toda shipada).

### ⚠️ Gotchas / dívidas técnicas conhecidas

1. **F19 hot-path é DEAD CODE hoje.** `users.last_session_at` só é escrito em `lib/supabase/player-identity.ts:544` (anon→auth upgrade). Combat flows não atualizam. Wire-up é 1-liner em encounter-close — FAÇA antes de 04-I pra analytics `first_session_run` funcionar. Detalhes no docstring de `lib/upsell/get-sessions-played.ts`.

2. **pg_cron agendado manualmente em prod** (o DO block em 165 engoliu silent exception). Job `refresh_v_player_sessions_played` existe a cada 15 min. Se apagar, re-agendar com `SELECT cron.schedule('refresh_v_player_sessions_played', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY v_player_sessions_played');`.

3. **Bulk invite mudou response shape** em Sprint 1 re-review: agora retorna `sent, skipped_no_email, skipped_duplicate, skipped_budget, email_failed, insert_failed, rate_limited`. UI de 04-H deve consumir todos os buckets pra feedback claro.

4. **`shouldShowDmCta` ganhou 7º cenário** (M12): role=both + onboarding row MISSING + 0 owned campaigns → fall through (treat as first_campaign null). Spec AC Test 4 enumera 6 cenários mas code tem 7 agora. Não é bug, é hardening.

5. **CLAUDE.md rules ativas**:
   - **Combat Parity**: nada em Sprint 2 toca combat. N/A.
   - **Resilient Reconnection**: role flip em 04-F DEVE preservar `session_token_id`. D9 — broadcast em canal `user:{userId}`, NÃO em `campaign:*`. Test 10 do spec §Testing Contract é obrigatório.
   - **SRD Compliance**: templates shipados em 171 usam só slugs do `srd_monster_slugs` (419 entries). Se 04-G mostrar preview de monstros, consuma de `data/srd/monsters-*.json` (build-time SRD-only), NÃO de `monsters` table direta.
   - **SEO Canonical**: `app/admin/dm-upsell-funnel` deve ter `noindex` (match layout `/app/admin/*` existente).

6. **Dismissal store reuso** (Epic 03 Área 6): veja `lib/stores/` ou `components/conversion/` pros patterns. Namespace novo: `pocketdm_dm_upsell_dismissal_v1`.

7. **Next-intl stack** (`messages/{en,pt-BR}.json`), NÃO next-i18next. Flat keys. `t.rich()` para `<em>` em copy.

### Verificações iniciais (roda ANTES de escrever código)

```bash
rtk git log -5 --oneline                 # confirma master tip
rtk git status --short                   # workspace clean?
rtk npm test -- tests/upsell/             # baseline 59/59
rtk tsc --noEmit                          # 2 errors pre-existing em .next/types/validator.ts (SEO Epic A) OK
npx supabase migration list | tail -5     # última applied = 177
```

Se algo falhar, **reporte antes de escrever código novo**.

### Padrões estabelecidos nas Waves anteriores

- `"use server"` em server actions
- `createClient()` (cookie-aware) vs `createServiceClient()` (service_role)
- Discriminated union Result: `{ ok: true, ... } | { ok: false, code, retryable, message }`
- File references como markdown `file.ts:42`
- RTK prefix em todos comandos (`rtk git`, `rtk npm`, `rtk tsc`, `rtk next`)
- Commit `--only` com paths explícitos — Dani trabalha em paralelo
- Jest (NÃO vitest), RTL, globals sem import
- Playwright pra E2E (`e2e/upsell/` é o padrão pós Epic 03)
- Buffer zones: próxima migration livre é **178**

### Adversarial review pós-shipment

**É mandatory pra features não-triviais.** 3 reviewers em paralelo:
- Blind Hunter (diff-only, no context)
- Edge Case Hunter (project read access + boundary probing)
- Acceptance Auditor (diff + spec + AC checklist)

Já pegou 5+21+8 findings em Sprint 1 que os pre-reviews não viram. Padrão Dani aprovou como default.

### Quando encontrar bug em código shipado

**Fix-forward com migration nova** ao invés de editar migration já em prod.
Exemplo: 172/173/174/176 foram corretivas de CREATE OR REPLACE em cima de
funções shipadas em 169/170. Mantém git history limpo.

---

**Quando estiver pronto, comece com:**

> Li `docs/HANDOFF-sprint-2-epic-04-kickoff.md`. Estado: Sprint 1 shipada +
> aplicada em prod 2026-04-21 (migrations 165-177). Baseline 486 pass + 5 skip.
> Master tip `<SHA>`. Próxima migration livre 178.
>
> Rodei verificações iniciais. Resultado: [✅ clean / ⚠️ X failing / etc].
>
> Sprint 2 escopo: Stories 04-E, 04-F, 04-G, 04-H, 04-I, 04-J, 04-K.
>
> Quer que eu ataque na ordem do DAG (04-E → 04-F → ...) ou dispatch
> agents paralelos via worktrees pros que são independentes (04-K i18n
> pode rolar em paralelo)?

**Sempre pergunte antes de assumir ordem ou scope.** 🎲
