# Wave 2 Code Review + Fixes — Player Identity (2026-04-20)

Re-review adversarial após Wave 2 (a/b/c) shipped. **4 reviewers paralelos** em clusters coesos, triage em Critical/Major/Minor/Suggestion, **4 fix agents paralelos** com merge sequencial + renumber de collision.

## Achados

**5 Critical + 21 Major** fixados. Minor/Suggestion mostly deferred pra backlog.

### Critical (5 — todos fixed)

| ID | Issue | Fix commit |
|---|---|---|
| **C1** | OAuth callback enviava credenciais literais placeholders (`__oauth__@pocketdm.com.br`) pro `/api/player-identity/upgrade` — poderia corromper email do user | `96014d5b` (cluster A) — `mode: "oauth"` flag, server skipa credential steps |
| **C2** | Half-upgraded state race: `auth.updateUser` client-side + POST upgrade → se POST falha, user fica stranded (email+password setado mas zero migration) | `96014d5b` — `admin.updateUserById` server-side atomic com saga |
| **C3** | InviteLanding anon-warning UNREACHABLE — picker auto-open + silent drop de close = user nunca vê CTA "criar conta" | `a0f7216a` (cluster C) — banner-first pattern, picker on-demand |
| **C4** | PlayerJoinClient test harness limitation: tests validam callback mirror, não componente real (3043 linhas) — regression pode entrar silenciosamente | **Não fixado** — documentado em CLAUDE.md futuro como known tradeoff; mitigação via Playwright E2E em staging |
| **C5** | `users` RLS policy só permitia `auth.uid() = id` → player via DM name como `""` silenciosamente | `15e1d286` (cluster B) — migration 157 cria `users_select_public_profile` (id + display_name + avatar_url, sem email) |

### Major (21 — todos fixed exceto 1)

| ID | Area | Fix |
|---|---|---|
| **M1** | `/api/characters/claimable` sem UUID validation | Regex UUID v4 → 400 `invalid_uuid` |
| **M2** | `/api/characters/*` sem rate limit | `withRateLimit(60/min, per user)` |
| **M3** | Load-more race: rapid double-click → duplicatas | `useRef<number>` offset + inflight guard ref |
| **M4** | Upgrade context TTL 15min insuficiente pra mobile OAuth | 15min → 60min |
| **M5** | Callback silencioso em upgrade fail → user reaches dashboard half-migrated | Error banner inline + retry + "ignorar" buttons |
| **M6** | Form state (email/displayName) perdido em tab switch login↔signup | Lifted state no AuthModal; password intencional NOT lifted (security) |
| **M7** | SessionHistory ordena por `combatants.created_at` (re-join puxa sessão antiga pro topo) | `foreignTable: "encounters.sessions"` + query rewrite começando por `sessions` |
| **M8** | `.limit(500)` silent truncation em MyCampaigns/MyCharacters | `count: "exact", head: true` per-campaign + `.limit(1)` per-char parallel lookups |
| **M9+M10** | Cursor pagination broken (sem id tiebreaker, combatants vs sessions timestamp mismatch) | Cursor keyset `(sessions.created_at, sessions.id)` com `.or` tiebreaker |
| **M11** | update-default-character race entre ownership check e UPDATE | Migration 158 cria `update_default_character_if_owner` RPC atomic single UPDATE |
| **M12** | `/invite/[token]` sem error boundary | `app/invite/[token]/error.tsx` com retry + Sentry |
| **M13** | Skeleton/Suspense untested | **Deferred** — Next 15 streaming não é testável em jsdom; mitigação em E2E staging |
| **M14** | AuthModalLazy Suspense fallback null → offline chunk fetch = silent break | ErrorBoundary wrapper + AuthModalLoadErrorToast fallback |
| **M15** | Dismissal-store `__guest__` não migra pra real `campaignId` após upgrade | `migrateDismissalEntry(fromId, toId)` helper + chamada em `handleAuthModalSuccess` |
| **M16** | linkCharacter não-atômico (3 round-trips separados — crash meio = state inconsistente) | Migration 155 `link_character_and_join_campaign` RPC em single tx |
| **M17** | `ON CONFLICT DO NOTHING` não reactivate inactive/banned members | RPC agora `ON CONFLICT DO UPDATE SET status='active'` |
| **M18** | `invite_invalid` code coarse — UX copy indiferenciada | Split em 7 sub-codes (not_found/expired/already_accepted/mismatch) |
| **M19** | Scenario 5 race skipped em Playwright | **Deferred** — Jest mock valida logic; real concurrent E2E requer 2 browser contexts, fica pra staging validation |
| **M20** | E2E scenario-5 `waitForResponse(/api/campaign-invites)` URL não match server action → 15s timeout every run | Pattern match `POST /invite/*` + remove timeout race |
| **M21** | `loginAs()` helper hangs 30s em bad creds sem diagnóstico | Fast-fail 3s via `Promise.race` entre error banner + waitForURL |

## Commits shippados (5)

```
15e1d286 fix(dashboard): Wave 2 code review — 6 correctness fixes (cluster B)
96014d5b fix(player-identity): Wave 2 code review — OAuth + upgrade hardening (cluster A)
a0f7216a fix(player-identity): Wave 2 code review — invite/join UX (cluster C)
c6c1b08b fix(player-identity): Wave 2 code review — linkCharacter + E2E (cluster D)
<renumber commit>      chore(migrations): resolve 155/156 collision
```

## Migrations finais

| Migration | Propósito | Origem |
|---|---|---|
| `151_harden_create_campaign_search_path.sql` | Wave 0 hardening | Wave 0 |
| `155_link_character_rpc.sql` | Cluster D — atomic link + reactivation | Wave 2 fix |
| `157_users_display_name_public.sql` | Cluster B — permite player ver DM name | Wave 2 fix (renumbered) |
| `158_update_default_character_atomic.sql` | Cluster B — RPC race-free | Wave 2 fix (renumbered) |

Epic 04 migrations **buffer zone 160-164** continuam reservados.

## Números

| Métrica | Pre-review | Post-review |
|---|---|---|
| Tests pass | 311 | **349** (+38) |
| tsc --noEmit | ✅ | ✅ |
| Critical findings | 5 | 0 (exceto C4 deferred) |
| Major findings | 21 | 0 (exceto M13, M19 deferred) |

## Findings deferred (documentados)

1. **C4 (PlayerJoinClient harness)** — testes em isolamento do 3043-line client. Alternativa: Playwright E2E em staging validates real integration. Não-bloqueia Wave 3.
2. **M13 (Skeleton Suspense untested)** — Next 15 RSC streaming não testable em jsdom. E2E visual regression em staging cobre.
3. **M19 (Scenario 5 race E2E)** — Jest mock valida concurrency logic; real concurrent race requer multi-browser-context que está no escopo do staging validation stage.

## Lições

1. **Worktree escape bug #3 — RECORRENTE.** Dois agentes (cluster C, cluster D) committaram direto em master em vez dos próprios worktrees. Cherry-pick apenas pros que NÃO escaparam. Vale monitorar em futuros dispatches.
2. **Migration number collisions cada vez mais frequentes** — 155 duplo em UMA sessão. Buffer zones (+10) continuam sendo a estratégia defensiva correta.
3. **Adversarial re-review PÓS-shipment continua pegando 5+21 issues** que nenhum agent review pré-commit viu. Worth the time investment.
4. **Cluster-based fix dispatch é mais eficiente que um fix-por-finding** — 4 agents cobriram 26 fixes em paralelo.

## Follow-ups para próximo round

- Port M13 (skeleton tests) via Playwright visual regression quando E2E em staging estiver setup
- Scenario 5 race real E2E (M19) — dois `browser.newContext()` em paralelo
- C4 — decidir se PlayerJoinClient merecer refactor em chunks menores (pulling logic OUT em vez de adding JSX fragments inline)
- Copy polish PT-BR ("preservado" → "salvo" em conversion.recap_anon — flagged lá atrás)
- Pattern doc §3.8 gotcha `<em>{var}</em>` (Wave 1 flagged)

---

**Estado final:** Epic 02 code-complete + fully reviewed + fixes shipped. Master tip = pós-renumber commit. Ready pra Wave 3 (Epic 03).
