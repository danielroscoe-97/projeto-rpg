# Wave 1 Delivery — Player Identity Initiative (2026-04-20)

Entrega em 1 sessão com 8 agentes paralelos + 1 commit Wave 0 de specs/hardening. História linear, tudo shippado em `master`.

## O que shippou

### Wave 0 — Specs + Hardening (1 commit)

| Commit | Conteúdo |
|---|---|
| `f77c1760` | Migration 151 search_path hardening + Epic 02/03/04 spec fixes (F29-F32) |

- Migration 151: `ALTER FUNCTION create_campaign_with_settings ... SET search_path = public, pg_temp` — fecha vetor search_path hijack em chained SECURITY DEFINER
- Epic 04 v3.1: migrations 151-155 → 152-156 (abre espaço pro 151 hardening), wrapper view ganha `WITH (security_invoker = true)` (F29), 122 search_path documentado (F30)
- Epic 02: 3 ACs novos — skeleton states, axe-core zero violations, PlayerJoinClient parity invariants explícitos
- Epic 03: Story 03-G diferida pós-launch (F32 — sem baseline de volume), 6ª spec E2E race waiting-room-signup (F30), AC regression guard para `unknown_event` 400 (F29), mitigação flakiness `waitForResponse` + cookie polling (F31)

### Wave 1 — Dev paralelo (8 commits)

**Track A — Fase A testing infra:**
| Commit | Story | Agente | Arquivos | Testes |
|---|---|---|---|---|
| `80cfdb4c` | pgTap harness scaffold | Winston | 7 novos (supabase/tests/, scripts/test-pgtap.sh, package.json) | docker requerido pra rodar; 2/5 skipped migráveis documentados |
| `e2ca127f` | E2E test hooks | Amelia | 12 (lib/e2e/, app/api/e2e/, playwright config) | **18/18 pass** |
| `895402a1` | data-testid contract | Sally | 3 (doc + InviteAcceptClient + PlayerJoinClient) | aditivo, parity preservada |

**Track B — Epic 02 early:**
| Commit | Story | Agente | Arquivos | Testes |
|---|---|---|---|---|
| `1ca54f16` | 02-A detect{Invite,Join}State | Amelia | 4 (lib/identity/, tests/invite/) | **25/25 pass** |
| `0a6df7c8` | 02-F-skeleton dashboard | Sally | 6 (components/dashboard/, i18n) | **9/9 pass** |
| `185d7845` | 02-B-prep CharacterPickerModal | Barry | 5 (refactor InviteAcceptClient 363→127 linhas, novo modal 584 linhas) | **22/22 pass** + parity OK |

**Track C — Epic 03 early:**
| Commit | Story | Agente | Arquivos | Testes |
|---|---|---|---|---|
| `d8090dad` | 03-A dismissal + analytics + ALLOWED_EVENTS | Amelia | 6 (conversion/, track/route.ts) | **37/37 pass**; F29 regression guard passa |
| `7f39ff30` | 03-B i18n copy + t.rich doc | Paige | 3 (messages/, pattern doc 230 linhas) | 56 chaves i18n (PT+EN), glossário ubíquo OK |

## Estado final do repo

- **Master tip:** `185d7845`
- **tsc --noEmit:** ✅ clean
- **tests/** (novos + baseline): **170 pass + 5 skip** (skipped são pgTap TODOs; baseline Epic 01 mantém 59+5)
- **Full suite** (`npm test`): **1295 pass + 133 fail + 44 skip** — 133 falhas são **pré-existentes** (CampaignManager, GuestCombatClient, etc., não tocados por Wave 1; confirmado via baseline comparison)

## Follow-ups abertos (não-bloqueantes)

1. **Port testids do doc da Sally pra `CharacterPickerModal.tsx`** (~30min). 02-B-prep criou o modal mas os testids que Sally especificou no contrato pro picker ainda não foram aplicados à nova localização. Testids genéricos podem virar em Story 02-B full.
2. **pgTap rodar em CI.** Docker requerido; infra existe (scripts/test-pgtap.sh), Dani_ valida localmente + GitHub Action hook.
3. **Destravar 2/5 tests skipped** via pgTap (README documenta como). Alta viabilidade: `avatar-url-constraint` (1 test) + `rls-soft-claim-integration` (4 tests).
4. **Playwright specs carecem creds Supabase** no runner local. Hook existe; Dani_ configura `.env.local` + dm account seed pra rodar end-to-end.
5. **Worktree prune filesystem cleanup.** `git worktree prune` foi executado mas diretórios em `.claude/worktrees/agent-*` persistem (causam jest-haste-map warnings). `rm -rf .claude/worktrees/agent-*` seguro depois de confirmar cherry-picks shippados.
6. **Epic 04 Story 04-A1 migration 152** (renumerada de 151) pode começar AGORA — spec atualizado, search_path fix em staging.

## Próximas waves sugeridas

- **Wave 2 (Epic 02 completion):** 02-B full (paginação `listClaimableCharacters`), 02-C (AuthModal upgradeContext), 02-D (InviteLanding), 02-E (PlayerJoinClient mods), 02-F full (dashboard 4 seções reais), 02-G (sessions history + default char settings), 02-H (cenário 5 polish), 02-I (E2E suite completa). Estimativa: 15-20d.
- **Wave 3 (Epic 03 completion):** 03-C (WaitingRoomSignupCTA), 03-D (RecapCtaCard anon), 03-E (guest migrate), 03-F (turn safety Quinn non-negotiable), 03-H (6 specs E2E). Estimativa: 12-16d. Bloqueado por Wave 2 AuthModal.
- **Wave 4 (Epic 04):** Migrations 152-156 + clone RPC + wizard + DM tour + templates + past companions. Estimativa: 21-28d sequencial. Bloqueado por Epics 02+03 em staging.

## Números

- **Código shippado:** ~4.500 linhas (Wave 0 + Wave 1)
- **Commits:** 9 (1 Wave 0 + 8 Wave 1)
- **Testes novos:** 111 (25 + 37 + 22 + 9 + 18)
- **Baseline Epic 01:** 59+5 mantido (zero regressão)
- **Duração da sessão:** ~2-3h de trabalho distribuído (agentes paralelos tomaram 6-12min cada)
