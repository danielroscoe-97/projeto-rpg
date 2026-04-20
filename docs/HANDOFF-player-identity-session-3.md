# Handoff — Player Identity & Continuity (PocketDM) — Sessão 3

Você está continuando uma iniciativa multi-sprint no **PocketDM** (Next.js 15 + Supabase). Esta é uma sessão de continuidade — leia TUDO antes de agir. Não tem memória de sessões anteriores; este prompt é fonte única de verdade.

## 1. Contexto da Iniciativa

**"Player Identity & Continuity"** resolve o maior gargalo do Beta Test 3: players anônimos vivem uma sessão e somem. Decomposta em 4 épicos (big-bang release):

- **H1** — Reduzir atrito da próxima sessão (player volta mais rápido, já autenticado)
- **H2** — Retenção/conversão de anônimo em conta
- **H3** — Continuidade narrativa (personagem + campanha + histórico persistem)

**Decisão de release travada:** big-bang (4 épicos entram juntos em produção). Sem opt-out parcial.

## 2. Estado Atual (2026-04-20)

### ✅ TODOS OS DOCS APROVADOS E TRAVADOS

| Epic | Versão | Status | Commit | Linhas |
|---|---|---|---|---|
| Parent | — | Solid | (early commits) | — |
| Epic 01 | v3 | **Aprovado** + código shippado | `aa19d08e` → `6ee7d76d` | 619 |
| Epic 02 | v2 | **Aprovado** (doc-only, sem código ainda) | Early session | 494 |
| Epic 03 | v3 | **Aprovado** (doc-only, pós adversarial review) | `bff00bcc` | 1133 |
| Epic 04 | v3 | **Aprovado** (doc-only, pós adversarial review) | `bff00bcc` | 1203 |
| Glossário | — | **Atualizado** com 7 termos identity | Shipped | — |
| Sprint Plan | — | **Pode precisar update** — Sprint 6 estimava 6-8d, real é 10-14d | — | — |
| spec-reconnection | — | **§16 adicionado** (identity-upgrade scenario) | `5cc3552b` | 1359 |

### ✅ EPIC 01 COMPLETO — 7/7 STORIES SHIPADAS

| Story | Commit | Conteúdo |
|---|---|---|
| 01-A | `aa19d08e` | Glossário + sprint plan |
| 01-B | `379fa1cd` | Migrations 142, 143, 144 + types update |
| 01-C | `cf44fb59` | `lib/supabase/character-claim.ts` + migration 145 + 14 tests |
| 01-D | `75327868` | `lib/supabase/character-portability.ts` + 10 tests |
| 01-E | `5cc3552b` | `lib/supabase/player-identity.ts` + 3 API routes + 11 tests |
| 01-F | `6ee7d76d` | Testing Contract: 24 tests + 3 E2E Playwright specs + helpers |
| 01-G | `5cc3552b` | `docs/spec-resilient-reconnection.md §16` |

**Test suite player-identity:** 7 suites, 59 pass + 5 skip (pgTap TODOs), 64 total. `tsc --noEmit` clean.

### 📋 PENDENTE: EPICS 02, 03, 04 IMPLEMENTAÇÃO

Os 3 épicos restantes são **só docs aprovados**, código ZERO shippado. Sprint plan estima:

- **Epic 02** (Player Dashboard + Invite) — 20-30 dias úteis
- **Epic 03** (Conversion Moments) — 20-30 dias úteis
- **Epic 04** (Player-as-DM Upsell) — 35-45 dias úteis (o maior)

Estimativa conjunta: ~80-105 dias de trabalho concentrado.

## 3. Follow-up Tickets Abertos (Story 01-F documentou)

| Ticket | Owner Sugerido | SLA | Desbloqueia |
|---|---|---|---|
| pgTap harness para RLS tests | Winston | 2-3d | 5 tests skipped em 01-F + Area 5 CHECK |
| E2E test hooks (`window.__pocketdm_supabase`, `NEXT_PUBLIC_E2E_MODE`) | Amelia | 1-2d | 3 E2E Playwright specs |
| `data-testid` contract para claim UI | Sally | 1d | E2E anon-claim-upgrade-ownership |

Recomendação: atacar os 3 ANTES do Epic 02 kickoff pra destravar E2E completo.

## 4. Lições Aprendidas (NÃO REPITA)

Session 2 review pegou esses erros. Confirme com grep se tiver dúvida.

1. **Tabela é `player_characters`, NÃO `characters`**
   - Toda SQL, migration, RLS, RPC usa `player_characters`
   - Rota pública é `/app/characters/[id]` (URL friendly, só isso)

2. **Upgrade anon→auth usa `supabase.auth.updateUser({ email, password })`, NÃO `signUp()`**
   - `updateUser` preserva UUID in-place (anon UUID vira auth UUID)
   - `signUp` criaria NOVO UUID e quebraria toda referência
   - **IMPORTANTE:** `updateUser` é chamado CLIENT-SIDE com JWT do usuário. Server action (`upgradePlayerIdentity`) só roda Phase 1 + Phase 3

3. **Projeto usa jest, NÃO vitest**
   - `package.json`: `"test": "jest"`; sem vitest instalado
   - Tests com `import from "vitest"` NÃO RODAM em `npm test`
   - Usar jest globals: `describe`, `it`, `expect`, `jest.fn()`, sem import

4. **i18n: `next-intl` com `messages/{en,pt-BR}.json` flat**
   - NÃO é `next-i18next` com `public/locales/*`
   - Namespace via `useTranslations("combat")`, `t.rich()` pra markdown

5. **`session_tokens.id` é o identificador ESTÁVEL**
   - `anon_user_id` pode regenerar em cookie loss (spec-reconnection §2.4)
   - NUNCA use `anon_user_id` como chave em WHERE clauses
   - Saga recebe `sessionTokenId` explicitamente

6. **`player_characters.campaign_id` É NULLABLE** (migration 076)
   - Types já corrigidos em commit `379fa1cd` (`string | null`)
   - Código downstream com `campaign.campaign_id.toUpperCase()` quebra em runtime
   - Audit: grep `.campaign_id` e adicione null checks

7. **Realtime/broadcast só em Anon + Auth**
   - Guest em `/try` NÃO tem realtime (Combat Parity Rule)
   - Turn-safety claims com broadcast não aplicam a guest

8. **Commit disciplinado** — Dani_ trabalha em paralelo
   - SEMPRE use `rtk git commit --only -m "..." path1 path2`
   - NUNCA `git add .` ou commit de tudo staged
   - Verifique `rtk git status --short` antes

9. **`CombatRecap.onSaveAndSignup` é `() => void` hoje**
   - Assinatura preservada em Epic 03 v3 D4 (prop separada `saveSignupContext`)
   - Callers em `GuestCombatClient.tsx:2214` e `RecapActions.tsx:163`

10. **Use `Combatant` de `lib/types/combat.ts`** — não `GuestCombatSnapshot["combatants"][number]` (não existe)

11. **Analytics stack: namespaced colon-style** (`conversion:cta_shown`)
    - Ver `lib/analytics/track.ts:61-101`
    - MAS `app/api/track/route.ts:7-131` tem ALLOWED_EVENTS **Set** — adicione TODO evento novo lá senão retorna 400 `unknown_event`

12. **`encounters` não tem `campaign_id`** — tem `session_id → sessions(id)`
    - Sessions têm `campaign_id`
    - Clone RPC em Epic 04 v3 corrige isso

13. **`create_campaign_with_settings` assinatura real:** `(p_owner_id, p_name, p_description, p_game_system, p_party_level, p_theme, p_is_oneshot)` **retorna JSON**, não UUID
    - Ver `supabase/migrations/122_create_campaign_atomic.sql`

14. **Agentes podem escrever no caminho errado em worktree** — bug observado 2x
    - Amelia + Paige escreveram arquivos direto no main workspace em vez do worktree
    - Workaround: após agente terminar, SEMPRE verifique onde os arquivos landaram via `git status` e copy manual se precisar
    - Agent ID é truncado no nome de worktree (8 chars); pode não bater 1:1

15. **Próximo migration livre é `151`** (não 149 — `149_player_notes_visibility.sql` + `150_fix_campaign_notes_default_visibility.sql` já tomados)
    - Epic 04 v3 usa 151-155

## 5. Padrões Estabelecidos (SEGUIR)

### Code style
- `"use server"` em server actions
- `createServiceClient()` de `lib/supabase/service-client.ts` pra bypass RLS
- Discriminated union pra Result: `{ ok: true, ... } | { ok: false, code, retryable, message }`
- Atomic UPDATE com WHERE-filter pra prevenir race (veja `character-claim.ts`)
- Idempotent-by-construction (ON CONFLICT, WHERE IS NULL)
- Forward-recovery (mark `upgrade_failed_at`, retry endpoint)
- Compensating action APENAS em point-of-no-return (não aplicável nos épicos restantes)

### File references
- `lib/supabase/character-claim.ts` — padrão ouro pra server action simples
- `lib/supabase/character-portability.ts` — padrão pra transformação de dados
- `lib/supabase/player-identity.ts` — padrão pra saga multi-step
- `app/api/player-identity/upgrade/route.ts` — padrão pra HTTP route sobre server action
- `tests/player-identity/*.test.ts` — padrões jest mock

### Test style
- Per-table builder routed by `.from(table)`
- Shared `state` object per test
- `jest.fn()` mocks; no vitest
- 8+ tests por saga; 4+ tests por function simples
- `npm test -- tests/path/` pra filtro

### Process
- **Worktree isolation** para trabalho paralelo via `isolation: "worktree"` no Agent tool
- **Adversarial review** via `Plan` agent antes de commitar épico novo
- **Sanity review** após fix pass
- **Commit `--only`** sempre (Dani_ trabalha em paralelo)
- **`rtk` prefix** em todos comandos pra economizar tokens

## 6. Convenções de Trabalho

- **TodoWrite**: use pra rastrear progresso, uma task `in_progress` por vez
- **Agent tool**: despache stories independentes em paralelo via `isolation: "worktree"`. Briefing EXATO com file:line refs
- **Commit mensagens**: `feat(player-identity): Story 0X-Y descrição` + corpo explicando WHAT/WHY. Sempre `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **Português**: copy user-facing, comments internos podem ser EN, nomes de funções EN

## 7. Arquivos Para Ler PRIMEIRO

Antes de agir:

- `CLAUDE.md` — regras imutáveis (Combat Parity, Resilient Reconnection, SRD, SEO)
- `docs/EPIC-player-identity-continuity.md` — visão geral
- `docs/epics/player-identity/epic-02-player-dashboard-invite.md` — **v2** (próximo a implementar)
- `docs/epics/player-identity/epic-03-conversion-moments.md` — **v3**
- `docs/epics/player-identity/epic-04-player-as-dm-upsell.md` — **v3**
- `docs/SPRINT-PLAN-player-identity.md` — DAG de sprints (pode estar stale no Sprint 6)
- `docs/glossario-ubiquo.md` — terminologia obrigatória
- `docs/spec-resilient-reconnection.md` — regras de reconexão (incluindo §16 identity upgrade)
- `lib/types/database.ts` — tipos atualizados (cobre `user_onboarding`, `session_tokens`, `player_characters`, `users` profile fields, etc)
- `lib/supabase/player-identity.ts` — saga shippada (referência de padrão pra coisas complexas)

## 8. Próximas Prioridades (ordem sugerida)

### Fase A — Destravar E2E + RLS testing (2-4 dias)
1. **Follow-up #1:** pgTap harness — Winston cria `supabase/tests/rls/*.sql` driven por CI
2. **Follow-up #2:** E2E test hooks — Amelia adiciona `NEXT_PUBLIC_E2E_MODE` gate + expose `window.__pocketdm_supabase` + dev-only test API routes
3. **Follow-up #3:** `data-testid` contract — Sally padroniza attrs pra claim UI

### Fase B — Epic 02 Implementação (20-30 dias)
Epic 02 v2 spec em `docs/epics/player-identity/epic-02-player-dashboard-invite.md`. Stories (ler epic-02 pra lista completa, mas grosso modo):
- **02-A** — AuthModal refactor (se aplicável à Epic 03 F10 "Opção B pinned")
- **02-B** — `/app/dashboard` Player Hub page (lista campanhas, características, convites)
- **02-C** — `CharacterPickerModal` (consome `listClaimableCharacters`)
- **02-D** — `/join/[token]` auth path (quando player autenticado clica convite)
- **02-E** — Settings page (profile, avatar, default_character_id)
- **02-F** — Invites UI (aceitar/recusar)
- **02-G** — Tests + E2E

Dependências externas: nenhuma (todas primitives vêm de Epic 01).

### Fase C — Epic 03 Implementação (20-30 dias)
Epic 03 v3 em `docs/epics/player-identity/epic-03-conversion-moments.md`. Stories 03-A através 03-H. Bloqueado em Epic 02 (consome `AuthModal`, `CharacterPickerModal`).

**Atenção:** Story 03-A tem task NÃO-óbvia de adicionar 6 eventos `conversion:*` ao `ALLOWED_EVENTS` Set em `app/api/track/route.ts:7-131`.

### Fase D — Epic 04 Implementação (35-45 dias — o maior)
Epic 04 v3 em `docs/epics/player-identity/epic-04-player-as-dm-upsell.md`. Stories 04-A1 até 04-K. Bloqueado em Epics 01, 02, 03 em staging.

**Stack de migrations 151-155** separadas em 5 stories 04-A1 até 04-A5. Schema concreto incluindo `v_player_sessions_played` matview, `campaign_templates` tables, `get_past_companions` SECURITY DEFINER function. Clone RPC inclui:
- `auth.uid()` check contra `p_new_dm_user_id`
- `REVOKE ALL ON v_player_sessions_played FROM authenticated, anon, PUBLIC`
- `last_campaign_name` correlated subquery
- Explicit `is_active = false` no session INSERT
- Copy `monsters_payload → encounters.creatures_snapshot`

### Fase E — Release + Retrospective
- Merge master → production (big-bang)
- Monitor funnel metrics por 7-14 dias
- Retrospective com full team

## 9. Verificação Inicial

Rode ANTES de escrever código:

```bash
rtk git log -10 --oneline              # confirma commits da sessão anterior
rtk git status --short                  # confirma estado workspace
rtk npm test -- tests/player-identity/  # deve mostrar 59 pass + 5 skip
rtk tsc --noEmit                        # deve estar clean
ls supabase/migrations/ | tail -5       # confirma 150 é o último (próximo livre = 151)
```

Se algo falhar, **reporte antes de escrever código novo**.

## 10. Regras de Ouro

1. **Review adversarial antes de implementar código grande** — use `Plan` agent pra code review se >300 linhas novas
2. **Commit `--only` sempre** — Dani_ trabalha em paralelo, nunca commit de tudo staged
3. **Worktree pra stories paralelas** — Epic 02/03/04 têm várias stories independentes, paralelize agressivamente
4. **Pergunte antes de escolher ordem** — Dani_ pode ter mudado prioridade entre sessões
5. **Não assuma migration numbering** — sempre `ls supabase/migrations/ | tail` antes de criar
6. **Verifique worktree output** — agentes às vezes escrevem no path errado; valide com `git status` antes de commitar

## 11. Contatos (dentro do Party Mode)

Quando despachar agentes via Agent tool, use personas consistentes:

- 📋 **John (PM)** — prioridades, scope, PRDs
- 📊 **Mary (Analyst)** — requirements elicitation
- 🏗️ **Winston (Architect)** — DB, RLS, trigger design, migrations
- 💻 **Amelia (Dev)** — implementação, tests, integration
- 🎨 **Sally (UX)** — componentes UI, mockups, conversion moments
- 📚 **Paige (Tech Writer)** — docs, glossário, spec updates
- 🧪 **Quinn (QA)** — testing contracts, E2E, regression guards
- 🏃 **Bob (SM)** — sprint planning, story breakdown, DAGs
- 🚀 **Barry (Quick Flow)** — specs pequenos, refactors rápidos

## 12. Quando Estiver Pronto

Abra a sessão nova com:

> "Li o handoff em `docs/HANDOFF-player-identity-session-3.md`. Estado atual: Epic 01 completo (7 stories shipadas), Epics 02/03/04 v3 aprovados (docs-only). Próximas prioridades: Fase A (follow-up tickets pgTap/E2E hooks/data-testid) + Fase B (Epic 02 implementação). Qual tu quer atacar primeiro?"

Não assuma — **sempre pergunte**.

---

**Este é o handoff completo.** 4.500 linhas de código + docs shippadas em ~10h de trabalho distribuído por sessão 2 e 3. Próxima sessão tem ~80-105 dias de implementação estimada pela frente.

Good luck! 🎲
