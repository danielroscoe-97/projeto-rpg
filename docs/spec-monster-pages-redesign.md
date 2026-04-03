# Spec: Public Pages Redesign — Monsters + Spells

**Date:** 2026-04-03  
**Status:** In Development  
**Domain:** https://www.pocketdm.com.br

## Overview

Redesign das paginas publicas de monstros e magias para melhor UX, SEO, e conversao. Adicionar i18n (PT-BR + EN) com slugs traduzidos.

## REGRA CRITICA: Consistencia de Idioma

**O idioma do titulo da aba (metadata.title) DEVE corresponder ao idioma do conteudo da pagina.**

- Pagina EN → title EN, headings EN, labels EN, content EN
- Pagina PT-BR → title PT-BR, headings PT-BR, labels PT-BR, content PT-BR
- Termos tecnicos de jogo (AC, HP, CR, spell names) podem permanecer em ingles em ambas versoes
- NUNCA misturar: titulo PT com corpo EN (bug atual)

## Pages Affected

| Page | Route EN | Route PT-BR |
|------|----------|-------------|
| Monster Index | `/monsters` | `/monstros` |
| Monster Detail | `/monsters/[slug]` | `/monstros/[slug]` |
| Spell Index | `/spells` | `/magias` |
| Spell Detail | `/spells/[slug]` | `/magias/[slug]` |

## Monster Detail Page — `/monsters/[slug]`

### Header/Nav
- Logo Pocket DM a esquerda
- Links: Monsters | Spells | Combat Tracker
- CTA "Criar Conta" no canto direito
- Breadcrumb: Pocket DM / Monsters / {monster.name}

### Collapsible Filter Bar
- Barra colapsavel "Search more monsters" / "Pesquisar mais monstros"
- Ao expandir: input de busca por nome, chips de CR range, chips de tipo de criatura
- SEM botao de importar pack completo (pagina publica)
- Ao selecionar monstro no filtro, navega para a pagina daquele monstro

### Stat Block
- **Monster Token** (imagem redonda) ao lado do nome no header da stat block
- Componente `MonsterToken` existente reutilizado
- **Dice Rollers** clicaveis em toda notacao de dado:
  - HP formula (ex: `19d12 + 95`)
  - Attack bonus (ex: `+14 to hit`)
  - Damage rolls (ex: `2d10 + 7`)
  - Saving throw DCs
- Usa `DiceText` e `ClickableRoll` existentes
- Resultado mostrado via toast (Sonner)

### Two-Box Layout (abaixo do stat block)
```
+---------------------------+  +---------------------------+
| About {Monster Name}      |  | What is Pocket DM?        |
|                           |  |                           |
| * Lore / ecology bullets  |  | Free D&D 5e combat tracker|
| * Combat tactics          |  | with real-time initiative, |
| * DM tips                 |  | HP tracking, and more.    |
| * Famous encounters       |  |                           |
|                           |  | [Try Combat Tracker]      |
|                           |  | [Create Free Account]     |
+---------------------------+  +---------------------------+
```

- Box "About" so aparece quando monstro tem lore preenchida
- Box "Pocket DM" sempre aparece

### Footer
- Attribution CC-BY-4.0
- Links para Pocket DM

## Monster Index Page — `/monsters`

### Header/Nav (mesmo do detail)

### Hero Section
- Titulo: "D&D 5e Monster Compendium" / "Compendio de Monstros D&D 5e"
- Subtitulo com contagem de monstros
- Visual mais impactante (gradients, icone de monstro)

### Filter Bar (always visible)
- Input de busca por nome (destaque)
- Chips de CR range: 0-1, 2-4, 5-8, 9-12, 13-16, 17-20, 21+
- Chips de tipo de criatura: Aberration, Beast, Celestial, etc.
- SEM filtro "Completo" / SEM botao de importar

### Monster Grid
- Cards com MonsterToken, nome, CR, tipo
- Grid responsivo: 1 col mobile, 2 col tablet, 3 col desktop
- Agrupamento por letra mantido
- Hover effect com preview minimo

### CTA Section (bottom)
- "Use any monster in our free combat tracker"
- Botoes: Try Now | Create Account

## i18n Architecture

### Route Structure
- EN: `/monsters/adult-red-dragon` 
- PT-BR: `/monstros/dragao-vermelho-adulto`
- `hreflang` tags linking both versions
- `canonical` URL por locale

### Implementation
- Criar pasta `/app/monstros/` com pages PT-BR
- Shared components entre ambas as rotas
- Translation keys em `messages/en.json` e `messages/pt-BR.json`
- Arquivo `public/srd/monster-names-pt.json` com mapeamento de nomes EN→PT

### Slug Translation
- Mapeamento `{ "adult-red-dragon": "dragao-vermelho-adulto" }` 
- Funcao `toSlugPt(name)` que usa o mapeamento
- Iniciar com top 50 monstros traduzidos
- Monstros sem traducao usam slug EN como fallback

## Lore Content — Top 50 Monsters

Conteudo original (nao copiado de livros) para os 50 monstros mais iconicos. Template:

```markdown
**Overview:** 1-2 frases descritivas
**In Combat:** 2-3 bullets com taticas
**In the World:** 2-3 bullets com habitat/ecologia  
**DM Tips:** 1-2 sugestoes de encontro
```

Armazenamento: campo `lore_en` / `lore_pt` no JSON do monstro, ou arquivo separado `monster-lore.json`.

---

## Spell Detail Page — `/spells/[slug]`

### Header/Nav (shared com monsters)

### Spell Card
- Nome da magia em destaque
- Badge de nivel (Cantrip, 1st, 2nd... 9th)
- Badge de escola (Evocation, Necromancy, etc.)
- **Dice Rollers** clicaveis em dano/healing da descricao
- Propriedades: casting time, range, components, duration, concentration
- Descricao completa com DiceText
- Higher Levels (quando aplicavel)
- Classes que podem usar

### Spell Tier Rating
- Tier S/A/B/C/D/E baseado em utilidade geral
- Badge visual com cor (S=gold, A=purple, B=blue, C=green, D=gray, E=red)
- Tooltip com justificativa curta

### Two-Box Layout (abaixo do spell card)
```
+---------------------------+  +---------------------------+
| How to Use {Spell Name}   |  | What is Pocket DM?        |
|                           |  |                           |
| * Best practices          |  | Free D&D 5e combat tracker|
| * Common combos           |  | with spell tracking,      |
| * When NOT to use         |  | concentration alerts...   |
| * Tier justification      |  |                           |
|                           |  | [Try Combat Tracker]      |
|                           |  | [Create Free Account]     |
+---------------------------+  +---------------------------+
```

## Spell Index Page — `/spells`

### Hero Section
- Titulo: "D&D 5e Spell Compendium" / "Compendio de Magias D&D 5e"
- Contagem de magias

### Filter Bar
- Input de busca por nome
- Chips de nivel: Cantrip, 1st-9th
- Chips de escola: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation
- Chips de classe: Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard
- Toggle: Concentration / Ritual
- SEM filtro de source completo

### Spell Grid
- Cards com nome, nivel, escola, classes (icons), concentration badge
- Grid responsivo
- Agrupamento por nivel

---

## Public Safety Rules

- ZERO menção a pack completo
- ZERO botao de importar
- Filtro de source NAO aparece (so SRD + MAD para monstros, so SRD para magias)
- Dados nos JSONs publicos sao SOMENTE `is_srd: true` + MAD
