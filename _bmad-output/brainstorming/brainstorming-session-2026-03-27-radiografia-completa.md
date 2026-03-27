---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
session_topic: "Radiografia completa V1+V2 — débitos técnicos, jornada, features, roadmap"
session_goals: "Documento consolidado para agentes operarem autonomamente"
selected_approach: "AI-Recommended (4 agentes: Architect, Analyst, PM, UX Designer)"
techniques_used:
  - "Multi-agent round table"
  - "Technical debt audit"
  - "User journey mapping"
  - "Feature completeness matrix"
  - "Epic restructuring"
context_file: ""
---

# Radiografia Completa — Pocket DM V1+V2

**Facilitador:** Dani_
**Data:** 2026-03-27
**Agentes:** Architect, Analyst, PM, UX Designer

---

## 1. Proposta de Valor (Âncora de Decisão)

> O Pocket DM **NÃO é um VTT completo**. É o sweet spot perfeito entre experiência física e digital — tanto para o mestre quanto para os jogadores.

**Implicações para toda decisão:**

- Features que afastam o jogador da mesa → REJEITAR
- Features que enriquecem a mesa sem substituí-la → PRIORIZAR
- Notificações no celular > mapas no browser
- 10 segundos de setup > 10 minutos de configuração
- Simplicidade > completude

---

## 2. Débitos Técnicos (Architect)

### 🔴 CRÍTICO (Bloqueia deploy/segurança)

| ID | Descrição | Arquivo(s) | Impacto |
|---|---|---|---|
| DT-01 | Conflito de numeração de migrations (017-020 duplicados) | `supabase/migrations/` | Deploy quebra — migrations executam fora de ordem |
| DT-02 | Rate limiting in-memory apenas | `lib/supabase/proxy.ts` | Bypass em ambiente serverless — risco de abuso |

### 🟡 ALTO (Bugs silenciosos, manutenabilidade)

| ID | Descrição | Arquivo(s) | Impacto |
|---|---|---|---|
| DT-03 | Broadcast type safety quebrada (`as unknown as`) | `lib/realtime/broadcast.ts` | Eventos malformados chegam silenciosamente ao player |
| DT-04 | setTimeout/setInterval sem cleanup | `CombatantRow.tsx`, `GuestBanner.tsx`, `use-realtime-channel.ts` | Memory leaks, callbacks órfãos |
| DT-05 | getState() race conditions | `lib/hooks/useCombatActions.ts` | Estado inconsistente se realtime event chega mid-mutation |
| DT-06 | ESLint sem react-hooks/segurança | `eslint.config.mjs` | Bugs de deps não capturados, vulnerabilidades |
| DT-07 | console.error em produção (40+ locais) | Múltiplos | Erros se perdem, sem Sentry tracking |

### 🟠 MÉDIO

| ID | Descrição | Arquivo(s) | Impacto |
|---|---|---|---|
| DT-08 | Singleton do canal Realtime | `lib/realtime/broadcast.ts` | Troca rápida de sessão → canal errado |
| DT-09 | crypto.randomUUID sem fallback | `lib/stores/combat-store.ts` | Falha em ambientes non-browser |
| DT-10 | Dual ref/state em CombatantRow | `components/combat/CombatantRow.tsx` | Source of truth ambígua |

---

## 3. Problemas de Jornada (UX Designer)

### Jornada do DM

| ID | Momento | Problema | Severidade |
|---|---|---|---|
| JN-01 | Primeiro acesso | Sem onboarding/tour — DM não sabe por onde começar | 🔴 Crítico (retenção) |
| JN-02 | Mid-combat | Não pode adicionar combatants durante combate | 🟡 Alto |
| JN-03 | Combate ativo | Nomes reais de monstros visíveis para jogadores | 🟡 Alto |
| JN-04 | Turno do jogador | Sem notificação push/som para jogador | 🔴 Crítico (proposta de valor) |
| JN-05 | Reconexão | Sem feedback visual de reconexão/atualização | 🟠 Médio |
| JN-09 | Consulta de stats | Compêndio desconectado do combate | 🟠 Médio |

### Jornada do Jogador

| ID | Momento | Problema | Severidade |
|---|---|---|---|
| JN-06 | Join | Tela vazia se DM não iniciou combate | 🟡 Alto |
| JN-07 | Retorno | Jogador anônimo perde identidade ao fechar browser | 🟡 Alto |
| JN-08 | Combate | HP bars sem legenda (LIGHT/MODERATE/HEAVY/CRITICAL) | 🟢 Baixo |
| JN-10 | Mobile | Player view não é mobile-first (thumb-zone) | 🟡 Alto |

---

## 4. Features Incompletas V2 (Analyst)

### Legenda: ✅ Pronto | 🔧 Código existe parcial | 📝 Spec only | ❌ Não iniciado

| ID | Feature | Epic V2 | Status | O que falta |
|---|---|---|---|---|
| FQ-06 | Add combatant mid-combat | Epic 1 | 🔧 | Testes, broadcast integration |
| FQ-07 | Display name anti-metagaming | Epic 1 | 🔧 | Sanitização completa, testes |
| FQ-08 | Late-join initiative | Epic 1 | 📝 | Implementação completa |
| FQ-09 | Monster grouping UI | Epic 2 | 🔧 | MonsterGroupHeader não integrado |
| FQ-10 | Individual HP in groups | Epic 2 | 📝 | Tipos ok, sem UI |
| FQ-11 | Expand/collapse groups | Epic 2 | 📝 | Store ok, sem UI |
| FQ-12 | Collective initiative | Epic 2 | 📝 | Sem implementação |
| FQ-13 | Turn notifications | Epic 3 | 🔧 | Components ok, Novu não configurado |
| FQ-14 | Player auto-join | Epic 3 | 📝 | Presence não integrado |
| FQ-15 | Role selection signup | Epic 3 | 🔧 | Component ok, flow não completo |
| FQ-16 | GM private notes | Epic 4 | 🔧 | Sem broadcast guard |
| FQ-17 | File sharing | Epic 4 | 🔧 | Sem testes, sem validação MIME |
| FQ-18 | Email invites | Epic 4 | 🔧 | Novu workflow TODO |
| FQ-19 | CR calculator | Epic 4 | 📝 | Sem implementação |
| FQ-20 | Homebrew content | Epic 4 | 📝 | Sem implementação |
| FQ-21 | Feature flags | Epic 5 | 🔧 | Code exists, sem testes E2E |
| FQ-22 | Stripe integration | Epic 5 | 🔧 | API routes existem, sem testes |
| FQ-23 | Subscription store | Epic 5 | 🔧 | Store criada, sem testes |
| FQ-24 | Trial system | Epic 5 | 🔧 | API route ok, sem E2E |
| FQ-25 | Mesa model | Epic 5 | 📝 | Migration ok, lógica ausente |

### Cobertura de Testes

| Área | Testado | Total | % |
|---|---|---|---|
| Combat components | 4 | 12 | 33% |
| Stores | 1 | 4+ | 25% |
| Utils | 2 | 5+ | 40% |
| Player | 0 | 5+ | 0% |
| Session | 1 | 10+ | 10% |
| Billing | 0 | 5+ | 0% |
| Campaign | 0 | 3+ | 0% |
| **TOTAL** | ~8 | ~44+ | ~18% |

---

## 5. Roadmap Proposto (PM)

### Princípios de Priorização

1. **Segurança e estabilidade** antes de features
2. **Sweet spot mesa física** antes de features digitais puras
3. **DM experience** antes de monetização
4. **Completar o começado** antes de iniciar novo

### TRACK A — Estabilização (Sprint 0 — BLOQUEANTE)

> Nenhuma feature nova deve ser mergeada até Track A completo.

#### Épico A.0: Infraestrutura Crítica

| Story | ID Débito | Prioridade | Tamanho | Deps |
|---|---|---|---|---|
| A.0.1 — Renumerar migrations sequencialmente | DT-01 | 🔴 Blocker | P | Nenhuma |
| A.0.2 — Rate limit com Upstash Redis | DT-02 | 🔴 Crítico | M | Nenhuma |
| A.0.3 — Structured logging → Sentry | DT-07 | 🟡 Alto | M | Nenhuma |
| A.0.4 — ESLint: react-hooks + security rules | DT-06 | 🟡 Alto | P | Nenhuma |
| A.0.5 — setTimeout/setInterval cleanup audit | DT-04 | 🟡 Alto | P | Nenhuma |
| A.0.6 — Broadcast type safety (eliminar as unknown) | DT-03 | 🟡 Alto | M | Nenhuma |
| A.0.7 — Realtime channel instance por sessão | DT-08 | 🟠 Médio | M | A.0.6 |
| A.0.8 — getState() atomicity | DT-05 | 🟠 Médio | M | Nenhuma |

#### Épico A.1: Cobertura de Testes Mínima

| Story | Prioridade | Tamanho | Deps |
|---|---|---|---|
| A.1.1 — Testes combat-store (grouping, undo, conditions) | 🟡 Alto | M | A.0 completo |
| A.1.2 — Testes realtime (broadcast, reconnect, polling) | 🟡 Alto | G | A.0.6, A.0.7 |
| A.1.3 — Testes player flow (join, view, reconnect) | 🟠 Médio | M | A.1.1 |
| A.1.4 — E2E: DM cria sessão → jogador entra → combate completo | 🟠 Médio | G | A.1.1-3 |

---

### TRACK B — Features Core (O sweet spot)

#### Épico B.1: Combate Fluido (V2 Epics 1-2)

| Story | Ref | Prioridade | Tamanho | Deps |
|---|---|---|---|---|
| B.1.1 — Add combatant mid-combat (completar) | FQ-06 | 🔴 Crítico | M | Track A |
| B.1.2 — Display name anti-metagaming (completar) | FQ-07 | 🔴 Crítico | M | Track A |
| B.1.3 — Late-join: DM aprova/rejeita | FQ-08 | 🟡 Alto | G | B.1.1 |
| B.1.4 — Monster grouping UI | FQ-09 | 🟡 Alto | G | B.1.1 |
| B.1.5 — Individual HP within groups | FQ-10 | 🟡 Alto | M | B.1.4 |
| B.1.6 — Expand/collapse groups | FQ-11 | 🟠 Médio | P | B.1.4 |
| B.1.7 — Collective initiative roll | FQ-12 | 🟠 Médio | M | B.1.4 |

#### Épico B.2: Experiência na Mesa (diferencial Taverna)

| Story | Ref | Prioridade | Tamanho | Deps |
|---|---|---|---|---|
| B.2.1 — Turn notification "É sua vez!" | FQ-13, JN-04 | 🔴 Crítico | G | Track A, Novu config |
| B.2.2 — Turn upcoming "Você é o próximo" | FQ-13 | 🟡 Alto | M | B.2.1 |
| B.2.3 — Player view mobile-first | JN-10 | 🟡 Alto | G | Track A |
| B.2.4 — Reconexão visual | JN-05 | 🟠 Médio | P | A.0.7 |
| B.2.5 — Stat block inline no combatant | JN-09 | 🟠 Médio | M | Nenhuma |
| B.2.6 — HP bar tooltips/legenda | JN-08 | 🟢 Baixo | P | Nenhuma |

#### Épico B.3: Sessão Rica (V2 Epics 3-4 parciais)

| Story | Ref | Prioridade | Tamanho | Deps |
|---|---|---|---|---|
| B.3.1 — GM private notes (broadcast guard) | FQ-16 | 🟡 Alto | P | Track A |
| B.3.2 — Player auto-join (Presence) | FQ-14 | 🟡 Alto | M | B.2.1 |
| B.3.3 — Role selection signup | FQ-15 | 🟠 Médio | P | Nenhuma |
| B.3.4 — DM link temp player → character | JN-07 | 🟠 Médio | M | B.3.2 |
| B.3.5 — File sharing (completar + testes) | FQ-17 | 🟠 Médio | M | Track A |

---

### TRACK C — Monetização (Após Track B core estável)

#### Épico C.1: Freemium Foundation

| Story | Ref | Prioridade | Tamanho | Deps |
|---|---|---|---|---|
| C.1.1 — Feature flags E2E | FQ-21 | 🟡 Alto | M | Track A |
| C.1.2 — Stripe Checkout completo + testes | FQ-22 | 🟡 Alto | G | C.1.1 |
| C.1.3 — Subscription management panel | FQ-23 | 🟡 Alto | G | C.1.2 |
| C.1.4 — Trial 14 dias | FQ-24 | 🟠 Médio | M | C.1.2 |
| C.1.5 — Mesa model | FQ-25 | 🟠 Médio | G | C.1.3 |
| C.1.6 — Pro indicators + upsell | — | 🟢 Baixo | M | C.1.1 |

#### Épico C.2: Campanhas

| Story | Ref | Prioridade | Tamanho | Deps |
|---|---|---|---|---|
| C.2.1 — Email invites (Novu workflow) | FQ-18 | 🟠 Médio | M | Novu config |
| C.2.2 — Auto-link character on invite | — | 🟠 Médio | M | C.2.1 |
| C.2.3 — CR calculator | FQ-19 | 🟢 Baixo | M | Nenhuma |
| C.2.4 — Homebrew content creation | FQ-20 | 🟢 Baixo | G | Nenhuma |

---

### TRACK D — Orchestrator (Infra dev)

#### Épico D.1: Automação de Sprint

| Story | Prioridade | Tamanho | Deps |
|---|---|---|---|
| D.1.1 — Git Worktrees para isolamento | 🔴 Crítico | G | Nenhuma |
| D.1.2 — Verify-Fix Loop automático | 🔴 Crítico | G | D.1.1 |
| D.1.3 — QA automático pós-implementação | 🟡 Alto | M | D.1.2 |
| D.1.4 — Paralelismo de stories | 🟠 Médio | G | D.1.1 |

---

## 6. Ordem de Execução Recomendada

```
Sprint 0 (Track A + D):
├── A.0.1 → A.0.2 → A.0.3-A.0.8 (paralelo)
├── D.1.1 → D.1.2 (paralelo com A.0)
└── A.1.1-A.1.4 (após A.0 completo)

Sprint 1 (Track B core):
├── B.1.1 + B.1.2 (paralelo — completar features existentes)
├── B.2.1 (turn notifications — proposta de valor #1)
├── B.2.3 (mobile-first — proposta de valor #2)
└── B.3.1 (GM notes — quick win)

Sprint 2 (Track B expansão):
├── B.1.3-B.1.7 (monster grouping completo)
├── B.2.2, B.2.4-B.2.6 (polimento UX)
├── B.3.2-B.3.5 (sessão rica)
└── A.1.4 (E2E tests — gates Track C)

Sprint 3 (Track C):
├── C.1.1 → C.1.2 → C.1.3 (feature flags → Stripe → panel)
├── C.1.4 + C.1.5 (trial + mesa model)
└── C.2.1-C.2.4 (campanhas)
```

---

## 7. Métricas de Sucesso

| Métrica | Atual | Meta Sprint 0 | Meta Sprint 3 |
|---|---|---|---|
| Cobertura de testes | ~18% | 40% | 70% |
| eslint-disable comments | 0 | 0 | 0 |
| console.error em produção | 40+ | 0 | 0 |
| Migrations sem conflito | ❌ | ✅ | ✅ |
| Tempo setup DM (primeira sessão) | ~5min | ~5min | ~2min (onboarding) |
| Notificação de turno (latência) | N/A | ≤200ms | ≤200ms |
| Player view mobile score | ~60/100 | ~60/100 | 90/100 |

---

## 8. Decisões Arquiteturais Pendentes

| Decisão | Opções | Recomendação | Quem decide |
|---|---|---|---|
| E2E framework | Playwright vs Cypress | Playwright (mais leve, melhor CI) | Architect |
| Novu setup | Self-hosted vs Cloud | Cloud (free tier, zero ops) | PM |
| Worktree cleanup | Auto vs Manual | Auto com flag de override | Architect |
| Stripe mode | Direct vs via Lemon Squeezy | Direct Stripe (mais flexível) | PM |
| Onboarding | Wizard vs Interactive tour | Tour interativo (menor fricção) | UX Designer |

---

## 9. Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Migrations conflitantes quebram prod | Alta | Crítico | Sprint 0, story A.0.1 |
| Rate limit bypass | Alta | Alto | Sprint 0, story A.0.2 |
| Novu free tier insuficiente | Baixa | Alto | Monitorar usage, fallback para Supabase Realtime puro |
| Stripe integration atrasa | Média | Médio | Pode lançar sem monetização, adicionar depois |
| Orchestrator sem worktrees causa conflitos | Alta | Alto | Track D em paralelo com Sprint 0 |

---

*Gerado por sessão de brainstorming multi-agente (Architect + Analyst + PM + UX Designer) — 2026-03-27*
