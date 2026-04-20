# Epic 02 Completion — Player Dashboard & Invite Inteligente (2026-04-20)

**Status:** ✅ Code-complete. Epic 02 shippado em 9 stories + Wave 0 specs + fixes.

## Storey map — 9/9 shipados

| Story | Wave | Commit | Tests |
|---|---|---|---|
| 02-A detect{Invite,Join}State utilities | 1 | `1ca54f16` | 25 |
| 02-F-skeleton dashboard shell + Continue card | 1 | `0a6df7c8` | 9 |
| 02-B-prep CharacterPickerModal extraction | 1 | `185d7845` | 22 |
| 02-B full pagination + tabs + CharacterWizard | 2a | `a7de0bd1` | 43 |
| 02-C AuthModal + upgradeContext + OAuth | 2a | `d7ba61b7` | 23 |
| 02-F full dashboard 4 sections (real data) | 2a | `7e5d90f8` | 37 |
| 02-D InviteLanding + redesign /invite/[token] | 2b | `2dbe82bf` | 20 |
| 02-E /join mods (PlayerJoinClient aditivo) | 2b | `fbf310a4` | 5 |
| 02-G sessions page + default char settings | 2b | `f72cd36f` | 13 |
| 02-H linkCharacterToCampaign + race tests | 2c | `1e884607` | 9 |
| 02-I E2E Playwright suite (4 specs) | 2c | `7a1aa7e0` | 14 E2E |

## Números

- **311 tests pass** + 5 skip (34 suites jest) — **5× crescimento** do baseline Epic 01 (59)
- **14 Playwright E2E tests** compiláveis (execução em staging com Supabase creds)
- **tsc --noEmit clean** em toda Epic 02
- **Zero regressão** no baseline Epic 01 (59+5 mantido)

## Fluxos end-to-end cobertos

### `/invite/[token]` smart landing
- Server: `detectInviteState(token)` → 4 estados discriminated (invalid/guest/auth/auth-with-invite-pending)
- Client: `InviteLanding` renderiza UI por estado + `AuthModal` (guest) ou `CharacterPickerModal` (auth)
- Skeleton shape-idêntico evita flash-of-wrong-UI
- Cenário 5 (returning player + standalone char): `linkCharacterToCampaign` com atomic UPDATE + WHERE-filter concurrency guard

### `/join/[token]` aditivo
- `PlayerJoinClient` (3043 linhas preservadas) ganha 2 entry points NOVOS:
  - Botão "Já tenho conta" no waiting room → AuthModal login + upgradeContext
  - Banner discreto "Criar conta?" consuming dismissal-store → AuthModal signup
- Parity invariants (4) todos testados: reconnect-from-storage, no-broadcast, heartbeat pause, session_token_id preservation
- Zero refactor. Zero regressão. Resilient Reconnection Rule intacta.

### `/app/dashboard` player view
- 4 seções com Suspense + server/client split:
  - Continue de onde parou (query real JOIN)
  - Meus personagens (grid rico, default badge)
  - Minhas campanhas (via campaign_members)
  - Histórico de sessões (RLS-aware query, últimas 10)
- Skeleton states 1:1 shape (zero CLS)

### `/app/dashboard/sessions` cursor-paginated
- 10 per page via URL searchParams
- Cursor format: b64(`${createdAt_ISO}_${sessionId}`)
- Keyset filter (stable against same-ms sessions)

### `/app/dashboard/settings/default-character`
- Server action `updateDefaultCharacter(characterId)` com ownership check
- UPDATE `users.default_character_id` + revalidatePath

### Auth + upgrade flow
- `AuthModal` reusável: login/signup tabs, alternância sem fechar
- `upgradeContext` → POST `/api/player-identity/upgrade` (Epic 01 primitive) em vez de `signUp`
- Google OAuth: localStorage persist em `identity-upgrade-context-v1`, callback continua fluxo
- `onSuccess` callback → consumer decide redirect

### Concurrency safety
- `linkCharacterToCampaign` atomic UPDATE com WHERE (`id AND user_id AND campaign_id IS NULL`)
- Se 0 rows affected → `character_not_available` (graceful retry UX)
- Race test: 2 concurrent calls → exactly 1 wins, outra cai em `character_not_available`

## Segurança (hardening Wave 0 + Code Review)

### Migration 151 (shipped em main)
- `ALTER FUNCTION create_campaign_with_settings SET search_path = pg_catalog, public, pg_temp` — previne search_path hijack em chained SECURITY DEFINER
- `REVOKE EXECUTE FROM PUBLIC` + `GRANT TO authenticated` — fecha vetor de privilege escalation

### E2E routes hardening
- `NODE_ENV === "production"` guard primeira linha de cada `/api/e2e/*` (defense in depth)
- `is_anonymous=true` pre-check em `/api/e2e/cleanup` (previne deleção de real users via service role)
- UUID validation em `/api/e2e/seed-session-token`

## Testids contract

`docs/testing-data-testid-contract.md` v1 com namespaces aplicados:
- `invite.landing.*`, `invite.picker.*`
- `auth.modal.*`
- `join.*`
- `dashboard.*`

## Bundle impact

- `AuthModal` lazy-loaded em `PlayerJoinClient` — zero bundle cost se user nunca clica CTA
- Server components fazem queries, client components recebem props tipados

## Next waves

### Wave 3 — Epic 03 Conversion Moments (pendente)
Stories já parcialmente shipadas:
- **03-A** dismissal-store + analytics + ALLOWED_EVENTS ✅ (Wave 1)
- **03-B** i18n copy + t.rich pattern doc ✅ (Wave 1)
- **03-C** WaitingRoomSignupCTA — consome AuthModal (Wave 2a) — pronto pra começar
- **03-D** RecapCtaCard anon — depende 03-C shape
- **03-E** Recap CTA guest + migrateGuestCharacterToAuth
- **03-F** Turn-safety (Quinn non-negotiable)
- **03-G** DIFERIDO pós-launch (F32)
- **03-H** E2E suite completa (6 specs incl. race `waiting-room-signup-race`)

Estimativa restante: 12-16d. Bloqueio: nenhum (Epic 02 primitives in master).

### Wave 4 — Epic 04 Player-as-DM (pendente)
Migrations 160-164 (buffer zone pós dupla colisão com entity-graph). Zero código shipado. 21-28d estimativa sequencial. Bloqueio: Epics 02 (✅) + 03 (aguarda Wave 3).

## Follow-ups abertos

1. **E2E execução em staging** — helpers esperam env vars `E2E_INVITE_TOKEN_GUEST`, `E2E_CAMPAIGN_ID_ACTIVE`, etc. Dani_ seed staging + configura fixtures
2. **createCampaignWithMember helper** — hoje é stub documentado; expandir quando houver seed endpoint ou usar Supabase direct
3. **pgTap harness** — scaffold shippado; Dani_ valida com Docker Desktop + integra CI (GitHub Action)
4. **`/app/dashboard/sessions` performance** — se campanhas têm >500 sessions, cursor pagination é robusta mas vale EXPLAIN ANALYZE em staging
5. **Migration 160-164 do Epic 04** — buffer zone defendido; aplicar em staging quando Wave 4 começar

## Arquivos chave criados nesta sessão

**Server-side:**
- `lib/identity/detect-invite-state.ts`
- `lib/identity/detect-join-state.ts`
- `lib/identity/link-character-to-campaign.ts`
- `lib/character/list-claimable-client.ts`
- `lib/character/list-mine.ts`
- `lib/auth/upgrade-context-storage.ts`
- `lib/user/update-default-character.ts`
- `lib/e2e/is-e2e-mode.ts`
- `lib/e2e/expose-supabase.ts`
- `supabase/migrations/151_harden_create_campaign_search_path.sql`

**Client components:**
- `components/auth/AuthModal.tsx`
- `components/invite/InviteLanding.tsx` + Skeleton
- `components/character/CharacterPickerModal.tsx` (refactored + extended)
- `components/dashboard/ContinueFromLastSession*.tsx` (+ Server + Skeleton)
- `components/dashboard/MyCharacters*.tsx` (+ Server + Grid + Skeleton)
- `components/dashboard/MyCampaigns*.tsx` (+ Server + Section + Skeleton)
- `components/dashboard/SessionHistory*.tsx` (+ Server + List + FullPage + Skeleton)
- `components/dashboard/DefaultCharacterSettings.tsx`
- `components/conversion/dismissal-store.ts`

**API routes:**
- `app/api/characters/claimable/route.ts`
- `app/api/characters/mine/route.ts`
- `app/api/e2e/auth-as-anon/route.ts`
- `app/api/e2e/cleanup/route.ts`
- `app/api/e2e/seed-session-token/route.ts`
- `app/auth/callback/route.ts` + `/continue/page.tsx`

**Pages:**
- `app/invite/[token]/page.tsx` (redesign)
- `app/app/dashboard/page.tsx` (4 sections)
- `app/app/dashboard/sessions/page.tsx`
- `app/app/dashboard/settings/default-character/page.tsx`

**Testing infra:**
- `supabase/tests/rls/` + `scripts/test-pgtap.sh` + `package.json test:pgtap`
- `docs/testing-data-testid-contract.md`

## Session stats

- **~4h de trabalho distribuído** (Wave 0 + Wave 1 + Code Review + Fixes + Wave 2a + Wave 2b + Wave 2c)
- **20+ agentes paralelos** despachados via worktree isolation
- **~30 commits feat/fix/docs** em player-identity + testing + E2E
- **~12.000 linhas de código + docs** shipadas
- **Zero regressão** em código existente
- **5 waves** (0, 1, 2a, 2b, 2c) + 1 rodada de adversarial review + fixes
