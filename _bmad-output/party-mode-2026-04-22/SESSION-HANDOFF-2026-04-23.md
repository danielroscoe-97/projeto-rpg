# 🎭 Session Handoff — Player HQ Deep Dive (2026-04-22 → 2026-04-23)

**Data:** sessão estendida 2026-04-22 → 2026-04-23
**Owner:** Dani Roscoe (`danielroscoe97@gmail.com`)
**Projeto:** Pocket DM — Player HQ Redesign (continuação da sessão Campaign HQ de 2026-04-21)
**Status:** ✅ Spec consolidada · ⏳ Falta camada de delivery (épicos/sprints/waves) · 🛑 Não codar ainda
**Total produzido:** ~13 docs em `_bmad-output/party-mode-2026-04-22/` + 14 screenshots de evidência

---

## 🎯 TL;DR pra continuar em outra janela

A sessão de **2026-04-21** resolveu Campaign HQ (Mestre) com 26 decisões + 4 modes canônicos (`prep`/`run`/`recap`/`journey`). A sessão de **2026-04-22→23** mergulhou no `journey` mode (Player HQ) e resolveu:

- **Topologia interna** do journey: 4 sub-tabs (Herói · Arsenal · Diário · Mapa) substituem as 7 antigas
- **Densidade** app-wide: tokens novos (space-2/space-3 padrão), tudo elegante mas denso
- **Ribbon Vivo** sticky de 2 linhas em todas as 4 tabs (Row 1 core stats + HP actions semânticos · Row 2 condições + efeitos + slots clicáveis)
- **Ability chips** com 2 zonas clicáveis: CHECK (escuro, neutro) + SAVE (gold-soft, gold se prof, com 🛡 + dot)
- **Modo Combate Auto** quando `campaigns.combat_active=true` — destaca, não força tab switch
- **Wizard de Level Up** disparado pelo Mestre, broadcast pro Jogador, 6 passos
- **Mini-wiki Biblioteca** sub-aba do Diário com favoritos do compêndio (Ctrl+K + botão ⭐)
- **Pós-combate** sempre redireciona pro Herói (auth) ou prompt de login (anon)
- **Mobile** específico do Herói com ribbon compacto + chip resumo de slots + FAB nota rápida

11 decisões novas (#37-47) gravadas no PRD. 3 migrations propostas. 35 stories em 5 fases (A-E).

**Spec está pronta. Delivery layer (épicos/waves/sprints) ainda não. Não começar a codar até fazer 7 atividades de gap closing.**

---

## 📂 Inventário completo dos arquivos desta sessão

Pasta: **`_bmad-output/party-mode-2026-04-22/`**

| # | Arquivo | KB | O quê |
|---|---|---|---|
| 0 | `SESSION-HANDOFF-2026-04-23.md` | este | Documento que você está lendo |
| 0a | `00-INDEX.md` | ~5 | Mapa de leitura por papel |
| **★** | **`PRD-EPICO-CONSOLIDADO.md`** | **~40** | **Source-of-truth · 47 decisões + manifesto + arquitetura + métricas** |
| 1 | `01-player-journey.md` | ~25 | 13 fluxos do Jogador passo-a-passo |
| 2 | `02-topologia-navegacao.md` | ~15 | 7→4 tabs · deep links · badges · Modo Combate Auto |
| 3 | `03-wireframe-heroi.md` | ~25 | Herói desktop leitura/combate/mobile |
| 4 | `04-wireframe-arsenal.md` | ~12 | Arsenal desktop+mobile |
| 5 | `05-wireframe-diario.md` | ~15 | Diário com 7 sub-abas (incluindo Biblioteca) |
| 6 | `06-wireframe-mapa.md` | ~6 | Mapa (mudanças mínimas) |
| 7 | `07-spec-funcional.md` | ~20 | Estados × ações × erros × a11y |
| 8 | `08-design-tokens-delta.md` | ~10 | Spacing/typography/grid novos |
| 9 | `09-implementation-plan.md` | ~22 | 35 stories em 5 fases (A-E) |
| 10 | `10-mermaid-flows.md` | ~12 | 12 diagramas Mermaid |
| ★ | **`player-hq-journey-map.html`** | ~80 | **Visual interativo único · 13 fluxos + wireframes · abrir no browser** |
| evidence | `screenshots/` | — | 14 PNGs reais da ficha Capa Barsavi (Curse of Strahd) |

**Total:** ~290 KB de documentação + screenshots.

---

## 🔒 Decisões canônicas NOVAS (#37-47) — 2026-04-22/23

Todas vivem em `PRD-EPICO-CONSOLIDADO.md §2`. As 26 anteriores (#1-26) seguem do handoff de 2026-04-21. Decisões #27-36 foram travadas no início desta sessão.

### Resumo executivo das 21 decisões da sessão (#27-47)

| # | Decisão | Implicação |
|---|---|---|
| 27 | Densidade app-wide é regra imutável | Tokens space-2/space-3 padrão, ≥92% largura útil em desktop 1440px |
| 28 | 4 sub-tabs internas do journey: Herói/Arsenal/Diário/Mapa | Substitui 7 tabs antigas |
| 29 | Label "Herói" (rejeitado "Cockpit") | Decisão Dani 2026-04-22 |
| 30 | ≥15 elementos úteis above-the-fold em desktop | Supera budget genérico de ≤8 |
| 31 | Ribbon Vivo sticky em todos os 4 tabs | Componente central novo |
| 32 | Ability scores nunca escondidos em accordion | Sempre visíveis em chips |
| 33 | Modo Combate Auto destaca, não força tab switch | Banner + badge + reorganiza Col B |
| 34 | Default tab = Herói (era Mapa) | localStorage 24h TTL |
| 35 | Desktop-first ficha · combate bi-viável | Mobile mantém single-col |
| 36 | "Diário" já existia no glossário · novos: Herói/Arsenal/Ribbon Vivo/Modo Combate Auto/Biblioteca | Vocabulário ubíquo expandido |
| 37 | Distinção canônica de dots: permanente vs transitório | Save/skill ● = TENHO · Slot/feature ● = USADO |
| 38 | HP controls = botões semânticos Dano/Cura/Temp | Reusa `PlayerHpActions.tsx` existente |
| 39 | Ribbon Vivo tem 2 linhas (core stats + estados temporais) | Slots clicáveis 16px visual + 44px touch |
| 40 | Biblioteca de Favoritos | Sub-aba 7 do Diário + Ctrl+K + botão ⭐ |
| 41 | Wizard de Level Up — Mestre libera, Jogador roda | 6 passos guiados + audit trail |
| 42 | (renumerada — ver PRD) | — |
| 43 | Pós-combate sempre leva pro Herói | Anon: prompt login · Auth: redirect direto |
| 44 | Ability chip = 2 zonas clicáveis (CHECK + SAVE) | Cada uma é botão de roll independente |
| 45 | Cor de "concentração" = azul claro sky #7DD3FC | Diferenciado de warning |
| 46 | Save em modo combate é IGUAL ou MAIS importante | Card destacado em gold em combate |
| 47 | (Biblioteca renumerada — ver PRD §2) | — |

### Regras absolutas reforçadas (do handoff anterior)

- **"Mestre", nunca "DM"** — UI/docs/commits/PRs (memory `feedback_mestre_nao_dm.md`)
- **HP tier labels EN** nos 2 locales: FULL/LIGHT/MODERATE/HEAVY/CRITICAL (memory `feedback_hp_tier_labels.md`)
- **Quest** preservado em inglês
- **Mode stateless** derivado do server (nunca localStorage pra mode)
- **Combat Parity** Guest/Anônimo/Autenticado em toda feature de combate
- **Resilient Reconnection** zero-drop perceptível

---

## 🆕 Schema novo (3 migrations totais)

Detalhe completo em `PRD-EPICO-CONSOLIDADO.md §10`. Resumo:

1. **`player_notes`** (decisão #24 de 2026-04-21, mantida) — mini-wiki markdown do jogador
2. **`player_favorites`** (decisão #40) — favoritos polimórficos do compêndio (magia, monstro, item, feat, NPC)
3. **`level_up_invitations`** (decisão #41) — convites de level up disparados pelo Mestre com audit trail

Todas dual-auth (`user_id` XOR `session_token_id`) seguindo padrão da migration 069.

**Pendente:** Winston revisar e responder 8 perguntas (`schema-investigation-winston.md` v2 do handoff anterior).

---

## ✅ O que TEMOS pronto (spec layer)

- 47 decisões canônicas
- 13 fluxos passo-a-passo
- Wireframes desktop + mobile pra todas as 4 tabs
- Spec funcional (estados/ações/erros/a11y)
- Plano de implementação com 35 stories
- 3 migrations definidas
- Visual HTML interativo
- Evidência real (screenshots da ficha Capa Barsavi)

## ⏳ O que FALTA (delivery layer)

Antes de codar, é crítico fechar 6 gaps identificados:

| # | Gap | Por quê é crítico |
|---|---|---|
| G1 | **Spike de inventário** do código atual do Player HQ | 40+ componentes existentes — sem mapa, dev abre cada arquivo no escuro |
| G2 | **Matriz Aproveitar/Refatorar/Zero** por componente | Garantir que ninguém reescreva `PlayerHpActions` (que já é perfeito) ou ignore `RecapCtaCard` |
| G3 | **MVP cut** das 47 decisões | Hoje todas viraram MVP por default — irrealista pra primeira release |
| G4 | **Épicos → Waves → Sprints** | Hoje temos "Fases A-E" sequencial · falta agrupamento por domínio + paralelização |
| G5 | **Estimativa de capacity** | Quem vai fazer? quantos devs? velocidade? |
| G6 | **Matriz E2E consolidada** | Mínimo de testes Playwright pré-merge por wave |

---

## 🛣️ PLANO PRÓXIMA ETAPA — 7 atividades pra fechar gap

| # | Atividade | Quem (BMAD agent / skill) | Tempo | Output | Bloqueia? |
|---|---|---|---|---|---|
| 1 | **Spike inventário** do Player HQ | Agent Explore (paralelo, very thorough) | 2-3h | `11-inventory-current-codebase.md` — todos componentes mapeados | Sim, bloqueia 2,4 |
| 2 | **Matriz reuso** (aproveitar/refatorar/zero) | Agent general-purpose (após #1) | 1-2h | `12-reuse-matrix.md` | Sim, bloqueia 4,5 |
| 3 | **MVP cut** das 47 decisões | **Dani decide** + bmad-pm | 30min | Marcar 🟢🟡🔵 no PRD §2 | Sim, bloqueia 4 |
| 4 | **Épicos + Waves** | bmad-create-epics-and-stories | 1-2h | `13-epics-waves.md` — 6-8 épicos com waves paralelizáveis | Sim, bloqueia 5 |
| 5 | **Sprint planning** Sprint 1-3 | bmad-sprint-planning | 1h | `14-sprint-plan.md` | — |
| 6 | **Matriz E2E** consolidada | bmad-qa | 1-2h | `15-e2e-matrix.md` | — |
| 7 | **Implementation readiness check** final | bmad-check-implementation-readiness | 30min | `16-readiness-check.md` | — |

**Tempo total:** 1 dia útil (8h) com agentes paralelos, 2 dias se sequencial.

**Paralelização sugerida:**
- **Wave 1 paralela:** atividades 1, 6 (independentes)
- **Wave 2 paralela:** atividade 2 (após 1) + atividade 3 (Dani decide)
- **Wave 3 sequencial:** 4 → 5 → 7

---

## ❓ Perguntas abertas pra Dani decidir

| # | Pergunta | Quem decide | Bloqueia |
|---|---|---|---|
| Q1 | Quem implementa? Solo Dani · agentes Claude paralelos · time externo? | Dani | Atividade 5 (sprint planning) |
| Q2 | Capacity estimada (dias/semana) | Dani | Atividade 5 |
| Q3 | MVP cut: das 47 decisões, quais NÃO entram na primeira release? | Dani + bmad-pm | Atividade 3 |
| Q4 | Aceita as 5 fases A-E como base ou quer reorganizar em épicos por domínio (ex: "Densificação", "Ribbon", "Wiki", "Wizard", "Cross-platform") antes de sprints? | Dani | Atividade 4 |
| Q5 | Prioridade temporal — Combate Auto antes de Wiki ou inverso? | Dani + bmad-pm | Atividade 5 |
| Q6 | Winston schema review — quem dispara? | Dani | Bloqueia Fase D/E |
| Q7 | Re-autorização Figma plugin pra hi-fi — quando? | Dani | Bloqueia transcrição visual |

Perguntas técnicas pendentes pro Winston (do handoff anterior, ainda válidas):
- Q-WIN-1 a Q-WIN-8 em `_bmad-output/architecture/schema-investigation-winston.md`

---

## 🎁 BÔNUS — referências cruzadas

### Docs do handoff anterior (2026-04-21) ainda relevantes
- `_bmad-output/qa/evidence/campaign-audit-2026-04-21/SESSION-HANDOFF-2026-04-21.md` — handoff Campaign HQ
- `_bmad-output/qa/evidence/campaign-audit-2026-04-21/redesign-proposal.md` — v0.3 Campaign HQ (decisões #1-26)
- `_bmad-output/qa/evidence/campaign-audit-2026-04-21/DESIGN-SYSTEM.md` — alma do Grimório (reusado 90%)
- `_bmad-output/qa/evidence/campaign-audit-2026-04-21/01-design-tokens.md` — tokens atômicos
- `_bmad-output/architecture/schema-investigation-winston.md` — schema v2

### Componentes existentes a reusar (descobertas durante esta sessão)
- [components/player/PlayerHpActions.tsx](../../components/player/PlayerHpActions.tsx) — botões Dano/Cura/Temp prontos
- [components/conversion/RecapCtaCard.tsx](../../components/conversion/RecapCtaCard.tsx) — pós-combate prompt
- [components/conversion/GuestRecapFlow.tsx](../../components/conversion/GuestRecapFlow.tsx) — fluxo guest
- [components/combat/CombatantRow.tsx:516-520](../../components/combat/CombatantRow.tsx#L516) — reaction dot (padrão transitório canônico)
- [components/player-hq/SpellSlotsHq.tsx](../../components/player-hq/SpellSlotsHq.tsx) — precisa refactor pra inverter dots
- [components/player-hq/ResourceDots.tsx:65](../../components/player-hq/ResourceDots.tsx#L65) — precisa refactor
- [components/player-hq/PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) — refactor topologia 7→4

### Memórias persistentes atualizadas nesta sessão
- `feedback_densidade_visual.md` (nova · 2026-04-22)
- Pendente criar: `feedback_dots_pattern.md`, `feedback_heroi_arsenal_diario.md`, `feedback_concentration_color.md`

### Comandos úteis pra retomar
```bash
# Abrir o HTML interativo
open "_bmad-output/party-mode-2026-04-22/player-hq-journey-map.html"

# Ler o PRD principal
code "_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md"

# Ver todas decisões canônicas
grep -n "^[0-9]\+\. ✅" "_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md"

# Ver stories da implementação
grep -n "^### [A-E][0-9]" "_bmad-output/party-mode-2026-04-22/09-implementation-plan.md"
```

---

## 🎭 Créditos da sessão

**Party mode com:**
- Sally (UX Designer) — wireframes, topologia, ribbon vivo, ability chips
- Mary (Analyst) — moodboard de densidade (BG3, Linear, Notion, Foundry)
- Winston (Architect) — schema (3 migrations), modo combate auto, viabilidade técnica
- John (PM) — JTBDs, métricas, escopo, roadmap
- Amelia (Dev) — pronta pra Fase A após gap closing

**Decisor único:** Dani Roscoe

---

## 💬 PROMPT SUGERIDO PRA PRÓXIMA JANELA

Cole isso na próxima sessão (Claude Code, nova janela):

```
Retomando o redesign do Pocket DM Player HQ.

LEIA PRIMEIRO (na ordem):
1. _bmad-output/party-mode-2026-04-22/SESSION-HANDOFF-2026-04-23.md (este handoff)
2. _bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md (47 decisões)
3. _bmad-output/qa/evidence/campaign-audit-2026-04-21/SESSION-HANDOFF-2026-04-21.md (handoff Campaign HQ que precede este)

CONTEXTO-CHAVE (regras imutáveis):
- "Mestre", nunca "DM" — em UI/docs/commits/chat
- HP tier labels em inglês (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) nos 2 locales
- Quest preservado em inglês (nunca "Missão")
- Mode stateless (nunca localStorage pra mode)
- Combat Parity Rule (Guest/Anônimo/Autenticado em toda feature de combate)
- Dots: permanente ● = TENHO · transitório ● = USADO (decisão #37)
- Densidade visual app-wide é regra (decisão #27)

ESTADO ATUAL:
- Spec layer: ✅ 100% pronto (47 decisões, 35 stories em 5 fases, 3 migrations definidas)
- Delivery layer: ❌ Falta — 6 gaps identificados na §"O que FALTA" do handoff

PRÓXIMA ETAPA — executar 7 atividades de gap closing antes de codar:

Wave 1 (paralelo, dispara junto):
- Atividade 1: Spike inventário Player HQ → Agent Explore (very thorough), produz 11-inventory-current-codebase.md
- Atividade 6: Matriz E2E consolidada → bmad-qa, produz 15-e2e-matrix.md

Wave 2 (após Wave 1):
- Atividade 2: Matriz Aproveitar/Refatorar/Zero → Agent general-purpose, produz 12-reuse-matrix.md
- Atividade 3: MVP cut das 47 decisões → SESSÃO COM DANI (não pode automatizar)

Wave 3 (sequencial após Wave 2):
- Atividade 4: Épicos + Waves → bmad-create-epics-and-stories, produz 13-epics-waves.md
- Atividade 5: Sprint planning → bmad-sprint-planning, produz 14-sprint-plan.md
- Atividade 7: Implementation readiness check → bmad-check-implementation-readiness

DEPOIS de fechar os gaps, sprint 1 começa com Fase A (Quick Wins) já priorizada
no plan atual: A1-A6 (densificação + remoção accordion + 3-col perícias + header
2 linhas + HP controls inline + pós-combate redirect).

PRIMEIRO ME PERGUNTE:
"Aceita Wave 1 (atividades 1 e 6 em paralelo) agora? Ou prefere começar pelo
MVP cut (atividade 3) já que ele é bloqueante das atividades 4-5?"

Não comece a codar nada antes que MVP cut + matriz reuso estejam aprovados.
```

---

**Fim do handoff. Bom trabalho na próxima janela. 🎲**
