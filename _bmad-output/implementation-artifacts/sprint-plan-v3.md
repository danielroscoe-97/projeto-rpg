# Sprint Plan V3 — Pocket DM

**Data:** 2026-03-27
**Origem:** Sessão de brainstorming multi-agente (Architect + Analyst + PM + UX Designer)
**Documento base:** `_bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md`

---

## Princípios

1. **Segurança e estabilidade** antes de features
2. **Sweet spot mesa física** antes de features digitais puras
3. **DM experience** antes de monetização
4. **Completar o começado** antes de iniciar novo

---

## Sprint 0 — Estabilização (BLOQUEANTE)

> Nenhuma feature nova mergeada até Sprint 0 completo.

### Épico A.0: Infraestrutura Crítica

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| A.0.1 | Renumerar Migrations | [a0-1-renumber-migrations.md](a0-1-renumber-migrations.md) | 🔴 Blocker | P | — |
| A.0.2 | Rate Limit Upstash Redis | [a0-2-rate-limit-upstash-redis.md](a0-2-rate-limit-upstash-redis.md) | 🔴 Crítico | M | — |
| A.0.3 | Structured Logging Sentry | [a0-3-structured-logging-sentry.md](a0-3-structured-logging-sentry.md) | 🟡 Alto | M | — |
| A.0.4 | ESLint Hooks + Security | [a0-4-eslint-hooks-security.md](a0-4-eslint-hooks-security.md) | 🟡 Alto | P | — |
| A.0.5 | setTimeout Cleanup Audit | [a0-5-settimeout-cleanup-audit.md](a0-5-settimeout-cleanup-audit.md) | 🟡 Alto | P | — |
| A.0.6 | Broadcast Type Safety | [a0-6-broadcast-type-safety.md](a0-6-broadcast-type-safety.md) | 🟡 Alto | M | — |
| A.0.7 | Realtime Channel Instance | [a0-7-realtime-channel-instance.md](a0-7-realtime-channel-instance.md) | 🟠 Médio | M | A.0.6 |
| A.0.8 | getState() Atomicity | [a0-8-getstate-atomicity.md](a0-8-getstate-atomicity.md) | 🟠 Médio | M | — |

### Épico A.1: Cobertura de Testes Mínima

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| A.1.1 | Tests Combat Store | [a1-1-tests-combat-store.md](a1-1-tests-combat-store.md) | 🟡 Alto | M | A.0 ✓ |
| A.1.2 | Tests Realtime | [a1-2-tests-realtime.md](a1-2-tests-realtime.md) | 🟡 Alto | G | A.0.6, A.0.7 |
| A.1.3 | Tests Player Flow | [a1-3-tests-player-flow.md](a1-3-tests-player-flow.md) | 🟠 Médio | M | A.1.1 |
| A.1.4 | E2E Full Flow | [a1-4-tests-e2e-full-flow.md](a1-4-tests-e2e-full-flow.md) | 🟠 Médio | G | A.1.1-3 |

### Épico D.1: Orchestrator (paralelo com A.0)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| D.1.1 | Git Worktrees | [d1-1-git-worktrees.md](d1-1-git-worktrees.md) | 🔴 Crítico | G | — |
| D.1.2 | Verify-Fix Loop | [d1-2-verify-fix-loop.md](d1-2-verify-fix-loop.md) | 🔴 Crítico | G | D.1.1 |

---

## Sprint 1 — Features Core

### Épico B.1: Combate Fluido (parcial)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| B.1.1 | Add Combatant Mid-Combat | [b1-1-add-combatant-mid-combat.md](b1-1-add-combatant-mid-combat.md) | 🔴 Crítico | M | Sprint 0 |
| B.1.2 | Display Name Anti-Metagaming | [b1-2-display-name-anti-metagaming.md](b1-2-display-name-anti-metagaming.md) | 🔴 Crítico | M | Sprint 0 |

### Épico B.2: Experiência na Mesa (parcial)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| B.2.1 | Turn Notification "É Sua Vez!" | [b2-1-turn-notification-e-sua-vez.md](b2-1-turn-notification-e-sua-vez.md) | 🔴 Crítico | G | Sprint 0, Novu |
| B.2.3 | Player View Mobile-First | [b2-3-player-view-mobile-first.md](b2-3-player-view-mobile-first.md) | 🟡 Alto | G | Sprint 0 |

### Épico B.3: Sessão Rica (parcial)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| B.3.1 | GM Private Notes | [b3-1-gm-private-notes.md](b3-1-gm-private-notes.md) | 🟡 Alto | P | Sprint 0 |

---

## Sprint 2 — Expansão

### Épico B.1: Combate Fluido (resto)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| B.1.3 | Late-Join Initiative | [b1-3-late-join-initiative.md](b1-3-late-join-initiative.md) | 🟡 Alto | G | B.1.1 |
| B.1.4 | Monster Grouping UI | [b1-4-monster-grouping-ui.md](b1-4-monster-grouping-ui.md) | 🟡 Alto | G | Sprint 0 |
| B.1.5 | Individual HP in Groups | [b1-5-individual-hp-within-group.md](b1-5-individual-hp-within-group.md) | 🟡 Alto | M | B.1.4 |
| B.1.6 | Expand/Collapse Groups | [b1-6-expand-collapse-groups.md](b1-6-expand-collapse-groups.md) | 🟠 Médio | P | B.1.4 |
| B.1.7 | Collective Initiative Roll | [b1-7-collective-initiative-roll.md](b1-7-collective-initiative-roll.md) | 🟠 Médio | M | B.1.4 |

### Épico B.2: Experiência na Mesa (resto)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| B.2.2 | Turn Upcoming "Você é o Próximo" | [b2-2-turn-upcoming-voce-e-o-proximo.md](b2-2-turn-upcoming-voce-e-o-proximo.md) | 🟡 Alto | M | B.2.1 |
| B.2.4 | Reconnection Visual Feedback | [b2-4-reconnection-visual-feedback.md](b2-4-reconnection-visual-feedback.md) | 🟠 Médio | P | A.0.7 |
| B.2.5 | Stat Block Inline | [b2-5-stat-block-inline-combatant.md](b2-5-stat-block-inline-combatant.md) | 🟠 Médio | M | — |
| B.2.6 | HP Bar Tooltips | [b2-6-hp-bar-tooltips.md](b2-6-hp-bar-tooltips.md) | 🟢 Baixo | P | — |

### Épico B.3: Sessão Rica (resto)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| B.3.2 | Player Auto-Join Presence | [b3-2-player-auto-join-presence.md](b3-2-player-auto-join-presence.md) | 🟡 Alto | M | B.2.1 |
| B.3.3 | Role Selection Signup | [b3-3-role-selection-signup.md](b3-3-role-selection-signup.md) | 🟠 Médio | P | — |
| B.3.4 | DM Link Temp Player | [b3-4-dm-link-temp-player-character.md](b3-4-dm-link-temp-player-character.md) | 🟠 Médio | M | B.3.2 |
| B.3.5 | File Sharing Complete | [b3-5-file-sharing-complete.md](b3-5-file-sharing-complete.md) | 🟠 Médio | M | Sprint 0 |

### Épico D.1: Orchestrator (resto)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| D.1.3 | QA Automático | [d1-3-qa-automatic-post-impl.md](d1-3-qa-automatic-post-impl.md) | 🟡 Alto | M | D.1.2 |
| D.1.4 | Parallel Stories | [d1-4-parallel-stories.md](d1-4-parallel-stories.md) | 🟠 Médio | G | D.1.1-3 |

---

## Sprint 3 — Monetização

### Épico C.1: Freemium Foundation

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| C.1.1 | Feature Flags E2E | [c1-1-feature-flags-e2e.md](c1-1-feature-flags-e2e.md) | 🟡 Alto | M | Sprint 0 |
| C.1.2 | Stripe Checkout Complete | [c1-2-stripe-checkout-complete.md](c1-2-stripe-checkout-complete.md) | 🟡 Alto | G | C.1.1 |
| C.1.3 | Subscription Management | [c1-3-subscription-management.md](c1-3-subscription-management.md) | 🟡 Alto | G | C.1.2 |
| C.1.4 | Trial 14 Dias | [c1-4-trial-14-days.md](c1-4-trial-14-days.md) | 🟠 Médio | M | C.1.2 |
| C.1.5 | Mesa Model | [c1-5-mesa-model.md](c1-5-mesa-model.md) | 🟠 Médio | G | C.1.3 |
| C.1.6 | Pro Indicators + Upsell | [c1-6-pro-indicators-upsell.md](c1-6-pro-indicators-upsell.md) | 🟢 Baixo | M | C.1.1 |

### Épico C.2: Campanhas

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| C.2.1 | Email Invites Novu | [c2-1-email-invites-novu.md](c2-1-email-invites-novu.md) | 🟠 Médio | M | Novu |
| C.2.2 | Auto-Link Character | [c2-2-auto-link-character-invite.md](c2-2-auto-link-character-invite.md) | 🟠 Médio | M | C.2.1 |
| C.2.3 | CR Calculator | [c2-3-cr-calculator.md](c2-3-cr-calculator.md) | 🟢 Baixo | M | — |
| C.2.4 | Homebrew Content | [c2-4-homebrew-content-creation.md](c2-4-homebrew-content-creation.md) | 🟢 Baixo | G | — |

---

## Legenda

- **Tamanho:** P = Pequeno (< 1 dia), M = Médio (1-2 dias), G = Grande (3+ dias)
- **Prioridade:** 🔴 Blocker/Crítico, 🟡 Alto, 🟠 Médio, 🟢 Baixo
- **Deps:** Dependências que devem estar completas antes de iniciar
- **Sprint 0** como dep = todos os épicos A.0.x devem estar completos

## Contagem

| Track | Stories | P | M | G |
|---|---|---|---|---|
| A.0 Infraestrutura | 8 | 3 | 5 | 0 |
| A.1 Testes | 4 | 0 | 2 | 2 |
| B.1 Combate | 7 | 1 | 4 | 2 |
| B.2 Mesa | 6 | 2 | 2 | 2 |
| B.3 Sessão | 5 | 2 | 3 | 0 |
| C.1 Freemium | 6 | 0 | 3 | 3 |
| C.2 Campanhas | 4 | 0 | 3 | 1 |
| D.1 Orchestrator | 4 | 0 | 1 | 3 |
| **TOTAL** | **44** | **8** | **23** | **13** |
