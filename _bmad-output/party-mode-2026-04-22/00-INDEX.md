# 📜 Pocket DM · Campaign HQ + Player HQ Redesign — Pacote de Spec

**Data consolidação:** 2026-04-23
**Owner:** Dani Roscoe
**Origem:** 2 sessões (2026-04-21 Campaign HQ + 2026-04-22 Player HQ deep dive) consolidadas em PRD único

---

## 🎯 Comece aqui

### 📜 [PRD-EPICO-CONSOLIDADO.md](./PRD-EPICO-CONSOLIDADO.md)

**Este é o documento mestre.** 36 decisões canônicas, manifesto, arquitetura, topologia, wireframes resumidos, plano de implementação em 4 fases, métricas, riscos. Um único ponto de verdade.

- **5 min:** §1 Manifesto + §2 36 decisões + §12 Métricas
- **30 min:** +§3 Vocabulário + §4 Arquitetura + §6 Topologia + §11 Plano
- **Implementando:** tudo + docs satélites abaixo

---

## 🗂️ Docs satélites (detalhe expandido por tópico)

### Jornada & topologia
| # | Doc | Para quem | O que tem |
|---|---|---|---|
| 1 | [01-player-journey.md](./01-player-journey.md) | PM, QA, UX | 12 fluxos step-by-step do Jogador com estados, falhas, referências código |
| 2 | [02-topologia-navegacao.md](./02-topologia-navegacao.md) | Dev, UX | 7→4 tabs, deep links, badges, Modo Combate Auto, atalhos |

### Wireframes
| # | Doc | Para quem | O que tem |
|---|---|---|---|
| 3 | [03-wireframe-heroi.md](./03-wireframe-heroi.md) | Designer, Dev | Herói desktop leitura + combate + mobile, zonas detalhadas |
| 4 | [04-wireframe-arsenal.md](./04-wireframe-arsenal.md) | Designer, Dev | Arsenal desktop + mobile (inventário + habilidades + attunement) |
| 5 | [05-wireframe-diario.md](./05-wireframe-diario.md) | Designer, Dev | Diário desktop + mobile (notas + quests + NPCs + recaps + mini-wiki) |
| 6 | [06-wireframe-mapa.md](./06-wireframe-mapa.md) | Designer, Dev | Ajustes mínimos no mind map existente |

### Engenharia
| # | Doc | Para quem | O que tem |
|---|---|---|---|
| 7 | [07-spec-funcional.md](./07-spec-funcional.md) | Dev, QA | Matriz estados × ações × erros × a11y por zona |
| 8 | [08-design-tokens-delta.md](./08-design-tokens-delta.md) | Dev | Delta dos tokens vs DESIGN-SYSTEM v1.0 (spacing/typography/grid) |
| 9 | [09-implementation-plan.md](./09-implementation-plan.md) | Dev, PM, Amelia | 22 stories em 4 fases, file paths, riscos, acceptance criteria |
| 10 | [10-mermaid-flows.md](./10-mermaid-flows.md) | Designer, Dev, QA | Diagramas de máquina de estado e fluxos pra transcrever em FigJam |

---

## 📂 Evidência

- [screenshots/](./screenshots/) — 10 PNGs de captura real de 2026-04-22 da ficha atual do Jogador (Capa Barsavi, Curse of Strahd)
  - `10-dashboard-desktop.png` — dashboard ponto de entrada
  - `20-26-*-desktop.png` — 7 tabs atuais (Mapa / Ficha / Recursos / Habilidades / Inventário / Notas / Quests)
  - `30-32-*-mobile.png` — mobile 390px (Ficha, Recursos, Inventário)
  - `03-try-combat-active-desktop.png` — combate densificado (referência viva)

---

## 🗺️ Leitura por papel

### 👤 Dev (Fase A primeiro)
1. PRD §1-2 (manifesto + decisões)
2. [09-implementation-plan.md](./09-implementation-plan.md) Fase A (5 stories quick wins)
3. [08-design-tokens-delta.md](./08-design-tokens-delta.md) (tokens a aplicar)
4. [07-spec-funcional.md](./07-spec-funcional.md) (estados de cada zona)

### 🎨 Designer (Figma)
1. PRD §1-3 (manifesto + decisões + vocabulário)
2. [03-wireframe-heroi.md](./03-wireframe-heroi.md)
3. [04-wireframe-arsenal.md](./04-wireframe-arsenal.md) + [05](./05-wireframe-diario.md) + [06](./06-wireframe-mapa.md)
4. [DESIGN-SYSTEM.md v1.0](../qa/evidence/campaign-audit-2026-04-21/DESIGN-SYSTEM.md) (base Grimório)
5. [screenshots/](./screenshots/) (antes/depois)

### 📋 PM / Product
1. PRD §1 (visão) + §2 (decisões) + §12 (métricas) + §13 (riscos)
2. [01-player-journey.md](./01-player-journey.md) (12 fluxos = UX moats)
3. [09-implementation-plan.md §11.1-11.4](./09-implementation-plan.md) (cronograma)

### 🧪 QA
1. [07-spec-funcional.md](./07-spec-funcional.md) (matriz a testar)
2. [01-player-journey.md](./01-player-journey.md) (cenários E2E)
3. [10-mermaid-flows.md](./10-mermaid-flows.md) (máquinas de estado)
4. PRD §A4 (checklist pré-merge)

### 🏗️ Winston (schema)
1. PRD §10 (schema + backend)
2. [schema-investigation-winston.md v2](../architecture/schema-investigation-winston.md) (1 migration nova + 8 perguntas)

---

## 🔒 Regras imutáveis (nunca violar sem review)

- **"Mestre", nunca "DM"** — UI, docs, commits, PRs, chat, código explicativo.
- **HP tier labels EN** — FULL/LIGHT/MODERATE/HEAVY/CRITICAL nos 2 locales. Source: `lib/utils/hp-status.ts`.
- **Mode stateless** — nunca localStorage; sempre derivado do server.
- **Quest preservado em inglês** — nunca traduz pra "Missão".
- **Combat Parity Rule** — qualquer feature de combate deve cobrir Guest/Anônimo/Autenticado.
- **Resilient Reconnection** — zero-drop perceptível; skeletons em vez de tela branca.
- **SVG gold em sistema; emojis só em decoração narrativa.**
- **Hex inline proibido** — sempre token Tailwind/CSS var.

---

## 🚀 Pronto pra começar?

1. Leia o [PRD](./PRD-EPICO-CONSOLIDADO.md) §1-2 (10 min)
2. Abra [09-implementation-plan.md](./09-implementation-plan.md) Fase A
3. Primeira PR deve sair em 1 dia com os Quick Wins (A1-A5)
