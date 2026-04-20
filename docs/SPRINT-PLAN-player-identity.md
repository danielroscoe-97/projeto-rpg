# Sprint Plan — Player Identity & Continuity

> **Parent:** [EPIC-player-identity-continuity.md](EPIC-player-identity-continuity.md)
> **Baseline:** 2026-04-19 (Dani_ + Bob — sprint distribution locked post review)
> **Release strategy:** Big-bang (4 épicos entram juntos em produção)
> **Total:** 9-11 sprints (~71-94 dias úteis) — começo: Sprint 1 = próxima segunda após approval

---

## Visão Gantt (Sprints)

```
Sprint  1  2  3  4  5  6  7  8  9 10 11
──────────────────────────────────────────
Ep01:   ██ ██ ░░
Ep02:         ██ ██ ██ ░░
Ep03:                  ██ ██
Ep04:                        ██ ██ ██ ░░
QA/E2E:                                ██
──────────────────────────────────────────
██ = execução   ░░ = buffer/polish
```

Dependências bloqueantes entre épicos exigem sequência, mas há **paralelismo interno** em cada épico (ver DAG de cada um).

---

## Detalhamento por Sprint

### 🏗️ Sprint 1 — Fundação (Épico 01 parte 1)

**Goal:** Glossário + schema + primitives básicas em staging.

| Story | Área | Dias | Agente sugerido |
|---|---|---|---|
| **01-A** Glossário Ubíquo | Ep01 Área 7 | 1-2 | Paige (Tech Writer) |
| **01-B** Migrations 142-144 + types update | Ep01 Área 1, 4, 5 | 1 | Winston (Architect) |
| **01-C** `claimCampaignCharacter` + `listClaimableCharacters` | Ep01 Área 4 | 2 | Amelia (Dev) |
| **01-D** `migrateGuestCharacterToAuth` | Ep01 Área 3 | 1-2 | Amelia (Dev) |

**Paralelismo:** 01-C e 01-D rodam em paralelo após 01-B. 01-A pode começar antes do sprint (já em execução).

**Exit criteria:**
- [ ] Glossário merged
- [ ] Migrations 142-144 em dev + staging
- [ ] `listClaimableCharacters` paginado retornando corretamente
- [ ] Smoke test: claim anon + list work

---

### 🏗️ Sprint 2 — Fundação (Épico 01 parte 2)

**Goal:** `upgradePlayerIdentity` saga completa + testes.

| Story | Área | Dias | Agente |
|---|---|---|---|
| **01-E** `upgradePlayerIdentity` server action + recovery endpoint | Ep01 Área 2, 6 | 4-5 | Amelia + Winston |
| **01-F** Testing Contract completo | Ep01 Testing | 2-3 | Quinn (QA) |
| **01-G** Spec-reconnection §4 + glossário final | Ep01 Área 8 | 0.5 | Paige |

**Exit criteria:**
- [ ] Endpoint `/api/player-identity/upgrade` funcional
- [ ] 8+ testes obrigatórios passando (incluindo concorrência, race, RLS soft-claim)
- [ ] E2E "anon em combate → upgrade → continua sem perder turno" green
- [ ] Spec de resilient-reconnection atualizado com §4

**Risco:** esta sprint é a mais densa; Winston validar saga design antes do código.

---

### 🎨 Sprint 3 — UI Primitives (Épico 02 parte 1)

**Goal:** Primitives de UI (picker, modal) + utilities de detecção.

| Story | Área | Dias | Agente |
|---|---|---|---|
| **02-A** `detectInviteState` + `detectJoinState` utilities | Ep02 Área 1 | 2 | Winston |
| **02-B** `CharacterPickerModal` (paginado) | Ep02 Área 2 | 2-3 | Sally + Amelia |
| **02-C** `AuthModal` + modificações LoginForm/SignUpForm | Ep02 Área 3 | 3 | Amelia |
| **02-F** Dashboard 4 seções novas (início) | Ep02 Área 4 | 3-4 | Sally + Amelia |

**Paralelismo:** 02-A, 02-B, 02-C independentes. 02-F paralelo às três primeiras.

---

### 🎨 Sprint 4 — Invite Redesign (Épico 02 parte 2)

| Story | Área | Dias | Agente |
|---|---|---|---|
| **02-D** `InviteLanding` + redesign `/invite/[token]` | Ep02 Área 1A | 2-3 | Sally + Amelia |
| **02-E** Modificações em `/join/[token]` (aditivas) | Ep02 Área 1B | 2 | Amelia |
| **02-F** (cont.) Dashboard 4 seções — finalização | Ep02 Área 4 | 2 | Amelia |
| **02-G** `/dashboard/sessions` + `/settings/default-character` | Ep02 Área 4, 5 | 1 | Amelia |
| **02-I** Cenário 5 polish + concurrency tests | Ep02 Área 6 | 1-2 | Amelia + Quinn |

---

### 🎨 Sprint 5 — Épico 02 E2E + Polish

| Story | Área | Dias | Agente |
|---|---|---|---|
| **02-H** E2E suite completa (5+ specs) | Ep02 Testing | 2-3 | Quinn |
| **02-polish** Acessibilidade, mobile, review UX | Ep02 | 2 | Sally |
| **03-A** `dismissal-store` + analytics helpers (early start) | Ep03 Área 6, 7 | 1 | Amelia |
| **03-B** Copy e i18n (early start) | Ep03 Área 5 | 1 | Paige |

**Buffer:** 02 entra em staging ao fim desta sprint.

---

### 💰 Sprint 6 — Conversão (Épico 03 parte 1)

| Story | Área | Dias | Agente |
|---|---|---|---|
| **03-C** `WaitingRoomSignupCTA` + integração `PlayerJoinClient` | Ep03 Área 1 | 1-2 | Sally + Amelia |
| **03-D** `RecapCtaCard` + modificação `CombatRecap` | Ep03 Área 2 | 1 | Sally + Amelia |
| **03-E** Guest migrate flow + `GuestCombatClient` mod | Ep03 Área 3 | 2 | Amelia |
| **03-F** Turn-safety implementation (Quinn não-negociável) | Ep03 Área 4 | 2-3 | Amelia + Quinn |

---

### 💰 Sprint 7 — Conversão (Épico 03 parte 2)

| Story | Área | Dias | Agente |
|---|---|---|---|
| **03-G** Admin funnel dashboard | Ep03 Área 7 | 2 | Amelia |
| **03-H** E2E suite completa | Ep03 Testing | 2 | Quinn |
| **03-polish** Review + acessibilidade | Ep03 | 1 | Sally |

**Buffer:** Épico 03 entra em staging.

---

### 🚀 Sprint 8 — Upsell Fundação (Épico 04 parte 1)

| Story | Área | Dias | Agente |
|---|---|---|---|
| **04-A** Migrations 145-149 + types | Ep04 Área 2-5 | 1-2 | Winston |
| **04-B** Session counting lib + materialized view trigger | Ep04 Área 2 | 1-2 | Amelia |
| **04-C** Template seed + `clone_campaign_from_template` RPC | Ep04 Área 4 | 3-4 | Amelia + Dani_ (conteúdo) |
| **04-D** `past_companions` view + lib | Ep04 Área 5 | 1-2 | Amelia |

**Paralelismo:** 04-B, 04-C, 04-D independentes após 04-A.

---

### 🚀 Sprint 9 — Upsell UI (Épico 04 parte 2)

| Story | Área | Dias | Agente |
|---|---|---|---|
| **04-E** `BecomeDmCta` + dashboard integration | Ep04 Área 1 | 1-2 | Sally + Amelia |
| **04-F** `BecomeDmWizard` + role flip + `DmTourProvider` | Ep04 Área 3 | 4-5 | Sally + Amelia |
| **04-G** `TemplateGallery` + `TemplateDetailModal` | Ep04 Área 4 UI | 2-3 | Sally + Amelia |
| **04-K** i18n upsell.json + copy review | Ep04 | 1 | Paige |

---

### 🚀 Sprint 10 — Upsell Viral (Épico 04 parte 3)

| Story | Área | Dias | Agente |
|---|---|---|---|
| **04-H** `InvitePastCompanions` + tab em `InvitePlayerDialog` | Ep04 Área 5 UI | 2 | Sally + Amelia |
| **04-I** Analytics events + `/admin/player-dm-funnel` | Ep04 Área 6 | 2-3 | Amelia |
| **04-J** E2E suite | Ep04 Testing | 3 | Quinn |

---

### 🎯 Sprint 11 — QA Cross-Epic + Release Prep

**Goal:** validação end-to-end dos 4 épicos juntos; preparação do big-bang.

| Atividade | Responsável | Dias |
|---|---|---|
| Regression test suite completa (guest/anon/auth parity) | Quinn + Amelia | 2-3 |
| Load test (materialized views, realtime broadcasts) | Winston + Quinn | 1-2 |
| Dani_ smoke test em staging | Dani_ | 1 |
| Copy final review + i18n PT+EN | Paige | 1 |
| Release notes + changelog | John + Paige | 1 |
| Go/No-Go meeting | Time completo | 0.5 |

**Exit criteria (big-bang release):**
- [ ] Todos os 4 épicos green em staging
- [ ] Regression parity: zero degradação em guest/anon/auth
- [ ] Load test aprovado (10k sessions + 100 concurrent players)
- [ ] Dashboard de funil populado com dados reais (dogfooding interno)
- [ ] Dani_ aprova UX final em todas as 4 superfícies novas

---

## Distribuição por Agente (carga de trabalho estimada)

| Agente | Especialidade | Carga total |
|---|---|---|
| **Winston** (Architect) | Arquitetura, saga, migrations, contratos | ~15 dias |
| **Amelia** (Dev) | Implementação backend + frontend | ~45 dias |
| **Sally** (UX Designer) | UI components, fluxos, mockups | ~25 dias |
| **Paige** (Tech Writer) | Glossário, copy, i18n, docs | ~6 dias |
| **Quinn** (QA) | Testing contracts, E2E, regressão | ~15 dias |
| **Bob** (Scrum Master) | Coordenação, refinement, retros | contínuo |
| **John** (PM) | Escopo, decisões, métricas | contínuo |
| **Dani_** (Product Owner) | Aprovações, conteúdo de templates, smoke tests | contínuo + ~2 dias focused |

**Nota:** cargas assumem nível Amelia-Sênior. Menos experiência = buffer extra.

---

## Pontos de Revisão / Check-ins

| Momento | O que validar | Decisão possível |
|---|---|---|
| Fim Sprint 2 | Épico 01 funciona em staging? Saga estável? | GO para Épico 02 ou revisar fundação |
| Fim Sprint 5 | Épico 02 UI feel right? Sally + Dani_ aprovam? | GO para Épico 03 ou iterar UX |
| Fim Sprint 7 | Épico 03 CTAs convertem? Métricas iniciais? | GO para Épico 04 ou ajustar copy |
| **Fim Sprint 8** | Épico 04 está on-track? Restam 3 sprints | **Ponto de corte:** se atrasado, considerar cortar Áreas 4-5 do 04 |
| Fim Sprint 11 | Big-bang pronto? | GO para produção ou adiar 1-2 semanas |

---

## Risco de Cronograma

- Épico 01 Sprint 2 (saga) é o mais denso — atraso aqui cascateia
- Épico 04 é o maior (3 sprints) — cortar Áreas 4-5 se apertar
- Big-bang release: se Sprint 10 atrasar, opção é adiar release inteiro (não fatiar — decisão DC5 do parent)

**Não aceitável:** release parcial sem Épico 03 (conversão). É o core de valor visível.

---

## Próximos Passos Imediatos

1. ✅ Story 01-A (Glossário) — concluída 2026-04-19
2. Story 01-B (Migrations) — em fila
3. Dani_ confirma sprint plan
4. Bob refina stories do Sprint 1 (acceptance criteria detalhados)
5. Kickoff Sprint 1
