# ROADMAP — Evolução do PocketDM pós Linguagem Ubíqua

> **Objetivo estratégico:** Evoluir a plataforma para maximizar **retenção** e preparar **launch de nova frente** do app.
> **Origem:** Party Mode session 2026-04-19 (Dani_, John, Winston, Bob, Sally, Quinn).
> **Baseia-se em:** `docs/beta-test-session-3-2026-04-16.md` (30 feedbacks + 6 bugs).
> **Dívida técnica prévia:** `docs/PROMPT-execucao-linguagem-ubiqua.md` (Linguagem Ubíqua — execução independente e paralela).

---

## 1. Premissas estratégicas

1. **Linguagem Ubíqua = dívida técnica.** Executa em paralelo como foundation (Onda 0). Não é "feature de launch".
2. **Retenção > Novidade.** Toda onda prioriza "mestre/jogador volta ao app" antes de "nova feature wow".
3. **Show-stoppers do beta test bloqueiam launch.** F29/F15/F12 + B04 são pré-requisitos — sem eles, retenção é zero.
4. **Entity Graph é o diferencial competitivo.** É a maior feature pedida (Bloco 3 — 12 feedbacks em Conexões). Precisa de PRD dedicado ANTES de implementar.
5. **Player HQ já tem base (EPIC standalone).** Mas não resolve os F01/F02/F07/F08 do beta test — precisa complemento.

---

## 2. Métricas de sucesso (o que significa "pronto")

> **GAP IDENTIFICADO:** Projeto não tinha baseline documentado de métricas de retenção. Proposta abaixo — precisa validação do produto.

### 2.1 Métricas primárias (retenção)

| Métrica | Definição | Target pós-launch | Como medir |
|---|---|---|---|
| **DM Return Rate 7d** | % de DMs que voltam 7 dias após criar primeira campanha | ≥40% | Supabase analytics — `user_id` + `last_active_at` |
| **Sessions per DM per week** | Média de combates iniciados por DM/semana (DMs ativos) | ≥1.5 | Query em `combat_sessions` (rename: verificar pós-Linguagem Ubíqua) |
| **Campaign creation → 1st combat** | Tempo entre criação da campanha e primeiro combate iniciado | ≤7 dias (mediana) | Event tracking |
| **Player join rate** | % de convites enviados que resultam em jogador entrando | ≥60% | `session_tokens` + analytics |

### 2.2 Métricas secundárias (engajamento)

- **Entidades criadas por campanha** (NPCs + Locais + Notas) — proxy de investimento na campanha
- **Tempo médio em Campaign HQ** — proxy de uso real vs apenas criação
- **Reopens of Player HQ** — proxy de engajamento do jogador

### 2.3 Critério de launch

Launch = **Ondas 0, 1, 2 e bug B04 concluídos + métricas primárias instrumentadas**. Ondas 3-6 são pós-launch (iteração).

---

## 3. Ordem de execução (ondas)

### ONDA 0 — Dívida técnica (BLOCKER de launch) 🛑

**Status:** Prompt pronto em `docs/PROMPT-execucao-linguagem-ubiqua.md`. Execução independente.
**Duração:** 2-3 sessões (1 sessão i18n + 1 sessão rotas + 0.5 sessão bugs).

| Item | Referência | Duração |
|---|---|---|
| Linguagem Ubíqua i18n (83 chaves) | migration-i18n | 1 sessão |
| Rotas /session → /combat (65 refs) | migration-rotas | 1 sessão |
| Bugs B01 + B02 + B03 | beta-test-3 §Bloco 6 | 0.5 sessão |

**Critério de pronto:** Branch mergeada em master, build limpo, combate testado com DM+player conectados.

---

### ONDA 1 — Show-stoppers (BLOCKER de launch) 🔴

**Objetivo:** Mestre consegue usar a campanha que criou. Hoje ele não consegue.
**Impacto em retenção:** Crítico — sem isso, DM abandona após criar primeira campanha.
**Duração estimada:** 2 sprints (2-3 sessões cada).

| Feature | Feedback | Gap de spec |
|---|---|---|
| **Cards interativos em Campaign HQ** ("Every card is a door") | F15, F29 | ⚠️ **Lista completa de cards decorativos hoje** — gap #8 |
| **Botão de criar sessão** na tela de sessões | F12 | ✅ Especificado |
| **CRUD pós-criação** (editar NPCs, locais, facções após criação) | F29 | ⚠️ **Lista de entidades editáveis e campos** — gap #8b |
| **Performance Campaign Page** (5-8s → <2s) | B04 | ⚠️ **Spike técnico de investigação de causa raiz** — gap #5 |

**Entregáveis adicionais:**
- `docs/SPIKE-b04-campaign-performance.md` — investigação antes de codar
- `docs/SPEC-campaign-hq-cards-editable.md` — lista exaustiva + fluxos

---

### ONDA 2 — Core Experience do Mestre 🟠

**Objetivo:** Mestre navega rápido, vê o que importa no briefing, acha fichas em 1 clique.
**Impacto em retenção:** Alto — reduz fricção por sessão, aumenta frequência de uso.
**Duração estimada:** 2 sprints.

| Feature | Feedback | Gap de spec |
|---|---|---|
| **Dashboard informativo** (briefing do mestre, não grid) | F10 | ⚠️ **UX spec / wireframe** — gap #3 |
| **Navegação fácil a fichas dos jogadores** | F11 | ⚠️ **Fluxo de 1-clique a partir da campanha** — gap #11 |
| **Menu à esquerda** (sidebar left) | F13 | ⚠️ **UX spec / mockup** — gap #4 |
| **Bug performance Dashboard** (B05 6s → <2s) | B05 | Provavelmente mesma causa raiz do B04 |

**Entregáveis adicionais:**
- `docs/SPEC-campaign-dashboard-briefing.md` — conteúdo do briefing, widgets, prioridades
- `docs/SPEC-navigation-redesign.md` — decisão sobre sidebar esquerda + fluxos

---

### ONDA 3 — Entity Graph (DIFERENCIAL + RETENÇÃO) 💎

**Objetivo:** Mestre constrói e navega a **rede viva** da sua campanha. NPCs linkam a locais, facções organizam NPCs, notas viram pesquisa.
**Impacto em retenção:** Transformacional — é o feedback #1 do beta test (12 feedbacks neste bloco). Vira hábito do DM de voltar pra "construir mundo".
**Duração estimada:** 3-4 sprints.

**PRD dedicado é pré-requisito (F23).**

| Fase | Feature | Feedback |
|---|---|---|
| 3a | **PRD Entity Graph** | F23 |
| 3b | Hierarquia de locais (cidade > taverna) | F17, F18 |
| 3c | Links NPC ↔ Local (tabela de junção genérica) | F20 |
| 3d | Facções com NPCs + Local | F22, F28 |
| 3e | Notas linkadas a entidades + contexto | F24, F26 |
| 3f | Agrupamento/filtro de cards por tipo ou região | F16 |

**Entregáveis adicionais:**
- `docs/PRD-entity-graph.md` — modelo de dados + UX + migração + fases
- `docs/SPEC-location-hierarchy.md` — árvore? breadcrumbs? mapa? (UX spike)

---

### ONDA 4 — Player HQ Evolution 🎭

**Objetivo:** Jogador tem experiência completa em ficha + mestre consegue colaborar via notas.
**Impacto em retenção:** Alto — jogador engajado traz DM de volta. Hoje fichas são pobres.
**Duração estimada:** 2-3 sprints.

| Feature | Feedback | Gap de spec |
|---|---|---|
| **Notas mestre↔jogador com visibilidade** | F01, F02 | ⚠️ **Spec de `player_notes.visibility` + UI** — gap #7 |
| **Classes/raças como lista selecionável + multiclasse** | F03, F04 | Depende de compêndio completo |
| **Compactar proficiências/testes + density geral** | F07, F08 | Redesign de UI |
| **Player HQ standalone (Fase 1 do EPIC)** | — | ✅ `docs/EPIC-player-hq-standalone.md` |

**Entregáveis adicionais:**
- `docs/SPEC-player-notes-visibility.md` — migração de BD + UI + RLS

---

### ONDA 5 — Combate × Campanha 🗡️

**Objetivo:** Zero fricção pra iniciar combate com jogadores já logados na campanha.
**Impacto em retenção:** Médio — remove uma das piores fricções reportadas.
**Duração estimada:** 1 sprint.

| Feature | Feedback | Gap de spec |
|---|---|---|
| **Convite automático pro combate** (push/toast pra jogadores logados) | F19 | ⚠️ **Spec de canal Realtime + payload + UI** — gap #6 |

**Entregáveis adicionais:**
- `docs/SPEC-auto-invite-combat.md` — canal, payload, UI (toast/banner), resiliência

**Nota de segurança:** Feature é **Auth-only** (Combat Parity Rule). Guest/anon não recebem.

---

### ONDA 6 — Polish & Backlog 🎨

**Objetivo:** P2/P3 do beta test que não são blockers de launch.
**Duração estimada:** ongoing.

| Feature | Feedback |
|---|---|
| Tudo selecionável (compêndio completo) | F05 |
| Botão salvar + popup maior (editor) | F06 |
| "Iniciativa" ao invés de "Mod Iniciativa" | F09 |
| Mapa de conexões visual (pós Entity Graph) | F21 |
| Notas e pastas separadas | F25 |
| Notas como pesquisa de artefatos | F27 |
| Board de locais como quadrado arredondado | F14 |
| Validar UX de hierarquia de locais | F18 (spike) |

---

## 4. Gaps de especificação identificados (o que FALTA antes de executar)

> Cada gap vira um pré-trabalho (spec/spike/PRD) antes da onda correspondente.

| # | Gap | Onda | Tipo de entregável | Dono sugerido |
|---|---|---|---|---|
| #1 | Métricas de retenção não instrumentadas | Transversal | Definição + implementação analytics | PM + Dev |
| #2 | PRD do Entity Graph | 3 | PRD | PM + Architect |
| #3 | UX spec do Campaign Dashboard informativo | 2 | Wireframe + spec | UX |
| #4 | UX spec do Menu à esquerda | 2 | Mockup + spec de fluxos | UX |
| #5 | Spike técnico B04 (Campaign 5-8s) | 1 | Investigação de causa raiz | Dev + Architect |
| #6 | Spec convite automático pro combate | 5 | Spec Realtime + UI | Architect + UX |
| #7 | Spec notas mestre↔jogador com visibilidade | 4 | Migração BD + RLS + UI | Architect + UX |
| #8 | Lista exaustiva de cards decorativos hoje | 1 | Auditoria + spec | Dev + UX |
| #8b | Lista de entidades editáveis e campos pós-criação | 1 | Spec CRUD | Dev + UX |
| #9 | Plano de release (PR strategy, feature flag, canary) | Transversal | Plano | PM + Dev |
| #10 | Critério de "pronto pra launch" | Transversal | Definido aqui (§2.3) — valid. com PM | PM |
| #11 | Fluxo de 1-clique a fichas do jogador na campanha | 2 | Spec UX | UX |

---

## 5. Plano de release (proposta)

> **GAP #9:** projeto não tem plano de release documentado. Proposta abaixo — precisa validação.

1. **1 PR por onda.** Cada onda é mergeada quando completa + smoke test. Evita PRs gigantes.
2. **Ondas 0, 1, 2 = pré-launch.** Mergeadas em master progressivamente. Sem feature flag (é foundation).
3. **Ondas 3+ = pós-launch.** Podem usar feature flag se afetarem usuários existentes (ex: Entity Graph pode estar atrás de flag `entity_graph_enabled` por campanha, pra testar com beta testers antes de GA).
4. **Canary:** Cada onda vai primeiro para preview deploy da Vercel + smoke test com DM beta tester (Dani_ roda pessoalmente). Só depois merge pra master.
5. **Rollback:** Revert do PR da onda. Combate NUNCA pode quebrar (Combat Parity Rule). Se quebrar, rollback imediato.

---

## 6. Dependências críticas (ordem não-negociável)

```
Onda 0 (Linguagem Ubíqua + bugs)
   ↓ (bloqueia 1)
Onda 1 (Show-stoppers + B04)
   ↓ (bloqueia launch + 2)
Onda 2 (Core Experience)
   ↓ (bloqueia launch)
[🚀 LAUNCH]
   ↓
Onda 3 (Entity Graph) ←─┐
   ↓                    │ (paralelizável com 3)
Onda 4 (Player HQ)  ────┘
   ↓
Onda 5 (Combate × Campanha)
   ↓
Onda 6 (Polish)
```

**Por que a Onda 3 bloqueia a Onda 4 (parcialmente):** as notas linkadas (F24/F26) dependem do modelo de dados do Entity Graph. Se Player HQ for primeiro, notas mestre↔jogador (F01/F02) fica no escopo limitado (sem linkagem a entidades).

**Regra:** Ondas 3 e 4 podem executar em paralelo com branches separadas, mas merge da Onda 4 com feature de notas depende de decisão: usa modelo antigo (sem link) ou espera Entity Graph (com link)?

---

## 7. Próximas ações (curto prazo)

### Passo 1 — AGORA
Executar Onda 0 (Linguagem Ubíqua + bugs) usando `docs/PROMPT-execucao-linguagem-ubiqua.md`. **Independente deste roadmap** — já está pronto, só executar.

### Passo 2 — Pré-Onda 1
Produzir em paralelo à Onda 0:
- **Spike B04** (gap #5) — investigação da causa raiz de Campaign 5-8s
- **Auditoria de cards decorativos** (gap #8) — lista completa + proposta
- **Spec CRUD pós-criação** (gap #8b) — quais entidades, quais campos

### Passo 3 — Pré-Onda 2
Produzir durante a Onda 1:
- **Wireframe Dashboard informativo** (gap #3)
- **Mockup Menu à esquerda** (gap #4)

### Passo 4 — Pré-Onda 3
Iniciar imediatamente após launch:
- **PRD Entity Graph** (gap #2) — maior doc do projeto depois deste

---

## 8. Regras imutáveis (CLAUDE.md)

Todas as ondas DEVEM respeitar:

1. **Combat Parity Rule** — Guest/Anônimo/Autenticado.
2. **Resilient Reconnection Rule** — Zero-drop de jogador.
3. **SRD Compliance** — Nada não-SRD em páginas públicas (relevante para Ondas 3 e 4).
4. **SEO Canonical Decisions** — Não mudar rotas públicas sem atualizar canônicos (relevante se Onda 3 criar rotas novas).
5. **RTK** — Prefixar comandos (`rtk tsc`, `rtk vitest`, etc.).

---

## 9. Log de decisões deste roadmap

| Data | Decisão | Origem |
|---|---|---|
| 2026-04-19 | Linguagem Ubíqua tratada como dívida técnica (não launch) | Party Mode (Dani_) |
| 2026-04-19 | Alvo estratégico: retenção + launch de nova frente | Party Mode (Dani_) |
| 2026-04-19 | Onda 1 + 2 = critério de launch | Party Mode (John, Winston) |
| 2026-04-19 | Entity Graph requer PRD antes da implementação | Party Mode (Winston) |
| 2026-04-19 | 10 gaps identificados bloqueiam execução sem pre-work | Party Mode (completo) |
