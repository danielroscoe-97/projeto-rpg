# Sprint Combat Parity — Pocket DM vs Shieldmaiden

**Data:** 2026-03-27
**Origem:** Análise competitiva Shieldmaiden + feedback do founder
**Objetivo:** Fechar o gap de automação de combate e superar em UX

---

## Princípios

1. **Automação que acelera a mesa** — menos math manual, mais narrativa
2. **Parse inteligente dos dados SRD** — actions já existem como texto, precisamos estruturar
3. **DM control always** — automação sugere, DM confirma
4. **Player view impressiona** — atmosfera visual diferencia na mesa

---

## Épico CP.1: Monster Action Engine (automação de combate)

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| CP.1.1 | Parse Monster Actions | [cp1-1-parse-monster-actions.md](cp1-1-parse-monster-actions.md) | 🔴 Blocker | G | — |
| CP.1.2 | Parse Resistances/Immunities | [cp1-2-parse-resistances.md](cp1-2-parse-resistances.md) | 🔴 Blocker | M | — |
| CP.1.3 | Monster Action Bar (DM) | [cp1-3-monster-action-bar.md](cp1-3-monster-action-bar.md) | 🔴 Crítico | G | CP.1.1 |
| CP.1.4 | Auto Damage with Types | [cp1-4-auto-damage-types.md](cp1-4-auto-damage-types.md) | 🔴 Crítico | G | CP.1.2, CP.1.3 |
| CP.1.5 | Half Damage on Save | [cp1-5-half-damage-save.md](cp1-5-half-damage-save.md) | 🟡 Alto | M | CP.1.4 |
| CP.1.6 | Advantage/Disadvantage UX Polish | [cp1-6-advantage-disadvantage-ux.md](cp1-6-advantage-disadvantage-ux.md) | 🟡 Alto | P | CP.1.3 |

| CP.1.7 | Multi-target AoE Damage | [cp1-7-multi-target-aoe.md](cp1-7-multi-target-aoe.md) | 🟡 Alto | M | CP.1.4 |

### Épico CP.2: Combat Intelligence

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| CP.2.1 | Combat Action Log | [cp2-1-combat-action-log.md](cp2-1-combat-action-log.md) | 🔴 Crítico | G | CP.1.3 |
| CP.2.2 | Concentration Tracking | [cp2-2-concentration-tracking.md](cp2-2-concentration-tracking.md) | 🟡 Alto | M | CP.2.1 |
| CP.2.3 | Save Prompts on Damage | [cp2-3-save-prompts.md](cp2-3-save-prompts.md) | 🟠 Médio | M | CP.1.4 |
| CP.2.4 | Damage Leaderboard | [cp2-4-damage-leaderboard.md](cp2-4-damage-leaderboard.md) | 🟡 Alto | M | CP.2.1 |
| CP.2.5 | Combat Undo (Enhanced) | [cp2-5-combat-undo.md](cp2-5-combat-undo.md) | 🟡 Alto | M | — |

### Épico CP.3: Player View Atmosphere

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| CP.3.1 | Background Images Player View | [cp3-1-background-images.md](cp3-1-background-images.md) | 🟡 Alto | M | — |
| CP.3.2 | Weather Effects Overlay | [cp3-2-weather-effects.md](cp3-2-weather-effects.md) | 🟡 Alto | M | CP.3.1 |

### Épico B.1 (extensão): Combat UX

| # | Story | Arquivo | Prioridade | Tamanho | Deps |
|---|---|---|---|---|---|
| B.1.8 | Hidden NPCs + Reveal | [b1-8-hidden-entity-reveal.md](b1-8-hidden-entity-reveal.md) | 🟡 Alto | M | — |

---

## Bucket Futuro (ready-for-dev — needs discussion)

| # | Story | Arquivo | Status | Razão do Adiamento |
|---|---|---|---|---|
| B.1.9 | Transform/Polymorph | [b1-9-transform-polymorph.md](b1-9-transform-polymorph.md) | ready-for-dev — NEEDS DISCUSSION | UX alto risco: dual HP, ~20% combates, workaround manual existe |
| B.3.6 | DM Screen | [b3-6-dm-screen.md](b3-6-dm-screen.md) | ready-for-dev — NEEDS DISCUSSION | Surface novo quando existentes instáveis, 80% coberto por compendium+combat |

---

## Resumo

**Total sprint ativo: 15 stories** (3G + 9M + 3P ≈ ~5-6 semanas de sprint)
**Bucket futuro: 2 stories** (especificadas, prontas quando time decidir)

### Ordem de execução

```
Fase 1 — Parse + Infra (paralelo, sem deps)
  CP.1.1 (parse actions) || CP.1.2 (parse resistances) || CP.3.1 (backgrounds)
  CP.2.5 (undo enhanced) || B.1.8 (hidden NPCs) — independentes

Fase 2 — Combat Core (depende dos parsers)
  CP.1.3 (action bar) → CP.1.4 (auto damage) → CP.1.5 (half damage)
  CP.1.6 (adv/dis UX) (paralelo com CP.1.4)
  CP.1.7 (multi-target AoE) (depende de CP.1.4)

Fase 3 — Intelligence + Atmosphere (depende do action bar)
  CP.2.1 (combat log) → CP.2.2 (concentration) || CP.2.3 (save prompts)
  CP.2.4 (damage leaderboard) (depende de CP.2.1)
  CP.3.2 (weather effects) (depende de CP.3.1)
```
