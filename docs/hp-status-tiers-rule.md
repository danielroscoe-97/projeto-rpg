# Regra de Negócio: HP Status Tiers

> **Status:** IMUTÁVEL — esta regra NÃO deve ser alterada.

## Nomenclatura

Todas as barras de HP no combate (logado e deslogado, DM e jogador) DEVEM usar exclusivamente os seguintes tiers:

| Tier       | Faixa de HP  | Cor da Barra          | Cor do Badge        |
| ---------- | ------------ | --------------------- | ------------------- |
| **LIGHT**    | > 70%        | Verde (`bg-green-500`) | `text-green-400`    |
| **MODERATE** | 40% – 70%   | Amarelo (`bg-amber-400`) | `text-amber-400`  |
| **HEAVY**    | 10% – 40%   | Vermelho (`bg-red-500`) | `text-red-500`     |
| **CRITICAL** | ≤ 10%        | Vermelho escuro (`bg-red-900`) | `text-red-300` + caveira |

## Thresholds

- Cada tier cobre ~30% do HP, exceto CRITICAL que cobre os últimos 10%.
- O cálculo é: `pct = current_hp / max_hp`
  - `pct > 0.7` → LIGHT
  - `pct > 0.4` → MODERATE
  - `pct > 0.1` → HEAVY
  - `pct ≤ 0.1` → CRITICAL

## Nomenclatura nas labels

- As labels devem ser exibidas em inglês: **LIGHT**, **MODERATE**, **HEAVY**, **CRITICAL**
- Isso vale para TODAS as telas, tanto em PT-BR quanto em EN

## Superfícies afetadas

- **CombatantRow** (DM view / combate logado) — barra de HP + label de threshold
- **PlayerInitiativeBoard** (player view / combate deslogado) — barra de HP + HP status badge para monstros
- **Server-side** (`lib/utils/hp-status.ts`) — cálculo centralizado do tier

## Arquivo fonte centralizado

`lib/utils/hp-status.ts` — contém `getHpStatus()`, `getHpBarColor()`, `getHpThresholdKey()`

## Data de criação

2026-03-27
