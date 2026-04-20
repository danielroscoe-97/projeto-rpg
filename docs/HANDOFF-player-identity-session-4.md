# Handoff — Player Identity & Continuity (PocketDM) — Sessão 4

Você está continuando uma iniciativa multi-sprint no **PocketDM** (Next.js 15 + Supabase). Este prompt é fonte única de verdade — leia TUDO antes de agir. Sem memória de sessões anteriores.

## 1. Contexto da Iniciativa

**"Player Identity & Continuity"** resolve o maior gargalo do Beta Test 3: players anônimos vivem uma sessão e somem. Decomposta em 4 épicos (big-bang release):

- **H1** — Reduzir atrito da próxima sessão (player volta mais rápido, já autenticado)
- **H2** — Retenção/conversão de anônimo em conta
- **H3** — Continuidade narrativa (personagem + campanha + histórico persistem)

**Decisão de release travada:** big-bang (4 épicos entram juntos em produção). Sem opt-out parcial.

## 2. Estado Atual (2026-04-20, pós Sessão 3)

### ✅ Épicos completos

| Epic | Status | Commits principais |
|---|---|---|
| **Parent** | Solid | (early commits) |
| **Epic 01 — Identity Foundation** | ✅ 100% code-complete + reviewed + fixed (Sessão 2/3) | `aa19d08e` → `6ee7d76d` |
| **Epic 02 — Player Dashboard & Invite** | ✅ 100% code-complete + **2 rounds of adversarial review** + fixes (Sessão 3) | `1ca54f16` → `b74dbedc` |
| **Epic 03 — Conversion Moments** | ⚠️ **PARCIAL** — 03-A + 03-B shipados; 03-C/D/E/F/H pendentes; 03-G DEFERRED pós-launch | `d8090dad`, `7f39ff30` |
| **Epic 04 — Player-as-DM Upsell** | ⚠️ **DOCS-ONLY** — spec v3.2 aprovado (migrations 160-164 buffer); ZERO código | Spec em `docs/epics/player-identity/epic-04-player-as-dm-upsell.md` |

### 📊 Baseline de testes

- **tests/player-identity/**: 59 pass + 5 skip (Epic 01 baseline intocado)
- **Full Wave 2 surfaces**: 349 pass + 5 skip em 36 suites
- **tsc --noEmit**: ✅ clean
- **Master tip**: `b74dbedc`

### 🗂 Migrations em main (relevantes)

| Num | Conteúdo | Origem |
|---|---|---|
| 151 | harden `create_campaign_with_settings` search_path + REVOKE | Wave 0 (Sessão 3) |
| 152 | entity_graph_edge_cascade | parallel (não nossa) |
| 153 | migrate_note_npc_links_to_edges | parallel |
| 154 | entity_graph_scope_guard_tighten | parallel |
| 155 | link_character_and_join_campaign RPC | Wave 2 fix |
| 157 | users_select_public_profile (display_name visible to auth) | Wave 2 fix |
| 158 | update_default_character_if_owner RPC | Wave 2 fix |

**Próxima livre:** 159 (entity-graph pode tomar) OR pule pra **165+ via buffer zone** pra safety.
**Epic 04 reserva:** 160-164 (buffer zone defensiva vs corrida com entity-graph).

## 3. Waves Remanescentes

### Wave 3 — Epic 03 Completion (estimativa 12-16d)

**Stories restantes:**
- **03-C** `WaitingRoomSignupCTA` (Área 1) — CTA de signup no waiting room pré-combate — 3-4d
- **03-D** `RecapCtaCard` anon (Área 2) — CTA pós-combate para anon upgrade — 2-3d
- **03-E** Recap CTA guest + `migrateGuestCharacterToAuth` (Área 3) — CTA pós-combate pra guest, com migration flow — 2-3d
- **03-F** Turn-safety (Área 4, Quinn non-negotiable) — garantir que upgrade mid-combate não skip turno — 3-4d
- **03-H** E2E suite completa (6 specs incluindo race) — 3-4d

**03-G DEFERRED pós-launch** (F32 do review Wave 0 — sem baseline de volume, admin dashboard prematuro)

**Dependências (DAG):**
```
03-A (dismissal + analytics + ALLOWED_EVENTS) ✅ done (Wave 1)
03-B (i18n + t.rich doc) ✅ done (Wave 1)
03-C depende de AuthModal (02-C ✅) + dismissal-store (03-A ✅)
03-D depende de AuthModal + CombatRecap + dismissal-store
03-E depende de AuthModal + guest character store + migrateGuestCharacterToAuth (Epic 01 primitive ✅)
03-F depende de 03-C + PlayerJoinClient broadcast system
03-H depende de 03-C/D/E/F

Wave 3a (paralelo 3 agents): 03-C + 03-D + 03-E
Wave 3b (após 3a): 03-F + 03-H
Wave 3 review: 4 reviewers + fix agents
```

### Wave 4 — Epic 04 Player-as-DM (estimativa 21-28d)

**Zero código shipado.** Spec v3.2 completo em `docs/epics/player-identity/epic-04-player-as-dm-upsell.md`.

**Migrations planejadas (buffer zone 160-164):**
- 160: `v_player_sessions_played` matview + pg_cron + wrapper view (`security_invoker=true` F29)
- 161: user_onboarding_dm columns + trigger idempotente + share_past_companions
- 162: campaign_templates tables + trigger SRD validation + RLS no-delete
- 163: seed starter templates (3-5 templates curados)
- 164: past_companions `get_past_companions()` SECURITY DEFINER function

**Stories (resumo):**
- 04-A1..A5: Migrations (sequencial, caminho crítico)
- 04-B: Session counting server action (`getSessionsPlayed`)
- 04-C1..C3: Clone RPC + templates + content
- 04-D: DM Onboarding Tour
- 04-E: "Virar DM" CTA no dashboard
- 04-F: Role flip broadcast + `BecomeDmWizard` + `DmTourProvider`
- 04-G: Starter Kit consumption
- 04-H: Past companions UI ("Convide quem jogou com você")
- 04-I: Analytics funnel player→DM
- 04-J: E2E suite

**Depende de Epic 02 (✅) + Epic 03 (Wave 3) em staging antes de começar Wave 4.**

## 4. Follow-ups Abertos (deferred do Wave 2 code review)

### Deferred — mitigação em staging validation

| ID | Issue | Caminho |
|---|---|---|
| **C4** | PlayerJoinClient test harness valida lógica em isolamento do componente 3043 linhas | Opcional: refactor em chunks menores OU Playwright E2E integration test em staging |
| **M13** | Skeleton/Suspense untested (jsdom limitation no Next 15 RSC streaming) | Visual regression E2E em staging |
| **M19** | Scenario 5 race real E2E (2 browser contexts concurrentes) | `browser.newContext()` paralelo em staging |

### Deferred — polish (não-bloqueante)

- Copy polish PT-BR ("preservado" → "salvo" em `conversion.post_success.recap_anon`)
- Pattern doc §3.8 gotcha `<em>{var}</em>` (variável dinâmica em tag rich)
- Analytics event names como `const CONVERSION_EVENTS` compartilhado entre `analytics.ts` + `app/api/track/route.ts` ALLOWED_EVENTS Set
- pgTap destravar 2/5 skipped tests (`avatar-url-constraint` + `rls-soft-claim-integration`)
- Worktree filesystem cleanup (`rm -rf .claude/worktrees/agent-*` — muitos stale dirs, causa jest-haste-map warnings)

## 5. Lições Aprendidas (NÃO REPITA)

### Bugs de coordenação observados nesta sessão

1. **Worktree escape bug #3** — agentes com `isolation: "worktree"` às vezes committam direto em master em vez do próprio worktree. **Workaround:** sempre verificar `rtk git log --oneline -3` após agent retornar; se commit landou em master direto, cherry-pick não é necessário (já está lá). Se landed no worktree branch, cherry-pick normal.
2. **Migration number collisions** — parallel work (entity-graph) compete pelos mesmos números. **Estratégia:** buffer zones (+10 gap) defensivos. Epic 04 em 160-164 pra esse motivo.
3. **`--only` discipline** — Dani_ trabalha em paralelo; SEMPRE `rtk git commit --only -m "msg" path1 path2` com caminhos explícitos. NUNCA `git add .` ou commit de tudo staged.
4. **Stash entity-graph work temporariamente** em cherry-picks — master tem modificações em progress de outras waves (`.gitignore`, `messages/*.json`, `components/campaign/*.tsx`). Stash antes do cherry-pick, pop depois.

### Padrões que funcionaram

1. **Cluster-based fix dispatch** — fix agents agrupados por area coesa (auth/dashboard/invite/linkchar) resolveram 26 findings em paralelo melhor que 1-finding-per-agent.
2. **Adversarial re-review pós-shipment** pega 5+21 issues que nenhum pre-review viu. Mantém no workflow.
3. **Buffer zone migrations** — gap de 10 entre epics evita corrida.
4. **Worktree isolation** pra stories paralelas — scale até 4 agents bem; 8 arrisca coordenação.

## 6. Padrões Estabelecidos (SEGUIR)

### Code style
- `"use server"` em server actions
- `createServiceClient()` de `lib/supabase/service-client.ts` pra bypass RLS
- `createClient()` de `lib/supabase/server` cookie-aware pra user-facing queries
- Discriminated union pra Result: `{ ok: true, ... } | { ok: false, code, retryable, message }`
- Atomic UPDATE com WHERE-filter pra prevenir race (veja `character-claim.ts` e `linkCharacterToCampaign`)
- Idempotent-by-construction (ON CONFLICT, WHERE IS NULL)
- Server-side `admin.updateUserById` em vez de client-side `updateUser` quando precisa atomicity com server action subsequent

### Migrations
- SECURITY DEFINER functions SEMPRE com `SET search_path = pg_catalog, public, pg_temp`
- REVOKE EXECUTE FROM PUBLIC + GRANT TO authenticated explícito
- `CREATE OR REPLACE VIEW` com `WITH (security_invoker = true)` pra wrapper views (PG15+)
- ON CONFLICT com DO UPDATE SET status='active' quando reactivate de inactive/banned é desejado

### Test style
- **Jest, não vitest** (jest globals, sem import)
- Per-table mock builder routed by `.from(table)`
- Shared `state` object per test
- `jest.fn()` mocks
- 8+ tests por saga; 4+ tests por function simples

### File references (padrões ouro)
- `lib/supabase/character-claim.ts` — server action simples
- `lib/supabase/player-identity.ts` — saga multi-step
- `lib/identity/link-character-to-campaign.ts` — server action via RPC com discriminated union
- `app/api/player-identity/upgrade/route.ts` — HTTP route com `mode: "email" | "oauth"` flag
- `tests/identity/link-character-to-campaign.test.ts` — RPC mock pattern

### Process
- **Worktree isolation** para stories paralelas via `isolation: "worktree"` no Agent tool
- **Adversarial review** via parallel reviewers antes de commitar épico novo grande
- **Cluster fix dispatch** por area (não 1 agent por finding)
- **Commit `--only`** sempre
- **`rtk` prefix** em todos comandos

## 7. Arquivos Para Ler PRIMEIRO (Wave 3 kickoff)

Antes de escrever código:

### Críticos
- **CLAUDE.md** — regras imutáveis (Combat Parity, Resilient Reconnection, SRD, SEO)
- **docs/HANDOFF-player-identity-session-4.md** — este arquivo
- **docs/epics/player-identity/epic-03-conversion-moments.md** — v3.1 aprovado
- **docs/glossario-ubiquo.md** — terminologia obrigatória

### Referência (Epic 02 shipado)
- **lib/identity/detect-invite-state.ts** + **detect-join-state.ts** — state machines
- **components/auth/AuthModal.tsx** — consumer pra upgradeContext
- **components/conversion/dismissal-store.ts** — shouldShowCta, recordDismissal, migrateDismissalEntry
- **lib/conversion/analytics.ts** — 6 wrappers `conversion:*`
- **app/api/track/route.ts:132-137** — ALLOWED_EVENTS com eventos conversion
- **messages/pt-BR.json + en.json** — namespace `conversion.*` (Wave 1 Story 03-B)
- **docs/patterns-i18n-rich-text.md** — t.rich patterns

### Para Wave 4 (depois de Wave 3)
- **docs/epics/player-identity/epic-04-player-as-dm-upsell.md** — v3.2 com buffer 160-164
- **docs/spec-resilient-reconnection.md §16** — identity upgrade scenario

## 8. Próximas Prioridades (ordem sugerida)

### Opção A — Wave 3 completa em sessão única (recomendada se context budget ok)

**Wave 3a (paralelo, ~3-5d wall-clock):**
1. **Story 03-C** — Amelia/Sally — `WaitingRoomSignupCTA` em PlayerJoinClient (aditivo, consome AuthModal)
2. **Story 03-D** — Amelia/Sally — `RecapCtaCard` anon em CombatRecap (prop `saveSignupContext`)
3. **Story 03-E** — Amelia — Recap CTA guest + migrateGuestCharacterToAuth flow local em RecapCtaCard

**Wave 3b (após 3a merged):**
4. **Story 03-F** — Quinn non-negotiable — Turn-safety (reuso `player:idle` broadcast com novo reason field)
5. **Story 03-H** — Quinn — E2E suite (6 specs inclusive `waiting-room-signup-race` do Wave 0 F30)

**Wave 3 Code Review:** 4 reviewers paralelos → triage → fix agents (padrão já estabelecido)

### Opção B — Wave 4 Epic 04 (bigger, higher risk)

Só começar depois que Wave 3 estiver 100%. Migrations 160-164 (buffer zone). Stories 04-A1..04-J. 21-28d sequencial estimativa.

**Não recomendado em sessão única** dado tamanho. Melhor dividir em 2-3 sessões.

## 9. Verificação Inicial

Rode ANTES de escrever código:

```bash
rtk git log -10 --oneline              # confirma master tip b74dbedc ou posterior
rtk git status --short                  # confirma estado workspace
rtk npm test -- tests/player-identity/  # deve mostrar 59 pass + 5 skip (Epic 01 baseline)
rtk npm test -- tests/invite/ tests/auth/ tests/dashboard/ tests/conversion/ tests/character/ tests/identity/  # Epic 02 surfaces, ~349 pass
rtk tsc --noEmit                        # deve estar clean
ls supabase/migrations/ | tail -8       # confirma 158 é o último do player-identity (próximo livre 159 ou pule pra 165+)
```

Se algo falhar, **reporte antes de escrever código novo**.

## 10. Regras de Ouro (recapitulação)

1. **Review adversarial antes de shippar** épico novo >300 linhas — use reviewers paralelos por cluster
2. **Cluster fix dispatch** pós-review — 4 agents em paralelo cobrem ~20 findings
3. **Commit `--only`** sempre — Dani_ trabalha em paralelo
4. **Buffer zone migrations** — gap de 10 entre epics
5. **Worktree pra stories paralelas** — até 4 agents; 8 arrisca coord
6. **Pergunte antes de escolher ordem** — Dani_ pode ter mudado prioridade
7. **Verifique worktree output** — agentes às vezes escrevem em master direto; `git log --oneline -3` após cada
8. **Stash entity-graph work temp** em cherry-picks — master tem mods in-progress de outras waves

## 11. Contatos (Party Mode personas)

Quando despachar agentes via Agent tool, use personas consistentes:

- 📋 **John (PM)** — prioridades, scope, PRDs
- 📊 **Mary (Analyst)** — requirements elicitation
- 🏗️ **Winston (Architect)** — DB, RLS, trigger design, migrations, security
- 💻 **Amelia (Dev)** — implementação, tests, integration
- 🎨 **Sally (UX)** — componentes UI, mockups, conversion moments
- 📚 **Paige (Tech Writer)** — docs, glossário, spec updates, i18n copy
- 🧪 **Quinn (QA)** — testing contracts, E2E, regression guards, turn-safety
- 🏃 **Bob (SM)** — sprint planning, story breakdown, DAGs
- 🚀 **Barry (Quick Flow)** — specs pequenos, refactors rápidos

## 12. Quando Estiver Pronto

Abra a sessão nova com:

> Li `docs/HANDOFF-player-identity-session-4.md`. Estado: Epic 01 + 02 code-complete + reviewed + fixed. Epic 03 tem 03-A + 03-B shipados; 03-C/D/E/F/H pendentes. Epic 04 é docs-only (migrations 160-164 buffer). Baseline 349 tests pass.
>
> Próxima prioridade sugerida: Wave 3a paralelo (03-C + 03-D + 03-E). Qual tu quer atacar primeiro?

**Sempre pergunte. Não assuma.**

---

**Este é o handoff completo.** ~12.000 linhas de código + docs + 350+ tests shipados em Session 3. Próxima sessão tem ~33-44d de implementação estimada (Wave 3 + Wave 4) pela frente.

## 13. Números da Session 3 (contexto)

- **~35 sub-agentes** despachados em paralelo
- **~40 commits** em master
- **~12.000 linhas** de código + docs shipadas
- **Epic 02:** 9 stories em 1 session via 4 waves (0, 1, 2a, 2b, 2c) + 2 code review rounds
- **Tests:** 64 → 349 (5.5× growth) em uma session
- **Zero regressão** no baseline Epic 01

Good luck! 🎲
