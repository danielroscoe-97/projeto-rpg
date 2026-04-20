# Wave 1 Code Review + Fixes — Player Identity (2026-04-20)

Re-review adversarial completo após Wave 1 shipped. **6 reviewers paralelos** (Winston/Quinn/Sally/John/Paige voices), triage em Critical/Major/Minor/Suggestion, 4 fix agents paralelos + edits self, 6 commits de fix. Zero teste quebrado ao longo.

## Achados

**6 Critical + 13 Major** endereçados. Minor + Suggestions parcialmente (escopo Wave 2+).

### Critical (6 — todos fixed)

| ID | Issue | Fix commit |
|---|---|---|
| **C1** | Migration 152 collision (entity-graph já tomou) | `a6e116b7` renumber + `5c11d5b9` shift pra buffer 160-164 (entity-graph Fase 3e ainda pegou 153) |
| **C2** | `/invite/[token]` dead-end quando user fecha modal | `483727c1` — `onOpenChange` ignora close attempts |
| **C3** | Skeleton do dashboard NUNCA renderizava (await bloqueia JSX) | `f06a3144` — Suspense boundary + server component split |
| **C4** | `CharacterPickerModal` testids ad-hoc violavam contrato §3.3 | `483727c1` — 20 testids migrados pra namespace `invite.picker.*` |
| **C5** | `/api/e2e/cleanup` podia deletar users não-anon via UUID conhecido | `7f57dc5d` — `getUserById` pre-check + skip se `is_anonymous !== true` |
| **C6** | E2E routes dependiam APENAS do env var flag (vazar flag em prod = exposure) | `7f57dc5d` — `NODE_ENV === "production"` guard (defense in depth) |

### Major (13 — todos fixed)

| ID | Issue | Fix |
|---|---|---|
| **M1** | `navigator.language` causava hydration mismatch no Continue card | `useLocale()` do next-intl, prop passada pelo server component |
| **M2** | `Intl.RelativeTimeFormat` mostrava "in 30 seconds" em future dates (clock skew) | `Math.min(0, diffSec)` clamp |
| **M3** | Modal resetava state ao reabrir (user perdia dados mid-fill) | Reset condicionado a mudança de `campaignId`, não de `open` |
| **M4** | Migration 151 sem REVOKE EXECUTE FROM PUBLIC | `a6e116b7` — adicionado `REVOKE ... FROM PUBLIC; GRANT TO authenticated` |
| **M5** | `search_path = public, pg_temp` defensável mas não ideal | `a6e116b7` — shift pra `pg_catalog, public, pg_temp` |
| **M6** | `detectInviteState` hardcodava fallback `"DM"` string | `f2e92d84` — retorna `displayName: string \| null`, consumer traduz |
| **M7** | `detectJoinState` retornava `returning-anon` ambíguo em auth mismatch | `f2e92d84` — 5º estado `"returning-auth-mismatch"` explícito |
| **M8** | `detectInviteState` classificava anon user como `"auth"` | `f2e92d84` — `isAnonymous: boolean` no state |
| **M9** | `dismissal-store.shouldShowCta` duplicava TTL/parse logic | `f2e92d84` — refactor pra reusar `readDismissalRecord()` |
| **M10** | Epic 03 cookie name `sb-access-token` vs standard `sb-<project>-auth-token` | Flagged no review, fix virá no dispatch da Story 03-A upgrade |
| **M11** | Epic 03 AC F30 depende de `player:idle` payload `reason=signing_up` não-implementado | Flagged pra Story 03-F (turn-safety story owns) |
| **M12** | `data-testid` contract §3.1/§3.3 stale vs código | `483727c1` — doc sincronizado com CharacterPickerModal real |
| **M13** | Pattern doc i18n sem gotcha `<em>{var}</em>` (var dinâmica em tag rich) | Flagged, Paige abre PR rápido |

### Minor (10+) + Suggestions (8+)

Parcialmente fixed durante os patches. Resto vai em backlog grooming pós Wave 2.

Destaques flaggados mas não-fixados:
- pgTap tests são majoritariamente positive-path (falhariam se RLS fosse deletado? Só 2 de 7 são true negatives)
- 6 event names duplicados entre `analytics.ts` + `track route` ALLOWED_EVENTS (sugestão: const shared)
- Copy PT "preservado" → "salvo" em `post_success.recap_anon` (consistência)
- `allowModes=[]` trap no picker (empty form sem submit path)

## Resultado

### Commits shippados (6)

```
5c11d5b9 fix(player-identity): shift Epic 04 to 160-164 buffer zone (avoid entity-graph race)
f2e92d84 fix(player-identity): detect state contract + dismissal dedup
483727c1 fix(picker): testid contract alignment + no-close dead-end + persist state on reopen
f06a3144 fix(dashboard): Suspense boundary + locale from next-intl + clock skew clamp
7f57dc5d fix(e2e): NODE_ENV=production guard + is_anonymous pre-check + uuid validation
a6e116b7 fix(player-identity): Wave 1 review fixes — Epic 04 renumber + migration 151 hardening
```

### Estado final

- **Master tip:** `5c11d5b9`
- **tsc --noEmit:** ✅ clean
- **Tests** nas áreas afetadas: **194 pass + 5 skip, 199 total, 0 fail** (19 suites)
- **Progressão:** 170 → 194 tests (+24 novos via fix agents)
- **Worktrees pruned** (git-level; filesystem dirs podem precisar cleanup manual)

### Epic 04 final migration numbering

Migration 151 (standalone search_path hardening) + Epic 04 stack em buffer zone:

- `151_harden_create_campaign_search_path.sql` — já em main (Wave 0 + M4/M5 hardening)
- `160_v_player_sessions_played.sql` — matview + pg_cron + F29 `security_invoker=true`
- `161_user_onboarding_dm.sql`
- `162_campaign_templates.sql`
- `163_seed_starter_templates.sql`
- `164_past_companions.sql`

## Lições

1. **Migration numbers em race com paralelismo** — buffer zones (ex: +10 gap) são mais estáveis que "next free"
2. **Adversarial re-review pós-shipment vale ouro** — Wave 1 tinha 6 criticals que nenhum review Wave 0 tinha pegado
3. **Cherry-pick merge conflicts podem apagar contribuições silenciosamente** — Sally's testids sumiram na merge de 02-B-prep, só foi detectado no review
4. **Worktree escape bug (#3)** — Sally's agent commitou DIRETO em master em vez do worktree. Vale monitorar em futuros dispatches
5. **Fix agents paralelos funcionam bem quando scope é apertado** — 4 agents em paralelo fixaram 13 issues em ~5min wall-clock

## Backlog pós-Wave 2

- Port os flaggeds Minor + Suggestions pra tickets pequenos
- pgTap destrava `avatar-url-constraint` + `rls-soft-claim-integration` (2 dos 5 skipped)
- Pattern doc adiciona gotcha 3.8 (`<em>{var}</em>`)
- Analytics event names como const shared
- Copy polish PT ("preservado" → "salvo")
