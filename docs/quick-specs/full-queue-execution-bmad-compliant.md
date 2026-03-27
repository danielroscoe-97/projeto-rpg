# Quick Spec — Execução Completa da Queue com BMAD Compliance

**Sprint:** Full Queue Execution 2026-03-27
**Prioridade:** ALTA — Fechar todas as stories pendentes com qualidade de produção
**Pré-requisito:** V2 Sprint parcialmente completa (19/27 stories done)

---

## Resumo

Executar todas as stories restantes da queue do projeto Taverna do Mestre usando o orchestrator existente (`scripts/orchestrator/`), aplicando o ciclo completo BMAD em cada story: **Implement → CR (Code Review) → QA → Fix → Deploy**. O processo deve ser autônomo, documentado, e produzir PRs individuais por story com evidência de revisão.

---

## Estado Atual

| Métrica | Valor |
|---------|-------|
| Stories V2 implementadas | 19/27 |
| Stories V2 deferidas | 8 (3.3, 3.5, 4.5, 4.6 + dependências) |
| Story specs na queue | 75 arquivos em `_bmad-output/implementation-artifacts/` |
| Orchestrator | Funcional, com issues conhecidas (security, race conditions, zero tests) |
| Hardening stories | H.1–H.6 documentadas, não executadas |

---

## Fase 0 — Orchestrator Hardening (Pré-requisito)

**Objetivo:** Tornar o orchestrator seguro e confiável antes de rodar a queue inteira.

### Story F0.1 — Security Fixes (H.1)

**Esforço:** 3h
**Arquivos:** `scripts/orchestrator/git.ts`, `scripts/orchestrator/claude-runner.ts`

**O que fazer:**
- Eliminar riscos de command injection em `git.ts` (shell=true com input não sanitizado)
- Validar argumentos de CLI antes de passar para `execSync`/`spawn`
- Sanitizar nomes de branch e story IDs

**Critérios de Aceite:**
- [ ] Zero uso de `shell: true` com input externo
- [ ] Branch names validados contra regex `^[a-zA-Z0-9/_.-]+$`
- [ ] Story IDs validados antes de interpolação em comandos

---

### Story F0.2 — Race Condition Fixes (H.2)

**Esforço:** 4h
**Arquivos:** `scripts/orchestrator/story-queue.ts`, `scripts/orchestrator/watcher.ts`

**O que fazer:**
- Revisar file lock + mutex para garantir atomicidade em slot assignment
- Corrigir race conditions no watcher (evento de arquivo pode disparar enquanto queue processa)
- Adicionar timeout de segurança no semáforo

**Critérios de Aceite:**
- [ ] File lock testado com concorrência simulada
- [ ] Watcher ignora eventos durante processamento ativo
- [ ] Semáforo tem timeout de 90min com fallback graceful

---

### Story F0.3 — Test Suite (H.4)

**Esforço:** 4h
**Arquivos:** `scripts/orchestrator/__tests__/`

**O que fazer:**
- Setup vitest para o orchestrator
- Testes unitários para: queue building, dependency resolution, slot assignment, git operations (mocked)
- Smoke test end-to-end com 2 stories dummy

**Critérios de Aceite:**
- [ ] ≥80% cobertura nas funções core da queue
- [ ] CI green com `vitest run --project orchestrator`
- [ ] Smoke test roda em <30s

---

## Fase 1 — Stories Deferidas (Dependências Cruzadas Resolvidas)

**Objetivo:** Completar as 4 stories deferidas do V2 Sprint que tinham dependências entre streams.

### Story F1.1 — Player Auto-Join (Story 3.3)

**Esforço:** 6h
**Depende de:** Story 4.3 (email invites — ✅ já implementada)
**Spec:** `_bmad-output/implementation-artifacts/b3-2-player-auto-join-presence.md`

**O que fazer:**
- Jogador vinculado a campanha entra automaticamente (sem formulário)
- Dados do `player_characters` carregam via Supabase query
- DM recebe notificação de auto-join
- Player pode editar dados antes de confirmar

**Critérios de Aceite:**
- [ ] Player vinculado não preenche formulário
- [ ] Dados carregam do `player_characters`
- [ ] DM recebe notificação visual
- [ ] Player pode editar antes de confirmar
- [ ] Funciona apenas em campanhas onde player está vinculado
- [ ] **CR:** Sem regressão no fluxo de late-join manual (Story 1.3)
- [ ] **QA:** Testar com player não vinculado (deve cair no fluxo normal)

---

### Story F1.2 — DM Link Temp Player to Character (Story 3.5)

**Esforço:** 5h
**Depende de:** Story 3.4 (role selection — ✅ já implementada)
**Spec:** `_bmad-output/implementation-artifacts/b3-4-dm-link-temp-player-character.md`

**O que fazer:**
- DM vê dropdown "Vincular a personagem:" quando jogador entra via QR
- Lista players da campanha não vinculados
- Stats do player_character carregam ao vincular
- Vínculo persiste se jogador criar conta depois

**Critérios de Aceite:**
- [ ] DM vê opção de vincular jogador temporário
- [ ] Stats carregam do player_character
- [ ] Vínculo persiste após signup
- [ ] Jogador não vinculado funciona normalmente
- [ ] **CR:** Broadcast sanitizado (nunca envia stats de monstro no payload de link)
- [ ] **QA:** Testar cenário de 2+ jogadores temporários simultâneos

---

### Story F1.3 — CR Calculator (Story 4.5)

**Esforço:** 6h
**Depende de:** `useFeatureGate` do Epic 5 (✅ já implementado)
**Spec:** `_bmad-output/implementation-artifacts/c2-3-cr-calculator.md`

**O que fazer:**
- Na fase de setup, calcular dificuldade: Easy/Medium/Hard/Deadly
- Fórmula: DMG 2014 (XP thresholds) + DMG 2024 (CR budget)
- Badge visual ao lado do botão "Start Combat"
- Feature gated (Pro only via `useFeatureGate`)

**Critérios de Aceite:**
- [ ] Cálculo correto para SRD 2014
- [ ] Cálculo correto para SRD 2024
- [ ] Badge com cores: Easy (verde) / Medium (amarelo) / Hard (laranja) / Deadly (vermelho)
- [ ] Recalcula ao adicionar/remover combatants
- [ ] Party level configurável
- [ ] Gated com `<ProGate feature="cr_calculator">`
- [ ] **CR:** XP thresholds validados contra DMG tables oficiais
- [ ] **QA:** Testar com 0 monstros, 1 monstro CR 0, grupo misto 2014+2024

---

### Story F1.4 — Homebrew Content Creation (Story 4.6)

**Esforço:** 10h
**Depende de:** Epic 5 (✅ implementado) + nova migration
**Spec:** `_bmad-output/implementation-artifacts/c2-4-homebrew-content-creation.md`

**O que fazer:**
- Compendium → "Criar Homebrew" (Pro only)
- Formulário completo para monstro (stat block), magia, item
- Tabela `homebrew_content` com `owner_id` + RLS
- Homebrew aparece no search com badge "Homebrew"

**Critérios de Aceite:**
- [ ] CRUD completo: criar, editar, deletar monstro/magia/item
- [ ] Homebrew aparece no search do compendium (badge visual)
- [ ] Privado do criador por default
- [ ] RLS: owner só acessa próprio homebrew
- [ ] Validação Zod no formulário
- [ ] i18n para labels e placeholders
- [ ] **CR:** Schema de homebrew_content não conflita com SRD tables
- [ ] **QA:** Testar search com mix homebrew + SRD + ambas versões (2014/2024)

---

## Fase 2 — Queue Completa: Stories Restantes dos Specs

**Objetivo:** Executar as stories restantes dos 75 specs que ainda não foram implementadas.

### Story F2.1 — Stream A: Tech Debt & Testing

**Specs:** `a0-*`, `a1-*`
**Stories incluídas:**
- `a0-1` Migration renumbering
- `a0-2` Rate limit Upstash Redis (Story 0.3)
- `a0-3` Structured logging Sentry
- `a0-4` ESLint hooks/security audit
- `a0-5` setTimeout cleanup
- `a0-6` Broadcast type safety
- `a0-7` Realtime channel singleton
- `a0-8` getState atomicity
- `a1-1` Tests combat-store
- `a1-2` Tests realtime
- `a1-3` Tests player flow
- `a1-4` Tests E2E full flow

**Critérios de Aceite (por story):**
- [ ] Implementação conforme spec individual
- [ ] **CR automático** via `bmad-code-review` skill
- [ ] **QA** via `bmad-qa` skill — zero regressões
- [ ] **Fix loop** até 3 tentativas se CR/QA falhar
- [ ] PR individual criado com evidência de CR+QA

---

### Story F2.2 — Stream B: Combat UX Polish

**Specs:** `b2-3` a `b2-6`
**Stories incluídas:**
- `b2-3` Player view mobile-first
- `b2-4` Reconnection visual feedback
- `b2-5` Stat block inline combatant
- `b2-6` HP bar tooltips

**Critérios de Aceite (por story):**
- [ ] Mobile-first responsive (touch targets ≥44px)
- [ ] HP bars usam LIGHT/MODERATE/HEAVY/CRITICAL (regra imutável)
- [ ] **CR + QA + Fix** loop completo
- [ ] Sem regressão no player view existente

---

### Story F2.3 — Stream C: Monetization & Invites Polish

**Specs:** `c1-1` a `c2-2`
**Stories incluídas:**
- `c1-1` Feature flags E2E
- `c1-2` Stripe checkout complete
- `c1-3` Subscription management
- `c1-4` Trial 14 days
- `c1-5` Mesa model
- `c1-6` Pro indicators upsell
- `c2-1` Email invites (Novu integration)
- `c2-2` Auto-link character invite

**Critérios de Aceite:**
- [ ] Stripe webhook idempotente e testado
- [ ] Feature flags cache TTL 5min
- [ ] Trial não re-ativável (1x por conta)
- [ ] **CR + QA + Fix** loop completo

---

## Fase 3 — Epic Specs (Novos Épicos)

**Specs:** `10-0` a `14-0`
**Stories incluídas:**
- `10-0` Epic Freemium Combat Tracker
- `11-0` Epic Monster Search & Combat Setup Overhaul
- `11-1` Clean initial state
- `12-0` Epic Bugfix Combat UI Polish
- `13-0` Epic Acquisition Conversion Subscription
- `14-0` Epic Analytics Funnel Tracking

**Nota:** Estas são specs de épico — cada uma precisa ser **decomposed** em stories individuais antes de entrar na queue. Usar `bmad-create-epics-and-stories` ou `bmad-create-story` para gerar specs executáveis.

**Critérios de Aceite:**
- [ ] Cada epic decomposto em ≤6 stories com AC individual
- [ ] Dependências mapeadas entre stories
- [ ] Stories entram na queue do orchestrator
- [ ] **CR + QA + Fix** em cada story

---

## Processo BMAD por Story (Ciclo Completo)

```
┌─────────────┐
│  READ SPEC  │ ← _bmad-output/implementation-artifacts/{story}.md
└──────┬──────┘
       ▼
┌─────────────┐
│  IMPLEMENT  │ ← Claude agent em worktree isolado
└──────┬──────┘
       ▼
┌─────────────┐
│  CODE REVIEW│ ← bmad-code-review (Blind Hunter + Edge Case Hunter + Acceptance Auditor)
└──────┬──────┘
       ▼ findings?
┌─────────────┐
│    FIX      │ ← Auto-fix de findings P0/P1 (até 3 tentativas)
└──────┬──────┘
       ▼
┌─────────────┐
│     QA      │ ← npm run build + npm test + type-check + lint
└──────┬──────┘
       ▼ falhou?
┌─────────────┐
│  FIX (QA)   │ ← Auto-fix de test/build failures (até 3 tentativas)
└──────┬──────┘
       ▼
┌─────────────┐
│  COMMIT+PR  │ ← Branch por story, PR com evidência de CR+QA
└──────┬──────┘
       ▼
┌─────────────┐
│  DOCUMENT   │ ← Atualizar docs/v2-sprint-2026-03-27.md + sprint status
└─────────────┘
```

**Regras do ciclo:**
1. **Max 3 fix attempts** — se CR ou QA falhar 3x, story é marcada como `blocked` com reason
2. **PR body** inclui: summary, files changed, CR findings (resolved), QA results
3. **Cada story gera 1 commit + 1 PR** — nunca bundlar stories em um PR
4. **Sprint doc** atualizado após cada story completar

---

## Ordem de Execução e Dependências

```
Fase 0 (Hardening):
  F0.1 ──┐
  F0.2 ──┼── podem rodar em paralelo
  F0.3 ──┘

Fase 1 (Deferidas V2):
  F1.1 ─── independente
  F1.2 ─── independente
  F1.3 ─── independente
  F1.4 ─── independente (todas podem rodar em paralelo)

Fase 2 (Queue restante):
  F2.1 (Stream A) ──┐
  F2.2 (Stream B) ──┼── paralelo entre streams, sequencial dentro do stream
  F2.3 (Stream C) ──┘
  Dentro de cada stream: respeitar ordem numérica (a0-1 antes de a0-2, etc.)

Fase 3 (Novos Epics):
  Decompose primeiro → então entram na Fase 2 como novas stories
```

**Concorrência máxima:** 4 slots paralelos (configuração atual do orchestrator)

---

## Arquivos a Modificar/Criar

### Orchestrator (Fase 0)
| Arquivo | Ação |
|---------|------|
| `scripts/orchestrator/git.ts` | Fix command injection |
| `scripts/orchestrator/claude-runner.ts` | Sanitize CLI args |
| `scripts/orchestrator/story-queue.ts` | Fix race conditions, add timeout |
| `scripts/orchestrator/watcher.ts` | Guard against concurrent events |
| `scripts/orchestrator/__tests__/*.test.ts` | Novo — test suite completa |

### Stories Deferidas (Fase 1)
| Arquivo | Ação |
|---------|------|
| `components/player/PlayerJoinClient.tsx` | Auto-join logic |
| `components/player/PlayerLobby.tsx` | Auto-join UI |
| `components/combat/CombatSessionClient.tsx` | DM link temp player |
| `components/combat/EncounterSetup.tsx` | CR calculator badge |
| `components/combat/CRCalculator.tsx` | Novo — componente de cálculo |
| `components/compendium/HomebrewEditor.tsx` | Novo — CRUD homebrew |
| `lib/utils/cr-calculator.ts` | Novo — lógica de cálculo CR |
| `lib/types/homebrew.ts` | Novo — tipos homebrew |
| `lib/validation/schemas.ts` | Schemas para homebrew + CR |
| `supabase/migrations/026_homebrew_content.sql` | Novo — tabela homebrew |
| `messages/pt-BR.json` | i18n keys para novas features |
| `messages/en.json` | i18n keys para novas features |

### Documentação (Contínuo)
| Arquivo | Ação |
|---------|------|
| `docs/v2-sprint-2026-03-27.md` | Atualizar status após cada story |
| `docs/queue-execution-log.md` | Novo — log de execução da queue |

---

## Estimativa de Esforço

| Fase | Stories | Esforço Estimado | Paralelismo |
|------|---------|-----------------|-------------|
| Fase 0 — Hardening | 3 | ~11h | 3 parallel |
| Fase 1 — Deferidas | 4 | ~27h | 4 parallel |
| Fase 2 — Queue restante | ~24 | ~60h | 4 slots × 3 streams |
| Fase 3 — Novos épicos | ~20 (estimativa) | ~50h | 4 slots |
| **Total** | **~51 stories** | **~148h** | **~40h wall-clock** |

**Nota:** Wall-clock assume 4 slots paralelos e ~70% de eficiência (overhead de git, merges, retries).

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Merge conflicts entre stories paralelas | Alto | Worktrees isolados + git mutex serializado |
| Rate limit da API Claude | Médio | Backoff exponencial já implementado |
| Migration conflicts (múltiplas stories adicionam cols) | Alto | Serializar merges no main via mutex |
| Story bloqueada por dependência externa (Upstash, Stripe) | Médio | Marcar como `blocked`, continuar outras |
| STRIPE_SECRET_KEY ausente | Baixo | Stories de Stripe rodam com mock/skip em dev |
| CR/QA loop infinito | Baixo | Hard cap de 3 tentativas |

---

## Critérios de Sucesso (Definition of Done)

- [ ] Todas as 27 stories V2 implementadas (19 atuais + 4 deferidas + 4 que faltam documentar)
- [ ] Orchestrator hardened (H.1-H.6 ou equivalentes F0.1-F0.3)
- [ ] Cada story tem PR com evidência de CR + QA
- [ ] `npm run build` green no branch principal
- [ ] `npm test` green com ≥ cobertura atual mantida
- [ ] `docs/v2-sprint-2026-03-27.md` atualizado com status final
- [ ] Zero regressões nos fluxos core (combat, player view, guest mode)
- [ ] HP bars mantêm LIGHT/MODERATE/HEAVY/CRITICAL (regra imutável)
- [ ] Broadcast sanitizado em todas as novas features (nunca expor stats de monstro)
