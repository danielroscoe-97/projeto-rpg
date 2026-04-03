---
title: 'Lair Actions & Regional Effects para Monster Stat Blocks'
slug: 'lair-actions-regional-effects'
created: '2026-04-03'
status: 'in-progress'
stepsCompleted: [1]
tech_stack: ['next.js', 'typescript', 'supabase', 'tailwind']
files_to_modify:
  - 'lib/srd/srd-loader.ts'
  - 'components/public/PublicMonsterStatBlock.tsx'
  - 'components/oracle/MonsterStatBlock.tsx'
  - 'public/srd/monsters-2014.json'
  - 'public/srd/monsters-2024.json'
  - 'scripts/fetch-srd-data.ts'
  - 'messages/pt-BR.json'
  - 'messages/en.json'
code_patterns:
  - 'legendary_actions rendering pattern in PublicMonsterStatBlock.tsx'
  - 'DiceText + LinkedText for clickable conditions/spells'
  - 'MonsterAction interface for JSONB arrays'
test_patterns: []
---

# Tech-Spec: Lair Actions & Regional Effects para Monster Stat Blocks

**Created:** 2026-04-03

## Overview

### Problem Statement

Monstros do D&D 5e que possuem Lair Actions e Regional Effects (ex: Adult Blue Dragon, Adult Black Dragon, Beholder, Lich, etc.) não exibem essas informações no PocketDM. Esses dados não existem em nenhuma camada do sistema: nem no schema do DB, nem nos JSONs, nem nos tipos TypeScript, nem nos componentes de renderização. Isso é um gap significativo para DMs que precisam dessas informações durante combate em lairs.

### Solution

Adicionar suporte completo a 3 novos tipos de seção nos stat blocks de monstros:
1. **Lair Actions** — ações no initiative count 20
2. **Additional Lair Actions** (2024 SRD variant) — variante expandida
3. **Regional Effects** — efeitos passivos na região do lair

Dados serão curados manualmente em JSON (a 5e-database upstream NÃO contém lair data — não faz parte do SRD). Renderização segue o mesmo padrão de legendary_actions, com seções separadas e read-only no combat view.

### Scope

**In Scope:**
- Novos campos no TypeScript interface `SrdMonster`
- Curadoria de dados de lair actions/regional effects para monstros SRD que os possuem
- Renderização em PublicMonsterStatBlock (compendium/público)
- Renderização em MonsterStatBlock (oracle/combat) — read-only
- Suporte i18n (pt-BR + en) para labels das seções
- Migração Supabase para colunas JSONB

**Out of Scope:**
- Interação de "usar lair action" no combat (future feature)
- Lair actions para monstros MAD (não possuem)
- Clickable conditions (JÁ EXISTE via LinkedText/DiceText)

**Implemented (moved from Out of Scope):**
- ~~Automação de initiative count 20 para lair actions~~ — implementado em `438e796` + fixes (auto-add entry, tiebreak, cleanup, persistence, i18n). Ver `docs/lair-actions-feature.md` seção "Lair Actions no Combate".

## Context for Development

### Codebase Patterns

1. **Rendering pattern**: Seções de stat block seguem padrão consistente:
   - Check condicional: `monster.field?.length > 0`
   - `<hr className="card-divider" />` ou `<CardDivider />`
   - Header `<h2>` (público) ou `<h4>` (oracle) com styling
   - Map de items com `<strong>` name + DiceText/renderDesc desc

2. **LinkedText auto-linking**: Texto de descrição já passa por LinkedText que auto-detecta condições (prone, blinded, etc.) e renderiza como botões clicáveis com tooltip/floating card.

3. **Stat block parser**: `lib/parser/stat-block-parser.ts` já reconhece "Lair Actions" e "Regional Effects" como section headers (linhas 71-72).

4. **i18n**: Labels ficam em `messages/{locale}.json` com namespace pattern.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `components/public/PublicMonsterStatBlock.tsx:376-397` | Pattern de legendary_actions (público) |
| `components/oracle/MonsterStatBlock.tsx:397-413` | Pattern de legendary_actions (oracle/combat) |
| `lib/srd/srd-loader.ts:9-54` | Interface SrdMonster + MonsterAction |
| `scripts/fetch-srd-data.ts:202-261` | transformMonster() |
| `lib/parser/stat-block-parser.ts:71-72` | Parser já reconhece lair sections |
| `public/srd/monsters-2014.json` | Bundle SRD 2014 |
| `public/srd/monsters-2024.json` | Bundle SRD 2024 |

### Technical Decisions

1. **Dados curados manualmente** — 5e-database não tem lair data (não é SRD). Criar arquivo JSON de curadoria separado que é merged no build dos bundles.
2. **3 campos separados** — `lair_actions`, `additional_lair_actions`, `regional_effects` como arrays de `MonsterAction[]`
3. **Preamble text** — Cada seção pode ter um texto introdutório (ex: "On initiative count 20..."). Armazenar como campo `_text` separado ou como primeiro item do array.
4. **Read-only no combat** — Sem interação, apenas display informativo para o DM.
5. **Seções separadas no stat block** — Cada tipo renderiza em sua própria seção com header distinto.

## Implementation Plan

### Tasks

_A ser detalhado no Step 2 (Deep Investigation)_

### Acceptance Criteria

_A ser detalhado no Step 3 (Generate)_

## Additional Context

### Dependencies

- Nenhuma nova lib necessária
- Reusa LinkedText/DiceText existentes
- Reusa MonsterAction interface existente

### Testing Strategy

- Visual: verificar renderização no stat block público e oracle
- Data: verificar que monstros com lair actions (Adult Blue Dragon, Beholder, etc.) exibem dados corretos
- Parity: verificar que lair actions aparecem tanto no compendium quanto no combat

### Notes

- O parser de stat blocks (`stat-block-parser.ts`) já reconhece "Lair Actions" e "Regional Effects" — isso facilita futura importação via paste
- Monstros MAD não possuem lair actions — não precisam ser atualizados
- Clickable conditions já funcionam via LinkedText — nenhum trabalho adicional necessário
