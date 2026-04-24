# MVP Cut — Campaign + Player Redesign (Grimório)

**Projeto formal:** Campaign + Player Redesign
**Codinome:** Grimório
**Slug técnico:** `hq-redesign` (branches: `feat/hq-redesign-<epic>-<slug>`)
**Feature flag:** `NEXT_PUBLIC_PLAYER_HQ_V2`
**Data da decisão:** 2026-04-24
**Decisor:** Dani Roscoe
**Referência:** [PRD-EPICO-CONSOLIDADO.md §2](PRD-EPICO-CONSOLIDADO.md)
**Handoff ativo:** [SESSION-HANDOFF-2026-04-24.md](SESSION-HANDOFF-2026-04-24.md)
**Status:** ✅ Aprovado · 🟢 Sprint 1 GO

---

## 🎯 TL;DR

MVP agressivo com **19 decisões 🟢**. Todas as 3 features identidade do produto (Modo Combate Auto completo, Mini-wiki do Jogador, Wizard de Level Up) entram no MVP. Desktop + Mobile são par desde o MVP.

---

## 📊 Cap de escopo

| Bucket | Decisões | Contagem |
|---|---|---|
| 🟢 **MVP** | Entra na primeira release | **19** |
| 🟡 **v1.5** | 2ª release (2-4 semanas pós-MVP) | **6** |
| 🔵 **v2.0+** | Roadmap futuro | **3** |
| 🎭 **Meta / já implementadas** | Fora do cut (regras, vocabulário, Campaign HQ) | **17** |
| **Total rastreado** | | **45** (47 originais menos renumerações 42 e 47 duplicadas) |

---

## 🟢 MVP — 19 decisões · agrupado por cluster

### Cluster 1 — Fundação visual · alimenta Fase A
| # | Decisão |
|---|---|
| 27 | Densidade app-wide (tokens space-2/space-3) |
| 28 | 4 sub-tabs (Herói · Arsenal · Diário · Mapa) |
| 29 | Label "Herói" |
| 34 | Default tab = Herói |
| **35** | **Desktop + Mobile ambos MVP em todas as 4 tabs** (UPDATED 2026-04-24) |

### Cluster 2 — Herói + Ribbon Vivo · alimenta Fase A/B
| # | Decisão |
|---|---|
| 30 | Density budget ≥15 elementos above-the-fold |
| 31 | Ribbon Vivo sticky em todos os 4 tabs |
| 32 | Ability scores NUNCA em accordion |
| 37 | Dots permanente vs transitório |
| 38 | HP controls = Dano/Cura/Temp (reuso PlayerHpActions) |
| 39 | Ribbon Vivo 2 linhas |
| 44 | Ability chip = CHECK + SAVE (2 zonas) |

### Cluster 3 — Modo Combate Auto · alimenta Fase C
| # | Decisão |
|---|---|
| 33 | **Modo Combate Auto COMPLETO** (reorg Col A/B/C) |
| 45 | Concentração = azul sky #7DD3FC |
| 46 | Save destacado em gold em combate |
| 43 | Pós-combate → Herói |

### Cluster 4 — Diário + Mini-wiki · alimenta Fase D
| # | Decisão |
|---|---|
| 24 | Mini-wiki `player_notes` (migration + editor markdown) |
| 25 | Quests via entity graph existente (UI-only) |
| 17 | Jogador anônimo vê Journey light |

### Cluster 5 — Level Up · alimenta Fase E
| # | Decisão |
|---|---|
| 41 | Wizard Level Up (migration + broadcast + 6 passos) |

---

## 🟡 v1.5 — 6 decisões

| # | Decisão | Por quê não-MVP |
|---|---|---|
| 15 | 4 killer-features (backlinks, tags, permissões, handouts) | Backlinks/permissões/handouts são features próprias · tags simples também posterga (MVP lança só markdown puro) |
| 20 | Backlinks `@nome` + `[[nome]]` | Parser complexo |
| 19 | Tour dismissable | Nice-to-have |
| 40 | Biblioteca de Favoritos | 3ª migration (`player_favorites`) · adiada pra manter MVP em 2 migrations |
| 47 | Biblioteca (renumerada) | Dedup de #40 |

---

## 🔵 v2.0+ — 3 decisões

| # | Decisão | Por quê roadmap |
|---|---|---|
| 4 | Ctrl+K first-class | Feature app-wide, escopo separado |
| 11 | Ctrl+K primário / ⌘K alternativo | Subset #4 |
| 14 | SVG gold + emojis narrativos | Política · custo zero, aplica sem story |

---

## 🎭 Meta / já implementadas — 17 decisões · fora do cut

`#1, 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 16, 18, 21, 22, 23, 26, 36, 42` — regras de vocabulário, decisões de Campaign HQ já resolvidas, ou meta-decisões sem story atrelada.

---

## 📐 Implicações operacionais

| Métrica | Valor |
|---|---|
| Stories MVP | ~28-32 de 35 |
| Migrations no MVP | **2** (`player_notes` · `level_up_invitations`) |
| Migration na v1.5 | `player_favorites` (Biblioteca) |
| QA cost estimado | ~150-200h (E2E + unit) · cf. [15-e2e-matrix.md](15-e2e-matrix.md) |
| Parity Guest/Anon/Auth | Mandatório por CLAUDE.md Combat Parity Rule |
| Desktop + Mobile | Ambos MVP · sem fase "mobile depois" |

---

## 🔄 Atualização canônica — Decisão #35

**Texto antigo:** "Desktop-first para ficha; combate é bi-viável (desktop + mobile). Mobile mantém single-column (já funciona bem em 390px)."

**Texto novo (2026-04-24):** "Desktop + Mobile ambos MVP em todas as 4 tabs do journey. Mobile mantém single-column. Sem fase 'mobile depois' — cada story da Fase A-E precisa entregar as 2 viewports."

**Impacto:** acceptance criteria de toda story MVP inclui linha mobile. QA matrix precisa cobrir viewport 390px × desktop 1440px. Testes Playwright rodam em 2 viewports.

---

## ✅ Próximos passos (desbloqueados por este cut)

- **Atividade 2** — Matriz Aproveitar/Refatorar/Zero → classifica cada componente do [11-inventory-current-codebase.md](11-inventory-current-codebase.md) em REUSE/REFACTOR/ZERO considerando este cut · output: `12-reuse-matrix.md`
- **Atividade 4** — Épicos + Waves → agrupa as 19 🟢 decisões em 5-7 épicos paralelizáveis · output: `13-epics-waves.md`
- **Atividade 5** — Sprint planning → Sprint 1-3 com capacity estimada · output: `14-sprint-plan.md`
- **Atividade 7** — Implementation readiness check final · output: `16-readiness-check.md`

---

**Fim do MVP cut. Aprovado por Dani. Fonte de verdade pra Wave 2-3.**
